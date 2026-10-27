(function initPrimeBodyAppleHealth(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PrimeBodyAppleHealth = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createAppleHealthApi() {
  'use strict';

  const LOCAL_HOSTS = Object.freeze(['localhost', '127.0.0.1', '::1', '[::1]']);
  const FIXTURE_DAILY = Object.freeze({
    day: '2026-07-10',
    steps: 8123,
    active_energy_kcal: 544.2,
  });
  // The published 1.0.3 Shortcut reads only steps and active calories. A
  // composition row is offered only after the device has run the future
  // composition-capable Shortcut once, so users are never sent into a dead
  // consent path by an older installation.
  const COMPOSITION_SHORTCUT_MIN_VERSION = '1.1.0';
  let config = null;
  let oneTimeShortcutKey = '';

  function isCurrent(scope) {
    return !!scope && config === scope && (!scope.isCurrent || scope.isCurrent());
  }

  function requireCurrent(scope) {
    if (!isCurrent(scope)) throw new Error('HEALTH_SESSION_CHANGED');
  }

  function finiteMetric(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function isLocalHost(host) {
    return LOCAL_HOSTS.includes(String(host || '').toLowerCase());
  }

  function hasPilotQuery(search) {
    try { return new URLSearchParams(String(search || '').replace(/^\?/, '')).get('pb_health_pilot') === '1'; } catch (_) { return false; }
  }

  function fixtureEnabled(options = {}) {
    return isLocalHost(options.host) && hasPilotQuery(options.search);
  }

  function pilotEnabled(options = {}) {
    return fixtureEnabled(options) || options.features?.appleHealth === true;
  }

  function formatInteger(value) {
    const number = finiteMetric(value);
    if (number === null) return 'Нет данных';
    return Math.round(number).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  }

  function formatToday(day = {}) {
    const energy = finiteMetric(day.active_energy_kcal);
    return {
      steps: formatInteger(day.steps),
      energy: energy !== null ? `${Math.round(energy)} ккал` : 'Нет данных',
      syncState: day?.day ? 'Есть данные' : 'Нет данных',
    };
  }

  function formatComposition(row = null) {
    const fat = finiteMetric(row?.body_fat_pct);
    if (fat === null) return null;
    const mass = finiteMetric(row?.body_mass_kg);
    const lean = finiteMetric(row?.lean_mass_kg);
    const recordedAt = Date.parse(row?.recorded_at || '');
    return {
      fat: `${fat.toFixed(1)}%`,
      mass: mass === null ? '' : `${mass.toFixed(1)} кг`,
      lean: lean === null ? '' : `${lean.toFixed(1)} кг`,
      date: Number.isFinite(recordedAt)
        ? new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(new Date(recordedAt))
        : '',
    };
  }

  function versionAtLeast(version, minimum) {
    const current = String(version || '').split('.').map(Number);
    const required = String(minimum || '').split('.').map(Number);
    if (current.length !== 3 || required.length !== 3 || [...current, ...required].some(value => !Number.isSafeInteger(value) || value < 0)) return false;
    for (let index = 0; index < 3; index += 1) {
      if (current[index] !== required[index]) return current[index] > required[index];
    }
    return true;
  }

  function shortcutSupportsComposition(connection) {
    return versionAtLeast(connection?.client_version, COMPOSITION_SHORTCUT_MIN_VERSION);
  }

  function notifyData(payload) {
    try { if (typeof config?.onData === 'function') config.onData(payload || {}); } catch (_) {}
  }

  function documentFor(options) {
    return options.documentRef || (typeof document !== 'undefined' ? document : null);
  }

  function element(id) {
    const mappedId = config?.elementIds?.[id] || id;
    return documentFor(config || {})?.getElementById?.(mappedId) || null;
  }

  function setText(id, value) {
    const target = element(id);
    if (target) target.textContent = value;
  }

  function setHidden(id, hidden) {
    const target = element(id);
    if (target) target.hidden = hidden;
  }

  function setDisabled(id, disabled) {
    const target = element(id);
    if (target) target.disabled = disabled;
  }

  function hidePilot() {
    setHidden('appleHealthToday', true);
    setHidden('appleHealthConnection', true);
  }

  function clearOneTimeKey() {
    oneTimeShortcutKey = '';
    setText('appleHealthShortcutKey', '');
    setText('appleHealthKeyHint', 'Код показывается только один раз. Если потеряли его, обновите ключ.');
    setDisabled('appleHealthCopyKey', true);
  }

  function clearInstallUrl() {
    const install = element('appleHealthInstallShortcut');
    if (!install) return;
    install.hidden = true;
    install.href = '';
    install.removeAttribute?.('href');
  }

  function setupErrorMessage(reason) {
    if (reason === 'health_not_configured') return 'Подключение Apple Health ещё не настроено.';
    if (reason === 'health_pending_operation') return 'Сначала проверьте результат предыдущего запроса.';
    if (reason === 'health_operation_busy') return 'Запрос выполняется в другой вкладке.';
    if (reason === 'health_browser_unsupported') return 'Для этого действия нужен современный браузер с безопасным подключением.';
    if (reason === 'invalid_health_journal') return 'Не удалось прочитать сохранённый запрос. Выйдите из аккаунта и войдите снова.';
    if (reason === 'health_writeback_unavailable') return 'Передача тренировок недоступна. Обновите состояние подключения.';
    if (reason === 'health_writeback_consent_required') return 'Согласие изменилось. Обновите страницу и подтвердите его снова.';
    if (reason === 'pilot_not_allowed') return 'Подключение пока доступно только для тестового аккаунта владельца.';
    if (reason === 'subscription_required') return 'Для подключения Apple Health нужна активная оплаченная подписка.';
    if (reason === 'health_sync_consent_required') return 'Подтвердите согласие на импорт агрегатов Apple Health.';
    if (reason === 'shortcut_install_unavailable') return 'Установка Shortcut готовится. Повторите чуть позже.';
    return 'Не удалось создать код. Проверьте соединение и повторите.';
  }

  function formatLastSync(value) {
    const timestamp = Date.parse(value || '');
    if (!Number.isFinite(timestamp)) return 'Синхронизации пока не было';
    return `Обновлено ${new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))}`;
  }

  function renderSetup(connection, options = {}) {
    const preview = !!options.preview;
    const failed = !!options.error;
    const connected = connection?.status === 'active';
    const consent = element('appleHealthConsent');
    const connect = element('appleHealthConnect');
    if (consent && !connected) consent.checked = false;
    if (connect) {
      connect.hidden = connected;
      connect.disabled = preview || failed || !config?.user || !consent?.checked;
      connect.textContent = 'Создать личный код';
    }
    const allowed = config?.managementStatus?.can_connect === true;
    if (connect) connect.hidden = connected || !allowed && !preview;
    setHidden('appleHealthConsentWrap', preview || !allowed);
    setHidden('appleHealthSetup', preview || (!connected && !oneTimeShortcutKey && !config?.managementStatus?.has_data));
    setHidden('appleHealthOneTime', !oneTimeShortcutKey);
    setHidden('appleHealthRotateKey', preview || !connected || !allowed);
    setHidden('appleHealthRevokeKey', preview || !connected);
    setHidden('appleHealthDeleteData', preview || !connected && !config?.managementStatus?.has_data);
  }

  function renderComposition(rows, connection, options = {}) {
    const preview = !!options.preview;
    const failed = !!options.error;
    const connected = connection?.status === 'active';
    const requested = Array.isArray(connection?.requested_types) ? connection.requested_types : [];
    const enabled = requested.includes('body_fat_percentage');
    const supported = shortcutSupportsComposition(connection);
    const latest = Array.isArray(rows) ? rows[0] || null : null;
    const values = formatComposition(latest);
    const consent = element('appleHealthCompositionConsent');
    const enable = element('appleHealthEnableComposition');
    const disable = element('appleHealthDisableComposition');
    const deleteData = element('appleHealthDeleteComposition');

    setHidden('appleHealthComposition', preview || failed || !connected);
    if (!connected || preview || failed) {
      setHidden('appleHealthDisableComposition', true);
      setHidden('appleHealthDeleteComposition', true);
      return;
    }
    const canEnable = supported && !enabled && config?.managementStatus?.can_connect === true;
    setHidden('appleHealthCompositionConsentWrap', !canEnable);
    setHidden('appleHealthEnableComposition', !canEnable);
    setHidden('appleHealthDisableComposition', !enabled);
    setHidden('appleHealthDeleteComposition', !values);
    if (consent && !canEnable) consent.checked = false;
    if (enable) enable.disabled = !canEnable || !consent?.checked;
    if (disable) disable.disabled = !enabled;
    if (deleteData) deleteData.disabled = !values;

    if (!enabled) {
      if (values) {
        setText('appleHealthCompositionStatus', `Жир ${values.fat}`);
        setText('appleHealthCompositionNote', `Импорт отключён. Последнее сохранённое показание: ${values.date || 'без даты'}. Его можно удалить отдельно; на новые рекомендации оно больше не повлияет.`);
        return;
      }
      if (!supported) {
        setText('appleHealthCompositionStatus', 'Нужно обновление Shortcut');
        setText('appleHealthCompositionNote', 'Текущая команда синхронизирует шаги и активные калории. Реальный результат биоимпеданса можно внести в BodyCheck; автоматический импорт появится только после установки обновлённой команды.');
        return;
      }
      setText('appleHealthCompositionStatus', 'Не подключён');
      setText('appleHealthCompositionNote', 'Подключи чтение процента жира, массы тела и безжировой массы. Данные появятся только если их записывают умные весы или другое устройство.');
      return;
    }
    if (!values) {
      setText('appleHealthCompositionStatus', 'Нет показаний');
      setText('appleHealthCompositionNote', 'В Apple Health пока нет записи процента жира. Добавь в «Здоровье» данные от умных весов и запусти команду синхронизации.');
      return;
    }
    setText('appleHealthCompositionStatus', `Жир ${values.fat}`);
    setText('appleHealthCompositionNote', `${values.mass ? `Вес ${values.mass}` : 'Вес не передан'}${values.lean ? ` · безжировая масса ${values.lean}` : ''}${values.date ? ` · ${values.date}` : ''}. Импортировано из Apple Health.`);
  }

  function render(daily, connection, options = {}) {
    const values = formatToday(daily || {});
    setText('appleHealthSteps', values.steps);
    setText('appleHealthEnergy', values.energy);
    setText('appleHealthSyncState', values.syncState);
    const preview = !!options.preview;
    const failed = !!options.error;
    const rejectedSync = !preview && !failed && connection?.status === 'active' && Boolean(connection?.last_error_code);
    setText('appleHealthConnectionStatus', preview ? 'Предпросмотр данных' : failed ? 'Не удалось обновить' : rejectedSync ? 'Нужна повторная синхронизация' : connection?.status === 'active' ? 'Подключено' : connection?.status === 'revoked' ? 'Ключ отозван' : 'Не подключено');
    setText('appleHealthLastSync', preview ? 'Локальная фикстура, без синхронизации' : failed ? 'Обновите данные, чтобы повторить' : rejectedSync ? 'Данные не сохранились. Запустите команду синхронизации ещё раз.' : formatLastSync(connection?.last_sync_at));
    setDisabled('appleHealthRefresh', false);
    renderSetup(connection, options);
    renderComposition(options.bodyCompositionRows || [], connection, options);
    setHidden('appleHealthToday', false);
    setHidden('appleHealthConnection', false);
  }

  function isPreview() {
    return config && fixtureEnabled(config);
  }

  async function loadRemoteData(scope) {
    if (!scope?.sb || !scope?.user?.id) return null;
    const userId = scope.user.id;
    const [connectionResult, dailyResult] = await Promise.all([
      scope.sb.from('pb_health_connections')
        .select('id,status,last_sync_at,last_error_code,connector_type,requested_types,client_version')
        .eq('user_id', userId)
        .eq('connector_type', 'shortcut')
        .order('last_sync_at', { ascending: false, nullsFirst: false })
        .limit(1),
      scope.sb.from('pb_health_daily')
        .select('day,steps,active_energy_kcal')
        .eq('user_id', userId)
        .order('day', { ascending: false })
        .limit(7),
    ]);
    requireCurrent(scope);
    if (connectionResult?.error || dailyResult?.error) throw new Error('HEALTH_READ_FAILED');
    let bodyCompositionRows = [];
    try {
      const compositionResult = await scope.sb.from('pb_health_body_composition')
        .select('recorded_at,body_fat_pct,body_mass_kg,fat_mass_kg,lean_mass_kg,source_label')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(12);
      if (!compositionResult?.error) bodyCompositionRows = compositionResult?.data || [];
    } catch (_) {}
    requireCurrent(scope);
    const dailyRows = dailyResult?.data || [];
    const todayKey = String(scope.todayKey || '');
    return {
      connection: connectionResult?.data?.[0] || null,
      daily: dailyRows.find(row => String(row?.day || '') === todayKey) || null,
      dailyRows,
      bodyCompositionRows,
    };
  }

  async function refresh(actionScope = null) {
    if (!config || !pilotEnabled(config) || config.privacyOnly) return null;
    if (config.actionBusy && actionScope !== config) return null;
    if (isPreview()) {
      const data = { daily: FIXTURE_DAILY, dailyRows: [FIXTURE_DAILY], bodyCompositionRows: [], connection: null, preview: true };
      render(FIXTURE_DAILY, null, { preview: true, bodyCompositionRows: [] });
      notifyData(data);
      return data;
    }
    if (!config.user || !config.sb) {
      hidePilot();
      return null;
    }
    const scope = config;
    const revision = ++scope.readRevision;
    try {
      const managementStatus = await scope.management.status();
      if (!isCurrent(scope) || revision !== scope.readRevision) return null;
      scope.managementStatus = managementStatus;
      let writeback = null, writebackFailed = false;
      try { writeback = await scope.management.writebackStatus?.() || null; }
      catch (error) {
        if (['health_session_changed', 'verified_account_required'].includes(error.code)) throw error;
        writebackFailed = true;
      }
      if (!isCurrent(scope) || revision !== scope.readRevision) return null;
      if (scope.writebackStatus?.consent_version !== writeback?.consent_version) {
        const consent = element('appleHealthWritebackConsent');
        if (consent) consent.checked = false;
      }
      scope.writebackStatus = writeback;
      scope.writebackFailed = writebackFailed;
      const data = await loadRemoteData(scope);
      if (!isCurrent(scope) || revision !== scope.readRevision) return null;
      render(data?.daily, data?.connection, { bodyCompositionRows: data?.bodyCompositionRows || [] });
      setActionBusy(scope.actionBusy);
      if (!managementStatus.enabled) setText('appleHealthActionStatus', setupErrorMessage('health_not_configured'));
      notifyData(data);
      return data;
    } catch (error) {
      if (!isCurrent(scope) || revision !== scope.readRevision) return null;
      render(null, null, { error: true });
      scope.managementStatus = null;
      scope.writebackStatus = null;
      scope.writebackFailed = true;
      setActionBusy(false);
      setText('appleHealthActionStatus', setupErrorMessage(error?.code));
      notifyData({ daily: null, dailyRows: [], bodyCompositionRows: [], connection: null, error: true });
      return null;
    }
  }

  function validInstallUrl(value) {
    const raw = String(value || '');
    if (raw !== raw.trim() || !/^https:\/\/www\.icloud\.com\/shortcuts\/[A-Za-z0-9_-]+$/.test(raw)) return '';
    try {
      const url = new URL(raw);
      const isShortcutUrl = url.protocol === 'https:'
        && url.hostname === 'www.icloud.com'
        && !url.port
        && !url.username
        && !url.password
        && !url.search
        && !url.hash
        && /^\/shortcuts\/[A-Za-z0-9_-]+$/.test(url.pathname);
      return isShortcutUrl ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  async function managementRequest(body, scope) {
    requireCurrent(scope);
    if (!scope.management || isPreview()) throw new Error('HEALTH_AUTH_REQUIRED');
    const { action, ...options } = body;
    if (action === 'create_shortcut_key') options.consent_version = scope.managementStatus?.sync_consent_version;
    if (action === 'enable_shortcut_body_composition') options.consent_version = scope.managementStatus?.composition_consent_version;
    return scope.management.mutate(action, options);
  }

  function beginAction() {
    if (!config || config.actionBusy) return null;
    config.actionBusy = true;
    config.readRevision += 1;
    return config;
  }

  function endAction(scope) {
    if (!isCurrent(scope)) return;
    scope.actionBusy = false;
    setActionBusy(false);
  }

  function setActionBusy(busy) {
    let pending = false;
    try { pending = !!config?.management?.read(); } catch (_) { pending = true; }
    setHidden('appleHealthPending', !pending);
    setDisabled('appleHealthRetry', busy);
    renderWriteback(busy, pending);
    if (busy) {
      ['appleHealthConnect', 'appleHealthCopyKey', 'appleHealthRotateKey', 'appleHealthRevokeKey', 'appleHealthDeleteData', 'appleHealthRefresh', 'appleHealthEnableComposition', 'appleHealthDisableComposition', 'appleHealthDeleteComposition']
        .forEach(id => setDisabled(id, true));
      return;
    }
    const allowed = config?.managementStatus?.can_connect === true;
    setDisabled('appleHealthConnect', pending || !allowed || !element('appleHealthConsent')?.checked);
    setDisabled('appleHealthCopyKey', !oneTimeShortcutKey);
    setDisabled('appleHealthEnableComposition', pending || !allowed || !element('appleHealthCompositionConsent')?.checked);
    ['appleHealthRotateKey', 'appleHealthRevokeKey', 'appleHealthDeleteData', 'appleHealthRefresh', 'appleHealthDisableComposition', 'appleHealthDeleteComposition']
      .forEach(id => setDisabled(id, id !== 'appleHealthRefresh' && pending));
    setDisabled('appleHealthRotateKey', pending || !allowed || !element('appleHealthConsent')?.checked);
  }

  function renderWriteback(busy, pending) {
    const value = config?.writebackStatus;
    const visible = !!config && !isPreview() && !config.privacyOnly && pilotEnabled(config);
    setHidden('appleHealthWriteback', !visible);
    setText('appleHealthWritebackState', !visible ? '' : !value
      ? config?.writebackFailed ? 'Не удалось проверить передачу тренировок.' : 'Передача тренировок ещё не настроена.'
      : value.effective ? 'Передача включена' : value.enabled ? 'Передача приостановлена' : 'Передача выключена');
    setText('appleHealthWritebackQueue', visible && value?.pending_count ? `Ожидают передачи: ${value.pending_count}` : '');
    setHidden('appleHealthWritebackQueue', !visible || !value?.pending_count);
    const allowed = visible && value?.can_enable && !value.effective && config?.features?.appleHealth === true;
    const consent = element('appleHealthWritebackConsent');
    if (consent && !allowed) consent.checked = false;
    setHidden('appleHealthWritebackConsentWrap', !allowed);
    setHidden('appleHealthWritebackEnable', !allowed);
    setDisabled('appleHealthWritebackConsent', busy || pending || !allowed);
    setDisabled('appleHealthWritebackEnable', busy || pending || !allowed || !consent?.checked);
    const canDisable = visible && (value?.enabled || value?.pending_count > 0);
    setHidden('appleHealthWritebackDisable', !canDisable);
    setDisabled('appleHealthWritebackDisable', busy || pending || !canDisable);
  }

  async function setWorkoutWriteback(enabled) {
    const value = config?.writebackStatus;
    if (!value || isPreview()) return null;
    if (enabled && (!value.can_enable || value.effective || config.features?.appleHealth !== true || !element('appleHealthWritebackConsent')?.checked)) return null;
    if (!enabled) {
      if (!value.enabled && !value.pending_count) return null;
      const confirmRef = config.confirmRef || (typeof confirm === 'function' ? confirm : null);
      if (!confirmRef?.('Отключить передачу тренировок и отменить ожидающие записи? Уже записанные в Apple Health тренировки останутся.')) return null;
    }
    const scope = beginAction();
    if (!scope) return null;
    setActionBusy(true);
    setText('appleHealthActionStatus', 'Сохраняем настройки…');
    try {
      const result = await scope.management.mutate('workout_writeback', { enabled, consent_version: enabled ? value.consent_version : '' });
      if (!isCurrent(scope)) return null;
      const consent = element('appleHealthWritebackConsent');
      if (consent) consent.checked = false;
      await refresh(scope);
      if (isCurrent(scope)) setText('appleHealthActionStatus', 'Настройки сохранены.');
      return result;
    } catch (error) {
      if (isCurrent(scope)) setText('appleHealthActionStatus', setupErrorMessage(error?.code));
      return null;
    } finally { endAction(scope); }
  }

  function showIssuedKey(payload) {
    const rawKey = String(payload.shortcut_key || payload.key || '');
    const installUrl = validInstallUrl(payload.install_url || payload.shortcut_url);
    if (!rawKey || !installUrl) throw new Error('SHORTCUT_SETUP_INCOMPLETE');
    oneTimeShortcutKey = rawKey;
    setText('appleHealthShortcutKey', rawKey);
    setText('appleHealthKeyHint', 'Скопируйте код сейчас и вставьте его при установке Shortcut. Не пересылайте настроенный Shortcut.');
    setDisabled('appleHealthCopyKey', false);
    const install = element('appleHealthInstallShortcut');
    if (install) {
      install.href = installUrl;
      install.hidden = false;
    }
    setHidden('appleHealthConsentWrap', false);
    setHidden('appleHealthSetup', false);
    setHidden('appleHealthOneTime', false);
    setHidden('appleHealthRotateKey', false);
    setHidden('appleHealthRevokeKey', false);
    setHidden('appleHealthDeleteData', false);
    setHidden('appleHealthConnect', true);
    setText('appleHealthConnectionStatus', 'Готово к установке');
    setText('appleHealthActionStatus', 'Личный код создан. Сначала скопируйте его, затем установите Shortcut.');
  }

  async function issueShortcutKey() {
    const consent = element('appleHealthConsent');
    const rotating = !element('appleHealthRotateKey')?.hidden;
    if (!consent?.checked || !config?.managementStatus?.can_connect) return null;
    const confirmRef = config.confirmRef || (typeof confirm === 'function' ? confirm : null);
    if (rotating && !confirmRef?.('Обновить ключ? Старая команда перестанет синхронизировать данные.')) return null;
    const scope = beginAction();
    if (!scope) return null;
    clearOneTimeKey();
    clearInstallUrl();
    setActionBusy(true);
    setText('appleHealthActionStatus', rotating ? 'Обновляем ключ…' : 'Создаём личный код…');
    try {
      const payload = await managementRequest({ action: 'create_shortcut_key', accepted_health_sync: true }, scope);
      if (!isCurrent(scope)) return null;
      await refresh(scope);
      if (!isCurrent(scope)) return null;
      showIssuedKey(payload);
      if (consent) consent.checked = false;
      return payload;
    } catch (error) {
      if (!isCurrent(scope)) return null;
      const reason = error?.code || (error instanceof Error ? error.message : '');
      setText('appleHealthActionStatus', setupErrorMessage(reason));
      return null;
    } finally {
      endAction(scope);
    }
  }

  async function copyShortcutKey() {
    const scope = config;
    if (!scope || !oneTimeShortcutKey || scope.actionBusy) return false;
    const navigatorRef = scope.navigatorRef || (typeof navigator !== 'undefined' ? navigator : null);
    try {
      await navigatorRef?.clipboard?.writeText?.(oneTimeShortcutKey);
      if (!isCurrent(scope)) return false;
      if (typeof navigatorRef?.clipboard?.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
      setText('appleHealthActionStatus', 'Код скопирован. Вставьте его в вопрос при установке Shortcut.');
      return true;
    } catch (_) {
      if (!isCurrent(scope)) return false;
      setText('appleHealthActionStatus', 'Не удалось скопировать автоматически. Выделите код выше вручную.');
      return false;
    }
  }

  async function enableBodyComposition() {
    const consent = element('appleHealthCompositionConsent');
    if (!consent?.checked) return null;
    const scope = beginAction();
    if (!scope) return null;
    setActionBusy(true);
    setText('appleHealthActionStatus', 'Подключаем состав тела…');
    try {
      const payload = await managementRequest({
        action: 'enable_shortcut_body_composition',
        accepted_body_composition: true,
      }, scope);
      if (!isCurrent(scope)) return null;
      setText('appleHealthActionStatus', 'Состав тела подключён. Запусти команду синхронизации после того, как в Apple Health появится запись от весов.');
      await refresh(scope);
      return payload;
    } catch (error) {
      if (!isCurrent(scope)) return null;
      const reason = error instanceof Error ? error.message : '';
      setText('appleHealthActionStatus', reason === 'subscription_required'
        ? 'Для синхронизации состава тела нужна активная оплаченная подписка.'
        : 'Не удалось подключить состав тела. Проверь соединение и повтори.');
      return null;
    } finally {
      endAction(scope);
    }
  }

  async function disableBodyComposition(deleteData) {
    if (!config || config.actionBusy) return null;
    const confirmRef = config.confirmRef || (typeof confirm === 'function' ? confirm : null);
    const warning = deleteData
      ? 'Отключить импорт состава тела и удалить сохранённые показатели? Шаги и активные калории останутся.'
      : 'Отключить импорт состава тела? Шаги и активные калории останутся.';
    if (confirmRef && !confirmRef(warning)) return null;
    const scope = beginAction();
    if (!scope) return null;
    setActionBusy(true);
    setText('appleHealthActionStatus', deleteData ? 'Удаляем состав тела…' : 'Отключаем состав тела…');
    try {
      const payload = await managementRequest({
        action: 'disable_shortcut_body_composition',
        delete_body_composition: deleteData === true,
      }, scope);
      if (!isCurrent(scope)) return null;
      setText('appleHealthActionStatus', deleteData
        ? 'Состав тела отключён и удалён. Шаги и активные калории сохранены.'
        : 'Импорт состава тела отключён. Шаги и активные калории продолжают синхронизироваться.');
      await refresh(scope);
      return payload;
    } catch (_) {
      if (!isCurrent(scope)) return null;
      setText('appleHealthActionStatus', 'Не удалось изменить настройки состава тела. Проверьте соединение и повторите.');
      return null;
    } finally {
      endAction(scope);
    }
  }

  function toggleAutomationGuide() {
    const guide = element('appleHealthAutomationSteps');
    const button = element('appleHealthAutomationGuide');
    if (!guide) return;
    guide.hidden = !guide.hidden;
    button?.setAttribute?.('aria-expanded', String(!guide.hidden));
  }

  async function revokeShortcut(deleteData) {
    if (!config || config.actionBusy) return null;
    const confirmRef = config.confirmRef || (typeof confirm === 'function' ? confirm : null);
    if (deleteData && confirmRef && !confirmRef('Удалить все импортированные данные Apple Health и отозвать ключ?')) return null;
    const scope = beginAction();
    if (!scope) return null;
    setActionBusy(true);
    setText('appleHealthActionStatus', deleteData ? 'Удаляем данные Apple Health…' : 'Отключаем Shortcut…');
    let completed = false;
    try {
      const request = deleteData
        ? { action: 'revoke_shortcut_key', delete_data: true }
        : { action: 'revoke_shortcut_key', delete_data: false };
      const payload = await managementRequest(request, scope);
      if (!isCurrent(scope)) return null;
      completed = true;
      clearOneTimeKey();
      clearInstallUrl();
      setText('appleHealthConnectionStatus', 'Ключ отозван');
      setText('appleHealthActionStatus', deleteData ? 'Данные Apple Health удалены.' : 'Shortcut отключён. Для нового подключения создайте другой код.');
      if (!config.privacyOnly) {
        setHidden('appleHealthSetup', true);
        setHidden('appleHealthOneTime', true);
        setHidden('appleHealthConsentWrap', false);
        setHidden('appleHealthConnect', false);
        const consent = element('appleHealthConsent');
        if (consent) consent.checked = false;
        setDisabled('appleHealthConnect', true);
      } else {
        setDisabled('appleHealthDeleteData', true);
      }
      if (!scope.privacyOnly) await refresh(scope);
      return payload;
    } catch (_) {
      if (!isCurrent(scope)) return null;
      setText('appleHealthActionStatus', 'Не удалось выполнить действие. Проверьте соединение и повторите.');
      return null;
    } finally {
      endAction(scope);
      if (isCurrent(scope) && scope.privacyOnly && completed) setDisabled('appleHealthDeleteData', true);
    }
  }

  function bindControls() {
    const scope = config;
    const consent = element('appleHealthConsent');
    if (consent) consent.onchange = () => setActionBusy(config.actionBusy);
    const compositionConsent = element('appleHealthCompositionConsent');
    if (compositionConsent) compositionConsent.onchange = () => setActionBusy(config.actionBusy);
    const writebackConsent = element('appleHealthWritebackConsent');
    if (writebackConsent) writebackConsent.onchange = () => setActionBusy(config.actionBusy);
    const writebackEnable = element('appleHealthWritebackEnable');
    if (writebackEnable) writebackEnable.onclick = () => setWorkoutWriteback(true);
    const writebackDisable = element('appleHealthWritebackDisable');
    if (writebackDisable) writebackDisable.onclick = () => setWorkoutWriteback(false);
    const connect = element('appleHealthConnect');
    if (connect) connect.onclick = issueShortcutKey;
    const copy = element('appleHealthCopyKey');
    if (copy) copy.onclick = copyShortcutKey;
    const guide = element('appleHealthAutomationGuide');
    if (guide) guide.onclick = toggleAutomationGuide;
    const rotate = element('appleHealthRotateKey');
    if (rotate) rotate.onclick = issueShortcutKey;
    const revoke = element('appleHealthRevokeKey');
    if (revoke) revoke.onclick = () => revokeShortcut(false);
    const deleteButton = element('appleHealthDeleteData');
    if (deleteButton) deleteButton.onclick = () => revokeShortcut(true);
    const refreshButton = element('appleHealthRefresh');
    if (refreshButton) refreshButton.onclick = refresh;
    const enableComposition = element('appleHealthEnableComposition');
    if (enableComposition) enableComposition.onclick = enableBodyComposition;
    const disableComposition = element('appleHealthDisableComposition');
    if (disableComposition) disableComposition.onclick = () => disableBodyComposition(false);
    const deleteComposition = element('appleHealthDeleteComposition');
    if (deleteComposition) deleteComposition.onclick = () => disableBodyComposition(true);
    const retry = element('appleHealthRetry');
    if (retry) retry.onclick = retryPending;
    // A retained handler from an old document must never act on the next owner.
    for (const node of [consent, compositionConsent, writebackConsent, writebackEnable, writebackDisable, connect, copy, guide, rotate, revoke, deleteButton, refreshButton, enableComposition, disableComposition, deleteComposition, retry]) {
      if (!node) continue;
      for (const event of ['onclick', 'onchange']) {
        const handler = node[event];
        if (typeof handler === 'function') node[event] = (...args) => isCurrent(scope) ? handler(...args) : null;
      }
    }
  }

  async function retryPending() {
    const scope = beginAction();
    if (!scope || !scope.management) return null;
    clearOneTimeKey(); clearInstallUrl(); setActionBusy(true);
    try {
      const result = await scope.management.retry();
      if (!isCurrent(scope)) return null;
      await refresh(scope);
      if (!isCurrent(scope)) return null;
      if (result?.shortcut_key) showIssuedKey(result);
      else setText('appleHealthActionStatus', result?.key_requires_rotation
        ? 'Запрос выполнен, но код не сохранился. Подтвердите согласие и обновите ключ.'
        : result?.data_deleted ? 'Данные Apple Health удалены.' : 'Настройки сохранены.');
      return result;
    } catch (error) {
      if (isCurrent(scope)) setText('appleHealthActionStatus', setupErrorMessage(error?.code));
      return null;
    } finally { endAction(scope); }
  }

  function bootPrivacyControl() {
    hidePilot();
    setText('appleHealthActionStatus', 'Данные Apple Health сохранены и вернутся после продления.');
    setHidden('appleHealthDeleteData', false);
    setDisabled('appleHealthDeleteData', false);
    return { privacyOnly: true };
  }

  function destroy() {
    if (config?.onStorage) globalThis.removeEventListener?.('storage', config.onStorage);
    config?.management?.destroy();
    clearOneTimeKey();
    clearInstallUrl();
    hidePilot();
    for (const id of ['appleHealthSetup', 'appleHealthOneTime', 'appleHealthComposition', 'appleHealthWriteback', 'appleHealthDeleteData', 'appleHealthPending']) setHidden(id, true);
    for (const id of ['appleHealthSteps', 'appleHealthEnergy', 'appleHealthSyncState', 'appleHealthConnectionStatus', 'appleHealthLastSync', 'appleHealthCompositionStatus', 'appleHealthCompositionNote', 'appleHealthActionStatus']) setText(id, '');
    for (const id of ['appleHealthConsent', 'appleHealthCompositionConsent', 'appleHealthWritebackConsent']) {
      const node = element(id);
      if (node) node.checked = false;
    }
    if (config) { config.writebackStatus = null; config.privacyOnly = true; }
    setActionBusy(true);
    setHidden('appleHealthPending', true);
    config = null;
  }

  async function boot(options = {}) {
    destroy();
    config = Object.assign({}, options, { user: options.user ? { ...options.user } : null, readRevision: 0, actionBusy: false });
    hidePilot();
    if (!pilotEnabled(config)) return null;
    if (!isPreview() && config.user && config.sb) {
      const scope = config;
      const actions = options.actions || globalThis.WLHealthActions;
      try {
        scope.management = actions.create({ client: scope.sb, owner: scope.user.id, url: scope.sbUrl, anonKey: scope.anonKey,
          storage: scope.storage, locks: scope.locks, fetchRef: scope.fetchRef,
          isCurrent: () => isCurrent(scope) && (!scope.isCurrent || scope.isCurrent()) });
        scope.onStorage = event => {
          if (isCurrent(scope) && event.key === 'wlHealthPendingV1:' + scope.user.id) {
            clearOneTimeKey(); clearInstallUrl();
            setActionBusy(scope.actionBusy);
            if (!scope.actionBusy) refresh();
          }
        };
        globalThis.addEventListener?.('storage', scope.onStorage);
      } catch (_) {
        render(null, null, { error: true });
        setText('appleHealthActionStatus', setupErrorMessage('health_not_configured'));
        return null;
      }
    }
    bindControls();
    globalThis.lucide?.createIcons();
    setActionBusy(false);
    if (config.privacyOnly) return bootPrivacyControl();
    return refresh();
  }

  async function queueWorkoutCompletion(context) {
    const scope = config;
    const current = () => isCurrent(scope) && !scope.privacyOnly && !isPreview()
      && pilotEnabled(scope) && context?.owner === scope.user?.id
      && typeof context.isCurrent === 'function' && context.isCurrent();
    if (!current() || !scope.management?.queueWorkouts || !scope.writebackStatus?.effective) return false;
    // Coalesce concurrent uploads without losing a save which arrived during the request.
    scope.workoutQueueContext = context;
    if (scope.workoutQueueFlight) return scope.workoutQueueFlight;
    scope.workoutQueueFlight = (async () => {
      do {
        const next = scope.workoutQueueContext;
        scope.workoutQueueContext = null;
        if (!current() || !next?.isCurrent()) return false;
        try { await scope.management.queueWorkouts(next.epoch); }
        catch (_) { return false; }
        if (!current()) return false;
        await refresh(scope);
      } while (scope.workoutQueueContext);
      return current();
    })();
    try { return await scope.workoutQueueFlight; }
    finally { scope.workoutQueueFlight = null; }
  }

  return Object.freeze({
    pilotEnabled,
    fixtureEnabled,
    validInstallUrl,
    formatToday,
    boot,
    destroy,
    refresh,
    queueWorkoutCompletion,
  });
}));
