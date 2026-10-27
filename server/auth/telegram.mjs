import {createHmac,timingSafeEqual} from 'node:crypto';
import {AppError} from '../errors.mjs';
import {UUID} from '../config.mjs';
export function verifyInitData(raw,{botToken,now=Math.floor(Date.now()/1000),maxAgeSeconds=300}){
  const bad=()=>{throw new AppError(401,'invalid_telegram_data');};
  if(typeof raw!=='string'||raw.length>8192||!botToken)bad();
  const params=new URLSearchParams(raw),seen=new Set();
  for(const [key] of params){if(seen.has(key))bad();seen.add(key);}
  const hash=params.get('hash');if(!/^[a-f0-9]{64}$/i.test(hash||''))bad();
  params.delete('hash');
  const text=[...params].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=createHmac('sha256','WebAppData').update(botToken).digest();
  const expected=createHmac('sha256',secret).update(text).digest();
  if(!timingSafeEqual(expected,Buffer.from(hash,'hex')))bad();
  const authDate=Number(params.get('auth_date'));
  if(!/^\d+$/.test(params.get('auth_date')||'')||!Number.isSafeInteger(authDate)||authDate<now-maxAgeSeconds||authDate>now+30)bad();
  let user;try{user=JSON.parse(params.get('user'));}catch{bad();}
  if(!Number.isSafeInteger(user?.id)||user.id<=0)bad();
  const botId=Number(botToken.split(':')[0]);if(!Number.isSafeInteger(botId)||botId<=0)bad();
  return {botId,telegramId:user.id,authDate,name:typeof user.first_name==='string'?user.first_name.slice(0,80):''};
}
export async function exchangeTelegramIdentity({verified,attemptId,repository,authAdmin}){
  if(!UUID.test(attemptId||''))throw new AppError(400,'invalid_attempt');
  const row=await repository.reserveTelegramIdentity({...verified,attemptId});
  const existingId=row.userId;
  const email=existingId?(await authAdmin.getUser(existingId)).email:row.provisionId+'@telegram.invalid';
  const link=await authAdmin.generateLink(email);
  if(!UUID.test(link.user?.id||'')||(existingId&&link.user.id!==existingId)||link.user.email?.toLowerCase()!==email.toLowerCase())throw new AppError(409,'identity_mismatch');
  if(!existingId)await repository.finishTelegramIdentity({...verified,attemptId,userId:link.user.id});
  const session=await authAdmin.verifyLink(link.hash);
  if(session.userId!==link.user.id)throw new AppError(409,'identity_mismatch');
  return session;
}
