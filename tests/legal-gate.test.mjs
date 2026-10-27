import {test} from 'node:test';import assert from 'node:assert/strict';import {createApp} from '../server/app.mjs';import {readConfig} from '../server/config.mjs';
test('private HTTP data requires configured legal documents and current consent, not only a paid flag',async()=>{
 const config={...readConfig(),configured:true,legalReady:false};let consent=false;
 const app=createApp({config,auth:{authenticate:async()=>({userId:'fixture'})},access:async()=>({active:true,contentActive:consent}),installRoutes:({app,authenticate,paid})=>app.get('/api/private',authenticate,paid,(_,res)=>res.json({ok:true}))});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port+'/api/private';
 try{assert.equal((await fetch(url)).status,403);config.legalReady=true;assert.equal((await fetch(url)).status,403);consent=true;assert.equal((await fetch(url)).status,200);}finally{await new Promise(r=>server.close(r));}
});
