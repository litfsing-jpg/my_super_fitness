import {test} from 'node:test';import assert from 'node:assert/strict';import {cleanupPending} from '../client/logout.mjs';import {createStorage} from '../client/storage.mjs';
test('logout awaits owner media cleanup and retains a retry journal on failure',async()=>{
 const data=new Map(),backing={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 const a=createStorage({installationId:'one',userId:owner,backing}),b=createStorage({installationId:'two',userId:other,backing});a.setItem('queue','private');b.setItem('queue','other installation');
 const photos=new Map([[owner,'queued photo'],[other,'another photo']]);let blocked=true;
 const factory=()=>({markLogout(){},async clearOwner(id){if(blocked)throw Error('indexeddb temporarily blocked');photos.delete(id);},finishLogout(){}});
 await assert.rejects(()=>cleanupPending({installationId:'one',owner,backing,factory}));assert.ok(backing.getItem('wl:one:cleanup-owners'));assert.equal(photos.has(owner),true);
 blocked=false;await cleanupPending({installationId:'one',backing,factory});assert.equal(photos.has(owner),false);assert.equal(photos.has(other),true);assert.equal(a.length,0);assert.equal(b.getItem('queue'),'other installation');assert.equal(backing.getItem('wl:one:cleanup-owners'),null);
});
