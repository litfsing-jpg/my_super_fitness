import express from 'express';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep,relative,basename,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readConfig,publicConfig} from './config.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const CLIENT_FILES=new Set(['index.html','app.js','app.css','fitness-shell.js','fitness-shell.css','runtime-config.js','auth-client.mjs','data-client.mjs','storage.mjs','integrations.mjs','boot.mjs','account.html','account.mjs','login.html','login.css','login.mjs','billing-client.mjs','recipe-catalog.mjs','recipe-catalog.css','workout-history.js','progress-reports.js','apple-health.js','pose-technique.js','technique-recorder.js','manage.html','manage.js','manage.css','session-bridge.js','device-privacy.js','media-session.js','state-outbox.js','nutrition-outbox.js','account-actions.js','health-actions.js','media-report-actions.js','bodycheck-actions.js','proof-actions.js','proof-ui.js','proof-ui.css']);
CLIENT_FILES.add('private-media.mjs');
CLIENT_FILES.add('logout.mjs');
CLIENT_FILES.add('telegram-context.mjs');
export function createApp({config=readConfig(),auth,access,billing,root=ROOT,installRoutes,vendorFile=resolve(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js')}={}){
  const app=express();
  app.disable('x-powered-by');app.disable('etag');app.set('trust proxy',false);
  app.use((req,res,next)=>{
    res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Authorization, Cookie',
      'Content-Security-Policy':`default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' ${config.supabaseUrl||''}; frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors ${config.mode==='web'?"'none'":"'self' https://web.telegram.org https://*.telegram.org"}`});
    if(config.secure)res.set('Strict-Transport-Security','max-age=31536000');
    const host=req.get('host')||'';
    if(![new URL(config.origin).host,...(config.local?['127.0.0.1','localhost','[::1]'].map(h=>h+':'+req.socket.localPort):[])].includes(host))return res.status(403).json({error:'invalid_host'});
    if(req.method!=='GET'&&req.method!=='HEAD'&&!req.path.startsWith('/api/bot/webhook')&&req.path!=='/api/billing/webhook/yookassa'){
      const origin=req.get('origin');
      if((origin&&origin!==config.origin)||(!origin&&!req.get('authorization')))return res.status(403).json({error:'invalid_origin'});
    }
    next();
  });
  app.use(express.json({limit:'32kb',strict:true}));
  app.get('/api/config',(_,res)=>res.json(publicConfig(config)));
  app.get('/runtime-config.js',(_,res)=>{
    const legacy={brand:{...config.brand,logoMark:config.brand.logo},supabase:{url:config.supabaseUrl,anonKey:config.anonKey},billing:{checkoutUrl:'/login',plans:[]},support:{email:config.brand.supportEmail},publicUrl:config.origin,features:{appleHealth:false}};
    res.type('application/javascript').send('window.WL_CONFIG='+JSON.stringify(publicConfig(config)).replace(/</g,'\\u003c')+';window.WHITELABEL_CONFIG='+JSON.stringify(legacy).replace(/</g,'\\u003c')+';');
  });
  app.get('/vendor/supabase.js',(_,res)=>res.sendFile(basename(vendorFile),{root:dirname(vendorFile),dotfiles:'deny'}));
  app.get('/health',(_,res)=>res.json({ok:true,configured:config.configured}));
  app.get('/setup',(_,res)=>res.type('html').send(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Настройка платформы</title><body style="background:#0e0e10;color:#f5f3f0;font:16px system-ui;max-width:640px;margin:40px auto;padding:20px"><h1>Подключи свою платформу</h1><p>Рабочий доступ закрыт до завершения настройки.</p><p>Не заданы:</p><ul>${config.missing.map(name=>`<li><code>${name}</code></li>`).join('')}</ul><p>Выполни <code>npm run doctor</code> и открой README.</p></body></html>`));
  app.use('/api',(req,res,next)=>config.configured?next():res.status(503).json({error:'setup_required'}));
  const authenticate=async(req,res,next)=>{
    try{if(!auth)throw Object.assign(Error(),{status:503,code:'auth_unavailable'});req.principal=await auth.authenticate(req);next();}
    catch(e){res.status(e.status||401).json({error:e.code||'unauthorized'});}
  };
  const paid=async(req,res,next)=>{
    try{if(!config.legalReady)return res.status(403).json({error:'legal_setup_required'});const value=access?await access(req.principal):null;if(!value||!(value.contentActive??value.active))return res.status(403).json({error:'subscription_or_consent_required'});next();}
    catch{res.status(503).json({error:'access_unavailable'});}
  };
  if(installRoutes)installRoutes({app,authenticate,paid,config,auth,access,billing,root});
  app.use('/api',(_,res)=>res.status(404).json({error:'not_found'}));
  app.get('/',(req,res,next)=>config.configured?next():res.redirect('/setup'));
  app.use(async(req,res)=>{
    if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
    let path;try{path=decodeURIComponent(req.path);}catch{return res.status(404).end();}
    if(/[\\\x00-\x1f%]/.test(path)||path.split('/').some(p=>p.startsWith('.')))return res.status(404).end();
    const aliases={'/':'index.html','/login':'login.html','/manage':'manage.html','/account':'account.html'};
    const name=aliases[path]||path.slice(1);
    let dir='client';
    if(/^assets\/neutral\/[a-zA-Z0-9_./-]+\.(svg|webp|png|jpg|mp4|woff2)$/.test(name))dir='';
    else if(!CLIENT_FILES.has(name)&&!/^assets\/recipes\/(model\.js|runtime\.js|page\.html|style\.css|icons\/[a-z-]+\.svg)$/.test(name)&&!/^legal\/(offer|privacy|consent)\.html$/.test(name))return res.status(404).end();
    try{
      const parent=resolve(root,dir);const file=await realpath(resolve(parent,name));
      if(!file.startsWith(parent+sep))return res.status(404).end();
      res.sendFile(relative(parent,file),{root:parent,dotfiles:'deny',cacheControl:false});
    }catch{res.status(404).end();}
  });
  app.use((err,req,res,next)=>{if(res.headersSent)return next(err);res.status(err.status===413?413:400).json({error:err.status===413?'body_too_large':'invalid_request'});});
  return app;
}
