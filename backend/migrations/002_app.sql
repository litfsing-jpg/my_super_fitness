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
