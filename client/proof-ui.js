(function (root) {
  'use strict';
  const STATUS = { pending: 'На проверке', approved: 'Принято', rejected: 'Нужна доработка' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  function errorText(error) {
    if (error?.code === 'proof_scope_changed' || error?.message === 'stale_progress_epoch') return 'Сессия или прогресс изменились. Открой задание заново.';
    if (error?.code === 'invalid_proof_media') return 'Нужен файл JPG, MP4, WebM или MOV до 20 МБ. Для техники прикрепи видео.';
    if (error?.code === 'invalid_proof') return 'Проверь дату, название и заметку.';
    if (error?.message === 'invalid_proof_day') return 'Срок отправки этого задания истёк. Локальную копию можно удалить.';
    if (String(error?.code || '').startsWith('proof_storage') || error?.name === 'QuotaExceededError') return 'Не удалось сохранить файл в браузере. Освободи место и повтори попытку.';
    if (error?.code === 'pending_proof') return 'Для этого задания уже сохранена отправка. Открой задание заново.';
    if (error?.code === '42501' || error?.code === 'auth_required') return 'Не удалось подтвердить доступ. Проверь вход и подписку.';
    return 'Не удалось завершить запрос. Сохранённую отправку можно повторить.';
  }
  function create({ actions, transport, owner, epoch, isCurrent, taskByKey, today,
    openSheet, sheetRoot, compressPhoto, onStored, onChange, openLegacy, confirm = message => root.confirm(message) }) {
    let mode = 'loading', rows = [], queued = [], queueError = null, revision = 0;
    let flight = false;
    const urls = new Set();
    function cleanup() { for (const url of urls) root.URL.revokeObjectURL(url); urls.clear(); }
    function active(panel) { return isCurrent() && panel.isConnected && !sheetRoot().hidden && sheetRoot().querySelector('[data-proof-panel]') === panel; }
    function status(key, day) {
      if (mode !== 'ready') return null;
      if (queued.some(item => item.task.key === key && item.task.day === day)) return 'Отправка сохранена';
      return STATUS[rows.find(row => row.task_key === key && row.local_day === day)?.status] || 'Подтвердить';
    }
    async function refresh() {
      const version = ++revision;
      try {
        const data = await transport.list();
        if (!isCurrent() || version !== revision) return;
        if (!Array.isArray(data?.rows) || !Number.isInteger(data.total) || data.total < data.rows.length
          || data.rows.some(row => row.user_id !== owner || row.progress_epoch !== epoch || !STATUS[row.status]
            || typeof row.id !== 'string' || typeof row.storage_path !== 'string' || !row.storage_path.startsWith(owner + '/')))
          throw new Error('invalid_proof_list');
        let nextQueue = [], nextError = null;
        try { nextQueue = await actions.pending(); } catch (error) { nextError = error; }
        if (!isCurrent() || version !== revision) return;
        rows = data.rows; mode = 'ready'; queued = nextQueue; queueError = nextError;
        onChange();
      } catch (error) {
        if (!isCurrent() || version !== revision) return;
        rows = []; queued = [];
        mode = error?.code === 'PGRST202' ? 'legacy' : 'error';
        onChange();
      }
    }
    function initial(task) {
      cleanup();
      openSheet('<div class="lib-sheet-head"><h2>' + escape(task.text) + '</h2><button type="button" class="lib-close" aria-label="Закрыть">×</button></div><div class="proof-panel" data-proof-panel><p role="status">Проверяем отправки…</p></div>');
      return sheetRoot().querySelector('[data-proof-panel]');
    }
    async function open(key) {
      const task = taskByKey(key);
      if (!task || !isCurrent()) return;
      const panel = initial(task);
      await refresh();
      if (!active(panel)) return;
      if (mode === 'legacy') { openLegacy(key); return; }
      render(panel, task);
    }
    function render(panel, task) {
      cleanup();
      if (mode !== 'ready') {
        panel.innerHTML = '<p role="alert">Проверка отправок сейчас недоступна.</p><button type="button" class="secondary" data-proof-refresh>Повторить</button>';
        panel.querySelector('[data-proof-refresh]').onclick = () => open(task.key);
        return;
      }
      const day = today();
      const pending = queued.filter(item => item.task.key === task.key);
      const latest = rows.find(row => row.task_key === task.key && row.local_day === day);
      const history = rows.filter(row => row.task_key === task.key).slice(0, 20);
      const currentPending = pending.some(item => item.task.day === day);
      panel.innerHTML = '<div class="proof-heading"><strong>' + escape(latest ? STATUS[latest.status] : currentPending ? 'Отправка сохранена' : 'Подтверждение задания') + '</strong><button type="button" class="secondary" data-proof-refresh>Обновить статус</button></div>'
        + (queueError ? '<p role="alert">' + escape(errorText(queueError)) + '</p>' : '')
        + pending.map((entry, index) => '<section class="proof-pending"><b>' + escape(entry.task.day) + ' · Сохранённая отправка</b><p>' + escape(entry.task.note) + '</p><div class="proof-actions"><button type="button" class="primary" data-proof-retry="' + index + '">Повторить отправку</button><button type="button" class="secondary" data-proof-forget="' + index + '">Удалить локальную копию</button></div></section>').join('')
        + (!queueError && !currentPending && (!latest || latest.status === 'rejected') ? '<form data-proof-form><label class="proof-field"><span>' + (task.media === 'video' ? 'Видео · MP4, WebM, MOV · до 20 МБ' : 'Фото') + '</span><input type="file" data-proof-file accept="' + (task.media === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*') + '" required></label><div data-proof-preview></div><label class="proof-field"><span>Заметка</span><textarea data-proof-note maxlength="2000" rows="3"></textarea></label><button type="submit" class="primary" data-proof-submit disabled>' + (latest ? 'Отправить повторно' : 'Отправить куратору') + '</button></form>' : '')
        + '<p class="proof-message" role="status" aria-live="polite" data-proof-message></p>'
        + (history.length ? '<h3>Последние отправки</h3><ol class="proof-history">' + history.map((row, index) => '<li><div><b>' + escape(STATUS[row.status]) + '</b><time>' + escape(row.local_day) + '</time></div><p>' + escape(row.note) + '</p>' + (row.review_note ? '<p class="proof-feedback"><strong>Комментарий куратора</strong><br>' + escape(row.review_note) + '</p>' : '') + '<button type="button" class="secondary" data-proof-media="' + index + '">Открыть ' + (row.content_type?.startsWith('video/') ? 'видео' : 'фото') + '</button><div data-proof-media-slot="' + index + '"></div></li>').join('') + '</ol>' : '');
      const message = text => { if (active(panel)) panel.querySelector('[data-proof-message]').textContent = text; };
      const busy = value => { panel.querySelectorAll('button,input,textarea').forEach(node => { node.disabled = value; }); };
      panel.querySelector('[data-proof-refresh]').onclick = () => open(task.key);
      async function run(operation) {
        if (!active(panel)) return;
        if (flight) { message('Предыдущая отправка ещё выполняется.'); return; }
        flight = true; busy(true); message('Отправляем…');
        try { await operation(); }
        catch (error) { message(errorText(error)); }
        finally {
          flight = false;
          if (active(panel)) {
            busy(false);
            const input = panel.querySelector('[data-proof-file]');
            if (input) panel.querySelector('[data-proof-submit]').disabled = !input.files?.[0];
          }
        }
      }
      async function send(pendingKey) {
        const proof = await actions.retry(pendingKey);
        if (!isCurrent()) return;
        if (proof && await onStored(proof)) await actions.acknowledge(pendingKey, proof.id);
        if (!active(panel)) { await refresh(); return; }
        await refresh();
        if (active(panel)) { render(panel, task); message('Подтверждение отправлено куратору.'); }
      }
      panel.querySelectorAll('[data-proof-retry]').forEach(button => {
        button.onclick = () => run(() => send(pending[Number(button.dataset.proofRetry)].key));
      });
      panel.querySelectorAll('[data-proof-forget]').forEach(button => {
        button.onclick = () => run(async () => {
          if (!confirm('Удалить сохранённую копию с этого устройства? Уже отправленное подтверждение останется у куратора.')) { message(''); return; }
          await actions.forget(pending[Number(button.dataset.proofForget)].key);
          await refresh();
          if (active(panel)) render(panel, task);
        });
      });
      const input = panel.querySelector('[data-proof-file]');
      if (input) {
        input.onchange = () => {
          cleanup();
          const file = input.files?.[0], slot = panel.querySelector('[data-proof-preview]');
          slot.innerHTML = '';
          const valid = file && file.size > 0 && (task.media !== 'video' || (file.size <= root.WLProofActions.MAX_BYTES && ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)));
          panel.querySelector('[data-proof-submit]').disabled = !valid;
          message(valid || !file ? '' : errorText({ code: 'invalid_proof_media' }));
          if (valid) {
            const media = document.createElement(task.media === 'video' ? 'video' : 'img');
            const url = root.URL.createObjectURL(file); urls.add(url);
            media.src = url; media.className = 'proof-preview';
            if (task.media === 'video') { media.controls = true; media.playsInline = true; media.preload = 'metadata'; }
            else media.alt = 'Выбранное фото';
            slot.append(media);
          }
        };
        panel.querySelector('[data-proof-form]').onsubmit = event => {
          event.preventDefault();
          if (!input.files?.[0]) return;
          return run(async () => {
            const note = panel.querySelector('[data-proof-note]').value.trim();
            const file = input.files[0];
            const blob = task.media === 'video' ? file : await compressPhoto(file);
            if (!active(panel)) return;
            const pendingKey = await actions.stage({ key: task.key, text: task.text, note, day }, blob);
            try { await send(pendingKey); }
            catch (error) {
              await refresh();
              if (active(panel)) { render(panel, task); message(errorText(error)); }
            }
          });
        };
      }
      panel.querySelectorAll('[data-proof-media]').forEach(button => {
        button.onclick = async () => {
          if (flight || !active(panel)) return;
          const row = history[Number(button.dataset.proofMedia)];
          const slot = panel.querySelector('[data-proof-media-slot="' + button.dataset.proofMedia + '"]');
          button.disabled = true;
          try {
            const blob = await transport.media(row.storage_path);
            if (!active(panel)) return;
            const url = root.URL.createObjectURL(blob); urls.add(url);
            const media = document.createElement(blob.type.startsWith('video/') ? 'video' : 'img');
            media.src = url; media.className = 'proof-preview';
            if (blob.type.startsWith('video/')) { media.controls = true; media.playsInline = true; }
            else media.alt = 'Отправленное подтверждение';
            const download = document.createElement('a');
            download.href = url; download.download = 'task-' + row.id + '.' + root.WLProofActions.TYPES[blob.type];
            download.textContent = 'Скачать файл'; download.className = 'proof-download';
            media.onerror = () => message('Не удалось показать файл в этом браузере. Можно скачать его.');
            slot.replaceChildren(media, download);
          } catch (error) { message(errorText(error)); }
          finally { if (active(panel)) button.disabled = false; }
        };
      });
    }
    return { refresh, open, status, cleanup, get mode() { return mode; } };
  }
  root.WLProofUi = Object.freeze({ create, errorText });
})(window);
