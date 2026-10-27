import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHmac} from 'node:crypto';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {readConfig} from '../server/config.mjs';
import {createRepository,createClientFactory} from '../server/repository.mjs';
import {createAuthAdmin} from '../server/auth/session.mjs';
import {createWebAuth} from '../server/auth/web.mjs';
import {verifyInitData,exchangeTelegramIdentity} from '../server/auth/telegram.mjs';
import {createBillingService} from '../server/billing/service.mjs';
import {installBillingRoutes} from '../server/billing/routes.mjs';
import {createApp} from '../server/app.mjs';

const root=new URL('../',import.meta.url),work=await mkdtemp(join(tmpdir(),'wl-local-auth-'));
const project='wltest'+randomUUID().replaceAll('-','').slice(0,12);
const endpoint=spawnSync('docker',['context','inspect','--format','{{.Endpoints.docker.Host}}'],{encoding:'utf8'});
if(endpoint.status!==0)throw Error('Docker is required for local Auth integration');
const env={PATH:process.env.PATH,HOME:work,DOCKER_HOST:endpoint.stdout.trim(),SUPABASE_TELEMETRY_DISABLED:'1'};
function command(cmd,args,input){const r=spawnSync(cmd,args,{env,input,encoding:'utf8',maxBuffer:10000000,timeout:900000});if(r.status!==0){const safe=(r.stderr||'').replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,'[redacted]').split('\n').filter(l=>!/(secret|token|password|anon.key|service.role)/i.test(l)).slice(-14).join('\n');throw Error(`Local ${cmd} failed: ${safe}`);}return r.stdout;}
async function available(port){return new Promise(resolve=>{const s=createServer();s.once('error',()=>resolve(false));s.listen(port,'127.0.0.1',()=>s.close(()=>resolve(true)));});}
let base=57000+Math.floor(Math.random()*5000);
for(let i=0;i<20;i++){let ok=true;for(let n=0;n<5;n++)if(!await available(base+n))ok=false;if(ok)break;base+=7;}
await mkdir(join(work,'supabase'),{recursive:true});
await writeFile(join(work,'supabase','config.toml'),`project_id = "${project}"
[api]
enabled = true
port = ${base}
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000
[db]
port = ${base+1}
shadow_port = ${base+2}
major_version = 17
[studio]
enabled = false
[inbucket]
enabled = true
port = ${base+3}
[storage]
enabled = true
file_size_limit = "10MiB"
[auth]
enabled = true
site_url = "http://127.0.0.1:4210"
additional_redirect_urls = ["http://127.0.0.1:4210/login"]
jwt_expiry = 3600
enable_signup = true
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
[analytics]
enabled = false
[edge_runtime]
enabled = false
`);
console.log('Starting an isolated local Supabase Auth/REST/PostgreSQL stack (no author credentials).');
try{
  command('supabase',['start','--workdir',work,'--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
  const status=JSON.parse(command('supabase',['status','--workdir',work,'-o','json']));
  const url=status.API_URL,key=status.ANON_KEY,service=status.SERVICE_ROLE_KEY;
  assert.ok(url.startsWith('http://127.0.0.1:'),'Only the created loopback Auth is allowed');
  const migrations=(await readdir(new URL('backend/migrations/',root))).filter(n=>n.endsWith('.sql')).sort();
  for(const file of migrations)command('docker',['exec','-i',`supabase_db_${project}`,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],await readFile(new URL('backend/migrations/'+file,root),'utf8'));
  const raw=command('docker',['exec',`supabase_db_${project}`,'psql','-U','postgres','-Atc','select id from public.wl_installation']);
  const installationId=raw.trim();
  const config=readConfig({WL_MODE:'hybrid',WL_INSTALLATION_ID:installationId,WL_APP_ORIGIN:'http://127.0.0.1:4210',WL_ALLOW_LOCAL_BACKEND:'1',WL_SUPABASE_URL:url,WL_SUPABASE_ANON_KEY:key,WL_SUPABASE_SERVICE_KEY:service,WL_BOT_TOKEN:'123456:fixture_only_not_a_real_bot_token',WL_BOT_WEBHOOK_SECRET:'fixture-secret',WL_LEGAL_READY:'1',WL_LEGAL_REVISION:'local-test'});
  const repository=createRepository({config}),factory=createClientFactory(config),admin=createAuthAdmin(factory),web=createWebAuth({config,clientFactory:factory});
  await repository.assertInstallation();
  const authAdmin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}).auth.admin;
  const {data:created,error:createError}=await authAdmin.createUser({email:'learner@example.invalid',password:'fixture-strong-password',email_confirm:true});
  assert.ok(!createError,'Fixture Web user creation');
  const webSession=await web.login({email:'learner@example.invalid',password:'fixture-strong-password'});
  assert.equal(webSession.userId,created.user.id,'Web login uses actual Auth UUID');
  const principal=await web.authenticate({get:()=> 'Bearer '+webSession.accessToken});
  assert.equal(principal.userId,webSession.userId);assert.equal(principal.admin,false);
  const fields=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:'{"id":789,"first_name":"Fixture"}'});
  const text=[...fields].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
  fields.set('hash',createHmac('sha256',createHmac('sha256','WebAppData').update(config.botToken).digest()).update(text).digest('hex'));
  const verified=verifyInitData(fields.toString(),{botToken:config.botToken});
  const telegram=await exchangeTelegramIdentity({verified,attemptId:randomUUID(),repository,authAdmin:admin});
  assert.ok(telegram.accessToken&&telegram.refreshToken,'Telegram exchange returns a real Auth session');
  assert.notEqual(telegram.userId,webSession.userId,'No accidental account merge');
  assert.equal((await web.authenticate({get:()=> 'Bearer '+telegram.accessToken})).methods.includes('telegram'),true);
  const again=await exchangeTelegramIdentity({verified,attemptId:randomUUID(),repository,authAdmin:admin});
  assert.equal(again.userId,telegram.userId,'Reopening Telegram preserves UUID');
  assert.equal((await web.refresh({refreshToken:again.refreshToken})).userId,telegram.userId,'Actual refresh works');
  const {createHash}=await import('node:crypto');const digest=createHash('sha256').update('fixture-only-link').digest('hex');
  await repository.createLinkNonce({userId:webSession.userId,digest});
  await repository.linkTelegramIdentity({userId:webSession.userId,digest,botId:verified.botId,telegramId:790});
  const linked=await exchangeTelegramIdentity({verified:{...verified,telegramId:790},attemptId:randomUUID(),repository,authAdmin:admin});
  assert.equal(linked.userId,webSession.userId,'Linked Telegram and Web share one Auth UUID');
  assert.equal((await repository.entitlement(await web.authenticate({get:()=> 'Bearer '+linked.accessToken}))).active,false,'Auth never grants a subscription');
  await assert.rejects(()=>repository.linkTelegramIdentity({userId:webSession.userId,digest,botId:verified.botId,telegramId:791}),'Consumed nonce cannot link twice');
  const races=await Promise.allSettled(Array.from({length:4},()=>exchangeTelegramIdentity({verified:{...verified,telegramId:792},attemptId:randomUUID(),repository,authAdmin:admin})));
  const successes=races.filter(r=>r.status==='fulfilled').map(r=>r.value);assert.ok(successes.length>=1);assert.equal(new Set(successes.map(s=>s.userId)).size,1,'Concurrent first Telegram logins have one owner');
  console.log('Real local Auth: email/password, Telegram bridge, concurrent identity reservation, refresh, explicit linking, stable UUID and no free entitlement: PASS.');
  command('docker',['exec','-i',`supabase_db_${project}`,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],"update public.wl_installation set legal_ready=true,legal_revision='local-test',legal_docs='{\"offer\":\"/legal/offer.html\",\"privacy\":\"/legal/privacy.html\",\"consent\":\"/legal/consent.html\",\"health\":\"/legal/consent.html\"}'; update public.wl_billing_plans set enabled=true;");
  const paidConfig={...config,billingEnabled:true,starsEnabled:true,shopId:'fixture-shop',paymentSecret:'fixture-shop-secret'};
  const paidRepo=createRepository({config:paidConfig});
  const consent=await factory(webSession.accessToken).rpc('wl_record_consent',{p_version:'local-test',p_accepted:{offer:true,privacy:true,personalData:true,healthData:true,confidential:true},p_device_id:'local-test-device'});assert.equal(consent.error,null);
  const payments=new Map();let malformed=false;
  const providers={yookassa:{create:async order=>{const p={provider:'yookassa',externalId:'fixture-'+order.id,orderId:order.id,userId:order.user_id,currency:order.currency,amount:Number(order.amount_minor),shopId:order.shop_id,test:order.test,status:'succeeded'};payments.set(order.id,p);return {externalId:p.externalId,url:'https://checkout.example.invalid/pay'};},read:async order=>({...payments.get(order.id),...(malformed?{amount:1}:{})})},stars:{create:async order=>({externalId:'invoice:'+order.id,url:'https://t.me/fixture_invoice'}),read:async()=>null}};
  const billing=createBillingService({config:paidConfig,repository:paidRepo,providers});
  const http=createApp({config:paidConfig,auth:web,access:p=>paidRepo.entitlement(p),billing,installRoutes:c=>installBillingRoutes(c)}).listen(0,'127.0.0.1');await new Promise(r=>http.once('listening',r));
  const api=async(path,{body,session=webSession}={})=>{const response=await fetch('http://127.0.0.1:'+http.address().port+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.accessToken,Origin:config.origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};};
  try{
   const createdOrder=await api('/api/billing/orders',{body:{planId:'month',channel:'web',requestId:randomUUID(),amount:1,userId:telegram.userId}});assert.equal(createdOrder.status,200);assert.equal(createdOrder.data.amount,99000);
   const id=createdOrder.data.id;
   malformed=true;assert.equal((await api('/api/billing/orders/'+id)).status,409);assert.equal((await paidRepo.entitlement(principal)).active,false);
   malformed=false;await Promise.all([api('/api/billing/orders/'+id),api('/api/billing/orders/'+id)]);
   assert.equal((await paidRepo.entitlement(principal)).active,true);
   const rows=await paidRepo.clientFactory('',true).from('pb_payments').select('payment_id').eq('user_id',principal.userId);assert.equal(rows.data.length,1,'Duplicate checks grant one payment');
   assert.equal((await api('/api/billing/orders/'+id,{session:telegram})).status,404,'Foreign user cannot inspect order');
   const linkedPrincipal=await web.authenticate({get:()=> 'Bearer '+linked.accessToken});
   const starOrder=await billing.create({principal:linkedPrincipal,planId:'month',channel:'telegram',requestId:randomUUID()});
   assert.equal(await billing.starsPreCheckout({telegramId:789,queryId:'wrong-owner',payload:starOrder.id,currency:'XTR',amount:500}),false);
   assert.equal(await billing.starsPreCheckout({telegramId:790,queryId:'one-checkout',payload:starOrder.id,currency:'XTR',amount:500}),true);
   assert.equal(await billing.starsPreCheckout({telegramId:790,queryId:'duplicate-checkout',payload:starOrder.id,currency:'XTR',amount:500}),false);
   const starPayment={invoice_payload:starOrder.id,currency:'XTR',total_amount:500,telegram_payment_charge_id:'fixture-star-charge'};
   await billing.starsPaid({telegramId:790,payment:starPayment});await billing.starsPaid({telegramId:790,payment:starPayment});
   const starRows=await paidRepo.clientFactory('',true).from('pb_payments').select('currency').eq('user_id',principal.userId);assert.equal(starRows.data.length,2);assert.deepEqual(starRows.data.map(r=>r.currency).sort(),['RUB','XTR']);
   console.log('HTTP -> real Auth/REST -> atomic SQL billing, amount/owner rejection, duplicate grants, Stars reservation and RUB/XTR separation: PASS.');
   const ownerClient=factory(webSession.accessToken),foreignClient=factory(telegram.accessToken);
   const clientId=randomUUID(),path=principal.userId+'/tasks/'+clientId+'.jpg';
   const photo=new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'});
   const upload=await ownerClient.storage.from('proofs').upload(path,photo,{contentType:'image/jpeg',upsert:false});assert.equal(upload.error,null,'Real Storage HTTP upload');
   const proofArgs={p_client_id:clientId,p_task_key:'mobility',p_task_text:'Fixture mobility',p_note:'Local evidence',p_storage_path:path,p_content_type:'image/jpeg',p_local_day:new Date().toISOString().slice(0,10),p_progress_epoch:null};
   const submitted=await ownerClient.rpc('wl_submit_proof',proofArgs);assert.equal(submitted.error,null);assert.equal(submitted.data.proof.user_id,principal.userId);
   const retry=await ownerClient.rpc('wl_submit_proof',proofArgs);assert.equal(retry.data.proof.id,submitted.data.proof.id,'Lost response retry keeps one receipt');
   assert.equal((await ownerClient.rpc('wl_my_proofs')).data.total,1);
   assert.equal((await ownerClient.storage.from('proofs').download(path)).error,null);
   assert.ok((await foreignClient.storage.from('proofs').download(path)).error,'Another owner cannot read evidence');
   assert.ok((await ownerClient.storage.from('proofs').upload(path,photo,{contentType:'image/jpeg',upsert:true})).error,'Submitted evidence cannot be overwritten');
   await ownerClient.storage.from('proofs').remove([path]);
   assert.equal((await ownerClient.storage.from('proofs').download(path)).error,null,'Delete request cannot remove submitted evidence');
   command('docker',['exec',`supabase_db_${project}`,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-c',"update public.wl_installation set legal_revision='new-local-test';"]);
   assert.ok((await ownerClient.rpc('wl_my_proofs')).error,'Consent expiry blocks proof RPC');
   assert.ok((await ownerClient.storage.from('proofs').download(path)).error,'Consent expiry blocks Storage HTTP download');
   console.log('Real Storage upload -> idempotent proof receipt -> private read, cross-owner/overwrite/delete denial and consent expiry: PASS.');
  }finally{await new Promise(r=>http.close(r));}
}finally{
  spawnSync('supabase',['stop','--workdir',work,'--no-backup'],{env,encoding:'utf8',timeout:120000});
  await rm(work,{recursive:true,force:true});
}
