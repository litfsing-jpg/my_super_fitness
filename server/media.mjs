import {randomBytes} from 'node:crypto';
import {realpath} from 'node:fs/promises';
import {resolve,sep,basename,dirname} from 'node:path';
import {AppError,route} from './errors.mjs';
const valid=path=>typeof path==='string'&&/^\/api\/media\/[a-zA-Z0-9_-]+\.(mp4|webp|png|jpg|svg)$/.test(path);
export function createMediaTickets({directory,access,now=Date.now}){
 const tickets=new Map();
 function issue(principal,path){
  if(!valid(path))throw new AppError(400,'invalid_media_path');
  for(const [key,value] of tickets)if(value.until<now())tickets.delete(key);
  if(tickets.size>=5000)throw new AppError(429,'media_rate_limited');
  const ticket=randomBytes(24).toString('base64url');tickets.set(ticket,{principal,path,until:now()+120000});return path+'?ticket='+ticket;
 }
 return {issue,revokeOwner:userId=>{for(const [key,v] of tickets)if(v.principal.userId===userId)tickets.delete(key);},
  async resolve(ticket,path){const value=tickets.get(ticket);if(!value||value.until<now()||value.path!==path)throw new AppError(401,'media_ticket_expired');
   const entitlement=await access(value.principal);if(!(entitlement.contentActive??entitlement.active))throw new AppError(403,'subscription_required');
   const parent=await realpath(directory).catch(()=>{throw new AppError(404,'media_not_found');});
   const file=await realpath(resolve(parent,path.split('/').at(-1))).catch(()=>{throw new AppError(404,'media_not_found');});if(!file.startsWith(parent+sep))throw new AppError(404,'media_not_found');return file;
  },
  decorate(value,principal){
   const walk=(v,key)=>{if(typeof v==='string'&&valid(v)&&!['videoSrc'].includes(key)&&!v.endsWith('.mp4'))return issue(principal,v);if(Array.isArray(v))return v.map(item=>walk(item,''));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,walk(item,k)]));return v;};return walk(value,'');
  }
 };
}
export function installMediaRoutes({app,authenticate,paid,media}){
 app.post('/api/media-ticket',authenticate,paid,route(async(req,res)=>res.json({url:media.issue(req.principal,req.body.path)})));
 app.get('/api/media/:file',route(async(req,res)=>{const file=await media.resolve(req.query.ticket,req.path);res.sendFile(basename(file),{root:dirname(file),cacheControl:false,dotfiles:'deny'});}));
}
