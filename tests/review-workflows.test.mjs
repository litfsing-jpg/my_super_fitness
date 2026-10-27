import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parse} from 'acorn';
import {createStorage} from '../client/storage.mjs';

const source=await readFile(new URL('../client/app.js',import.meta.url),'utf8');
const ast=parse(source,{ecmaVersion:'latest'});
const fn=name=>{const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert.ok(node,name);return source.slice(node.start,node.end);};
test('task actions use the durable proof workflow and never credit an unavailable submission',async()=>{
 let opens=0,credits=0,notices=0;
 const ctx={pbProofUi:{open:async key=>{assert.equal(key,'meal');opens++;}},pbStartProofUi(){},completeTask(){credits++;},toast(){notices++;}};
 vm.createContext(ctx);vm.runInContext(fn('openTaskProof'),ctx);
 await ctx.openTaskProof('meal');assert.equal(opens,1);assert.equal(credits,0);
 ctx.pbProofUi=null;await ctx.openTaskProof('meal');assert.equal(credits,0);assert.equal(notices,1);
 assert.doesNotMatch(source,/function openLegacyTaskProof\(/);
});
test('peer-tab logout recognizes only this installation and owner before clearing private data',()=>{
 const data=new Map(),backing={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const owner='11111111-1111-4111-8111-111111111111',storage=createStorage({installationId:'one',userId:owner,backing});
 let listener,invalidations=0;
 const statement=ast.body.find(n=>n.type==='ExpressionStatement'&&source.slice(n.start,n.end).startsWith("window.addEventListener('storage'"));assert.ok(statement);
 const ctx={WLStorage:storage,PB_LOCAL_STATE_OWNER_KEY:'primeBodyLocalStateOwnerV1',pbUser:{id:owner},pbSessionInvalidated:false,pbApplyAuthSession(value){assert.equal(value,null);invalidations++;},window:{WLDevicePrivacy:{isPending:()=>true},addEventListener(name,cb){listener=cb;}}};
 vm.createContext(ctx);vm.runInContext(source.slice(statement.start,statement.end),ctx);
 listener({key:'wl:other:'+owner+':wl-device-logout-v1',newValue:owner});assert.equal(invalidations,0);
 listener({key:'wl:one:22222222-2222-4222-8222-222222222222:wl-device-logout-v1',newValue:owner});assert.equal(invalidations,0);
 listener({key:'wl:one:'+owner+':wl-device-logout-v1',newValue:owner});assert.equal(invalidations,1);
 listener({key:'wl:one:'+owner+':primeBodyLocalStateOwnerV1',newValue:null});assert.equal(invalidations,2);
});
