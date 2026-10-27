import {AppError} from '../errors.mjs';
import {createClientFactory} from '../repository.mjs';
import {UUID} from '../config.mjs';
export function validateCredentials(body,{password=true}={}){
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||email.endsWith('@telegram.invalid'))throw new AppError(400,'invalid_email');
  if(password&&(typeof body.password!=='string'||body.password.length<10||body.password.length>128))throw new AppError(400,'invalid_credentials');
  return {email,...(password?{password:body.password}:{})};
}
export function publicSession(session){
  if(!UUID.test(session?.user?.id||'')||!session.access_token||!session.refresh_token)throw new AppError(401,'invalid_session');
  return {userId:session.user.id,accessToken:session.access_token,refreshToken:session.refresh_token,expiresAt:session.expires_at*1000};
}
export function createWebAuth({config,clientFactory=createClientFactory(config)}){
  const auth=()=>clientFactory().auth;
  return {
    async authenticate(req){
      const header=req.get('authorization')||'';
      const token=/^Bearer ([A-Za-z0-9_.-]{10,8192})$/.exec(header)?.[1];
      if(!token)throw new AppError(401,'unauthorized');
      const client=clientFactory(token);
      const {data,error}=await client.auth.getUser(token);
      if(error||!UUID.test(data?.user?.id||''))throw new AppError(401,'unauthorized');
      const result=await client.rpc('wl_current_principal');
      const p=result.data;
      if(result.error)throw new AppError(503,'identity_unavailable');
      if(!p||p.userId!==data.user.id)throw new AppError(403,'verified_account_required');
      if(p.installationId!==config.installationId)throw new AppError(503,'installation_mismatch');
      return {...p,admin:p.admin===true,accessToken:token};
    },
    async login(body){
      if(config.mode==='telegram')throw new AppError(403,'web_login_disabled');
      const {data,error}=await auth().signInWithPassword(validateCredentials(body));
      if(error)throw new AppError(error.status===429?429:401,error.code==='email_not_confirmed'?'email_not_confirmed':'invalid_credentials');
      return publicSession(data.session);
    },
    async register(body){
      if(config.mode==='telegram')throw new AppError(403,'web_login_disabled');
      if(!config.legalReady||body?.accepted!==true)throw new AppError(400,'legal_setup_or_acceptance_required');
      validateCredentials(body);
      return {ok:true,next:'client_pkce_signup'};
    },
    async recover(body){
      if(config.mode==='telegram')throw new AppError(403,'web_login_disabled');
      validateCredentials(body,{password:false});
      return {ok:true,next:'client_pkce_recovery'};
    },
    async refresh(body){
      if(typeof body?.refreshToken!=='string'||body.refreshToken.length>8192)throw new AppError(400,'invalid_session');
      const {data,error}=await auth().refreshSession({refresh_token:body.refreshToken});
      if(error)throw new AppError(401,'session_expired');
      return publicSession(data.session);
    },
    async updatePassword(principal,password){
      if(typeof password!=='string'||password.length<10||password.length>128)throw new AppError(400,'weak_password');
      const {error}=await clientFactory(principal.accessToken).auth.updateUser({password});
      if(error)throw new AppError(400,'password_update_failed');return {ok:true};
    },
    async logout(principal){
      const {error}=await clientFactory('',true).auth.admin.signOut(principal.accessToken,'local');
      if(error&&error.status!==401)throw new AppError(503,'logout_unavailable');return {ok:true};
    }
  };
}
