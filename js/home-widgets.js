/**
 * CompTIA A+ Master Exam Simulator
 * home-widgets.js - Picture-first home widgets: score ring, gap scale, sparkline,
 * activity strip, and the per-exam stats block injected into the mock exam cards.
 * File: js/home-widgets.js
 *
 * Plain script, IIFE, no ES modules, file:// compatible.
 * Browser: attaches window.APlus.homeWidgets
 * Node:    module.exports = { buildRingMarkup, buildGapScale, buildActivityStrip,
 *                             buildSparklinePoints, ... } for unit tests.
 *
 * Every dependency (APlus.bus, APlus.storage, CompTIAProfiles, CompTIAMemorySRS,
 * CompTIALedger) is optional and guarded. Nothing here throws at load.
 */

(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  var w = (typeof window === 'object' && window) ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.homeWidgets = api;
    api._boot(w);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */

  var RING_R = 52;
  var RING_C = 2 * Math.PI * RING_R;           // 326.7256...
  var SCORE_MIN = 100;
  var SCORE_MAX = 900;
  var SCORE_SPAN = SCORE_MAX - SCORE_MIN;      // 800, so pct = (score - 100) / 8
  var HISTORY_KEY = 'comptia_a_plus_history';
  var MISSED_KEY = 'comptia_a_plus_missed';
  var SPARK_W = 100;
  var SPARK_H = 40;
  var SPARK_MAX_POINTS = 8;

  /* ------------------------------------------------------------------ *
   * Pure helpers
   * ------------------------------------------------------------------ */

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function num(v) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function tnum(v) {
    return '<span class="tnum">' + esc(v) + '</span>';
  }

  /** Percentage position of a scaled score on the 100 to 900 scale. */
  function scorePct(score) {
    var n = num(score);
    if (n === null) return 0;
    return clamp((n - SCORE_MIN) / (SCORE_SPAN / 100), 0, 100);
  }

  function normExam(v) {
    var t = String(v || '').toLowerCase();
    if (t.indexOf('core2') >= 0 || t.indexOf('1202') >= 0 || t.indexOf('1102') >= 0 || t === 'c2') return 'core2';
    if (t.indexOf('both') >= 0 || t.indexOf('mixed') >= 0) return 'both';
    if (t.indexOf('core1') >= 0 || t.indexOf('1201') >= 0 || t.indexOf('1101') >= 0 || t === 'c1') return 'core1';
    return '';
  }

  function dayKey(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /* ------------------------------------------------------------------ *
   * Pure builders (unit tested in tools/test_home_widgets.js)
   * ------------------------------------------------------------------ */

  /**
   * buildRingMarkup(pct, opts)
   * pct: 0..100, or null for the cold-start "--" state.
   * Returns the .score-ring-wrap markup: an <svg class="score-ring"> with a
   * track circle and a progress circle, plus the sibling .score-ring-text.
   * The progress circle is painted at full offset (empty ring); the caller
   * flips it to data-offset on the next animation frame so it animates.
   *
   * opts.animate === false paints the real offset straight away. Repaints
   * (a theme toggle, a storage write, a screen change) must never open a
   * window where the ring reads empty while the caption says 41 percent, so
   * only the very first paint of a session animates.
   */
  function buildRingMarkup(pct, opts) {
    var o = opts || {};
    var cold = (pct === null || pct === undefined || isNaN(Number(pct)));
    var p = cold ? 0 : clamp(Number(pct), 0, 100);
    var offset = RING_C * (1 - p / 100);
    var value = cold ? '--' : (Math.round(p) + '%');
    var sub = cold ? (o.coldSub || 'no data yet') : (o.sub || 'readiness');
    var label = cold ? 'Readiness not measured yet' : ('Readiness ' + Math.round(p) + ' percent');

    var html = '<div class="score-ring-wrap"' + (cold ? ' data-state="cold"' : '') + '>';
    html += '<svg class="score-ring" viewBox="0 0 120 120" role="img" aria-label="' + esc(label) + '">';
    html += '<circle class="track" cx="60" cy="60" r="' + RING_R + '" fill="none" stroke="currentColor" stroke-width="9"/>';
    html += '<circle class="progress" cx="60" cy="60" r="' + RING_R + '" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"';
    var firstOffset = (o.animate === false) ? round1(offset) : round1(RING_C);
    html += ' stroke-dasharray="' + round1(RING_C) + '" stroke-dashoffset="' + firstOffset + '"';
    html += ' data-offset="' + round1(offset) + '"/>';
    html += '</svg>';
    html += '<div class="score-ring-text"><div class="value stat-display">' + (cold ? esc(value) : tnum(value)) +
      '</div><div class="sub label">' + esc(sub) + '</div></div>';
    html += '</div>';
    return html;
  }

  /**
   * buildGapScale(predicted, passMark)
   * Returns the .gap-scale markup. fill width and marker left are percentages on
   * the 100 to 900 scale: pct = (score - 100) / 8. The fill starts at 0% and
   * carries data-fill so the caller can animate it on the next frame.
   */
  function buildGapScale(predicted, passMark, opts) {
    var o = opts || {};
    var pred = num(predicted);
    var pass = num(passMark);
    if (pred === null || pass === null) return '';
    var predPct = round1(scorePct(pred));
    var passPct = round1(scorePct(pass));
    var label = 'Predicted ' + Math.round(pred) + ', pass mark ' + Math.round(pass);
    var firstWidth = (o.animate === false) ? predPct : 0;

    var band = o.band && num(o.band.low) !== null && num(o.band.high) !== null ? o.band : null;
    if (band) label += ', likely range ' + Math.round(band.low) + ' to ' + Math.round(band.high);
    var html = '<div class="gap-scale" role="img" aria-label="' + esc(label) + '">';
    html += '<div class="track">';
    if (band) {
      var lo = round1(scorePct(num(band.low)));
      var hi = round1(scorePct(num(band.high)));
      html += '<div class="band" style="left:' + lo + '%;width:' + round1(Math.max(0, hi - lo)) + '%"></div>';
    }
    html += '<div class="fill" style="width:' + firstWidth + '%" data-fill="' + predPct + '"></div></div>';
    html += '<div class="marker pass" style="left:' + passPct + '%"><span>Pass ' + tnum(Math.round(pass)) + '</span></div>';
    html += '<div class="marker you" style="left:' + predPct + '%"><span>You ' + tnum(Math.round(pred)) + '</span></div>';
    html += '</div>';
    return html;
  }

  /**
   * buildActivityStrip(days, opts)
   * days: array of 7 booleans, oldest first, the last entry being today.
   * Returns the .activity-strip markup. Each cell carries "on" or "off"; the
   * final cell also carries "today".
   */
  function buildActivityStrip(days, opts) {
    var o = opts || {};
    var list = Array.isArray(days) ? days.slice(-7) : [];
    while (list.length < 7) list.unshift(false);
    var labels = Array.isArray(o.labels) ? o.labels : null;

    var html = '<div class="activity-strip" aria-label="' + esc(o.ariaLabel || 'Last 7 days') + '">';
    for (var i = 0; i < list.length; i++) {
      var cls = 'day ' + (list[i] ? 'on' : 'off');
      if (i === list.length - 1) cls += ' today';
      var title = labels && labels[i] ? ' title="' + esc(labels[i]) + '"' : '';
      html += '<span class="' + cls + '"' + title + '></span>';
    }
    html += '</div>';
    return html;
  }

  /**
   * buildSparklinePoints(scores)
   * scores: array of scaled scores, oldest first. Returns the polyline "points"
   * string across a 100 x 40 viewBox, or '' when there are fewer than 2 scores.
   * The vertical range is the local min and max so small movements stay visible;
   * a flat run draws through the middle.
   */
  function buildSparklinePoints(scores) {
    var vals = (Array.isArray(scores) ? scores : [])
      .map(num)
      .filter(function (v) { return v !== null; })
      .slice(-SPARK_MAX_POINTS);
    if (vals.length < 2) return '';

    var lo = Math.min.apply(null, vals);
    var hi = Math.max.apply(null, vals);
    var pad = 3;
    var usable = SPARK_H - pad * 2;
    var step = SPARK_W / (vals.length - 1);

    return vals.map(function (v, i) {
      var x = round1(i * step);
      var y;
      if (hi === lo) {
        y = round1(SPARK_H / 2);
      } else {
        y = round1(pad + usable * (1 - (v - lo) / (hi - lo)));
      }
      return x + ',' + y;
    }).join(' ');
  }

  /**
   * buildSparkline(scores) - the full <svg class="sparkline"> or '' when hidden.
   */
  function buildSparkline(scores) {
    var pts = buildSparklinePoints(scores);
    if (!pts) return '';
    return '<svg class="sparkline" viewBox="0 0 ' + SPARK_W + ' ' + SPARK_H + '" preserveAspectRatio="none" role="img" ' +
      'aria-label="Recent scaled scores"><polyline points="' + pts + '" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /**
   * buildCardStats(summary)
   * summary: { last, attempts, best } - last and best are scaled scores.
   * Returns the .card-stats markup injected after .card-meta in a mock exam card.
   */
  function buildCardStats(summary, days, passRateText) {
    var s = summary || {};
    var attempts = Number(s.attempts) || 0;
    var html = '<div class="card-stats">';
    if (!attempts) {
      html += '<div class="last-score stat-display">--</div>';
      html += '<div class="stats-meta label">No attempts yet</div>';
    } else {
      html += '<div class="last-score stat-display">' + tnum(Math.round(s.last)) + '</div>';
      html += '<div class="stats-meta label">Last score, ' + tnum(attempts) + ' attempt' + (attempts === 1 ? '' : 's') +
        ', best ' + tnum(Math.round(s.best)) +
        (passRateText ? ', ' + esc(passRateText) : '') + '</div>';
    }
    html += buildActivityStrip(days || [], { ariaLabel: 'Last 7 days' });
    html += '</div>';
    return html;
  }

  /**
   * activityDays(timestamps, now) -> 7 booleans, oldest first, last = today.
   */
  function activityDays(timestamps, now) {
    var end = typeof now === 'number' ? now : Date.now();
    var seen = {};
    (timestamps || []).forEach(function (ts) {
      var t = num(ts);
      if (t === null) return;
      var k = dayKey(t);
      if (k) seen[k] = true;
    });
    var out = [];
    var base = new Date(end);
    base.setHours(12, 0, 0, 0);
    for (var i = 6; i >= 0; i--) {
      var d = new Date(base.getTime() - i * 86400000);
      out.push(Boolean(seen[dayKey(d.getTime())]));
    }
    return out;
  }

  /**
   * summarizeAttempts(attempts) -> { last, best, attempts, scores }
   * attempts must already be filtered to one exam and sorted oldest first.
   */
  function summarizeAttempts(attempts) {
    var list = (attempts || []).filter(function (a) { return a && num(a.scaledScore) !== null; });
    if (!list.length) return { last: null, best: null, attempts: 0, scores: [] };
    var scores = list.map(function (a) { return num(a.scaledScore); });
    return {
      last: scores[scores.length - 1],
      best: Math.max.apply(null, scores),
      attempts: scores.length,
      scores: scores
    };
  }

  /**
   * normalizeHistory(raw) -> [{ exam, scaledScore, passed, ts }] oldest first.
   * Accepts the stored shape (newest first, `date` as a locale string,
   * `status` of PASSED / FAILED) as well as the richer bus payload shape
   * (`timestamp`, `passed`).
   */
  function normalizeHistory(raw) {
    var list = raw;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (_) { list = []; }
    }
    if (!Array.isArray(list)) return [];

    var out = list.map(function (r, idx) {
      if (!r || typeof r !== 'object') return null;
      var score = num(r.scaledScore);
      if (score === null) return null;
      var ts = num(r.timestamp);
      if (ts === null) ts = num(r.ts);
      if (ts === null && r.date) {
        var parsed = Date.parse(r.date);
        if (!isNaN(parsed)) ts = parsed;
      }
      var passed = (typeof r.passed === 'boolean')
        ? r.passed
        : (String(r.status || '').toUpperCase() === 'PASSED');
      return {
        exam: normExam(r.examType || r.exam || r.type),
        scaledScore: score,
        passed: passed,
        ts: ts,
        _idx: idx
      };
    }).filter(Boolean);

    // Stored history is newest first. Sort ascending by timestamp when we have
    // one, otherwise fall back to reversing the stored order.
    out.sort(function (a, b) {
      if (a.ts !== null && b.ts !== null && a.ts !== b.ts) return a.ts - b.ts;
      if (a.ts !== null && b.ts === null) return 1;
      if (a.ts === null && b.ts !== null) return -1;
      return b._idx - a._idx;
    });
    out.forEach(function (r) { delete r._idx; });
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Environment-safe accessors
   * ------------------------------------------------------------------ */

  function W() { return (typeof window === 'object' && window) ? window : null; }
  function A() { var w = W(); return (w && w.APlus) || null; }

  function rawLocal(key) {
    var w = W();
    if (!w) return null;
    try {
      if (w.CompTIAProfiles && typeof w.CompTIAProfiles.scopedGet === 'function') {
        var v = w.CompTIAProfiles.scopedGet(key);
        if (v !== null && v !== undefined) return v;
      }
    } catch (err) {
      console.warn('[home-widgets] profile-scoped read failed for "' + key + '":', err);
    }
    try {
      if (w.localStorage) return w.localStorage.getItem(key);
    } catch (err) {
      console.warn('[home-widgets] localStorage read failed for "' + key + '":', err);
    }
    return null;
  }

  /**
   * canonicalToWidgetRows(rows) - APlus.learner.getHistory() shape (newest
   * first) mapped to the oldest-first { exam, scaledScore, passed, ts } shape
   * the widgets draw from.
   */
  function canonicalToWidgetRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(function (r) {
      return {
        exam: r.examType,
        scaledScore: r.scaledScore,
        passed: Boolean(r.passed),
        ts: r.timestamp === undefined ? null : r.timestamp
      };
    }).slice().reverse();
  }

  /**
   * readHistory() - the widgets never parse storage themselves. The one
   * canonical reader is APlus.learner.getHistory(); normalizeHistory below is
   * only the pure shape adapter used when that reader is not on the page
   * (unit tests, or a partial script load).
   */
  function readHistory() {
    var a = A();
    try {
      if (a && a.learner && typeof a.learner.getHistory === 'function') {
        return canonicalToWidgetRows(a.learner.getHistory());
      }
    } catch (err) {
      console.warn('[home-widgets] canonical history read failed:', err);
    }
    var raw = rawLocal(HISTORY_KEY);
    var list = normalizeHistory(raw);
    if (list.length) return list;
    try {
      if (a && a.storage && typeof a.storage.get === 'function') {
        return normalizeHistory(a.storage.get('history', []));
      }
    } catch (err) {
      console.warn('[home-widgets] history read failed:', err);
    }
    return [];
  }

  function readMissedCount() {
    var raw = rawLocal(MISSED_KEY);
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (_) { raw = null; }
    }
    if (Array.isArray(raw)) return raw.length;
    var a = A();
    try {
      if (a && a.storage && typeof a.storage.get === 'function') {
        var m = a.storage.get('missed', []);
        if (Array.isArray(m)) return m.length;
      }
    } catch (_) {}
    return 0;
  }

  function readFlashcardsDue() {
    var w = W();
    try {
      if (w && w.CompTIAMemorySRS && typeof w.CompTIAMemorySRS.getStats === 'function') {
        var st = w.CompTIAMemorySRS.getStats();
        var d = num(st && st.due);
        return d === null ? 0 : d;
      }
    } catch (err) {
      console.warn('[home-widgets] flashcard due lookup failed:', err);
    }
    return 0;
  }

  /** Local-day timestamps of today's completed session, if any. */
  function todaySessionTimestamps() {
    var a = A();
    try {
      if (!a || !a.storage || typeof a.storage.get !== 'function') return [];
      var s = a.storage.get('today_session', null);
      if (!s || !s.completedAt) return [];
      var t = Date.parse(s.completedAt);
      return isNaN(t) ? [] : [t];
    } catch (_) {
      return [];
    }
  }

  /** All local-day timestamps that count as study activity. */
  function activityTimestamps(history) {
    var list = (history || readHistory()).map(function (r) { return r.ts; })
      .filter(function (t) { return t !== null && t !== undefined; });
    return list.concat(todaySessionTimestamps());
  }

  function examSummary(history, exam) {
    var e = normExam(exam);
    var filtered = (history || []).filter(function (r) { return r.exam === e; });
    return summarizeAttempts(filtered);
  }

  /* ------------------------------------------------------------------ *
   * Mock exam card stats
   * ------------------------------------------------------------------ */

  function inferExamFromCard(card) {
    var explicit = normExam(card.getAttribute('data-exam'));
    if (explicit) return explicit;
    var titleEl = card.querySelector('.card-title');
    var text = (titleEl && titleEl.textContent) || card.textContent || '';
    var t = String(text).toLowerCase();
    if (t.indexOf('core 2') >= 0 || t.indexOf('core2') >= 0) return 'core2';
    if (t.indexOf('core 1') >= 0 || t.indexOf('core1') >= 0) return 'core1';
    return '';
  }

  /**
   * cardPassRateText(exam, canonicalHistory) - the exact string the results
   * analytics panel and the hero use, produced by the one shared formatter.
   */
  function cardPassRateText(exam, canonicalHistory) {
    var a = A();
    try {
      if (a && a.readiness2 && a.readiness2.format && typeof a.readiness2.compute === 'function') {
        var r = a.readiness2.compute({ exam: exam, history: canonicalHistory });
        if (!r.passRate || !r.passRate.attempts) return '';
        return a.readiness2.format.passRateText(r);
      }
    } catch (err) {
      console.warn('[home-widgets] pass rate lookup failed:', err);
    }
    return '';
  }

  /**
   * renderCards(canonicalHistory) - canonicalHistory is the newest-first array
   * from APlus.learner.getHistory(). The caller passes the very array it used
   * for the hero so the cards cannot disagree with it.
   */
  function renderCards(canonicalHistory) {
    var w = W();
    if (!w || !w.document) return 0;
    var cards = w.document.querySelectorAll('.mock-grid .card');
    if (!cards || !cards.length) return 0;

    var canon = Array.isArray(canonicalHistory) ? canonicalHistory : null;
    var history = canon ? canonicalToWidgetRows(canon) : readHistory();
    var count = 0;

    Array.prototype.forEach.call(cards, function (card) {
      var exam = inferExamFromCard(card);
      if (!exam) return;
      var meta = card.querySelector('.card-meta');
      if (!meta) return;

      var attempts = history.filter(function (r) { return r.exam === exam || r.exam === 'both'; });
      var summary = summarizeAttempts(attempts);
      var days = activityDays(attempts.map(function (r) { return r.ts; }));
      var html = buildCardStats(summary, days, cardPassRateText(exam, canon));

      var existing = card.querySelector('.card-stats');
      if (existing) {
        if (existing.outerHTML !== html) existing.outerHTML = html;
      } else {
        meta.insertAdjacentHTML('afterend', html);
      }
      count++;
    });

    return count;
  }

  /* ------------------------------------------------------------------ *
   * Quick link counts
   * ------------------------------------------------------------------ */

  var lastCounts = null;

  function renderCounts(force) {
    var w = W();
    var a = A();
    var counts = { missed: readMissedCount(), flashcardsDue: readFlashcardsDue() };

    if (w && w.document) {
      var missedEl = w.document.getElementById('missedCountText');
      if (missedEl) {
        var txt = counts.missed + ' saved';
        if (missedEl.textContent !== txt) missedEl.textContent = txt;
      }
      var retake = w.document.getElementById('retakeMissedBtn');
      if (retake) retake.disabled = (counts.missed === 0);
      var dueEl = w.document.getElementById('memoryDueCount');
      if (dueEl) {
        var dtxt = String(counts.flashcardsDue);
        if (dueEl.textContent !== dtxt) dueEl.textContent = dtxt;
      }
    }

    var changed = !lastCounts ||
      lastCounts.missed !== counts.missed ||
      lastCounts.flashcardsDue !== counts.flashcardsDue;
    lastCounts = counts;

    if ((changed || force) && a && a.bus && typeof a.bus.emit === 'function') {
      try { a.bus.emit('home:counts', counts); } catch (err) {
        console.warn('[home-widgets] home:counts emit failed:', err);
      }
    }
    return counts;
  }

  /* ------------------------------------------------------------------ *
   * Animation helper shared with readiness-ui
   * ------------------------------------------------------------------ */

  /**
   * animateIn(scope) - flips every [data-offset] ring and [data-fill] bar from
   * its first-paint value to the real one on the next animation frame, so the
   * transition the shell supplies actually runs. Safe to call repeatedly.
   */
  function animateIn(scope) {
    var w = W();
    if (!w || !w.document) return;
    var root = scope || w.document;
    var run = function () {
      try {
        Array.prototype.forEach.call(root.querySelectorAll('.score-ring .progress[data-offset]'), function (c) {
          c.setAttribute('stroke-dashoffset', c.getAttribute('data-offset'));
        });
        Array.prototype.forEach.call(root.querySelectorAll('.gap-scale .fill[data-fill]'), function (f) {
          f.style.width = f.getAttribute('data-fill') + '%';
        });
      } catch (err) {
        console.warn('[home-widgets] animateIn failed:', err);
      }
    };
    if (typeof w.requestAnimationFrame === 'function') {
      w.requestAnimationFrame(function () { w.requestAnimationFrame(run); });
    }
    // Backstop: a hidden or throttled tab may never service the frame callback,
    // and the widget must not be left showing an empty ring. Applying twice is
    // harmless because run() only writes the values it already computed.
    w.setTimeout(run, 120);
  }

  /* ------------------------------------------------------------------ *
   * Render + wiring
   * ------------------------------------------------------------------ */

  function render() {
    try {
      var w = W();
      if (!w || !w.document || !w.document.body) return;
      renderCards();
      renderCounts(false);
      animateIn();
    } catch (err) {
      console.warn('[home-widgets] render failed:', err);
    }
  }

  var scheduled = false;
  function refresh() {
    var w = W();
    if (!w || scheduled) return;
    scheduled = true;
    w.setTimeout(function () { scheduled = false; render(); }, 60);
  }

  var booted = false;
  function boot(w) {
    if (booted) return;
    booted = true;
    if (!w || !w.document) return;

    var a = w.APlus;
    if (a && a.bus && typeof a.bus.on === 'function') {
      a.bus.on('exam:finished', refresh);
      a.bus.on('storage:changed', refresh);
      a.bus.on('storage:removed', refresh);
      a.bus.on('shell:ready', refresh);
    } else {
      console.warn('[home-widgets] APlus.bus missing; rendering once only.');
    }

    if (a && typeof a.registerFeature === 'function') {
      try {
        a.registerFeature('homeWidgets', {
          version: '1.0.0',
          description: 'Home score ring, gap scale, activity strips and mock card stats',
          api: api
        });
      } catch (err) {
        console.warn('[home-widgets] registerFeature failed:', err);
      }
    }

    if (w.document.readyState === 'loading') {
      w.document.addEventListener('DOMContentLoaded', function () { render(); });
    } else {
      render();
    }
  }

  var api = {
    VERSION: '1.0.0',
    RING_R: RING_R,
    RING_C: RING_C,

    // pure builders
    buildRingMarkup: buildRingMarkup,
    buildGapScale: buildGapScale,
    buildActivityStrip: buildActivityStrip,
    buildSparklinePoints: buildSparklinePoints,
    buildSparkline: buildSparkline,
    buildCardStats: buildCardStats,
    scorePct: scorePct,
    normalizeHistory: normalizeHistory,
    summarizeAttempts: summarizeAttempts,
    activityDays: activityDays,
    tnum: tnum,
    esc: esc,

    // environment readers
    readHistory: readHistory,
    readMissedCount: readMissedCount,
    readFlashcardsDue: readFlashcardsDue,
    activityTimestamps: activityTimestamps,
    examSummary: examSummary,

    // rendering
    render: render,
    refresh: refresh,
    renderCards: renderCards,
    renderCounts: renderCounts,
    animateIn: animateIn,

    _boot: boot
  };

  return api;
});
