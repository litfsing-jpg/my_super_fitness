import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog} from '../server/content.mjs';
test('neutral catalogs have unique IDs, own media and two complete recipes',async()=>{
 const read=async name=>JSON.parse(await readFile(new URL('../content/demo/'+name+'.json',import.meta.url)));
 const exercises=await read('exercises'),dishes=await read('dishes'),visuals=await read('recipe-visuals');
 assert.ok(exercises.length>=3);assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length);
 for(const e of exercises){assert.ok(e.videoSrc.startsWith('/assets/neutral/'));assert.equal(e.datasetVersion,'whitelabel-v1');}
 assert.equal(dishes.length,2);assert.equal(visuals.recipes.length,2);
 for(const d of dishes){assert.ok(d.ingredients.length>=3);assert.ok(d.steps.length>=3);assert.ok(visuals.recipes.find(v=>v.sourceId===d.id)?.layers.length>=3);}
});
test('food presets provide the portion and finite macros needed by the picker',async()=>{
 const foods=JSON.parse(await readFile(new URL('../content/demo/foods.json',import.meta.url)));
 for(const food of foods){assert.equal(typeof food.portion,'string');assert.ok(food.portion.length);}
 assert.equal(validateCatalog('foods',foods),foods);
 assert.throws(()=>validateCatalog('foods',[{id:'bad',name:'Food',kcal:1,p:1,f:1,c:1}]),/invalid_food/);
});
