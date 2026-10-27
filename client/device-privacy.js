(function (root) {
  'use strict';
  const OWNER_KEY = 'primeBodyLocalStateOwnerV1';
  const PENDING_KEY = 'wl-device-cleanup-v1';
  const LOGOUT_KEY = 'wl-device-logout-v1';
  const EPOCH_PREFIX = 'wl-proof-reset-cleanup-v1:';
  const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const PRIVATE_KEYS = new Set([
    'primeBodyPendingProfileSync',
    'primeBodyUserFoodsQueueV1',
    'primeBodyPendingBodyChecksV1',
    'primeBodyLegalConsentV4',
    'primeBodyPendingLegalConsent',
    'primeBodyTechniqueExercise',
    'primeBodyAnketaStep',
    'primeBodySeenBroadcasts',
    'primeBodyTourSeen',
  ]);
  function failure(code) {
    return Object.assign(new Error(code), { code });
  }
  function create({
    storage = root.WLStorage,
    sessionStorage = root.sessionStorage,
    indexedDB = root.indexedDB,
    timeout = 15000,
  } = {}) {
    function pending() {
      const rows = JSON.parse(storage.getItem(PENDING_KEY) || '[]');
      if (
        !Array.isArray(rows) ||
        rows.some((id) => typeof id !== 'string' || !UUID.test(id))
      )
        throw failure('invalid_cleanup_journal');
      return rows;
    }
    function clearStorage(owner, unownedOnly = false) {
      if (!unownedOnly) storage.removeItem('wlHealthPendingV1:' + owner);
      if (!unownedOnly) storage.removeItem('wlMediaReportV1:' + owner);
      if (!unownedOnly) storage.removeItem('wlSeenBroadcastsV1:' + owner);
      if (!unownedOnly) storage.removeItem('wlAccountMailUntil:' + owner);
      if (!unownedOnly) {
        for (let i = storage.length - 1; i >= 0; i--) {
          const key = storage.key(i);
          if (key?.startsWith('wlBodyCheckPendingV1:' + owner + ':')) storage.removeItem(key);
          if (key?.startsWith('primeBodyMobileNutritionOutboxV1:' + owner + ':')) storage.removeItem(key);
        }
      }
      const current = storage.getItem(OWNER_KEY);
      if (current && current !== owner) return;
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (
          key &&
          ((key.startsWith('primeBodyMobile') && !key.startsWith('primeBodyMobileNutritionOutboxV1:')) ||
            PRIVATE_KEYS.has(key) ||
            (!unownedOnly &&
              (key === 'primeBodyWorkoutLogsV1:' + owner ||
                key === 'primeBodyProgressResetAckV1:' + owner)))
        )
          storage.removeItem(key);
      }
      sessionStorage?.removeItem('primeBodyPendingLegalConsent');
    }
    function scheduleOwnerCleanup(owner) {
      if (!UUID.test(owner)) throw failure('invalid_cleanup_owner');
      const rows = pending();
      if (!rows.includes(owner))
        storage.setItem(PENDING_KEY, JSON.stringify([...rows, owner]));
      clearStorage(owner);
    }
    function clearProofs(owner, epoch = undefined) {
      return new Promise((resolve, reject) => {
        let db,
          settled = false;
        const timer = setTimeout(
          () => finish(failure('local_cleanup_timeout')),
          timeout,
        );
        function finish(error) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          db?.close();
          if (error) reject(error);
          else resolve();
        }
        try {
          if (!indexedDB) throw failure('local_storage_unavailable');
          const request = indexedDB.open('wl-proof-outbox-v1:'+root.WL_CONFIG?.installationId, 1);
          request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains('pending'))
              request.result.createObjectStore('pending', { keyPath: 'key' });
          };
          request.onerror = request.onblocked = () =>
            finish(failure('local_cleanup_failed'));
          request.onsuccess = () => {
            db = request.result;
            if (settled) {
              db.close();
              return;
            }
            try {
              const tx = db.transaction('pending', 'readwrite');
              tx.oncomplete = () => finish();
              tx.onabort = tx.onerror = () =>
                finish(failure('local_cleanup_failed'));
              const cursor = tx.objectStore('pending').openCursor();
              cursor.onsuccess = () => {
                const row = cursor.result;
                if (!row) return;
                if (
                  row.value.owner === owner &&
                  (epoch === undefined || row.value.epoch === epoch)
                )
                  row.delete();
                row.continue();
              };
            } catch (error) {
              finish(failure('local_cleanup_failed'));
            }
          };
        } catch (error) {
          finish(error);
        }
      });
    }
    async function clearOwner(owner) {
      scheduleOwnerCleanup(owner);
      await clearProofs(owner);
      for (const key of epochKeys(owner)) storage.removeItem(key);
      clearStorage(owner);
      if (storage.getItem(OWNER_KEY) === owner) storage.removeItem(OWNER_KEY);
      const rows = pending().filter((id) => id !== owner);
      if (rows.length) storage.setItem(PENDING_KEY, JSON.stringify(rows));
      else storage.removeItem(PENDING_KEY);
    }
    async function cleanupPending() {
      for (const owner of pending()) await clearOwner(owner);
    }
    function epochKeys(owner) {
      const keys = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(EPOCH_PREFIX + owner + ':')) keys.push(key);
      }
      return keys;
    }
    async function clearProofEpoch(owner, epoch) {
      if (!UUID.test(owner) || (epoch !== null && !UUID.test(epoch)))
        throw failure('invalid_cleanup_epoch');
      const key = EPOCH_PREFIX + owner + ':' + (epoch || 'initial');
      // One key per exact scope avoids cross-tab read/modify/write journal loss.
      try {
        storage.setItem(key, '1');
      } catch {
        throw failure('cleanup_journal_unavailable');
      }
      await clearProofs(owner, epoch);
      storage.removeItem('wlBodyCheckPendingV1:' + owner + ':' + (epoch || 'initial'));
      storage.setItem(key, 'done');
    }
    async function cleanupProofEpochs(owner) {
      if (!UUID.test(owner)) throw failure('invalid_cleanup_owner');
      for (const key of epochKeys(owner)) {
        const suffix = key.slice((EPOCH_PREFIX + owner + ':').length);
        if (storage.getItem(key) === 'done') continue;
        await clearProofEpoch(owner, suffix === 'initial' ? null : suffix);
      }
    }
    function isProofEpochRetired(owner, epoch) {
      try {
        return (
          storage.getItem(EPOCH_PREFIX + owner + ':' + (epoch || 'initial')) !==
          null
        );
      } catch {
        return true;
      }
    }
    async function prepareOwner(owner) {
      if (!UUID.test(owner)) throw failure('invalid_cleanup_owner');
      if (storage.getItem(LOGOUT_KEY)) throw failure('logout_pending');
      const previous = storage.getItem(OWNER_KEY),
        hadPending = pending().length > 0;
      await cleanupPending();
      const current = storage.getItem(OWNER_KEY);
      if (current && current !== previous && current !== owner)
        throw failure('local_owner_changed');
      if (current && current !== owner) await clearOwner(current);
      await cleanupProofEpochs(owner);
      const latest = storage.getItem(OWNER_KEY);
      if (latest && latest !== owner) throw failure('local_owner_changed');
      // Unscoped legacy state cannot be attributed to a newly signed-in account.
      if (!previous && !latest) clearStorage(owner, true);
      storage.setItem(OWNER_KEY, owner);
      return { changed: hadPending || previous !== owner };
    }
    function markLogout(owner) {
      if (!UUID.test(owner)) throw failure('invalid_cleanup_owner');
      storage.setItem(LOGOUT_KEY, owner);
      scheduleOwnerCleanup(owner);
    }
    function finishLogout(owner) {
      if (storage.getItem(LOGOUT_KEY) === owner) storage.removeItem(LOGOUT_KEY);
    }
    function isPending(owner) {
      try {
        return (
          storage.getItem(LOGOUT_KEY) === owner || pending().includes(owner)
        );
      } catch (error) {
        return true;
      }
    }
    return {
      prepareOwner,
      clearOwner,
      scheduleOwnerCleanup,
      cleanupPending,
      clearProofEpoch,
      cleanupProofEpochs,
      isProofEpochRetired,
      markLogout,
      finishLogout,
      isPending,
      logoutOwner: () => storage.getItem(LOGOUT_KEY) || '',
      owner: () => storage.getItem(OWNER_KEY) || '',
    };
  }
  if (typeof module === 'object' && module.exports)
    module.exports = {
      create,
      OWNER_KEY,
      PENDING_KEY,
      LOGOUT_KEY,
      EPOCH_PREFIX,
    };
  else root.WLDevicePrivacy = Object.freeze({...create(),create});
})(typeof window === 'undefined' ? globalThis : window);
