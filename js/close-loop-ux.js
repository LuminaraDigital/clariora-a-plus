/**
 * close-loop-ux.js - After exam/raid finish: what happened, why it matters, one CTA.
 * Feature flag: APLUS_FEATURES_CONFIG.closeLoopUx.enabled (default true).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.closeLoopUx = api;
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

  var HOST_ID = 'closeLoopPanel';
  var lastPayload = null;

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
      var c = cfg.closeLoopUx || {};
      if (c.enabled === false) return false;
      return true;
    } catch (_) {
      return true;
    }
  }

  function ensureHost() {
    var el = document.getElementById(HOST_ID);
    if (el) return el;
    var rail = document.querySelector('.home-rail') || document.getElementById('homeViewPractice');
    if (!rail) return null;
    el = document.createElement('section');
    el.id = HOST_ID;
    el.className = 'close-loop-panel';
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    var anchor = document.getElementById('tinyWinCard');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else rail.appendChild(el);
    return el;
  }

  function buildMessage(payload) {
    payload = payload || {};
    var score = Number(payload.scaledScore);
    var total = Number(payload.totalQuestions != null ? payload.totalQuestions : payload.total) || 0;
    var raw = Number(payload.rawCorrect) || 0;
    var exam = String(payload.examType || 'core1');
    var weak = '';
    try {
      var a = A();
      if (a && a.storage) {
        var plan = a.storage.get('adaptive_plan', null);
        if (plan && plan.weakDomains && plan.weakDomains[0]) weak = String(plan.weakDomains[0]);
      }
    } catch (_) {}
    var happened =
      isFinite(score) && score > 0
        ? 'You scored ' + Math.round(score) + ' on this ' + exam + ' set (' + raw + '/' + total + ').'
        : 'Practice set finished (' + raw + '/' + total + ' correct).';
    var why = weak
      ? 'Your next readiness gain is in ' + weak + '.'
      : 'Closing weak domains moves your predicted score faster than random practice.';
    var cta = weak ? 'Run a weak-area raid' : "Start today's plan";
    return { happened: happened, why: why, cta: cta, weak: weak };
  }

  function show(payload) {
    if (!enabled() || typeof document === 'undefined') return false;
    var host = ensureHost();
    if (!host) return false;
    lastPayload = payload || {};
    var msg = buildMessage(payload);
    host.hidden = false;
    host.innerHTML =
      '<div class="close-loop-inner">' +
      '<span class="close-loop-kicker">Close the loop</span>' +
      '<p class="close-loop-happened">' +
      esc(msg.happened) +
      '</p>' +
      '<p class="close-loop-why">' +
      esc(msg.why) +
      '</p>' +
      '<button type="button" class="btn btn-primary" id="closeLoopCta">' +
      esc(msg.cta) +
      '</button>' +
      '<button type="button" class="btn btn-secondary close-loop-dismiss" id="closeLoopDismiss">Dismiss</button>' +
      '</div>';
    track('loop_shown', { examType: String(payload.examType || '').slice(0, 20) });
    var cta = host.querySelector('#closeLoopCta');
    if (cta) {
      cta.addEventListener('click', function () {
        track('loop_action_taken', { cta: msg.weak ? 'raid' : 'today' });
        try {
          if (msg.weak && W() && typeof W().startWeakObjectiveRaid === 'function') {
            W().startWeakObjectiveRaid({});
          } else if (A() && A().onboarding && A().onboarding.startToday) {
            A().onboarding.startToday();
          }
        } catch (_) {}
        track('loop_completed', { ok: true });
        host.hidden = true;
      });
    }
    var dismiss = host.querySelector('#closeLoopDismiss');
    if (dismiss) {
      dismiss.addEventListener('click', function () {
        host.hidden = true;
      });
    }
    return true;
  }

  function wire() {
    try {
      var a = A();
      if (!a || !a.bus || typeof a.bus.on !== 'function') return;
      a.bus.on('exam:finished', function (payload) {
        show(payload || {});
      });
    } catch (_) {}
  }

  return {
    version: '1.0.0',
    enabled: enabled,
    show: show,
    buildMessage: buildMessage,
    wire: wire,
    _lastPayload: function () {
      return lastPayload;
    }
  };
});
