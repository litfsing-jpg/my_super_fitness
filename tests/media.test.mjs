import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,realpath,symlink,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createMediaTickets} from '../server/media.mjs';
test('private media tickets expire, bind one path, recheck access and revoke on logout',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wl-media-'));let active=true,now=1000;
 try{await writeFile(join(dir,'one.mp4'),'fictional media');const owner={userId:'fixture-owner',accessToken:'never-a-URL-token'};const media=createMediaTickets({directory:dir,access:async()=>({active}),now:()=>now});
 const url=new URL(media.issue(owner,'/api/media/one.mp4'),'http://localhost');assert.ok(!url.href.includes(owner.accessToken));const token=url.searchParams.get('ticket');assert.equal(await media.resolve(token,url.pathname),await realpath(join(dir,'one.mp4')));
 await assert.rejects(()=>media.resolve(token,'/api/media/two.mp4'),/media_ticket_expired/);active=false;await assert.rejects(()=>media.resolve(token,url.pathname),/subscription_required/);active=true;now+=120001;await assert.rejects(()=>media.resolve(token,url.pathname),/media_ticket_expired/);
 const t=new URL(media.issue(owner,url.pathname),'http://localhost').searchParams.get('ticket');media.revokeOwner(owner.userId);await assert.rejects(()=>media.resolve(t,url.pathname));
 assert.throws(()=>media.issue(owner,'/api/media/../server/config.mjs'),/invalid_media_path/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
