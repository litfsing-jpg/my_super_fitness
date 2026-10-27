import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../server/bot/app.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('own bot shows own launch URL and rejects untrusted webhook',async()=>{
 assert.equal(typeof mod.createBot,'function');
 const calls=[];const config={botToken:'123:synthetic-fixture',billingMode:'test',origin:'https://student.example',brand:{name:'Форма',supportEmail:'help@student.example'},webhookSecret:'fixture'};
 const bot=mod.createBot({config,repository:{},billing:{}});
 bot.api.config.use(async(previous,method,payload)=>{calls.push({method,payload});return {ok:true,result:method==='getMe'?{id:123,is_bot:true,first_name:'Форма',username:'student_bot'}:{message_id:1,date:0,chat:{id:7,type:'private'}}};});
 let handler;mod.installBotRoutes({app:{post:(path,fn)=>handler=fn},bot,config});
 const update={update_id:1,message:{message_id:1,date:0,chat:{id:7,type:'private'},from:{id:7,is_bot:false,first_name:'Demo'},text:'/start',entities:[{offset:0,length:6,type:'bot_command'}]}};
 let code=200;await handler({get:()=>config.webhookSecret,body:update},{status:n=>(code=n,{json(){}}),json(){}});
 assert.equal(code,200);assert.equal(calls[0].method,'getMe');assert.equal(calls.find(c=>c.method==='sendMessage').payload.reply_markup.inline_keyboard[0][0].web_app.url,config.origin);
 assert.equal(mod.validWebhookSecret('bad','fixture'),false);assert.equal(mod.validWebhookSecret('fixture','fixture'),true);
});
