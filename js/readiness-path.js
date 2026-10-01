/**
 * readiness-path.js - 7-day adaptive Readiness Path from objective_stats.
 *
 * Ranks weak domains, builds a day-by-day focus plan, mounts a home strip,
 * and tells the learner when their path changed (close-the-loop messaging).
 *
 * Plain script, IIFE, file:// compatible. Attaches APlus.readinessPath.
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
    w.APlus.readinessPath = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          api.boot();
        });
      } else {
        setTimeout(function () {
          api.boot();
        }, 0);
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'readiness_path_v1';
  var HOST_ID = 'readinessPathStrip';
  var PATH_DAYS = 7;
  var MINUTES_DEFAULT = 25;
  var ITEM_RECOMPUTE_EVERY = 10;
  var itemsSinceReorder = 0;

  var FALLBACK_BLUEPRINTS = {
    core1: [
      { prefix: '1.0', name: '1.0 Mobile Devices', weight: 13 },
      { prefix: '2.0', name: '2.0 Networking', weight: 23 },
      { prefix: '3.0', name: '3.0 Hardware', weight: 25 },
      { prefix: '4.0', name: '4.0 Virtualization and Cloud Computing', weight: 11 },
      { prefix: '5.0', name: '5.0 Hardware and Network Troubleshooting', weight: 28 }
    ],
    core2: [
      { prefix: '1.0', name: '1.0 Operating Systems', weight: 28 },
      { prefix: '2.0', name: '2.0 Security', weight: 28 },
      { prefix: '3.0', name: '3.0 Software Troubleshooting', weight: 23 },
      { prefix: '4.0', name: '4.0 Operational Procedures', weight: 21 }
    ]
  };

  function A() {
    return typeof window !== 'undefined' ? window.APlus || null : null;
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

  function readStorage(key, fallback) {
    try {
      var ap = A();
      if (ap && ap.storage && typeof ap.storage.get === 'function') {
        return ap.storage.get(key, fallback);
      }
    } catch (_) {}
    return fallback;
  }

  function writeStorage(key, value) {
    try {
      var ap = A();
      if (ap && ap.storage && typeof ap.storage.set === 'function') {
        ap.storage.set(key, value);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function normExam(v) {
    var t = String(v || '').toLowerCase();
    if (t.indexOf('core2') >= 0 || t === 'c2' || t.indexOf('1202') >= 0) return 'core2';
    if (t.indexOf('both') >= 0 || t.indexOf('mixed') >= 0) return 'both';
    return 'core1';
  }

  function blueprintsFor(exam) {
    var ap = A();
    var bp =
      (ap && ap.readiness2 && ap.readiness2.BLUEPRINTS) ||
      (ap && ap._readinessShared && ap._readinessShared.BLUEPRINTS) ||
      FALLBACK_BLUEPRINTS;
    var e = normExam(exam);
    if (e === 'both') {
      return (bp.core1 || []).concat(bp.core2 || []);
    }
    return (bp[e] || bp.core1 || []).slice();
  }

  function profileExam() {
    var onboarding = readStorage('onboarding', null);
    if (onboarding && onboarding.exam) return normExam(onboarding.exam);
    return 'core1';
  }

  function domainAccuracyFromStats(stats, domainName) {
    var correct = 0;
    var total = 0;
    Object.keys(stats || {}).forEach(function (key) {
      var s = stats[key];
      if (!s) return;
      if (String(s.domain || '').toLowerCase() !== String(domainName || '').toLowerCase()) return;
      correct += Number(s.rawCorrect) || 0;
      total += Number(s.rawTotal) || 0;
    });
    if (total < 1) return { accuracy: 0.45, total: 0, correct: 0 };
    return { accuracy: correct / total, total: total, correct: correct };
  }

  function rankDomains(exam, stats) {
    var domains = blueprintsFor(exam);
    var ranked = domains.map(function (d) {
      var acc = domainAccuracyFromStats(stats, d.name);
      var weakness = (1 - acc.accuracy) * (Number(d.weight) || 1);
      if (acc.total < 3) weakness += 0.15 * (Number(d.weight) || 1);
      return {
        name: d.name,
        prefix: d.prefix,
        weight: d.weight,
        accuracy: acc.accuracy,
        attempts: acc.total,
        weakness: weakness
      };
    });
    ranked.sort(function (a, b) {
      if (b.weakness !== a.weakness) return b.weakness - a.weakness;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return String(a.name).localeCompare(String(b.name));
    });
    return ranked;
  }

  function dayKey(offset) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (offset || 0));
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function buildPath(opts) {
    opts = opts || {};
    var exam = normExam(opts.exam || profileExam());
    var stats = opts.stats || readStorage('objective_stats', {}) || {};
    var minutes = Number(opts.minutes) || MINUTES_DEFAULT;
    var ranked = rankDomains(exam, stats);
    if (!ranked.length) {
      ranked = [{ name: 'Core foundations', prefix: '0', weight: 1, accuracy: 0.5, attempts: 0, weakness: 1 }];
    }

    var days = [];
    for (var i = 0; i < PATH_DAYS; i++) {
      var primary = ranked[i % ranked.length];
      var secondary = ranked[(i + 1) % ranked.length];
      var focus = [primary.name];
      if (secondary && secondary.name !== primary.name && i % 2 === 1) {
        focus.push(secondary.name);
      }
      var pct = Math.round((primary.accuracy || 0) * 100);
      days.push({
        day: i + 1,
        dateKey: dayKey(i),
        focusDomains: focus,
        tinyWin: {
          type: 'domain_drill',
          id: String(primary.prefix || primary.name).slice(0, 40),
          label: 'Drill ' + shortDomain(primary.name) + ' (' + pct + '%)'
        },
        minutes: minutes
      });
    }

    return {
      version: 1,
      exam: exam,
      generatedAt: Date.now(),
      days: days,
      ranked: ranked.slice(0, 5).map(function (r) {
        return { name: r.name, accuracy: Math.round(r.accuracy * 100), weakness: Math.round(r.weakness * 10) / 10 };
      }),
      mutations: []
    };
  }

  function shortDomain(name) {
    var s = String(name || '');
    var parts = s.split(' ');
    if (parts.length > 1 && /^\d+\.0$/.test(parts[0])) {
      return parts.slice(1).join(' ') || s;
    }
    return s;
  }

  function signatures(path) {
    if (!path || !Array.isArray(path.days)) return '';
    return path.days
      .map(function (d) {
        return (d.focusDomains || []).join('|');
      })
      .join(';');
  }

  function ensurePath(force) {
    var existing = readStorage(STORAGE_KEY, null);
    var now = Date.now();
    var stale =
      !existing ||
      !existing.days ||
      existing.days.length < PATH_DAYS ||
      !existing.generatedAt ||
      now - Number(existing.generatedAt) > 12 * 60 * 60 * 1000;

    if (!force && !stale) return existing;

    var next = buildPath({ exam: (existing && existing.exam) || profileExam() });
    var prevSig = signatures(existing);
    var nextSig = signatures(next);
    var reason = !existing ? 'bootstrap' : force ? 'manual_refresh' : 'stale_or_stats';

    if (prevSig && prevSig !== nextSig) {
      var fromDomain =
        existing.days && existing.days[0] && existing.days[0].focusDomains
          ? String(existing.days[0].focusDomains[0] || '').slice(0, 80)
          : '';
      var toDomain =
        next.days[0] && next.days[0].focusDomains
          ? String(next.days[0].focusDomains[0] || '').slice(0, 80)
          : '';
      next.mutations = [
        {
          at: now,
          reason: reason,
          detail: 'Day 1 focus moved toward weaker domains'
        }
      ].concat((existing.mutations || []).slice(0, 9));
      track('path_reordered', {
        reason: String(reason).slice(0, 40),
        fromDomain: fromDomain,
        toDomain: toDomain
      });
      showLoopClosed(fromDomain, toDomain);
    } else if (!existing) {
      track('path_reordered', { reason: 'bootstrap', fromDomain: '', toDomain: (next.days[0].focusDomains[0] || '').slice(0, 80) });
    }

    writeStorage(STORAGE_KEY, next);
    return next;
  }

  function showLoopClosed(fromDomain, toDomain) {
    var host = typeof document !== 'undefined' ? document.getElementById(HOST_ID) : null;
    var msg =
      'Because your weak domains shifted, we reordered your path' +
      (toDomain ? ': Day 1 now focuses on ' + toDomain : '') +
      '.';
    track('loop_closed_shown', {
      mutation: 'path_reordered',
      fromDomain: String(fromDomain || '').slice(0, 80),
      toDomain: String(toDomain || '').slice(0, 80)
    });
    if (!host) return;
    var note = host.querySelector('.path-loop-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'path-loop-note';
      host.appendChild(note);
    }
    note.textContent = msg;
  }

  function todayEntry(path) {
    path = path || ensurePath(false);
    var today = dayKey(0);
    var days = (path && path.days) || [];
    for (var i = 0; i < days.length; i++) {
      if (days[i].dateKey === today) return days[i];
    }
    return days[0] || null;
  }

  function render(path) {
    var host = typeof document !== 'undefined' ? document.getElementById(HOST_ID) : null;
    if (!host) return false;
    path = path || ensurePath(false);
    var today = todayEntry(path);
    var focus = (today && today.focusDomains) || [];
    var chips = focus
      .map(function (d) {
        return '<span class="path-chip">' + esc(shortDomain(d)) + '</span>';
      })
      .join('');
    var dayNum = today ? today.day : 1;
    host.innerHTML =
      '<div class="path-strip-inner">' +
      '<span class="path-kicker">Your 7-day readiness path</span>' +
      '<p class="path-today-label">Day ' +
      esc(String(dayNum)) +
      ' focus</p>' +
      '<div class="path-chips">' +
      (chips || '<span class="path-chip">Start diagnostic to personalize</span>') +
      '</div>' +
      '<ol class="path-week" aria-label="Week plan">' +
      (path.days || [])
        .map(function (d) {
          var active = today && d.day === today.day ? ' is-active' : '';
          var label = shortDomain((d.focusDomains && d.focusDomains[0]) || 'Practice');
          return (
            '<li class="path-day' +
            active +
            '"><span class="path-day-n">D' +
            esc(String(d.day)) +
            '</span><span class="path-day-f">' +
            esc(label) +
            '</span></li>'
          );
        })
        .join('') +
      '</ol>' +
      '</div>';
    return true;
  }

  function onExamFinished() {
    ensurePath(true);
    render();
    try {
      var ap = A();
      if (ap && ap.tinyWin && typeof ap.tinyWin.refresh === 'function') ap.tinyWin.refresh();
    } catch (_) {}
  }

  function onItemAnswered() {
    itemsSinceReorder += 1;
    if (itemsSinceReorder < ITEM_RECOMPUTE_EVERY) return;
    itemsSinceReorder = 0;
    ensurePath(true);
    render();
    try {
      var ap = A();
      if (ap && ap.tinyWin && typeof ap.tinyWin.refresh === 'function') ap.tinyWin.refresh();
    } catch (_) {}
  }

  function boot() {
    var existing = readStorage(STORAGE_KEY, null);
    if (existing && existing.days && existing.days[0] && existing.days[0].dateKey !== dayKey(0)) {
      ensurePath(true);
    } else {
      ensurePath(false);
    }
    render();
    try {
      var ap = A();
      if (ap && ap.bus && typeof ap.bus.on === 'function') {
        ap.bus.on('exam:finished', onExamFinished);
        ap.bus.on('item:answered', onItemAnswered);
        ap.bus.on('onboarding:diagnostic_completed', function () {
          ensurePath(true);
          render();
        });
      }
    } catch (_) {}
  }

  return {
    version: '1.0.0',
    STORAGE_KEY: STORAGE_KEY,
    buildPath: buildPath,
    rankDomains: rankDomains,
    ensurePath: ensurePath,
    todayEntry: todayEntry,
    render: render,
    boot: boot,
    dayKey: dayKey
  };
});
