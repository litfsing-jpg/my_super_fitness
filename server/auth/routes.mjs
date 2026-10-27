import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {AppError,route} from '../errors.mjs';
import {verifyInitData,exchangeTelegramIdentity} from './telegram.mjs';
export const nonceDigest=nonce=>createHash('sha256').update(nonce).digest('hex');
export function installAuthRoutes({app,config,auth,authenticate,access,repository,authAdmin,onLogout=()=>{}}){
  const attempts=new Map();
  app.use('/api/auth',(req,res,next)=>{
    const key=req.ip,now=Date.now(),previous=attempts.get(key);
    const value=previous&&previous.until>now?previous:{count:0,until:now+600000};
    if(attempts.size>1000)for(const [id,entry] of attempts)if(entry.until<=now)attempts.delete(id);
    if(attempts.size>=2000&&!attempts.has(key))return res.status(429).json({error:'rate_limited'});
    attempts.set(key,value);if(++value.count>60){res.set('Retry-After','600');return res.status(429).json({error:'rate_limited'});}next();
  });
  for(const name of ['login','register','recover','refresh'])app.post('/api/auth/'+name,route(async(req,res)=>{
    await repository.assertInstallation();res.json(await auth[name](req.body));
  }));
  app.get('/api/auth/me',authenticate,route(async(req,res)=>{const {accessToken,...principal}=req.principal;res.json({...principal,entitlement:await access(req.principal)});}));
  app.post('/api/auth/logout',authenticate,route(async(req,res)=>{onLogout(req.principal);res.json(await auth.logout(req.principal));}));
  app.post('/api/auth/password',authenticate,route(async(req,res)=>res.json(await auth.updatePassword(req.principal,req.body?.password))));
  app.post('/api/auth/telegram',route(async(req,res)=>{
    if(config.mode==='web')throw new AppError(403,'telegram_login_disabled');
    const verified=verifyInitData(req.body?.initData,{botToken:config.botToken});
    await repository.assertInstallation();
    const existing=await repository.lookupTelegram(verified);
    if(!existing?.user_id&&req.body?.createAccount!==true)return res.json({needsAccountChoice:true});
    if(!existing?.user_id&&(!config.legalReady||req.body?.accepted!==true))throw new AppError(400,'legal_setup_or_acceptance_required');
    const session=await exchangeTelegramIdentity({verified,attemptId:req.body?.attemptId||randomUUID(),repository,authAdmin});
    res.json(session);
  }));
  app.post('/api/auth/link/start',authenticate,route(async(req,res)=>{
    if(config.mode!=='hybrid')throw new AppError(403,'linking_disabled');
    const nonce=randomBytes(24).toString('base64url');
    await repository.createLinkNonce({userId:req.principal.userId,digest:nonceDigest(nonce)});
    res.json({nonce,expiresIn:300,url:config.botUsername?'https://t.me/'+config.botUsername+'?start=link_'+nonce:null});
  }));
  app.post('/api/auth/link/telegram',authenticate,route(async(req,res)=>{
    if(config.mode!=='hybrid')throw new AppError(403,'linking_disabled');
    if(!/^[A-Za-z0-9_-]{32}$/.test(req.body?.nonce||''))throw new AppError(400,'invalid_link_nonce');
    const verified=verifyInitData(req.body.initData,{botToken:config.botToken});
    await repository.linkTelegramIdentity({...verified,userId:req.principal.userId,digest:nonceDigest(req.body.nonce)});
    res.json({ok:true});
  }));
  app.post('/api/session',authenticate,route(async(req,res)=>res.json({userId:req.principal.userId,...await access(req.principal)})));
  app.delete('/api/session',authenticate,route(async(req,res)=>{onLogout(req.principal);res.json(await auth.logout(req.principal));}));
}
