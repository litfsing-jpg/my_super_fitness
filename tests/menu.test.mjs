import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parse} from 'acorn';import vm from 'node:vm';
const source=await readFile(new URL('../client/app.js',import.meta.url),'utf8');
const names=['dishBudgetTier','dishMatchesBudget','dishAllowed','normalizeMenuRepeatDays','eligibleMenuDishes','normalizeMenuTargets','menuScaledTotals','menuTargetError','menuTargetTolerance','menuTargetsWithinTolerance','menuTargetsMatch','selectMenuMeals','createMenuWeekPlan'];
const nodes=parse(source,{ecmaVersion:'latest'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.includes(n.id.name));
const context=vm.createContext({});vm.runInContext(nodes.map(n=>source.slice(n.start,n.end)).join('\n'),context);
test('macro solver retains all four current targets, not calories alone',()=>{
 const targets={kcal:3120,p:140,f:70,c:483};
 const dishes=['завтрак','обед','ужин','перекус'].flatMap((slot,j)=>Array.from({length:4},(_,i)=>({id:`fixture-${j}-${i}`,name:`Блюдо ${i}`,slot,budget:'balanced',kcal:780,p:35,f:17.5,c:120.75,ingredients:[{n:'продукт'}]})));
 const week=context.createMenuWeekPlan(dishes,{slots:['завтрак','обед','ужин','перекус'],tier:'balanced',tokens:[],targets,kcal:3120,repeatDays:1,random:()=>0.3});
 assert.equal(week.length,7);for(const day of week)assert.equal(context.menuTargetsWithinTolerance(day,targets),true);
 assert.equal(context.menuTargetsMatch({...targets,p:258},targets),false);
 assert.equal(context.menuTargetsWithinTolerance({kcal:3127,p:258,f:113,c:274},targets),false);
});
