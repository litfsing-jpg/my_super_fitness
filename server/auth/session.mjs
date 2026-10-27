import {AppError} from '../errors.mjs';
import {publicSession} from './web.mjs';
export function createAuthAdmin(clientFactory){
  return {
    async getUser(id){const {data,error}=await clientFactory('',true).auth.admin.getUserById(id);if(error||!data?.user)throw new AppError(403,'identity_unavailable');return data.user;},
    async generateLink(email){const {data,error}=await clientFactory('',true).auth.admin.generateLink({type:'magiclink',email});if(error||!data?.properties?.hashed_token)throw new AppError(503,'telegram_exchange_unavailable');return {user:data.user,hash:data.properties.hashed_token};},
    async verifyLink(hash){const {data,error}=await clientFactory().auth.verifyOtp({token_hash:hash,type:'email'});if(error||!data?.session)throw new AppError(401,'telegram_exchange_failed');return publicSession(data.session);}
  };
}
