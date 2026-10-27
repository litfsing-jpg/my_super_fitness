(function (root) {
  'use strict';
  const PREFIX = 'primeBodyMobileNutritionOutboxV1:';
  const UUID =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const fail = () => new Error('nutrition_outbox_unavailable');
  function validDate(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day))
      return false;
    const time = Date.parse(day + 'T12:00:00Z');
    return (
      Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day
    );
  }
  function record(value) {
    if (
      !value ||
      !validDate(value.date) ||
      !Array.isArray(value.items) ||
      value.items.length > 30 ||
      !Number.isFinite(value.water) ||
      value.water < 0 ||
      value.water > 10
    )
      throw fail();
    const text = JSON.stringify({
      date: value.date,
      items: value.items,
      water: value.water,
    });
    if (text.length > 65536) throw fail();
    return JSON.parse(text);
  }
  function create({
    storage,
    owner,
    epoch = null,
    uuid = () => root.crypto.randomUUID(),
    now = Date.now,
  }) {
    if (
      !UUID.test(owner || '') ||
      (epoch !== null && !UUID.test(epoch)) ||
      !storage
    )
      throw fail();
    const prefix = PREFIX + owner + ':' + (epoch || 'none') + ':';
    function entries() {
      const result = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(prefix)) continue;
        if (result.length >= 1000) throw fail();
        const raw = storage.getItem(key);
        if (raw === null) continue;
        if (raw.length > 70000) throw fail();
        let value;
        try {
          value = JSON.parse(raw);
        } catch {
          throw fail();
        }
        if (
          value?.version !== 1 ||
          value.owner !== owner ||
          value.epoch !== epoch ||
          !UUID.test(value.id || '') ||
          key !== prefix + value.id ||
          !Number.isSafeInteger(value.order) ||
          value.order < 0
        )
          throw fail();
        result.push({ ...value, record: record(value.record), key });
      }
      return result;
    }
    function latest(rows) {
      return (
        rows.sort((a, b) => b.order - a.order || b.id.localeCompare(a.id))[0] ||
        null
      );
    }
    function pending() {
      const days = new Map();
      for (const entry of entries()) {
        const rows = days.get(entry.record.date) || [];
        rows.push(entry);
        days.set(entry.record.date, rows);
      }
      return [...days.values()].map((rows) => ({
        ...latest(rows),
        keys: rows.map((row) => row.key),
      }));
    }
    function stage(value) {
      const clean = record(value),
        rows = entries().filter((row) => row.record.date === clean.date),
        previous = latest(rows);
      if (previous && JSON.stringify(previous.record) === JSON.stringify(clean))
        return { ...previous, keys: rows.map((row) => row.key) };
      const id = uuid();
      if (!UUID.test(id || '')) throw fail();
      const order = Math.max(Math.floor(now()), (previous?.order || 0) + 1);
      if (!Number.isSafeInteger(order) || order < 0) throw fail();
      const key = prefix + id;
      if (storage.getItem(key) !== null) throw fail();
      const entry = { version: 1, owner, epoch, id, order, record: clean };
      // New immutable key is durable before superseded keys are removed. Old acknowledgements cannot erase it.
      storage.setItem(key, JSON.stringify(entry));
      for (const row of rows) {
        try {
          storage.removeItem(row.key);
        } catch {}
      }
      return { ...entry, key, keys: [key] };
    }
    function acknowledge(sent) {
      if (
        sent?.owner !== owner ||
        sent?.epoch !== epoch ||
        !Array.isArray(sent.keys) ||
        sent.keys.some(
          (key) =>
            typeof key !== 'string' ||
            !key.startsWith(prefix) ||
            !UUID.test(key.slice(prefix.length)),
        )
      )
        throw fail();
      for (const key of sent.keys) storage.removeItem(key);
    }
    return Object.freeze({ pending, stage, acknowledge });
  }
  const api = Object.freeze({ PREFIX, create });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WLNutritionOutbox = api;
})(typeof window === 'undefined' ? globalThis : window);
