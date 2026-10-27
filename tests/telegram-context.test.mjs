import {test} from 'node:test';import assert from 'node:assert/strict';import {captureLaunch,launchKey} from '../client/telegram-context.mjs';
test('Telegram launch survives the local login redirect but signed input expires in five minutes',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const first=captureLaunch({storage,id:'own',hash:'#tgWebAppData=fixture-signed-data&tgWebAppPlatform=android&tgWebAppVersion=9.0',now:1000});assert.equal(first.raw,'fixture-signed-data');
 assert.equal(captureLaunch({storage,id:'own',now:2000}).raw,first.raw);assert.equal(captureLaunch({storage,id:'another',now:2000}),null);
 const expired=captureLaunch({storage,id:'own',now:302000});assert.equal(expired.raw,'');assert.equal(expired.sdk.tgWebAppPlatform,'android');assert.ok(!storage.getItem(launchKey('own')).includes('fixture-signed-data'));
});
