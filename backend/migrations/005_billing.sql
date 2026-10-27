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
