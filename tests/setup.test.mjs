import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const mod=await import('../scripts/setup.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('setup creates private placeholder env and never overwrites an installation',async()=>{
 assert.equal(typeof mod.setup,'function');const dir=await mkdtemp(join(tmpdir(),'wl-setup-'));try{
 await mod.setup({target:dir,answers:{mode:'hybrid',origin:'https://student.example'}});const value=await readFile(join(dir,'.env.local'),'utf8');assert.ok(value.includes('WL_MODE=hybrid'));assert.ok(value.includes('https://student.example'));await assert.rejects(()=>mod.setup({target:dir,answers:{mode:'web',origin:'https://other.example'}}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
