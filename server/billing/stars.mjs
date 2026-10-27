import {AppError} from '../errors.mjs';
export function createStars({config,api}){
 let cached=null,until=0;
 const transactions=async()=>{
  if(cached&&until>Date.now())return cached;const all=[];
  for(let offset=0;offset<1000;offset+=100){const result=await api.getStarTransactions({offset,limit:100});all.push(...result.transactions);if(result.transactions.length<100)break;}
  cached=all;until=Date.now()+30000;return all;
 };
 return {
  async create(order){const url=await api.createInvoiceLink(config.brand.name.slice(0,32),'Доступ на '+order.days+' дней',order.id,'','XTR',[{label:'Доступ',amount:Number(order.amount_minor)}]);
   if(!/^https:\/\/t\.me\//.test(url))throw new AppError(503,'provider_url_invalid');
   // No charge exists until successful_payment; persist payload as the invoice reference.
   return {externalId:'invoice:'+order.id,url};},
  async read(order){
   const events=await transactions();
   const charge=events.find(t=>t.source?.type==='user'&&t.source.invoice_payload===order.id);
   const external=charge?.id||(order.external_payment_id?.startsWith('invoice:')?null:order.external_payment_id);
   const refund=external?events.find(t=>t.id===external&&t.receiver?.type==='user'):null;
   if(!charge&&!refund)return null;
   const partner=charge?.source||refund.receiver,identity=await config.lookupTelegram(partner.user.id);
   if(identity?.user_id!==order.user_id)throw new AppError(409,'payment_mismatch');
   const amount=charge?.amount??Number(order.amount_minor);
   return {provider:'stars',externalId:external,orderId:order.id,userId:order.user_id,shopId:config.botId,currency:'XTR',amount,status:refund?(refund.amount===amount&&!refund.nanostar_amount?'refunded':'review'):'succeeded',test:config.billingMode==='test'};
  }
 };
}
