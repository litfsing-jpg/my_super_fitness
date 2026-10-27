import {createStorage} from './storage.mjs';
import {createDataClient} from './data-client.mjs';
import {applyIntegrations} from './integrations.mjs';
import {startPrivateMedia} from './private-media.mjs';
import {loadTelegram} from './auth-client.mjs';
const config=window.WL_CONFIG,auth=window.WLAuthClient;
try{
 if(!config.configured||!auth){location.replace('/setup');throw Error('setup_required');}
 const telegram=await loadTelegram();
 const {data}=await auth.auth.getSession();
 if(!data.session?.user){location.replace('/login');throw Error('unauthorized');}
 await window.WLCleanupPending();
 window.WLStorage=createStorage({installationId:config.installationId,userId:data.session.user.id});
 window.WLClearOwner=()=>window.WLStorage.clear();
 window.WLData=createDataClient({auth,config});
 startPrivateMedia({auth});
 window.WLStorage.setItem('primeBodyUiVersionV2','simple');
 const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.append(s);});
 for(const src of ['device-privacy.js','pose-technique.js','technique-recorder.js','health-actions.js','apple-health.js','workout-history.js','progress-reports.js','account-actions.js','media-session.js','media-report-actions.js','bodycheck-actions.js','state-outbox.js','nutrition-outbox.js','proof-actions.js','proof-ui.js','app.js','fitness-shell.js'])await load(src);
 if(telegram){window.pbSyncTelegramViewport?.(telegram);telegram.onEvent?.('viewportChanged',()=>window.pbSyncTelegramViewport?.(telegram));}
 document.title=config.brand.name;
 document.querySelector('.photo-home-brand h1').textContent=config.brand.shortName||config.brand.name;
 document.querySelector('.header-copy > span').textContent=config.brand.name;
 document.querySelectorAll('.brand-btn img,.pb-splash-logo').forEach(img=>{img.src=config.brand.logo;img.alt=config.brand.name;});
 document.documentElement.style.setProperty('--accent',config.brand.accent);
 document.documentElement.style.setProperty('--accent-dark',config.brand.accentDark);
 for(const token of ['--fit-accent','--accent2','--pb-accent'])document.documentElement.style.setProperty(token,config.brand.accent);
 document.documentElement.style.setProperty('--fit-bg',config.brand.background);
 if(config.demo){const badge=document.createElement('span');badge.textContent='Демо';badge.className='wl-demo-badge';document.querySelector('.header-copy').append(badge);}
 applyIntegrations(config);
 window.WLAccess.start();
}catch(error){
 if(!['setup_required','unauthorized'].includes(error.message)){
  const splash=document.getElementById('pbSplash');splash?.remove();
  const message=document.createElement('p');message.textContent='Не удалось загрузить интерфейс. Обнови страницу или обратись в поддержку.';document.body.prepend(message);
  console.error('Interface initialization failed',error.name);
 }
}
