import {test} from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../server/auth/web.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('web contacts reject internal Telegram aliases and malformed values',()=>{
  assert.equal(typeof mod.validateCredentials,'function');
  assert.equal(mod.validateCredentials({email:' Demo@Example.org ',password:'strong-fixture-password'}).email,'demo@example.org');
  for(const body of [{email:'x@telegram.invalid',password:'strong-fixture-password'},{email:'bad',password:'strong-fixture-password'},{email:'a@example.org',password:'short'}])assert.throws(()=>mod.validateCredentials(body));
});
test('principal comes from Auth and database, not metadata',{skip:!mod.createWebAuth},async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const auth=mod.createWebAuth({config:{installationId:'own-installation'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id,user_metadata:{admin:true}}}})},rpc:async()=>({data:{userId:id,methods:['web'],admin:false,installationId:'own-installation'}})})});
  const p=await auth.authenticate({get:()=> 'Bearer fixture-access'});assert.equal(p.admin,false);
  await assert.rejects(()=>auth.authenticate({get:()=> 'Bearer one, Bearer two'}));
});
