/**
 * social-proof.js - Contextual peer proof. Hides when no real cohort data.
 * Never invents percentages.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.socialProof = api;
    if (typeof document !== 'undefined') {
      var boot = function () {
        api.mount();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else setTimeout(boot, 0);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var HOST_ID = 'socialProofCard';
  var MIN_N = 25;

  function A() {
    return typeof window !== 'undefined' ? window.APlus || null : null;
  }
  function W() {
    return typeof window !== 'undefined' ? window : null;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function enabled() {
    try {
      var cfg = (W() && W().APLUS_FEATURES_CONFIG) || {};
      if (cfg.socialProof && cfg.socialProof.enabled === false) return false;
      return true;
    } catch (_) {
      return true;
    }
  }

  /** Fetch cohort card only if endpoint returns real n >= MIN_N. */
  function fetchCohort() {
    return Promise.resolve(null).then(function () {
      try {
        var cfg = (W() && W().APLUS_FEATURES_CONFIG) || {};
        var url = cfg.socialProof && cfg.socialProof.endpoint;
        if (!url || typeof fetch !== 'function') return null;
        return fetch(url, { credentials: 'omit' })
          .then(function (r) {
            if (!r.ok) return null;
            return r.json();
          })
          .then(function (data) {
            if (!data || typeof data.n !== 'number' || data.n < MIN_N) return null;
            if (typeof data.daysToPass !== 'number') return null;
            return data;
          })
          .catch(function () {
            return null;
          });
      } catch (_) {
        return null;
      }
    });
  }

  function mount() {
    if (!enabled() || typeof document === 'undefined') return Promise.resolve(false);
    return fetchCohort().then(function (data) {
      var host = document.getElementById(HOST_ID);
      if (!data) {
        if (host) host.hidden = true;
        return false;
      }
      if (!host) {
        var rail = document.querySelector('.home-rail');
        if (!rail) return false;
        host = document.createElement('section');
        host.id = HOST_ID;
        host.className = 'social-proof-card';
        rail.appendChild(host);
      }
      host.hidden = false;
      host.innerHTML =
        '<div class="social-proof-inner">' +
        '<span class="social-proof-kicker">People like you</span>' +
        '<p class="social-proof-body">' +
        'Learners near your diagnostic band who studied regularly typically reached exam-ready in about ' +
        esc(String(Math.round(data.daysToPass))) +
        ' days (n=' +
        esc(String(data.n)) +
        ').</p></div>';
      return true;
    });
  }

  return {
    version: '1.0.0',
    MIN_N: MIN_N,
    fetchCohort: fetchCohort,
    mount: mount
  };
});
