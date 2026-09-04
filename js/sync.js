/**
 * CompTIA A+ Master Exam Simulator
 * sync.js - Optional cross-device cloud sync (Supabase Auth + Postgres)
 * File: js/sync.js
 *
 * PRODUCT RULES
 *  - Local-first stays the default. Accounts are entirely OPTIONAL and exist
 *    only to sync progress between devices.
 *  - Disabled entirely unless js/sync-config.js supplies a Supabase URL and
 *    anon key with enabled:true.
 *  - Never blocks app startup. Every entry point is defensively guarded so a
 *    missing config, missing DOM, or network failure never throws.
 *  - Never uploads Groq API keys, license keys, or telemetry buffers.
 *
 * PUBLIC API (window.APlus.sync)
 *  - merge(local, remote)   Pure function, safe to call from Node.
 *      local/remote shape:  { keys: { key: { v: string, u: ISOString } }, updatedAt: ISOString }
 *      returns the same shape.
 *  - init()                 Wires bus listeners + renders the panel. Safe no-op if disabled.
 *  - buildLocalRepr()        Builds a { keys, updatedAt } snapshot from CompTIADatabase.
 *  - isExcludedKey(key)      Exposed for tests / other modules.
 */
(function (global) {
  'use strict';

  if (typeof global === 'undefined' || !global) return;

  var APlus = global.APlus = global.APlus || {};

  /* ======================================================================
   * Constants
   * ==================================================================== */

  var EXCLUDE_CONTENT_RE = /groq|license|telemetry|api_key/i;
  var MASTER_DB_RE = /^comptia_database_master/;
  var SYNC_INTERNAL_RE = /^aplus3_sync_/i;
  var HISTORY_KEY_RE = /comptia_a_plus_history$/;
  var MISSED_KEY_RE = /comptia_a_plus_missed$/;
  var SRS_KEY_RE = /srs/i;

  var KEY_TIMES_STORAGE_KEY = 'sync_key_times';       // -> aplus3_sync_key_times
  var LAST_SYNCED_STORAGE_KEY = 'sync_last_synced_at'; // -> aplus3_sync_last_synced_at
  var DEVICE_ID_STORAGE_KEY = 'sync_device_id';        // -> aplus3_sync_device_id
  var AUTH_EMAIL_STORAGE_KEY = 'sync_auth_email';       // -> aplus3_sync_auth_email

  var SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';

  /* ======================================================================
   * Small guarded utilities
   * ==================================================================== */

  function nowIso() { return new Date().toISOString(); }

  function safeParse(str, fallback) {
    if (typeof str !== 'string') return fallback;
    try { return JSON.parse(str); } catch (_) { return fallback; }
  }

  function toTime(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && isFinite(v)) return v;
    var t = Date.parse(v);
    return isNaN(t) ? 0 : t;
  }

  function isExcludedKey(k) {
    if (typeof k !== 'string' || !k) return true;
    if (MASTER_DB_RE.test(k)) return true;
    if (SYNC_INTERNAL_RE.test(k)) return true;
    if (EXCLUDE_CONTENT_RE.test(k)) return true;
    return false;
  }

  /* ======================================================================
   * Content-aware merge helpers
   * ==================================================================== */

  function cardTimestamp(card) {
    if (!card || typeof card !== 'object') return 0;
    var candidates = [card.lastReviewed, card.lastReview, card.updatedAt, card.due, card.nextReviewDate];
    var max = 0;
    for (var i = 0; i < candidates.length; i++) {
      var t = toTime(candidates[i]);
      if (t > max) max = t;
    }
    return max;
  }

  function historyEntryKey(entry, idx) {
    if (entry && typeof entry === 'object') {
      if (entry.id) return 'id:' + String(entry.id);
      if (entry.attemptId) return 'id:' + String(entry.attemptId);
      // Synthetic fingerprint from stable fields present on every history row.
      return 'fp:' + [entry.date, entry.examType, entry.raw, entry.scaledScore, entry.status].join('|');
    }
    return 'idx:' + idx;
  }

  function historyEntryTime(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    if (entry.timestamp) return toTime(entry.timestamp);
    if (entry.date) {
      var t = Date.parse(entry.date);
      if (!isNaN(t)) return t;
    }
    return 0;
  }

  function mergeHistoryArrays(a, b) {
    var arrA = Array.isArray(a) ? a : [];
    var arrB = Array.isArray(b) ? b : [];
    var map = {};
    var order = [];
    arrA.concat(arrB).forEach(function (entry, i) {
      var key = historyEntryKey(entry, i);
      if (!Object.prototype.hasOwnProperty.call(map, key)) {
        map[key] = entry;
        order.push(key);
      }
    });
    var merged = order.map(function (k) { return map[k]; });
    merged.sort(function (x, y) { return historyEntryTime(y) - historyEntryTime(x); });
    return merged;
  }

  function mergeIdArrays(a, b) {
    var arrA = Array.isArray(a) ? a : [];
    var arrB = Array.isArray(b) ? b : [];
    var seen = {};
    var out = [];
    arrA.concat(arrB).forEach(function (id) {
      var k = String(id);
      if (!Object.prototype.hasOwnProperty.call(seen, k)) {
        seen[k] = true;
        out.push(id);
      }
    });
    return out;
  }

  function mergeSrsCards(cardsA, cardsB) {
    var out = {};
    var a = (cardsA && typeof cardsA === 'object') ? cardsA : {};
    var b = (cardsB && typeof cardsB === 'object') ? cardsB : {};
    var ids = {};
    Object.keys(a).forEach(function (id) { ids[id] = true; });
    Object.keys(b).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      var ca = a[id];
      var cb = b[id];
      if (ca && !cb) { out[id] = ca; return; }
      if (cb && !ca) { out[id] = cb; return; }
      out[id] = (cardTimestamp(cb) >= cardTimestamp(ca)) ? cb : ca;
    });
    return out;
  }

  /** Merge two raw (stringified) SRS deck values, tolerating either known shape. */
  function mergeSrsDeckValue(rawA, rawB) {
    var a = safeParse(rawA, null);
    var b = safeParse(rawB, null);
    if (a === null && b === null) return rawA !== undefined ? rawA : rawB;
    if (a === null || typeof a !== 'object') return rawB !== undefined ? rawB : rawA;
    if (b === null || typeof b !== 'object') return rawA !== undefined ? rawA : rawB;

    // Shape 1: { cards: { id: card }, version }
    if (!Array.isArray(a) && a.cards && typeof a.cards === 'object') {
      var bCards = (!Array.isArray(b) && b.cards && typeof b.cards === 'object') ? b.cards : {};
      var mergedWrapped = Object.assign({}, a, b, { cards: mergeSrsCards(a.cards, bCards) });
      return JSON.stringify(mergedWrapped);
    }

    // Shape 2: flat map { qId: card }
    if (!Array.isArray(a) && !Array.isArray(b)) {
      return JSON.stringify(mergeSrsCards(a, b));
    }

    // Unknown / mismatched shape: prefer local raw deterministically.
    return rawA !== undefined ? rawA : rawB;
  }

  function keyKind(key) {
    if (HISTORY_KEY_RE.test(key)) return 'history';
    if (MISSED_KEY_RE.test(key)) return 'missed';
    if (SRS_KEY_RE.test(key)) return 'srs';
    return 'plain';
  }

  /**
   * Merge one key's {v,u} entries per its content-aware rule.
   * Returns { v, u } or null if both sides are absent.
   */
  function mergeKeyEntry(key, localEntry, remoteEntry) {
    var hasLocal = !!localEntry;
    var hasRemote = !!remoteEntry;
    if (!hasLocal && !hasRemote) return null;
    if (!hasLocal) return { v: remoteEntry.v, u: remoteEntry.u };
    if (!hasRemote) return { v: localEntry.v, u: localEntry.u };

    var kind = keyKind(key);
    var newestU = (toTime(remoteEntry.u) >= toTime(localEntry.u)) ? remoteEntry.u : localEntry.u;

    if (kind === 'history') {
      var mergedHist = mergeHistoryArrays(safeParse(localEntry.v, []), safeParse(remoteEntry.v, []));
      return { v: JSON.stringify(mergedHist), u: newestU };
    }
    if (kind === 'missed') {
      var mergedMissed = mergeIdArrays(safeParse(localEntry.v, []), safeParse(remoteEntry.v, []));
      return { v: JSON.stringify(mergedMissed), u: newestU };
    }
    if (kind === 'srs') {
      return { v: mergeSrsDeckValue(localEntry.v, remoteEntry.v), u: newestU };
    }

    // Plain per-key newest-wins.
    return (toTime(remoteEntry.u) >= toTime(localEntry.u))
      ? { v: remoteEntry.v, u: remoteEntry.u }
      : { v: localEntry.v, u: localEntry.u };
  }

  /**
   * Pure merge function, safe to call from Node with no DOM/globals present.
   * local/remote: { keys: { key: { v: string, u: ISOString } }, updatedAt: ISOString }
   */
  function merge(local, remote) {
    var out = { keys: {}, updatedAt: null };
    var localKeys = (local && local.keys) || {};
    var remoteKeys = (remote && remote.keys) || {};
    var allKeys = {};
    Object.keys(localKeys).forEach(function (k) { allKeys[k] = true; });
    Object.keys(remoteKeys).forEach(function (k) { allKeys[k] = true; });

    Object.keys(allKeys).forEach(function (key) {
      if (isExcludedKey(key)) return;
      var mergedEntry = mergeKeyEntry(key, localKeys[key], remoteKeys[key]);
      if (mergedEntry) out.keys[key] = mergedEntry;
    });

    // Deterministic outer updatedAt: derived only from input data so that
    // merge(a, merge(a,b)) === merge(a,b) (no wall-clock dependency).
    var maxU = Math.max(toTime(local && local.updatedAt), toTime(remote && remote.updatedAt));
    Object.keys(out.keys).forEach(function (k) {
      var t = toTime(out.keys[k].u);
      if (t > maxU) maxU = t;
    });
    out.updatedAt = new Date(maxU || 0).toISOString();

    return out;
  }

  /* ======================================================================
   * Node / browser export split. Everything below this line touches
   * window/document/localStorage and must never run under plain Node.
   * ==================================================================== */

  APlus.sync = APlus.sync || {};
  APlus.sync.merge = merge;
  APlus.sync.isExcludedKey = isExcludedKey;
  APlus.sync._internal = {
    mergeHistoryArrays: mergeHistoryArrays,
    mergeIdArrays: mergeIdArrays,
    mergeSrsCards: mergeSrsCards,
    mergeSrsDeckValue: mergeSrsDeckValue,
    keyKind: keyKind
  };

  var hasDom = (typeof global.document !== 'undefined' && global.document);
  var hasLocalStorage = (function () {
    try { return typeof global.localStorage !== 'undefined' && !!global.localStorage; } catch (_) { return false; }
  })();

  if (!hasDom || !hasLocalStorage) {
    // Node test environment (or a stripped stub window): pure merge API only.
    return;
  }

  /* ======================================================================
   * Browser runtime: config, key-time tracking, Supabase client, UI panel
   * ==================================================================== */

  function getConfig() {
    var cfg = global.APLUS_SYNC_CONFIG;
    if (!cfg || typeof cfg !== 'object') return null;
    if (!cfg.enabled) return null;
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
    return {
      enabled: true,
      supabaseUrl: String(cfg.supabaseUrl),
      supabaseAnonKey: String(cfg.supabaseAnonKey),
      table: cfg.table ? String(cfg.table) : 'learner_snapshots',
      debounceMs: (typeof cfg.debounceMs === 'number' && cfg.debounceMs > 0) ? cfg.debounceMs : 4000
    };
  }

  function isDesktopOrFileProtocol() {
    try {
      if (global.electronAPI) return true;
      if (global.location && global.location.protocol === 'file:') return true;
    } catch (_) {}
    return false;
  }

  function isOnline() {
    try { return global.navigator ? global.navigator.onLine !== false : true; } catch (_) { return true; }
  }

  function localGet(key, fallback) {
    try {
      if (APlus.storage && typeof APlus.storage.get === 'function') {
        return APlus.storage.get(key, fallback);
      }
    } catch (_) {}
    return fallback;
  }

  function localSet(key, value) {
    try {
      if (APlus.storage && typeof APlus.storage.set === 'function') {
        APlus.storage.set(key, value);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function getDeviceId() {
    var id = localGet(DEVICE_ID_STORAGE_KEY, null);
    if (id && typeof id === 'string') return id;
    try {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    } catch (_) {
      id = 'dev_unknown';
    }
    localSet(DEVICE_ID_STORAGE_KEY, id);
    return id;
  }

  /* ----------------------------------------------------------------------
   * Key-time tracking: hook APlus.bus 'storage:changed' and also poll
   * CompTIADatabase.getAll() diffs every debounceMs, so that keys written
   * directly through CompTIADatabase.set (not via APlus.storage) still get
   * stamped.
   * -------------------------------------------------------------------- */

  var lastKnownSnapshotForDiff = null;

  function getKeyTimes() {
    var kt = localGet(KEY_TIMES_STORAGE_KEY, {});
    return (kt && typeof kt === 'object') ? kt : {};
  }

  function stampKeyTimes(keys) {
    if (!keys || !keys.length) return;
    var kt = getKeyTimes();
    var ts = nowIso();
    var changed = false;
    keys.forEach(function (k) {
      if (isExcludedKey(k)) return;
      kt[k] = ts;
      changed = true;
    });
    if (changed) localSet(KEY_TIMES_STORAGE_KEY, kt);
  }

  function diffAndStamp(currentSnapshot) {
    if (!currentSnapshot || typeof currentSnapshot !== 'object') return;
    var prev = lastKnownSnapshotForDiff;
    var changedKeys = [];
    Object.keys(currentSnapshot).forEach(function (k) {
      if (isExcludedKey(k)) return;
      if (!prev || prev[k] !== currentSnapshot[k]) changedKeys.push(k);
    });
    if (prev) {
      Object.keys(prev).forEach(function (k) {
        if (isExcludedKey(k)) return;
        if (!Object.prototype.hasOwnProperty.call(currentSnapshot, k)) changedKeys.push(k);
      });
    }
    lastKnownSnapshotForDiff = Object.assign({}, currentSnapshot);
    if (changedKeys.length) stampKeyTimes(changedKeys);
  }

  function startKeyTimeTracking(debounceMs) {
    try {
      if (APlus.bus && typeof APlus.bus.on === 'function') {
        APlus.bus.on('storage:changed', function (payload) {
          try {
            if (payload && payload.key) stampKeyTimes([payload.key]);
          } catch (_) {}
        });
      }
    } catch (_) {}

    try {
      if (global.CompTIADatabase && typeof global.CompTIADatabase.getAll === 'function') {
        lastKnownSnapshotForDiff = global.CompTIADatabase.getAll();
      }
    } catch (_) {}

    try {
      global.setInterval(function () {
        try {
          if (global.CompTIADatabase && typeof global.CompTIADatabase.getAll === 'function') {
            diffAndStamp(global.CompTIADatabase.getAll());
          }
        } catch (_) {}
      }, Math.max(1000, debounceMs || 4000));
    } catch (_) {}
  }

  /* ----------------------------------------------------------------------
   * Local <-> wire representation
   * -------------------------------------------------------------------- */

  function buildLocalRepr() {
    var snapshot = {};
    try {
      if (global.CompTIADatabase && typeof global.CompTIADatabase.getAll === 'function') {
        snapshot = global.CompTIADatabase.getAll() || {};
      }
    } catch (_) {}

    var keyTimes = getKeyTimes();
    var repr = { keys: {}, updatedAt: nowIso() };
    var fallbackTime = (snapshot._meta && snapshot._meta.updatedAt) ? snapshot._meta.updatedAt : nowIso();

    Object.keys(snapshot).forEach(function (k) {
      if (k === '_meta') return;
      if (isExcludedKey(k)) return;
      var v = snapshot[k];
      if (typeof v !== 'string') {
        try { v = JSON.stringify(v); } catch (_) { return; }
      }
      repr.keys[k] = { v: v, u: keyTimes[k] || fallbackTime };
    });

    return repr;
  }

  function reprFromRemoteRow(row) {
    if (!row) return { keys: {}, updatedAt: null };
    var snapshot = (row.snapshot && typeof row.snapshot === 'object') ? row.snapshot : {};
    var keyTimes = (row.key_times && typeof row.key_times === 'object') ? row.key_times : {};
    var repr = { keys: {}, updatedAt: row.updated_at || null };
    Object.keys(snapshot).forEach(function (k) {
      if (isExcludedKey(k)) return;
      var v = snapshot[k];
      if (typeof v !== 'string') {
        try { v = JSON.stringify(v); } catch (_) { return; }
      }
      repr.keys[k] = { v: v, u: keyTimes[k] || row.updated_at || null };
    });
    return repr;
  }

  function applyReprLocally(repr) {
    if (!repr || !repr.keys) return;
    var localSnapshot = {};
    try {
      if (global.CompTIADatabase && typeof global.CompTIADatabase.getAll === 'function') {
        localSnapshot = global.CompTIADatabase.getAll() || {};
      }
    } catch (_) {}

    var keyTimes = getKeyTimes();
    var changed = [];

    Object.keys(repr.keys).forEach(function (k) {
      if (isExcludedKey(k)) return;
      var entry = repr.keys[k];
      if (!entry) return;
      if (localSnapshot[k] !== entry.v) {
        try {
          if (global.CompTIADatabase && typeof global.CompTIADatabase.set === 'function') {
            global.CompTIADatabase.set(k, entry.v);
          }
        } catch (_) {}
        changed.push(k);
      }
      keyTimes[k] = entry.u || keyTimes[k] || nowIso();
    });

    localSet(KEY_TIMES_STORAGE_KEY, keyTimes);
    if (changed.length && global.CompTIADatabase && typeof global.CompTIADatabase.getAll === 'function') {
      lastKnownSnapshotForDiff = global.CompTIADatabase.getAll();
    }
  }

  function reprToWireRow(repr, userId, deviceId) {
    var snapshot = {};
    var keyTimes = {};
    Object.keys(repr.keys).forEach(function (k) {
      snapshot[k] = repr.keys[k].v;
      keyTimes[k] = repr.keys[k].u;
    });
    return {
      user_id: userId,
      device_id: deviceId,
      snapshot: snapshot,
      key_times: keyTimes,
      updated_at: repr.updatedAt || nowIso()
    };
  }

  /* ----------------------------------------------------------------------
   * Supabase client (lazy-loaded)
   * -------------------------------------------------------------------- */

  var supabaseClientPromise = null;

  function loadSupabaseScript() {
    return new Promise(function (resolve, reject) {
      if (global.supabase && typeof global.supabase.createClient === 'function') {
        resolve(global.supabase);
        return;
      }
      try {
        var existing = global.document.querySelector('script[data-aplus-supabase]');
        if (existing) {
          existing.addEventListener('load', function () { resolve(global.supabase); });
          existing.addEventListener('error', function () { reject(new Error('Failed to load Supabase library.')); });
          return;
        }
        var script = global.document.createElement('script');
        script.src = SUPABASE_JS_URL;
        script.async = true;
        script.setAttribute('data-aplus-supabase', 'true');
        script.onload = function () {
          if (global.supabase && typeof global.supabase.createClient === 'function') {
            resolve(global.supabase);
          } else {
            reject(new Error('Supabase library loaded but did not initialize.'));
          }
        };
        script.onerror = function () { reject(new Error('Failed to load Supabase library from CDN.')); };
        global.document.head.appendChild(script);
      } catch (err) {
        reject(err);
      }
    });
  }

  function getSupabaseClient() {
    var cfg = getConfig();
    if (!cfg) return Promise.reject(new Error('Sync is not configured.'));
    if (!isOnline()) return Promise.reject(new Error('offline'));
    if (!supabaseClientPromise) {
      supabaseClientPromise = loadSupabaseScript().then(function (sb) {
        return sb.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isDesktopOrFileProtocol() }
        });
      });
    }
    return supabaseClientPromise;
  }

  /* ----------------------------------------------------------------------
   * Sync orchestration
   * -------------------------------------------------------------------- */

  var syncState = {
    status: 'idle', // idle | syncing | error | offline | signed-out
    lastError: null,
    session: null
  };

  function setState(patch) {
    Object.assign(syncState, patch);
    try { renderPanel(); } catch (_) {}
  }

  function runSyncNow() {
    var cfg = getConfig();
    if (!cfg) return Promise.resolve();
    if (!syncState.session) return Promise.resolve();
    if (!isOnline()) { setState({ status: 'offline' }); return Promise.resolve(); }

    setState({ status: 'syncing', lastError: null });

    return getSupabaseClient().then(function (client) {
      var userId = syncState.session.user && syncState.session.user.id;
      if (!userId) throw new Error('Not signed in.');
      var deviceId = getDeviceId();

      return client.from(cfg.table).select('*').eq('user_id', userId).maybeSingle().then(function (res) {
        if (res.error && res.error.code !== 'PGRST116') throw res.error;
        var remoteRepr = reprFromRemoteRow(res.data);
        var localRepr = buildLocalRepr();
        var mergedRepr = merge(localRepr, remoteRepr);

        applyReprLocally(mergedRepr);

        var row = reprToWireRow(mergedRepr, userId, deviceId);
        return client.from(cfg.table).upsert(row, { onConflict: 'user_id' }).then(function (upsertRes) {
          if (upsertRes.error) throw upsertRes.error;
          localSet(LAST_SYNCED_STORAGE_KEY, nowIso());
          setState({ status: 'idle', lastError: null });
        });
      });
    }).catch(function (err) {
      setState({ status: 'error', lastError: (err && err.message) || String(err) });
    });
  }

  var debouncedSyncTimer = null;
  function scheduleSync() {
    var cfg = getConfig();
    if (!cfg) return;
    if (debouncedSyncTimer) global.clearTimeout(debouncedSyncTimer);
    debouncedSyncTimer = global.setTimeout(function () { runSyncNow(); }, cfg.debounceMs);
  }

  /* ----------------------------------------------------------------------
   * Auth flows
   * -------------------------------------------------------------------- */

  function redirectTo() {
    try { return global.location.origin + global.location.pathname; } catch (_) { return ''; }
  }

  function signInWithEmail(email) {
    var cfg = getConfig();
    if (!cfg) return Promise.reject(new Error('Sync is not configured.'));
    if (!isOnline()) return Promise.reject(new Error('offline'));
    localSet(AUTH_EMAIL_STORAGE_KEY, email);

    return getSupabaseClient().then(function (client) {
      if (isDesktopOrFileProtocol()) {
        // OTP code flow: redirects do not resolve under file:// or inside Electron.
        return client.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
      }
      return client.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: redirectTo(), shouldCreateUser: true }
      });
    });
  }

  function verifyEmailCode(email, token) {
    return getSupabaseClient().then(function (client) {
      return client.auth.verifyOtp({ email: email, token: token, type: 'email' });
    }).then(function (res) {
      if (res.error) throw res.error;
      return res.data && res.data.session;
    });
  }

  function signOut() {
    return getSupabaseClient().then(function (client) {
      return client.auth.signOut();
    }).then(function () {
      setState({ session: null, status: 'signed-out' });
    }).catch(function () {
      setState({ session: null, status: 'signed-out' });
    });
  }

  function deleteCloudData() {
    var cfg = getConfig();
    if (!cfg || !syncState.session) return Promise.resolve();
    var userId = syncState.session.user && syncState.session.user.id;
    if (!userId) return Promise.resolve();
    return getSupabaseClient().then(function (client) {
      return client.from(cfg.table).delete().eq('user_id', userId);
    }).then(function (res) {
      if (res.error) throw res.error;
      setState({ status: 'idle', lastError: null });
    }).catch(function (err) {
      setState({ status: 'error', lastError: (err && err.message) || String(err) });
    });
  }

  function restoreSession() {
    var cfg = getConfig();
    if (!cfg) return;
    getSupabaseClient().then(function (client) {
      client.auth.getSession().then(function (res) {
        var session = res && res.data ? res.data.session : null;
        if (session) {
          setState({ session: session, status: 'idle' });
          startKeyTimeTracking(cfg.debounceMs);
          scheduleSync();
        }
        client.auth.onAuthStateChange(function (_event, newSession) {
          setState({ session: newSession, status: newSession ? 'idle' : 'signed-out' });
          if (newSession) scheduleSync();
        });
      }).catch(function () {});
    }).catch(function () {
      // Not signed in yet / not loaded: nothing to restore, stay in local-only mode.
    });
  }

  /* ----------------------------------------------------------------------
   * UI panel (black & gold, no emoji, gold only on the primary button)
   * -------------------------------------------------------------------- */

  var PANEL_HOST_ID = null; // resolved lazily: #syncRoot, or an injected section in #moreMenu

  function resolvePanelHost() {
    // The account panel belongs in the More drawer, never floating over the home screen.
    try {
      var moreMenu = global.document.getElementById('moreMenu');
      if (moreMenu) {
        var section = global.document.getElementById('syncRootInMoreMenu');
        if (!section) {
          section = global.document.createElement('div');
          section.id = 'syncRootInMoreMenu';
          moreMenu.appendChild(section);
        }
        return section;
      }
    } catch (_) {}

    try {
      var root = global.document.getElementById('syncRoot');
      if (root) return root;
    } catch (_) {}

    return null;
  }

  function esc(str) {
    try {
      if (APlus.utils && typeof APlus.utils.escapeHTML === 'function') return APlus.utils.escapeHTML(str);
    } catch (_) {}
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  var PANEL_CSS_ID = 'aplus-sync-panel-css';
  function ensurePanelStyles() {
    try {
      if (global.document.getElementById(PANEL_CSS_ID)) return;
      var style = global.document.createElement('style');
      style.id = PANEL_CSS_ID;
      style.textContent = [
        '.aplus-sync-panel{background:#0b0b0c;border:1px solid rgba(201,162,39,0.28);border-radius:10px;',
        'padding:0.9rem 1rem;color:#e9e4d8;font-size:0.85rem;max-width:360px;}',
        '.aplus-sync-panel h4{margin:0 0 0.5rem 0;color:#e0b83a;font-size:0.95rem;font-weight:700;}',
        '.aplus-sync-panel p{margin:0 0 0.6rem 0;color:#a39e93;line-height:1.4;}',
        '.aplus-sync-row{display:flex;gap:0.4rem;margin-bottom:0.5rem;flex-wrap:wrap;}',
        '.aplus-sync-input{flex:1 1 auto;min-width:140px;background:#141414;border:1px solid rgba(201,162,39,0.3);',
        'border-radius:6px;color:#e9e4d8;padding:0.4rem 0.55rem;font-size:0.82rem;}',
        '.aplus-sync-btn{border-radius:6px;padding:0.4rem 0.75rem;font-size:0.8rem;cursor:pointer;',
        'border:1px solid rgba(201,162,39,0.4);background:transparent;color:#e9e4d8;}',
        '.aplus-sync-btn:hover{border-color:#c9a227;}',
        '.aplus-sync-btn-primary{background:#c9a227;color:#0b0b0c;border-color:#c9a227;font-weight:700;}',
        '.aplus-sync-btn-primary:hover{background:#e0b83a;}',
        '.aplus-sync-status{font-size:0.75rem;color:#a39e93;margin-top:0.3rem;}',
        '.aplus-sync-status.err{color:#d98c8c;}'
      ].join('');
      global.document.head.appendChild(style);
    } catch (_) {}
  }

  function statusLine() {
    if (!isOnline()) return 'You are offline. Sync will resume when connectivity returns.';
    if (syncState.status === 'syncing') return 'Syncing...';
    if (syncState.status === 'error') return 'Sync error: ' + esc(syncState.lastError || 'unknown');
    var last = localGet(LAST_SYNCED_STORAGE_KEY, null);
    if (last) return 'Last synced: ' + new Date(last).toLocaleString();
    return 'Not yet synced on this device.';
  }

  function renderSignedOutPanel(host, cfg) {
    var savedEmail = localGet(AUTH_EMAIL_STORAGE_KEY, '') || '';
    var desktop = isDesktopOrFileProtocol();
    host.innerHTML =
      '<div class="aplus-sync-panel">' +
        '<h4>Account and sync</h4>' +
        '<p>Optional. Sign in with email to sync exam history, SRS decks, and progress across your devices. Your data stays local either way.</p>' +
        '<div class="aplus-sync-row">' +
          '<input type="email" class="aplus-sync-input" id="aplusSyncEmail" placeholder="you@example.com" value="' + esc(savedEmail) + '" />' +
        '</div>' +
        '<div class="aplus-sync-row">' +
          '<button type="button" class="aplus-sync-btn aplus-sync-btn-primary" id="aplusSyncSendBtn">' +
            (desktop ? 'Send sign-in code' : 'Send sign-in link') +
          '</button>' +
        '</div>' +
        (desktop ?
          '<div class="aplus-sync-row">' +
            '<input type="text" class="aplus-sync-input" id="aplusSyncCode" placeholder="6-digit code" inputmode="numeric" maxlength="6" />' +
            '<button type="button" class="aplus-sync-btn" id="aplusSyncVerifyBtn">Enter code</button>' +
          '</div>' : ''
        ) +
        '<div class="aplus-sync-status' + (syncState.status === 'error' ? ' err' : '') + '">' + statusLine() + '</div>' +
      '</div>';

    var sendBtn = global.document.getElementById('aplusSyncSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var emailInput = global.document.getElementById('aplusSyncEmail');
        var email = emailInput ? String(emailInput.value || '').trim() : '';
        if (!email) return;
        setState({ status: 'syncing', lastError: null });
        signInWithEmail(email).then(function (res) {
          if (res && res.error) throw res.error;
          setState({ status: 'idle', lastError: null });
        }).catch(function (err) {
          setState({ status: 'error', lastError: (err && err.message) || String(err) });
        });
      });
    }

    var verifyBtn = global.document.getElementById('aplusSyncVerifyBtn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', function () {
        var emailInput = global.document.getElementById('aplusSyncEmail');
        var codeInput = global.document.getElementById('aplusSyncCode');
        var email = emailInput ? String(emailInput.value || '').trim() : '';
        var code = codeInput ? String(codeInput.value || '').trim() : '';
        if (!email || !code) return;
        setState({ status: 'syncing', lastError: null });
        verifyEmailCode(email, code).then(function (session) {
          setState({ session: session, status: 'idle', lastError: null });
          startKeyTimeTracking(cfg.debounceMs);
          scheduleSync();
        }).catch(function (err) {
          setState({ status: 'error', lastError: (err && err.message) || String(err) });
        });
      });
    }
  }

  function renderSignedInPanel(host) {
    var email = (syncState.session && syncState.session.user && syncState.session.user.email) || '';
    host.innerHTML =
      '<div class="aplus-sync-panel">' +
        '<h4>Account and sync</h4>' +
        '<p>Signed in as ' + esc(email) + '. Progress syncs automatically between your devices.</p>' +
        '<div class="aplus-sync-row">' +
          '<button type="button" class="aplus-sync-btn aplus-sync-btn-primary" id="aplusSyncNowBtn">Sync now</button>' +
          '<button type="button" class="aplus-sync-btn" id="aplusSyncSignOutBtn">Sign out</button>' +
        '</div>' +
        '<div class="aplus-sync-row">' +
          '<button type="button" class="aplus-sync-btn" id="aplusSyncDeleteBtn">Delete my cloud data</button>' +
        '</div>' +
        '<div class="aplus-sync-status' + (syncState.status === 'error' ? ' err' : '') + '">' + statusLine() + '</div>' +
      '</div>';

    var syncBtn = global.document.getElementById('aplusSyncNowBtn');
    if (syncBtn) syncBtn.addEventListener('click', function () { runSyncNow(); });

    var signOutBtn = global.document.getElementById('aplusSyncSignOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', function () { signOut(); });

    var deleteBtn = global.document.getElementById('aplusSyncDeleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        try {
          if (!global.confirm('Delete all of your synced data from the cloud? Data on this device is not affected.')) return;
        } catch (_) {}
        deleteCloudData();
      });
    }
  }

  function renderDisabledPanel(host) {
    // Sync is off for this build: show nothing rather than a notice nobody can act on.
    host.innerHTML = '';
  }

  function renderPanel() {
    var cfg = getConfig();
    var host = resolvePanelHost();
    if (!host) return;
    ensurePanelStyles();

    if (!cfg) {
      renderDisabledPanel(host);
      return;
    }
    if (syncState.session) {
      renderSignedInPanel(host);
    } else {
      renderSignedOutPanel(host, cfg);
    }
  }

  /* ----------------------------------------------------------------------
   * Init
   * -------------------------------------------------------------------- */

  function init() {
    try {
      renderPanel();
      var cfg = getConfig();
      if (!cfg) return;

      try {
        global.window.addEventListener('online', function () { setState({}); if (syncState.session) scheduleSync(); });
        global.window.addEventListener('offline', function () { setState({}); });
      } catch (_) {}

      // Only attempt session restore / auto-load supabase-js if a prior sign-in
      // is plausible (we have a remembered email) or an auth redirect just
      // occurred, so we never fetch the CDN script on every cold start.
      var hadEmail = !!localGet(AUTH_EMAIL_STORAGE_KEY, null);
      var hashLooksLikeAuth = false;
      try { hashLooksLikeAuth = /access_token|refresh_token|type=magiclink/.test(global.location.hash || ''); } catch (_) {}
      if (hadEmail || hashLooksLikeAuth) {
        restoreSession();
      }
    } catch (err) {
      try { console.warn('[sync] init failed safely:', err); } catch (_) {}
    }
  }

  APlus.sync.init = init;
  APlus.sync.runSyncNow = runSyncNow;
  APlus.sync.buildLocalRepr = buildLocalRepr;
  APlus.sync.signInWithEmail = signInWithEmail;
  APlus.sync.verifyEmailCode = verifyEmailCode;
  APlus.sync.signOut = signOut;
  APlus.sync.deleteCloudData = deleteCloudData;
  APlus.sync.getState = function () { return Object.assign({}, syncState); };

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    // Defer to next tick so other modules (CompTIADatabase, profiles) finish
    // their own init first.
    global.setTimeout(init, 0);
  }

})(typeof window !== 'undefined' ? window : this);
