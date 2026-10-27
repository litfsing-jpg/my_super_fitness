(function (root) {
  'use strict';
  const UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const fail = (code) => Object.assign(new Error(code), { code });
  function createTransport({
    sb,
    url,
    publicKey,
    owner,
    isCurrent,
    fetchRef = root.fetch?.bind(root),
    timeout = 20000,
  }) {
    const base = String(url || '').replace(/\/$/, '');
    if (
      !UUID.test(owner || '') ||
      base !== String(root.WL_CONFIG?.supabaseUrl || '').replace(/\/$/, '') ||
      typeof isCurrent !== 'function' ||
      !sb?.auth?.getSession ||
      !fetchRef
    )
      throw fail('reset_not_configured');
    const current = () => {
      if (!isCurrent()) throw fail('reset_scope_changed');
    };
    async function request(path, body, method = 'POST') {
      current();
      const controller = new AbortController();
      let timer;
      try {
        return await Promise.race([
          (async () => {
            const { data, error } = await sb.auth.getSession();
            current();
            if (controller.signal.aborted) throw fail('reset_unavailable');
            if (
              error ||
              data?.session?.user?.id !== owner ||
              !data.session.access_token
            )
              throw fail('reset_scope_changed');
            const response = await fetchRef(base + path, {
              method,
              credentials: 'omit',
              redirect: 'error',
              cache: 'no-store',
              signal: controller.signal,
              headers: {
                apikey: publicKey,
                Authorization: 'Bearer ' + data.session.access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });
            const result = await response.json();
            current();
            if (controller.signal.aborted) throw fail('reset_unavailable');
            if (!response.ok)
              throw fail(
                response.status === 401
                  ? 'reset_scope_changed'
                  : 'reset_unavailable',
              );
            return result;
          })(),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(fail('reset_unavailable'));
            }, timeout);
          }),
        ]);
      } catch (error) {
        current();
        throw ['reset_scope_changed', 'reset_unavailable'].includes(error?.code)
          ? error
          : fail('reset_unavailable');
      } finally {
        clearTimeout(timer);
      }
    }
    return Object.freeze({
      rpc(name, args = {}) {
        if (
          ![
            'wl_reset_progress',
            'wl_pending_progress_cleanup',
            'wl_complete_progress_cleanup',
            'pb_get_latest_progress_reset',
          ].includes(name)
        )
          throw fail('invalid_reset_rpc');
        return (async()=>{current();const result=await sb.rpc(name,args);current();if(result.error)throw fail('reset_unavailable');return result.data;})();
      },
      remove(bucket, paths) {
        if (
          !['body-checks', 'proofs'].includes(bucket) ||
          !Array.isArray(paths) ||
          paths.length > 100 ||
          paths.some((path) => !validPath(path, owner))
        )
          throw fail('invalid_cleanup_response');
        return request(
          '/storage/v1/object/' + bucket,
          { prefixes: paths },
          'DELETE',
        );
      },
    });
  }
  function validPath(path, owner) {
    return (
      typeof path === 'string' &&
      path.startsWith(owner + '/') &&
      !/[\x00-\x1f\\]/.test(path) &&
      path.split('/').every((part) => part && part !== '.' && part !== '..')
    );
  }
  async function cleanup(transport, owner, current) {
    current();
    const rows = await transport.rpc('wl_pending_progress_cleanup');
    current();
    if (
      !Array.isArray(rows) ||
      rows.length > 20 ||
      rows.some(
        (row) =>
          !UUID.test(row?.id || '') ||
          ['body-checks', 'proofs'].some(
            (bucket) =>
              !Array.isArray(row.media_paths?.[bucket]) ||
              row.media_paths[bucket].some((path) => !validPath(path, owner)),
          ),
      )
    )
      throw fail('invalid_cleanup_response');
    let pending = false;
    for (const row of rows) {
      let failed = false;
      for (const bucket of ['body-checks', 'proofs']) {
        const paths = row.media_paths[bucket];
        for (let offset = 0; offset < paths.length; offset += 100) {
          current();
          try {
            await transport.remove(bucket, paths.slice(offset, offset + 100));
            current();
          } catch (error) {
            current();
            if (error.code === 'reset_scope_changed') throw error;
            failed = true;
          }
        }
      }
      if (failed) {
        pending = true;
        continue;
      }
      current();
      if (
        (await transport.rpc('wl_complete_progress_cleanup', {
          p_reset_id: row.id,
        })) !== true
      )
        pending = true;
      current();
    }
    const remaining = await transport.rpc('wl_pending_progress_cleanup');
    current();
    return pending || !Array.isArray(remaining) || remaining.length > 0;
  }
  async function resetProgress({
    transport,
    userId,
    appVersion,
    cleanupOnly = false,
    storage = root.WLStorage,
    locks = root.navigator?.locks,
    isCurrent,
  }) {
    if (
      !transport ||
      !UUID.test(userId || '') ||
      typeof isCurrent !== 'function'
    )
      throw fail('auth_required');
    const current = () => {
      if (!isCurrent()) throw fail('reset_scope_changed');
    };
    current();
    if (!locks?.request) throw fail('reset_browser_unsupported');
    return locks.request(
      'wlProgressReset:' + userId,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        current();
        if (!lock) throw fail('reset_busy');
        let result = { ok: true, cleanup_only: true };
        if (!cleanupOnly) {
          // Keep an ambiguous reset ID until its server receipt is confirmed.
          const key = 'wlProgressResetRequest:' + userId;
          let requestId = storage.getItem(key);
          if (requestId && !UUID.test(requestId))
            throw fail('invalid_reset_request');
          if (!requestId) {
            requestId = root.crypto.randomUUID();
            storage.setItem(key, requestId);
          }
          current();
          result = await transport.rpc('wl_reset_progress', {
            p_request_id: requestId,
            p_confirm: 'RESET_PROGRESS',
            p_app_version: appVersion,
          });
          current();
          if (
            result?.ok !== true ||
            result.reset_id !== requestId ||
            !Number.isFinite(Date.parse(result.reset_at))
          )
            throw fail('invalid_reset_response');
          if (storage.getItem(key) === requestId) storage.removeItem(key);
        }
        try {
          result.media_cleanup_pending = await cleanup(
            transport,
            userId,
            current,
          );
        } catch (error) {
          current();
          if (error.code === 'reset_scope_changed') throw error;
          result.media_cleanup_pending = true;
        }
        current();
        return result;
      },
    );
  }
  const api = Object.freeze({ createTransport, resetProgress });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WLAccountActions = api;
})(typeof window === 'undefined' ? globalThis : window);
