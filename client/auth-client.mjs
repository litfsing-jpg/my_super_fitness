import {captureLaunch} from './telegram-context.mjs';
export const config=window.WL_CONFIG;
export const client=window.WLAuthClient;
export async function request(path,body={},authenticate=false){
  const headers={'Content-Type':'application/json'};
  if(authenticate){const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('unauthorized');headers.Authorization='Bearer '+data.session.access_token;}
  const response=await fetch(path,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const value=await response.json();if(!response.ok)throw Error(value.error||'service_unavailable');return value;
}
export async function adopt(session){
  const {error}=await client.auth.setSession({access_token:session.accessToken,refresh_token:session.refreshToken});if(error)throw Error('invalid_session');
}
export async function login(email,password){const session=await request('/api/auth/login',{email,password});await adopt(session);return session;}
export async function register(email,password,accepted){
  await request('/api/auth/register',{email,password,accepted});
  const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/login',data:{accepted_legal_revision:config.legalRevision}}});
  if(error)throw Error(error.status===429?'mail_rate_limited':'signup_unavailable');
}
export async function recover(email){await request('/api/auth/recover',{email});const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/login?auth=recovery'});if(error)throw Error('recovery_unavailable');}
export async function callback(){
  const url=new URL(location.href),code=url.searchParams.get('code');
  if(url.hash.includes('access_token')||url.hash.includes('refresh_token')){history.replaceState(null,'','/login');throw Error('unsupported_auth_callback');}
  if(!code)return false;
  const recovery=url.searchParams.get('auth')==='recovery';
  history.replaceState(null,'',recovery?'/login?auth=recovery':'/login');
  const {error}=await client.auth.exchangeCodeForSession(code);if(error)throw Error('callback_expired_or_other_browser');return recovery?'recovery':'confirmed';
}
const launch=()=>captureLaunch({storage:sessionStorage,id:config.installationId,hash:location.hash,raw:window.Telegram?.WebApp?.initData||''});
export function initData(){return launch()?.raw||'';}
export async function loadTelegram(){
  if(config.mode==='web')return null;const context=launch();
  if(!context&&!window.TelegramWebviewProxy&&!window.Telegram?.WebApp?.initData)return null;
  window.WLChannel='telegram';
  if(!window.Telegram?.WebApp&&context){const params=new URLSearchParams(context.sdk);if(context.raw)params.set('tgWebAppData',context.raw);if(params.size)history.replaceState(null,'',location.pathname+location.search+'#'+params);}
  if(!window.Telegram?.WebApp){await new Promise(resolve=>{const script=document.createElement('script');script.src='https://telegram.org/js/telegram-web-app.js';script.onload=resolve;script.onerror=resolve;document.head.append(script);setTimeout(resolve,5000);});}
  const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();if(location.hash.includes('tgWebApp'))history.replaceState(null,'',location.pathname+location.search);return tg;
}
export async function telegramLogin({createAccount=false,accepted=false}={}){
  const raw=initData();if(!raw)throw Error('open_in_telegram');
  const key='wl:'+config.installationId+':telegram-attempt';
  let attemptId=sessionStorage.getItem(key);if(!attemptId){attemptId=crypto.randomUUID();sessionStorage.setItem(key,attemptId);}
  const result=await request('/api/auth/telegram',{initData:raw,attemptId,createAccount,accepted});
  if(result.accessToken){await adopt(result);sessionStorage.removeItem(key);}return result;
}
