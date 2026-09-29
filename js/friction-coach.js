/**
 * friction-coach.js - Auto "why you're stuck" for weak domains (cap 1/day).
 * Uses objective_stats domain accuracy; skillTags optional later.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.frictionCoach = api;
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

  var DAY_KEY = 'friction_coach_day';
  var HOST_ID = 'frictionCoachCard';
  var MIN_ATTEMPTS = 8;
  var MAX_ACC = 0.45;

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
      if (cfg.frictionCoach && cfg.frictionCoach.enabled === false) return false;
      return true;
    } catch (_) {
      return true;
    }
  }
  function dayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function alreadyShownToday() {
    try {
      var a = A();
      if (!a || !a.storage) return false;
      return a.storage.get(DAY_KEY, '') === dayKey();
    } catch (_) {
      return false;
    }
  }
  function markShown() {
    try {
      var a = A();
      if (a && a.storage) a.storage.set(DAY_KEY, dayKey());
    } catch (_) {}
  }

  function diagnose() {
    var a = A();
    var stats = {};
    try {
      if (a && a.storage) stats = a.storage.get('objective_stats', {}) || {};
    } catch (_) {}
    var byDomain = {};
    Object.keys(stats).forEach(function (k) {
      var s = stats[k];
      if (!s || !s.domain) return;
      var d = s.domain;
      if (!byDomain[d]) byDomain[d] = { correct: 0, total: 0, domain: d };
      byDomain[d].correct += Number(s.rawCorrect) || 0;
      byDomain[d].total += Number(s.rawTotal) || 0;
    });
    var worst = null;
    Object.keys(byDomain).forEach(function (d) {
      var row = byDomain[d];
      if (row.total < MIN_ATTEMPTS) return;
      var acc = row.correct / row.total;
      if (acc >= MAX_ACC) return;
      if (!worst || acc < worst.acc) worst = { domain: d, acc: acc, total: row.total };
    });
    return worst;
  }

  function primers(domain) {
    var d = String(domain || '').toLowerCase();
    if (d.indexOf('network') >= 0) {
      return 'Subnetting and ports trip most A+ candidates. Spend 30 seconds: CIDR slash size = how many host bits you have left.';
    }
    if (d.indexOf('hardware') >= 0) {
      return 'Hardware misses often come from connector vs protocol confusion. Match the physical port before the standard name.';
    }
    if (d.indexOf('security') >= 0) {
      return 'Security stems often hide the threat actor or the control layer. Name which layer is broken first.';
    }
    return 'You are missing this domain under pressure. Slow down on the first sentence of each stem before you pick.';
  }

  function ensureHost() {
    var el = document.getElementById(HOST_ID);
    if (el) return el;
    var rail = document.querySelector('.home-rail');
    if (!rail) return null;
    el = document.createElement('section');
    el.id = HOST_ID;
    el.className = 'friction-coach-card';
    el.hidden = true;
    var path = document.getElementById('readinessPathStrip');
    if (path && path.parentNode) path.parentNode.insertBefore(el, path.nextSibling);
    else rail.appendChild(el);
    return el;
  }

  function maybeShow() {
    if (!enabled() || alreadyShownToday()) return false;
    var hit = diagnose();
    if (!hit) return false;
    var host = ensureHost();
    if (!host) return false;
    var pct = Math.round(hit.acc * 100);
    host.hidden = false;
    host.innerHTML =
      '<div class="friction-coach-inner">' +
      '<span class="friction-coach-kicker">Why you are stuck</span>' +
      '<p class="friction-coach-label">' +
      esc(hit.domain) +
      ' at ' +
      pct +
      '% after ' +
      hit.total +
      ' answers</p>' +
      '<p class="friction-coach-primer">' +
      esc(primers(hit.domain)) +
      '</p>' +
      '<button type="button" class="btn btn-primary" id="frictionCoachCta">Drill this domain</button>' +
      '<button type="button" class="btn btn-secondary" id="frictionCoachDismiss">Not now</button>' +
      '</div>';
    markShown();
    track('friction_diagnosed', {
      domain: String(hit.domain).slice(0, 80),
      accuracy: pct,
      tag: 'domain'
    });
    var cta = host.querySelector('#frictionCoachCta');
    if (cta) {
      cta.addEventListener('click', function () {
        try {
          if (W() && typeof W().startWeakObjectiveRaid === 'function') W().startWeakObjectiveRaid({});
          else if (A() && A().onboarding && A().onboarding.startToday) A().onboarding.startToday();
        } catch (_) {}
        host.hidden = true;
      });
    }
    var dismiss = host.querySelector('#frictionCoachDismiss');
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
      if (!a || !a.bus) return;
      a.bus.on('exam:finished', function () {
        setTimeout(maybeShow, 400);
      });
      a.bus.on('shell:ready', function () {
        setTimeout(maybeShow, 800);
      });
    } catch (_) {}
  }

  return {
    version: '1.0.0',
    diagnose: diagnose,
    maybeShow: maybeShow,
    primers: primers,
    wire: wire
  };
});
