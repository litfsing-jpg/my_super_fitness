begin;
create table public.wl_telegram_identities(
 bot_id bigint not null check(bot_id>0),telegram_id bigint not null check(telegram_id>0),
 user_id uuid references auth.users(id),provision_id uuid not null default gen_random_uuid(),
 lease_id uuid,lease_until timestamptz,created_at timestamptz not null default now(),
 primary key(bot_id,telegram_id),unique(bot_id,user_id),unique(provision_id));
create table public.wl_link_nonces(digest text primary key check(length(digest)=64),user_id uuid not null references auth.users(id),expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
alter table public.wl_telegram_identities enable row level security;
alter table public.wl_link_nonces enable row level security;
grant all on public.wl_telegram_identities,public.wl_link_nonces,public.wl_installation,public.wl_admins to service_role;
create policy wl_public_installation on public.wl_installation for select to anon,authenticated using(true);
grant select on public.wl_installation to anon,authenticated;
create or replace function public.wl_verified_user(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=p_user and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now())
 and ((u.email_confirmed_at is not null and coalesce(u.email,'') not like '%@telegram.invalid') or exists(select 1 from public.wl_telegram_identities t where t.user_id=u.id)));
$$;
create or replace function public.wl_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.wl_verified_user(auth.uid()) and exists(select 1 from public.wl_admins where user_id=auth.uid());
$$;
create function public.wl_current_principal() returns jsonb language sql stable security definer set search_path='' as $$
 select case when public.wl_verified_user(auth.uid()) then jsonb_build_object('userId',auth.uid(),'admin',public.wl_is_admin(),'installationId',(select id from public.wl_installation),'methods',
   to_jsonb(array_remove(array[case when exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and coalesce(email,'') not like '%@telegram.invalid') then 'web' end,
   case when exists(select 1 from public.wl_telegram_identities where user_id=auth.uid()) then 'telegram' end],null))) else null end;
$$;
grant execute on function public.wl_current_principal(),public.wl_is_admin() to authenticated,service_role;

create function public.wl_reserve_telegram(p_bot bigint,p_telegram bigint,p_attempt uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.wl_telegram_identities;
begin
 if p_attempt is null then raise exception 'invalid_request';end if;
 insert into public.wl_telegram_identities(bot_id,telegram_id) values(p_bot,p_telegram) on conflict do nothing;
 select * into r from public.wl_telegram_identities where bot_id=p_bot and telegram_id=p_telegram for update;
 if r.user_id is not null then return jsonb_build_object('userId',r.user_id,'provisionId',r.provision_id);end if;
 if r.lease_until>now() and r.lease_id is distinct from p_attempt then raise exception 'identity_busy';end if;
 update public.wl_telegram_identities set lease_id=p_attempt,lease_until=now()+interval '60 seconds' where bot_id=p_bot and telegram_id=p_telegram returning * into r;
 return jsonb_build_object('userId',r.user_id,'provisionId',r.provision_id,'leaseId',r.lease_id);
end $$;
create function public.wl_finish_telegram(p_bot bigint,p_telegram bigint,p_attempt uuid,p_user uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.wl_telegram_identities;
begin
 select * into r from public.wl_telegram_identities where bot_id=p_bot and telegram_id=p_telegram for update;
 if not found then raise exception 'identity_conflict';end if;
 if r.user_id=p_user then return p_user;end if;
 if r.user_id is not null or r.lease_id is distinct from p_attempt or r.lease_until<now() then raise exception 'identity_conflict';end if;
 if not exists(select 1 from auth.users where id=p_user and email=r.provision_id::text||'@telegram.invalid') then raise exception 'identity_conflict';end if;
 update public.wl_telegram_identities set user_id=p_user,lease_id=null,lease_until=null where bot_id=p_bot and telegram_id=p_telegram;
 return p_user;
end $$;
create function public.wl_create_link_nonce(p_user uuid,p_digest text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.wl_verified_user(p_user) then raise exception 'verified_account_required';end if;
 delete from public.wl_link_nonces where expires_at<now()-interval '1 day';
 insert into public.wl_link_nonces(digest,user_id,expires_at) values(p_digest,p_user,now()+interval '300 seconds');
 return true;
end $$;
create function public.wl_complete_link(p_digest text,p_bot bigint,p_telegram bigint,p_user uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare n public.wl_link_nonces;r public.wl_telegram_identities;
begin
 select * into n from public.wl_link_nonces where digest=p_digest for update;
 if not found or n.used_at is not null or n.expires_at<=now() or (p_user is not null and n.user_id<>p_user) then raise exception 'invalid_link_nonce';end if;
 if not public.wl_verified_user(n.user_id) then raise exception 'verified_account_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('wl-link:'||p_bot::text||':'||p_telegram::text,0));
 select * into r from public.wl_telegram_identities where bot_id=p_bot and telegram_id=p_telegram for update;
 if found and (r.user_id is not null and r.user_id<>n.user_id or r.lease_until>now()) then raise exception 'identity_conflict';end if;
 if exists(select 1 from public.wl_telegram_identities where bot_id=p_bot and user_id=n.user_id and telegram_id<>p_telegram) then raise exception 'identity_conflict';end if;
 insert into public.wl_telegram_identities(bot_id,telegram_id,user_id) values(p_bot,p_telegram,n.user_id)
 on conflict(bot_id,telegram_id) do update set user_id=excluded.user_id,lease_id=null,lease_until=null;
 update public.wl_link_nonces set used_at=now() where digest=p_digest;
 return n.user_id;
end $$;
revoke all on function public.wl_reserve_telegram(bigint,bigint,uuid),public.wl_finish_telegram(bigint,bigint,uuid,uuid),public.wl_create_link_nonce(uuid,text),public.wl_complete_link(text,bigint,bigint,uuid) from public,anon,authenticated;
grant execute on function public.wl_reserve_telegram(bigint,bigint,uuid),public.wl_finish_telegram(bigint,bigint,uuid,uuid),public.wl_create_link_nonce(uuid,text),public.wl_complete_link(text,bigint,bigint,uuid) to service_role;

create function public.wl_legal_contract() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('version',legal_revision,'docs',legal_docs) from public.wl_installation$$;
create function public.wl_get_current_consent() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('ok',true,'consent_id',c.id,'consent_version',c.consent_version,'consent_at',c.created_at,'docs',public.wl_legal_contract()->'docs') from public.pb_consents c
 where c.user_id=auth.uid() and public.wl_verified_user(auth.uid()) and c.consent_version=public.wl_legal_contract()->>'version' and c.consent_version<>'' and c.accepted_pd and c.accepted_offer and c.accepted_privacy and c.accepted_health_data and c.accepted_confidential order by c.id desc limit 1;
$$;
create function public.wl_record_consent(p_version text,p_accepted jsonb,p_device_id text,p_app_version text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;v_contract jsonb:=public.wl_legal_contract();
begin
 if not public.wl_verified_user(auth.uid()) then raise exception 'verified_account_required';end if;
 if p_version is distinct from v_contract->>'version' or p_version='' or p_accepted is distinct from '{"offer":true,"privacy":true,"personalData":true,"healthData":true,"confidential":true}'::jsonb or char_length(coalesce(p_device_id,'')) not between 8 and 96 then raise exception 'invalid_consent';end if;
 perform pg_advisory_xact_lock(hashtextextended('wl-consent:'||auth.uid()::text,0));
 c:=public.wl_get_current_consent();if c is not null then return c;end if;
 insert into public.pb_consents(user_id,device_id,accepted_pd,accepted_offer,accepted_privacy,accepted_health_data,accepted_confidential,consent_version,doc_privacy,doc_offer,doc_consent,doc_health,app_version)
 values(auth.uid(),p_device_id,true,true,true,true,true,p_version,v_contract->'docs'->>'privacy',v_contract->'docs'->>'offer',v_contract->'docs'->>'consent',v_contract->'docs'->>'health',left(p_app_version,80));
 return public.wl_get_current_consent();
end $$;
revoke all on function public.wl_get_current_consent(),public.wl_record_consent(text,jsonb,text,text),public.wl_legal_contract() from public,anon,authenticated;
grant execute on function public.wl_get_current_consent(),public.wl_record_consent(text,jsonb,text,text) to authenticated;
commit;
