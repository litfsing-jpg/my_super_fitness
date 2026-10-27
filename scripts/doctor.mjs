import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {readConfig} from '../server/config.mjs';
export async function doctor({env=process.env,root=new URL('../',import.meta.url),network=false}={}){
 if(network)throw Error('Doctor is offline; use the dedicated local integration command');
 const errors=[],warnings=[];let config;
 try{const brand=JSON.parse(await readFile(new URL('brand.config.json',root),'utf8'));config=readConfig(env,brand);}catch{errors.push('Invalid runtime or brand configuration');return {ok:false,errors,warnings};}
 errors.push(...config.missing.map(name=>'Missing '+name));
 if(!config.legalReady)errors.push('Legal documents and revision are not enabled');
 if(!config.brand.supportEmail||!/^\S+@[^\s@]+\.[^\s@]+$/.test(config.brand.supportEmail))errors.push('Set your support email in brand.config.json');
 for(const file of ['offer','privacy','consent']){const text=await readFile(new URL('client/legal/'+file+'.html',root),'utf8').catch(()=> '');if(!text||text.includes('OWNER_DOCUMENT_REQUIRED'))errors.push('Replace legal/'+file+'.html with your own reviewed document');}
 if(config.mode!=='web'){
  if(!/^\d{5,16}:[A-Za-z0-9_-]{20,}$/.test(config.botToken))errors.push('Invalid bot token format');
  if(!/^[a-zA-Z0-9_]{5,32}$/.test(config.botUsername))errors.push('Set your bot username');
  if(!/^[a-zA-Z0-9_-]{32,256}$/.test(config.webhookSecret))errors.push('Use a random webhook secret of at least 32 characters');
 }
 if(config.billingEnabled&&(!config.shopId||!config.paymentSecret))errors.push('Web billing needs your YooKassa shop and secret');
 if(config.billingEnabled&&config.mode!=='web'&&!config.starsEnabled)errors.push('Telegram digital access requires Stars');
 if(config.local)warnings.push('Loopback HTTP only: not a public deployment');
 if(config.billingMode==='test')warnings.push('Payment test mode: production payments are disabled');
 warnings.push('Offline check only: database ID, schema, SMTP, webhook, shop, fiscal receipt settings and devices must be checked separately');
 return {ok:errors.length===0,errors,warnings};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await doctor();console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;}
