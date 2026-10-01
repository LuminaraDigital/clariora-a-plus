/**
 * tiny-win.js - One emotionally salient "next tiny win" CTA for Home.
 *
 * Priority: incomplete daily quest -> path day (when study data exists) ->
 * weakest objective -> diagnostic/today bootstrap.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.tinyWin = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          api.mount();
          api.wireCompletion();
        });
      } else {
        setTimeout(function () {
          api.mount();
          api.wireCompletion();
        }, 0);
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var HOST_ID = 'tinyWinCard';
  var pendingWin = null;
  var wired = false;

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

  function track(name, props) {
    try {
      var ap = A();
      if (ap && ap.telemetry && typeof ap.telemetry.track === 'function') {
        ap.telemetry.track(name, props || {});
      }
    } catch (_) {}
  }

  function startRaidOrToday() {
    var win = W();
    var ok = false;
    try {
      if (win && typeof win.startWeakObjectiveRaid === 'function') {
        ok = !!win.startWeakObjectiveRaid({});
      }
    } catch (_) {
      ok = false;
    }
    if (ok) return true;
    var a = A();
    if (a && a.onboarding && typeof a.onboarding.startToday === 'function') {
      a.onboarding.startToday();
      return true;
    }
    if (a && a.onboarding && typeof a.onboarding.start === 'function') {
      a.onboarding.start();
      return true;
    }
    return false;
  }

  function readObjectiveStats() {
    try {
      var ap = A();
      if (ap && ap.storage && typeof ap.storage.get === 'function') {
        return ap.storage.get('objective_stats', {}) || {};
      }
    } catch (_) {}
    return {};
  }

  function hasStudySignal() {
    var stats = readObjectiveStats();
    if (Object.keys(stats).length > 0) return true;
    try {
      var ap = A();
      if (ap && ap.storage) {
        var plan = ap.storage.get('adaptive_plan', null);
        if (plan && ((plan.missedIds && plan.missedIds.length) || (plan.weakDomains && plan.weakDomains.length))) {
          return true;
        }
        var onboarding = ap.storage.get('onboarding', null);
        if (onboarding && (onboarding.completedAt || onboarding.diagnostic)) return true;
      }
    } catch (_) {}
    return false;
  }

  function weakestObjective(stats) {
    var worst = null;
    Object.keys(stats || {}).forEach(function (key) {
      var s = stats[key];
      if (!s || !s.rawTotal || s.rawTotal < 3) return;
      var acc = s.rawTotal ? s.rawCorrect / s.rawTotal : 1;
      if (!worst || acc < worst.acc) {
        worst = {
          key: key,
          domain: s.domain || key,
          code: s.code || '',
          exam: s.exam || '',
          acc: acc,
          rawTotal: s.rawTotal
        };
      }
    });
    return worst;
  }

  function pathWin() {
    if (!hasStudySignal()) return null;
    try {
      var ap = A();
      if (!ap || !ap.readinessPath) return null;
      var path =
        typeof ap.readinessPath.ensurePath === 'function'
          ? ap.readinessPath.ensurePath(false)
          : null;
      var today =
        typeof ap.readinessPath.todayEntry === 'function'
          ? ap.readinessPath.todayEntry(path)
          : null;
      if (!today || !today.tinyWin) return null;
      var tw = today.tinyWin;
      var focus = (today.focusDomains && today.focusDomains[0]) || '';
      return {
        type: 'path_day',
        id: String(tw.id || focus || 'path').slice(0, 80),
        label: String(tw.label || ('Focus: ' + focus)),
        detail: 'Day ' + (today.day || 1) + ' on your readiness path.',
        start: function () {
          startRaidOrToday();
        }
      };
    } catch (_) {}
    return null;
  }

  function questWin() {
    try {
      var ap = A();
      if (!ap || !ap.dailyQuest || typeof ap.dailyQuest.getTodayStatus !== 'function') {
        return null;
      }
      if (typeof ap.dailyQuest.isEnabled === 'function' && !ap.dailyQuest.isEnabled()) {
        return null;
      }
      var status = ap.dailyQuest.getTodayStatus();
      if (!status || !status.enabled || status.allComplete) return null;
      var next = null;
      if (!status.legs.defend) next = 'defend';
      else if (!status.legs.attack) next = 'attack';
      else if (!status.legs.recover) next = 'recover';
      if (!next) return null;
      var labels = {
        defend: 'Defend: clear due review cards',
        attack: 'Attack: run a weak-area raid',
        recover: 'Recover: fix one missed objective'
      };
      return {
        type: 'quest_leg',
        id: next,
        label: labels[next] || ('Finish ' + next + ' leg'),
        detail: 'Keeps your daily habit alive (' + (status.progress || 0) + '/3).',
        start: function () {
          var a = A();
          if (a && a.dailyQuest && typeof a.dailyQuest.startPrimary === 'function') {
            a.dailyQuest.startPrimary({});
            return;
          }
          startRaidOrToday();
        }
      };
    } catch (_) {}
    return null;
  }

  function weakWin() {
    var weak = weakestObjective(readObjectiveStats());
    if (!weak) return null;
    var pct = Math.round(weak.acc * 100);
    return {
      type: 'weak_objective',
      id: weak.key,
      label: 'Raise ' + (weak.domain || weak.key) + ' (now ' + pct + '%)',
      detail: 'Focused practice on your weakest objective.',
      start: function () {
        startRaidOrToday();
      }
    };
  }

  function bootstrapWin() {
    return {
      type: 'diagnostic_or_today',
      id: 'bootstrap',
      label: 'Complete a short practice set',
      detail: 'One tiny session unlocks your personalized path.',
      start: function () {
        var a = A();
        if (a && a.onboarding && typeof a.onboarding.startToday === 'function') {
          a.onboarding.startToday();
          return;
        }
        if (a && a.onboarding && typeof a.onboarding.start === 'function') {
          a.onboarding.start();
        }
      }
    };
  }

  function chooseWin() {
    // Quest first (habit), then path, then weak, then bootstrap.
    return questWin() || pathWin() || weakWin() || bootstrapWin();
  }

  function render(host, win) {
    host.innerHTML =
      '<div class="tiny-win-inner">' +
      '<span class="tiny-win-kicker">Next tiny win</span>' +
      '<p class="tiny-win-label">' +
      esc(win.label) +
      '</p>' +
      '<p class="tiny-win-detail">' +
      esc(win.detail) +
      '</p>' +
      '<button type="button" class="btn btn-primary" id="tinyWinStartBtn">Do it now</button>' +
      '</div>';
    var btn = host.querySelector('#tinyWinStartBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        pendingWin = { type: win.type, id: String(win.id).slice(0, 80), at: Date.now() };
        track('tiny_win_started', pendingWin);
        try {
          win.start();
        } catch (_) {}
      });
    }
    track('tiny_win_shown', { type: win.type, id: String(win.id).slice(0, 80) });
  }

  function mount() {
    var host = typeof document !== 'undefined' ? document.getElementById(HOST_ID) : null;
    if (!host) return false;
    var win = chooseWin();
    render(host, win);
    return true;
  }

  function refresh() {
    return mount();
  }

  function wireCompletion() {
    if (wired) return;
    wired = true;
    try {
      var ap = A();
      if (!ap || !ap.bus || typeof ap.bus.on !== 'function') return;
      ap.bus.on('exam:finished', function () {
        if (pendingWin && Date.now() - pendingWin.at < 2 * 60 * 60 * 1000) {
          track('tiny_win_completed', {
            type: pendingWin.type,
            id: pendingWin.id
          });
          pendingWin = null;
        }
        refresh();
      });
      ap.bus.on('daily_quest:leg', function () {
        if (pendingWin && pendingWin.type === 'quest_leg') {
          track('tiny_win_completed', {
            type: pendingWin.type,
            id: pendingWin.id
          });
          pendingWin = null;
        }
        refresh();
      });
    } catch (_) {}
  }

  return {
    version: '1.2.0',
    chooseWin: chooseWin,
    mount: mount,
    refresh: refresh,
    wireCompletion: wireCompletion,
    startRaidOrToday: startRaidOrToday
  };
});
