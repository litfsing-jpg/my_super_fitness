import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('shared platform retains the current screens and animated recipe entry',async()=>{
  const read=path=>readFile(new URL('../client/'+path,import.meta.url),'utf8').catch(()=> '');
  const html=await read('index.html'),app=await read('app.js');
  for(const id of ['today','training','nutrition','reports','more'])assert.ok(html.includes(`id="${id}"`),id+' screen missing');
  for(const name of ['startWorkoutPlayer','openRecipeCatalog','recordWorkoutSet','setNutritionSelectedDate'])assert.ok(app.includes('function '+name+'('),name+' is missing');
  assert.ok(html.includes('fitness-shell.css'));
  assert.ok(!/PrimeBodyPaymentBot|sistema-complex|https:\/\/[a-z0-9]{20}\.supabase\.co|eyJ[a-zA-Z0-9_-]{40}/.test(html+app),'Upstream infrastructure leaked');
});
