import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../server/billing/service.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const userId='11111111-1111-4111-8111-111111111111',orderId='22222222-2222-4222-8222-222222222222';
test('billing creates from server plan, rechecks provider and refuses mismatches and foreign orders',async()=>{
 assert.equal(typeof mod.createBillingService,'function');
 let grants=0,posts=0,consent=true;let order={id:orderId,user_id:userId,provider:'yookassa',shop_id:'own-shop',currency:'RUB',amount_minor:99000,test:true,created_at:new Date().toISOString(),status:'creating'};
 let payment={provider:'yookassa',externalId:'own-payment',userId,orderId,shopId:'own-shop',currency:'RUB',amount:99000,status:'succeeded',test:true};
 const repository={requireConsent:async()=>consent,plans:async()=>[{id:'month',label:'Месяц',days:30,amount_minor:99000,stars_amount:500}],beginOrder:async()=>order,attachOrder:async(id,external,url)=>(order={...order,external_payment_id:external,checkout_url:url,status:'pending'}),order:async q=>q.userId===userId?order:null,settleOrder:async()=>{if(order.status!=='paid')grants++;return order={...order,status:'paid'};}};
 const config={billingEnabled:true,legalReady:true,billingMode:'test',mode:'hybrid',shopId:'own-shop',paymentSecret:'fixture',starsEnabled:true};
 const service=mod.createBillingService({config,repository,providers:{stars:{},yookassa:{create:async()=>{posts++;return {externalId:'own-payment',url:'https://checkout.example/pay'};},read:async()=>payment}}});
 const principal={userId,methods:['email']};
 await service.create({principal,channel:'web',planId:'month',requestId:crypto.randomUUID()});assert.equal(posts,1);
 await service.check({principal,orderId});await service.check({principal,orderId});assert.equal(grants,1);
 await assert.rejects(()=>service.check({principal:{userId:crypto.randomUUID()},orderId}),/order_not_found/);
 payment={...payment,amount:1};await assert.rejects(()=>service.check({principal,orderId}),/payment_mismatch/);
 await assert.rejects(()=>service.create({principal,channel:'telegram',planId:'month',requestId:crypto.randomUUID()}),/telegram_identity_required/);
 consent=false;await assert.rejects(()=>service.create({principal,channel:'web',planId:'month',requestId:crypto.randomUUID()}),/consent_required/);
});
