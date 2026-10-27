(function (root) {
  'use strict';
  const MAX_BYTES = 20 * 1024 * 1024;
  const TYPES = Object.freeze({ 'image/jpeg': 'jpg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' });
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function failure(code) { return Object.assign(new Error(code), { code }); }
  function validateTask(task) {
    const date = new Date(String(task?.day) + 'T00:00:00Z');
    if (!task || !['mobility', 'technique'].includes(task.key) || typeof task.text !== 'string'
      || !task.text.trim() || task.text.trim().length > 300 || typeof task.note !== 'string' || task.note.length > 2000
      || !/^\d{4}-\d{2}-\d{2}$/.test(task.day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== task.day)
      throw failure('invalid_proof');
  }
  function validateBlob(blob, task) {
    if (!blob || !TYPES[blob.type] || typeof blob.arrayBuffer !== 'function' || !Number.isInteger(blob.size)
      || blob.size < 1 || blob.size > MAX_BYTES || (task.key === 'technique' && blob.type === 'image/jpeg'))
      throw failure('invalid_proof_media');
  }
  function createRepository({ indexedDB = root.indexedDB, name = 'wl-proof-outbox-v1:'+root.WL_CONFIG?.installationId } = {}) {
    let opening;
    function open() {
      if (!opening) opening = new Promise((resolve, reject) => {
        if (!indexedDB) { reject(failure('proof_storage_unavailable')); return; }
        const request = indexedDB.open(name, 1);
        let blocked = false;
        request.onupgradeneeded = () => request.result.createObjectStore('pending', { keyPath: 'key' });
        request.onerror = () => reject(failure('proof_storage_unavailable'));
        request.onblocked = () => { blocked = true; reject(failure('proof_storage_blocked')); };
        request.onsuccess = () => {
          const db = request.result;
          if (blocked) { db.close(); return; }
          db.onversionchange = () => { db.close(); opening = null; };
          resolve(db);
        };
      }).catch(error => { opening = null; throw error; });
      return opening;
    }
    async function transaction(mode, operation) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('pending', mode);
        let result;
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(failure('proof_storage_failed'));
        try { operation(tx.objectStore('pending'), value => { result = value; }); }
        catch (error) { tx.abort(); reject(error); }
      });
    }
    function change(entry, operation, isCurrent = () => true) {
      return transaction('readwrite', (store, done) => {
        if(!isCurrent()) throw failure('proof_scope_changed');
        const request = store.get(entry.key);
        request.onsuccess = () => {
          if(!isCurrent()){ done(false); return; }
          const previous = request.result;
          if (operation === 'insert') {
            if (previous) { done(false); return; }
            store.add(entry);
          } else {
            if (!previous || previous.id !== entry.id) { done(false); return; }
            if (operation === 'remove') store.delete(entry.key);
            else store.put(entry);
          }
          done(true);
        };
      });
    }
    return {
      get: key => transaction('readonly', (store, done) => { const request = store.get(key); request.onsuccess = () => done(request.result || null); }),
      list: () => transaction('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done(request.result); }),
      insert: (entry, isCurrent) => change(entry, 'insert', isCurrent),
      replace: (entry, isCurrent) => change(entry, 'replace', isCurrent),
      remove: entry => change(entry, 'remove'),
      clearEpoch: (owner, epoch) => transaction('readwrite', (store, done) => {
        const request = store.openCursor();
        let removed = 0;
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) { done(removed); return; }
          if (cursor.value.owner === owner && cursor.value.epoch === epoch) { cursor.delete(); removed++; }
          cursor.continue();
        };
      }),
      async close() { if (opening) (await opening).close(); opening = null; },
    };
  }

  function create({ repository, transport, owner, epoch = null, isCurrent, uuid = () => root.crypto.randomUUID() }) {
    if (!UUID.test(owner) || (epoch !== null && !UUID.test(epoch)) || typeof isCurrent !== 'function') throw failure('invalid_proof_owner');
    const prefix = owner + ':' + (epoch || 'initial') + ':';
    const flights = new Set();
    function current() { if (!isCurrent()) throw failure('proof_scope_changed'); }
    function key(task) { validateTask(task); return prefix + task.day + ':' + task.key; }
    function validate(entry) {
      if (!entry || entry.owner !== owner || entry.epoch !== epoch || !UUID.test(entry.id)
        || entry.key !== key(entry.task) || !TYPES[entry.contentType]
        || entry.path !== owner + '/tasks/' + entry.id + '.' + TYPES[entry.contentType]) throw failure('invalid_pending_proof');
      if (!entry.result) {
        validateBlob(entry.blob, entry.task);
        if (entry.blob.type !== entry.contentType) throw failure('invalid_pending_proof');
      }
      return entry;
    }
    function confirmed(entry, data) {
      const p = data?.proof;
      if (data?.ok !== true || !p || !UUID.test(p.id) || p.client_id !== entry.id || p.user_id !== owner
        || p.progress_epoch !== epoch || p.task_key !== entry.task.key || p.task_text !== entry.task.text
        || p.note !== entry.task.note || p.local_day !== entry.task.day || p.storage_path !== entry.path
        || p.content_type !== entry.contentType || !['pending', 'approved', 'rejected'].includes(p.status)
        || !Number.isInteger(p.review_version) || p.review_version < 0) throw failure('unconfirmed_proof');
      return p;
    }
    function args(entry) {
      return { p_client_id: entry.id, p_task_key: entry.task.key, p_task_text: entry.task.text,
        p_note: entry.task.note, p_storage_path: entry.path, p_content_type: entry.contentType,
        p_local_day: entry.task.day, p_progress_epoch: epoch };
    }
    async function stage(task, blob) {
      current(); validateTask(task); validateBlob(blob, task);
      const id = uuid();
      if (!UUID.test(id)) throw failure('invalid_request_id');
      const entry = { key: key(task), id, owner, epoch, task: { key: task.key, text: task.text.trim(), note: task.note, day: task.day },
        contentType: blob.type, path: owner + '/tasks/' + id + '.' + TYPES[blob.type], blob, result: null };
      // ID, immutable payload and actual bytes commit together before any network request.
      if (!await repository.insert(entry, isCurrent)) throw failure('pending_proof');
      current();
      return entry.key;
    }
    async function retry(pendingKey) {
      current();
      if (flights.has(pendingKey)) throw failure('proof_busy');
      flights.add(pendingKey);
      try {
        const raw = await repository.get(pendingKey);
        current();
        if (!raw) return null;
        const entry = validate(raw);
        if (entry.result) return confirmed(entry, entry.result);
        let response;
        try { response = await transport.submit(args(entry)); }
        catch (error) {
          current();
          // Probe the idempotent RPC first: an earlier upload/submit may have committed.
          if (error.code !== '22023' || error.message !== 'uploaded_proof_required') throw error;
          try { await transport.upload(entry.path, entry.blob, entry.contentType); }
          catch (uploadError) {
            current();
            if (!['Duplicate', 'ResourceAlreadyExists', 'KeyAlreadyExists'].includes(uploadError.code)) throw uploadError;
          }
          current();
          response = await transport.submit(args(entry));
        }
        current();
        const result = confirmed(entry, response);
        // Keep the receipt until the caller has persisted its own local state.
        if (!await repository.replace({ ...entry, blob: null, result: response }, isCurrent)) throw failure('proof_receipt_changed');
        current();
        return result;
      } finally { flights.delete(pendingKey); }
    }
    async function pending() {
      current();
      const rows = await repository.list();
      current();
      return rows.filter(entry => entry.owner === owner && entry.epoch === epoch).map(validate);
    }
    async function acknowledge(pendingKey, proofId) {
      current();
      const raw = await repository.get(pendingKey);
      current();
      if (!raw) return false;
      const entry = validate(raw);
      if (!entry.result || confirmed(entry, entry.result).id !== proofId) throw failure('unconfirmed_proof');
      return repository.remove(entry);
    }
    async function forget(pendingKey) {
      current();
      if (flights.has(pendingKey)) throw failure('proof_busy');
      const raw = await repository.get(pendingKey);
      current();
      return raw ? repository.remove(validate(raw)) : false;
    }
    return { stage, retry, pending, acknowledge, forget };
  }

  function createTransport({ sb, url, publicKey, owner, isCurrent, fetch = root.fetch.bind(root) }) {
    const base = new URL(url);
    if (base.origin !== root.WL_CONFIG?.supabaseUrl || base.username || base.password || base.pathname !== '/' || base.search || base.hash)
      throw failure('invalid_backend_url');
    async function request(path, body, type, timeout, extraHeaders = {}, binary = false) {
      if (!isCurrent()) throw failure('proof_scope_changed');
      const { data, error } = await sb.auth.getSession();
      if (error || data?.session?.user?.id !== owner || !data.session.access_token) throw failure('auth_required');
      if (!isCurrent()) throw failure('proof_scope_changed');
      // Freeze the matching identity's token; an SDK account switch cannot retarget this request.
      const response = await fetch(base.origin + path, { method: binary ? 'GET' : 'POST', credentials: 'omit', cache: 'no-store',
        headers: { apikey: publicKey, Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': type, ...extraHeaders },
        body, signal: root.AbortSignal.timeout(timeout) });
      if (binary && response.ok) {
        const blob = await response.blob();
        if (!TYPES[blob.type] || blob.size < 1 || blob.size > MAX_BYTES) throw failure('invalid_proof_media');
        return blob;
      }
      let value;
      try { value = await response.json(); } catch (error) { throw failure('invalid_proof_response'); }
      if (!response.ok) {
        const code = value.code || (value.error === 'Duplicate' ? 'Duplicate' : 'proof_request_failed');
        throw Object.assign(new Error(typeof value.message === 'string' ? value.message : code), { code, status: response.status });
      }
      return value;
    }
    return {
      submit: async args => {if(!isCurrent())throw failure('proof_scope_changed');const r=await sb.rpc('wl_submit_proof',args);if(!isCurrent())throw failure('proof_scope_changed');if(r.error)throw r.error;return r.data;},
      list: async () => {if(!isCurrent())throw failure('proof_scope_changed');const r=await sb.rpc('wl_my_proofs',{p_offset:0,p_limit:100});if(!isCurrent())throw failure('proof_scope_changed');if(r.error)throw r.error;return r.data;},
      media(path) {
        if (typeof path !== 'string' || !path.startsWith(owner + '/') || path.split('/').some(part => !part || part === '..' || part === '.'))
          throw failure('invalid_proof_media');
        return request('/storage/v1/object/authenticated/proofs/' + path.split('/').map(encodeURIComponent).join('/'), undefined, 'application/octet-stream', 120000, {}, true);
      },
      upload(path, blob, contentType) {
        if (!path.startsWith(owner + '/tasks/') || !TYPES[contentType]) throw failure('invalid_proof_media');
        return request('/storage/v1/object/proofs/' + path.split('/').map(encodeURIComponent).join('/'), blob, contentType, 120000, { 'x-upsert': 'false' });
      },
    };
  }
  const api = { create, createRepository, createTransport, MAX_BYTES, TYPES };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WLProofActions = Object.freeze(api);
})(typeof window === 'undefined' ? globalThis : window);
