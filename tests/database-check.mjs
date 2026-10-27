import {spawnSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
let migrations=[];try{migrations=(await readdir(new URL('backend/migrations/',root))).filter(n=>n.endsWith('.sql')).sort();}catch{}
assert.ok(migrations.length>=4,'Fresh application, access, identity and billing migrations must exist');
const name='wl-db-test-'+randomUUID();
function docker(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:2000000});if(r.status!==0)throw Error(`Local database command failed: ${r.stderr.slice(-2500)}`);return r.stdout;}
const fixture=await readFile(new URL('tests/database-fixture.sql',root),'utf8');
const checks=await readFile(new URL('backend/verification/access.sql',root),'utf8');
try{
  docker(['run','--rm','-d','--name',name,'--network','none','--memory','768m','--entrypoint','sleep','public.ecr.aws/supabase/postgres:17.6.1.127','infinity']);
  docker(['exec','-u','postgres',name,'initdb','-D','/tmp/wl-db','-A','trust']);
  docker(['exec','-u','postgres',name,'pg_ctl','-D','/tmp/wl-db','-l','/tmp/wl-db.log','-o',"-k /tmp -c listen_addresses=''",'-w','start']);
  const sql=[fixture,...await Promise.all(migrations.map(n=>readFile(new URL('backend/migrations/'+n,root),'utf8'))),checks].join('\n');
  const result=docker(['exec','-i','-u','postgres',name,'psql','-h','/tmp','-X','-U','postgres','-v','ON_ERROR_STOP=1'],sql);
  assert.ok(result.includes('WHITE_LABEL_DATABASE_CHECKS_OK'),'Database assertions must run');
  console.log('Database/RLS, identity, payment assertions: PASS (isolated PostgreSQL 17)');
}finally{spawnSync('docker',['rm','-f',name],{stdio:'ignore'});}
