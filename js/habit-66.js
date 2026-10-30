/**
 * habit-66.js - 66-day exam habit calendar over existing soft streak.
 * Does not replace ledger streak math.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.habit66 = api;
    if (typeof document !== 'undefined') {
      var boot = function () {
        api.mount();
        api.wire();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else setTimeout(boot, 0);
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var KEY = 'habit_66_v1';
  var HOST_ID = 'habit66Card';
  var TARGET = 66;

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
      if (cfg.habit66 && cfg.habit66.enabled === false) return false;
      return true;
    } catch (_) {
      return true;
    }
  }
  function read() {
    try {
      var a = A();
      if (a && a.storage) return a.storage.get(KEY, null);
    } catch (_) {}
    return null;
  }
  function write(v) {
    try {
      var a = A();
      if (a && a.storage) a.storage.set(KEY, v);
    } catch (_) {}
  }
  function dayIndexFromStart(startedAt) {
    var start = new Date(startedAt);
    start.setHours(12, 0, 0, 0);
    var now = new Date();
    now.setHours(12, 0, 0, 0);
    var diff = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(TARGET, diff + 1));
  }

  function ensureState() {
    var s = read();
    if (s && s.startedAt) {
      s.dayIndex = dayIndexFromStart(s.startedAt);
      if (!Array.isArray(s.completedDays)) s.completedDays = [];
      if (!Array.isArray(s.reflections)) s.reflections = [];
      write(s);
      return s;
    }
    s = {
      startedAt: Date.now(),
      dayIndex: 1,
      completedDays: [],
      missedDays: [],
      reflections: [],
      relapseRecoveries: 0,
      status: 'active'
    };
    write(s);
    track('habit66_started', { dayIndex: 1 });
    return s;
  }

  function markDayComplete() {
    var s = ensureState();
    var d = s.dayIndex;
    if (s.completedDays.indexOf(d) < 0) s.completedDays.push(d);
    if (d >= TARGET) s.status = 'graduated';
    write(s);
    return s;
  }

  function offerRelapseRecovery() {
    var s = ensureState();
    s.relapseRecoveries = (s.relapseRecoveries || 0) + 1;
    write(s);
    track('habit66_relapse_recovery', { count: s.relapseRecoveries });
    return {
      type: 'relapse',
      label: '10-min catch-up to reset your habit day',
      start: function () {
        var a = A();
        if (a && a.onboarding && a.onboarding.startToday) a.onboarding.startToday();
      }
    };
  }

  function reflectionDue(s) {
    var d = s.dayIndex;
    return d === 11 || d === 22 || d === 33 || d === 44 || d === 55;
  }

  function mount() {
    if (!enabled() || typeof document === 'undefined') return false;
    var existing = read();
    var host = document.getElementById(HOST_ID);
    if (!host) {
      var rail = document.querySelector('.home-rail');
      if (!rail) return false;
      host = document.createElement('section');
      host.id = HOST_ID;
      host.className = 'habit66-card';
      host.setAttribute('aria-label', '66-day exam habit');
      rail.appendChild(host);
    }
    if (!existing || !existing.startedAt) {
      host.innerHTML =
        '<div class="habit66-inner">' +
        '<span class="habit66-kicker">66-day exam habit</span>' +
        '<p class="habit66-day">Not started</p>' +
        '<p class="habit66-meta">Finish one practice set to begin the habit loop.</p>' +
        '</div>';
      return true;
    }
    var s = ensureState();
    var pct = Math.round((s.completedDays.length / TARGET) * 100);
    var milestone =
      s.dayIndex >= 66 ? 'Exam Ready' : s.dayIndex >= 30 ? 'Day 30 badge unlocked' : s.dayIndex >= 7 ? 'Day 7 badge unlocked' : 'Building the habit';
    var recovery =
      s._pendingRecovery
        ? '<button type="button" class="btn btn-primary" id="habit66RecoveryBtn">Do 10-min catch-up</button>'
        : '';
    host.innerHTML =
      '<div class="habit66-inner">' +
      '<span class="habit66-kicker">66-day exam habit</span>' +
      '<p class="habit66-day">Day ' +
      esc(String(s.dayIndex)) +
      ' of ' +
      TARGET +
      '</p>' +
      '<div class="habit66-bar"><div class="habit66-fill" style="width:' +
      pct +
      '%"></div></div>' +
      '<p class="habit66-meta">' +
      esc(milestone) +
      ' · ' +
      s.completedDays.length +
      ' days logged</p>' +
      (reflectionDue(s)
        ? '<p class="habit66-reflect">Reflection day: what is working in your study plan?</p>'
        : '') +
      recovery +
      '</div>';
    var recBtn = host.querySelector('#habit66RecoveryBtn');
    if (recBtn) {
      recBtn.addEventListener('click', function () {
        s._pendingRecovery = false;
        write(s);
        var win = offerRelapseRecovery();
        try {
          win.start();
        } catch (_) {}
        mount();
      });
    }
    return true;
  }

  function wire() {
    try {
      var a = A();
      if (!a || !a.bus) return;
      a.bus.on('exam:finished', function () {
        ensureState();
        markDayComplete();
        mount();
      });
      a.bus.on('streak:soft_freeze', function () {
        var s = read() || ensureState();
        s._pendingRecovery = true;
        write(s);
        mount();
      });
    } catch (_) {}
  }

  return {
    version: '1.0.0',
    TARGET: TARGET,
    ensureState: ensureState,
    markDayComplete: markDayComplete,
    offerRelapseRecovery: offerRelapseRecovery,
    mount: mount,
    wire: wire,
    KEY: KEY
  };
});
