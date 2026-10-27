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
