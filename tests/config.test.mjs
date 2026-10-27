import {test} from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../server/config.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

test('runtime has validated server configuration',()=>{
  assert.equal(typeof mod.readConfig,'function');
  assert.throws(()=>mod.readConfig({WL_MODE:'wrong'}),/mode/i);
});
test('public configuration excludes server credentials',{skip:!mod.readConfig},()=>{
  const config=mod.readConfig({WL_BOT_TOKEN:'fixture-private-bot',WL_SUPABASE_SERVICE_KEY:'fixture-private-service',WL_YOOKASSA_SECRET:'fixture-private-payment'});
  const value=JSON.stringify(mod.publicConfig(config));
  assert.ok(!value.includes('fixture-private'));
  assert.equal(config.mode,'hybrid');
  assert.equal(config.configured,false);
});
test('non-local HTTP and invalid backend origins are rejected',{skip:!mod.readConfig},()=>{
  for(const env of [{WL_APP_ORIGIN:'http://example.org'},{WL_APP_ORIGIN:'https://user:password@example.org'},{WL_APP_ORIGIN:'https://example.org/path'},{WL_SUPABASE_URL:'http://localhost:9999'}])assert.throws(()=>mod.readConfig(env));
});
