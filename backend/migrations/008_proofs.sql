-- Neutral evidence RPCs; independent of the original admin schema.
-- Submitted task evidence is shared with administrators; BodyCheck/meal files are not.
begin;
alter table public.pb_proofs add column client_id uuid not null default gen_random_uuid();
alter table public.pb_proofs add column local_day date;
update public.pb_proofs set local_day=(created_at at time zone 'UTC')::date;
alter table public.pb_proofs alter column local_day set not null;
alter table public.pb_proofs add column content_type text not null default 'image/jpeg';
create unique index wl_proof_client_request on public.pb_proofs(user_id,client_id);
create index wl_proof_storage_path on public.pb_proofs(storage_path);
revoke insert,update,delete on public.pb_proofs from authenticated;

create table public.wl_proof_reviews (
  proof_id uuid primary key references public.pb_proofs(id) on delete cascade,
  status text not null check(status in ('approved','rejected')),
  note text not null default '' check(char_length(note)<=2000),
  reviewer_id uuid not null references auth.users(id),
  version integer not null check(version>0),
  reviewed_at timestamptz not null default clock_timestamp()
);
alter table public.wl_proof_reviews enable row level security;
revoke all on public.wl_proof_reviews from public,anon,authenticated;
grant all on public.wl_proof_reviews to service_role;

create function public.wl_proof_json(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select to_jsonb(p) || jsonb_build_object('status',coalesce(r.status,'pending'),
    'review_note',coalesce(r.note,''),'review_version',coalesce(r.version,0),'reviewed_at',r.reviewed_at)
    from public.pb_proofs p left join public.wl_proof_reviews r on r.proof_id=p.id where p.id=p_id;
$$;

create function public.wl_submit_proof(p_client_id uuid,p_task_key text,p_task_text text,p_note text,
  p_storage_path text,p_content_type text,p_local_day date,p_progress_epoch uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid; latest_epoch uuid; existing public.pb_proofs; proof_id uuid; extension text; file_meta jsonb;
begin
  if not public.wl_has_paid_access() then raise insufficient_privilege using message='paid_account_required'; end if;
  owner_id:=auth.uid();
  if p_client_id is null or p_task_key is null or p_task_key not in ('mobility','technique')
    or p_task_text is null or char_length(btrim(p_task_text)) not between 1 and 300
    or p_note is null or char_length(p_note)>2000 or p_local_day is null then
    raise invalid_parameter_value using message='invalid_proof';
  end if;
  extension:=case p_content_type when 'image/jpeg' then 'jpg' when 'video/mp4' then 'mp4'
    when 'video/webm' then 'webm' when 'video/quicktime' then 'mov' end;
  if extension is null or p_storage_path is null
    or p_storage_path<>owner_id::text || '/tasks/' || p_client_id::text || '.' || extension
    or (p_task_key='technique' and p_content_type='image/jpeg') then
    raise invalid_parameter_value using message='invalid_proof_media';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('pb-progress:' || owner_id::text,0));
  select id into latest_epoch from public.pb_progress_resets where user_id=owner_id order by created_at desc limit 1;
  if p_progress_epoch is distinct from latest_epoch then
    raise exception 'stale_progress_epoch' using errcode='P0001';
  end if;
  select * into existing from public.pb_proofs where user_id=owner_id and client_id=p_client_id;
  if found then
    if existing.task_key<>p_task_key or existing.task_text<>btrim(p_task_text) or coalesce(existing.note,'')<>p_note
      or existing.storage_path<>p_storage_path or existing.content_type<>p_content_type or existing.local_day<>p_local_day then
      raise invalid_parameter_value using message='request_id_conflict';
    end if;
    return jsonb_build_object('ok',true,'proof',public.wl_proof_json(existing.id));
  end if;
  -- A delayed retry may read its committed result; only new submissions have a date window.
  if p_local_day not between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date+1 then
    raise invalid_parameter_value using message='invalid_proof_day';
  end if;
  select metadata into file_meta from storage.objects where bucket_id='proofs' and name=p_storage_path for share;
  if not found or file_meta->>'mimetype' is distinct from p_content_type
    or coalesce(file_meta->>'size','') !~ '^[0-9]+$' then
    raise invalid_parameter_value using message='uploaded_proof_required';
  end if;
  if (file_meta->>'size')::numeric not between 1 and 20971520 then
    raise invalid_parameter_value using message='proof_file_too_large';
  end if;
  insert into public.pb_proofs(user_id,client_id,task_key,task_text,note,storage_path,media,content_type,local_day,progress_epoch)
    values(owner_id,p_client_id,p_task_key,btrim(p_task_text),p_note,p_storage_path,
      case when p_content_type='image/jpeg' then 'photo' else 'video' end,p_content_type,p_local_day,p_progress_epoch)
    returning id into proof_id;
  return jsonb_build_object('ok',true,'proof',public.wl_proof_json(proof_id));
end $$;


create function public.wl_my_proofs(p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.wl_has_paid_access() then raise insufficient_privilege using message='paid_account_required'; end if;
  if p_offset is null or p_offset not between 0 and 1000000 or p_limit is null or p_limit not between 1 and 100 then
    raise invalid_parameter_value using message='invalid_pagination';
  end if;
  return jsonb_build_object('total',(select count(*) from public.pb_proofs where user_id=auth.uid()),
    'rows',coalesce((select jsonb_agg(public.wl_proof_json(p.id) order by p.created_at desc,p.id)
      from (select id,created_at from public.pb_proofs where user_id=auth.uid() order by created_at desc,id limit p_limit offset p_offset) p),'[]'::jsonb));
end $$;

create function public.wl_proof_media_locked(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pb_proofs where user_id=auth.uid() and storage_path=p_path);
$$;
create policy wl_proof_no_overwrite on storage.objects as restrictive for update to authenticated using(bucket_id<>'proofs') with check(bucket_id<>'proofs');
create policy wl_keep_submitted_proofs on storage.objects as restrictive for delete to authenticated using(bucket_id<>'proofs' or not public.wl_proof_media_locked(name));
update storage.buckets set file_size_limit=20971520,allowed_mime_types=array['image/jpeg','video/mp4','video/webm','video/quicktime'] where id='proofs' and public=false;
revoke all on function public.wl_proof_json(uuid),public.wl_submit_proof(uuid,text,text,text,text,text,date,uuid),public.wl_my_proofs(integer,integer),public.wl_proof_media_locked(text) from public,anon,authenticated;
grant execute on function public.wl_submit_proof(uuid,text,text,text,text,text,date,uuid),public.wl_my_proofs(integer,integer),public.wl_proof_media_locked(text) to authenticated;
grant execute on function public.wl_proof_json(uuid) to service_role;
commit;

