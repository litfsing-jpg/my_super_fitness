import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('fresh schema covers frontend tables and denies inherited application databases',async()=>{
  const files=await readdir(new URL('../backend/migrations/',import.meta.url)).catch(()=>[]);
  assert.ok(files.length>=4,'Fresh migrations are missing');
  const all=(await Promise.all(files.map(n=>readFile(new URL('../backend/migrations/'+n,import.meta.url),'utf8')))).join('\n');
  for(const name of ['pb_user_state','pb_nutrition_snapshots','pb_workout_sessions','pb_workout_sets','wl_telegram_identities','wl_billing_orders','wl_installation'])assert.ok(all.includes(name),name);
  assert.ok(all.includes('Fresh database required'));
});
