(function (root) {
  'use strict';
  const PREFIX = 'wlBodyCheckPendingV1:';
  const UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const POSES = new Set(['front', 'back', 'left', 'right']);
  const fail = (code) => Object.assign(new Error(code), { code });
  function validPath(owner, path) {
    return (
      typeof path === 'string' &&
      path.length <= 1024 &&
      path.startsWith(owner + '/') &&
      !/[\x00-\x1f\x7f\\]/.test(path) &&
      path.split('/').every((part) => part && part !== '.' && part !== '..')
    );
  }
  function photoPaths(owner, value) {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length > 4 ||
      Object.entries(value).some(
        ([pose, path]) => !POSES.has(pose) || !validPath(owner, path),
      )
    )
      throw fail('invalid_bodycheck_paths');
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  function create({
    client,
    owner,
    epoch,
    isCurrent,
    storage = root.WLStorage,
    locks = root.navigator?.locks,
    uuid = () => root.crypto.randomUUID(),
  }) {
    if (
      !UUID.test(owner || '') ||
      (epoch !== null && !UUID.test(epoch || '')) ||
      typeof isCurrent !== 'function' ||
      !client?.rpc ||
      !client?.from
    )
      throw fail('bodycheck_not_configured');
    const key = PREFIX + owner + ':' + (epoch || 'initial');
    const current = () => {
      if (!isCurrent()) throw fail('media_scope_changed');
    };
    function normalized(value) {
      if (
        !value ||
        value.owner !== owner ||
        value.epoch !== epoch ||
        !UUID.test(value.requestId || '') ||
        !UUID.test(value.id || '') ||
        !Number.isSafeInteger(value.version) ||
        value.version < 0 ||
        !['photos', 'delete'].includes(value.action) ||
        Object.keys(value).some(
          (name) =>
            ![
              'owner',
              'epoch',
              'requestId',
              'id',
              'version',
              'action',
              'paths',
            ].includes(name),
        )
      )
        throw fail('invalid_bodycheck_journal');
      if (value.action === 'delete' && value.paths !== null)
        throw fail('invalid_bodycheck_journal');
      return {
        owner,
        epoch,
        requestId: value.requestId,
        id: value.id,
        version: value.version,
        action: value.action,
        paths:
          value.action === 'photos' ? photoPaths(owner, value.paths) : null,
      };
    }
    function pending() {
      current();
      try {
        const raw = storage.getItem(key);
        return raw ? normalized(JSON.parse(raw)) : null;
      } catch {
        throw fail('invalid_bodycheck_journal');
      }
    }
    function clear(value) {
      current();
      if (JSON.stringify(pending()) !== JSON.stringify(value))
        throw fail('bodycheck_request_changed');
      storage.removeItem(key);
    }
    async function locked(callback) {
      current();
      if (!locks?.request) throw fail('bodycheck_browser_unsupported');
      return locks.request(
        PREFIX + owner,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          current();
          if (!lock) throw fail('bodycheck_busy');
          return callback();
        },
      );
    }
    async function row(id) {
      current();
      if (!UUID.test(id || '')) throw fail('invalid_bodycheck_id');
      const { data, error } = await client
        .from('pb_body_checks')
        .select('*')
        .eq('id', id)
        .eq('user_id', owner)
        .maybeSingle();
      current();
      if (error) throw fail('bodycheck_unavailable');
      if (
        data &&
        (data.id !== id ||
          data.user_id !== owner ||
          data.progress_epoch !== epoch)
      )
        throw fail('bodycheck_unconfirmed');
      return data;
    }
    async function cleanupUnlocked() {
      current();
      const prepared = await client.rpc('wl_bodycheck_cleanup_prepare', {});
      current();
      if (prepared.error) throw fail('bodycheck_cleanup_pending');
      const paths = prepared.data;
      if (
        !Array.isArray(paths) ||
        paths.length > 100 ||
        new Set(paths).size !== paths.length ||
        paths.some((path) => !validPath(owner, path))
      )
        throw fail('invalid_bodycheck_cleanup');
      if (!paths.length) return true;
      const removed = await client.storage.from('body-checks').remove(paths);
      current();
      if (removed.error) throw fail('bodycheck_cleanup_pending');
      const completed = await client.rpc('wl_bodycheck_cleanup_complete', {
        p_paths: paths,
      });
      current();
      if (completed.error || completed.data !== true)
        throw fail('bodycheck_cleanup_pending');
      return true;
    }
    async function send(value) {
      current();
      const { data, error } = await client.rpc('wl_bodycheck_media_change', {
        p_request_id: value.requestId,
        p_bodycheck_id: value.id,
        p_expected_version: value.version,
        p_progress_epoch: epoch,
        p_action: value.action,
        p_photo_paths: value.paths,
        p_accept_photos:
          value.action === 'photos' && Object.keys(value.paths).length > 0,
      });
      current();
      if (error) {
        // Only server transaction rejections are definitive; transport failures retain the UUID.
        if (['22023', 'PT409', '42501', 'P0001'].includes(error.code)) {
          const fresh = await row(value.id);
          clear(value);
          return {
            ok: false,
            conflict: true,
            entry: fresh,
            action: value.action,
            id: value.id,
          };
        }
        throw fail('bodycheck_unconfirmed');
      }
      if (
        data?.ok !== true ||
        data.request_id !== value.requestId ||
        data.action !== value.action ||
        (value.action === 'delete'
          ? data.deleted_id !== value.id
          : data.entry?.id !== value.id ||
            data.entry?.user_id !== owner ||
            data.entry?.progress_epoch !== epoch ||
            data.entry?.media_version !== value.version + 1 ||
            JSON.stringify(photoPaths(owner, data.entry?.photo_paths)) !==
              JSON.stringify(value.paths))
      )
        throw fail('bodycheck_unconfirmed');
      const fresh = await row(value.id);
      current();
      clear(value);
      let cleanupPending = false;
      try {
        await cleanupUnlocked();
      } catch {
        current();
        cleanupPending = true;
      }
      return {
        ok: true,
        entry: fresh,
        action: value.action,
        id: value.id,
        cleanupPending,
      };
    }
    function mutate({ id, version, action, paths = null }) {
      return locked(async () => {
        if (pending()) throw fail('bodycheck_pending_operation');
        const value = normalized({
          owner,
          epoch,
          requestId: uuid(),
          id,
          version,
          action,
          paths,
        });
        current();
        storage.setItem(key, JSON.stringify(value));
        return send(value);
      });
    }
    function retry() {
      return locked(async () => {
        const value = pending();
        return value ? send(value) : null;
      });
    }
    return Object.freeze({
      pending,
      row,
      mutate,
      retry,
      cleanup: () => locked(cleanupUnlocked),
    });
  }
  const api = Object.freeze({ create, PREFIX });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WLBodyCheckActions = api;
})(typeof window === 'undefined' ? globalThis : window);
