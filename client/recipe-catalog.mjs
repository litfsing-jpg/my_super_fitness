const VERSION = 'recipes20261019-1';
const labels = { 'завтрак':['breakfast','Завтрак'], 'обед':['lunch','Обед'], 'ужин':['dinner','Ужин'], 'перекус':['snack','Перекус'] };
let resources;

export function joinRecipes(dishes, visuals, imageUrl = value => value){
  const bySource = new Map(visuals.map(visual => [visual.sourceId,visual]));
  return dishes.map(dish => {
    const visual = bySource.get(dish.id);
    const [kind,kindLabel] = dish.category === 'dessert' ? ['dessert','Десерт'] : labels[dish.slot] || ['snack','Перекус'];
    return {
      ...visual, id:dish.id, visualId:visual?.id, name:dish.name, kind, kindLabel,
      budget:dish.budget, minutes:dish.prepMinutes || visual?.minutes || 20,
      kcal:dish.kcal, p:dish.p, f:dish.f, c:dish.c,
      ingredients:(dish.ingredients || []).map(item => [item.n,item.q || '']),
      steps:(dish.steps || []).map((text,index) => ({ title:visual?.steps[index]?.title || `Шаг ${index+1}`, text, image:visual?.steps[index]?.image ?? 4 })),
      description:visual?.description || '', note:dish.nutritionNote || 'КБЖУ на одну порцию. Значения приблизительные.',
      layers:visual?.layers || [], atlas:visual?.atlas || imageUrl(dish.img),
      cover:visual?.cover || { src:imageUrl(dish.img) },
    };
  });
}

export function recipeStorage(storage){
  const keys = { 'pb-recipes-prototype-quiz-v1':'primeBodyMobileRecipeQuizV1', 'pb-recipes-prototype-suggestion-v1':'primeBodyMobileRecipeSuggestionV1' };
  return {
    getItem(key){ return keys[key] ? storage.getItem(keys[key]) : null; },
    setItem(key,value){ if(keys[key]) storage.setItem(keys[key],value); },
  };
}

async function loadResources(){
  if(!resources) resources = (async () => {
    await import(`./assets/recipes/model.js?v=${VERSION}`);
    await import(`./assets/recipes/runtime.js?v=${VERSION}`);
    const read = async (name,json = false) => {
      const response = name==='catalog.json' ? await window.WLData.fetch('/api/catalog/recipe-visuals') : await fetch(`assets/recipes/${name}?v=${VERSION}`);
      if(!response.ok) throw Error(`Recipes ${name}: ${response.status}`);
      return json ? response.json() : response.text();
    };
    const [manifest,html,css] = await Promise.all([read('catalog.json',true),read('page.html'),read('style.css')]);
    if(manifest.version !== 1 || !manifest.recipes.length) throw Error('Empty recipe visuals');
    return { manifest,html,css };
  })().catch(error => { resources = null; throw error; });
  return resources;
}

export async function mountRecipeCatalog(options){
  const { manifest,html,css } = await loadResources();
  const root = options.host.shadowRoot || options.host.attachShadow({ mode:'open' });
  options.host.replaceChildren();
  const parsed = new DOMParser().parseFromString(html,'text/html');
  parsed.querySelector('.app-header')?.remove();
  parsed.querySelector('.catalog-footer')?.remove();
  parsed.querySelector('noscript')?.remove();
  parsed.querySelector('.catalog-heading .eyebrow')?.remove();
  parsed.querySelector('.catalog-heading > div')?.append(parsed.querySelector('#resultCount'));
  parsed.querySelector('#pickToday span').textContent = 'Рецепт на сегодня';
  parsed.querySelector('#pickToday').setAttribute('aria-label','Подобрать рецепт на сегодня');
  parsed.querySelectorAll('[src]').forEach(image => image.setAttribute('src',image.getAttribute('src').replace('assets/icons/','assets/recipes/icons/')));
  const style = document.createElement('style');
  style.textContent = css;
  root.replaceChildren(style,...Array.from(parsed.body.children,child => document.importNode(child,true)));
  const recipes = joinRecipes(options.dishes,manifest.recipes,options.imageUrl);
  const sources = new Map(options.dishes.map(dish => [dish.id,dish]));
  const escape = value => String(value ?? '').replace(/[&<>"']/g,char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const numeric = dish => (dish.ingredients || []).every(item => Number(item.amount) > 0);
  return window.PrimeRecipes.mount(root, {
    embedded:true, autoQuiz:false, recipes, scroller:options.scroller,
    allowed:options.allowed,
    storage:recipeStorage(window.WLStorage), favoritesFirst:true,
    getFavorites:options.getFavorites, toggleFavorite:options.toggleFavorite,
    iconBase:'assets/recipes/icons/', toast:options.toast, navigate:options.navigate, onBack:options.onBack,
    onCollection:options.onCollection,
    onView(view){
      options.host.dataset.recipeView = view;
      options.scroller?.setAttribute('data-recipe-view',view);
      if(view === 'recipe'){
        const stage = root.querySelector('.food-stage');
        stage.style.removeProperty('--spread');
        const layers = [...stage.querySelectorAll('.food-layer')];
        const heights = [...stage.querySelectorAll('.layer-caption')].map(label => label.getBoundingClientRect().height);
        if(layers.length > 1){
          const baseline = layers[1].getBoundingClientRect().top - layers[0].getBoundingClientRect().top;
          const spread = Math.max(baseline,...heights.slice(1).map((height,index) => (height + heights[index]) / 2 + 8));
          if(spread > baseline + .5) stage.style.setProperty('--spread',`${spread}px`);
        }
      }
    },
    onDialog(open){ options.scroller?.setAttribute('data-recipe-dialog',open ? 'open' : 'closed'); },
    openFallback:options.openFallback,
    renderActions(recipe){
      const dish = sources.get(recipe.id);
      return `<div class="platform-actions">
        ${numeric(dish) ? `<fieldset class="recipe-portions"><legend>Приготовить порций</legend><div>${[1,2,3,4].map(count => `<label><input type="radio" name="cookPortions" value="${count}"${count === 1 ? ' checked' : ''}><span>${count}</span></label>`).join('')}</div></fieldset><p class="portion-note" data-portion-note>КБЖУ и запись в дневнике — на одну порцию.</p>` : ''}
        ${dish.mealPrep ? `<div class="storage-notes"><b>На несколько дней</b><p>${escape(dish.mealPrep.storage)}</p><p>${escape(dish.mealPrep.cooling)}</p><p>${escape(dish.mealPrep.reheat)}</p>${Number(dish.mealPrep.freezerDays) > 0 ? `<p>Можно заморозить порционно при −18 °C на срок до ${Number(dish.mealPrep.freezerDays)} дней. Подпиши дату приготовления.</p>` : ''}</div>` : ''}
        ${(dish.sources || []).filter(source => /^https:\/\//.test(source.url)).map(source => `<p class="portion-note">Идея рецепта: <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a> · адаптированный состав</p>`).join('')}
        ${dish.category === 'dessert' ? `<div class="dessert-menu-controls"><select data-dessert-day aria-label="День меню для десерта">${Array.from({length:7},(_,index) => `<option value="${index}">День ${index+1}</option>`).join('')}</select><button type="button" class="secondary-button" data-add-dessert>Включить в меню</button></div>` : ''}
        <button type="button" class="primary-button" data-log-dish>Съел это блюдо</button>
      </div>`;
    },
    onRecipe(view,recipe){
      const dish = sources.get(recipe.id);
      view.querySelector('.media-notice').before(view.querySelector('.macros'));
      const ingredients = view.querySelector('.ingredients');
      const portions = view.querySelector('.recipe-portions');
      if(portions) ingredients.querySelector('ul').before(portions,view.querySelector('[data-portion-note]'));
      view.querySelectorAll('[name="cookPortions"]').forEach(input => input.addEventListener('change',() => {
        const count = Number(input.value);
        ingredients.querySelector('summary').firstChild.textContent = count === 1 ? 'Продукты на порцию' : `Продукты на ${count} порции`;
        view.querySelector('.ingredients ul').innerHTML = dish.ingredients.map(item => `<li><span>${escape(item.n)}</span><b>${escape(options.quantity(item,count))}</b></li>`).join('');
        view.querySelectorAll('.step p').forEach((step,index) => { step.textContent = options.stepText(dish.steps[index],count); });
        view.querySelector('[data-portion-note]').textContent = count === 1 ? 'КБЖУ и запись в дневнике — на одну порцию.' : `Раздели готовое блюдо на ${count} равные порции. В дневник добавится одна.`;
      }));
      view.querySelector('[data-log-dish]').addEventListener('click',event => {
        options.logFood(recipe.id);
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = 'Добавлено в дневник';
      });
      view.querySelector('[data-add-dessert]')?.addEventListener('click',async event => {
        const button = event.currentTarget;
        button.disabled = true;
        try { await options.addDessert(recipe.id,Number(view.querySelector('[data-dessert-day]').value)); }
        finally { button.disabled = false; }
      });
    },
  });
}
