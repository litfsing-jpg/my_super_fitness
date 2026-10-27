import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createApp} from '../server/app.mjs';
import {createContent,installContentRoutes} from '../server/content.mjs';
import {readConfig} from '../server/config.mjs';
import {pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const owners=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
export function createDemo({port=4211}={}){
 const config={...readConfig({WL_MODE:'web',WL_APP_ORIGIN:'http://127.0.0.1:'+port}),configured:true,installationId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',supabaseUrl:'http://127.0.0.1:'+port,anonKey:'sb_publishable_demonstration_only',legalReady:true,legalRevision:'demo-only',demo:true,missing:[]};
 const records=new Map();const session=owner=>({access_token:'demo-session-'+owners.indexOf(owner),refresh_token:'demo-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:owner,email:'demo@example.invalid'}});
 const auth={authenticate:async req=>{const n=/^Bearer demo-session-([01])$/.exec(req.get('authorization')||'')?.[1];if(n===undefined)throw Object.assign(Error(),{status:401});return {userId:owners[Number(n)],accessToken:'demo-session-'+n,methods:['email'],admin:false};}};
 const access=async()=>({active:true,expiresAt:new Date(Date.now()+86400000*30).toISOString()});
 const app=createApp({config,root,auth,access,vendorFile:resolve(root,'client/demo-adapter.js'),installRoutes:context=>{
  // The demo never loads environment files, contacts Auth, creates charges or sends Telegram messages.
  for(const path of ['/','/index.html'])context.app.get(path,async(_,res)=>{
   const html=(await readFile(resolve(root,'client/index.html'),'utf8')).replace(/<link[^>]+(?:fonts\.googleapis|fonts\.gstatic)[^>]*>/g,'');
   res.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");res.type('html').send(html);
  });
  context.app.get('/api/auth/me',context.authenticate,async(req,res)=>res.json({...req.principal,entitlement:await access()}));
  context.app.post('/api/session',context.authenticate,async(req,res)=>res.json({userId:req.principal.userId,...await access()}));
  context.app.delete('/api/session',context.authenticate,(_,res)=>res.json({ok:true}));
  context.app.get('/api/demo/session',(req,res)=>res.json(session(owners[req.query.owner==='two'?1:0])));
  context.app.post('/api/demo/query',context.authenticate,(req,res)=>{
   const {table,operation,values,filters=[],single,rpc}=req.body,owner=req.principal.userId;
   if(rpc){
    const results={wl_get_current_consent:{ok:true,consent_version:'demo-only'},wl_record_consent:{ok:true,consent_version:'demo-only'},pb_get_latest_progress_reset:null,wl_my_proofs:{rows:[],total:0}};
    return res.json({data:results[rpc]??null,error:null});
   }
   const key=owner+':'+table;let rows=records.get(key)||[];
   if(table==='pb_subscriptions')rows=[{user_id:owner,status:'active',current_period_end:new Date(Date.now()+2592000000).toISOString()}];
   const matches=row=>filters.every(([k,v])=>String(row[k])===String(v));
   if(['insert','upsert','update'].includes(operation)){
    const incoming=(Array.isArray(values)?values:[values]).map(v=>({...v,user_id:owner}));
    for(const row of incoming){const index=rows.findIndex(r=>table==='pb_user_state'?r.user_id===owner:row.id?r.id===row.id:row.day?r.day===row.day:false);if(index>=0)rows[index]={...rows[index],...row};else rows.push({...row,id:row.id||crypto.randomUUID()});}
    records.set(key,rows);
   }else if(operation==='delete'){rows=rows.filter(row=>!matches(row));records.set(key,rows);}
   const result=rows.filter(matches);res.json({data:single?result[0]||null:result,error:null});
  });
  installContentRoutes({...context,content:createContent({directory:resolve(root,'content/demo')})});
 }});
 return {app,config};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.argv[2]||4211);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid demo port');
 const {app}=createDemo({port});const server=app.listen(port,'127.0.0.1',()=>console.log('Local demonstration only: http://127.0.0.1:'+port));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
