/**
 * APX UI holdout: ~10% of accounts never see chip / goal / store / coin shower.
 * Assignment is sticky per account id (or anonymous device id).
 */
(function (global) {
  'use strict';
  var APlus = (global.APlus = global.APlus || {});
  var KEY = 'apx_holdout_v1';
  var RATE = 0.1;

  function hash32(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function accountKey() {
    try {
      if (global.APlus && APlus.auth && APlus.auth.currentUser && APlus.auth.currentUser.uid) {
        return 'uid:' + APlus.auth.currentUser.uid;
      }
    } catch (_) {}
    try {
      var tg = global.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
      if (tg && tg.id) return 'tg:' + tg.id;
    } catch (_) {}
    try {
      var id = localStorage.getItem('aplus3_sync_device_id') || localStorage.getItem('sync_device_id');
      if (id) return 'dev:' + id;
    } catch (_) {}
    return 'anon:local';
  }

  function isHoldout() {
    try {
      var stored = localStorage.getItem(KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.key === accountKey() && typeof parsed.holdout === 'boolean') {
          return parsed.holdout;
        }
      }
    } catch (_) {}
    var key = accountKey();
    var holdout = (hash32(key) % 1000) / 1000 < RATE;
    try {
      localStorage.setItem(KEY, JSON.stringify({ key: key, holdout: holdout, at: Date.now() }));
    } catch (_) {}
    return holdout;
  }

  function applyHoldoutDom() {
    if (!isHoldout()) return false;
    try {
      document.documentElement.setAttribute('data-apx-holdout', '1');
      var hide = [
        'apxHeaderChip',
        'l2eGoalCard',
        'ledgerStoreBtn',
        'openLedgerBtn',
        'rewardCenterModal',
        'apxDegreeBadge',
        'apxReadinessNeighbor'
      ];
      hide.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    } catch (_) {}
    return true;
  }

  APlus.apxHoldout = {
    isHoldout: isHoldout,
    apply: applyHoldoutDom,
    RATE: RATE
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHoldoutDom);
    } else {
      try { applyHoldoutDom(); } catch (_) {}
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
