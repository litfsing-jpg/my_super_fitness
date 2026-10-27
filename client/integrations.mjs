export const disabledIntegrations=['curator','club','technique','pharma','peptides','market','growth'];
export function applyIntegrations(config){
 document.getElementById('progressResetBtn')?.closest('.profile-danger-zone')?.setAttribute('hidden','');
 document.getElementById('foodPhoto')?.setAttribute('hidden','');
 for(const id of disabledIntegrations)document.querySelectorAll(`[data-jump="${id}"]`).forEach(button=>button.hidden=true);
 document.querySelectorAll('[data-jump="reports"]').forEach(button=>{if(button.textContent.includes('Apple Health'))button.hidden=true;});
 for(const button of document.querySelectorAll('[data-link="club"],.tg-mini'))button.hidden=true;
 const more=document.querySelector('#more .more-groups');
 const account=document.createElement('a');account.className='wl-account-link';account.href='/account';account.textContent='Аккаунт и способы входа';more.append(account);
 const support=()=>{if(config.brand.supportEmail)location.href='mailto:'+config.brand.supportEmail;else alert('Владелец ещё не указал контакт поддержки.');};
 for(const id of ['simpleSupport','supportCurator'])document.getElementById(id)?.addEventListener('click',support);
 document.getElementById('simpleSubscription')?.addEventListener('click',()=>location.assign('/login?subscription=1'));
}
