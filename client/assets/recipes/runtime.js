(function () {
  'use strict';
  function mount(root, config = {}) {
  const { filterRecipes, filtersFromAnswers, readQuiz, saveQuiz, pickDailyRecipe, readSuggestion, saveSuggestion, recipeLayers, toggleFavorite, readFavorites, saveFavorites, spritePosition, coverFrame, shouldCancelForResize, counted, duration } = window.RecipeModel;
  const recipes = config.recipes || window.RECIPES;
  const $ = id => root.getElementById(id);
  const scroller = config.scroller || window;
  const scrollPosition = () => config.scroller ? scroller.scrollTop : window.scrollY;
  const scrollTo = top => scroller.scrollTo({ top, behavior: 'auto' });
  let storage;
  try { storage = config.storage || window.localStorage; } catch { storage = null; }
  let viewportWidth = window.innerWidth;
  let favorites = config.getFavorites ? config.getFavorites() : readFavorites(storage, recipes);
  let quiz = readQuiz(storage);
  let filters = filtersFromAnswers(quiz?.status === 'complete' ? quiz.answers : undefined);
  let quizStep = 0;
  let editingQuiz = false;
  let suggestedId = null;
  let searchTimer;
  let favoritesOnly = false;
  let activeRecipe = null;
  let catalogScroll = 0;
  let lastRecipeId = null;
  let openToken = 0;
  let animations = [];
  let flight = null;
  let closing = false;
  let toastTimer;
  const assets = new Map();
  function syncDialogState(){ config.onDialog?.($('filterDialog').open || $('quizDialog').open); }
  const mediaKey = recipe => `${recipe.atlas}|${recipe.cover.src || ''}`;
  const catalogObserver = window.IntersectionObserver ? new window.IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(({ target }) => {
      catalogObserver.unobserve(target);
      const recipe = recipes.find(item => item.id === target.dataset.card);
      preload(recipe).then(loaded => {
        target.classList.toggle('image-failed', !loaded);
        if (loaded) target.querySelectorAll('[data-atlas]').forEach(sprite => {
          sprite.style.backgroundImage = `url('${recipe.cover.src || recipe.atlas}')`;
          sprite.removeAttribute('data-atlas');
        });
      });
    });
  }, { rootMargin: '300px 0px', root: config.scroller || null }) : null;
  const escaped = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const number = value => String(value).replace('.', ',');
  const icon = name => `<img src="${config.iconBase || 'assets/icons/'}${name}.svg" alt="" aria-hidden="true">`;
  const recipeCount = count => counted(count, ['рецепт', 'рецепта', 'рецептов']);
  const categoryNames = { breakfast: 'Завтраки', lunch: 'Обеды', dinner: 'Ужины', snack: 'Перекусы', dessert: 'Десерты' };
  const budgetNames = { simple: 'Доступное', balanced: 'Среднее', premium: 'Премиум' };
  const assemblyClass = recipe => (recipe.visualId || recipe.id) === 'apple-berry-crumble' ? ' is-crumble' : '';
  const availableRecipes = () => config.allowed ? recipes.filter(recipe => config.allowed(recipe.id)) : recipes;
  const visibleRecipes = (selection = filters) => {
    const shown = filterRecipes(availableRecipes(), selection, favorites, favoritesOnly);
    return config.favoritesFirst ? shown.sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))) : shown;
  };

  function sprite(recipe, index, className = '', lazy = false, bounds = null) {
    const columns=recipe.atlasColumns||4,rows=recipe.atlasRows||2;
    const position = {x:`${index%columns*100/(columns-1)}%`,y:`${Math.floor(index/columns)*100/(rows-1)}%`};
    const scale = recipe.layers.find(layer => layer.index === index)?.scale ?? 1;
    const vesselClass = recipe.assembly === 'bowl' && index === 3 ? ' is-vessel' : '';
    let framing = `background-size:${columns*100}% ${rows*100}%;`;
    if (bounds) {
      const { x, y, size, clip: [left, top, right, bottom] } = coverFrame(bounds);
      framing = `background-size:${400 / size}% ${200 / size}%;background-position:${x / (4 - size) * 100}% ${y / (2 - size) * 100}%;clip-path:inset(${top * 100}% ${right * 100}% ${bottom * 100}% ${left * 100}%);`;
    }
    return `<span class="food-sprite ${className}${vesselClass}" aria-hidden="true"${lazy ? ' data-atlas' : ''} style="${lazy ? '' : `background-image:url('${recipe.atlas}');`}--sprite-x:${position.x};--sprite-y:${position.y};--layer-scale:${scale};${framing}"></span>`;
  }
  function cover(recipe, lazy = false) {
    const image = recipe.cover.src
      ? `<span class="food-sprite dish-cover" aria-hidden="true"${lazy ? ' data-atlas' : ''} style="${lazy ? '' : `background-image:url('${recipe.cover.src}');`}background-size:contain;background-position:center"></span>`
      : sprite(recipe, recipe.cover.index, 'dish-cover', lazy, recipe.cover.bounds);
    return `<div class="dish-preview" aria-hidden="true">${image}</div>`;
  }
  function favoriteButton(recipe, className = '') {
    const selected = favorites.includes(recipe.id);
    const label = `${selected ? 'Убрать' : 'Добавить'} «${recipe.name}» ${selected ? 'из избранного' : 'в избранное'}`;
    return `<button class="icon-button favorite-button ${className}${selected ? ' is-favorite' : ''}" data-favorite="${recipe.id}" aria-pressed="${selected}" aria-label="${escaped(label)}" title="${selected ? 'Убрать из избранного' : 'В избранное'}">${icon('heart')}</button>`;
  }
  function filterEntries() {
    return [filters.kind !== 'all' && ['kind', categoryNames[filters.kind]], filters.budget !== 'all' && ['budget', budgetNames[filters.budget]], filters.maxMinutes > 0 && ['maxMinutes', `До ${filters.maxMinutes} минут`], filters.pp && ['pp', 'ПП-десерты'], filters.protein && ['protein', 'Больше белка']].filter(Boolean);
  }
  function renderCatalog() {
    if (config.getFavorites) favorites = config.getFavorites();
    const shown = visibleRecipes();
    catalogObserver?.disconnect();
    $('recipeGrid').innerHTML = shown.map(recipe => `<article class="recipe-card${assets.get(mediaKey(recipe))?.failed ? ' image-failed' : ''}" style="--recipe-color:${recipe.color}" data-card="${recipe.id}">
      <button class="recipe-open" data-recipe="${recipe.id}" aria-label="Открыть рецепт «${escaped(recipe.name)}»">${cover(recipe, !!catalogObserver)}<span class="card-copy"><span class="card-kind">${recipe.kindLabel}</span><h2>${escaped(recipe.name)}</h2><span class="card-meta"><span>${duration(recipe.minutes)}</span><span aria-hidden="true">·</span><b>${recipe.kcal} ккал</b></span></span></button>${favoriteButton(recipe, 'card-favorite')}</article>`).join('');
    if (catalogObserver) $('recipeGrid').querySelectorAll('[data-card]').forEach(card => catalogObserver.observe(card));
    $('favoritesCount').textContent = favorites.length;
    $('resultCount').textContent = recipeCount(shown.length);
    $('clearSearch').hidden = !filters.query;
    $('ppCollection').setAttribute('aria-pressed', String(filters.pp));
    config.onCollection?.(filters.pp);
    $('pickToday').disabled = !shown.length;
    $('pickToday').title = shown.length ? 'Подобрать из текущей подборки' : 'Нет подходящих рецептов';
    $('allTab').classList.toggle('active', !favoritesOnly);
    $('favoritesTab').classList.toggle('active', favoritesOnly);
    $('allTab').setAttribute('aria-pressed', String(!favoritesOnly));
    $('favoritesTab').setAttribute('aria-pressed', String(favoritesOnly));
    const entries = filterEntries();
    $('activeFilters').hidden = !entries.length;
    $('activeFilters').innerHTML = entries.map(([key, label]) => `<button class="filter-chip" data-remove-filter="${key}" aria-label="Убрать фильтр «${label}»">${label}${icon('x')}</button>`).join('');
    $('filterCount').hidden = !entries.length;
    $('filterCount').textContent = entries.length;
    $('emptyState').hidden = !!shown.length;
    const emptyFavorites = favoritesOnly && !favorites.length;
    $('emptyTitle').textContent = emptyFavorites ? 'В избранном пока пусто' : 'Таких рецептов пока нет';
    $('emptyText').textContent = emptyFavorites ? '' : filters.query ? 'Ничего не найдено по этому названию и выбранным фильтрам.' : 'Нет блюд с таким сочетанием фильтров.';
    $('clearEmptyFilters').hidden = emptyFavorites || (!entries.length && !filters.query);
  }
  function preload(recipe, retry = false) {
    const key = mediaKey(recipe);
    if (!retry && assets.has(key)) return assets.get(key).promise;
    const entry = { failed: false, promise: null };
    const paths = recipe.cover.src ? [recipe.atlas, recipe.cover.src] : [recipe.atlas];
    entry.promise = Promise.all(paths.map(path => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = path;
    }))).then(loaded => {
      entry.failed = loaded.some(value => !value);
      return !entry.failed;
    });
    assets.set(key, entry);
    return entry.promise;
  }
  function cancelMotion() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    flight?.remove();
    flight = null;
  }
  function releaseWhenFinished(animation) {
    animations.push(animation);
    animation.finished.then(() => animation.cancel()).catch(() => {});
  }
  function renderRecipe(recipe) {
    const layers = recipeLayers(recipe);
    const labels = layers.map((layer, index) => `<span class="layer-caption" style="--i:${index}">${escaped(layer.label)}</span>`).join('');
    $('recipeView').innerHTML = `<header class="detail-header"><button class="back-button" data-close-recipe>${icon('arrow-left')}Рецепты</button><span>${recipe.kindLabel}</span>${favoriteButton(recipe)}</header>
      <div class="detail-content"><h1 class="recipe-title" tabindex="-1">${escaped(recipe.name)}</h1>${recipe.description !== recipe.name ? `<p class="recipe-subtitle">${escaped(recipe.description)}</p>` : ''}<div class="meta-line">${icon('clock')}<span>${duration(recipe.minutes)}</span><span class="dot">·</span><span>1 порция</span></div>
      ${suggestedId === recipe.id ? `<div class="suggestion-toolbar"><span>Рецепт на сегодня</span><button class="secondary-button" id="anotherRecipe"${visibleRecipes().length < 2 ? ' disabled' : ''}>${icon('refresh-cw')}Другой вариант</button></div>` : ''}
      <div class="media-notice" id="mediaNotice" role="status"><span>Загрузка изображений…</span></div>
      <div class="food-stage${assemblyClass(recipe)}" style="--layer-count:${layers.length}" role="img" aria-label="${escaped(recipe.name)}: ${layers.map(layer => layer.label.toLowerCase()).join(', ')}">${layers.map((layer, index) => `<span class="food-layer" style="--i:${index}">${sprite(recipe, layer.index)}</span>`).join('')}${labels}</div>
      <div class="macros" aria-label="Пищевая ценность на одну порцию"><div><b>${recipe.kcal}</b><span>ккал</span></div><div><b>${number(recipe.p)} <small>г</small></b><span>Белки</span></div><div><b>${number(recipe.f)} <small>г</small></b><span>Жиры</span></div><div><b>${number(recipe.c)} <small>г</small></b><span>Углеводы</span></div></div>
      <details class="ingredients"><summary>Продукты на порцию${icon('chevron-down')}</summary><ul>${recipe.ingredients.map(([name, amount]) => `<li><span>${escaped(name)}</span><b>${escaped(amount)}</b></li>`).join('')}</ul></details>
      <div class="section-title"><h2>Как приготовить</h2><span>${counted(recipe.steps.length, ['шаг', 'шага', 'шагов'])}</span></div><ol class="steps">${recipe.steps.map((step, index) => `<li class="step"><span class="step-count">ШАГ ${String(index + 1).padStart(2, '0')}</span>${sprite(recipe, step.image, 'step-art')}<h3>${escaped(step.title)}</h3><p>${escaped(step.text)}</p></li>`).join('')}</ol>
      <p class="nutrition-note">${recipe.note}</p>${config.renderActions ? config.renderActions(recipe) : ''}<div class="detail-bottom"><button class="back-button" data-close-recipe>${icon('arrow-left')}Все рецепты</button></div></div>`;
    config.onRecipe?.($('recipeView'), recipe);
  }
  async function playIntro(recipe, origin, token) {
    const stage = $('recipeView').querySelector('.food-stage');
    const rect = stage.getBoundingClientRect();
    const layerRects = [...stage.querySelectorAll('.food-layer')].map(layer => layer.getBoundingClientRect());
    const size = layerRects[0].width;
    const spread = layerRects.length > 1 ? layerRects[1].top - layerRects[0].top : 0;
    const layerCount = recipeLayers(recipe).length;
    const center = spread * (layerCount - 1) / 2;
    flight = document.createElement('div');
    flight.innerHTML = cover(recipe);
    flight.className = 'food-flight';
    flight.style.width = `${size}px`;
    flight.style.left = `${config.embedded ? rect.width - size : rect.right - size}px`;
    flight.style.top = `${config.embedded ? center : rect.top + center}px`;
    if (config.embedded) {
      flight.style.position = 'absolute';
      flight.style.visibility = 'visible';
      stage.append(flight);
    } else document.body.append(flight);
    const from = origin || { left: rect.right - size, top: rect.top + center, width: size };
    const flightAnimation = flight.animate([
      { transform: `translate(${from.left - (rect.right - size)}px, ${from.top - rect.top - center}px) scale(${from.width / size})`, opacity: 1 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], { duration: 370, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'both' });
    animations.push(flightAnimation);
    try { await flightAnimation.finished; } catch { return; }
    if (token !== openToken || !activeRecipe) return;
    const movingCover = flight;
    $('recipeView').classList.remove('entering');
    stage.querySelectorAll('.food-layer').forEach((layer, index) => {
      const offset = (index - (layerCount - 1) / 2) * size * .045;
      const animation = layer.animate([
        { transform: `translateY(${center + offset}px)`, opacity: 0, offset: 0 },
        { transform: `translateY(${center + offset}px)`, opacity: .6, offset: .12 },
        { transform: `translateY(${index * spread}px)`, opacity: 1, offset: 1 },
      ], { duration: 1250, easing: 'cubic-bezier(.2,.7,.16,1)', fill: 'both' });
      releaseWhenFinished(animation);
    });
    stage.querySelectorAll('.layer-caption').forEach(caption => {
      const transform = getComputedStyle(caption).transform;
      const base = transform === 'none' ? '' : `${transform} `;
      releaseWhenFinished(caption.animate([{ opacity: 0, transform: `${base}translateX(-6px)` }, { opacity: 1, transform: `${base}translateX(0)` }], { delay: 650, duration: 300, fill: 'both' }));
    });
    const dissolve = movingCover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'both' });
    animations.push(dissolve);
    try { await dissolve.finished; } catch { return; }
    movingCover.remove();
    if (flight === movingCover) flight = null;
  }
  async function openRecipe(id, push = true) {
    const recipe = recipes.find(item => item.id === id);
    if (!recipe) return;
    if (config.allowed && !config.allowed(id)) { showToast('Блюдо не подходит под исключения из анкеты'); return; }
    if (!recipe.layers.length && config.openFallback) { config.openFallback(id); return; }
    const source = root.querySelector(`[data-card="${id}"] .dish-preview`);
    const origin = !activeRecipe && source ? source.getBoundingClientRect() : null;
    if (!activeRecipe) catalogScroll = scrollPosition();
    cancelMotion();
    const token = ++openToken;
    activeRecipe = recipe;
    closing = false;
    lastRecipeId = id;
    renderRecipe(recipe);
    $('catalog').hidden = true;
    $('recipeView').hidden = false;
    $('recipeView').className = 'recipe-view entering';
    config.onView?.('recipe');
    if (push) {
      if (config.navigate) config.navigate(id);
      else history.pushState({ primeRecipe: id }, '', `#${id}`);
    }
    scrollTo(0);
    $('recipeView').querySelector('[data-close-recipe]').focus({ preventScroll: true });
    const loaded = await preload(recipe);
    if (token !== openToken || activeRecipe?.id !== id) return;
    $('mediaNotice').hidden = loaded;
    if (!loaded) {
      $('recipeView').classList.add('media-unavailable');
      $('recipeView').classList.remove('entering');
      $('mediaNotice').innerHTML = `<span>Изображения не загрузились</span><button class="icon-button" id="retryMedia" aria-label="Повторить загрузку изображений" title="Повторить загрузку">${icon('refresh-cw')}</button>`;
      return;
    }
    playIntro(recipe, origin, token);
  }
  function showCatalog() {
    ++openToken;
    cancelMotion();
    activeRecipe = null;
    closing = false;
    $('recipeView').hidden = true;
    $('recipeView').innerHTML = '';
    $('catalog').hidden = false;
    config.onView?.('catalog');
    renderCatalog();
    scrollTo(catalogScroll);
    requestAnimationFrame(() => {
      scrollTo(catalogScroll);
      root.querySelector(`[data-recipe="${lastRecipeId}"]`)?.focus({ preventScroll: true });
    });
  }
  function closeRecipe() {
    if (closing) return;
    closing = true;
    if (config.onBack) config.onBack();
    else if (activeRecipe && history.state?.primeRecipe) history.back();
    else showCatalog();
  }
  function toggleRecipeFavorite(id) {
    if (config.toggleFavorite) {
      config.toggleFavorite(id);
      favorites = config.getFavorites();
    } else {
      favorites = toggleFavorite(favorites, id);
      saveFavorites(storage, favorites);
    }
    if (activeRecipe) {
      const recipe = recipes.find(item => item.id === id);
      const button = $('recipeView').querySelector('[data-favorite]');
      const selected = favorites.includes(id);
      button.classList.toggle('is-favorite', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${selected ? 'Убрать' : 'Добавить'} «${recipe.name}» ${selected ? 'из избранного' : 'в избранное'}`);
      button.title = selected ? 'Убрать из избранного' : 'В избранное';
    } else {
      const scroll = scrollPosition();
      renderCatalog();
      root.querySelector(`[data-card="${id}"] [data-favorite]`)?.focus({ preventScroll: true });
      scrollTo(scroll);
    }
    showToast(favorites.includes(id) ? 'Сохранено в избранное' : 'Удалено из избранного');
  }
  function showToast(message) {
    if (config.toast) { config.toast(message); return; }
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 1700);
  }
  function draftFilters() {
    const values = new FormData($('filterForm'));
    return { kind: values.get('kind') || 'all', budget: values.get('budget') || 'all', maxMinutes: Number(values.get('maxMinutes') || 0), query: filters.query, quick: false, protein: values.has('protein'), pp: values.has('pp') };
  }
  function updateDraftCount() { $('applyFilters').textContent = `Показать · ${recipeCount(visibleRecipes(draftFilters()).length)}`; }
  function openFilters() {
    $('filterForm').elements.kind.value = filters.kind;
    $('filterForm').elements.budget.value = filters.budget;
    $('filterForm').elements.maxMinutes.value = String(filters.maxMinutes);
    $('filterForm').elements.pp.checked = filters.pp;
    $('filterForm').elements.protein.checked = filters.protein;
    updateDraftCount();
    $('filterDialog').showModal();
    syncDialogState();
  }
  function applySearch() {
    clearTimeout(searchTimer);
    filters.query = $('recipeSearch').value;
    renderCatalog();
  }
  function quizAnswers() {
    const values = new FormData($('quizForm'));
    return { budget: values.get('budget'), maxMinutes: Number(values.get('maxMinutes')), preference: values.get('preference') };
  }
  function saveDraft() {
    if (editingQuiz) return;
    quiz = { version: 1, status: 'draft', step: quizStep, answers: quizAnswers() };
    saveQuiz(storage, quiz);
  }
  function renderQuizStep() {
    $('quizForm').querySelectorAll('[data-quiz-step]').forEach(fieldset => { fieldset.hidden = Number(fieldset.dataset.quizStep) !== quizStep; });
    $('quizStep').textContent = `${quizStep + 1} из 3`;
    $('quizProgress').value = quizStep + 1;
    $('quizBack').hidden = quizStep === 0;
    $('quizNext').textContent = quizStep === 2 ? 'Подобрать рецепты' : 'Дальше';
    $('skipQuiz').textContent = editingQuiz ? 'Отмена' : 'Пропустить';
    const count = filterRecipes(availableRecipes(), filtersFromAnswers(quizAnswers()), [], false).length;
    $('quizCount').textContent = count ? `Подходит ${recipeCount(count)}` : 'Нет подходящих рецептов. Измени предпочтения.';
    $('quizNext').disabled = quizStep === 2 && !count;
  }
  function openQuiz() {
    editingQuiz = quiz?.status === 'complete' || quiz?.status === 'skipped';
    quizStep = editingQuiz ? 0 : quiz?.step || 0;
    const answers = quiz?.answers || { budget: 'all', maxMinutes: 0, preference: 'any' };
    for (const key of ['budget', 'maxMinutes', 'preference']) $('quizForm').elements[key].value = String(answers[key]);
    renderQuizStep();
    $('quizDialog').showModal();
    syncDialogState();
  }
  function dismissQuiz() {
    if (!editingQuiz) {
      quiz = { version: 1, status: 'skipped', step: quizStep, answers: quizAnswers() };
      if (!saveQuiz(storage, quiz)) showToast('Не удалось сохранить настройки на устройстве');
    }
    $('quizDialog').close();
  }
  function chooseToday(another = false) {
    if (!activeRecipe) applySearch();
    const candidates = visibleRecipes();
    const now = new Date();
    const day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const savedId = readSuggestion(storage, day);
    const saved = !another && candidates.find(recipe => recipe.id === savedId);
    const recipe = saved || pickDailyRecipe(candidates, day, another ? activeRecipe?.id : undefined);
    if (!recipe) { showToast('Нет подходящих рецептов. Измени фильтры.'); return; }
    suggestedId = recipe.id;
    saveSuggestion(storage, day, recipe.id);
    if (activeRecipe) {
      if (config.navigate) config.navigate(recipe.id, true);
      else history.replaceState({ primeRecipe: recipe.id }, '', `#${recipe.id}`);
      openRecipe(recipe.id, false);
    } else openRecipe(recipe.id);
  }
  root.addEventListener('click', event => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) { toggleRecipeFavorite(favorite.dataset.favorite); return; }
    const recipe = event.target.closest('[data-recipe]');
    if (recipe) { openRecipe(recipe.dataset.recipe); return; }
    if (event.target.closest('[data-close-recipe]')) closeRecipe();
    const chip = event.target.closest('[data-remove-filter]');
    if (chip) { filters[chip.dataset.removeFilter] = filtersFromAnswers()[chip.dataset.removeFilter]; renderCatalog(); $('openFilters').focus({ preventScroll: true }); }
    if (event.target.closest('#anotherRecipe')) chooseToday(true);
    if (event.target.closest('#retryMedia') && activeRecipe) {
      const recipe = activeRecipe;
      assets.delete(mediaKey(recipe));
      openRecipe(recipe.id, false);
    }
  });
  $('allTab').addEventListener('click', () => { favoritesOnly = false; renderCatalog(); });
  $('favoritesTab').addEventListener('click', () => { favoritesOnly = true; renderCatalog(); });
  $('recipeSearch').addEventListener('input', event => {
    if (event.isComposing) return;
    filters.query = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 150);
  });
  $('recipeSearch').addEventListener('compositionend', applySearch);
  $('recipeSearch').addEventListener('search', applySearch);
  $('recipeSearch').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applySearch(); $('recipeSearch').blur(); } });
  $('clearSearch').addEventListener('click', () => { $('recipeSearch').value = ''; applySearch(); $('recipeSearch').focus(); });
  $('ppCollection').addEventListener('click', () => { filters.pp = !filters.pp; renderCatalog(); });
  $('pickToday').addEventListener('click', () => chooseToday());
  $('editPreferences').addEventListener('click', openQuiz);
  $('closeQuiz').addEventListener('click', dismissQuiz);
  $('skipQuiz').addEventListener('click', dismissQuiz);
  $('quizBack').addEventListener('click', () => { quizStep = Math.max(0, quizStep - 1); saveDraft(); renderQuizStep(); });
  $('quizForm').addEventListener('change', () => { saveDraft(); renderQuizStep(); });
  $('quizForm').addEventListener('submit', event => {
    event.preventDefault();
    if (quizStep < 2) { quizStep++; saveDraft(); renderQuizStep(); return; }
    quiz = { version: 1, status: 'complete', step: 2, answers: quizAnswers() };
    const saved = saveQuiz(storage, quiz);
    filters = filtersFromAnswers(quiz.answers);
    $('recipeSearch').value = '';
    favoritesOnly = false;
    $('quizDialog').close();
    renderCatalog();
    if (!saved) showToast('Подбор применён, но настройки не удалось сохранить на устройстве');
  });
  $('quizDialog').addEventListener('cancel', event => { event.preventDefault(); dismissQuiz(); });
  $('quizDialog').addEventListener('click', event => { if (event.target === $('quizDialog')) dismissQuiz(); });
  $('openFilters').addEventListener('click', openFilters);
  $('closeFilters').addEventListener('click', () => $('filterDialog').close());
  for (const id of ['filterDialog','quizDialog']) $(id).addEventListener('close',syncDialogState);
  $('filterDialog').addEventListener('click', event => { if (event.target === $('filterDialog')) $('filterDialog').close(); });
  $('filterForm').addEventListener('change', updateDraftCount);
  $('resetFilters').addEventListener('click', () => { $('filterForm').reset(); updateDraftCount(); });
  $('filterForm').addEventListener('submit', event => { event.preventDefault(); filters = draftFilters(); $('filterDialog').close(); renderCatalog(); });
  $('clearEmptyFilters').addEventListener('click', () => { filters = filtersFromAnswers(); $('recipeSearch').value = ''; clearTimeout(searchTimer); renderCatalog(); });
  if (!config.embedded) window.addEventListener('popstate', event => { if (event.state?.primeRecipe) openRecipe(event.state.primeRecipe, false); else showCatalog(); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && activeRecipe && !$('filterDialog').open && !$('quizDialog').open) closeRecipe(); });
  window.addEventListener('resize', () => {
    const widthChanged = shouldCancelForResize(viewportWidth, window.innerWidth);
    viewportWidth = window.innerWidth;
    if (activeRecipe && widthChanged) { cancelMotion(); $('recipeView').classList.remove('entering'); config.onView?.('recipe'); }
  });
  if (!config.embedded) {
    history.scrollRestoration = 'manual';
    history.replaceState({ primeRecipe: null }, '', location.pathname + location.search);
  }
  renderCatalog();
  if (config.autoQuiz !== false && (!quiz || quiz.status === 'draft')) openQuiz();
  return {
    show(options = {}) {
      if (options.recipeId) { openRecipe(options.recipeId, false); return; }
      if (activeRecipe) showCatalog();
      if (typeof options.pp === 'boolean') filters.pp = options.pp;
      renderCatalog();
      if (options.prompt && (!quiz || quiz.status === 'draft')) openQuiz();
    },
    back() {
      if ($('filterDialog').open) { $('filterDialog').close(); return true; }
      if ($('quizDialog').open) { dismissQuiz(); return true; }
      if (activeRecipe) closeRecipe();
      else config.onBack?.();
      return true;
    },
    suspend() {
      ++openToken;
      cancelMotion();
      $('recipeView').classList.remove('entering');
      $('filterDialog').close();
      $('quizDialog').close();
    },
  };
  }
  window.PrimeRecipes = { mount };
  if (document.getElementById('catalog')) mount(document);
})();
