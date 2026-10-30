/**
 * APX event telemetry: best-effort mirror of earn/spend to the edge Worker.
 * Never blocks study UX. No-ops when unsigned or offline.
 */
(function (global) {
  'use strict';
  var APlus = (global.APlus = global.APlus || {});
  var QUEUE_KEY = 'apx_event_queue_v1';
  var ENDPOINT = '/api/v1/apx/events';
  var flushing = false;

  function loadQueue() {
    try {
      var raw = localStorage.getItem(QUEUE_KEY);
      var q = raw ? JSON.parse(raw) : [];
      return Array.isArray(q) ? q : [];
    } catch (_) {
      return [];
    }
  }

  function saveQueue(q) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-200)));
    } catch (_) {}
  }

  function apiBase() {
    try {
      if (global.APLUS_EDGE_CONFIG && global.APLUS_EDGE_CONFIG.apiBase) {
        return String(global.APLUS_EDGE_CONFIG.apiBase).replace(/\/$/, '');
      }
    } catch (_) {}
    return '';
  }

  function onBlock(block) {
    if (!block || typeof block !== 'object') return;
    var delta = Number(block.tokenDelta) || 0;
    if (!delta && block.type !== 'SPEND_UNLOCK' && block.type !== 'CONSUME_UNLOCK') return;
    var evt = {
      day: (block.payload && block.payload.day) || null,
      source: block.type,
      amount: delta,
      capped: !!(block.payload && block.payload.budgetCapped),
      item: (block.payload && (block.payload.unlockId || block.payload.achievementId)) || null,
      balance_after: null,
      created_at: block.timestamp || new Date().toISOString()
    };
    try {
      if (global.CompTIALedger && CompTIALedger.getState) {
        CompTIALedger.getState().then(function (st) {
          evt.balance_after = st && st.wallet ? st.wallet.balance : null;
          enqueue(evt);
        }).catch(function () { enqueue(evt); });
        return;
      }
    } catch (_) {}
    enqueue(evt);
  }

  function enqueue(evt) {
    var q = loadQueue();
    q.push(evt);
    saveQueue(q);
    flushSoon();
  }

  var flushTimer = null;
  function flushSoon() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () {
      flushTimer = null;
      flush().catch(function () {});
    }, 1200);
  }

  async function flush() {
    if (flushing) return;
    var q = loadQueue();
    if (!q.length) return;
    flushing = true;
    try {
      var base = apiBase();
      var url = (base || '') + ENDPOINT;
      var headers = { 'Content-Type': 'application/json' };
      try {
        if (global.APlus && APlus.auth && typeof APlus.auth.getIdToken === 'function') {
          var tok = await APlus.auth.getIdToken();
          if (tok) headers.Authorization = 'Bearer ' + tok;
        }
      } catch (_) {}
      try {
        var initData = global.Telegram && Telegram.WebApp && Telegram.WebApp.initData;
        if (initData) headers['X-Telegram-Init-Data'] = initData;
      } catch (_) {}

      var arm = null;
      try {
        if (global.APlus && APlus.apxHoldout && typeof APlus.apxHoldout.isHoldout === 'function') {
          arm = APlus.apxHoldout.isHoldout() ? 'holdout' : 'apx';
        }
      } catch (_) {}

      var res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({ events: q.slice(0, 50), arm: arm })
      });
      if (res && res.ok) {
        saveQueue(q.slice(50));
      }
    } catch (_) {
      // keep queue
    } finally {
      flushing = false;
    }
  }

  APlus.apxTelemetry = {
    onBlock: onBlock,
    flush: flush
  };
})(typeof window !== 'undefined' ? window : globalThis);
