import {createClient} from '@supabase/supabase-js';
import {AppError} from './errors.mjs';
import {UUID} from './config.mjs';
export function createClientFactory(config,fetchImpl=fetch){
  return (token='',service=false)=>{
    const key=service?config.serviceKey:config.anonKey;
    if(!config.supabaseUrl||!key)throw new AppError(503,'backend_not_configured');
    return createClient(config.supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{headers:token?{Authorization:'Bearer '+token}:{},fetch:(url,options={})=>fetchImpl(url,{...options,signal:AbortSignal.any([AbortSignal.timeout(10000),...(options.signal?[options.signal]:[])])})}});
  };
}
function uuid(value){if(!UUID.test(value||''))throw new AppError(400,'invalid_id');return value;}
const known=new Set(['identity_busy','identity_conflict','invalid_link_nonce','order_conflict','payment_conflict','payment_mismatch','plan_unavailable','order_not_found','verified_account_required','order_rate_limited']);
export function createRepository({config,fetchImpl=fetch,clientFactory=createClientFactory(config,fetchImpl)}){
  const service=()=>clientFactory('',true);
  async function result(promise){const {data,error}=await promise;if(error){if(error.code==='23505')throw new AppError(409,'identity_conflict');const code=known.has(error.message)?error.message:'backend_unavailable';throw new AppError(code==='backend_unavailable'?503:code==='order_rate_limited'?429:409,code);}return data;}
  const rpc=(name,args)=>result(service().rpc(name,args));
  return {
    clientFactory,
    requireConsent:async principal=>{const data=await result(clientFactory(principal.accessToken).rpc('wl_get_current_consent'));return data?.ok===true&&data.consent_version===config.legalRevision;},
    async assertInstallation(){const row=await result(clientFactory().from('wl_installation').select('id,legal_revision').single());if(row?.id!==config.installationId)throw new AppError(503,'installation_mismatch');return row;},
    entitlement:async(principal)=>{
      const c=clientFactory(principal.accessToken);
      const active=await result(c.rpc('wl_has_paid_access'));
      const row=await result(c.from('pb_subscriptions').select('current_period_end,status').eq('user_id',uuid(principal.userId)).maybeSingle());
      const subscribed=row?.status==='active'&&Date.parse(row.current_period_end)>Date.now();
      return {active:subscribed,contentActive:active===true&&config.legalReady,consentRequired:subscribed&&active!==true,expiresAt:row?.current_period_end||null};
    },
    reserveTelegramIdentity:({botId,telegramId,attemptId})=>rpc('wl_reserve_telegram',{p_bot:botId,p_telegram:telegramId,p_attempt:uuid(attemptId)}),
    finishTelegramIdentity:({botId,telegramId,attemptId,userId})=>rpc('wl_finish_telegram',{p_bot:botId,p_telegram:telegramId,p_attempt:uuid(attemptId),p_user:uuid(userId)}),
    createLinkNonce:({userId,digest})=>rpc('wl_create_link_nonce',{p_user:uuid(userId),p_digest:digest}),
    linkTelegramIdentity:({userId=null,botId,telegramId,digest})=>rpc('wl_complete_link',{p_digest:digest,p_bot:botId,p_telegram:telegramId,p_user:userId?uuid(userId):null}),
    plans:()=>result(service().from('wl_billing_plans').select('*').eq('enabled',true).order('days')),
    beginOrder:({userId,planId,provider,requestId})=>rpc('wl_billing_begin',{p_user:uuid(userId),p_plan:planId,p_provider:provider,p_request:uuid(requestId),p_shop:provider==='stars'?config.botId:config.shopId,p_test:config.billingMode==='test'}),
    attachOrder:(orderId,externalId,url)=>rpc('wl_billing_attach',{p_order:uuid(orderId),p_external:externalId,p_url:url||null}),
    settleOrder:({orderId,payment})=>rpc(payment.provider==='stars'?'wl_stars_settle':'wl_billing_settle',{p_order:uuid(orderId),p_payment:payment}),
    settleStars:({orderId,payment})=>rpc('wl_stars_settle',{p_order:uuid(orderId),p_payment:payment}),
    reserveStarsCheckout:(orderId,queryId)=>rpc('wl_stars_checkout',{p_order:uuid(orderId),p_query:queryId}),
    markOrderReview:orderId=>result(service().from('wl_billing_orders').update({status:'review',checked_at:new Date().toISOString()}).eq('id',uuid(orderId)).eq('status','creating')),
    order:async({orderId,userId})=>result(service().from('wl_billing_orders').select('*').eq('id',uuid(orderId)).eq('user_id',uuid(userId)).maybeSingle()),
    orderByPayment:async(provider,externalId)=>result(service().from('wl_billing_orders').select('*').eq('provider',provider).eq('external_payment_id',externalId).maybeSingle()),
    candidates:()=>result(service().from('wl_billing_orders').select('*').in('status',['creating','pending','paid']).order('checked_at',{nullsFirst:true}).order('created_at').limit(20)),
    touchOrder:orderId=>result(service().from('wl_billing_orders').update({checked_at:new Date().toISOString()}).eq('id',uuid(orderId))),
    lookupTelegram:async({botId,telegramId})=>result(service().from('wl_telegram_identities').select('user_id').eq('bot_id',botId).eq('telegram_id',telegramId).maybeSingle()),
    adminRows:async(table,columns='*')=>result(service().from(table).select(columns).limit(100)),
    adminWrite:async(table,value)=>result(service().from(table).upsert(value)),
    audit:({actor,action,target=null,meta={}})=>result(service().from('wl_admin_audit').insert({actor:uuid(actor),action,target,meta}))
  };
}
