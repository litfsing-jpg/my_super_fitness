import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,mkdir,symlink,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {verifyTemplatePackage} from '../scripts/verify-package.mjs';
const mod=await import('../scripts/package-template.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('package policy excludes local credentials, refuses injected payloads and symlinks',async()=>{
 assert.equal(typeof mod.buildTemplatePackage,'function');const dir=await mkdtemp(join(tmpdir(),'wl-package-'));try{
 await writeFile(join(dir,'package.json'),'{}');await writeFile(join(dir,'.env.local'),'private sentinel not transferable');
 const output=join(dir,'.local','bundle.zip');await mkdir(join(dir,'.local'));
 const built=await mod.buildTemplatePackage({sourceRoot:dir,outputPath:output});assert.equal((await verifyTemplatePackage({archivePath:output,manifestPath:built.manifestPath})).ok,true);
 await writeFile(built.manifestPath,'{"version":1,"files":[]}');await assert.rejects(()=>verifyTemplatePackage({archivePath:output,manifestPath:built.manifestPath}),/Manifest mismatch/);
 await assert.rejects(()=>mod.buildTemplatePackage({sourceRoot:dir,outputPath:output}),/exist/);
 await mkdir(join(dir,'server'));await writeFile(join(dir,'server','unsafe.mjs'),"const secret='sk_live_SENTINEL_PRIVATE_01234567890123456789';");
 await assert.rejects(()=>mod.buildTemplatePackage({sourceRoot:dir,outputPath:join(dir,'.local','bad.zip')}),/unsafe/);
 await rm(join(dir,'server','unsafe.mjs'));await symlink(join(dir,'.env.local'),join(dir,'server','link.mjs'));
 await assert.rejects(()=>mod.buildTemplatePackage({sourceRoot:dir,outputPath:join(dir,'.local','link.zip')}),/symlink/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
