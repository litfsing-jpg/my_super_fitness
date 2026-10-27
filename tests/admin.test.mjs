import {test} from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../server/admin/routes.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('only database-derived admin can enter management',()=>{
 assert.equal(typeof mod.requireAdmin,'function');
 let denied=false,next=false;
 mod.requireAdmin({principal:{admin:false},body:{admin:true}},{status(code){assert.equal(code,403);return this;},json(){denied=true;}},()=>next=true);
 assert.equal(denied,true);assert.equal(next,false);
 mod.requireAdmin({principal:{admin:true}},{},()=>next=true);assert.equal(next,true);
});
