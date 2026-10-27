import {readFileSync} from 'node:fs';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const baseBrand=JSON.parse(readFileSync(new URL('../brand.config.json',import.meta.url),'utf8'));
const localHost=host=>['localhost','127.0.0.1','[::1]'].includes(host);
function origin(value,{backend=false,localAllowed=false}={}){
  const url=new URL(value);
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!['https:','http:'].includes(url.protocol))throw Error('Invalid origin');
  if(url.protocol!=='https:'&&(!localHost(url.hostname)||(backend&&!localAllowed)))throw Error('HTTPS origin required');
  return url.origin;
}
export function readConfig(env=process.env,brand=baseBrand){
  const mode=env.WL_MODE||'hybrid';
  if(!['web','telegram','hybrid'].includes(mode))throw Error('Invalid mode');
  const appOrigin=origin(env.WL_APP_ORIGIN||'http://127.0.0.1:4210');
  const local=localHost(new URL(appOrigin).hostname);
  const installationId=env.WL_INSTALLATION_ID||'';
  if(installationId&&!UUID.test(installationId))throw Error('Invalid installation ID');
  const supabaseUrl=env.WL_SUPABASE_URL?origin(env.WL_SUPABASE_URL,{backend:true,localAllowed:local&&env.WL_ALLOW_LOCAL_BACKEND==='1'}):'';
  const anonKey=env.WL_SUPABASE_ANON_KEY||'';
  if(anonKey&&!anonKey.startsWith('sb_publishable_')){
    let role;try{role=JSON.parse(Buffer.from(anonKey.split('.')[1],'base64url')).role;}catch{}
    if(role!=='anon')throw Error('Public Supabase key required');
  }
  const port=Number(env.WL_PORT||new URL(appOrigin).port||4210);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
  const host=env.WL_BIND_HOST||'127.0.0.1';
  if(local&&!localHost(host))throw Error('Local HTTP must bind to loopback');
  const paymentMode=env.WL_BILLING_MODE||'test';
  if(!['test','live'].includes(paymentMode))throw Error('Invalid billing mode');
  if(!/^#[a-f0-9]{6}$/i.test(brand.accent)||!/^#[a-f0-9]{6}$/i.test(brand.background)||typeof brand.name!=='string'||brand.name.length>80)throw Error('Invalid brand');
  const publicBrand={name:brand.name,shortName:String(brand.shortName||brand.name).slice(0,80),accent:brand.accent,accentDark:brand.accentDark||brand.accent,background:brand.background,logo:brand.logo||'/assets/neutral/logo.svg',supportEmail:String(brand.supportEmail||'').slice(0,254)};
  if(!/^#[a-f0-9]{6}$/i.test(publicBrand.accentDark)||!/^\/assets\/neutral\/[a-zA-Z0-9_-]+\.(svg|png|webp)$/.test(publicBrand.logo))throw Error('Invalid public brand');
  const botToken=env.WL_BOT_TOKEN||'';
  const botId=botToken.split(':')[0];
  const missing=[];
  for(const [name,value] of [['WL_INSTALLATION_ID',installationId],['WL_SUPABASE_URL',supabaseUrl],['WL_SUPABASE_ANON_KEY',anonKey]])if(!value)missing.push(name);
  if(!env.WL_SUPABASE_SERVICE_KEY)missing.push('WL_SUPABASE_SERVICE_KEY');
  if(mode!=='web')for(const name of ['WL_BOT_TOKEN','WL_BOT_WEBHOOK_SECRET'])if(!env[name])missing.push(name);
  const legalRevision=env.WL_LEGAL_REVISION||brand.legalRevision||'';
  const legalReady=env.WL_LEGAL_READY==='1'&&!!legalRevision;
  return Object.freeze({mode,installationId,origin:appOrigin,local,port,host,
    secure:!local,brand:Object.freeze(publicBrand),legalReady,legalRevision,
    supabaseUrl,anonKey,serviceKey:env.WL_SUPABASE_SERVICE_KEY||'',
    botToken,botId,botUsername:env.WL_BOT_USERNAME||'',webhookSecret:env.WL_BOT_WEBHOOK_SECRET||'',
    billingMode:paymentMode,billingEnabled:env.WL_BILLING_ENABLED==='1',
    shopId:env.WL_YOOKASSA_SHOP_ID||'',paymentSecret:env.WL_YOOKASSA_SECRET||'',starsEnabled:env.WL_STARS_ENABLED==='1',
    configured:missing.length===0,missing:Object.freeze(missing)});
}
export function publicConfig(config){
  return {mode:config.mode,installationId:config.installationId,origin:config.origin,demo:config.demo===true,
    configured:config.configured,missing:config.missing,brand:config.brand,
    legalReady:config.legalReady,legalRevision:config.legalRevision,
    supabaseUrl:config.supabaseUrl,anonKey:config.anonKey,botUsername:config.botUsername,
    features:{telegram:config.mode!=='web',web:config.mode!=='telegram',billing:config.billingEnabled,stars:config.starsEnabled}};
}
