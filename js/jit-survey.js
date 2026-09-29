/**
 * jit-survey.js - One-question just-in-time feedback at friction points.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.jitSurvey = api;
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

  var REASONS_KEY = 'friction_reasons_v1';
  var SESSION_SHOWN = false;

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
  function track(n, p) {
    try {
      var a = A();
      if (a && a.telemetry && a.telemetry.track) a.telemetry.track(n, p || {});
    } catch (_) {}
  }
  function enabled() {
    try {
      var cfg = (W() && W().APLUS_FEATURES_CONFIG) || {};
      if (cfg.jitSurvey && cfg.jitSurvey.enabled === false) return false;
      return true;
    } catch (_) {
      return true;
    }
  }

  function saveReason(surface, reason) {
    try {
      var a = A();
      if (!a || !a.storage) return;
      var bag = a.storage.get(REASONS_KEY, { events: [] }) || { events: [] };
      if (!Array.isArray(bag.events)) bag.events = [];
      bag.events.unshift({ at: Date.now(), surface: surface, reason: reason });
      bag.events = bag.events.slice(0, 40);
      a.storage.set(REASONS_KEY, bag);
      if (reason === 'hard' && a.readinessPath && typeof a.readinessPath.ensurePath === 'function') {
        a.readinessPath.ensurePath(true);
        if (a.readinessPath.render) a.readinessPath.render();
      }
    } catch (_) {}
  }

  function ensureHost() {
    var el = document.getElementById('jitSurveyToast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'jitSurveyToast';
    el.className = 'jit-survey-toast';
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function prompt(surface) {
    if (!enabled() || SESSION_SHOWN || typeof document === 'undefined') return false;
    SESSION_SHOWN = true;
    var host = ensureHost();
    host.hidden = false;
    host.innerHTML =
      '<div class="jit-survey-inner" role="dialog" aria-label="Quick feedback">' +
      '<p class="jit-survey-q">What stopped you?</p>' +
      '<div class="jit-survey-chips">' +
      '<button type="button" data-reason="time">Time</button>' +
      '<button type="button" data-reason="hard">Too hard</button>' +
      '<button type="button" data-reason="unclear">Unclear</button>' +
      '<button type="button" data-reason="other">Other</button>' +
      '</div>' +
      '<button type="button" class="jit-survey-skip" id="jitSurveySkip">Skip</button>' +
      '</div>';
    track('jit_survey_shown', { surface: String(surface || '').slice(0, 40) });
    host.querySelectorAll('[data-reason]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var reason = btn.getAttribute('data-reason') || 'other';
        saveReason(surface, reason);
        track('jit_survey_answered', { reason: reason, surface: String(surface || '').slice(0, 40) });
        host.hidden = true;
      });
    });
    var skip = host.querySelector('#jitSurveySkip');
    if (skip) {
      skip.addEventListener('click', function () {
        host.hidden = true;
      });
    }
    return true;
  }

  function wire() {
    try {
      var a = A();
      if (!a || !a.bus) return;
      a.bus.on('funnel:abandon', function (p) {
        prompt((p && p.funnel) || 'funnel');
      });
      a.bus.on('pbq:abandoned', function () {
        prompt('pbq');
      });
    } catch (_) {}
  }

  return {
    version: '1.0.0',
    prompt: prompt,
    saveReason: saveReason,
    wire: wire,
    REASONS_KEY: REASONS_KEY
  };
});
