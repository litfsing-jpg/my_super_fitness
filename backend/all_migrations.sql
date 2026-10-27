-- ===================================================
-- ALL-IN-ONE FITNESS WHITELABEL MIGRATIONS (001 - 008)
-- Выполните этот файл целиком в Supabase SQL Editor
-- ===================================================

-- >>>>> START 001_access.sql >>>>>
begin;
do $$ begin
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) then
    raise exception 'Fresh database required; do not install over an existing application';
  end if;
end $$;
revoke create on schema public from public,anon,authenticated;
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;
create table public.wl_installation(singleton boolean primary key default true check(singleton),id uuid not null unique default gen_random_uuid(),legal_revision text not null default '',legal_docs jsonb not null default '{}');
insert into public.wl_installation default values;
alter table public.wl_installation enable row level security;
create table public.wl_admins(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now());
alter table public.wl_admins enable row level security;
create table public.pb_subscriptions(user_id uuid primary key references auth.users(id),status text not null default 'expired' check(status in ('active','expired','revoked')),current_period_end timestamptz not null,started_at timestamptz not null default now(),cancelled_at timestamptz,last_payment_id text,updated_at timestamptz not null default now());
create table public.pb_payments(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),provider text not null,payment_id text not null,status text not null,amount_minor bigint not null check(amount_minor>=0),currency text not null,plan_id text not null,created_at timestamptz not null default now(),unique(provider,payment_id));
alter table public.pb_subscriptions enable row level security;
alter table public.pb_payments enable row level security;
create function public.wl_verified_user(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users u where u.id=p_user and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=now()) and u.email_confirmed_at is not null and coalesce(u.email,'') not like '%@telegram.invalid');
$$;
create function public.wl_has_paid_access() returns boolean language sql stable security definer set search_path='' as $$
 select public.wl_verified_user(auth.uid()) and exists(select 1 from public.pb_subscriptions s where s.user_id=auth.uid() and s.status='active' and s.current_period_end>now());
$$;
create function public.wl_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select public.wl_verified_user(auth.uid()) and exists(select 1 from public.wl_admins where user_id=auth.uid());
$$;
revoke all on function public.wl_verified_user(uuid),public.wl_has_paid_access(),public.wl_is_admin() from public,anon,authenticated;
grant execute on function public.wl_has_paid_access(),public.wl_is_admin() to authenticated,service_role;
grant all on public.wl_installation,public.wl_admins,public.pb_subscriptions,public.pb_payments to service_role;
commit;

-- <<<<< END 001_access.sql <<<<<

-- >>>>> START 002_app.sql >>>>>
-- Fresh dedicated client database only, AFTER security/001_access.sql.
-- Tables stay closed until security/002_runtime_rls.sql grants runtime access.
begin;

do $$ begin
  if to_regprocedure('public.wl_has_paid_access()') is null then
    raise exception 'Apply security/001_access.sql first';
  end if;
end $$;

create table public.pb_profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  submission_id text,
  email text,
  name text, gender text, age integer, weight numeric, height numeric,
  goal text, level text, days text, place text, inventory text, diet text,
  meals_per_day text, injuries text, platform text, app_version text,
  progress_epoch uuid,
  created_at timestamptz not null default now(),
  unique(user_id, submission_id)
);
create index pb_profiles_user_created_idx on public.pb_profiles(user_id, created_at desc);

create table public.pb_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text,
  profile jsonb not null default '{}',
  progress jsonb not null default '{}',
  daily jsonb not null default '{}',
  planning jsonb not null default '{}',
  health jsonb not null default '{}',
  settings jsonb not null default '{}',
  state_version integer not null default 1,
  app_version text, progress_epoch uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pb_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  type text not null check(char_length(type) between 1 and 120),
  screen text, meta jsonb,
  created_at timestamptz not null default now()
);
create index pb_events_user_created_idx on public.pb_events(user_id, created_at desc);

create table public.pb_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  email text, device_id text,
  accepted_pd boolean not null default false,
  accepted_offer boolean not null default false,
  accepted_privacy boolean not null default false,
  accepted_health_data boolean not null default false,
  accepted_confidential boolean not null default false,
  doc_privacy text, doc_offer text, doc_consent text, doc_health text,
  consent_version text, app_version text,
  ip text, user_agent text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index pb_consents_user_created_idx on public.pb_consents(user_id, created_at desc);

create table public.pb_nutrition_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text, day date not null,
  kcal integer not null default 0 check(kcal between 0 and 20000),
  water numeric(4,1) not null default 0 check(water between 0 and 20),
  protein integer not null default 0 check(protein between 0 and 2000),
  fat integer not null default 0 check(fat between 0 and 2000),
  carb integer not null default 0 check(carb between 0 and 3000),
  items jsonb not null default '[]' check(jsonb_typeof(items) = 'array'),
  source text not null default 'web', app_version text, progress_epoch uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);

create table public.pb_daily_activity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  workout_completed boolean not null default false,
  workout_title text, workout_completed_at timestamptz,
  report_flags jsonb not null default '{}' check(jsonb_typeof(report_flags) = 'object'),
  app_version text, progress_epoch uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, day)
);

create table public.pb_user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 300),
  normalized_name text generated always as (lower(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g')))) stored,
  mode text not null check(mode in ('per100', 'portion')),
  portion_grams numeric(10,2) check(portion_grams > 0 and portion_grams <= 100000),
  kcal_per_100g numeric(10,2) check(kcal_per_100g > 0 and kcal_per_100g <= 100000),
  protein_per_100g numeric(10,2) check(protein_per_100g between 0 and 100000),
  fat_per_100g numeric(10,2) check(fat_per_100g between 0 and 100000),
  carb_per_100g numeric(10,2) check(carb_per_100g between 0 and 100000),
  kcal_per_portion numeric(10,2) check(kcal_per_portion > 0 and kcal_per_portion <= 100000),
  protein_per_portion numeric(10,2) check(protein_per_portion between 0 and 100000),
  fat_per_portion numeric(10,2) check(fat_per_portion between 0 and 100000),
  carb_per_portion numeric(10,2) check(carb_per_portion between 0 and 100000),
  use_count bigint not null default 1 check(use_count > 0),
  last_used_at timestamptz not null default now(),
  progress_epoch uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, normalized_name),
  check(char_length(normalized_name) between 1 and 160),
  check((mode = 'per100' and portion_grams is not null
    and kcal_per_100g is not null and protein_per_100g is not null and fat_per_100g is not null and carb_per_100g is not null
    and kcal_per_portion is null and protein_per_portion is null and fat_per_portion is null and carb_per_portion is null)
    or (mode = 'portion' and kcal_per_100g is null and protein_per_100g is null and fat_per_100g is null and carb_per_100g is null
    and kcal_per_portion is not null and protein_per_portion is not null and fat_per_portion is not null and carb_per_portion is not null))
);
create index pb_user_foods_user_recent_idx on public.pb_user_foods(user_id, last_used_at desc);

create table public.pb_workout_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_day date not null,
  title text not null check(char_length(title) between 1 and 300),
  source text not null default 'day' check(source in ('day','generated','saved','manual')),
  source_workout_id text,
  started_at timestamptz not null, completed_at timestamptz,
  status text not null default 'in_progress' check(status in ('in_progress','completed','abandoned')),
  app_version text, progress_epoch uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, user_id),
  check(completed_at is null or completed_at >= started_at)
);
create index pb_workout_sessions_user_started_idx on public.pb_workout_sessions(user_id, started_at desc);

create table public.pb_workout_sets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  exercise_id text not null check(char_length(exercise_id) between 1 and 180),
  exercise_name text not null check(char_length(exercise_name) between 1 and 300),
  equipment text,
  exercise_index smallint not null check(exercise_index between 0 and 40),
  set_index smallint not null check(set_index between 1 and 20),
  target_reps_min smallint check(target_reps_min between 0 and 1000),
  target_reps_max smallint check(target_reps_max between 0 and 1000),
  actual_reps smallint not null check(actual_reps between 0 and 1000),
  weight_kg numeric(8,2) check(weight_kg between 0 and 2000),
  load_mode text not null default 'total' check(load_mode in ('total','per_implement','bodyweight','assistance')),
  completed_at timestamptz not null, progress_epoch uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(session_id, user_id) references public.pb_workout_sessions(id, user_id) on delete cascade,
  unique(session_id, exercise_index, set_index),
  check(target_reps_max >= target_reps_min)
);
create index pb_workout_sets_user_exercise_idx on public.pb_workout_sets(user_id, exercise_id, completed_at desc);

create table public.pb_body_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text, local_day date not null,
  formula_version text not null default 'photo-progress-v1'
    check(formula_version in ('navy-circumference-v1','photo-progress-v1','manual-bia-v1','photo-anthro-estimate-v1')),
  profile_gender text not null check(profile_gender in ('male','female')),
  height_cm numeric(5,1) not null check(height_cm between 120 and 230),
  weight_kg numeric(5,1) not null check(weight_kg between 25 and 350),
  neck_cm numeric(5,1) check(neck_cm between 20 and 70),
  waist_cm numeric(5,1) check(waist_cm between 35 and 200),
  hips_cm numeric(5,1) check(hips_cm between 45 and 220),
  chest_cm numeric(5,1) check(chest_cm between 45 and 220),
  arm_cm numeric(5,1) check(arm_cm between 15 and 80),
  body_fat_pct numeric(5,2) check(body_fat_pct between 1 and 75),
  body_fat_low_pct numeric(5,2), body_fat_high_pct numeric(5,2),
  fat_mass_kg numeric(5,2) check(fat_mass_kg between 0 and 250),
  lean_mass_kg numeric(5,2) check(lean_mass_kg between 0 and 300),
  composition_source text not null default 'photo_progress'
    check(composition_source in ('photo_progress','manual_bia','photo_estimate','legacy_estimate')),
  composition_label text, composition_measured_at timestamptz,
  composition_confidence text check(char_length(composition_confidence) between 1 and 80),
  photo_paths jsonb not null default '{}' check(jsonb_typeof(photo_paths) = 'object'),
  photo_consent_at timestamptz,
  source text not null default 'bodycheck' check(source in ('bodycheck','weekly_report')),
  app_version text, progress_epoch uuid,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_id),
  check((body_fat_low_pct is null and body_fat_high_pct is null) or
    (body_fat_low_pct is not null and body_fat_high_pct is not null and body_fat_pct is not null
     and body_fat_low_pct between 1 and 75 and body_fat_high_pct between 1 and 75
     and body_fat_low_pct <= body_fat_high_pct and body_fat_pct between body_fat_low_pct and body_fat_high_pct))
);
create index pb_body_checks_user_measured_idx on public.pb_body_checks(user_id, measured_at desc);

create table public.pb_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text, task_key text not null, task_text text, note text,
  storage_path text not null check(split_part(storage_path, '/', 1) = user_id::text),
  media text not null default 'photo', progress_epoch uuid,
  created_at timestamptz not null default now()
);
create index pb_proofs_user_created_idx on public.pb_proofs(user_id, created_at desc);

create table public.pb_progress_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'self_service' check(source in ('self_service','support')),
  app_version text,
  cleared jsonb not null default '{}' check(jsonb_typeof(cleared) = 'object'),
  media_paths jsonb not null default '{"body-checks":[],"proofs":[]}' check(jsonb_typeof(media_paths) = 'object'),
  media_cleanup_status text not null default 'pending' check(media_cleanup_status in ('pending','complete')),
  media_cleanup_error text,
  created_at timestamptz not null default clock_timestamp()
);
create index pb_progress_resets_user_created_idx on public.pb_progress_resets(user_id, created_at desc);

create table public.pb_broadcasts (
  id bigint generated always as identity primary key,
  title text not null, body text not null, cta_label text, cta_screen text, cta_url text,
  segment text not null default 'all', active boolean not null default true,
  expires_at timestamptz, created_at timestamptz not null default now()
);
create table public.pb_broadcast_reads (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  broadcast_id bigint not null references public.pb_broadcasts(id) on delete cascade,
  device_id text not null, clicked boolean not null default false,
  created_at timestamptz not null default now()
);
create index pb_broadcast_reads_user_idx on public.pb_broadcast_reads(user_id);

create function public.pb_touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

-- Serializes writes with reset transactions; old devices cannot restore deleted progress.
create function public.pb_enforce_progress_epoch() returns trigger
language plpgsql security definer set search_path = '' as $$
declare latest uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('pb-progress:' || new.user_id::text, 0));
  select id into latest from public.pb_progress_resets where user_id = new.user_id order by created_at desc limit 1;
  if new.progress_epoch is distinct from latest then
    raise exception 'stale_progress_epoch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

do $$ declare name text; seq text;
begin
  foreach name in array array['pb_profiles','pb_user_state','pb_events','pb_consents',
    'pb_nutrition_snapshots','pb_daily_activity_snapshots','pb_user_foods','pb_workout_sessions',
    'pb_workout_sets','pb_body_checks','pb_proofs','pb_progress_resets','pb_broadcasts','pb_broadcast_reads'] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from public, anon, authenticated', name);
    execute format('grant all on public.%I to service_role', name);
    seq := null;
    if name in ('pb_profiles','pb_events','pb_consents','pb_broadcasts','pb_broadcast_reads') then
      seq := pg_get_serial_sequence('public.' || name, 'id');
    end if;
    if seq is not null then
      execute format('revoke all on sequence %s from public, anon, authenticated', seq);
      execute format('grant usage, select on sequence %s to service_role', seq);
    end if;
  end loop;
  foreach name in array array['pb_profiles','pb_user_state','pb_nutrition_snapshots',
    'pb_daily_activity_snapshots','pb_user_foods','pb_workout_sessions','pb_workout_sets','pb_body_checks','pb_proofs'] loop
    execute format('create trigger pb_progress_epoch_guard before insert or update on public.%I for each row execute function public.pb_enforce_progress_epoch()', name);
  end loop;
  foreach name in array array['pb_user_state','pb_nutrition_snapshots','pb_daily_activity_snapshots',
    'pb_user_foods','pb_workout_sessions','pb_workout_sets','pb_body_checks'] loop
    execute format('create trigger pb_touch_updated_at before update on public.%I for each row execute function public.pb_touch_updated_at()', name);
  end loop;
end $$;

create function public.pb_upsert_user_food(
  p_name text, p_mode text, p_kcal numeric, p_protein numeric default 0,
  p_fat numeric default 0, p_carb numeric default 0, p_portion_grams numeric default null,
  p_progress_epoch uuid default null
) returns setof public.pb_user_foods language sql security invoker set search_path = '' as $$
  insert into public.pb_user_foods(user_id, name, mode, portion_grams,
    kcal_per_100g, protein_per_100g, fat_per_100g, carb_per_100g,
    kcal_per_portion, protein_per_portion, fat_per_portion, carb_per_portion, progress_epoch)
  values(auth.uid(), btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g')), lower(btrim(p_mode)),
    case when lower(btrim(p_mode)) = 'per100' or p_portion_grams > 0 then p_portion_grams end,
    case when lower(btrim(p_mode)) = 'per100' then p_kcal end,
    case when lower(btrim(p_mode)) = 'per100' then coalesce(p_protein, 0) end,
    case when lower(btrim(p_mode)) = 'per100' then coalesce(p_fat, 0) end,
    case when lower(btrim(p_mode)) = 'per100' then coalesce(p_carb, 0) end,
    case when lower(btrim(p_mode)) = 'portion' then p_kcal end,
    case when lower(btrim(p_mode)) = 'portion' then coalesce(p_protein, 0) end,
    case when lower(btrim(p_mode)) = 'portion' then coalesce(p_fat, 0) end,
    case when lower(btrim(p_mode)) = 'portion' then coalesce(p_carb, 0) end, p_progress_epoch)
  on conflict(user_id, normalized_name) do update set
    name = excluded.name, mode = excluded.mode, portion_grams = excluded.portion_grams,
    kcal_per_100g = excluded.kcal_per_100g, protein_per_100g = excluded.protein_per_100g,
    fat_per_100g = excluded.fat_per_100g, carb_per_100g = excluded.carb_per_100g,
    kcal_per_portion = excluded.kcal_per_portion, protein_per_portion = excluded.protein_per_portion,
    fat_per_portion = excluded.fat_per_portion, carb_per_portion = excluded.carb_per_portion,
    progress_epoch = excluded.progress_epoch, use_count = pb_user_foods.use_count + 1, last_used_at = now()
  returning *;
$$;
revoke all on function public.pb_touch_updated_at(), public.pb_enforce_progress_epoch(),
  public.pb_upsert_user_food(text,text,numeric,numeric,numeric,numeric,numeric,uuid) from public, anon, authenticated;

commit;

-- <<<<< END 002_app.sql <<<<<

-- >>>>> START 003_runtime_rls.sql >>>>>
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

-- <<<<< END 003_runtime_rls.sql <<<<<

-- >>>>> START 004_identities.sql >>>>>
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

-- <<<<< END 004_identities.sql <<<<<

-- >>>>> START 005_billing.sql >>>>>
begin;
create table public.wl_billing_plans(id text primary key check(id~'^[a-z0-9_-]{1,40}$'),label text not null check(length(label) between 1 and 100),days integer not null check(days between 1 and 366),amount_minor bigint not null check(amount_minor between 1 and 100000000),stars_amount bigint not null check(stars_amount between 1 and 100000),enabled boolean not null default false);
insert into public.wl_billing_plans values('month','Месяц',30,99000,500,false);
create table public.wl_billing_orders(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),plan_id text not null,
 provider text not null check(provider in ('yookassa','stars')),request_id uuid not null,
 amount_minor bigint not null check(amount_minor>0),currency text not null check(currency in ('RUB','XTR')),
 days integer not null check(days between 1 and 366),shop_id text not null,test boolean not null,
 status text not null default 'creating' check(status in ('creating','pending','paid','canceled','refunded','review')),
 external_payment_id text check(length(external_payment_id) between 1 and 256),checkout_url text,
 created_at timestamptz not null default now(),checked_at timestamptz,settled_at timestamptz,period_start timestamptz,period_end timestamptz,
 unique(user_id,request_id),unique(provider,external_payment_id));
create table public.wl_admin_audit(id bigint generated always as identity primary key,actor uuid not null references auth.users(id),action text not null,target uuid,meta jsonb not null default '{}',created_at timestamptz not null default now());
alter table public.wl_billing_plans enable row level security;
alter table public.wl_billing_orders enable row level security;
alter table public.wl_admin_audit enable row level security;
grant all on public.wl_billing_plans,public.wl_billing_orders,public.wl_admin_audit,public.pb_payments,public.pb_subscriptions to service_role;
grant usage on all sequences in schema public to service_role;

create function public.wl_billing_begin(p_user uuid,p_plan text,p_provider text,p_request uuid,p_shop text,p_test boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.wl_billing_plans;o public.wl_billing_orders;
begin
 if not public.wl_verified_user(p_user) then raise exception 'verified_account_required';end if;
 if p_provider not in ('yookassa','stars') or p_request is null or length(coalesce(p_shop,'')) not between 1 and 128 then raise exception 'invalid_request';end if;
 perform pg_advisory_xact_lock(hashtextextended('wl-order:'||p_user::text||':'||p_request::text,0));
 select * into o from public.wl_billing_orders where user_id=p_user and request_id=p_request;
 if found then
   if o.plan_id<>p_plan or o.provider<>p_provider or o.test<>p_test or o.shop_id<>p_shop then raise exception 'order_conflict';end if;
   return to_jsonb(o);
 end if;
 select * into p from public.wl_billing_plans where id=p_plan and enabled;
 if not found then raise exception 'plan_unavailable';end if;
 if (select count(*) from public.wl_billing_orders where user_id=p_user and created_at>now()-interval '1 hour')>=10 then raise exception 'order_rate_limited';end if;
 insert into public.wl_billing_orders(user_id,plan_id,provider,request_id,amount_minor,currency,days,shop_id,test)
 values(p_user,p_plan,p_provider,p_request,case when p_provider='stars' then p.stars_amount else p.amount_minor end,case when p_provider='stars' then 'XTR' else 'RUB' end,p.days,p_shop,p_test) returning * into o;
 return to_jsonb(o);
end $$;
create function public.wl_billing_attach(p_order uuid,p_external text,p_url text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.wl_billing_orders;
begin
 select * into o from public.wl_billing_orders where id=p_order for update;
 if not found or o.status not in ('creating','pending') or length(coalesce(p_external,'')) not between 1 and 256 then raise exception 'order_conflict';end if;
 if o.external_payment_id is not null and o.external_payment_id<>p_external then raise exception 'payment_conflict';end if;
 update public.wl_billing_orders set external_payment_id=p_external,checkout_url=p_url,status='pending',checked_at=now() where id=p_order returning * into o;
 return to_jsonb(o);
end $$;
create function public.wl_billing_settle(p_order uuid,p_payment jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.wl_billing_orders;s public.pb_subscriptions;v_start timestamptz;v_status text:=p_payment->>'status';v_external text:=p_payment->>'externalId';
begin
 select * into o from public.wl_billing_orders where id=p_order for update;
 if not found then raise exception 'order_not_found';end if;
 if p_payment->>'provider' is distinct from o.provider or p_payment->>'orderId' is distinct from o.id::text or p_payment->>'userId' is distinct from o.user_id::text or p_payment->>'currency' is distinct from o.currency or (p_payment->>'amount')::bigint is distinct from o.amount_minor or p_payment->>'shopId' is distinct from o.shop_id or (p_payment->>'test')::boolean is distinct from o.test or length(coalesce(v_external,'')) not between 1 and 256 or (o.external_payment_id is not null and o.external_payment_id<>v_external) or v_status not in ('pending','succeeded','canceled','refunded','review') then raise exception 'payment_mismatch';end if;
 perform pg_advisory_xact_lock(hashtextextended('wl-paid:'||o.user_id::text,0));
 if o.status='refunded' then return to_jsonb(o);end if;
 if o.status='paid' and v_status not in ('refunded','review') then return to_jsonb(o);end if;
 if o.status in ('canceled','review') then return to_jsonb(o);end if;
 if v_status='succeeded' then
   if not public.wl_verified_user(o.user_id) then raise exception 'verified_account_required';end if;
   select * into s from public.pb_subscriptions where user_id=o.user_id for update;
   v_start:=greatest(now(),case when s.status='active' then s.current_period_end else now() end);
   insert into public.pb_payments(user_id,provider,payment_id,status,amount_minor,currency,plan_id) values(o.user_id,o.provider,v_external,'paid',o.amount_minor,o.currency,o.plan_id);
   insert into public.pb_subscriptions(user_id,status,current_period_end,last_payment_id) values(o.user_id,'active',v_start+make_interval(days=>o.days),o.id::text)
   on conflict(user_id) do update set status='active',current_period_end=excluded.current_period_end,last_payment_id=excluded.last_payment_id,cancelled_at=null,updated_at=now();
   update public.wl_billing_orders set status='paid',external_payment_id=v_external,settled_at=now(),period_start=v_start,period_end=v_start+make_interval(days=>o.days),checked_at=now() where id=p_order returning * into o;
 elsif v_status='refunded' and o.status='paid' then
   select * into s from public.pb_subscriptions where user_id=o.user_id for update;
   if s.last_payment_id=o.id::text then
     update public.pb_subscriptions set current_period_end=least(current_period_end,greatest(now(),o.period_start)),updated_at=now() where user_id=o.user_id;
     update public.wl_billing_orders set status='refunded',checked_at=now() where id=p_order returning * into o;
   else update public.wl_billing_orders set status='review',checked_at=now() where id=p_order returning * into o;
   end if;
   update public.pb_payments set status=o.status where provider=o.provider and payment_id=v_external;
 else
   update public.wl_billing_orders set status=case v_status when 'canceled' then 'canceled' when 'review' then 'review' else 'pending' end,external_payment_id=v_external,checked_at=now() where id=p_order returning * into o;
 end if;
 return to_jsonb(o);
end $$;
revoke all on function public.wl_billing_begin(uuid,text,text,uuid,text,boolean),public.wl_billing_attach(uuid,text,text),public.wl_billing_settle(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wl_billing_begin(uuid,text,text,uuid,text,boolean),public.wl_billing_attach(uuid,text,text),public.wl_billing_settle(uuid,jsonb) to service_role;
commit;

-- <<<<< END 005_billing.sql <<<<<

-- >>>>> START 006_stars.sql >>>>>
begin;
alter table public.wl_billing_orders add column precheckout_query text;
create function public.wl_stars_checkout(p_order uuid,p_query text) returns boolean language plpgsql security definer set search_path='' as $$
declare o public.wl_billing_orders;
begin
 select * into o from public.wl_billing_orders where id=p_order for update;
 if not found or o.provider<>'stars' or o.status<>'pending' or length(coalesce(p_query,'')) not between 1 and 256 then return false;end if;
 if o.precheckout_query is not null then return o.precheckout_query=p_query;end if;
 update public.wl_billing_orders set precheckout_query=p_query where id=p_order;
 return true;
end $$;
create function public.wl_stars_settle(p_order uuid,p_payment jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.wl_billing_orders;
begin
 select * into o from public.wl_billing_orders where id=p_order for update;
 if not found or o.provider<>'stars' or p_payment->>'provider' is distinct from 'stars' or coalesce(p_payment->>'status','') not in ('succeeded','refunded','review') then raise exception 'payment_mismatch';end if;
 if o.status='pending' and o.external_payment_id='invoice:'||o.id::text then
   update public.wl_billing_orders set external_payment_id=null where id=p_order;
 end if;
 return public.wl_billing_settle(p_order,p_payment);
end $$;
revoke all on function public.wl_stars_checkout(uuid,text),public.wl_stars_settle(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wl_stars_checkout(uuid,text),public.wl_stars_settle(uuid,jsonb) to service_role;
commit;

-- <<<<< END 006_stars.sql <<<<<

-- >>>>> START 007_review_guards.sql >>>>>
begin;
alter table public.wl_installation add column legal_ready boolean not null default false;
create or replace function public.wl_legal_contract() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',case when legal_ready then legal_revision else '' end,'docs',legal_docs) from public.wl_installation;
$$;
create or replace function public.wl_has_paid_access() returns boolean language sql stable security definer set search_path='' as $$
 select public.wl_verified_user(auth.uid())
 and exists(select 1 from public.pb_subscriptions where user_id=auth.uid() and status='active' and current_period_end>now())
 and exists(select 1 from public.wl_installation i join public.pb_consents c on c.user_id=auth.uid() and c.consent_version=i.legal_revision
  where i.legal_ready and i.legal_revision<>'' and i.legal_docs ?& array['offer','privacy','consent','health']
   and c.accepted_pd and c.accepted_offer and c.accepted_privacy and c.accepted_health_data and c.accepted_confidential);
$$;
alter function public.wl_billing_settle(uuid,jsonb) rename to wl_billing_settle_v1;
revoke all on function public.wl_billing_settle_v1(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.wl_billing_settle(p_order uuid,p_payment jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.wl_billing_orders;r jsonb;
begin
 if coalesce(p_payment->>'status','') not in ('pending','succeeded','canceled','refunded','review') then raise exception 'payment_mismatch';end if;
 select * into o from public.wl_billing_orders where id=p_order for update;
 if not found then raise exception 'order_not_found';end if;
 r:=public.wl_billing_settle_v1(p_order,p_payment);
 if p_payment->>'status'='refunded' and o.status in ('creating','pending') then
  update public.wl_billing_orders set status='refunded',checked_at=now(),settled_at=now() where id=p_order returning to_jsonb(wl_billing_orders.*) into r;
  insert into public.pb_payments(user_id,provider,payment_id,status,amount_minor,currency,plan_id)
   values(o.user_id,o.provider,p_payment->>'externalId','refunded',o.amount_minor,o.currency,o.plan_id);
 end if;
 return r;
end $$;
revoke all on function public.wl_billing_settle(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.wl_billing_settle(uuid,jsonb) to service_role;
commit;

-- <<<<< END 007_review_guards.sql <<<<<

-- >>>>> START 008_proofs.sql >>>>>
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


-- <<<<< END 008_proofs.sql <<<<<

-- ===================================================
-- ФИНАЛ: ПОЛУЧЕНИЕ ВАШЕГО WL_INSTALLATION_ID
-- ===================================================
select id as wl_installation_id from public.wl_installation;
