import {config,client,login,register,recover,callback,request,loadTelegram,telegramLogin} from './auth-client.mjs';
const $=id=>document.getElementById(id);let mode='login',busy=false;
$('brandName').textContent=config.brand.name;document.title=config.brand.name+' · вход';document.documentElement.style.setProperty('--accent',config.brand.accent);
const messages={invalid_credentials:'Проверь почту и пароль.',email_not_confirmed:'Подтверди почту по ссылке из письма.',legal_setup_or_acceptance_required:'Владелец должен настроить документы сервиса. Затем подтверди согласие.',callback_expired_or_other_browser:'Ссылка истекла или открыта в другом браузере. Запроси новую ссылку; после подтверждения почты можно войти с паролем.',open_in_telegram:'Открой приложение через своего бота.',identity_conflict:'Этот Telegram уже связан с другим аккаунтом. Автоматическое объединение недоступно.',mail_rate_limited:'Слишком много запросов писем. Повтори позже.',rate_limited:'Слишком много попыток. Подожди и повтори.',setup_required:'Платформа ещё не настроена.',subscription_required:'Нет активной подписки.',recovery_unavailable:'Не удалось отправить письмо. Повтори позже.'};
function notice(value){$('authNotice').textContent=messages[value]||value;$('authNotice').hidden=false;}
function showMode(next){mode=next;$('passwordLabel').hidden=next==='recover';$('password').required=next!=='recover';$('emailLabel').hidden=next==='reset';$('email').required=next!=='reset';$('consent').hidden=next!=='register';$('password').autocomplete=next==='login'?'current-password':'new-password';$('authTitle').textContent={login:'С возвращением',register:'Создать аккаунт',recover:'Восстановить доступ',reset:'Новый пароль'}[mode];$('submit').textContent={login:'Войти',register:'Зарегистрироваться',recover:'Отправить ссылку',reset:'Сохранить пароль'}[mode];for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){notice(messages[e.message]?e.message:'Не удалось выполнить действие. Проверь соединение и повтори.');}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>showMode(b.dataset.mode));
$('recover').addEventListener('click',()=>showMode('recover'));
$('authForm').addEventListener('submit',e=>{e.preventDefault();action(async()=>{
 if(mode==='login'){await login($('email').value,$('password').value);await access();}
 else if(mode==='register'){await register($('email').value,$('password').value,$('accepted').checked);notice('Проверь почту и подтверди регистрацию.');}
 else if(mode==='recover'){await recover($('email').value);notice('Если аккаунт существует, письмо для восстановления придёт на эту почту.');}
 else{await request('/api/auth/password',{password:$('password').value},true);notice('Пароль сохранён.');await access();}
});});
async function access(){const {data}=await client.auth.getSession();if(!data.session)return;const response=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+data.session.access_token}});const account=await response.json();if(!response.ok)throw Error(account.error);if(account.entitlement.active&&!new URLSearchParams(location.search).has('subscription')){location.replace('/');return;}$('authForm').hidden=true;document.querySelector('.auth-tabs').hidden=true;$('recover').hidden=true;$('subscription').hidden=false;$('accessStatus').textContent=account.entitlement.active?'Доступ активен до '+new Date(account.entitlement.expiresAt).toLocaleDateString('ru-RU')+'. Продление добавится к текущему сроку.':account.entitlement.expiresAt?'Доступ закончился. После продления история останется на месте.':'Оформи доступ, чтобы открыть платформу.';await window.WLRenderPlans?.($('plans'),notice);}
$('checkPayment').addEventListener('click',()=>action(async()=>{await window.WLCheckPending?.();await access();}));
$('logout').addEventListener('click',()=>window.WLAccess.logout().catch(()=>notice('Выход требует повторной очистки данных устройства. Нажми «Выйти» ещё раз.')));
$('linkTelegram').hidden=config.mode!=='hybrid';
$('linkTelegram').addEventListener('click',()=>action(async()=>{const result=await request('/api/auth/link/start',{},true);if(window.Telegram?.WebApp?.initData){await request('/api/auth/link/telegram',{nonce:result.nonce,initData:window.Telegram.WebApp.initData},true);notice('Telegram привязан к аккаунту.');}else if(result.url){$('linkBot').href=result.url;$('linkBot').textContent='Подтвердить привязку в своём боте';$('linkBot').hidden=false;}else notice('Владелец должен указать имя бота в настройках.');}));
async function enterTelegram(createAccount=false){const result=await telegramLogin({createAccount,accepted:$('telegramAccepted').checked});if(result.needsAccountChoice){$('accountChoice').hidden=false;return;}await access();}
$('telegramLogin').addEventListener('click',()=>action(()=>enterTelegram()));
$('createTelegram').addEventListener('click',()=>action(()=>enterTelegram(true)));
$('existingAccount').addEventListener('click',()=>{$('accountChoice').hidden=true;$('authForm').hidden=false;showMode('login');});
if(!config.configured){notice('Платформа ещё не подключена. Выполни npm run doctor.');document.querySelectorAll('button').forEach(b=>b.disabled=true);}
else await action(async()=>{
 await window.WLCleanupPending();
 const result=await callback();if(result==='recovery'){showMode('reset');return;}
 if(config.mode==='telegram'){$('authForm').hidden=true;document.querySelector('.auth-tabs').hidden=true;$('recover').hidden=true;}
 const tg=await loadTelegram();$('telegramLogin').hidden=!tg;
 await import('./billing-client.mjs');
 const {data}=await client.auth.getSession();if(data.session){await access();return;}
 if(tg)await enterTelegram();else if(config.mode==='telegram')notice('Для входа открой приложение в Telegram.');
});
