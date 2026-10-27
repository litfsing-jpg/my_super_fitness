import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readConfig} from '../server/config.mjs';
const mod=await import('../server/app.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('gateway exists and closes unconfigured access',async()=>{
  assert.equal(typeof mod.createApp,'function');
  const server=mod.createApp({config:readConfig({})}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(base+'/setup')).status,200);
    assert.equal((await fetch(base+'/api/catalog/exercises?pb_preview=1')).status,503);
    for(const path of ['/.env.local','/server/config.mjs','/content/demo/exercises.json','/.vercel/project.json','/%2e%2e/brand.config.json'])assert.equal((await fetch(base+path)).status,404,path);
    assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
