
let homeNutritionStatus = 'local';

let homeActivityStatus = 'local';

let recipeExperience = null;

let recipeExperienceLoad = null;

let recipeExperienceToken = 0;

const exerciseVideos=[];
// Задания дня. kind: 'auto' — засчитывается по реальным данным (нельзя накликать);
// 'proof' — требует пруф (фото/видео + заметка); 'report' — через дневной отчёт.
const initialTasks = [
  { key: 'workout',   text: 'Тренировка дня',        done: false, kind: 'auto',   xp: 20 },
  { key: 'kbju',      text: 'Закрыть КБЖУ на день',  done: false, kind: 'auto',   xp: 10 },
  { key: 'water',     text: 'Выпить норму воды',     done: false, kind: 'auto',   xp: 10 },
  { key: 'mobility',  text: '10 минут мобильности',  done: false, kind: 'proof',  xp: 10, media: 'photo' },
  { key: 'technique', text: 'Снять видео техники',   done: false, kind: 'proof',  xp: 10, media: 'video' },
  { key: 'report',    text: 'Закрыть дневной отчёт', done: false, kind: 'report', xp: 15 }
];

const WL_CONFIG = window.WHITELABEL_CONFIG || {};
const WL_BRAND = WL_CONFIG.brand || {};
const APP_NAME = WL_BRAND.name || 'Фитнес-платформа';

function readNum(key, fallback){
  const raw = WLStorage.getItem(key);
  if(raw === null || raw === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

const state = {
  profile: JSON.parse(WLStorage.getItem('primeBodyMobileProfile') || '{}'),
  tasks: (() => { const s = JSON.parse(WLStorage.getItem('primeBodyMobileTasks2') || 'null'); return (Array.isArray(s) && s[0] && s[0].key) ? s : initialTasks.map(t => ({ ...t })); })(),
  score: readNum('primeBodyMobileScore', 0),
  streak: readNum('primeBodyMobileStreak', 0),
  access: readNum('primeBodyMobileAccess', 0),
  water: readNum('primeBodyMobileWater', 0),
  kcal: readNum('primeBodyMobileKcal', 0),
  rank: readNum('primeBodyMobileRank', 170),
  forecasts: readNum('primeBodyMobileForecasts', 0),
  weeklyReports: readNum('primeBodyMobileWeeklyReports', 0),
  meals: JSON.parse(WLStorage.getItem('primeBodyMobileMeals') || 'null') || [false, false, false, false],
  history: JSON.parse(WLStorage.getItem('primeBodyMobileHistory') || 'null') || {},
  lastDay: WLStorage.getItem('primeBodyMobileLastDay') || '',
  savedWorkouts: JSON.parse(WLStorage.getItem('primeBodyMobileWorkouts') || 'null') || [],
  activeProgramId: WLStorage.getItem('primeBodyMobileActiveProgram') || '',
  poseGender: WLStorage.getItem('primeBodyMobilePoseGender') || (JSON.parse(WLStorage.getItem('primeBodyMobileProfile') || '{}').gender === 'Женщина' ? 'f' : 'm'),
  dayGuidePassed: WLStorage.getItem('primeBodyMobileDayGuide') === '1',
  foodLog: JSON.parse(WLStorage.getItem('primeBodyMobileFoodLog') || 'null') || [],
  kcalCut: readNum('primeBodyMobileKcalCut', 0),
  menuWeek: JSON.parse(WLStorage.getItem('primeBodyMobileMenuWeek') || 'null') || [],
  menuPrevious: JSON.parse(WLStorage.getItem('primeBodyMobileMenuPrevious') || 'null') || null,
  menuRepeatDays: normalizeMenuRepeatDays(WLStorage.getItem('primeBodyMobileMenuRepeatDays'), null),
  menuDesserts: WLStorage.getItem('primeBodyMobileMenuDesserts') === '1',
  menuWeekBodyCheckSignature: WLStorage.getItem('primeBodyMobileMenuWeekBodyCheckSignature') || '',
  favoriteDishIds: (() => { try{ const value = JSON.parse(WLStorage.getItem('primeBodyMobileFavoriteDishIdsV1') || '[]'); return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : []; }catch(e){ return []; } })(),
  dailyReport: JSON.parse(WLStorage.getItem('primeBodyMobileDailyReport') || 'null') || { date:'', training:false, water:false, food:false, sleep:false, claimed:false, waterRewarded:false },
  measures: JSON.parse(WLStorage.getItem('primeBodyMobileMeasures') || 'null') || [],
  bodyChecks: JSON.parse(WLStorage.getItem('primeBodyMobileBodyChecksV1') || 'null') || [],
  labs: JSON.parse(WLStorage.getItem('primeBodyMobileLabs') || 'null') || {},
  pharmaCheck: JSON.parse(WLStorage.getItem('primeBodyMobilePharma') || 'null') || {},
  peptideLog: JSON.parse(WLStorage.getItem('primeBodyMobilePeptide') || 'null') || [],
  reminders: JSON.parse(WLStorage.getItem('primeBodyMobileReminders') || 'null') || { water:false, training:false, evening:false, saturday:false },
  refCount: readNum('primeBodyMobileRefCount', 0),
  camIntroSeen: WLStorage.getItem('primeBodyMobileCamIntro') === '1',
  dayWorkout: JSON.parse(WLStorage.getItem('primeBodyMobileDayWorkout') || 'null') || { date:'', items:[] },
  dayWorkoutDismissedDate: WLStorage.getItem('primeBodyMobileDayWorkoutDismissedDate') || '',
  workoutResume: JSON.parse(WLStorage.getItem('primeBodyMobileWorkoutResumeV1') || 'null') || null,
  nutritionResume: JSON.parse(WLStorage.getItem('primeBodyMobileNutritionResumeV1') || 'null') || null,
  calView: WLStorage.getItem('primeBodyMobileCalView') || 'day',
  questClaimed: WLStorage.getItem('primeBodyMobileQuestClaimed') === '1',
  readiness: JSON.parse(WLStorage.getItem('primeBodyMobileReadinessV1') || 'null') || { date:'', sleepHours:'', energy:0, soreness:0, pain:false, note:'' },
  readinessLog: JSON.parse(WLStorage.getItem('primeBodyMobileReadinessLogV1') || 'null') || [],
  challenge: JSON.parse(WLStorage.getItem('primeBodyMobileChallengeV1') || 'null') || { weekStart:'', joined:false, claimed:false, buddyName:'' }
};

// Стартовый прогресс: новый пользователь начинает с 1-го уровня (0 баллов). Демо-числа выше — плейсхолдеры.
// Одноразовый сброс для устройств, где демо-значения уже сохранились в WLStorage (реальных баллов ещё ни у кого нет).
if(WLStorage.getItem('primeBodyMobileResetDemo') !== '1'){
  state.score = 0; state.streak = 0; state.access = 0; state.water = 0; state.kcal = 0; state.rank = 170;
  WLStorage.setItem('primeBodyMobileResetDemo', '1');
  try{ save(); }catch(e){}
}

const LINKS = {
  checkout: String(WL_CONFIG.billing?.checkoutUrl || ''),
  support: String(WL_CONFIG.support?.email || ''),
  public: String(WL_CONFIG.publicUrl || '')
};
function openLink(key){
  const u = LINKS[key] || key;
  if(!u){ toast('Ссылка ещё не настроена'); return; }
  if(key === 'support' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u)){
    location.href = `mailto:${encodeURIComponent(u)}`;
    return;
  }
  window.open(u, '_blank', 'noopener');
}

// ============================================================
//  Аналитика + рассылки (Supabase). Клиент пишет через anon-ключ,
//  чтение/рассылки — в админке через Edge-функцию (service_role).
// ============================================================
const SB_URL = String(WL_CONFIG.supabase?.url || '').replace(/\/$/, '');
const SB_ANON = String(WL_CONFIG.supabase?.anonKey || '');
const APP_VER = 'whitelabel-web1';
const WORKOUT_RULES_VER = 'load2';
const EXERCISE_DATASET_VERSION = 'whitelabel-v1';
const WATER_LITERS_PER_KG = 0.03;
const WATER_DEFAULT_WEIGHT_KG = 80;
function waterTargetLiters(profile){
  const rawWeight = Number(profile?.weight);
  const weight = Number.isFinite(rawWeight) && rawWeight >= 35 && rawWeight <= 250
    ? rawWeight
    : WATER_DEFAULT_WEIGHT_KG;
  return Math.round(weight * WATER_LITERS_PER_KG * 10) / 10;
}
const DISH_IMAGE_VER = 'dishimg5';
const LEGAL_CONSENT_VERSION = window.WL_CONFIG.legalRevision;
const LEGAL_CONSENT_LOCAL_KEY = 'primeBodyLegalConsentV4';
const LEGAL_CONSENT_PENDING_KEY = 'primeBodyPendingLegalConsent';
const LEGAL_DOCS = {
  privacy: 'legal/privacy.html#2026-07-09',
  offer: 'legal/offer.html#2026-09-17',
  consent: 'legal/consent.html#2026-07-09',
  health: 'legal/consent.html#health-confidential-2026-07-09'
};
let sb = null, pbUser = null, pbSubscription = null;
let pbSessionInvalidated = false, pbLeavingOwner = '';
let pbProofUi = null;
let pbTrial24Clock = 0;
const PB_TRIAL_24H_ALLOWED_SCREENS = new Set(['today', 'onboarding', 'training', 'stretching', 'technique', 'nutrition', 'bio', 'guide']);
let appleHealthRemote = { loaded:false, rows:{}, bodyComposition:[] };
const PB_STATE_VERSION = 3;
const PB_PROFILE_SYNC_QUEUE_KEY = 'primeBodyPendingProfileSync';
const PB_USER_FOODS_QUEUE_KEY = 'primeBodyUserFoodsQueueV1';
const PB_WORKOUT_LOG_STORAGE_PREFIX = 'primeBodyWorkoutLogsV1:';
const PB_BODY_CHECK_QUEUE_KEY = 'primeBodyPendingBodyChecksV1';
const PB_PROGRESS_RESET_ACK_PREFIX = 'primeBodyProgressResetAckV1:';
const PB_LOCAL_STATE_OWNER_KEY = 'primeBodyLocalStateOwnerV1';
const BODY_CHECK_LEGACY_FORMULA_VERSION = 'navy-circumference-v1';
const BODY_CHECK_PROGRESS_VERSION = 'photo-progress-v1';
const BODY_CHECK_MANUAL_BIA_VERSION = 'manual-bia-v1';
const BODY_CHECK_PHOTO_ESTIMATE_VERSION = 'photo-anthro-estimate-v1';
const BODY_COMPOSITION_MAX_AGE_DAYS = 30;
const BODY_ESTIMATE_MAX_AGE_DAYS = 14;
const BODY_ESTIMATE_MIN_PHOTOS = 4;
const BODY_CHECK_PHOTO_POSES = ['front', 'back', 'left', 'right'];
let pbUserStateReady = false;
let pbUserStateApplying = false;
let pbProgressEpochReady = false;
let pbProgressResetting = false;
let pbProgressEpochId = null;
let pbUserFoods = [];
let pbUserFoodSyncFlight = null;
let pbUserFoodReadRevision = 0;
let pbUserStateSyncTimer = 0;
const PB_STATE_OUTBOX_KEY = 'primeBodyMobileStateOutboxV1';
let pbStateLocalBaseline = null;
let pbStateSyncFlight = null;
let pbStateRetryDelay = 1000;
function pbStateOutbox(){
  return window.WLStateOutbox.create({ storage:WLStorage, key:PB_STATE_OUTBOX_KEY,
    owner:pbUser.id, epoch:pbProgressEpochId });
}
function pbStageUserState(){
  if(!pbUser || !pbUserStateReady || pbUserStateApplying || pbProgressResetting || !pbStateLocalBaseline) return;
  const next = pbUserStateSnapshot();
  pbStateOutbox().stage(pbStateLocalBaseline,next);
  pbStateLocalBaseline = next;
}
let pbProfileSubmissionCache = null;
const PB_UI_VERSION_KEY = 'primeBodyUiVersionV2';
function pbResolveUiVersion(){
  try{
    const requested = new URLSearchParams(location.search).get('ui');
    if(requested === 'simple' || requested === 'classic') WLStorage.setItem(PB_UI_VERSION_KEY, requested);
    return requested === 'simple' || requested === 'classic'
      ? requested
      : WLStorage.getItem(PB_UI_VERSION_KEY) || 'simple';
  }catch(e){ return 'simple'; }
}
const PB_UI_VERSION = pbResolveUiVersion();
const PB_UI_SESSION_STARTED_AT = performance.now();
document.documentElement.dataset.pbUi = PB_UI_VERSION;
function pbSimpleUi(){ return PB_UI_VERSION === 'simple'; }
const pbHeaderMenuButton = document.getElementById('profileInitial');
if(pbHeaderMenuButton){
  pbHeaderMenuButton.dataset.jump = pbSimpleUi() ? 'more' : 'bio';
  pbHeaderMenuButton.setAttribute('aria-label', pbSimpleUi() ? 'Открыть меню' : 'Профиль');
}
function pbDeviceId(){
  let d = WLStorage.getItem('primeBodyDeviceId');
  if(!d){ d = 'dev_' + ((crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 12))); WLStorage.setItem('primeBodyDeviceId', d); }
  return d;
}
async function pbPrepareLocalStateOwner(userId){
  const nextOwner = String(userId || '');
  if(!nextOwner) return true;
  try{
    const result = await window.WLDevicePrivacy.prepareOwner(nextOwner);
    if(pbSessionInvalidated || pbUser?.id !== nextOwner) return false;
    if(result.changed){
      location.reload();
      return false;
    }
  }catch(e){ pbGateError('Не удалось очистить данные предыдущей сессии на этом устройстве.', 'local_cleanup_failed'); return false; }
  return true;
}
function pbInit(){
  try{
    if(window.supabase && SB_URL && SB_ANON && !sb){
      sb = window.WLAuthClient;
    }
  }catch(e){}
}
let pbEventInFlight = 0;
function pbEventMeta(meta){
  const result = {ui_version:String(PB_UI_VERSION).slice(0,40)};
  const keys = ['action','destination','source','attempt_id','attempt','auth_mode','had_remote_state','platform','step','duration_ms','error_code',
    'profile_synced','state_synced','queued','uploaded','remote_saved','new_check','stored','mode',
    'program_id','dish_id','exercise_id','from_id','to_id','reason','scope','selected','target_sets','added_sets',
    'photos_selected','photos_uploaded','photo_count','key','xp'];
  for(const key of keys){
    const value = meta?.[key];
    if(typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if(typeof value === 'string' && value.length <= 180) result[key] = value;
  }
  return result;
}
async function track(type, screen, meta){
  let counted = false;
  try{
    const owner = pbUser?.id, client = sb;
    const isCurrent = () => !!owner && pbUser?.id === owner && sb === client && !pbSessionInvalidated;
    if(!client || !isCurrent() || pbEventInFlight >= 20 || typeof type !== 'string'
      || !/^[a-z0-9_]{1,120}$/.test(type) || type === 'media_mismatch_report'
      || screen != null && !/^[a-z0-9_-]{1,80}$/.test(screen)) return false;
    const payload = {device_id:pbDeviceId(),user_id:owner,type,screen:screen || null,meta:pbEventMeta(meta)};
    if(JSON.stringify(payload.meta).length > 4096) return false;
    pbEventInFlight++; counted = true;
    const transport = await window.WLMediaSession.create({client,url:SB_URL,publicKey:SB_ANON,owner,isCurrent,requestTimeout:10000});
    if(!isCurrent()) return false;
    const {error} = await transport.from('pb_events').insert(payload);
    return !error && isCurrent();
  }catch(e){ return false; }
  finally{ if(counted) pbEventInFlight--; }
}
function trackSoon(type, screen, meta){
  try{
    const owner = pbUser?.id, client = sb, snapshot = pbEventMeta(meta);
    if(!owner || pbSessionInvalidated) return;
    setTimeout(() => {
      if(pbUser?.id === owner && sb === client && !pbSessionInvalidated) return track(type,screen,snapshot);
    },0);
  }catch(e){}
}
function pbPlain(value, fallback){
  try{ return JSON.parse(JSON.stringify(value == null ? fallback : value)); }catch(e){ return fallback; }
}
function pbUserStateSnapshot(){
  return {
    profile: pbPlain(state.profile, {}),
    progress: {
      score: +state.score || 0,
      streak: +state.streak || 0,
      access: +state.access || 0,
      rank: +state.rank || 170,
      forecasts: +state.forecasts || 0,
      weeklyReports: +state.weeklyReports || 0,
      questClaimed: !!state.questClaimed,
      challenge: pbPlain(state.challenge, {})
    },
    daily: {
      tasks: pbPlain(state.tasks, []),
      water: +state.water || 0,
      kcal: +state.kcal || 0,
      meals: pbPlain(state.meals, []),
      history: pbPlain(state.history, {}),
      lastDay: state.lastDay || '',
      dayGuidePassed: !!state.dayGuidePassed,
      foodLog: pbPlain(state.foodLog, []),
      kcalCut: +state.kcalCut || 0,
      dailyReport: pbPlain(state.dailyReport, {}),
      dayWorkout: pbPlain(state.dayWorkout, { date:'', items:[] }),
      dayWorkoutDismissedDate: state.dayWorkoutDismissedDate || '',
      workoutResume: pbPlain(state.workoutResume, null),
      readiness: pbPlain(state.readiness, {}),
      readinessLog: pbPlain(state.readinessLog, [])
    },
    planning: {
      savedWorkouts: pbPlain(state.savedWorkouts, []),
      activeProgramId: state.activeProgramId || '',
      menuWeek: pbPlain(state.menuWeek, []),
      menuPrevious: pbPlain(state.menuPrevious, null),
      menuRepeatDays: state.menuRepeatDays,
      menuDesserts: !!state.menuDesserts,
      menuWeekBodyCheckSignature: state.menuWeekBodyCheckSignature || '',
      favoriteDishIds: pbPlain(state.favoriteDishIds, []),
      nutritionResume: pbPlain(state.nutritionResume, null),
      poseGender: state.poseGender || 'm',
      calView: state.calView || 'day'
    },
    health: {
      measures: pbPlain(state.measures, []),
      bodyChecks: pbBodyCheckSnapshotList(),
      labs: pbPlain(state.labs, {}),
      pharmaCheck: pbPlain(state.pharmaCheck, {}),
      peptideLog: pbPlain(state.peptideLog, [])
    },
    settings: {
      reminders: pbPlain(state.reminders, { water:false, training:false, evening:false, saturday:false }),
      refCount: +state.refCount || 0,
      camIntroSeen: !!state.camIntroSeen
    }
  };
}
function pbHasUserStateData(snap){
  if(!snap) return false;
  const p = snap.profile || {};
  const daily = snap.daily || {};
  const planning = snap.planning || {};
  const health = snap.health || {};
  const progress = snap.progress || {};
  return !!(p.name || p.goal || p.weight
    || (+progress.score || 0) > 0
    || (+progress.weeklyReports || 0) > 0
    || (+daily.water || 0) > 0
    || !!daily.readiness?.date
    || (daily.readinessLog || []).length
    || !!progress.challenge?.weekStart
    || (daily.foodLog || []).length
    || !!daily.workoutResume
    || (planning.savedWorkouts || []).length
    || (planning.menuWeek || []).length
    || (planning.favoriteDishIds || []).length
    || !!planning.nutritionResume
    || (health.measures || []).length
    || (health.bodyChecks || []).length
    || Object.keys(health.labs || {}).length
    || (health.peptideLog || []).length);
}
function pbUseNumber(value, fallback){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function pbApplyUserStateRow(row){
  if(!row) return false;
  const snap = {
    profile: row.profile || {},
    progress: row.progress || {},
    daily: row.daily || {},
    planning: row.planning || {},
    health: row.health || {},
    settings: row.settings || {}
  };
  if(!pbHasUserStateData(snap)) return false;
  const p = snap.profile || {}, pr = snap.progress || {}, d = snap.daily || {}, pl = snap.planning || {}, h = snap.health || {}, set = snap.settings || {};
  pbUserStateApplying = true;
  try{
    if(Object.keys(p).length) state.profile = pbPlain(p, {});
    state.score = pbUseNumber(pr.score, state.score);
    state.streak = pbUseNumber(pr.streak, state.streak);
    state.access = pbUseNumber(pr.access, state.access);
    state.rank = pbUseNumber(pr.rank, state.rank);
    state.forecasts = pbUseNumber(pr.forecasts, state.forecasts);
    state.weeklyReports = pbUseNumber(pr.weeklyReports, state.weeklyReports);
    if(typeof pr.questClaimed === 'boolean') state.questClaimed = pr.questClaimed;
    if(pr.challenge && typeof pr.challenge === 'object') state.challenge = pbPlain(pr.challenge, { weekStart:'', joined:false, claimed:false, buddyName:'' });
    if(Array.isArray(d.tasks)) state.tasks = pbPlain(d.tasks, initialTasks.map(t => ({ ...t })));
    state.water = pbUseNumber(d.water, state.water);
    state.kcal = pbUseNumber(d.kcal, state.kcal);
    if(Array.isArray(d.meals)) state.meals = pbPlain(d.meals, [false, false, false, false]);
    if(d.history && typeof d.history === 'object') state.history = pbPlain(d.history, {});
    if(typeof d.lastDay === 'string') state.lastDay = d.lastDay;
    if(typeof d.dayGuidePassed === 'boolean') state.dayGuidePassed = d.dayGuidePassed;
    if(Array.isArray(d.foodLog)) state.foodLog = pbPlain(d.foodLog, []);
    state.kcalCut = pbUseNumber(d.kcalCut, state.kcalCut);
    if(d.dailyReport && typeof d.dailyReport === 'object') state.dailyReport = pbPlain(d.dailyReport, { date:'', training:false, water:false, food:false, sleep:false, claimed:false, waterRewarded:false });
    if(d.dayWorkout && typeof d.dayWorkout === 'object') state.dayWorkout = pbPlain(d.dayWorkout, { date:'', items:[] });
    if(typeof d.dayWorkoutDismissedDate === 'string') state.dayWorkoutDismissedDate = d.dayWorkoutDismissedDate;
    if(d.workoutResume && typeof d.workoutResume === 'object') state.workoutResume = pbPlain(d.workoutResume, null);
    if(d.readiness && typeof d.readiness === 'object') state.readiness = pbPlain(d.readiness, { date:'', sleepHours:'', energy:0, soreness:0, pain:false, note:'' });
    if(Array.isArray(d.readinessLog)) state.readinessLog = pbPlain(d.readinessLog, []);
    if(Array.isArray(pl.savedWorkouts)) state.savedWorkouts = pbPlain(pl.savedWorkouts, []);
    if(typeof pl.activeProgramId === 'string') state.activeProgramId = pl.activeProgramId;
    if(Array.isArray(pl.menuWeek)) state.menuWeek = pbPlain(pl.menuWeek, []);
    if(pl.menuPrevious && typeof pl.menuPrevious === 'object') state.menuPrevious = pbPlain(pl.menuPrevious, null);
    state.menuRepeatDays = normalizeMenuRepeatDays(pl.menuRepeatDays, null);
    if(typeof pl.menuDesserts === 'boolean') state.menuDesserts = pl.menuDesserts;
    if(typeof pl.menuWeekBodyCheckSignature === 'string') state.menuWeekBodyCheckSignature = pl.menuWeekBodyCheckSignature;
    if(Array.isArray(pl.favoriteDishIds)) state.favoriteDishIds = [...new Set(pl.favoriteDishIds.map(String).filter(Boolean))];
    if(pl.nutritionResume && typeof pl.nutritionResume === 'object') state.nutritionResume = pbPlain(pl.nutritionResume, null);
    if(pl.poseGender === 'f' || pl.poseGender === 'm') state.poseGender = pl.poseGender;
    if(pl.calView === 'week' || pl.calView === 'day') state.calView = pl.calView;
    if(Array.isArray(h.measures)) state.measures = pbPlain(h.measures, []);
    if(Array.isArray(h.bodyChecks)) state.bodyChecks = h.bodyChecks.map(pbBodyCheckFromSnapshot).filter(Boolean);
    if(h.labs && typeof h.labs === 'object') state.labs = pbPlain(h.labs, {});
    if(h.pharmaCheck && typeof h.pharmaCheck === 'object') state.pharmaCheck = pbPlain(h.pharmaCheck, {});
    if(Array.isArray(h.peptideLog)) state.peptideLog = pbPlain(h.peptideLog, []);
    if(set.reminders && typeof set.reminders === 'object') state.reminders = pbPlain(set.reminders, { water:false, training:false, evening:false, saturday:false });
    state.refCount = pbUseNumber(set.refCount, state.refCount);
    if(typeof set.camIntroSeen === 'boolean') state.camIntroSeen = set.camIntroSeen;
    save();
  }finally{
    pbUserStateApplying = false;
  }
  return true;
}
async function pbLoadUserState(){
  if(!sb || !pbUser) return false;
  const owner = pbUser.id;
  const epoch = pbProgressEpochId;
  pbUserStateReady = false;
  const outbox = pbStateOutbox();
  try{
    const { data, error } = await sb.from('pb_user_state')
      .select('profile,progress,daily,planning,health,settings,updated_at,state_version,progress_epoch')
      .eq('user_id', owner)
      .maybeSingle();
    if(owner !== pbUser?.id || epoch !== pbProgressEpochId) return false;
    if(error) throw error;
    if(data && data.progress_epoch !== epoch) throw new Error('state_epoch_changed');
    if(data || outbox.read()) pbApplyUserStateRow(outbox.rebase(data || {}));
    else if(pbHasUserStateData(pbUserStateSnapshot())) outbox.stage({},pbUserStateSnapshot());
    pbStateLocalBaseline = pbUserStateSnapshot();
    pbUserStateReady = true;
    scheduleUserStateSync();
    return !!data;
  }catch(e){
    if(owner !== pbUser?.id || epoch !== pbProgressEpochId) return false;
    pbStateLocalBaseline = pbUserStateSnapshot();
    pbUserStateReady = true;
    return false;
  }
}
async function pbUpsertUserStateSnapshot(signal){
  if(!sb || !pbUser || !pbUserStateReady || pbUserStateApplying || !pbProgressEpochReady || pbProgressResetting) return false;
  pbStageUserState();
  if(pbStateSyncFlight) return pbStateSyncFlight;
  const owner = pbUser.id, epoch = pbProgressEpochId, outbox = pbStateOutbox();
  const current = () => owner === pbUser?.id && epoch === pbProgressEpochId && pbProgressEpochReady && !pbProgressResetting;
  const withSignal = query => signal && typeof query.abortSignal === 'function' ? query.abortSignal(signal) : query;
  pbStateSyncFlight = (async () => {
    try{
      for(let attempt = 0; attempt < 3 && current(); attempt++){
        const pending = outbox.read();
        if(!pending) return true;
        const remote = await withSignal(sb.from('pb_user_state').select('profile,progress,daily,planning,health,settings,updated_at,progress_epoch').eq('user_id',owner).maybeSingle());
        if(remote.error || !current() || (remote.data && remote.data.progress_epoch !== epoch)) return false;
        const snap = window.WLStateOutbox.merge(window.WLStateOutbox.snapshot(remote.data),pending.base,pending.next);
        const payload = { ...snap, device_id:pbDeviceId(), app_version:APP_VER,
          state_version:PB_STATE_VERSION, progress_epoch:epoch };
        // Compare-and-set: re-read and merge when another device saved during this request.
        const query = remote.data
          ? sb.from('pb_user_state').update(payload).eq('user_id',owner).eq('updated_at',remote.data.updated_at)
          : sb.from('pb_user_state').insert({ ...payload, user_id:owner });
        const result = await withSignal(query.select('updated_at'));
        if(!current()) return false;
        if(result.error && result.error.code !== '23505') return false;
        if(result.error || !result.data?.length) continue;
        outbox.acknowledge(pending);
        pbStateRetryDelay = 1000;
      }
      return current() && !outbox.read();
    }catch(e){ return false; }
  })();
  try{ return await pbStateSyncFlight; }
  finally{
    pbStateSyncFlight = null;
    if(current() && outbox.read()){
      clearTimeout(pbUserStateSyncTimer);
      pbUserStateSyncTimer = setTimeout(pbUpsertUserStateSnapshot,pbStateRetryDelay);
      pbStateRetryDelay = Math.min(60000,pbStateRetryDelay * 2);
    }
  }
}
function scheduleUserStateSync(){
  if(!sb || !pbUser || !pbUserStateReady || pbUserStateApplying || !pbProgressEpochReady || pbProgressResetting) return;
  clearTimeout(pbUserStateSyncTimer);
  pbUserStateSyncTimer = setTimeout(pbUpsertUserStateSnapshot, 900);
}

// BodyCheck is intentionally split from the generic user snapshot. The table is
// the source of truth; the snapshot only carries a small offline summary and
// never contains an image or a signed URL.
function bodyCheckNumber(value){
  const raw = String(value == null ? '' : value).trim().replace(',', '.');
  if(!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function bodyCheckGender(profile){ return (profile || state.profile || {}).gender === 'Женщина' ? 'female' : 'male'; }
function bodyCheckPhotoCount(paths){ return Object.values(paths || {}).filter(Boolean).length; }
function bodyCheckSortTime(entry){ return String(entry?.measuredAt || entry?.date || ''); }
function bodyCheckCompositionSource(entry){
  const source = String(entry?.compositionSource || '').trim();
  if(['photo_progress','manual_bia','photo_estimate','legacy_estimate'].includes(source)) return source;
  return String(entry?.formulaVersion || '') === BODY_CHECK_LEGACY_FORMULA_VERSION ? 'legacy_estimate' : 'photo_progress';
}
function bodyCheckCompositionLabel(entry){
  const custom = String(entry?.compositionLabel || '').trim();
  if(custom) return custom;
  const source = bodyCheckCompositionSource(entry);
  if(source === 'manual_bia') return 'Результат биоимпеданса';
  if(source === 'photo_estimate') return 'Оценка по фото и замерам';
  if(source === 'legacy_estimate') return 'Архивная оценка';
  return 'Замеры и фото прогресса';
}
function bodyCheckHasActualComposition(entry){
  return bodyCheckCompositionSource(entry) === 'manual_bia'
    && bodyCheckNumber(entry?.bodyFatPct) != null;
}
function bodyCheckHasPhotoEstimate(entry){
  return bodyCheckCompositionSource(entry) === 'photo_estimate'
    && bodyCheckNumber(entry?.bodyFatPct) != null
    && bodyCheckNumber(entry?.bodyFatLowPct) != null
    && bodyCheckNumber(entry?.bodyFatHighPct) != null;
}
function pbBodyCheckSnapshot(entry){
  if(!entry || !entry.date || !entry.id) return null;
  return {
    id:String(entry.id), clientId:String(entry.clientId || entry.id), date:String(entry.date), measuredAt:String(entry.measuredAt || ''),
    gender:entry.gender === 'female' ? 'female' : 'male', formulaVersion:String(entry.formulaVersion || BODY_CHECK_PROGRESS_VERSION),
    height:bodyCheckNumber(entry.height), weight:bodyCheckNumber(entry.weight), neck:bodyCheckNumber(entry.neck), waist:bodyCheckNumber(entry.waist),
    hips:bodyCheckNumber(entry.hips), chest:bodyCheckNumber(entry.chest), arm:bodyCheckNumber(entry.arm),
    bodyFatPct:bodyCheckNumber(entry.bodyFatPct), bodyFatLowPct:bodyCheckNumber(entry.bodyFatLowPct), bodyFatHighPct:bodyCheckNumber(entry.bodyFatHighPct), fatMassKg:bodyCheckNumber(entry.fatMassKg), leanMassKg:bodyCheckNumber(entry.leanMassKg),
    compositionSource:bodyCheckCompositionSource(entry), compositionLabel:bodyCheckCompositionLabel(entry), compositionConfidence:String(entry.compositionConfidence || ''), compositionMeasuredAt:String(entry.compositionMeasuredAt || ''),
    photoCount:bodyCheckPhotoCount(entry.photoPaths) || Math.max(0, Number(entry.photoCount) || 0), pending:!!entry.pending
  };
}
function pbBodyCheckSnapshotList(){
  const list = Array.isArray(state.bodyChecks) ? state.bodyChecks : [];
  return list.slice().sort((a,b) => bodyCheckSortTime(a).localeCompare(bodyCheckSortTime(b))).slice(-24).map(pbBodyCheckSnapshot).filter(Boolean);
}
function pbBodyCheckFromSnapshot(entry){
  if(!entry || !entry.date || !entry.id) return null;
  return {
    id:String(entry.id), clientId:String(entry.clientId || entry.id), date:String(entry.date), measuredAt:String(entry.measuredAt || entry.date),
    gender:entry.gender === 'female' ? 'female' : 'male', formulaVersion:String(entry.formulaVersion || BODY_CHECK_PROGRESS_VERSION),
    height:bodyCheckNumber(entry.height), weight:bodyCheckNumber(entry.weight), neck:bodyCheckNumber(entry.neck), waist:bodyCheckNumber(entry.waist),
    hips:bodyCheckNumber(entry.hips), chest:bodyCheckNumber(entry.chest), arm:bodyCheckNumber(entry.arm),
    bodyFatPct:bodyCheckNumber(entry.bodyFatPct), bodyFatLowPct:bodyCheckNumber(entry.bodyFatLowPct), bodyFatHighPct:bodyCheckNumber(entry.bodyFatHighPct), fatMassKg:bodyCheckNumber(entry.fatMassKg), leanMassKg:bodyCheckNumber(entry.leanMassKg),
    compositionSource:bodyCheckCompositionSource(entry), compositionLabel:bodyCheckCompositionLabel(entry), compositionConfidence:String(entry.compositionConfidence || ''), compositionMeasuredAt:String(entry.compositionMeasuredAt || ''),
    photoPaths:{}, photoCount:Math.max(0, Number(entry.photoCount) || 0), pending:!!entry.pending
  };
}
function pbBodyCheckFromRow(row){
  if(!row || !row.id || !row.local_day) return null;
  const paths = row.photo_paths && typeof row.photo_paths === 'object' ? row.photo_paths : {};
  return {
    id:String(row.id), clientId:String(row.client_id || row.id), date:String(row.local_day), measuredAt:String(row.measured_at || row.created_at || row.local_day),
    gender:row.profile_gender === 'female' ? 'female' : 'male', formulaVersion:String(row.formula_version || BODY_CHECK_PROGRESS_VERSION),
    height:bodyCheckNumber(row.height_cm), weight:bodyCheckNumber(row.weight_kg), neck:bodyCheckNumber(row.neck_cm), waist:bodyCheckNumber(row.waist_cm),
    hips:bodyCheckNumber(row.hips_cm), chest:bodyCheckNumber(row.chest_cm), arm:bodyCheckNumber(row.arm_cm),
    bodyFatPct:bodyCheckNumber(row.body_fat_pct), bodyFatLowPct:bodyCheckNumber(row.body_fat_low_pct), bodyFatHighPct:bodyCheckNumber(row.body_fat_high_pct), fatMassKg:bodyCheckNumber(row.fat_mass_kg), leanMassKg:bodyCheckNumber(row.lean_mass_kg),
    compositionSource:String(row.composition_source || ''), compositionLabel:String(row.composition_label || ''), compositionConfidence:String(row.composition_confidence || ''), compositionMeasuredAt:String(row.composition_measured_at || ''),
    photoPaths:paths, photoCount:bodyCheckPhotoCount(paths), pending:false,
    mediaVersion:Number.isSafeInteger(row.media_version) ? row.media_version : null
  };
}
function latestBodyCheck(){
  const list = Array.isArray(state.bodyChecks) ? state.bodyChecks.filter(Boolean) : [];
  return list.slice().sort((a,b) => bodyCheckSortTime(a).localeCompare(bodyCheckSortTime(b))).pop() || null;
}
function pbReplaceBodyCheck(entry){
  if(!entry) return;
  if(!Array.isArray(state.bodyChecks)) state.bodyChecks = [];
  const index = state.bodyChecks.findIndex(item => String(item?.id || '') === String(entry.id) || String(item?.clientId || '') === String(entry.clientId || entry.id));
  if(index >= 0) state.bodyChecks[index] = Object.assign({}, state.bodyChecks[index], entry);
  else state.bodyChecks.push(entry);
  state.bodyChecks.sort((a,b) => bodyCheckSortTime(a).localeCompare(bodyCheckSortTime(b)));
}
function pbRemoveBodyCheckLocal(entry){
  const id = String(entry?.id || '');
  const clientId = String(entry?.clientId || id);
  state.bodyChecks = (Array.isArray(state.bodyChecks) ? state.bodyChecks : []).filter(item => String(item?.id || '') !== id && String(item?.clientId || '') !== clientId);
}
function pbBodyCheckInsertPayload(entry, options = {}){
  return {
    id:entry.id,
    client_id:entry.clientId || entry.id,
    device_id:pbDeviceId(),
    local_day:entry.date,
    formula_version:entry.formulaVersion || BODY_CHECK_PROGRESS_VERSION,
    profile_gender:entry.gender,
    height_cm:entry.height,
    weight_kg:entry.weight,
    neck_cm:entry.neck,
    waist_cm:entry.waist,
    hips_cm:entry.hips,
    chest_cm:entry.chest,
    arm_cm:entry.arm,
    body_fat_pct:entry.bodyFatPct,
    body_fat_low_pct:entry.bodyFatLowPct ?? null,
    body_fat_high_pct:entry.bodyFatHighPct ?? null,
    fat_mass_kg:entry.fatMassKg,
    lean_mass_kg:entry.leanMassKg,
    composition_source:bodyCheckCompositionSource(entry),
    composition_label:bodyCheckCompositionLabel(entry),
    composition_confidence:entry.compositionConfidence || null,
    composition_measured_at:entry.compositionMeasuredAt || null,
    photo_paths:options.includePhotoPaths && entry.photoPaths && typeof entry.photoPaths === 'object' ? entry.photoPaths : {},
    source:'bodycheck',
    app_version:APP_VER,
    measured_at:entry.measuredAt || new Date().toISOString()
  };
}
function pbReadBodyCheckQueue(){
  try{
    const raw = JSON.parse(WLStorage.getItem(PB_BODY_CHECK_QUEUE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(Boolean).slice(-24) : [];
  }catch(e){ return []; }
}
function pbWriteBodyCheckQueue(entries){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return;
  try{ WLStorage.setItem(PB_BODY_CHECK_QUEUE_KEY, JSON.stringify((entries || []).slice(-24))); }catch(e){}
}
function pbQueueBodyCheck(entry){
  if(!entry?.id || !pbCaptureMediaContext().isCurrent()) return;
  const queue = pbReadBodyCheckQueue();
  const payload = pbBodyCheckInsertPayload(entry);
  payload.__owner = pbUser.id; payload.__epoch = pbProgressEpochId;
  const idx = queue.findIndex(item => String(item?.client_id || '') === String(payload.client_id));
  if(idx >= 0) queue[idx] = payload; else queue.push(payload);
  pbWriteBodyCheckQueue(queue);
}
function pbDropQueuedBodyCheck(entry){
  const id = String(entry?.clientId || entry?.id || '');
  pbWriteBodyCheckQueue(pbReadBodyCheckQueue().filter(item => String(item?.client_id || '') !== id));
}
function pbDiscardDeletedBodyCheck(entry, context){
  if(!context.isCurrent()) return;
  const id = String(entry.id || entry.client_id || entry.clientId || '');
  const clientId = String(entry.clientId || entry.client_id || id);
  pbWriteBodyCheckQueue(pbReadBodyCheckQueue().filter(item => item.__owner !== context.owner || item.__epoch !== context.epoch
    || (String(item.id || '') !== id && String(item.client_id || '') !== clientId)));
  pbRemoveBodyCheckLocal({ id, clientId });
}
function pbCaptureMediaContext(){
  const owner = pbUser?.id, epoch = pbProgressEpochId;
  const isCurrent = () => {
    if(!owner || pbUser?.id !== owner || pbProgressEpochId !== epoch || pbSessionInvalidated || pbProgressResetting || window.WLDevicePrivacy?.isPending(owner) || window.WLDevicePrivacy?.isProofEpochRetired(owner, epoch)) return false;
    try{ return (JSON.parse(WLStorage.getItem(PB_PROGRESS_RESET_ACK_PREFIX + owner) || 'null')?.reset_id || null) === epoch; }
    catch(e){ return false; }
  };
  return { owner, epoch, isCurrent };
}
async function pbCreateMediaScope(context = pbCaptureMediaContext()){
  if(!context.isCurrent()) throw new Error('media_scope_changed');
  const client = await window.WLMediaSession.create({ client:sb, url:SB_URL, publicKey:SB_ANON, owner:context.owner, isCurrent:context.isCurrent });
  if(!context.isCurrent()) throw new Error('media_scope_changed');
  return Object.assign({}, context, { client });
}
function pbCreateBodyCheckActions(scope){
  return window.WLBodyCheckActions.create({ client:scope.client, owner:scope.owner, epoch:scope.epoch, isCurrent:scope.isCurrent });
}
async function pbRecoverBodyCheckMedia(scope){
  const actions = pbCreateBodyCheckActions(scope);
  if(!actions.pending()) return;
  const result = await actions.retry();
  if(!scope.isCurrent() || !result) return;
  const entry = pbBodyCheckFromRow(result.entry);
  if(entry) pbReplaceBodyCheck(entry);
  else if(result.ok){ pbDropQueuedBodyCheck({ id:result.id }); pbRemoveBodyCheckLocal({ id:result.id }); }
  save();
  if(result.conflict) toast('BodyCheck изменился на другом устройстве. Загружена актуальная запись.');
}
async function pbLoadBodyChecks(){
  if(!sb || !pbUser) return [];
  const context = pbCaptureMediaContext();
  try{
    const scope = await pbCreateMediaScope(context);
    await pbRecoverBodyCheckMedia(scope);
    const { data, error } = await scope.client.from('pb_body_checks')
      .select('*')
      .order('measured_at', { ascending:true }).limit(104);
    if(!context.isCurrent()) return [];
    if(error) throw error;
    const remote = (data || []).map(pbBodyCheckFromRow).filter(Boolean);
    const remoteKeys = new Set(remote.map(entry => String(entry.clientId || entry.id)));
    const pending = (Array.isArray(state.bodyChecks) ? state.bodyChecks : []).filter(entry => entry?.pending && !remoteKeys.has(String(entry.clientId || entry.id)));
    state.bodyChecks = remote.concat(pending).sort((a,b) => bodyCheckSortTime(a).localeCompare(bodyCheckSortTime(b)));
    save();
    try{ await pbCreateBodyCheckActions(scope).cleanup(); }catch(e){}
    if(!context.isCurrent()) return [];
    return state.bodyChecks;
  }catch(e){ return context.isCurrent() && Array.isArray(state.bodyChecks) ? state.bodyChecks : []; }
}
async function pbFlushBodyCheckQueue(){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting) return false;
  const queue = pbReadBodyCheckQueue();
  if(!queue.length) return true;
  const context = pbCaptureMediaContext();
  let scope;try{ scope = await pbCreateMediaScope(context); }catch(e){ return false; }
  try{ if(pbCreateBodyCheckActions(scope).pending()) return false; }catch(e){ return false; }
  let changed = false, removed = false;
  for(const queued of queue){
    if(!context.isCurrent()) return false;
    if(queued.__owner !== scope.owner || queued.__epoch !== scope.epoch) continue;
    const payload = Object.assign({}, queued);
    delete payload.__owner; delete payload.__epoch; delete payload.photo_paths;
    try{
      const { data, error } = await scope.client.from('pb_body_checks')
        .upsert(Object.assign({}, payload, { user_id:scope.owner, progress_epoch:scope.epoch }), { onConflict:'user_id,client_id' })
        .select('*').single();
      if(!context.isCurrent()) return false;
      if(error) throw error;
      const entry = pbBodyCheckFromRow(data);
      const latest = pbReadBodyCheckQueue();
      const unchanged = latest.some(item => JSON.stringify(item) === JSON.stringify(queued));
      if(entry && unchanged){
        pbWriteBodyCheckQueue(latest.filter(item => JSON.stringify(item) !== JSON.stringify(queued)));
        pbReplaceBodyCheck(entry); changed = true;
      }
    }catch(e){
      if(!context.isCurrent()) return false;
      if(e?.code === 'P0001' && e?.message === 'bodycheck_deleted'){
        pbDiscardDeletedBodyCheck(queued, context); changed = true; removed = true;
      }
    }
  }
  if(changed){ save(); renderBodyCheckSummary(); renderBodyInsights(); }
  if(removed) toast('Удалённый BodyCheck убран из очереди синхронизации.');
  return !pbReadBodyCheckQueue().length;
}
async function pbSaveBodyCheckRemote(entry){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting){ pbQueueBodyCheck(entry); return { ok:false, queued:true, entry }; }
  const context = pbCaptureMediaContext();
  const queuedBefore = pbReadBodyCheckQueue().filter(item => String(item.client_id) === String(entry.clientId || entry.id)).map(item => JSON.stringify(item));
  try{
    const scope = await pbCreateMediaScope(context);
    if(pbCreateBodyCheckActions(scope).pending()) return { ok:false, needsRecovery:true };
    const payload = pbBodyCheckInsertPayload(entry);
    delete payload.photo_paths;
    const { data, error } = await scope.client.from('pb_body_checks')
      .upsert(Object.assign({}, payload, { user_id:scope.owner, progress_epoch:scope.epoch }), { onConflict:'user_id,client_id' })
      .select('*').single();
    if(!context.isCurrent()) return { ok:false, cancelled:true };
    if(error) throw error;
    const remote = pbBodyCheckFromRow(data);
    if(remote) pbWriteBodyCheckQueue(pbReadBodyCheckQueue().filter(item => !queuedBefore.includes(JSON.stringify(item))));
    return { ok:!!remote, entry:remote || entry };
  }catch(e){
    if(!context.isCurrent()) return { ok:false, cancelled:true };
    if(e?.code === 'P0001' && e?.message === 'bodycheck_deleted'){
      pbDiscardDeletedBodyCheck(entry, context); save(); return { ok:false, deleted:true };
    }
    pbQueueBodyCheck(entry); return { ok:false, queued:true, entry };
  }
}
async function pbUploadBodyCheckPhotos(entry, files){
  const selected = files || {};
  if(!sb || !pbUser || !entry?.id) return { uploaded:0, failed:Object.keys(selected).length, paths:entry?.photoPaths || {} };
  const context = pbCaptureMediaContext();
  const cancelled = () => ({ uploaded:0, failed:Object.keys(selected).length, cancelled:!context.isCurrent(), paths:entry?.photoPaths || {}, entry });
  const resetStatus = await pbApplyRemoteProgressReset();
  if(resetStatus !== 'current' || !context.isCurrent()) return cancelled();
  let scope;try{ scope = await pbCreateMediaScope(context); }catch(e){ return cancelled(); }
  const actions = pbCreateBodyCheckActions(scope);
  let baseline;
  try{
    if(actions.pending()) return Object.assign(cancelled(), { uncertain:true });
    baseline = await actions.row(entry.id);
    if(!scope.isCurrent() || !baseline) return cancelled();
    entry = pbBodyCheckFromRow(baseline) || entry;
  }catch(e){ return cancelled(); }
  const originalPaths = Object.assign({}, entry.photoPaths || {});
  const paths = Object.assign({}, originalPaths);
  let uploaded = 0, failed = 0;
  for(const pose of BODY_CHECK_PHOTO_POSES){
    const file = selected[pose];
    if(!file) continue;
    try{
      const blob = await pbCompressImage(file, 1280, .72);
      if(!scope.isCurrent()) return cancelled();
      const path = `${scope.owner}/${entry.id}/${pose}-${pbUuid()}.jpg`;
      const { error } = await scope.client.storage.from('body-checks').upload(path, blob, { contentType:'image/jpeg', upsert:false });
      if(!scope.isCurrent()) return cancelled();
      if(error) throw error;
      paths[pose] = path;
      uploaded += 1;
    }catch(e){ if(!scope.isCurrent()) return cancelled(); failed += 1; }
  }
  if(uploaded){
    try{
      if(Number.isSafeInteger(baseline.media_version)){
        const result = await actions.mutate({ id:entry.id, version:baseline.media_version, action:'photos', paths });
        if(!scope.isCurrent()) return cancelled();
        const remote = pbBodyCheckFromRow(result.entry);
        if(!remote){ pbDropQueuedBodyCheck(entry); pbRemoveBodyCheckLocal(entry); save(); return { uploaded:0, failed:uploaded+failed, paths:{}, removed:true, conflict:true }; }
        if(!result.ok || !remote) return { uploaded:0, failed:uploaded+failed, paths, entry:remote || entry, conflict:true };
        entry = remote;
        return { uploaded, failed, paths:entry.photoPaths, entry, cleanupPending:result.cleanupPending };
      }
      const { data, error } = await scope.client.from('pb_body_checks').update({ photo_paths:paths, photo_consent_at:new Date().toISOString(), progress_epoch:scope.epoch })
        .eq('id', entry.id).eq('user_id', scope.owner)
        .select('id,client_id,local_day,formula_version,profile_gender,height_cm,weight_kg,neck_cm,waist_cm,hips_cm,chest_cm,arm_cm,body_fat_pct,body_fat_low_pct,body_fat_high_pct,fat_mass_kg,lean_mass_kg,composition_source,composition_label,composition_confidence,composition_measured_at,photo_paths,measured_at,created_at').single();
      if(!scope.isCurrent()) return cancelled();
      if(error) throw error;
      const remote = pbBodyCheckFromRow(data);
      if(remote) entry = remote;
    }catch(e){
      if(!scope.isCurrent()) return cancelled();
      // A lost update response may already have committed these private paths.
      failed += uploaded; uploaded = 0;
      if(Number.isSafeInteger(baseline.media_version)) return { uploaded, failed, paths, entry, uncertain:true };
    }
  }
  return { uploaded, failed, paths, entry };
}
async function pbDeleteBodyCheck(entry){
  if(!entry?.id) return false;
  const context = pbCaptureMediaContext();
  if(!context.isCurrent()) return false;
  if(sb && pbUser){
    let scope;try{ scope = await pbCreateMediaScope(context); }catch(e){ return false; }
    try{
    const actions = pbCreateBodyCheckActions(scope);
    if(actions.pending()){
      await pbRecoverBodyCheckMedia(scope);
      if(context.isCurrent()) toast('Предыдущая операция проверена. Обнови BodyCheck перед удалением.');
      return false;
    }
    const baseline = await actions.row(entry.id);
    if(!context.isCurrent()) return false;
    if(baseline && Number.isSafeInteger(baseline.media_version)){
      if(!Number.isSafeInteger(entry.mediaVersion)){
        const fresh = pbBodyCheckFromRow(baseline); if(fresh) pbReplaceBodyCheck(fresh);
        save(); toast('Запись обновлена с сервера. Открой BodyCheck заново и подтверди удаление.'); return false;
      }
      const expected = entry.mediaVersion;
      const result = await actions.mutate({ id:entry.id, version:expected, action:'delete' });
      if(!context.isCurrent()) return false;
      if(!result.ok || result.entry){
        const fresh = pbBodyCheckFromRow(result.entry); if(fresh) pbReplaceBodyCheck(fresh);
        save(); toast('Запись изменилась. Обнови BodyCheck и повтори удаление.'); return false;
      }
      if(result.cleanupPending) toast('Запись удалена. Очистка файлов продолжится при синхронизации.');
    }else if(baseline){
    const paths = Object.values(entry.photoPaths || {}).filter(Boolean);
    if(paths.length){
      const { error: removeError } = await scope.client.storage.from('body-checks').remove(paths);
      if(!context.isCurrent()) return false;
      if(removeError){ toast('Не удалось удалить приватные фото. Повтори при стабильной сети.'); return false; }
    }
    const { error } = await scope.client.from('pb_body_checks').delete().eq('id', entry.id).eq('user_id', scope.owner);
    if(!context.isCurrent()) return false;
    if(error){ toast('Не удалось удалить BodyCheck. Повтори при стабильной сети.'); return false; }
    }
    }catch(e){ if(context.isCurrent()) toast('Не удалось подтвердить удаление. Обнови данные и повтори попытку.'); return false; }
  }
  pbDropQueuedBodyCheck(entry);
  pbRemoveBodyCheckLocal(entry);
  save();
  renderBodyCheckSummary();
  renderBodyInsights();
  track('bodycheck_deleted', 'reports', { photo_count:bodyCheckPhotoCount(entry.photoPaths) });
  return true;
}
function pbProfileSyncFingerprint(profile){
  const clean = pbPlain(profile || {}, {});
  return JSON.stringify(Object.keys(clean).sort().reduce((result, key) => { result[key] = clean[key]; return result; }, {}));
}
function pbProfileSyncItem(profile){
  const clean = pbPlain(profile || {}, {});
  const fingerprint = pbProfileSyncFingerprint(clean);
  if(pbProfileSubmissionCache?.fingerprint === fingerprint) return pbPlain(pbProfileSubmissionCache.item, {});
  try{
    const queued = JSON.parse(WLStorage.getItem(PB_PROFILE_SYNC_QUEUE_KEY) || 'null');
    if(queued?.fingerprint === fingerprint && queued.submission_id){
      pbProfileSubmissionCache = { fingerprint, item:queued };
      return pbPlain(queued, {});
    }
  }catch(e){}
  const submissionId = 'profile_' + ((typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`);
  const item = { profile:clean, fingerprint, submission_id:submissionId, queued_at:new Date().toISOString(), app_version:APP_VER };
  pbProfileSubmissionCache = { fingerprint, item };
  return pbPlain(item, {});
}
function pbQueueProfileSync(item){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return false;
  try{
    WLStorage.setItem(PB_PROFILE_SYNC_QUEUE_KEY, JSON.stringify(item));
    return true;
  }catch(e){ return false; }
}
function pbClearProfileSyncQueue(){
  try{ WLStorage.removeItem(PB_PROFILE_SYNC_QUEUE_KEY); }catch(e){}
}
function pbProfileInsertPayload(item){
  const p = (item && item.profile) || {};
  return {
    device_id: pbDeviceId(), user_id: pbUser ? pbUser.id : null, email: pbUser ? pbUser.email : null,
    name: p.name || null, gender: p.gender || null,
    age: parseInt(p.age, 10) || null, weight: parseFloat(p.weight) || null, height: parseFloat(p.height) || null,
    goal: p.goal || null, level: p.level || null, days: p.days || null, place: p.place || null,
    inventory: p.inventory || null, diet: p.diet || null, meals_per_day: p.mealsPerDay || null,
    injuries: p.injuries || null, platform: 'web', app_version: APP_VER, progress_epoch:pbProgressEpochId,
    submission_id: item?.submission_id || null
  };
}
async function pbWriteProfileSyncItem(item, signal){
  if(!sb || !pbProgressEpochReady || pbProgressResetting) return false;
  try{
    let query = sb.from('pb_profiles').insert(pbProfileInsertPayload(item));
    if(signal && typeof query.abortSignal === 'function') query = query.abortSignal(signal);
    const { error } = await query;
    return !error || error.code === '23505';
  }catch(e){ return false; }
}
async function pbFlushQueuedProfileSync(){
  try{
    const raw = WLStorage.getItem(PB_PROFILE_SYNC_QUEUE_KEY);
    if(!raw) return true;
    const item = JSON.parse(raw);
    const synced = await pbWriteProfileSyncItem(item);
    if(synced) pbClearProfileSyncQueue();
    return synced;
  }catch(e){ return false; }
}
function pbFlushQueuedProfileSyncSoon(){
  if(!sb) return;
  setTimeout(() => {
    Promise.resolve(pbFlushQueuedProfileSync()).catch(() => {});
  }, 0);
}
async function pbSyncProfile(profile, signal){
  const item = pbProfileSyncItem(profile || state.profile || {});
  const queued = pbQueueProfileSync(item);
  if(!queued) return { queued:false, synced:false };
  const synced = await pbWriteProfileSyncItem(item, signal);
  if(synced) pbClearProfileSyncQueue();
  return { queued:true, synced, deferred:!synced };
}
async function pbResumePendingSync(){
  if(!pbProgressEpochReady || pbProgressResetting) return;
  pbProgressEpochReady = false;
  const resetStatus = await pbApplyRemoteProgressReset();
  if(resetStatus !== 'current') return;
  pbProgressEpochReady = true;
  if(pbProofUi) Promise.resolve(pbProofUi.refresh()).catch(() => {});
  pbFlushQueuedProfileSyncSoon();
  Promise.resolve(pbUpsertUserStateSnapshot()).catch(() => {});
  if(typeof pbFlushBodyCheckQueue === 'function') Promise.resolve(pbFlushBodyCheckQueue()).catch(() => {});
  if(typeof pbFlushUserFoodQueue === 'function') Promise.resolve(pbFlushUserFoodQueue()).catch(() => {});
  if(typeof pbFlushNutritionSnapshotSyncQueue === 'function') Promise.resolve(pbFlushNutritionSnapshotSyncQueue()).catch(() => {});
  if(typeof pbFlushWorkoutLogQueue === 'function') Promise.resolve(pbFlushWorkoutLogQueue()).catch(() => {});
}
window.addEventListener('online', pbResumePendingSync);
window.addEventListener('storage', event => {
  if(!pbUser || pbSessionInvalidated) return;
  const key = WLStorage.keyFromEvent(event.key);
  const ownerChanged = key === PB_LOCAL_STATE_OWNER_KEY && event.newValue !== pbUser.id;
  const cleanupRequested = ['wl-device-cleanup-v1','wl-device-logout-v1'].includes(key)
    && window.WLDevicePrivacy?.isPending(pbUser.id);
  if(ownerChanged || cleanupRequested) pbApplyAuthSession(null);
});
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible' && navigator.onLine !== false) pbResumePendingSync();
});

// ----- Авторизация: вход/регистрация вынесены на отдельную страницу login.html -----
const LOGIN_PAGE = '/login';
async function pbAuthBoot(){
  return pbWebAuthBoot();
}
async function pbLogout(){
  if(!pbLeavingOwner && !window.confirm('Выйти из аккаунта на этом устройстве? Неотправленные изменения и файлы будут удалены. Данные, сохранённые на сервере, останутся.')) return;
  pbLeavingOwner = pbLeavingOwner || pbUser?.id || window.WLDevicePrivacy?.owner() || '';
  pbInvalidateLocalSession();
  try{
    await window.WLAccess.logout(sb, pbLeavingOwner);
    location.replace(LOGIN_PAGE);
  }catch(e){
    pbGateEl().innerHTML = '<div class="pb-gate-card"><h2>Выход не завершён</h2><p>Не удалось завершить сессию или очистить данные на устройстве. Повторите попытку.</p><button class="btn pb-gate-btn" id="pbLogoutRetry">Повторить выход</button></div>';
    $('pbLogoutRetry')?.addEventListener('click', pbLogout);
  }
}
function pbInvalidateLocalSession(){
  pbSessionInvalidated = true;
  try{ $('pbBroadcast')?.wlBroadcastClose?.(); }catch(e){}
  $('pbBroadcast')?.remove();
  try{ window.PrimeBodyAppleHealth?.destroy(); }catch(e){}
  pbUser = null; pbSubscription = null;
  pbUserStateReady = false; pbProgressEpochReady = false; pbStateLocalBaseline = null;
  clearTimeout(pbUserStateSyncTimer); clearInterval(pbTrial24Clock); pbClearLaunchTimeout();
  try{ $('appSheet')?.wlBodyCheckPreviewCleanup?.(); }catch(e){}
  try{ $('appSheet')?.wlNutritionArchiveCleanup?.(); }catch(e){}
  try{ pbProofUi?.cleanup(); }catch(e){} finally{ pbProofUi = null; }
  try{ for(let i=0;i<5 && pbCloseTopOverlay();i++){} }catch(e){}
  document.querySelectorAll('video,audio').forEach(media => {
    try{ media.pause(); media.srcObject?.getTracks().forEach(track=>track.stop()); media.srcObject=null; media.removeAttribute('src'); media.load(); }catch(e){}
  });
  $('app')?.replaceChildren();
  document.querySelector('.coach')?.remove();
  document.documentElement.classList.add('pb-gating');
  pbGateEl().innerHTML = '<div class="pb-gate-card"><h2>Завершаем сессию…</h2></div>';
}

function clearLocalProgressData(){
  const exact = new Set([
    PB_PROFILE_SYNC_QUEUE_KEY,
    PB_USER_FOODS_QUEUE_KEY,
    PB_BODY_CHECK_QUEUE_KEY,
    'primeBodyTechniqueExercise',
    'primeBodyTourSeen'
  ]);
  try{
    for(let index = WLStorage.length - 1; index >= 0; index--){
      const key = WLStorage.key(index);
      if(!key) continue;
      if(key.startsWith('primeBodyMobile') || key.startsWith(PB_WORKOUT_LOG_STORAGE_PREFIX) || exact.has(key)){
        WLStorage.removeItem(key);
      }
    }
  }catch(e){}
}

function pbProgressResetAckKey(){
  return PB_PROGRESS_RESET_ACK_PREFIX + String(pbUser?.id || 'guest');
}
function pbResetReceiptIsCurrent(reset){
  try{
    const acknowledged = JSON.parse(WLStorage.getItem(pbProgressResetAckKey()) || 'null');
    if(!acknowledged) return true;
    const previousAt = Date.parse(acknowledged.reset_at), nextAt = Date.parse(reset?.reset_at);
    return Number.isFinite(previousAt) && Number.isFinite(nextAt) && (acknowledged.reset_id === reset?.reset_id || previousAt < nextAt);
  }catch(e){ return false; }
}
function pbAcknowledgeProgressReset(reset){
  const resetId = String(reset?.reset_id || '').trim();
  const timestamp = Date.parse(String(reset?.reset_at || ''));
  if(!/^[0-9a-f-]{36}$/i.test(resetId) || !Number.isFinite(timestamp)) return;
  pbProgressEpochId = resetId;
  try{ WLStorage.setItem(pbProgressResetAckKey(), JSON.stringify({ reset_id:resetId, reset_at:new Date(timestamp).toISOString() })); }catch(e){}
}
async function pbApplyRemoteProgressReset(){
  if(!sb || !pbUser) return 'unavailable';
  const owner = pbUser.id, epoch = pbProgressEpochId;
  const isCurrent = () => pbUser?.id === owner && !pbSessionInvalidated && pbProgressEpochId === epoch && !window.WLDevicePrivacy?.isPending(owner);
  try{
    const transport = window.WLAccountActions.createTransport({ sb, url:SB_URL, publicKey:SB_ANON, owner, isCurrent });
    const data = await transport.rpc('pb_get_latest_progress_reset');
    if(!isCurrent()) return 'unavailable';
    if(!data){ pbProgressEpochId = null; return 'current'; }
    const resetId = String(data?.reset_id || '').trim();
    const resetAt = Date.parse(String(data?.reset_at || ''));
    if(!/^[0-9a-f-]{36}$/i.test(resetId) || !Number.isFinite(resetAt)) return 'unavailable';
    if(data?.media_cleanup_status === 'pending'){
      try{ await requestProgressReset(true); }catch(e){}
    }
    if(!isCurrent()) return 'unavailable';
    if(!pbResetReceiptIsCurrent(data)) return 'unavailable';
    let acknowledged = null;
    try{ acknowledged = JSON.parse(WLStorage.getItem(pbProgressResetAckKey()) || 'null'); }catch(e){}
    if(String(acknowledged?.reset_id || '') === resetId){ pbProgressEpochId = resetId; return 'current'; }
    await pbClearProofEpoch(owner, acknowledged?.reset_id || null);
    if(!isCurrent()) return 'unavailable';
    clearLocalProgressData();
    pbAcknowledgeProgressReset(data);
    const next = new URL(location.href);
    next.searchParams.set('reset_synced', '1');
    location.replace(next.toString());
    return 'reloading';
  }catch(e){ return 'unavailable'; }
}

async function requestProgressReset(cleanupOnly = false){
  if(!sb || !pbUser) throw new Error('auth_required');
  const { data:sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if(!token) throw new Error('auth_required');
  const response = await window.WLData.fetch(SB_URL + '/functions/v1/progress-reset', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + token,
      'apikey':SB_ANON
    },
    body:JSON.stringify({ confirm:'RESET_PROGRESS', cleanup_only:cleanupOnly === true, app_version:APP_VER })
  });
  const result = await response.json().catch(() => ({}));
  if(!response.ok || result?.ok !== true) throw new Error(result?.error || 'reset_failed');
  return result;
}

async function pbClearProofEpoch(owner, epoch){
  try{ await window.WLDevicePrivacy.clearProofEpoch(owner, epoch); return true; }
  catch(e){ if(['cleanup_journal_unavailable','invalid_cleanup_epoch'].includes(e?.code)) throw e; return false; }
}

function openProgressResetConfirm(){
  openSheet(`<div class="lib-sheet-head"><h2>Начать прогресс заново?</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Это действие нельзя отменить. Форма удалит:</p>
    <ul class="progress-reset-list"><li>анкету и персональные настройки</li><li>программы, тренировки, подходы и рабочие веса</li><li>рационы, дневник питания и свои продукты</li><li>замеры, BodyCheck, фото и баллы прогресса</li><li>импортированную историю Apple Health в Форма</li></ul>
    <p class="progress-reset-kept"><b>Останутся:</b> аккаунт, оплаченная подписка, история платежей, юридические согласия и подключение Apple Health.</p>
    <label class="progress-reset-confirm"><input type="checkbox" id="progressResetConfirm"><span>Я понимаю, что восстановить удалённый прогресс будет невозможно.</span></label>
    <div class="progress-reset-actions"><button type="button" class="secondary" id="progressResetCancel">Отмена</button><button type="button" class="danger" id="progressResetSubmit" disabled>Сбросить прогресс</button></div>
    <p class="progress-reset-status" id="progressResetStatus" aria-live="polite"></p>`);
  const root = $('appSheet');
  const checkbox = root?.querySelector('#progressResetConfirm');
  const submit = root?.querySelector('#progressResetSubmit');
  const cancel = root?.querySelector('#progressResetCancel');
  const status = root?.querySelector('#progressResetStatus');
  checkbox?.addEventListener('change', () => { if(submit) submit.disabled = !checkbox.checked; });
  cancel?.addEventListener('click', closeSheet);
  submit?.addEventListener('click', async () => {
    if(!checkbox?.checked || !submit) return;
    submit.disabled = true;
    if(cancel) cancel.disabled = true;
    pbProgressResetting = true;
    pbProgressEpochReady = false;
    clearTimeout(pbUserStateSyncTimer);
    if(status) status.textContent = 'Останавливаем синхронизацию и удаляем прогресс…';
    try{
      const result = await requestProgressReset();
      clearLocalProgressData();
      pbAcknowledgeProgressReset(result);
      const next = new URL(location.href);
      next.searchParams.set('welcome', '1');
      next.searchParams.set('reset', '1');
      location.replace(next.toString());
    }catch(e){
      pbProgressResetting = false;
      const epochStatus = await pbApplyRemoteProgressReset();
      if(epochStatus === 'reloading') return;
      pbProgressEpochReady = epochStatus === 'current';
      if(status) status.textContent = 'Не удалось завершить сброс. Проверь соединение и повтори попытку.';
      submit.disabled = !checkbox.checked;
      if(cancel) cancel.disabled = false;
    }
  });
}

// ---------- Web auth + subscription access ----------
function pbPreviewMode(){ return false; }
const PB_LAUNCH_TIMEOUT_MS = 18000;
let pbLaunchAttempt = 0;
let pbLaunchStartedAt = 0;
let pbLaunchTimer = 0;
function pbLaunchDuration(){ return pbLaunchStartedAt ? Math.max(0, Math.round(performance.now() - pbLaunchStartedAt)) : 0; }
function pbTrackLaunch(step, meta){
  trackSoon(step, 'launch', Object.assign({
    duration_ms: pbLaunchDuration(),
    auth_mode: 'email',
    attempt: pbLaunchAttempt
  }, meta || {}));
}
function pbClearLaunchTimeout(){
  if(pbLaunchTimer){ clearTimeout(pbLaunchTimer); pbLaunchTimer = 0; }
}
function pbArmLaunchTimeout(stage){
  pbClearLaunchTimeout();
  const attempt = pbLaunchAttempt;
  pbLaunchTimer = setTimeout(() => {
    if(attempt !== pbLaunchAttempt) return;
    pbTrackLaunch('state_fetch_failed', { error_code: 'launch_timeout', stage });
    pbGateTimeout(stage);
  }, PB_LAUNCH_TIMEOUT_MS);
}
function pbGateEl(){ let g = $('pbGate'); if(!g){ g = document.createElement('div'); g.id = 'pbGate'; g.className = 'pb-gate'; document.body.appendChild(g); } return g; }
function pbHideSplash(){ const s = $('pbSplash'); if(s){ s.classList.add('pb-hide'); setTimeout(() => { try{ s.remove(); }catch(e){} }, 520); } }
function pbCloseGate(){ if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return; pbClearLaunchTimeout(); const g = $('pbGate'); if(g) g.remove(); document.documentElement.classList.remove('pb-gating'); pbHideSplash(); }
function pbGateLoading(title, text){ if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return; pbGateEl().innerHTML = '<div class="pb-gate-card pb-gate-loading"><img class="pb-gate-brand" src="' + escapeHtml(WL_BRAND.logoMark || 'assets/neutral/training.png') + '" alt=""><div class="pb-gate-bar"><span></span></div><h2>' + escapeHtml(title || 'Проверяем доступ…') + '</h2><p>' + escapeHtml(text || 'Секунду.') + '</p></div>'; }
function pbGateError(msg, code){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return;
  pbClearLaunchTimeout();
  if(code) pbTrackLaunch('auth_failed', { error_code: code });
  const g = pbGateEl(); pbHideSplash();
  g.innerHTML = '<div class="pb-gate-card"><img class="pb-gate-brand" src="' + escapeHtml(WL_BRAND.logoMark || 'assets/neutral/training.png') + '" alt=""><div class="pb-gate-emoji">!</div><h2>Не получилось войти</h2><p>' + escapeHtml(msg || '') + '</p><p class="pb-gate-hint">Проверь соединение и попробуй ещё раз. Если сессия завершилась, войди заново.</p><button class="btn pb-gate-btn" id="pbGateRetry">Повторить</button></div>';
  $('pbGateRetry')?.addEventListener('click', () => { pbTrackLaunch('auth_retry', { from: code || 'error' }); pbCloseGate(); pbWebAuthBoot(); });
}
function pbGateTimeout(stage){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return;
  pbClearLaunchTimeout();
  const g = pbGateEl(); pbHideSplash();
  g.innerHTML = '<div class="pb-gate-card"><img class="pb-gate-brand" src="' + escapeHtml(WL_BRAND.logoMark || 'assets/neutral/training.png') + '" alt=""><div class="pb-gate-emoji">...</div><h2>Не удалось загрузить приложение</h2><p>Сервер слишком долго отвечает. Проверь соединение и нажми «Повторить».</p><button class="btn pb-gate-btn" id="pbGateRetry">Повторить</button></div>';
  $('pbGateRetry')?.addEventListener('click', () => { pbTrackLaunch('auth_retry', { from: 'timeout', stage }); pbCloseGate(); pbWebAuthBoot(); });
}
function pbShowPaywall(){ location.replace('/login'); }
function pbIsTrial24Subscription(subscription){
  return !!subscription && (subscription.status === 'trial' || String(subscription.last_payment_id || '').startsWith('trial24:') || subscription.access_kind === 'trial_24h');
}
function pbTrial24HoursLeft(subscription){
  const end = Date.parse(subscription?.current_period_end || subscription?.expires_at || '');
  if(!Number.isFinite(end) || end <= Date.now()) return 0;
  return Math.max(1, Math.ceil((end - Date.now()) / 3600000));
}
function pbShowTrialUpsell(feature){
  const label = feature ? `<p class="sheet-sub">${escapeHtml(String(feature))}</p>` : '';
  openSheet(`<div class="lib-sheet-head"><div><span class="pb-trial24-kicker">Полная версия</span><h2>Продолжить без ограничений</h2></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>${label}${pbBillingForm('pbTrialBilling')}`);
  pbMountBilling('pbTrialBilling');
}
function pbApplyTrial24Access(){
  const trial = pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0;
  document.documentElement.classList.toggle('pb-trial24', trial);
  document.querySelectorAll('[data-jump]').forEach(btn => {
    const locked = trial && !PB_TRIAL_24H_ALLOWED_SCREENS.has(String(btn.dataset.jump || ''));
    btn.classList.toggle('pb-trial24-locked', locked);
    if(locked) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  });
  const panels = [$('menuWeekCard'), document.querySelector('.history-card'), $('primeChallengeCard')].filter(Boolean);
  panels.forEach(panel => {
    panel.classList.toggle('pb-trial24-premium-panel', trial);
    if(!panel.dataset.trial24Bound){
      panel.dataset.trial24Bound = '1';
      panel.addEventListener('click', event => {
        if(!pbIsTrial24Subscription(pbSubscription) || pbTrial24HoursLeft(pbSubscription) < 1) return;
        event.preventDefault(); event.stopPropagation();
        const feature = panel.id === 'menuWeekCard'
          ? 'Меню на неделю доступно в полной версии.'
          : panel.id === 'primeChallengeCard'
          ? 'Недельный челлендж доступен в полной версии.'
          : 'История питания доступна в полной версии.';
        pbShowTrialUpsell(feature);
      }, true);
    }
  });
  document.querySelectorAll('#diaryDateStrip [data-diary-date]').forEach(btn => {
    btn.classList.toggle('pb-trial24-locked', trial && btn.dataset.diaryDate !== dayKey(0));
  });
  document.querySelector('#calToggle [data-cal="week"]')?.classList.toggle('pb-trial24-locked', trial);
}
function pbStartTrial24Clock(){
  if(pbTrial24Clock) clearInterval(pbTrial24Clock);
  if(!pbIsTrial24Subscription(pbSubscription)) return;
  pbTrial24Clock = setInterval(() => {
    if(pbTrial24HoursLeft(pbSubscription) < 1){
      clearInterval(pbTrial24Clock); pbTrial24Clock = 0;
      pbShowPaywall(pbSubscription);
      return;
    }
    pbRenderSubscriptionNotice();
  }, 30000);
}
function pbSubscriptionDaysLeft(subscription){
  const end = Date.parse(subscription?.current_period_end || '');
  if(!Number.isFinite(end) || end <= Date.now()) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}
function pbDaysWord(days){
  const n = Math.abs(Number(days) || 0) % 100;
  const tail = n % 10;
  if(n > 10 && n < 20) return 'дней';
  if(tail > 1 && tail < 5) return 'дня';
  if(tail === 1) return 'день';
  return 'дней';
}
function pbSubscriptionEndLabel(subscription){
  const end = Date.parse(subscription?.current_period_end || '');
  if(!Number.isFinite(end)) return '';
  try{ return new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long' }).format(new Date(end)); }catch(e){ return new Date(end).toLocaleDateString(); }
}
function pbBillingForm(prefix){
  return `<div class="pb-billing-form"><label id="${prefix}Wrap" hidden>Тариф<select id="${prefix}Plan" aria-label="Тариф" aria-describedby="${prefix}Price"></select></label><p id="${prefix}Price" class="pb-billing-price"></p><p id="${prefix}Status" class="pb-billing-status" role="status" aria-live="polite">Загружаем тарифы...</p><button type="button" class="primary shine" id="${prefix}Checkout" disabled>Перейти к оплате</button><button type="button" class="pb-billing-check" id="${prefix}Check">Проверить оплату</button></div>`;
}
function pbMountBilling(prefix){
  const select=$(`${prefix}Plan`), price=$(`${prefix}Price`), wrap=$(`${prefix}Wrap`);
  const button=$(`${prefix}Checkout`), status=$(`${prefix}Status`), check=$(`${prefix}Check`);
  if(!select || !price || !wrap || !button || !status || !check) return;
  const owner=pbUser?.id;
  if(!owner || !sb || !window.WLBilling?.create){ status.textContent='Оплата пока недоступна.'; return; }
  const current=()=>pbUser?.id===owner && status.isConnected;
  const notice=text=>{ if(current()) status.textContent=text; };
  const billing=window.WLBilling.create({sb,select,price,wrap,button,notice});
  button.addEventListener('click',()=>billing.checkout());
  check.addEventListener('click',async()=>{
    if(!current()) return;
    check.disabled=true;
    try{
      const result=await billing.check();
      if(!current()) return;
      if(result?.status==='succeeded'){ location.reload(); return; }
      if(!result) notice('Нет платежа для проверки.');
      else if(result.status==='pending') notice('Платёж ещё не подтверждён.');
    }catch{ notice('Не удалось проверить оплату. Повторите позже.'); }
    finally{ if(current()) check.disabled=false; }
  });
  billing.load().then(result=>{
    if(!current()) return;
    if(result?.status==='succeeded'){ location.reload(); return; }
    if(!billing.ready) notice('Оплата пока недоступна.');
  }).catch(()=>notice('Оплата пока недоступна.'));
}
function pbOpenSubscriptionRenewal(){
  if(!pbUser?.id) return;
  const daysLeft = pbSubscriptionDaysLeft(pbSubscription);
  track('subscription_renew_opened', 'today', { days_left:daysLeft, source:'browser_notice' });
  openSheet(`<div class="lib-sheet-head"><div><h2>Продлить доступ</h2></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>${pbBillingForm('pbRenewBilling')}`);
  pbMountBilling('pbRenewBilling');
}
function pbRenderSubscriptionNotice(){
  const notice = $('subscriptionNotice');
  if(!notice) return;
  const sub = pbSubscription;
  if(pbIsTrial24Subscription(sub)){
    const hoursLeft = pbTrial24HoursLeft(sub);
    if(hoursLeft < 1){ notice.hidden = true; return; }
    notice.hidden = false;
    notice.dataset.stage = 'trial';
    if($('subscriptionNoticeKicker')) $('subscriptionNoticeKicker').textContent = `Доступ · осталось ${hoursLeft} ч.`;
    if($('subscriptionNoticeTitle')) $('subscriptionNoticeTitle').textContent = 'Доступ активен';
    if($('subscriptionNoticeText')) $('subscriptionNoticeText').textContent = 'Анкета и сегодняшний прогресс сохранятся. Полная версия откроет недельный план, историю и интеграции.';
    const trialPay = $('subscriptionRenewBtn');
    if(trialPay && !trialPay.dataset.bound){
      trialPay.dataset.bound = '1';
      trialPay.addEventListener('click', pbOpenSubscriptionRenewal);
    }
    if(trialPay){ trialPay.textContent = 'Выбрать тариф'; trialPay.disabled = !pbUser?.id; }
    return;
  }
  const isActive = sub?.status === 'active' && !sub?.cancelled_at && pbSubscriptionDaysLeft(sub) > 0;
  const daysLeft = pbSubscriptionDaysLeft(sub);
  if(!isActive || daysLeft < 1 || daysLeft > 7){ notice.hidden = true; return; }
  const title = daysLeft === 1
    ? 'До окончания доступа не больше суток'
    : daysLeft === 2
    ? 'До окончания доступа 2 дня'
    : daysLeft === 3
    ? 'До окончания доступа 3 дня'
    : daysLeft === 7
    ? 'Подписка заканчивается через неделю'
    : `До окончания доступа ${daysLeft} ${pbDaysWord(daysLeft)}`;
  const endLabel = pbSubscriptionEndLabel(sub);
  notice.hidden = false;
  notice.dataset.stage = `d${daysLeft}`;
  if($('subscriptionNoticeKicker')) $('subscriptionNoticeKicker').textContent = daysLeft === 1
    ? 'Подписка · последние сутки'
    : `Подписка · осталось ${daysLeft} ${pbDaysWord(daysLeft)}`;
  if($('subscriptionNoticeTitle')) $('subscriptionNoticeTitle').textContent = title;
  if($('subscriptionNoticeText')) $('subscriptionNoticeText').textContent = `Доступ до ${endLabel}. Оплати следующий период заранее — тренировки, питание, Apple Health и прогресс останутся на месте.`;
  const renew = $('subscriptionRenewBtn');
  if(renew){ renew.textContent = 'Продлить доступ'; renew.disabled = !pbUser?.id; }
  if(renew && !renew.dataset.bound){
    renew.dataset.bound = '1';
    renew.addEventListener('click', pbOpenSubscriptionRenewal);
  }
}
function pbRememberLegalConsent(serverResult){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return;
  const rec = {
    version: LEGAL_CONSENT_VERSION,
    user_id: pbUser ? pbUser.id : null,
    auth_mode: 'email',
    accepted_offer: true,
    accepted_privacy: true,
    accepted_pd: true,
    accepted_health_data: true,
    accepted_confidential: true,
    consent_id: serverResult?.consent_id || null,
    consent_at: serverResult?.consent_at || new Date().toISOString(),
    docs: LEGAL_DOCS
  };
  WLStorage.setItem(LEGAL_CONSENT_LOCAL_KEY, JSON.stringify(rec));
  try{ sessionStorage.removeItem(LEGAL_CONSENT_PENDING_KEY); }catch(e){}
}
async function pbSaveLegalConsent(){
  if(!sb) throw new Error('supabase_missing');
  const { data, error } = await sb.rpc('wl_record_consent', {
    p_version: LEGAL_CONSENT_VERSION,
    p_accepted: { offer:true, privacy:true, personalData:true, healthData:true, confidential:true },
    p_device_id: pbDeviceId(),
    p_app_version: APP_VER
  });
  if(error || !data?.ok || data.consent_version !== LEGAL_CONSENT_VERSION) throw new Error(error?.code || 'consent_save_failed');
  return data;
}
function pbConsentScreen(errorText){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return Promise.resolve(false);
  pbClearLaunchTimeout();
  pbHideSplash();
  return new Promise((resolve) => {
    pbGateEl().innerHTML = '<div class="pb-gate-card"><img class="pb-gate-brand" src="' + escapeHtml(WL_BRAND.logoMark || 'assets/neutral/training.png') + '" alt=""><div class="pb-gate-emoji">✓</div>'
      + '<h2>Документы и согласия</h2>'
      + '<p>Перед входом подтвердите условия сервиса. Мы сохраним дату, идентификатор аккаунта, устройство и версии документов в журнале согласий.</p>'
      + (errorText ? '<p class="pb-gate-alert">' + escapeHtml(errorText) + '</p>' : '')
      + '<div class="pb-gate-consents">'
      + '<label class="pb-gate-check"><input type="checkbox" data-consent-check> Принимаю <a href="legal/offer.html" target="_blank" rel="noopener">публичную оферту</a> и понимаю, что приложение оказывает информационно-консультационные услуги.</label>'
      + '<label class="pb-gate-check"><input type="checkbox" data-consent-check> Ознакомлен(а) с <a href="legal/privacy.html" target="_blank" rel="noopener">политикой обработки персональных данных</a>.</label>'
      + '<label class="pb-gate-check"><input type="checkbox" data-consent-check> Отдельно даю <a href="legal/consent.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a>, включая сведения о здоровье, питании, тренировках, замерах и ограничениях.</label>'
      + '<label class="pb-gate-check"><input type="checkbox" data-consent-check> Подтверждаю согласие на обработку конфиденциальной информации, которую сам(а) ввожу в приложение, для подбора рекомендаций и фиксации факта использования сервиса.</label>'
      + '</div>'
      + '<p class="pb-gate-hint">Версия согласий: ' + escapeHtml(LEGAL_CONSENT_VERSION) + '</p>'
      + '<button class="btn pb-gate-btn" id="pbConsentBtn" disabled>Согласен и войти</button></div>';
    const checks = [...pbGateEl().querySelectorAll('[data-consent-check]')];
    const btn = $('pbConsentBtn');
    const sync = () => { if(btn) btn.disabled = !checks.every(chk => chk.checked); };
    checks.forEach(chk => chk.addEventListener('change', sync));
    btn?.addEventListener('click', () => resolve(true));
  });
}
async function pbEnsureLegalConsent(forceRemote = false){
  // Browser storage is a UI cache, never proof of an entry in the legal audit.
  if(!forceRemote){
    const { data, error } = await sb.rpc('wl_get_current_consent');
    if(!error && data?.ok && data.consent_version === LEGAL_CONSENT_VERSION){
      pbRememberLegalConsent(data);
      return true;
    }
  }
  let acceptedOnScreen = false;
  while(true){
    if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return false;
    if(!acceptedOnScreen){
      const ok = await pbConsentScreen();
      if(!ok) return false;
    }
    pbGateLoading('Сохраняем согласие…', 'Фиксируем юридический лог перед входом.');
    pbArmLaunchTimeout('consent_save');
    try{
      if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return false;
      const saved = await pbSaveLegalConsent();
      pbClearLaunchTimeout();
      pbRememberLegalConsent(saved);
      return true;
    }catch(e){
      pbTrackLaunch('consent_save_failed', { error_code: String(e?.message || e || 'consent_save_failed') });
      acceptedOnScreen = false;
      await pbConsentScreen('Не удалось сохранить согласие в журнал. Проверьте интернет и нажмите кнопку ещё раз.');
      acceptedOnScreen = true;
    }
  }
}
function pbApplyAuthSession(session){
  if(pbSessionInvalidated) return;
  const previousOwner = pbUser?.id || null;
  const nextOwner = session?.user?.id || null;
  if(previousOwner !== nextOwner){
    pbStateLocalBaseline = null;
    pbUserStateReady = false;
    clearTimeout(pbUserStateSyncTimer);
    invalidateWorkoutArchive();
    if(typeof invalidatePeriodReport === 'function') invalidatePeriodReport();
  }
  if(previousOwner && previousOwner !== nextOwner){
    pbInvalidateLocalSession();
    try{ window.WLDevicePrivacy.scheduleOwnerCleanup(previousOwner); }catch(e){}
    setTimeout(() => location.replace(LOGIN_PAGE), 0);
    return;
  }
  pbUser = session?.user || null;
}
async function pbWebAuthBoot(){
  if(pbSessionInvalidated){ location.replace(LOGIN_PAGE); return; }
  pbLaunchAttempt += 1;
  pbLaunchStartedAt = performance.now();
  pbTrackLaunch('app_opened');
  pbArmLaunchTimeout('auth');
  pbGateLoading();
  if(!SB_URL || !SB_ANON){
    pbGateError('Для этого бренда ещё не настроен отдельный сервер. Заполните tenant-config.js.', 'backend_not_configured');
    return;
  }
  if(!sb){ pbGateError('Сервис авторизации не загрузился', 'supabase_missing'); return; }
  try{ sb.auth.onAuthStateChange((_e, session) => pbApplyAuthSession(session)); }catch(e){}
  try{
    pbTrackLaunch('auth_started', { source:'existing_session' });
    const { data: s } = await sb.auth.getSession();
    if(s?.session?.user){
      pbTrackLaunch('auth_success', { source: 'existing_session' });
      pbUser = s.session.user;
      return pbAfterWebAuth();
    }
    pbClearLaunchTimeout();
    location.replace(LOGIN_PAGE);
  }catch(e){ pbGateError('Ошибка входа', 'auth_exception'); }
}
async function pbAfterWebAuth(){
  if(!pbUser){ pbGateError('Нет сессии', 'missing_session'); return; }
  if(!await pbPrepareLocalStateOwner(pbUser.id)) return;
  const owner=pbUser.id;
  const current=()=>!pbSessionInvalidated && pbUser?.id===owner;
  let active = false, sub = null, legalReady = false;
  try{
    pbArmLaunchTimeout('subscription_check');
    pbTrackLaunch('subscription_check_started');
    const res = await sb.from('pb_subscriptions')
      .select('status,current_period_end,user_id,cancelled_at,last_payment_id')
      .eq('user_id', pbUser.id)
      .order('current_period_end', { ascending:false })
      .limit(1);
    if(!current()) return;
    const data = res.data && res.data[0] ? res.data[0] : null;
    const error = res.error;
    if(error){ pbTrackLaunch('subscription_check_failed', { error_code: error.code || 'subscription_query_error' }); pbGateError('Не удалось проверить подписку', 'subscription_query_error'); return; }
    sub = data;
    pbSubscription = sub;
    const end = sub ? Date.parse(sub.current_period_end) : NaN;
    active = !!sub && (sub.status === 'active' || pbIsTrial24Subscription(sub)) && Number.isFinite(end) && end > Date.now();
  }catch(e){ pbTrackLaunch('subscription_check_failed', { error_code: 'subscription_exception' }); pbGateError('Не удалось проверить подписку', 'subscription_exception'); return; }
  if(active){
    const resetStatus = await pbApplyRemoteProgressReset();
    if(!current()) return;
    if(resetStatus === 'reloading') return;
    pbProgressEpochReady = resetStatus === 'current';
    if(!legalReady){
      const consentOk = await pbEnsureLegalConsent();
      if(!consentOk || !current()) return;
    }
    pbArmLaunchTimeout('state_fetch');
    pbTrackLaunch('state_fetch_started');
    syncNutritionHistoryOwner();
    const hadRemoteState = await pbLoadUserState();
    if(!current()) return;
    syncNutritionHistoryOwner();
    try{ pbRestoreNutritionOutbox(); }
    catch(e){ pbGateError('Не удалось прочитать неотправленный дневник на этом устройстве.', 'nutrition_outbox_unavailable'); return; }
    await pbLoadNutritionSnapshots();
    if(!current()) return;
    await pbBackfillNutritionSnapshots();
    if(!current()) return;
    pbFlushNutritionSnapshotSyncQueue();
    await pbLoadDailyActivitySnapshots();
    if(!current()) return;
    await pbLoadBodyChecks();
    if(!current()) return;
    await pbFlushBodyCheckQueue();
    if(!current()) return;
    await pbLoadUserFoods();
    if(!current()) return;
    pbStartProofUi();
    if(!hadRemoteState) await pbUpsertUserStateSnapshot();
    if(!current()) return;
    hydrateForm();
    renderHomeProfile();
    renderPlan();
    renderTasks();
    renderMetrics();
    pbRenderSubscriptionNotice();
    pbApplyTrial24Access();
    pbStartTrial24Clock();
    pbTrackLaunch('first_screen_rendered', { had_remote_state: !!hadRemoteState });
    pbCloseGate();
    track('app_open', state.profile?.name ? 'today' : 'onboarding');
    Promise.resolve(window.PrimeBodyAppleHealth?.boot({
      sb, user: pbUser, sbUrl: SB_URL, anonKey: SB_ANON,
      features: WL_CONFIG.features, isCurrent: current,
      host: location.hostname, search: location.search,
      todayKey: dayKey(0), onData: pbReceiveAppleHealthData
    })).then(() => { if(current()) pbQueueHealthWorkouts(); }).catch(() => {});
    try{ if(new URLSearchParams(location.search).get('welcome')) history.replaceState({}, '', location.pathname); }catch(e){}
    if(!(state.profile && state.profile.name)){ jump('onboarding'); toast('Добро пожаловать. Заполни анкету.'); }
    pbCheckBroadcasts();
  } else {
    pbShowPaywall(sub);
  }
}
// Рассылки: показываем активный непрочитанный баннер, учитываем сегмент
let pbBroadcastBusy = false;
function pbSegmentMatch(seg){
  if(!seg || seg === 'all') return true;
  if(typeof seg !== 'string') return false;
  if(seg.startsWith('subscription_days:')){
    const days = Number(seg.slice('subscription_days:'.length));
    const sub = pbSubscription;
    return [1,3,7].includes(days)
      && sub?.status === 'active'
      && !sub?.cancelled_at
      && pbSubscriptionDaysLeft(sub) === days;
  }
  if(seg.startsWith('subscription_within_days:')){
    const days = Number(seg.slice('subscription_within_days:'.length));
    const sub = pbSubscription;
    const daysLeft = pbSubscriptionDaysLeft(sub);
    return days === 7
      && sub?.status === 'active'
      && !sub?.cancelled_at
      && daysLeft >= 1
      && daysLeft <= days;
  }
  const p = state.profile || {};
  if(seg.startsWith('goal:')) return (p.goal || '') === seg.slice(5);
  if(seg === 'active') return (state.streak || 0) > 0;
  if(seg === 'dormant') return (state.streak || 0) === 0;
  return false;
}
function pbBroadcastSeen(owner){
  try{
    const rows = JSON.parse(WLStorage.getItem('wlSeenBroadcastsV1:' + owner) || '[]');
    return Array.isArray(rows) ? rows.filter(id => typeof id === 'string' && /^[1-9][0-9]{0,18}$/.test(id)).slice(-1000) : [];
  }catch(e){ return []; }
}
async function pbRecordBroadcast(context, id, clicked){
  try{
    if(!context.isCurrent()) return false;
    const { error } = await context.transport.from('pb_broadcast_reads').insert({
      user_id: context.owner, device_id: context.device, broadcast_id: id, clicked
    });
    if(error || !context.isCurrent()) return false;
    const seen = pbBroadcastSeen(context.owner);
    if(!seen.includes(String(id))) seen.push(String(id));
    try{ WLStorage.setItem('wlSeenBroadcastsV1:' + context.owner, JSON.stringify(seen.slice(-1000))); }catch(e){}
    return true;
  }catch(e){ return false; }
}
async function pbCheckBroadcasts(){
  const owner = pbUser?.id, client = sb;
  const isCurrent = () => !!owner && pbUser?.id === owner && sb === client && !pbSessionInvalidated;
  if(!client || !isCurrent() || pbBroadcastBusy || $('pbBroadcast')) return false;
  pbBroadcastBusy = true;
  try{
    const transport = await window.WLMediaSession.create({ client, owner, isCurrent, url: SB_URL, publicKey: SB_ANON, requestTimeout: 10000 });
    if(!isCurrent()) return false;
    const context = { owner, isCurrent, transport, device: pbDeviceId() };
    const now = new Date().toISOString();
    // Bound startup work while looking past newer notices for other audiences.
    for(let offset = 0; offset < 500; offset += 50){
      const { data, error } = await transport.from('pb_broadcasts')
        .select('id,title,body,cta_label,cta_screen,cta_url,segment,expires_at,created_at')
        .eq('active', true).or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 49);
      if(!isCurrent() || error || !Array.isArray(data)) return false;
      const seen = pbBroadcastSeen(owner);
      const fresh = data.find(b => b && (Number.isSafeInteger(b.id) && b.id > 0 || typeof b.id === 'string' && /^[1-9][0-9]{0,18}$/.test(b.id))
        && (!b.expires_at || Date.parse(b.expires_at) > Date.now())
        && !seen.includes(String(b.id)) && pbSegmentMatch(b.segment));
      if(fresh){
        if(!showBroadcast(fresh, context)) return false;
        return await pbRecordBroadcast(context, fresh.id, false);
      }
      if(data.length < 50) break;
    }
    return false;
  }catch(e){ return false; }
  finally{ pbBroadcastBusy = false; }
}
function showBroadcast(b){
  const ctaUrl = (() => {
    if(!b.cta_url) return '';
    try{
      const parsed = new URL(String(b.cta_url));
      return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '';
    }catch(e){ return ''; }
  })();
  const hasCta = !!(b.cta_label && (ctaUrl || b.cta_screen));
  let o = $('pbBroadcast');
  if(!o){ o = document.createElement('div'); o.id = 'pbBroadcast'; o.className = 'pb-bc'; document.body.appendChild(o); }
  o.innerHTML = `<div class="pb-bc-card">
    <button type="button" class="pb-bc-x" aria-label="Закрыть">×</button>
    <b>${escapeHtml(b.title)}</b><p>${escapeHtml(b.body)}</p>
    ${hasCta ? `<button type="button" class="pb-bc-cta">${escapeHtml(b.cta_label)}</button>` : ''}
  </div>`;
  o.classList.add('show');
  const close = () => o.classList.remove('show');
  o.querySelector('.pb-bc-x')?.addEventListener('click', close);
  o.addEventListener('click', e => { if(e.target === o) close(); });
  o.querySelector('.pb-bc-cta')?.addEventListener('click', () => {
    try{ if(sb) sb.from('pb_broadcast_reads').insert({ device_id: pbDeviceId(), broadcast_id: b.id, clicked: true }); }catch(e){}
    close();
    if(ctaUrl) openLink(ctaUrl);
    else if(b.cta_screen) jump(b.cta_screen);
  });
}

const leagues = [
  { name: 'Новичок', min: 0, next: 'Бронза' },
  { name: 'Бронза', min: 500, next: 'Серебро' },
  { name: 'Серебро', min: 900, next: 'Золото' },
  { name: 'Золото', min: 1400, next: 'Элита' },
  { name: 'Элита', min: 2000, next: 'Легенда' }
];

function gameStatus(){
  const current = leagues.slice().reverse().find(league => state.score >= league.min) || leagues[0];
  const next = leagues.find(league => league.min > state.score);
  const xpToNext = next ? next.min - state.score : 0;
  const prevMin = current.min;
  const nextMin = next ? next.min : current.min + 700;
  const progress = Math.max(4, Math.min(100, Math.round(((state.score - prevMin) / (nextMin - prevMin)) * 100)));
  const archetype = state.score >= 2000 ? 'Легенда дисциплины' : state.score >= 1400 ? 'Атлет режима' : state.score >= 900 ? 'Стабильный боец' : state.score >= 500 ? 'Новичок дисциплины' : 'На старте пути';
  return { current, next, xpToNext, progress, archetype };
}

// Уровень персонажа: тонкая шкала поверх статусов. Каждые 150 баллов = +1 уровень.
const XP_PER_LEVEL = 150;
function levelStatus(){
  const level = Math.floor(state.score / XP_PER_LEVEL) + 1;
  const into = state.score - (level - 1) * XP_PER_LEVEL;
  const pct = Math.max(3, Math.min(100, Math.round((into / XP_PER_LEVEL) * 100)));
  const xpToNext = XP_PER_LEVEL - into;
  const goalsToNext = Math.max(1, Math.ceil(xpToNext / 10));
  return { level, into, pct, xpToNext, goalsToNext, perLevel: XP_PER_LEVEL };
}

function pluralGoals(n){
  const m10 = n % 10, m100 = n % 100;
  if(m10 === 1 && m100 !== 11) return 'цель';
  if(m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'цели';
  return 'целей';
}

const titles = Object.fromEntries([...document.querySelectorAll('.screen')].map(screen => [screen.id, screen.dataset.title || screen.id]));

// Ежедневные мотивационные аффирмации: новая выскакивает при каждом заходе на главную.
const affirmations = [
  'Ты сегодня капитальный красавчик',
  'Меняй себя, меняйся в игре, достигай лучшего',
  'У тебя всё получится, без вариантов',
  'Дисциплина бьёт мотивацию. Погнали',
  'Сегодня ты сильнее, чем вчера',
  'Не сливайся. Один процент каждый день',
  'Лучшая версия тебя уже на подходе',
  'Тело меняется там, где раньше была лень',
  'Каждая закрытая цель это новый уровень',
  'Чемпионы не ждут понедельника',
  'Ты в игре, а в игре побеждают активные',
  'Сильное тело, ясная голова, твёрдый характер',
  'Маленький шаг сегодня, большой результат через год',
  'Режим это свобода, а не клетка',
  'Делай ради себя завтрашнего',
  'Прайм-форма строится из обычных вторников',
  'Встал, размялся, победил',
  'Твоя дисциплина это твой главный актив'
];

function pickAffirmation(){
  if(affirmations.length <= 1) return affirmations[0] || '';
  let i = Math.floor(Math.random() * affirmations.length);
  if(i === pickAffirmation._last) i = (i + 1) % affirmations.length;
  pickAffirmation._last = i;
  return affirmations[i];
}

function renderHeaderTitle(id){
  const el = $('screenTitle');
  if(!el) return;
  if(pbSimpleUi()){
    const simpleTitles = { today:'Сегодня', reports:'Прогресс', bio:'Профиль', health:'Восстановление', curator:'AI-куратор', more:'Ещё' };
    el.textContent = simpleTitles[id] || titles[id] || APP_NAME;
    el.classList.remove('affirm', 'pop');
    return;
  }
  if(id === 'today' && !pbSimpleUi()){
    el.textContent = pickAffirmation();
    el.classList.add('affirm');
    el.classList.remove('pop');
    void el.offsetWidth; // рестарт анимации
    el.classList.add('pop');
  } else {
    el.textContent = titles[id] || APP_NAME;
    el.classList.remove('affirm', 'pop');
  }
}

// 9 разделов: внутри группы — под-навигация, чтобы все экраны остались доступны.
const sectionGroups = [
  { label: 'Старт', members: [['onboarding', 'Анкета'], ['guide', 'Навигатор']] },
  { label: 'Тренировки', members: [['training', 'Тренировка'], ['programs', 'Готовые программы'], ['stretching', 'Растяжка'], ['workout-history', 'История'], ['generator', 'Генератор'], ['saved', 'Мои тренировки'], ['library', 'База упражнений'], ['technique', 'Техника']] },
  { label: 'Тело', members: [['bodymap', 'Цель'], ['forecast', 'Прогноз'], ['bio', 'Биокарта']] },
  { label: 'Здоровье', members: [['health', 'Восстановление'], ['pharma', 'Фарма'], ['peptides', 'Пептиды']] },
  { label: 'Клуб', members: [['club', 'Клуб'], ['market', 'Магазин'], ['growth', 'Рефералка']] }
];

const PB_SIMPLE_ROOTS = {
  today:'today', onboarding:'more', guide:'more',
  training:'training', programs:'training', stretching:'training', 'workout-history':'training', generator:'training', saved:'training', library:'training', technique:'training',
  nutrition:'nutrition', reports:'more', bodymap:'more', forecast:'more',
  more:'more', bio:'more', rewards:'more', curator:'more', health:'more', pharma:'more', peptides:'more', club:'more', market:'more', growth:'more'
};
const pbScreenScroll = Object.create(null);
function pbSimpleRoot(id){ return PB_SIMPLE_ROOTS[id] || 'more'; }
function pbUpdateBrowserBack(){ /* Browser history owns the system back action. */ }

function groupOf(id){
  return sectionGroups.find(g => g.members.some(m => m[0] === id));
}

function renderSubnav(id){
  document.querySelectorAll('.subnav').forEach(el => el.remove());
  if(pbSimpleUi()) return;
  const group = groupOf(id);
  const screen = $(id);
  if(!group || !screen) return;
  const nav = document.createElement('nav');
  nav.className = 'subnav';
  nav.setAttribute('aria-label', `Раздел «${group.label}»`);
  nav.innerHTML = `<span class="subnav-label">${escapeHtml(group.label)}</span>` + group.members.map(([mid, mlabel]) =>
    `<button type="button" class="subnav-chip${mid === id ? ' active' : ''}" data-sub="${mid}"${mid === id ? ' aria-current="page"' : ''}>${escapeHtml(mlabel)}</button>`
  ).join('');
  nav.querySelectorAll('[data-sub]').forEach(btn => btn.addEventListener('click', () => jump(btn.dataset.sub)));
  screen.insertBefore(nav, screen.firstChild);
  const current = nav.querySelector('[aria-current="page"]');
  if(current) nav.scrollLeft += current.getBoundingClientRect().left - nav.getBoundingClientRect().left - (nav.clientWidth - current.offsetWidth) / 2;
}

function save(){
  if(typeof pbSessionInvalidated !== 'undefined' && pbSessionInvalidated) return;
  WLStorage.setItem('primeBodyMobileProfile', JSON.stringify(state.profile));
  WLStorage.setItem('primeBodyMobileTasks2', JSON.stringify(state.tasks));
  WLStorage.setItem('primeBodyMobileScore', String(state.score));
  WLStorage.setItem('primeBodyMobileStreak', String(state.streak));
  WLStorage.setItem('primeBodyMobileAccess', String(state.access));
  WLStorage.setItem('primeBodyMobileWater', state.water.toFixed(1));
  WLStorage.setItem('primeBodyMobileKcal', String(state.kcal));
  WLStorage.setItem('primeBodyMobileRank', String(state.rank));
  WLStorage.setItem('primeBodyMobileForecasts', String(state.forecasts));
  WLStorage.setItem('primeBodyMobileWeeklyReports', String(state.weeklyReports));
  WLStorage.setItem('primeBodyMobileMeals', JSON.stringify(state.meals));
  WLStorage.setItem('primeBodyMobileHistory', JSON.stringify(state.history));
  WLStorage.setItem('primeBodyMobileLastDay', state.lastDay);
  WLStorage.setItem('primeBodyMobileWorkouts', JSON.stringify(state.savedWorkouts));
  WLStorage.setItem('primeBodyMobileActiveProgram', state.activeProgramId || '');
  WLStorage.setItem('primeBodyMobilePoseGender', state.poseGender);
  WLStorage.setItem('primeBodyMobileDayGuide', state.dayGuidePassed ? '1' : '0');
  WLStorage.setItem('primeBodyMobileFoodLog', JSON.stringify(state.foodLog));
  WLStorage.setItem('primeBodyMobileKcalCut', String(state.kcalCut));
  WLStorage.setItem('primeBodyMobileMenuWeek', JSON.stringify(state.menuWeek));
  WLStorage.setItem('primeBodyMobileMenuPrevious', JSON.stringify(state.menuPrevious || null));
  WLStorage.setItem('primeBodyMobileMenuRepeatDays', String(state.menuRepeatDays || ''));
  WLStorage.setItem('primeBodyMobileMenuDesserts', state.menuDesserts ? '1' : '0');
  WLStorage.setItem('primeBodyMobileMenuWeekBodyCheckSignature', state.menuWeekBodyCheckSignature || '');
  WLStorage.setItem('primeBodyMobileFavoriteDishIdsV1', JSON.stringify(state.favoriteDishIds || []));
  WLStorage.setItem('primeBodyMobileDayWorkout', JSON.stringify(state.dayWorkout));
  WLStorage.setItem('primeBodyMobileDayWorkoutDismissedDate', state.dayWorkoutDismissedDate || '');
  WLStorage.setItem('primeBodyMobileWorkoutResumeV1', JSON.stringify(state.workoutResume || null));
  WLStorage.setItem('primeBodyMobileNutritionResumeV1', JSON.stringify(state.nutritionResume || null));
  WLStorage.setItem('primeBodyMobileCalView', state.calView);
  WLStorage.setItem('primeBodyMobileQuestClaimed', state.questClaimed ? '1' : '0');
  WLStorage.setItem('primeBodyMobileDailyReport', JSON.stringify(state.dailyReport));
  WLStorage.setItem('primeBodyMobileMeasures', JSON.stringify(state.measures));
  WLStorage.setItem('primeBodyMobileBodyChecksV1', JSON.stringify(state.bodyChecks));
  WLStorage.setItem('primeBodyMobileLabs', JSON.stringify(state.labs));
  WLStorage.setItem('primeBodyMobilePharma', JSON.stringify(state.pharmaCheck));
  WLStorage.setItem('primeBodyMobilePeptide', JSON.stringify(state.peptideLog));
  WLStorage.setItem('primeBodyMobileReminders', JSON.stringify(state.reminders));
  WLStorage.setItem('primeBodyMobileRefCount', String(state.refCount));
  WLStorage.setItem('primeBodyMobileCamIntro', state.camIntroSeen ? '1' : '0');
  WLStorage.setItem('primeBodyMobileReadinessV1', JSON.stringify(state.readiness));
  WLStorage.setItem('primeBodyMobileReadinessLogV1', JSON.stringify(state.readinessLog));
  WLStorage.setItem('primeBodyMobileChallengeV1', JSON.stringify(state.challenge));
  scheduleUserStateSync();
}

// PrimeDay: короткий самочек перед нагрузкой. Это навигация по самочувствию,
// а не диагностика и не замена консультации врача.
function primeDayEmpty(){ return { date:'', sleepHours:'', energy:0, soreness:0, pain:false, note:'' }; }
function primeDayCurrent(){
  const value = state.readiness && typeof state.readiness === 'object' ? state.readiness : primeDayEmpty();
  return value.date === todayKey() ? value : primeDayEmpty();
}
function primeDayAssessment(){
  const r = primeDayCurrent();
  const sleep = Number(r.sleepHours) || 0;
  const energy = Math.max(0, Math.min(5, Number(r.energy) || 0));
  const soreness = Math.max(0, Math.min(5, Number(r.soreness) || 0));
  const filled = !!(sleep || energy || soreness || r.pain);
  if(!filled) return {
    filled:false, tone:'neutral', mode:'normal', label:'Проверь состояние',
    text:'30 секунд: сон, энергия и усталость. План останется твоим, но станет реалистичнее.',
    adjustment:'План пока без адаптации.'
  };
  let score = 0;
  if(sleep >= 7) score += 2;
  else if(sleep >= 6) score += 1;
  else if(sleep > 0) score -= 1;
  if(energy >= 4) score += 2;
  else if(energy === 3) score += 1;
  else if(energy > 0) score -= 2;
  if(soreness >= 4) score -= 2;
  else if(soreness === 3) score -= 1;
  if(r.pain) score -= 5;
  if(r.pain || energy <= 1 || soreness >= 5) return {
    filled:true, tone:'recovery', mode:'recovery', label:'Восстановление в приоритете',
    text:'Сегодня лучше убрать силовой объём: прогулка, мягкая мобильность и спокойное дыхание. Острая или необычная боль — повод остановиться и обратиться к врачу.',
    adjustment:'Силовая часть заменяется на восстановительный день.'
  };
  if(score <= 0) return {
    filled:true, tone:'easy', mode:'easy', label:'Облегчённый день',
    text:'Оставляем движение, но снижаем объём: без отказа, с запасом 2–3 повтора и более длинным отдыхом.',
    adjustment:'Минус один подход и мягче темп.'
  };
  return {
    filled:true, tone:'ready', mode:'normal', label:'Можно по плану',
    text:'Самочувствие подходит для обычной тренировки. Техника и запас повторов важнее прибавки веса.',
    adjustment:'Обычный план на сегодня.'
  };
}
function primeDayTrainingScheme(profile){
  const base = Object.assign({}, trainingSchemeFor(profile));
  const assessment = primeDayAssessment();
  if(assessment.mode === 'easy'){
    base.sets = Math.max(2, Math.min(Number(base.sets) || 3, 3) - 1);
    base.rest = '75–90 сек';
    base.label += ' · PrimeDay легко';
  } else if(assessment.mode === 'recovery'){
    base.sets = 2;
    base.reps = '8–10';
    base.rest = '90 сек';
    base.label += ' · PrimeDay восстановление';
  }
  if(assessment.filled) base.loadNote = `${base.loadNote} PrimeDay: ${assessment.adjustment}`;
  return base;
}
function renderPrimeDay(){
  const card = $('primeDayCard');
  if(!card) return;
  const assessment = primeDayAssessment();
  card.dataset.tone = assessment.tone;
  card.classList.toggle('is-filled', assessment.filled);
  const title = $('primeDayTitle'); if(title) title.textContent = assessment.label;
  const note = $('primeDayNote'); if(note) note.textContent = assessment.text;
  const plan = $('primeDayPlan'); if(plan) plan.textContent = assessment.adjustment;
  const btn = $('primeDayOpen');
  if(btn){
    btn.textContent = assessment.filled ? 'Изменить' : 'Проверить';
    if(!btn.dataset.bound){ btn.dataset.bound = '1'; btn.addEventListener('click', openPrimeDay); }
  }
}
function openPrimeDay(){
  const r = primeDayCurrent();
  const select = (id, label, values, current, suffix='') => `<label class="prime-day-field"><span>${label}</span><select id="${id}"><option value="">Не отмечено</option>${values.map(value => `<option value="${value}"${Number(current) === Number(value) ? ' selected' : ''}>${value}${suffix}</option>`).join('')}</select></label>`;
  openSheet(`<div class="lib-sheet-head"><div><h2>PrimeDay</h2><p class="sheet-sub">Проверь самочувствие перед нагрузкой. Это не медицинская оценка: при боли или тревожных симптомах остановись и проконсультируйся со специалистом.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="prime-day-form">
      ${select('primeSleep','Сон этой ночью',[4,5,6,7,8,9,10],r.sleepHours,' ч')}
      ${select('primeEnergy','Энергия сейчас',[1,2,3,4,5],r.energy,' / 5')}
      ${select('primeSoreness','Мышечная усталость',[1,2,3,4,5],r.soreness,' / 5')}
      <label class="prime-day-pain"><input id="primePain" type="checkbox"${r.pain ? ' checked' : ''}><span><b>Есть острая или необычная боль</b><small>Не продолжаем через боль.</small></span></label>
      <label class="prime-day-field prime-day-field-wide"><span>Короткая заметка</span><input id="primeNote" maxlength="180" value="${escapeHtml(String(r.note || ''))}" placeholder="например, мало сна, тяжёлые ноги" autocomplete="off"></label>
    </div>
    <button type="button" class="primary shine" id="primeDaySave">Собрать план на сегодня</button>`);
  $('appSheet')?.querySelector('#primeDaySave')?.addEventListener('click', () => {
    state.readiness = {
      date:todayKey(),
      sleepHours:Number($('primeSleep')?.value) || '',
      energy:Number($('primeEnergy')?.value) || 0,
      soreness:Number($('primeSoreness')?.value) || 0,
      pain:!!$('primePain')?.checked,
      note:String($('primeNote')?.value || '').trim().slice(0, 180)
    };
    state.readinessLog = (Array.isArray(state.readinessLog) ? state.readinessLog : [])
      .filter(item => item && item.date !== state.readiness.date)
      .concat([pbPlain(state.readiness, {})])
      .slice(-21);
    // Дневной план пересобирается только на сегодня; недельные планы не трогаем.
    state.dayWorkout = { date:'', items:[] };
    state.workoutResume = null;
    save();
    renderPrimeDay();
    renderTodayDashboard();
    renderDayWorkout();
    renderPrimeChallenge();
    track('prime_day_saved', 'today', { mode:primeDayAssessment().mode, has_pain:state.readiness.pain });
    closeSheet();
    toast(primeDayAssessment().mode === 'recovery' ? 'Сегодня выбрали восстановление' : 'План дня адаптирован');
  });
}

function primeWeekStartKey(){
  const date = new Date();
  const shift = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - shift);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function primeWeekDateKeys(){
  const start = new Date(primeWeekStartKey() + 'T12:00:00');
  const today = todayKey();
  const days = [];
  for(let offset = 0; offset < 7; offset++){
    const next = new Date(start);
    next.setDate(start.getDate() + offset);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    if(key <= today) days.push(key);
  }
  return days;
}
function ensurePrimeChallenge(){
  const weekStart = primeWeekStartKey();
  if(state.challenge?.weekStart === weekStart) return state.challenge;
  state.challenge = { weekStart, joined:false, claimed:false, buddyName:'' };
  save();
  return state.challenge;
}
function primeChallengeProgress(){
  const dates = primeWeekDateKeys();
  const logged = dates.filter(date => nutritionRecordDraftForDate(date).items.length > 0).length;
  const water = dates.filter(date => Number(nutritionRecordDraftForDate(date).water) >= 1.6).length;
  const workouts = dates.filter(date => !!dailyActivityForDate(date)?.workoutCompleted).length;
  const readiness = dates.filter(date => (state.readinessLog || []).some(item => item?.date === date)).length;
  const goals = [
    { key:'workouts', label:'3 тренировки', current:workouts, target:3 },
    { key:'food', label:'3 дня с питанием', current:logged, target:3 },
    { key:'water', label:'3 дня с водой', current:water, target:3 },
    { key:'readiness', label:'3 проверки PrimeDay', current:readiness, target:3 }
  ];
  return { goals, done:goals.filter(goal => goal.current >= goal.target).length, total:goals.length, dates };
}
async function shareText(text){
  const url = LINKS.public || location.origin;
  try{
    if(typeof navigator.share === 'function'){
      await navigator.share({ title:APP_NAME, text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`.trim());
    toast('Текст и ссылка скопированы');
  }catch(e){
    if(e?.name !== 'AbortError') toast('Не удалось поделиться');
  }
}
function renderPrimeChallenge(){
  const card = $('primeChallengeCard');
  if(!card) return;
  const challenge = ensurePrimeChallenge();
  const progress = primeChallengeProgress();
  card.hidden = false;
  card.classList.toggle('is-joined', !!challenge.joined);
  if($('primeChallengeTitle')) $('primeChallengeTitle').textContent = challenge.joined ? 'Держим темп вместе' : 'Небольшой ритм на неделю';
  if($('primeChallengeCount')) $('primeChallengeCount').textContent = `${progress.done} / ${progress.total}`;
  if($('primeChallengeFill')) $('primeChallengeFill').style.width = `${Math.round(progress.done / progress.total * 100)}%`;
  if($('primeChallengeText')) $('primeChallengeText').textContent = challenge.joined
    ? progress.goals.map(goal => `${goal.label.replace('3 ', '')} ${Math.min(goal.current, goal.target)}/${goal.target}`).join(' · ')
    : 'Четыре простых отметки за неделю. Без гонки за идеальными днями.';
  const join = $('primeChallengeJoin');
  if(join){
    const ready = progress.done === progress.total;
    join.disabled = challenge.joined && (!ready || challenge.claimed);
    join.textContent = !challenge.joined ? 'Участвовать' : ready && !challenge.claimed ? 'Забрать +20' : challenge.claimed ? 'Ритм закрыт' : 'В ритме';
    if(!join.dataset.bound){
      join.dataset.bound = '1';
      join.addEventListener('click', () => {
        const current = ensurePrimeChallenge();
        const now = primeChallengeProgress();
        if(!current.joined){
          current.joined = true;
          save(); renderPrimeChallenge();
          track('prime_challenge_joined', 'today', { week_start:current.weekStart });
          toast('Челлендж начат: просто держи ритм');
          return;
        }
        if(now.done === now.total && !current.claimed){
          current.claimed = true;
          state.score += 20;
          state.rank = Math.max(1, state.rank - 4);
          save(); renderMetrics();
          track('prime_challenge_claimed', 'today', { week_start:current.weekStart });
          toast('Неделя ритма закрыта: +20 баллов');
        }
      });
    }
  }
  const share = $('primeChallengeShare');
  if(share) share.hidden = !challenge.joined;
  if(share && !share.dataset.bound){
    share.dataset.bound = '1';
    share.addEventListener('click', () => {
      const now = primeChallengeProgress();
      telegramShareText(`Я прохожу «7 дней ритма» в Форма: ${now.done}/${now.total} этапа уже закрыто. Присоединяйся и держим темп вместе.`);
      track('prime_challenge_shared', 'today', { done:now.done, total:now.total });
    });
  }
}

function $(id){ return document.getElementById(id); }

function toast(text){
  const el = $('toast');
  if(!el) return;
  el.textContent = text;
  el.classList.add('show');
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => el.classList.remove('show'), 2100);
}

function jump(id, options){
  const opts = options || {};
  if(!$(id)) return;
  if(pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0 && !PB_TRIAL_24H_ALLOWED_SCREENS.has(String(id || ''))){
    track('trial_24h_premium_opened', id, { source:'navigation' });
    pbShowTrialUpsell('Этот раздел откроется в полной версии Форма.');
    return;
  }
  const previous = document.querySelector('.screen.active');
  if(previous?.id === 'nutrition' && id !== 'nutrition'){
    recipeExperience?.suspend();
    recipeExperienceToken++;
    switchNutritionView('main');
  }
  if(pbSimpleUi() && previous && previous.id !== id){
    pbScreenScroll[previous.id] = previous.scrollTop;
    if(opts.historyMode !== 'pop'){
      try{ history.pushState({ pbScreen:id }, '', location.href); }catch(e){}
    }
  }
  if(id === 'onboarding') document.querySelector('.coach.on')?.classList.remove('on');
  $('app')?.classList.toggle('anketa-mode', id === 'onboarding');
  $('app')?.classList.toggle('photo-home-active', id === 'today');
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id));
  document.querySelectorAll('[data-jump]').forEach(btn => {
    const isActive = btn.dataset.jump === id || (pbSimpleUi() && btn.closest('.bottom-nav') && btn.dataset.jump === pbSimpleRoot(id));
    btn.classList.toggle('active', isActive);
    if(btn.closest('.bottom-nav')){
      if(isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
  });
  renderHeaderTitle(id);
  renderSubnav(id);
  if(id === 'today') renderTodayDashboard();
  if(id === 'training'){
    renderDayWorkout();
    const activeProgram = activeReadyProgramSession();
    if(activeProgram && !currentWorkoutResume()) prepareReadyWorkout(activeProgram.workoutIndex).then(() => {
      if($('training')?.classList.contains('active')) renderDayWorkout();
    }).catch(() => toast('Не удалось обновить программу. Попробуй открыть её ещё раз.'));
    if(!pbSimpleUi() && currentWorkoutResume()) requestAnimationFrame(() => {
      if($('training')?.classList.contains('active') && !player) resumeWorkoutPlayer();
    });
  }
  if(id === 'library') ensureLibrary();
  if(id === 'stretching') renderStretching();
  if(id === 'nutrition'){
    if(opts.historyMode !== 'pop'){
      recipeExperienceToken++;
      closeMenuDetail();
      switchNutritionView('main');
      try{ if(history.state?.pbRecipe) history.replaceState({ pbScreen:'nutrition' }, '', location.href); }catch(e){}
    }
    ensureFoods();
    ensureDishes().then(() => {
      if(!$('nutrition')?.classList.contains('active')) return;
      renderNutrition();
    });
    renderNutrition();
  }
  if(id === 'reports'){ renderProgressAvatar(); renderWeeklyInsight(); loadPeriodReport(); }
  if(id === 'forecast') loadPeriodReport();
  if(id === 'curator') initCoach();
  if(id === 'bio'){ renderTrackers(); renderProfileQuickSettings(); }
  if(id === 'technique' && !state.camIntroSeen) openCamIntro();
  if(id !== 'technique' && typeof POSE !== 'undefined' && POSE.on) poseStop();
  if(id === 'generator') ensureGenerator();
  if(id === 'programs') renderReadyPrograms();
  if(id === 'workout-history') renderWorkoutArchive();
  if(id === 'saved'){ ensureManualWorkoutBuilder(); renderSaved(); }
  track('screen_view', id);
  const active = $(id);
  const appShell = $('app');
  if(appShell) appShell.scrollTop = 0;
  if(document.scrollingElement) document.scrollingElement.scrollTop = 0;
  active.scrollTo({ top:opts.restoreScroll ? (pbScreenScroll[id] || 0) : 0, behavior:'auto' });
  pbUpdateTelegramBack(id);
  if(id === 'nutrition' && !$('recipeCatalogPanel')?.hidden) pbUpdateTelegramBack(id, true);
  observeReveals();
}

function pbInitSimpleNavigation(){
  if(!pbSimpleUi()) return;
  try{ history.replaceState({ pbScreen:document.querySelector('.screen.active')?.id || 'today' }, '', location.href); }catch(e){}
  window.addEventListener('popstate', event => {
    if(pbHandleRecipeHistory(event)) return;
    const target = event.state?.pbScreen || 'today';
    jump(target, { historyMode:'pop', restoreScroll:true });
  });
  try{
    const webApp = window.Telegram?.WebApp;
    if(webApp?.isVersionAtLeast && !webApp.isVersionAtLeast('6.1')) return;
    const back = webApp?.BackButton;
    if(back) back.onClick(() => { if(!pbCloseTopOverlay()) history.back(); });
  }catch(e){}
  pbUpdateTelegramBack(document.querySelector('.screen.active')?.id || 'today');
}

function bindStaticActions(){
  document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => {
    jump(btn.dataset.jump);
    if(btn.dataset.anketaStep) window.setTimeout(() => showAnketaStep(Number(btn.dataset.anketaStep)), 0);
    if(btn.hasAttribute('data-manual-create')) window.setTimeout(focusManualWorkoutBuilder, 0);
  }));
  document.querySelectorAll('[data-action="toast"]').forEach(btn => btn.addEventListener('click', () => toast(btn.dataset.toast || 'Готово')));
  $('supportToday')?.addEventListener('click', openSupport);
  $('supportCurator')?.addEventListener('click', openSupport);
  $('simpleSupport')?.addEventListener('click', openSupport);
  const addSimpleWater = (date) => {
    const result = applyWaterControlDelta(0.2, date);
    const undo = $('simpleWaterUndo');
    if(undo && date === dayKey(0)) undo.hidden = !result.changed;
    if(result.changed) track('quick_action_used', 'today', { action:'water_add_200' });
  };
  $('simpleFoodAdd')?.addEventListener('click', () => {
    track('quick_action_used', 'today', { action:'food_add' });
    if(setNutritionSelectedDate(dayKey(0))) openFoodPicker();
  });
  $('homeFoodCta')?.addEventListener('click', () => {
    track('quick_action_used', 'today', { action:'food_add' });
    setNutritionSelectedDate(dayKey(0));
    openFoodPicker();
  });
  $('homeTrainingCta')?.addEventListener('click', () => {
    if(!String(state.profile?.name || '').trim()){ jump('onboarding'); return; }
    const resume = currentWorkoutResume();
    track('primary_action_clicked', 'today', { action:resume ? 'Продолжить тренировку' : 'Перейти к тренировке', destination:'training' });
    jump('training');
    if(resume) resumeWorkoutPlayer();
  });
  $('homePhotoRetry')?.addEventListener('click', async () => {
    await Promise.all([pbLoadNutritionSnapshots(), pbLoadDailyActivitySnapshots()]);
    renderTodayDashboard();
  });
  $('homeReadiness')?.addEventListener('click', openPrimeDay);
  $('simpleNutritionFoodAdd')?.addEventListener('click', openFoodPicker);
  $('simpleWaterAdd')?.addEventListener('click', () => addSimpleWater(dayKey(0)));
  $('simpleNutritionWaterAdd')?.addEventListener('click', () => addSimpleWater(selectedNutritionDate()));
  $('simpleWaterUndo')?.addEventListener('click', () => {
    applyWaterControlDelta(-0.2, dayKey(0));
    $('simpleWaterUndo').hidden = true;
    track('quick_action_undone', 'today', { action:'water_add_200' });
  });
  $('simpleSubscription')?.addEventListener('click', () => {
    jump('today');
    window.setTimeout(() => {
      const notice = $('subscriptionNotice');
      if(notice && !notice.hidden) notice.scrollIntoView({ block:'start', behavior:'smooth' });
      else toast('Доступ активен. Продление появится перед окончанием периода.');
    }, 80);
  });
  $('todayNextCta')?.addEventListener('click', event => {
    if(!pbSimpleUi()) return;
    track('primary_action_clicked', 'today', {
      action:event.currentTarget.dataset.action || '',
      destination:event.currentTarget.dataset.jump || '',
      elapsed_ms:Math.max(0, Math.round(performance.now() - PB_UI_SESSION_STARTED_AT))
    });
    if(event.currentTarget.dataset.action === 'Завершить день') window.setTimeout(openDailyReport, 60);
  });
  document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
    const group = chip.closest('.chips-panel') || document;
    group.querySelectorAll('.chip').forEach(item => item.classList.remove('active'));
    chip.classList.add('active');
    toast(`Вайб выбран: ${chip.textContent.trim()}`);
  }));
}

function planFromProfile(){
  const p = state.profile;
  const activity = normalizeActivityLevel(p.activityLevel);
  const mode = normalizeTrainingMode(p.mode);
  // Only approved composition sources travel with recommendations. Private
  // photo paths and archived circumference estimates never affect the plan;
  // a current photo estimate is allowed only to make a bounded soft adjustment.
  const bodyCheck = typeof latestBodyComposition === 'function' ? latestBodyComposition() : null;
  // дефолты только для расчётов (BMR/генератор) у юзера без анкеты; на экранах показываем «—» (см. renderHomeProfile)
  return {
    name: p.name || '',
    gender: p.gender || 'Мужчина',
    age: p.age || '30',
    goal: p.goal || 'Поддержание',
    place: p.place || 'Дома',
    days: p.days || '3',
    level: p.level || 'Новичок',
    inv: normalizeInventory(p.inventory || 'Резинки'),
    weight: p.weight || '80',
    height: p.height || '178',
    targetWeight: p.targetWeight || '',
    target: p.targetWeight ? `${p.goal || 'Цель'} · ${p.targetWeight} кг` : (p.target || 'Подтянутая форма'),
    pace: p.pace || 'Спокойно · 12+ недель',
    motivation: p.motivation || '',
    activityLevel: activity,
    sessionMinutes: p.sessionMinutes || '40',
    focusZones: p.focusZones || '',
    mode,
    diet: p.diet || 'Обычное',
    foodBudget: p.foodBudget || 'Баланс цена/качество',
    mealsPerDay: p.mealsPerDay || '4',
    cookingTime: p.cookingTime || 'Обычно · до 30 мин',
    mealTiming: p.mealTiming || 'Обычный день',
    dislikes: p.dislikes || '',
    allergies: p.allergies || '',
    injuries: p.injuries || '',
    medicalFlags: p.medicalFlags || '',
    limits: p.limits || '',
    medications: p.medications || '',
    bodyCheck
  };
}
function normalizeActivityLevel(value){
  return ({
    'Сидячий день': 'Низкая',
    'Мало хожу': 'Умеренная',
    'Много на ногах': 'Высокая',
    'Физическая работа': 'Очень высокая',
    'Низкая': 'Низкая',
    'Умеренная': 'Умеренная',
    'Высокая': 'Высокая',
    'Очень высокая': 'Очень высокая'
  })[value] || 'Умеренная';
}
function normalizeTrainingMode(value){
  return ({
    'Мягкий': 'Лёгкий',
    'Hardcore': 'Интенсивный',
    'Для занятых': 'Средний',
    'Лёгкий': 'Лёгкий',
    'Средний': 'Средний',
    'Интенсивный': 'Интенсивный'
  })[value] || 'Средний';
}
function normalizeInventory(value){
  const raw = String(value || '').trim();
  const low = raw.toLowerCase();
  if(!raw) return 'Резинки';
  if(['резинки', 'только резинки', 'резинка', 'эспандер', 'эспандеры', 'ленты', 'фитнес-резинки'].includes(low)) return 'Резинки';
  if(/резин/.test(low) && !/(гантел|штанг|зал|турник|площад)/.test(low)) return 'Резинки';
  if(/резин/.test(low) && /гантел/.test(low)) return 'Резинки + гантели';
  if(/ничего|нет|свой вес/.test(low)) return 'Ничего нет';
  if(/турник|площад/.test(low)) return 'Турник + площадка';
  if(/полный зал|тренаж[её]р|зал/.test(low)) return 'Полный зал';
  return raw;
}
const TRAINING_LEVELS = ['Новичок', 'Любитель', 'Подготовленный атлет'];
const TRAINING_LEVEL_LABELS = { 'Новичок':'Новичок', 'Любитель':'Средний', 'Подготовленный атлет':'Подготовленный' };
const PROFILE_GENDERS = ['Мужчина', 'Женщина'];
function renderProfileQuickSettings(){
  const p = planFromProfile();
  if($('profileLevelPill')) $('profileLevelPill').textContent = TRAINING_LEVEL_LABELS[p.level] || p.level;
  const note = $('profileLevelNote');
  if(note){
    note.textContent = p.level === 'Новичок'
      ? 'Новичок: проще техника, меньше рискованных движений, больше базовых вариантов.'
      : p.level === 'Подготовленный атлет'
      ? 'Подготовленный: генератор откроет продвинутые упражнения и более широкий пул.'
      : 'Средний: базовые и промежуточные упражнения без совсем тяжёлой продвинутой базы.';
  }
  document.querySelectorAll('[data-profile-gender]').forEach(btn => {
    const active = btn.dataset.profileGender === p.gender;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-profile-level]').forEach(btn => {
    const active = btn.dataset.profileLevel === p.level;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}
function setTrainingLevel(level){
  if(!TRAINING_LEVELS.includes(level)) return;
  state.profile = state.profile || {};
  if((state.profile.level || 'Новичок') === level){
    toast(`Уровень уже: ${TRAINING_LEVEL_LABELS[level] || level}`);
    renderProfileQuickSettings();
    return;
  }
  state.profile.level = level;
  state.dayWorkout = { date: '', items: [] };
  state.workoutResume = null;
  if(typeof genState !== 'undefined'){
    genState._init = false;
    genState.muscles.clear();
    genState.equip.clear();
  }
  save();
  hydrateForm();
  renderHomeProfile();
  renderProfileQuickSettings();
  renderPlan();
  renderTasks();
  renderMetrics();
  if($('training')?.classList.contains('active')) renderDayWorkout();
  if($('generator')?.classList.contains('active')) ensureGenerator();
  if($('saved')?.classList.contains('active')) ensureManualWorkoutBuilder();
  pbSyncProfile(state.profile).catch(() => {});
  track('profile_level_changed', 'bio', { level });
  toast(`Уровень изменён: ${TRAINING_LEVEL_LABELS[level] || level}. Тренировка пересоберётся.`);
}
function setProfileGender(gender){
  if(!PROFILE_GENDERS.includes(gender)) return;
  state.profile = state.profile || {};
  if((state.profile.gender || 'Мужчина') === gender){
    toast(`Пол уже выбран: ${gender}`);
    renderProfileQuickSettings();
    return;
  }
  state.profile.gender = gender;
  state.poseGender = gender === 'Женщина' ? 'f' : 'm';
  state.menuWeek = [];
  state.dayWorkout = { date: '', items: [] };
  state.workoutResume = null;
  state.nutritionResume = null;
  if(typeof genState !== 'undefined'){
    genState._init = false;
    genState.muscles.clear();
    genState.equip.clear();
  }
  save();
  hydrateForm();
  renderHomeProfile();
  renderProfileQuickSettings();
  renderBodyInsights();
  renderPlan();
  renderTasks();
  renderMetrics();
  renderMenuWeek();
  if($('training')?.classList.contains('active')) renderDayWorkout();
  if($('generator')?.classList.contains('active')) ensureGenerator();
  if($('saved')?.classList.contains('active')) ensureManualWorkoutBuilder();
  pbSyncProfile(state.profile).catch(() => {});
  track('profile_gender_changed', 'bio', { gender });
  toast(`Пол изменён: ${gender}. Норма и аватар обновлены.`);
}

function renderHomeProfile(){
  const p = planFromProfile();
  // #profileInitial теперь показывает логотип-монограмму (см. index.html), букву не подставляем
  const sp = state.profile || {};
  if($('homeProfileName')) $('homeProfileName').textContent = sp.name || '—';
  if($('homeGoal')) $('homeGoal').textContent = sp.goal || '—';
  if($('homeLevel')) $('homeLevel').textContent = sp.level || '—';
  if($('homeWeight')) $('homeWeight').textContent = sp.weight ? `${sp.weight} кг` : '—';
}

// Параметрический обезличенный манекен под анкету и антропометрию.
function humanFigure(p, level){
  const female = p.gender === 'Женщина';
  const goal = p.goal;
  const bulk = goal === 'Набор' ? 1 : goal === 'Поддержание' ? 0.5 : 0.2;
  const lean = goal === 'Сушка' ? 1 : goal === 'Поддержание' ? 0.45 : 0.1;
  const levelBoost = Math.min(1, (level - 1) / 9);
  const dev = Math.min(1, bulk * 0.55 + levelBoost * 0.6);
  const w = parseFloat(p.weight) || 82;
  const h = parseFloat(p.height) || 178;
  const bmi = w / Math.pow((h || 178) / 100, 2);
  const mass = Math.max(0, Math.min(1, (bmi - 19) / 12));
  const cx = 60;

  let shoulder = (female ? 25 : 31) + dev * 9 + mass * 3;
  let chest = (female ? 21 : 25) + dev * 6 + mass * 6;
  let waist = (female ? 16 : 20) + mass * 8 - lean * 4 - dev * 1.5;
  let hip = (female ? 28 : 22) + mass * 5 + dev * 2;
  waist = Math.max(11, Math.min(waist, chest - 2));
  const thigh = (female ? 13 : 13) + dev * 3 + mass * 3;
  const arm = (female ? 6.5 : 7.5) + dev * 4 + mass * 1.5;

  const yShoulder = 54, yChest = 76, yWaist = 118, yHip = 140;
  const n = v => Number(v).toFixed(1);

  function limb(x, y, wd, len, ang){
    return `<rect x="${n(x - wd / 2)}" y="${n(y)}" width="${n(wd)}" height="${n(len)}" rx="${n(wd / 2)}" transform="rotate(${ang} ${n(x)} ${n(y)})"/>`;
  }

  const torso = `M ${n(cx - shoulder)} ${yShoulder}
    Q ${n(cx - chest - 1)} ${yChest} ${n(cx - waist)} ${yWaist}
    Q ${n(cx - waist - 1)} ${yHip - 2} ${n(cx - hip)} ${yHip}
    L ${n(cx + hip)} ${yHip}
    Q ${n(cx + waist + 1)} ${yHip - 2} ${n(cx + waist)} ${yWaist}
    Q ${n(cx + chest + 1)} ${yChest} ${n(cx + shoulder)} ${yShoulder}
    Q ${cx} ${yShoulder - 9} ${n(cx - shoulder)} ${yShoulder} Z`;

  const legGap = hip * 0.46;
  const legL = limb(cx - legGap, yHip - 8, thigh, 80, -2);
  const legR = limb(cx + legGap, yHip - 8, thigh, 80, 2);
  const armL = limb(cx - shoulder + arm * 0.3, yShoulder + 1, arm, 82, -9);
  const armR = limb(cx + shoulder - arm * 0.3, yShoulder + 1, arm, 82, 9);
  const neck = `<rect x="${n(cx - 5.5)}" y="40" width="11" height="17" rx="4"/>`;
  const head = `<circle cx="${cx}" cy="25" r="15"/>`;
  const clavicle = `M ${n(cx - shoulder * 0.48)} 63 Q ${cx} 70 ${n(cx + shoulder * 0.48)} 63`;
  const core = `M ${n(cx - waist * 0.52)} 91 Q ${cx} 105 ${n(cx + waist * 0.52)} 91
    M ${cx} 76 L ${cx} 130`;
  const stage = figureStage(p, level);

  return `<svg class="mannequin-figure" viewBox="0 0 120 220" role="img" aria-label="Обезличенный манекен по анкете" data-stage="${stage}">
    <defs>
      <linearGradient id="figGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#E7D4BC"/><stop offset="0.5" stop-color="#B98261"/><stop offset="1" stop-color="#6E4B34"/>
      </linearGradient>
      <radialGradient id="figFace" cx="50%" cy="32%" r="70%">
        <stop offset="0" stop-color="#F2EFE8"/><stop offset="0.58" stop-color="#D6C1A7"/><stop offset="1" stop-color="#A97354"/>
      </radialGradient>
    </defs>
    <g fill="url(#figGrad)">${legL}${legR}${armL}${armR}${neck}<path d="${torso}"/></g>
    <g fill="url(#figFace)">${head}</g>
    <g fill="none" stroke="#F2EFE8" stroke-width="1.2" stroke-linecap="round" opacity="${n(0.1 + stage * 0.06)}">
      <path d="${clavicle}"/><path d="${core}"/>
    </g>
  </svg>`;
}

// Стадия фигуры 1..5: базово по BMI/весу, уровень даёт мягкий прогресс сверху.
function figureStage(p, level){
  const w = parseFloat(p.weight) || 82;
  const h = parseFloat(p.height) || 178;
  const bmi = w / Math.pow((h || 178) / 100, 2);
  const bmiScore = bmi >= 34 ? 0.05
    : bmi >= 30 ? 0.16
    : bmi >= 27 ? 0.30
    : bmi >= 24 ? 0.48
    : bmi >= 21 ? 0.64
    : bmi >= 18.5 ? 0.56
    : 0.40;
  const levelBoost = Math.min(1, (Number(level) - 1) / 9);
  const goalLean = p.goal === 'Сушка' ? 0.08 : p.goal === 'Набор' ? -0.03 : 0.02;
  const score = Math.max(0, Math.min(1, 0.72 * bmiScore + 0.20 * levelBoost + goalLean));
  return Math.max(1, Math.min(5, Math.round(1 + score * 4)));
}

function renderFigureInto(wrap, p, level){
  if(!wrap) return;
  const g = p.gender === 'Женщина' ? 'f' : 'm';
  const s = figureStage(p, level);
  wrap.dataset.stage = String(s);
  wrap.innerHTML = `<img class="figure-img" src="assets/neutral/avatar.svg?v=fig5" alt="Обезличенный аватар · форма ${s} · уровень ${level}" />`;
  const img = wrap.querySelector('img');
  img.addEventListener('error', () => { wrap.innerHTML = humanFigure(p, level); }, { once: true });
}

function renderFigure(p, level){
  renderFigureInto($('figureWrap'), p, level);
}

function renderProgressAvatar(){
  const wrap = $('progressAvatarWrap');
  if(!wrap) return;
  const p = planFromProfile();
  const lv = levelStatus();
  const game = gameStatus();
  const assessment = bodyAssessment(p);
  renderFigureInto(wrap, { ...p, weight:assessment.weight }, lv.level);
  if($('progressAvatarAura')) $('progressAvatarAura').style.opacity = (0.42 + Math.min(1, (lv.level - 1) / 9) * 0.35).toFixed(2);
  if($('progressAvatarBadge')) $('progressAvatarBadge').textContent = `Ур.${lv.level}`;
  if($('progressAvatarTitle')) $('progressAvatarTitle').textContent = `Уровень ${lv.level} · ${game.current.name}`;
  if($('progressAvatarSummary')){
    const target = assessment.targetWeight ? `Цель ${assessment.targetWeight} кг` : `Цель: ${p.goal.toLowerCase()}`;
    $('progressAvatarSummary').textContent = `Сейчас ${assessment.weight.toFixed(1)} кг. ${target}. Аватар меняется вместе с анкетой, замерами и активностью.`;
  }
  if($('progressAvatarBar')) $('progressAvatarBar').style.width = `${lv.pct}%`;
  if($('progressAvatarNext')) $('progressAvatarNext').textContent = `${state.score} баллов · ещё ${lv.xpToNext} до уровня ${lv.level + 1}`;
}

function figureStageFromWeight(p, weight, level){
  return figureStage({ ...p, weight }, level);
}

function forecastStageCap(p, level){
  return 5;
}

function forecastStagePlan(p, a, level){
  const now = figureStage(p, level);
  const cap = forecastStageCap(p, level);
  let target = now;
  if(a.targetWeight){
    target = figureStageFromWeight(p, a.targetWeight, Math.min(10, level + 2));
  }else if(p.goal === 'Сушка'){
    target = now + 2;
  }else if(p.goal === 'Набор'){
    target = now + (now <= 2 ? 2 : 1);
  }else{
    target = now + (now < 4 ? 1 : 0);
  }
  target = clampNum(Math.max(Math.round(target), now + 3), 1, cap);
  if(p.goal !== 'Набор') target = Math.max(now, target);
  const step90 = a.goalAggressive ? 0 : 1;
  const step180 = target >= now + 2 ? 2 : 1;
  const step365 = target >= now + 3 ? 3 : step180;
  return {
    now,
    d90: clampNum(now + step90, 1, cap),
    d180: clampNum(now + step180, 1, cap),
    d365: clampNum(now + step365, 1, cap)
  };
}

function renderForecastFigureInto(wrap, p, stage, label, level){
  if(!wrap) return;
  const g = p.gender === 'Женщина' ? 'f' : 'm';
  const safeStage = clampNum(Math.round(stage) || 1, 1, 5);
  wrap.dataset.stage = String(safeStage);
  wrap.innerHTML = `<img src="assets/neutral/avatar.svg?v=fig5" alt="${escapeHtml(label)} · обезличенный прогноз формы" /><em>форма ${safeStage}/5</em>`;
  const img = wrap.querySelector('img');
  img.addEventListener('error', () => { wrap.innerHTML = humanFigure(p, level); }, { once: true });
}

function renderForecastVisuals(p, a, level){
  const stages = forecastStagePlan(p, a, level);
  [
    ['now', stages.now, 'Текущее состояние'],
    ['d90', stages.d90, 'Ориентир через 90 дней'],
    ['d180', stages.d180, 'Ориентир через 180 дней'],
    ['d365', stages.d365, 'Дальний ориентир через год']
  ].forEach(([key, stage, label]) => {
    renderForecastFigureInto(document.querySelector(`[data-forecast-visual="${key}"]`), p, stage, label, level);
  });
}

function forecastHorizonCopy(p, a){
  if(a.goalAggressive){
    return {
      d90: 'сначала режим и безопасный темп',
      d180: a.targetWeight ? `движение к ${a.targetWeight} кг без рывков` : 'стабильная база без откатов',
      d365: 'форма держится без крайностей'
    };
  }
  if(p.goal === 'Набор'){
    return {
      d90: 'силовая база и техника',
      d180: 'плотнее плечи, спина, ноги',
      d365: 'масса закреплена режимом'
    };
  }
  if(p.goal === 'Сушка'){
    return {
      d90: 'талия, вода, питание',
      d180: a.targetWeight ? `ориентир ${a.targetWeight} кг` : 'заметнее рельеф и осанка',
      d365: 'новая форма без отката'
    };
  }
  return {
    d90: 'сон, вода, тренировки',
    d180: 'форма ровнее по замерам',
    d365: 'устойчивая привычка'
  };
}

function latestMeasure(){
  const list = Array.isArray(state.measures) ? state.measures : [];
  return list.slice().reverse().find(m => m && (m.weight || m.waist || m.chest || m.hips || m.arm)) || {};
}

function paceWeeks(pace){
  const s = String(pace || '');
  if(s.includes('6')) return 6;
  if(s.includes('10')) return 10;
  return 12;
}

function bmiLabel(bmi){
  if(bmi < 18.5) return 'ниже нормы';
  if(bmi < 25) return 'норма';
  if(bmi < 30) return 'избыток';
  return 'высокий избыток';
}

function clampNum(v, min, max){ return Math.max(min, Math.min(max, v)); }

function dishImageUrl(src){
  const url = String(src || '');
  if(!url || /^(data:|https?:)/i.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${DISH_IMAGE_VER}`;
}
function dishMediaNeedsReview(dish){
  return ['needs_review', 'placeholder', 'rejected'].includes(String(dish?.mediaStatus || ''));
}
function dishMediaBlock(dish){
  return dishMediaNeedsReview(dish)
    ? `<div class="dish-hero dish-hero-missing"><b>Фото на проверке</b><span>Ориентируйся на состав и шаги рецепта.</span></div>`
    : `<div class="dish-hero" style="background-image:url('${escapeHtml(dishImageUrl(dish?.img))}')"></div>`;
}
function dishThumb(dish){
  return dishMediaNeedsReview(dish)
    ? '<span class="menu-meal-img menu-meal-img-missing">?</span>'
    : `<span class="menu-meal-img" style="background-image:url('${escapeHtml(dishImageUrl(dish?.img))}')"></span>`;
}

function bodyCheckRound(value, digits = 1){
  const n = Number(value);
  if(!Number.isFinite(n)) return null;
  const scale = Math.pow(10, digits);
  return Math.round(n * scale) / scale;
}
function bodyCheckClamp(value, min, max){
  return Math.min(max, Math.max(min, value));
}
function bodyCompositionCanonicalTimestamp(value){
  const raw = String(value == null ? '' : value).trim();
  if(!raw) return new Date().toISOString();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if(dateOnly){
    const now = new Date();
    const localToday = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    if(raw > localToday) return null;
    const parsedDate = new Date(`${raw}T12:00:00.000Z`);
    if(!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== raw) return null;
    return parsedDate.toISOString();
  }
  const parsed = new Date(raw);
  if(!Number.isFinite(parsed.getTime())) return null;
  if(parsed.getTime() > Date.now() + 5 * 60 * 1000) return null;
  return parsed.toISOString();
}
function bodyCompositionAgeDays(entry, now = Date.now()){
  const measuredAt = String(entry?.measuredAt || entry?.date || '');
  const time = Date.parse(measuredAt);
  if(!Number.isFinite(time)) return Infinity;
  return Math.max(0, Math.floor((now - time) / 86400000));
}
function bodyCompositionMaxAgeDays(entry){
  return String(entry?.source || entry?.compositionSource || '') === 'photo_estimate'
    ? BODY_ESTIMATE_MAX_AGE_DAYS
    : BODY_COMPOSITION_MAX_AGE_DAYS;
}
function bodyCompositionIsFresh(entry, now = Date.now()){
  return bodyCompositionAgeDays(entry, now) <= bodyCompositionMaxAgeDays(entry);
}
function bodyCheckPhotoEstimate(values){
  const gender = values?.gender === 'female' ? 'female' : 'male';
  const height = bodyCheckNumber(values?.height);
  const weight = bodyCheckNumber(values?.weight);
  const waist = bodyCheckNumber(values?.waist);
  const age = bodyCheckNumber(values?.age);
  const photoCount = Math.max(0, Number(values?.photoCount) || 0);
  const missing = [
    !height && 'рост',
    !weight && 'вес',
    !waist && 'талия',
    !(age >= 18 && age <= 80) && 'возраст из анкеты',
    photoCount < BODY_ESTIMATE_MIN_PHOTOS && '4 фото в полный рост'
  ].filter(Boolean);
  if(missing.length) return { ok:false, missing, gender, estimate:true, photoRequired:photoCount < BODY_ESTIMATE_MIN_PHOTOS };

  const bmi = weight / Math.pow(height / 100, 2);
  const isFemale = gender === 'female';
  // The numerical centre comes from two independent population equations.
  // The four-photo protocol is required as visual evidence and determines
  // the confidence/range; this is never presented as medical bioimpedance.
  const rfm = 64 - (20 * height / waist) + (isFemale ? 12 : 0);
  const deurenberg = 1.2 * bmi + 0.23 * age - (isFemale ? 0 : 10.8) - 5.4;
  const minPct = isFemale ? 8 : 3;
  const maxPct = isFemale ? 65 : 55;
  const bodyFatPct = bodyCheckRound(bodyCheckClamp(rfm * 0.6 + deurenberg * 0.4, minPct, maxPct), 1);
  const modelGap = Math.abs(rfm - deurenberg);
  const uncertainty = bodyCheckRound(bodyCheckClamp(4.5 + modelGap * 0.28, 5, 8), 1);
  const bodyFatLowPct = bodyCheckRound(bodyCheckClamp(bodyFatPct - uncertainty, minPct, maxPct), 1);
  const bodyFatHighPct = bodyCheckRound(bodyCheckClamp(bodyFatPct + uncertainty, minPct, maxPct), 1);
  const fatMassKg = bodyCheckRound(weight * bodyFatPct / 100, 1);
  return {
    ok:true,
    gender,
    compositionSource:'photo_estimate',
    compositionConfidence:'range-photo-protocol',
    bodyFatPct,
    bodyFatLowPct,
    bodyFatHighPct,
    fatMassKg,
    leanMassKg:bodyCheckRound(weight - fatMassKg, 1),
    compositionMeasuredAt:new Date().toISOString(),
    bmi:bodyCheckRound(bmi, 1),
    photoCount,
    uncertainty
  };
}
function bodyCheckCalculation(values){
  const gender = values?.gender === 'female' ? 'female' : 'male';
  const labels = { height:'рост', weight:'вес' };
  const required = ['height','weight'];
  const missing = required.filter(key => !bodyCheckNumber(values?.[key])).map(key => labels[key]);
  if(missing.length) return { ok:false, missing, gender };
  const weight = bodyCheckNumber(values?.weight);
  const enteredFatPct = bodyCheckNumber(values?.bodyFatPct);
  const enteredLeanMass = bodyCheckNumber(values?.leanMassKg);
  // Hidden BIA fields retain their values when a user turns the switch off.
  // The explicit switch is the consent/intent boundary: never reuse an old
  // number simply because it remains in a hidden input.
  const useBia = values?.useBia === true;
  const usePhotoEstimate = values?.usePhotoEstimate === true;
  if(useBia && usePhotoEstimate) return { ok:false, missing:[], gender, invalidMode:true };
  if(usePhotoEstimate) return bodyCheckPhotoEstimate(Object.assign({}, values, { gender }));
  if(!useBia) return { ok:true, gender, compositionSource:'photo_progress', bodyFatPct:null, fatMassKg:null, leanMassKg:null };
  if(enteredFatPct == null) return { ok:false, missing:['процент жира с биоимпеданса'], gender, composition:true };
  const compositionMeasuredAt = bodyCompositionCanonicalTimestamp(values?.compositionMeasuredAt);
  if(!compositionMeasuredAt) return { ok:false, missing:[], gender, invalidDate:true, composition:true };
  if(enteredFatPct < 1 || enteredFatPct > 75) return { ok:false, missing:[], gender, invalid:true, composition:true };
  if(enteredLeanMass != null && (enteredLeanMass < 1 || enteredLeanMass > weight + 1)) return { ok:false, missing:[], gender, invalid:true, composition:true };
  const fatMassKg = bodyCheckRound(weight * enteredFatPct / 100, 1);
  const leanMassKg = enteredLeanMass == null ? bodyCheckRound(weight - fatMassKg, 1) : bodyCheckRound(enteredLeanMass, 1);
  return { ok:true, gender, compositionSource:'manual_bia', bodyFatPct:bodyCheckRound(enteredFatPct, 1), fatMassKg, leanMassKg, compositionMeasuredAt };
}
function bodyCheckDateLabel(value){
  const raw = String(value || '');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || 'без даты';
  const [year, month, day] = raw.split('-').map(Number);
  try{ return new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'short', year:'numeric' }).format(new Date(year, month - 1, day)); }
  catch(e){ return raw; }
}
function bodyCheckPercentText(entry){
  const value = bodyCheckNumber(entry?.bodyFatPct);
  if(bodyCheckCompositionSource(entry) === 'legacy_estimate') return 'архив';
  if(bodyCheckHasPhotoEstimate(entry)){
    const low = bodyCheckNumber(entry.bodyFatLowPct);
    const high = bodyCheckNumber(entry.bodyFatHighPct);
    return low != null && high != null ? `≈ ${Math.round(low)}–${Math.round(high)}%` : `≈ ${value.toFixed(1)}%`;
  }
  return bodyCheckHasActualComposition(entry) && value != null ? `${value.toFixed(1)}%` : 'без %';
}

function bodyCheckPlanSnapshot(entry){
  if(!entry || typeof entry !== 'object') return null;
  const source = bodyCheckCompositionSource(entry);
  const isManualBia = bodyCheckHasActualComposition(entry);
  const isPhotoEstimate = bodyCheckHasPhotoEstimate(entry);
  if(!isManualBia && !isPhotoEstimate) return null;
  const bodyFatPct = bodyCheckNumber(entry.bodyFatPct);
  const weight = bodyCheckNumber(entry.weight);
  if(bodyFatPct == null || weight == null) return null;
  return {
    date:String(entry.date || ''), measuredAt:String(entry.compositionMeasuredAt || entry.measuredAt || ''),
    bodyFatPct,
    bodyFatLowPct:bodyCheckNumber(entry.bodyFatLowPct),
    bodyFatHighPct:bodyCheckNumber(entry.bodyFatHighPct),
    weight,
    waist:bodyCheckNumber(entry.waist),
    fatMassKg:bodyCheckNumber(entry.fatMassKg),
    leanMassKg:bodyCheckNumber(entry.leanMassKg),
    source,
    sourceLabel:bodyCheckCompositionLabel(entry),
    confidence:String(entry.compositionConfidence || (isPhotoEstimate ? 'range-photo-protocol' : 'measured')),
    formulaVersion:String(entry.formulaVersion || (isPhotoEstimate ? BODY_CHECK_PHOTO_ESTIMATE_VERSION : BODY_CHECK_MANUAL_BIA_VERSION))
  };
}

function appleHealthBodyCompositionSnapshot(entry){
  if(!entry || typeof entry !== 'object') return null;
  const bodyFatPct = bodyCheckNumber(entry.bodyFatPct);
  if(bodyFatPct == null || bodyFatPct < 1 || bodyFatPct > 75) return null;
  const measuredAt = String(entry.recordedAt || entry.measuredAt || '');
  if(!measuredAt) return null;
  const weight = bodyCheckNumber(entry.bodyMassKg);
  const fatMassKg = bodyCheckNumber(entry.fatMassKg) ?? (weight == null ? null : bodyCheckRound(weight * bodyFatPct / 100, 1));
  const leanMassKg = bodyCheckNumber(entry.leanMassKg) ?? (weight == null || fatMassKg == null ? null : bodyCheckRound(weight - fatMassKg, 1));
  return {
    date:measuredAt.slice(0, 10), measuredAt, bodyFatPct, weight,
    waist:null, fatMassKg, leanMassKg,
    source:'apple_health', sourceLabel:String(entry.sourceLabel || 'Передано через Форма Sync')
  };
}

function latestBodyComposition(options){
  const manual = (Array.isArray(state.bodyChecks) ? state.bodyChecks : []).map(bodyCheckPlanSnapshot).filter(Boolean);
  const health = (Array.isArray(appleHealthRemote?.bodyComposition) ? appleHealthRemote.bodyComposition : []).map(appleHealthBodyCompositionSnapshot).filter(Boolean);
  const latest = manual.concat(health).sort((a,b) => {
    const time = String(a.measuredAt || a.date || '').localeCompare(String(b.measuredAt || b.date || ''));
    return time || String(a.source || '').localeCompare(String(b.source || ''));
  }).pop() || null;
  return options?.includeStale === true || bodyCompositionIsFresh(latest) ? latest : null;
}

function bodyCompositionDateLabel(entry){
  return bodyCheckDateLabel(String(entry?.date || entry?.measuredAt || '').slice(0, 10));
}

function bodyCompositionSourceLabel(entry){
  if(entry?.source === 'apple_health') return String(entry.sourceLabel || 'Передано через Форма Sync');
  if(entry?.source === 'manual_bia') return String(entry.sourceLabel || 'Результат биоимпеданса');
  if(entry?.source === 'photo_estimate') return String(entry.sourceLabel || 'Оценка по фото и замерам');
  return 'нет подтверждённого источника';
}
function bodyCompositionPercentText(entry, options){
  const value = bodyCheckNumber(entry?.bodyFatPct);
  if(value == null) return '—';
  if(entry?.source === 'photo_estimate'){
    const low = bodyCheckNumber(entry?.bodyFatLowPct);
    const high = bodyCheckNumber(entry?.bodyFatHighPct);
    if(low != null && high != null) return `${Math.round(low)}–${Math.round(high)}%`;
    return `≈ ${Math.round(value)}%`;
  }
  return `${value.toFixed(options?.precision === 0 ? 0 : 1)}%`;
}

function bodyCheckRecommendationSignature(p){
  const check = p?.bodyCheck;
  if(!check) return 'base';
  return [
    check.source || '', check.measuredAt || check.date || '',
    bodyCheckNumber(check.bodyFatPct) ?? '',
    bodyCheckNumber(check.waist) ?? '',
    p?.goal || '',
    p?.gender || '',
    p?.mode || '',
    p?.level || ''
  ].join(':');
}

// A measured BIA result may tune the plan. A photo-and-measurement estimate is
// deliberately weaker: it only softens defaults and can never create an
// aggressive deficit, surplus, or medical conclusion.
function bodyCompositionStrategy(p){
  const check = p?.bodyCheck;
  const fatPct = bodyCheckNumber(check?.bodyFatPct);
  const height = bodyCheckNumber(p?.height);
  const waist = bodyCheckNumber(check?.waist);
  const source = String(check?.source || '');
  const isMeasuredSource = ['manual_bia','apple_health'].includes(source);
  const isPhotoEstimate = source === 'photo_estimate';
  if(fatPct == null || !height || (!isMeasuredSource && !isPhotoEstimate)){
    return { applied:false, mode:'base', title:'по анкете', short:'Добавь 4 фото и замеры для ориентира или внеси результат биоимпеданса.' };
  }

  const female = String(p?.gender || '').toLowerCase().includes('жен');
  const waistRatio = waist ? bodyCheckRound(waist / height, 2) : null;
  const highFatThreshold = female ? 34 : 25;
  const lowerFatThreshold = female ? 20 : 10;
  const highSignal = fatPct >= highFatThreshold || (waistRatio != null && waistRatio >= 0.5);
  const lowerSignal = fatPct <= lowerFatThreshold;
  const goal = String(p?.goal || 'Поддержание');
  const base = {
    applied:true,
    mode:'balanced',
    bodyFatPct:fatPct,
    waistRatio,
    highSignal,
    lowerSignal,
    kcalFactor:1,
    kcalFloorFactor:0,
    proteinPerKg:null,
    fatPerKg:null,
    trainingSetCap:null,
    title:'умеренный темп',
    short:`Учитываем состав тела из источника «${bodyCompositionSourceLabel(check)}».`,
    nutritionNote:'КБЖУ подстроены по цели, активности и последнему подтверждённому показанию состава тела.',
    trainingNote:'Сохраняем технику, регулярность и запас повторов.',
    focus:'режим + удержание формы'
  };

  if(isPhotoEstimate){
    const range = bodyCompositionPercentText(check, { precision:0 });
    const goalFactors = goal === 'Сушка'
      ? { kcalFactor:0.86, kcalFloorFactor:0.84, proteinPerKg:2.0, fatPerKg:0.95 }
      : goal === 'Набор'
        ? { kcalFactor:1.04, kcalFloorFactor:1.00, proteinPerKg:1.9, fatPerKg:1.0 }
        : { kcalFactor:0.98, kcalFloorFactor:0.96, proteinPerKg:1.9, fatPerKg:1.0 };
    return Object.assign(base, goalFactors, {
      mode:'photo-estimate',
      estimated:true,
      title:'мягкая адаптация',
      short:`Ориентир ${range} по фото и замерам: без жёстких решений по одной оценке.`,
      nutritionNote:'КБЖУ сдвинуты только в безопасную сторону. Подтверди цифру умными весами или биоимпедансом для более точной настройки.',
      trainingNote:'Нагрузку не усиливаем по оценке: техника, сон и постепенная прогрессия остаются приоритетом.',
      focus:'режим + проверка динамики'
    });
  }

  if(goal === 'Сушка'){
    if(lowerSignal){
      return Object.assign(base, {
        mode:'recovery', kcalFactor:0.92, kcalFloorFactor:0.90, proteinPerKg:2.0, fatPerKg:1.0, trainingSetCap:3,
        title:'бережём восстановление',
        short:'Не усиливаем дефицит по текущему показанию состава тела.',
        nutritionNote:'Дефицит смягчён: не режем калории глубже по данным состава тела.',
        trainingNote:'Без дополнительного объёма и отказа: сейчас важнее восстановление и техника.',
        focus:'сохранение энергии + техника'
      });
    }
    if(highSignal){
      return Object.assign(base, {
        mode:'waist-focus', kcalFactor:0.84, kcalFloorFactor:0.80, proteinPerKg:2.1, fatPerKg:0.9, trainingSetCap:4,
        title:'контроль талии и регулярности',
        short:'Мягкий дефицит, белок и повседневная активность.',
        nutritionNote:'Держим мягкий дефицит, белок и регулярные шаги без жёстких ограничений.',
        trainingNote:'Силовую базу сохраняем, объём не повышаем скачком; добавь спокойную ходьбу.',
        focus:'талия + дефицит без срыва'
      });
    }
    return Object.assign(base, {
      mode:'cut-balanced', kcalFactor:0.86, kcalFloorFactor:0.82, proteinPerKg:2.1, fatPerKg:0.9,
      title:'умеренный дефицит',
      short:'Дефицит без попытки ускорить результат любой ценой.',
      nutritionNote:'КБЖУ держат умеренный дефицит и белок для сохранения силовых результатов.',
      trainingNote:'Обычная силовая база плюс восстановление между тренировками.',
      focus:'плавное снижение + силовая база'
    });
  }

  if(goal === 'Набор'){
    if(highSignal){
      return Object.assign(base, {
        mode:'recomposition', kcalFactor:1.00, kcalFloorFactor:0.98, proteinPerKg:2.0, fatPerKg:1.0, trainingSetCap:4,
        title:'рекомпозиция без профицита',
        short:'Сначала сила и регулярность, затем решаем вопрос профицита.',
        nutritionNote:'Профицит пока не добавляем: держим питание около поддержки и следим за талией.',
        trainingNote:'Растим силовые постепенно, без лишнего тренировочного объёма.',
        focus:'мышцы + силовая прогрессия без профицита'
      });
    }
    if(lowerSignal){
      return Object.assign(base, {
        mode:'gain-supported', kcalFactor:1.12, kcalFloorFactor:1.06, proteinPerKg:2.0, fatPerKg:1.0,
        title:'бережный профицит',
        short:'Небольшой профицит и силовая прогрессия.',
        nutritionNote:'КБЖУ держат небольшой профицит без резкого набора.',
        trainingNote:'Можно постепенно прибавлять рабочий вес, сохраняя технику.',
        focus:'мышцы + силовая прогрессия'
      });
    }
    return Object.assign(base, {
      mode:'gain-balanced', kcalFactor:1.06, kcalFloorFactor:1.02, proteinPerKg:2.0, fatPerKg:1.0,
      title:'контролируемый набор',
      short:'Небольшой профицит с контролем талии.',
      nutritionNote:'Профицит умеренный, замеры помогают не терять контроль динамики.',
      trainingNote:'Силовая прогрессия важнее лишних подходов.',
      focus:'мышцы + контроль талии'
    });
  }

  if(highSignal){
    return Object.assign(base, {
      mode:'maintenance-waist', kcalFactor:0.95, kcalFloorFactor:0.93, proteinPerKg:2.0, fatPerKg:0.95,
      title:'мягкий фокус на талии',
      short:'Поддержание без резких качелей, с небольшой коррекцией.',
      nutritionNote:'Небольшая корректировка калорий и белок, без строгой диеты.',
      trainingNote:'Держим силовую базу и добавляем больше обычной ходьбы.',
      focus:'режим + контроль талии'
    });
  }
  if(lowerSignal){
    return Object.assign(base, {
      mode:'maintenance-energy', kcalFactor:1.00, kcalFloorFactor:0.98, proteinPerKg:1.9, fatPerKg:1.0,
      title:'поддерживаем энергию',
      short:'Не создаём дефицит без необходимости.',
      nutritionNote:'Калории остаются около поддержки, чтобы не просаживать восстановление.',
      trainingNote:'Обычный план с приоритетом сна, техники и восстановления.',
      focus:'режим + удержание формы'
    });
  }
  return base;
}

function bodyAssessment(p){
  p = p || planFromProfile();
  const m = latestMeasure();
  const bodyCheck = latestBodyCheck();
  const compositionData = p.bodyCheck || latestBodyComposition();
  const weight = Number(compositionData?.weight || bodyCheck?.weight || m.weight || p.weight) || 80;
  const height = Number(p.height) || 178;
  const bmi = weight / Math.pow(height / 100, 2);
  const fatPct = bodyCheckNumber(compositionData?.bodyFatPct);
  const fatMass = fatPct == null ? null : (bodyCheckNumber(compositionData?.fatMassKg) ?? bodyCheckRound(weight * fatPct / 100, 1));
  const leanMass = fatMass == null ? null : (bodyCheckNumber(compositionData?.leanMassKg) ?? bodyCheckRound(Math.max(0, weight - fatMass), 1));
  const targetWeight = Number(p.targetWeight) || 0;
  const delta = targetWeight ? +(targetWeight - weight).toFixed(1) : 0;
  const weeks = paceWeeks(p.pace);
  const weeklyRate = targetWeight ? +(Math.abs(delta) / weeks).toFixed(1) : 0;
  const goalAggressive = weeklyRate > 0.9 || (p.goal === 'Сушка' && weeklyRate > 0.75);
  const waist = Number(bodyCheck?.waist || m.waist) || 0;
  const waistRatio = waist && height ? +(waist / height).toFixed(2) : 0;
  const waistLabel = !waistRatio ? 'нет замера' : waistRatio >= 0.6 ? 'высокий риск' : waistRatio >= 0.5 ? 'контроль талии' : 'в норме';
  const waterTarget = waterTargetLiters({ weight });
  const strategy = bodyCompositionStrategy(p);
  const risk = bmi >= 30 || waistRatio >= 0.6 ? 'красная зона'
    : bmi >= 25 || waistRatio >= 0.5 || strategy.highSignal || goalAggressive ? 'контроль'
    : 'рабочий план';
  const focus = strategy.applied ? strategy.focus : (p.goal === 'Набор' ? 'мышцы + силовая прогрессия'
    : p.goal === 'Сушка' ? 'талия + дефицит без срыва'
    : 'режим + удержание формы');
  return { weight, height, bmi, fatPct, fatMass, leanMass, bodyCheck, compositionData, targetWeight, delta, weeks, weeklyRate, goalAggressive, waist, waistRatio, waistLabel, waterTarget, risk, focus, strategy };
}

function metricCard(label, value, hint, cls){
  return `<div class="analysis-metric ${cls || ''}"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b><em>${escapeHtml(hint || '')}</em></div>`;
}

function renderBodyInsights(){
  const p = planFromProfile();
  const lv = levelStatus();
  const a = bodyAssessment(p);
  const norm = computeNorm(p, state.kcalCut || 0);
  renderFigureInto($('bodyAvatarWrap'), p, lv.level);
  if($('bodyFigureAura')) $('bodyFigureAura').style.opacity = (0.42 + Math.min(1, (lv.level - 1) / 9) * 0.35).toFixed(2);

  const deltaText = a.targetWeight ? `${a.delta > 0 ? '+' : ''}${a.delta} кг` : 'без цифры';
  const tempoText = a.targetWeight ? `${a.weeklyRate} кг/нед` : 'по отчётам';
  const tempoHint = a.goalAggressive ? 'лучше смягчить темп' : `${a.weeks}+ недель, реалистично`;
  const bodyCheckWarn = a.fatPct != null && a.fatPct > (p.gender === 'Женщина' ? 34 : 25);
  const bodyCheckStrategy = a.strategy;
  const compositionValue = bodyCompositionPercentText(a.compositionData);
  const compositionHint = a.compositionData
    ? `${bodyCompositionSourceLabel(a.compositionData)} · ${bodyCompositionDateLabel(a.compositionData)}${a.compositionData.source === 'photo_estimate' ? ' · ориентир, не биоимпеданс' : ''}`
    : '4 фото + замеры / умные весы / биоимпеданс';
  if($('goalStatusPill')) $('goalStatusPill').textContent = a.goalAggressive ? 'агрессивно' : 'реалистично';
  if($('bodyRiskPill')) $('bodyRiskPill').textContent = a.risk;
  if($('bioRiskPill')) $('bioRiskPill').textContent = a.risk;
  if($('forecastPill')) $('forecastPill').textContent = `${a.weeks}+ нед`;

  if($('bodyMiniBio')){
    $('bodyMiniBio').innerHTML = [
      `<div><span>Вес сейчас</span><b>${a.weight.toFixed(1)} кг</b></div>`,
      `<div><span>BMI</span><b>${a.bmi.toFixed(1)} · ${bmiLabel(a.bmi)}</b></div>`,
      `<div><span>Цель</span><b>${escapeHtml(deltaText)}</b></div>`
    ].join('');
  }
  if($('goalMetricGrid')){
    $('goalMetricGrid').innerHTML = [
      metricCard('Цель', p.goal, a.focus, 'good'),
      metricCard('Ориентир', a.targetWeight ? `${a.targetWeight} кг` : p.target, deltaText),
      metricCard('Темп', tempoText, tempoHint, a.goalAggressive ? 'warn' : 'good'),
      metricCard('Режим', `${p.days}р/нед · ${p.sessionMinutes} мин`, p.activityLevel)
    ].join('');
  }
  if($('bodyInsightGrid')){
    $('bodyInsightGrid').innerHTML = [
      a.fatPct == null
        ? metricCard('Процент жира', 'нет показаний', 'добавь 4 фото и замеры или внеси биоимпеданс')
        : metricCard('Процент жира', compositionValue, `${a.fatMass?.toFixed(1) || '—'} кг жировой массы · ${compositionHint}`, bodyCheckWarn ? 'warn' : 'good'),
      a.leanMass == null
        ? metricCard('Состав тела', 'нет показаний', 'добавь 4 фото и замеры для ориентира; биоимпеданс точнее')
        : metricCard('Безжировая масса', `${a.leanMass.toFixed(1)} кг`, compositionHint),
      metricCard('Талия / рост', a.waistRatio ? a.waistRatio.toFixed(2) : 'нет замера', a.waistRatio ? a.waistLabel : 'сдай недельный отчёт', a.waistRatio >= 0.5 ? 'warn' : ''),
      metricCard('Вода', `${a.waterTarget.toFixed(1)} л`, `сегодня ${state.water.toFixed(1)} л`)
    ].join('');
  }
  if($('bioMapGrid')){
    $('bioMapGrid').innerHTML = [
      metricCard('Фигура', a.risk, a.focus, a.risk === 'рабочий план' ? 'good' : 'warn'),
      metricCard('КБЖУ', `${norm.kcal} ккал`, `${norm.protein} Б · ${norm.fat} Ж · ${norm.carb} У`),
      a.fatPct == null
        ? metricCard('Состав тела', 'не подключён', '4 фото + замеры, Apple Health или биоимпеданс')
        : metricCard('Состав тела', compositionValue, compositionHint, bodyCheckWarn ? 'warn' : 'good'),
      metricCard('Фокус недели', p.medicalFlags ? 'щадящий режим' : a.focus, p.medicalFlags || 'без красных флагов')
    ].join('');
  }
  if($('goalComment')){
    $('goalComment').textContent = `Цель «${p.goal}»: ${a.targetWeight ? `от ${a.weight.toFixed(1)} к ${a.targetWeight} кг` : 'без жёсткой цифры веса'}, ${p.days} тренировки/нед, питание ${norm.kcal} ккал. ${bodyCheckStrategy?.applied ? `Состав тела учтён: ${bodyCheckStrategy.short}` : (a.goalAggressive ? 'Темп лучше смягчить, чтобы не ловить откаты.' : 'Темп выглядит рабочим, если закрывать отчёты и КБЖУ.')}`;
  }
  renderForecastVisuals(p, a, lv.level);
  const forecastCopyByGoal = forecastHorizonCopy(p, a);
  if($('forecastNow')) $('forecastNow').textContent = a.fatPct == null
    ? `BMI ${a.bmi.toFixed(1)} · без данных состава тела`
    : `BMI ${a.bmi.toFixed(1)} · жир ${compositionValue}`;
  if($('forecast90')) $('forecast90').textContent = forecastCopyByGoal.d90;
  if($('forecast180')) $('forecast180').textContent = forecastCopyByGoal.d180;
  if($('forecast365')) $('forecast365').textContent = forecastCopyByGoal.d365;
  if($('forecastMetricGrid')){
    $('forecastMetricGrid').innerHTML = [
      metricCard('90 дней', a.goalAggressive ? 'стабилизация' : 'первые сдвиги', forecastCopyByGoal.d90),
      metricCard('180 дней', a.goal === 'Набор' ? 'силовая база' : 'новая талия', forecastCopyByGoal.d180),
      metricCard('365 дней', 'удержание формы', forecastCopyByGoal.d365),
      metricCard('Условие', '70%+ плана', a.goalAggressive ? 'темп цели нужно смягчить' : 'контроль по замерам')
    ].join('');
  }
  if($('forecastCopy')){
    $('forecastCopy').textContent = `Это не обещание конкретной фигуры, а визуальный ориентир по анкете: цель «${p.goal}», ${p.days} тренировки/нед по ${p.sessionMinutes} мин, питание около ${norm.kcal} ккал. Чем регулярнее отчёты по весу, талии и фото, тем точнее будет прогноз.`;
  }
  if($('bioAdvice')){
    $('bioAdvice').textContent = `Биокарта: ${a.risk}. Сейчас фокус — ${a.focus}. Норма ${norm.kcal} ккал, вода ${a.waterTarget.toFixed(1)} л. ${a.fatPct == null ? 'Процент жира появится после оценки по 4 фото и замерам, из Apple Health/умных весов или после ручного ввода биоимпеданса.' : `Последнее значение: ${compositionValue} · ${compositionHint}. ${bodyCheckStrategy?.nutritionNote || ''}`}`;
  }
}

function renderBodyCheckSummary(){
  const latest = latestBodyCheck();
  const composition = latestBodyComposition();
  const lastRecordedComposition = latestBodyComposition({ includeStale:true });
  const staleComposition = !!lastRecordedComposition && !composition;
  const shownComposition = composition || lastRecordedComposition;
  const shownMaxAge = bodyCompositionMaxAgeDays(shownComposition);
  const shownValue = bodyCompositionPercentText(shownComposition);
  const pill = $('bodyCheckStatusPill');
  const summary = $('bodyCheckSummary');
  const photosBtn = $('bodyCheckOpenPhotos');
  if(!latest && !shownComposition){
    if(pill) pill.textContent = 'не заполнен';
    if(summary) summary.innerHTML = '<div><span>Состав тела</span><b>Нет показаний</b><em>Добавь 4 фото и замеры для ориентира или внеси результат биоимпеданса.</em></div><div><span>История</span><b>0 проверок</b><em>Добавляй вес, замеры и фото раз в неделю в одинаковых условиях.</em></div>';
    if(photosBtn) photosBtn.hidden = true;
    return;
  }
  const count = bodyCheckPhotoCount(latest?.photoPaths) || Math.max(0, Number(latest?.photoCount) || 0);
  const strategy = bodyCompositionStrategy(planFromProfile());
  if(pill) pill.textContent = staleComposition ? 'обнови замер' : composition ? shownValue : 'прогресс';
  if(summary) summary.innerHTML = [
    shownComposition
      ? `<div><span>Процент жира</span><b>${escapeHtml(shownValue)}</b><em>${escapeHtml(bodyCompositionSourceLabel(shownComposition))} · ${escapeHtml(bodyCompositionDateLabel(shownComposition))}${shownComposition.source === 'photo_estimate' ? ' · ориентир' : ''}${staleComposition ? ` · старше ${shownMaxAge} дней` : ''}</em></div>`
      : '<div><span>Состав тела</span><b>Без % жира</b><em>Добавь 4 фото и замеры для ориентировочного диапазона или внеси биоимпеданс.</em></div>',
    `<div><span>Контроль</span><b>${latest?.waist ? `талия ${escapeHtml(String(latest.waist))} см` : latest ? 'замер сохранён' : 'добавь недельный замер'}</b><em>${count ? `${count}/4 приватных фото` : 'фото можно добавить в следующий раз'}</em></div>`,
    `<div class="bodycheck-summary-plan"><span>План</span><b>${escapeHtml(staleComposition ? 'по анкете' : strategy.title)}</b><em>${escapeHtml(staleComposition ? `Данные старше ${shownMaxAge} дней не влияют на рекомендации. Обнови фото и замеры либо биоимпеданс.` : strategy.short)}</em></div>`
  ].join('');
  if(photosBtn) photosBtn.hidden = !count;
}

function renderHero(){
  const p = planFromProfile();
  const lv = levelStatus();
  const game = gameStatus();
  const style = p.goal === 'Набор' ? 'силовой блок' : p.goal === 'Сушка' ? 'жиросжигающий full body' : 'поддерживающий функционал';
  const doneCount = state.tasks.filter(t => t.done).length;
  const total = state.tasks.length;

  if($('heroLevelNum')) $('heroLevelNum').textContent = `Уровень ${lv.level}`;
  if($('heroLeague')) $('heroLeague').textContent = game.current.name;
  if($('heroArchetype')) $('heroArchetype').textContent = game.archetype;
  if($('heroToday')) $('heroToday').innerHTML = `Сегодня: <b>${escapeHtml(style)}</b> · ${escapeHtml(p.place.toLowerCase())}`;
  if($('heroGoalsLine')) $('heroGoalsLine').innerHTML = `Цели дня: <b>${doneCount}</b> из ${total} закрыто`;
  if($('heroBarFill')) $('heroBarFill').style.width = `${lv.pct}%`;
  if($('heroProgressLabel')) $('heroProgressLabel').textContent = `ещё ${lv.goalsToNext} ${pluralGoals(lv.goalsToNext)} до уровня ${lv.level + 1}`;
  if($('figureBadge')) $('figureBadge').textContent = `Ур.${lv.level}`;
  renderFigure(p, lv.level);
  if($('figureAura')) $('figureAura').style.opacity = (0.3 + Math.min(1, (lv.level - 1) / 9) * 0.55).toFixed(2);

  if($('heroXp')) $('heroXp').textContent = `${state.score} баллов · ${game.current.name}`;
  if($('levelLadder')){
    const cells = [];
    for(let l = lv.level - 1; l <= lv.level + 3; l++){
      if(l < 1) continue;
      const cls = l < lv.level ? 'done' : l === lv.level ? 'cur' : 'future';
      const tag = l === lv.level ? '<b>сейчас</b>' : l === lv.level + 1 ? '<b>цель</b>' : '';
      cells.push(`<div class="lv ${cls}">${l}${tag}</div>`);
    }
    $('levelLadder').innerHTML = cells.join('');
  }
  if($('heroNext')){
    $('heroNext').innerHTML = `Осталось закрыть <b>${lv.goalsToNext} ${pluralGoals(lv.goalsToNext)}</b> (≈ ${lv.xpToNext} баллов), чтобы перейти на <b>уровень ${lv.level + 1}</b>. Персонаж качается под твои данные: ${escapeHtml(p.gender)}, ${escapeHtml(String(p.weight))} кг, ${escapeHtml(String(p.height))} см, цель «${escapeHtml(p.goal)}».`;
  }
  if($('remainingGoals')){
    const undone = state.tasks.filter(t => !t.done);
    if(!undone.length){
      $('remainingGoals').innerHTML = `<div class="all-done">Все цели дня закрыты. Завтра — новый уровень.</div>`;
    } else {
      $('remainingGoals').innerHTML = undone.slice(0, 6).map(t => `<div><span>${escapeHtml(t.text)}</span><em>+${t.xp || 10} баллов</em></div>`).join('');
    }
  }
}

function renderPlan(){
  const p = planFromProfile();
  const norm = computeNorm(p, state.kcalCut || 0);
  const style = p.goal === 'Набор' ? 'Силовой блок' : p.goal === 'Сушка' ? 'Жиросжигающий full body' : 'Поддерживающий функционал';
  if($('dailyPlanList')){
    $('dailyPlanList').innerHTML = [
      ['Тренировка', `${style} · ${p.place.toLowerCase()} · ${p.days}р/нед`],
      ['Инвентарь', p.inv],
      ['Питание', `${norm.kcal} ккал · контроль белка и воды${norm.bodyCheckApplied ? ' · BodyCheck учтён' : ''}`],
      ['BodyCheck', norm.bodyCheckApplied ? `${norm.bodyCheckTitle} · ${norm.bodyCheckNote}` : 'Добавь замеры, чтобы уточнить КБЖУ и нагрузку.'],
      ['Ограничения', p.limits],
      ['Прогноз', `${p.target}: честная оценка анатомии + сценарий 365 дней`],
      ['Отчёт дня', 'тренировка / вода / питание / самочувствие — каждый вечер'],
      ['Субботний чекпоинт', 'вес только утром + 4 фото в одинаковом ракурсе + замеры'],
      ['Фарма / пептиды', 'образовательные разделы: риски, анализы, дневник наблюдений, врач'],
      ['Рейтинг', `место #${state.rank}, топ-100 через задания и отчёты`],
      ['Навигатор', 'голос Форма объясняет, куда жать и зачем сдавать отчёты'],
      ['Telegram-клуб', 'дополнительные посты, эфиры и отчёты — не вместо приложения']
    ].map(([a,b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('');
  }
  if($('workoutTitle')) $('workoutTitle').textContent = `${style} · ${p.place.toLowerCase()}`;
  if($('planTraining')) $('planTraining').textContent = `${style} · ${p.place.toLowerCase()} · ${p.mode}`;
  renderDayWorkout();   // реальные упражнения дня из базы (вместо статичной «рыбы»)
}

function renderTasks(){
  const list = $('taskList');
  if(!list) return;
  list.innerHTML = state.tasks.map(t => {
    let action;
    if(t.done) action = '<span class="task-st done">✓ засчитано</span>';
    else if(t.kind === 'auto') action = '<span class="task-st auto">авто · по данным</span>';
    else if(t.kind === 'report') action = '<button type="button" class="task-do" data-rep="1">Открыть отчёт</button>';
    else action = `<button type="button" class="task-do" data-proof="${escapeHtml(t.key)}">Подтвердить</button>`;
    const note = t.done ? '' : t.kind === 'auto' ? 'засчитается по факту' : t.kind === 'report' ? 'через дневной отчёт' : (t.media === 'video' ? 'нужно видео' : 'нужно фото');
    return `<div class="task2 ${t.done ? 'done' : ''}"><div class="task2-b"><b>${escapeHtml(t.text)}</b><span>+${t.xp} баллов${note ? ' · ' + note : ''}</span></div>${action}</div>`;
  }).join('');
  list.querySelectorAll('[data-proof]').forEach(b => b.addEventListener('click', () => openTaskProof(b.dataset.proof)));
  list.querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => openDailyReport()));
}
// Единая точка начисления баллов за задание (идемпотентно за день) + лог пруфа в админку
function completeTask(key, opts){
  const t = state.tasks.find(x => x.key === key);
  if(!t || t.done) return false;
  t.done = true;
  state.score = Math.max(0, state.score + (t.xp || 10));
  state.rank = Math.max(1, state.rank - 3);
  if(key === 'workout'){ state.streak += 1; state.access += 1; }
  if(key === 'technique') state.access += 1;
  save();
  track('task_done', 'rewards', Object.assign({ key, xp: t.xp }, opts || {}));
  renderTasks(); renderPlan(); renderMetrics();
  toast(`+${t.xp} баллов: ${t.text}`);
  return true;
}
function ensureDailyReportToday(){
  const today = todayKey();
  if(!state.dailyReport || state.dailyReport.date !== today){
    state.dailyReport = { date: today, training:false, water:false, food:false, sleep:false, claimed:false, waterRewarded:false };
  }
  return state.dailyReport;
}
function workoutCompletionVerified(items, completedSourceIndexes){
  if(!Array.isArray(items) || !items.length || !Array.isArray(completedSourceIndexes)) return false;
  const completed = new Set(completedSourceIndexes.filter(Number.isInteger));
  return items.every((item, index) => completed.has(Number.isInteger(item?.sourceIndex) ? item.sourceIndex : index));
}
function markDayWorkoutComplete(source, items, completedSourceIndexes, options){
  const completionOptions = options || {};
  if(source !== 'player' || !workoutCompletionVerified(items, completedSourceIndexes)){
    try{ track('workout_completion_rejected', 'training', { source: source || 'unknown' }); }catch(e){}
    return false;
  }
  state.dayGuidePassed = true;
  ensureDailyReportToday().training = true;
  const fallbackTitle = typeof currentWorkoutTitle === 'function' ? currentWorkoutTitle() : 'Тренировка дня';
  const workoutTitle = String(completionOptions.workoutTitle || fallbackTitle);
  const awarded = completeTask('workout', { source: completionOptions.activitySource || source || 'training' });
  if(!awarded){
    save();
    renderTasks();
    renderPlan();
    renderMetrics();
  }
  if(typeof pbUpsertDailyActivitySnapshot === 'function'){
    pbUpsertDailyActivitySnapshot({
      workoutCompleted: true,
      workoutTitle,
      reportFlags: Object.assign({}, ensureDailyReportToday())
    }).then(() => renderSelectedDayActivity());
  }
  return awarded;
}
// Авто-зачёт объективных заданий по реальным данным (нельзя накликать)
function syncAutoTasks(){
  if(!Array.isArray(state.tasks)) return false;
  let norm; try{ norm = computeNorm(planFromProfile(), state.kcalCut || 0); }catch(e){ return false; }
  const today = todayKey();
  const cond = {
    water: (state.water || 0) >= waterTargetLiters(planFromProfile()),
    kbju: nutritionTotals().kcal >= norm.kcal * 0.8,
    report: state.dailyReport && state.dailyReport.date === today && !!state.dailyReport.claimed
  };
  let awarded = false;
  state.tasks.forEach(t => {
    if(t.done) return;
    if((t.kind === 'auto' || t.kind === 'report') && cond[t.key]){
      t.done = true; state.score = Math.max(0, state.score + (t.xp || 10));
      if(t.key === 'workout'){ state.streak += 1; state.access += 1; ensureDailyReportToday().training = true; }
      awarded = true;
      try{ track('task_auto', 'rewards', { key: t.key, xp: t.xp }); }catch(e){}
    }
  });
  if(awarded){ save(); renderTasks(); }
  return awarded;
}
// Сжатие пруфа: фото или кадр из видео → маленький JPEG (≈720px, q0.5)
function pbCompressImage(file, maxDim, quality = .5){
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img')); };
    img.src = url;
  });
}
function pbCaptureVideoFrame(file, maxDim){
  return new Promise((resolve, reject) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true;
    const url = URL.createObjectURL(file);
    v.onloadeddata = () => { try{ v.currentTime = Math.min(1.5, (v.duration || 3) / 3); }catch(e){} };
    v.onseeked = () => {
      const vw = v.videoWidth || maxDim, vh = v.videoHeight || maxDim;
      const s = Math.min(1, maxDim / Math.max(vw, vh));
      const w = Math.max(1, Math.round(vw * s)), h = Math.max(1, Math.round(vh * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(v, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', 0.5);
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('video')); };
    v.src = url;
  });
}
async function pbUploadProof(file, media, key){
  if(!sb || !file) return null;
  const context = pbCaptureMediaContext();
  const owner = context.owner, epoch = context.epoch;
  if(!owner) return null;
  const resetStatus = await pbApplyRemoteProgressReset();
  if(resetStatus !== 'current' || !context.isCurrent()) return null;
  let blob; try{ blob = media === 'video' ? await pbCaptureVideoFrame(file, 720) : await pbCompressImage(file, 720); }catch(e){ return null; }
  if(!context.isCurrent()) return null;
  const path = `${owner}/${key}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  try{ const scope = await pbCreateMediaScope(context); const { error } = await scope.client.storage.from('proofs').upload(path, blob, { contentType: 'image/jpeg', upsert: false }); if(error) return null; }catch(e){ return null; }
  return context.isCurrent() ? path : null;
}
// Пруф-лист для ручных заданий: фото/видео + заметка → баллы только после вложения
function pbStartProofUi(){
  if(!window.WLProofActions || !window.WLProofUi || !sb || !pbUser || !pbProgressEpochReady) return;
  const owner = pbUser.id, epoch = pbProgressEpochId;
  const isCurrent = () => {
    if(pbUser?.id !== owner || pbProgressEpochId !== epoch || pbProgressResetting || window.WLDevicePrivacy?.isPending(owner) || window.WLDevicePrivacy?.isProofEpochRetired(owner, epoch)) return false;
    try{ return (JSON.parse(WLStorage.getItem(PB_PROGRESS_RESET_ACK_PREFIX + owner) || 'null')?.reset_id || null) === epoch; }
    catch(e){ return false; }
  };
  const transport = window.WLProofActions.createTransport({ sb, url:SB_URL, publicKey:SB_ANON, owner, isCurrent });
  const actions = window.WLProofActions.create({ repository:window.WLProofActions.createRepository(), transport, owner, epoch, isCurrent });
  if(pbProofUi) pbProofUi.cleanup();
  pbProofUi = window.WLProofUi.create({
    actions, transport, owner, epoch, isCurrent, taskByKey:key => state.tasks.find(task => task.key === key),
    today:todayKey, openSheet, sheetRoot:() => $('appSheet'), compressPhoto:file => pbCompressImage(file, 1280, .75),
    onChange:renderTasks, openLegacy:() => toast('Обновите базу платформы: обработчик подтверждений недоступен.'),
    onStored:proof => {
      if(!isCurrent()) return false;
      if(proof.local_day !== todayKey()) return true;
      completeTask(proof.task_key, { proof:{ id:proof.id, path:proof.storage_path, stored:true } });
      save();
      try{ return JSON.parse(WLStorage.getItem('primeBodyMobileTasks2') || '[]').some(task => task.key === proof.task_key && task.done); }
      catch(e){ return false; }
    }
  });
  Promise.resolve(pbProofUi.refresh()).catch(() => {});
}
async function openTaskProof(key){
  if(!pbProofUi) pbStartProofUi();
  if(!pbProofUi){ toast('Не удалось подготовить отправку. Проверьте вход и повторите попытку.'); return; }
  await pbProofUi.open(key);
}

function renderMetrics(){
  rolloverCheck();
  syncAutoTasks();   // авто-зачёт объективных заданий по реальным данным
  const waterTarget = waterTargetLiters(planFromProfile());
  const done = state.tasks.filter(t => t.done).length;
  if($('scoreMetric')) $('scoreMetric').textContent = state.score;
  if($('streakDays')) $('streakDays').textContent = state.streak;
  if($('accessDays')) $('accessDays').textContent = `${state.access}д`;
  const game = gameStatus();
  if($('rankMetric')) $('rankMetric').textContent = `#${state.rank}`;
  if($('leagueMetric')) $('leagueMetric').textContent = game.current.name;
  if($('rankPill')) $('rankPill').textContent = `#${state.rank}`;
  if($('leagueName')) $('leagueName').textContent = game.current.name;
  if($('statusName')) $('statusName').textContent = game.archetype;
  if($('nextMilestone')) $('nextMilestone').textContent = game.next ? `до статуса ${game.next.name}: ${game.xpToNext} баллов` : 'максимальный статус сезона';
  if($('myXpInline')) $('myXpInline').textContent = `${state.score} баллов`;
  if($('myXpInlineBoard')) $('myXpInlineBoard').textContent = `${state.score} баллов`;
  if($('myRankInline')) $('myRankInline').textContent = state.rank;
  if($('rankStory')) $('rankStory').textContent = `Сегодня ты на ${state.rank} месте · статус ${game.current.name}`;
  if($('rankNextStep')) $('rankNextStep').textContent = state.rank > 100 ? 'До топ-100: закрыть отчёт, воду, тренировку и недельную цель.' : 'Ты внутри топ-100: удерживай отчёты и забирай сезонные призы.';
  if($('leaderHint')) $('leaderHint').textContent = state.rank > 100 ? `ещё ${Math.max(80, (state.rank - 100) * 8)} баллов до топ-100` : 'удержи место до воскресенья';
  if($('gameProgress')) $('gameProgress').value = game.progress;
  if($('waterLiters')) $('waterLiters').textContent = `${state.water.toFixed(1)} л`;
  if($('waterMetric')) $('waterMetric').textContent = `${state.water.toFixed(1)}/${waterTarget.toFixed(1)}`;
  const waterPct = Math.min(100, Math.round(state.water / waterTarget * 100));
  if($('waterRing')) $('waterRing').style.setProperty('--filled', waterPct);
  if($('waterRingVal')) $('waterRingVal').textContent = state.water.toFixed(1);
  if($('waterDone')) $('waterDone').textContent = state.water.toFixed(1);
  if($('waterTargetInline')) $('waterTargetInline').textContent = waterTarget.toFixed(1);
  if($('waterSub')){ const rem = Math.max(0, Math.round((waterTarget - state.water) * 10) / 10); $('waterSub').textContent = rem > 0 ? `осталось ${rem.toFixed(1)} л` : 'норма выполнена'; }
  state.kcal = computeNorm(planFromProfile(), state.kcalCut || 0).kcal;
  if($('kcal')) $('kcal').textContent = state.kcal;
  renderTodayDashboard();
  if($('avatarBody')) $('avatarBody').style.transform = `scale(${Math.min(1.12, 0.94 + done * 0.04)}) translateY(${done ? -4 : 0}px)`;
  renderHero();
  renderNutrition();
  renderBodyInsights();
  renderBodyCheckSummary();
  renderWeeklyInsight();
}

function renderTodayDashboard(){
  pbRenderSubscriptionNotice();
  const norm = computeNorm(planFromProfile(), state.kcalCut || 0);
  const readiness = primeDayAssessment();
  const today = dayKey(0);
  const todayNutrition = nutritionRecordDraftForDate(today);
  const eaten = nutritionTotalsFor(todayNutrition.items);
  const waterToday = Math.max(0, Number(todayNutrition.water) || 0);
  const kcalLeft = Math.max(0, Math.round(norm.kcal - eaten.kcal));
  const pLeft = Math.max(0, Math.round(norm.protein - eaten.p));
  const fLeft = Math.max(0, Math.round(norm.fat - eaten.f));
  const cLeft = Math.max(0, Math.round(norm.carb - eaten.c));
  const waterTarget = waterTargetLiters(planFromProfile());
  const waterLeft = Math.max(0, Math.round((waterTarget - waterToday) * 10) / 10);
  const report = ensureDailyReportToday();
  const activity = dailyActivityForDate(today);
  const workoutDone = !!activity?.workoutCompleted || !!(state.tasks || []).find(t => t.key === 'workout' && t.done);
  const dailyResult = dailyResultForDate(dayKey(0));

  if($('todayKcalLeft')) $('todayKcalLeft').textContent = kcalLeft ? `${kcalLeft} ккал` : 'норма';
  if($('todayKcalSub')) $('todayKcalSub').textContent = `${Math.round(eaten.kcal)} / ${norm.kcal} ккал`;
  if($('todayMacrosLeft')) $('todayMacrosLeft').textContent = `Б ${pLeft} · Ж ${fLeft} · У ${cLeft}`;
  if($('todayWaterLeft')) $('todayWaterLeft').textContent = waterLeft ? `${waterLeft.toFixed(1)} л` : 'готово';
  if($('todayWaterSub')) $('todayWaterSub').textContent = `${waterToday.toFixed(1)} / ${waterTarget.toFixed(1)} л`;
  if($('todayWorkoutStatus')) $('todayWorkoutStatus').textContent = workoutDone ? 'готово' : 'ждёт';
  if($('todayWorkoutSub')) $('todayWorkoutSub').textContent = workoutDone ? 'засчитано в целях дня' : 'открой тренировку дня';
  if($('dailyResultEaten')) $('dailyResultEaten').textContent = `${dailyResult.intakeKcal} ккал`;
  if($('dailyResultWorkout')) $('dailyResultWorkout').textContent = dailyResult.workoutCompleted ? 'Выполнена' : 'Не выполнена';
  if($('dailyResultStatus')) $('dailyResultStatus').textContent = dailyResult.foodStatus;
  if($('dailyResultBalance')){
    $('dailyResultBalance').textContent = dailyResult.intakeKcal <= 0 && dailyResult.activeEnergyKcal !== null
      ? `Активная энергия: ${dailyResult.activeEnergyKcal} ккал. Добавь питание, чтобы увидеть баланс дня.`
      : dailyResult.afterActivityKcal === null
      ? `Норма питания ${dailyResult.targetKcal} ккал. Активность появится после синхронизации Apple Health.`
      : `Еда минус активная энергия: ${dailyResult.afterActivityKcal} ккал. Норма питания остаётся ${dailyResult.targetKcal} ккал.`;
  }

  const profileReady = !!String(state.profile?.name || '').trim();
  const activeResume = currentWorkoutResume();
  const reportFlags = activity?.reportFlags || report;
  const reportDone = !!(reportFlags.training && reportFlags.water && reportFlags.food && reportFlags.sleep);
  let next = !profileReady
    ? { title:'Завершить настройку', text:`Продолжи анкету с шага ${anketaStep} из ${ANKETA_STEPS}.`, jump:'onboarding', cta:'Продолжить' }
    : activeResume
    ? { title:'Продолжить тренировку', text:workoutResumeProgressText(activeResume), jump:'training', cta:'Продолжить' }
    : readiness.mode === 'recovery' && !workoutDone
    ? { title:'Выбрать восстановление', text:'Самочувствие важнее плана: сегодня без силовой нагрузки.', jump:'health', cta:'Восстановление' }
    : { title:currentWorkoutTitle() || 'Тренировка дня', text:`${state.profile?.sessionMinutes || 40} минут · программа по твоей анкете.`, jump:'training', cta:'Начать' };
  if(profileReady && !activeResume && workoutDone){
    if(reportDone) next = { title:'День завершён', text:'Тренировка и дневной отчёт сохранены.', jump:'reports', cta:'Итог' };
    else if(eaten.kcal < norm.kcal * 0.55) next = { title:'Добавить питание', text:'Зафиксируй приём пищи, чтобы увидеть остаток на день.', jump:'nutrition', cta:'Добавить' };
    else if(waterLeft > 0) next = { title:'Добрать воду', text:`Осталось ${waterLeft.toFixed(1)} л до дневной нормы.`, jump:'nutrition', cta:'+ вода' };
    else next = { title:'Завершить день', text:'Отметь самочувствие и зафиксируй результат.', jump:'reports', cta:'Отчёт' };
  }
  if($('todayNextTitle')) $('todayNextTitle').textContent = next.title;
  if($('todayNextText')) $('todayNextText').textContent = next.text;
  if($('todayNextCta')){
    $('todayNextCta').dataset.jump = next.jump;
    $('todayNextCta').textContent = next.cta;
    $('todayNextCta').dataset.action = next.title;
  }
  if($('simpleDayDate')) $('simpleDayDate').textContent = new Intl.DateTimeFormat('ru-RU', { weekday:'long', day:'numeric', month:'long' }).format(new Date());
  if($('simpleDaySummary')) $('simpleDaySummary').textContent = workoutDone
    ? `Тренировка готова. Питание ${Math.round(eaten.kcal)} из ${norm.kcal} ккал, вода ${waterToday.toFixed(1)} из ${waterTarget.toFixed(1)} л.`
    : 'Тренировка, питание и вода собраны по твоей анкете.';
  if(pbSimpleUi()){
    const shownKey = `${todayKey()}:${next.title}`;
    if(sb && pbUser && renderTodayDashboard._shown !== shownKey){
      renderTodayDashboard._shown = shownKey;
      track('primary_action_shown', 'today', { action:next.title, destination:next.jump });
    }
  }
  renderPrimeDay();
  renderPrimeChallenge();
  renderPhotoHome({ norm, eaten, profileReady, activeResume, workoutDone, readiness });
}

// Кольцо калорий: съедено / осталось. Считается из отмеченных приёмов пищи.
// Норма КБЖУ из анкеты: BMR (Mifflin-St Jeor) × активность × цель.
function computeNorm(p, cut){
  p = p || {};
  const w = parseFloat(p.weight) || 82, h = parseFloat(p.height) || 178;
  const age = Math.min(90, Math.max(14, parseInt(p.age, 10) || 30));
  const female = p.gender === 'Женщина';
  const bmr = 10 * w + 6.25 * h - 5 * age + (female ? -161 : 5);
  const baseAct = {
    'Низкая': 1.2,
    'Умеренная': 1.32,
    'Высокая': 1.48,
    'Очень высокая': 1.62,
    'Сидячий день': 1.2,
    'Мало хожу': 1.32,
    'Много на ногах': 1.48,
    'Физическая работа': 1.62
  }[normalizeActivityLevel(p.activityLevel)] || 1.32;
  const workoutLift = ({ 2: 0.08, 3: 0.13, 4: 0.18, 5: 0.24 })[String(parseInt(p.days, 10))] || 0.13;
  const act = Math.min(1.78, baseAct + workoutLift);
  const tdee = bmr * act;
  const bodyStrategy = p.bodyCheck ? bodyCompositionStrategy(p) : null;
  let base, pPerKg, fPerKg;
  if(p.goal === 'Сушка'){ base = tdee * 0.80; pPerKg = 2.2; fPerKg = 0.9; }
  else if(p.goal === 'Набор'){ base = tdee * 1.12; pPerKg = 2.0; fPerKg = 1.0; }
  else { base = tdee; pPerKg = 1.9; fPerKg = 1.0; }
  if(bodyStrategy?.applied){
    base = tdee * bodyStrategy.kcalFactor;
    pPerKg = bodyStrategy.proteinPerKg || pPerKg;
    fPerKg = bodyStrategy.fatPerKg || fPerKg;
  }
  const adjustmentKcal = Math.min(300, Math.max(0, Number(cut) || 0) * 100);
  // For a cutting goal the selected adaptation is the total deficit from TDEE.
  // Applying it on top of the goal coefficient can double the deficit and pin
  // otherwise normal profiles to the generic 1200 kcal floor.
  const adjustedBase = p.goal === 'Сушка' && adjustmentKcal > 0
    ? tdee - adjustmentKcal
    : base - adjustmentKcal;
  const requestedKcal = Math.round(adjustedBase / 10) * 10;
  const bodyCheckFloor = bodyStrategy?.kcalFloorFactor
    ? Math.round((tdee * bodyStrategy.kcalFloorFactor) / 10) * 10
    : 0;
  const kcal = Math.max(1200, bodyCheckFloor, requestedKcal);
  const protein = Math.round(w * pPerKg);
  const fat = Math.max(female ? 40 : 45, Math.round(w * fPerKg));
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    kcal, protein, fat, carb, bmr: Math.round(bmr), tdee: Math.round(tdee),
    bodyCheckApplied:!!bodyStrategy?.applied,
    bodyCheckTitle:bodyStrategy?.title || '',
    bodyCheckNote:bodyStrategy?.nutritionNote || '',
    bodyCheckTrainingNote:bodyStrategy?.trainingNote || '',
    bodyCheckCutLimited:bodyCheckFloor > 0 && requestedKcal < bodyCheckFloor
  };
}

function nutritionTotalsFor(items){
  return (Array.isArray(items) ? items : []).reduce((a, x) => ({ kcal: a.kcal + (+x.kcal || 0), p: a.p + (+x.p || 0), f: a.f + (+x.f || 0), c: a.c + (+x.c || 0) }), { kcal: 0, p: 0, f: 0, c: 0 });
}
function nutritionTotals(){
  return nutritionTotalsFor(state.foodLog);
}
function roundFood(n){
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}
function fmtFoodNum(n){
  const v = roundFood(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
function parsePortionGrams(portion){
  const match = String(portion || '').match(/(\d+(?:[.,]\d+)?)\s*г(?:\s|$)/i);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
}
function foodMacrosKnown(entry){
  if(entry && entry.macroKnown === false) return false;
  return ((+entry?.p || 0) + (+entry?.f || 0) + (+entry?.c || 0)) > 0;
}
function foodMacroLine(entry){
  const kcal = fmtFoodNum(entry?.kcal || 0);
  if(!foodMacrosKnown(entry)) return `${kcal} ккал · БЖУ не заполнены`;
  return `${kcal} ккал · Б ${fmtFoodNum(entry.p)} Ж ${fmtFoodNum(entry.f)} У ${fmtFoodNum(entry.c)}`;
}
function foodEntryFromInput(input){
  const name = String(input?.name || '').trim();
  const mode = input?.mode === 'per100' ? 'per100' : 'portion';
  const grams = roundFood(input?.grams || 0);
  const baseKcal = roundFood(input?.kcal);
  const baseP = roundFood(input?.p);
  const baseF = roundFood(input?.f);
  const baseC = roundFood(input?.c);
  if(!name) throw new Error('Впиши название продукта');
  if(baseKcal <= 0) throw new Error('Впиши калории');
  if(mode === 'per100' && grams <= 0) throw new Error('Впиши сколько съел, г');
  const scale = mode === 'per100' ? grams / 100 : 1;
  const macroKnown = (baseP + baseF + baseC) > 0;
  return {
    name,
    kcal: roundFood(baseKcal * scale),
    p: macroKnown ? roundFood(baseP * scale) : 0,
    f: macroKnown ? roundFood(baseF * scale) : 0,
    c: macroKnown ? roundFood(baseC * scale) : 0,
    grams: grams || '',
    mode,
    baseKcal,
    baseP,
    baseF,
    baseC,
    macroKnown
  };
}
function normalizeFoodEntry(entry){
  const macroKnown = entry?.macroKnown !== false && ((+entry?.p || 0) + (+entry?.f || 0) + (+entry?.c || 0)) > 0;
  return {
    name: String(entry?.name || 'Еда').trim() || 'Еда',
    kcal: roundFood(entry?.kcal),
    p: macroKnown ? roundFood(entry?.p) : 0,
    f: macroKnown ? roundFood(entry?.f) : 0,
    c: macroKnown ? roundFood(entry?.c) : 0,
    grams: entry?.grams || '',
    mode: entry?.mode || 'portion',
    baseKcal: roundFood(entry?.baseKcal != null ? entry.baseKcal : entry?.kcal),
    baseP: roundFood(entry?.baseP != null ? entry.baseP : entry?.p),
    baseF: roundFood(entry?.baseF != null ? entry.baseF : entry?.f),
    baseC: roundFood(entry?.baseC != null ? entry.baseC : entry?.c),
    macroKnown,
    sourceId: entry?.sourceId || '',
    sourceDay: entry?.sourceDay != null ? Number(entry.sourceDay) : null,
    photoPath: String(entry?.photoPath || ''),
    photoAt: entry?.photoAt || null
  };
}
function cloneFoodEntry(entry){
  const normalized = normalizeFoodEntry(entry);
  normalized.sourceId = '';
  normalized.sourceDay = null;
  return normalized;
}
function userFoodNormalizedName(name){
  return String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
}
function userFoodEntryFromRow(row){
  const mode = row?.mode === 'per100' ? 'per100' : 'portion';
  const base = mode === 'per100'
    ? { kcal:row?.kcal_per_100g, p:row?.protein_per_100g, f:row?.fat_per_100g, c:row?.carb_per_100g }
    : { kcal:row?.kcal_per_portion, p:row?.protein_per_portion, f:row?.fat_per_portion, c:row?.carb_per_portion };
  const entry = foodEntryFromInput({
    name:row?.name || 'Продукт', mode, grams:row?.portion_grams || (mode === 'per100' ? 100 : 0),
    kcal:base.kcal, p:base.p, f:base.f, c:base.c
  });
  entry.baseKcal = roundFood(base.kcal);
  entry.baseP = roundFood(base.p);
  entry.baseF = roundFood(base.f);
  entry.baseC = roundFood(base.c);
  entry.userFoodId = row?.id || '';
  entry.userFoodUseCount = Math.max(1, Number(row?.use_count) || 1);
  entry.userFoodLastUsedAt = row?.last_used_at || '';
  return entry;
}
function userFoodRpcPayload(entry){
  const normalized = normalizeFoodEntry(entry);
  return {
    p_name: normalized.name,
    p_mode: normalized.mode === 'per100' ? 'per100' : 'portion',
    p_kcal: normalized.baseKcal,
    p_protein: normalized.baseP,
    p_fat: normalized.baseF,
    p_carb: normalized.baseC,
    p_portion_grams: Number(normalized.grams) > 0 ? Number(normalized.grams) : null,
    p_progress_epoch: pbProgressEpochId
  };
}
function pbReadUserFoodQueue(){
  const value = JSON.parse(WLStorage.getItem(PB_USER_FOODS_QUEUE_KEY) || '[]');
  if(!Array.isArray(value) || value.length > 80) throw new Error('user_food_queue_unavailable');
  return value;
}
function pbWriteUserFoodQueue(queue){
  if(pbSessionInvalidated || !Array.isArray(queue) || queue.length > 80) throw new Error('user_food_queue_unavailable');
  WLStorage.setItem(PB_USER_FOODS_QUEUE_KEY, JSON.stringify(queue));
}
function pbPutUserFood(entry){
  const key = userFoodNormalizedName(entry?.name);
  if(!key) return;
  const index = pbUserFoods.findIndex(item => userFoodNormalizedName(item.name) === key);
  if(index >= 0) pbUserFoods[index] = Object.assign({}, pbUserFoods[index], entry);
  else pbUserFoods.unshift(entry);
  pbUserFoods.sort((a, b) => (Number(b.userFoodUseCount) || 0) - (Number(a.userFoodUseCount) || 0) || String(b.userFoodLastUsedAt || '').localeCompare(String(a.userFoodLastUsedAt || '')));
}
function mergeUserFoodQueueOperation(queue, operation){
  const source = Array.isArray(queue) ? queue : [];
  const key = operation.normalizedName || userFoodNormalizedName(operation.entry?.name);
  const matching = source.find(item => item.userId === operation.userId && (item.normalizedName || userFoodNormalizedName(item.entry?.name)) === key);
  const filtered = source.filter(item => item !== matching);
  const repeatCount = operation.kind === 'upsert'
    ? Math.min(50, Math.max(1, Number(operation.repeatCount) || 1) + (matching?.kind === 'upsert' ? Math.max(1, Number(matching.repeatCount) || 1) : 0))
    : 1;
  filtered.push(Object.assign({}, operation, { normalizedName:key, repeatCount, queuedAt:Date.now() }));
  return filtered;
}
function pbQueueUserFoodOperation(operation){
  pbWriteUserFoodQueue(mergeUserFoodQueueOperation(pbReadUserFoodQueue(), operation));
}
async function pbFlushUserFoodQueue(){
  if(pbUserFoodSyncFlight){
    const completed = await pbUserFoodSyncFlight;
    return completed ? pbFlushUserFoodQueue() : false;
  }
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return false;
  const context = pbCaptureMediaContext();
  const matches = item => item && item.userId === context.owner && item.epoch === context.epoch && typeof item.revision === 'string'
    && typeof item.normalizedName === 'string' && (item.kind === 'delete' || (item.kind === 'upsert' && Array.isArray(item.uses) && item.uses.length > 0));
  const run = async () => {
    try{
      if(!context.isCurrent()) return false;
      if(!pbReadUserFoodQueue().some(matches)) return true;
      const scope = await pbCreateMediaScope(context);
      while(context.isCurrent()){
        const operation = pbReadUserFoodQueue().find(matches);
        if(!operation) return true;
        let row = null;
        if(operation.kind === 'delete'){
          let query = scope.client.from('pb_user_foods').delete().eq('normalized_name', operation.normalizedName).eq('user_id', context.owner);
          query = context.epoch ? query.eq('progress_epoch', context.epoch) : query.is('progress_epoch', null);
          const {error} = await query;
          if(error) throw error;
        } else {
          const {data,error} = await scope.client.rpc('pb_upsert_user_food', {...operation.payload, p_progress_epoch:context.epoch});
          if(error) throw error;
          row = Array.isArray(data) ? data[0] : data;
          if(!row) throw new Error('user_food_response_missing');
        }
        if(!context.isCurrent()) return false;
        const current = pbReadUserFoodQueue();
        const updated = current.flatMap(item => {
          if(!matches(item) || item.normalizedName !== operation.normalizedName) return [item];
          if(operation.kind === 'delete') return item.revision === operation.revision ? [] : [item];
          if(item.kind !== 'upsert' || !item.uses.includes(operation.uses[0])) return [item];
          const uses = item.uses.filter(id => id !== operation.uses[0]);
          return uses.length ? [{...item,uses,repeatCount:uses.length}] : [];
        });
        pbWriteUserFoodQueue(updated);
        if(!updated.some(item => matches(item) && item.normalizedName === operation.normalizedName)){
          pbUserFoodReadRevision++;
          if(row) pbPutUserFood(userFoodEntryFromRow(row));
          else pbUserFoods = pbUserFoods.filter(item => userFoodNormalizedName(item.name) !== operation.normalizedName);
        }
      }
    }catch(e){ return false; }
    return false;
  };
  pbUserFoodSyncFlight = run();
  try{ return await pbUserFoodSyncFlight; }
  finally{ pbUserFoodSyncFlight = null; }
}
async function pbLoadUserFoods(){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return [];
  const context = pbCaptureMediaContext(), revision = ++pbUserFoodReadRevision;
  const restorePending = () => {
    const pending = pbReadUserFoodQueue().filter(operation => operation?.userId === context.owner && operation.epoch === context.epoch);
    const pendingDeleteNames = new Set(pending.filter(operation => operation.kind === 'delete').map(operation => operation.normalizedName));
    pbUserFoods = pbUserFoods.filter(item => !pendingDeleteNames.has(userFoodNormalizedName(item.name)));
    pending.filter(operation => operation.kind === 'upsert' && operation.entry).forEach(operation => pbPutUserFood(operation.entry));
  };
  try{
    if(!context.isCurrent()) return [];
    restorePending();
    const scope = await pbCreateMediaScope(context);
    const { data, error } = await scope.client.from('pb_user_foods').select('*').eq('user_id', context.owner).order('use_count', { ascending:false }).order('last_used_at', { ascending:false }).limit(100);
    if(!context.isCurrent() || revision !== pbUserFoodReadRevision) return [];
    if(error) throw error;
    pbUserFoods = (data || []).map(userFoodEntryFromRow);
    restorePending();
    pbFlushUserFoodQueue();
  }catch(e){}
  return pbUserFoods;
}
async function pbRememberUserFood(entry){
  if(!entry?.name || !sb || !pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return false;
  const context = pbCaptureMediaContext();
  if(!context.isCurrent()) return false;
  const normalized = normalizeFoodEntry(entry);
  const key = userFoodNormalizedName(normalized.name);
  const existing = pbUserFoods.find(item => userFoodNormalizedName(item.name) === key);
  const optimistic = Object.assign({}, normalized, {
    userFoodId: existing?.userFoodId || '',
    userFoodUseCount: (Number(existing?.userFoodUseCount) || 0) + 1,
    userFoodLastUsedAt: new Date().toISOString()
  });
  const payload = userFoodRpcPayload(normalized);
  try{
    pbQueueUserFoodOperation({kind:'upsert',userId:context.owner,epoch:context.epoch,revision:pbUuid(),uses:[pbUuid()],normalizedName:key,payload,entry:optimistic});
  }catch(e){ toast('Не удалось сохранить продукт в «Мои продукты».'); return false; }
  pbUserFoodReadRevision++;
  pbPutUserFood(optimistic);
  return pbFlushUserFoodQueue();
}
async function pbDeleteUserFood(entry){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return false;
  const context = pbCaptureMediaContext();
  if(!context.isCurrent()) return false;
  const key = userFoodNormalizedName(entry?.name);
  if(!key) return false;
  try{
    pbQueueUserFoodOperation({kind:'delete',userId:context.owner,epoch:context.epoch,revision:pbUuid(),normalizedName:key,id:entry.userFoodId});
  }catch(e){ toast('Не удалось удалить продукт. Повтори попытку.'); return false; }
  pbUserFoodReadRevision++;
  pbUserFoods = pbUserFoods.filter(item => userFoodNormalizedName(item.name) !== key);
  return pbFlushUserFoodQueue();
}
function nutritionHistoryItems(items){
  return (Array.isArray(items) ? items : [])
    .map(cloneFoodEntry)
    .filter(x => x.name && (+x.kcal || 0) > 0)
    .slice(0, 30);
}
function nutritionRecordItems(rec){
  return Array.isArray(rec?.items) ? nutritionHistoryItems(rec.items) : [];
}
function foodEntryFromPreset(food){
  const grams = parsePortionGrams(food?.portion);
  if(grams > 0){
    return foodEntryFromInput({
      name: food.name,
      mode: 'per100',
      grams,
      kcal: (+food.kcal || 0) * 100 / grams,
      p: (+food.p || 0) * 100 / grams,
      f: (+food.f || 0) * 100 / grams,
      c: (+food.c || 0) * 100 / grams
    });
  }
  return foodEntryFromInput({ name: food.name, mode: 'portion', kcal: food.kcal, p: food.p, f: food.f, c: food.c });
}
// Сумма за неделю: сегодня (foodLog) + до 6 прошлых дней из history
function weekTotals(){
  const t = nutritionTotals();
  let kcal = t.kcal, p = t.p, f = t.f, c = t.c;
  for(let i = 1; i <= 6; i++){
    let k; try{ k = dayKey(i); }catch(e){ break; }
    const h = nutritionRecordForDay(k);
    if(h){ kcal += (+h.kcal || 0); p += (+h.p || 0); f += (+h.f || 0); c += (+h.c || 0); }
  }
  return { kcal, p, f, c };
}

let foodDB = null;
async function ensureFoods(){
  if(Array.isArray(foodDB) && foodDB.length) return foodDB;
  try {
    const res = await window.WLData.fetch('foods.json?v=f2', { cache: 'no-store' });
    if(!res.ok) throw new Error(`foods.json ${res.status}`);
    const data = await res.json();
    if(!Array.isArray(data) || !data.length) throw new Error('foods.json empty');
    foodDB = data;
  } catch(e) {
    console.warn('Не удалось загрузить базу продуктов', e);
    foodDB = null;
    return [];
  }
  return foodDB;
}

function renderNutrition(){
  rolloverCheck();
  const selected = selectedNutritionDate();
  const selectedDraft = nutritionRecordDraftForDate(selected);
  const norm = computeNorm(planFromProfile(), state.kcalCut || 0);
  state.kcal = norm.kcal;
  const week = state.calView === 'week';
  const mult = week ? 7 : 1;
  const t = week ? weekTotals() : nutritionTotalsFor(selectedDraft.items);
  const eaten = Math.round(t.kcal), target = norm.kcal * mult;
  const left = target - eaten, over = left < 0;
  document.querySelectorAll('#calToggle .cal-tg').forEach(b => b.classList.toggle('on', b.dataset.cal === (week ? 'week' : 'day')));
  if($('kcalCardTitle')) $('kcalCardTitle').textContent = week ? 'КБЖУ · неделя' : (nutritionDiaryIsToday(selected) ? `КБЖУ · сегодня, ${todayHumanDate()}` : `КБЖУ · ${diaryDateLabel(selected)}`);
  const ring = $('kcalRing');
  if(ring){
    const eatenPct = target > 0 ? Math.min(100, Math.round(eaten / target * 100)) : 0;
    ring.style.setProperty('--eaten', eatenPct);
    ring.style.setProperty('--remaining', over ? 0 : Math.max(0, 100 - eatenPct));
    ring.classList.toggle('over', over);
    ring.setAttribute('aria-label', over ? `Превышение нормы на ${Math.abs(left)} килокалорий` : `Осталось ${left} килокалорий из ${target}`);
  }
  const leftEl = $('kcalLeft');
  if(leftEl){ leftEl.textContent = over ? `+${Math.abs(left)}` : left; leftEl.classList.toggle('over', over); }
  const eyebrow = document.querySelector('.kcal-eyebrow');
  if(eyebrow) eyebrow.textContent = over ? 'перебор' : (week ? 'осталось/нед' : 'осталось');
  if($('kcalEaten')) $('kcalEaten').textContent = eaten;
  if($('kcal')) $('kcal').textContent = target;
  const macro = (lblId, barId, val, goal) => {
    if($(lblId)) $(lblId).textContent = `${Math.round(val)} / ${goal} г`;
    if($(barId)) $(barId).style.width = (goal > 0 ? Math.min(100, Math.round(val / goal * 100)) : 0) + '%';
  };
  macro('mProt', 'mProtBar', t.p, norm.protein * mult);
  macro('mFat', 'mFatBar', t.f, norm.fat * mult);
  macro('mCarb', 'mCarbBar', t.c, norm.carb * mult);
  if($('normNote')){
    const bodyCheckNote = norm.bodyCheckApplied ? ` BodyCheck учтён: <b>${escapeHtml(norm.bodyCheckTitle)}</b>. ${escapeHtml(norm.bodyCheckNote)}` : '';
    const bodyCheckGuard = norm.bodyCheckCutLimited ? ' Ручную коррекцию калорий ограничили, чтобы не усиливать дефицит.' : '';
    $('normNote').innerHTML = week
      ? `Недельная норма <b>${norm.kcal * 7} ккал</b> (≈${norm.kcal}/день) · Б ${norm.protein * 7} · Ж ${norm.fat * 7} · У ${norm.carb * 7}. Перебор за один день усредняется в недельном бюджете.${bodyCheckNote}${bodyCheckGuard}`
      : `Норма <b>${norm.kcal} ккал</b> · Б ${norm.protein} · Ж ${norm.fat} · У ${norm.carb}. Расчёт: BMR ${norm.bmr} × активность = ${norm.tdee}, цель «${escapeHtml(state.profile.goal || 'Сушка')}»${state.kcalCut ? state.profile.goal === 'Сушка' ? ` · дефицит −${state.kcalCut * 100} от расхода` : ` · адаптация −${state.kcalCut * 100}` : ''}.${bodyCheckNote}${bodyCheckGuard}`;
  }
  const water = +selectedDraft.water || 0;
  const waterTarget = waterTargetLiters(planFromProfile());
  const waterPct = Math.min(100, Math.round(water / waterTarget * 100));
  if($('waterRing')) $('waterRing').style.setProperty('--filled', waterPct);
  if($('waterRingVal')) $('waterRingVal').textContent = water.toFixed(1);
  if($('waterDone')) $('waterDone').textContent = water.toFixed(1);
  if($('waterTargetInline')) $('waterTargetInline').textContent = waterTarget.toFixed(1);
  if($('waterSub')){ const rem = Math.max(0, Math.round((waterTarget - water) * 10) / 10); $('waterSub').textContent = rem > 0 ? `осталось ${rem.toFixed(1)} л` : 'норма выполнена'; }
  renderDiaryDateStrip();
  renderSelectedDayActivity();
  renderFoodLog();
  renderMenuWeek();
  renderHistory();
  scheduleNutritionSnapshotSync(selected);
}

function renderFoodLog(){
  const list = $('foodLog');
  if(!list) return;
  const items = nutritionRecordDraftForDate(selectedNutritionDate()).items;
  if($('foodLogCount')) $('foodLogCount').textContent = items.length;
  if(!items.length){ list.innerHTML = '<div class="food-empty">Пока пусто. Добавь еду в выбранный день.</div>'; return; }
  list.innerHTML = items.map((x, i) =>
    `<div class="food-item" role="button" tabindex="0" data-edit="${i}"><span class="food-b"><b>${escapeHtml(x.name)}</b><span>${escapeHtml(foodMacroLine(x))}</span>${x.grams ? `<em>${fmtFoodNum(x.grams)} г</em>` : ''}${x.photoPath ? '<em class="food-photo-chip">Фото</em>' : ''}</span><button type="button" class="food-del" data-i="${i}" aria-label="Убрать">×</button></div>`
  ).join('');
  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openFoodEditor(Number(b.dataset.edit))));
  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFoodEditor(Number(b.dataset.edit)); } }));
  list.querySelectorAll('.food-del').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const draft = nutritionRecordDraftForDate(selectedNutritionDate());
    draft.items.splice(Number(b.dataset.i), 1);
    commitSelectedNutritionDraft(draft);
  }));
}

function addFood(f){
  const entry = normalizeFoodEntry(f);
  const draft = nutritionRecordDraftForDate(selectedNutritionDate());
  draft.items.push(entry);
  commitSelectedNutritionDraft(draft);
  toast(`+ ${entry.name} · ${fmtFoodNum(entry.kcal)} ккал`);
}
function menuFoodEntry(dish, dayIndex, scale){
  const sc = x => Math.round((+x || 0) * (scale || 1));
  return {
    name: dish.name,
    kcal: sc(dish.kcal),
    p: sc(dish.p),
    f: sc(dish.f),
    c: sc(dish.c),
    sourceId: dish.id,
    sourceDay: dayIndex
  };
}
function menuMealLogged(dish, dayIndex){
  return (state.foodLog || []).some(x => x.sourceId === dish.id && Number(x.sourceDay) === Number(dayIndex));
}

function foodEditorValues(entry){
  const normalized = normalizeFoodEntry(entry);
  const per100 = normalized.mode === 'per100';
  return {
    mode: per100 ? 'per100' : 'portion',
    grams: normalized.grams || '',
    kcal: per100 ? normalized.baseKcal : normalized.kcal,
    p: per100 ? normalized.baseP : normalized.p,
    f: per100 ? normalized.baseF : normalized.f,
    c: per100 ? normalized.baseC : normalized.c
  };
}

function foodFormHtml(prefix, entry){
  const v = foodEditorValues(entry || { mode:'per100', grams:100, kcal:'', p:'', f:'', c:'' });
  const name = entry ? entry.name : '';
  return `<div class="food-form-grid">
    <label class="food-form-full"><span>Название</span><input id="${prefix}Name" value="${escapeHtml(String(name || ''))}" placeholder="например, Творог 2%" autocomplete="off" /></label>
    <label><span>Как вводишь</span><select id="${prefix}Mode"><option value="per100"${v.mode === 'per100' ? ' selected' : ''}>на 100 г</option><option value="portion"${v.mode === 'portion' ? ' selected' : ''}>на всю порцию</option></select></label>
    <label><span>Съел, г</span><input id="${prefix}Grams" inputmode="decimal" value="${escapeHtml(String(v.grams || ''))}" placeholder="180" autocomplete="off" /></label>
    <label><span>Ккал</span><input id="${prefix}Kcal" inputmode="decimal" value="${escapeHtml(String(v.kcal || ''))}" placeholder="120" autocomplete="off" /></label>
    <label><span>Белки</span><input id="${prefix}P" inputmode="decimal" value="${escapeHtml(String(v.p || ''))}" placeholder="18" autocomplete="off" /></label>
    <label><span>Жиры</span><input id="${prefix}F" inputmode="decimal" value="${escapeHtml(String(v.f || ''))}" placeholder="2" autocomplete="off" /></label>
    <label><span>Углеводы</span><input id="${prefix}C" inputmode="decimal" value="${escapeHtml(String(v.c || ''))}" placeholder="3" autocomplete="off" /></label>
  </div>`;
}

function readFoodForm(prefix){
  const val = id => ($(prefix + id)?.value || '').replace(',', '.').trim();
  return foodEntryFromInput({
    name: val('Name'),
    mode: val('Mode'),
    grams: parseFloat(val('Grams')) || 0,
    kcal: parseFloat(val('Kcal')) || 0,
    p: parseFloat(val('P')) || 0,
    f: parseFloat(val('F')) || 0,
    c: parseFloat(val('C')) || 0
  });
}

function openFoodEditor(index){
  const selected = selectedNutritionDate();
  const draft = nutritionRecordDraftForDate(selected);
  const entry = draft.items[index];
  const o = $('foodPicker');
  if(!entry || !o) return;
  o.innerHTML = `<div class="lib-sheet"><div class="lib-sheet-head"><h2>Редактировать еду</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Можно поменять граммы, КБЖУ или удалить запись из дневника.</p>
    ${foodFormHtml('fe', entry)}
    <div class="food-editor-actions"><button type="button" class="primary shine" id="feSave">Сохранить</button><button type="button" class="secondary" id="feDelete">Удалить</button></div>
  </div>`;
  o.hidden = false;
  const close = () => { o.hidden = true; o.innerHTML = ''; };
  o.querySelector('.lib-close')?.addEventListener('click', close);
  o.querySelector('#feSave')?.addEventListener('click', () => {
    try{
      const next = readFoodForm('fe');
      next.photoPath = entry.photoPath || '';
      next.photoAt = entry.photoAt || null;
      draft.items[index] = next;
      commitSelectedNutritionDraft(draft);
      toast('Запись обновлена'); close();
    }catch(error){ toast(error.message || 'Проверь поля'); }
  });
  o.querySelector('#feDelete')?.addEventListener('click', () => {
    draft.items.splice(index, 1);
    commitSelectedNutritionDraft(draft);
    toast('Удалено из дневника'); close();
  });
}

async function openFoodPicker(){
  await ensureFoods();
  const o = $('foodPicker');
  if(!o) return;
  const render = q => {
    const ql = (q || '').toLowerCase();
    const personal = pbUserFoods.filter(f => !ql || f.name.toLowerCase().includes(ql));
    const presets = (foodDB || []).filter(f => !ql || f.name.toLowerCase().includes(ql));
    const personalHtml = personal.length ? `<section class="user-food-section"><h3>Мои продукты</h3>${personal.map(f => { const index = pbUserFoods.indexOf(f); return `<div class="food-pick user-food-row"><button type="button" class="food-pick-main" data-user-food="${index}"><span class="food-b"><b>${escapeHtml(f.name)}</b><span>${escapeHtml(foodMacroLine(f))}${f.grams ? ` · ${fmtFoodNum(f.grams)} г` : ''}</span></span><span class="food-plus">+</span></button><button type="button" class="user-food-delete" data-user-food-delete="${index}" aria-label="Удалить ${escapeHtml(f.name)}">×</button></div>`; }).join('')}</section>` : '';
    const presetHtml = presets.length ? `<section class="preset-food-section"><h3>${personal.length ? 'База продуктов' : 'Продукты'}</h3>${presets.map(f => { const index = foodDB.indexOf(f); return `<button type="button" class="food-pick" data-preset-food="${index}"><span class="food-b"><b>${escapeHtml(f.name)}</b><span>${escapeHtml(f.portion)} · ${f.kcal} ккал · Б ${f.p} Ж ${f.f} У ${f.c}</span></span><span class="food-plus">+</span></button>`; }).join('')}</section>` : '';
    return personalHtml + presetHtml || '<div class="food-empty">Ничего не найдено — добавь свой продукт ниже.</div>';
  };
  o.innerHTML = `<div class="lib-sheet"><div class="lib-sheet-head"><h2>Добавить еду</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <input type="search" class="food-search" id="foodSearch" placeholder="Поиск: курица, рис, банан…" autocomplete="off" />
    <div class="food-picklist" id="foodPickList">${render('')}</div>
    <div class="food-manual"><b>Своё блюдо</b>${foodFormHtml('fm')}<button type="button" class="secondary" id="fmAdd">Добавить своё</button></div>
  </div>`;
  o.hidden = false;
  const close = () => { o.hidden = true; o.innerHTML = ''; };
  o.querySelector('.lib-close')?.addEventListener('click', close);
  const bindPicks = () => {
    o.querySelectorAll('[data-preset-food]').forEach(button => button.addEventListener('click', () => { const f = foodDB[Number(button.dataset.presetFood)]; if(f) addFood(foodEntryFromPreset(f)); }));
    o.querySelectorAll('[data-user-food]').forEach(button => button.addEventListener('click', () => { const entry = pbUserFoods[Number(button.dataset.userFood)]; if(entry){ addFood(entry); pbRememberUserFood(entry); } }));
    o.querySelectorAll('[data-user-food-delete]').forEach(button => button.addEventListener('click', () => {
      const entry = pbUserFoods[Number(button.dataset.userFoodDelete)];
      if(!entry) return;
      pbDeleteUserFood(entry);
      $('foodPickList').innerHTML = render($('foodSearch')?.value || '');
      bindPicks();
      toast('Удалено из моих продуктов');
    }));
  };
  bindPicks();
  o.querySelector('#foodSearch')?.addEventListener('input', e => { $('foodPickList').innerHTML = render(e.target.value); bindPicks(); });
  o.querySelector('#fmAdd')?.addEventListener('click', () => {
    try{ const entry = readFoodForm('fm'); addFood(entry); pbRememberUserFood(entry); close(); }
    catch(error){ toast(error.message || 'Проверь поля'); }
  });
}

function openFoodPhoto(){
  const o = $('foodPicker');
  if(!o) return;
  let photoFile = null;
  let previewUrl = '';
  const releasePreview = () => {
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  };
  const close = () => { releasePreview(); o.hidden = true; o.innerHTML = ''; };
  o.innerHTML = `<div class="lib-sheet"><div class="lib-sheet-head"><div><h2>Блюдо с фото</h2><p class="sheet-sub">Фото сохранится в записи, а название и КБЖУ ты подтверждаешь сам — это точнее автоматического угадывания.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <label class="meal-photo-upload" for="foodPhotoFile">Снять фото или выбрать из галереи<input id="foodPhotoFile" type="file" accept="image/*" capture="environment" hidden></label>
    <div class="meal-photo-preview" id="mealPhotoPreview" aria-live="polite"></div>
    ${foodFormHtml('fp')}
    <p class="sheet-note">Фото уменьшается перед загрузкой. Если сеть недоступна, запись всё равно сохранится без вложения.</p>
    <button type="button" class="primary shine" id="foodPhotoSave" disabled>Добавить в дневник</button>
  </div>`;
  o.hidden = false;
  o.querySelector('.lib-close')?.addEventListener('click', close);
  const input = o.querySelector('#foodPhotoFile');
  const preview = o.querySelector('#mealPhotoPreview');
  const saveButton = o.querySelector('#foodPhotoSave');
  input?.addEventListener('change', () => {
    const file = input.files?.[0] || null;
    if(!file) return;
    releasePreview();
    photoFile = file;
    previewUrl = URL.createObjectURL(file);
    if(preview){ preview.style.backgroundImage = `url("${previewUrl}")`; preview.classList.add('on'); }
    if(saveButton) saveButton.disabled = false;
  });
  saveButton?.addEventListener('click', async () => {
    if(!photoFile) return;
    try{
      const entry = readFoodForm('fp');
      saveButton.disabled = true;
      saveButton.textContent = 'Сохраняем…';
      const path = await pbUploadProof(photoFile, 'photo', 'meal');
      entry.photoPath = path || '';
      entry.photoAt = path ? new Date().toISOString() : null;
      addFood(entry);
      pbRememberUserFood(entry);
      close();
      toast(path ? 'Блюдо с фото добавлено' : 'Блюдо добавлено без фото: проверь соединение');
      track('food_photo_logged', 'nutrition', { uploaded:!!path });
    }catch(error){
      if(saveButton){ saveButton.disabled = false; saveButton.textContent = 'Добавить в дневник'; }
      toast(error?.message || 'Не удалось сохранить блюдо');
    }
  });
}

function generateMenu(){
  if(!nutritionDiaryIsToday(selectedNutritionDate())){
    toast('Готовое меню собирается только на сегодня. Прошлый день можно заполнить вручную.');
    return;
  }
  ensureDishes().then(db => {
    if(!db.length){ toast('База блюд не загрузилась'); return; }
    const prof = planFromProfile();
    const norm = computeNorm(prof, state.kcalCut || 0);
    const tokens = foodExclusions();
    const budgetTier = nutritionBudgetTier(prof.foodBudget);
    const slots = mealSlots(prof.mealsPerDay);   // ровно столько приёмов, сколько в анкете
    const pools = slots.map(slot => eligibleMenuDishes(db, slot, budgetTier, tokens));
    if(pools.some(pool => !pool.length)){ toast('Не хватает блюд под выбранный рацион и исключения. Проверь настройки питания.'); return; }
    const meals = pools.map(pool => pool[Math.floor(Math.random() * pool.length)]);
    const base = meals.reduce((s, m) => s + m.kcal, 0) || 1;
    const scale = Math.min(1.8, Math.max(0.8, norm.kcal / base));
    const sc = x => Math.round(x * scale);
    const items = meals.map(m => normalizeFoodEntry({ name: m.name, kcal: sc(m.kcal), p: sc(m.p), f: sc(m.f), c: sc(m.c) }));
    commitSelectedNutritionDraft({ date:selectedNutritionDate(), items, water:state.water });
    toast(`Меню на день: ${meals.length} ${mealsWord(meals.length)} · ${items.reduce((s, x) => s + x.kcal, 0)} ккал`);
  });
}

// История за неделю: реальные снимки по датам. Сегодня — вживую.
const HISTORY_SOURCE = 'nutrition-rollover-v1';
const HISTORY_OWNER_KEY = 'primeBodyMobileHistoryOwner';
const NUTRITION_DIARY_DAYS = 7;
const WEEKDAY = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
let nutritionRemote = { loaded:false, rows:{} };
let dailyActivityRemote = { loaded:false, rows:{} };
const nutritionSyncTimers = new Map();
const nutritionSyncDrafts = new Map();
const nutritionSyncInFlight = new Set();
const nutritionPendingDates = new Set();
let rolloverInProgress = false;
let nutritionSelectedDate = '';
const WATER_MAX_LITERS = 10;
const WATER_ADJUST_GUARD_MS = 450;
const waterAdjustmentLocks = new Map();

function pad2(n){ return n < 10 ? '0' + n : String(n); }
function dayKey(offset){
  const d = new Date();
  d.setDate(d.getDate() - (offset || 0));
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function nutritionDiaryDateWindow(){
  const dates = [];
  for(let i = NUTRITION_DIARY_DAYS - 1; i >= 0; i--) dates.push(dayKey(i));
  return dates;
}
function nutritionDiaryDateAllowed(date){
  return nutritionDiaryDateWindow().includes(String(date || ''));
}
function nutritionDiaryIsToday(date){
  return String(date || '') === dayKey(0);
}
function nutritionRecordDraftForDate(date){
  const safeDate = nutritionDiaryDateAllowed(date) ? String(date) : dayKey(0);
  if(nutritionDiaryIsToday(safeDate)){
    const remote = nutritionRemote.rows && nutritionRemote.rows[safeDate];
    if(nutritionRemote.loaded && remote && !nutritionPendingDates.has(safeDate)){
      return { date:safeDate, items:nutritionRecordItems(remote), water:+remote.water || 0 };
    }
    return { date:safeDate, items:nutritionHistoryItems(state.foodLog), water:+state.water || 0 };
  }
  const rec = nutritionRecordForDay(safeDate);
  return { date:safeDate, items:nutritionRecordItems(rec), water:+rec?.water || 0 };
}
function applyNutritionRecordDraft(date, draft){
  const safeDate = String(date || '');
  if(!nutritionDiaryDateAllowed(safeDate)) throw new Error('Дата недоступна для редактирования');
  const items = nutritionHistoryItems(draft?.items);
  const water = Math.max(0, Math.min(WATER_MAX_LITERS, Math.round((+draft?.water || 0) * 10) / 10));
  const totals = nutritionTotalsFor(items);
  if(nutritionDiaryIsToday(safeDate)){
    state.foodLog = items;
    state.water = water;
    return nutritionHistoryRecord(safeDate, items, water);
  }
  const rec = {
    source: HISTORY_SOURCE,
    owner: nutritionHistoryOwner(),
    date: safeDate,
    kcal: Math.max(0, Math.round(+totals.kcal || 0)),
    water,
    p: Math.max(0, Math.round(+totals.p || 0)),
    f: Math.max(0, Math.round(+totals.f || 0)),
    c: Math.max(0, Math.round(+totals.c || 0)),
    items,
    pending: true
  };
  state.history[safeDate] = rec;
  return rec;
}
function selectedNutritionDate(){
  if(!nutritionDiaryDateAllowed(nutritionSelectedDate)) nutritionSelectedDate = dayKey(0);
  return nutritionSelectedDate;
}
function diaryDateObject(date){
  const d = new Date(String(date || '') + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function diaryDateLabel(date){
  try{ return new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long' }).format(diaryDateObject(date)); }
  catch(e){ return String(date || ''); }
}
function setNutritionSelectedDate(date){
  if(!nutritionDiaryDateAllowed(date)) return false;
  if(pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0 && !nutritionDiaryIsToday(date)){
    pbShowTrialUpsell('История и редактирование прошлых дней доступны в полной версии.');
    return false;
  }
  nutritionSelectedDate = String(date);
  state.calView = 'day';
  const shell = document.querySelector('.phone-app');
  if(shell) shell.scrollLeft = 0;
  save();
  renderNutrition();
  if(shell){
    shell.scrollLeft = 0;
    requestAnimationFrame(() => { shell.scrollLeft = 0; });
  }
  return true;
}
function commitSelectedNutritionDraft(draft){
  const date = nutritionDiaryDateAllowed(draft?.date) ? String(draft.date) : selectedNutritionDate();
  nutritionPendingDates.add(date);
  const rec = applyNutritionRecordDraft(date, draft || {});
  save();
  scheduleNutritionSnapshotSync(date);
  if(nutritionDiaryIsToday(date)) renderMetrics();
  else renderNutrition();
  return rec;
}
function adjustWater(date, delta, now){
  const safeDate = nutritionDiaryDateAllowed(date) ? String(date) : selectedNutritionDate();
  const amount = Math.round((Number(delta) || 0) * 10) / 10;
  const draft = nutritionRecordDraftForDate(safeDate);
  const previousValue = Math.max(0, Math.round((Number(draft.water) || 0) * 10) / 10);
  if(!amount) return { changed:false, reason:'invalid', value:previousValue, date:safeDate };
  const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const lockKey = `${safeDate}:${amount}`;
  const previousTap = waterAdjustmentLocks.get(lockKey) || 0;
  if(previousTap && timestamp - previousTap < WATER_ADJUST_GUARD_MS){
    return { changed:false, reason:'pending', value:previousValue, date:safeDate };
  }
  waterAdjustmentLocks.set(lockKey, timestamp);
  const value = Math.max(0, Math.min(WATER_MAX_LITERS, Math.round((previousValue + amount) * 10) / 10));
  if(value === previousValue) return { changed:false, reason:'limit', value, date:safeDate };
  const isToday = nutritionDiaryIsToday(safeDate);
  if(isToday && (!state.dailyReport || state.dailyReport.date !== safeDate)){
    state.dailyReport = { date:safeDate, training:false, water:false, food:false, sleep:false, claimed:false, waterRewarded:false };
  }
  const waterTarget = waterTargetLiters(planFromProfile());
  const awarded = isToday && amount > 0 && previousValue < waterTarget && value >= waterTarget && !state.dailyReport.waterRewarded;
  if(awarded){
    state.score += 5;
    state.dailyReport.waterRewarded = true;
  }
  draft.water = value;
  commitSelectedNutritionDraft(draft);
  return { changed:true, value, previousValue, awarded, isToday, date:safeDate, delta:amount };
}
function renderDiaryDateStrip(){
  const strip = $('diaryDateStrip');
  if(!strip) return;
  const selected = selectedNutritionDate();
  const today = dayKey(0);
  strip.innerHTML = nutritionDiaryDateWindow().map(date => {
    const d = diaryDateObject(date);
    const weekday = new Intl.DateTimeFormat('ru-RU', { weekday:'short' }).format(d).replace('.', '');
    const isToday = date === today;
    const active = date === selected;
    const locked = pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0 && !isToday;
    return `<button type="button" class="diary-date-btn${isToday ? ' today' : ''}${active ? ' active' : ''}${locked ? ' pb-trial24-locked' : ''}" data-diary-date="${escapeHtml(date)}" role="tab" aria-selected="${active ? 'true' : 'false'}"${locked ? ' aria-disabled="true"' : ''}><span>${escapeHtml(weekday)}</span><b>${d.getDate()}</b><em>${isToday ? 'сегодня' : ''}</em></button>`;
  }).join('');
  strip.querySelectorAll('[data-diary-date]').forEach(btn => btn.addEventListener('click', () => setNutritionSelectedDate(btn.dataset.diaryDate)));
  const activeButton = strip.querySelector('[aria-selected="true"]');
  if(activeButton) requestAnimationFrame(() => {
    const target = activeButton.offsetLeft - Math.max(0, (strip.clientWidth - activeButton.offsetWidth) / 2);
    strip.scrollLeft = Math.max(0, Math.min(target, strip.scrollWidth - strip.clientWidth));
  });
  const past = !nutritionDiaryIsToday(selected);
  $('nutrition')?.classList.toggle('nutrition-past-day', past);
  if($('diaryDayContext')) $('diaryDayContext').textContent = past ? 'Редактирование прошлого дня' : 'Сегодня';
  if($('diaryDayLabel')) $('diaryDayLabel').textContent = past ? diaryDateLabel(selected) : 'Дневник за сегодня';
  if($('foodLogTitle')) $('foodLogTitle').textContent = past ? `Питание · ${diaryDateLabel(selected)}` : 'Дневник питания';
  if($('foodLogSub')) $('foodLogSub').textContent = past ? 'Можно исправить еду и воду. Баллы и серия задним числом не начисляются.' : 'Добавляй, что съел. Кольцо и макросы считаются по факту. Или собери меню под норму.';
}
function buildDailyResult(input){
  const source = input || {};
  const metric = value => {
    if(value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const intakeKcal = Math.max(0, Math.round(metric(source.intakeKcal) || 0));
  const targetKcal = Math.max(0, Math.round(metric(source.targetKcal) || 0));
  const rawActiveEnergy = metric(source.activeEnergyKcal);
  const activeEnergyKcal = rawActiveEnergy === null ? null : Math.max(0, Math.round(rawActiveEnergy));
  const rawSteps = metric(source.steps);
  const steps = rawSteps === null ? null : Math.max(0, Math.round(rawSteps));
  const ratio = targetKcal > 0 ? intakeKcal / targetKcal : 0;
  let foodStatus = 'Питание не заполнено';
  if(intakeKcal > 0 && targetKcal <= 0) foodStatus = 'Данные за день';
  else if(intakeKcal > 0 && ratio < 0.8) foodStatus = 'Ниже плана';
  else if(intakeKcal > 0 && ratio > 1.1) foodStatus = 'Выше плана';
  else if(intakeKcal > 0) foodStatus = 'В пределах плана';
  return {
    date: String(source.date || ''),
    intakeKcal,
    targetKcal,
    targetRemainingKcal: targetKcal - intakeKcal,
    activeEnergyKcal,
    afterActivityKcal: activeEnergyKcal === null ? null : intakeKcal - activeEnergyKcal,
    steps,
    workoutCompleted: !!source.workoutCompleted,
    workoutTitle: String(source.workoutTitle || ''),
    activitySource: activeEnergyKcal === null ? 'none' : 'apple_health',
    foodStatus
  };
}
function normalizeAppleHealthDayRow(row){
  if(!row || !row.day) return null;
  const finite = value => {
    if(value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    date: String(row.day),
    steps: finite(row.steps),
    activeEnergyKcal: finite(row.active_energy_kcal)
  };
}
function normalizeAppleHealthBodyCompositionRow(row){
  if(!row || !row.recorded_at) return null;
  const finite = value => {
    if(value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const bodyFatPct = finite(row.body_fat_pct);
  if(bodyFatPct == null || bodyFatPct < 1 || bodyFatPct > 75) return null;
  return {
    recordedAt:String(row.recorded_at), bodyFatPct,
    bodyMassKg:finite(row.body_mass_kg), fatMassKg:finite(row.fat_mass_kg), leanMassKg:finite(row.lean_mass_kg),
    sourceLabel:String(row.source_label || 'Передано через Форма Sync')
  };
}
function pbReceiveAppleHealthData(payload){
  const incoming = Array.isArray(payload?.dailyRows)
    ? payload.dailyRows
    : (payload?.daily ? [payload.daily] : []);
  const rows = {};
  incoming.forEach(row => {
    const normalized = normalizeAppleHealthDayRow(row);
    if(!normalized) return;
    if(payload?.preview && incoming.length === 1) normalized.date = dayKey(0);
    rows[normalized.date] = normalized;
  });
  const bodyComposition = (Array.isArray(payload?.bodyCompositionRows) ? payload.bodyCompositionRows : [])
    .map(normalizeAppleHealthBodyCompositionRow)
    .filter(Boolean)
    .sort((a,b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));
  appleHealthRemote = { loaded:true, rows, bodyComposition };
  renderTodayDashboard();
  renderSelectedDayActivity();
  renderPlan();
  renderMetrics();
  renderBodyInsights();
  renderBodyCheckSummary();
}
function appleHealthForDate(date){
  const safeDate = nutritionDiaryDateAllowed(date) ? String(date) : dayKey(0);
  return (appleHealthRemote.rows && appleHealthRemote.rows[safeDate]) || null;
}
function dailyResultForDate(date){
  const safeDate = nutritionDiaryDateAllowed(date) ? String(date) : dayKey(0);
  const nutrition = nutritionRecordDraftForDate(safeDate);
  const totals = nutritionTotalsFor(nutrition.items);
  const activity = dailyActivityForDate(safeDate);
  const health = appleHealthForDate(safeDate);
  const norm = computeNorm(planFromProfile(), state.kcalCut || 0);
  return buildDailyResult({
    date: safeDate,
    intakeKcal: totals.kcal,
    targetKcal: norm.kcal,
    steps: health?.steps,
    activeEnergyKcal: health?.activeEnergyKcal,
    workoutCompleted: !!activity?.workoutCompleted,
    workoutTitle: activity?.workoutTitle || ''
  });
}
function normalizeDailyActivityRow(row){
  if(!row || !row.day) return null;
  return {
    date: String(row.day),
    workoutCompleted: !!row.workout_completed,
    workoutTitle: String(row.workout_title || ''),
    workoutCompletedAt: row.workout_completed_at || null,
    reportFlags: row.report_flags && typeof row.report_flags === 'object' ? row.report_flags : {}
  };
}
function currentWorkoutTitle(){
  const title = ($('workoutTitle')?.textContent || '').trim();
  return title || 'Тренировка дня';
}
function dailyActivityForDate(date){
  const safeDate = nutritionDiaryDateAllowed(date) ? String(date) : dayKey(0);
  const remote = dailyActivityRemote.rows && dailyActivityRemote.rows[safeDate];
  if(!nutritionDiaryIsToday(safeDate)) return remote || null;
  const report = state.dailyReport && state.dailyReport.date === safeDate ? state.dailyReport : {};
  const completed = !!state.dayGuidePassed || !!report.training || !!remote?.workoutCompleted;
  return {
    date: safeDate,
    workoutCompleted: completed,
    workoutTitle: remote?.workoutTitle || (completed ? currentWorkoutTitle() : ''),
    workoutCompletedAt: remote?.workoutCompletedAt || null,
    reportFlags: Object.assign({}, remote?.reportFlags || {}, {
      training: !!report.training || !!remote?.reportFlags?.training,
      water: !!report.water || !!remote?.reportFlags?.water,
      food: !!report.food || !!remote?.reportFlags?.food,
      sleep: !!report.sleep || !!remote?.reportFlags?.sleep,
      claimed: !!report.claimed || !!remote?.reportFlags?.claimed
    })
  };
}
async function pbLoadDailyActivitySnapshots(){
  if(!sb || !pbUser) return false;
  try{
    const { data, error } = await sb.from('pb_daily_activity_snapshots')
      .select('day,workout_completed,workout_title,workout_completed_at,report_flags')
      .gte('day', dayKey(NUTRITION_DIARY_DAYS - 1)).lte('day', dayKey(0))
      .order('day', { ascending:false });
    if(error) return false;
    const rows = {};
    (data || []).forEach(row => {
      const rec = normalizeDailyActivityRow(row);
      if(rec) rows[rec.date] = rec;
    });
    dailyActivityRemote = { loaded:true, rows };
    return true;
  }catch(e){ return false; }
}
async function pbUpsertDailyActivitySnapshot(overrides, targetDate){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting) return false;
  const date = targetDate == null ? dayKey(0) : String(targetDate);
  if(!nutritionDiaryDateAllowed(date)) return false;
  const current = dailyActivityForDate(date) || { date };
  const next = Object.assign({}, current, overrides || {});
  const completed = !!next.workoutCompleted;
  const hasCompletedAtOverride = Object.prototype.hasOwnProperty.call(overrides || {}, 'workoutCompletedAt');
  const workoutCompletedAt = completed
    ? (hasCompletedAtOverride ? (overrides.workoutCompletedAt || null) : (current.workoutCompletedAt || new Date().toISOString()))
    : null;
  const reportFlags = Object.assign({}, current.reportFlags || {}, overrides?.reportFlags || {});
  try{
    const { data, error } = await sb.from('pb_daily_activity_snapshots').upsert({
      user_id: pbUser.id,
      day: date,
      workout_completed: completed,
      workout_title: completed ? (next.workoutTitle || currentWorkoutTitle()) : null,
      workout_completed_at: workoutCompletedAt,
      report_flags: reportFlags,
      app_version: APP_VER,
      progress_epoch: pbProgressEpochId
    }, { onConflict:'user_id,day' }).select('day,workout_completed,workout_title,workout_completed_at,report_flags').maybeSingle();
    if(error) return false;
    const rec = normalizeDailyActivityRow(data);
    if(rec){
      dailyActivityRemote.rows = dailyActivityRemote.rows || {};
      dailyActivityRemote.rows[rec.date] = rec;
    }
    return !!rec;
  }catch(e){ return false; }
}
function retroWorkoutDates(){
  return nutritionDiaryDateWindow().filter(date => !nutritionDiaryIsToday(date));
}
function retroWorkoutDefaultTitle(date){
  const existing = dailyActivityForDate(date);
  return String(existing?.workoutTitle || '').trim() || 'Самостоятельная тренировка';
}
function retroWorkoutDaysAgo(date){
  const diff = diaryDateObject(dayKey(0)).getTime() - diaryDateObject(date).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}
async function openPastWorkoutEntry(){
  if(!sb || !pbUser || navigator.onLine === false){
    toast('Для записи в историю нужен интернет и вход в платформу');
    return;
  }
  if(!dailyActivityRemote.loaded) await pbLoadDailyActivitySnapshots();
  const dates = retroWorkoutDates();
  if(!dates.length){ toast('Прошлые дни пока недоступны'); return; }
  const firstDate = dates[0];
  openSheet(`<div class="lib-sheet-head"><div><h2>Добавить тренировку</h2><p class="sheet-sub">Запиши занятие за прошлый день. Оно попадёт в историю и недельный итог, но не добавит баллы или серию задним числом.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <form id="retroWorkoutForm" class="retro-workout-form">
      <label class="retro-workout-field"><span>Когда тренировался</span><select id="retroWorkoutDate">${dates.map(date => `<option value="${escapeHtml(date)}">${escapeHtml(diaryDateLabel(date))}</option>`).join('')}</select></label>
      <label class="retro-workout-field"><span>Какую тренировку выполнил</span><input id="retroWorkoutTitle" type="text" maxlength="120" autocomplete="off" value="${escapeHtml(retroWorkoutDefaultTitle(firstDate))}" placeholder="Например, силовая в зале" /></label>
      <p class="retro-workout-status" id="retroWorkoutStatus" role="status"></p>
      <p class="sheet-note">Мы сохраняем дату и название занятия. Рабочие веса и подходы продолжай вести в обычной тренировке.</p>
      <div class="retro-workout-actions"><button type="button" class="wkp-skip" id="retroWorkoutCancel">Отмена</button><button type="submit" class="primary shine" id="retroWorkoutSave">Сохранить в историю</button></div>
    </form>`);

  const form = $('appSheet')?.querySelector('#retroWorkoutForm');
  const dateInput = $('appSheet')?.querySelector('#retroWorkoutDate');
  const titleInput = $('appSheet')?.querySelector('#retroWorkoutTitle');
  const status = $('appSheet')?.querySelector('#retroWorkoutStatus');
  const saveButton = $('appSheet')?.querySelector('#retroWorkoutSave');
  const syncDetails = () => {
    const date = String(dateInput?.value || firstDate);
    const activity = dailyActivityForDate(date);
    if(titleInput) titleInput.value = retroWorkoutDefaultTitle(date);
    if(status) status.textContent = activity?.workoutCompleted
      ? 'За этот день уже есть запись. Можно уточнить её название.'
      : 'Добавим отметку о тренировке в выбранный день.';
  };
  syncDetails();
  dateInput?.addEventListener('change', syncDetails);
  $('appSheet')?.querySelector('#retroWorkoutCancel')?.addEventListener('click', closeSheet);
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const date = String(dateInput?.value || '');
    const title = String(titleInput?.value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if(!retroWorkoutDates().includes(date)){
      toast('Выбери день из доступной истории');
      return;
    }
    if(title.length < 2){
      if(status) status.textContent = 'Напиши короткое название тренировки.';
      titleInput?.focus();
      return;
    }
    const previous = dailyActivityForDate(date);
    if(saveButton){ saveButton.disabled = true; saveButton.textContent = 'Сохраняю...'; }
    const saved = await pbUpsertDailyActivitySnapshot({
      workoutCompleted: true,
      workoutTitle: title,
      workoutCompletedAt: null,
      reportFlags: Object.assign({}, previous?.reportFlags || {}, {
        manual_workout: true,
        manual_workout_recorded_at: new Date().toISOString()
      })
    }, date);
    if(!saved){
      if(saveButton){ saveButton.disabled = false; saveButton.textContent = 'Сохранить в историю'; }
      if(status) status.textContent = 'Не удалось сохранить. Проверь интернет и повтори ещё раз.';
      return;
    }
    try{ track('workout_logged_retroactively', 'training', { days_ago:retroWorkoutDaysAgo(date), updated:!!previous?.workoutCompleted }); }catch(e){}
    renderTodayDashboard();
    renderPrimeDay();
    renderPlan();
    renderMetrics();
    renderNutrition();
    closeSheet();
    toast(previous?.workoutCompleted ? `Обновил тренировку за ${diaryDateLabel(date)}` : `Тренировка за ${diaryDateLabel(date)} добавлена`);
  });
}
function renderSelectedDayActivity(){
  const box = $('diaryWorkoutStatus');
  if(!box) return;
  const date = selectedNutritionDate();
  const activity = dailyActivityForDate(date);
  const result = dailyResultForDate(date);
  const today = nutritionDiaryIsToday(date);
  const completed = !!activity?.workoutCompleted;
  box.classList.toggle('done', completed);
  box.classList.toggle('empty', !activity);
  const title = box.querySelector('b');
  const detail = box.querySelector('em');
  if(title) title.textContent = completed ? 'Выполнена' : (today ? 'Ещё не выполнена' : (activity ? 'Не выполнена' : 'Нет отметки'));
  if(detail){
    if(completed) detail.textContent = activity.workoutTitle || (today ? 'отмечено сегодня' : 'результат сохранён');
    else if(today) detail.textContent = 'результат появится после завершения';
    else detail.textContent = activity ? 'по сохранённому дневному отчёту' : 'данных за этот день нет';
  }
  if($('diaryResultEaten')) $('diaryResultEaten').textContent = `${result.intakeKcal} ккал`;
  if($('diaryResultActive')) $('diaryResultActive').textContent = result.activeEnergyKcal === null ? 'Нет данных' : `${result.activeEnergyKcal} ккал`;
  if($('diaryResultSteps')) $('diaryResultSteps').textContent = result.steps === null ? 'Нет данных' : result.steps.toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  if($('diaryResultBalance')){
    $('diaryResultBalance').textContent = result.intakeKcal <= 0 && result.activeEnergyKcal !== null
      ? `Питание не заполнено. Активная энергия: ${result.activeEnergyKcal} ккал.`
      : result.afterActivityKcal === null
      ? `${result.foodStatus}. Норма питания: ${result.targetKcal} ккал.`
      : `${result.foodStatus}. Еда минус активная энергия: ${result.afterActivityKcal} ккал.`;
  }
}
function weekdayLabel(offset){
  const d = new Date();
  d.setDate(d.getDate() - (offset || 0));
  return WEEKDAY[d.getDay()];
}
function todayHumanDate(){
  try{ return new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'short' }).format(new Date()).replace('.', ''); }
  catch(e){ return dayKey(0); }
}
function nutritionHistoryOwner(){
  if(pbUser && pbUser.id) return 'user:' + pbUser.id;
  return 'device:' + pbDeviceId();
}
function nutritionHistoryRecord(dateKey, items, water){
  const safeItems = items == null ? state.foodLog : items;
  const tt = nutritionTotalsFor(safeItems);
  return {
    source: HISTORY_SOURCE,
    owner: nutritionHistoryOwner(),
    date: dateKey,
    kcal: Math.max(0, Math.round(+tt.kcal || 0)),
    water: Math.max(0, Math.round((+(water == null ? state.water : water) || 0) * 10) / 10),
    p: Math.max(0, Math.round(+tt.p || 0)),
    f: Math.max(0, Math.round(+tt.f || 0)),
    c: Math.max(0, Math.round(+tt.c || 0)),
    items: nutritionHistoryItems(safeItems)
  };
}
function nutritionRecordFromRow(row){
  if(!row || !row.day) return null;
  return {
    source: HISTORY_SOURCE,
    owner: nutritionHistoryOwner(),
    date: row.day,
    kcal: Math.max(0, Math.round(+row.kcal || 0)),
    water: Math.max(0, Math.round((+row.water || 0) * 10) / 10),
    p: Math.max(0, Math.round(+row.protein || 0)),
    f: Math.max(0, Math.round(+row.fat || 0)),
    c: Math.max(0, Math.round(+row.carb || 0)),
    items: nutritionHistoryItems(row.items),
    remote: true
  };
}
function hasNutritionSnapshotActivity(rec){
  return !!rec
    && ((+rec.kcal || 0) > 0
      || (+rec.water || 0) > 0
      || (+rec.p || 0) > 0
      || (+rec.f || 0) > 0
      || (+rec.c || 0) > 0
      || nutritionRecordItems(rec).length > 0);
}
function isNutritionHistoryRecord(rec, dateKey){
  return !!rec
    && rec.source === HISTORY_SOURCE
    && rec.owner === nutritionHistoryOwner()
    && rec.date === dateKey
    && Number.isFinite(+rec.kcal)
    && Number.isFinite(+rec.water);
}
function sanitizeNutritionHistoryMap(history, owner, source){
  const clean = {};
  Object.keys(history || {}).forEach(k => {
    const rec = history[k];
    if(rec
      && rec.source === source
      && rec.owner === owner
      && rec.date === k
      && Number.isFinite(+rec.kcal)
      && Number.isFinite(+rec.water)){
      clean[k] = rec;
    }
  });
  return clean;
}
function syncNutritionHistoryOwner(){
  const owner = nutritionHistoryOwner();
  const storedOwner = WLStorage.getItem(HISTORY_OWNER_KEY);
  let changed = false;
  if(storedOwner !== owner){
    state.history = {};
    WLStorage.setItem(HISTORY_OWNER_KEY, owner);
    changed = true;
  } else {
    const clean = sanitizeNutritionHistoryMap(state.history, owner, HISTORY_SOURCE);
    changed = JSON.stringify(clean) !== JSON.stringify(state.history || {});
    state.history = clean;
  }
  if(changed) save();
}
function nutritionRecordForDay(dateKey){
  const remote = nutritionRemote.rows && nutritionRemote.rows[dateKey];
  const local = state.history && state.history[dateKey];
  const remoteOk = isNutritionHistoryRecord(remote, dateKey);
  const localOk = isNutritionHistoryRecord(local, dateKey);
  if(localOk && local.pending) return local;
  if(remoteOk){
    const localItems = localOk ? nutritionRecordItems(local) : [];
    return localItems.length && !nutritionRecordItems(remote).length ? Object.assign({}, remote, { items: localItems }) : remote;
  }
  return localOk ? local : null;
}
function nutritionRequestScope(){
  return { owner:pbUser?.id || null, epoch:pbProgressEpochId || null, historyOwner:nutritionHistoryOwner() };
}
function nutritionRequestIsCurrent(scope){
  return scope.owner === (pbUser?.id || null) && scope.epoch === (pbProgressEpochId || null)
    && scope.historyOwner === nutritionHistoryOwner() && !pbProgressResetting;
}
function pbNutritionOutbox(){
  if(!pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return null;
  return window.WLNutritionOutbox.create({storage:WLStorage,owner:pbUser.id,epoch:pbProgressEpochId});
}
function pbRestoreNutritionOutbox(){
  const outbox = pbNutritionOutbox();
  if(!outbox) return;
  rolloverCheck();
  let restored = false;
  for(const entry of outbox.pending()){
    const draft = entry.record;
    if(!nutritionDiaryDateAllowed(draft.date)) continue;
    applyNutritionRecordDraft(draft.date, draft);
    nutritionPendingDates.add(draft.date);
    nutritionSyncDrafts.set(draft.date, nutritionHistoryRecord(draft.date, draft.items, draft.water));
    restored = true;
  }
  if(restored) save();
}
function nutritionAgedDrafts(outbox){
  const firstEditable = dayKey(NUTRITION_DIARY_DAYS - 1);
  return outbox.pending().filter(entry => entry.record.date < firstEditable)
    .sort((a,b) => b.record.date.localeCompare(a.record.date));
}
function renderNutritionPendingNotice(){
  const root = $('nutritionPendingNotice');
  if(!root) return;
  root.hidden = true;
  root.innerHTML = '';
  try{
    const outbox = pbNutritionOutbox();
    if(!outbox) return;
    const entries = nutritionAgedDrafts(outbox);
    if(!entries.length) return;
    root.hidden = false;
    root.innerHTML = `<span>Записи без подтверждения отправки: ${entries.length}</span><button type="button" class="secondary"><i data-lucide="archive" aria-hidden="true"></i>Открыть записи</button>`;
    root.querySelector('button').addEventListener('click', openNutritionPendingArchive);
    try{window.lucide?.createIcons({root});}catch(e){}
  }catch(e){
    root.hidden = false;
    root.textContent = 'Не удалось прочитать неотправленные записи на устройстве.';
  }
}
function openNutritionPendingArchive(){
  const context = pbCaptureMediaContext();
  if(!context.isCurrent()) return;
  let outbox, entries;
  try{outbox = pbNutritionOutbox(); entries = outbox && nutritionAgedDrafts(outbox);}catch(e){}
  if(!entries?.length){toast('Неотправленные записи прошлых дней недоступны.');return;}
  openSheet(`<div class="lib-sheet-head"><h2>Неотправленные записи</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Эти записи остались на устройстве. Их даты уже вне семидневного срока редактирования; подтверждения сохранения на сервере нет.</p>
    <div class="nutrition-archive"><label for="nutritionArchiveDay">Дата записи</label><select id="nutritionArchiveDay">${entries.map(entry=>`<option value="${entry.id}">${entry.record.date}</option>`).join('')}</select>
    <div id="nutritionArchiveSummary"></div>
    <a id="nutritionArchiveDownload" class="secondary"><i data-lucide="download" aria-hidden="true"></i>Скачать копию дня</a>
    <p class="sheet-sub">Файл содержит личные данные. Сохранённая копия не загружается в дневник автоматически.</p>
    <label class="progress-reset-confirm"><input id="nutritionArchiveConfirm" type="checkbox" disabled><span>Копия сохранена. Убрать эту запись из очереди отправки.</span></label>
    <button id="nutritionArchiveRemove" class="secondary" disabled><i data-lucide="trash-2" aria-hidden="true"></i>Убрать из очереди</button>
    <p id="nutritionArchiveStatus" role="status"></p></div>`);
  const root = $('appSheet'), select = $('nutritionArchiveDay'), summary = $('nutritionArchiveSummary'),
    link = $('nutritionArchiveDownload'), confirm = $('nutritionArchiveConfirm'), remove = $('nutritionArchiveRemove'), status = $('nutritionArchiveStatus');
  if(!root || !select || !summary || !link || !confirm || !remove || !status) return;
  let active = true, url = null, selected = null, downloaded = false;
  const current = () => active && context.isCurrent() && select.isConnected && !root.hidden;
  const revoke = () => {if(url){URL.revokeObjectURL(url);url=null;}link.removeAttribute('href');};
  root.wlNutritionArchiveCleanup = () => {active=false;revoke();delete root.wlNutritionArchiveCleanup;};
  const choose = () => {
    revoke();downloaded=false;confirm.checked=false;confirm.disabled=true;remove.disabled=true;status.textContent='';
    selected = entries.find(entry=>entry.id===select.value);
    if(!current() || !selected) return;
    const record=selected.record, totals=nutritionTotalsFor(record.items);
    summary.innerHTML=`<p>${Math.round(totals.kcal)} ккал · Вода: ${record.water.toFixed(1)} л</p><ul>${record.items.map(item=>`<li>${escapeHtml(item.name || 'Без названия')}</li>`).join('')}</ul>`;
    try{
      url=URL.createObjectURL(new Blob([JSON.stringify({format:'fitness-nutrition-draft-v1',capturedAt:new Date().toISOString(),owner:context.owner,epoch:context.epoch,revision:selected.id,record},null,2)],{type:'application/json'}));
      link.href=url;link.download=`fitness-nutrition-${record.date}.json`;
    }catch(e){status.textContent='Не удалось подготовить копию. Запись не изменена.';}
  };
  select.addEventListener('change',choose);
  link.addEventListener('click',event=>{
    if(!current() || !url){event.preventDefault();return;}
    downloaded=true;confirm.disabled=false;
  });
  confirm.addEventListener('change',()=>{remove.disabled=!current() || !downloaded || !confirm.checked;});
  remove.addEventListener('click',()=>{
    if(!current() || remove.disabled || !downloaded || !confirm.checked || !selected) return;
    remove.disabled=true;
    try{
      const latest=nutritionAgedDrafts(outbox).find(entry=>entry.record.date===selected.record.date);
      if(!latest || latest.id!==selected.id || JSON.stringify(latest.record)!==JSON.stringify(selected.record)){
        status.textContent='Запись изменилась. Закрой окно и заново сохрани её копию.';return;
      }
      outbox.acknowledge(selected);
      const remains=outbox.pending().some(entry=>entry.record.date===selected.record.date);
      if(!remains){
        const date=selected.record.date, local=state.history[date];
        nutritionSyncDrafts.delete(date);nutritionPendingDates.delete(date);
        clearTimeout(nutritionSyncTimers.get(date));nutritionSyncTimers.delete(date);
        if(local && JSON.stringify({date,items:local.items,water:local.water})===JSON.stringify(selected.record)) delete state.history[date];
        save();
      }
      closeSheet();renderNutritionPendingNotice();
      toast('Запись убрана из очереди. Данные сервера не изменены.');
    }catch(e){status.textContent='Не удалось завершить очистку. Закрой окно и проверь оставшиеся записи.';}
  });
  choose();
  try{window.lucide?.createIcons({root});}catch(e){}
}
async function pbLoadNutritionSnapshots(){
  if(!sb || !pbUser) return;
  const scope = nutritionRequestScope();
  try{
    const from = dayKey(NUTRITION_DIARY_DAYS - 1), to = dayKey(0);
    let query = sb.from('pb_nutrition_snapshots').select('day,kcal,water,protein,fat,carb,items').eq('user_id', scope.owner);
    query = scope.epoch ? query.eq('progress_epoch', scope.epoch) : query.is('progress_epoch', null);
    const { data, error } = await query
      .gte('day', from).lte('day', to)
      .order('day', { ascending:false });
    if(error || !nutritionRequestIsCurrent(scope)) return;
    const rows = {};
    (data || []).forEach(row => {
      const rec = nutritionRecordFromRow(row);
      if(rec) rows[rec.date] = rec;
    });
    rolloverCheck();
    nutritionRemote = { loaded:true, rows };
    const today = dayKey(0), todayRecord = rows[today];
    if(todayRecord && !nutritionPendingDates.has(today)){
      state.foodLog = nutritionRecordItems(todayRecord);
      state.water = +todayRecord.water || 0;
      save();
    }
  }catch(e){}
}
async function pbBackfillNutritionSnapshots(){
  if(!sb || !pbUser || !nutritionRemote.loaded) return;
  const scope = nutritionRequestScope();
  try{
    const rows = [];
    for(let i = 1; i < NUTRITION_DIARY_DAYS; i++){
      const k = dayKey(i);
      const rec = state.history && state.history[k];
      if(!isNutritionHistoryRecord(rec, k) || !hasNutritionSnapshotActivity(rec) || rec.pending) continue;
      if(nutritionRemote.rows && nutritionRemote.rows[k]) continue;
      rows.push({
        user_id: scope.owner,
        device_id: pbDeviceId(),
        day: rec.date,
        kcal: Math.max(0, Math.round(+rec.kcal || 0)),
        water: Math.max(0, Math.round((+rec.water || 0) * 10) / 10),
        protein: Math.max(0, Math.round(+rec.p || 0)),
        fat: Math.max(0, Math.round(+rec.f || 0)),
        carb: Math.max(0, Math.round(+rec.c || 0)),
        items: nutritionHistoryItems(rec.items),
        source: 'local-backfill',
        app_version: APP_VER,
        progress_epoch: scope.epoch
      });
    }
    if(!rows.length) return;
    const { data, error } = await sb.from('pb_nutrition_snapshots')
      .upsert(rows, { onConflict:'user_id,day', ignoreDuplicates:true })
      .select('day,kcal,water,protein,fat,carb,items');
    if(error || !nutritionRequestIsCurrent(scope)) return;
    (data || []).forEach(row => {
      const rec = nutritionRecordFromRow(row);
      if(rec) nutritionRemote.rows[rec.date] = rec;
    });
    if(typeof refreshPeriodReportAfterNutritionSave === 'function') refreshPeriodReportAfterNutritionSave(rows.map(row => row.day));
  }catch(e){}
}
async function pbUpsertNutritionSnapshot(dateKey, record){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting) return false;
  const scope = nutritionRequestScope();
  try{
    if(!nutritionDiaryDateAllowed(dateKey)) return false;
    const date = String(dateKey);
    const sourceRec = record || (nutritionDiaryIsToday(date) ? nutritionHistoryRecord(date) : nutritionRecordForDay(date));
    if(!sourceRec) return false;
    const rec = nutritionHistoryRecord(date, nutritionRecordItems(sourceRec), sourceRec.water);
    const localAtStart = state.history?.[date];
    const { data, error } = await sb.from('pb_nutrition_snapshots').upsert({
      user_id: scope.owner,
      device_id: pbDeviceId(),
      day: rec.date,
      kcal: rec.kcal,
      water: rec.water,
      protein: rec.p,
      fat: rec.f,
      carb: rec.c,
      items: nutritionHistoryItems(rec.items),
      source: 'web',
      app_version: APP_VER,
      progress_epoch: scope.epoch
    }, { onConflict:'user_id,day' }).select('day,kcal,water,protein,fat,carb,items').maybeSingle();
    if(error || !nutritionRequestIsCurrent(scope)) return false;
    const rowRec = nutritionRecordFromRow(data);
    if(rowRec){
      nutritionRemote.rows[rowRec.date] = rowRec;
      // A later edit replaces the local record; an older acknowledgement must not replace it back.
      if(!nutritionDiaryIsToday(rowRec.date) && state.history[rowRec.date] === localAtStart){
        state.history[rowRec.date] = Object.assign({}, rowRec, { pending:false });
      }
      if(typeof refreshPeriodReportAfterNutritionSave === 'function') refreshPeriodReportAfterNutritionSave(rowRec.date);
    }
    return !!rowRec;
  }catch(e){ return false; }
}
async function pbFlushNutritionSnapshotSync(dateKey){
  const scope = nutritionRequestScope();
  if(!nutritionDiaryDateAllowed(dateKey)) return false;
  const date = String(dateKey);
  if(nutritionSyncInFlight.has(date)) return false;
  if(!nutritionSyncDrafts.has(date)) return true;
  let outbox, sent;
  try{
    outbox = pbNutritionOutbox();
    if(!outbox) return false;
    sent = outbox.pending().find(entry => entry.record.date === date);
  }catch(e){ return false; }
  if(!sent){ nutritionSyncDrafts.delete(date); nutritionPendingDates.delete(date); return true; }
  const pending = nutritionHistoryRecord(date, sent.record.items, sent.record.water);
  nutritionSyncDrafts.delete(date);
  nutritionSyncInFlight.add(date);
  let synced = await pbUpsertNutritionSnapshot(date, pending);
  nutritionSyncInFlight.delete(date);
  if(!nutritionRequestIsCurrent(scope)) return false;
  if(synced){
    try{
      outbox.acknowledge(sent);
      const next = outbox.pending().find(entry => entry.record.date === date);
      if(next) nutritionSyncDrafts.set(date, nutritionHistoryRecord(date, next.record.items, next.record.water));
    }catch(e){ synced = false; }
  }
  if(!synced && !nutritionSyncDrafts.has(date)) nutritionSyncDrafts.set(date, pending);
  if(nutritionSyncDrafts.has(date)){
    clearTimeout(nutritionSyncTimers.get(date));
    nutritionSyncTimers.set(date, setTimeout(() => {
      nutritionSyncTimers.delete(date);
      pbFlushNutritionSnapshotSync(date);
    }, synced ? 0 : 2000));
  } else if(synced){
    nutritionPendingDates.delete(date);
    const local = state.history[date];
    if(local?.pending && JSON.stringify(nutritionHistoryRecord(date, local.items, local.water)) === JSON.stringify(pending)){
      state.history[date] = Object.assign({}, local, {pending:false});
    }
  }
  return synced;
}
async function pbFlushNutritionSnapshotSyncQueue(){
  const dates = [...nutritionSyncDrafts.keys()];
  if(!dates.length) return true;
  const results = await Promise.all(dates.map(date => pbFlushNutritionSnapshotSync(date)));
  return results.every(Boolean);
}
function scheduleNutritionSnapshotSync(dateKey){
  const date = nutritionDiaryDateAllowed(dateKey) ? String(dateKey) : dayKey(0);
  const sourceRec = nutritionDiaryIsToday(date) ? nutritionHistoryRecord(date) : nutritionRecordForDay(date);
  if(!sourceRec) return;
  if(!hasNutritionSnapshotActivity(sourceRec) && !(nutritionRemote.rows && nutritionRemote.rows[date]) && !sourceRec.pending){
    nutritionPendingDates.delete(date);
    return;
  }
  const rec = nutritionHistoryRecord(date, nutritionRecordItems(sourceRec), sourceRec.water);
  nutritionPendingDates.add(date);
  nutritionSyncDrafts.set(date, rec);
  if(!sb || !pbUser) return;
  clearTimeout(nutritionSyncTimers.get(date));
  nutritionSyncTimers.set(date, setTimeout(() => {
    nutritionSyncTimers.delete(date);
    pbFlushNutritionSnapshotSync(date);
  }, 650));
}

// Смена суток: архивируем вчерашний день и обнуляем дневные счётчики.
function rolloverCheck(){
  if(rolloverInProgress) return;
  rolloverInProgress = true;
  let today;
  try{ today = dayKey(0); }catch{ rolloverInProgress = false; return; }
  if(!state.lastDay){
    // первый запуск: история пустая, реальные дни копятся по факту ведения дневника
    state.lastDay = today;
    save();
    rolloverInProgress = false;
    return;
  }
  if(state.lastDay !== today){
    state.history[state.lastDay] = nutritionHistoryRecord(state.lastDay);
    state.meals = [false, false, false, false];
    state.foodLog = [];
    state.water = 0;
    state.dayGuidePassed = false;
    state.dayWorkout = { date: '', items: [] };
    state.workoutResume = null;
    state.tasks.forEach(t => { t.done = false; });   // ежедневные цели обнуляются
    state.questClaimed = false;
    state.lastDay = today;
    const keep = {};
    for(let i = 0; i <= 14; i++) keep[dayKey(i)] = true;
    Object.keys(state.history).forEach(k => { if(!keep[k]) delete state.history[k]; });
    save();
  }
  rolloverInProgress = false;
}

function repeatNutritionFood(dateKey, index){
  const rec = nutritionRecordForDay(dateKey);
  const item = nutritionRecordItems(rec)[index];
  if(!item){ toast('Эта запись уже недоступна'); return; }
  addFood(item);
}
function repeatNutritionDay(dateKey){
  const rec = nutritionRecordForDay(dateKey);
  const items = nutritionRecordItems(rec);
  if(!items.length){ toast('В этом дне нет списка еды'); return; }
  const draft = nutritionRecordDraftForDate(selectedNutritionDate());
  draft.items = draft.items.concat(items.map(cloneFoodEntry));
  commitSelectedNutritionDraft(draft);
  toast(`Повторил день: ${items.length} ${mealsWord(items.length)}`);
}
function renderHistoryMeals(days){
  const box = $('historyMeals');
  if(!box) return;
  const rows = days.filter(d => !d.today && Array.isArray(d.items) && d.items.length).reverse();
  if(!rows.length){
    box.innerHTML = '<div class="history-meals-empty">Когда дневник переживёт хотя бы один день, здесь появится быстрый повтор еды.</div>';
    return;
  }
  box.innerHTML = '<div class="history-meals-title">Повторить питание</div>' + rows.map(d => {
    const kcal = Math.round(+d.kcal || 0);
    const items = d.items.slice(0, 6).map((x, i) =>
      `<button type="button" class="hist-food" data-repeat-food="${escapeHtml(d.date)}" data-i="${i}"><span>${escapeHtml(x.name)}</span><b>${fmtFoodNum(x.kcal)} ккал</b></button>`
    ).join('');
    return `<div class="hist-meal-day">
      <div class="hist-meal-head"><span><b>${escapeHtml(d.label)}</b><i>${kcal} ккал · ${d.items.length} ${mealsWord(d.items.length)}</i></span><button type="button" class="hist-repeat" data-repeat-day="${escapeHtml(d.date)}">Повторить день</button></div>
      <div class="hist-foods">${items}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-repeat-day]').forEach(btn => btn.addEventListener('click', () => repeatNutritionDay(btn.dataset.repeatDay)));
  box.querySelectorAll('[data-repeat-food]').forEach(btn => btn.addEventListener('click', () => repeatNutritionFood(btn.dataset.repeatFood, Number(btn.dataset.i))));
}
function renderHistory(){
  const chart = $('historyChart');
  if(!chart) return;
  const waterTarget = waterTargetLiters(planFromProfile());
  const target = state.kcal || 2150;
  const days = [];
  for(let i = 6; i >= 0; i--){
    if(i === 0){
      days.push({ date: dayKey(0), label: 'Сег', kcal: nutritionTotals().kcal, water: state.water, items: nutritionHistoryItems(state.foodLog), today: true });
    } else {
      let rec, label = '', date = '';
      try{ date = dayKey(i); rec = nutritionRecordForDay(date); label = weekdayLabel(i); }catch{ rec = null; }
      rec = rec || { kcal: 0, water: 0 };
      days.push({ date, label, kcal: rec.kcal || 0, water: rec.water || 0, items: nutritionRecordItems(rec), today: false });
    }
  }
  const maxK = Math.max(target, 2200, ...days.map(d => d.kcal));
  chart.innerHTML = days.map(d => {
    const hasKcal = d.kcal > 0;
    const hasWater = d.water > 0;
    const h = hasKcal ? Math.max(5, Math.round(d.kcal / maxK * 100)) : 0;
    const wPct = Math.min(100, Math.round(d.water / waterTarget * 100));
    const opacity = hasWater ? (0.28 + 0.72 * wPct / 100).toFixed(2) : '0.16';
    const full = d.water >= waterTarget ? ' full' : '';
    const title = `${d.today ? 'Сегодня' : d.label}: ${Math.round(d.kcal)} ккал, ${(+d.water || 0).toFixed(1)} л воды`;
    return `<div class="hist-col${d.today ? ' today' : ''}" title="${escapeHtml(title)}"><div class="hist-bar-wrap"><div class="hist-bar${hasKcal ? '' : ' empty'}" style="height:${h}%"></div></div><span class="hist-water${full}${hasWater ? '' : ' empty'}" style="opacity:${opacity}"></span><span class="hist-day">${escapeHtml(d.label)}</span></div>`;
  }).join('');
  const kcalDays = days.filter(d => d.kcal > 0);
  const waterDays = days.filter(d => d.water > 0);
  const avgK = kcalDays.length ? Math.round(kcalDays.reduce((s, d) => s + d.kcal, 0) / kcalDays.length) : 0;
  const avgW = waterDays.length ? (waterDays.reduce((s, d) => s + d.water, 0) / waterDays.length).toFixed(1) : '0.0';
  if($('histAvg')) $('histAvg').textContent = kcalDays.length ? `${avgK} ккал` : 'нет данных';
  if($('historySummary')) $('historySummary').innerHTML = (kcalDays.length || waterDays.length)
    ? `Среднее: <b>${avgK} ккал</b> · вода <b>${avgW} л</b>`
    : 'История появится после добавления еды или воды.';
  renderHistoryMeals(days);
}

// ============================================================
// База упражнений: локальные видео упражнений + Kinescope catalog videos
// ============================================================
const MUS_RU = {
  chest: 'Грудь', lats: 'Широчайшие', 'middle back': 'Спина', shoulders: 'Плечи',
  biceps: 'Бицепс', triceps: 'Трицепс', forearms: 'Предплечья', abdominals: 'Пресс',
  obliques: 'Косые', 'lower back': 'Поясница', traps: 'Трапеции', neck: 'Шея',
  quadriceps: 'Квадрицепс', hamstrings: 'Бицепс бедра', glutes: 'Ягодицы',
  calves: 'Икры', adductors: 'Приводящие', abductors: 'Отводящие'
};
const EQ_RU = {
  'body only': 'Свой вес', dumbbell: 'Гантели', barbell: 'Штанга', cable: 'Блок',
  machine: 'Тренажёр', kettlebells: 'Гири', bands: 'Резинки', 'medicine ball': 'Медбол',
  'exercise ball': 'Фитбол', 'e-z curl bar': 'EZ-гриф', 'foam roll': 'Ролик',
  bench: 'Скамья', pull_up_bar: 'Турник', parallel_bars: 'Брусья', v_handle: 'V-рукоять',
  rack: 'Силовая рама', step_platform: 'Платформа', hyperextension_bench: 'Скамья для гиперэкстензии', other: 'Другое'
};
const LVL_RU = { beginner: 'Новичок', intermediate: 'Средний', expert: 'Продвинутый' };
const FORCE_RU = { push: 'Жим', pull: 'Тяга', static: 'Статика' };
const LIB_MUSCLES = ['chest', 'lats', 'middle back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abdominals', 'obliques', 'lower back', 'traps', 'quadriceps', 'hamstrings', 'glutes', 'calves'];
const LIB_EQUIP = ['body only', 'dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands', 'medicine ball', 'exercise ball', 'e-z curl bar', 'bench', 'pull_up_bar', 'parallel_bars', 'v_handle', 'rack', 'step_platform', 'hyperextension_bench', 'foam roll', 'other'];
const LIB_LEVELS = ['beginner', 'intermediate', 'expert'];
const LIB_CAP = 60;
const EXERCISE_LIBRARY_EXPECTED_SIZE = 640;
const BAND_EXERCISE_LIBRARY_EXPECTED_SIZE = 34;
const EXERCISE_LIBRARY_TOTAL_SIZE = EXERCISE_LIBRARY_EXPECTED_SIZE + BAND_EXERCISE_LIBRARY_EXPECTED_SIZE;

let libData = null;
let libLoadPromise = null;
const libFilter = { muscle: null, equip: null, level: null, q: '' };

function validExerciseLibrary(data){ return Array.isArray(data)&&data.length>0&&data.every(e=>e.id&&e.datasetVersion===EXERCISE_DATASET_VERSION)&&new Set(data.map(e=>e.id)).size===data.length; }
function validBandExerciseLibrary(data){ return Array.isArray(data)&&data.every(e=>e.id&&e.datasetVersion===EXERCISE_DATASET_VERSION); }
async function ensureLibrary(){
  if(validExerciseLibrary(libData)) return libData;
  if(libLoadPromise) return libLoadPromise;
  libLoadPromise = (async () => {
    try{
      const [baseRes, bandRes] = await Promise.all([
        window.WLData.fetch(`exercises.json?v=${encodeURIComponent(EXERCISE_DATASET_VERSION)}&content=20260904`),
        window.WLData.fetch(`band-exercises.json?v=${encodeURIComponent(APP_VER)}`)
      ]);
      if(!baseRes.ok) throw new Error(`exercises.json ${baseRes.status}`);
      if(!bandRes.ok) throw new Error(`band-exercises.json ${bandRes.status}`);
      const [baseData, bandData] = await Promise.all([baseRes.json(), bandRes.json()]);
      if(!validExerciseLibrary(baseData) || !validBandExerciseLibrary(bandData)) throw new Error('exercise library is empty or invalid');
      const data = [...baseData, ...bandData];
      if(!validExerciseLibrary(data)) throw new Error('merged exercise library is invalid');
      libData = data;
      migrateSavedWorkoutState();
      buildLibChips();
      renderLibRail();
      renderLibGrid();
      return libData;
    }catch(error){
      libData = null;
      console.warn('Exercise library load failed', error);
      return null;
    }finally{
      libLoadPromise = null;
    }
  })();
  return libLoadPromise;
}

function libChipRow(container, items, labelFn, filterKey, allLabel){
  if(!container) return;
  const active = libFilter[filterKey];
  const all = `<button type="button" class="lib-chip${active ? '' : ' active'}" data-k="${filterKey}" data-v="">${allLabel}</button>`;
  container.innerHTML = all + items.map(v =>
    `<button type="button" class="lib-chip${active === v ? ' active' : ''}" data-k="${filterKey}" data-v="${escapeHtml(v)}">${escapeHtml(labelFn(v))}</button>`
  ).join('');
  container.querySelectorAll('.lib-chip').forEach(btn => btn.addEventListener('click', () => {
    libFilter[filterKey] = btn.dataset.v || null;
    buildLibChips();
    renderLibGrid();
  }));
}

function buildLibChips(){
  libChipRow($('libMuscles'), LIB_MUSCLES, m => MUS_RU[m] || m, 'muscle', 'Все мышцы');
  libChipRow($('libEquip'), LIB_EQUIP, e => EQ_RU[e] || e, 'equip', 'Любое');
  libChipRow($('libLevel'), LIB_LEVELS, l => LVL_RU[l] || l, 'level', 'Любой');
  const eq = $('libEquip'), lv = $('libLevel');
  if(eq) eq.classList.add('equip');
  if(lv) lv.classList.add('level');
}

function libMatch(e){
  if(!exerciseHasVideo(e)) return false;
  if(libFilter.muscle && !(e.primary || []).includes(libFilter.muscle) && !(e.secondary || []).includes(libFilter.muscle)) return false;
  if(libFilter.equip && e.equipment !== libFilter.equip) return false;
  if(libFilter.level && e.level !== libFilter.level) return false;
  if(libFilter.q && !(e.name + ' ' + (e.nameRu || '')).toLowerCase().includes(libFilter.q)) return false;
  return true;
}
function exerciseName(e){
  return e?.displayNameSimple || e?.nameRu || e?.name || 'Упражнение';
}
function exerciseMediaNeedsReview(e){
  const txt = exerciseText(e);
  const pose = String(e?.pose || '');
  const equipment = String(e?.equipment || '').toLowerCase();
  const flags = Array.isArray(e?.contentFlags) ? e.contentFlags : [];
  const barbellOnlyPoses = ['bench_barbell', 'ohp_barbell', 'row_barbell', 'squat_barbell', 'deadlift'];
  const genericStrengthPoses = [
    'bench_barbell', 'ohp_barbell', 'row_barbell', 'squat_barbell', 'deadlift',
    'bicep_curl_bar', 'bicep_curl_db', 'tricep_ext', 'crunch', 'pushup',
    'squat_bw', 'jump', 'stretch_lower', 'stretch_upper', 'hip_thrust', 'lunge', 'shrug'
  ];
  if(flags.some(f => /media_mismatch|media_review/.test(String(f)))) return true;
  if(flags.includes('advanced_only')) return true;
  if(['needs_review', 'placeholder', 'rejected'].includes(String(e?.mediaStatus || ''))) return true;
  if(/гир[ияь]|kettlebell/.test(txt) && barbellOnlyPoses.includes(pose)) return true;
  if(/гир[ияь]|kettlebell/.test(txt) && ['shrug', 'lateral_raise', 'bicep_curl_db'].includes(pose)) return true;
  if(/к подбородку|upright/.test(txt) && pose === 'row_cable') return true;
  if(/доск|board press/.test(txt) && pose !== 'bench_barbell') return true;
  if(/мах.*ног|отвед.*ног|kickback|leg lift/.test(txt) && ['hip_thrust', 'stretch_lower', 'lunge'].includes(pose)) return true;
  if(/зашаг|тумб|step-up|box/.test(txt) && ['lunge', 'squat_bw', 'jump'].includes(pose)) return true;
  if(/л[её]жа|с пола|на животе|стоя на коленях|лодыжка на колене/.test(txt)
    && ['ohp_barbell', 'deadlift', 'row_barbell', 'stretch_lower'].includes(pose)) return true;
  if(e?.category === 'stretching' && /вращ|стоп|колен|предплеч|запяст|ankle|knee|forearm|wrist/.test(txt)) return true;
  if(['machine', 'cable', 'bands', 'foam roll', 'medicine ball', 'exercise ball', 'e-z curl bar', 'kettlebells'].includes(equipment)
    && genericStrengthPoses.includes(pose)) return true;
  if(equipment === 'other' && /сан|канат|мяч|цеп|ролик|скам|тумб|sled|rope|ball|chain|roller|box/.test(txt)
    && genericStrengthPoses.includes(pose)) return true;
  return false;
}
function exerciseMediaHidden(e){
  return e?.mediaStatus === 'hidden' || e?.hideMedia === true || exerciseMediaNeedsReview(e);
}
function exerciseMediaNote(e){
  return e?.mediaNote || 'Картинка для этого упражнения пока на проверке. Ориентируйся на описание техники.';
}
function mediaReportButton(kind, id, name){
  if(window.WL_CONFIG?.features?.mediaReports!==true)return '';
  return `<button type="button" class="media-report" data-report-kind="${escapeHtml(kind)}" data-report-id="${escapeHtml(id || '')}" data-report-name="${escapeHtml(name || '')}">Картинка не соответствует</button>`;
}
function bindMediaReports(root){
  const context = pbCaptureMediaContext();
  let actionsPromise;
  const actions = () => actionsPromise || (actionsPromise = pbCreateMediaScope(context).then(scope =>
    window.WLMediaReportActions.create({ client:scope.client, owner:scope.owner, isCurrent:scope.isCurrent })
  ).catch(error => { actionsPromise = null; throw error; }));
  (root || document).querySelectorAll('[data-report-kind]').forEach(btn => {
    if(btn.dataset.reportBound) return;
    btn.dataset.reportBound = '1';
    const item = { kind:btn.dataset.reportKind || '', id:btn.dataset.reportId || '',
      name:(btn.dataset.reportName || '').slice(0,256), appVersion:String(APP_VER).slice(0,40) };
    const current = () => context.isCurrent() && btn.isConnected;
    const show = status => {
      btn.disabled = status === 'sent';
      btn.textContent = status === 'sent' ? 'Отправлено на проверку' : status === 'pending' ? 'Повторить отправку' : 'Картинка не соответствует';
    };
    let sending = false;
    actions().then(api => { if(current() && !sending) show(api.status(item)); }).catch(() => {});
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if(!current() || sending) return;
      sending = true; btn.disabled = true; btn.textContent = 'Отправляем...';
      try{
        const api = await actions();
        if(!current()) return;
        await api.submit(item);
        if(!current()) return;
        show('sent'); toast('Спасибо, отправили на проверку');
      }catch(error){
        if(!current()) return;
        show('pending'); toast('Отправка не подтверждена. Повторите попытку.');
      }finally{ sending = false; }
    });
  });
}

function renderLibGrid(){
  const grid = $('libGrid');
  if(!grid || !libData) return;
  const res = libData.filter(libMatch);
  if($('libCount')) $('libCount').textContent = res.length;
  if(!res.length){ grid.innerHTML = '<div class="lib-empty">Ничего не нашлось. Сбрось фильтры или измени запрос.</div>'; return; }
  const shown = res.slice(0, LIB_CAP);
  const g = state.poseGender === 'f' ? 'f' : 'm';
  grid.innerHTML = shown.map(e => {
    const mus = MUS_RU[(e.primary || [])[0]] || '';
    const media = e.poster
      ? `<img class="lib-card-img lib-card-video-img" loading="lazy" src="${escapeHtml(e.poster)}" alt="" onerror="this.style.visibility='hidden'" />`
      : exerciseMediaHidden(e)
      ? `<span class="lib-card-img lib-card-img-missing"><b>Показать технику</b></span>`
      : `<img class="lib-card-img" loading="lazy" src="${escapeHtml(poseSrc(e.pose || 'pushup', g))}" alt="" onerror="this.style.visibility='hidden'" />`;
    return `<button type="button" class="lib-card" data-id="${escapeHtml(e.id)}">
      ${media}
      <span class="lib-card-b"><b>${escapeHtml(exerciseName(e))}</b><span>${escapeHtml(mus)}</span><span class="lib-card-lvl">${escapeHtml(LVL_RU[e.level] || e.level || '')}</span></span>
    </button>`;
  }).join('') + (res.length > LIB_CAP ? `<div class="lib-more">Показаны первые ${LIB_CAP} из ${res.length} — уточни фильтр или поиск</div>` : '');
  grid.querySelectorAll('.lib-card').forEach(btn => btn.addEventListener('click', () => {
    const ex = libData.find(x => String(x.id) === btn.dataset.id);
    if(ex) openLibDetail(ex);
  }));
}

// Разборы Форма — видеобиблиотека по локациям/уровням (Kinescope)
let nikitaVideos = null, videoLoc = 'Дом';
const VID_LOCS = ['Дом', 'Зал', 'Площадка'];
const VID_LVLS = ['Новичок', 'Средний', 'Продвинутый'];
async function ensureVideos(){
  if(nikitaVideos) return nikitaVideos;
  try { const r = await window.WLData.fetch('videos.json?v=load1'); nikitaVideos = await r.json(); }
  catch(e){ nikitaVideos = []; }
  return nikitaVideos;
}
function nikitaPoster(v){
  const id = String(v && v.videoId || '').trim();
  return (v && v.poster) || (id ? `assets/posters/${id}.webp` : '');
}
function localVideoSrc(v){
  return (v && (v.src || v.videoSrc)) || '';
}
function videoSourceLabel(v){
  return v && v.source === 'itfit' ? 'видео техники' : 'видео Форма';
}
function playableVideoHtml(v,title){ const src=localVideoSrc(v);if(!src)return '<p>Видеоматериал не подключён</p>';const attribute=src.startsWith('/api/media/')?'data-private-video':'src';return '<video controls playsinline preload="metadata" style="width:100%;max-height:60vh" '+attribute+'="'+escapeHtml(src)+'" poster="'+escapeHtml(v.poster||'assets/neutral/training.png')+'" aria-label="'+escapeHtml(title||v.name||'Видео')+'"></video>'; }
let stretchingLessons = null;
let stretchingPlaybackCleanup = null;
function stretchingListHtml(items, className = ''){
  return `<ul${className ? ` class="${className}"` : ''}>${items.map(item => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul>`;
}
function stretchingPlanHtml(items){
  return `<ol class="stretching-plan">${items.map((item, index) => `<li><span>${index + 1}</span><div><b>${escapeHtml(String(item.title))}</b><p>${escapeHtml(String(item.description))}</p></div></li>`).join('')}</ol>`;
}
function stretchingHasAccess(subscription, lessonId, now = Date.now()){
  if(!subscription || !['active', 'trial'].includes(subscription.status)
    || !(Date.parse(subscription.current_period_end || subscription.expires_at || '') > now)) return false;
  return pbIsTrial24Subscription(subscription) ? lessonId === 'back-relax' : subscription.status === 'active';
}
async function renderStretching(){
  const root = $('stretchingLessons');
  if(!root) return;
  root.innerHTML = '<p role="status">Загрузка занятий…</p>';
  try{
    if(!stretchingLessons){
      const response = await window.WLData.fetch('stretching.json?v=2');
      if(!response.ok) throw new Error('Catalog unavailable');
      const lessons = await response.json();
      if(!Array.isArray(lessons) || !lessons.length || lessons.some(v => !v.id || !v.name || !/^[a-f0-9-]{36}$/i.test(v.videoId) || !Number.isFinite(v.duration) || !v.description || !v.level || !v.intensity || !Array.isArray(v.equipment) || !v.equipment.length || !Array.isArray(v.plan) || !v.plan.length || !Array.isArray(v.recommendations) || !v.recommendations.length)) throw new Error('Invalid catalog');
      stretchingLessons = lessons;
    }
    const trial = pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0;
    root.innerHTML = stretchingLessons.map(v => {
      const locked = trial && !stretchingHasAccess(pbSubscription, v.id);
      return `<article class="stretching-lesson"><img src="${escapeHtml(v.poster)}" alt="" loading="lazy" width="960" height="540"><div class="stretching-lesson-body"><span>${escapeHtml(v.eyebrow || 'Растяжка')}</span><h3>${escapeHtml(v.name)}</h3><p class="stretching-lesson-meta">${escapeHtml(v.instructor)} · ${Math.round(v.duration / 60)} мин · ${escapeHtml(v.level)}${trial && locked ? ' · По подписке' : ''}</p><p class="stretching-lesson-description">${escapeHtml(v.description)}</p><button type="button" class="${locked ? 'secondary' : 'primary'}" data-stretching="${escapeHtml(v.id)}">${locked ? 'Открыть по подписке' : 'Открыть занятие'}</button></div></article>`;
    }).join('');
    root.querySelectorAll('[data-stretching]').forEach(button => button.addEventListener('click', () => openStretchingLesson(button.dataset.stretching)));
  }catch(error){
    root.innerHTML = '<p role="alert">Не удалось загрузить занятия.</p><button type="button" class="secondary" id="retryStretching">Повторить</button>';
    $('retryStretching')?.addEventListener('click', renderStretching);
  }
}
function openStretchingLesson(id){
  const lesson = stretchingLessons?.find(v => v.id === id);
  if(!lesson) return;
  if(!stretchingHasAccess(pbSubscription, id) && !pbPreviewMode()){
    pbShowTrialUpsell('Занятия по растяжке доступны по подписке.');
    return;
  }
  const focus = (lesson.focus || []).map(item => `<span>${escapeHtml(String(item))}</span>`).join('');
  openSheet(`<header class="stretching-detail-header"><div><span>${escapeHtml(lesson.eyebrow || 'Растяжка')}</span><h2>${escapeHtml(lesson.name)}</h2></div><button type="button" class="lib-close" aria-label="Закрыть занятие">×</button></header><div class="stretching-player" aria-label="Видео тренировки">${playableVideoHtml(lesson, lesson.name)}</div><main class="stretching-detail-content"><section class="stretching-detail-intro" aria-labelledby="stretchingAbout"><span class="stretching-detail-coach">Восстановление</span><h3 id="stretchingAbout">О занятии</h3><p>${escapeHtml(lesson.description)}</p></section><div class="stretching-detail-facts" aria-label="Параметры занятия"><span><small>Длительность</small><b>${Math.round(lesson.duration / 60)} мин</b></span><span><small>Уровень</small><b>${escapeHtml(lesson.level)}</b></span><span><small>Нагрузка</small><b>${escapeHtml(lesson.intensity)}</b></span></div><section class="stretching-detail-section"><h3>Основной фокус</h3><div class="stretching-focus">${focus}</div></section><section class="stretching-detail-section"><h3>Инвентарь</h3>${stretchingListHtml(lesson.equipment, 'stretching-checklist')}</section><section class="stretching-detail-section"><h3>Перед началом</h3>${stretchingListHtml(lesson.preparation || [], 'stretching-checklist')}</section><section class="stretching-detail-section"><h3>Структура занятия</h3>${stretchingPlanHtml(lesson.plan)}</section><section class="stretching-detail-section"><h3>Рекомендации</h3>${stretchingListHtml(lesson.recommendations, 'stretching-advice')}</section><section class="stretching-detail-section"><h3>После занятия</h3>${stretchingListHtml(lesson.after || [], 'stretching-advice')}</section><aside class="stretching-caution"><b>Обрати внимание</b><p>${escapeHtml(lesson.caution || '')}</p></aside><button type="button" class="secondary stretching-detail-close" data-stretching-close>Вернуться к занятиям</button></main>`);
  const overlay = $('appSheet');
  overlay?.classList.add('stretching-detail-overlay');
  overlay?.querySelector('.lib-sheet')?.classList.add('stretching-detail-sheet');
  overlay?.querySelector('[data-stretching-close]')?.addEventListener('click', () => closeSheet());
  const checkAccess = () => {
    if(stretchingHasAccess(pbSubscription, id) || pbPreviewMode()) return;
    closeSheet();
    pbShowPaywall(pbSubscription);
  };
  const timer = setInterval(checkAccess, 1000);
  document.addEventListener('visibilitychange', checkAccess);
  stretchingPlaybackCleanup = () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', checkAccess);
  };
}
function nikitaThumb(v, extraClass){
  const src = nikitaPoster(v);
  return `<span class="nikita-thumb ${extraClass || ''}${src ? '' : ' poster-missing'}">${src ? `<img class="nikita-poster" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />` : ''}<span class="nikita-play" aria-hidden="true"></span></span>`;
}
function bindNikitaPosterFallback(root){
  (root || document).querySelectorAll('.nikita-poster').forEach(img => {
    img.addEventListener('error', () => {
      const thumb = img.closest('.nikita-thumb');
      if(thumb) thumb.classList.add('poster-missing');
      img.remove();
    }, { once: true });
  });
}
function renderVideos(){
  if(!nikitaVideos) return;
  if($('vidCount')) $('vidCount').textContent = nikitaVideos.length;
  const tabs = $('vidTabs');
  if(tabs){
    tabs.innerHTML = VID_LOCS.map(l => `<button type="button" class="vid-tab${l === videoLoc ? ' on' : ''}" data-loc="${escapeHtml(l)}">${escapeHtml(l)} · ${nikitaVideos.filter(v => v.loc === l).length}</button>`).join('');
    tabs.querySelectorAll('.vid-tab').forEach(b => b.addEventListener('click', () => { videoLoc = b.dataset.loc; renderVideos(); }));
  }
  const list = $('vidList');
  if(!list) return;
  const inLoc = nikitaVideos.filter(v => v.loc === videoLoc);
  list.innerHTML = VID_LVLS.map(lvl => {
    const items = inLoc.filter(v => v.level === lvl);
    if(!items.length) return '';
    return `<div class="vid-group"><h3 class="vid-lvl">${escapeHtml(lvl)} · ${items.length}</h3><div class="vid-grid">${items.map(v => `<button type="button" class="vid-item" data-id="${escapeHtml(v.videoId)}" data-name="${escapeHtml(v.name)}" data-sub="${escapeHtml(v.loc + ' · ' + v.level)}">${nikitaThumb(v, 'vid-thumb')}<span class="vid-copy"><b>${escapeHtml(v.name)}</b><span>${escapeHtml(v.level)}</span></span></button>`).join('')}</div></div>`;
  }).join('');
  bindNikitaPosterFallback(list);
  list.querySelectorAll('.vid-item').forEach(b => b.addEventListener('click', () => {
    const full = (nikitaVideos || []).find(v => String(v.videoId) === String(b.dataset.id));
    openLibVideo(full || { name: b.dataset.name, muscle: b.dataset.sub, videoId: b.dataset.id });
  }));
}

function renderLibRail(){
  const rail = $('libRail');
  if(!rail) return;
  if(!nikitaVideos){ ensureVideos().then(renderLibRail); return; }
  if($('libRailCount')) $('libRailCount').textContent = nikitaVideos.length;
  const tabs = $('libVidTabs');
  if(tabs){
    tabs.innerHTML = VID_LOCS.map(l => `<button type="button" class="vid-tab${l === videoLoc ? ' on' : ''}" data-loc="${escapeHtml(l)}">${escapeHtml(l)} · ${nikitaVideos.filter(v => v.loc === l).length}</button>`).join('');
    tabs.querySelectorAll('.vid-tab').forEach(b => b.addEventListener('click', () => { videoLoc = b.dataset.loc; renderLibRail(); }));
  }
  const items = nikitaVideos.filter(v => v.loc === videoLoc);
  rail.innerHTML = items.map(v =>
    `<button type="button" class="lib-rail-item" data-id="${escapeHtml(v.videoId)}" data-name="${escapeHtml(v.name)}" data-sub="${escapeHtml(v.loc + ' · ' + v.level)}">${nikitaThumb(v, 'lib-rail-thumb')}<b>${escapeHtml(v.name)}</b><span>${escapeHtml(v.level)}</span></button>`
  ).join('');
  bindNikitaPosterFallback(rail);
  rail.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', () => {
    const full = (nikitaVideos || []).find(v => String(v.videoId) === String(btn.dataset.id));
    openLibVideo(full || { name: btn.dataset.name, muscle: btn.dataset.sub, videoId: btn.dataset.id });
  }));
}

function libTags(e){
  const t = [];
  (e.primary || []).forEach(m => t.push(`<span class="lib-tag prim">${escapeHtml(MUS_RU[m] || m)}</span>`));
  (e.secondary || []).forEach(m => t.push(`<span class="lib-tag">${escapeHtml(MUS_RU[m] || m)}</span>`));
  if(e.equipment) t.push(`<span class="lib-tag">${escapeHtml(EQ_RU[e.equipment] || e.equipment)}</span>`);
  if(e.level) t.push(`<span class="lib-tag">${escapeHtml(LVL_RU[e.level] || e.level)}</span>`);
  if(e.force && FORCE_RU[e.force]) t.push(`<span class="lib-tag">${escapeHtml(FORCE_RU[e.force])}</span>`);
  return t.join('');
}

function poseSrc(){return 'assets/neutral/training.png';}

function openLibDetail(e){
  if(!exerciseHasVideo(e)){ toast('У этого упражнения пока нет видео. Выбери замену из базы.'); return; }
  const o = $('libDetail');
  if(!o) return;
  const steps = ((e.stepsRu && e.stepsRu.length ? e.stepsRu : e.steps) || []).filter(s => s && s.trim()).map(s => `<li>${escapeHtml(s)}</li>`).join('');
  const g = state.poseGender === 'f' ? 'f' : 'm';
  const pose = e.pose || 'pushup';
  const media = e.videoSrc
    ? `<div class="lib-media">
      <button type="button" class="video-cover local-video-cover" data-play-exercise-video>
        ${nikitaThumb({ poster: e.poster, videoId: e.youtubeId }, 'video-cover-thumb')}
        <span class="video-cover-copy"><b>Смотреть технику</b><span>Видео · ${escapeHtml(EQ_RU[e.equipment] || e.equipment || '')}</span></span>
      </button>
    </div>`
    : exerciseMediaHidden(e)
    ? `<div class="pose-note">${escapeHtml(exerciseMediaNote(e))}</div>`
    : `<div class="pose-demo pose-two">
      <div class="pose-toggle" role="group" aria-label="Пол модели">
        <button type="button" class="pose-g${g === 'm' ? ' on' : ''}" data-g="m">М</button>
        <button type="button" class="pose-g${g === 'f' ? ' on' : ''}" data-g="f">Ж</button>
      </div>
      <div class="pose-frames">
        <figure class="pose-frame"><img class="pose-img" data-frame="start" loading="lazy" src="${poseSrc(pose, g, 'start')}" alt="Исходное положение: ${escapeHtml(exerciseName(e))}" onerror="this.closest('.pose-frame').classList.add('frame-missing')" /><figcaption>① Исходное</figcaption></figure>
        <figure class="pose-frame"><img class="pose-img" data-frame="exec" loading="lazy" src="${poseSrc(pose, g)}" alt="Выполнение: ${escapeHtml(exerciseName(e))}" onerror="this.closest('.pose-frame').classList.add('frame-missing')" /><figcaption>② Выполнение</figcaption></figure>
      </div>
    </div>`;
  o.innerHTML = `<div class="lib-sheet">
    <div class="lib-sheet-head"><h2>${escapeHtml(exerciseName(e))}</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    ${media}
    ${mediaReportButton('exercise', e.id, exerciseName(e))}
    <div class="lib-tags">${libTags(e)}</div>
    ${steps ? `<h3>Как делать</h3><ol class="lib-steps">${steps}</ol>` : ''}
  </div>`;
  o.hidden = false;
  o.querySelector('.lib-close')?.addEventListener('click', closeLibDetail);
  bindMediaReports(o);
  o.querySelector('[data-play-exercise-video]')?.addEventListener('click', () => {
    const mediaBox = o.querySelector('.lib-media');
    if(mediaBox) mediaBox.innerHTML = playableVideoHtml({ src: e.videoSrc, poster: e.poster, name: exerciseName(e) }, exerciseName(e));
  });
  if(!exerciseMediaHidden(e)) o.querySelectorAll('.pose-g').forEach(btn => btn.addEventListener('click', () => {
    const ng = btn.dataset.g;
    state.poseGender = ng; save();
    o.querySelectorAll('.pose-g').forEach(b => b.classList.toggle('on', b.dataset.g === ng));
    o.querySelectorAll('.pose-frame').forEach(fr => fr.classList.remove('frame-missing'));
    const imgs = o.querySelectorAll('.pose-img');
    imgs.forEach(im => { im.src = poseSrc(pose, ng, im.dataset.frame === 'start' ? 'start' : ''); });
  }));
}

function openLibVideo(v){
  const o = $('libDetail');
  if(!o || !v) return;
  const sub = v.muscle || [v.loc, v.level].filter(Boolean).join(' · ');
  const steps = ((Array.isArray(v.steps) ? v.steps : []) || []).filter(s => s && String(s).trim()).map(s => `<li>${escapeHtml(s)}</li>`).join('');
  const sourceLabel = videoSourceLabel(v);
  o.innerHTML = `<div class="lib-sheet">
    <div class="lib-sheet-head"><h2>${escapeHtml(v.name)}</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="lib-media">
      <button type="button" class="video-cover${localVideoSrc(v) ? ' local-video-cover' : ''}" data-play-video>
        ${nikitaThumb(v, 'video-cover-thumb')}
        <span class="video-cover-copy"><b>Смотреть разбор</b><span>${escapeHtml(sub || sourceLabel)}</span></span>
      </button>
    </div>
    <div class="lib-tags"><span class="lib-tag prim">${escapeHtml(sub)}</span><span class="lib-tag">${escapeHtml(sourceLabel)}</span></div>
    ${steps ? `<h3>Техника выполнения</h3><ol class="lib-steps video-steps">${steps}</ol>` : ''}
  </div>`;
  o.hidden = false;
  o.querySelector('.lib-close')?.addEventListener('click', closeLibDetail);
  bindNikitaPosterFallback(o);
  o.querySelector('[data-play-video]')?.addEventListener('click', () => {
    const media = o.querySelector('.lib-media');
    if(media) media.innerHTML = playableVideoHtml(v, v.name);
  });
}

function closeLibDetail(){ const o = $('libDetail'); if(o){ o.hidden = true; o.innerHTML = ''; } }

function bindLibrary(){
  const s = $('libSearch');
  if(s) s.addEventListener('input', () => { libFilter.q = s.value.trim().toLowerCase(); renderLibGrid(); });
  const o = $('libDetail');
  if(o) o.addEventListener('click', event => { if(event.target === o) closeLibDetail(); });
  document.addEventListener('keydown', event => { if(event.key === 'Escape') closeLibDetail(); });
}

// ============================================================
// Генератор тренировки (на базе exercises.json + анкеты)
// ============================================================
const GEN_SCHEME = {
  'Сушка': { label: 'жиросжигание', sets: 3, reps: '12–15', rest: '45 сек' },
  'Набор': { label: 'набор массы', sets: 4, reps: '8–10', rest: '90 сек' },
  'Поддержание': { label: 'поддержание', sets: 3, reps: '10–12', rest: '60 сек' }
};
const INV_EQUIP = {
  'Ничего нет': ['body only'],
  'Резинки': ['body only', 'bands'],
  'Резинки + гантели': ['body only', 'dumbbell', 'bands'],
  'Полный зал': ['body only', 'dumbbell', 'barbell', 'cable', 'machine', 'kettlebells', 'bands', 'medicine ball', 'exercise ball', 'bench', 'pull_up_bar', 'parallel_bars', 'v_handle', 'rack', 'step_platform', 'hyperextension_bench', 'foam roll', 'other'],
  'Турник + площадка': ['body only', 'bands', 'pull_up_bar', 'parallel_bars', 'step_platform']
};
const LEVEL_MAP = { 'Новичок': ['beginner'], 'Любитель': ['beginner', 'intermediate'], 'Подготовленный атлет': ['beginner', 'intermediate', 'expert'] };
const ADVANCED_EXERCISE_RE = /(\bchains?\b|(?:^|[^а-яё])цеп(?:ь|и|ями|ью)?(?:$|[^а-яё])|\bclean\b|взят|клин|рывок|snatch|jerk|rack pull|rack pulls|силов(?:ая|ой)\s+рам|supporting|поддерживающ|car deadlift|автомобил|axle|thick bar|толстым гриф|strongman|rickshaw|рикша|reverse band)/i;
const GEN_MIN_EXERCISES = 3;
const GEN_MAX_EXERCISES = 20;
const genState = { muscles: new Set(), equip: new Set(), count: 5, _init: false };
function clampGeneratorExerciseCount(value){
  return Math.max(GEN_MIN_EXERCISES, Math.min(GEN_MAX_EXERCISES, Math.round(Number(value) || GEN_MIN_EXERCISES)));
}
const FOCUS_MUSCLE_MAP = {
  'Спина': ['lats', 'middle back', 'lower back'],
  'Грудь': ['chest'],
  'Плечи': ['shoulders', 'traps'],
  'Руки': ['biceps', 'triceps', 'forearms'],
  'Пресс': ['abdominals', 'obliques'],
  'Ягодицы': ['glutes', 'hamstrings'],
  'Ноги': ['quadriceps', 'hamstrings', 'calves', 'glutes'],
  'Мобильность': ['lower back', 'abdominals', 'glutes']
};

function profileFocusMuscles(p){
  const selected = String(p.focusZones || '').split(',').map(s => s.trim()).filter(Boolean);
  const muscles = selected.flatMap(z => FOCUS_MUSCLE_MAP[z] || []);
  return [...new Set(muscles)].filter(m => LIB_MUSCLES.includes(m));
}
function profileHealthText(p){
  return [
    p?.injuries,
    p?.medicalFlags,
    p?.limits,
    p?.medications,
    p?.diagnosis,
    p?.diagnoses
  ].map(x => String(x || '').trim()).filter(Boolean).join(' · ');
}
function hasMedicalCaution(p){
  return !!profileHealthText(p);
}
function hasDiastasisRisk(p){
  const txt = profileHealthText(p);
  return /диастаз|diastas|diastasis|расхождени[ея].{0,40}(прям|мышц|живот|брюш)/i.test(txt);
}
function healthHas(p, re){
  return re.test(profileHealthText(p));
}
function medicalTrainingDisclaimer(p){
  if(!hasMedicalCaution(p)) return '';
  const prefix = hasDiastasisRisk(p)
    ? 'Диастаз учтён: убрал упражнения с высоким внутрибрюшным давлением.'
    : 'Ограничения из анкеты учтены в подборе нагрузки.';
  return `${prefix} Тренировка — рекомендация сервиса, а не медицинское назначение по диагнозу. Перед началом занятий и при боли проконсультируйся с врачом или реабилитологом.`;
}
function profileIsFemale(p){
  return String(p?.gender || '').toLowerCase().includes('жен');
}
function trainingLoadProfile(p){
  const female = profileIsFemale(p);
  const advanced = p.level === 'Подготовленный атлет';
  const light = p.mode === 'Лёгкий' || hasMedicalCaution(p);
  if(female){
    return {
      label: light ? 'женский профиль · щадящая нагрузка' : advanced ? 'женский профиль · продвинутая нагрузка' : 'женский профиль · контролируемая нагрузка',
      note: light
        ? 'Держим запас 2-3 повтора, без отказа и рывков. Если есть цикл/самочувствие/боль — снизь темп или вес.'
        : 'Больше контролируемых повторений, аккуратный темп и фокус на технику, таз, корпус и восстановление.',
      warmupFocus: 'ягодицы, таз, корпус и суставы',
      cooldownFocus: 'таз, поясница, ноги и дыхание'
    };
  }
  return {
    label: light ? 'мужской профиль · щадящая нагрузка' : advanced ? 'мужской профиль · силовая нагрузка' : 'мужской профиль · базовая нагрузка',
    note: light
      ? 'Работай без отказа, вес оставь таким, чтобы техника не разваливалась. Боль — стоп и замена упражнения.'
      : 'Можно держать чуть тяжелее рабочие подходы и длиннее отдых, но техника важнее веса.',
    warmupFocus: 'плечи, лопатки, таз, корпус и суставы',
    cooldownFocus: 'грудь, спина, бёдра и дыхание'
  };
}
function sessionExerciseCount(p){
  const min = parseInt(p.sessionMinutes, 10) || 40;
  const byTime = min <= 25 ? 4 : min <= 40 ? 5 : min <= 55 ? 7 : 9;
  let byDays = parseInt(p.days, 10) >= 4 ? byTime + 1 : byTime;
  const bodyStrategy = p?.bodyCheck ? bodyCompositionStrategy(p) : null;
  if(p.mode === 'Лёгкий') byDays -= 1;
  if(p.mode === 'Интенсивный' && p.level !== 'Новичок' && !hasMedicalCaution(p)) byDays += 1;
  if(bodyStrategy?.mode === 'recovery') byDays -= 1;
  const baseCap = hasMedicalCaution(p) ? 6 : (p.level === 'Подготовленный атлет' ? 10 : 9);
  const cap = bodyStrategy?.mode === 'recovery' ? Math.min(baseCap, 6) : baseCap;
  return Math.max(4, Math.min(cap, byDays));
}
function trainingSchemeFor(p){
  const base = Object.assign({}, GEN_SCHEME[p.goal] || GEN_SCHEME['Поддержание']);
  const female = profileIsFemale(p);
  const bodyStrategy = p?.bodyCheck ? bodyCompositionStrategy(p) : null;
  if(female){
    if(p.goal === 'Набор'){
      base.reps = '10–12';
      base.rest = '75–90 сек';
    } else if(p.goal === 'Сушка'){
      base.reps = '12–16';
      base.rest = '45–60 сек';
    } else {
      base.reps = '10–14';
      base.rest = '60 сек';
    }
    base.label += ' · женская нагрузка';
  } else {
    if(p.goal === 'Набор'){
      base.reps = '8–10';
      base.rest = '90 сек';
    } else if(p.goal === 'Сушка'){
      base.reps = '10–15';
      base.rest = '45–60 сек';
    }
    base.label += ' · мужская нагрузка';
  }
  if(p.mode === 'Лёгкий'){
    base.sets = Math.max(2, Math.min(base.sets, 3));
    base.rest = female ? '75 сек' : '75–90 сек';
    base.label += ' · мягко';
  } else if(p.mode === 'Интенсивный' && p.level !== 'Новичок' && !hasMedicalCaution(p)){
    base.sets = Math.min(base.sets + 1, female ? 4 : 5);
    base.label += ' · интенсивно';
  }
  if(hasMedicalCaution(p)){
    base.sets = Math.min(base.sets, 3);
    base.reps = base.reps === '8–10' ? '8–10' : '10–12';
    base.rest = '75 сек';
    base.label += ' · щадящий режим';
  }
  if(bodyStrategy?.applied){
    if(bodyStrategy.trainingSetCap) base.sets = Math.min(base.sets, bodyStrategy.trainingSetCap);
    base.bodyCheckNote = bodyStrategy.trainingNote;
    base.bodyCheckTitle = bodyStrategy.title;
    base.label += ` · ${bodyStrategy.title}`;
  }
  base.loadNote = trainingLoadNote(p, base);
  return base;
}
function trainingLoadNote(p, scheme){
  const load = trainingLoadProfile(p);
  const stop = hasMedicalCaution(p) ? ' Учитываем ограничения из анкеты: тренировка не является медицинским назначением.' : '';
  const bodyCheckNote = scheme?.bodyCheckNote ? ` BodyCheck: ${scheme.bodyCheckNote}` : '';
  return `${load.label}: ${scheme.sets} подх. × ${scheme.reps}, отдых ${scheme.rest}. ${load.note}${stop}${bodyCheckNote}`;
}
function prepListHtml(items){
  return `<ol class="lib-steps prep-steps">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
}
function warmupPlanFor(p){
  const load = trainingLoadProfile(p);
  const gym = p.place === 'В зале' || p.inv === 'Полный зал';
  const female = profileIsFemale(p);
  return {
    title: 'Разминка · 7–9 минут',
    summary: `суставы, лёгкое кардио, активация: ${load.warmupFocus}`,
    steps: [
      '1–2 минуты спокойно подними пульс: ходьба на месте, дорожка, вело или лёгкие шаги без задыхания.',
      'Суставная мобилизация сверху вниз: шея, плечи, локти, кисти, таз, колени, голеностоп — по 6–8 кругов.',
      female
        ? 'Активация: 12 ягодичных мостов, 10 приседаний без веса и 20–30 секунд лёгкой планки на локтях только если нет противопоказаний.'
        : 'Активация: 10 отжиманий от опоры или 12 сведений лопаток, 10 приседаний без веса и 20–30 секунд лёгкого кора.',
      gym
        ? 'Перед первым силовым упражнением сделай 1–2 разминочных подхода с лёгким весом: примерно 40–60% от рабочего.'
        : 'Перед первым упражнением сделай 1 лёгкий пробный круг без спешки, чтобы поймать амплитуду и дыхание.',
      'Стартуй рабочую часть только когда тело стало теплее, движения стали мягче, а дыхание остаётся контролируемым.'
    ]
  };
}
function cooldownPlanFor(p){
  const load = trainingLoadProfile(p);
  return {
    title: 'Заминка · 5–7 минут',
    summary: `дыхание и мягкая мобильность: ${load.cooldownFocus}`,
    steps: [
      '1–2 минуты снизь пульс: спокойная ходьба, лёгкие шаги или медленное вращение плечами.',
      'Дыхание: 5–6 циклов через нос, длинный выдох. Цель — убрать спешку и вернуть контроль.',
      'Растяни главные рабочие зоны по 20–30 секунд без боли: ноги/ягодицы после низа, грудь/спина/плечи после верха.',
      'Поясница и таз: мягкий наклон, поза ребёнка или колено к груди. Без пружинящих движений.',
      'Оцени самочувствие: если есть острая боль, головокружение или необычное давление — остановись и сообщи куратору.'
    ]
  };
}
function exerciseText(e){
  return `${e?.id || ''} ${e?.name || ''} ${e?.nameRu || ''} ${e?.displayNameSimple || ''} ${e?.category || ''} ${e?.movementPattern || ''} ${e?.equipment || ''} ${(e?.requiredEquipment || []).join(' ')}`.toLowerCase();
}
function exerciseSideMode(e){
  const explicitMode = String(e?.sideMode || '').trim();
  if(['per_side', 'alternating', 'bilateral'].includes(explicitMode)) return explicitMode;
  const text = exerciseText(e);
  if(/поочер[её]д|чередующ|попеременн|alternat|walking.{0,20}lunge|lunge.{0,20}walking|ходьб.{0,20}выпад|выпад.{0,20}ходьб/i.test(text)) return 'alternating';
  if(/одной\s+(?:рук|ног)|на\s+одну\s+(?:рук|ног)|(?:^|[-_\s])single(?:[-_\s]|$)|one[-_\s]?(?:arm|leg)|подъ?[её]м\s+руки\b|болгарск|split[-_\s]?squat|сплит[-\s]?присед|пистолет|выпад|lunge|kickback/i.test(text)) return 'per_side';
  return 'bilateral';
}
function workoutItemSideMode(item){
  const currentExercise = Array.isArray(libData) && item?.id
    ? libData.find(exercise => String(exercise.id) === String(item.id))
    : null;
  return currentExercise ? exerciseSideMode(currentExercise) : (item?.sideMode || exerciseSideMode(item));
}
function workoutSideMeta(item){
  const mode = workoutItemSideMode(item);
  if(mode === 'per_side') return 'обе стороны';
  if(mode === 'alternating') return 'чередуя стороны';
  return '';
}
const GEN_UPPER_PUSH_MUSCLES = ['chest', 'shoulders', 'triceps'];
const GEN_UPPER_PULL_MUSCLES = ['lats', 'middle back', 'lower back', 'biceps', 'forearms'];
const GEN_LOWER_BODY_MUSCLES = ['quadriceps', 'hamstrings', 'glutes', 'calves'];
const GEN_CORE_MUSCLES = ['abdominals', 'obliques'];
function generatorFocusKind(muscles){
  const set = new Set(muscles || []);
  const hasPush = GEN_UPPER_PUSH_MUSCLES.some(m => set.has(m));
  const hasPull = GEN_UPPER_PULL_MUSCLES.some(m => set.has(m));
  const hasLower = GEN_LOWER_BODY_MUSCLES.some(m => set.has(m));
  const hasCore = GEN_CORE_MUSCLES.some(m => set.has(m));
  const hasTraps = set.has('traps');
  if((hasPush || (hasTraps && !hasPull)) && !hasPull && !hasLower && !hasCore) return 'upper_push';
  if((hasPull || (hasTraps && !hasPush)) && !hasPush && !hasLower && !hasCore) return 'upper_pull';
  if(hasLower && !hasPush && !hasPull && !hasCore && !hasTraps) return 'lower';
  if(hasCore && !hasPush && !hasPull && !hasLower && !hasTraps) return 'core';
  return 'mixed';
}
function exerciseFocusConflictReason(e, muscles){
  const kind = generatorFocusKind(muscles);
  if(kind === 'mixed') return '';
  const txt = exerciseText(e);
  const primary = e?.primary || [];
  const shouldersRequested = (muscles || []).includes('shoulders') || (muscles || []).includes('traps');
  const primaryShoulder = primary.includes('shoulders') || primary.includes('traps');
  const hasLowerPrimary = primary.some(m => GEN_LOWER_BODY_MUSCLES.includes(m));
  const hasUpperPrimary = primary.some(m => GEN_UPPER_PUSH_MUSCLES.includes(m) || GEN_UPPER_PULL_MUSCLES.includes(m) || m === 'traps');
  const lowerMove = /(присед|выпад|станов|румынск|жим ног|разгибан.{0,18}ног|сгибан.{0,18}ног|икр|ягодич|бедр|leg press|squat|lunge|deadlift|calf|hamstring|quadriceps|glute)/i.test(txt);
  const fullBodyMove = /(рывок|толчок|взятие.{0,18}груд|snatch|clean|jerk)/i.test(txt);
  const rearDeltMove = /(задн.{0,18}дельт|face pull)/i.test(txt);
  const uprightShoulderMove = /(к подбород|upright row)/i.test(txt);
  const pullMove = /(тяга|подтяг|pulldown|pull[-\s]?up|row)/i.test(txt);
  const pushMove = /(жим|отжим|press|push[-\s]?up|dip|fly)/i.test(txt);
  if(kind === 'upper_push'){
    if(hasLowerPrimary || lowerMove || fullBodyMove) return 'lower_or_full_body_in_upper_focus';
    if(pullMove && !(shouldersRequested && primaryShoulder && (rearDeltMove || uprightShoulderMove))) return 'pull_in_upper_push_focus';
  }
  if(kind === 'upper_pull' && pushMove && !(rearDeltMove || uprightShoulderMove)) return 'push_in_upper_pull_focus';
  if(kind === 'lower' && hasUpperPrimary && !lowerMove) return 'upper_body_in_lower_focus';
  if(kind === 'core' && (lowerMove || fullBodyMove) && !/кор|пресс|core|abs|abdom/i.test(txt)) return 'non_core_in_core_focus';
  return '';
}
function exerciseMatchesGeneratorFocus(e, muscles){
  if(!muscles?.length) return true;
  if(!((e.primary || []).some(m => muscles.includes(m)))) return false;
  return !exerciseFocusConflictReason(e, muscles);
}
function exerciseFamily(e){
  const txt = exerciseText(e);
  if(/(glute bridge|hip thrust|ягодичн.*мост|мостик|hip bridge)/i.test(txt)) return 'bridge';
  if(/(deadlift|rack pull|станов|румынск|тяга с упоров|тяга гири|one-legged deadlift)/i.test(txt)) return 'hinge';
  if(/(clean|взят|клин|толчок|jerk|snatch|рывок)/i.test(txt)) return 'clean';
  if(/(squat|присед|leg press|жим ногами|hack squat|гакк)/i.test(txt)) return 'squat';
  if(/(lunge|выпад|step-up|зашаг)/i.test(txt)) return 'lunge';
  if(/(bench press|floor press|overhead press|shoulder press|жим|pushup|push-up|отжим)/i.test(txt)) return 'push';
  if(/(row|pullup|pull-up|pulldown|тяга|подтяг)/i.test(txt)) return 'pull';
  if(/(curl|сгибан|бицепс)/i.test(txt)) return 'curl';
  if(/(extension|разгибан|трицепс)/i.test(txt)) return 'extension';
  if(/(crunch|sit-up|plank|скручив|планк|пресс|корпус)/i.test(txt)) return 'core';
  if(e?.category === 'stretching') return 'mobility';
  return `${e?.mechanic || 'single'}:${(e?.primary || [])[0] || 'other'}`;
}
function exerciseFamilyLimit(family){
  return ({ bridge: 1, hinge: 1, clean: 1 })[family] || 2;
}
function beginnerSafeProfile(p){
  const level = String(p?.level || '');
  const place = String(p?.place || '');
  const inv = String(p?.inv || p?.inventory || '');
  return level === 'Новичок' || place === 'Дома' || inv === 'Ничего нет' || inv === 'Резинки' || inv === 'Резинки + гантели' || inv === 'Турник + площадка';
}
function exerciseRequiredEquipment(e){
  const required = Array.isArray(e?.requiredEquipment) && e.requiredEquipment.length
    ? e.requiredEquipment
    : [e?.equipment || 'body only'];
  return [...new Set(required.filter(Boolean))];
}
function profileEquipmentCapabilities(p){
  const inventory = String(p?.inv || p?.inventory || 'Ничего нет');
  return new Set(INV_EQUIP[inventory] || ['body only']);
}
function equipmentRequirementsMet(e, available){
  // Accept Set-like values as well: the generator can receive a set from another UI/runtime context.
  const capabilities = available && typeof available.has === 'function' ? available : new Set(available || []);
  return exerciseRequiredEquipment(e).every(item => capabilities.has(item));
}
function exerciseHomeConstraintReason(e, p){
  if(!e) return 'missing';
  const place = String(p?.place || '');
  if(place !== 'Дома') return '';
  const inv = String(p?.inv || p?.inventory || 'Ничего нет');
  const txt = exerciseText(e);
  const equipment = String(e.equipment || '').toLowerCase();
  const flags = Array.isArray(e.contentFlags) ? e.contentFlags : [];
  if(flags.includes('home_rejected') || flags.includes('home_media_mismatch')) return 'home_flagged';
  if(!equipmentRequirementsMet(e, profileEquipmentCapabilities(p))) return 'equipment_not_available';
  if(inv === 'Ничего нет' && equipment !== 'body only') return 'equipment_not_available';
  if(inv === 'Резинки' && !['body only', 'bands'].includes(equipment)) return 'equipment_not_available';
  if(inv === 'Резинки + гантели' && !['body only', 'dumbbell', 'bands'].includes(equipment)) return 'equipment_not_available';
  if(inv === 'Турник + площадка' && !['body only', 'bands'].includes(equipment)) return 'equipment_not_available';
  const barApparatusRe = /(подтягиван|pull[-_\s]?up|chin[-_\s]?up|брусь|parallel bars|турник|перекладин|из виса|в висе|hanging)/i;
  if(inv !== 'Турник + площадка' && inv !== 'Полный зал' && barApparatusRe.test(txt)) return 'bar_not_available';
  const gymOnlyRe = /(скам|bench|hyperextension|римск|roman chair|тренаж[её]р|machine|smith|смита|rack|рама|cable|блок|barbell|штанг|платформ|platform|leg press|жим ногами)/i;
  if(inv !== 'Полный зал' && gymOnlyRe.test(txt)) return 'gym_equipment_text';
  if(inv !== 'Полный зал' && /hyperextension bench|скамь[ие] для гиперэкстенз|римск|roman chair/i.test(txt)) return 'bench_media_risk';
  if(flags.includes('home_allowed')) return '';
  return '';
}
function exerciseMedicalConstraintReason(e, p){
  if(!e) return 'missing';
  const txt = exerciseText(e);
  const pose = String(e.pose || '').toLowerCase();
  if(hasDiastasisRisk(p)){
    if(['crunch', 'pushup'].includes(pose)) return 'diastasis_core_pressure';
    if(/crunch|sit[-_\s]?up|plank|push[-_\s]?up|leg[-_\s]?(raise|lift)|hanging.*(?:leg|knee)|knee[-_\s]?hip[-_\s]?raise|hip[-_\s]?raise|bottoms[-_\s]?up|air[-_\s]?bike|bicycle|mountain[-_\s]?climber|russian[-_\s]?twist|twist|scissor|jackknife|v[-_\s]?up|hollow|tuck[-_\s]?crunch|reverse[-_\s]?crunch|toe[-_\s]?touch|скручив|сит.?ап|подъ[её]м.{0,20}(ног|колен|корпус)|планк|отжим|скалолаз|велосипед|поворот.{0,22}корпус|ножниц|складк|лодочк|берпи|бурпи/i.test(txt)){
      return 'diastasis_core_pressure';
    }
  }
  if(healthHas(p, /колен|мениск|крестов|пател|артроз|гонартроз/i) && /lunge|squat|leg press|hack squat|step-up|jump|выпад|присед|жим ногами|гакк|зашаг|прыж/i.test(txt)){
    return 'knee_limit';
  }
  if(healthHas(p, /плеч|ротатор|импидж|локт|запяст|кист/i) && /overhead press|shoulder press|military press|dip|upright row|snatch|jerk|clean|жим.*голов|армейск|брусь|рывок|толчок|взят/i.test(txt)){
    return 'upper_body_joint_limit';
  }
  if(healthHas(p, /поясниц|спин|позвоноч|грыж|протруз|сколиоз|радикул|остеохонд/i) && /deadlift|good morning|rack pull|hyperextension|barbell squat|станов|гиперэкстенз|наклон.*штанг|тяга с упоров|присед.*штанг/i.test(txt)){
    return 'spine_limit';
  }
  return '';
}
function exerciseConstraintViolations(e, p, available){
  if(!e) return ['missing_exercise'];
  const violations = [];
  const txt = exerciseText(e);
  const flags = Array.isArray(e.contentFlags) ? e.contentFlags : [];
  const capabilities = available && typeof available.has === 'function' ? available : profileEquipmentCapabilities(p);
  if(!equipmentRequirementsMet(e, capabilities)) violations.push('equipment_not_available');
  const allowedLevels = LEVEL_MAP[p?.level] || ['beginner'];
  if(e.level && !allowedLevels.includes(e.level)) violations.push('level_not_allowed');
  if(e.loc === 'Зал' && String(p?.place || '') !== 'В зале') violations.push('location_not_available');
  if(beginnerSafeProfile(p) && flags.includes('advanced_only')) violations.push('advanced_flag');
  if(beginnerSafeProfile(p) && ADVANCED_EXERCISE_RE.test(txt)) violations.push('advanced_pattern');
  if(beginnerSafeProfile(p) && ['powerlifting', 'strongman', 'olympic weightlifting'].includes(e.category || '')) violations.push('advanced_category');
  const homeReason = exerciseHomeConstraintReason(e, p);
  if(homeReason) violations.push(homeReason);
  const medicalReason = exerciseMedicalConstraintReason(e, p);
  if(medicalReason) violations.push(medicalReason);
  return [...new Set(violations)];
}
function exerciseAllowedForProfile(e, p, available){
  return exerciseConstraintViolations(e, p, available).length === 0;
}
function familyCountOk(e, counts){
  const family = exerciseFamily(e);
  return (counts[family] || 0) < exerciseFamilyLimit(family);
}
function addFamilyCount(e, counts){
  const family = exerciseFamily(e);
  counts[family] = (counts[family] || 0) + 1;
}

async function ensureGenerator(){
  await ensureLibrary();
  if(!genState._init){
    const p = planFromProfile();
    (INV_EQUIP[p.inv] || ['body only']).forEach(e => genState.equip.add(e));
    profileFocusMuscles(p).forEach(m => genState.muscles.add(m));
    genState.count = clampGeneratorExerciseCount(sessionExerciseCount(p));
    genState._init = true;
  }
  renderGenControls();
  if(lastGen?._played && !currentWorkoutResume()) generateWorkout(true, true);
}

function genMultiRow(c, items, labelFn, set){
  if(!c) return;
  c.innerHTML = items.map(v => `<button type="button" class="lib-chip${set.has(v) ? ' active' : ''}" data-v="${escapeHtml(v)}">${escapeHtml(labelFn(v))}</button>`).join('');
  c.querySelectorAll('.lib-chip').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.v;
    if(set.has(v)) set.delete(v); else set.add(v);
    renderGenControls();
  }));
}

function renderGenControls(){
  const p = planFromProfile();
  if($('genGoalPill')) $('genGoalPill').textContent = p.goal;
  if($('genCtx')) $('genCtx').innerHTML =
    `<span class="gen-ctx-i">Цель: <b>${escapeHtml(p.goal)}</b></span><span class="gen-ctx-i">Уровень: <b>${escapeHtml(p.level)}</b></span><span class="gen-ctx-i">Место: <b>${escapeHtml(p.place)}</b></span>`;
  genMultiRow($('genMuscles'), LIB_MUSCLES, m => MUS_RU[m] || m, genState.muscles);
  const eq = $('genEquip'); if(eq) eq.classList.add('equip');
  genMultiRow(eq, LIB_EQUIP, e => EQ_RU[e] || e, genState.equip);
  genState.count = clampGeneratorExerciseCount(genState.count);
  if($('genCountVal')) $('genCountVal').textContent = genState.count;
  if($('genCountBar')) $('genCountBar').style.width = ((genState.count - GEN_MIN_EXERCISES) / (GEN_MAX_EXERCISES - GEN_MIN_EXERCISES) * 100) + '%';
}

let lastGen = null;
const MANUAL_PAGE_SIZE = 40;
const manualState = { muscle: null, q: '', selected: [], limit: MANUAL_PAGE_SIZE };

async function ensureManualWorkoutBuilder(){
  const pickList = $('manualPickList');
  if(!pickList) return;
  if(!libData) pickList.innerHTML = '<div class="lib-empty">Загружаю базу упражнений…</div>';
  await ensureLibrary();
  renderManualBuilder();
}
function manualFilteredExercises(){
  if(!libData) return [];
  const q = (manualState.q || '').trim().toLowerCase();
  return libData.filter(e => {
    if(!exerciseHasVideo(e)) return false;
    const muscles = [...(e.primary || []), ...(e.secondary || [])];
    if(manualState.muscle && !muscles.includes(manualState.muscle)) return false;
    if(q && !exerciseText(e).includes(q)) return false;
    return true;
  });
}
function manualSelectedExercises(){
  if(!libData) return [];
  const byId = new Map(libData.map(e => [String(e.id), e]));
  manualState.selected = manualState.selected.filter(id => exerciseHasVideo(byId.get(String(id))));
  return manualState.selected.map(id => byId.get(String(id))).filter(Boolean);
}
function renderManualMuscles(){
  const container = $('manualMuscles');
  if(!container) return;
  const active = manualState.muscle;
  const chips = [''].concat(LIB_MUSCLES).map(m => {
    const label = m ? (MUS_RU[m] || m) : 'Все мышцы';
    return `<button type="button" class="lib-chip${active === m || (!active && !m) ? ' active' : ''}" data-m="${escapeHtml(m)}">${escapeHtml(label)}</button>`;
  }).join('');
  container.innerHTML = chips;
  container.querySelectorAll('.lib-chip').forEach(btn => btn.addEventListener('click', () => {
    manualState.muscle = btn.dataset.m || null;
    manualState.limit = MANUAL_PAGE_SIZE;
    renderManualBuilder();
  }));
}
function focusManualWorkoutBuilder(){
  const card = $('manualBuilderCard');
  if(!card || !$('saved')?.classList.contains('active')) return;
  card.scrollIntoView({ block:'start', behavior:'smooth' });
  card.classList.remove('manual-builder-focus');
  requestAnimationFrame(() => card.classList.add('manual-builder-focus'));
  window.setTimeout(() => card.classList.remove('manual-builder-focus'), 900);
}
function addManualExercise(id){
  const sid = String(id || '');
  if(!sid) return;
  if(!exerciseHasVideo(libData?.find(exercise => String(exercise.id) === sid))){ toast('Выбери упражнение с видео из базы'); return; }
  if(manualState.selected.includes(sid)){ toast('Упражнение уже в программе'); return; }
  manualState.selected.push(sid);
  renderManualBuilder();
}
function removeManualExercise(index){
  manualState.selected.splice(index, 1);
  renderManualBuilder();
}
function renderManualBuilder(){
  const pickList = $('manualPickList');
  if(!pickList) return;
  renderManualMuscles();
  const selected = manualSelectedExercises();
  if($('manualCount')) $('manualCount').textContent = `${selected.length} упр.`;
  const selectedIds = new Set(manualState.selected.map(String));
  const filtered = manualFilteredExercises();
  const available = filtered.filter(e => !selectedIds.has(String(e.id)));
  const shown = available.slice(0, manualState.limit);
  if($('manualCatalogStatus')) $('manualCatalogStatus').textContent = `Найдено: ${filtered.length} · выбрано: ${selected.length}`;
  pickList.innerHTML = shown.length ? shown.map(e => {
    const mus = MUS_RU[(e.primary || [])[0]] || '';
    const meta = [mus, EQ_RU[e.equipment] || e.equipment, LVL_RU[e.level] || e.level, workoutSideMeta(e)].filter(Boolean).join(' · ');
    return `<button type="button" class="manual-ex-card" data-add="${escapeHtml(e.id)}"><span class="manual-ex-copy"><b>${escapeHtml(exerciseName(e))}</b><em>${escapeHtml(meta)}</em></span><span class="manual-add-label"><i aria-hidden="true">+</i>Добавить</span></button>`;
  }).join('') + (available.length > shown.length ? `<button type="button" class="manual-more" data-manual-more>Показать ещё · ${available.length - shown.length}</button>` : '') : '<div class="lib-empty">Под этот фильтр ничего не нашлось. Попробуй другую мышцу или поиск.</div>';
  pickList.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => addManualExercise(btn.dataset.add)));
  pickList.querySelector('[data-manual-more]')?.addEventListener('click', () => {
    manualState.limit += MANUAL_PAGE_SIZE;
    renderManualBuilder();
  });

  const selectedBox = $('manualSelected');
  if(!selectedBox) return;
  selectedBox.innerHTML = selected.length ? '<h3 class="gen-h">В программе</h3>' + selected.map((e, i) => {
    const mus = MUS_RU[(e.primary || [])[0]] || '';
    const meta = [mus, EQ_RU[e.equipment] || e.equipment, workoutSideMeta(e)].filter(Boolean).join(' · ');
    return `<div class="manual-selected-row"><button type="button" class="manual-selected-main" data-preview="${escapeHtml(e.id)}"><i>${i + 1}</i><span><b>${escapeHtml(exerciseName(e))}</b><em>${escapeHtml(meta)}</em></span></button><button type="button" class="manual-remove" data-remove="${i}" aria-label="Убрать">×</button></div>`;
  }).join('') : '<div class="manual-empty">Добавь упражнения выше — здесь соберётся твоя программа.</div>';
  selectedBox.querySelectorAll('[data-preview]').forEach(btn => btn.addEventListener('click', () => {
    const ex = libData.find(x => String(x.id) === btn.dataset.preview);
    if(ex) openLibDetail(ex);
  }));
  selectedBox.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => removeManualExercise(Number(btn.dataset.remove))));
}
function saveManualWorkout(){
  const p = planFromProfile();
  const selected = manualSelectedExercises();
  if(!selected.length){ toast('Добавь хотя бы одно упражнение'); return; }
  const scheme = trainingSchemeFor(p);
  const items = workoutItems(selected, scheme);
  state.savedWorkouts.unshift({
    id: 'm' + Date.now().toString(36),
    title: `Моя программа · ${items.length} упр.`,
    kind: 'manual',
    goal: p.goal,
    datasetVersion: EXERCISE_DATASET_VERSION,
    rulesVersion: WORKOUT_RULES_VER,
    days: [{ title: 'Моя тренировка', sr: scheme.sets + '×' + scheme.reps, rest: scheme.rest, items, done: items.map(() => false) }]
  });
  manualState.selected = [];
  save();
  renderSaved();
  renderManualBuilder();
  toast('Личная программа сохранена');
}

function pickExercises(muscles, count, eq, levels, profile, avoidIds, previousIds){
  const okCat = c => !c || ['strength', 'powerlifting', 'strongman', 'plyometrics'].includes(c);
  const p = profile || planFromProfile();
  const avoid = avoidIds instanceof Set ? avoidIds : new Set();
  const byMuscle = {};
  muscles.forEach(m => byMuscle[m] = []);
  libData.forEach(e => {
    if(!exerciseHasVideo(e)) return;
    if(avoid.has(e.id)) return;
    if(!levels.includes(e.level) || !okCat(e.category)) return;
    if(!exerciseAllowedForProfile(e, p, eq)) return;
    if(!exerciseMatchesGeneratorFocus(e, muscles)) return;
    const m = (e.primary || []).find(x => muscles.includes(x));
    if(m) byMuscle[m].push(e);
  });
  Object.values(byMuscle).forEach(arr => arr.sort((a, b) => {
    const repeated = Number(previousIds?.has(a.id)) - Number(previousIds?.has(b.id));
    if(repeated) return repeated;
    const ca = a.mechanic === 'compound' ? 0 : 1, cb = b.mechanic === 'compound' ? 0 : 1;
    return ca !== cb ? ca - cb : Math.random() - 0.5;
  }));
  const order = muscles.filter(m => byMuscle[m].length);
  const picked = [], seen = new Set(), familyCounts = {};
  let guard = 0;
  while(picked.length < count && order.some(m => byMuscle[m].length) && guard++ < 300){
    for(const m of order){
      const e = byMuscle[m].shift();
      if(e && !seen.has(e.id) && familyCountOk(e, familyCounts)){
        seen.add(e.id);
        addFamilyCount(e, familyCounts);
        picked.push(e);
      }
      if(picked.length >= count) break;
    }
  }
  return picked;
}

function replacementCandidateScore(candidate, current){
  const currentPrimary = new Set(current?.primary || []);
  const overlap = (candidate?.primary || []).filter(muscle => currentPrimary.has(muscle)).length;
  let score = overlap * 100;
  if((candidate?.primary || [])[0] && candidate.primary[0] === (current?.primary || [])[0]) score += 45;
  if(candidate?.movementPattern && candidate.movementPattern === current?.movementPattern) score += 32;
  if(exerciseFamily(candidate) === exerciseFamily(current)) score += 24;
  if(candidate?.equipment && candidate.equipment === current?.equipment) score += 12;
  if(candidate?.mechanic && candidate.mechanic === current?.mechanic) score += 5;
  if(candidate?.level && candidate.level === current?.level) score += 3;
  if(candidate?.videoSrc && !exerciseMediaHidden(candidate)) score += 2;
  return score;
}

function workoutReplacementCandidates(currentItem, workoutItems, p, query='', availableEquipment){
  if(!Array.isArray(libData) || !currentItem?.id) return [];
  const current = libData.find(exercise => String(exercise.id) === String(currentItem.id));
  if(!current) return [];
  const profile = p || planFromProfile();
  const available = availableEquipment && typeof availableEquipment.has === 'function'
    ? availableEquipment
    : profileEquipmentCapabilities(profile);
  const usedIds = new Set((Array.isArray(workoutItems) ? workoutItems : []).map(item => String(item?.id || '')));
  const primary = new Set(current.primary || []);
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const allowedCategories = new Set(['strength', 'powerlifting', 'strongman', 'plyometrics']);
  return libData.filter(candidate => {
    if(!exerciseHasVideo(candidate)) return false;
    if(!candidate?.id || String(candidate.id) === String(current.id) || usedIds.has(String(candidate.id))) return false;
    if(candidate.category && !allowedCategories.has(candidate.category)) return false;
    if(!exerciseAllowedForProfile(candidate, profile, available)) return false;
    if(primary.size && !(candidate.primary || []).some(muscle => primary.has(muscle))) return false;
    if(normalizedQuery && !exerciseText(candidate).includes(normalizedQuery)) return false;
    return true;
  }).sort((a, b) => {
    const scoreDiff = replacementCandidateScore(b, current) - replacementCandidateScore(a, current);
    if(scoreDiff) return scoreDiff;
    return exerciseName(a).localeCompare(exerciseName(b), 'ru');
  });
}

function workoutReplacementAllCandidates(currentItem, workoutItems, p, query='', availableEquipment, muscle=''){
  if(!Array.isArray(libData) || !currentItem?.id) return [];
  const profile = p || planFromProfile();
  const available = availableEquipment && typeof availableEquipment.has === 'function'
    ? availableEquipment
    : profileEquipmentCapabilities(profile);
  const usedIds = new Set((Array.isArray(workoutItems) ? workoutItems : []).map(item => String(item?.id || '')));
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const normalizedMuscle = String(muscle || '');
  const allowedCategories = new Set(['strength', 'powerlifting', 'strongman', 'plyometrics']);
  return libData.filter(candidate => {
    if(!exerciseHasVideo(candidate)) return false;
    if(!candidate?.id || String(candidate.id) === String(currentItem.id) || usedIds.has(String(candidate.id))) return false;
    if(candidate.category && !allowedCategories.has(candidate.category)) return false;
    if(!exerciseAllowedForProfile(candidate, profile, available)) return false;
    if(normalizedMuscle && ![...(candidate.primary || []), ...(candidate.secondary || [])].includes(normalizedMuscle)) return false;
    if(normalizedQuery && !exerciseText(candidate).includes(normalizedQuery)) return false;
    return true;
  }).sort((a, b) => exerciseName(a).localeCompare(exerciseName(b), 'ru'));
}

function genEq(){ return genState.equip.size ? genState.equip : new Set(['body only']); }
function genLevels(p){ return LEVEL_MAP[p.level] || ['beginner', 'intermediate']; }

function generateWorkout(forceDifferent, automatic = false){
  if(!libData) return;
  const p = planFromProfile();
  const scheme = trainingSchemeFor(p);
  const muscles = genState.muscles.size ? [...genState.muscles] : (profileFocusMuscles(p).length ? profileFocusMuscles(p) : LIB_MUSCLES.slice());
  const count = clampGeneratorExerciseCount(genState.count);
  const selectedEquipment = new Set(genEq());
  const previous = forceDifferent && lastGen ? new Set((lastGen.items || []).map(e => e.id)) : new Set();
  let picked = pickExercises(muscles, count, selectedEquipment, genLevels(p), p, automatic ? undefined : previous, automatic ? previous : undefined);
  if(forceDifferent && picked.length < Math.min(count, 3)){
    picked = pickExercises(muscles, count, selectedEquipment, genLevels(p), p);
    toast('Под эти фильтры мало вариантов — часть упражнений может повториться');
  } else if(forceDifferent) {
    toast('Тренировка пересобрана');
  }
  picked = picked.filter(e => exerciseAllowedForProfile(e, p, selectedEquipment));
  if(!forceDifferent && picked.length < count) toast(`Под выбранные фильтры нашлось ${picked.length} из ${count} упражнений`);
  lastGen = { items: picked, scheme: scheme, goal: p.goal, equipment: [...selectedEquipment] };
  renderGenResult(picked, scheme);
}

function renderGenResult(list, scheme){
  const card = $('genResultCard'), res = $('genResult');
  if(!card || !res) return;
  const medNote = medicalTrainingDisclaimer(planFromProfile());
  card.hidden = false;
  if(!list.length){
    if($('genResTitle')) $('genResTitle').textContent = 'Пусто';
    if($('genResSub')) $('genResSub').textContent = '';
    if($('genResPill')) $('genResPill').textContent = '';
    res.innerHTML = '<div class="lib-empty">Под эти фильтры пока нет упражнений с видео. Добавь другое оборудование или выбери упражнения со своим весом.</div>';
    return;
  }
  if($('genResTitle')) $('genResTitle').textContent = 'Тренировка на сегодня';
  if($('genResSub')) $('genResSub').textContent = `${scheme.label} · ${list.length} упр. · отдых ${scheme.rest}`;
  if($('genResPill')) $('genResPill').textContent = `${scheme.sets}×${scheme.reps}`;
  res.innerHTML = `<div class="training-load-note">${escapeHtml(scheme.loadNote || trainingLoadNote(planFromProfile(), scheme))}</div>` + (medNote ? `<div class="medical-note">${escapeHtml(medNote)}</div>` : '') + list.map((e, i) => {
    const mus = MUS_RU[(e.primary || [])[0]] || '';
    const side = workoutSideMeta(e);
    return `<div class="gen-item-row"><button type="button" class="gen-item" data-id="${escapeHtml(e.id)}"><i>${i + 1}</i><div class="gen-item-b"><b>${escapeHtml(e.nameRu || e.name)}</b><span>${escapeHtml([mus, EQ_RU[e.equipment] || e.equipment, side].filter(Boolean).join(' · '))}</span></div><span class="gen-item-sr">${scheme.sets}×${scheme.reps}</span></button><button type="button" class="workout-replace-icon" data-replace-generated="${i}" aria-label="Заменить ${escapeHtml(exerciseName(e))}" title="Заменить упражнение">↻</button></div>`;
  }).join('');
  res.querySelectorAll('.gen-item').forEach(btn => btn.addEventListener('click', () => {
    const ex = libData.find(x => String(x.id) === btn.dataset.id);
    if(ex) openLibDetail(ex);
  }));
  res.querySelectorAll('[data-replace-generated]').forEach(btn => btn.addEventListener('click', () => openWorkoutReplacement({ kind:'generated', itemIndex:Number(btn.dataset.replaceGenerated) })));
  card.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function bindGenerator(){
  $('genRun')?.addEventListener('click', () => generateWorkout(false));
  $('genReroll')?.addEventListener('click', () => generateWorkout(true));
  $('genWeek')?.addEventListener('click', buildWeekPlan);
  $('genSave')?.addEventListener('click', saveSingleWorkout);
  $('genStart')?.addEventListener('click', () => {
    if(lastGen?._played && !currentWorkoutResume()) generateWorkout(true, true);
    if(!lastGen || !lastGen.items.length){ toast('Сначала сгенерируй тренировку'); return; }
    startWorkoutPlayer({ rawItems: workoutItems(lastGen.items, lastGen.scheme), title: 'Тренировка на сегодня', wkIdx: null });
  });
  $('genMinus')?.addEventListener('click', () => { genState.count = clampGeneratorExerciseCount(genState.count - 1); renderGenControls(); });
  $('genPlus')?.addEventListener('click', () => { genState.count = clampGeneratorExerciseCount(genState.count + 1); renderGenControls(); });
}

// ============================================================
// Фаза 3: сохранённые тренировки, план недели, трекинг
// ============================================================
const SPLITS = {
  2: [['Верх тела', ['chest', 'shoulders', 'triceps', 'lats', 'middle back', 'biceps']], ['Низ тела', ['quadriceps', 'hamstrings', 'glutes', 'calves']]],
  3: [['Грудь · плечи · трицепс', ['chest', 'shoulders', 'triceps']], ['Спина · бицепс', ['lats', 'middle back', 'biceps', 'forearms']], ['Ноги · ягодицы', ['quadriceps', 'hamstrings', 'glutes', 'calves']]],
  4: [['Грудь · трицепс', ['chest', 'triceps']], ['Спина · бицепс', ['lats', 'middle back', 'biceps']], ['Ноги · ягодицы', ['quadriceps', 'hamstrings', 'glutes', 'calves']], ['Плечи · пресс', ['shoulders', 'abdominals', 'obliques']]],
  5: [['Грудь', ['chest', 'triceps']], ['Спина', ['lats', 'middle back', 'biceps']], ['Ноги', ['quadriceps', 'hamstrings', 'calves']], ['Плечи · трапеции', ['shoulders', 'traps']], ['Ягодицы · пресс', ['glutes', 'abdominals', 'obliques']]]
};
function splitFor(days){ return SPLITS[Math.max(2, Math.min(5, days))] || SPLITS[3]; }

function workoutItemFromExercise(e, sr){
  return {
    id: e.id,
    name: exerciseName(e),
    muscle: MUS_RU[(e.primary || [])[0]] || '',
    equip: EQ_RU[e.equipment] || e.equipment,
    sr: sr || '3×10–12',
    sideMode: exerciseSideMode(e),
    datasetVersion: EXERCISE_DATASET_VERSION,
    mediaVariantId: e.mediaVariantId || e.id
  };
}
function replaceWorkoutItem(items, index, exercise){
  if(!Array.isArray(items) || !exercise || !Number.isInteger(index) || index < 0 || index >= items.length) return Array.isArray(items) ? items.slice() : [];
  const next = items.slice();
  next[index] = workoutItemFromExercise(exercise, items[index]?.sr || '3×10–12');
  return next;
}
function workoutItems(picked, scheme){
  const sr = scheme.sets + '×' + scheme.reps;
  return picked.map(e => workoutItemFromExercise(e, sr));
}
function genTitle(p){ const s = (GEN_SCHEME[p.goal] || {}).label; return s ? s[0].toUpperCase() + s.slice(1) : 'Тренировка'; }

function saveSingleWorkout(){
  if(!lastGen || !lastGen.items.length){ toast('Сначала сгенерируй тренировку'); return; }
  const p = planFromProfile();
  state.savedWorkouts.unshift({
    id: 'w' + state.savedWorkouts.length + '_' + state.score,
    title: genTitle(p) + ' · ' + lastGen.items.length + ' упр.',
    kind: 'single', goal: lastGen.goal, equipment: Array.isArray(lastGen.equipment) ? lastGen.equipment.slice() : [],
    datasetVersion: EXERCISE_DATASET_VERSION,
    rulesVersion: WORKOUT_RULES_VER,
    days: [{ title: 'Тренировка', sr: lastGen.scheme.sets + '×' + lastGen.scheme.reps, rest: lastGen.scheme.rest, items: workoutItems(lastGen.items, lastGen.scheme), done: lastGen.items.map(() => false) }]
  });
  save(); renderSaved(); toast('Тренировка сохранена'); jump('saved');
}

function buildWeekPlan(){
  if(pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0){ pbShowTrialUpsell('Недельные программы доступны в полной версии.'); return; }
  if(!libData) return;
  const p = planFromProfile();
  const scheme = trainingSchemeFor(p);
  const ndays = Math.max(2, Math.min(5, parseInt(p.days, 10) || 3));
  const selectedEquipment = new Set(genEq());
  const days = splitFor(ndays).map(([title, muscles]) => {
    const picked = pickExercises(muscles, 5, selectedEquipment, genLevels(p), p);
    return { title, sr: scheme.sets + '×' + scheme.reps, rest: scheme.rest, items: workoutItems(picked, scheme), done: picked.map(() => false) };
  }).filter(d => d.items.length);
  state.savedWorkouts.unshift({ id: 'p' + state.savedWorkouts.length + '_' + state.score, title: 'План на неделю · ' + days.length + ' дн.', kind: 'week', goal: p.goal, equipment: [...selectedEquipment], datasetVersion: EXERCISE_DATASET_VERSION, rulesVersion: WORKOUT_RULES_VER, days });
  save(); renderSaved(); toast('План на неделю собран'); jump('saved');
}

// ============================================================
// Готовые программы: curated-маршруты поверх той же безопасной
// базы упражнений и тех же правил анкеты, что использует генератор.
// ============================================================
const READY_PROGRAMS_VERSION = 'ready-programs-v1';
const READY_PROGRAM_FILTERS = [
  { id:'all', label:'Все' },
  { id:'home', label:'Дом' },
  { id:'gym', label:'Зал' },
  { id:'muscle', label:'По мышцам' },
  { id:'short', label:'20–30 мин' },
  { id:'beginner', label:'Новичок' }
];
let readyProgramsData = null;
let readyProgramsLoadPromise = null;
let readyProgramFilter = 'all';

function validReadyProgramCatalog(payload){
  if(!payload || payload.version !== READY_PROGRAMS_VERSION || !Array.isArray(payload.programs) || !payload.programs.length) return false;
  const ids = new Set();
  return payload.programs.every(program => {
    if(!program?.id || ids.has(String(program.id)) || !program.title || !Array.isArray(program.weeks) || !program.weeks.length || !Array.isArray(program.sessions) || !program.sessions.length) return false;
    ids.add(String(program.id));
    return program.sessions.every(session => session?.title && Array.isArray(session.focus) && session.focus.length && Number(session.count) >= (program.muscleGroup ? 2 : 3));
  });
}
async function ensureReadyPrograms(){
  if(validReadyProgramCatalog(readyProgramsData)) return readyProgramsData;
  if(readyProgramsLoadPromise) return readyProgramsLoadPromise;
  readyProgramsLoadPromise = window.WLData.fetch(`ready-programs.json?v=${READY_PROGRAMS_VERSION}`, { cache:'no-store' })
    .then(response => {
      if(!response.ok) throw new Error(`ready-programs.json ${response.status}`);
      return response.json();
    })
    .then(payload => {
      if(!validReadyProgramCatalog(payload)) throw new Error('ready program catalog is invalid');
      readyProgramsData = payload;
      return readyProgramsData;
    })
    .catch(error => {
      readyProgramsData = null;
      console.warn('Ready programs load failed', error);
      return null;
    })
    .finally(() => { readyProgramsLoadPromise = null; });
  return readyProgramsLoadPromise;
}
function readyProgramById(id){
  return (readyProgramsData?.programs || []).find(program => String(program.id) === String(id)) || null;
}
function readyProgramLevelRank(level){
  return ({ 'Новичок':0, 'Любитель':1, 'Подготовленный атлет':2 })[String(level || '')] ?? 0;
}
function readyProgramProfileSignature(profile){
  const p = profile || planFromProfile();
  return JSON.stringify({
    level:p.level || '',
    place:p.place || '',
    inventory:p.inv || '',
    mode:p.mode || '',
    health:profileHealthText(p)
  });
}
function readyProgramAvailability(program, profile){
  const p = profile || planFromProfile();
  if(!program) return { available:false, reason:'Программа пока недоступна.' };
  if(readyProgramLevelRank(p.level) < readyProgramLevelRank(program.minLevel)){
    return { available:false, reason:`Нужен уровень: ${program.minLevel}. Измени его в биокарте, когда будешь готов.` };
  }
  if(Array.isArray(program.allowedPlaces) && !program.allowedPlaces.includes(p.place)){
    return { available:false, reason:`Эта программа рассчитана на: ${program.allowedPlaces.join(' или ')}.` };
  }
  if(Array.isArray(program.allowedInventory) && !program.allowedInventory.includes(p.inv)){
    return { available:false, reason:'В анкете указан другой инвентарь. Выбери программу под него или обнови анкету.' };
  }
  if(program.medicalMode === 'clearance' && hasMedicalCaution(p)){
    return { available:false, reason:'При ограничениях из анкеты выбирай мягкий маршрут и сначала согласуй нагрузку с врачом или реабилитологом.' };
  }
  if(Array.isArray(libData) && (program.sessions || []).some(session => {
    const minimum = Math.min(3, Math.max(1, Number(session.count) || 1));
    return readyProgramSessionExercises(session, p).length < minimum;
  })){
    return { available:false, reason:'Под твой инвентарь и ограничения пока недостаточно упражнений с видео. Выбери другую программу.' };
  }
  return { available:true, reason:'' };
}
function readyProgramMatchesFilter(program, filter){
  const places = program.catalogPlaces || program.allowedPlaces || [];
  if(filter === 'all') return true;
  if(filter === 'home') return places.includes('Дома');
  if(filter === 'gym') return places.includes('В зале');
  if(filter === 'muscle') return Boolean(program.muscleGroup);
  if(filter === 'short') return parseInt(program.duration, 10) <= 30;
  if(filter === 'beginner') return program.minLevel === 'Новичок';
  return true;
}
function readyProgramWeekScheme(program, week, profile){
  const p = profile || planFromProfile();
  const base = Object.assign({}, trainingSchemeFor(p));
  const safeMode = hasMedicalCaution(p) || p.mode === 'Лёгкий';
  const requestedSets = Math.max(2, Math.min(5, Number(week?.sets) || Number(base.sets) || 3));
  base.sets = safeMode || program.profileLoad ? Math.min(Number(base.sets) || 3, requestedSets) : requestedSets;
  if(!safeMode && !program.profileLoad && week?.reps) base.reps = String(week.reps);
  if(!safeMode && !program.profileLoad && week?.rest) base.rest = String(week.rest);
  base.label = `${program.title} · ${week.title}`;
  base.loadNote = `${trainingLoadNote(p, base)} ${week?.note || ''}`.trim();
  return base;
}
function readyProgramSessionExercises(session, profile, avoidIds){
  const p = profile || planFromProfile();
  const equipment = profileEquipmentCapabilities(p);
  if(Array.isArray(session.equipment)){
    for(const item of equipment) if(!session.equipment.includes(item)) equipment.delete(item);
  }
  const levels = LEVEL_MAP[p.level] || ['beginner'];
  const previous = avoidIds instanceof Set ? avoidIds : new Set();
  const avoid = new Set();
  if(Array.isArray(session.exerciseIds)){
    const candidates = new Set(session.exerciseIds);
    for(const exercise of libData) if(!candidates.has(exercise.id)) avoid.add(exercise.id);
  }
  return pickExercises(session.focus || [], Math.max(2, Number(session.count) || 4), equipment, levels, p, avoid, previous)
    .filter(exercise => exerciseAllowedForProfile(exercise, p, equipment));
}
function buildReadyProgram(program, profile, previousItems){
  const p = profile || planFromProfile();
  const availability = readyProgramAvailability(program, p);
  if(!availability.available) return { error:availability.reason };
  if(!validExerciseLibrary(libData)) return { error:'База упражнений ещё загружается. Попробуй через пару секунд.' };
  const days = [];
  let previous = new Set((previousItems || []).map(item => item.id));
  for(const [weekIndex, week] of (program.weeks || []).entries()){
    for(const session of (program.sessions || [])){
      const picked = readyProgramSessionExercises(session, p, previous);
      const minimum = Math.min(3, Math.max(1, Number(session.count) || 1));
      if(picked.length < minimum){
        return { error:`Не получилось безопасно собрать «${session.title}» под твою текущую анкету. Попробуй другую программу или проверь инвентарь.` };
      }
      const scheme = readyProgramWeekScheme(program, week, p);
      const items = workoutItems(picked, scheme);
      days.push({
        title:`Неделя ${weekIndex + 1} · ${session.title}`,
        shortTitle:session.title,
        weekTitle:week.title,
        programWeek:weekIndex + 1,
        sr:`${scheme.sets}×${scheme.reps}`,
        rest:scheme.rest,
        items,
        done:items.map(() => false)
      });
      previous = new Set(picked.map(item => item.id));
      days[days.length - 1].rotationAfterDay = days.length - 2;
    }
  }
  if(!days.length) return { error:'В программе не нашлось тренировочных дней.' };
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return {
    workout:{
      id:`rp_${Date.now().toString(36)}_${suffix}`,
      title:program.title,
      kind:'ready',
      programId:program.id,
      programTitle:program.title,
      programEyebrow:program.eyebrow || '',
      programCover:program.cover || '',
      programWeeks:(program.weeks || []).length,
      profileSignature:readyProgramProfileSignature(p),
      goal:p.goal,
      equipment:[...profileEquipmentCapabilities(p)],
      datasetVersion:EXERCISE_DATASET_VERSION,
      rulesVersion:WORKOUT_RULES_VER,
      createdAt:new Date().toISOString(),
      days
    }
  };
}
function activeReadyProgramSession(){
  const id = String(state.activeProgramId || '');
  if(!id) return null;
  const workoutIndex = state.savedWorkouts.findIndex(workout => String(workout?.id) === id && workout?.kind === 'ready');
  if(workoutIndex < 0) return null;
  const workout = state.savedWorkouts[workoutIndex];
  if(workout.profileSignature && workout.profileSignature !== readyProgramProfileSignature(planFromProfile())){
    return { stale:true, workout, workoutIndex };
  }
  const dayIndex = (workout.days || []).findIndex(day => !(day.done || []).every(Boolean));
  if(dayIndex < 0) return { completed:true, workout, workoutIndex };
  return { workout, workoutIndex, dayIndex, day:workout.days[dayIndex] };
}
function readyProgramCardHtml(program, profile){
  const availability = readyProgramAvailability(program, profile);
  const active = activeReadyProgramSession();
  const isActive = active?.workout?.programId === program.id && !active.stale && !active.completed;
  const status = isActive ? 'Активна сейчас' : availability.available ? 'Подходит тебе' : availability.reason;
  const statusClass = isActive ? ' active' : availability.available ? ' available' : ' unavailable';
  const tags = (program.tags || []).slice(0, 3).map(tag => `<span>${escapeHtml(String(tag))}</span>`).join('');
  const safeCover = escapeHtml(String(program.cover || ''));
  return `<button type="button" class="ready-program-card${isActive ? ' is-active' : ''}" data-ready-program="${escapeHtml(String(program.id))}">
    <span class="ready-program-cover">${safeCover ? `<img src="${safeCover}" alt="" loading="lazy" onerror="this.parentElement.classList.add('cover-missing');this.remove()">` : ''}<span class="ready-program-cover-shade"></span><span class="ready-program-cover-meta">${escapeHtml(String(program.frequency || ''))}</span></span>
    <span class="ready-program-card-copy"><span class="ready-program-eyebrow">${escapeHtml(String(program.eyebrow || 'Готовая программа'))}</span><b>${escapeHtml(String(program.title))}</b><span class="ready-program-description">${escapeHtml(String(program.description || ''))}</span><span class="ready-program-tags">${tags}</span><span class="ready-program-status${statusClass}">${escapeHtml(status)}</span></span>
  </button>`;
}
function renderReadyProgramActive(programs){
  const container = $('readyProgramActive');
  if(!container) return;
  const active = activeReadyProgramSession();
  if(!active){
    container.innerHTML = '<span class="ready-program-active-empty">Выбери программу: следующая тренировка сразу появится в разделе «Тренировки».</span>';
    return;
  }
  if(active.stale){
    container.innerHTML = '<span><b>Анкета изменилась</b><small>Активную программу лучше собрать заново под новые условия.</small></span><button type="button" class="secondary" data-ready-rebuild>Выбрать заново</button>';
    container.querySelector('[data-ready-rebuild]')?.addEventListener('click', () => {
      state.activeProgramId = '';
      save();
      renderReadyPrograms();
    });
    return;
  }
  if(active.completed){
    container.innerHTML = `<span><b>${escapeHtml(String(active.workout.programTitle || active.workout.title))}</b><small>Все дни завершены. Можно выбрать следующий маршрут.</small></span>`;
    return;
  }
  const progress = wkProgress(active.workout);
  container.innerHTML = `<span><b>Сейчас идёшь: ${escapeHtml(String(active.workout.programTitle || active.workout.title))}</b><small>Неделя ${active.day.programWeek || 1} из ${active.workout.programWeeks || 4} · ${progress}% пройдено</small></span><button type="button" class="secondary" data-ready-active-open="${escapeHtml(String(active.workout.programId || ''))}">Открыть</button>`;
  container.querySelector('[data-ready-active-open]')?.addEventListener('click', () => {
    const index = state.savedWorkouts.findIndex(workout => String(workout?.id) === String(state.activeProgramId));
    if(index >= 0) openSavedWorkout(index);
  });
}
async function renderReadyPrograms(){
  const grid = $('readyProgramGrid');
  if(!grid) return;
  if(!validReadyProgramCatalog(readyProgramsData)) grid.innerHTML = '<div class="lib-empty">Подбираю программы под твою анкету…</div>';
  const catalog = await ensureReadyPrograms();
  if(!$('programs')?.classList.contains('active')) return;
  if(!catalog){
    grid.innerHTML = '<div class="lib-empty">Не удалось загрузить подборки. Проверь соединение и попробуй ещё раз.</div>';
    return;
  }
  const profile = planFromProfile();
  const programs = catalog.programs.filter(program => readyProgramMatchesFilter(program, readyProgramFilter))
    .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
  if($('readyProgramsCount')) $('readyProgramsCount').textContent = catalog.programs.length;
  const filters = $('readyProgramFilters');
  if(filters){
    filters.innerHTML = READY_PROGRAM_FILTERS.map(filter => `<button type="button" class="lib-chip${filter.id === readyProgramFilter ? ' active' : ''}" data-ready-filter="${filter.id}">${filter.label}</button>`).join('');
    filters.querySelectorAll('[data-ready-filter]').forEach(button => button.addEventListener('click', () => {
      readyProgramFilter = button.dataset.readyFilter || 'all';
      renderReadyPrograms();
    }));
  }
  renderReadyProgramActive(catalog.programs);
  grid.innerHTML = programs.length ? programs.map(program => readyProgramCardHtml(program, profile)).join('') : '<div class="lib-empty">Под этот фильтр программ пока нет.</div>';
  grid.querySelectorAll('[data-ready-program]').forEach(button => button.addEventListener('click', () => openReadyProgram(button.dataset.readyProgram)));
}
function readyProgramPreviewHtml(program, profile){
  const firstWeek = program.weeks?.[0];
  const firstSession = program.sessions?.[0];
  if(!firstWeek || !firstSession) return '';
  if(!validExerciseLibrary(libData)){
    return `<section class="ready-program-preview"><span>Твой первый день</span><b>${escapeHtml(String(firstSession.title))}</b><small>Проверим упражнения по анкете сразу после загрузки базы.</small></section>`;
  }
  const sample = readyProgramSessionExercises(firstSession, profile);
  const names = sample.slice(0, 3).map(exercise => escapeHtml(exerciseName(exercise))).join(' · ');
  return `<section class="ready-program-preview"><span>Твой первый день</span><b>${escapeHtml(firstSession.title)}</b><small>${sample.length ? `${sample.length} упр.: ${names}${sample.length > 3 ? '…' : ''}` : 'Сверим упражнения с анкетой при активации.'}</small></section>`;
}
async function openReadyProgram(id){
  const [catalog] = await Promise.all([ensureReadyPrograms(), ensureLibrary()]);
  const program = catalog?.programs?.find(item => String(item.id) === String(id));
  const overlay = $('workoutDetail');
  if(!program || !overlay) return;
  const profile = planFromProfile();
  const availability = readyProgramAvailability(program, profile);
  const weekRows = (program.weeks || []).map((week, index) => {
    const scheme = readyProgramWeekScheme(program, week, profile);
    return `<li><b>${escapeHtml(week.title || `Неделя ${index + 1}`)}</b><span>${escapeHtml(week.note || '')}</span><em>${escapeHtml(`${scheme.sets}×${scheme.reps} · отдых ${scheme.rest}`)}</em></li>`;
  }).join('');
  const tags = (program.tags || []).map(tag => `<span class="lib-tag">${escapeHtml(String(tag))}</span>`).join('');
  const cover = program.cover ? `<img class="ready-program-sheet-cover" src="${escapeHtml(String(program.cover))}" alt="" onerror="this.remove()">` : '';
  const availabilityNote = availability.available
    ? '<div class="ready-program-fit"><b>Подходит твоей анкете</b><span>Упражнения ещё раз отсеются по уровню, месту, инвентарю и ограничениям прямо перед сборкой.</span></div>'
    : `<div class="medical-note">${escapeHtml(availability.reason)}</div>`;
  overlay.innerHTML = `<div class="lib-sheet ready-program-sheet"><div class="lib-sheet-head"><div><span class="ready-program-eyebrow">${escapeHtml(String(program.eyebrow || 'Готовая программа'))}</span><h2>${escapeHtml(String(program.title))}</h2></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>${cover}<p class="ready-program-sheet-description">${escapeHtml(String(program.description || ''))}</p><div class="lib-tags">${tags}</div><div class="ready-program-facts"><span><b>${escapeHtml(String(program.duration || ''))}</b><small>одна тренировка</small></span><span><b>${escapeHtml(String(program.frequency || ''))}</b><small>${escapeHtml(String(program.schedule || ''))}</small></span><span><b>${(program.weeks || []).length} недели</b><small>плавная прогрессия</small></span></div>${availabilityNote}${availability.available ? readyProgramPreviewHtml(program, profile) : ''}<h3 class="ready-program-plan-title">Как идём по неделям</h3><ol class="ready-program-weeks">${weekRows}</ol><button type="button" class="primary shine" id="activateReadyProgram"${availability.available ? '' : ' disabled'}>${availability.available ? 'Сделать основной программой' : 'Недоступна по анкете'}</button><button type="button" class="wkp-skip" id="readyProgramOpenSaved">Мои тренировки</button></div>`;
  overlay.hidden = false;
  overlay.querySelector('.lib-close')?.addEventListener('click', () => { overlay.hidden = true; overlay.innerHTML = ''; });
  const activateButton = overlay.querySelector('#activateReadyProgram');
  if(activateButton && availability.available && program.muscleGroup) activateButton.textContent = 'Добавить в мои тренировки';
  activateButton?.addEventListener('click', () => activateReadyProgram(program.id));
  overlay.querySelector('#readyProgramOpenSaved')?.addEventListener('click', () => { overlay.hidden = true; overlay.innerHTML = ''; jump('saved'); });
}
async function activateReadyProgram(id){
  if(currentWorkoutResume()){
    toast('Сначала заверши или продолжи текущую тренировку');
    return;
  }
  const [catalog] = await Promise.all([ensureReadyPrograms(), ensureLibrary()]);
  const program = catalog?.programs?.find(item => String(item.id) === String(id));
  if(!program) return;
  const built = buildReadyProgram(program, planFromProfile());
  if(!built.workout){ toast(built.error || 'Не получилось собрать программу'); return; }
  state.savedWorkouts.unshift(built.workout);
  if(!program.muscleGroup) state.activeProgramId = built.workout.id;
  save();
  renderSaved();
  renderReadyPrograms();
  const overlay = $('workoutDetail');
  if(overlay){ overlay.hidden = true; overlay.innerHTML = ''; }
  track(program.muscleGroup ? 'ready_program_saved' : 'ready_program_activated', 'programs', { program_id:program.id, weeks:built.workout.programWeeks, days:built.workout.days.length });
  toast(program.muscleGroup ? 'Добавлено в мои тренировки.' : 'Программа активна. Первый день уже в тренировках.');
  jump(program.muscleGroup ? 'saved' : 'training');
}

function migrateSavedWorkoutCollection(workouts, exercises){
  if(!Array.isArray(exercises) || !exercises.length || exercises.some(exercise => !exercise || !exercise.id)){
    return { workouts: Array.isArray(workouts) ? workouts : [], changed: false, skipped: true };
  }
  const byId = new Map((Array.isArray(exercises) ? exercises : []).map(exercise => [String(exercise.id), exercise]));
  let changed = false;
  const migrated = (Array.isArray(workouts) ? workouts : []).map(workout => {
    const nextWorkout = {
      ...workout,
      datasetVersion: EXERCISE_DATASET_VERSION,
      rulesVersion: WORKOUT_RULES_VER
    };
    if(workout.datasetVersion !== EXERCISE_DATASET_VERSION || workout.rulesVersion !== WORKOUT_RULES_VER) changed = true;
    nextWorkout.days = (Array.isArray(workout.days) ? workout.days : []).map(day => {
      const sourceItems = Array.isArray(day.items) ? day.items : [];
      const sourceDone = Array.isArray(day.done) ? day.done : [];
      const validItems = [];
      const validDone = [];
      const legacyItems = Array.isArray(day.legacyItems) ? day.legacyItems.map(item => ({ ...item })) : [];
      sourceItems.forEach((item, index) => {
        const exercise = byId.get(String(item.id));
        if(!exercise){
          legacyItems.push({ ...item, done: !!sourceDone[index], reason: 'missing_exercise' });
          changed = true;
          return;
        }
        const { video, videoSrc, src, poster, ...safeItem } = item;
        const normalized = {
          ...safeItem,
          id: exercise.id,
          name: exercise.displayNameSimple || exercise.nameRu || exercise.name || item.name,
          muscle: (typeof MUS_RU !== 'undefined' && MUS_RU[(exercise.primary || [])[0]]) || item.muscle || '',
          equip: (typeof EQ_RU !== 'undefined' && EQ_RU[exercise.equipment]) || exercise.equipment || item.equip || '',
          sideMode: exerciseSideMode(exercise),
          datasetVersion: EXERCISE_DATASET_VERSION,
          mediaVariantId: exercise.mediaVariantId || exercise.id
        };
        if(video || videoSrc || src || poster || item.name !== normalized.name || item.muscle !== normalized.muscle || item.equip !== normalized.equip || item.sideMode !== normalized.sideMode || item.datasetVersion !== EXERCISE_DATASET_VERSION || item.mediaVariantId !== normalized.mediaVariantId) changed = true;
        validItems.push(normalized);
        validDone.push(!!sourceDone[index]);
      });
      const needsRebuild = legacyItems.length > 0;
      if(!!day.needsRebuild !== needsRebuild || sourceItems.length !== validItems.length) changed = true;
      const nextDay = { ...day, items: validItems, done: validDone, needsRebuild };
      if(legacyItems.length) nextDay.legacyItems = legacyItems;
      else delete nextDay.legacyItems;
      return nextDay;
    });
    return nextWorkout;
  });
  return { workouts: migrated, changed };
}
function migrateSavedWorkoutState(){
  if(!validExerciseLibrary(libData)) return false;
  const result = migrateSavedWorkoutCollection(state.savedWorkouts, libData);
  if(!result.changed) return false;
  state.savedWorkouts = result.workouts;
  save();
  return true;
}

function wkProgress(wk){
  let total = 0, done = 0;
  wk.days.forEach(d => { total += d.items.length; done += d.done.filter(Boolean).length; });
  return total ? Math.round(done / total * 100) : 0;
}

function renderSaved(){
  const list = $('savedList');
  if(!list) return;
  if(!readyProgramsData && state.savedWorkouts.some(wk => wk.kind === 'ready')){
    ensureReadyPrograms().then(catalog => { if(catalog) renderSaved(); });
  }
  if($('savedCount')) $('savedCount').textContent = state.savedWorkouts.length;
  if(!state.savedWorkouts.length){ list.innerHTML = '<div class="saved-empty">Пока пусто. Собери свою программу выше, сгенерируй тренировку или сохрани план недели.</div>'; return; }
  list.innerHTML = state.savedWorkouts.map((wk, i) => {
    const prog = wkProgress(wk), allDone = prog === 100;
    const needsRebuild = (wk.days || []).some(day => day.needsRebuild);
    const nEx = wk.days.reduce((s, d) => s + d.items.length, 0);
    const ready = wk.kind === 'ready';
    const active = ready && String(wk.id) === String(state.activeProgramId || '');
    const meta = ready
      ? `${wk.programWeeks || 4} недели · ${wk.days.length} тренировок · ${nEx} упр.`
      : (wk.kind === 'week' ? wk.days.length + ' дн. · ' : '') + nEx + ' упр. · ' + (wk.days[0] ? wk.days[0].sr : '');
    const coverPath = ready ? (readyProgramById(wk.programId)?.cover || wk.programCover || '') : '';
    const cover = coverPath ? `<span class="saved-program-thumb"><img src="${escapeHtml(String(coverPath))}" alt="" loading="lazy" onerror="this.remove()"></span>` : '';
    const badge = needsRebuild ? 'обновить' : active ? 'активна' : allDone ? 'готово' : prog + '%';
    return `<button type="button" class="saved-card${allDone ? ' done' : ''}${ready ? ' saved-ready-program' : ''}${active ? ' active' : ''}" data-w="${i}">${cover}<span class="saved-card-main"><span class="saved-card-top"><b>${escapeHtml(wk.title)}</b><span class="saved-badge${allDone || active ? ' ok' : ''}">${badge}</span></span><span class="saved-meta">${escapeHtml(meta)}</span><span class="saved-prog"><i style="width:${prog}%"></i></span></span></button>`;
  }).join('');
  list.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => openSavedWorkout(Number(b.dataset.w))));
}

// --- ОБЗОР тренировки: список + кнопка «Начать» на каждый день ---
async function openSavedWorkout(idx){
  await ensureLibrary();
  idx = await prepareReadyWorkout(idx);
  const wk = state.savedWorkouts[idx], o = $('workoutDetail');
  if(!wk || !o) return;
  const activeResume = currentWorkoutResume();
  const dayEntries = wk.days.map((d, di) => ({ d, di }));
  if(wk.kind === 'ready') dayEntries.sort((a, b) => Number(a.d.done.every(Boolean)) - Number(b.d.done.every(Boolean)));
  const daysHtml = dayEntries.map(({ d, di }) => {
    const paused = activeResume && activeResume.wkIdx === idx && activeResume.dayIdx === di;
    const items = d.items.map((it, ii) => {
      const meta = [it.muscle, it.equip, workoutSideMeta(it)].filter(Boolean).join(' · ');
      return `<div class="wk-item-row"><button type="button" class="wk-item${d.done[ii] ? ' done' : ''}" data-d="${di}" data-i="${ii}"><span class="wk-check"></span><span class="wk-item-b"><b>${escapeHtml(it.name)}</b><span>${escapeHtml(meta)}</span></span><span class="wk-item-sr">${escapeHtml(it.sr)}</span></button><button type="button" class="workout-replace-icon" data-replace-saved="${ii}" data-replace-day-index="${di}" aria-label="Заменить ${escapeHtml(it.name)}" title="Заменить упражнение">↻</button></div>`;
    }).join('');
    const resumeHint = paused ? `<p class="workout-resume-hint">На паузе: ${escapeHtml(workoutResumeProgressText(activeResume))}</p>` : '';
    return `<div class="wk-day"><div class="wk-day-h"><span>${escapeHtml(d.title)}</span><span class="wk-sr">${escapeHtml(d.sr)} · отдых ${escapeHtml(d.rest || '')}</span></div>${items}${resumeHint}<button type="button" class="primary shine wk-start" data-day="${di}">${paused ? '▶ Продолжить тренировку' : `▶ Начать ${wk.days.length > 1 ? 'день' : 'тренировку'}${d.counted ? ' заново' : ''}`}</button></div>`;
  }).join('');
  const rebuildNote = (wk.days || []).some(day => day.needsRebuild)
    ? '<div class="medical-note">Часть старых упражнений больше не поддерживается и была безопасно убрана. Пересобери программу, чтобы заполнить день актуальными упражнениями.</div>'
    : '';
  const isReady = wk.kind === 'ready';
  const canActivate = isReady && String(wk.id) !== String(state.activeProgramId || '') && wk.profileSignature === readyProgramProfileSignature(planFromProfile());
  const readyNote = isReady
    ? `<div class="ready-program-saved-note"><b>${escapeHtml(wk.programEyebrow || 'Готовая программа')}</b><span>${wk.programWeeks || 4} недели · ${wk.days.length} тренировок. Следующий незакрытый день появится на главной карточке тренировок.</span></div>`
    : '';
  const staleReadyNote = isReady && wk.profileSignature !== readyProgramProfileSignature(planFromProfile())
    ? '<div class="medical-note">Анкета изменилась после сборки этой программы. Выбери её заново в «Готовых программах», чтобы безопасно пересобрать упражнения.</div>'
    : '';
  o.innerHTML = `<div class="lib-sheet"><div class="lib-sheet-head"><h2>${escapeHtml(wk.title)}</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>${readyNote}${staleReadyNote}${rebuildNote}<p class="gen-hint" style="margin:0 0 12px">Жми «Начать» — проведу по упражнениям с трекингом подходов. Полностью выполненная тренировка автоматически попадёт в отчёт дня. Или тапни упражнение, чтобы посмотреть технику.</p>${daysHtml}<div class="wk-actions">${canActivate ? '<button type="button" class="primary shine" id="wkMakeActive">Сделать основной программой</button>' : ''}<button type="button" class="wk-del" id="wkDel">Удалить</button></div></div>`;
  o.hidden = false;
  o.querySelector('.lib-close')?.addEventListener('click', () => { o.hidden = true; o.innerHTML = ''; });
  o.querySelectorAll('.wk-item').forEach(btn => btn.addEventListener('click', () => {
    const it = wk.days[Number(btn.dataset.d)].items[Number(btn.dataset.i)];
    const ex = libData && libData.find(x => String(x.id) === String(it.id));
    if(ex) openLibDetail(ex); else toast('Описание появится после загрузки базы');
  }));
  o.querySelectorAll('[data-replace-saved]').forEach(btn => btn.addEventListener('click', () => openWorkoutReplacement({
    kind:'saved', workoutIndex:idx, dayIndex:Number(btn.dataset.replaceDayIndex), itemIndex:Number(btn.dataset.replaceSaved)
  })));
  o.querySelectorAll('.wk-start').forEach(btn => btn.addEventListener('click', () => {
    const di = Number(btn.dataset.day);
    if(activeResume && activeResume.wkIdx === idx && activeResume.dayIdx === di){
      resumeWorkoutPlayer();
      return;
    }
    startWorkoutPlayer({ rawItems: wk.days[di].items, title: wk.days.length > 1 ? wk.days[di].title : wk.title, wkIdx: idx, dayIdx: di });
  }));
  o.querySelector('#wkMakeActive')?.addEventListener('click', () => {
    if(currentWorkoutResume()){ toast('Сначала заверши или продолжи текущую тренировку'); return; }
    state.activeProgramId = wk.id;
    save(); renderSaved(); renderReadyPrograms(); renderDayWorkout();
    o.hidden = true; o.innerHTML = '';
    toast('Программа снова стала основной');
    jump('training');
  });
  o.querySelector('#wkDel')?.addEventListener('click', () => {
    if(String(state.activeProgramId || '') === String(wk.id)) state.activeProgramId = '';
    state.savedWorkouts.splice(idx, 1); save(); o.hidden = true; o.innerHTML = ''; renderSaved(); renderReadyPrograms(); renderDayWorkout(); toast('Удалено');
  });
}

// --- ГИД ПО ТРЕНИРОВКЕ: упражнения по одному, «Сделан подход», видео/техника ---
let workoutLogCache = { owner:'', sessions:[], sets:[] };
let workoutLogSyncTimer = 0;
let workoutLogSyncPromise = null;
let workoutLogSyncAgain = false;

function pbUuid(){
  if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.random() * 16 | 0;
    return (char === 'x' ? value : (value & 3 | 8)).toString(16);
  });
}
function workoutLogOwner(){ return pbUser?.id || 'guest'; }
function workoutLogStorageKey(owner){ return PB_WORKOUT_LOG_STORAGE_PREFIX + String(owner || 'guest'); }
function workoutLogJournalValid(value, owner){
  const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;
  const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const base = row => row && typeof row === 'object' && !Array.isArray(row) && uuid(row.id) && row.userId === owner && typeof row.synced === 'boolean';
  if(!value || !Array.isArray(value.sessions) || !Array.isArray(value.sets) || value.sessions.length > 1500 || value.sets.length > 2400) return false;
  if(!value.sessions.every(row => base(row) && /^\d{4}-\d{2}-\d{2}$/.test(row.localDay) && date(row.localDay)
    && text(row.title,300) && ['day','generated','saved','manual'].includes(row.source)
    && date(row.startedAt) && (row.completedAt == null || date(row.completedAt) && Date.parse(row.completedAt) >= Date.parse(row.startedAt))
    && ['in_progress','completed','abandoned'].includes(row.status))) return false;
  if(!value.sets.every(row => base(row) && uuid(row.sessionId) && text(row.exerciseId,180) && text(row.exerciseName,300)
    && integer(row.exerciseIndex,0,40) && integer(row.setIndex,1,20) && integer(row.reps,0,1000)
    && (row.targetRepsMin == null || integer(row.targetRepsMin,0,1000))
    && (row.targetRepsMax == null || integer(row.targetRepsMax,0,1000))
    && (row.targetRepsMin == null || row.targetRepsMax == null || row.targetRepsMax >= row.targetRepsMin)
    && (row.weightKg === null || Number.isFinite(row.weightKg) && row.weightKg >= 0 && row.weightKg <= 2000)
    && ['total','per_implement','bodyweight','assistance'].includes(row.loadMode) && date(row.completedAt))) return false;
  return new Set(value.sessions.map(row => row.id)).size === value.sessions.length
    && new Set(value.sets.map(row => row.id)).size === value.sets.length
    && new Set(value.sets.map(row => JSON.stringify([row.sessionId,row.exerciseIndex,row.setIndex]))).size === value.sets.length;
}
function workoutLogStore(){
  const owner = workoutLogOwner();
  if(workoutLogCache.owner === owner) return workoutLogCache;
  try{
    const parsed = JSON.parse(WLStorage.getItem(workoutLogStorageKey(owner)) || 'null');
    workoutLogCache = {
      owner,
      sessions:Array.isArray(parsed?.sessions) ? parsed.sessions : [],
      sets:Array.isArray(parsed?.sets) ? parsed.sets : []
    };
  }catch(e){ workoutLogCache = { owner, sessions:[], sets:[] }; }
  return workoutLogCache;
}
function saveWorkoutLogStore(){
  const store = workoutLogStore();
  store.sessions = store.sessions.slice(-120);
  store.sets = store.sets.sort((a, b) => String(a.completedAt || '').localeCompare(String(b.completedAt || ''))).slice(-1200);
  try{ WLStorage.setItem(workoutLogStorageKey(store.owner), JSON.stringify({ sessions:store.sessions, sets:store.sets })); }catch(e){}
}
async function pbRestoreWorkoutJournal(snapshot, context){
  const current = () => context.isCurrent() && snapshot.owner === context.owner && snapshot.epoch === context.epoch;
  if(!current() || typeof snapshot.raw !== 'string' || !navigator.locks?.request) throw new Error('workout_recovery_unavailable');
  return navigator.locks.request('wl-workout-recovery:' + context.owner, { mode:'exclusive', ifAvailable:true }, async lock => {
    const key = workoutLogStorageKey(context.owner);
    const unchanged = () => current() && WLStorage.getItem(key) === snapshot.raw;
    if(!lock || !unchanged()) throw new Error('workout_recovery_changed');
    const scope = await pbCreateMediaScope(context);
    if(!unchanged()) throw new Error('workout_recovery_changed');
    const read = async (table, columns, order, limit) => {
      let query = scope.client.from(table).select(columns).eq('user_id',context.owner);
      query = context.epoch ? query.eq('progress_epoch',context.epoch) : query.is('progress_epoch',null);
      const {data,error} = await query.order(order,{ascending:false}).limit(limit);
      if(error || !unchanged() || !Array.isArray(data) || data.length > limit
        || data.some(row => row.user_id !== context.owner || row.progress_epoch !== context.epoch)) throw new Error('workout_recovery_unavailable');
      return data;
    };
    const sessions = (await read('pb_workout_sessions',
      'id,user_id,local_day,title,source,source_workout_id,started_at,completed_at,status,progress_epoch','started_at',120)).map(row => ({
      id:row.id,userId:row.user_id,localDay:row.local_day,title:row.title,source:row.source,sourceWorkoutId:row.source_workout_id,
      startedAt:row.started_at,completedAt:row.completed_at,status:row.status,persisted:true,synced:true
    }));
    const sets = (await read('pb_workout_sets',
      'id,session_id,user_id,exercise_id,exercise_name,equipment,exercise_index,set_index,target_reps_min,target_reps_max,actual_reps,weight_kg,load_mode,completed_at,progress_epoch','completed_at',400))
      .map(row => normalizeWorkoutSetRow(row,true));
    if(!workoutLogJournalValid({sessions,sets},context.owner) || !unchanged()) throw new Error('workout_recovery_unavailable');
    const retiredSessionIds = [...new Set(snapshot.retiredSessionIds || [])];
    if(retiredSessionIds.length > 20 || retiredSessionIds.some(id => !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))) throw new Error('workout_recovery_unavailable');
    const restored = {version:2,owner:context.owner,epoch:context.epoch,retiredSessionIds,sessions,sets};
    // Web Storage replaces one key atomically; a quota failure leaves the original journal untouched.
    WLStorage.setItem(key,JSON.stringify(restored));
    workoutLogCache = restored;
    return {sessions:sessions.length,sets:sets.length};
  });
}
function openWorkoutLogRecovery(){
  const context = pbCaptureMediaContext();
  if(!context.isCurrent()) return;
  let snapshot, url;
  try{
    const raw = WLStorage.getItem(workoutLogStorageKey(context.owner));
    if(typeof raw !== 'string') throw new Error('workout_backup_missing');
    const resume = pbPlain(state.workoutResume,null);
    let retired = [];
    const validId = id => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
    try{ const parsed = JSON.parse(raw); if(Array.isArray(parsed?.retiredSessionIds)) retired = parsed.retiredSessionIds.filter(validId).slice(-18); }catch(e){}
    snapshot = {owner:context.owner,epoch:context.epoch,raw,resume,
      retiredSessionIds:[...new Set([...retired,resume?.session?.id,player?.session?.id].filter(validId))]};
    url = URL.createObjectURL(new Blob([JSON.stringify({format:'fitness-workout-backup-v1',capturedAt:new Date().toISOString(),...snapshot},null,2)],{type:'application/json'}));
  }catch(e){ toast('Не удалось прочитать историю для резервной копии. Исходные данные не изменены.'); return; }
  openSheet(`<div class="lib-sheet-head"><h2>Восстановить историю?</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="workout-recovery">
      <p>Локальную историю не удалось проверить. Можно заменить её последними записями с сервера: до 120 тренировок и 400 подходов.</p>
      <p>Неотправленные подходы и незавершённая тренировка не перенесутся автоматически. Исходная история и пауза останутся в скачанной копии. Записи в базе не изменятся.</p>
      <a id="workoutRecoveryDownload" class="secondary" download="fitness-workout-backup.json"><i data-lucide="download" aria-hidden="true"></i>Скачать исходную историю</a>
      <p class="sheet-sub">Копия содержит личные данные. Храните её в безопасном месте.</p>
      <label class="progress-reset-confirm"><input id="workoutRecoveryConfirm" type="checkbox" disabled><span>Копия скачана. Согласен заменить локальную историю и закрыть незавершённую тренировку.</span></label>
      <button id="workoutRecoveryRestore" class="primary" disabled><i data-lucide="refresh-cw" aria-hidden="true"></i>Восстановить с сервера</button>
      <p id="workoutRecoveryStatus" role="status" aria-live="polite"></p>
    </div>`);
  const root = $('appSheet'), link = $('workoutRecoveryDownload'), confirm = $('workoutRecoveryConfirm'), button = $('workoutRecoveryRestore'), status = $('workoutRecoveryStatus');
  if(!root || !link || !confirm || !button || !status){ URL.revokeObjectURL(url); return; }
  let active = true, downloaded = false, busy = false;
  const isCurrent = () => active && context.isCurrent() && link?.isConnected && !root.hidden;
  root.wlWorkoutRecoveryCleanup = () => { active = false; URL.revokeObjectURL(url); delete root.wlWorkoutRecoveryCleanup; };
  link.href = url;
  window.lucide?.createIcons?.({root});
  link.addEventListener('click', event => {
    if(!isCurrent()){ event.preventDefault(); return; }
    downloaded = true; confirm.disabled = false;
  });
  confirm.addEventListener('change', () => { button.disabled = busy || !downloaded || !confirm.checked; });
  button.addEventListener('click', async () => {
    if(!isCurrent() || busy || !downloaded || !confirm.checked) return;
    busy = true; button.disabled = true; confirm.disabled = true; status.textContent = 'Загружаем историю...';
    let committed = false;
    try{
      const result = await pbRestoreWorkoutJournal(snapshot,{...context,isCurrent});
      committed = true;
      if(!isCurrent()) return;
      if(player) leaveWorkoutFocusMode(player);
      player = null;
      const detail = $('workoutDetail'); if(detail){detail.hidden = true;detail.innerHTML = '';}
      state.workoutResume = null;
      try{ save(); }catch(e){}
      closeSheet();
      toast(`Восстановлено: тренировок ${result.sessions}, подходов ${result.sets}.`);
      renderSaved(); renderDayWorkout();
    }catch(e){
      if(isCurrent()) status.textContent = committed ? 'История восстановлена. Перезагрузите страницу, чтобы продолжить.' : 'Не удалось восстановить историю. Исходная запись не заменена. Повторите попытку или откройте это окно заново.';
    }finally{
      if(isCurrent()){ busy = false; confirm.disabled = false; button.disabled = !confirm.checked; }
    }
  });
}
function parseWorkoutPrescription(sr){
  const match = String(sr || '').trim().match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*[-–—]\s*(\d+))?/i);
  const sets = Math.max(1, Math.min(20, Number(match?.[1]) || 3));
  const repsMin = Math.max(0, Math.min(1000, Number(match?.[2]) || 12));
  const repsMax = Math.max(repsMin, Math.min(1000, Number(match?.[3]) || repsMin));
  return { sets, repsMin, repsMax };
}
function exerciseLoadMode(exercise){
  const explicit = String(exercise?.loadMode || exercise?.load_mode || '');
  if(['total', 'per_implement', 'bodyweight', 'assistance'].includes(explicit)) return explicit;
  const name = String(exercise?.nameRu || exercise?.name || '').toLowerCase();
  const equipment = String(exercise?.equipment || '').toLowerCase();
  if(/с помощью|гравитрон|противовес|assisted/.test(name)) return 'assistance';
  if(equipment === 'body only') return 'bodyweight';
  if(equipment === 'dumbbell' || equipment === 'kettlebells') return 'per_implement';
  return 'total';
}
function workoutLoadLabel(mode){
  if(mode === 'per_implement') return 'Вес одного снаряда, кг';
  if(mode === 'assistance') return 'Помощь тренажёра, кг';
  if(mode === 'bodyweight') return 'Дополнительный вес, кг';
  return 'Рабочий вес, кг';
}
function workoutSetDefaults(records, exerciseId, sessionId, setIndex, targetReps){
  const all = (Array.isArray(records) ? records : []).filter(row => String(row?.exerciseId) === String(exerciseId));
  const current = all
    .filter(row => String(row.sessionId) === String(sessionId) && Number(row.setIndex) < Number(setIndex))
    .sort((a, b) => Number(b.setIndex) - Number(a.setIndex))[0];
  if(current) return { weightKg:current.weightKg == null ? null : Number(current.weightKg), reps:Number(current.reps), source:'current' };
  const previous = all
    .filter(row => String(row.sessionId) !== String(sessionId))
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
  if(previous.length){
    const latestSessionId = previous[0].sessionId;
    const fromSet = previous.find(row => String(row.sessionId) === String(latestSessionId) && Number(row.setIndex) === Number(setIndex))
      || previous.find(row => String(row.sessionId) === String(latestSessionId));
    if(fromSet) return { weightKg:fromSet.weightKg == null ? null : Number(fromSet.weightKg), reps:Number(fromSet.reps), source:'previous' };
  }
  return { weightKg:null, reps:Math.max(1, Number(targetReps) || 1), source:'target' };
}
function normalizeWorkoutSetRow(row, synced){
  if(!row) return null;
  return {
    id:String(row.id || ''),
    sessionId:String(row.sessionId || row.session_id || ''),
    userId:String(row.userId || row.user_id || workoutLogOwner()),
    exerciseId:String(row.exerciseId || row.exercise_id || ''),
    exerciseName:String(row.exerciseName || row.exercise_name || ''),
    equipment:String(row.equipment || ''),
    exerciseIndex:Number(row.exerciseIndex ?? row.exercise_index ?? 0),
    setIndex:Number(row.setIndex ?? row.set_index ?? 1),
    targetRepsMin:row.targetRepsMin ?? row.target_reps_min ?? null,
    targetRepsMax:row.targetRepsMax ?? row.target_reps_max ?? null,
    reps:Number(row.reps ?? row.actual_reps ?? 0),
    weightKg:(row.weightKg ?? row.weight_kg) == null ? null : Number(row.weightKg ?? row.weight_kg),
    loadMode:String(row.loadMode || row.load_mode || 'total'),
    completedAt:String(row.completedAt || row.completed_at || ''),
    synced:synced ?? !!row.synced
  };
}
function workoutSessionRow(session){
  return {
    id:session.id,
    user_id:session.userId,
    local_day:session.localDay,
    title:session.title,
    source:session.source,
    source_workout_id:session.sourceWorkoutId || null,
    started_at:session.startedAt,
    completed_at:session.completedAt || null,
    status:session.status || 'in_progress',
    app_version:APP_VER,
    progress_epoch:pbProgressEpochId
  };
}
function workoutSetRow(record){
  return {
    id:record.id,
    session_id:record.sessionId,
    user_id:record.userId,
    exercise_id:record.exerciseId,
    exercise_name:record.exerciseName,
    equipment:record.equipment || null,
    exercise_index:record.exerciseIndex,
    set_index:record.setIndex,
    target_reps_min:record.targetRepsMin,
    target_reps_max:record.targetRepsMax,
    actual_reps:record.reps,
    weight_kg:record.weightKg,
    load_mode:record.loadMode,
    completed_at:record.completedAt,
    progress_epoch:pbProgressEpochId
  };
}
async function pbFlushWorkoutLogQueue(){
  workoutLogSyncAgain = true;
  if(workoutLogSyncPromise) return workoutLogSyncPromise;
  workoutLogSyncPromise = (async () => {
    let success;
    do {
      workoutLogSyncAgain = false;
      success = await pbUploadWorkoutLogQueue();
    } while(success && workoutLogSyncAgain);
    return success;
  })();
  try{ return await workoutLogSyncPromise; }
  finally{ workoutLogSyncPromise = null; }
}
function pbQueueHealthWorkouts(context){
  if(!pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return;
  try{
    context = context || pbCaptureMediaContext();
    if(!context.isCurrent()) return;
    Promise.resolve(window.PrimeBodyAppleHealth?.queueWorkoutCompletion(context)).catch(() => {});
  }catch(e){}
}
async function pbUploadWorkoutLogQueue(){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated || navigator.onLine === false) return false;
  const context = pbCaptureMediaContext(), owner = context.owner, epoch = context.epoch;
  const store = workoutLogStore();
  if(store.storageError) return false;
  const current = () => context.isCurrent() && pbProgressEpochReady && workoutLogStore() === store;
  let scope;
  try{ scope = await pbCreateMediaScope(context); }catch(e){ return false; }
  if(!current()) return false;
  // Acknowledge the uploaded snapshot, never edits made while the request was in flight.
  const acknowledge = (records, rows, toRow) => records.forEach((record, index) => {
    if(JSON.stringify(toRow(record)) === JSON.stringify(rows[index])) record.synced = true;
    else workoutLogSyncAgain = true;
  });
  const pendingSessions = store.sessions.filter(row => row.userId === owner && !row.synced);
  if(pendingSessions.length){
    const rows = pendingSessions.map(workoutSessionRow);
    const { error } = await scope.client.from('pb_workout_sessions').upsert(rows, { onConflict:'id' });
    if(error || !current()) return false;
    acknowledge(pendingSessions, rows, workoutSessionRow);
    saveWorkoutLogStore();
  }
  const pendingSets = store.sets.filter(row => row.userId === owner && !row.synced);
  for(let index = 0; index < pendingSets.length; index += 100){
    const batch = pendingSets.slice(index, index + 100);
    const rows = batch.map(workoutSetRow);
    const { error } = await scope.client.from('pb_workout_sets').upsert(rows, { onConflict:'id' });
    if(error || !current()) return false;
    acknowledge(batch, rows, workoutSetRow);
    saveWorkoutLogStore();
  }
  pbQueueHealthWorkouts(context);
  return true;
}
function scheduleWorkoutLogSync(){
  clearTimeout(workoutLogSyncTimer);
  workoutLogSyncTimer = setTimeout(() => { Promise.resolve(pbFlushWorkoutLogQueue()).catch(() => {}); }, 350);
}
async function pbLoadWorkoutSetHistory(exerciseIds){
  if(!sb || !pbUser || !pbProgressEpochReady || pbProgressResetting || pbSessionInvalidated) return false;
  const ids = [...new Set((exerciseIds || []).map(String).filter(Boolean))].slice(0, 40);
  if(!ids.length) return false;
  const context = pbCaptureMediaContext(), store = workoutLogStore();
  if(store.storageError) return false;
  const before = new Map(store.sets.map(row => [String(row.id), JSON.stringify(row)]));
  try{
    const scope = await pbCreateMediaScope(context);
    let query = scope.client.from('pb_workout_sets')
      .select('id,session_id,user_id,exercise_id,exercise_name,equipment,exercise_index,set_index,target_reps_min,target_reps_max,actual_reps,weight_kg,load_mode,completed_at')
      .eq('user_id', context.owner).in('exercise_id', ids);
    query = context.epoch ? query.eq('progress_epoch', context.epoch) : query.is('progress_epoch', null);
    const { data, error } = await query
      .order('completed_at', { ascending:false })
      .limit(400);
    if(error || !context.isCurrent() || workoutLogStore() !== store) return false;
    const merged = new Map(store.sets.map(row => [String(row.id), row]));
    (data || []).forEach(row => {
      if(row.user_id !== context.owner) return;
      const normalized = normalizeWorkoutSetRow(row, true);
      if(!normalized?.id) return;
      const local = merged.get(normalized.id);
      if(local && (!local.synced || JSON.stringify(local) !== before.get(normalized.id))) return;
      merged.set(normalized.id, normalized);
    });
    store.sets = Array.from(merged.values());
    saveWorkoutLogStore();
    return true;
  }catch(e){ return false; }
}
function createWorkoutSession(opts){
  const source = opts?.dayWorkout ? 'day' : opts?.wkIdx != null ? 'saved' : (opts?.source === 'manual' ? 'manual' : 'generated');
  return {
    id:pbUuid(),
    userId:workoutLogOwner(),
    localDay:todayKey(),
    title:String(opts?.title || 'Тренировка').slice(0, 300),
    source,
    sourceWorkoutId:opts?.wkIdx != null ? String(state.savedWorkouts?.[opts.wkIdx]?.id || '') : null,
    startedAt:new Date().toISOString(),
    completedAt:null,
    status:'in_progress',
    synced:false,
    persisted:false
  };
}
function ensureWorkoutSession(activePlayer){
  const session = activePlayer?.session;
  if(!session || !session.userId) return null;
  if(!session.persisted){
    const store = workoutLogStore();
    store.sessions.push(session);
    session.persisted = true;
    saveWorkoutLogStore();
  }
  return session;
}
function parseWorkoutSetInput(rawWeight, rawReps){
  const reps = Math.round(Number(String(rawReps ?? '').replace(',', '.')));
  const weightText = String(rawWeight ?? '').trim().replace(',', '.');
  const weightKg = weightText === '' ? null : Number(weightText);
  if(!Number.isFinite(reps) || reps < 1 || reps > 1000) return null;
  if(weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 2000)) return null;
  return { reps, weightKg };
}
function recordWorkoutSet(activePlayer, item, rawWeight, rawReps){
  if(!activePlayer || !item) return null;
  const values = parseWorkoutSetInput(rawWeight, rawReps);
  if(!values) return null;
  const { reps, weightKg } = values;
  const session = ensureWorkoutSession(activePlayer);
  if(!session) return null;
  const prescription = parseWorkoutPrescription(item.sr);
  const exerciseIndex = Number.isInteger(item.sourceIndex) ? item.sourceIndex : activePlayer.idx;
  const setIndex = activePlayer.set + 1;
  const store = workoutLogStore();
  const existing = store.sets.find(row => row.sessionId === session.id && row.exerciseIndex === exerciseIndex && row.setIndex === setIndex);
  const record = normalizeWorkoutSetRow({
    id:existing?.id || pbUuid(),
    sessionId:session.id,
    userId:session.userId,
    exerciseId:item.id,
    exerciseName:item.name,
    equipment:item.equip,
    exerciseIndex,
    setIndex,
    targetRepsMin:prescription.repsMin,
    targetRepsMax:prescription.repsMax,
    reps,
    weightKg:weightKg === null ? null : Math.round(weightKg * 100) / 100,
    loadMode:item.loadMode || 'total',
    completedAt:new Date().toISOString(),
    synced:false
  }, false);
  if(existing) Object.assign(existing, record); else store.sets.push(record);
  saveWorkoutLogStore();
  scheduleWorkoutLogSync();
  try{ track('workout_set_logged', 'training', { exercise_id:item.id, set_index:setIndex, reps, has_weight:weightKg !== null }); }catch(e){}
  return record;
}
function finishWorkoutSession(activePlayer, status){
  const session = activePlayer?.session;
  if(!session?.persisted || session.userId !== workoutLogOwner()) return;
  session.status = status === 'completed' ? 'completed' : 'abandoned';
  session.completedAt = new Date().toISOString();
  session.synced = false;
  const store = workoutLogStore();
  const stored = store.sessions.find(row => row.id === session.id && row.userId === session.userId);
  if(stored) Object.assign(stored, session);
  else if(session.userId === workoutLogOwner()) store.sessions.push(session);
  saveWorkoutLogStore();
  scheduleWorkoutLogSync();
}
function workoutHistoryRecords(){ return workoutLogStore().sets; }
function previousWorkoutSessionSets(records, exerciseId, sessionId){
  const previous = (records || [])
    .filter(row => String(row.exerciseId) === String(exerciseId) && String(row.sessionId) !== String(sessionId))
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
  if(!previous.length) return [];
  const latestSessionId = previous[0].sessionId;
  return previous.filter(row => row.sessionId === latestSessionId).sort((a, b) => Number(a.setIndex) - Number(b.setIndex));
}
function formatWorkoutWeight(value){
  if(value == null || value === '') return 'без веса';
  return `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits:2 })} кг`;
}
function workoutPreviousText(item, sessionId){
  const rows = previousWorkoutSessionSets(workoutHistoryRecords(), item.id, sessionId);
  if(!rows.length) return 'Первое выполнение: выбери комфортный вес';
  return `Прошлый раз: ${rows.slice(0, 4).map(row => `${formatWorkoutWeight(row.weightKg)} × ${row.reps}`).join(' · ')}`;
}
function workoutLoadHistoryHtml(item, sessionId){
  const previous = (workoutHistoryRecords() || [])
    .filter(row => String(row.exerciseId) === String(item.id) && String(row.sessionId) !== String(sessionId))
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
  const groups = [];
  previous.forEach(row => {
    let group = groups.find(value => value.sessionId === row.sessionId);
    if(!group){ group = { sessionId:row.sessionId, date:row.completedAt, rows:[] }; groups.push(group); }
    group.rows.push(row);
  });
  const recent = groups.slice(0, 3);
  if(!recent.length) return '<span class="wkp-history-empty">История появится после первой тренировки.</span>';
  return recent.map(group => {
    const date = new Date(group.date).toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
    const sets = group.rows.sort((a, b) => a.setIndex - b.setIndex).map(row => `${formatWorkoutWeight(row.weightKg)} × ${row.reps}`).join(' · ');
    return `<div class="wkp-history-row"><time>${escapeHtml(date)}</time><span>${escapeHtml(sets)}</span></div>`;
  }).join('');
}
function workoutProgressionAdvice(item, sessionId){
  const prescription = parseWorkoutPrescription(item?.sr);
  const rows = previousWorkoutSessionSets(workoutHistoryRecords(), item?.id, sessionId);
  if(!rows.length) return { kind:'first', text:'Первый раз: выбери вес, при котором остаётся запас 2–3 повтора.', action:'', weightKg:null };
  const latestWeight = rows.find(row => row.weightKg != null)?.weightKg;
  const reps = rows.map(row => Number(row.reps) || 0);
  const allTop = reps.length >= prescription.sets && reps.every(value => value >= prescription.repsMax);
  const belowTarget = reps.some(value => value > 0 && value < prescription.repsMin);
  if(item?.loadMode === 'bodyweight'){
    if(allTop) return { kind:'up', text:`Все подходы в верхней границе. В следующий раз попробуй +1 повтор до ${prescription.repsMax + 2}.`, action:'Добавить повтор', reps:Math.min(prescription.repsMax + 2, Math.max(...reps) + 1) };
    return { kind:'hold', text:'Сначала добери верхнюю границу повторов с чистой техникой.', action:'', weightKg:null };
  }
  if(latestWeight == null) return { kind:'hold', text:'Вес пока не записан. Зафиксируй рабочий вес — дальше предложу прогрессию.', action:'', weightKg:null };
  const increment = item?.loadMode === 'per_implement' ? 1 : 2.5;
  if(allTop){
    const nextWeight = item?.loadMode === 'assistance' ? Math.max(0, Number(latestWeight) - increment) : Number(latestWeight) + increment;
    return { kind:'up', text:item?.loadMode === 'assistance' ? `Все подходы уверенно: уменьши помощь на ${increment} кг.` : `Все подходы в верхней границе: можно добавить ${increment} кг.`, action:item?.loadMode === 'assistance' ? 'Меньше помощи' : `+${increment} кг`, weightKg:Math.round(nextWeight * 100) / 100 };
  }
  if(belowTarget){
    const nextWeight = Math.max(0, Math.round(Number(latestWeight) * .95 * 100) / 100);
    return { kind:'down', text:'Повторы просели ниже цели. Оставь вес или чуть снизь его, чтобы вернуть технику.', action:nextWeight < latestWeight ? `Поставить ${nextWeight} кг` : '', weightKg:nextWeight < latestWeight ? nextWeight : null };
  }
  return { kind:'hold', text:'Рабочая зона найдена. Повтори этот вес и спокойно добери верхнюю границу повторов.', action:'Оставить вес', weightKg:Number(latestWeight) };
}
function primeHaptic(kind){
  try{
    const haptic = window.Telegram?.WebApp?.HapticFeedback;
    if(kind === 'success') haptic?.notificationOccurred?.('success');
    else haptic?.impactOccurred?.(kind || 'light');
  }catch(e){}
}
function workoutRestSeconds(value){
  const match = String(value || '').match(/(\d+)/);
  return Math.max(30, Math.min(180, Number(match?.[1]) || 60));
}
function workoutCountdown(seconds){
  const safe = Math.max(0, Math.ceil(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function clearWorkoutRestTimer(activePlayer, keepDeadline){
  if(!activePlayer) return;
  if(activePlayer.restTimer) clearInterval(activePlayer.restTimer);
  activePlayer.restTimer = 0;
  if(!keepDeadline) activePlayer.restUntil = 0;
}
function updateWorkoutRestTimer(){
  if(!player || !player.restUntil) return;
  const remaining = Math.max(0, player.restUntil - Date.now());
  const label = $('wkpRestCountdown');
  if(label) label.textContent = workoutCountdown(remaining / 1000);
  if(remaining > 0) return;
  clearWorkoutRestTimer(player);
  primeHaptic('success');
  if($('wkpRest')) $('wkpRest').remove();
}
function startWorkoutRestTimer(activePlayer){
  if(!activePlayer) return;
  clearWorkoutRestTimer(activePlayer);
  activePlayer.restUntil = Date.now() + Math.max(30, Number(activePlayer.restSeconds) || 60) * 1000;
  activePlayer.restTimer = window.setInterval(updateWorkoutRestTimer, 500);
}
function enterWorkoutFocusMode(activePlayer){
  if(!activePlayer || activePlayer.focusOn) return;
  activePlayer.focusOn = true;
  document.body.classList.add('workout-focus-mode');
  primeHaptic('light');
  const tg = window.Telegram?.WebApp;
  try{ tg?.requestFullscreen?.(); }catch(e){}
  try{ tg?.lockOrientation?.(); }catch(e){}
  try{ const lock = screen.orientation?.lock?.('portrait'); if(lock?.catch) lock.catch(() => {}); }catch(e){}
}
function leaveWorkoutFocusMode(activePlayer){
  clearWorkoutRestTimer(activePlayer);
  document.body.classList.remove('workout-focus-mode');
  const tg = window.Telegram?.WebApp;
  try{ tg?.unlockOrientation?.(); }catch(e){}
  try{ screen.orientation?.unlock?.(); }catch(e){}
  try{ tg?.exitFullscreen?.(); }catch(e){}
}
function workoutSetDraft(activePlayer, item){
  const key = workoutSetDraftKey(activePlayer, item, activePlayer.set);
  const legacyKey = `${item.id}:${activePlayer.set + 1}`;
  activePlayer.setDrafts = activePlayer.setDrafts || {};
  if(activePlayer.setDrafts[key]) return activePlayer.setDrafts[key];
  if(activePlayer.setDrafts[legacyKey]){
    activePlayer.setDrafts[key] = activePlayer.setDrafts[legacyKey];
    delete activePlayer.setDrafts[legacyKey];
    return activePlayer.setDrafts[key];
  }
  const recorded = workoutRecordedSet(activePlayer, item, activePlayer.set);
  if(recorded){
    activePlayer.setDrafts[key] = { weightKg:recorded.weightKg, reps:recorded.reps };
    return activePlayer.setDrafts[key];
  }
  const prescription = parseWorkoutPrescription(item.sr);
  const defaults = workoutSetDefaults(workoutHistoryRecords(), item.id, activePlayer.session?.id, activePlayer.set + 1, prescription.repsMax);
  activePlayer.setDrafts[key] = { weightKg:defaults.weightKg, reps:defaults.reps };
  return activePlayer.setDrafts[key];
}
function setsFromSr(sr){ return parseWorkoutPrescription(sr).sets; }
const WORKOUT_PLAYER_MAX_SETS = 20;
function workoutItemSetCount(item){
  const prescribed = setsFromSr(item?.sr);
  const requested = Number(item?.sets);
  return Number.isFinite(requested)
    ? Math.max(1, Math.min(WORKOUT_PLAYER_MAX_SETS, Math.round(requested)))
    : prescribed;
}
function addWorkoutSet(activePlayer){
  const itemIndex = Math.max(0, Number(activePlayer?.idx) || 0);
  const item = activePlayer?.items?.[itemIndex];
  if(!item) return 0;
  const current = workoutItemSetCount(item);
  if(current >= WORKOUT_PLAYER_MAX_SETS) return 0;
  item.sets = current + 1;
  return item.sets;
}
function workoutExerciseIndex(activePlayer, item, fallbackIndex){
  if(Number.isInteger(item?.sourceIndex)) return item.sourceIndex;
  if(Number.isInteger(fallbackIndex)) return fallbackIndex;
  return Math.max(0, Number(activePlayer?.idx) || 0);
}
function workoutSetDraftKey(activePlayer, item, setIndex){
  return `${workoutExerciseIndex(activePlayer, item)}:${item?.id || 'exercise'}:${Math.max(0, Number(setIndex) || 0) + 1}`;
}
function workoutCurrentExerciseSets(activePlayer, item, itemIndex){
  const sessionId = activePlayer?.session?.id;
  if(!sessionId || !item) return [];
  const exerciseIndex = workoutExerciseIndex(activePlayer, item, itemIndex);
  return workoutHistoryRecords()
    .filter(row => String(row.sessionId) === String(sessionId) && Number(row.exerciseIndex) === exerciseIndex)
    .sort((a, b) => Number(a.setIndex) - Number(b.setIndex));
}
function workoutRecordedSet(activePlayer, item, setIndex, itemIndex){
  const target = Math.max(0, Number(setIndex) || 0) + 1;
  return workoutCurrentExerciseSets(activePlayer, item, itemIndex).find(row => Number(row.setIndex) === target) || null;
}
function workoutExerciseComplete(activePlayer, item, itemIndex){
  const completed = new Set(workoutCurrentExerciseSets(activePlayer, item, itemIndex).map(row => Number(row.setIndex)));
  const required = workoutItemSetCount(item);
  for(let index = 1; index <= required; index += 1) if(!completed.has(index)) return false;
  return true;
}
function workoutFirstIncompleteSet(activePlayer, item, itemIndex){
  const completed = new Set(workoutCurrentExerciseSets(activePlayer, item, itemIndex).map(row => Number(row.setIndex)));
  const required = workoutItemSetCount(item);
  for(let index = 1; index <= required; index += 1) if(!completed.has(index)) return index - 1;
  return Math.max(0, required - 1);
}
function workoutSyncExerciseCompletion(activePlayer, item, itemIndex){
  if(!activePlayer || !item) return false;
  const index = Number.isInteger(itemIndex) ? itemIndex : Math.max(0, Number(activePlayer.idx) || 0);
  const sourceIndex = workoutExerciseIndex(activePlayer, item, index);
  const complete = workoutExerciseComplete(activePlayer, item, index);
  activePlayer.completedSourceIndexes = activePlayer.completedSourceIndexes || new Set();
  if(complete) activePlayer.completedSourceIndexes.add(sourceIndex);
  else activePlayer.completedSourceIndexes.delete(sourceIndex);
  if(activePlayer.wkIdx != null){
    const day = state.savedWorkouts?.[activePlayer.wkIdx]?.days?.[activePlayer.dayIdx];
    if(day){ day.done = Array.isArray(day.done) ? day.done : []; day.done[sourceIndex] = complete; save(); }
  }
  return complete;
}
function workoutNavigateExercise(activePlayer, nextIndex){
  if(!activePlayer?.items?.length) return false;
  const index = Math.max(0, Math.min(activePlayer.items.length - 1, Number(nextIndex) || 0));
  activePlayer.idx = index;
  activePlayer.set = workoutFirstIncompleteSet(activePlayer, activePlayer.items[index], index);
  activePlayer.side = 'left';
  activePlayer.showVideo = false;
  activePlayer.showSteps = false;
  return true;
}
function workoutIncompleteExerciseIndexes(activePlayer){
  return (activePlayer?.items || []).map((item, index) => workoutExerciseComplete(activePlayer, item, index) ? -1 : index).filter(index => index >= 0);
}
function workoutSideTransition(sideMode, currentSide){
  if(sideMode === 'per_side' && currentSide !== 'right') return { completeSet:false, nextSide:'right' };
  return { completeSet:true, nextSide:'left' };
}
function playerItem(it){
  const ex = libData ? libData.find(x => String(x.id) === String(it.id)) : null;
  if(!ex) return null;
  const steps = ((ex.stepsRu && ex.stepsRu.length ? ex.stepsRu : ex.steps) || []).filter(s => s && s.trim());
  const pose = ex.pose || 'pushup';
  return {
    id: ex.id,
    name: exerciseName(ex),
    muscle: MUS_RU[(ex.primary || [])[0]] || it.muscle || '',
    equip: EQ_RU[ex.equipment] || ex.equipment || it.equip || '',
    sr: it.sr || '3×12',
    sets: workoutItemSetCount(it),
    sideMode: workoutItemSideMode(it),
    loadMode: exerciseLoadMode(ex),
    pose,
    steps,
    video: null,
    videoSrc: ex.videoSrc || null,
    poster: ex.poster || null,
    mediaHidden: exerciseMediaHidden(ex),
    mediaNote: exerciseMediaNote(ex),
    mediaVariantId: ex.mediaVariantId || ex.id,
    sourceIndex: Number.isInteger(it._sourceIndex) ? it._sourceIndex : null
  };
}
function filterWorkoutRawItemsForProfile(items, p){
  if(!Array.isArray(items) || !libData) return items || [];
  const safe = [], dropped = [];
  for(const [sourceIndex, it] of items.entries()){
    const ex = libData.find(x => String(x.id) === String(it.id));
    if(!ex){
      dropped.push(it.name || 'Удалённое упражнение');
      continue;
    }
    if(!exerciseAllowedForProfile(ex, p, profileEquipmentCapabilities(p))){
      dropped.push(exerciseName(ex));
      continue;
    }
    safe.push({ ...it, _sourceIndex: Number.isInteger(it?._sourceIndex) ? it._sourceIndex : sourceIndex });
  }
  if(dropped.length) toast(`Убрал ${dropped.length} упр. из-за ограничений анкеты`);
  return safe;
}
let player = null;
let workoutResumeOpening = false;
const WORKOUT_RESUME_VERSION = 1;

function workoutResumeItems(activePlayer){
  return (activePlayer?.items || []).map(item => ({
    id:item.id,
    name:item.name,
    muscle:item.muscle,
    equip:item.equip,
    sr:item.sr,
    sets:Math.max(1, Math.min(20, Math.round(Number(item.sets) || 1))),
    sideMode:item.sideMode,
    _sourceIndex:Number.isInteger(item.sourceIndex) ? item.sourceIndex : null
  }));
}
function workoutResumeSnapshot(activePlayer){
  if(!activePlayer?.introDone) return null;
  const rawItems = workoutResumeItems(activePlayer);
  if(!rawItems.length) return null;
  const itemIndex = Math.max(0, Math.min(rawItems.length - 1, Number(activePlayer.idx) || 0));
  const activeItem = activePlayer.items[itemIndex];
  const maxSet = Math.max(0, (Number(activeItem?.sets) || 1) - 1);
  return {
    version:WORKOUT_RESUME_VERSION,
    savedAt:new Date().toISOString(),
    localDay:todayKey(),
    title:String(activePlayer.title || 'Тренировка').slice(0, 300),
    rawItems,
    idx:itemIndex,
    set:Math.max(0, Math.min(maxSet, Number(activePlayer.set) || 0)),
    side:activePlayer.side === 'right' ? 'right' : 'left',
    showSteps:!!activePlayer.showSteps,
    showVideo:!!activePlayer.showVideo,
    completedSourceIndexes:Array.from(activePlayer.completedSourceIndexes || []).filter(Number.isInteger),
    setDrafts:pbPlain(activePlayer.setDrafts, {}),
    setDraftTouched:pbPlain(activePlayer.setDraftTouched, {}),
    restUntil:Number(activePlayer.restUntil) > Date.now() ? Number(activePlayer.restUntil) : 0,
    restSeconds:Math.max(30, Number(activePlayer.restSeconds) || 60),
    wkIdx:Number.isInteger(activePlayer.wkIdx) ? activePlayer.wkIdx : null,
    dayIdx:Number.isInteger(activePlayer.dayIdx) ? activePlayer.dayIdx : null,
    dayWorkout:!!activePlayer.dayWorkout,
    session:pbPlain(activePlayer.session, null)
  };
}
function abandonStoredWorkoutSession(resume){
  const sessionId = resume?.session?.id;
  if(!sessionId || !resume?.session?.persisted) return;
  const store = workoutLogStore();
  const session = store.sessions.find(item => String(item?.id) === String(sessionId));
  if(!session || session.completedAt) return;
  session.status = 'abandoned';
  session.completedAt = new Date().toISOString();
  session.synced = false;
  saveWorkoutLogStore();
  scheduleWorkoutLogSync();
}
function clearWorkoutResume(options = {}){
  const resume = state.workoutResume;
  if(options.abandon) abandonStoredWorkoutSession(resume);
  state.workoutResume = null;
  if(options.persist !== false) save();
}
function currentWorkoutResume(){
  const resume = state.workoutResume;
  if(!resume || typeof resume !== 'object' || !Array.isArray(resume.rawItems) || !resume.rawItems.length) return null;
  const belongsToAnotherUser = resume.session?.userId && pbUser?.id && String(resume.session.userId) !== String(pbUser.id);
  const staleDayWorkout = resume.dayWorkout && (!resume.localDay || resume.localDay !== todayKey() || state.dayWorkout?.date !== resume.localDay);
  if(belongsToAnotherUser || staleDayWorkout){
    clearWorkoutResume({ persist:true });
    return null;
  }
  return resume;
}
function workoutResumeProgressText(resume){
  if(!resume) return '';
  const total = Array.isArray(resume.rawItems) ? resume.rawItems.length : 0;
  const item = resume.rawItems[Math.max(0, Number(resume.idx) || 0)] || {};
  const set = Math.max(0, Number(resume.set) || 0) + 1;
  const itemName = String(item.name || '').trim();
  const position = `упражнение ${Math.min(total || 1, Math.max(1, (Number(resume.idx) || 0) + 1))} из ${total || 1} · подход ${set}`;
  return itemName ? `${itemName} · ${position}` : position;
}
function openPausedWorkoutEnd(){
  const resume = currentWorkoutResume();
  const owner = pbUser?.id, epoch = pbProgressEpochId;
  if(!resume || !owner || player || pbSessionInvalidated || pbProgressResetting || !pbProgressEpochReady) return;
  openSheet(`<div class="lib-sheet-head"><h2>Прервать тренировку?</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub workout-end-title">${escapeHtml(resume.title || 'Тренировка')}</p>
    <p class="sheet-sub">Записанные подходы и рабочие веса останутся в истории. Тренировка не будет засчитана как выполненная. Продолжить эту паузу после прерывания нельзя.</p>
    <div class="workout-end-actions"><button type="button" class="secondary" id="workoutEndCancel">Оставить на паузе</button><button type="button" class="danger" id="workoutEndConfirm"><i data-lucide="square" aria-hidden="true"></i>Прервать</button></div>
    <p class="sheet-sub" id="workoutEndStatus" role="status"></p>`);
  const root = $('appSheet'), submit = $('workoutEndConfirm'), status = $('workoutEndStatus');
  $('workoutEndCancel')?.addEventListener('click', closeSheet);
  try{ window.lucide?.createIcons({root}); }catch(e){}
  submit?.addEventListener('click', () => {
    if(!submit.isConnected || submit.disabled || root.hidden) return;
    if(pbUser?.id !== owner || pbProgressEpochId !== epoch || pbSessionInvalidated || pbProgressResetting
      || !pbProgressEpochReady || state.workoutResume !== resume || player){
      submit.disabled = true;
      status.textContent = 'Тренировка изменилась. Закрой окно и проверь текущую паузу.';
      return;
    }
    submit.disabled = true;
    try{
      if(!clearWorkoutResume({abandon:true})){
        if(submit.isConnected){ status.textContent = 'Не удалось сохранить прерывание. Пауза сохранена; повтори попытку.'; submit.disabled = false; }
        return;
      }
    }catch(e){
      state.workoutResume = resume;
      status.textContent = 'Не удалось закрыть паузу на устройстве. Повтори попытку.';
      submit.disabled = false;
      return;
    }
    closeSheet({restoreFocus:false});
    renderSaved();
    renderDayWorkout();
    $('startDay')?.focus({preventScroll:true});
    toast('Тренировка прервана. Записанные подходы сохранены.');
  });
}
function saveWorkoutResume(activePlayer){
  const resume = workoutResumeSnapshot(activePlayer);
  if(!resume) return false;
  state.workoutResume = resume;
  save();
  return true;
}
function resumeWorkoutRestTimer(activePlayer){
  if(!activePlayer?.restUntil || activePlayer.restUntil <= Date.now()){
    clearWorkoutRestTimer(activePlayer);
    return;
  }
  clearWorkoutRestTimer(activePlayer, true);
  activePlayer.restTimer = window.setInterval(updateWorkoutRestTimer, 500);
}
async function resumeWorkoutPlayer(){
  if(player || workoutResumeOpening) return true;
  const resume = currentWorkoutResume();
  if(!resume) return false;
  workoutResumeOpening = true;
  try{
    await startWorkoutPlayer({ ...resume, rawItems:resume.rawItems, resumeState:resume, skipIntro:true });
    return !!player;
  }finally{
    workoutResumeOpening = false;
  }
}
if(!window.__pbWorkoutResumeLifecycleBound){
  window.__pbWorkoutResumeLifecycleBound = true;
  const persistActiveWorkout = () => { if(player?.introDone) saveWorkoutResume(player); };
  window.addEventListener('pagehide', persistActiveWorkout);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden') persistActiveWorkout();
  });
}
const WORKOUT_REPLACEMENT_REASONS = Object.freeze([
  { id:'match', label:'По плану', hint:'Максимально близко к исходному движению.' },
  { id:'easier', label:'Сделать легче', hint:'Приоритет более простому и контролируемому варианту.' },
  { id:'equipment', label:'Другой инвентарь', hint:'Сначала более доступный инвентарь из твоей анкеты.' },
  { id:'comfort', label:'Без дискомфорта', hint:'Без прыжков и резких вариантов. Острая боль — остановись.' },
  { id:'variety', label:'Разнообразить', hint:'Та же мышечная цель, но другой паттерн движения.' }
]);
let workoutReplacementState = { target:null, query:'', reason:'match', scope:'similar', muscle:'' };

function workoutReplacementReason(reason){
  return WORKOUT_REPLACEMENT_REASONS.find(item => item.id === reason) || WORKOUT_REPLACEMENT_REASONS[0];
}
function workoutReplacementCandidatesForIntent(current, items, profile, query, availableEquipment){
  const candidates = workoutReplacementCandidates(current, items, profile, query, availableEquipment);
  const reason = workoutReplacementState.reason || 'match';
  const source = (Array.isArray(libData) ? libData : []).find(exercise => String(exercise.id) === String(current?.id)) || current || {};
  const easeScore = candidate => {
    let score = 0;
    if(candidate.level === 'beginner') score += 30;
    if(candidate.level === 'intermediate') score += 12;
    if(candidate.category === 'plyometrics') score -= 45;
    if(candidate.mechanic === 'compound') score -= 8;
    if(candidate.equipment === 'body only' || candidate.equipment === 'bands') score += 8;
    return score;
  };
  const equipmentScore = candidate => {
    if(candidate.equipment === 'body only') return 28;
    if(candidate.equipment === 'bands') return 24;
    if(candidate.equipment === 'dumbbell') return 12;
    return 0;
  };
  return candidates.slice().sort((a, b) => {
    let delta = 0;
    if(reason === 'easier') delta = easeScore(b) - easeScore(a);
    if(reason === 'equipment') delta = equipmentScore(b) - equipmentScore(a);
    if(reason === 'comfort') delta = easeScore(b) - easeScore(a);
    if(reason === 'variety'){
      const aDifferent = a.movementPattern && a.movementPattern !== source.movementPattern ? 1 : 0;
      const bDifferent = b.movementPattern && b.movementPattern !== source.movementPattern ? 1 : 0;
      delta = bDifferent - aDifferent;
    }
    if(delta) return delta;
    return replacementCandidateScore(b, source) - replacementCandidateScore(a, source)
      || exerciseName(a).localeCompare(exerciseName(b), 'ru');
  });
}

function workoutReplacementTargetItems(target){
  if(!target) return [];
  if(target.kind === 'day') return Array.isArray(state.dayWorkout?.items) ? state.dayWorkout.items : [];
  if(target.kind === 'saved') return state.savedWorkouts?.[target.workoutIndex]?.days?.[target.dayIndex]?.items || [];
  if(target.kind === 'generated') return Array.isArray(lastGen?.items) ? lastGen.items : [];
  if(target.kind === 'player') return Array.isArray(player?.items) ? player.items : [];
  return [];
}
function workoutReplacementAvailableEquipment(target, profile){
  const p = profile || planFromProfile();
  let selected = null;
  if(target?.kind === 'generated') selected = lastGen?.equipment;
  else if(target?.kind === 'saved') selected = state.savedWorkouts?.[target.workoutIndex]?.equipment;
  else if(target?.kind === 'player' && player?.wkIdx != null) selected = state.savedWorkouts?.[player.wkIdx]?.equipment;
  else if(target?.kind === 'player' && player?.wkIdx == null && !player?.dayWorkout) selected = lastGen?.equipment;
  return Array.isArray(selected) && selected.length ? new Set(selected) : profileEquipmentCapabilities(p);
}
function workoutReplacementTargetIndex(target){
  if(!target) return -1;
  return target.kind === 'player' ? Number(target.playerIndex) : Number(target.itemIndex);
}
function workoutReplacementTargetCurrent(target){
  const items = workoutReplacementTargetItems(target);
  const index = workoutReplacementTargetIndex(target);
  return Number.isInteger(index) && index >= 0 ? items[index] || null : null;
}
function workoutReplacementMeta(exercise){
  const muscle = MUS_RU[(exercise?.primary || [])[0]] || '';
  const equipment = EQ_RU[exercise?.equipment] || exercise?.equipment || '';
  const level = LVL_RU[exercise?.level] || exercise?.level || '';
  return [muscle, equipment, level].filter(Boolean).join(' · ');
}
function renderWorkoutAlternativeList(){
  const root = $('workoutAlternativeList');
  const target = workoutReplacementState.target;
  const current = workoutReplacementTargetCurrent(target);
  if(!root || !current) return;
  const profile = planFromProfile();
  const items = workoutReplacementTargetItems(target);
  const available = workoutReplacementAvailableEquipment(target, profile);
  const allMode = workoutReplacementState.scope === 'all';
  const candidates = (allMode
    ? workoutReplacementAllCandidates(current, items, profile, workoutReplacementState.query, available, workoutReplacementState.muscle)
    : workoutReplacementCandidatesForIntent(current, items, profile, workoutReplacementState.query, available)
  ).slice(0, 24);
  document.querySelectorAll('[data-workout-scope]').forEach(button => button.classList.toggle('on', button.dataset.workoutScope === workoutReplacementState.scope));
  const reasons = $('workoutReplacementReasons');
  const auto = $('workoutAutoReplace');
  const muscles = $('workoutReplacementMuscles');
  const hint = $('workoutReplacementHint');
  const search = $('workoutReplacementSearch');
  if(reasons) reasons.hidden = allMode;
  if(auto) auto.hidden = allMode;
  if(muscles){
    muscles.hidden = !allMode;
    muscles.innerHTML = [''].concat(LIB_MUSCLES).map(muscle => `<button type="button" class="lib-chip${workoutReplacementState.muscle === muscle ? ' active' : ''}" data-workout-muscle="${escapeHtml(muscle)}">${escapeHtml(muscle ? (MUS_RU[muscle] || muscle) : 'Все мышцы')}</button>`).join('');
    muscles.querySelectorAll('[data-workout-muscle]').forEach(button => button.addEventListener('click', () => {
      workoutReplacementState.muscle = button.dataset.workoutMuscle || '';
      renderWorkoutAlternativeList();
    }));
  }
  if(hint) hint.textContent = allMode
    ? 'Выбери любое доступное упражнение из базы. Ограничения здоровья и инвентарь из анкеты продолжают учитываться.'
    : workoutReplacementReason(workoutReplacementState.reason).hint;
  if(search) search.placeholder = allMode ? 'Название упражнения…' : 'Поиск похожего упражнения…';
  root.innerHTML = candidates.length ? candidates.map(exercise => `
    <button type="button" class="workout-alternative" data-workout-alternative="${escapeHtml(exercise.id)}">
      <span class="workout-alternative-copy"><b>${escapeHtml(exerciseName(exercise))}</b><em>${escapeHtml(workoutReplacementMeta(exercise))}</em></span>
      <span class="workout-alternative-action">Выбрать</span>
    </button>`).join('') : '<div class="workout-alternative-empty">Подходящих вариантов не найдено. Попробуй изменить запрос.</div>';
  root.querySelectorAll('[data-workout-alternative]').forEach(button => button.addEventListener('click', () => applyWorkoutReplacement(button.dataset.workoutAlternative)));
}
async function openWorkoutReplacement(target){
  const library = await ensureLibrary();
  if(!validExerciseLibrary(library)){ toast('База упражнений не загрузилась'); return; }
  const current = workoutReplacementTargetCurrent(target);
  const currentExercise = library.find(exercise => String(exercise.id) === String(current?.id));
  if(!current || !currentExercise){ toast('Не удалось найти упражнение в базе'); return; }
  workoutReplacementState = { target:{ ...target }, query:'', reason:'match', scope:'similar', muscle:'' };
  const profile = planFromProfile();
  const candidates = workoutReplacementCandidatesForIntent(current, workoutReplacementTargetItems(target), profile, '', workoutReplacementAvailableEquipment(workoutReplacementState.target, profile));
  openSheet(`<div class="lib-sheet-head"><div><h2>Заменить упражнение</h2><p class="sheet-sub">Можно подобрать похожее движение или выбрать другое упражнение из всей доступной базы.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="workout-replacement-current"><span>Сейчас</span><b>${escapeHtml(exerciseName(currentExercise))}</b><em>${escapeHtml(workoutReplacementMeta(currentExercise))}</em></div>
    <div class="workout-replacement-scope" role="group" aria-label="Способ выбора"><button type="button" class="on" data-workout-scope="similar">Похожие</button><button type="button" data-workout-scope="all">Вся база</button></div>
    <div class="workout-reason-list" id="workoutReplacementReasons" aria-label="Причина замены">${WORKOUT_REPLACEMENT_REASONS.map(reason => `<button type="button" class="workout-reason${reason.id === 'match' ? ' on' : ''}" data-workout-reason="${reason.id}">${escapeHtml(reason.label)}</button>`).join('')}</div>
    <p class="sheet-note" id="workoutReplacementHint">${escapeHtml(workoutReplacementReason('match').hint)}</p>
    <button type="button" class="primary shine workout-auto-replace" id="workoutAutoReplace"${candidates.length ? '' : ' disabled'}>↻ Подобрать автоматически</button>
    <label class="workout-replacement-search"><span>Выбрать вручную</span><input class="lib-search" id="workoutReplacementSearch" type="search" placeholder="Поиск похожего упражнения…" autocomplete="off"></label>
    <div class="lib-frow workout-replacement-muscles" id="workoutReplacementMuscles" aria-label="Фильтр по мышцам" hidden></div>
    <div class="workout-alternative-list" id="workoutAlternativeList"></div>`);
  $('workoutAutoReplace')?.addEventListener('click', () => {
    const profile = planFromProfile();
    const best = workoutReplacementCandidatesForIntent(current, workoutReplacementTargetItems(target), profile, '', workoutReplacementAvailableEquipment(target, profile))[0];
    if(best) applyWorkoutReplacement(best.id);
  });
  document.querySelectorAll('[data-workout-reason]').forEach(button => button.addEventListener('click', () => {
    workoutReplacementState.reason = button.dataset.workoutReason || 'match';
    document.querySelectorAll('[data-workout-reason]').forEach(item => item.classList.toggle('on', item === button));
    const hint = $('workoutReplacementHint');
    if(hint) hint.textContent = workoutReplacementReason(workoutReplacementState.reason).hint;
    renderWorkoutAlternativeList();
  }));
  document.querySelectorAll('[data-workout-scope]').forEach(button => button.addEventListener('click', () => {
    workoutReplacementState.scope = button.dataset.workoutScope === 'all' ? 'all' : 'similar';
    workoutReplacementState.muscle = '';
    renderWorkoutAlternativeList();
  }));
  $('workoutReplacementSearch')?.addEventListener('input', event => {
    workoutReplacementState.query = event.target.value || '';
    renderWorkoutAlternativeList();
  });
  renderWorkoutAlternativeList();
}
function applyWorkoutReplacement(replacementId){
  const target = workoutReplacementState.target;
  const items = workoutReplacementTargetItems(target);
  const index = workoutReplacementTargetIndex(target);
  const current = workoutReplacementTargetCurrent(target);
  if(!target || !current || !Number.isInteger(index)) return;
  const profile = planFromProfile();
  const available = workoutReplacementAvailableEquipment(target, profile);
  const selectable = workoutReplacementState.scope === 'all'
    ? workoutReplacementAllCandidates(current, items, profile, '', available)
    : workoutReplacementCandidatesForIntent(current, items, profile, '', available);
  const replacement = selectable
    .find(exercise => String(exercise.id) === String(replacementId));
  if(!replacement){ toast('Эта замена больше недоступна'); renderWorkoutAlternativeList(); return; }
  const previousId = current.id;
  let shouldSave = false;
  if(target.kind === 'day'){
    state.dayWorkout.items = replaceWorkoutItem(state.dayWorkout.items, index, replacement);
    shouldSave = true;
  } else if(target.kind === 'saved'){
    const day = state.savedWorkouts?.[target.workoutIndex]?.days?.[target.dayIndex];
    if(!day) return;
    day.items = replaceWorkoutItem(day.items, index, replacement);
    if(Array.isArray(day.done)) day.done[index] = false;
    shouldSave = true;
  } else if(target.kind === 'generated'){
    if(!lastGen?.items?.[index]) return;
    lastGen.items = lastGen.items.slice();
    lastGen.items[index] = replacement;
  } else if(target.kind === 'player'){
    if(!player?.items?.[index]) return;
    const activeItem = player.items[index];
    const sourceIndex = Number.isInteger(activeItem.sourceIndex) ? activeItem.sourceIndex : index;
    const rawReplacement = workoutItemFromExercise(replacement, activeItem.sr);
    if(player.dayWorkout && state.dayWorkout?.items?.[sourceIndex]){
      state.dayWorkout.items = replaceWorkoutItem(state.dayWorkout.items, sourceIndex, replacement);
      shouldSave = true;
    } else if(player.wkIdx != null){
      const day = state.savedWorkouts?.[player.wkIdx]?.days?.[player.dayIdx];
      if(day?.items?.[sourceIndex]){
        day.items = replaceWorkoutItem(day.items, sourceIndex, replacement);
        if(Array.isArray(day.done)) day.done[sourceIndex] = false;
        shouldSave = true;
      }
    } else if(lastGen?.items?.[sourceIndex]){
      lastGen.items = lastGen.items.slice();
      lastGen.items[sourceIndex] = replacement;
    }
    const normalized = playerItem({ ...rawReplacement, _sourceIndex:sourceIndex });
    if(!normalized) return;
    player.items = player.items.slice();
    player.items[index] = normalized;
    player.completedSourceIndexes?.delete(sourceIndex);
    player.set = 0;
    player.side = 'left';
    player.showVideo = false;
    player.showSteps = false;
    saveWorkoutResume(player);
  }
  if(shouldSave) save();
  closeSheet();
  try{ track('workout_exercise_replaced', 'training', { source:target.kind, from_id:previousId, to_id:replacement.id, reason:workoutReplacementState.reason || 'match', scope:workoutReplacementState.scope || 'similar' }); }catch(e){}
  toast('Упражнение заменено');
  if(target.kind === 'day') renderDayWorkout();
  else if(target.kind === 'saved') openSavedWorkout(target.workoutIndex);
  else if(target.kind === 'generated') renderGenResult(lastGen.items, lastGen.scheme);
  else if(target.kind === 'player') renderPlayer();
}

function closeWorkoutPlayerOverlay(){
  const o = $('workoutDetail');
  const w = player ? player.wkIdx : null;
  const paused = player?.introDone ? saveWorkoutResume(player) : false;
  if(player){
    leaveWorkoutFocusMode(player);
  }
  if(o){ o.hidden = true; o.innerHTML = ''; }
  player = null;
  if(w != null) openSavedWorkout(w);
  if(paused) toast('Тренировка на паузе — вернёшься с этого же подхода');
}
function workoutPlayerScheme(activePlayer, profile){
  const p = profile || planFromProfile();
  const scheme = activePlayer?.dayWorkout ? primeDayTrainingScheme(p) : trainingSchemeFor(p);
  const workout = activePlayer?.wkIdx != null ? state.savedWorkouts?.[activePlayer.wkIdx] : null;
  const day = workout?.kind === 'ready' ? workout.days?.[activePlayer.dayIdx] : null;
  if(day?.sr){
    const prescription = parseWorkoutPrescription(day.sr);
    scheme.sets = prescription.sets;
    scheme.reps = prescription.repsMin === prescription.repsMax ? String(prescription.repsMin) : `${prescription.repsMin}–${prescription.repsMax}`;
    scheme.rest = day.rest || scheme.rest;
    scheme.loadNote = trainingLoadNote(p, scheme);
  }
  return scheme;
}
function renderWorkoutIntro(){
  const o = $('workoutDetail'); if(!o || !player) return;
  const p = planFromProfile();
  const scheme = workoutPlayerScheme(player, p);
  const medNote = medicalTrainingDisclaimer(p);
  const warmup = warmupPlanFor(p);
  const cooldown = cooldownPlanFor(p);
  o.innerHTML = `<div class="lib-sheet wkp-intro">
    <div class="lib-sheet-head"><h2>${escapeHtml(player.title || 'Тренировка')}</h2><button type="button" class="lib-close" id="wkpIntroClose" aria-label="Закрыть">×</button></div>
    <div class="training-load-note">${escapeHtml(scheme.loadNote)}</div>
    ${medNote ? `<div class="medical-note">${escapeHtml(medNote)}</div>` : ''}
    <div class="prep-summary"><b>${player.items.length} упр. · ${escapeHtml(scheme.sets + '×' + scheme.reps)}</b><span>Отдых: ${escapeHtml(scheme.rest)}. Без боли, рывков и потери техники.</span></div>
    <div class="wkp-actions"><button type="button" class="primary shine" id="wkpIntroStart">Начать тренировку</button><button type="button" class="wkp-skip" id="wkpIntroSkip">Закрыть</button></div>
    <details class="prep-block" open><summary><span>${escapeHtml(warmup.title)}</span><small>${escapeHtml(warmup.summary)}</small></summary>${prepListHtml(warmup.steps)}</details>
    <details class="prep-block"><summary><span>${escapeHtml(cooldown.title)}</span><small>${escapeHtml(cooldown.summary)}</small></summary>${prepListHtml(cooldown.steps)}</details>
  </div>`;
  o.hidden = false;
  o.querySelector('#wkpIntroClose')?.addEventListener('click', closeWorkoutPlayerOverlay);
  o.querySelector('#wkpIntroSkip')?.addEventListener('click', closeWorkoutPlayerOverlay);
  o.querySelector('#wkpIntroStart')?.addEventListener('click', () => { player.introDone = true; enterWorkoutFocusMode(player); renderPlayer(); });
}

async function startWorkoutPlayer(opts = {}){
  const resume = opts?.resumeState && typeof opts.resumeState === 'object' ? opts.resumeState : null;
  if(!resume){
    const previous = currentWorkoutResume();
    if(previous) clearWorkoutResume({ abandon:true });
  }
  const library = await ensureLibrary();
  if(!validExerciseLibrary(library)){
    toast('База упражнений не загрузилась. Проверь соединение и повтори.');
    return;
  }
  player = Object.assign({ idx: 0, set: 0, side:'left', showSteps: false, showVideo: false, introDone: false, completedSourceIndexes: new Set(), setDrafts:{}, setDraftTouched:{}, restUntil:0, restTimer:0, restSeconds:60, focusOn:false }, opts);
  player.completedSourceIndexes = new Set((resume?.completedSourceIndexes || []).filter(Number.isInteger));
  player.setDrafts = pbPlain(resume?.setDrafts, {});
  player.setDraftTouched = pbPlain(resume?.setDraftTouched, {});
  player.session = resume?.session && typeof resume.session === 'object' ? pbPlain(resume.session, null) : createWorkoutSession(opts);
  if(!player.session?.id) player.session = createWorkoutSession(opts);
  const activeScheme = workoutPlayerScheme(player, planFromProfile());
  player.restSeconds = Math.max(30, Number(resume?.restSeconds) || workoutRestSeconds(activeScheme.rest));
  const rawItems = filterWorkoutRawItemsForProfile(opts.rawItems || [], planFromProfile());
  player.items = rawItems.map(playerItem).filter(Boolean);
  if(!player.items.length){
    player = null;
    toast('Все упражнения конфликтуют с ограничениями — пересобери программу');
    return;
  }
  const sessionId = player.session.id;
  Promise.resolve(pbLoadWorkoutSetHistory(player.items.map(item => item.id))).then(loaded => {
    if(!loaded || !player || player.session?.id !== sessionId || !player.introDone) return;
    const item = player.items[player.idx];
    const key = workoutSetDraftKey(player, item, player.set);
    if(!player.setDraftTouched?.[key]) delete player.setDrafts?.[key];
    renderPlayer();
  }).catch(() => {});
  if(resume){
    player.idx = Math.max(0, Math.min(player.items.length - 1, Number(resume.idx) || 0));
    player.set = Math.max(0, Math.min(Math.max(0, workoutItemSetCount(player.items[player.idx]) - 1), Number(resume.set) || 0));
    player.side = resume.side === 'right' ? 'right' : 'left';
    player.showSteps = !!resume.showSteps;
    player.showVideo = !!resume.showVideo;
    player.restUntil = Number(resume.restUntil) > Date.now() ? Number(resume.restUntil) : 0;
  } else if(player.wkIdx != null){
    const done = (state.savedWorkouts[player.wkIdx]?.days[player.dayIdx]?.done) || [];
    done.forEach((isDone, sourceIndex) => { if(isDone) player.completedSourceIndexes.add(sourceIndex); });
    const first = player.items.findIndex((item, i) => !done[Number.isInteger(item.sourceIndex) ? item.sourceIndex : i]);
    player.idx = first < 0 ? 0 : first;
  }
  if(opts.skipIntro || (resume && resume.introDone !== false)) player.introDone = true;
  if(player.introDone){
    enterWorkoutFocusMode(player);
    renderPlayer();
    resumeWorkoutRestTimer(player);
  }
  else renderWorkoutIntro();
}

function renderPlayer(){
  const o = $('workoutDetail'); if(!o || !player) return;
  const total = player.items.length, it = player.items[player.idx];
  const g = state.poseGender === 'f' ? 'f' : 'm';
  const pct = Math.round((player.idx + 1) / total * 100), last = player.idx + 1 >= total;
  const medNote = medicalTrainingDisclaimer(planFromProfile());
  const prescription = parseWorkoutPrescription(it.sr);
  const setCount = workoutItemSetCount(it);
  const addedSetCount = Math.max(0, setCount - prescription.sets);
  const draft = workoutSetDraft(player, it);
  const draftKey = workoutSetDraftKey(player, it, player.set);
  const currentExerciseSets = workoutCurrentExerciseSets(player, it, player.idx);
  const recordedSetIndexes = new Set(currentExerciseSets.map(row => Number(row.setIndex)));
  const editingLoggedSet = recordedSetIndexes.has(player.set + 1);
  const weightValue = draft.weightKg == null ? '' : String(draft.weightKg);
  const repsValue = String(draft.reps || prescription.repsMax);
  const previousText = workoutPreviousText(it, player.session?.id);
  const progression = workoutProgressionAdvice(it, player.session?.id);
  const restRemaining = player.restUntil ? Math.max(0, player.restUntil - Date.now()) : 0;
  const restHtml = restRemaining > 0 ? `<div class="wkp-rest" id="wkpRest"><span>Отдых перед следующим подходом</span><b id="wkpRestCountdown">${workoutCountdown(restRemaining / 1000)}</b><button type="button" id="wkpRestSkip">Пропустить</button></div>` : '';
  const loadLabel = workoutLoadLabel(it.loadMode);
  const sideMode = it.sideMode || 'bilateral';
  const perSide = sideMode === 'per_side';
  const alternatingSides = sideMode === 'alternating';
  const activeSide = player.side === 'right' ? 'right' : 'left';
  const repsLabel = perSide ? 'Повторы на сторону' : 'Повторы по факту';
  const setButtonLabel = editingLoggedSet
    ? 'Сохранить изменения'
    : perSide
    ? (activeSide === 'left' ? 'Левая готова → правая' : 'Записать обе стороны')
    : 'Записать подход';
  const sideGuide = perSide
    ? `<div class="wkp-side-guide" aria-label="Очередность сторон"><span class="${activeSide === 'left' ? 'active' : 'done'}"><i>1</i><b>Левая сторона</b></span><em>→</em><span class="${activeSide === 'right' ? 'active' : ''}"><i>2</i><b>Правая сторона</b></span></div>`
    : alternatingSides
    ? '<p class="wkp-side-hint">Выполняй повторы, чередуя левую и правую стороны.</p>'
    : '';
  const hasPlayableVideo = !!(it.videoSrc || it.video);
  const playerVideo = { src: it.videoSrc, videoId: it.video, poster: it.poster, name: it.name, source: it.videoSrc ? 'itfit' : 'nikita' };
  const media = it.mediaHidden
    ? `<div class="pose-note">${escapeHtml(it.mediaNote || 'Медиа на проверке. Ориентируйся на описание техники.')}</div>`
    : (player.showVideo && hasPlayableVideo)
    ? playableVideoHtml(playerVideo, it.name)
    : it.poster
    ? `<button type="button" class="video-cover wkp-video-cover${it.videoSrc ? ' local-video-cover' : ''}" data-wkp-play-video>
        ${nikitaThumb({ poster: it.poster, videoId: it.video }, 'video-cover-thumb')}
        <span class="video-cover-copy"><b>Смотреть технику</b><span>${escapeHtml(videoSourceLabel(playerVideo))}</span></span>
      </button>`
    : `<div class="pose-demo wkp-pose"><div class="pose-toggle"><button type="button" class="pose-g${g === 'm' ? ' on' : ''}" data-g="m">М</button><button type="button" class="pose-g${g === 'f' ? ' on' : ''}" data-g="f">Ж</button></div><img class="pose-img" src="${poseSrc(it.pose, g)}" alt="" onerror="this.closest('.pose-demo').classList.add('pose-missing')"/></div>`;
  o.innerHTML = `<div class="lib-sheet wkp">
    <div class="lib-sheet-head"><h2>${escapeHtml(player.title || 'Тренировка')}</h2><button type="button" class="lib-close" id="wkpClose" aria-label="Закрыть">×</button></div>
    <div class="wkp-prog"><span>Упражнение ${player.idx + 1} / ${total}</span><div class="wkp-bar"><i style="width:${pct}%"></i></div></div>
    <div class="wkp-exercise-rail" aria-label="Упражнения тренировки">${player.items.map((item, index) => {
      const done = workoutExerciseComplete(player, item, index) || player.completedSourceIndexes?.has(workoutExerciseIndex(player, item, index));
      return `<button type="button" class="${index === player.idx ? 'active' : ''}${done ? ' done' : ''}" data-wkp-exercise-index="${index}" aria-label="${escapeHtml(`Упражнение ${index + 1}: ${item.name}${done ? ', выполнено' : ''}`)}">${index + 1}</button>`;
    }).join('')}</div>
    ${medNote ? `<div class="medical-note">${escapeHtml(medNote)}</div>` : ''}
    ${media}
    ${mediaReportButton('exercise', it.id, it.name)}
    ${hasPlayableVideo && !it.mediaHidden ? `<div class="wkp-mtabs"><button type="button" class="wkp-mtab${!player.showVideo ? ' on' : ''}" data-m="pose">Превью</button><button type="button" class="wkp-mtab${player.showVideo ? ' on' : ''}" data-m="video">▶ Видео техники</button></div>` : ''}
    <h3 class="wkp-name">${escapeHtml(it.name)}</h3>
    <p class="wkp-meta">${escapeHtml(it.muscle)}${it.equip ? ' · ' + escapeHtml(it.equip) : ''}</p>
    <button type="button" class="wkp-replace" id="wkpReplace">↻ Заменить упражнение</button>
    <div class="wkp-sets"><b>Подход ${Math.min(player.set + 1, setCount)}</b> из ${setCount} · цель ${prescription.repsMin === prescription.repsMax ? prescription.repsMin : `${prescription.repsMin}–${prescription.repsMax}`} повт${perSide ? ' на сторону' : ''}</div>
    <div class="wkp-dots" aria-label="Подходы упражнения">${Array.from({ length: setCount }, (_, k) => `<button type="button" class="${recordedSetIndexes.has(k + 1) ? 'on' : ''}${k === player.set ? ' active' : ''}${perSide && k === player.set && activeSide === 'right' && !recordedSetIndexes.has(k + 1) ? ' half' : ''}" data-wkp-set-index="${k}" aria-label="Подход ${k + 1}${recordedSetIndexes.has(k + 1) ? ', записан, открыть для редактирования' : ''}">${k + 1}</button>`).join('')}</div>
    <p class="wkp-edit-hint">Нажми на номер подхода или упражнения, чтобы вернуться и исправить запись.</p>
    <button type="button" class="wkp-add-set" id="wkpAddSet" aria-label="Добавить подход к упражнению ${escapeHtml(it.name)}"><span aria-hidden="true">+</span>Добавить подход${addedSetCount ? `<em>+${addedSetCount}</em>` : ''}</button>
    ${sideGuide}
    <section class="wkp-load-entry" aria-label="Рабочий подход">
      <p class="wkp-previous" id="wkpPrevious">${escapeHtml(previousText)}</p>
      <div class="wkp-progression" data-kind="${escapeHtml(progression.kind || 'hold')}"><span class="wkp-progression-copy"><b>Следующий шаг</b><span>${escapeHtml(progression.text || '')}</span></span>${progression.action && progression.weightKg !== null && progression.weightKg !== undefined ? `<button type="button" id="wkpApplyProgress">${escapeHtml(progression.action)}</button>` : ''}</div>
      <div class="wkp-load-fields">
        <label for="wkpWeight"><span>${escapeHtml(loadLabel)}</span><span class="wkp-number-stepper"><button type="button" data-wkp-adjust="weight" data-delta="-0.5" aria-label="Уменьшить вес">−</button><input id="wkpWeight" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(weightValue)}" placeholder="0" aria-label="${escapeHtml(loadLabel)}"><button type="button" data-wkp-adjust="weight" data-delta="0.5" aria-label="Увеличить вес">+</button></span></label>
        <label for="wkpReps"><span>${escapeHtml(repsLabel)}</span><span class="wkp-number-stepper"><button type="button" data-wkp-adjust="reps" data-delta="-1" aria-label="Уменьшить повторы">−</button><input id="wkpReps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${escapeHtml(repsValue)}" aria-label="${escapeHtml(repsLabel)}"><button type="button" data-wkp-adjust="reps" data-delta="1" aria-label="Увеличить повторы">+</button></span></label>
      </div>
      <details class="wkp-load-history"><summary>История упражнения</summary><div id="wkpLoadHistory">${workoutLoadHistoryHtml(it, player.session?.id)}</div></details>
    </section>
    ${restHtml}
    ${it.steps.length ? `<button type="button" class="wkp-steps-t" id="wkpStepsT">Как делать ${player.showSteps ? '▲' : '▼'}</button>${player.showSteps ? `<ol class="lib-steps wkp-steps">${it.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : ''}` : ''}
    <div class="wkp-actions"><button type="button" class="primary shine" id="wkpSet">${setButtonLabel}</button><div class="wkp-exercise-actions"><button type="button" class="wkp-skip" id="wkpPrev"${player.idx === 0 ? ' disabled' : ''}>← Предыдущее</button><button type="button" class="wkp-skip" id="wkpNext">${last ? 'Завершить ✓' : 'Следующее →'}</button></div></div>
  </div>`;
  o.hidden = false;
  o.querySelector('#wkpClose')?.addEventListener('click', closeWorkoutPlayerOverlay);
  bindMediaReports(o);
  o.querySelector('[data-wkp-play-video]')?.addEventListener('click', () => { player.showVideo = true; saveWorkoutResume(player); renderPlayer(); });
  if(!it.mediaHidden) o.querySelectorAll('.pose-g').forEach(b => b.addEventListener('click', () => { state.poseGender = b.dataset.g; save(); saveWorkoutResume(player); renderPlayer(); }));
  o.querySelectorAll('.wkp-mtab').forEach(b => b.addEventListener('click', () => { player.showVideo = b.dataset.m === 'video'; saveWorkoutResume(player); renderPlayer(); }));
  o.querySelector('#wkpStepsT')?.addEventListener('click', () => { player.showSteps = !player.showSteps; saveWorkoutResume(player); renderPlayer(); });
  o.querySelector('#wkpReplace')?.addEventListener('click', () => openWorkoutReplacement({ kind:'player', playerIndex:player.idx }));
  o.querySelectorAll('[data-wkp-exercise-index]').forEach(button => button.addEventListener('click', () => {
    workoutNavigateExercise(player, Number(button.dataset.wkpExerciseIndex));
    saveWorkoutResume(player);
    renderPlayer();
  }));
  o.querySelectorAll('[data-wkp-set-index]').forEach(button => button.addEventListener('click', () => {
    player.set = Math.max(0, Math.min(setCount - 1, Number(button.dataset.wkpSetIndex) || 0));
    player.side = 'left';
    saveWorkoutResume(player);
    renderPlayer();
  }));
  o.querySelector('#wkpAddSet')?.addEventListener('click', () => {
    const nextSetCount = addWorkoutSet(player);
    if(!nextSetCount){ toast(`Можно выполнить до ${WORKOUT_PLAYER_MAX_SETS} подходов за упражнение`); return; }
    workoutSyncExerciseCompletion(player, it, player.idx);
    saveWorkoutResume(player);
    primeHaptic('light');
    try{ track('workout_extra_set_added', 'training', { exercise_id:it.id, target_sets:nextSetCount, added_sets:nextSetCount - prescription.sets }); }catch(e){}
    toast(`Добавлен ${nextSetCount}-й подход`);
    renderPlayer();
  });
  const weightInput = o.querySelector('#wkpWeight');
  const repsInput = o.querySelector('#wkpReps');
  const syncDraft = () => {
    if(!player) return;
    const weightText = String(weightInput?.value || '').trim().replace(',', '.');
    player.setDrafts[draftKey] = {
      weightKg:weightText === '' ? null : Number(weightText),
      reps:Math.max(1, Math.round(Number(repsInput?.value) || prescription.repsMax))
    };
    player.setDraftTouched[draftKey] = true;
    saveWorkoutResume(player);
  };
  weightInput?.addEventListener('input', syncDraft);
  repsInput?.addEventListener('input', syncDraft);
  o.querySelector('#wkpApplyProgress')?.addEventListener('click', () => {
    if(!weightInput || progression.weightKg == null) return;
    weightInput.value = String(progression.weightKg);
    syncDraft();
    primeHaptic('light');
    toast('Рекомендация подставлена — техника важнее цифры');
  });
  o.querySelector('#wkpRestSkip')?.addEventListener('click', () => {
    clearWorkoutRestTimer(player);
    saveWorkoutResume(player);
    $('wkpRest')?.remove();
    primeHaptic('light');
  });
  o.querySelectorAll('[data-wkp-adjust]').forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.wkpAdjust === 'weight' ? weightInput : repsInput;
    if(!target) return;
    const delta = Number(button.dataset.delta || 0);
    const fallback = button.dataset.wkpAdjust === 'weight' ? 0 : prescription.repsMax;
    const max = button.dataset.wkpAdjust === 'weight' ? 2000 : 1000;
    const next = Math.max(button.dataset.wkpAdjust === 'weight' ? 0 : 1, Math.min(max, (Number(String(target.value || '').replace(',', '.')) || fallback) + delta));
    target.value = button.dataset.wkpAdjust === 'weight' ? String(Math.round(next * 100) / 100) : String(Math.round(next));
    syncDraft();
  }));
  o.querySelector('#wkpSet')?.addEventListener('click', () => {
    syncDraft();
    if(!parseWorkoutSetInput(weightInput?.value, repsInput?.value)){ toast('Проверь вес и количество повторов'); return; }
    if(editingLoggedSet){
      const updated = recordWorkoutSet(player, it, weightInput?.value, repsInput?.value);
      if(!updated){ toast('Проверь вес и количество повторов'); return; }
      workoutSyncExerciseCompletion(player, it, player.idx);
      primeHaptic('success');
      saveWorkoutResume(player);
      toast(`Подход ${player.set + 1} обновлён`);
      renderPlayer();
      return;
    }
    const transition = workoutSideTransition(sideMode, activeSide);
    if(!transition.completeSet){
      player.side = transition.nextSide;
      saveWorkoutResume(player);
      renderPlayer();
      return;
    }
    const logged = recordWorkoutSet(player, it, weightInput?.value, repsInput?.value);
    if(!logged){ toast('Проверь вес и количество повторов'); return; }
    primeHaptic('success');
    player.side = transition.nextSide;
    const exerciseComplete = workoutSyncExerciseCompletion(player, it, player.idx);
    if(exerciseComplete){
      if(last){
        const missing = workoutIncompleteExerciseIndexes(player);
        if(missing.length){
          workoutNavigateExercise(player, missing[0]);
          saveWorkoutResume(player);
          toast(`Осталось упражнений: ${missing.length}. Проверь незаписанные подходы.`);
          renderPlayer();
          return;
        }
        finishPlayer();
        return;
      }
      workoutNavigateExercise(player, player.idx + 1);
    } else {
      player.set = workoutFirstIncompleteSet(player, it, player.idx);
      player.side = 'left';
    }
    startWorkoutRestTimer(player);
    saveWorkoutResume(player);
    renderPlayer();
  });
  o.querySelector('#wkpPrev')?.addEventListener('click', () => {
    if(player.idx <= 0) return;
    workoutNavigateExercise(player, player.idx - 1);
    saveWorkoutResume(player);
    renderPlayer();
  });
  o.querySelector('#wkpNext')?.addEventListener('click', () => {
    if(last){
      const missing = workoutIncompleteExerciseIndexes(player);
      if(missing.length){
        workoutNavigateExercise(player, missing[0]);
        saveWorkoutResume(player);
        toast(`Осталось упражнений: ${missing.length}. Проверь незаписанные подходы.`);
        renderPlayer();
        return;
      }
      finishPlayer();
      return;
    }
    workoutNavigateExercise(player, player.idx + 1);
    saveWorkoutResume(player);
    renderPlayer();
  });
}

function openPrimeRecoverySession(){
  openSheet(`<div class="lib-sheet-head"><div><h2>Восстановительный день</h2><p class="sheet-sub">PrimeDay заметил, что обычная силовая нагрузка сегодня не лучшая идея. Это не медицинская рекомендация.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <section class="prep-block"><h3>Мягкий план на 15–20 минут</h3><ol class="lib-steps"><li>5–10 минут спокойной ходьбы или очень лёгкого велотренажёра.</li><li>2 круга мягкой мобильности: плечи, грудной отдел, таз, голеностоп — без боли и пружинящих движений.</li><li>2–3 минуты спокойного дыхания и воды.</li></ol></section>
    <p class="medical-note">Острая, необычная или усиливающаяся боль — причина остановиться и обратиться к врачу или специалисту. Не проверяй силу через боль.</p>
    <button type="button" class="primary shine" id="primeRecoveryDone">Понял, выбираю восстановление</button>`);
  $('primeRecoveryDone')?.addEventListener('click', () => {
    track('prime_day_recovery_opened', 'training', { has_pain:!!primeDayCurrent().pain });
    closeSheet();
    toast('Сегодня без силовой части. Вернись к тренировке, когда самочувствие улучшится.');
  });
}

// Тренировка дня: собирается из базы упражнений 1 раз/день и кэшируется,
// чтобы карточка-таймлайн и плеер «Начать» показывали ОДНУ и ту же тренировку.
function buildDayWorkout(previousItems){
  const p = planFromProfile();
  const scheme = primeDayTrainingScheme(p);
  const eq = new Set(INV_EQUIP[p.inv] || ['body only']);
  const levels = LEVEL_MAP[p.level] || ['beginner', 'intermediate'];
  const count = sessionExerciseCount(p);
  const focus = profileFocusMuscles(p);
  const previous = new Set((previousItems || []).map(item => item.id));
  const picked = pickExercises(focus.length ? focus : LIB_MUSCLES.slice(), count, eq, levels, p, undefined, previous);
  return workoutItems(picked, scheme);
}
function ensureDayWorkout(){
  if(typeof libData === 'undefined' || !libData) return [];
  const today = todayKey();
  const dw = state.dayWorkout;
  const profile = planFromProfile();
  const bodyCheckSignature = bodyCheckRecommendationSignature(profile);
  const activeResume = typeof currentWorkoutResume === 'function' ? currentWorkoutResume() : null;
  if(dw && dw.date === today && dw.rules === WORKOUT_RULES_VER && dw.datasetVersion === EXERCISE_DATASET_VERSION && Array.isArray(dw.items) && dw.items.length && (dw.bodyCheckSignature === bodyCheckSignature || activeResume) && (!dw.completedAt || activeResume)) return dw.items;
  const items = buildDayWorkout(dw?.items);
  if(!items.length) return [];
  state.dayWorkout = { date: today, rules: WORKOUT_RULES_VER, rulesVersion: WORKOUT_RULES_VER, datasetVersion: EXERCISE_DATASET_VERSION, bodyCheckSignature, items };
  save();
  return items;
}
function renderDayWorkout(){
  const tl = $('workoutTimeline'); if(!tl) return;
  const card = tl.closest('.workout-card');
  card?.classList.remove('day-workout-dismissed');
  const readiness = primeDayAssessment();
  const start = $('startDay');
  const reroll = $('rerollDay');
  const chooseOwn = $('chooseOwnDay');
  const activeResume = currentWorkoutResume();
  if(readiness.mode === 'recovery' && !activeResume){
    if($('workoutTitle')) $('workoutTitle').textContent = 'Восстановительный день';
    if(start) start.textContent = 'Открыть восстановление';
    if(reroll){ reroll.disabled = true; reroll.textContent = 'Сегодня без пересборки'; }
    if(chooseOwn) chooseOwn.hidden = true;
    tl.innerHTML = `<div class="training-load-note">${escapeHtml(readiness.adjustment)}</div><div data-n="1"><b>Ходьба · 5–10 минут</b><span>Спокойный темп, без задыхания.</span></div><div data-n="2"><b>Мягкая мобильность · 2 круга</b><span>Плечи, грудной отдел, таз и голеностоп — только в комфортной амплитуде.</span></div><div data-n="3"><b>Пауза и оценка самочувствия</b><span>Если боль остаётся или усиливается, тренировку не продолжаем.</span></div>`;
    return;
  }
  const activeProgram = activeReadyProgramSession();
  const resumesProgram = activeResume && activeProgram && !activeProgram.stale && !activeProgram.completed
    && activeResume.wkIdx === activeProgram.workoutIndex && activeResume.dayIdx === activeProgram.dayIndex;
  if(activeProgram?.day && (!activeResume || resumesProgram)){
    const day = activeProgram.day;
    const workout = activeProgram.workout;
    if($('workoutTitle')) $('workoutTitle').textContent = `${workout.programTitle || workout.title} · неделя ${day.programWeek || 1}`;
    if(start) start.textContent = resumesProgram ? '▶ Продолжить программу' : '▶ Открыть программу';
    if(reroll){ reroll.disabled = true; reroll.textContent = 'Готовая программа активна'; }
    if(chooseOwn) chooseOwn.hidden = false;
    const warmup = warmupPlanFor(planFromProfile());
    const cooldown = cooldownPlanFor(planFromProfile());
    const medNote = medicalTrainingDisclaimer(planFromProfile());
    const exerciseRows = day.items.map((item, index) => {
      const meta = [item.sr, item.muscle, item.equip, workoutSideMeta(item)].filter(Boolean).join(' · ');
      return `<div class="workout-exercise-row" data-n="${index + 2}"><span class="workout-exercise-copy"><b>${escapeHtml(item.name)}</b><span>${escapeHtml(meta)}</span></span><button type="button" class="workout-replace-button" data-replace-ready="${index}" aria-label="Заменить ${escapeHtml(item.name)}">↻ <span>Заменить</span></button></div>`;
    }).join('');
    const resumeNote = resumesProgram ? `<div class="workout-resume-hint training-resume-hint"><b>Тренировка на паузе</b><span>${escapeHtml(workoutResumeProgressText(activeResume))}</span></div>` : '';
    tl.innerHTML = `${resumeNote}<div class="ready-program-training-note"><b>Активная программа</b><span>${escapeHtml(day.weekTitle || `Неделя ${day.programWeek || 1}`)} · ${escapeHtml(day.shortTitle || day.title)}</span></div>${medNote ? `<div class="medical-note">${escapeHtml(medNote)}</div>` : ''}<div data-n="1"><b>${escapeHtml(warmup.title)}</b><span>${escapeHtml(warmup.summary)}</span></div>${exerciseRows}<div data-n="${day.items.length + 2}"><b>${escapeHtml(cooldown.title)}</b><span>${escapeHtml(cooldown.summary)}</span></div>`;
    tl.querySelectorAll('[data-replace-ready]').forEach(button => button.addEventListener('click', () => openWorkoutReplacement({
      kind:'saved', workoutIndex:activeProgram.workoutIndex, dayIndex:activeProgram.dayIndex, itemIndex:Number(button.dataset.replaceReady)
    })));
    return;
  }
  if(state.dayWorkoutDismissedDate === todayKey() && !activeResume){
    card?.classList.add('day-workout-dismissed');
    if($('workoutTitle')) $('workoutTitle').textContent = 'Своя тренировка на сегодня';
    if(start) start.textContent = 'Открыть мои тренировки';
    if(reroll){ reroll.disabled = false; reroll.textContent = '↻ Вернуть предложенную тренировку'; }
    if(chooseOwn) chooseOwn.hidden = true;
    tl.innerHTML = '<div class="training-own-note"><b>Предложенная тренировка отменена</b><span>Выбери сохранённую программу или собери новую из базы упражнений. Выполненная своя тренировка засчитается в результат дня.</span></div>';
    return;
  }
  if(start) start.textContent = activeResume ? '▶ Продолжить тренировку' : '▶ Начать тренировку';
  if(reroll){ reroll.disabled = false; reroll.textContent = '↻ Другая тренировка из базы'; }
  if(chooseOwn) chooseOwn.hidden = false;
  if(!validExerciseLibrary(libData)){
    ensureLibrary().then(data => {
      if(data) renderDayWorkout();
      else tl.innerHTML = '<div data-n="!"><b>База упражнений не загрузилась</b><span>проверь соединение и повтори</span></div>';
    });
    return;
  }
  const p = planFromProfile();
  const style = p.goal === 'Набор' ? 'Силовой блок' : p.goal === 'Сушка' ? 'Жиросжигающий full body' : 'Поддерживающий функционал';
  const safe = hasMedicalCaution(p) ? ' · щадящий режим' : '';
  if($('workoutTitle')) $('workoutTitle').textContent = `${style}${safe} · ${p.place.toLowerCase()}`;
  const items = ensureDayWorkout();
  if(!items.length){ tl.innerHTML = '<div data-n="!"><b>Не удалось собрать тренировку</b><span>проверь анкету: уровень и инвентарь</span></div>'; return; }
  const medNote = medicalTrainingDisclaimer(p);
  const scheme = primeDayTrainingScheme(p);
  const warmup = warmupPlanFor(p);
  const cooldown = cooldownPlanFor(p);
  const warmupRow = `<div data-n="1"><b>${escapeHtml(warmup.title)}</b><span>${escapeHtml(warmup.summary)}</span></div>`;
  const exerciseRows = items.map((it, index) => {
    const meta = [it.sr, it.muscle, it.equip, workoutSideMeta(it)].filter(Boolean).join(' · ');
    return `<div class="workout-exercise-row" data-n="${index + 2}"><span class="workout-exercise-copy"><b>${escapeHtml(it.name)}</b><span>${escapeHtml(meta)}</span></span><button type="button" class="workout-replace-button" data-replace-day="${index}" aria-label="Заменить ${escapeHtml(it.name)}">↻ <span>Заменить</span></button></div>`;
  }).join('');
  const cooldownRow = `<div data-n="${items.length + 2}"><b>${escapeHtml(cooldown.title)}</b><span>${escapeHtml(cooldown.summary)}</span></div>`;
  const resumeNote = activeResume
    ? `<div class="workout-resume-hint training-resume-hint"><b>Тренировка на паузе</b><span>${escapeHtml(workoutResumeProgressText(activeResume))}</span></div>`
    : '';
  tl.innerHTML = resumeNote + `<div class="training-load-note">${escapeHtml(scheme.loadNote)}</div>` + (medNote ? `<div class="medical-note">${escapeHtml(medNote)}</div>` : '') + warmupRow + exerciseRows + cooldownRow;
  tl.querySelectorAll('[data-replace-day]').forEach(btn => btn.addEventListener('click', () => openWorkoutReplacement({ kind:'day', itemIndex:Number(btn.dataset.replaceDay) })));
}
function rerollDayWorkout(){
  if(state.dayWorkoutDismissedDate === todayKey()){
    state.dayWorkoutDismissedDate = '';
    save();
    renderDayWorkout();
    toast('Предложенная тренировка возвращена');
    return;
  }
  ensureLibrary().then(data => {
    if(!data){ toast('База упражнений не загрузилась'); return; }
    clearWorkoutResume({ abandon:true });
    state.dayWorkout = { date: '', items: [] };   // сброс → пересборка
    renderDayWorkout();
    toast('Собрал другую тренировку из базы');
  });
}
function chooseOwnDayWorkout(){
  if(!activeReadyProgramSession()?.day){
    clearWorkoutResume({ abandon:true });
    state.dayWorkoutDismissedDate = todayKey();
    save();
    renderDayWorkout();
  }
  try{ track('day_workout_own_selected', 'training'); }catch(e){}
  jump('saved');
  requestAnimationFrame(() => $('manualSearch')?.scrollIntoView({ block:'center', behavior:'smooth' }));
  toast('Выбери сохранённую тренировку или собери новую');
}
async function startDayWorkout(){
  if(state.dayWorkoutDismissedDate === todayKey() && !currentWorkoutResume()){
    jump('saved');
    return;
  }
  if(currentWorkoutResume()){
    resumeWorkoutPlayer();
    return;
  }
  if(primeDayAssessment().mode === 'recovery'){
    openPrimeRecoverySession();
    return;
  }
  const previousProgram = activeReadyProgramSession();
  if(previousProgram) await prepareReadyWorkout(previousProgram.workoutIndex);
  const activeProgram = activeReadyProgramSession();
  if(activeProgram?.day){
    ensureLibrary().then(data => {
      if(!data){ toast('База упражнений не загрузилась'); return; }
      startWorkoutPlayer({
        rawItems:activeProgram.day.items,
        title:activeProgram.day.title || activeProgram.workout.title,
        wkIdx:activeProgram.workoutIndex,
        dayIdx:activeProgram.dayIndex
      });
    });
    return;
  }
  if(typeof libData === 'undefined' || !libData) toast('Собираю тренировку…');
  ensureLibrary().then(data => {
    if(!data){ toast('База упражнений не загрузилась'); return; }
    const items = ensureDayWorkout();
    if(!items.length){ toast('Не удалось собрать упражнения — загляни в анкету'); return; }
    startWorkoutPlayer({ rawItems: items, title: ($('workoutTitle')?.textContent) || 'Тренировка дня', wkIdx: null, dayWorkout: true });
  });
}

function finishPlayer(){
  const o = $('workoutDetail'); if(!o || !player) return;
  const w = player.wkIdx, isDay = player.dayWorkout, dIdx = player.dayIdx;
  const exerciseTotal = player.items.length;
  const completedSourceIndexes = Array.from(player.completedSourceIndexes || []).filter(Number.isInteger);
  const completedItems = player.items.slice();
  const fullyCompleted = workoutCompletionVerified(completedItems, completedSourceIndexes);
  const cooldown = cooldownPlanFor(planFromProfile());
  const cooldownHtml = `<section class="prep-block finish-cooldown"><h3>${escapeHtml(cooldown.title)}</h3><p>${escapeHtml(cooldown.summary)}</p>${prepListHtml(cooldown.steps)}</section>`;
  const completedPlayer = player;
  finishWorkoutSession(completedPlayer, fullyCompleted ? 'completed' : 'abandoned');
  clearWorkoutResume();
  leaveWorkoutFocusMode(completedPlayer);
  player = null;
  if(!fullyCompleted){
    if(w != null) completeDay(w, dIdx, completedSourceIndexes);
    o.innerHTML = `<div class="lib-sheet wkp-done"><div class="wkp-done-ico">${completedSourceIndexes.length}/${exerciseTotal}</div><h2>Тренировка не засчитана</h2><p>Заверши все подходы каждого упражнения. Пропущенные упражнения не дают баллы и не закрывают тренировку.</p><div class="wkp-actions"><button type="button" class="primary shine" id="wkpDone">Понятно</button></div></div>`;
    o.hidden = false;
    o.querySelector('#wkpDone')?.addEventListener('click', () => { o.hidden = true; o.innerHTML = ''; if(w != null) openSavedWorkout(w); });
    bindWorkoutArchiveResult(o);
    return;
  }
  if(isDay){
    state.dayWorkout.completedAt = new Date().toISOString();
    const awarded = markDayWorkoutComplete('player', completedItems, completedSourceIndexes, { workoutTitle:completedPlayer.title, activitySource:'day_workout' });
    o.innerHTML = `<div class="lib-sheet wkp-done"><div class="wkp-done-ico">✓</div><h2>Тренировка закрыта!</h2><p>${awarded ? '+20 баллов · цель дня засчитана · так держать' : 'Уже была засчитана сегодня — но повторить тоже можно.'}</p>${cooldownHtml}<div class="wkp-actions"><button type="button" class="primary shine" id="wkpDone">Готово</button></div></div>`;
    o.hidden = false;
    o.querySelector('#wkpDone')?.addEventListener('click', () => { o.hidden = true; o.innerHTML = ''; });
    bindWorkoutArchiveResult(o);
    return;
  }
  let xp = 0;
  let dayAwarded = false;
  if(w != null){
    xp = completeDay(w, dIdx, completedSourceIndexes);
    dayAwarded = markDayWorkoutComplete('player', completedItems, completedSourceIndexes, { workoutTitle:completedPlayer.title, activitySource:'saved_workout' });
  }
  else if(lastGen && !lastGen._played){ lastGen._played = true; xp = 30; state.score += 30; state.streak += 1; state.access += 1; save(); renderMetrics(); }
  const showSave = (w == null);
  const resultText = dayAwarded
    ? `${xp ? `+${xp} баллов · ` : ''}тренировка добавлена в отчёт дня · так держать`
    : xp ? `+${xp} баллов · +1 день в серии · так держать` : 'Засчитано ранее — но молодец, что повторил.';
  o.innerHTML = `<div class="lib-sheet wkp-done"><div class="wkp-done-ico">✓</div><h2>Тренировка завершена!</h2><p>${resultText}</p>${cooldownHtml}<div class="wkp-actions"><button type="button" class="primary shine" id="wkpDone">Готово</button>${showSave ? `<button type="button" class="wkp-skip" id="wkpSaveDone">Сохранить в «Мои тренировки»</button>` : ''}</div></div>`;
  o.hidden = false;
  o.querySelector('#wkpDone')?.addEventListener('click', () => { o.hidden = true; o.innerHTML = ''; if(w != null) openSavedWorkout(w); });
  o.querySelector('#wkpSaveDone')?.addEventListener('click', () => { o.hidden = true; o.innerHTML = ''; saveSingleWorkout(); });
  bindWorkoutArchiveResult(o);
}

function markWorkoutDayItemsDone(day, sourceIndexes){
  if(!day || !Array.isArray(day.items)) return [];
  const indexes = new Set((Array.isArray(sourceIndexes) ? sourceIndexes : day.items.map((_, index) => index)).filter(Number.isInteger));
  day.done = day.items.map((_, index) => !!day.done?.[index] || indexes.has(index));
  return day.done;
}
function completeDay(idx, di, sourceIndexes){
  const wk = state.savedWorkouts[idx]; if(!wk || !wk.days[di]) return 0;
  const d = wk.days[di];
  markWorkoutDayItemsDone(d, sourceIndexes);
  let xp = 0;
  if(d.done.every(Boolean) && !d.counted){ d.counted = true; state.score += 30; state.streak += 1; state.access += 1; xp = 30; }
  save(); renderMetrics(); renderSaved();
  if(wk.kind === 'ready') renderReadyPrograms();
  return xp;
}

function bindSaved(){
  const o = $('workoutDetail');
  if(o) o.addEventListener('click', e => {
    if(e.target !== o) return;
    if(player) closeWorkoutPlayerOverlay();
    else { o.hidden = true; o.innerHTML = ''; }
  });
  $('manualSearch')?.addEventListener('input', e => { manualState.q = e.target.value || ''; manualState.limit = MANUAL_PAGE_SIZE; renderManualBuilder(); });
  $('manualSave')?.addEventListener('click', saveManualWorkout);
  $('manualClear')?.addEventListener('click', () => { manualState.selected = []; renderManualBuilder(); toast('Конструктор очищен'); });
}

// ===== Меню на неделю: блюда с рецептами + изображения =====
let dishesDB = null;
async function ensureDishes(){
  if(Array.isArray(dishesDB) && dishesDB.length) return dishesDB;
  try {
    const res = await window.WLData.fetch('dishes.json?v=d11-nutrition-september04', { cache: 'no-store' });
    if(!res.ok) throw new Error(`dishes.json ${res.status}`);
    const data = await res.json();
    if(!Array.isArray(data) || !data.length) throw new Error('dishes.json empty');
    dishesDB = data;
  } catch(e) {
    console.warn('Не удалось загрузить базу блюд', e);
    dishesDB = null;
    return [];
  }
  return dishesDB;
}
function dishById(id){ return (dishesDB || []).find(d => d.id === id); }
const NUTRITION_RESUME_VERSION = 1;
function nutritionResumeMenuKey(day){
  return `${(day?.ids || []).map(String).join('|')}::${Number(day?.scale || 1).toFixed(2)}`;
}
function clearNutritionResume(options = {}){
  state.nutritionResume = null;
  if(options.persist !== false) save();
}
function rememberNutritionResume(dayIndex, dishId = null){
  const day = state.menuWeek?.[dayIndex];
  if(!day || !Array.isArray(day.ids) || !day.ids.length) return false;
  state.nutritionResume = {
    version:NUTRITION_RESUME_VERSION,
    savedAt:new Date().toISOString(),
    dayIndex,
    dishId:dishId && day.ids.some(id => String(id) === String(dishId)) ? String(dishId) : null,
    menuKey:nutritionResumeMenuKey(day)
  };
  save();
  return true;
}
function currentNutritionResume(){
  const resume = state.nutritionResume;
  const dayIndex = Number(resume?.dayIndex);
  const day = Number.isInteger(dayIndex) ? state.menuWeek?.[dayIndex] : null;
  if(!resume || typeof resume !== 'object' || !day || !Array.isArray(day.ids) || !day.ids.length){
    if(resume) clearNutritionResume();
    return null;
  }
  if(resume.menuKey && resume.menuKey !== nutritionResumeMenuKey(day)){
    clearNutritionResume();
    return null;
  }
  if(resume.dishId && !day.ids.some(id => String(id) === String(resume.dishId))){
    state.nutritionResume = { ...resume, dishId:null, menuKey:nutritionResumeMenuKey(day) };
    save();
  }
  return state.nutritionResume;
}
function closeMenuDetail(){
  const o = $('menuDetail');
  if(!o) return;
  o.hidden = true;
  o.innerHTML = '';
  if($('nutrition')?.dataset.nutritionView === 'catalog') switchNutritionView('main');
}
async function restoreNutritionResume(){
  const resume = currentNutritionResume();
  if(!resume) return false;
  await ensureDishes();
  if(!$('nutrition')?.classList.contains('active')) return false;
  if(resume.dishId && dishById(resume.dishId)) openDishDetail(resume.dishId, resume.dayIndex, { restore:true });
  else openMenuDay(resume.dayIndex, { restore:true });
  return true;
}

// Исключения по предпочтениям еды из анкеты (диета + не люблю + аллергии)
function foodExclusions(){
  const p = planFromProfile(), tokens = [], add = (...t) => tokens.push(...t);
  const fish = ['рыб','лосос','треск','тунец','тунц','форел','минта','хек','скумбр','сардин','горбуш','сибас','палтус','сайр','сельд','fish','salmon','cod','tuna','trout','hake','pollock','mackerel','sardine','seabass','halibut'];
  const seafood = ['кревет','кальмар','миди','гребеш','краб','осьминог','shrimp','squid','mussel','scallop'];
  const dairy = ['творог','кефир','йогурт','молок','молоч','сыр','рикотт','моцарел','фет','пармезан','сметан','сливк','сливоч','ряженк','скир','cottage','yogurt','kefir','milk','cheese','ricotta','skyr'];
  const diet = (p.diet || '').toLowerCase();
  if(diet.includes('свинин')) add('свинин','свин','бекон','ветчин','pork','bacon','ham');
  if(diet.includes('вегетариан') || diet.includes('веган')) add('куриц','курин','грудк','говядин','индейк','свин','бекон','ветчин','кролик','кроль','утк','утин','баранин','теля','chicken','beef','turkey','pork','rabbit','duck','lamb', ...fish, ...seafood);
  if(diet.includes('лактоз') || diet.includes('веган')) add(...dairy, 'песто');
  if(diet.includes('веган')) add('яйц','яич','egg','мёд','мед','honey');
  if(diet.includes('кето') || diet.includes('низкоуглев')) add('рис','гречк','паст','булгур','картоф','хлеб','хлебц','банан','овсян','киноа','rice','pasta','bread','potato','oat','banana','quinoa','bulgur');
  const free = s => (s || '').toLowerCase().split(/[\s,;]+/).map(x => x.trim()).filter(x => x.length >= 3);
  free(p.dislikes).forEach(t => add(t)); free(p.allergies).forEach(t => add(t));
  const restrictions = `${p.dislikes || ''} ${p.allergies || ''}`.toLowerCase();
  if(/орех|миндал|фундук|кешью|фисташ|арахис/.test(restrictions)) add('орех','миндал','фундук','кешью','фисташ','арахис','песто','almond','walnut','peanut','cashew','hazelnut','pistachio');
  if(/молоч|молок|лактоз|казеин/.test(restrictions)) add(...dairy, 'песто');
  if(/рыб/.test(restrictions)) add(...fish);
  if(/морепродукт|моллюск|ракообраз/.test(restrictions)) add(...seafood);
  if(/яйц|яиц|яич/.test(restrictions)) add('яйц','яич','egg');
  if(/со[яюи]|соев/.test(restrictions)) add('соев','тофу','темпе','эдамаме','мисо','soy','tofu','tempeh','edamame','miso');
  if(/кунжут|сезам/.test(restrictions)) add('кунжут','тахин','sesame','tahini');
  if(/глютен|пшениц/.test(restrictions)) add('пшен','перлов','ячмен','ржан','булгур','кускус','манн','макарон','паст','лапш','хлеб','лаваш','овся','соевый соус','flour','barley','rye','bulgur','couscous','semolina','pasta','soba','bread','oat');
  return [...new Set(tokens)];
}
function nutritionBudgetTier(value){
  const v = String(value || '').toLowerCase();
  if(v.includes('прост')) return 'simple';
  if(v.includes('прем') || v.includes('расшир') || v.includes('навороч')) return 'premium';
  return 'balanced';
}
function dishBudgetTier(dish){
  const explicit = String(dish && dish.budget || '').toLowerCase();
  if(['simple', 'balanced', 'premium'].includes(explicit)) return explicit;
  const hay = ((dish?.name || '') + ' ' + (dish?.en || '') + ' ' + ((dish?.ingredients || []).map(i => i.n).join(' '))).toLowerCase();
  if(/авокадо|лосос|кревет|киноа|тофу|греческий йогурт|гранола|протеин|индейк|слабосол/.test(hay)) return 'premium';
  if(/перлов|пш[её]н|картоф|капуст|сайр|сардин|консерв|фасол|макарон|гречк|овсян|яйц|кефир|творог|куриц/.test(hay)) return 'simple';
  return 'balanced';
}
function dishMatchesBudget(dish, tier){
  const selected = tier || 'balanced';
  const dishTier = dishBudgetTier(dish);
  if(selected === 'premium') return true;
  if(selected === 'simple') return dishTier === 'simple';
  return dishTier !== 'premium';
}
function dishAllowed(d, tokens){
  if(!tokens || !tokens.length) return true;
  const hay = ((d.name || '') + ' ' + (d.en || '') + ' ' + ((d.ingredients || []).map(i => i.n).join(' '))).toLowerCase();
  return !tokens.some(t => hay.includes(t));
}
// Структура приёмов пищи под число из анкеты (mealsPerDay)
function mealSlots(n){
  n = parseInt(n, 10) || 4;
  if(n <= 3) return ['завтрак', 'обед', 'ужин'];
  if(n === 4) return ['завтрак', 'обед', 'ужин', 'перекус'];
  return ['завтрак', 'обед', 'ужин', 'перекус', 'перекус'];
}
function mealsWord(n){ const a = n % 10, b = n % 100; if(a === 1 && b !== 11) return 'приём'; if(a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'приёма'; return 'приёмов'; }
function normalizeMenuRepeatDays(value, fallback = 1){
  const days = Number(value);
  return [1, 2, 3, 7].includes(days) ? days : fallback;
}
function savedMenuRepeatDays(week){
  const explicit = normalizeMenuRepeatDays(week?.[0]?.repeatEveryDays, null);
  if(explicit) return explicit;
  const legacyPrepDays = Math.max(0, ...(week || []).map(day => Number(day.prepDays) || 0));
  return normalizeMenuRepeatDays(legacyPrepDays);
}
function selectedMenuRepeatDays(){
  return normalizeMenuRepeatDays(state.menuRepeatDays, null) || savedMenuRepeatDays(state.menuWeek);
}
function menuDayRhythmLabel(day, index){
  const rhythm = normalizeMenuRepeatDays(day.repeatEveryDays, null);
  if(!rhythm) return '';
  if(rhythm === 1) return 'Отдельное меню';
  if(rhythm === 7) return 'Единое меню на неделю';
  const group = Math.floor(index / rhythm);
  const start = group * rhythm + 1, end = Math.min(7, start + rhythm - 1);
  return `Меню ${group + 1} · ${start === end ? `день ${start}` : `дни ${start}–${end}`}`;
}
function menuWeekHasLimitedVariety(week){
  const used = new Set();
  return (week || []).some((day, index) => {
    if((day.repeatStartDay ?? day.prepStartDay ?? index) !== index) return false;
    return (day.ids || []).some(id => {
      if(used.has(id)) return true;
      used.add(id);
      return false;
    });
  });
}
function eligibleMenuDishes(db, slot, tier, tokens, batch = false){
  return (db || []).filter(d => (slot === 'десерт' ? d.category === 'dessert' : d.category !== 'dessert' && d.slot === slot) && dishMatchesBudget(d, tier) && dishAllowed(d, tokens)
    && (!batch || !['обед','ужин'].includes(slot) || Number(d.mealPrep?.fridgeDays) >= 2));
}
function menuTargetTolerance(){ return { kcal:0.03, p:0.10, f:0.10, c:0.10 }; }
function normalizeMenuTargets(kcal, targets){
  const result = {
    kcal:Math.max(0, Math.round(Number(targets?.kcal) || Number(kcal) || 0)),
    p:Math.max(0, Math.round(Number(targets?.p ?? targets?.protein) || 0)),
    f:Math.max(0, Math.round(Number(targets?.f ?? targets?.fat) || 0)),
    c:Math.max(0, Math.round(Number(targets?.c ?? targets?.carb) || 0))
  };
  return result.kcal > 0 ? result : null;
}
function menuScaledTotals(meals, scale){
  return Object.fromEntries(['kcal','p','f','c'].map(key => [key, meals.reduce((sum, dish) => sum + Math.round((Number(dish[key]) || 0) * scale), 0)]));
}
function menuTargetError(totals, target){
  const errors = {};
  for(const key of ['kcal','p','f','c']){
    const goal = Number(target?.[key]) || 0;
    errors[key] = goal > 0 ? Math.abs((Number(totals?.[key]) || 0) - goal) / goal : 0;
  }
  return { ...errors, max:Math.max(errors.kcal, errors.p, errors.f, errors.c), sum:errors.kcal + errors.p + errors.f + errors.c };
}
function menuTargetsWithinTolerance(totals, target){
  const error = menuTargetError(totals, target);
  const tolerance = menuTargetTolerance();
  return error.kcal <= tolerance.kcal
    && error.p <= tolerance.p
    && error.f <= tolerance.f
    && error.c <= tolerance.c;
}
function menuTargetsMatch(stored, current){
  if(!stored || !current) return false;
  return ['kcal','p','f','c'].every(key => Math.round(Number(stored[key]) || 0) === Math.round(Number(current[key]) || 0));
}
function selectMenuMeals(pools, { target = null, previous = new Set(), usage = new Map(), avoidSignatures = new Set(), random = Math.random } = {}){
  if(!target || !(target.p + target.f + target.c)){
    const meals = [], chosen = new Set();
    for(const pool of pools){
      const candidates = pool.filter(d => !chosen.has(d.id));
      if(!candidates.length) return null;
      const different = candidates.filter(d => !previous.has(d.id));
      const alternatives = different.length ? different : candidates;
      const minUsage = Math.min(...alternatives.map(d => usage.get(d.id) || 0));
      const available = alternatives.filter(d => (usage.get(d.id) || 0) === minUsage);
      const selected = available[Math.min(available.length - 1, Math.floor(random() * available.length))];
      chosen.add(selected.id);
      meals.push(selected);
    }
    const base = meals.reduce((sum, dish) => sum + dish.kcal, 0) || 1;
    const scale = +(Math.min(2.8, Math.max(0.55, target?.kcal ? target.kcal / base : 1))).toFixed(3);
    return { meals, scale, totals:menuScaledTotals(meals, scale) };
  }

  const targetRatios = Object.fromEntries(['p','f','c'].map(key => [key, target[key] / target.kcal]));
  let beam = [{ meals:[], ids:new Set(), raw:{ kcal:0, p:0, f:0, c:0 }, rank:0 }];
  for(const pool of pools){
    const minimumUsage = Math.min(...pool.map(d => usage.get(d.id) || 0));
    const leastUsed = pool.filter(d => (usage.get(d.id) || 0) === minimumUsage);
    const candidates = leastUsed.length ? leastUsed : pool;
    const next = [];
    for(const entry of beam){
      for(const dish of candidates){
        if(entry.ids.has(dish.id)) continue;
        const raw = Object.fromEntries(['kcal','p','f','c'].map(key => [key, entry.raw[key] + (Number(dish[key]) || 0)]));
        const ratioError = ['p','f','c'].reduce((sum, key) => {
          const actual = raw.kcal > 0 ? raw[key] / raw.kcal : 0;
          return sum + Math.abs(actual - targetRatios[key]) / Math.max(0.001, targetRatios[key]);
        }, 0);
        const ids = new Set(entry.ids); ids.add(dish.id);
        next.push({ meals:[...entry.meals, dish], ids, raw, rank:ratioError + (previous.has(dish.id) ? 0.02 : 0) });
      }
    }
    next.sort((a, b) => a.rank - b.rank);
    beam = next.slice(0, 300);
    if(!beam.length) return null;
  }
  const ranked = beam.map(entry => {
    const base = entry.raw.kcal || 1;
    const scale = +(Math.min(2.8, Math.max(0.55, target.kcal / base))).toFixed(3);
    const totals = menuScaledTotals(entry.meals, scale);
    const error = menuTargetError(totals, target);
    const diversity = entry.meals.reduce((sum, dish) => sum + (usage.get(dish.id) || 0), 0) / Math.max(1, entry.meals.length);
    return { ...entry, scale, totals, error, finalRank:error.max * 4 + error.sum + diversity * 0.002 };
  }).sort((a, b) => a.finalRank - b.finalRank);
  const matching = ranked.filter(entry => menuTargetsWithinTolerance(entry.totals, target));
  const viable = matching.length ? matching : ranked.slice(0, 1);
  const novel = viable.filter(entry => !avoidSignatures.has(entry.meals.map(dish => dish.id).join('|')));
  const shortlist = (novel.length ? novel : viable).slice(0, 24);
  const roll = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  const selected = shortlist[Math.floor(roll * shortlist.length)];
  return selected ? { meals:selected.meals, scale:selected.scale, totals:selected.totals, error:selected.error } : null;
}
function createMenuWeekPlan(db, { slots, tier, tokens, kcal, targets = null, batch = false, repeatDays, includeDessert = false, avoidSignatures = [], random = Math.random }){
  const rhythm = normalizeMenuRepeatDays(repeatDays, batch ? 3 : 1);
  const prep = batch && (rhythm === 2 || rhythm === 3);
  const target = normalizeMenuTargets(kcal, targets);
  const planSlots = [...slots];
  if(includeDessert){
    const snack = planSlots.lastIndexOf('перекус');
    if(snack >= 0) planSlots[snack] = 'десерт'; else planSlots.push('десерт');
  }
  const pools = planSlots.map(slot => eligibleMenuDishes(db, slot, tier, tokens, prep));
  if(!pools.length || pools.some(pool => !pool.length)) return null;
  const week = [], usage = new Map();
  const avoided = avoidSignatures instanceof Set ? avoidSignatures : new Set(avoidSignatures);
  let previous = new Set();
  while(week.length < 7){
    const selected = selectMenuMeals(pools, { target, previous, usage, avoidSignatures:avoided, random });
    if(!selected) return null;
    const { meals, scale, totals } = selected;
    previous = new Set(meals.map(dish => dish.id));
    meals.forEach(dish => usage.set(dish.id, (usage.get(dish.id) || 0) + 1));
    const main = meals.filter(d => ['обед','ужин'].includes(d.slot));
    const blockDays = Math.min(rhythm, 7 - week.length);
    const prepLimit = prep ? Math.min(3, ...main.map(d => Number(d.mealPrep.fridgeDays))) : 0;
    const startDay = week.length;
    for(let offset = 0; offset < blockDays; offset++){
      const prepStartDay = prep ? startDay + Math.floor(offset / prepLimit) * prepLimit : null;
      week.push({ ids:meals.map(d => d.id), scale, ...totals, ...(target ? { target:{...target} } : {}), repeatEveryDays:rhythm, repeatStartDay:startDay, repeatDays:blockDays,
        ...(prep ? { prepStartDay, prepDays:Math.min(prepLimit, startDay + blockDays - prepStartDay) } : {}) });
    }
  }
  return week;
}
function applyDessertsToMenuWeek(db, week, { kcal, targets = null, tier, tokens = [], dessertId = null, dayIndex = null, random = Math.random }){
  if(!Array.isArray(week) || !week.length || !Number.isFinite(kcal) || kcal <= 0) return null;
  const target = normalizeMenuTargets(kcal, targets);
  if(dayIndex != null && (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex >= week.length)) return null;
  const byId = new Map((db || []).map(d => [d.id, d]));
  const specific = dessertId ? byId.get(dessertId) : null;
  if(dessertId && (specific?.category !== 'dessert' || !dishAllowed(specific, tokens))) return null;
  const pool = specific ? [specific] : eligibleMenuDishes(db, 'десерт', tier, tokens);
  if(!pool.length) return null;
  const group = (day, i) => Number.isInteger(day.repeatStartDay) && day.repeatStartDay >= 0 && day.repeatStartDay <= i ? day.repeatStartDay : i;
  const targetGroup = dayIndex == null ? null : group(week[dayIndex], dayIndex);
  const selectedByGroup = new Map(), usage = new Map();
  const updated = [];
  for(const [i, day] of week.entries()){
    if(!Array.isArray(day?.ids) || !day.ids.length) return null;
    const dayGroup = group(day, i);
    if(targetGroup != null && targetGroup !== dayGroup){ updated.push({...day, ids:[...day.ids]}); continue; }
    const original = day.ids.map(id => byId.get(id));
    if(original.some(d => !d || !dishAllowed(d, tokens))) return null;
    let selected = selectedByGroup.get(dayGroup);
    if(!selected){
      const minUsage = Math.min(...pool.map(d => usage.get(d.id) || 0));
      const choices = pool.filter(d => (usage.get(d.id) || 0) === minUsage);
      selected = choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))];
      if(!selected) return null;
      selectedByGroup.set(dayGroup, selected);
      usage.set(selected.id, (usage.get(selected.id) || 0) + 1);
    }
    const previousDessert = original.findIndex(d => d.category === 'dessert');
    const meals = original.filter(d => d.category !== 'dessert');
    if(previousDessert >= 0) meals.splice(Math.min(previousDessert, meals.length), 0, selected);
    else {
      const snack = meals.map(d => d.slot).lastIndexOf('перекус');
      if(snack >= 0) meals[snack] = selected; else meals.push(selected);
    }
    if(meals.some(d => ['kcal','p','f','c'].some(key => !Number.isFinite(d[key]) || d[key] < 0))) return null;
    const base = meals.reduce((sum,d) => sum + d.kcal,0);
    const scale = +(kcal / base).toFixed(3);
    if(!Number.isFinite(scale) || scale <= 0) return null;
    const totals = menuScaledTotals(meals, scale);
    if(target && target.p + target.f + target.c && !menuTargetsWithinTolerance(totals, target)) return null;
    updated.push({...day, ids:meals.map(d => d.id), scale, ...totals, ...(target ? { target:{...target} } : {})});
  }
  return updated;
}

async function buildMenuWeek(){
  if(pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0){ pbShowTrialUpsell('Меню на неделю доступно в полной версии.'); return; }
  const button = $('menuGen'), select = $('menuRepeatDays');
  if(button?.disabled) return;
  const repeatDays = selectedMenuRepeatDays();
  if(button){ button.disabled = true; button.textContent = 'Собираю меню…'; }
  if(select) select.disabled = true;
  try{
    const db = await ensureDishes();
    if(!db.length){ toast('База блюд не загрузилась'); return; }
    const prof = planFromProfile();
    const norm = computeNorm(prof, state.kcalCut || 0);
    const tokens = foodExclusions();
    const budgetTier = nutritionBudgetTier(prof.foodBudget);
    const slots = mealSlots(prof.mealsPerDay);
    const batch = repeatDays === 2 || repeatDays === 3;
    const targets = { kcal:norm.kcal, p:norm.protein, f:norm.fat, c:norm.carb };
    const avoidSignatures = new Set((state.menuWeek || []).map(day => (day.ids || []).join('|')).filter(Boolean));
    const week = createMenuWeekPlan(db, { slots, tier:budgetTier, tokens, kcal:norm.kcal, targets, batch, repeatDays, includeDessert:!!state.menuDesserts, avoidSignatures });
    if(!week){ toast(batch ? 'Не хватает блюд для заготовок под твои ограничения. Выбери разные блюда каждый день.' : 'Не хватает блюд под выбранный рацион и исключения. Проверь настройки питания.'); return; }
    if(week.some(day => !menuTargetsWithinTolerance(day, targets))){ toast('Не удалось подобрать меню в пределах целевых КБЖУ. Измени режим питания или число приёмов пищи.'); return; }
    if(state.menuWeek?.length){
      state.menuPrevious = {
        week:state.menuWeek.map(day => ({...day, ids:[...(day.ids || [])], ...(day.target ? {target:{...day.target}} : {})})),
        repeatDays:savedMenuRepeatDays(state.menuWeek),
        desserts:!!state.menuDesserts,
        bodyCheckSignature:state.menuWeekBodyCheckSignature || ''
      };
    }
    state.menuWeek = week;
    state.menuRepeatDays = repeatDays;
    state.menuWeekBodyCheckSignature = bodyCheckRecommendationSignature(prof);
    clearNutritionResume({ persist:false });
    save();
    track('menu_built', 'nutrition', { meals: slots.length, batch, repeat_days:repeatDays });
    toast(`Меню: ${slots.length} ${mealsWord(slots.length)}/день под целевые КБЖУ`);
  }catch(error){
    toast('Не удалось собрать меню. Попробуй ещё раз.');
  }finally{
    if(button) button.disabled = false;
    if(select) select.disabled = false;
    renderMenuWeek();
  }
}

function restorePreviousMenu(){
  const previous = state.menuPrevious;
  if(!Array.isArray(previous?.week) || !previous.week.length){ toast('Предыдущее меню не найдено'); return; }
  const current = state.menuWeek?.length ? {
    week:state.menuWeek.map(day => ({...day, ids:[...(day.ids || [])], ...(day.target ? {target:{...day.target}} : {})})),
    repeatDays:savedMenuRepeatDays(state.menuWeek),
    desserts:!!state.menuDesserts,
    bodyCheckSignature:state.menuWeekBodyCheckSignature || ''
  } : null;
  state.menuWeek = previous.week.map(day => ({...day, ids:[...(day.ids || [])], ...(day.target ? {target:{...day.target}} : {})}));
  state.menuRepeatDays = normalizeMenuRepeatDays(previous.repeatDays, savedMenuRepeatDays(state.menuWeek));
  state.menuDesserts = !!previous.desserts;
  state.menuWeekBodyCheckSignature = previous.bodyCheckSignature || '';
  state.menuPrevious = current;
  clearNutritionResume({ persist:false });
  save();
  renderMenuWeek();
  toast('Предыдущее меню восстановлено');
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function renderMenuWeek(){
  const wrap = $('menuWeek');
  if(!wrap) return;
  const has = state.menuWeek && state.menuWeek.length;
  const repeatDays = selectedMenuRepeatDays();
  if($('menuRepeatDays')) $('menuRepeatDays').value = String(repeatDays);
  if($('menuDesserts')) $('menuDesserts').checked = !!state.menuDesserts;
  if($('menuRestore')) $('menuRestore').hidden = !Array.isArray(state.menuPrevious?.week) || !state.menuPrevious.week.length;
  const dessertPreferenceMatches = !has || state.menuWeek.every(day => day.ids.some(id => dishById(id)?.category === 'dessert') === !!state.menuDesserts);
  if($('menuGen') && !$('menuGen').disabled) $('menuGen').textContent = has
    ? (repeatDays === savedMenuRepeatDays(state.menuWeek) && dessertPreferenceMatches ? 'Пересобрать меню' : 'Применить и пересобрать') : 'Собрать меню на неделю';
  if(!has){ wrap.innerHTML = '<div class="food-empty">Нажми «Собрать меню на неделю» — распишу 7 дней под твою норму, с рецептами и фото блюд.</div>'; return; }
  const currentNorm = computeNorm(planFromProfile(), state.kcalCut || 0);
  const currentTargets = { kcal:currentNorm.kcal, p:currentNorm.protein, f:currentNorm.fat, c:currentNorm.carb };
  const targetsChanged = !state.menuWeek.every(day => menuTargetsMatch(day.target, currentTargets));
  const targetsHint = targetsChanged
    ? '<div class="bodycheck-menu-note"><b>Показываем сохранённое меню</b><span>Оно рассчитано по прежней норме КБЖУ. Можешь продолжить пользоваться им или нажать «Пересобрать меню» для обновления.</span></div>'
    : '';
  ensureDishes();
  const currentSignature = bodyCheckRecommendationSignature(planFromProfile());
  // Menus created before BodyCheck signatures existed need the same honest prompt.
  const bodyCheckChanged = currentSignature !== 'base' && state.menuWeekBodyCheckSignature !== currentSignature;
  const updateHint = bodyCheckChanged
    ? '<div class="bodycheck-menu-note"><b>BodyCheck обновил норму</b><span>Этот план сохранён по прошлым порциям. Нажми «Пересобрать меню», когда будешь готов обновить неделю.</span></div>'
    : '';
  const varietyHint = menuWeekHasLimitedVariety(state.menuWeek)
    ? '<p class="menu-variety-notice" role="status">Под выбранные ограничения мало блюд: часть повторяется между меню.</p>' : '';
  wrap.innerHTML = targetsHint + updateHint + varietyHint + state.menuWeek.map((day, i) =>
    `<button type="button" class="menu-day-row" data-d="${i}"><span class="menu-day-n">${WEEKDAYS[i] || ('Д' + (i + 1))}</span><span class="menu-day-b"><b>День ${i + 1}</b><span>${day.ids.length} ${mealsWord(day.ids.length)} · Б ${day.p} Ж ${day.f} У ${day.c}</span>${day.repeatEveryDays ? `<small class="menu-rhythm-label">${escapeHtml(menuDayRhythmLabel(day, i))}</small>` : ''}${day.prepStartDay != null ? `<small class="menu-prep-label">${day.prepStartDay === i ? `Готовка на ${day.prepDays} ${day.prepDays === 1 ? 'день' : 'дня'}` : 'Обед и ужин из заготовки'}</small>` : ''}</span><span class="menu-day-k">${day.kcal}<i>ккал</i></span></button>`
  ).join('');
  wrap.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => openMenuDay(Number(b.dataset.d))));
}

async function openMenuDay(di, options = {}){
  await ensureDishes();
  const day = state.menuWeek[di], o = $('menuDetail');
  if(!day || !o) return;
  if(!options.restore) rememberNutritionResume(di);
  const meals = day.ids.map(dishById).filter(Boolean);
  const scale = day.scale || 1, sc = x => Math.round(x * scale);
  const portionNote = Math.abs(scale - 1) > 0.05 ? ` · порции ×${scale.toFixed(1)} под норму` : '';
  o.innerHTML = `<div class="lib-sheet"><div class="lib-sheet-head"><h2>День ${di + 1} · ${day.kcal} ккал</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="gen-hint" style="margin:0 0 12px">${meals.length} ${mealsWord(meals.length)} · Б ${day.p} · Ж ${day.f} · У ${day.c} г${portionNote}. Тапни блюдо — рецепт и состав.</p>
    ${day.prepStartDay != null ? `<p class="dish-portion">Обед и ужин: заготовка с дня ${day.prepStartDay + 1} на ${day.prepDays} ${day.prepDays === 1 ? 'день' : 'дня'}. Завтрак и перекусы собирай в день еды.</p>` : ''}
    <div class="menu-meals">${meals.map(m => {
      const logged = menuMealLogged(m, di);
      return `<div class="menu-meal" data-id="${escapeHtml(m.id)}">${dishThumb(m)}<span class="menu-meal-b"><span class="menu-slot">${escapeHtml(m.category === 'dessert' ? 'ПП-десерт' : m.slot)}</span><b>${escapeHtml(m.name)}</b><span>${sc(m.kcal)} ккал · Б ${sc(m.p)} Ж ${sc(m.f)} У ${sc(m.c)}</span></span><button type="button" class="menu-eat${logged ? ' done' : ''}" data-eat="${escapeHtml(m.id)}" aria-label="${logged ? 'Блюдо уже в дневнике' : 'Съел это блюдо'}">✓<i>${logged ? 'готово' : 'съел'}</i></button></div>`;
    }).join('')}</div><p class="menu-save-note">Отметка сохраняется сразу в дневник питания за сегодня.</p></div>`;
  o.hidden = false;
  o.querySelector('.lib-close')?.addEventListener('click', closeMenuDetail);
  o.querySelectorAll('.menu-meal').forEach(b => b.addEventListener('click', () => openDishDetail(b.dataset.id, di)));
  o.querySelectorAll('.menu-eat').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const m = dishById(b.dataset.eat);
    if(!m) return;
    if(menuMealLogged(m, di)){ toast('Уже сохранено в дневнике'); return; }
    addFood(menuFoodEntry(m, di, scale));
    b.classList.add('done');
    b.innerHTML = '✓<i>готово</i>';
  }));
}

const dessertCatalogState = { limit:24, busy:false, scroll:{main:0,desserts:0} };
function favoriteDishSet(){ return new Set((state.favoriteDishIds || []).map(String)); }
function dishIsFavorite(id){ return favoriteDishSet().has(String(id)); }
function favoriteDishesFirst(dishes){
  const favorites = favoriteDishSet();
  return (dishes || []).map((dish, index) => ({ dish, index })).sort((a, b) => {
    const favoriteOrder = Number(favorites.has(String(b.dish.id))) - Number(favorites.has(String(a.dish.id)));
    return favoriteOrder || a.index - b.index;
  }).map(entry => entry.dish);
}
function recipeCardHtml(dish, idAttribute){
  const favorite = dishIsFavorite(dish.id);
  const detail = dish.category === 'dessert'
    ? `${dish.prepMinutes} мин`
    : `${escapeHtml(dish.slot)}${dish.mealPrep ? ` · на ${dish.mealPrep.fridgeDays} дня` : ''}`;
  return `<article class="recipe-card${favorite ? ' is-favorite' : ''}">
    <button type="button" class="recipe-card-open" ${idAttribute}="${escapeHtml(dish.id)}">
      <img src="${escapeHtml(dishImageUrl(dish.img))}" alt="${escapeHtml(dish.name)}" loading="lazy">
      <span class="recipe-card-copy"><small>${detail}</small><b>${escapeHtml(dish.name)}</b><span>${dish.kcal} ккал · Б ${dish.p} · Ж ${dish.f} · У ${dish.c}</span></span>
    </button>
    <button type="button" class="recipe-favorite" data-favorite-dish="${escapeHtml(dish.id)}" aria-pressed="${favorite}" aria-label="${favorite ? 'Убрать из избранного' : 'Добавить в избранное'}"><span aria-hidden="true">${favorite ? '♥' : '♡'}</span></button>
  </article>`;
}
function toggleFavoriteDish(id){
  const dishId = String(id || '');
  if(!dishId) return false;
  const favorites = favoriteDishSet(), selected = !favorites.has(dishId);
  if(selected) favorites.add(dishId); else favorites.delete(dishId);
  state.favoriteDishIds = [...favorites];
  save();
  track('recipe_favorite_toggle', 'nutrition', { dish_id:dishId, selected });
  toast(selected ? 'Добавлено в избранное' : 'Удалено из избранного');
  return selected;
}
function bindRecipeFavoriteButtons(root, rerender){
  root?.querySelectorAll('[data-favorite-dish]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    toggleFavoriteDish(button.dataset.favoriteDish);
    rerender?.();
  }));
}
function switchNutritionView(view){
  if(view === 'desserts' && pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0){ pbShowTrialUpsell('Десерты доступны в полной версии.'); return; }
  const previous = $('nutrition').dataset.nutritionView || 'main';
  if(previous !== view) dessertCatalogState.scroll[previous] = $('nutrition').scrollTop;
  $('nutrition').dataset.nutritionView = view;
  $('dessertPanel').hidden = true;
  if($('recipeCatalogPanel')) $('recipeCatalogPanel').hidden = view !== 'catalog' && view !== 'desserts';
  $('recipeCatalogPanel')?.setAttribute('aria-labelledby',view === 'desserts' ? 'nutritionDessertTab' : 'nutritionCatalogTab');
  document.querySelectorAll('.nutrition-tabs [role="tab"]').forEach(tab => {
    const active = tab.dataset.nutritionView === view || (tab.dataset.nutritionCatalog && view === 'catalog');
    tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
  });
  if(previous !== view) $('nutrition').scrollTop = dessertCatalogState.scroll[view] || 0;
  if(view === 'main') recipeExperience?.suspend();
}
async function renderDessertCatalog(){
  const grid = $('dessertGrid');
  if(!grid) return;
  $('dessertResultCount').textContent = 'Загрузка рецептов…';
  try{
    const db = await ensureDishes();
    if(!db.length) throw new Error('empty');
    const query = $('dessertSearch').value.trim().toLowerCase();
    const type = $('dessertType').value, tier = $('dessertBudget').value;
    const tokens = foodExclusions();
    const all = db.filter(d => d.category === 'dessert');
    const filtered = favoriteDishesFirst(all.filter(d => (type === 'all' || d.dessertType === type)
      && (tier === 'all' || dishBudgetTier(d) === tier) && dishAllowed(d, tokens)
      && (!query || [d.name, ...(d.ingredients || []).map(i => i.n)].join(' ').toLowerCase().includes(query))));
    const favoriteCount = filtered.filter(d => dishIsFavorite(d.id)).length;
    $('dessertTotal').textContent = `${all.length} рецептов`;
    $('dessertResultCount').textContent = `Найдено: ${filtered.length}${favoriteCount ? ` · избранных: ${favoriteCount} (сверху)` : ''} · с учётом исключений из анкеты`;
    $('dessertMenuStatus').textContent = state.menuWeek?.some(day => day.ids.some(id => dishById(id)?.category === 'dessert')) ? 'Десерты включены в сохранённое меню' : '';
    grid.innerHTML = filtered.slice(0, dessertCatalogState.limit).map(d => recipeCardHtml(d, 'data-dessert-id')).join('') || '<p class="food-empty">Нет десертов под выбранные фильтры.</p>';
    grid.querySelectorAll('[data-dessert-id]').forEach(button => button.addEventListener('click', () => openDishDetail(button.dataset.dessertId, null, { fromDesserts:true })));
    bindRecipeFavoriteButtons(grid, renderDessertCatalog);
    $('dessertMore').hidden = filtered.length <= dessertCatalogState.limit;
  }catch(error){
    $('dessertResultCount').textContent = 'Не удалось загрузить рецепты.';
    grid.innerHTML = '<button type="button" class="secondary" id="dessertRetry">Повторить</button>';
    $('dessertRetry').addEventListener('click', renderDessertCatalog);
  }
}
async function addDessertsToMenu({ dessertId = null, dayIndex = null } = {}){
  if(pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0){ pbShowTrialUpsell('Меню с десертами доступно в полной версии.'); return; }
  if(dessertCatalogState.busy || $('menuGen')?.disabled) return;
  dessertCatalogState.busy = true;
  const buttons = [$('dessertsToMenu'), $('dessertToMenu'), $('menuGen')].filter(Boolean);
  buttons.forEach(button => { button.disabled = true; });
  try{
    const db = await ensureDishes(), prof = planFromProfile();
    const norm = computeNorm(prof, state.kcalCut || 0), kcal = norm.kcal;
    const targets = { kcal:norm.kcal, p:norm.protein, f:norm.fat, c:norm.carb };
    const tier = nutritionBudgetTier(prof.foodBudget), tokens = foodExclusions();
    const repeatDays = selectedMenuRepeatDays();
    const hadMenu = !!state.menuWeek?.length;
    const currentIsFresh = hadMenu && state.menuWeek.every(day => menuTargetsMatch(day.target, targets));
    const current = currentIsFresh ? state.menuWeek : createMenuWeekPlan(db, { slots:mealSlots(prof.mealsPerDay), tier, tokens, kcal, targets, repeatDays, batch:repeatDays === 2 || repeatDays === 3, includeDessert:false });
    const week = applyDessertsToMenuWeek(db, current, { kcal, targets, tier, tokens, dessertId, dayIndex });
    if(!week){ toast('Не удалось включить десерт. Проверь исключения и настройки меню.'); return; }
    state.menuWeek = week;
    state.menuDesserts = week.every(day => day.ids.some(id => db.find(d => d.id === id)?.category === 'dessert'));
    state.menuRepeatDays = repeatDays;
    if(dayIndex == null || !hadMenu) state.menuWeekBodyCheckSignature = bodyCheckRecommendationSignature(prof);
    clearNutritionResume({ persist:false });
    save(); renderMenuWeek(); closeMenuDetail(); switchNutritionView('main');
    if(dayIndex != null) await openMenuDay(dayIndex);
    else $('menuWeek')?.scrollIntoView({ block:'start', behavior:'smooth' });
    toast('Десерт включён в меню. Порции и КБЖУ пересчитаны.');
  }catch(error){ toast('Не удалось обновить меню. Попробуй ещё раз.'); }
  finally{ dessertCatalogState.busy = false; buttons.forEach(button => { button.disabled = false; }); renderMenuWeek(); }
}

const recipeCatalogState = { tier:null, query:'', prepOnly:false, slot:'all', limit:24 };
async function openRecipeCatalog(options = {}){
  if(pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0){ pbShowTrialUpsell('Каталог рецептов доступен в полной версии.'); return; }
  const panel = $('recipeCatalogPanel');
  if(!panel) return;
  closeMenuDetail();
  switchNutritionView(options.pp ? 'desserts' : 'catalog');
  const token = ++recipeExperienceToken;
  if(options.history !== false) pbRecipeNavigation();
  pbUpdateTelegramBack('nutrition', true);
  if(!recipeExperience){
    panel.innerHTML = '<div class="recipe-load-state" role="status">Загрузка рецептов…</div>';
    if(!recipeExperienceLoad) recipeExperienceLoad = (async () => {
      const db = await ensureDishes();
      if(!db.length) throw Error('Empty recipe database');
      const { mountRecipeCatalog } = await import('./recipe-catalog.mjs?v=recipes20261019-1');
      return mountRecipeCatalog({
        host:panel, dishes:db, scroller:$('nutrition'), imageUrl:dishImageUrl,
        allowed:id => { const dish = dishById(id); return !!dish && dishAllowed(dish,foodExclusions()); },
        getFavorites:() => [...favoriteDishSet()], toggleFavorite:toggleFavoriteDish,
        quantity:(ingredient,count) => recipeIngredientQuantity(ingredient,1,count), stepText:recipeStepText,
        toast, navigate:pbRecipeNavigation, onBack:pbRecipeBack,
        onCollection:pp => {
          if(panel.hidden || !$('nutrition')?.classList.contains('active')) return;
          const top = $('nutrition').scrollTop;
          switchNutritionView(pp ? 'desserts' : 'catalog');
          $('nutrition').scrollTop = top;
        },
        openFallback:id => openDishDetail(id,null,{ fromCatalog:true }),
        logFood:id => {
          const dish = dishById(id);
          if(dish) addFood({ name:dish.name, kcal:dish.kcal, p:dish.p, f:dish.f, c:dish.c });
        },
        addDessert:async (id,dayIndex) => {
          await addDessertsToMenu({ dessertId:id,dayIndex });
          if(panel.hidden) history.replaceState({ pbScreen:'nutrition' }, '', location.href);
        },
      });
    })().then(experience => { recipeExperience = experience; return experience; }).catch(error => { recipeExperienceLoad = null; throw error; });
    try { await recipeExperienceLoad; }
    catch(error){
      if(token !== recipeExperienceToken) return;
      panel.innerHTML = '<div class="recipe-load-state"><p>Не удалось загрузить рецепты.</p><button type="button" class="secondary" id="retryRecipeCatalog">Повторить</button></div>';
      $('retryRecipeCatalog')?.addEventListener('click', () => openRecipeCatalog({ ...options,history:false }));
      return;
    }
  }
  if(token !== recipeExperienceToken || panel.hidden) return;
  recipeExperience.show({ recipeId:options.recipeId,pp:options.history === false ? undefined : !!options.pp,prompt:options.history !== false });
  track('recipe_catalog_view','nutrition',{ collection:options.pp ? 'pp' : 'all' });
}
function renderRecipeCatalog(){
  const grid = $('recipeGrid');
  if(!grid) return;
  const query = recipeCatalogState.query.trim().toLowerCase();
  const tokens = foodExclusions();
  const filtered = favoriteDishesFirst((dishesDB || []).filter(d => d.category !== 'dessert' && dishBudgetTier(d) === recipeCatalogState.tier
    && (!recipeCatalogState.prepOnly || d.mealPrep)
    && (recipeCatalogState.slot === 'all' || d.slot === recipeCatalogState.slot)
    && dishAllowed(d, tokens)
    && (!query || [d.name, ...(d.ingredients || []).map(i => i.n)].join(' ').toLowerCase().includes(query)))
    .sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || ''))));
  const favoriteCount = filtered.filter(d => dishIsFavorite(d.id)).length;
  $('recipeResultCount').textContent = `Найдено: ${filtered.length}${favoriteCount ? ` · избранных: ${favoriteCount} (сверху)` : ''} · с учётом исключений из анкеты`;
  grid.innerHTML = filtered.slice(0, recipeCatalogState.limit).map(d => recipeCardHtml(d, 'data-recipe-id')).join('') || '<p class="food-empty">Под эти фильтры блюд нет. Попробуй другой запрос.</p>';
  grid.querySelectorAll('[data-recipe-id]').forEach(button => button.addEventListener('click', () => openDishDetail(button.dataset.recipeId, null, { fromCatalog:true })));
  bindRecipeFavoriteButtons(grid, renderRecipeCatalog);
  $('recipeMore').hidden = filtered.length <= recipeCatalogState.limit;
}
function recipeIngredientQuantity(ingredient, scale = 1, servings = 1){
  const amount = Number(ingredient.amount);
  if(!Number.isFinite(amount) || amount <= 0) return ingredient.q || '';
  const total = Math.round(amount * scale * servings * 10) / 10;
  return `${String(total).replace('.', ',')} ${ingredient.unit || 'г'}`;
}
function recipeStepText(step, factor){
  const scaled = amount => String(Math.round(Number(amount.replace(',', '.')) * factor * 10) / 10).replace('.', ',');
  return String(step).replace(/(\d+(?:[,.]\d+)?)(?:\s*[–−-]\s*(\d+(?:[,.]\d+)?))?\s*(мл|ложки|ложек|ложкой|ложку)(?=[\s,.]|$)/g, (_match, from, to, unit) => {
    return `${scaled(from)}${to ? `–${scaled(to)}` : ''} ${unit.startsWith('лож') ? 'ст. л.' : unit}`;
  });
}
function openDishDetail(id, backDay, options = {}){
  const d = dishById(id), o = $('menuDetail');
  if(!d || !o) return;
  if(backDay != null && !options.restore) rememberNutritionResume(backDay, id);
  const scale = (backDay != null && state.menuWeek[backDay] && state.menuWeek[backDay].scale) || 1;
  const sc = x => Math.round(x * scale);
  const numericIngredients = (d.ingredients || []).every(i => Number(i.amount) > 0);
  const portionNote = Math.abs(scale - 1) > 0.05 ? `<p class="dish-portion">Порция под твою норму: ×${scale.toFixed(2)} от базовой.${numericIngredients ? ' Количества ниже уже пересчитаны.' : ' Состав ниже — на одну базовую порцию.'}</p>` : '';
  const plannedDay = backDay != null ? state.menuWeek[backDay] : null;
  let cookServings = d.mealPrep && plannedDay?.prepDays ? Math.min(4, Math.max(1, plannedDay.prepDays - (backDay - plannedDay.prepStartDay))) : 1;
  const ingredientsHtml = () => (d.ingredients || []).map(x => `<li><span>${escapeHtml(x.n)}</span><b>${escapeHtml(recipeIngredientQuantity(x, scale, cookServings))}</b></li>`).join('');
  const stepsHtml = () => (d.steps || []).map(s => `<li>${escapeHtml(numericIngredients ? recipeStepText(s, scale * cookServings) : s)}</li>`).join('');
  const portionControls = numericIngredients ? `<fieldset class="recipe-portions"><legend>Приготовить порций</legend><div>${[1,2,3,4].map(n => `<label><input type="radio" name="recipePortions" value="${n}"${n === cookServings ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset><p class="dish-portion" id="recipePortionNote"></p>` : '';
  const favorite = dishIsFavorite(d.id);
  o.innerHTML = `<div class="lib-sheet"><div class="lib-sheet-head"><h2>${escapeHtml(d.name)}</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    ${dishMediaBlock(d)}
    <button type="button" class="dish-favorite${favorite ? ' is-favorite' : ''}" id="dishFavorite" aria-pressed="${favorite}"><span aria-hidden="true">${favorite ? '♥' : '♡'}</span> ${favorite ? 'В избранном' : 'В избранное'}</button>
    ${mediaReportButton('dish', d.id, d.name)}
    <div class="dish-macros"><span><b>${sc(d.kcal)}</b> ккал</span><span>Б ${sc(d.p)}</span><span>Ж ${sc(d.f)}</span><span>У ${sc(d.c)}</span></div>
    ${d.portion ? `<p class="dish-portion">${escapeHtml(d.portion)}</p>` : ''}
    ${portionNote}
    ${portionControls}
    <h3>Состав</h3><ul class="dish-ing" id="recipeIngredients">${ingredientsHtml()}</ul>
    <h3>Приготовление</h3><ol class="lib-steps" id="recipeSteps">${stepsHtml()}</ol>
    ${d.mealPrep ? `<section class="recipe-storage"><h3>На несколько дней</h3><p>${escapeHtml(d.mealPrep.storage)}</p><p>${escapeHtml(d.mealPrep.cooling)}</p><p>${escapeHtml(d.mealPrep.reheat)}</p><p>Можно заморозить порционно при −18 °C на срок до ${d.mealPrep.freezerDays} дней. Подпиши дату приготовления.</p></section>` : ''}
    ${d.nutritionNote ? `<p class="dish-portion recipe-nutrition-note">${escapeHtml(d.nutritionNote)}</p>` : ''}
    ${d.category === 'dessert' ? `<p class="dish-portion">${d.prepMinutes} мин · КБЖУ приблизительные</p><div class="dessert-add-controls"><select id="dessertMenuDay" aria-label="День меню для десерта">${Array.from({length:7}, (_, i) => `<option value="${i}"${i === backDay ? ' selected' : ''}>День ${i + 1}${state.menuWeek?.[i]?.repeatEveryDays > 1 ? ' и его повторы' : ''}</option>`).join('')}</select><button type="button" class="primary" id="dessertToMenu">Включить в меню</button></div>${(d.sources || []).filter(source => /^https:\/\//.test(source.url)).map(source => `<p class="recipe-source">Идея рецепта: <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a> · адаптированный состав</p>`).join('')}` : ''}
    <button type="button" class="primary shine" id="dishToLog">✓ Съел это блюдо</button>
    <button type="button" class="wkp-skip" id="dishBack">${options.fromDesserts ? '← К десертам' : options.fromCatalog ? '← К рецептам' : backDay != null ? `← Назад к дню ${backDay + 1}` : 'Закрыть'}</button></div>`;
  o.hidden = false;
  o.querySelector('.lib-close')?.addEventListener('click', closeMenuDetail);
  o.querySelector('#dishFavorite')?.addEventListener('click', event => {
    const selected = toggleFavoriteDish(d.id);
    event.currentTarget.classList.toggle('is-favorite', selected);
    event.currentTarget.setAttribute('aria-pressed', String(selected));
    event.currentTarget.innerHTML = `<span aria-hidden="true">${selected ? '♥' : '♡'}</span> ${selected ? 'В избранном' : 'В избранное'}`;
  });
  bindMediaReports(o);
  const updatePortionNote = () => {
    const note = o.querySelector('#recipePortionNote');
    if(note) note.textContent = cookServings === 1 ? 'КБЖУ и запись в дневнике — на одну порцию.' : `Раздели готовое блюдо на ${cookServings} равные порции. В дневник добавится одна. Готовь в посуде подходящего размера, сохраняя толщину слоя; проверяй готовность в центре.`;
  };
  updatePortionNote();
  o.querySelectorAll('[name="recipePortions"]').forEach(input => input.addEventListener('change', () => {
    cookServings = Number(input.value);
    o.querySelector('#recipeIngredients').innerHTML = ingredientsHtml();
    o.querySelector('#recipeSteps').innerHTML = stepsHtml();
    updatePortionNote();
  }));
  o.querySelector('#dessertToMenu')?.addEventListener('click', () => addDessertsToMenu({ dessertId:d.id, dayIndex:Number(o.querySelector('#dessertMenuDay').value) }));
  o.querySelector('#dishBack')?.addEventListener('click', () => { if(options.fromDesserts){ closeMenuDetail(); switchNutritionView('desserts'); } else if(options.fromCatalog) openRecipeCatalog(); else if(backDay != null) openMenuDay(backDay); else closeMenuDetail(); });
  o.querySelector('#dishToLog')?.addEventListener('click', e => {
    if(backDay != null && menuMealLogged(d, backDay)){ toast('Уже сохранено в дневнике'); e.target.textContent = '✓ Уже в дневнике'; e.target.disabled = true; return; }
    addFood(backDay != null ? menuFoodEntry(d, backDay, scale) : { name: d.name, kcal: sc(d.kcal), p: sc(d.p), f: sc(d.f), c: sc(d.c) });
    e.target.textContent = '✓ Добавлено в дневник';
    e.target.disabled = true;
  });
}

function bindMeals(){
  const nutritionTabs = [...document.querySelectorAll('.nutrition-tabs [role="tab"]')];
  nutritionTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if(tab.dataset.nutritionCatalog){ switchNutritionView('catalog'); openRecipeCatalog(); return; }
      if(tab.dataset.nutritionView === 'desserts'){ openRecipeCatalog({ pp:true }); return; }
      if(tab.dataset.nutritionView === 'main' && history.state?.pbRecipe) history.replaceState({ pbScreen:'nutrition' }, '', location.href);
      switchNutritionView(tab.dataset.nutritionView);
    });
    tab.addEventListener('keydown', event => {
      if(!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? nutritionTabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + nutritionTabs.length) % nutritionTabs.length;
      nutritionTabs[next].click();
      if(nutritionTabs[next].getAttribute('aria-selected') === 'true') nutritionTabs[next].focus();
    });
  });
  if(!pbSimpleUi()) window.addEventListener('popstate', event => pbHandleRecipeHistory(event));
  ['dessertSearch', 'dessertType', 'dessertBudget'].forEach(id => $(id)?.addEventListener(id === 'dessertSearch' ? 'input' : 'change', () => { dessertCatalogState.limit = 24; renderDessertCatalog(); }));
  $('dessertMore')?.addEventListener('click', () => { dessertCatalogState.limit += 24; renderDessertCatalog(); });
  $('dessertsToMenu')?.addEventListener('click', () => addDessertsToMenu());
  $('menuDesserts')?.addEventListener('change', event => { state.menuDesserts = event.target.checked; save(); renderMenuWeek(); });
  $('foodAdd')?.addEventListener('click', openFoodPicker);
  $('foodPhoto')?.addEventListener('click', openFoodPhoto);
  $('foodGen')?.addEventListener('click', generateMenu);
  $('foodClear')?.addEventListener('click', () => {
    const draft = nutritionRecordDraftForDate(selectedNutritionDate());
    if(!draft.items.length) return;
    draft.items = [];
    commitSelectedNutritionDraft(draft);
    toast('Дневник очищен');
  });
  $('menuGen')?.addEventListener('click', buildMenuWeek);
  $('menuRestore')?.addEventListener('click', restorePreviousMenu);
  $('menuRepeatDays')?.addEventListener('change', event => {
    state.menuRepeatDays = normalizeMenuRepeatDays(event.target.value);
    save();
    renderMenuWeek();
  });
  $('recipeCatalogOpen')?.addEventListener('click', openRecipeCatalog);
  document.querySelectorAll('#calToggle .cal-tg').forEach(b => b.addEventListener('click', () => {
    if(b.dataset.cal === 'week' && pbIsTrial24Subscription(pbSubscription) && pbTrial24HoursLeft(pbSubscription) > 0){ pbShowTrialUpsell('Недельный итог питания доступен в полной версии.'); return; }
    state.calView = b.dataset.cal; save(); renderNutrition();
  }));
  [$('foodPicker'), $('menuDetail')].forEach(o => { if(o) o.addEventListener('click', e => { if(e.target === o){ if(o.id === 'menuDetail') closeMenuDetail(); else { o.hidden = true; o.innerHTML = ''; } } }); });
}

function hydrateForm(){
  const form = $('profileForm');
  if(!form) return;
  Object.entries(state.profile).forEach(([key, value]) => {
    if(form.elements[key]) form.elements[key].value = key === 'inventory' ? normalizeInventory(value) : value;
  });
}

// ===== Анкета-мастер: шаги через «Далее» =====
let anketaStep = 1;
const ANKETA_STEPS = 5;
const ANKETA_SUBMIT_IDLE_TEXT = 'Создать мою программу';
const ANKETA_SUBMIT_PENDING_TEXT = 'Собираем программу...';
const ANKETA_SUBMIT_TIMEOUT_MS = 40000;
const ANKETA_SUBMIT_TIMEOUT_MESSAGE = 'Не получилось создать программу. Проверь интернет и нажми ещё раз.';
let anketaSubmitPending = false;
function createQuestionnaireAttemptId(){
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return `ank_${Date.now().toString(36)}_${randomPart}`;
}
function questionnairePlatform(){
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '').toLowerCase() : '';
  const os = /iphone|ipad|ipod/.test(ua) ? 'ios' : /android/.test(ua) ? 'android' : 'other';
  return `${pbInTelegram() ? 'telegram' : 'web'}_${os}`;
}
function trackQuestionnaire(type, attemptId, meta){
  const source = meta || {};
  const safe = {
    attempt_id: String(attemptId || ''),
    platform: questionnairePlatform()
  };
  ['step', 'duration_ms', 'error_code', 'profile_synced', 'state_synced', 'queued'].forEach(key => {
    if(source[key] !== undefined) safe[key] = source[key];
  });
  track(type, 'onboarding', safe);
}
function showAnketaStep(n){
  anketaStep = Math.min(ANKETA_STEPS, Math.max(1, n));
  if(pbSimpleUi()) try{ WLStorage.setItem('primeBodyAnketaStep', String(anketaStep)); }catch(e){}
  document.querySelectorAll('#profileForm .anketa-step').forEach(fs => fs.classList.toggle('on', +fs.dataset.step === anketaStep));
  document.querySelectorAll('#anketaProgress i').forEach((d, i) => d.classList.toggle('on', i < anketaStep));
  const badge = $('anketaBadge'); if(badge) badge.textContent = `Шаг ${anketaStep} из ${ANKETA_STEPS}`;
  const back = $('anketaBack'), next = $('anketaNext'), fin = $('anketaFinish');
  if(back) back.hidden = anketaStep === 1;
  if(next) next.hidden = anketaStep === ANKETA_STEPS;
  if(fin) fin.hidden = anketaStep !== ANKETA_STEPS;
  const screen = $('onboarding');
  const activeStep = document.querySelector('#profileForm .anketa-step.on');
  requestAnimationFrame(() => {
    if(screen) screen.scrollTo({ top: 0, behavior: 'auto' });
    if(activeStep) activeStep.scrollTo({ top: 0, behavior: 'auto' });
  });
}
function setAnketaSubmitState(pending, message){
  anketaSubmitPending = !!pending;
  const fin = $('anketaFinish'), next = $('anketaNext'), back = $('anketaBack'), err = $('anketaError');
  if(fin){
    fin.disabled = anketaSubmitPending;
    fin.textContent = anketaSubmitPending ? ANKETA_SUBMIT_PENDING_TEXT : ANKETA_SUBMIT_IDLE_TEXT;
    fin.setAttribute('aria-busy', anketaSubmitPending ? 'true' : 'false');
  }
  if(next) next.disabled = anketaSubmitPending;
  if(back) back.disabled = anketaSubmitPending;
  if(err){
    const text = String(message || '').trim();
    err.hidden = !text;
    err.textContent = text;
  }
}
function withTimeout(task, ms, message){
  let timer;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const promise = typeof task === 'function'
    ? Promise.resolve().then(() => task(controller?.signal))
    : Promise.resolve(task);
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => {
      controller?.abort();
      reject(new Error(message));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}
function validateAnketaStep(n){
  if(n !== 1) return true;
  const f = $('profileForm'); if(!f) return true;
  const w = parseFloat(f.weight.value), h = parseFloat(f.height.value), a = parseInt(f.age.value, 10);
  if(!w || w < 30 || w > 300){ toast('Укажи корректный вес'); f.weight.focus(); return false; }
  if(!h || h < 120 || h > 230){ toast('Укажи корректный рост'); f.height.focus(); return false; }
  if(!a || a < 14 || a > 90){ toast('Укажи корректный возраст'); f.age.focus(); return false; }
  return true;
}
function syncChipGroup(containerId, fieldId){
  const zones = [...document.querySelectorAll(`#${containerId} .inj-chip.on`)].map(c => c.dataset.z);
  const f = $(fieldId); if(f) f.value = zones.join(', ');
}
function hydrateChipGroup(containerId, saved){
  const hay = String(saved || '').toLowerCase();
  document.querySelectorAll(`#${containerId} .inj-chip`).forEach(c => {
    c.classList.toggle('on', hay.includes(String(c.dataset.z || '').toLowerCase()));
  });
}
function syncAnketaChips(){
  syncChipGroup('injuryChips', 'injuriesField');
  syncChipGroup('medicalFlagChips', 'medicalFlagsField');
  syncChipGroup('focusChips', 'focusZonesField');
}
function collectAnketaProfile(form){
  if(!form) throw new Error('Анкета не найдена. Обнови приложение и попробуй ещё раз.');
  const profile = Object.fromEntries(new FormData(form).entries());
  profile.inventory = normalizeInventory(profile.inventory);
  return profile;
}
async function applyAnketaProgramProfile(profile, signal){
  const p = profile || {};
  state.profile = p;
  const safeMode = [p.medicalFlags, p.limits, p.medications].filter(x => x && x.trim()).join(', ');
  state.tasks[0].text = safeMode
    ? `Мягкая тренировка: ${(p.goal || '').toLowerCase()} / ${(p.place || '').toLowerCase()}`
    : `Сделать тренировку: ${(p.goal || '').toLowerCase()} / ${(p.place || '').toLowerCase()}`;
  const careOf = [p.injuries, p.medicalFlags, p.limits].filter(x => x && x.trim()).join(', ') || 'суставы и связки';
  state.tasks[3].text = `10 минут мобильности с учётом: ${careOf}`;
  state.menuWeek = [];   // меню пересоберётся под новые ответы (число приёмов, диета, норма)
  state.dayWorkout = { date: '', items: [] };   // тренировка дня пересоберётся под цель/инвентарь/уровень
  state.workoutResume = null;
  state.nutritionResume = null;
  save();
  renderPlan();
  renderTasks();
  renderMetrics();
  renderHomeProfile();
  const profileSync = await pbSyncProfile(p, signal);
  const stateSynced = await pbUpsertUserStateSnapshot(signal);
  if(!profileSync.queued && !stateSynced) throw new Error('Профиль не сохранён и не поставлен в очередь синхронизации');
  track('anketa_done', 'onboarding', {
    profile_synced: !!profileSync.synced,
    state_synced: !!stateSynced,
    queued: !!profileSync.queued && !profileSync.synced
  });
}

async function submitAnketaForm(form){
  if(anketaSubmitPending) return false;
  const attemptId = createQuestionnaireAttemptId();
  const startedAt = Date.now();
  trackQuestionnaire('questionnaire_submit_click', attemptId, { step: anketaStep });
  if(!validateAnketaStep(1)){
    trackQuestionnaire('validation_failed', attemptId, { step: 1, duration_ms: Date.now() - startedAt, error_code: 'profile_basics' });
    return false;
  }
  setAnketaSubmitState(true, '');
  trackQuestionnaire('request_started', attemptId, { step: anketaStep });
  try{
    syncAnketaChips();
    await withTimeout(signal => Promise.resolve().then(() => {
      const profile = collectAnketaProfile(form);
      return applyAnketaProgramProfile(profile, signal);
    }), ANKETA_SUBMIT_TIMEOUT_MS, ANKETA_SUBMIT_TIMEOUT_MESSAGE);
    setAnketaSubmitState(false, '');
    trackQuestionnaire('program_created', attemptId, { step: anketaStep, duration_ms: Date.now() - startedAt });
    toast('Программа готова. Можно начинать.');
    jump('today');
    showAnketaStep(1);
    try{ WLStorage.removeItem('primeBodyAnketaStep'); }catch(e){}
    return true;
  }catch(error){
    console.warn('Не удалось создать программу', error);
    const timedOut = error && error.message === ANKETA_SUBMIT_TIMEOUT_MESSAGE;
    const message = timedOut
      ? ANKETA_SUBMIT_TIMEOUT_MESSAGE
      : 'Не получилось создать программу. Проверь поля анкеты и нажми ещё раз.';
    const errorCode = timedOut
      ? 'timeout'
      : /синхронизац|сохран/i.test(String(error && error.message || '')) ? 'sync_failed' : 'unknown';
    trackQuestionnaire('request_failed', attemptId, {
      step: anketaStep,
      duration_ms: Date.now() - startedAt,
      error_code: errorCode
    });
    setAnketaSubmitState(false, message);
    toast('Анкета не сохранилась — попробуй ещё раз');
    return false;
  }
}

function bindAnketaFinish(form, submitAction){
  const finish = $('anketaFinish');
  if(!form || !finish || typeof submitAction !== 'function') return;
  let lastTouchEnd = 0;
  const activate = event => {
    if(event && typeof event.preventDefault === 'function') event.preventDefault();
    if(event?.type === 'click' && lastTouchEnd && Date.now() - lastTouchEnd < 800) return;
    if(event?.type === 'touchend') lastTouchEnd = Date.now();
    void submitAction(form);
  };
  form.addEventListener('submit', activate);
  finish.addEventListener('click', activate);
  finish.addEventListener('touchend', activate, { passive:false });
}

function bindAnketa(){
  $('anketaNext')?.addEventListener('click', () => { if(validateAnketaStep(anketaStep)) showAnketaStep(anketaStep + 1); });
  $('anketaBack')?.addEventListener('click', () => showAnketaStep(anketaStep - 1));
  document.querySelectorAll('#injuryChips .inj-chip, #medicalFlagChips .inj-chip, #focusChips .inj-chip').forEach(c => c.addEventListener('click', () => { c.classList.toggle('on'); syncAnketaChips(); }));
  hydrateChipGroup('injuryChips', state.profile.injuries);
  hydrateChipGroup('medicalFlagChips', state.profile.medicalFlags);
  hydrateChipGroup('focusChips', state.profile.focusZones);
  syncAnketaChips();
  let initialStep = 1;
  if(pbSimpleUi() && !String(state.profile?.name || '').trim()){
    try{ initialStep = Number(WLStorage.getItem('primeBodyAnketaStep')) || 1; }catch(e){}
  }
  showAnketaStep(initialStep);
}

function bindForms(){
  const form = $('profileForm');
  bindAnketaFinish(form, submitAnketaForm);

  $('chatForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const input = $('chatInput');
    const text = input.value.trim();
    if(!text) return;
    const box = $('chatBox');
    box.insertAdjacentHTML('beforeend', `<div class="bubble user">${escapeHtml(text)}</div>`);
    const low = text.toLowerCase();
    const answer = coachReply(low);
    window.setTimeout(() => {
      box.insertAdjacentHTML('beforeend', `<div class="bubble bot">${escapeHtml(answer)}</div>`);
      box.scrollTop = box.scrollHeight;
    }, 360);
    input.value = '';
    box.scrollTop = box.scrollHeight;
  });
}

// ============================================================
//  Рабочие версии разделов (отчёты, health, фарма, пептиды, навигатор)
//  Один общий оверлёр-лист #appSheet + рендереры. Всё на WLStorage.
// ============================================================
function todayKey(){ try{ return dayKey(0); }catch{ return 'today'; } }

let sheetReturnFocus = null;
let sheetKeyHandler = null;
let sheetBackgroundState = [];
function setSheetBackgroundMuted(muted){
  const app = $('app');
  if(!app) return;
  if(muted){
    sheetBackgroundState = [...app.children]
      .filter(node => node.id !== 'appSheet')
      .map(node => ({ node, ariaHidden:node.getAttribute('aria-hidden'), inert:!!node.inert }));
    sheetBackgroundState.forEach(({ node }) => {
      node.inert = true;
      node.setAttribute('aria-hidden', 'true');
    });
    return;
  }
  sheetBackgroundState.forEach(({ node, ariaHidden, inert }) => {
    node.inert = inert;
    if(ariaHidden === null) node.removeAttribute('aria-hidden');
    else node.setAttribute('aria-hidden', ariaHidden);
  });
  sheetBackgroundState = [];
}
function sheetFocusableElements(root){
  return [...root.querySelectorAll('button:not([disabled]):not([hidden]), [href]:not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])')]
    .filter(node => node.getClientRects().length);
}
function openSheet(html){
  const o = $('appSheet');
  if(!o) return;
  if(!o.hidden) closeSheet({ restoreFocus:false });
  sheetReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  o.innerHTML = `<div class="lib-sheet" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
  o.hidden = false;
  const sheet = o.querySelector('.lib-sheet');
  const title = sheet?.querySelector('h2');
  if(title){
    title.id = 'appSheetTitle';
    sheet?.setAttribute('aria-labelledby', title.id);
  } else sheet?.setAttribute('aria-label', 'Окно Форма');
  setSheetBackgroundMuted(true);
  pbUpdateTelegramBack(document.querySelector('.screen.active')?.id || 'today', true);
  o.querySelector('.lib-close')?.addEventListener('click', () => closeSheet());
  sheetKeyHandler = event => {
    if(event.key !== 'Tab' || !sheet) return;
    const focusable = sheetFocusableElements(sheet);
    if(!focusable.length){ event.preventDefault(); sheet.focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if(event.shiftKey && document.activeElement === first){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', sheetKeyHandler);
  requestAnimationFrame(() => (sheetFocusableElements(sheet)[0] || sheet)?.focus({ preventScroll:true }));
}
function closeSheet(options = {}){
  const o = $('appSheet');
  if(!o || o.hidden) return;
  if(stretchingPlaybackCleanup){ stretchingPlaybackCleanup(); stretchingPlaybackCleanup = null; }
  o.hidden = true;
  o.classList.remove('stretching-detail-overlay');
  o.innerHTML = '';
  if(sheetKeyHandler) document.removeEventListener('keydown', sheetKeyHandler);
  sheetKeyHandler = null;
  setSheetBackgroundMuted(false);
  const returnFocus = sheetReturnFocus;
  sheetReturnFocus = null;
  if(options.restoreFocus !== false && returnFocus?.isConnected) requestAnimationFrame(() => returnFocus.focus({ preventScroll:true }));
  pbUpdateTelegramBack(document.querySelector('.screen.active')?.id || 'today');
}

function pbCloseTopOverlay(){
  if(!$('appSheet')?.hidden){ closeSheet(); return true; }
  if(!$('workoutDetail')?.hidden){ closeWorkoutPlayerOverlay(); return true; }
  if(!$('menuDetail')?.hidden){ closeMenuDetail(); return true; }
  if(!$('libDetail')?.hidden){ closeLibDetail(); return true; }
  if($('nutrition')?.classList.contains('active') && !$('recipeCatalogPanel')?.hidden){
    if(recipeExperience) recipeExperience.back(); else pbRecipeBack();
    return true;
  }
  const picker = $('foodPicker');
  if(picker && !picker.hidden){ picker.hidden = true; picker.innerHTML = ''; return true; }
  return false;
}

function supportMessageTemplate(){
  const screen = document.querySelector('.screen.active')?.dataset?.title || document.querySelector('.screen.active')?.id || 'не указан';
  const device = /iPhone/i.test(navigator.userAgent) ? 'iPhone' : /Android/i.test(navigator.userAgent) ? 'Android' : 'Другое устройство';
  return `Здравствуйте! Нужна помощь с Форма.\n\nЭкран: ${screen}\nЧто делал: \nЧто произошло: \nУстройство: ${device}\nСкриншот: приложу к сообщению.`;
}

function curatorContextText(options){
  const opts = options || {};
  const profile = planFromProfile();
  const today = dailyResultForDate(dayKey(0));
  const screen = document.querySelector('.screen.active')?.dataset?.title || 'не указан';
  const lines = [
    'Контекст Форма для куратора',
    `Экран: ${screen}`,
    `Цель: ${profile.goal} · уровень: ${profile.level}`,
    `Формат: ${profile.place} · инвентарь: ${profile.inv}`,
    `Сегодня: питание ${today.intakeKcal}/${today.targetKcal} ккал · вода ${Number(state.water || 0).toFixed(1)} л · тренировка ${today.workoutCompleted ? 'выполнена' : 'не отмечена'}`
  ];
  if(opts.activity){
    lines.push(today.steps === null ? 'Apple Health: данных за сегодня пока нет' : `Apple Health: ${today.steps.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} шагов · ${today.activeEnergyKcal || 0} активных ккал`);
  }
  if(opts.health){
    const health = [profile.injuries && `ограничения: ${profile.injuries}`, profile.medicalFlags && `особенности здоровья: ${profile.medicalFlags}`, profile.limits && `лимиты: ${profile.limits}`].filter(Boolean);
    lines.push(health.length ? `По анкете: ${health.join('; ')}` : 'По анкете: дополнительных ограничений не указано');
  }
  if(opts.bodyCheck){
    const bodyCheck = latestBodyCheck();
    const composition = latestBodyComposition();
    const strategy = bodyCompositionStrategy(profile);
    lines.push(!bodyCheck && !composition
      ? 'BodyCheck: замеры и подтверждённые данные состава тела пока не добавлены.'
      : `BodyCheck: вес ${bodyCheck?.weight || composition?.weight || '—'} кг · талия ${bodyCheck?.waist || '—'} см.${composition ? ` Состав тела: ${bodyCompositionPercentText(composition)} · ${bodyCompositionSourceLabel(composition)} · ${bodyCompositionDateLabel(composition)}.` : ' Добавь 4 фото и замеры для ориентира или внеси результат биоимпеданса.'}${strategy?.applied ? ` Рекомендация: ${strategy.title}; ${strategy.short}` : ''}`);
  }
  const question = String(opts.question || '').trim();
  lines.push('', `Вопрос к куратору: ${question || 'Опиши вопрос при отправке.'}`);
  return lines.join('\n');
}
function openCuratorContext(){
  openSheet(`<div class="lib-sheet-head"><div><h2>Контекст для куратора</h2><p class="sheet-sub">По умолчанию — только план и сегодняшний факт. Личные данные добавляются лишь с твоего согласия.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="context-choice-list">
      <label class="context-choice"><input type="checkbox" id="curatorContextActivity"><span><b>Добавить Apple Health</b><small>Шаги и активные калории за сегодня.</small></span></label>
      <label class="context-choice"><input type="checkbox" id="curatorContextHealth"><span><b>Добавить ограничения из анкеты</b><small>Только для вопроса о тренировке или восстановлении.</small></span></label>
      <label class="context-choice"><input type="checkbox" id="curatorContextBodyCheck"><span><b>Добавить BodyCheck</b><small>Только последнюю оценку по замерам, без фото.</small></span></label>
    </div>
    <label class="curator-question"><span>Что хочешь разобрать</span><textarea id="curatorContextQuestion" maxlength="500" placeholder="Например: чем заменить упражнение, если болит плечо?"></textarea></label>
    <pre class="context-preview" id="curatorContextPreview"></pre>
    <div class="weekly-insight-actions"><button type="button" class="secondary" id="curatorContextCopy">Скопировать</button><button type="button" class="primary shine" id="curatorContextSend">Открыть Telegram</button></div>`);
  const options = () => ({ activity:!!$('curatorContextActivity')?.checked, health:!!$('curatorContextHealth')?.checked, bodyCheck:!!$('curatorContextBodyCheck')?.checked, question:String($('curatorContextQuestion')?.value || '').trim().slice(0, 500) });
  const refresh = () => { const preview = $('curatorContextPreview'); if(preview) preview.textContent = curatorContextText(options()); };
  $('curatorContextActivity')?.addEventListener('change', refresh);
  $('curatorContextHealth')?.addEventListener('change', refresh);
  $('curatorContextBodyCheck')?.addEventListener('change', refresh);
  $('curatorContextQuestion')?.addEventListener('input', refresh);
  $('curatorContextCopy')?.addEventListener('click', async () => {
    const selected = options();
    try{
      await navigator.clipboard.writeText(curatorContextText(selected));
      track('curator_context_shared', 'curator', { mode:'copy', include_activity:selected.activity, include_health:selected.health, include_bodycheck:selected.bodyCheck });
      toast('Контекст скопирован');
    }catch(e){ toast('Не удалось скопировать. Выдели текст вручную.'); }
  });
  $('curatorContextSend')?.addEventListener('click', async () => {
    const selected = options();
    try{ await navigator.clipboard.writeText(curatorContextText(selected)); }catch(e){}
    track('curator_context_shared', 'curator', { mode:'telegram', include_activity:selected.activity, include_health:selected.health, include_bodycheck:selected.bodyCheck });
    toast('Контекст скопирован. Вставь его в сообщение куратору.');
    openLink('support');
  });
  refresh();
}
function openSupport(){
  const message = supportMessageTemplate();
  openSheet(`<div class="lib-sheet-head"><div><h2>Служба заботы</h2><p class="sheet-sub">Скопируй шаблон, открой почту и приложи скриншот.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <pre class="support-template" id="supportTemplate">${escapeHtml(message)}</pre>
    <div class="support-actions"><button type="button" class="secondary" id="supportCopy">Скопировать шаблон</button><button type="button" class="primary shine" id="supportOpen">Открыть почту</button></div>`);
  const copy = async () => {
    try{ await navigator.clipboard.writeText(message); toast('Шаблон скопирован'); return true; }
    catch(e){ toast('Выдели и скопируй шаблон вручную'); return false; }
  };
  $('supportCopy')?.addEventListener('click', copy);
  $('supportOpen')?.addEventListener('click', async () => {
    await copy();
    track('support_open', 'support', { source:document.querySelector('.screen.active')?.id || 'unknown' });
    openLink('support');
  });
}

function waterAdjustmentToast(result){
  if(!result?.changed){
    if(result?.reason !== 'pending') toast('Значение воды уже на пределе');
    return;
  }
  const amount = `${result.delta > 0 ? '+' : '−'}${Math.abs(Math.round(result.delta * 1000))} мл`;
  if(!result.isToday){ toast(`${amount} · ${diaryDateLabel(result.date)}. Без начисления баллов.`); return; }
  toast(result.awarded ? 'Норма воды закрыта. +5 баллов' : `${amount} воды`);
}
function applyWaterControlDelta(delta, date){
  const result = adjustWater(date || selectedNutritionDate(), delta);
  waterAdjustmentToast(result);
  return result;
}
function openWaterControl(){
  const date = dayKey(0);
  const renderValue = () => {
    const value = nutritionRecordDraftForDate(date).water || 0;
    const node = $('waterControlValue');
    if(node) node.textContent = `${Number(value).toFixed(1)} л`;
  };
  openSheet(`<div class="lib-sheet-head"><div><h2>Вода</h2><p class="sheet-sub">Точное значение за сегодня</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="water-control-value" id="waterControlValue">0.0 л</div>
    <div class="water-control-grid" role="group" aria-label="Изменить количество воды">
      <button type="button" class="secondary" data-water-delta="-0.2">−200 мл</button><button type="button" class="secondary" data-water-delta="-0.1">−100 мл</button>
      <button type="button" class="secondary" data-water-delta="0.1">+100 мл</button><button type="button" class="primary" data-water-delta="0.2">+200 мл</button>
    </div>`);
  renderValue();
  $('appSheet')?.querySelectorAll('[data-water-delta]').forEach(button => button.addEventListener('click', () => {
    applyWaterControlDelta(Number(button.dataset.waterDelta), date);
    renderValue();
  }));
}

// ---------- Дневной отчёт ----------
function openDailyReport(){
  const today = todayKey();
  if(state.dailyReport.date !== today) state.dailyReport = { date: today, training:false, water:false, food:false, sleep:false, claimed:false, waterRewarded:false };
  const d = state.dailyReport;
  const row = (k,label,sub)=>`<button type="button" class="rep-check${d[k]?' on':''}" data-k="${k}"><span class="rep-box">${d[k]?'✓':''}</span><span class="rep-txt"><b>${label}</b><i>${sub}</i></span></button>`;
  openSheet(`<div class="lib-sheet-head"><h2>Дневной отчёт</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Отметь, что закрыл сегодня. За полный день — +15 баллов.</p>
    <div class="rep-list">
      ${row('training','Тренировка','выполнена по плану')}
      ${row('water','Вода','дневная норма')}
      ${row('food','Питание / КБЖУ','уложился в норму')}
      ${row('sleep','Сон','7+ часов')}
    </div>
    <button type="button" class="primary shine" id="dailySave">Сохранить отчёт</button>`);
  const o = $('appSheet');
  o.querySelectorAll('.rep-check').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k; state.dailyReport[k] = !state.dailyReport[k];
    b.classList.toggle('on', state.dailyReport[k]);
    b.querySelector('.rep-box').textContent = state.dailyReport[k] ? '✓' : '';
  }));
  o.querySelector('#dailySave')?.addEventListener('click', () => {
    const d2 = state.dailyReport, all = d2.training && d2.water && d2.food && d2.sleep;
    if(all && !d2.claimed){ state.access += 1; d2.claimed = true; }   // +15 баллов начислит задание «Дневной отчёт» (авто-зачёт)
    d2.date = todayKey(); save(); renderMetrics();
    pbUpsertDailyActivitySnapshot({
      workoutCompleted: !!d2.training || !!state.dayGuidePassed,
      workoutTitle: (d2.training || state.dayGuidePassed) ? currentWorkoutTitle() : '',
      reportFlags: Object.assign({}, d2)
    }).then(() => renderSelectedDayActivity());
    track('report_daily', 'reports', { complete: all });
    toast(all ? 'Дневной отчёт закрыт: +15 баллов' : 'Сохранено. Отметь все пункты для +15 баллов');
    closeSheet();
  });
}

function weeklyInsightData(){
  const norm = computeNorm(planFromProfile(), state.kcalCut || 0);
  const waterTarget = waterTargetLiters(planFromProfile());
  const dates = nutritionDiaryDateWindow();
  const days = dates.map(date => {
    const result = dailyResultForDate(date);
    const nutrition = nutritionRecordDraftForDate(date);
    return { ...result, water:+nutrition.water || 0 };
  });
  const foodDays = days.filter(day => day.intakeKcal > 0);
  const activeDays = days.filter(day => day.activeEnergyKcal !== null);
  const trackedDays = foodDays.length;
  const averageKcal = trackedDays ? Math.round(foodDays.reduce((sum, day) => sum + day.intakeKcal, 0) / trackedDays) : 0;
  const onTargetDays = foodDays.filter(day => day.intakeKcal >= norm.kcal * .85 && day.intakeKcal <= norm.kcal * 1.12).length;
  const waterDays = days.filter(day => day.water >= waterTarget).length;
  const workouts = days.filter(day => day.workoutCompleted).length;
  const steps = activeDays.reduce((sum, day) => sum + (day.steps || 0), 0);
  const activeEnergy = activeDays.reduce((sum, day) => sum + (day.activeEnergyKcal || 0), 0);
  let note = 'Начни с одного честно заполненного дня — дальше картина соберётся сама.';
  if(trackedDays >= 5 && onTargetDays >= 4) note = 'Питание держится близко к плану. Сохраняй ритм, а не гонись за идеальностью.';
  else if(workouts >= 3) note = 'Тренировочный ритм уже есть. Следующий рычаг — питание и вода в обычные дни.';
  else if(trackedDays >= 3) note = 'Данные уже живые: добавь ещё одну тренировку или два дня воды до нормы.';
  return { dates, days, norm, waterTarget, trackedDays, averageKcal, onTargetDays, waterDays, workouts, steps, activeEnergy, healthDays:activeDays.length, note };
}
function weeklyInsightGridHtml(data){
  const steps = data.healthDays ? data.steps.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') : '—';
  return `<div><span>Питание</span><b>${data.trackedDays}/7 дней</b></div>
    <div><span>Среднее</span><b>${data.averageKcal ? `${data.averageKcal} ккал` : '—'}</b></div>
    <div><span>Тренировки</span><b>${data.workouts}/7</b></div>
    <div><span>Вода ${data.waterTarget.toFixed(1)} л</span><b>${data.waterDays}/7</b></div>
    <div><span>Шаги</span><b>${steps}</b></div>
    <div><span>Активные ккал</span><b>${data.healthDays ? data.activeEnergy : '—'}</b></div>`;
}
function weeklyInsightShareText(data){
  const safe = data || weeklyInsightData();
  const activity = safe.healthDays ? ` · шаги ${safe.steps.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}` : '';
  return `Моя неделя в Форма: ${safe.workouts} тренировки, питание ${safe.trackedDays}/7 дней, вода ${safe.waterDays}/7${activity}. Держу свой ритм дальше.`;
}
function renderWeeklyInsight(){
  if(typeof renderPeriodReport === 'function') renderPeriodReport();
  const grid = $('weeklyInsightGrid');
  if(!grid) return;
  const data = weeklyInsightData();
  grid.innerHTML = weeklyInsightGridHtml(data);
  if($('weeklyInsightNote')) $('weeklyInsightNote').textContent = data.note;
  if($('weeklyInsightPill')) $('weeklyInsightPill').textContent = `${data.workouts} трен. · ${data.trackedDays}/7`;
  const share = $('weeklyInsightShare');
  if(share){
    const hasWeeklyFact = [data.trackedDays, data.workouts, data.waterDays, data.healthDays].some(Boolean);
    share.dataset.mode = hasWeeklyFact ? 'share' : 'start';
    share.textContent = hasWeeklyFact ? 'Поделиться' : 'Добавить день';
    share.classList.toggle('primary', hasWeeklyFact);
    share.classList.toggle('shine', hasWeeklyFact);
    share.classList.toggle('secondary', !hasWeeklyFact);
    if(!share.dataset.bound){
      share.dataset.bound = '1';
      share.addEventListener('click', () => {
        if(share.dataset.mode === 'start'){ jump('nutrition'); return; }
        shareWeeklyInsight();
      });
    }
  }
}
function shareWeeklyInsight(){
  const data = weeklyInsightData();
  telegramShareText(weeklyInsightShareText(data));
  track('weekly_insight_shared', 'reports', { workouts:data.workouts, food_days:data.trackedDays, water_days:data.waterDays, health_days:data.healthDays });
}
function openWeeklyInsight(){
  const data = weeklyInsightData();
  openSheet(`<div class="lib-sheet-head"><div><h2>Неделя в цифрах</h2><p class="sheet-sub">Факт за последние семь дней — без заднего начисления баллов.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="weekly-insight-grid">${weeklyInsightGridHtml(data)}</div>
    <p class="sheet-sub">${escapeHtml(data.note)}</p>
    <p class="sheet-note">Норма питания: ${data.norm.kcal} ккал. В пределах плана: ${data.onTargetDays}/${data.trackedDays || 0} заполненных дней.</p>
    <div class="weekly-insight-actions"><button type="button" class="secondary" id="weeklyInsightCopy">Скопировать</button><button type="button" class="primary shine" id="weeklyInsightSheetShare">Поделиться</button></div>`);
  $('weeklyInsightCopy')?.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(weeklyInsightShareText(data)); toast('Итог недели скопирован'); }
    catch(e){ toast('Не удалось скопировать. Выдели текст вручную.'); }
  });
  $('weeklyInsightSheetShare')?.addEventListener('click', shareWeeklyInsight);
}

// ---------- BodyCheck: замеры + приватные фото для сравнения ----------
function bodyCheckHistoryHtml(){
  const items = (Array.isArray(state.bodyChecks) ? state.bodyChecks : []).slice()
    .sort((a,b) => bodyCheckSortTime(b).localeCompare(bodyCheckSortTime(a))).slice(0, 4);
  if(!items.length) return '<p class="sheet-note">История появится после первого BodyCheck.</p>';
  return `<div class="bodycheck-history">${items.map(entry => {
    const count = bodyCheckPhotoCount(entry.photoPaths) || Number(entry.photoCount) || 0;
    return `<div><b>${escapeHtml(bodyCheckDateLabel(entry.date))}</b><span>${escapeHtml(bodyCheckPercentText(entry))} · вес ${escapeHtml(String(entry.weight || '—'))} кг</span><em>${escapeHtml(bodyCheckCompositionLabel(entry))}${count ? ` · ${count}/4 фото` : ''}</em></div>`;
  }).join('')}</div>`;
}
function bodyCheckPreviewHtml(calc, gender){
  if(calc?.ok){
    if(calc.compositionSource === 'manual_bia'){
      return `<div class="bodycheck-preview-value"><span>Результат биоимпеданса</span><b>${calc.bodyFatPct.toFixed(1)}%</b><em>жировая масса ${calc.fatMassKg.toFixed(1)} кг · безжировая масса ${calc.leanMassKg.toFixed(1)} кг</em></div><p>Сохраним показание, которое ты получил на биоимпедансных или умных весах. Это не расчёт по фото или окружностям.</p>`;
    }
    if(calc.compositionSource === 'photo_estimate'){
      return `<div class="bodycheck-preview-value estimate"><span>Ориентир по фото и замерам</span><b>${Math.round(calc.bodyFatLowPct)}–${Math.round(calc.bodyFatHighPct)}%</b><em>центр ${calc.bodyFatPct.toFixed(1)}% · погрешность около ±${calc.uncertainty.toFixed(1)} п.п.</em></div><p>Это не биоимпеданс и не диагноз. Четыре фото подтверждают единый ракурс, а диапазон строится по росту, весу, талии, возрасту и полу.</p>`;
    }
    return '<div class="bodycheck-preview-value"><span>Запись прогресса</span><b>Без расчёта % жира</b><em>Сохраним вес, замеры и фото для честного сравнения по неделям.</em></div><p>Включи ориентир по фото и замерам или внеси фактический результат биоимпеданса.</p>';
  }
  if(calc?.invalidDate) return '<div class="bodycheck-preview-value warn"><span>Проверь дату</span><b>Замер не сохранён</b><em>Укажи реальную дату биоимпеданса: она не может быть в будущем.</em></div>';
  if(calc?.invalid) return '<div class="bodycheck-preview-value warn"><span>Проверь результат</span><b>Не получилось сохранить</b><em>Процент жира должен быть от 1 до 75%, а безжировая масса не может быть больше веса.</em></div>';
  if(calc?.invalidMode) return '<div class="bodycheck-preview-value warn"><span>Выбери один источник</span><b>Не смешиваем методы</b><em>Либо ориентир по фото и замерам, либо готовый результат биоимпеданса.</em></div>';
  const missing = calc?.missing?.length ? `Добавь: ${calc.missing.join(', ')}.` : 'Добавь обязательные замеры.';
  return `<div class="bodycheck-preview-value"><span>${calc?.estimate ? 'Ориентир по фото и замерам' : 'Запись прогресса'}</span><b>${calc?.estimate ? 'Нужны данные для диапазона' : 'Заполни замеры'}</b><em>${escapeHtml(missing)}</em></div><p>${calc?.photoRequired ? 'Для ориентировочной оценки добавь четыре фото после согласия на приватное хранение.' : 'Фото и замеры помогают отслеживать динамику без подмены фактического биоимпеданса.'}</p>`;
}
async function openBodyCheckPhotos(entry){
  const paths = entry?.photoPaths && typeof entry.photoPaths === 'object' ? entry.photoPaths : {};
  const selected = BODY_CHECK_PHOTO_POSES.filter(pose => paths[pose]);
  if(!selected.length || !sb || !pbUser){ toast('Приватные фото доступны после синхронизации BodyCheck.'); return; }
  openSheet('<div class="lib-sheet-head"><div><h2>Фото BodyCheck</h2><p class="sheet-sub">Созданы для личного сравнения. Ссылка на каждое фото действует ограниченное время.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div><p class="sheet-note">Загружаем защищённые фото…</p>');
  const signed = await Promise.all(selected.map(async pose => {
    try{
      const { data, error } = await sb.storage.from('body-checks').createSignedUrl(paths[pose], 600);
      return error ? null : { pose, url:data?.signedUrl || '' };
    }catch(e){ return null; }
  }));
  const usable = signed.filter(item => item && item.url);
  const o = $('appSheet');
  if(!o) return;
  const grid = usable.length ? `<div class="bodycheck-photo-history-grid">${usable.map(item => `<figure><img src="${escapeHtml(item.url)}" alt="BodyCheck: ${escapeHtml({ front:'спереди', back:'со спины', left:'левый бок', right:'правый бок' }[item.pose])}" referrerpolicy="no-referrer" /><figcaption>${escapeHtml({ front:'Спереди', back:'Со спины', left:'Левый бок', right:'Правый бок' }[item.pose])}</figcaption></figure>`).join('')}</div>` : '<p class="sheet-note">Не удалось открыть фото. Проверь сеть и повтори.</p>';
  openSheet(`<div class="lib-sheet-head"><div><h2>Фото BodyCheck</h2><p class="sheet-sub">${escapeHtml(bodyCheckDateLabel(entry.date))} · доступ только у твоего аккаунта.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>${grid}`);
}
function openWeeklyReport(focusPhoto){
  const profile = planFromProfile();
  const gender = bodyCheckGender(profile);
  const last = latestBodyCheck() || latestMeasure() || {};
  const isFemale = gender === 'female';
  const value = key => last[key] != null && last[key] !== '' ? String(last[key]) : '';
  const mi = (key, label, fallback = '') => `<label class="meas-i"><span>${label}</span><input type="number" min="0" step="0.1" inputmode="decimal" id="bc_${key}" value="${escapeHtml(value(key) || String(fallback || ''))}" placeholder="—" /></label>`;
  const dateInput = (key, label, fallback = todayKey()) => `<label class="meas-i"><span>${label}</span><input type="date" id="bc_${key}" value="${escapeHtml(String(fallback || ''))}" /></label>`;
  const slot = (key, label) => `<label class="photo-slot bodycheck-photo-slot" id="bcps_${key}"><input type="file" accept="image/*" data-pose="${key}" hidden disabled /><span class="photo-ic">＋</span><b>${label}</b><small>необязательно</small></label>`;
  const lastBodyCheck = latestBodyCheck();
  const lastHasBia = bodyCheckCompositionSource(lastBodyCheck) === 'manual_bia';
  const lastHasPhotoEstimate = bodyCheckCompositionSource(lastBodyCheck) === 'photo_estimate';
  const lastBiaDate = String(lastBodyCheck?.compositionMeasuredAt || '').slice(0, 10);
  const biaDate = /^\d{4}-\d{2}-\d{2}$/.test(lastBiaDate) ? lastBiaDate : todayKey();
  openSheet(`<div class="lib-sheet-head"><div><h2>BodyCheck и состав тела</h2><p class="sheet-sub">Вес и замеры для динамики, четыре фото для честного сравнения. +40 баллов раз в день.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="bodycheck-method"><span>Оценка, не медицинский замер</span><b>Четыре фото и замеры дают ориентировочный диапазон процента жира</b><small>Цифру считаем по росту, весу, талии, возрасту и полу; фото подтверждают протокол и динамику. Настоящий биоимпеданс и умные весы всегда точнее.</small></div>
    <h3>Замеры</h3>
    <div class="meas-grid bodycheck-meas-grid">
      ${mi('weight','Вес, кг', profile.weight)}${mi('height','Рост, см', profile.height)}${mi('neck','Шея, см')}${mi('waist', isFemale ? 'Талия, см' : 'Талия у пупка, см')}${isFemale ? mi('hips','Бёдра, см') : ''}${mi('chest','Грудь, см')}${mi('arm','Бицепс, см')}
    </div>
    <p class="bodycheck-measure-tip">Сантиметр лежит ровно, без втягивания живота. Замеряйся в одном и том же состоянии: утром, до еды, на спокойном выдохе.</p>
    <label class="context-choice bodycheck-estimate-toggle"><input type="checkbox" id="bodyCheckEstimateToggle" ${lastHasPhotoEstimate ? 'checked' : ''}><span><b>Получить ориентир по фото и замерам</b><small>Нужны четыре фото в полный рост. Покажем диапазон с погрешностью, а не биоимпеданс.</small></span></label>
    <label class="context-choice bodycheck-bia-toggle"><input type="checkbox" id="bodyCheckBiaToggle" ${lastHasBia ? 'checked' : ''}><span><b>Внести результат биоимпеданса</b><small>Перепиши процент жира с биоимпедансных или умных весов. Этот источник приоритетнее оценки.</small></span></label>
    <div class="meas-grid bodycheck-meas-grid" id="bodyCheckBiaFields" hidden>
      ${dateInput('bodyCompositionDate','Дата замера', biaDate)}${mi('bodyFatPct','Жир, %')}${mi('leanMassKg','Безжировая масса, кг')}
    </div>
    <div class="bodycheck-preview" id="bodyCheckPreview" aria-live="polite"></div>
    <h3>Фото для личного сравнения</h3>
    <label class="context-choice bodycheck-photo-consent"><input type="checkbox" id="bodyCheckPhotoConsent"><span><b>Сохранять четыре фото приватно</b><small>Фото доступны только в твоём аккаунте. Они подтверждают единый протокол оценки и удаляются по твоей команде.</small></span></label>
    <div class="photo-grid bodycheck-photo-grid" id="bodyCheckPhotoGrid">${slot('front','Спереди')}${slot('back','Со спины')}${slot('left','Левый бок')}${slot('right','Правый бок')}</div>
    <p class="sheet-note">Одинаковый свет, расстояние, одежда и ракурс делают историю полезнее. Без согласия фото не загружаются.</p>
    <div class="bodycheck-sheet-actions"><button type="button" class="primary shine" id="weeklySave" disabled>Сохранить BodyCheck</button>${lastBodyCheck ? '<button type="button" class="secondary" id="bodyCheckDeleteLast">Удалить последний</button>' : ''}</div>
    <h3>Последние проверки</h3>${bodyCheckHistoryHtml()}`);
  const o = $('appSheet');
  const photoFiles = {};
  const readValues = () => {
    const number = key => bodyCheckNumber(o.querySelector('#bc_' + key)?.value);
    const useBia = !!o.querySelector('#bodyCheckBiaToggle')?.checked;
    const usePhotoEstimate = !!o.querySelector('#bodyCheckEstimateToggle')?.checked;
    return {
      gender, weight:number('weight'), height:number('height'), neck:number('neck'), waist:number('waist'), hips:number('hips'), chest:number('chest'), arm:number('arm'),
      bodyFatPct:useBia ? number('bodyFatPct') : null,
      leanMassKg:useBia ? number('leanMassKg') : null,
      compositionMeasuredAt:useBia ? String(o.querySelector('#bc_bodyCompositionDate')?.value || '') : '',
      age:bodyCheckNumber(profile.age),
      photoCount:Object.values(photoFiles).filter(Boolean).length,
      useBia,
      usePhotoEstimate
    };
  };
  const preview = o.querySelector('#bodyCheckPreview');
  const saveButton = o.querySelector('#weeklySave');
  const refresh = () => {
    const calc = bodyCheckCalculation(readValues());
    if(preview) preview.innerHTML = bodyCheckPreviewHtml(calc, gender);
    if(saveButton) saveButton.disabled = !calc.ok;
    return calc;
  };
  const photoConsent = o.querySelector('#bodyCheckPhotoConsent');
  const biaToggle = o.querySelector('#bodyCheckBiaToggle');
  const photoEstimateToggle = o.querySelector('#bodyCheckEstimateToggle');
  const syncBiaFields = () => {
    const enabled = !!biaToggle?.checked;
    const fields = o.querySelector('#bodyCheckBiaFields');
    if(fields) fields.hidden = !enabled;
  };
  const syncPhotoPermission = () => {
    const allowed = !!photoConsent?.checked;
    o.querySelector('#bodyCheckPhotoGrid')?.classList.toggle('is-locked', !allowed);
    o.querySelectorAll('.bodycheck-photo-slot input').forEach(input => { input.disabled = !allowed; });
  };
  o.querySelectorAll('.meas-i input').forEach(input => {
    input.addEventListener('input', refresh);
    input.addEventListener('change', refresh);
  });
  photoConsent?.addEventListener('change', syncPhotoPermission);
  photoConsent?.addEventListener('change', refresh);
  biaToggle?.addEventListener('change', () => {
    if(biaToggle.checked && photoEstimateToggle) photoEstimateToggle.checked = false;
    syncBiaFields(); refresh();
  });
  photoEstimateToggle?.addEventListener('change', () => {
    if(photoEstimateToggle.checked && biaToggle) biaToggle.checked = false;
    syncBiaFields(); refresh();
  });
  o.querySelectorAll('.bodycheck-photo-slot input').forEach(input => input.addEventListener('change', () => {
    const pose = input.dataset.pose;
    const slotEl = input.closest('.bodycheck-photo-slot');
    if(pose && input.files?.[0] && slotEl){
      photoFiles[pose] = input.files[0];
      slotEl.style.backgroundImage = `url(${URL.createObjectURL(input.files[0])})`;
      slotEl.classList.add('filled');
      slotEl.querySelector('b').textContent = 'Выбрано';
    }
    refresh();
  }));
  syncPhotoPermission();
  syncBiaFields();
  refresh();
  if(focusPhoto) requestAnimationFrame(() => o.querySelector('#bodyCheckPhotoGrid')?.scrollIntoView({ block:'center', behavior:'smooth' }));
  o.querySelector('#bodyCheckDeleteLast')?.addEventListener('click', async () => {
    if(!lastBodyCheck || !window.confirm('Удалить последний BodyCheck и связанные с ним фото?')) return;
    const button = o.querySelector('#bodyCheckDeleteLast');
    button.disabled = true; button.textContent = 'Удаляем…';
    if(await pbDeleteBodyCheck(lastBodyCheck)){ closeSheet(); toast('Последний BodyCheck удалён'); }
    else { button.disabled = false; button.textContent = 'Удалить последний'; }
  });
  saveButton?.addEventListener('click', async () => {
    const values = readValues();
    const calc = bodyCheckCalculation(values);
    if(!calc.ok){ refresh(); return; }
    saveButton.disabled = true; saveButton.textContent = 'Сохраняем…';
    const date = todayKey();
    const existing = (state.bodyChecks || []).find(entry => entry?.date === date) || null;
    const id = existing?.id || pbUuid();
    const selectedPhotoCount = Object.values(photoFiles).filter(Boolean).length;
    const hasManualBia = calc.compositionSource === 'manual_bia';
    const hasPhotoEstimate = calc.compositionSource === 'photo_estimate';
    const entry = {
      id, clientId:existing?.clientId || id, date, measuredAt:existing?.measuredAt || new Date().toISOString(),
      gender, formulaVersion:hasManualBia ? BODY_CHECK_MANUAL_BIA_VERSION : (hasPhotoEstimate ? BODY_CHECK_PHOTO_ESTIMATE_VERSION : BODY_CHECK_PROGRESS_VERSION),
      height:values.height, weight:values.weight, neck:values.neck, waist:values.waist, hips:values.hips,
      chest:values.chest, arm:values.arm, bodyFatPct:calc.bodyFatPct, bodyFatLowPct:calc.bodyFatLowPct ?? null, bodyFatHighPct:calc.bodyFatHighPct ?? null, fatMassKg:calc.fatMassKg, leanMassKg:calc.leanMassKg,
      compositionSource:calc.compositionSource,
      compositionLabel:hasManualBia ? 'Результат биоимпеданса (вручную)' : (hasPhotoEstimate ? 'Оценка по фото и замерам' : 'Замеры и фото прогресса'),
      compositionConfidence:hasManualBia ? 'reported-measurement' : (hasPhotoEstimate ? 'range-photo-protocol' : ''),
      compositionMeasuredAt:(hasManualBia || hasPhotoEstimate) ? calc.compositionMeasuredAt : null,
      photoPaths:Object.assign({}, existing?.photoPaths || {}), photoCount:bodyCheckPhotoCount(existing?.photoPaths), pending:false
    };
    if(selectedPhotoCount && !photoConsent?.checked){ toast('Чтобы загрузить фото, включи приватное хранение. Замеры можно сохранить без фото.'); saveButton.disabled = false; saveButton.textContent = 'Сохранить BodyCheck'; return; }
    pbReplaceBodyCheck(entry);
    const measure = { date, weight:entry.weight, height:entry.height, neck:entry.neck, chest:entry.chest, waist:entry.waist, hips:entry.hips, arm:entry.arm };
    const measureIndex = state.measures.findIndex(item => item?.date === date);
    if(measureIndex >= 0) state.measures[measureIndex] = Object.assign({}, state.measures[measureIndex], measure);
    else state.measures.push(measure);
    state.profile.weight = entry.weight;
    state.profile.height = entry.height;
    const isNew = !existing;
    if(isNew){
      state.weeklyReports += 1; state.score += 40; state.rank = Math.max(1, state.rank - 12); state.access += 2;
      const weeklyTask = state.tasks.find(task => task.text.includes('Суббота'));
      if(weeklyTask) weeklyTask.done = true;
    }
    save(); renderTasks(); renderPlan(); renderMetrics();
    const remote = await pbSaveBodyCheckRemote(entry);
    let finalEntry = remote.entry || entry;
    if(!remote.ok){ finalEntry = Object.assign({}, entry, { pending:true }); pbReplaceBodyCheck(finalEntry); save(); }
    let upload = { uploaded:0, failed:0, entry:finalEntry };
    if(selectedPhotoCount && remote.ok){ upload = await pbUploadBodyCheckPhotos(finalEntry, photoFiles); finalEntry = upload.entry || finalEntry; pbReplaceBodyCheck(finalEntry); save(); }
    renderMetrics();
    track('bodycheck_saved', 'reports', { composition_source:entry.compositionSource, photos_selected:selectedPhotoCount, photos_uploaded:upload.uploaded, remote_saved:!!remote.ok, new_check:isNew });
    closeSheet();
    if(!remote.ok) toast('Замеры сохранены на устройстве и встанут в очередь синхронизации. Фото пока не отправляли.');
    else if(upload.failed) toast(`BodyCheck сохранён. Фото: ${upload.uploaded}/${selectedPhotoCount}; остальные попробуй добавить ещё раз.`);
    else toast(isNew ? `BodyCheck сохранён: +40 баллов, место #${state.rank}` : 'BodyCheck за сегодня обновлён');
  });
}

// ---------- Видео техники ----------
function openVideoReport(){
  openSheet(`<div class="lib-sheet-head"><h2>Видео техники</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">10–20 секунд, один ракурс, упражнение целиком. Куратор разберёт технику.</p>
    <label class="photo-slot vid" id="ps_vid"><input type="file" accept="video/*" hidden /><span class="photo-ic">▶</span><b>Прикрепить видео</b></label>
    <p class="sheet-note">Видео остаётся на устройстве. Отправка куратору — после подключения бэкенда.</p>
    <button type="button" class="primary shine" id="vidSave">Готово</button>`);
  const o = $('appSheet');
  const inp = o.querySelector('#ps_vid input');
  inp?.addEventListener('change', () => { if(inp.files && inp.files[0]){ o.querySelector('#ps_vid b').textContent = '✓ ' + inp.files[0].name.slice(0,22); o.querySelector('#ps_vid').classList.add('filled'); } });
  o.querySelector('#vidSave')?.addEventListener('click', () => { toast('Видео сохранено для разбора'); closeSheet(); });
}

// ---------- Анализы: ввод показателей + флаги по референсам ----------
const LAB_REF = {
  glucose:  { label:'Глюкоза',            unit:'ммоль/л', min:3.9, max:5.5 },
  chol:     { label:'Холестерин общий',   unit:'ммоль/л', min:3.0, max:5.2 },
  ldl:      { label:'ЛПНП («плохой»)',    unit:'ммоль/л', min:0,   max:3.0 },
  vitd:     { label:'Витамин D (25-OH)',  unit:'нг/мл',   min:30,  max:100 },
  ferritin: { label:'Ферритин',           unit:'нг/мл',   min:30,  max:300 },
  testo:    { label:'Тестостерон общий',  unit:'нмоль/л', min:8.6, max:29 }
};
function labFlag(k,v){ const r = LAB_REF[k]; if(v==null||isNaN(v)) return ''; if(v<r.min) return 'low'; if(v>r.max) return 'high'; return 'ok'; }
function openLabs(){
  const rows = Object.entries(LAB_REF).map(([k,r]) => {
    const v = state.labs[k];
    const f = labFlag(k, v);
    const tag = f==='ok' ? '<span class="lab-tag ok">в норме</span>' : f==='low' ? '<span class="lab-tag low">ниже нормы</span>' : f==='high' ? '<span class="lab-tag high">выше нормы</span>' : '';
    return `<label class="lab-i"><span class="lab-name">${r.label}<i>норма ${r.min}–${r.max} ${r.unit}</i></span><input type="number" inputmode="decimal" id="lab_${k}" value="${v!=null?v:''}" placeholder="—" /><span class="lab-flag" data-k="${k}">${tag}</span></label>`;
  }).join('');
  openSheet(`<div class="lib-sheet-head"><h2>Анализы — разбор</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Введи показатели — подсветим, что вне нормы. Это не диагноз: при красных флагах — к врачу.</p>
    <label class="photo-slot wide-slot" id="ps_lab"><input type="file" accept="image/*,application/pdf" hidden /><span class="photo-ic">＋</span><b>Прикрепить бланк (PDF/фото)</b></label>
    <div class="lab-list">${rows}</div>
    <button type="button" class="primary shine" id="labSave">Сохранить и проверить</button>`);
  const o = $('appSheet');
  const finp = o.querySelector('#ps_lab input');
  finp?.addEventListener('change', () => { if(finp.files && finp.files[0]){ o.querySelector('#ps_lab b').textContent = '✓ ' + finp.files[0].name.slice(0,24); o.querySelector('#ps_lab').classList.add('filled'); } });
  o.querySelector('#labSave')?.addEventListener('click', () => {
    let flags = 0;
    Object.keys(LAB_REF).forEach(k => {
      const raw = ($('lab_'+k)?.value || '').replace(',','.');
      const v = raw === '' ? null : parseFloat(raw);
      state.labs[k] = (v==null||isNaN(v)) ? undefined : v;
      const f = labFlag(k, state.labs[k]);
      if(f==='low'||f==='high') flags++;
      const fl = o.querySelector(`.lab-flag[data-k="${k}"]`);
      if(fl) fl.innerHTML = f==='ok' ? '<span class="lab-tag ok">в норме</span>' : f==='low' ? '<span class="lab-tag low">ниже нормы</span>' : f==='high' ? '<span class="lab-tag high">выше нормы</span>' : '';
    });
    save();
    toast(flags ? `Сохранено. Вне нормы: ${flags} — обсуди с врачом` : 'Сохранено. Показатели в норме.');
  });
}

// ---------- Фарма-чеклист (образовательный, без схем) ----------
const PHARMA_STEPS = [
  ['q','Заполнил опросник здоровья и историю болезней'],
  ['labs','Сдал базовые анализы: кровь, гормоны, печень, липиды'],
  ['bp','Измерил давление и пульс в покое'],
  ['flags','Разобрал противопоказания и красные флаги'],
  ['doc','Записался к врачу/эндокринологу для разбора'],
  ['check','Завёл график контрольных чекпоинтов (каждые 2–4 недели)']
];
function openPharma(){
  const rows = PHARMA_STEPS.map(([k,t]) => `<button type="button" class="rep-check${state.pharmaCheck[k]?' on':''}" data-k="${k}"><span class="rep-box">${state.pharmaCheck[k]?'✓':''}</span><span class="rep-txt"><b>${t}</b></span></button>`).join('');
  const done = PHARMA_STEPS.filter(([k]) => state.pharmaCheck[k]).length;
  openSheet(`<div class="lib-sheet-head"><h2>Фарма-чеклист</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Образовательный маршрут безопасности. Без назначений, доз и схем — только что проверить и с кем обсудить.</p>
    <div class="prog-line"><span id="pharmaProg" style="width:${Math.round(done/PHARMA_STEPS.length*100)}%"></span></div>
    <div class="rep-list">${rows}</div>
    <p class="sheet-note">18+. Приложение не выдаёт схемы и дозировки — при выходе за БАДы и бытовое здоровье маршрут ведёт к врачу.</p>`);
  const o = $('appSheet');
  o.querySelectorAll('.rep-check').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k; state.pharmaCheck[k] = !state.pharmaCheck[k];
    b.classList.toggle('on', state.pharmaCheck[k]); b.querySelector('.rep-box').textContent = state.pharmaCheck[k] ? '✓' : '';
    const d = PHARMA_STEPS.filter(([kk]) => state.pharmaCheck[kk]).length;
    const pr = o.querySelector('#pharmaProg'); if(pr) pr.style.width = Math.round(d/PHARMA_STEPS.length*100) + '%';
    save();
  }));
}

// ---------- Пептидный дневник наблюдений ----------
function openPeptide(){
  const list = state.peptideLog.slice().reverse().map(e => `<div class="diary-row"><div class="diary-d">${e.date}</div><div class="diary-m"><span>Сон ${e.sleep}/5</span><span>Восстановление ${e.recovery}/5</span>${e.pressure?`<span>Давление ${escapeHtml(e.pressure)}</span>`:''}</div>${e.note?`<p>${escapeHtml(e.note)}</p>`:''}</div>`).join('') || '<p class="sheet-note">Записей пока нет — добавь первую.</p>';
  const sel = (id,label) => `<label class="diary-sel"><span>${label}</span><select id="${id}">${[5,4,3,2,1].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label>`;
  openSheet(`<div class="lib-sheet-head"><h2>Дневник наблюдений</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Отслеживай реакцию: сон, восстановление, давление, самочувствие. Без обещаний — это данные для врача.</p>
    <div class="diary-form">
      ${sel('pSleep','Сон')}${sel('pRec','Восстановление')}
      <label class="diary-sel wide"><span>Давление</span><input id="pBp" placeholder="120/80" /></label>
      <label class="diary-sel wide"><span>Заметка (суставы, отёки, ЖКТ, настроение)</span><input id="pNote" placeholder="как самочувствие" /></label>
    </div>
    <button type="button" class="primary shine" id="pepAdd">Добавить запись</button>
    <div class="diary-list">${list}</div>`);
  $('appSheet').querySelector('#pepAdd')?.addEventListener('click', () => {
    state.peptideLog.push({ date: todayKey(), sleep:$('pSleep').value, recovery:$('pRec').value, pressure:($('pBp').value||'').trim(), note:($('pNote').value||'').trim() });
    save(); openPeptide(); toast('Запись добавлена в дневник');
  });
}

// ---------- Навигатор: пошаговый гайд с переходами ----------
const GUIDE_STEPS = [
  ['Заполни стартовую анкету','пол, цель, уровень, место тренировок, ограничения','onboarding'],
  ['Открой день','тренировка, КБЖУ, вода и мобилити — всё на сегодня','training'],
  ['Настрой питание','норма КБЖУ из анкеты, меню на неделю, дневник еды','nutrition'],
  ['Сдавай отчёты','дневной чек + субботние фото и замеры по шаблону','reports'],
  ['Поднимайся в рейтинге','баллы, статусы и рост в топ-100','rewards']
];
function openGuideTour(){
  const steps = GUIDE_STEPS.map(([t,d,go],i) => `<div class="tour-step"><i>${i+1}</i><div><b>${t}</b><span>${d}</span></div><button type="button" class="tour-go" data-go="${go}">Перейти →</button></div>`).join('');
  openSheet(`<div class="lib-sheet-head"><h2>Как устроен клуб</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">5 шагов от анкеты до рейтинга. Жми «Перейти» — открою нужный экран.</p>
    <div class="tour-list">${steps}</div>`);
  $('appSheet').querySelectorAll('.tour-go').forEach(b => b.addEventListener('click', () => { closeSheet(); jump(b.dataset.go); }));
}

// ---------- Напоминания ----------
function renderReminders(){
  const btn = $('remToggle'); if(!btn) return;
  const on = Object.values(state.reminders).some(Boolean);
  btn.textContent = on ? '✓ Напоминания включены' : 'Включить напоминания';
  btn.classList.toggle('on', on);
}
function toggleReminders(){
  const on = Object.values(state.reminders).some(Boolean);
  const next = !on;
  state.reminders = { water:next, training:next, evening:next, saturday:next };
  save(); renderReminders();
  if(next && 'Notification' in window && Notification.permission === 'default'){ try{ Notification.requestPermission(); }catch{} }
  toast(next ? 'Напоминания включены: вода, тренировка, вечерний отчёт, суббота' : 'Напоминания выключены');
}

// ---------- Рефералка ----------
function refCode(){
  const p = state.profile || {};
  const base = (p.name || 'ANTON').toUpperCase().replace(/[^A-ZА-Я0-9]/g,'').slice(0,8) || 'GUEST';
  return `PRIME-${base}-742`;
}
function refLink(){ return `https://t.me/?ref=${encodeURIComponent(refCode())}`; }
function renderRef(){
  const c = $('refCodeBox'); if(c) c.textContent = refCode();
  const n = $('refCount'); if(n) n.textContent = state.refCount;
}

// ---------- Нейрокуратор: умный сценарный ответ + персонализация ----------
function coachReply(low){
  const p = state.profile || {};
  const name = (p.name || '').split(' ')[0];
  const goal = (p.goal || '').toLowerCase();
  const hi = name ? `${name}, ` : '';
  if(/привет|здоров|хай|ку\b|добр/.test(low)) return `${hi}на связи. Цель — ${p.goal || 'форма'}, норма ~${state.kcal} ккал. Что разберём: тренировка, питание, отчёт или рейтинг?`;
  if(low.includes('telegram') || low.includes('тг')) return 'Telegram-клуб — дополнение: там посты, эфиры и отчёты. Твой план, трекеры и прогресс остаются в приложении.';
  if(low.includes('прогноз') || low.includes('фото') || low.includes('цель')) return 'В разделе «Прогноз» — сценарий формы под твою цель и сроки: что реально изменится за 90/180/365 дней при дисциплине.';
  if(low.includes('отч') || low.includes('вес') || low.includes('замер')) return 'Отчёты делим на два слоя: каждый день — тренировка/вода/питание, а вес и фото — только суббота утром. Фото: фронт, спина, бок Л, бок П, одинаковый свет и тёмная одежда.';
  if(low.includes('рейтинг') || low.includes('топ') || low.includes('место')) return `Сейчас ты на месте #${state.rank}. Чтобы подняться в топ-100 — закрой тренировку, отчёт, воду и недельную цель. Баллы ведут к уровню, статусу и месту в рейтинге.`;
  if(low.includes('игр') || low.includes('xp') || low.includes('хп') || low.includes('лига') || low.includes('балл') || low.includes('приз')) return 'Просто: цели дня → баллы прогресса → уровень и статус → место в рейтинге. Призы за топ анонсируем отдельно.';
  if(low.includes('калор') || low.includes('кбжу') || low.includes('пита') || low.includes('еда') || low.includes('ем')) return `Твоя норма ~${state.kcal} ккал под цель «${p.goal || 'поддержание'}». Открой «Питание»: меню на неделю и дневник посчитают белок/жир/углеводы за тебя.`;
  if(low.includes('трен') || low.includes('зал') || low.includes('качал')) return 'Открывай «Тренировки» → «Начать»: гид ведёт упражнение за упражнением с демонстрацией и кнопкой «Сделан подход». Нет инвентаря — генератор соберёт под дом.';
  if(low.includes('сон') || low.includes('спать') || low.includes('устал') || low.includes('восстан')) return 'Сон — половина результата. 7–8 часов, без экрана за час до сна. Разбитость — разгрузочный день, вода, белок и лёгкое кардио. Симптомы держатся — загляни в раздел «Восстановление».';
  if(low.includes('лень') || low.includes('мотив') || low.includes('слив') || low.includes('не хочу') || low.includes('бросить')) return `${hi}мотивация не приходит — приходит режим. Один маленький шаг сегодня: закрой воду и дневной отчёт. Серия важнее идеального дня.`;
  if(low.includes('вода') || low.includes('пить')) return 'Норма воды держит аппетит и восстановление. Добавляй по 200 мл на главном экране — кольцо догонит цель к вечеру.';
  if(low.includes('фарма') || low.includes('стероид') || low.includes('курс')) return 'Фарма в приложении — только образовательный маршрут: риски, анализы, красные флаги и направление к врачу. Схемы и дозировки не выдаём.';
  if(low.includes('пептид')) return 'Пептиды — отдельный дневник наблюдений: сон, recovery, суставы, отёки, давление, ЖКТ и вопросы к специалисту. Без обещаний и «курсов из чата».';
  if(low.includes('анализ')) return 'В разделе «Восстановление» введи показатели — подсвечу, что вне нормы простым языком. Диагнозы не ставлю; при красных флагах — к врачу.';
  if(low.includes('плеч') || low.includes('болит') || low.includes('травм') || low.includes('колен')) return 'Болит — не геройствуем: убираем жимы/осевую нагрузку, оставляем мобильность и лёгкую тягу. Острая боль — к врачу.';
  if(low.includes('новичок') || low.includes('старт') || low.includes('начать') || low.includes('с чего')) return `${hi}маршрут: 1) стартовая анкета, 2) день: тренировка/питание/вода, 3) отчёт, 4) рейтинг. Открой «Навигатор», проведу по шагам.`;
  return `${hi}принял. Адаптирую день: меньше трения, один главный шаг. Что важнее сейчас — тренировка, питание, отчёт или восстановление?`;
}
const COACH_CHIPS = ['С чего начать?','Питание','Тренировка','Болит плечо','Мотивация','Рейтинг'];
function initCoach(){
  const box = $('chatBox');
  if(box && !box.querySelector('.bubble.user')){
    const p = state.profile || {};
    const name = escapeHtml((p.name || '').split(' ')[0]);
    const goal = escapeHtml(p.goal || 'форма');
    box.innerHTML = `<div class="bubble bot">${name ? name + ', привет! ' : 'Привет! '}Я куратор. Цель: ${goal}, норма ~${state.kcal} ккал. Спроси про тренировку, питание, отчёт, анализы или нажми подсказку ниже.</div>`;
  }
  const chips = $('chatChips');
  if(chips && !chips.children.length){
    chips.innerHTML = COACH_CHIPS.map(c => `<button type="button" class="chat-chip">${c}</button>`).join('');
    chips.querySelectorAll('.chat-chip').forEach(b => b.addEventListener('click', () => {
      const input = $('chatInput'); if(!input) return;
      input.value = b.textContent;
      $('chatForm')?.requestSubmit ? $('chatForm').requestSubmit() : $('chatForm')?.dispatchEvent(new Event('submit', { cancelable:true }));
    }));
  }
}

// Трекер-плитки в Кабинете → реальные значения из measures/dailyReport
function renderTrackers(){
  const m = state.measures;
  const last = m[m.length - 1] || {};
  const wv = $('trkWeightVal');
  if(wv) wv.textContent = (last.weight || state.profile.weight) ? `${last.weight || state.profile.weight} кг` : '— кг';
  const wd = $('trkWeightDelta');
  if(wd){
    const firstW = (m.find(e => e.weight) || {}).weight;
    if(m.length >= 2 && firstW && last.weight){ const d = +(last.weight - firstW).toFixed(1); wd.textContent = `${d > 0 ? '+' : ''}${d} кг`; }
    else wd.textContent = 'сдать отчёт';
  }
  const mv = $('trkMeasVal');
  if(mv) mv.textContent = last.waist ? `талия ${last.waist} см` : 'талия —';
  const sv = $('trkSleepVal');
  if(sv) sv.textContent = (state.dailyReport.date === todayKey() && state.dailyReport.sleep) ? '✓ отмечен' : 'не отмечен';
  const ae = $('acctEmail'); if(ae) ae.textContent = (pbUser && pbUser.email) ? pbUser.email : 'гость';
}

// ============================================================
//  Техника: фронтальная камера + MediaPipe Pose
//  Зелёный = в норме, красный = отклонение. Всё в браузере, без бэкенда.
// ============================================================
const PB_POSE_ANALYZER = window.PrimeBodyPose || null;
const TECH_RECORDER_API = window.PrimeBodyTechniqueRecorder || null;
const POSE = {
  on:false,
  loading:false,
  video:null,
  canvas:null,
  ctx:null,
  landmarker:null,
  stream:null,
  raf:0,
  exercise:'free',
  exerciseId:null,
  exerciseName:'Свободная стойка',
  lastTs:-1,
  lastVideoTime:-1,
  lastInferenceAt:0,
  stableFrames:0,
  missingFrames:0,
  scoreEma:null,
  smoothedLandmarks:null,
  smoothedWorld:null,
  coachText:'Встань лицом к камере',
};
const TECH_RECORDING = {
  recorder:null,
  result:null,
  objectUrl:'',
  startedAt:0,
  timer:0,
};
// Версии MediaPipe Tasks Vision (ESM с CDN) + модель Pose Landmarker (lite)
const MP_VER = '0.10.18';
const MP_BASES = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MP_VER}`
];
// full точнее по суставам (важно для техники), lite — фолбэк если full недоступен
const MP_MODELS = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
];
// Связи 33-точечной модели MediaPipe Pose, включая пятки и носки.
const POSE_CONN = PB_POSE_ANALYZER?.POSE_CONNECTIONS || [[7,0],[0,8],[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const POSE_PTS = PB_POSE_ANALYZER?.POSE_POINTS || [0,7,8,11,12,13,14,15,16,23,24,25,26,27,28];
const TECH_FEATURED = [
  ['itfit_139_squat_barbell','Присед со штангой'],
  ['itfit_291_lunge_dumbbell','Выпады'],
  ['itfit_252_military_press_barbell','Армейский жим'],
  ['itfit_306_lateral_raise_dumbbell','Подъём рук'],
  ['itfit_221_pulldown_cable','Верхний блок'],
  ['itfit_226_pull_up','Подтягивания'],
  ['itfit_212_push_up','Отжимания'],
];
const TECH_GROUPS = ['Все','Ноги','Плечи и руки','Спина','Грудь и корпус'];
let techniqueCatalog = [];
let techniqueSelected = null;
let techniquePickerGroup = 'Все';
let techniquePickerQuery = '';
const TECHNIQUE_PICKER_PAGE_SIZE = 60;
let techniquePickerLimit = TECHNIQUE_PICKER_PAGE_SIZE;

function drawPose(L, bad){
  const ctx=POSE.ctx, w=POSE.canvas.width, h=POSE.canvas.height;
  const shortEdge=Math.min(w,h);
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.lineWidth=Math.max(1.75,shortEdge*0.0045); ctx.lineCap='round';
  POSE_CONN.forEach(([a,b])=>{
    if(!L[a]||!L[b]||(L[a].visibility??1)<0.4||(L[b].visibility??1)<0.4) return;
    const off = bad.has(a)||bad.has(b);
    const color = off ? '#FF3B4F' : '#35F07D';
    ctx.strokeStyle = color;
    ctx.shadowColor = off ? 'rgba(255,59,79,.82)' : 'rgba(53,240,125,.74)';
    ctx.shadowBlur=Math.max(3,shortEdge*0.006);
    ctx.beginPath(); ctx.moveTo(L[a].x*w, L[a].y*h); ctx.lineTo(L[b].x*w, L[b].y*h); ctx.stroke();
  });
  ctx.shadowBlur=0;
  POSE_PTS.forEach(i=>{
    if(!L[i]||(L[i].visibility??1)<0.4) return;
    ctx.fillStyle = bad.has(i) ? '#FF3B4F' : '#35F07D';
    ctx.beginPath(); ctx.arc(L[i].x*w, L[i].y*h, Math.max(2.25,shortEdge*0.0055), 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}
function camState(t){ const e=$('camState'); if(e) e.textContent = t; }
function emptyPoseGate(code='no_pose', title='Встань в кадр', instruction='Покажи камере лицо, плечи, таз и опорные суставы.'){
  return { ready:false, code, title, instruction, checks:[
    { id:'front', label:'Лицом', ok:false },
    { id:'frame', label:'Тело в кадре', ok:false },
    { id:'quality', label:'Суставы видны', ok:false },
  ] };
}
function renderCamReadiness(gate){
  const byId = new Map((gate?.checks || []).map(check => [check.id, check]));
  $('camReadiness')?.querySelectorAll('.cam-ready-item').forEach((item, index) => {
    const check = byId.get(item.dataset.check);
    const ok = Boolean(check?.ok);
    item.classList.toggle('ok', ok);
    item.classList.toggle('pending', !ok);
    const icon=item.querySelector('i'); if(icon) icon.textContent=ok ? '✓' : String(index+1);
    const label=item.querySelector('span'); if(label && check?.label) label.textContent=check.label;
  });
}
function renderCamExerciseGuide(exercise=POSE.exercise){
  const guide=PB_POSE_ANALYZER?.EXERCISE_GUIDES?.[exercise];
  if(!guide) return;
  const displayName=techniqueSelected?.name || guide.name;
  const name=$('camExerciseName'); if(name) name.textContent=displayName;
  const setup=$('camExerciseSetup'); if(setup) setup.textContent=guide.setup;
  const focus=$('camExerciseFocus'); if(focus) focus.innerHTML=guide.checks.map(item=>`<span>${escapeHtml(item)}</span>`).join('');
  const limitation=$('camLimitation'); if(limitation) limitation.textContent=guide.limitation;
  const selectedName=$('camSelectedName'); if(selectedName) selectedName.textContent=displayName;
  const selectedLevel=$('camSelectedLevel');
  const levelLabel=techniqueSelected?.analysisLevel==='detailed' ? 'Детальная проверка' : techniqueSelected ? 'Базовая проверка' : 'Свободный режим';
  if(selectedLevel){ selectedLevel.textContent=levelLabel; selectedLevel.dataset.level=techniqueSelected?.analysisLevel || 'free'; }
  const selectedMeta=$('camSelectedMeta');
  if(selectedMeta) selectedMeta.textContent=techniqueSelected
    ? `${guide.name} · ${EQ_RU[techniqueSelected.equipment] || techniqueSelected.equipment || 'Без инвентаря'}`
    : 'Общая фронтальная симметрия';
}
function renderCamFeedback(result, gate, stable){
  const score=$('camScore');
  const pill=$('camModePill');
  const live=$('camLiveGuide');
  const stage=$('camStage');
  const effective = gate || emptyPoseGate();
  const stabilizing = effective.ready && !stable;
  const title = stabilizing ? 'Стой спокойно' : effective.title;
  const instruction = stabilizing ? 'Фиксирую ракурс. Удерживай положение ещё мгновение.' : effective.instruction;
  POSE.coachText = stable&&result ? result.summary : instruction;
  renderCamReadiness(effective);
  camState(title);
  if(stage) stage.dataset.analysis=stable&&result ? (result.bad.size ? 'bad' : 'good') : effective.ready ? 'good' : effective.code || 'waiting';
  if(live){
    live.className=`cam-live-guide ${stable&&result ? (result.bad.size?'warn':'good') : effective.ready?'good':'setup'}`;
    const b=live.querySelector('b'), span=live.querySelector('span');
    if(b) b.textContent=stable&&result ? (result.score>=80?'Положение стабильное':'Нужна корректировка') : title;
    if(span) span.textContent=stable&&result ? result.summary : instruction;
  }
  if(score){
    if(stable&&result){ score.textContent=`${result.score}%`; score.className='cam-score '+(result.score>=80?'good':result.score>=60?'mid':'bad'); }
    else { score.textContent=''; score.className='cam-score'; }
  }
  if(pill){
    pill.textContent=stable&&result ? (result.score>=80?'Стабильно':'Коррекция') : effective.ready?'Калибровка':'Настройка';
    pill.dataset.state=stable&&result ? (result.score>=80?'good':'warn') : 'setup';
  }
  const lines=$('coachLines');
  if(!lines) return;
  if(!stable||!result){
    lines.innerHTML=`<div class="coach-line ${effective.ready?'hold':'warn'}"><b><em>${effective.ready?'…':'!'}</em>${escapeHtml(title)}</b><span>${escapeHtml(instruction)}</span></div>`;
    return;
  }
  const ordered=[...result.metrics].sort((a,b)=>Number(a.ok)-Number(b.ok)).slice(0,6);
  lines.innerHTML=ordered.map(metric=>`<div class="coach-line ${metric.ok?'ok':'warn'}"><b><em>${metric.ok?'✓':'!'}</em>${escapeHtml(metric.label)}</b><span>${escapeHtml(metric.ok?metric.detail:metric.tip)}</span></div>`).join('');
}
function camErr(e){
  const n = e && e.name || '';
  if(n==='NotAllowedError'||n==='SecurityError') return 'Доступ к камере запрещён — разреши в настройках';
  if(n==='NotFoundError'||n==='OverconstrainedError') return 'Фронтальная камера не найдена';
  if(n==='NotReadableError') return 'Камера занята другим приложением';
  return 'Не удалось запустить камеру/модель';
}
async function loadLandmarker(){
  let lastErr;
  for(const base of MP_BASES){
    try{
      const vision = await import(`${base}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
      for(const modelAssetPath of MP_MODELS){
        for(const delegate of ['GPU','CPU']){
          try{
            return await vision.PoseLandmarker.createFromOptions(files, { baseOptions:{ modelAssetPath, delegate }, runningMode:'VIDEO', numPoses:1, minPoseDetectionConfidence:0.58, minPosePresenceConfidence:0.58, minTrackingConfidence:0.58 });
          }catch(e){ lastErr=e; }
        }
      }
    }catch(e){ lastErr=e; }
  }
  throw lastErr || new Error('MediaPipe load failed');
}
async function poseStart(){
  if(POSE.on || POSE.loading) return;
  POSE.video=$('camVideo'); POSE.canvas=$('camCanvas');
  if(!POSE.video||!POSE.canvas) return;
  if(!PB_POSE_ANALYZER){ camState('Модуль техники не загрузился'); toast('Обнови страницу и попробуй снова'); return; }
  POSE.ctx=POSE.canvas.getContext('2d');
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ camState('Камера недоступна в этом браузере'); toast('Камера недоступна в этом браузере'); return; }
  POSE.loading=true; camState('Загрузка модели техники…'); $('camToggle').textContent='Загрузка…';
  try{
    if(!POSE.landmarker) POSE.landmarker = await loadLandmarker();
    camState('Запрашиваю камеру…');
    POSE.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ideal:'user'}, width:{ideal:720}, height:{ideal:1280}, aspectRatio:{ideal:9/16} }, audio:false });
    POSE.video.srcObject = POSE.stream;
    $('camStage')?.classList.add('live');
    camState('Настраиваю изображение…');
    let playAttempt;
    try{ playAttempt=POSE.video.play(); }catch(e){}
    await Promise.race([
      Promise.resolve(playAttempt).catch(()=>{}),
      new Promise(resolve=>setTimeout(resolve,1200))
    ]);
    POSE.lastVideoTime=-1; POSE.lastInferenceAt=0; POSE.stableFrames=0; POSE.missingFrames=0; POSE.scoreEma=null; POSE.smoothedLandmarks=null; POSE.smoothedWorld=null;
    POSE.on=true; POSE.loading=false;
    $('camToggle').textContent='Выключить камеру';
    ensureTechniqueRecorder();
    updateTechniqueRecordingUi();
    renderCamFeedback(null, emptyPoseGate(), false);
    track('technique_used', 'technique', { exercise: POSE.exercise, exercise_id: POSE.exerciseId || 'free' });
    poseLoop();
  }catch(e){
    POSE.loading=false;
    $('camStage')?.classList.remove('live');
    if(POSE.stream){ POSE.stream.getTracks().forEach(track=>track.stop()); POSE.stream=null; }
    if(POSE.video) POSE.video.srcObject=null;
    $('camToggle').textContent='Включить камеру';
    camState(camErr(e)); toast(camErr(e));
  }
}
function poseStop(){
  if(TECH_RECORDING.recorder?.isRecording?.()) stopTechniqueRecording();
  POSE.on=false; POSE.loading=false;
  if(POSE.raf) cancelAnimationFrame(POSE.raf);
  if(POSE.stream){ POSE.stream.getTracks().forEach(t=>t.stop()); POSE.stream=null; }
  if(POSE.video) POSE.video.srcObject=null;
  if(POSE.ctx&&POSE.canvas) POSE.ctx.clearRect(0,0,POSE.canvas.width,POSE.canvas.height);
  POSE.lastVideoTime=-1; POSE.lastInferenceAt=0; POSE.stableFrames=0; POSE.missingFrames=0; POSE.scoreEma=null; POSE.smoothedLandmarks=null; POSE.smoothedWorld=null;
  $('camStage')?.classList.remove('live');
  const tgl=$('camToggle'); if(tgl) tgl.textContent='Включить камеру';
  renderCamFeedback(null, emptyPoseGate('off','Камера выключена','Включи камеру, затем выполни три условия кадра.'), false);
  updateTechniqueRecordingUi();
}
function poseLoop(){
  if(!POSE.on) return;
  const v=POSE.video;
  const now=performance.now();
  if(v && v.readyState>=2 && v.videoWidth && v.currentTime!==POSE.lastVideoTime && now-POSE.lastInferenceAt>=45){
    if(POSE.canvas.width!==v.videoWidth || POSE.canvas.height!==v.videoHeight){ POSE.canvas.width=v.videoWidth; POSE.canvas.height=v.videoHeight; }
    POSE.lastVideoTime=v.currentTime; POSE.lastInferenceAt=now;
    let ts=now; if(ts<=POSE.lastTs) ts=POSE.lastTs+1; POSE.lastTs=ts;
    let res; try{ res=POSE.landmarker.detectForVideo(v, ts); }catch(e){}
    if(res && res.landmarks && res.landmarks[0]){
      POSE.missingFrames=0;
      const rawL=res.landmarks[0], rawW=res.worldLandmarks?.[0] || null;
      const L=PB_POSE_ANALYZER.smoothLandmarks(POSE.smoothedLandmarks, rawL, 0.44);
      const W=rawW ? PB_POSE_ANALYZER.smoothLandmarks(POSE.smoothedWorld, rawW, 0.38) : null;
      POSE.smoothedLandmarks=L; POSE.smoothedWorld=W;
      const gate=PB_POSE_ANALYZER.assessFrame(L, W, POSE.exercise);
      POSE.stableFrames=gate.visibilityOk ? Math.min(8, POSE.stableFrames+1) : 0;
      const analysisStable=POSE.stableFrames>=3;
      const result=analysisStable ? PB_POSE_ANALYZER.evaluateExercise(L, W, POSE.exercise) : null;
      if(result){
        POSE.scoreEma=POSE.scoreEma==null ? result.score : POSE.scoreEma*0.72+result.score*0.28;
        result.score=Math.round(POSE.scoreEma);
      }else if(!gate.visibilityOk){ POSE.scoreEma=null; }
      drawPose(L, result?.bad || new Set());
      renderCamFeedback(gate.ready ? result : null, gate, gate.ready && analysisStable);
    }else{
      POSE.missingFrames+=1;
      if(POSE.missingFrames>=3){
        POSE.stableFrames=0; POSE.scoreEma=null; POSE.smoothedLandmarks=null; POSE.smoothedWorld=null;
        POSE.ctx.clearRect(0,0,POSE.canvas.width,POSE.canvas.height);
        renderCamFeedback(null, emptyPoseGate(), false);
      }
    }
  }
  POSE.raf=requestAnimationFrame(poseLoop);
}

function formatTechniqueRecordingTime(durationMs){
  const totalSeconds=Math.max(0,Math.min(90,Math.floor((Number(durationMs)||0)/1000)));
  return `${String(Math.floor(totalSeconds/60)).padStart(2,'0')}:${String(totalSeconds%60).padStart(2,'0')}`;
}

function clearTechniqueRecordingTimer(){
  if(TECH_RECORDING.timer){ window.clearInterval(TECH_RECORDING.timer); TECH_RECORDING.timer=0; }
}

function updateTechniqueRecordingUi(){
  const toggle=$('camRecordToggle');
  const title=$('camRecordTitle');
  const stateEl=$('camRecordState');
  const timer=$('camRecordTimer');
  const review=$('camRecordReview');
  const recording=Boolean(TECH_RECORDING.recorder?.isRecording?.());
  const supported=Boolean(TECH_RECORDING.recorder?.isSupported?.());
  const elapsed=recording ? Date.now()-TECH_RECORDING.startedAt : TECH_RECORDING.result?.durationMs || 0;
  if(toggle){
    toggle.disabled=!POSE.on || !supported;
    toggle.classList.toggle('recording',recording);
    toggle.setAttribute('aria-pressed',String(recording));
  }
  if(title) title.textContent=recording ? 'Остановить запись' : 'Записать подход';
  if(timer){ timer.textContent=formatTechniqueRecordingTime(elapsed); timer.setAttribute('datetime',`PT${Math.floor(elapsed/1000)}S`); }
  if(stateEl) stateEl.textContent=recording
    ? 'Идёт локальная запись'
    : !TECH_RECORDER_API ? 'Запись не поддерживается этим браузером'
    : !POSE.on ? 'Сначала включи камеру'
    : !supported ? 'Запись недоступна в этом WebView'
    : TECH_RECORDING.result ? 'Запись готова и хранится только здесь' : 'Готово к локальной записи';
  if(review) review.hidden=!TECH_RECORDING.result || recording;
}

function clearTechniqueRecordingObjectUrl(){
  if(TECH_RECORDING.objectUrl){ URL.revokeObjectURL(TECH_RECORDING.objectUrl); TECH_RECORDING.objectUrl=''; }
}

function ensureTechniqueRecorder(){
  if(TECH_RECORDING.recorder) return TECH_RECORDING.recorder;
  if(!TECH_RECORDER_API || !POSE.video || !POSE.canvas) return null;
  TECH_RECORDING.recorder=TECH_RECORDER_API.create({
    video:POSE.video,
    overlayCanvas:POSE.canvas,
    getExerciseName:()=>POSE.exerciseName,
    getCaption:()=>POSE.coachText,
    onComplete:handleTechniqueRecordingComplete,
    onError:()=>{ clearTechniqueRecordingTimer(); toast('Не удалось записать видео на этом устройстве'); updateTechniqueRecordingUi(); },
  });
  return TECH_RECORDING.recorder;
}

function handleTechniqueRecordingComplete(result){
  clearTechniqueRecordingTimer();
  TECH_RECORDING.result={
    ...result,
    exerciseName:POSE.exerciseName,
    exerciseId:POSE.exerciseId || 'free',
    exerciseProfile:POSE.exercise,
  };
  clearTechniqueRecordingObjectUrl();
  updateTechniqueRecordingUi();
  track('technique_recorded','technique',{ exercise:TECH_RECORDING.result.exerciseProfile, exercise_id:TECH_RECORDING.result.exerciseId, duration_ms:result?.durationMs || 0 });
  openTechniqueRecordingReview();
}

function startTechniqueRecording(){
  if(!POSE.on){ toast('Сначала включи камеру'); return false; }
  if(!POSE.video || POSE.video.readyState<2){ toast('Подожди, пока камера запустится'); return false; }
  const recorder=ensureTechniqueRecorder();
  if(!recorder?.isSupported?.()){ toast('Этот браузер не умеет сохранять видео с разметкой'); updateTechniqueRecordingUi(); return false; }
  if(recorder.isRecording()) return false;
  deleteTechniqueRecording(false);
  try{
    TECH_RECORDING.startedAt=Date.now();
    recorder.start();
    TECH_RECORDING.timer=window.setInterval(updateTechniqueRecordingUi,250);
    updateTechniqueRecordingUi();
    track('technique_recording_started','technique',{ exercise:POSE.exercise, exercise_id:POSE.exerciseId || 'free' });
    return true;
  }catch(error){
    toast(error?.message==='TECHNIQUE_CAMERA_NOT_READY' ? 'Камера ещё не готова' : 'Запись недоступна в этом WebView');
    updateTechniqueRecordingUi();
    return false;
  }
}

async function stopTechniqueRecording(){
  const recorder=TECH_RECORDING.recorder;
  if(!recorder?.isRecording?.()) return TECH_RECORDING.result;
  clearTechniqueRecordingTimer();
  const title=$('camRecordTitle'); if(title) title.textContent='Готовлю видео…';
  const toggle=$('camRecordToggle'); if(toggle) toggle.disabled=true;
  try{ return await recorder.stop(); }
  catch{ toast('Не удалось завершить запись'); updateTechniqueRecordingUi(); return null; }
}

function openTechniqueRecordingReview(){
  const result=TECH_RECORDING.result;
  if(!result?.blob){ toast('Сначала запиши подход'); return; }
  clearTechniqueRecordingObjectUrl();
  TECH_RECORDING.objectUrl=URL.createObjectURL(result.blob);
  const duration=formatTechniqueRecordingTime(result.durationMs);
  openSheet(`<div class="lib-sheet-head"><div><h2>Запись подхода</h2><p class="sheet-sub">${escapeHtml(result.exerciseName || 'Проверка техники')} · ${duration}</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <div class="cam-record-review">
      <video id="camRecordingPreview" src="${escapeHtml(TECH_RECORDING.objectUrl)}" controls playsinline preload="metadata"></video>
      <div class="cam-record-review-note"><b>Видео хранится только сейчас</b><span>Сохрани его на устройство или удали. На сервер оно не отправляется.</span></div>
      <div class="cam-record-review-actions">
        <button type="button" class="primary" id="camRecordingSave"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg><span>Сохранить</span></button>
        <button type="button" class="secondary" id="camRecordingShare"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4m0 0 4 4m-4-4L8 8M5 13v6h14v-6"/></svg><span>Поделиться</span></button>
        <button type="button" class="cam-record-delete" id="camRecordingDelete" aria-label="Удалить запись" title="Удалить запись"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 10v7m4-7v7"/></svg></button>
      </div>
    </div>`);
  $('camRecordingSave')?.addEventListener('click',saveTechniqueRecording);
  $('camRecordingShare')?.addEventListener('click',shareTechniqueRecording);
  $('camRecordingDelete')?.addEventListener('click',()=>deleteTechniqueRecording(true));
  window.setTimeout(()=>$('camRecordingPreview')?.play().catch(()=>{}),80);
}

function saveTechniqueRecording(){
  const result=TECH_RECORDING.result;
  if(!result?.blob) return;
  if(!TECH_RECORDING.objectUrl) TECH_RECORDING.objectUrl=URL.createObjectURL(result.blob);
  const link=document.createElement('a');
  link.href=TECH_RECORDING.objectUrl;
  link.download = result.filename;
  link.rel='noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  track('technique_recording_saved','technique',{ exercise_id:result.exerciseId || 'free', duration_ms:result.durationMs || 0 });
  toast('Видео подготовлено для сохранения');
}

async function shareTechniqueRecording(){
  const result=TECH_RECORDING.result;
  if(!result?.blob) return;
  try{
    const file=new File([result.blob],result.filename,{ type:result.mimeType || result.blob.type });
    if(navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))){
      await navigator.share({ files:[file], title:`Форма · ${result.exerciseName || 'Техника'}` });
      track('technique_recording_shared','technique',{ exercise_id:result.exerciseId || 'free' });
      return;
    }
  }catch(error){ if(error?.name==='AbortError') return; }
  saveTechniqueRecording();
  toast('Открыл сохранение: системная отправка здесь недоступна');
}

function deleteTechniqueRecording(closeReview=true){
  clearTechniqueRecordingObjectUrl();
  TECH_RECORDING.result=null;
  TECH_RECORDING.startedAt=0;
  updateTechniqueRecordingUi();
  if(closeReview) closeSheet();
}

const CAM_TIPS = [
  ['Закрепи телефон вертикально', 'камера не должна двигаться во время подхода'],
  ['Встань строго лицом', 'плечи и таз параллельны экрану, нос между плечами'],
  ['Оставь тело внутри рамки', 'для стоячих упражнений видны макушка, кисти и стопы'],
  ['Поставь свет перед собой', 'силуэт контрастный, суставы не перекрываются одеждой или предметами'],
  ['Сделай движение без боли', 'это визуальная подсказка, а не медицинская диагностика']
];
function openCamIntro(){
  state.camIntroSeen = true; save();
  const steps = CAM_TIPS.map(([t,d],i)=>`<div class="tour-step"><i>${i+1}</i><div><b>${escapeHtml(t)}</b><span>${escapeHtml(d)}</span></div></div>`).join('');
  openSheet(`<div class="lib-sheet-head"><h2>Как поставить камеру</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="sheet-sub">Чтобы камера чётко видела технику: 5 правил установки.</p>
    <div class="tour-list">${steps}</div>
    <button type="button" class="primary shine" id="camIntroGo">Понятно, включить камеру</button>`);
  $('appSheet')?.querySelector('#camIntroGo')?.addEventListener('click', () => { closeSheet(); poseStart(); });
}
function selectTechniqueExercise(value, options={}){
  if(TECH_RECORDING.recorder?.isRecording?.()){ toast('Сначала останови запись'); return false; }
  const selected = value && value !== 'free'
    ? (typeof value === 'string' ? techniqueCatalog.find(item=>item.id===value) : value)
    : null;
  if(value && value !== 'free' && !selected) return false;
  techniqueSelected=selected;
  POSE.exercise=selected?.profile || 'free';
  POSE.exerciseId=selected?.id || null;
  POSE.exerciseName=selected?.name || 'Свободная стойка';
  POSE.stableFrames=0; POSE.scoreEma=null;
  $('camEx')?.querySelectorAll('.cam-chip').forEach(button=>button.classList.toggle('on', button.dataset.techId===(selected?.id || 'free')));
  renderCamExerciseGuide(POSE.exercise);
  if(!options.skipStorage){
    try{ selected ? WLStorage.setItem('primeBodyTechniqueExercise', selected.id) : WLStorage.removeItem('primeBodyTechniqueExercise'); }catch{}
  }
  if(POSE.on) renderCamFeedback(null, emptyPoseGate('switch','Настрой положение','Встань лицом к камере по инструкции выбранного упражнения.'), false);
  if(!options.silent) track('technique_exercise_selected','technique',{ exercise:POSE.exercise, exercise_id:POSE.exerciseId || 'free' });
  if(options.close) closeSheet();
  return true;
}

function renderCamEx(){
  const row=$('camEx'); if(!row) return;
  const featured=TECH_FEATURED.map(([id,label])=>({ item:techniqueCatalog.find(exercise=>exercise.id===id), label })).filter(entry=>entry.item);
  row.innerHTML=`<button type="button" class="cam-chip${techniqueSelected?'':' on'}" data-tech-id="free">Свободно</button>`
    +featured.map(({item,label})=>`<button type="button" class="cam-chip${techniqueSelected?.id===item.id?' on':''}" data-tech-id="${escapeHtml(item.id)}">${escapeHtml(label)}</button>`).join('');
  row.querySelectorAll('.cam-chip').forEach(button=>button.addEventListener('click',()=>selectTechniqueExercise(button.dataset.techId)));
  renderCamExerciseGuide(POSE.exercise);
}

async function loadTechniqueCatalog(){
  if(!PB_POSE_ANALYZER?.buildTechniqueCatalog) return [];
  await ensureLibrary();
  techniqueCatalog=PB_POSE_ANALYZER.buildTechniqueCatalog((libData || []).filter(exerciseHasVideo));
  const count=$('camSupportedCount'); if(count) count.textContent=`${techniqueCatalog.length} упражнений`;
  renderCamEx();
  let saved=''; try{ saved=WLStorage.getItem('primeBodyTechniqueExercise') || ''; }catch{}
  selectTechniqueExercise(saved && techniqueCatalog.some(item=>item.id===saved) ? saved : 'free',{ silent:true, skipStorage:true });
  return techniqueCatalog;
}

function renderTechniquePickerList(){
  const root=$('appSheet');
  const list=root?.querySelector('#camPickerList');
  if(!list) return;
  const query=techniquePickerQuery.trim().toLowerCase();
  const items=techniqueCatalog.filter(item=>{
    if(techniquePickerGroup!=='Все' && item.group!==techniquePickerGroup) return false;
    if(!query) return true;
    const guide=PB_POSE_ANALYZER?.EXERCISE_GUIDES?.[item.profile];
    const level=item.analysisLevel==='detailed' ? 'детальная проверка' : 'базовая проверка';
    return `${item.name} ${item.group} ${guide?.name || ''} ${EQ_RU[item.equipment] || item.equipment} ${level}`.toLowerCase().includes(query);
  });
  const detailedCount=items.filter(item=>item.analysisLevel==='detailed').length;
  const result=root.querySelector('#camPickerResult'); if(result) result.textContent=`Найдено: ${items.length} · детально: ${detailedCount}`;
  const visibleItems=items.slice(0,techniquePickerLimit);
  const remaining=Math.max(0,items.length-visibleItems.length);
  list.innerHTML=items.length ? visibleItems.map(item=>{
    const guide=PB_POSE_ANALYZER?.EXERCISE_GUIDES?.[item.profile];
    const levelLabel=item.analysisLevel==='detailed' ? 'Детально' : 'Базово';
    return `<button type="button" class="cam-picker-item ${item.analysisLevel}${techniqueSelected?.id===item.id?' selected':''}" data-tech-id="${escapeHtml(item.id)}">
      <img src="${escapeHtml(item.poster)}" loading="lazy" decoding="async" alt="" />
      <span><small class="cam-analysis-tag">${levelLabel}</small><b>${escapeHtml(item.name)}</b><em>${escapeHtml(guide?.name || item.group)} · ${escapeHtml(EQ_RU[item.equipment] || item.equipment || 'Без инвентаря')}</em></span>
      <i aria-hidden="true">›</i>
    </button>`;
  }).join('')+(remaining ? `<button type="button" class="cam-picker-more" id="camPickerMore">Показать ещё <b>${Math.min(TECHNIQUE_PICKER_PAGE_SIZE,remaining)}</b><span>осталось ${remaining}</span></button>` : '') : '<div class="cam-picker-empty"><b>Ничего не найдено</b><span>Попробуй часть названия или другую группу.</span></div>';
  list.querySelectorAll('[data-tech-id]').forEach(button=>button.addEventListener('click',()=>selectTechniqueExercise(button.dataset.techId,{ close:true })));
  list.querySelector('#camPickerMore')?.addEventListener('click',()=>{ techniquePickerLimit+=TECHNIQUE_PICKER_PAGE_SIZE; renderTechniquePickerList(); });
}

async function openTechniquePicker(){
  if(TECH_RECORDING.recorder?.isRecording?.()){ toast('Сначала останови запись'); return; }
  if(!techniqueCatalog.length) await loadTechniqueCatalog();
  techniquePickerGroup='Все'; techniquePickerQuery=''; techniquePickerLimit=TECHNIQUE_PICKER_PAGE_SIZE;
  const detailedCount=techniqueCatalog.filter(item=>item.analysisLevel==='detailed').length;
  openSheet(`<div class="lib-sheet-head"><div><h2>Упражнения для камеры</h2><p class="sheet-sub">Вся база: ${techniqueCatalog.length}. Детальная проверка: ${detailedCount}, остальные — базовая фронтальная.</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <label class="cam-picker-search"><span>Поиск</span><input type="search" id="camLibrarySearch" placeholder="Например, тяга верхнего блока" autocomplete="off" /></label>
    <div class="cam-picker-groups">${TECH_GROUPS.map(group=>`<button type="button" class="${group==='Все'?'on':''}" data-tech-group="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join('')}</div>
    <div class="cam-picker-result" id="camPickerResult"></div>
    <div class="cam-picker-list" id="camPickerList"></div>
    <p class="cam-picker-note"><b>Детальная проверка</b> знает ориентиры упражнения. <b>Базовая проверка</b> показывает только видимую симметрию и положение корпуса без оценки глубины движения.</p>`);
  const root=$('appSheet');
  root?.querySelector('#camLibrarySearch')?.addEventListener('input',event=>{ techniquePickerQuery=event.target.value; techniquePickerLimit=TECHNIQUE_PICKER_PAGE_SIZE; renderTechniquePickerList(); });
  root?.querySelectorAll('[data-tech-group]').forEach(button=>button.addEventListener('click',()=>{
    techniquePickerGroup=button.dataset.techGroup;
    techniquePickerLimit=TECHNIQUE_PICKER_PAGE_SIZE;
    root.querySelectorAll('[data-tech-group]').forEach(item=>item.classList.toggle('on',item===button));
    renderTechniquePickerList();
  }));
  renderTechniquePickerList();
  window.setTimeout(()=>root?.querySelector('#camLibrarySearch')?.focus(),120);
}

function bindExtras(){
  // Техника (камера)
  renderCamEx();
  loadTechniqueCatalog();
  $('camToggle')?.addEventListener('click', () => { POSE.on ? poseStop() : poseStart(); });
  $('camRecordToggle')?.addEventListener('click',()=>{ TECH_RECORDING.recorder?.isRecording?.() ? stopTechniqueRecording() : startTechniqueRecording(); });
  $('camRecordReview')?.addEventListener('click',openTechniqueRecordingReview);
  $('camHelp')?.addEventListener('click', openCamIntro);
  $('camLibraryOpen')?.addEventListener('click', openTechniquePicker);
  updateTechniqueRecordingUi();
  if(!window.__pbTechniqueRecordingCleanupBound){
    window.__pbTechniqueRecordingCleanupBound=true;
    window.addEventListener('pagehide',()=>{
      clearTechniqueRecordingTimer();
      TECH_RECORDING.recorder?.dispose?.();
      clearTechniqueRecordingObjectUrl();
    },{ once:true });
  }
  // Кабинет-трекеры
  $('trkWeight')?.addEventListener('click', () => openWeeklyReport(false));
  $('trkMeas')?.addEventListener('click', () => openWeeklyReport(false));
  $('trkSleep')?.addEventListener('click', openDailyReport);
  $('logoutBtn')?.addEventListener('click', pbLogout);
  $('progressResetBtn')?.addEventListener('click', openProgressResetConfirm);
  renderTrackers();
  document.querySelectorAll('[data-profile-gender]').forEach(btn => btn.addEventListener('click', () => setProfileGender(btn.dataset.profileGender)));
  document.querySelectorAll('[data-profile-level]').forEach(btn => btn.addEventListener('click', () => setTrainingLevel(btn.dataset.profileLevel)));
  renderProfileQuickSettings();
  // Отчёты
  $('rDaily')?.addEventListener('click', openDailyReport);
  $('rWeekly')?.addEventListener('click', () => openWeeklyReport(false));
  $('rPhoto')?.addEventListener('click', () => openWeeklyReport(true));
  $('openBodyCheck')?.addEventListener('click', () => openWeeklyReport(false));
  $('bodyCheckOpenPhotos')?.addEventListener('click', () => openBodyCheckPhotos(latestBodyCheck()));
  $('rVideo')?.addEventListener('click', openVideoReport);
  $('weeklyInsightOpen')?.addEventListener('click', openWeeklyInsight);
  $('remToggle')?.addEventListener('click', toggleReminders);
  renderReminders();
  // Health / Фарма / Пептиды
  $('openLabs')?.addEventListener('click', openLabs);
  $('openPharma')?.addEventListener('click', openPharma);
  $('openPeptide')?.addEventListener('click', openPeptide);
  // Навигатор
  $('startGuide')?.addEventListener('click', openGuideTour);
  // Рефералка
  renderRef();
  $('shareRef')?.addEventListener('click', () => openLink(refLink()));
  // Внешние ссылки (VPN, магазин, клуб, бот)
  document.querySelectorAll('[data-link]').forEach(b => b.addEventListener('click', () => openLink(b.dataset.link)));
  // Куратор
  initCoach();
  $('curatorContext')?.addEventListener('click', openCuratorContext);
  // Закрытие общего листа по фону/Esc
  $('appSheet')?.addEventListener('click', e => { if(e.target === $('appSheet')) closeSheet(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeSheet(); });
}

function bindButtons(){
  $('startDay')?.addEventListener('click', startDayWorkout);
  $('rerollDay')?.addEventListener('click', rerollDayWorkout);
  $('chooseOwnDay')?.addEventListener('click', chooseOwnDayWorkout);
  $('addPastWorkout')?.addEventListener('click', openPastWorkoutEntry);

  const adaptCalories = () => {
    state.kcalCut = ((state.kcalCut || 0) + 1) % 4;   // 0 → −100 → −200 → −300 → 0
    save();
    renderMetrics();
    const profile = planFromProfile();
    const norm = computeNorm(profile, state.kcalCut);
    const planNote = norm.bodyCheckApplied ? ` BodyCheck: ${norm.bodyCheckTitle}.` : '';
    const guard = norm.bodyCheckCutLimited ? ' Дальше дефицит не усиливаем: в приоритете восстановление.' : '';
    const adjustmentBasis = profile.goal === 'Сушка' ? 'от расчётного расхода' : 'от базовой стратегии';
    if($('bioAdvice')) $('bioAdvice').textContent = `Норма обновлена: ${norm.kcal} ккал${state.kcalCut ? ` (−${state.kcalCut * 100} ккал ${adjustmentBasis})` : ' (базовая стратегия)'}.${planNote}${guard} Если 2–3 недели нет динамики по весу и талии, сначала проверь сон, питание и активность.`;
    toast(norm.bodyCheckCutLimited
      ? `Норма защищена BodyCheck: ${norm.kcal} ккал`
      : state.kcalCut ? `Адаптация −${state.kcalCut * 100} ккал → ${norm.kcal}` : `Сброшено к норме ${norm.kcal} ккал`);
  };
  $('adaptCalories')?.addEventListener('click', adaptCalories);
  $('adaptCaloriesBio')?.addEventListener('click', adaptCalories);

  $('addWater')?.addEventListener('click', openWaterControl);
  $('minusWater200')?.addEventListener('click', () => applyWaterControlDelta(-0.2));
  $('minusWater100')?.addEventListener('click', () => applyWaterControlDelta(-0.1));
  $('addWater100')?.addEventListener('click', () => applyWaterControlDelta(0.1));
  $('addWater200')?.addEventListener('click', () => applyWaterControlDelta(0.2));

  $('analyzeGoal')?.addEventListener('click', () => {
    const p = planFromProfile();
    const a = bodyAssessment(p);
    renderBodyInsights();
    if($('goalComment')) $('goalComment').textContent = `Маршрут обновлён: ${p.goal}, ${a.targetWeight ? `${a.weight.toFixed(1)} → ${a.targetWeight} кг` : 'цель без жёсткой цифры'}, темп ${a.targetWeight ? `${a.weeklyRate} кг/нед` : 'по отчётам'}, тренировки ${p.days}р/нед. ${a.goalAggressive ? 'Темп лучше смягчить.' : 'Темп выглядит рабочим.'}`;
    toast('Разбор цели готов');
  });

  $('simulateForecast')?.addEventListener('click', () => {
    const p = planFromProfile();
    state.forecasts += 1;
    state.score += 15;
    state.rank = Math.max(1, state.rank - 4);
    save();
    renderMetrics();
    const a = bodyAssessment(p);
    const norm = computeNorm(p, state.kcalCut || 0);
    renderBodyInsights();
    if($('forecastCopy')) $('forecastCopy').textContent = `Прогноз #${state.forecasts}: визуальный ориентир обновлён по анкете и замерам. Цель «${p.goal}», ${p.days} тренировки/нед по ${p.sessionMinutes} мин, питание около ${norm.kcal} ккал. ${p.medicalFlags ? 'Из-за флагов здоровья маршрут остаётся щадящим.' : 'Корректируем по талии, весу и отчётам.'}`;
    toast('Прогноз тела собран. +15 баллов');
  });

  $('claimQuest')?.addEventListener('click', () => {
    if(state.questClaimed){ toast('Недельная цель уже закрыта'); return; }
    const total = state.tasks.length, done = state.tasks.filter(t => t.done).length;
    if(done < total){ toast(`Сначала закрой все задания дня — ${done}/${total}. Квест даётся по факту.`); jump('reports'); return; }
    state.questClaimed = true;
    state.score += 75;
    state.rank = Math.max(1, state.rank - 18);
    state.access += 2;
    save();
    renderMetrics();
    track('quest_done', 'rewards', { done, total });
    toast(`Недельная цель закрыта: +75 баллов, статус ${gameStatus().current.name}`);
  });

  $('unlockReward')?.addEventListener('click', () => {
    toast('Сезон: топ-5 — разбор Форма, топ-10 — мерч/месяц, лучший прогресс — отдельный приз.');
  });

  $('claimBonus')?.addEventListener('click', () => {
    const done = state.tasks.filter(t => t.done).length;
    if(done < 3){ toast(`Челлендж — после 3 закрытых заданий дня (сейчас ${done}). Жми на задания.`); jump('reports'); return; }
    state.score += 30;
    state.rank = Math.max(1, state.rank - 9);
    state.access += 1;
    save();
    renderMetrics();
    track('challenge_done', 'rewards', { done });
    toast(`Цель закрыта: +30 баллов, место #${state.rank}`);
  });

  // «Сдать недельный отчёт» из карточки фото-протокола открывает реальный отчёт (вес+замеры+фото)
  $('submitWeeklyReport')?.addEventListener('click', () => openWeeklyReport(true));

  $('copyRef')?.addEventListener('click', async () => {
    const link = refLink();
    try{
      await navigator.clipboard.writeText(link);
      toast('Реферальная ссылка скопирована');
    }catch{
      toast(link);
    }
  });
}

function bindHero(){
  const hero = $('homeHero'), toggle = $('heroToggle'), detail = $('heroDetail'), hint = $('heroExpandHint');
  if(!hero || !toggle || !detail) return;
  function setExpanded(on){
    hero.classList.toggle('expanded', on);
    toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
    detail.hidden = !on;
    if(hint && hint.firstChild) hint.firstChild.textContent = on ? 'Свернуть прогресс' : 'Открыть прогресс';
  }
  toggle.addEventListener('click', () => setExpanded(!hero.classList.contains('expanded')));
  toggle.addEventListener('keydown', event => {
    if(event.key === 'Enter' || event.key === ' '){
      event.preventDefault();
      setExpanded(!hero.classList.contains('expanded'));
    }
  });
  $('heroCollapse')?.addEventListener('click', event => {
    event.stopPropagation();
    setExpanded(false);
  });
}

// Подсказки-коачмарки для новичков: затемнение + подсветка элемента + пузырёк «вот здесь X».
const coachSteps = pbSimpleUi() ? [
  { sel: '#today .today-focus-card', title: 'План на сегодня', text: 'Здесь всегда один главный следующий шаг: начать или продолжить тренировку, восстановиться либо завершить настройку.' },
  { sel: '.bottom-nav [data-jump="training"]', title: 'Тренировки', text: 'Тренировка дня, готовые программы, растяжка, восстановление и твоя история.' },
  { sel: '.bottom-nav [data-jump="nutrition"]', title: 'Питание', text: 'КБЖУ, вода, дневник, меню, база блюд и ПП-десерты собраны здесь.' },
  { sel: '.bottom-nav [data-jump="more"]', title: 'Ещё', text: 'Здесь находятся прогресс и аватар, профиль, подписка, помощь, восстановление и клуб.' },
  { sel: '#tourBtn', title: 'Повторить экскурсию', text: 'Нажми на лампочку в любой момент, если захочешь снова быстро пройтись по платформе.' }
] : [
  { sel: '#homeHero', title: 'Личный кабинет', text: 'Твой уровень, цели дня и фигура. Тапни карточку, чтобы развернуть весь прогресс.' },
  { sel: '.home-stats', title: 'Метрики дня', text: 'Вода, серия дней, баллы и статус видны одним взглядом.' },
  { sel: '.today-dashboard', title: 'Статус дня', text: 'Калории, БЖУ, вода, тренировка и следующий шаг без лишних плиток.' },
  { sel: '.bottom-nav', title: 'Нижнее меню', text: 'Основные разделы всегда под рукой.' },
  { sel: '#tourBtn', title: 'Подсказки', text: 'Жми лампочку в любой момент, чтобы повторить экскурсию.' }
];
let coachEl = null;
let coachIdx = 0;
let coachScrollState = null;

function buildCoach(){
  if(coachEl) return coachEl;
  coachEl = document.createElement('div');
  coachEl.className = 'coach';
  coachEl.innerHTML = `
    <div class="coach-catch"></div>
    <div class="coach-spot"></div>
    <div class="coach-tip">
      <b class="coach-title"></b>
      <p class="coach-text"></p>
      <div class="coach-foot"><span class="coach-count"></span><span class="coach-btns"><button type="button" class="coach-skip">Пропустить</button><button type="button" class="coach-next">Далее</button></span></div>
      <span class="coach-arrow"></span>
    </div>`;
  document.body.appendChild(coachEl);
  const advance = () => { coachIdx++; if(coachIdx >= coachSteps.length) endCoach(); else showCoachStep(); };
  coachEl.querySelector('.coach-next').addEventListener('click', advance);
  coachEl.querySelector('.coach-catch').addEventListener('click', advance);
  coachEl.querySelector('.coach-skip').addEventListener('click', endCoach);
  return coachEl;
}

function showCoachStep(){
  const step = coachSteps[coachIdx];
  const el = document.querySelector(step.sel);
  if(!el){ coachIdx++; if(coachIdx >= coachSteps.length) endCoach(); else showCoachStep(); return; }
  el.scrollIntoView({ block: 'nearest' });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    const pad = 6;
    const spot = coachEl.querySelector('.coach-spot');
    spot.style.left = (r.left - pad) + 'px';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    const tip = coachEl.querySelector('.coach-tip');
    coachEl.querySelector('.coach-title').textContent = step.title;
    coachEl.querySelector('.coach-text').textContent = step.text;
    coachEl.querySelector('.coach-count').textContent = (coachIdx + 1) + ' / ' + coachSteps.length;
    coachEl.querySelector('.coach-next').textContent = coachIdx === coachSteps.length - 1 ? 'Готово' : 'Далее';
    const vw = window.innerWidth, vh = window.innerHeight;
    const safeTop = Math.max(12, Math.round((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-top')) || 0) + 10));
    const safeBottom = Math.max(12, Math.round((parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tg-safe-bottom')) || 0) + 12));
    const bottomNavRect = document.querySelector('.bottom-nav')?.getBoundingClientRect();
    const contentBottom = bottomNavRect && bottomNavRect.top < vh ? Math.min(vh - safeBottom, bottomNavRect.top - 10) : vh - safeBottom;
    const tipW = Math.min(300, vw - 24);
    tip.style.width = tipW + 'px';
    requestAnimationFrame(() => {
      const th = tip.offsetHeight;
      const below = (r.bottom + 14 + th) < contentBottom;
      let top = below ? r.bottom + 14 : r.top - 14 - th;
      top = Math.max(safeTop, Math.min(top, contentBottom - th));
      let left = r.left + r.width / 2 - tipW / 2;
      left = Math.max(12, Math.min(left, vw - 12 - tipW));
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      const arrow = coachEl.querySelector('.coach-arrow');
      const ax = Math.max(16, Math.min(r.left + r.width / 2 - left, tipW - 16));
      arrow.style.left = ax + 'px';
      tip.classList.toggle('below', below);
      tip.classList.toggle('above', !below);
    });
  }));
}

function afterLayoutReady(fn){
  requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(fn, 80)));
}

function startCoach(){
  buildCoach();
  if(document.querySelector('.screen.active')?.id !== 'today') jump('today');
  const app = $('app');
  coachScrollState = { app:app?.scrollTop || 0, page:document.scrollingElement?.scrollTop || 0 };
  coachIdx = 0;
  coachEl.classList.add('on');
  afterLayoutReady(showCoachStep);
}

function endCoach(){
  if(coachEl) coachEl.classList.remove('on');
  if(coachScrollState){
    const app = $('app');
    if(app) app.scrollTop = coachScrollState.app;
    if(document.scrollingElement) document.scrollingElement.scrollTop = coachScrollState.page;
    coachScrollState = null;
  }
  try{ WLStorage.setItem('primeBodyTourSeen', '1'); }catch{}
}

function bindTour(){
  const button = $('tourBtn');
  if(button) button.setAttribute('aria-label', 'Краткая экскурсия по платформе');
  button?.addEventListener('click', startCoach);
  $('homeTourBtn')?.addEventListener('click', startCoach);
  document.addEventListener('keydown', event => { if(event.key === 'Escape') endCoach(); });
  let resizeTimer = 0;
  const repositionCoach = () => {
    if(!coachEl?.classList.contains('on')) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => afterLayoutReady(showCoachStep), 80);
  };
  window.addEventListener('resize', repositionCoach, { passive:true });
  window.addEventListener('orientationchange', repositionCoach, { passive:true });
  window.visualViewport?.addEventListener('resize', repositionCoach, { passive:true });
  let seen = '0';
  try{ seen = WLStorage.getItem('primeBodyTourSeen') || '0'; }catch{}
  if(!pbSimpleUi() && seen !== '1') window.setTimeout(startCoach, 900);
}

function escapeHtml(value){
  return value.replace(/[&<>"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
}

let observer;
function observeReveals(){
  if(observer) observer.disconnect();
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.screen.active .reveal').forEach(el => observer.observe(el));
}

const PB_HORIZONTAL_SCROLL_SELECTOR = '.quick-scroll,.subnav,.chips-panel,.lib-frow,.lib-rail,.vid-tabs,.cam-ex,.cam-picker-groups,.diary-date-strip,.apple-health-key code,[data-horizontal-scroll]';
function pbLockHorizontalViewportGestures(){
  const app = $('app');
  if(!app || app.dataset.horizontalLock === 'on') return;
  app.dataset.horizontalLock = 'on';
  let gesture = null;
  app.addEventListener('touchstart', event => {
    if(event.touches.length !== 1){ gesture = null; return; }
    const touch = event.touches[0];
    const target = event.target instanceof Element ? event.target : null;
    gesture = {
      x:touch.clientX,
      y:touch.clientY,
      horizontalScroller:target?.closest(PB_HORIZONTAL_SCROLL_SELECTOR) || null
    };
  }, { passive:true });
  app.addEventListener('touchmove', event => {
    if(!gesture || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if(Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
    const rail = gesture.horizontalScroller;
    if(rail && rail.scrollWidth > rail.clientWidth) return;
    event.preventDefault();
  }, { passive:false });
  const reset = () => { gesture = null; };
  app.addEventListener('touchend', reset, { passive:true });
  app.addEventListener('touchcancel', reset, { passive:true });
}

bindStaticActions();
pbLockHorizontalViewportGestures();
pbInitSimpleNavigation();
bindForms();
bindButtons();
bindHero();
bindTour();
bindMeals();
bindLibrary();
bindGenerator();
bindSaved();
bindExtras();
syncNutritionHistoryOwner();
rolloverCheck();
hydrateForm();
bindAnketa();
renderHomeProfile();
renderPlan();
renderTasks();
renderMetrics();
renderHeaderTitle('today');
observeReveals();
window.addEventListener('load', observeReveals);

// Локальная Health-фикстура намеренно не создаёт anon-клиент и не отправляет аналитику.
const pbLocalHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(location.hostname || '').toLowerCase());
const pbHealthFixturePreview = pbLocalHost && window.PrimeBodyAppleHealth?.fixtureEnabled({ host: location.hostname, search: location.search });
if(pbHealthFixturePreview){
  pbHideSplash();
  window.PrimeBodyAppleHealth?.boot({
    sb: null, user: null, sbUrl: SB_URL, anonKey: SB_ANON,
    host: location.hostname, search: location.search,
    todayKey: dayKey(0), onData: pbReceiveAppleHealthData
  });
} else {
  // Аналитика + авторизация: старт сессии, гейт входа/регистрации, рассылки
  pbInit();
  if(sb && window.WLAccess) window.WLAccess.start(sb);
  if(pbPreviewMode()){
    pbProgressEpochReady = true;
    pbHideSplash();
    track('preview_open', 'today');
    if(pbLocalHost && new URLSearchParams(location.search).get('trial24_preview') === '1'){
      pbSubscription = {
        status:'trial',
        current_period_end:new Date(Date.now() + 17 * 3600000).toISOString(),
        last_payment_id:'trial24:preview',
        access_kind:'trial_24h'
      };
      pbRenderSubscriptionNotice();
      pbApplyTrial24Access();
      pbStartTrial24Clock();
    }
    window.PrimeBodyAppleHealth?.boot({
      sb, user: null, sbUrl: SB_URL, anonKey: SB_ANON,
      host: location.hostname, search: location.search,
      todayKey: dayKey(0), onData: pbReceiveAppleHealthData
    });
  } else {
    setTimeout(pbHideSplash, 18000);
    pbWebAuthBoot();
  }
}

function pbGetInitData(){
  try{ if(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) return window.Telegram.WebApp.initData; }catch(e){}
  try{ const d = new URLSearchParams((location.hash || '').replace(/^#/, '')).get('tgWebAppData'); if(d) return d; }catch(e){}
  return '';
}

function pbInTelegram(){ return !!pbGetInitData() || !!window.TelegramWebviewProxy; }

function pbSyncTelegramViewport(tg){
  try{
    tg = tg || (window.Telegram && window.Telegram.WebApp);
    const root = document.documentElement;
    if(!root || !tg) return;
    const safe = tg.safeAreaInset || tg.contentSafeAreaInset || {};
    const top = Number(safe.top || 0);
    const bottom = Number(safe.bottom || 0);
    const height = Number(tg.viewportStableHeight || tg.viewportHeight || 0);
    root.style.setProperty('--tg-safe-top', `${Math.max(0, top)}px`);
    root.style.setProperty('--tg-safe-bottom', `${Math.max(0, bottom)}px`);
    if(height > 0) root.style.setProperty('--tg-viewport-height', `${height}px`);
  }catch(e){}
}

function pbUpdateTelegramBack(id, forceVisible){
  if(!pbSimpleUi()) return;
  try{
    const webApp = window.Telegram?.WebApp;
    if(webApp?.isVersionAtLeast && !webApp.isVersionAtLeast('6.1')) return;
    const back = webApp?.BackButton;
    if(!back) return;
    if(forceVisible || (id && pbSimpleRoot(id) !== id)) back.show();
    else back.hide();
  }catch(e){}
}

function telegramShareText(text){ if(navigator.share)navigator.share({text}).catch(()=>{});else navigator.clipboard?.writeText(text).then(()=>toast('Скопировано')); }

function renderPhotoHome({ norm, eaten, profileReady, activeResume, workoutDone, readiness }){
  if(!$('homePhotoCalories')) return;
  $('app')?.classList.toggle('photo-home-active', $('today')?.classList.contains('active'));
  const week = primeWeekDateKeys();
  const completed = week.filter(date => dailyActivityForDate(date)?.workoutCompleted).length;
  const target = Number(state.profile?.days);
  const activityUnavailable = homeActivityStatus === 'loading' || homeActivityStatus === 'error';
  $('homePhotoWeek').textContent = !activityUnavailable && profileReady && Number.isFinite(target) && target > 0
    ? `${completed} / ${target}` : '—';
  $('homePhotoGoal').textContent = profileReady ? (state.profile?.goal || 'Не указана') : 'Заполни анкету';
  const minutes = Number(state.profile?.sessionMinutes);
  const recovery = readiness.mode === 'recovery' && !activeResume;
  const own = state.dayWorkoutDismissedDate === todayKey() && !activeResume;
  $('homePhotoDuration').textContent = profileReady && !recovery && !own && Number.isFinite(minutes) && minutes > 0 ? `≈ ${minutes} мин` : '—';
  const cta = !profileReady ? 'Завершить настройку' : activeResume ? 'Продолжить тренировку' : recovery ? 'Открыть восстановление' : own ? 'Мои тренировки' : 'Перейти к тренировке';
  $('homeTrainingCta').querySelector('span').textContent = cta;
  $('homeTrainingStatus').textContent = !profileReady ? `Продолжи анкету с шага ${anketaStep} из ${ANKETA_STEPS}.`
    : activeResume ? workoutResumeProgressText(activeResume)
    : homeActivityStatus === 'error' ? 'Результаты не загрузились. Повтори запрос ниже.'
    : workoutDone ? 'Тренировка выполнена. Результат сохранён.'
    : recovery ? 'Сегодня восстановительный день.'
    : own ? 'Выбери свою программу.' : '';
  const streak = Number(state.streak);
  const dayWord = streak % 100 >= 11 && streak % 100 <= 14 ? 'дней' : streak % 10 === 1 ? 'день' : streak % 10 >= 2 && streak % 10 <= 4 ? 'дня' : 'дней';
  $('homePhotoStreak').textContent = Number.isFinite(streak) && streak >= 0 ? `${streak} ${dayWord}` : '—';
  const loading = homeNutritionStatus === 'loading';
  const failed = homeNutritionStatus === 'error';
  const pct = profileReady && norm.kcal > 0 ? Math.min(100, Math.max(0, eaten.kcal / norm.kcal * 100)) : 0;
  $('homePhotoCalories').textContent = loading ? 'Загрузка…' : failed ? 'Недоступно' : `${Math.round(eaten.kcal)} / ${profileReady ? norm.kcal : '—'}`;
  $('homePhotoMacros').textContent = loading || failed ? 'Б — г · Ж — г · У — г' : `Б ${Math.round(eaten.p)} г · Ж ${Math.round(eaten.f)} г · У ${Math.round(eaten.c)} г`;
  $('homePhotoFoodStatus').textContent = failed ? 'Не удалось загрузить дневник.' : loading ? 'Загружаем дневник…' : !profileReady ? 'Норма появится после настройки.' : eaten.kcal === 0 ? 'Сегодня ещё нет записей.' : '';
  $('homePhotoRetry').hidden = !failed && homeActivityStatus !== 'error';
  $('homePhotoCaloriesFill').style.width = `${failed || loading ? 0 : pct}%`;
  $('homePhotoRing').style.setProperty('--home-calories', failed || loading ? 0 : pct);
  $('homePhotoRing').setAttribute('aria-valuenow', String(Math.round(failed || loading ? 0 : pct)));
  $('homePhotoRing').setAttribute('aria-valuetext', failed ? 'Данные недоступны' : loading ? 'Загрузка' : profileReady ? `${Math.round(eaten.kcal)} из ${norm.kcal} ккал` : 'Дневная норма не задана');
}

function setExerciseVideo(i){ const e=exerciseVideos[i];if(!e)return;toast('Открой видео из библиотеки упражнений'); }

function renderExerciseVideos(){
  const list = $('exList');
  if(!list) return;
  list.innerHTML = exerciseVideos.map((e, i) =>
    `<button type="button" class="ex-item${i === 0 ? ' active' : ''}" data-ex="${i}"><span class="ex-meta"><b>${escapeHtml(e.name)}</b><span>${escapeHtml(e.muscle)}</span></span><span class="ex-dur">${escapeHtml(e.dur || '')}</span></button>`
  ).join('');
  list.querySelectorAll('[data-ex]').forEach(btn => btn.addEventListener('click', () => setExerciseVideo(Number(btn.dataset.ex))));
}

function exerciseHasVideo(e){
  return typeof e?.videoSrc === 'string' && e.videoSrc.trim().length > 0;
}

function mediaReportProfileMeta(){
  const p = planFromProfile();
  return {
    profile_level: p.level || null,
    profile_place: p.place || null,
    profile_inventory: p.inv || null,
    has_medical_caution: hasMedicalCaution(p),
    has_diastasis_risk: hasDiastasisRisk(p)
  };
}

async function prepareReadyWorkout(idx, visited = new Set()){
  const workout = state.savedWorkouts[idx];
  if(workout?.kind !== 'ready' || currentWorkoutResume()) return idx;
  if(visited.has(workout.id)) return idx;
  visited.add(workout.id);
  const owner = workoutLogOwner();
  const signature = readyProgramProfileSignature(planFromProfile());
  if(workout.profileSignature && workout.profileSignature !== signature) return idx;
  const [catalog, library] = await Promise.all([ensureReadyPrograms(), ensureLibrary()]);
  if(!catalog || !library || owner !== workoutLogOwner() || state.savedWorkouts[idx] !== workout || currentWorkoutResume() || signature !== readyProgramProfileSignature(planFromProfile())) return idx;
  const program = catalog.programs.find(item => item.id === workout.programId);
  if(!program || !readyProgramAvailability(program, planFromProfile()).available) return idx;
  const days = workout.days || [];
  const dayIndex = days.findIndex(day => !(day.done || []).every(Boolean));
  if(dayIndex < 0){
    const nextIndex = state.savedWorkouts.findIndex(item => item.id === workout.nextWorkoutId && item.kind === 'ready' && item.profileSignature === signature);
    if(nextIndex >= 0){
      if(state.activeProgramId === workout.id){ state.activeProgramId = state.savedWorkouts[nextIndex].id; save(); }
      return prepareReadyWorkout(nextIndex, visited);
    }
    const built = buildReadyProgram(program, planFromProfile(), days.at(-1)?.items);
    if(!built.workout) return idx;
    state.savedWorkouts.push(built.workout);
    workout.nextWorkoutId = built.workout.id;
    if(state.activeProgramId === workout.id) state.activeProgramId = built.workout.id;
    save();
    return state.savedWorkouts.length - 1;
  }
  const day = days[dayIndex];
  if((day.done || []).some(Boolean)) return idx;
  const previousIndex = days.slice(0, dayIndex).findLastIndex(item => item.items?.length && item.done?.every(Boolean));
  if(previousIndex < 0 || day.rotationAfterDay === previousIndex) return idx;
  const session = program.sessions[dayIndex % program.sessions.length];
  const week = program.weeks[(day.programWeek || 1) - 1];
  if(!session || !week) return idx;
  const picked = readyProgramSessionExercises(session, planFromProfile(), new Set(days[previousIndex].items.map(item => item.id)));
  if(picked.length < Math.min(3, Number(session.count) || 1)) return idx;
  day.items = workoutItems(picked, readyProgramWeekScheme(program, week, planFromProfile()));
  day.done = day.items.map(() => false);
  day.rotationAfterDay = previousIndex;
  save();
  return idx;
}

function pbRecipeNavigation(recipeId = 'catalog', replace = false){
  const next = { pbScreen:'nutrition', pbRecipe:recipeId, pbRecipePP:$('nutrition').dataset.nutritionView === 'desserts' };
  try{ history[replace ? 'replaceState' : 'pushState'](next, '', location.href); }catch(e){}
  pbUpdateTelegramBack('nutrition', true);
}

function pbRecipeBack(){
  if(history.state?.pbRecipe){ history.back(); return; }
  recipeExperience?.show();
  switchNutritionView('main');
  pbUpdateTelegramBack('nutrition');
}

function pbHandleRecipeHistory(event){
  if(event.state?.pbRecipe){
    jump('nutrition', { historyMode:'pop', restoreScroll:true });
    openRecipeCatalog({ history:false, pp:!!event.state.pbRecipePP, recipeId:event.state.pbRecipe === 'catalog' ? null : event.state.pbRecipe });
    return true;
  }
  if(!$('recipeCatalogPanel')?.hidden){
    recipeExperienceToken++;
    switchNutritionView('main');
  }
  return false;
}
