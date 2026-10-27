import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../client/app.js", import.meta.url), "utf8");

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

function trackingContext(){
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    extractFunction("parseWorkoutPrescription"),
    extractFunction("exerciseLoadMode"),
    extractFunction("workoutLoadLabel"),
    extractFunction("workoutSetDefaults")
  ].join("\n"), context);
  return context;
}

function extraSetContext(){
  const context = {};
  vm.createContext(context);
  vm.runInContext([
    "const WORKOUT_PLAYER_MAX_SETS = 20;",
    extractFunction("parseWorkoutPrescription"),
    extractFunction("setsFromSr"),
    extractFunction("workoutItemSetCount"),
    extractFunction("addWorkoutSet")
  ].join("\n"), context);
  return context;
}

function workoutEditContext(){
  const store = { sets:[] };
  const context = { workoutHistoryRecords:() => store.sets };
  vm.createContext(context);
  vm.runInContext([
    "const WORKOUT_PLAYER_MAX_SETS = 20;",
    extractFunction("parseWorkoutPrescription"),
    extractFunction("setsFromSr"),
    extractFunction("workoutItemSetCount"),
    extractFunction("workoutExerciseIndex"),
    extractFunction("workoutSetDraftKey"),
    extractFunction("workoutCurrentExerciseSets"),
    extractFunction("workoutRecordedSet"),
    extractFunction("workoutExerciseComplete"),
    extractFunction("workoutFirstIncompleteSet"),
    extractFunction("workoutNavigateExercise"),
    extractFunction("workoutIncompleteExerciseIndexes")
  ].join("\n"), context);
  context.store = store;
  return context;
}

test("workout prescription exposes set count and target rep range", () => {
  const context = trackingContext();
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.parseWorkoutPrescription("4×8–10"))),
    { sets:4, repsMin:8, repsMax:10 }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.parseWorkoutPrescription("3x12"))),
    { sets:3, repsMin:12, repsMax:12 }
  );
});

test("load mode explains how users should enter different weights", () => {
  const context = trackingContext();
  assert.equal(context.exerciseLoadMode({ equipment:"dumbbell", nameRu:"Жим гантелей" }), "per_implement");
  assert.equal(context.exerciseLoadMode({ equipment:"barbell", nameRu:"Присед со штангой" }), "total");
  assert.equal(context.exerciseLoadMode({ equipment:"body only", nameRu:"Отжимания" }), "bodyweight");
  assert.equal(context.exerciseLoadMode({ equipment:"machine", nameRu:"Подтягивание с помощью" }), "assistance");
  assert.equal(context.workoutLoadLabel("per_implement"), "Вес одного снаряда, кг");
  assert.equal(context.workoutLoadLabel("assistance"), "Помощь тренажёра, кг");
});

test("set defaults copy this session first and previous workout otherwise", () => {
  const context = trackingContext();
  const records = [
    { sessionId:"old", exerciseId:"bench", setIndex:1, weightKg:70, reps:10, completedAt:"2026-07-10T10:00:00Z" },
    { sessionId:"old", exerciseId:"bench", setIndex:2, weightKg:72.5, reps:8, completedAt:"2026-07-10T10:02:00Z" },
    { sessionId:"now", exerciseId:"bench", setIndex:1, weightKg:75, reps:10, completedAt:"2026-07-13T10:00:00Z" }
  ];
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.workoutSetDefaults(records, "bench", "now", 2, 12))),
    { weightKg:75, reps:10, source:"current" }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.workoutSetDefaults(records.slice(0, 2), "bench", "fresh", 2, 12))),
    { weightKg:72.5, reps:8, source:"previous" }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.workoutSetDefaults([], "bench", "fresh", 1, 12))),
    { weightKg:null, reps:12, source:"target" }
  );
});

test("player exposes per-set inputs, previous values, and history", () => {
  assert.match(appSource, /id="wkpWeight"/);
  assert.match(appSource, /id="wkpReps"/);
  assert.match(appSource, /id="wkpPrevious"/);
  assert.match(appSource, /id="wkpLoadHistory"/);
  assert.match(appSource, /Записать подход/);
  assert.match(appSource, /id="wkpAddSet"/);
  assert.match(appSource, /function recordWorkoutSet\(/);
  assert.match(appSource, /id="wkpPrev"/);
  assert.match(appSource, /data-wkp-exercise-index/);
  assert.match(appSource, /data-wkp-set-index/);
  assert.match(appSource, /Сохранить изменения/);
  assert.match(appSource, /Осталось упражнений:/);
  assert.equal((appSource.match(/const missing = workoutIncompleteExerciseIndexes\(player\);/g) || []).length, 2, 'both finish actions must guard against earlier incomplete exercises');
});

test("completed exercises and sets remain navigable and editable", () => {
  const context = workoutEditContext();
  const player = {
    idx:1,
    set:0,
    session:{ id:"session-now" },
    items:[
      { id:"press", sourceIndex:0, sets:2, sr:"2×10" },
      { id:"row", sourceIndex:1, sets:3, sr:"3×12" }
    ]
  };
  context.store.sets.push(
    { sessionId:"session-now", exerciseIndex:0, setIndex:1, reps:10, weightKg:20 },
    { sessionId:"session-now", exerciseIndex:0, setIndex:2, reps:9, weightKg:20 },
    { sessionId:"session-now", exerciseIndex:1, setIndex:1, reps:12, weightKg:30 }
  );
  assert.equal(context.workoutExerciseComplete(player, player.items[0], 0), true);
  assert.equal(context.workoutExerciseComplete(player, player.items[1], 1), false);
  assert.equal(context.workoutRecordedSet(player, player.items[0], 0, 0).reps, 10);
  assert.deepEqual(Array.from(context.workoutIncompleteExerciseIndexes(player)), [1]);
  assert.equal(context.workoutNavigateExercise(player, 0), true);
  assert.equal(player.idx, 0);
  assert.equal(player.set, 1, "a completed previous exercise opens its latest set for editing");
  assert.equal(context.workoutSetDraftKey(player, player.items[0], 0), "0:press:1");
});

test("an active exercise can receive extra sets without changing the prescription", () => {
  const context = extraSetContext();
  const player = { idx:0, items:[{ id:"bench", sr:"3×8–10", sets:3 }] };
  assert.equal(context.workoutItemSetCount(player.items[0]), 3);
  assert.equal(context.addWorkoutSet(player), 4);
  assert.equal(player.items[0].sets, 4);
  assert.equal(context.addWorkoutSet(player), 5);
  assert.equal(player.items[0].sr, "3×8–10", "the original prescription remains available for future workouts");
  for(let index = 0; index < 20; index += 1) context.addWorkoutSet(player);
  assert.equal(player.items[0].sets, 20, "an accidental tap cannot create an unbounded set count");
  assert.equal(context.addWorkoutSet(player), 0, "the player reports the safety cap without mutating state");
});

test("sets use an owner and production preview is always disabled", () => {
  assert.match(appSource, /userId:workoutLogOwner\(\)/);
  assert.match(appSource, /if\(!sb \|\| !pbUser/);
  assert.match(appSource, /function pbPreviewMode\(\)\{ return false; \}/);
});

test("Supabase migration stores sessions and individual sets with RLS", () => {
  const migrations = fs.readdirSync(new URL("../backend/migrations/", import.meta.url))
    .filter(name => name.endsWith(".sql"))
    .map(name => fs.readFileSync(new URL(`../backend/migrations/${name}`, import.meta.url), "utf8"))
    .join("\n");
  assert.match(migrations, /create table public\.pb_workout_sessions/i);
  assert.match(migrations, /create table public\.pb_workout_sets/i);
  assert.match(migrations, /unique\s*\(session_id, exercise_index, set_index\)/i);
  assert.match(migrations, /alter table public\.%I enable row level security/i);
  assert.match(migrations, /using \(user_id = \(select auth\.uid\(\)\) and \(select public\.wl_has_paid_access\(\)\)\)/i);
});
