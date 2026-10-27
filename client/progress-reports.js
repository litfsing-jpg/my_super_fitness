let periodReportDays = 7;
let periodReportOffset = 0;
let periodReportCache = null;

function reportDateShift(day, amount){
  const date = new Date(day + 'T12:00:00');
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function reportDateDistance(from, to){
  return Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
}
function periodReportRange(today, days = 7, offset = 0){
  const length = days === 30 ? 30 : 7;
  const end = reportDateShift(today, -1 - Math.max(0, Math.trunc(offset)) * length);
  const dates = Array.from({length}, (_, i) => reportDateShift(end, i - length + 1));
  return { from:dates[0], to:end, dates, length };
}
function periodReportGrade(score){
  if(score == null) return { label:'Пока без оценки', tone:'unknown' };
  if(score < 25) return { label:'Очень плохо', tone:'low' };
  if(score < 45) return { label:'Плохо', tone:'low' };
  if(score < 65) return { label:'Удовлетворительно', tone:'medium' };
  if(score < 85) return { label:'Хорошо', tone:'good' };
  return { label:'Отлично, ты титан во плоти', tone:'great' };
}
function periodReportRangeLabel(range){
  const firstYear = range.from.slice(0, 4), lastYear = range.to.slice(0, 4);
  return `${diaryDateLabel(range.from)}${firstYear !== lastYear ? ', ' + firstYear : ''} — ${diaryDateLabel(range.to)}, ${lastYear}`;
}
function periodWeightTrend(measures, range){
  const byDate = new Map();
  for(const row of measures || []){
    const date = String(row?.date || '').slice(0, 10), weight = Number(row?.weight);
    if(range.dates.includes(date) && Number.isFinite(weight) && weight > 0) byDate.set(date, { date, weight });
  }
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if(points.length < 2) return { delta:null, weekly:null, last:null, reason:'Для динамики нужны хотя бы два замера веса в этом периоде.' };
  const first = points[0], last = points[points.length - 1];
  const delta = +(last.weight - first.weight).toFixed(1);
  if(points.length < 3 || reportDateDistance(first.date, last.date) < 14 || reportDateDistance(last.date, range.to) > 7){
    return { delta, weekly:null, last, reason:'Для численного прогноза нужны минимум три замера за 14 дней и свежий замер в последнюю неделю периода.' };
  }
  const xs = points.map(p => reportDateDistance(first.date, p.date));
  const meanX = xs.reduce((a,b) => a + b, 0) / points.length;
  const meanY = points.reduce((sum,p) => sum + p.weight, 0) / points.length;
  const slope = points.reduce((sum,p,i) => sum + (xs[i] - meanX) * (p.weight - meanY), 0) / xs.reduce((sum,x) => sum + (x - meanX) ** 2, 0);
  const weekly = slope * 7;
  // Large or erratic changes are not a sound basis for linear extrapolation.
  const residual = Math.sqrt(points.reduce((sum,p,i) => sum + (p.weight - meanY - slope * (xs[i] - meanX)) ** 2, 0) / points.length);
  if(Math.abs(weekly) > last.weight * .01 || residual > last.weight * .015){
    return { delta, weekly:null, last, reason:'Вес меняется слишком резко или неравномерно для надёжного численного прогноза.' };
  }
  return { delta, weekly, last, reason:'' };
}
function buildPeriodReport({ range, days, norm, plannedDays, measures = [], complete = true }){
  const positive = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const target = positive(norm.kcal);
  const targetProtein = positive(norm.protein);
  const recorded = days.filter(d => positive(d.kcal) > 0);
  // A very short food log may be a partial day, not a failure to follow the plan.
  const comparable = recorded.filter(d => target > 0 && d.kcal >= target * .6);
  const partialDays = recorded.length - comparable.length;
  const average = key => recorded.length ? Math.round(recorded.reduce((sum,d) => sum + positive(d[key]), 0) / recorded.length) : null;
  const onTarget = comparable.filter(d => d.kcal >= target * .85 && d.kcal <= target * 1.12).length;
  const proteinDays = comparable.filter(d => targetProtein > 0 && d.p >= targetProtein * .9).length;
  const workoutDays = days.filter(d => d.workouts > 0).length;
  const workouts = days.reduce((sum,d) => sum + positive(d.workouts), 0);
  const scheduled = Math.min(7, positive(plannedDays));
  const expectedWorkouts = scheduled > 0 ? Math.max(1, Math.round(scheduled * range.length / 7)) : 0;
  const nutritionScore = comparable.length && targetProtein > 0 ? Math.round(100 * (.75 * onTarget / comparable.length + .25 * proteinDays / comparable.length)) : null;
  const trainingScore = expectedWorkouts ? Math.min(100, Math.round(workoutDays / expectedWorkouts * 100)) : null;
  const requiredDays = Math.ceil(range.length * .7);
  const enough = comparable.length >= requiredDays && nutritionScore !== null && trainingScore !== null;
  const score = complete && enough ? Math.round(nutritionScore * .6 + trainingScore * .4) : null;
  const grade = periodReportGrade(score);
  const trend = periodWeightTrend(measures, range);
  const forecastRange = { ...range, dates:Array.from({length:30}, (_, i) => reportDateShift(range.to, i - 29)) };
  const forecastTrend = periodWeightTrend(measures, forecastRange);
  const advice = !complete ? 'История загружена не полностью. Оценка появится после обновления.'
    : !enough ? `Для оценки нужно хотя бы ${requiredDays} дней с достаточными записями питания и заданный план тренировок.`
    : trainingScore < 70 ? 'В этом периоде выполнена небольшая часть тренировочного плана. Следующий ориентир: вернуться к частоте из анкеты, без удвоенных тренировок за пропуски.'
    : nutritionScore < 70 ? 'Тренировки уже есть. Основное расхождение с планом сейчас в записанном питании: калориях или белке.'
    : 'Питание и тренировки близки к плану. Сохраняй этот ритм и отслеживай замеры.';
  let forecast = score == null ? 'Пока недостаточно данных, чтобы связать результат с выполнением плана.'
    : score >= 85 ? 'По записям план выполняется стабильно.'
    : score >= 65 ? 'По записям большая часть плана выполняется, но ритм пока неустойчив.'
    : 'По записям план выполняется нерегулярно; срок достижения цели пока оценить нельзя.';
  let projectedWeight = null;
  if(score != null && forecastTrend.weekly !== null){
    projectedWeight = +(forecastTrend.last.weight + forecastTrend.weekly * 4).toFixed(1);
    forecast += ` При сохранении динамики замеров за последние 30 дней вес через 4 недели после ${diaryDateLabel(forecastTrend.last.date)}: около ${projectedWeight.toFixed(1)} кг. Это линейный ориентир, не обещание и не оценка роста мышц.`;
  }else forecast += ' ' + (forecastTrend.reason || 'Численный прогноз пока недоступен.');
  return { range, days, target, targetProtein, recordedDays:recorded.length, comparableDays:comparable.length, partialDays, requiredDays,
    averageKcal:average('kcal'), averageP:average('p'), averageF:average('f'), averageC:average('c'), onTarget, proteinDays,
    workouts, workoutDays, expectedWorkouts, nutritionScore, trainingScore, score, grade, advice, forecast, trend, forecastTrend, projectedWeight };
}

function periodReportCurrent(cache){
  return !!cache && cache === periodReportCache && cache.owner === workoutLogOwner()
    && cache.epoch === (pbProgressEpochId || null) && !pbProgressResetting;
}
function invalidatePeriodReport(resetPeriod = true){
  periodReportCache = null;
  if(resetPeriod) periodReportOffset = 0;
  for(const id of ['periodReportContent','periodReportStatus','periodReportRange','periodReportWindow']){
    if($(id)) $(id).textContent = '';
  }
  if($('periodForecastSummary')) $('periodForecastSummary').textContent = 'Нет данных для прогноза.';
  if($('periodReportShare')) $('periodReportShare').disabled = true;
}
function refreshPeriodReportAfterNutritionSave(dates){
  const cache = periodReportCache;
  const changed = Array.isArray(dates) ? dates : [dates];
  if(!periodReportCurrent(cache) || !changed.some(date => cache.range.dates.includes(date))) return;
  if($('reports')?.classList.contains('active') || $('forecast')?.classList.contains('active')) loadPeriodReport();
  else invalidatePeriodReport(false);
}
function periodReportCloudAvailable(){
  return Boolean(sb && pbUser && pbProgressEpochReady && !pbProgressResetting && navigator.onLine !== false);
}
async function periodReportRows(cache, table, fields, dateColumn, orderColumn, bounds = cache.range){
  const rows = [];
  for(let offset = 0; ; offset += 250){
    let query = sb.from(table).select(fields).eq('user_id', cache.owner);
    query = cache.epoch ? query.eq('progress_epoch', cache.epoch) : query.is('progress_epoch', null);
    query = query.gte(dateColumn, bounds.from).lte(dateColumn, bounds.to).order(dateColumn, { ascending:true });
    if(orderColumn !== dateColumn) query = query.order(orderColumn, { ascending:true });
    const { data, error } = await query.range(offset, offset + 249);
    if(!periodReportCurrent(cache)) return [];
    if(error || !Array.isArray(data)) throw new Error('report_load_failed');
    rows.push(...data.filter(row => row.user_id === cache.owner));
    if(data.length < 250) return rows;
  }
}
async function loadPeriodReport(){
  bindPeriodReport();
  const range = periodReportRange(dayKey(0), periodReportDays, periodReportOffset);
  const cache = periodReportCache = { owner:workoutLogOwner(), epoch:pbProgressEpochId || null, range,
    nutrition:[], activity:[], sessions:[], measures:[], loading:periodReportCloudAvailable(), loaded:false, error:false };
  renderPeriodReport();
  if(!cache.loading) return;
  try{
    const [nutrition, activity, sessions, measures] = await Promise.all([
      periodReportRows(cache, 'pb_nutrition_snapshots', 'user_id,day,kcal,protein,fat,carb', 'day', 'day'),
      periodReportRows(cache, 'pb_daily_activity_snapshots', 'user_id,day,workout_completed', 'day', 'day'),
      periodReportRows(cache, 'pb_workout_sessions', 'id,user_id,local_day,status', 'local_day', 'id'),
      periodReportRows(cache, 'pb_body_checks', 'id,user_id,local_day,weight_kg', 'local_day', 'id', {from:reportDateShift(range.to, -29), to:range.to})
    ]);
    if(!periodReportCurrent(cache)) return;
    Object.assign(cache, { nutrition, activity, sessions, measures, loaded:true });
  }catch(e){
    if(!periodReportCurrent(cache)) return;
    cache.error = true;
  }
  if(!periodReportCurrent(cache)) return;
  cache.loading = false;
  renderPeriodReport();
}
function periodReportData(cache){
  const nutrition = new Map(cache.nutrition.map(row => [row.day, nutritionRecordFromRow(row)]));
  const activity = new Map(cache.activity.map(row => [row.day, normalizeDailyActivityRow(row)]));
  const sessions = mergeWorkoutArchiveRows(cache.sessions.map(normalizeWorkoutArchiveSession), workoutLogStore().sessions.map(normalizeWorkoutArchiveSession), cache.owner);
  const days = cache.range.dates.map(date => {
    const candidate = state.history?.[date];
    const local = isNutritionHistoryRecord(candidate, date) ? candidate : null;
    const remote = nutrition.get(date);
    const record = local?.pending || !remote ? local : remote;
    const act = activity.get(date);
    const count = sessions.filter(row => row.localDay === date && row.status === 'completed').length;
    return { date, kcal:+record?.kcal || 0, p:+record?.p || 0, f:+record?.f || 0, c:+record?.c || 0,
      workouts:Math.max(count, act?.workoutCompleted ? 1 : 0) };
  });
  const plan = planFromProfile();
  return buildPeriodReport({ range:cache.range, days, norm:computeNorm(plan, state.kcalCut || 0), plannedDays:plan.days,
    measures:cache.measures.map(row => ({date:row.local_day, weight:row.weight_kg})), complete:cache.loaded && !cache.loading && !cache.error });
}
function periodReportHtml(data){
  const value = n => n == null ? 'Нет данных' : String(n);
  const signed = n => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
  const cells = [
    ['Питание записано', `${data.recordedDays} / ${data.range.length} дней`],
    ['Средние калории', data.averageKcal == null ? 'Нет данных' : `${data.averageKcal} ккал`],
    ['Белки / жиры / углеводы', data.averageP == null ? 'Нет данных' : `${data.averageP} / ${data.averageF} / ${data.averageC} г`],
    ['Калории в пределах плана', `${data.onTarget} / ${data.comparableDays} дней`],
    ['Дни тренировок / план', `${data.workoutDays} / ${data.expectedWorkouts || '—'}`],
    ['Динамика веса', data.trend.delta == null ? 'Нет данных' : `${signed(data.trend.delta)} кг`]
  ];
  const rows = [...data.days].reverse().map(d => `<tr><th scope="row">${escapeHtml(diaryDateLabel(d.date))}</th><td>${d.kcal > 0 ? Math.round(d.kcal) : '—'}</td><td>${d.kcal > 0 ? Math.round(d.p) : '—'}</td><td>${d.workouts || '—'}</td></tr>`).join('');
  return `<div class="period-report-grade" data-tone="${data.grade.tone}"><div><span>Выполнение плана</span><h3>${data.grade.label}</h3></div><b>${data.score == null ? '—' : data.score}<small>${data.score == null ? '' : '/ 100'}</small></b></div>
    <p class="period-report-advice">${escapeHtml(data.advice)}</p>
    <dl class="period-report-metrics">${cells.map(([label,text]) => `<div><dt>${label}</dt><dd>${text}</dd></div>`).join('')}</dl>
    <div class="period-report-forecast"><h3>Прогноз результата</h3><p>${escapeHtml(data.forecast)}</p></div>
    <details class="period-report-details"><summary>Питание и тренировки по дням</summary><table><thead><tr><th scope="col">Дата</th><th scope="col">Ккал</th><th scope="col">Белок, г</th><th scope="col">Трен.</th></tr></thead><tbody>${rows}</tbody></table><p>«—» означает отсутствие записи, а не нулевое питание. Завершённых тренировок: ${data.workouts}.</p></details>
    <details class="period-report-details"><summary>Из чего складывается оценка</summary><p>Питание: 60% оценки, тренировки: 40%. Питание учитывает долю дней в диапазоне 85–112% нормы калорий (75%) и с белком от 90% нормы (25%). Тренировки: дни с завершённым занятием относительно частоты из анкеты. Несколько занятий в день не заменяют пропущенные дни.</p><p>Питание: ${value(data.nutritionScore)} / 100. Тренировки: ${value(data.trainingScore)} / 100. Сравнение с текущим планом: ${data.target} ккал и ${data.targetProtein} г белка. Исторические нормы могут отличаться.</p><p>Для оценки нужны записи минимум за 70% периода. Дни ниже 60% нормы считаются потенциально неполными и исключаются, а не получают плохой балл. Таких дней: ${data.partialDays}. Остальные записи тоже могут быть неполными: оценка отражает дневник, а не состояние здоровья.</p><p>0–24: очень плохо; 25–44: плохо; 45–64: удовлетворительно; 65–84: хорошо; 85–100: отлично.</p></details>`;
}
function renderPeriodReport(){
  const cache = periodReportCache;
  if(!periodReportCurrent(cache)) return;
  const rangeLabel = periodReportRangeLabel(cache.range);
  if($('periodReportRange')) $('periodReportRange').textContent = rangeLabel;
  if($('periodReportWindow')) $('periodReportWindow').textContent = `${cache.range.length} завершённых дней · сегодня не включено`;
  const status = cache.loading ? 'Загружаю историю…' : cache.error ? 'Не удалось загрузить отчёт полностью. Нажми «Обновить отчёт», чтобы повторить.'
    : !cache.loaded ? 'Показаны доступные записи с этого устройства. Для оценки нужны вход и загрузка полной истории.' : '';
  if($('periodReportStatus')) $('periodReportStatus').textContent = status;
  $('periodReportContent')?.setAttribute('aria-busy', String(cache.loading));
  const data = periodReportData(cache);
  const details = [...($('periodReportContent')?.querySelectorAll('details') || [])].map(el => el.open);
  if($('periodReportContent')){
    $('periodReportContent').innerHTML = periodReportHtml(data);
    $('periodReportContent').querySelectorAll('details').forEach((el,i) => { el.open = !!details[i]; });
  }
  if($('periodForecastSummary')) $('periodForecastSummary').textContent = `${rangeLabel}. ${data.forecast}`;
  if($('periodReportNext')) $('periodReportNext').disabled = periodReportOffset === 0;
  if($('periodReportRefresh')) $('periodReportRefresh').disabled = cache.loading;
  if($('periodReportShare')) $('periodReportShare').disabled = cache.loading || !(data.recordedDays || data.workouts);
  document.querySelectorAll('[data-report-period]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.reportPeriod === periodReportDays)));
}
function bindPeriodReport(){
  const root = $('weeklyInsightCard');
  if(!root || root.dataset.reportBound) return;
  root.dataset.reportBound = '1';
  root.querySelectorAll('[data-report-period]').forEach(button => button.addEventListener('click', () => {
    periodReportDays = +button.dataset.reportPeriod === 30 ? 30 : 7;
    periodReportOffset = 0;
    loadPeriodReport();
  }));
  $('periodReportPrev')?.addEventListener('click', () => { periodReportOffset++; loadPeriodReport(); });
  $('periodReportNext')?.addEventListener('click', () => { if(periodReportOffset > 0){ periodReportOffset--; loadPeriodReport(); } });
  $('periodReportRefresh')?.addEventListener('click', loadPeriodReport);
  $('periodReportShare')?.addEventListener('click', () => {
    if(!periodReportCurrent(periodReportCache)) return;
    const data = periodReportData(periodReportCache);
    telegramShareText(`Мой отчёт в Прайм-тело: ${periodReportRangeLabel(data.range)}. Питание: ${data.recordedDays}/${data.range.length} дней; тренировки: ${data.workoutDays}/${data.expectedWorkouts} дней по плану. ${data.grade.label}${data.score == null ? '' : ` · ${data.score}/100`}.`);
  });
}
