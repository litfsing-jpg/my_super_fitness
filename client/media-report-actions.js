(function (root) {
  'use strict';
  const PREFIX = 'wlMediaReportV1:';
  const UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const fail = (code) => Object.assign(new Error(code), { code });
  function create({
    client,
    owner,
    isCurrent,
    storage = root.WLStorage,
    locks = root.navigator?.locks,
    uuid = () => root.crypto.randomUUID(),
  }) {
    if (
      !UUID.test(owner || '') ||
      !client?.rpc ||
      typeof isCurrent !== 'function'
    )
      throw fail('report_not_configured');
    const key = PREFIX + owner;
    const current = () => {
      if (!isCurrent()) throw fail('media_scope_changed');
    };
    function valid(value) {
      return (
        value &&
        UUID.test(value.requestId || '') &&
        ['exercise', 'dish'].includes(value.kind) &&
        typeof value.id === 'string' &&
        value.id.trim().length > 0 &&
        value.id.length <= 128 &&
        typeof value.name === 'string' &&
        value.name.length <= 256 &&
        typeof value.appVersion === 'string' &&
        value.appVersion.length <= 40 &&
        ['pending', 'sent'].includes(value.status) &&
        Object.keys(value).sort().join(',') ===
          'appVersion,id,kind,name,requestId,status'
      );
    }
    function read() {
      current();
      const values = JSON.parse(storage.getItem(key) || '[]');
      if (
        !Array.isArray(values) ||
        values.length > 100 ||
        values.some((v) => !valid(v)) ||
        new Set(values.map((v) => JSON.stringify([v.kind, v.id]))).size !==
          values.length
      )
        throw fail('invalid_report_journal');
      return values;
    }
    const matches = (a, b) => a.kind === b.kind && a.id === b.id;
    function status(item) {
      return read().find((v) => matches(v, item))?.status || null;
    }
    async function submit(item) {
      current();
      if (!locks?.request) throw fail('report_browser_unsupported');
      return locks.request(
        key,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          current();
          if (!lock) throw fail('report_busy');
          let values = read(),
            value = values.find((v) => matches(v, item));
          if (value?.status === 'sent') return true;
          if (!value) {
            value = {
              requestId: uuid(),
              kind: item.kind,
              id: item.id,
              name: item.name,
              appVersion: item.appVersion,
              status: 'pending',
            };
            if (!valid(value)) throw fail('invalid_report');
            // Keep pending requests; only evict old confirmed receipts from the bounded device journal.
            if (values.length >= 100) {
              const index = values.findIndex((v) => v.status === 'sent');
              if (index < 0) throw fail('report_queue_full');
              values.splice(index, 1);
            }
            values.push(value);
            storage.setItem(key, JSON.stringify(values));
          }
          current();
          const { data, error } = await client.rpc('wl_report_media', {
            p_request_id: value.requestId,
            p_kind: value.kind,
            p_item_id: value.id,
            p_name: value.name,
            p_app_version: value.appVersion,
          });
          current();
          if (
            error ||
            data?.ok !== true ||
            data.request_id !== value.requestId ||
            data.kind !== value.kind ||
            data.item_id !== value.id
          )
            throw fail('report_unconfirmed');
          values = read();
          const index = values.findIndex((v) => matches(v, value));
          if (
            index < 0 ||
            JSON.stringify(values[index]) !== JSON.stringify(value)
          )
            throw fail('report_request_changed');
          values[index] = { ...value, status: 'sent' };
          storage.setItem(key, JSON.stringify(values));
          return true;
        },
      );
    }
    return Object.freeze({ status, submit });
  }
  const api = Object.freeze({ create, PREFIX });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WLMediaReportActions = api;
})(typeof window === 'undefined' ? globalThis : window);
