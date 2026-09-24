/**
 * streak.js - Single facade for study-streak reads.
 * Authority: CompTIALedger soft streak (wallet.streak / streakFrozen).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var api = factory();
    root.APlus = root.APlus || {};
    root.APlus.streak = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var cache = null;
  var cacheAt = 0;
  var CACHE_MS = 1500;

  function ledger() {
    return (typeof window !== 'undefined' && window.CompTIALedger) || null;
  }

  function empty() {
    return { streak: 0, streakFrozen: false, lastQualifyingDay: null };
  }

  function fromWallet(w) {
    w = w || {};
    return {
      streak: Number(w.streak) || 0,
      streakFrozen: !!w.streakFrozen,
      lastQualifyingDay: w.lastQualifyingDay || null
    };
  }

  function getCached() {
    if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
    return null;
  }

  function setCache(v) {
    cache = v;
    cacheAt = Date.now();
    return v;
  }

  function invalidate() {
    cache = null;
    cacheAt = 0;
  }

  /**
   * Sync best-effort read. Prefer getAsync when possible.
   */
  function get() {
    var hit = getCached();
    if (hit) return hit;
    var L = ledger();
    if (!L) return empty();
    try {
      if (typeof L.getStreakSync === 'function') {
        return setCache(fromWallet(L.getStreakSync()));
      }
    } catch (_) {}
    return hit || empty();
  }

  function getAsync() {
    var L = ledger();
    if (!L || typeof L.getStreak !== 'function') {
      return Promise.resolve(empty());
    }
    return L.getStreak()
      .then(function (s) {
        return setCache(s || empty());
      })
      .catch(function () {
        return empty();
      });
  }

  function days() {
    var s = getCached();
    return s ? s.streak : 0;
  }

  return {
    VERSION: '1.0.0',
    get: get,
    getAsync: getAsync,
    days: days,
    invalidate: invalidate,
    empty: empty
  };
});
