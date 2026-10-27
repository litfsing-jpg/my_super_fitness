import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readConfig} from '../server/config.mjs';
import {createApp} from '../server/app.mjs';
const mod=await import('../server/auth/routes.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('auth routes gate modes and bind link nonces to the authenticated owner',async()=>{
  assert.equal(typeof mod.installAuthRoutes,'function');
  const owner=randomUUID(),config={...readConfig({}),configured:true,mode:'web'};let nonceOwner;
  const auth={authenticate:async()=>({userId:owner,admin:false}),login:async()=>({userId:owner})};
  const repository={assertInstallation:async()=>true,createLinkNonce:async({userId})=>{nonceOwner=userId;}};
  const server=createApp({config,auth,access:async()=>({active:false}),installRoutes:ctx=>mod.installAuthRoutes({...ctx,repository,authAdmin:{}})}).listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{Authorization:'Bearer fixture-token-value','Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await post('/api/auth/telegram',{initData:'forged'})).status,403);
    assert.equal((await post('/api/auth/link/start',{userId:randomUUID()})).status,403);
    config.mode='hybrid';
    const response=await post('/api/auth/link/start',{userId:randomUUID()});assert.equal(response.status,200);assert.equal(nonceOwner,owner);
    const body=await response.json();assert.ok(body.nonce.length>=32);assert.ok(!body.nonce.includes(owner));
  }finally{await new Promise(r=>server.close(r));}
});
