const WORKOUT_ARCHIVE_PAGE_SIZE = 20;
const WORKOUT_ARCHIVE_SET_PAGE_SIZE = 250;
const WORKOUT_ARCHIVE_SESSION_FIELDS = 'id,user_id,local_day,title,source,source_workout_id,started_at,completed_at,status';
const WORKOUT_ARCHIVE_SET_FIELDS = 'id,session_id,user_id,exercise_id,exercise_name,equipment,exercise_index,set_index,target_reps_min,target_reps_max,actual_reps,weight_kg,load_mode,completed_at';
let workoutArchiveCache = null;

function invalidateWorkoutArchive(){
  workoutArchiveCache = null;
  if($('workoutArchiveDetail')) closeSheet({ restoreFocus:false });
  for(const id of ['workoutArchiveList', 'workoutArchiveCount', 'workoutArchiveNotice']){
    const element = $(id);
    if(element) element.textContent = '';
  }
  $('workoutArchiveList')?.setAttribute('aria-busy', 'false');
  for(const id of ['workoutArchiveMore', 'workoutArchiveRetry']){
    const element = $(id);
    if(element) element.hidden = true;
  }
  if($('workoutArchiveRefresh')) $('workoutArchiveRefresh').disabled = false;
}
function workoutArchiveScope(){
  return { owner:workoutLogOwner(), epoch:pbProgressEpochId || null };
}
function workoutArchiveCurrent(cache){
  const scope = workoutArchiveScope();
  return cache === workoutArchiveCache && cache.owner === scope.owner && cache.epoch === scope.epoch && !pbProgressResetting;
}
function normalizeWorkoutArchiveSession(row){
  return {
    id:String(row.id || ''), userId:String(row.userId || row.user_id || ''),
    localDay:String(row.localDay || row.local_day || ''), title:String(row.title || 'Тренировка'),
    source:String(row.source || ''), startedAt:String(row.startedAt || row.started_at || ''),
    completedAt:row.completedAt || row.completed_at || null,
    status:String(row.status || 'in_progress'), synced:row.synced !== false
  };
}
function mergeWorkoutArchiveRows(remote, local, owner){
  const rows = new Map();
  for(const row of remote) if(row.id && row.userId === owner) rows.set(row.id, row);
  for(const row of local){
    if(!row.id || row.userId !== owner) continue;
    if(!rows.has(row.id) || row.synced === false) rows.set(row.id, row);
  }
  return [...rows.values()];
}
function workoutArchiveSessions(cache){
  const local = workoutLogStore().sessions.map(normalizeWorkoutArchiveSession);
  return mergeWorkoutArchiveRows(cache.sessions, local, cache.owner)
    .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.localDay))
    .filter(row => !cache.month || row.localDay.startsWith(cache.month + '-'))
    .filter(row => cache.status === 'all' || (cache.status === 'completed' ? row.status === 'completed' : row.status !== 'completed'))
    .sort((a, b) => b.localDay.localeCompare(a.localDay) || b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));
}
function workoutArchiveMonthBounds(month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, value] = month.split('-').map(Number);
  const next = value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, '0')}`;
  return { from:month + '-01', to:next + '-01' };
}
function workoutArchiveDate(day, options){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Дата не указана';
  return new Date(day + 'T12:00:00').toLocaleDateString('ru-RU', options || { day:'numeric', month:'long', year:'numeric' });
}
function workoutArchiveTime(value){
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }) : '';
}
function workoutArchiveStatus(status){
  return ({ completed:'Завершена', abandoned:'Не завершена', in_progress:'Не завершена' })[status] || 'Не завершена';
}
function workoutArchiveQuery(table, fields, cache){
  let query = sb.from(table).select(fields).eq('user_id', cache.owner);
  query = cache.epoch ? query.eq('progress_epoch', cache.epoch) : query.is('progress_epoch', null);
  return query;
}
async function loadWorkoutArchivePage(cache){
  let query = workoutArchiveQuery('pb_workout_sessions', WORKOUT_ARCHIVE_SESSION_FIELDS, cache);
  if(cache.status === 'completed') query = query.eq('status', 'completed');
  else if(cache.status === 'unfinished') query = query.in('status', ['in_progress', 'abandoned']);
  const bounds = workoutArchiveMonthBounds(cache.month);
  if(bounds) query = query.gte('local_day', bounds.from).lt('local_day', bounds.to);
  const { data, error } = await query.order('local_day', { ascending:false }).order('started_at', { ascending:false })
    .order('id', { ascending:false }).range(cache.offset, cache.offset + WORKOUT_ARCHIVE_PAGE_SIZE - 1);
  if(error || !Array.isArray(data)) throw new Error('workout_archive_load_failed');
  return data.map(normalizeWorkoutArchiveSession);
}
function workoutArchiveCloudAvailable(){
  return Boolean(sb && pbUser && pbProgressEpochReady && !pbProgressResetting && navigator.onLine !== false);
}
function paintWorkoutArchive(cache){
  if(!workoutArchiveCurrent(cache) || !$('workoutArchiveList')) return;
  const rows = workoutArchiveSessions(cache);
  const list = $('workoutArchiveList');
  let lastMonth = '';
  list.innerHTML = rows.map(row => {
    const month = row.localDay.slice(0, 7);
    const heading = month !== lastMonth ? `<h3 class="workout-archive-month">${escapeHtml(workoutArchiveDate(row.localDay, { month:'long', year:'numeric' }))}</h3>` : '';
    lastMonth = month;
    const pending = row.synced === false ? '<span class="workout-archive-pending">Не синхронизировано</span>' : '';
    return `${heading}<button type="button" class="workout-archive-row" data-workout-session="${escapeHtml(row.id)}">
      <time datetime="${escapeHtml(row.localDay)}"><b>${Number(row.localDay.slice(-2))}</b><span>${escapeHtml(workoutArchiveDate(row.localDay, { weekday:'short' }))}</span></time>
      <span class="workout-archive-copy"><b>${escapeHtml(row.title)}</b><span>${escapeHtml(workoutArchiveTime(row.startedAt))}<span class="workout-archive-state${row.status === 'completed' ? ' is-complete' : ''}">${workoutArchiveStatus(row.status)}</span></span>${pending}</span>
      <span class="workout-archive-arrow" aria-hidden="true">›</span></button>`;
  }).join('') || (cache.loading ? '' : `<p class="workout-archive-empty">${cache.error ? 'История пока недоступна.' : !workoutArchiveCloudAvailable() ? 'На этом устройстве нет записей за выбранный период.' : 'За выбранный период тренировок нет.'}</p>`);
  list.setAttribute('aria-busy', String(cache.loading));
  list.querySelectorAll('[data-workout-session]').forEach(button => {
    button.addEventListener('click', () => openWorkoutArchiveSession(button.dataset.workoutSession));
  });
  $('workoutArchiveCount').textContent = rows.length ? `Показано: ${rows.length}` : '';
  $('workoutArchiveNotice').textContent = cache.loading ? 'Загружаю историю…' : cache.error
    ? 'Не удалось загрузить всю историю. Показаны доступные записи.'
    : !workoutArchiveCloudAvailable() ? 'Показаны записи с этого устройства. Для полной истории нужны вход и соединение.' : '';
  $('workoutArchiveRetry').hidden = !cache.error;
  $('workoutArchiveMore').hidden = !cache.hasMore;
  $('workoutArchiveMore').disabled = cache.loading;
  $('workoutArchiveRefresh').disabled = cache.loading;
}
async function loadWorkoutArchive(append = false){
  let cache = workoutArchiveCache;
  if(append && (!cache || !workoutArchiveCurrent(cache) || cache.loading)) return;
  if(!append){
    const month = $('workoutArchiveMonth')?.value || '';
    const status = $('workoutArchiveStatus')?.value || 'completed';
    cache = workoutArchiveCache = {
      ...workoutArchiveScope(), month:workoutArchiveMonthBounds(month) ? month : '',
      status:['all', 'completed', 'unfinished'].includes(status) ? status : 'completed',
      sessions:[], offset:0, hasMore:false, loading:false, error:false, detailRequest:0
    };
  }
  if(!workoutArchiveCloudAvailable()){ paintWorkoutArchive(cache); return; }
  cache.loading = true;
  cache.error = false;
  paintWorkoutArchive(cache);
  try{
    const rows = await loadWorkoutArchivePage(cache);
    if(!workoutArchiveCurrent(cache)) return;
    cache.sessions = mergeWorkoutArchiveRows([...cache.sessions, ...rows], [], cache.owner);
    cache.offset += rows.length;
    cache.hasMore = rows.length === WORKOUT_ARCHIVE_PAGE_SIZE;
  }catch(error){
    if(workoutArchiveCurrent(cache)) cache.error = true;
  }finally{
    if(workoutArchiveCurrent(cache)){ cache.loading = false; paintWorkoutArchive(cache); }
  }
}
function renderWorkoutArchive(){
  $('workoutArchiveMonth').onchange = () => loadWorkoutArchive();
  $('workoutArchiveStatus').onchange = () => loadWorkoutArchive();
  $('workoutArchiveClear').onclick = () => { $('workoutArchiveMonth').value = ''; loadWorkoutArchive(); };
  $('workoutArchiveRefresh').onclick = () => loadWorkoutArchive();
  $('workoutArchiveRetry').onclick = () => loadWorkoutArchive(Boolean(workoutArchiveCache?.offset));
  $('workoutArchiveMore').onclick = () => loadWorkoutArchive(true);
  return loadWorkoutArchive();
}
async function loadWorkoutArchiveSets(cache, sessionId){
  const rows = [];
  for(let offset = 0; ; offset += WORKOUT_ARCHIVE_SET_PAGE_SIZE){
    const { data, error } = await workoutArchiveQuery('pb_workout_sets', WORKOUT_ARCHIVE_SET_FIELDS, cache)
      .eq('session_id', sessionId).order('exercise_index').order('set_index').order('id')
      .range(offset, offset + WORKOUT_ARCHIVE_SET_PAGE_SIZE - 1);
    if(error || !Array.isArray(data)) throw new Error('workout_archive_sets_failed');
    if(!workoutArchiveCurrent(cache)) return [];
    rows.push(...data.map(row => normalizeWorkoutSetRow(row, true)).filter(row => row.userId === cache.owner && row.sessionId === sessionId));
    if(data.length < WORKOUT_ARCHIVE_SET_PAGE_SIZE) return rows;
  }
}
function workoutArchiveExerciseGroups(rows){
  const groups = new Map();
  for(const row of [...rows].sort((a, b) => a.exerciseIndex - b.exerciseIndex || a.setIndex - b.setIndex)){
    const key = JSON.stringify([row.exerciseIndex, row.exerciseId]);
    if(!groups.has(key)) groups.set(key, { name:row.exerciseName || 'Упражнение', equipment:row.equipment, rows:[] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}
function workoutArchiveWeight(row){
  if(row.weightKg == null) return 'Не указан';
  if(!Number.isFinite(Number(row.weightKg))) return 'Не указан';
  if(row.loadMode === 'bodyweight' && Number(row.weightKg) === 0) return 'Свой вес';
  return `${Number(row.weightKg).toLocaleString('ru-RU', { maximumFractionDigits:2 })} кг`;
}
function workoutArchiveSetsHtml(rows){
  const groups = workoutArchiveExerciseGroups(rows);
  if(!groups.length) return '<p class="workout-archive-empty">Записанных подходов нет.</p>';
  return `<p class="workout-archive-summary">Упражнений: ${groups.length} · Подходов: ${rows.length}</p>` + groups.map((group, index) => {
    const modes = new Set(group.rows.map(row => row.loadMode));
    const loadLabel = modes.size === 1 ? workoutLoadLabel(group.rows[0].loadMode) : 'Вес, кг';
    return `<section class="workout-archive-exercise"><h3>${index + 1}. ${escapeHtml(group.name)}</h3><p>${escapeHtml(group.equipment || '')}</p>
      <table><caption class="workout-archive-load-label">${escapeHtml(loadLabel)}</caption><thead><tr><th scope="col">Подход</th><th scope="col">Повторы</th><th scope="col">Вес</th></tr></thead><tbody>${group.rows.map(row => `<tr><th scope="row">${Number(row.setIndex)}</th><td>${Number(row.reps)}</td><td>${escapeHtml(workoutArchiveWeight(row))}</td></tr>`).join('')}</tbody></table></section>`;
  }).join('');
}
async function openWorkoutArchiveSession(sessionId){
  const cache = workoutArchiveCache;
  if(!cache || !workoutArchiveCurrent(cache)) return;
  const session = workoutArchiveSessions(cache).find(row => row.id === sessionId);
  if(!session) return;
  const request = ++cache.detailRequest;
  const localSets = () => workoutLogStore().sets.filter(row => row.userId === cache.owner && row.sessionId === sessionId);
  const date = workoutArchiveDate(session.localDay);
  const timing = workoutArchiveTime(session.startedAt);
  openSheet(`<div class="lib-sheet-head"><div><h2>${escapeHtml(session.title)}</h2><p>${escapeHtml(date)}${timing ? ` · ${escapeHtml(timing)}` : ''}</p></div><button type="button" class="lib-close" aria-label="Закрыть">×</button></div>
    <p class="workout-archive-detail-state">${workoutArchiveStatus(session.status)}${session.synced === false ? ' · Не синхронизировано' : ''}</p>
    <div id="workoutArchiveDetail" data-session-id="${escapeHtml(sessionId)}"><p id="workoutArchiveDetailNotice" role="status"></p><div id="workoutArchiveSets"></div><button type="button" class="secondary" id="workoutArchiveDetailRetry" hidden>Повторить загрузку</button></div>`);
  const root = $('workoutArchiveDetail');
  const current = () => workoutArchiveCurrent(cache) && request === cache.detailRequest && root === $('workoutArchiveDetail');
  const paint = (rows, notice) => {
    if(!current()) return;
    $('workoutArchiveSets').innerHTML = workoutArchiveSetsHtml(rows);
    $('workoutArchiveDetailNotice').textContent = notice;
  };
  $('workoutArchiveDetailRetry').onclick = () => openWorkoutArchiveSession(sessionId);
  paint(localSets(), workoutArchiveCloudAvailable() ? 'Загружаю подходы…' : 'Нет связи с сервером. Данные с этого устройства могут быть неполными.');
  if(!workoutArchiveCloudAvailable()) return;
  try{
    const remote = await loadWorkoutArchiveSets(cache, sessionId);
    if(!current()) return;
    const rows = mergeWorkoutArchiveRows(remote, localSets(), cache.owner);
    paint(rows, rows.some(row => row.synced === false) ? 'Есть подходы, ожидающие синхронизации.' : '');
  }catch(error){
    if(!current()) return;
    paint(localSets(), 'Не удалось загрузить все подходы. Данные с этого устройства могут быть неполными.');
    $('workoutArchiveDetailRetry').hidden = false;
  }
}
function bindWorkoutArchiveResult(overlay){
  const actions = overlay?.querySelector('.wkp-actions');
  if(!actions) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wkp-skip';
  button.textContent = 'История тренировок';
  button.addEventListener('click', () => { overlay.hidden = true; overlay.innerHTML = ''; jump('workout-history'); });
  actions.append(button);
}
