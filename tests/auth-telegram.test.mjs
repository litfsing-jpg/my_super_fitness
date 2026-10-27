import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
const mod=await import('../server/auth/telegram.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const token='123456:fixture_only_not_a_real_bot_token';
function sign(fields,botToken=token){const p=new URLSearchParams(fields);const text=[...p].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');p.set('hash',createHmac('sha256',createHmac('sha256','WebAppData').update(botToken).digest()).update(text).digest('hex'));return p.toString();}
export const signedFixture=(now=1000)=>sign({auth_date:String(now),user:JSON.stringify({id:789,first_name:'Demo'})});
test('Telegram validation uses the bot HMAC and bounded auth_date',()=>{
  assert.equal(typeof mod.verifyInitData,'function');
  const verified=mod.verifyInitData(signedFixture(),{botToken:token,now:1000});
  assert.equal(verified.telegramId,789);assert.equal(verified.botId,123456);
  for(const [raw,options] of [[signedFixture()+'&user={}',{}],[signedFixture().replace('Demo','Other'),{}],[signedFixture(),{botToken:'999:wrong'}],[signedFixture(699),{}],[signedFixture(1031),{}],[sign({auth_date:'1000',user:'{"id":1.5}'}),{}],[sign({auth_date:'1000',user:'{"id":-1}'}),{}]])assert.throws(()=>mod.verifyInitData(raw,{botToken:token,now:1000,...options}));
});
test('bridge mints only the mapped UUID and never returns magic hashes',{skip:!mod.exchangeTelegramIdentity},async()=>{
  const userId=randomUUID(),provisionId=randomUUID();let email;
  const repository={reserveTelegramIdentity:async()=>({userId:null,provisionId}),finishTelegramIdentity:async({userId:id})=>assert.equal(id,userId)};
  const authAdmin={generateLink:async(value)=>{email=value;return {user:{id:userId,email:value},hash:'fixture-hash'};},verifyLink:async()=>({userId,accessToken:'fixture-access',refreshToken:'fixture-refresh',expiresAt:2000})};
  const result=await mod.exchangeTelegramIdentity({verified:{botId:123,telegramId:789},attemptId:randomUUID(),repository,authAdmin});
  assert.equal(email,provisionId+'@telegram.invalid');assert.equal(result.userId,userId);assert.ok(!JSON.stringify(result).includes('fixture-hash'));
  repository.reserveTelegramIdentity=async()=>({userId,provisionId});
  authAdmin.getUser=async()=>({id:userId,email:'owned@example.invalid'});
  authAdmin.verifyLink=async()=>({userId:randomUUID(),accessToken:'wrong-user'});
  await assert.rejects(()=>mod.exchangeTelegramIdentity({verified:{botId:123,telegramId:789},attemptId:randomUUID(),repository,authAdmin}),/identity_mismatch/);
});
