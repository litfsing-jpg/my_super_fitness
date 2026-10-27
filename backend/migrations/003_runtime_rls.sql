-- Apply AFTER the clean web application schema, before exposing the new project.
-- Missing tables abort the entire transaction; this is not a full schema bootstrap.
begin;

do $$
declare name text; relation record; policy record; routine record;
begin
  foreach name in array array['pb_profiles', 'pb_user_state', 'pb_events', 'pb_consents',
    'pb_nutrition_snapshots', 'pb_daily_activity_snapshots', 'pb_user_foods',
    'pb_workout_sessions', 'pb_workout_sets', 'pb_body_checks', 'pb_proofs',
    'pb_progress_resets', 'pb_broadcasts', 'pb_broadcast_reads'] loop
    if to_regclass('public.' || name) is null then
      raise exception 'Missing web schema table: %', name;
    end if;
  end loop;
  -- Legacy SECURITY DEFINER RPCs and views must not bypass the new table policies.
  for routine in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' loop
    execute format('revoke execute on function %s from public, anon, authenticated', routine.signature);
  end loop;
  for relation in select c.relname, c.relkind from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') loop
    execute format('revoke all on public.%I from public, anon, authenticated', relation.relname);
    if relation.relkind in ('r', 'p') then
      execute format('alter table public.%I enable row level security', relation.relname);
      for policy in select policyname from pg_policies where schemaname = 'public' and tablename = relation.relname loop
        execute format('drop policy %I on public.%I', policy.policyname, relation.relname);
      end loop;
    end if;
  end loop;
end $$;

grant execute on function public.wl_has_paid_access() to authenticated, service_role;
grant select on public.pb_subscriptions to authenticated;
create policy wl_read_own_subscription on public.pb_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

do $$
declare name text; sequence_name text;
begin
  foreach name in array array['pb_profiles', 'pb_user_state', 'pb_nutrition_snapshots',
    'pb_daily_activity_snapshots', 'pb_user_foods', 'pb_workout_sessions',
    'pb_workout_sets', 'pb_body_checks', 'pb_proofs'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', name);
    execute format('create policy wl_paid_owner on public.%I for all to authenticated
      using (user_id = (select auth.uid()) and (select public.wl_has_paid_access()))
      with check (user_id = (select auth.uid()) and (select public.wl_has_paid_access()))', name);
  end loop;
  foreach name in array array['pb_profiles', 'pb_events', 'pb_consents', 'pb_broadcast_reads'] loop
    sequence_name := pg_get_serial_sequence('public.' || name, 'id');
    if sequence_name is not null and name <> 'pb_consents' then
      execute format('grant usage on sequence %s to authenticated', sequence_name);
    end if;
  end loop;
end $$;

grant insert on public.pb_events to authenticated;
create policy wl_event_owner on public.pb_events for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.wl_has_paid_access()));
alter table public.pb_broadcast_reads add column if not exists user_id uuid references auth.users(id);
alter table public.pb_broadcast_reads alter column user_id set default auth.uid();
grant insert on public.pb_broadcast_reads to authenticated;
create policy wl_broadcast_read_owner on public.pb_broadcast_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.wl_has_paid_access()));
grant select on public.pb_broadcasts to authenticated;
create policy wl_paid_broadcasts on public.pb_broadcasts for select to authenticated
  using (active = true and (select public.wl_has_paid_access()));
grant select on public.pb_progress_resets to authenticated;
create policy wl_read_own_reset on public.pb_progress_resets for select to authenticated
  using (user_id = (select auth.uid()) and (select public.wl_has_paid_access()));

create or replace function public.pb_get_latest_progress_reset()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object('reset_id', id, 'reset_at', created_at, 'media_cleanup_status', media_cleanup_status)
  from public.pb_progress_resets where user_id = (select auth.uid()) order by created_at desc limit 1;
$$;
revoke all on function public.pb_get_latest_progress_reset() from public, anon;
grant execute on function public.pb_get_latest_progress_reset() to authenticated;

-- Re-enable only the reviewed, invoker-scoped food RPC; all other legacy RPCs stay closed.
do $$
declare signature regprocedure := to_regprocedure('public.pb_upsert_user_food(text,text,numeric,numeric,numeric,numeric,numeric,uuid)');
begin
  if signature is null then raise exception 'Missing web food RPC'; end if;
  if (select prosecdef from pg_proc where oid = signature) then
    raise exception 'Food RPC must use SECURITY INVOKER';
  end if;
  execute format('grant execute on function %s to authenticated', signature);
end $$;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('body-checks', 'body-checks', false, 10485760, array['image/jpeg']),
       ('proofs', 'proofs', false, 10485760, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- This dedicated app owns these buckets. No inherited public policies are retained.
do $$ declare policy record;
begin
  for policy in select policyname, tablename from pg_policies where schemaname = 'storage' and tablename in ('objects', 'buckets') loop
    execute format('drop policy %I on storage.%I', policy.policyname, policy.tablename);
  end loop;
end $$;
-- Hosted Storage owns this table; postgres may manage policies, not ALTER TABLE.
do $$ begin
  if not exists(select 1 from pg_class where oid = 'storage.objects'::regclass and relrowsecurity) then
    raise exception 'Storage objects RLS must already be enabled by the platform';
  end if;
  if not exists(select 1 from pg_class where oid = 'storage.buckets'::regclass and relrowsecurity) then
    raise exception 'Storage buckets RLS must already be enabled by the platform';
  end if;
end $$;
-- Platform-owned grants cannot be revoked by postgres. RLS controls Storage rows.
create policy wl_private_media on storage.objects for all to authenticated
  using (bucket_id in ('body-checks', 'proofs') and split_part(name, '/', 1) = (select auth.uid()::text)
    and (select public.wl_has_paid_access()))
  with check (bucket_id in ('body-checks', 'proofs') and split_part(name, '/', 1) = (select auth.uid()::text)
    and (select public.wl_has_paid_access()));

commit;
