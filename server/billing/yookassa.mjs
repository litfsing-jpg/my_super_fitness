import {AppError} from '../errors.mjs';
const base='https://api.yookassa.ru/v3';
export function createYooKassa({config,fetchImpl=fetch}){
 const call=async(path,options={})=>{
  const r=await fetchImpl(base+path,{...options,headers:{Authorization:'Basic '+Buffer.from(config.shopId+':'+config.paymentSecret).toString('base64'),'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new AppError(503,'provider_unavailable');return r.json();
 };
 const payment=p=>({provider:'yookassa',externalId:p.id,orderId:p.metadata?.orderId,userId:p.metadata?.userId,shopId:String(p.recipient?.account_id||''),currency:p.amount?.currency,amount:decimalMinor(p.amount?.value),status:p.status==='succeeded'&&p.paid===true?'succeeded':p.status==='canceled'?'canceled':'pending',test:p.test===true});
 return {
  async create(order){const p=await call('/payments',{method:'POST',headers:{'Idempotence-Key':order.id},body:JSON.stringify({amount:{value:(Number(order.amount_minor)/100).toFixed(2),currency:'RUB'},capture:true,confirmation:{type:'redirect',return_url:config.origin+'/login?payment=check'},description:config.brand.name+' · доступ на '+order.days+' дней',metadata:{orderId:order.id,userId:order.user_id,installationId:config.installationId},save_payment_method:false})});
   const verified=payment(p);if(verified.orderId!==order.id||verified.userId!==order.user_id||verified.amount!==Number(order.amount_minor)||verified.shopId!==order.shop_id||verified.currency!=='RUB'||verified.test!==order.test)throw new AppError(409,'payment_mismatch');
   const url=new URL(p.confirmation?.confirmation_url||'');if(url.protocol!=='https:')throw new AppError(503,'provider_url_invalid');return {externalId:p.id,url:url.href};},
  async read(order){return payment(await call('/payments/'+encodeURIComponent(order.external_payment_id)));},
  refund:id=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(id))throw new AppError(400,'invalid_refund');return call('/refunds/'+id);}
 };
}
export function decimalMinor(value){if(typeof value!=='string'||!/^\d{1,9}\.\d{2}$/.test(value))return NaN;const [whole,decimal]=value.split('.');return Number(whole)*100+Number(decimal);}
