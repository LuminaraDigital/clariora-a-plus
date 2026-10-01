/**
 * telegram-buddy-client.js - Opt-in study buddy preferences (local).
 * Actual push digests require Worker cron + bot token (deferred ops).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.telegramBuddy = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var KEY = 'telegram_buddy_v1';

  function A() {
    return typeof window !== 'undefined' ? window.APlus || null : null;
  }
  function track(n, p) {
    try {
      var a = A();
      if (a && a.telemetry && a.telemetry.track) a.telemetry.track(n, p || {});
    } catch (_) {}
  }

  function read() {
    try {
      var a = A();
      if (a && a.storage) return a.storage.get(KEY, { optIn: false, quietHours: null }) || { optIn: false };
    } catch (_) {}
    return { optIn: false };
  }
  function write(v) {
    try {
      var a = A();
      if (a && a.storage) a.storage.set(KEY, v);
    } catch (_) {}
  }

  function enabled() {
    try {
      var cfg = (typeof window !== 'undefined' && window.APLUS_FEATURES_CONFIG) || {};
      if (cfg.telegramBuddy && cfg.telegramBuddy.enabled === false) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function setOptIn(on) {
    if (!enabled()) return read();
    var s = read();
    s.optIn = !!on;
    s.updatedAt = Date.now();
    write(s);
    track('telegram_buddy_opt_in', { on: !!on });
    return s;
  }

  function status() {
    return read();
  }

  /** Build the payload a future Worker digest would send. No network here. */
  function previewDigest() {
    var a = A();
    var pathDay = null;
    try {
      if (a && a.readinessPath && a.readinessPath.todayEntry) {
        var t = a.readinessPath.todayEntry();
        pathDay = t && t.focusDomains ? t.focusDomains[0] : null;
      }
    } catch (_) {}
    return {
      optIn: !!read().optIn,
      pathFocus: pathDay,
      note: 'Digest delivery requires Worker cron; preference is stored locally.'
    };
  }

  return {
    version: '1.0.0',
    KEY: KEY,
    enabled: enabled,
    setOptIn: setOptIn,
    status: status,
    previewDigest: previewDigest
  };
});
