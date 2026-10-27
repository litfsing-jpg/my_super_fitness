import {client,request,config} from './auth-client.mjs';
const $=id=>document.getElementById(id),notice=text=>$('notice').textContent=text;
try{
 const {data}=await client.auth.getSession();if(!data.session){location.replace('/login');throw Error('unauthorized');}
 const r=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+data.session.access_token}});const account=await r.json();if(!r.ok)throw Error('unauthorized');
 $('accountIdentity').textContent=data.session.user.email?.endsWith('@telegram.invalid')?'Вход через Telegram':data.session.user.email||'Аккаунт';
 $('manageLink').hidden=!account.admin;$('webIdentity').hidden=config.mode==='telegram';$('linkTelegram').hidden=config.mode!=='hybrid';
 $('emailForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{
  await request('/api/auth/password',{password:$('password').value},true);
  const {error}=await client.auth.updateUser({email:$('email').value},{emailRedirectTo:config.origin+'/login'});if(error)throw error;
  $('password').value='';notice('Подтверди адрес по ссылке из письма в этом браузере. История останется в том же аккаунте.');
 }catch{notice('Не удалось обновить вход. Проверь адрес и настройки почты у владельца. Аккаунты не объединяются автоматически.');}finally{button.disabled=false;}});
 $('linkTelegram').addEventListener('click',async()=>{try{const link=await request('/api/auth/link/start',{},true);if(!link.url)throw Error();$('botLink').href=link.url;$('botLink').hidden=false;notice('Ссылка действует пять минут. Подтверди привязку в своём боте.');}catch{notice('Не удалось создать ссылку. Повтори позже.');}});
 $('logout').addEventListener('click',()=>window.WLAccess.logout().catch(()=>notice('Не удалось очистить данные устройства. Повтори выход.')));
}catch{notice('Войди в аккаунт, чтобы открыть настройки.');}
