import {resolve} from 'node:path';
import {createApp} from './app.mjs';
import {createRepository} from './repository.mjs';
import {createWebAuth} from './auth/web.mjs';
import {createAuthAdmin} from './auth/session.mjs';
import {installAuthRoutes} from './auth/routes.mjs';
import {createContent,installContentRoutes} from './content.mjs';
import {createBillingService} from './billing/service.mjs';
import {createYooKassa} from './billing/yookassa.mjs';
import {createStars} from './billing/stars.mjs';
import {installBillingRoutes} from './billing/routes.mjs';
import {createBot,installBotRoutes} from './bot/app.mjs';
import {installAdminRoutes} from './admin/routes.mjs';
import {createMediaTickets,installMediaRoutes} from './media.mjs';
import {readFileSync} from 'node:fs';
export function createRuntime({config,root,contentDirectory=resolve(root,'content/live')}){
 if(config.legalReady){const ready=['offer','privacy','consent'].every(name=>{try{const text=readFileSync(resolve(root,'client/legal/'+name+'.html'),'utf8');return text.length>100&&!text.includes('OWNER_DOCUMENT_REQUIRED');}catch{return false;}});if(!ready)config={...config,legalReady:false};}
 const repository=createRepository({config}),auth=createWebAuth({config,clientFactory:repository.clientFactory}),access=p=>repository.entitlement(p);
 const media=createMediaTickets({directory:resolve(root,'content/media'),access});
 let billing,bot;
 const proxy={starsPreCheckout:args=>billing.starsPreCheckout(args),starsPaid:args=>billing.starsPaid(args)};
 if(config.mode!=='web'&&config.botToken)bot=createBot({config,repository,billing:proxy});
 const providers={yookassa:createYooKassa({config})};
 if(bot)providers.stars=createStars({config:{...config,lookupTelegram:telegramId=>repository.lookupTelegram({botId:Number(config.botId),telegramId})},api:bot.api});
 billing=createBillingService({config,repository,providers});
 const app=createApp({config,root,auth,access,billing,installRoutes:context=>{
  installAuthRoutes({...context,repository,authAdmin:createAuthAdmin(repository.clientFactory),onLogout:p=>media.revokeOwner(p.userId)});
  installContentRoutes({...context,content:createContent({directory:contentDirectory}),media});
  installMediaRoutes({...context,media});
  installBillingRoutes(context);
  installAdminRoutes({...context,repository,contentDirectory});
  if(bot)installBotRoutes({...context,bot});
 }});
 return {app,billing,bot};
}
