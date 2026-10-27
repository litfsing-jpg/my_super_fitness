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
