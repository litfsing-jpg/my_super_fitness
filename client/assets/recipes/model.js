(function (root) {
  'use strict';
  const STORAGE_KEY = 'pb-recipes-prototype-v1';
  const QUIZ_KEY = 'pb-recipes-prototype-quiz-v1';
  const SUGGESTION_KEY = 'pb-recipes-prototype-suggestion-v1';
  const searchText = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();
  function filterRecipes(recipes, filters, favorites, favoritesOnly) {
    const words = searchText(filters.query).split(/\s+/).filter(Boolean);
    return recipes.filter(recipe => (!favoritesOnly || favorites.includes(recipe.id))
      && (!filters.kind || filters.kind === 'all' || filters.kind === recipe.kind)
      && (!filters.budget || filters.budget === 'all' || filters.budget === recipe.budget)
      && (!filters.pp || recipe.kind === 'dessert')
      && (!(filters.maxMinutes > 0) || recipe.minutes <= filters.maxMinutes)
      && (!filters.quick || recipe.minutes <= 15)
      && (!filters.protein || recipe.p >= 20)
      && words.every(word => searchText(recipe.name).includes(word)));
  }
  function answersWithDefaults(answers = {}) {
    return {
      budget: ['simple', 'balanced', 'premium'].includes(answers.budget) ? answers.budget : 'all',
      maxMinutes: [15, 30].includes(answers.maxMinutes) ? answers.maxMinutes : 0,
      preference: ['protein', 'pp'].includes(answers.preference) ? answers.preference : 'any',
    };
  }
  function filtersFromAnswers(answers) {
    const values = answersWithDefaults(answers);
    return { kind: 'all', budget: values.budget, maxMinutes: values.maxMinutes, query: '', quick: false, protein: values.preference === 'protein', pp: values.preference === 'pp' };
  }
  function normalizeQuiz(value) {
    if (!value || value.version !== 1 || !['draft', 'complete', 'skipped'].includes(value.status)) return null;
    return { version: 1, status: value.status, step: [0, 1, 2].includes(value.step) ? value.step : 0, answers: answersWithDefaults(value.answers || {}) };
  }
  function readQuiz(storage) {
    try { return normalizeQuiz(JSON.parse(storage.getItem(QUIZ_KEY))); } catch { return null; }
  }
  function saveQuiz(storage, value) {
    try {
      const state = normalizeQuiz({ ...value, version: 1 });
      if (!state) return false;
      storage.setItem(QUIZ_KEY, JSON.stringify(state));
      return true;
    } catch { return false; }
  }
  function pickDailyRecipe(recipes, day, previousId) {
    if (!recipes.length) return null;
    const score = recipe => {
      let hash = 2166136261;
      for (const character of `${day}:${recipe.id}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
      return hash >>> 0;
    };
    const ordered = [...recipes].sort((a, b) => score(a) - score(b) || a.id.localeCompare(b.id));
    const previous = ordered.findIndex(recipe => recipe.id === previousId);
    return ordered[(previous + 1) % ordered.length];
  }
  function readSuggestion(storage, day) {
    try {
      const saved = JSON.parse(storage.getItem(SUGGESTION_KEY));
      return saved?.day === day && typeof saved.id === 'string' ? saved.id : null;
    } catch { return null; }
  }
  function saveSuggestion(storage, day, id) {
    try { storage.setItem(SUGGESTION_KEY, JSON.stringify({ day, id })); return true; } catch { return false; }
  }
  function recipeLayers(recipe) {
    const { layers } = recipe;
    if (layers.length === 4 && /^Верх /.test(layers[1].label) && !/^Верх /.test(layers[0].label)) return [layers[0], layers[2], layers[3]];
    const noun = /^Верх .*?(напитка|блюда|мусса|супа|крема)$/.exec(layers[0]?.label)?.[1];
    if (layers.length !== 4 || !noun || layers[1].label !== `Середина ${noun}` || !(layers[2].label === `Основа ${noun}` || /основа$/i.test(layers[2].label))) return layers;
    const names = { напитка: 'Напиток', блюда: 'Блюдо', мусса: 'Мусс', супа: 'Суп', крема: 'Крем' };
    return [{ ...layers[0], label: names[noun] }, { ...layers[3], label: noun === 'напитка' ? 'Стакан' : 'Посуда' }];
  }
  function toggleFavorite(favorites, id) {
    return favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
  }
  function readFavorites(storage, recipes) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? [...new Set(value.filter(id => recipes.some(recipe => recipe.id === id)))] : [];
    } catch { return []; }
  }
  function saveFavorites(storage, favorites) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(favorites)); } catch { /* File URLs may deny storage. */ }
  }
  function spritePosition(index) {
    return { x: `${(index % 4) * 100 / 3}%`, y: `${Math.floor(index / 4) * 100}%` };
  }
  function coverFrame([x, y, width, height]) {
    const size = Math.max(width, height) / .86;
    const horizontal = Math.max(0, (1 - width / size) / 2 - .006);
    const vertical = Math.max(0, (1 - height / size) / 2 - .006);
    return {
      x: x + (width - size) / 2,
      y: y + (height - size) / 2,
      size,
      clip: [horizontal, vertical, horizontal, vertical],
    };
  }
  function shouldCancelForResize(previousWidth, nextWidth) {
    return previousWidth !== nextWidth;
  }
  function counted(value, forms) {
    const lastTwo = value % 100;
    const last = value % 10;
    const form = lastTwo >= 11 && lastTwo <= 14 ? 2 : last === 1 ? 0 : last >= 2 && last <= 4 ? 1 : 2;
    return `${value} ${forms[form]}`;
  }
  function duration(minutes) {
    if (minutes < 60) return `${minutes} мин`;
    return `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ''}`;
  }
  const model = { filterRecipes, filtersFromAnswers, readQuiz, saveQuiz, pickDailyRecipe, readSuggestion, saveSuggestion, recipeLayers, toggleFavorite, readFavorites, saveFavorites, spritePosition, coverFrame, shouldCancelForResize, counted, duration };
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  else root.RecipeModel = model;
})(globalThis);
