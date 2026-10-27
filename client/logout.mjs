import {createStorage} from './storage.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function cleanupPending({installationId,owner,backing=localStorage,factory}){
 const key='wl:'+installationId+':cleanup-owners';
 let rows=JSON.parse(backing.getItem(key)||'[]');if(!Array.isArray(rows)||rows.length>100||rows.some(id=>!uuid.test(id)))throw Error('invalid_cleanup_journal');
 if(owner){if(!uuid.test(owner))throw Error('invalid_cleanup_owner');rows=[...new Set([...rows,owner])];backing.setItem(key,JSON.stringify(rows));}
 for(const userId of rows){
  const storage=createStorage({installationId,userId,backing});const privacy=factory({storage});
  privacy.markLogout(userId);await privacy.clearOwner(userId);privacy.finishLogout(userId);storage.clear();
  const pending=JSON.parse(backing.getItem(key)||'[]').filter(id=>id!==userId);if(pending.length)backing.setItem(key,JSON.stringify(pending));else backing.removeItem(key);
 }
}
