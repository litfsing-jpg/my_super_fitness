(function (root) {
  "use strict";
  const PREFIX = "wlHealthPendingV1:";
  const UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const ACTIONS = new Set([
    "create_shortcut_key",
    "revoke_shortcut_key",
    "enable_shortcut_body_composition",
    "disable_shortcut_body_composition",
    "workout_writeback",
  ]);
  const CODES = new Set([
    "verified_account_required",
    "subscription_required",
    "health_not_configured",
    "health_rate_limited",
    "request_id_conflict",
    "health_sync_consent_required",
    "body_composition_consent_required",
    "active_connection_required",
    "invalid_health_action",
    "health_writeback_unavailable",
    "health_writeback_consent_required",
  ]);
  const fail = (code) => Object.assign(new Error(code), { code });
  function installUrl(value) {
    return typeof value === "string" &&
      value === value.trim() &&
      /^https:\/\/www\.icloud\.com\/shortcuts\/[A-Za-z0-9_-]+$/.test(value)
      ? value
      : "";
  }
  function optionsFor(action, options) {
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw fail("invalid_health_action");
    if (action === "workout_writeback") {
      if (
        Object.keys(options).some(
          (key) => !["enabled", "consent_version"].includes(key),
        ) ||
        typeof options.enabled !== "boolean" ||
        typeof options.consent_version !== "string" ||
        options.consent_version.length > 120 ||
        (options.enabled
          ? !options.consent_version.trim()
          : options.consent_version !== "")
      )
        throw fail("invalid_health_action");
      return {
        enabled: options.enabled,
        consent_version: options.consent_version,
      };
    }
    const booleanKey = {
      create_shortcut_key: "accepted_health_sync",
      enable_shortcut_body_composition: "accepted_body_composition",
      revoke_shortcut_key: "delete_data",
      disable_shortcut_body_composition: "delete_body_composition",
    }[action];
    if (!booleanKey || typeof options[booleanKey] !== "boolean")
      throw fail("invalid_health_action");
    const consent =
      action === "create_shortcut_key" ||
      action === "enable_shortcut_body_composition";
    if (
      Object.keys(options).some(
        (key) =>
          ![booleanKey, ...(consent ? ["consent_version"] : [])].includes(key),
      ) ||
      (consent &&
        (options[booleanKey] !== true ||
          typeof options.consent_version !== "string" ||
          !options.consent_version.trim() ||
          options.consent_version.length > 120))
    )
      throw fail("invalid_health_action");
    return consent
      ? { [booleanKey]: true, consent_version: options.consent_version }
      : { [booleanKey]: options[booleanKey] };
  }
  function create({
    client,
    owner,
    url,
    anonKey,
    storage = root.WLStorage,
    locks = root.navigator?.locks,
    fetchRef = root.fetch?.bind(root),
    uuid = () => root.crypto.randomUUID(),
    isCurrent = () => true,
    timeout = 10000,
  }) {
    const backend = String(url || "").replace(/\/$/, "");
    if (
      !UUID.test(owner || "") ||
      backend !== root.WL_CONFIG?.supabaseUrl ||
      !client?.auth?.getSession ||
      !fetchRef
    )
      throw fail("health_not_configured");
    const key = PREFIX + owner;
    const controllers = new Set();
    let destroyed = false;
    function current() {
      if (destroyed || !isCurrent()) throw fail("health_session_changed");
    }
    function read() {
      current();
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        if (
          value.owner !== owner ||
          !UUID.test(value.requestId || "") ||
          !ACTIONS.has(value.action) ||
          Object.keys(value).some(
            (name) =>
              !["owner", "requestId", "action", "options"].includes(name),
          )
        )
          throw Error();
        return {
          owner,
          requestId: value.requestId,
          action: value.action,
          options: optionsFor(value.action, value.options),
        };
      } catch {
        throw fail("invalid_health_journal");
      }
    }
    function clear(value) {
      current();
      if (read()?.requestId !== value.requestId)
        throw fail("health_request_changed");
      storage.removeItem(key);
    }
    async function request(name, args) {
      current();
      const controller = new AbortController();
      controllers.add(controller);
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(fail("health_unavailable"));
        }, timeout);
      });
      try {
        return await Promise.race([
          (async () => {
            const { data, error } = await client.auth.getSession();
            current();
            if (controller.signal.aborted) throw fail("health_unavailable");
            if (
              error ||
              data?.session?.user?.id !== owner ||
              !data.session.access_token
            )
              throw fail("health_session_changed");
            const response = await fetchRef(backend + "/rest/v1/rpc/" + name, {
              method: "POST",
              redirect: "error",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                apikey: anonKey,
                Authorization: "Bearer " + data.session.access_token,
              },
              body: JSON.stringify(args),
            });
            const payload = await response.json();
            current();
            if (controller.signal.aborted) throw fail("health_unavailable");
            if (!response.ok) {
              if (response.status === 401) throw fail("health_session_changed");
              const code =
                payload?.code === "PGRST202"
                  ? "health_not_configured"
                  : ["22023", "42501", "PT409"].includes(payload?.code) &&
                      CODES.has(payload?.message)
                    ? payload.message
                    : "health_unavailable";
              throw Object.assign(fail(code), {
                definitive: code !== "health_unavailable",
              });
            }
            return payload;
          })(),
          deadline,
        ]);
      } catch (error) {
        current();
        if (typeof error?.code === "string") throw error;
        throw fail("health_unavailable");
      } finally {
        clearTimeout(timer);
        controllers.delete(controller);
      }
    }
    async function status() {
      const value = await request("wl_health_account_status", {});
      if (
        value?.ok !== true ||
        typeof value.connected !== "boolean" ||
        typeof value.has_data !== "boolean" ||
        typeof value.enabled !== "boolean" ||
        typeof value.can_connect !== "boolean" ||
        typeof value.has_composition_data !== "boolean" ||
        !["not_connected", "active", "revoked"].includes(value.status) ||
        value.connected !== (value.status === "active") ||
        !Array.isArray(value.requested_types) ||
        value.requested_types.some((type) => typeof type !== "string") ||
        typeof value.sync_consent_version !== "string" ||
        typeof value.composition_consent_version !== "string"
      )
        throw fail("health_unavailable");
      return value;
    }
    async function send(value) {
      let result;
      try {
        result =
          value.action === "workout_writeback"
            ? await request("wl_health_writeback_manage", {
                p_request_id: value.requestId,
                p_enabled: value.options.enabled,
                p_consent_version: value.options.consent_version,
              })
            : await request("wl_health_manage", {
                p_request_id: value.requestId,
                p_action: value.action,
                p_options: value.options,
              });
      } catch (error) {
        if (error.definitive) clear(value);
        throw error;
      }
      current();
      if (value.action === "workout_writeback") {
        if (
          result?.ok !== true ||
          result.request_id !== value.requestId ||
          result.enabled !== value.options.enabled ||
          (result.replayed !== undefined &&
            typeof result.replayed !== "boolean") ||
          result.shortcut_key !== undefined ||
          result.key_requires_rotation !== undefined ||
          result.install_url !== undefined
        )
          throw fail("health_unconfirmed");
        clear(value);
        return {
          ok: true,
          request_id: result.request_id,
          action: value.action,
          enabled: result.enabled,
          replayed: result.replayed === true,
        };
      }
      if (
        result?.ok !== true ||
        result.request_id !== value.requestId ||
        result.action !== value.action ||
        typeof result.key_requires_rotation !== "boolean" ||
        result.data_deleted !==
          !!(value.options.delete_data || value.options.delete_body_composition)
      )
        throw fail("health_unconfirmed");
      if (value.action === "create_shortcut_key") {
        if (result.key_requires_rotation) {
          if (result.replayed !== true || result.shortcut_key !== undefined)
            throw fail("health_unconfirmed");
        } else if (
          !/^WLSC_[a-f0-9]{64}$/.test(result.shortcut_key || "") ||
          !installUrl(result.install_url)
        )
          throw fail("health_unconfirmed");
      } else if (
        result.key_requires_rotation ||
        result.shortcut_key !== undefined
      )
        throw fail("health_unconfirmed");
      clear(value);
      return result;
    }
    async function locked(callback) {
      current();
      if (!locks?.request) throw fail("health_browser_unsupported");
      return locks.request(
        key,
        { mode: "exclusive", ifAvailable: true },
        async (lock) => {
          current();
          if (!lock) throw fail("health_operation_busy");
          return callback();
        },
      );
    }
    function mutate(action, options) {
      return locked(async () => {
        if (read()) throw fail("health_pending_operation");
        const value = {
          owner,
          requestId: uuid(),
          action,
          options: optionsFor(action, options),
        };
        if (!UUID.test(value.requestId)) throw fail("invalid_health_request");
        current();
        storage.setItem(key, JSON.stringify(value));
        return send(value);
      });
    }
    function retry() {
      return locked(async () => {
        const value = read();
        return value ? send(value) : null;
      });
    }
    function destroy() {
      destroyed = true;
      for (const controller of controllers) controller.abort();
      controllers.clear();
    }
    async function writebackStatus() {
      let value;
      try {
        value = await request("wl_health_writeback_status", {});
      } catch (error) {
        if (error.code === "health_not_configured") return null;
        throw error;
      }
      if (
        value?.ok !== true ||
        typeof value.enabled !== "boolean" ||
        typeof value.effective !== "boolean" ||
        typeof value.can_enable !== "boolean" ||
        typeof value.consent_version !== "string" ||
        value.consent_version.length > 120 ||
        !Number.isSafeInteger(value.pending_count) ||
        value.pending_count < 0 ||
        value.pending_count > 100 ||
        (value.can_enable && !value.consent_version.trim()) ||
        (value.effective && (!value.enabled || !value.can_enable))
      )
        throw fail("health_unavailable");
      return {
        ok: true,
        enabled: value.enabled,
        effective: value.effective,
        can_enable: value.can_enable,
        consent_version: value.consent_version,
        pending_count: value.pending_count,
      };
    }
    async function queueWorkouts(progressEpoch) {
      if (progressEpoch !== null && !UUID.test(progressEpoch || ""))
        throw fail("invalid_health_request");
      const value = await request("wl_health_queue_completed_workouts", {
        p_progress_epoch: progressEpoch,
      });
      if (
        value?.ok !== true ||
        !Number.isSafeInteger(value.queued_count) ||
        !Number.isSafeInteger(value.pending_count) ||
        value.queued_count < 0 ||
        value.pending_count < value.queued_count ||
        value.pending_count > 100
      )
        throw fail("health_unconfirmed");
      return {
        ok: true,
        queued_count: value.queued_count,
        pending_count: value.pending_count,
      };
    }
    return Object.freeze({
      status,
      writebackStatus,
      queueWorkouts,
      read,
      mutate,
      retry,
      destroy,
    });
  }
  const api = Object.freeze({ create, installUrl, PREFIX });
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WLHealthActions = api;
})(typeof window === "undefined" ? globalThis : window);
