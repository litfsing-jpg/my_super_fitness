import {client,request,config} from './auth-client.mjs';
const pendingKey=user=>'wl:pending-order:'+window.WL_CONFIG.installationId+':'+user;
window.WLCheckPending=async()=>{const {data}=await client.auth.getSession();if(!data.session)return;const id=sessionStorage.getItem(pendingKey(data.session.user.id));if(!id)return;const r=await fetch('/api/billing/orders/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+data.session.access_token}});if(!r.ok)throw Error('payment_check_failed');const order=await r.json();if(['paid','refunded','canceled','review'].includes(order.status))sessionStorage.removeItem(pendingKey(data.session.user.id));};
window.WLRenderPlans=async(host,notice)=>{
 host.replaceChildren();const telegram=config.mode==='telegram'||window.WLChannel==='telegram';const channel=telegram?'telegram':'web';
 try{
  const {data}=await client.auth.getSession();const r=await fetch('/api/billing/plans?channel='+channel,{headers:{Authorization:'Bearer '+data.session.access_token}});const result=await r.json();if(!r.ok)throw Error(result.error);
  if(!result.plans.length){notice('Владелец ещё не включил тарифы.');return;}
  const consent=document.createElement('fieldset');consent.className='payment-consents';const checks=[];
  for(const [text,path] of [['Принимаю оферту','offer'],['Ознакомлен с политикой данных','privacy'],['Согласен на обработку личных данных, сведений о здоровье и конфиденциальной информации по этим условиям','consent']]){const label=document.createElement('label'),input=document.createElement('input'),link=document.createElement('a');input.type='checkbox';link.href='/legal/'+path+'.html';link.target='_blank';link.rel='noopener';link.textContent=text;label.append(input,link);consent.append(label);checks.push(input);}host.append(consent);
  for(const plan of result.plans){const button=document.createElement('button');button.type='button';button.className='primary';button.textContent=`${plan.label} · ${plan.currency==='XTR'?plan.amount+' Stars':(plan.amount/100).toLocaleString('ru-RU')+' ₽'} / ${plan.days} дн.`;
   button.addEventListener('click',async()=>{button.disabled=true;try{
    if(!checks.every(check=>check.checked)){notice('Перед оплатой ознакомься с документами и подтверди согласия.');return;}
    const saved=await client.rpc('wl_record_consent',{p_version:window.WL_CONFIG.legalRevision,p_accepted:{offer:true,privacy:true,personalData:true,healthData:true,confidential:true},p_device_id:'browser-'+crypto.randomUUID(),p_app_version:'whitelabel-v1'});if(saved.error||!saved.data?.ok)throw Error('consent_required');
    const key='wl:order:'+window.WL_CONFIG.installationId+':'+data.session.user.id+':'+channel+':'+plan.id;
    const requestId=sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,requestId);
    const order=await request('/api/billing/orders',{planId:plan.id,requestId,channel},true);
    if(order.status==='paid'){sessionStorage.removeItem(key);location.reload();return;}
    if(['canceled','refunded','review'].includes(order.status)){sessionStorage.removeItem(key);notice('Этот заказ закрыт. Нажми тариф ещё раз для нового заказа.');return;}
    sessionStorage.setItem(pendingKey(data.session.user.id),order.id);
    if(telegram)window.Telegram.WebApp.openInvoice(order.url,status=>{if(['cancelled','failed'].includes(status))sessionStorage.removeItem(key);notice('Статус проверяется сервером. Нажми «Проверить оплату».');});else location.assign(order.url);
   }catch{notice('Не удалось открыть оплату. Повторная попытка использует тот же заказ.');}finally{button.disabled=false;}});host.append(button);
  }
 }catch{notice('Оплата пока не подключена владельцем платформы.');}
};
