import {test} from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../client/storage.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const memory=()=>{const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
test('storage separates installations, owners and their pending queues',()=>{
  assert.equal(typeof mod.createStorage,'function');
  const backing=memory(),a=mod.createStorage({installationId:'one',userId:'alice',backing}),b=mod.createStorage({installationId:'one',userId:'bob',backing}),c=mod.createStorage({installationId:'two',userId:'alice',backing});
  a.setItem('profile','Alice');a.setItem('queue','private');b.setItem('profile','Bob');c.setItem('profile','Other');
  assert.equal(a.length,2);assert.equal(b.getItem('queue'),null);assert.equal(c.getItem('queue'),null);a.clear();assert.equal(b.getItem('profile'),'Bob');assert.equal(c.getItem('profile'),'Other');
});
