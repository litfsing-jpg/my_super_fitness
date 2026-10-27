import {test} from 'node:test';import assert from 'node:assert/strict';import {createDemo} from '../scripts/demo.mjs';import {createApp} from '../server/app.mjs';
test('isolated demo works without env; production URL cannot enable it',async()=>{
 const server=createDemo({port:4211}).app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{const r=await fetch(base+'/vendor/supabase.js');assert.ok((await r.text()).includes('fictional SDK'));const html=await (await fetch(base+'/')).text();assert.ok(!html.includes('fonts.googleapis'));const session=await (await fetch(base+'/api/demo/session')).json();const catalog=await fetch(base+'/api/catalog/exercises',{headers:{Authorization:'Bearer '+session.access_token}});assert.equal(catalog.status,200);assert.equal((await catalog.json()).length,3);}finally{await new Promise(r=>server.close(r));}
 const prod=createApp().listen(0,'127.0.0.1');await new Promise(r=>prod.once('listening',r));try{const r=await fetch('http://127.0.0.1:'+prod.address().port+'/api/demo/session?pb_preview=1');assert.equal(r.status,503);}finally{await new Promise(r=>prod.close(r));}
});
