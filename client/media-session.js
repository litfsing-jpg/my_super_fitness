(function (root) {
  'use strict';
  const UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const fail = (code) => Object.assign(new Error(code), { code });
  async function create({
    client,
    url,
    publicKey,
    owner,
    isCurrent,
    createClient = root.supabase?.createClient,
    fetchRef = root.fetch?.bind(root),
    sessionTimeout = 15000,
    requestTimeout = 120000,
  }) {
    const base = String(url || '').replace(/\/$/, '');
    if (
      !UUID.test(owner || '') ||
      base !== String(root.WL_CONFIG?.supabaseUrl || '').replace(/\/$/, '') ||
      typeof isCurrent !== 'function' ||
      !client?.auth?.getSession ||
      !createClient ||
      !fetchRef
    )
      throw fail('media_not_configured');
    const current = () => {
      if (!isCurrent()) throw fail('media_scope_changed');
    };
    current();
    let timer;
    let session;
    try {
      const { data, error } = await Promise.race([
        client.auth.getSession(),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(fail('media_session_timeout')),
            sessionTimeout,
          );
        }),
      ]);
      current();
      if (
        error ||
        data?.session?.user?.id !== owner ||
        !data.session.access_token
      )
        throw fail('media_scope_changed');
      session = data.session;
    } finally {
      clearTimeout(timer);
    }
    const token = session.access_token;
    // accessToken mode creates no second Auth session, persistence or refresh listener.
    return createClient(base, publicKey, {
      accessToken: async () => {
        current();
        return token;
      },
      global: {
        fetch: async (input, init = {}) => {
          current();
          const target = new URL(typeof input === 'string' ? input : input.url);
          if (
            target.origin !== base ||
            target.username ||
            target.password ||
            !/^\/(rest|storage)\/v1\//.test(target.pathname)
          )
            throw fail('invalid_media_endpoint');
          const headers = new Headers(init.headers);
          headers.set('Authorization', 'Bearer ' + token);
          const timeout = AbortSignal.timeout(requestTimeout),
            signal = init.signal
              ? AbortSignal.any([init.signal, timeout])
              : timeout;
          const response = await fetchRef(input, {
            ...init,
            headers,
            signal,
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
          });
          current();
          return response;
        },
      },
    });
  }
  const api = Object.freeze({ create });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WLMediaSession = api;
})(typeof window === 'undefined' ? globalThis : window);
