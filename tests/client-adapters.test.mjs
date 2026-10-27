import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
test('generic account transport uses this installation and actual SDK RPC, including local Auth',async()=>{
 const context=vm.createContext({WL_CONFIG:{supabaseUrl:'http://127.0.0.1:59999'},fetch:async()=>{throw Error('Unexpected direct request');},AbortController,setTimeout,clearTimeout});
 vm.runInContext(await readFile(new URL('../client/account-actions.js',import.meta.url),'utf8'),context);
 const owner='11111111-1111-4111-8111-111111111111';let called=false;
 const transport=context.WLAccountActions.createTransport({url:context.WL_CONFIG.supabaseUrl,owner,publicKey:'fixture',isCurrent:()=>true,sb:{auth:{getSession(){}},rpc:async name=>{assert.equal(name,'pb_get_latest_progress_reset');called=true;return {data:null,error:null};}}});
 assert.equal(await transport.rpc('pb_get_latest_progress_reset'),null);assert.equal(called,true);
 assert.throws(()=>context.WLAccountActions.createTransport({url:'https://foreign.example',owner,isCurrent:()=>true,sb:{auth:{getSession(){}}}}));
});
