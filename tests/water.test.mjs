import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../client/app.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

function extractFunction(name){
  const start = appSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const brace = appSource.indexOf("{", start);
  let depth = 0;
  for(let index = brace; index < appSource.length; index += 1){
    if(appSource[index] === "{") depth += 1;
    if(appSource[index] === "}") depth -= 1;
    if(depth === 0) return appSource.slice(start, index + 1);
  }
  throw new Error(`${name} did not close`);
}

function buildContext({ today = true, water = 2.8 } = {}){
  const state = {
    water,
    score: 0,
    dailyReport: { date: "2026-07-13", training: false, water: false, food: false, sleep: false, claimed: false, waterRewarded: false }
  };
  const history = { water };
  const commits = [];
  const context = {
    state,
    Date,
    selectedNutritionDate: () => today ? "2026-07-13" : "2026-07-12",
    nutritionDiaryDateAllowed: date => ["2026-07-12", "2026-07-13"].includes(date),
    nutritionDiaryIsToday: date => date === "2026-07-13",
    nutritionRecordDraftForDate: date => ({ date, items: [], water: date === "2026-07-13" ? state.water : history.water }),
    commitSelectedNutritionDraft: draft => {
      commits.push(structuredClone(draft));
      if(draft.date === "2026-07-13") state.water = draft.water;
      else history.water = draft.water;
    }
  };
  vm.createContext(context);
  const constants = appSource.match(/const WATER_MAX_LITERS = .+?;\nconst WATER_ADJUST_GUARD_MS = .+?;\nconst waterAdjustmentLocks = .+?;\n/);
  assert.ok(constants, "water adjustment constants exist");
  const waterConstants = appSource.match(/const WATER_LITERS_PER_KG = .+?;\nconst WATER_DEFAULT_WEIGHT_KG = .+?;\n/);
  assert.ok(waterConstants, "personal water target constants exist");
  context.planFromProfile = () => ({ weight: 80 });
  vm.runInContext(waterConstants[0] + extractFunction("waterTargetLiters") + constants[0] + extractFunction("adjustWater"), context);
  return { context, state, history, commits };
}

test("water supports +/-100 and +/-200 ml and never goes below zero", () => {
  const { context, state } = buildContext({ water: 2.8 });
  assert.equal(context.adjustWater("2026-07-13", -0.2, 1000).value, 2.6);
  assert.equal(context.adjustWater("2026-07-13", 0.1, 2000).value, 2.7);
  state.water = 0.1;
  assert.equal(context.adjustWater("2026-07-13", -0.2, 3000).value, 0);
});

test("same rapid tap is ignored while the snapshot write guard is active", () => {
  const { context, state, commits } = buildContext({ water: 1 });
  const first = context.adjustWater("2026-07-13", 0.2, 1000);
  const duplicate = context.adjustWater("2026-07-13", 0.2, 1100);
  assert.equal(first.changed, true);
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.reason, "pending");
  assert.equal(state.water, 1.2);
  assert.equal(commits.length, 1);
});

test("past-day correction persists without awarding current-day points", () => {
  const { context, state, history } = buildContext({ today: false, water: 2.8 });
  const result = context.adjustWater("2026-07-12", -0.1, 1000);
  assert.equal(result.value, 2.7);
  assert.equal(history.water, 2.7);
  assert.equal(state.score, 0);
});

test("daily water reward is idempotent after crossing the goal more than once", () => {
  const { context, state } = buildContext({ water: 2.3 });
  const first = context.adjustWater("2026-07-13", 0.1, 1000);
  assert.equal(first.awarded, true);
  assert.equal(state.score, 5);
  context.adjustWater("2026-07-13", -0.1, 2000);
  const second = context.adjustWater("2026-07-13", 0.1, 3000);
  assert.equal(second.awarded, false);
  assert.equal(state.score, 5);
  assert.equal(state.dailyReport.waterRewarded, true);
});

test("nutrition has four compact controls and Bio opens the shared control", () => {
  for(const id of ["minusWater200", "minusWater100", "addWater100", "addWater200"]){
    assert.match(indexSource, new RegExp(`id="${id}"`));
  }
  assert.match(appSource, /function openWaterControl/);
  assert.match(appSource, /\$\('addWater'\)\?\.addEventListener\('click', openWaterControl\)/);
});
