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
