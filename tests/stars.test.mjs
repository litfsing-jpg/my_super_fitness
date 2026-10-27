import {test} from 'node:test';import assert from 'node:assert/strict';import {createStars} from '../server/billing/stars.mjs';import {createBillingService} from '../server/billing/service.mjs';
test('Stars reconciliation sees charge/refund pairs regardless of event order',async()=>{
 const order={id:'fixture-order',user_id:'fixture-user',provider:'stars',external_payment_id:'invoice:fixture-order',amount_minor:500,status:'pending'};
 const source={type:'user',user:{id:7},invoice_payload:order.id};
 const provider=createStars({config:{botId:'123',billingMode:'test',lookupTelegram:async()=>({user_id:order.user_id})},api:{getStarTransactions:async()=>({transactions:[{id:'charge',amount:500,receiver:source},{id:'charge',amount:500,source}]})}});
 assert.equal((await provider.read(order)).status,'refunded');
});
test('worker rotates pending invoices even when read has no charge or fails',async()=>{
 const orders=Array.from({length:21},(_,i)=>({id:String(i),provider:'stars',status:'pending',checked_at:0}));let time=0;const checked=new Set();
 const repository={candidates:async()=>[...orders].sort((a,b)=>a.checked_at-b.checked_at).slice(0,20),touchOrder:async id=>{orders.find(o=>o.id===id).checked_at=++time;}};
 const billing=createBillingService({config:{billingEnabled:true,legalReady:true,mode:'hybrid',starsEnabled:true},repository,providers:{stars:{read:async o=>{checked.add(o.id);if(o.id==='2')throw Error('fixture outage');return null;}}}});
 await billing.tick();await billing.tick();assert.equal(checked.size,21);
});
