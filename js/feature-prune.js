/**
 * feature-prune.js - Usage counters + optional hide of unused chrome.
 * Dark mode by default (log only). Hide when features-config.featurePrune.hideEnabled.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.featurePrune = api;
    if (typeof document !== 'undefined') {
      var boot = function () {
        api.wire();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else setTimeout(boot, 0);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var KEY = 'feature_usage_v1';
  var HIDE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

  function A() {
    return typeof window !== 'undefined' ? window.APlus || null : null;
  }
  function W() {
    return typeof window !== 'undefined' ? window : null;
  }
  function cfg() {
    try {
      return ((W() && W().APLUS_FEATURES_CONFIG) || {}).featurePrune || {};
    } catch (_) {
      return {};
    }
  }
  function read() {
    try {
      var a = A();
      if (a && a.storage) return a.storage.get(KEY, { counts: {}, firstSeen: {}, hidden: [] }) || { counts: {}, firstSeen: {}, hidden: [] };
    } catch (_) {}
    return { counts: {}, firstSeen: {}, hidden: [] };
  }
  function write(v) {
    try {
      var a = A();
      if (a && a.storage) a.storage.set(KEY, v);
    } catch (_) {}
  }

  function record(feature) {
    var f = String(feature || '').slice(0, 60);
    if (!f) return;
    var bag = read();
    bag.counts[f] = (bag.counts[f] || 0) + 1;
    if (!bag.firstSeen[f]) bag.firstSeen[f] = Date.now();
    write(bag);
  }

  function candidatesToHide() {
    var bag = read();
    var now = Date.now();
    var out = [];
    Object.keys(bag.firstSeen || {}).forEach(function (f) {
      var age = now - Number(bag.firstSeen[f] || 0);
      var count = bag.counts[f] || 0;
      if (age >= HIDE_AFTER_MS && count < 2 && (bag.hidden || []).indexOf(f) < 0) out.push(f);
    });
    return out;
  }

  function applyHide() {
    if (!cfg().hideEnabled) return [];
    var hide = candidatesToHide();
    var bag = read();
    hide.forEach(function (f) {
      if (bag.hidden.indexOf(f) < 0) bag.hidden.push(f);
      var el = document.querySelector('[data-feature="' + f + '"]');
      if (el) el.setAttribute('hidden', 'hidden');
    });
    write(bag);
    return hide;
  }

  function wire() {
    try {
      var cfg = ((W() && W().APLUS_FEATURES_CONFIG) || {}).featurePrune || {};
      if (cfg.enabled === false) return;
      var a = A();
      if (!a || !a.bus) return;
      a.bus.on('feature:opened', function (p) {
        record((p && p.feature) || 'unknown');
      });
      a.bus.on('shell:ready', function () {
        applyHide();
      });
    } catch (_) {}
  }

  return {
    version: '1.0.0',
    record: record,
    candidatesToHide: candidatesToHide,
    applyHide: applyHide,
    wire: wire,
    KEY: KEY
  };
});
