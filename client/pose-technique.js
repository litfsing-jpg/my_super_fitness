(function initPrimeBodyPose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PrimeBodyPose = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createPrimeBodyPose() {
  'use strict';

  const IDX = Object.freeze({
    nose: 0,
    leftEar: 7,
    rightEar: 8,
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftWrist: 15,
    rightWrist: 16,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28,
    leftHeel: 29,
    rightHeel: 30,
    leftFoot: 31,
    rightFoot: 32,
  });

  const POSE_CONNECTIONS = Object.freeze([
    [7, 0], [0, 8], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
    [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
  ]);

  const POSE_POINTS = Object.freeze([0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);

  const EXERCISE_GUIDES = Object.freeze({
    free: {
      name: 'Свободная стойка',
      setup: 'Встань лицом к объективу, стопы и макушка в кадре, руки не закрывают корпус.',
      checks: ['уровень плеч и таза', 'центр корпуса', 'симметрия рук и ног'],
      limitation: 'Свободный режим оценивает только видимую фронтальную симметрию, а не конкретное упражнение.',
    },
    general_standing: {
      name: 'Базовая проверка всего тела',
      setup: 'Расположись лицом к камере так, чтобы голова, таз, колени и стопы оставались в кадре во всём движении.',
      checks: ['уровень плеч и таза', 'центр корпуса', 'видимая симметрия ног'],
      limitation: 'Базовый режим видит общую фронтальную симметрию. Он не оценивает глубину, амплитуду и положение спины в боковой плоскости.',
    },
    general_upper: {
      name: 'Базовая проверка верхней части тела',
      setup: 'Расположись лицом к камере. Плечи, локти, кисти и таз должны быть видны на всём движении.',
      checks: ['уровень плеч', 'синхронность рук', 'центр корпуса'],
      limitation: 'Базовый режим сравнивает видимые стороны тела, но не подтверждает траекторию снаряда в глубину кадра и полную технику упражнения.',
    },
    general_floor: {
      name: 'Базовая проверка упражнения на полу',
      setup: 'Поставь телефон низко перед собой. Лицо, плечи, таз и колени должны оставаться видимыми.',
      checks: ['уровень плеч и таза', 'центр корпуса', 'симметрия видимых сторон'],
      limitation: 'Базовый фронтальный режим не определяет прогиб поясницы и высоту корпуса над полом. Для этого нужен боковой ракурс.',
    },
    squat: {
      name: 'Присед',
      setup: 'Телефон на уровне таза, 2–3 метра перед тобой. Носки и колени видны полностью.',
      checks: ['колени идут по линии стоп', 'таз не уходит в сторону', 'левая и правая нога работают симметрично'],
      limitation: 'Фронтальная камера хорошо видит симметрию и завал коленей, но не заменяет боковую оценку глубины и положения спины.',
    },
    pushup: {
      name: 'Отжимания',
      setup: 'Поставь телефон низко перед собой. Смотри в пол чуть впереди ладоней, плечи и таз остаются видны.',
      checks: ['ладони симметрично под плечами', 'локти сгибаются одинаково', 'таз не смещается в сторону'],
      limitation: 'Фронтальный ракурс оценивает симметрию. Прогиб поясницы и положение таза по высоте надёжнее проверять сбоку с тренером.',
    },
    plank: {
      name: 'Планка',
      setup: 'Телефон низко перед собой. Плечи, локти или кисти и таз должны быть видны одновременно.',
      checks: ['опора симметрична', 'плечи и таз без перекоса', 'корпус не смещён в сторону'],
      limitation: 'Фронтальная камера проверяет симметрию планки, но не может надёжно определить прогиб поясницы в боковой плоскости.',
    },
    ohp: {
      name: 'Жим вверх',
      setup: 'Встань лицом к камере и отойди так, чтобы кисти не выходили из кадра в верхней точке.',
      checks: ['руки движутся синхронно', 'кисти проходят над плечами', 'корпус не заваливается в сторону'],
      limitation: 'Камера оценивает фронтальную симметрию и не определяет рабочий вес или внутренние ощущения в плечевом суставе.',
    },
    lunge: {
      name: 'Выпад',
      setup: 'Встань лицом к камере. Обе стопы, колени и таз должны оставаться видимыми весь повтор.',
      checks: ['переднее колено не падает внутрь', 'таз остаётся ровным', 'корпус не уходит в сторону'],
      limitation: 'Фронтальная камера оценивает ось ноги и симметрию, но не измеряет длину шага и угол корпуса в боковой плоскости.',
    },
    lateral_raise: {
      name: 'Подъём рук',
      setup: 'Камера на уровне груди. В кадре одновременно видны голова, плечи, локти, кисти и таз.',
      checks: ['руки поднимаются синхронно', 'локти сохраняют одинаковый угол', 'плечи не перекашиваются'],
      limitation: 'Фронтальный ракурс показывает симметрию рук, но не оценивает вращение плечевой кости и состояние сустава.',
    },
    curl: {
      name: 'Сгибание рук',
      setup: 'Встань или сядь лицом к камере. Локти и кисти не закрываются корпусом или снарядом.',
      checks: ['локти работают симметрично', 'локти не расходятся в стороны', 'корпус не раскачивается'],
      limitation: 'Камера видит фронтальную симметрию, но не определяет инерцию снаряда в глубину кадра и подходящий рабочий вес.',
    },
    pushdown: {
      name: 'Разгибание на трицепс',
      setup: 'Встань лицом к камере перед блоком. Плечи, локти и кисти должны быть видны по обе стороны троса.',
      checks: ['локти остаются у корпуса', 'руки разгибаются одновременно', 'плечи не поднимаются'],
      limitation: 'Фронтальная камера оценивает симметрию и положение локтей, но не измеряет натяжение троса или нагрузку.',
    },
    pulldown: {
      name: 'Тяга верхнего блока',
      setup: 'Сядь строго напротив камеры. Гриф, кисти, локти, плечи и таз должны оставаться в кадре.',
      checks: ['локти опускаются симметрично', 'хват расположен по центру', 'корпус не заваливается'],
      limitation: 'Фронтальный ракурс не определяет, насколько далеко корпус отклонён назад, поэтому оценивает только симметрию и центр.',
    },
    pullup: {
      name: 'Подтягивания',
      setup: 'Камера строго перед турником. В кадре видны обе кисти, плечи, локти и таз во всём диапазоне.',
      checks: ['руки тянут синхронно', 'таз остаётся по центру', 'плечи не перекашиваются'],
      limitation: 'Камера оценивает симметрию подъёма, но не подтверждает касание перекладины и положение лопаток в глубину.',
    },
    calf_raise: {
      name: 'Подъём на носки',
      setup: 'Встань лицом к камере без опоры, закрывающей ноги. Таз, колени, пятки и носки видны полностью.',
      checks: ['пятки поднимаются одновременно', 'колени остаются симметричными', 'таз не смещается'],
      limitation: 'Фронтальная камера сравнивает стороны, но не измеряет реальную высоту подъёма в сантиметрах.',
    },
    hinge: {
      name: 'Тяга с пола',
      setup: 'Поставь камеру перед собой на уровне колен. В кадре видны плечи, таз, колени, стопы и обе кисти.',
      checks: ['колени идут по линии стоп', 'гриф удерживается по центру', 'плечи и таз поднимаются без перекоса'],
      limitation: 'Спереди нельзя надёжно оценить округление спины и глубину наклона. Для них нужен боковой контроль тренера.',
    },
    chest_press: {
      name: 'Жим от груди',
      setup: 'Сядь лицом к камере. Плечи, локти и кисти видны одновременно на всём движении рукояток.',
      checks: ['руки выжимают синхронно', 'кисти остаются на одной высоте', 'плечи не перекашиваются'],
      limitation: 'Фронтальный ракурс оценивает симметрию, но не глубину отвода локтя за корпус и настройку сиденья.',
    },
    row: {
      name: 'Тяга к корпусу',
      setup: 'Расположись строго напротив камеры. Обе кисти, локти, плечи и таз должны быть видны.',
      checks: ['локти движутся симметрично', 'рукоять остаётся по центру', 'корпус не заваливается'],
      limitation: 'Фронтальная камера не измеряет округление спины и амплитуду тяги в глубину кадра.',
    },
    dip: {
      name: 'Отжимания на брусьях',
      setup: 'Камера перед брусьями на уровне корпуса. В кадре видны обе кисти, локти, плечи и таз.',
      checks: ['локти сгибаются одинаково', 'плечи остаются на одном уровне', 'таз не уходит в сторону'],
      limitation: 'Фронтальный ракурс оценивает симметрию, но не глубину наклона корпуса и нагрузку на плечо.',
    },
    bridge: {
      name: 'Ягодичный мостик',
      setup: 'Поставь телефон перед стопами и чуть выше пола. В кадре одновременно видны плечи, таз, колени и стопы.',
      checks: ['колени не падают внутрь', 'таз поднимается без перекоса', 'опора стоп симметрична'],
      limitation: 'Фронтальный ракурс показывает перекос таза и коленей, но высоту подъёма таза над полом точнее оценивать сбоку.',
    },
    leg_extension: {
      name: 'Разгибание ног',
      setup: 'Камера перед тренажёром на уровне колен. Таз, оба колена и голеностопы полностью видны.',
      checks: ['голени поднимаются одновременно', 'таз остаётся ровным', 'колени не расходятся'],
      limitation: 'Камера сравнивает стороны, но не определяет настройку оси тренажёра и допустимую нагрузку на колено.',
    },
  });

  const STANDING_REQUIRED = Object.freeze([0, 11, 12, 23, 24, 25, 26, 27, 28]);
  const FLOOR_REQUIRED = Object.freeze([0, 11, 12, 13, 14, 15, 16, 23, 24]);
  const GENERAL_FLOOR_REQUIRED = Object.freeze([0, 11, 12, 23, 24, 25, 26]);
  const UPPER_REQUIRED = Object.freeze([0, 11, 12, 13, 14, 15, 16]);
  const FRAME_VISIBILITY_MIN = 0.45;
  const FRAME_CONFIDENCE_MIN = 0.62;
  const UPPER_PROFILES = new Set(['ohp','lateral_raise','curl','pushdown','pulldown','pullup','chest_press','row','dip','general_upper']);

  const TECHNIQUE_PROFILE_RULES = Object.freeze([
    { profile:'squat', group:'Ноги', poses:['squat_bw','squat_barbell'], include:/(squat|присед)/i, exclude:/(stretch|растяж|turkish|get up|snatch|jerk|толч|рывок|one.arm|одной рук|one.leg|одной ног|kneel|колен|jump|прыж|overhead|над головой|toss|подбрасыв|walk|ходьб|alternating|черед|press|жим|подъемы мяча)/i },
    { profile:'lunge', group:'Ноги', poses:['lunge'], include:/(lunge|split squat|выпад|приседания на одной ноге)/i, exclude:/(side|сторон|turkish|jerk|press|подъем руки|walking|ходьб|overhead|над головой)/i },
    { profile:'calf_raise', group:'Ноги', poses:['calf_raise'], include:/(standing calf raise|calves standing|подъем.*носк|перекаты с пятки на носок)/i, exclude:/(single|одной ног|seated|сидя|reverse|обратн|squat|присед|stretch|растяж)/i },
    { profile:'hinge', group:'Ноги', poses:['deadlift'], include:/(deadlift|становая|romanian|румын)/i, exclude:/(single.leg|одной ног|good morning|наклоны туловища)/i },
    { profile:'leg_extension', group:'Ноги', poses:['leg_extension'], include:/(leg extension lever|разгибание ног.*рычаж)/i, exclude:/(single|одной ног|standing|стоя)/i },
    { profile:'bridge', group:'Ноги', poses:['hip_thrust'], include:/(bodyweight bridge|ягодичный мост|подъем таза)/i, exclude:/(side|боков|ball|фитбол|single|одной ног)/i },
    { profile:'ohp', group:'Плечи и руки', poses:['ohp_barbell','ohp_dumbbell'], include:/(shoulder press|military press|жим.*(вверх|над головой|от плеч)|армейский)/i, exclude:/(single|one.arm|одной рук|arnold|арнольд|para|side|сторон|alternating|черед|clean|jerk|толч|рывок|с пола|shrug|пожим)/i },
    { profile:'lateral_raise', group:'Плечи и руки', poses:['lateral_raise'], include:/(lateral raise|front raise|подъемы? (рук|гантел|штанг).*(сторон|перед)|подъемы рук в стороны)/i, exclude:/(single|one.arm|одной рук|lying|лежа|alternating|черед|подъем гантели .*через сторону)/i },
    { profile:'curl', group:'Плечи и руки', poses:['bicep_curl_db','bicep_curl_bar'], include:/(curl|сгибание рук|подъем.*бицеп|hammer|молотк)/i, exclude:/(single|one.arm|одной рук|lying|лежа|prone|скамь|preacher|concentration|наклон|ball|мяч|alternating|черед|поочеред|cross|перекрест|подъемом локт|сгибание руки(?:\s|$))/i },
    { profile:'pushdown', group:'Плечи и руки', poses:['tricep_pushdown'], include:/(pushdown|разгибание трицепс.*стоя|тяга вниз перед собой)/i, exclude:/(single|one.arm|одной рук|seated|сидя|incline|полулеж|overhead|над головой|alternating|черед)/i },
    { profile:'pulldown', group:'Спина', poses:['lat_pulldown'], include:/(pulldown|тяга верхнего блока|тяга.*вниз|тяга к груди)/i, exclude:/(behind|из за головы|lateral raise|подъемы рук|сведение рук|bent over|наклон|alternating|черед|тяга к животу)/i },
    { profile:'pullup', group:'Спина', poses:['pullup'], include:/(pull up|pull-up|подтягиван)/i, exclude:/(supine|горизонталь|row|тяга|cable.*underhand pull up)/i },
    { profile:'row', group:'Спина', poses:['row_cable','row_barbell','row_dumbbell','lat_pulldown'], include:/(upright row|тяга.*подбород|подъем.*подбород|seated row|тяга к животу|standing cross row|перекрестная тяга)/i, exclude:/(single|one.arm|одной рук|rear delt|задн|lying|лежа|bent over|наклон)/i },
    { profile:'pushup', group:'Грудь и корпус', poses:['pushup'], include:/(push.?up|отжиман.*(пол|фитбол|мяч))/i, exclude:/(t push|поворот|dip|брусь|bench|скамь|standing|press|жим от груди|жим стоя)/i },
    { profile:'plank', group:'Грудь и корпус', poses:['plank'], include:/(plank|планк)/i, exclude:/(side|боков|jack|джека|twist|поворот)/i },
    { profile:'chest_press', group:'Грудь и корпус', poses:['pushup'], include:/(chest press|жим.*от груди.*(тренаж|тягов|рычаж))/i, exclude:/(single|one.arm|одной рук)/i },
    { profile:'dip', group:'Грудь и корпус', poses:['pushup','tricep_ext'], include:/(\bdip\b|брусь)/i, exclude:/(bench|скамь|reverse lever|обратное)/i },
  ]);

  const GENERAL_FLOOR_POSES = new Set(['pushup','plank','crunch','russian_twist','leg_raise','hip_thrust','back_extension']);
  const GENERAL_UPPER_POSES = new Set([
    'stretch_upper','forearm','tricep_ext','bicep_curl_db','bicep_curl_bar',
    'bench_barbell','bench_dumbbell','chest_fly','ohp_barbell','ohp_dumbbell',
    'row_cable','row_barbell','row_dumbbell','lat_pulldown','pullup',
    'tricep_pushdown','lateral_raise','cable_crossover',
  ]);
  const TECHNIQUE_GROUP_BY_MUSCLE = Object.freeze({
    quadriceps:'Ноги', hamstrings:'Ноги', calves:'Ноги', glutes:'Ноги', abductors:'Ноги', adductors:'Ноги',
    shoulders:'Плечи и руки', biceps:'Плечи и руки', triceps:'Плечи и руки', forearms:'Плечи и руки',
    lats:'Спина', 'middle back':'Спина', 'lower back':'Спина', traps:'Спина', neck:'Спина',
    chest:'Грудь и корпус', abdominals:'Грудь и корпус', obliques:'Грудь и корпус',
  });
  const TECHNIQUE_GROUP_TEXT_RULES = Object.freeze([
    { group:'Грудь и корпус', pattern:/(crunch|sit.?up|russian.?twist|plank|push.?up|chest|bench|\bdip\b|crossover|chest.?fly|abdominal|oblique|leg.?raise|скручив|пресс|планк|отжим|груд|брусь|корпус|подъем.*ног)/i },
    { group:'Ноги', pattern:/(squat|lunge|deadlift|leg.?curl|leg.?extension|leg.?press|calf|hip.?|glute|step.?up|abduct|adduct|hamstring|quadricep|kettlebell.?swing|snatch|clean|thruster|присед|выпад|станов|румын|зашаг|бедр|ягод|икр|голен|носк|сгибание ног|разгибание ног|жим ног|отведение ног|приведение бед|рывок|толчок|трастер|взятие)/i },
    { group:'Плечи и руки', pattern:/(wrist|forearm|bicep|tricep|hammer|curl|shoulder|lateral.?raise|front.?raise|military.?press|arnold|shrug|запяст|предплеч|бицеп|трицеп|молотк|сгибание рук|разгибание рук|плеч|армей|шраг|подъемы? рук|подъем.*подбород)/i },
    { group:'Спина', pattern:/(pulldown|pull.?up|\brow\b|lat_|back.?extension|good.?morning|тяга|подтяг|спин|широч|пояс|гиперэкстенз)/i },
  ]);
  const TECHNIQUE_STANDING_TEXT = /(snatch|clean|jerk|thruster|step.?up|squat|lunge|deadlift|calf|hip.?abduction|hip.?adduction|рывок|толчок|трастер|взятие|зашаг|присед|выпад|станов|перекаты|отведение ног.*стоя|приведение бед.*стоя)/i;
  const TECHNIQUE_UPPER_TEXT = /(wrist|forearm|bicep|tricep|hammer|curl|shoulder|lateral.?raise|front.?raise|military.?press|arnold|shrug|pulldown|pull.?up|\brow\b|bench|chest|fly|crossover|запяст|предплеч|бицеп|трицеп|молотк|плеч|армей|шраг|тяга верхнего|тяга.*(груд|живот|подбород)|подтяг|жим.*(груд|леж|плеч)|сведение рук|разведение рук|подъемы? рук)/i;
  const TECHNIQUE_FLOOR_TEXT = /(push.?up|plank|crunch|sit.?up|russian.?twist|leg.?raise|bridge|mountain.?climber|back.?extension|скручив|планк|отжим|лежа|на полу|мостик|упор|четвереньк|складк|подъемы? туловища)/i;

  function exerciseTechniqueText(exercise) {
    return [exercise?.id, exercise?.name, exercise?.nameRu, exercise?.displayNameSimple]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function mapExerciseToTechniqueProfile(exercise) {
    const pose = String(exercise?.pose || '');
    const text = exerciseTechniqueText(exercise);
    for (const rule of TECHNIQUE_PROFILE_RULES) {
      if (!rule.poses.includes(pose)) continue;
      if (!rule.include.test(text) || rule.exclude.test(text)) continue;
      return { profile: rule.profile, group: rule.group, analysisLevel: 'detailed' };
    }
    const primary = Array.isArray(exercise?.primary) ? exercise.primary : [];
    const group = TECHNIQUE_GROUP_TEXT_RULES.find(rule => rule.pattern.test(text))?.group
      || primary.map(muscle => TECHNIQUE_GROUP_BY_MUSCLE[muscle]).find(Boolean)
      || 'Грудь и корпус';
    let profile = 'general_standing';
    if (TECHNIQUE_STANDING_TEXT.test(text)) profile = 'general_standing';
    else if (TECHNIQUE_UPPER_TEXT.test(text)) profile = 'general_upper';
    else if (TECHNIQUE_FLOOR_TEXT.test(text)) profile = 'general_floor';
    else if (pose === 'stretch_upper' || (GENERAL_UPPER_POSES.has(pose) && pose !== 'pushup')) profile = 'general_upper';
    else if (GENERAL_FLOOR_POSES.has(pose) && pose !== 'pushup') profile = 'general_floor';
    return { profile, group, analysisLevel: 'basic' };
  }

  function buildTechniqueCatalog(exercises) {
    if (!Array.isArray(exercises)) return [];
    const seen = new Set();
    const groupOrder = ['Ноги', 'Плечи и руки', 'Спина', 'Грудь и корпус'];
    return exercises.map(exercise => {
      const mapped = mapExerciseToTechniqueProfile(exercise);
      if (!mapped || !exercise?.id || seen.has(exercise.id)) return null;
      seen.add(exercise.id);
      return {
        id: exercise.id,
        profile: mapped.profile,
        group: mapped.group,
        analysisLevel: mapped.analysisLevel,
        name: exercise.displayNameSimple || exercise.nameRu || exercise.name || 'Упражнение',
        equipment: exercise.equipment || '',
        level: exercise.level || '',
        poster: exercise.poster || '',
        videoSrc: exercise.videoSrc || '',
      };
    }).filter(Boolean).sort((a, b) => {
      const groupDiff = groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
      return groupDiff || a.name.localeCompare(b.name, 'ru');
    });
  }

  function pointVisible(point, threshold) {
    if (!point) return false;
    const visibility = point.visibility == null ? 1 : point.visibility;
    const presence = point.presence == null ? 1 : point.presence;
    return visibility >= threshold && presence >= threshold;
  }

  function distance(a, b) {
    return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z || 0) + (b.z || 0)) / 2 };
  }

  function angle2d(a, b, c) {
    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;
    const magnitude = Math.hypot(abx, aby) * Math.hypot(cbx, cby) || 1e-6;
    const cosine = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / magnitude));
    return Math.acos(cosine) * 180 / Math.PI;
  }

  function angle3d(a, b, c) {
    if (!a || !b || !c) return angle2d(a, b, c);
    const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
    const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
    const magnitude = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z) || 1e-6;
    const cosine = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) / magnitude));
    return Math.acos(cosine) * 180 / Math.PI;
  }

  function smoothLandmarks(previous, current, alpha = 0.42) {
    if (!Array.isArray(current)) return [];
    const weight = Math.max(0, Math.min(1, Number(alpha) || 0));
    if (!Array.isArray(previous) || previous.length !== current.length) {
      return current.map(point => point ? { ...point } : point);
    }
    return current.map((point, index) => {
      const before = previous[index];
      if (!point || !before) return point ? { ...point } : point;
      return {
        ...point,
        x: before.x + (point.x - before.x) * weight,
        y: before.y + (point.y - before.y) * weight,
        z: (before.z || 0) + ((point.z || 0) - (before.z || 0)) * weight,
      };
    });
  }

  function lineTiltDegrees(a, b) {
    return Math.abs(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
  }

  function isFloorProfile(exercise) {
    return exercise === 'pushup' || exercise === 'plank' || exercise === 'general_floor';
  }

  function isUpperProfile(exercise) {
    return UPPER_PROFILES.has(exercise);
  }

  function requiredPoints(exercise) {
    const base = exercise === 'general_floor'
      ? [...GENERAL_FLOOR_REQUIRED]
      : isFloorProfile(exercise) ? [...FLOOR_REQUIRED]
      : isUpperProfile(exercise) ? [...UPPER_REQUIRED] : [...STANDING_REQUIRED];
    if (exercise === 'squat' || exercise === 'lunge') base.push(31, 32);
    if (exercise === 'hinge') base.push(15, 16);
    if (exercise === 'bridge') base.push(31, 32);
    return [...new Set(base)];
  }

  function frameChecks(landmarks, worldLandmarks, exercise) {
    const L = landmarks || [];
    const upperProfile = isUpperProfile(exercise);
    const required = requiredPoints(exercise);
    const visible = required.filter(index => pointVisible(L[index], FRAME_VISIBILITY_MIN));
    const confidence = required.length
      ? visible.reduce((sum, index) => sum + Math.min(L[index].visibility ?? 1, L[index].presence ?? 1), 0) / required.length
      : 0;
    const visibilityOk = visible.length === required.length && confidence >= FRAME_CONFIDENCE_MIN;

    const framePoints = required.map(index => L[index]).filter(Boolean);
    const marginX = isFloorProfile(exercise) ? 0.025 : 0.035;
    const marginY = 0.025;
    const framingOk = visibilityOk && framePoints.every(point => (
      point.x >= marginX && point.x <= 1 - marginX && point.y >= marginY && point.y <= 1 - marginY
    ));

    const shouldersVisible = pointVisible(L[11], FRAME_VISIBILITY_MIN) && pointVisible(L[12], FRAME_VISIBILITY_MIN);
    const hipsVisible = pointVisible(L[23], FRAME_VISIBILITY_MIN) && pointVisible(L[24], FRAME_VISIBILITY_MIN);
    let frontalOk = false;
    let frontalScore = 0;
    if (shouldersVisible && (hipsVisible || upperProfile)) {
      const shoulderWidth = distance(L[11], L[12]);
      const shoulderMid = midpoint(L[11], L[12]);
      const noseOffset = L[0] ? Math.abs(L[0].x - shoulderMid.x) / Math.max(shoulderWidth, 0.001) : 0;
      const shoulderDepth = Math.abs((L[11].z || 0) - (L[12].z || 0));
      const centerPass = noseOffset <= 0.36;
      let widthPass;
      let depthPass;
      if (hipsVisible) {
        const hipWidth = distance(L[23], L[24]);
        const hipMid = midpoint(L[23], L[24]);
        const torsoLength = Math.max(distance(shoulderMid, hipMid), 0.001);
        const widthRatio = shoulderWidth / torsoLength;
        const hipRatio = hipWidth / torsoLength;
        const hipDepth = Math.abs((L[23].z || 0) - (L[24].z || 0));
        widthPass = widthRatio >= 0.48 && hipRatio >= 0.26;
        depthPass = shoulderDepth <= 0.16 && hipDepth <= 0.16;
      } else {
        widthPass = shoulderWidth >= 0.10;
        depthPass = shoulderDepth <= 0.16;
      }
      frontalScore = Math.round((Number(widthPass) + Number(centerPass) + Number(depthPass)) / 3 * 100);
      frontalOk = widthPass && centerPass && depthPass;
    }

    return {
      confidence,
      visibilityOk,
      framingOk,
      frontalOk,
      frontalScore,
      checks: [
        { id: 'front', label: 'Лицом', ok: frontalOk },
        { id: 'frame', label: isFloorProfile(exercise) ? 'Корпус в кадре' : upperProfile ? 'Верх тела в кадре' : 'Тело в кадре', ok: framingOk },
        { id: 'quality', label: 'Суставы видны', ok: visibilityOk },
      ],
      worldAvailable: Array.isArray(worldLandmarks) && worldLandmarks.length >= 29,
    };
  }

  function assessFrame(landmarks, worldLandmarks, exercise = 'free') {
    const quality = frameChecks(landmarks, worldLandmarks, exercise);
    if (!quality.visibilityOk) {
      return {
        ...quality,
        ready: false,
        code: 'low_confidence',
        title: 'Суставы не видны',
        instruction: isUpperProfile(exercise)
          ? 'Покажи лицо, оба плеча, локти и кисти. Для упражнений верха вставать в полный рост не нужно.'
          : 'Добавь света и освободи силуэт: лицо, плечи, таз и опорные суставы не должны перекрываться.',
      };
    }
    if (!quality.framingOk) {
      return {
        ...quality,
        ready: false,
        code: 'fit_body',
        title: 'Не помещаешься в кадр',
        instruction: isFloorProfile(exercise)
          ? 'Отодвинь телефон: плечи, кисти и таз должны быть видны одновременно.'
          : isUpperProfile(exercise)
            ? 'Расположись по пояс: лицо, плечи, локти и кисти должны оставаться внутри кадра.'
          : 'Отойди от телефона: оставь немного воздуха над головой и под стопами.',
      };
    }
    if (!quality.frontalOk) {
      return {
        ...quality,
        ready: false,
        code: 'turn_front',
        title: 'Повернись лицом к камере',
        instruction: 'Разверни плечи и таз параллельно экрану. Нос держи по центру между плечами.',
      };
    }
    return {
      ...quality,
      ready: true,
      code: 'ready',
      title: 'Положение готово',
      instruction: 'Сохраняй фронтальный ракурс и начинай движение в спокойном темпе.',
    };
  }

  function evaluateExercise(landmarks, worldLandmarks, exercise = 'free') {
    const L = landmarks || [];
    const W = Array.isArray(worldLandmarks) && worldLandmarks.length >= 29 ? worldLandmarks : L;
    const metrics = [];
    const bad = new Set();
    const shoulderWidth = Math.max(distance(L[11], L[12]), 0.001);
    const shoulderMid = midpoint(L[11], L[12]);
    const hipsReliable = pointVisible(L[23], FRAME_VISIBILITY_MIN) && pointVisible(L[24], FRAME_VISIBILITY_MIN);
    const hipMid = hipsReliable
      ? midpoint(L[23], L[24])
      : { x: shoulderMid.x, y: shoulderMid.y + shoulderWidth * 1.35, z: shoulderMid.z || 0 };
    const torsoLength = Math.max(distance(shoulderMid, hipMid), 0.001);

    function metric(id, label, ok, detail, tip, joints, options = {}) {
      const item = { id, label, ok: Boolean(ok), detail, tip, joints: [...joints], score: options.score !== false };
      metrics.push(item);
      if (!item.ok) joints.forEach(index => bad.add(index));
      return item;
    }

    const shoulderTilt = lineTiltDegrees(L[11], L[12]);
    metric(
      'shoulder_level',
      'Плечи',
      shoulderTilt <= 7,
      shoulderTilt <= 7 ? 'Плечи на одном уровне' : `Перекос около ${Math.round(shoulderTilt)}°`,
      'Опусти приподнятое плечо и распредели опору равномерно.',
      [11, 12],
    );

    const hipTilt = hipsReliable ? lineTiltDegrees(L[23], L[24]) : 0;
    const trunkLean = hipsReliable ? Math.abs(shoulderMid.x - hipMid.x) / torsoLength : 0;
    if (hipsReliable) {
      metric(
        'pelvis_level',
        'Таз',
        hipTilt <= 8,
        hipTilt <= 8 ? 'Таз без заметного перекоса' : `Перекос около ${Math.round(hipTilt)}°`,
        'Выровняй таз и не переноси вес только на одну ногу или руку.',
        [23, 24],
      );

      const trunkDegrees = Math.atan(trunkLean) * 180 / Math.PI;
      metric(
        'trunk_center',
        'Корпус',
        trunkLean <= 0.14,
        trunkLean <= 0.14 ? 'Центр корпуса удерживается' : `Боковой завал около ${Math.round(trunkDegrees)}°`,
        'Верни грудную клетку над центром таза, не компенсируй движением в сторону.',
        [11, 12, 23, 24],
      );
    }

    if (exercise !== 'pushup' && exercise !== 'plank' && L[0]) {
      const headOffset = Math.abs(L[0].x - shoulderMid.x) / shoulderWidth;
      metric(
        'head_center',
        'Голова',
        headOffset <= 0.22,
        headOffset <= 0.22 ? 'Голова продолжает линию корпуса' : 'Голова смещена относительно плеч',
        'Смотри прямо и держи уши примерно на одинаковом расстоянии от плеч.',
        [0, 7, 8, 11, 12],
      );
    }

    if (exercise === 'squat' || exercise === 'lunge') {
      const leftReference = Math.max(L[23].x, L[27].x, L[31]?.x ?? L[27].x);
      const rightReference = Math.min(L[24].x, L[28].x, L[32]?.x ?? L[28].x);
      const leftInward = Math.max(0, L[25].x - leftReference) / shoulderWidth;
      const rightInward = Math.max(0, rightReference - L[26].x) / shoulderWidth;
      const kneeTrackOk = leftInward <= 0.10 && rightInward <= 0.10;
      metric(
        'knee_track',
        'Колени',
        kneeTrackOk,
        kneeTrackOk ? 'Колени идут по линии стоп' : 'Одно или оба колена уходят внутрь',
        'Направляй колено к линии второго–третьего пальца стопы, сохраняя полную опору стопы.',
        [25, 26, 27, 28, 31, 32],
      );

      if (exercise === 'squat') {
        const leftKneeAngle = angle3d(W[23], W[25], W[27]);
        const rightKneeAngle = angle3d(W[24], W[26], W[28]);
        const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);
        metric(
          'leg_symmetry',
          'Нагрузка ног',
          kneeDifference <= 18,
          kneeDifference <= 18 ? 'Колени сгибаются синхронно' : `Разница сгибания около ${Math.round(kneeDifference)}°`,
          'Замедли движение и держи одинаковое давление правой и левой стопой.',
          [23, 24, 25, 26, 27, 28],
        );
      }

      const feetMid = midpoint(L[27], L[28]);
      const hipShift = Math.abs(hipMid.x - feetMid.x) / shoulderWidth;
      metric(
        'hip_shift',
        'Центр таза',
        hipShift <= 0.15,
        hipShift <= 0.15 ? 'Таз остаётся над центром опоры' : 'Таз уходит в сторону',
        'Смести таз к центру между стопами и повтори медленнее.',
        [23, 24, 25, 26],
      );

      if (exercise === 'squat') {
        const stanceRatio = distance(L[27], L[28]) / shoulderWidth;
        metric(
          'stance_width',
          'Опора',
          stanceRatio >= 0.60 && stanceRatio <= 1.65,
          stanceRatio < 0.60 ? 'Стопы слишком близко' : stanceRatio > 1.65 ? 'Стопы слишком широко' : 'Ширина опоры стабильна',
          'Поставь стопы примерно на ширине плеч и сохрани выбранную ширину весь подход.',
          [27, 28, 31, 32],
        );
      }
    }

    if (exercise === 'lateral_raise') {
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      const heightDifference = Math.abs(L[15].y - L[16].y) / torsoLength;
      const armLengthDifference = Math.abs(distance(L[11], L[15]) - distance(L[12], L[16])) / shoulderWidth;
      metric(
        'arm_symmetry',
        'Руки',
        Math.abs(leftElbow - rightElbow) <= 16 && heightDifference <= 0.18,
        heightDifference <= 0.18 ? 'Кисти поднимаются на одинаковую высоту' : 'Одна рука опережает другую',
        'Снизь темп и поднимай обе руки одновременно, сохраняя одинаковый мягкий угол локтей.',
        [11, 12, 13, 14, 15, 16],
      );
      metric(
        'arm_path',
        'Амплитуда',
        armLengthDifference <= 0.16,
        armLengthDifference <= 0.16 ? 'Амплитуда справа и слева совпадает' : 'Амплитуда рук различается',
        'Останови движение на одинаковой высоте и не дотягивай одну сторону корпусом.',
        [11, 12, 15, 16],
      );
    }

    if (exercise === 'curl' || exercise === 'pushdown') {
      const leftElbowOffset = Math.abs(L[13].x - L[11].x) / shoulderWidth;
      const rightElbowOffset = Math.abs(L[14].x - L[12].x) / shoulderWidth;
      const elbowsClose = leftElbowOffset <= 0.34 && rightElbowOffset <= 0.34;
      metric(
        'elbow_position',
        'Положение локтей',
        elbowsClose && Math.abs(leftElbowOffset - rightElbowOffset) <= 0.16,
        elbowsClose ? 'Локти удерживаются симметрично' : 'Локти расходятся от корпуса',
        exercise === 'curl'
          ? 'Зафиксируй локти ближе к корпусу и двигай предплечьями без подъёма плеч.'
          : 'Прижми локти к корпусу и разгибай предплечья, не уводя плечи вперёд.',
        [11, 12, 13, 14],
      );
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      const wristDifference = Math.abs(L[15].y - L[16].y) / torsoLength;
      metric(
        'arm_symmetry',
        'Синхронность',
        Math.abs(leftElbow - rightElbow) <= 18 && wristDifference <= 0.20,
        wristDifference <= 0.20 ? 'Руки проходят движение одновременно' : 'Одна кисть опережает другую',
        'Уменьши скорость или вес и выровняй движение правой и левой руки.',
        [13, 14, 15, 16],
      );
    }

    if (exercise === 'pulldown' || exercise === 'pullup' || exercise === 'row') {
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      const wristDifference = Math.abs(L[15].y - L[16].y) / torsoLength;
      metric(
        'pull_symmetry',
        exercise === 'row' ? 'Тяга рук' : 'Подъём и тяга',
        Math.abs(leftElbow - rightElbow) <= 18 && wristDifference <= 0.20,
        wristDifference <= 0.20 ? 'Правая и левая стороны движутся синхронно' : 'Одна сторона опережает другую',
        'Замедли движение и веди локти одновременно, не перенося корпус в сторону.',
        [11, 12, 13, 14, 15, 16],
      );
      const wristMid = midpoint(L[15], L[16]);
      const gripCenter = Math.abs(wristMid.x - shoulderMid.x) / shoulderWidth;
      metric(
        'grip_center',
        'Центр хвата',
        gripCenter <= 0.18,
        gripCenter <= 0.18 ? 'Хват остаётся по центру корпуса' : 'Хват смещён в сторону',
        'Выровняй положение кистей относительно центра груди и таза.',
        [11, 12, 15, 16, 23, 24],
      );
    }

    if (exercise === 'chest_press') {
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      const wristDifference = Math.abs(L[15].y - L[16].y) / torsoLength;
      metric(
        'press_symmetry',
        'Жим рук',
        Math.abs(leftElbow - rightElbow) <= 18 && wristDifference <= 0.18,
        wristDifference <= 0.18 ? 'Рукоятки движутся на одной высоте' : 'Одна рука выжимает выше другой',
        'Выровняй высоту рукояток и выжимай обеими руками одновременно.',
        [11, 12, 13, 14, 15, 16],
      );
      const wristMid = midpoint(L[15], L[16]);
      metric(
        'press_center',
        'Центр жима',
        Math.abs(wristMid.x - shoulderMid.x) / shoulderWidth <= 0.18,
        'Рукоятки должны оставаться симметричными относительно груди',
        'Проверь посадку и положение кистей перед следующим повтором.',
        [11, 12, 15, 16],
      );
    }

    if (exercise === 'dip') {
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      metric(
        'dip_symmetry',
        'Локти и опора',
        Math.abs(leftElbow - rightElbow) <= 18 && Math.abs(L[15].y - L[16].y) / torsoLength <= 0.16,
        'Обе руки должны сгибаться и выпрямляться одновременно',
        'Снизь темп и держи одинаковое давление на правый и левый брус.',
        [11, 12, 13, 14, 15, 16],
      );
    }

    if (exercise === 'calf_raise') {
      const leftRise = (L[31]?.y ?? L[27].y) - (L[29]?.y ?? L[27].y);
      const rightRise = (L[32]?.y ?? L[28].y) - (L[30]?.y ?? L[28].y);
      metric(
        'heel_symmetry',
        'Пятки',
        Math.abs(leftRise - rightRise) / torsoLength <= 0.10,
        'Пятки поднимаются на сопоставимую высоту',
        'Поднимай обе пятки одновременно и не переноси вес на одну стопу.',
        [27, 28, 29, 30, 31, 32],
      );
      const leftKnee = angle3d(W[23], W[25], W[27]);
      const rightKnee = angle3d(W[24], W[26], W[28]);
      metric(
        'leg_symmetry',
        'Колени',
        Math.abs(leftKnee - rightKnee) <= 14,
        'Колени сохраняют одинаковое положение',
        'Не сгибай одну ногу сильнее другой и держи таз по центру.',
        [23, 24, 25, 26, 27, 28],
      );
    }

    if (exercise === 'hinge') {
      const leftReference = Math.max(L[23].x, L[27].x);
      const rightReference = Math.min(L[24].x, L[28].x);
      const kneesOk = Math.max(0, L[25].x - leftReference) / shoulderWidth <= 0.11
        && Math.max(0, rightReference - L[26].x) / shoulderWidth <= 0.11;
      metric(
        'knee_track',
        'Ось ног',
        kneesOk,
        kneesOk ? 'Колени остаются по линии стоп' : 'Колено уходит внутрь',
        'Разведи колени по направлению носков и сохрани полную опору стоп.',
        [23, 24, 25, 26, 27, 28],
      );
      const wristMid = midpoint(L[15], L[16]);
      const gripCentered = Math.abs(wristMid.x - hipMid.x) / shoulderWidth <= 0.18;
      metric(
        'grip_center',
        'Гриф и хват',
        gripCentered && Math.abs(L[15].y - L[16].y) / torsoLength <= 0.14,
        gripCentered ? 'Гриф удерживается по центру' : 'Гриф или хват смещён в сторону',
        'Выровняй хват относительно центра таза и начинай тягу без перекоса.',
        [15, 16, 23, 24],
      );
    }

    if (exercise === 'bridge') {
      const leftInward = Math.max(0, L[25].x - Math.max(L[23].x, L[27].x)) / shoulderWidth;
      const rightInward = Math.max(0, Math.min(L[24].x, L[28].x) - L[26].x) / shoulderWidth;
      metric(
        'knee_track',
        'Колени',
        leftInward <= 0.10 && rightInward <= 0.10,
        'Колени должны сохранять направление стоп',
        'Не своди колени внутрь и дави стопами в пол равномерно.',
        [23, 24, 25, 26, 27, 28],
      );
      const feetMid = midpoint(L[27], L[28]);
      metric(
        'hip_shift',
        'Центр таза',
        Math.abs(hipMid.x - feetMid.x) / shoulderWidth <= 0.15,
        'Таз поднимается по центру между стопами',
        'Выровняй стопы и подними таз без смещения вправо или влево.',
        [23, 24, 25, 26, 27, 28],
      );
    }

    if (exercise === 'leg_extension') {
      const leftKnee = angle3d(W[23], W[25], W[27]);
      const rightKnee = angle3d(W[24], W[26], W[28]);
      const ankleDifference = Math.abs(L[27].y - L[28].y) / torsoLength;
      metric(
        'leg_symmetry',
        'Разгибание ног',
        Math.abs(leftKnee - rightKnee) <= 15 && ankleDifference <= 0.18,
        ankleDifference <= 0.18 ? 'Голени поднимаются на одинаковую высоту' : 'Одна голень опережает другую',
        'Уменьши вес и разгибай обе ноги одновременно, не отрывая таз от сиденья.',
        [23, 24, 25, 26, 27, 28],
      );
    }

    if (exercise === 'ohp') {
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      const elbowDifference = Math.abs(leftElbow - rightElbow);
      const wristHeightDifference = Math.abs(L[15].y - L[16].y) / torsoLength;
      const armSymmetryOk = elbowDifference <= 18 && wristHeightDifference <= 0.20;
      metric(
        'arm_symmetry',
        'Руки',
        armSymmetryOk,
        armSymmetryOk ? 'Руки движутся синхронно' : 'Одна рука опережает или разгибается иначе',
        'Снизь вес или темп: веди локти и кисти вверх одновременно.',
        [13, 14, 15, 16],
      );

      const wristsAreOverhead = L[15].y < L[11].y && L[16].y < L[12].y;
      const leftTrack = Math.abs(L[15].x - L[11].x) / shoulderWidth;
      const rightTrack = Math.abs(L[16].x - L[12].x) / shoulderWidth;
      const wristTrackOk = !wristsAreOverhead || (leftTrack <= 0.34 && rightTrack <= 0.34);
      metric(
        'wrist_track',
        'Кисти',
        wristTrackOk,
        wristTrackOk ? 'Кисти проходят над плечами' : 'Кисть уходит слишком далеко в сторону',
        'В верхней точке собери кисть над плечом, сохраняя нейтральное запястье.',
        [11, 12, 15, 16],
      );
    }

    if (exercise === 'pushup' || exercise === 'plank') {
      const leftHandTrack = Math.abs(L[15].x - L[11].x) / shoulderWidth;
      const rightHandTrack = Math.abs(L[16].x - L[12].x) / shoulderWidth;
      metric(
        'support_symmetry',
        'Опора рук',
        leftHandTrack <= 0.42 && rightHandTrack <= 0.42 && Math.abs(leftHandTrack - rightHandTrack) <= 0.18,
        'Ладони или локти должны стоять симметрично относительно плеч',
        'Переставь опору так, чтобы плечи не разворачивались и обе стороны несли одинаковую нагрузку.',
        [11, 12, 13, 14, 15, 16],
      );

      if (exercise === 'pushup') {
        const leftElbow = angle3d(W[11], W[13], W[15]);
        const rightElbow = angle3d(W[12], W[14], W[16]);
        const elbowDifference = Math.abs(leftElbow - rightElbow);
        metric(
          'elbow_symmetry',
          'Локти',
          elbowDifference <= 18,
          elbowDifference <= 18 ? 'Локти сгибаются одинаково' : `Разница сгибания около ${Math.round(elbowDifference)}°`,
          'Замедли опускание и сохрани одинаковый угол локтей справа и слева.',
          [11, 12, 13, 14, 15, 16],
        );
      }
    }

    if (exercise === 'general_standing') {
      const ankleMid = midpoint(L[27], L[28]);
      const baseOffset = Math.abs(hipMid.x - ankleMid.x) / shoulderWidth;
      metric(
        'base_alignment',
        'Центр опоры',
        baseOffset <= 0.22,
        baseOffset <= 0.22 ? 'Таз остаётся над видимой опорой' : 'Центр таза заметно смещён',
        'Верни корпус к центру опоры и проверь положение стоп перед следующим повтором.',
        [23, 24, 25, 26, 27, 28],
      );
    }

    if (exercise === 'general_upper') {
      const upperAlignmentOk = shoulderTilt <= 9 && trunkLean <= 0.18;
      metric(
        'upper_alignment',
        'Верх тела',
        upperAlignmentOk,
        upperAlignmentOk ? 'Корпус и плечи сохраняют устойчивое положение' : 'Плечи или корпус заметно смещаются',
        'Снизь темп и верни плечи и корпус к устойчивому положению.',
        [11, 12, 23, 24],
      );
    }

    if (exercise === 'general_floor') {
      const coreOk = shoulderTilt <= 9 && hipTilt <= 10 && trunkLean <= 0.18;
      metric(
        'core_alignment',
        'Положение корпуса',
        coreOk,
        coreOk ? 'Плечи и таз сохраняют видимую линию' : 'Корпус смещён или развёрнут относительно камеры',
        'Выровняй положение корпуса во фронтальной плоскости и повтори движение медленнее.',
        [11, 12, 23, 24],
      );
    }

    if (exercise === 'free') {
      const leftElbow = angle3d(W[11], W[13], W[15]);
      const rightElbow = angle3d(W[12], W[14], W[16]);
      metric(
        'arm_symmetry',
        'Руки',
        Math.abs(leftElbow - rightElbow) <= 22,
        'Сравнение положения правой и левой руки',
        'Поставь руки симметрично, если проверяешь исходную стойку.',
        [11, 12, 13, 14, 15, 16],
      );
      const leftKnee = angle3d(W[23], W[25], W[27]);
      const rightKnee = angle3d(W[24], W[26], W[28]);
      metric(
        'leg_symmetry',
        'Ноги',
        Math.abs(leftKnee - rightKnee) <= 22,
        'Сравнение положения правой и левой ноги',
        'Распредели вес равномерно между стопами.',
        [23, 24, 25, 26, 27, 28],
      );
    }

    const scored = metrics.filter(item => item.score);
    const passed = scored.filter(item => item.ok).length;
    const score = scored.length ? Math.round(passed / scored.length * 100) : 0;
    const issues = metrics.filter(item => !item.ok);
    return {
      score,
      metrics,
      issues,
      bad,
      summary: issues.length ? issues[0].tip : 'Видимые фронтальные ориентиры стабильны. Сохраняй темп и положение.',
    };
  }

  return Object.freeze({
    IDX,
    POSE_CONNECTIONS,
    POSE_POINTS,
    EXERCISE_GUIDES,
    mapExerciseToTechniqueProfile,
    buildTechniqueCatalog,
    assessFrame,
    evaluateExercise,
    smoothLandmarks,
    angle2d,
    angle3d,
  });
}));
