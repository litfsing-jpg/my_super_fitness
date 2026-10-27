(() => {
  if (document.documentElement.dataset.pbUi !== 'simple') return;
  document.documentElement.dataset.fitnessTheme = 'true';
  const byId = id => document.getElementById(id);
  const app = byId('app');
  app.dataset.fitness = 'true';

  const header = app.querySelector('.app-header');
  header.querySelector('.header-copy > span').textContent = window.WL_CONFIG.brand.name;

  const intro = byId('today').querySelector('.simple-day-intro');
  byId('simpleDayTitle').textContent = `Привет, ${String(state.profile.name || 'Участник').split(' ')[0]}`;
  const week = document.createElement('div');
  week.className = 'fit-week';
  week.setAttribute('aria-label', 'Дневник за последние семь дней');
  for (let offset = -6; offset <= 0; offset++) {
    const date = new Date(); date.setDate(date.getDate() + offset);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = offset === 0 ? 'selected' : '';
    button.setAttribute('aria-label', new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long'}).format(date));
    if (!offset) button.setAttribute('aria-current','date');
    const day = document.createElement('span');
    day.textContent = new Intl.DateTimeFormat('ru-RU',{weekday:'short'}).format(date);
    const number = document.createElement('b'); number.textContent = date.getDate();
    button.append(day,number);
    button.addEventListener('click', () => {if(setNutritionSelectedDate(dayKey(-offset))) jump('nutrition');});
    week.append(button);
  }
  intro.append(week);

  const activity = document.createElement('article');
  activity.className = 'fit-activity';
  activity.setAttribute('aria-label','Активность сегодня');
  activity.innerHTML = '<div class="fit-section-heading"><h2>Твой ритм сегодня</h2><button type="button" aria-label="Открыть прогресс" title="Открыть прогресс">↗</button></div><div class="fit-activity-body"><div class="fit-rings" role="img" aria-label="Питание, вода и тренировка"><i class="fit-ring fit-ring-food"></i><i class="fit-ring fit-ring-water"></i><i class="fit-ring fit-ring-training"></i><span>Сегодня</span></div><dl><div><dt><i class="fit-dot fit-dot-food"></i>Питание</dt><dd id="fitFoodValue"></dd><small id="fitFoodTarget"></small></div><div><dt><i class="fit-dot fit-dot-water"></i>Вода</dt><dd id="fitWaterValue"></dd><small id="fitWaterTarget"></small></div><div><dt><i class="fit-dot fit-dot-training"></i>Тренировка</dt><dd id="fitWorkoutValue"></dd><small id="fitWorkoutTarget"></small></div></dl></div>';
  activity.querySelector('button').addEventListener('click', () => jump('reports'));
  activity.querySelector('button').replaceChildren(byId('today').querySelector('.home-photo-cta svg').cloneNode(true));
  const dashboard = byId('today').querySelector('.today-dashboard');
  dashboard.prepend(activity);

  const heading = document.createElement('h2');
  heading.className = 'fit-next-heading'; heading.textContent = 'Твой следующий шаг';
  dashboard.insertBefore(heading, dashboard.querySelector('.today-focus-card'));

  const training = byId('training');
  const trainingTitle = document.createElement('div');
  trainingTitle.className = 'fit-page-intro';
  trainingTitle.innerHTML = '<span>Движение в твоём ритме</span><h1>Тренировки</h1>';
  training.prepend(trainingTitle);
  const workoutCover = document.createElement('img');
  workoutCover.className = 'fit-workout-cover';
  workoutCover.src = 'assets/neutral/training.png';
  workoutCover.alt = 'Силовая тренировка';
  training.querySelector('.workout-card').prepend(workoutCover);
  for (const [index,button] of [...training.querySelectorAll('.simple-section-menu > button')].entries()) {
    const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy';
    image.src = ['assets/neutral/training.png','assets/neutral/training.png','assets/neutral/training.png'][index];
    button.prepend(image);
  }

  const nutrition = byId('nutrition');
  const nutritionIntro = nutrition.querySelector('.simple-screen-intro');
  nutritionIntro.querySelector('h1').textContent = 'Питание';
  nutritionIntro.querySelector('p').textContent = 'Вкусно есть. Двигаться к своей цели.';
  nutrition.querySelector('.diary-date-panel').after(nutrition.querySelector('.nutrition-kcal-card'));

  const progress = byId('reports');
  progress.querySelector('.simple-screen-intro > span').textContent = 'Каждый шаг имеет значение';
  const progressButton = app.querySelector('.bottom-nav [data-jump="reports"]');
  progressButton.classList.remove('classic-nav-only');
  progressButton.classList.add('fit-progress-nav');
  progressButton.setAttribute('aria-label','Прогресс');
  progressButton.querySelector('b').textContent = 'Прогресс';
  const progressIcon = byId('today').querySelector('.today-status:nth-child(2) svg').cloneNode(true);
  progressIcon.setAttribute('class','tab-icon');
  progressButton.querySelector('svg').replaceWith(progressIcon);

  function syncNavigation() {
    const screen = document.querySelector('.screen.active')?.id;
    const buttons = [...app.querySelectorAll('.bottom-nav button')];
    const parent = ['reports','bodymap','forecast'].includes(screen)
      ? 'reports'
      : buttons.find(button => button.classList.contains('active') && button !== progressButton)?.dataset.jump || 'today';
    for (const button of buttons) {
      button.classList.toggle('active',button.dataset.jump === parent);
      if (button.dataset.jump === parent) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
  }
  const navigationObserver = new MutationObserver(syncNavigation);
  for (const screen of app.querySelectorAll('.screen')) navigationObserver.observe(screen,{attributes:true,attributeFilter:['class']});
  syncNavigation();

  function syncActivity() {
    byId('simpleDayTitle').textContent = `Привет, ${String(state.profile.name || 'Участник').split(' ')[0]}`;
    const norm = computeNorm(planFromProfile(),state.kcalCut || 0);
    const record = nutritionRecordDraftForDate(dayKey(0));
    const food = nutritionTotalsFor(record.items);
    const water = Math.max(0,Number(record.water)||0);
    const waterGoal = waterTargetLiters(planFromProfile());
    const done = !!dailyActivityForDate(dayKey(0))?.workoutCompleted || !!(state.tasks || []).find(task => task.key === 'workout' && task.done);
    const ring = activity.querySelector('.fit-rings');
    ring.style.setProperty('--food',Math.min(100, food.kcal / norm.kcal * 100));
    ring.style.setProperty('--water',Math.min(100, water / waterGoal * 100));
    ring.style.setProperty('--training',done ? 100 : 0);
    ring.setAttribute('aria-label',`Питание ${Math.round(food.kcal)} из ${norm.kcal} ккал, вода ${water.toFixed(1)} из ${waterGoal.toFixed(1)} л, тренировка ${done ? 'выполнена' : 'впереди'}`);
    byId('fitFoodValue').textContent = Math.round(food.kcal).toLocaleString('ru-RU') + ' ккал';
    byId('fitFoodTarget').textContent = `из ${norm.kcal.toLocaleString('ru-RU')}`;
    byId('fitWaterValue').textContent = water.toFixed(1) + ' л';
    byId('fitWaterTarget').textContent = `из ${waterGoal.toFixed(1)} л`;
    byId('fitWorkoutValue').textContent = done ? 'Готово' : 'Впереди';
    byId('fitWorkoutTarget').textContent = done ? 'Результат сохранён' : `${state.profile.sessionMinutes || 35} минут для себя`;
  }
  syncActivity();
  const observer = new MutationObserver(syncActivity);
  observer.observe(byId('todayKcalSub'),{childList:true,subtree:true,characterData:true});
  observer.observe(byId('todayWaterSub'),{childList:true,subtree:true,characterData:true});
  observer.observe(byId('todayWorkoutStatus'),{childList:true,subtree:true,characterData:true});
  document.documentElement.dataset.fitnessReady = 'true';
})();
