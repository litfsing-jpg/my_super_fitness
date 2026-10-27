import {Bot,InlineKeyboard} from 'grammy';
import {timingSafeEqual} from 'node:crypto';
import {nonceDigest} from '../auth/routes.mjs';
export function validWebhookSecret(actual,expected){const a=Buffer.from(actual||''),b=Buffer.from(expected||'');return b.length>=1&&a.length===b.length&&timingSafeEqual(a,b);}
export function createBot({config,repository,billing}){
 const bot=new Bot(config.botToken,{client:{environment:config.billingMode==='test'?'test':'prod',timeoutSeconds:8}});
 const launch=new InlineKeyboard().webApp('Открыть платформу',config.origin);
 bot.command('start',async ctx=>{
  if(ctx.chat.type!=='private')return;
  const nonce=/^link_([A-Za-z0-9_-]{32})$/.exec(ctx.match||'')?.[1];
  if(nonce){await ctx.reply('Подтвердить привязку этого Telegram к аккаунту, из которого была открыта ссылка?',{reply_markup:new InlineKeyboard().text('Подтвердить привязку','link:'+nonce)});return;}
  await ctx.reply(config.brand.name+' · тренировки, питание и твой прогресс.',{reply_markup:launch});
 });
 bot.command(['support','paysupport'],ctx=>ctx.reply(config.brand.supportEmail?'По вопросам доступа и оплаты: '+config.brand.supportEmail:'Контакт поддержки ещё не настроен владельцем.'));
 bot.callbackQuery(/^link:([A-Za-z0-9_-]{32})$/,async ctx=>{
  if(ctx.chat?.type!=='private')return;
  try{await repository.linkTelegramIdentity({botId:Number(config.botId),telegramId:ctx.from.id,digest:nonceDigest(ctx.match[1])});await ctx.answerCallbackQuery({text:'Аккаунт привязан'});await ctx.reply('Готово. Оба способа входа используют один аккаунт.',{reply_markup:launch});}
  catch{await ctx.answerCallbackQuery({text:'Ссылка истекла или аккаунт уже связан. Создай новую ссылку в настройках.',show_alert:true});}
 });
 bot.on('pre_checkout_query',async ctx=>{
  const q=ctx.preCheckoutQuery;let ok=false;
  try{ok=await billing.starsPreCheckout({telegramId:q.from.id,queryId:q.id,payload:q.invoice_payload,currency:q.currency,amount:q.total_amount});}catch{}
  await ctx.answerPreCheckoutQuery(ok,ok?{}:{error_message:'Этот счёт недоступен. Открой новый заказ в приложении.'});
 });
 bot.on('message:successful_payment',async ctx=>{await billing.starsPaid({telegramId:ctx.from.id,payment:ctx.message.successful_payment});await ctx.reply('Оплата получена, доступ открыт.',{reply_markup:launch});});
 bot.on('message:refunded_payment',async ctx=>{await billing.starsPaid({telegramId:ctx.from.id,payment:ctx.message.refunded_payment,refunded:true});await ctx.reply('Возврат зарегистрирован. По вопросам доступа обратись в поддержку.');});
 return bot;
}
export function installBotRoutes({app,bot,config}){
 let initializing;
 app.post('/api/bot/webhook',async(req,res)=>{
  if(!validWebhookSecret(req.get('X-Telegram-Bot-Api-Secret-Token'),config.webhookSecret))return res.status(403).json({error:'invalid_webhook_secret'});
  try{if(!Number.isSafeInteger(req.body?.update_id))return res.status(400).json({error:'invalid_update'});if(!initializing)initializing=bot.init().catch(e=>{initializing=null;throw e;});await initializing;await bot.handleUpdate(req.body);res.json({ok:true});}
  catch{res.status(503).json({error:'bot_temporarily_unavailable'});}
 });
}
