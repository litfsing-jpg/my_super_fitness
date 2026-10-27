import {AppError} from '../errors.mjs';
import {UUID} from '../config.mjs';
export function assertPayment(order,payment){
 const invoice=order.provider==='stars'&&order.status==='pending'&&order.external_payment_id==='invoice:'+order.id;
 if(!payment||payment.provider!==order.provider||payment.orderId!==order.id||payment.userId!==order.user_id||payment.currency!==order.currency||payment.amount!==Number(order.amount_minor)||payment.shopId!==order.shop_id||payment.test!==order.test||!payment.externalId||payment.externalId.length>256||(!invoice&&order.external_payment_id&&order.external_payment_id!==payment.externalId)||!['pending','succeeded','canceled','refunded','review'].includes(payment.status))throw new AppError(409,'payment_mismatch');
}
const view=o=>({id:o.id,status:o.status,url:o.checkout_url||null,provider:o.provider,currency:o.currency,amount:Number(o.amount_minor)});
export function createBillingService({config,repository,providers,now=Date.now}){
 const available=provider=>{
  if(!config.billingEnabled||!config.legalReady||!providers[provider])throw new AppError(503,'billing_not_configured');
  if(provider==='yookassa'&&(!config.shopId||!config.paymentSecret||config.mode==='telegram'))throw new AppError(503,'billing_not_configured');
  if(provider==='stars'&&(!config.starsEnabled||config.mode==='web'))throw new AppError(503,'billing_not_configured');
 };
 const read=async order=>{const payment=await providers[order.provider].read(order);if(!payment)return order;assertPayment(order,payment);return repository.settleOrder({orderId:order.id,payment});};
 const resume=async order=>{
  available(order.provider);
  if(now()-Date.parse(order.created_at)>23*3600000){await repository.markOrderReview(order.id);throw new AppError(409,'order_requires_review');}
  const created=await providers[order.provider].create(order);
  return repository.attachOrder(order.id,created.externalId,created.url);
 };
 const create=async({principal,planId,channel,requestId})=>{
  if(!['web','telegram'].includes(channel)||!UUID.test(requestId||'')||!/^[a-z0-9_-]{1,40}$/.test(planId||''))throw new AppError(400,'invalid_order');
  const provider=channel==='telegram'?'stars':'yookassa';available(provider);
  if(provider==='stars'&&!principal.methods?.includes('telegram'))throw new AppError(403,'telegram_identity_required');
  if(!await repository.requireConsent(principal))throw new AppError(400,'consent_required');
  let order=await repository.beginOrder({userId:principal.userId,planId,provider,requestId});
  if(order.status!=='creating')return view(order);
  // Provider POST can time out after acceptance. Its stable key is never changed.
  order=await resume(order);
  return view(order);
 };
 return {
  async plans(principal,channel){const provider=channel==='telegram'?'stars':'yookassa';available(provider);return (await repository.plans()).map(p=>({id:p.id,label:p.label,days:p.days,amount:Number(channel==='telegram'?p.stars_amount:p.amount_minor),currency:channel==='telegram'?'XTR':'RUB'}));},
  create,
  async check({principal,orderId}){if(!UUID.test(orderId||''))throw new AppError(400,'invalid_id');const order=await repository.order({orderId,userId:principal.userId});if(!order)throw new AppError(404,'order_not_found');available(order.provider);return view(await read(order));},
  async notification(event){
   if(event.event?.startsWith('refund.')){
    const refund=await providers.yookassa.refund(event.object?.id);if(refund.status!=='succeeded')return;
    const order=await repository.orderByPayment('yookassa',refund.payment_id);if(!order)return;
    const payment=await providers.yookassa.read(order);assertPayment(order,payment);
    payment.status=refund.amount.currency===order.currency&&refund.amount.value===((Number(order.amount_minor)/100).toFixed(2))?'refunded':'review';
    await repository.settleOrder({orderId:order.id,payment});return;
   }
   const order=await repository.orderByPayment('yookassa',event.object?.id);if(order)await read(order);
  },
  async starsPreCheckout({telegramId,queryId,payload,currency,amount}){
   available('stars');const identity=await repository.lookupTelegram({botId:Number(config.botId),telegramId});
   if(!identity||!UUID.test(payload||''))return false;
   const order=await repository.order({orderId:payload,userId:identity.user_id});
   if(!order||order.provider!=='stars'||order.status!=='pending'||order.currency!==currency||Number(order.amount_minor)!==amount)return false;
   return repository.reserveStarsCheckout(order.id,queryId);
  },
  async starsPaid({telegramId,payment,refunded=false}){
   available('stars');const identity=await repository.lookupTelegram({botId:Number(config.botId),telegramId});
   if(!identity||!UUID.test(payment.invoice_payload||''))throw new AppError(409,'payment_mismatch');
   const order=await repository.order({orderId:payment.invoice_payload,userId:identity.user_id});if(!order)throw new AppError(404,'order_not_found');
   const paid={provider:'stars',externalId:payment.telegram_payment_charge_id,userId:identity.user_id,orderId:order.id,shopId:config.botId,currency:payment.currency,amount:payment.total_amount,status:refunded?'refunded':'succeeded',test:config.billingMode==='test'};
   // Invoice links have an order payload, not a payment charge ID.
   assertPayment({...order,external_payment_id:order.status==='pending'?null:order.external_payment_id},paid);
   return repository.settleStars({orderId:order.id,payment:paid});
  },
  async tick(){for(const order of await repository.candidates()){
   try{available(order.provider);if(order.status==='creating')await resume(order);else await read(order);}catch{/* A later tick retries the same durable order; no tokens or payloads logged. */}finally{await repository.touchOrder(order.id).catch(()=>{});}
  }}
 };
}
