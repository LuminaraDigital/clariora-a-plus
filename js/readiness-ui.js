/**
 * CompTIA A+ Master Exam Simulator
 * readiness-ui.js - Renders the readiness hero and the "today's plan" card.
 * File: js/readiness-ui.js
 *
 * Plain script, IIFE, no ES modules, file:// compatible.
 * Attaches window.APlus.readinessUI.
 *
 * Mounts: #readinessHero and #todayPlanCard. If the shell has not provided them
 * they are created at the top of #startScreen by APlus.onboarding.ensureMount.
 * Re-renders on 'exam:finished' and 'storage:changed'. Never throws at load.
 *
 * Markup contract (styled by the shell):
 *   #readinessHero .hero-head > .label, .hero-days
 *   #readinessHero .hero-body > .score-ring-wrap > svg.score-ring (.track, .progress)
 *                                                 + .score-ring-text > .value.stat-display, .sub.label
 *                              > .gap-scale > .fill, .marker.pass, .marker.you
 *                              > .hero-meta > span
 *                              > svg.sparkline > polyline
 *   #todayPlanCard button.btn, .plan-focus > .label + ul > li, .activity-strip > .day
 */

(function (window) {
  'use strict';

  if (typeof window !== 'object' || !window) return;

  window.APlus = window.APlus || {};
  var APlus = window.APlus;

  function esc(s) {
    if (APlus.utils && typeof APlus.utils.escapeHTML === 'function') return APlus.utils.escapeHTML(s);
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function mount(id) {
    if (APlus.onboarding && typeof APlus.onboarding.ensureMount === 'function') {
      return APlus.onboarding.ensureMount(id);
    }
    return document.getElementById(id);
  }

  function injectStyles() {
    if (APlus.onboarding && typeof APlus.onboarding.injectStyles === 'function') {
      APlus.onboarding.injectStyles();
    }
  }

  /* ------------------------------------------------------------------ *
   * home-widgets bootstrap
   * ------------------------------------------------------------------ *
   * The shell adds <script src="js/home-widgets.js"> after this file. If that
   * tag is not there yet we inject it once so the home widgets still work; the
   * script's own boot re-renders when it lands.
   */

  var widgetInjectTried = false;

  function widgetScriptSrc() {
    try {
      var own = document.querySelector('script[src*="readiness-ui.js"]');
      if (own) {
        var src = own.getAttribute('src') || '';
        return src.replace(/readiness-ui\.js.*$/, 'home-widgets.js');
      }
    } catch (_) {}
    return 'js/home-widgets.js';
  }

  function widgets() {
    if (APlus.homeWidgets) return APlus.homeWidgets;
    if (widgetInjectTried) return null;
    widgetInjectTried = true;
    try {
      if (document.querySelector('script[src*="home-widgets.js"]')) return null;
      var s = document.createElement('script');
      s.src = widgetScriptSrc();
      s.async = false;
      s.onload = function () { render(); };
      s.onerror = function () { console.warn('[readiness-ui] home-widgets.js could not be loaded.'); };
      (document.head || document.documentElement).appendChild(s);
    } catch (err) {
      console.warn('[readiness-ui] home-widgets injection failed:', err);
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Data helpers
   * ------------------------------------------------------------------ */

  var cachedStreak = null;

  /**
   * Streak comes from the existing ledger if it is present. CompTIALedger.getState()
   * is async, so we cache the value and re-render once it lands. Fully optional.
   */
  function readStreak() {
    if (cachedStreak !== null) return cachedStreak;
    try {
      if (window.CompTIALedger && typeof window.CompTIALedger.getState === 'function') {
        var p = window.CompTIALedger.getState();
        if (p && typeof p.then === 'function') {
          p.then(function (st) {
            var v = st && st.wallet ? Number(st.wallet.streak) : 0;
            var next = isFinite(v) ? v : 0;
            if (next !== cachedStreak) {
              cachedStreak = next;
              render();
            }
          }).catch(function () { cachedStreak = 0; });
          return null;
        }
        if (p && p.wallet) {
          cachedStreak = Number(p.wallet.streak) || 0;
          return cachedStreak;
        }
      }
    } catch (err) {
      console.warn('[readiness-ui] streak read failed:', err);
    }
    return null;
  }

  function daysUntil(isoDate) {
    if (!isoDate) return null;
    try {
      var target = new Date(String(isoDate) + 'T12:00:00');
      if (isNaN(target.getTime())) return null;
      var now = new Date();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      return Math.round((target.getTime() - today.getTime()) / 86400000);
    } catch (_) {
      return null;
    }
  }

  function daysLine(days) {
    if (days === null) return '';
    if (days > 1) return days + ' days to exam';
    if (days === 1) return '1 day to exam';
    if (days === 0) return 'Exam is today';
    return 'Exam date has passed';
  }

  function focusLine(weakest) {
    var parts = (weakest || []).slice(0, 2).map(function (w) {
      var title = w.title || w.domain || '';
      return title ? (w.code + ' ' + title) : w.code;
    }).filter(Boolean);
    if (!parts.length) return 'Focus: a blueprint-weighted mix across every domain.';
    return 'Focus: ' + parts.join(', ');
  }

  function focusItems(weakest) {
    return (weakest || []).slice(0, 3).map(function (w) {
      var title = w.title || w.domain || '';
      return title ? (w.code + ' ' + title) : String(w.code || '');
    }).filter(Boolean);
  }

  /* ------------------------------------------------------------------ *
   * Hero
   * ------------------------------------------------------------------ */

  function renderHero(result, sum, history, profile, hw) {
    var el = mount('readinessHero');
    if (!el) return;

    // Canonical history is newest first; the sparkline reads oldest first.
    var scores = history.map(function (r) { return r.scaledScore; }).slice().reverse();
    var cold = !sum.hasData;

    var days = daysUntil(profile && profile.testDate);
    var dl = daysLine(days);

    // Only the first paint of a session animates from empty. Every repaint
    // lands on the real value immediately, so a theme toggle or a storage
    // write can never leave the arc reading 0 next to a 41 percent caption.
    var animate = !firstPaintDone;
    firstPaintDone = true;

    var html = '<div class="hero-head"><span class="label">Readiness</span>';
    if (dl) html += '<span class="hero-days">' + esc(dl) + '</span>';
    html += '</div>';

    html += '<div class="hero-body">';
    html += hw.buildRingMarkup(cold ? null : sum.readiness, {
      sub: 'readiness',
      coldSub: 'no data yet',
      animate: animate
    });

    if (!cold) {
      // Same predicted value that drives the ring, so the "You" marker can
      // never sit at the 500 coin-flip while the ring says something else.
      html += hw.buildGapScale(sum.predicted, result.passing, { animate: animate });
    }

    var metaParts = [];
    var streak = readStreak();
    if (streak !== null && streak > 0) {
      metaParts.push('Streak ' + hw.tnum(streak) + (streak === 1 ? ' day' : ' days'));
    }
    if (sum.lastAttemptText) {
      metaParts.push('Last attempt ' + hw.tnum(Math.round(sum.lastAttempt)));
    }
    if (sum.passAttempts) {
      metaParts.push(esc(sum.passRateText));
    }
    if (metaParts.length) {
      html += '<div class="hero-meta">';
      metaParts.forEach(function (p) { html += '<span>' + p + '</span>'; });
      html += '</div>';
    }

    if (scores.length >= 2) {
      html += hw.buildSparkline(scores);
    }

    if (cold) {
      // Cold start: the diagnostic is THE call to action, so it is the one
      // gold button on the home screen.
      html += '<button type="button" class="btn hero-cta hero-cta-gold" id="heroDiagnosticBtn">' +
        'Take the 20-question diagnostic</button>';
    }

    html += '</div>';
    el.innerHTML = html;

    if (cold) {
      var btn = document.getElementById('heroDiagnosticBtn');
      if (btn) {
        btn.addEventListener('click', function () {
          if (APlus.onboarding && typeof APlus.onboarding.start === 'function') {
            APlus.onboarding.start(true);
          } else {
            console.warn('[readiness-ui] APlus.onboarding.start is unavailable.');
          }
        });
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Today plan
   * ------------------------------------------------------------------ */

  function renderTodayCard(result, sum, history, hw) {
    var el = mount('todayPlanCard');
    if (!el) return;

    var mins = (APlus.onboarding && typeof APlus.onboarding.minutesPerDay === 'function')
      ? APlus.onboarding.minutesPerDay() : 25;
    var status = (APlus.onboarding && typeof APlus.onboarding.todayStatus === 'function')
      ? APlus.onboarding.todayStatus() : { done: false };
    var done = Boolean(status && status.done);
    var cold = !sum.hasData;

    var label = done
      ? ('Today: done. Start another ' + mins + ' minutes')
      : ('Start today\'s ' + mins + ' minutes');

    // Exactly one gold button on the home screen. Cold start hands it to the
    // hero diagnostic, so this drops to an outline with an explanatory note.
    var cls;
    if (cold) cls = 'btn tp-secondary';
    else if (done) cls = 'btn btn-secondary tp-primary';
    else cls = 'btn btn-primary-lg tp-primary';

    var html = '<button type="button" class="' + cls + '" id="todayPlanStartBtn">' + esc(label) + '</button>';
    if (cold) {
      html += '<span class="tp-note">Best after the diagnostic</span>';
    }

    var items = focusItems(result.weakest);
    if (items.length) {
      html += '<div class="plan-focus"><span class="label">Focus</span><ul>';
      items.forEach(function (t) { html += '<li>' + esc(t) + '</li>'; });
      html += '</ul></div>';
    }

    var stamps = [];
    try { stamps = hw.activityTimestamps() || []; } catch (_) { stamps = []; }
    html += hw.buildActivityStrip(hw.activityDays(stamps), { ariaLabel: 'Last 7 days' });

    el.innerHTML = html;

    var btn = document.getElementById('todayPlanStartBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (APlus.onboarding && typeof APlus.onboarding.startToday === 'function') {
          APlus.onboarding.startToday();
        } else {
          console.warn('[readiness-ui] APlus.onboarding.startToday is unavailable.');
        }
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */

  /**
   * Last render that actually had data. A theme toggle, a storage:changed or a
   * shell:ready burst must never repaint the ring as 0 or "--" while attempts
   * exist, so if a re-render comes back empty we repaint the cached truth
   * instead. "--" is only ever shown when history is genuinely empty and
   * objective_stats is genuinely empty.
   */
  var lastGood = null;
  var firstPaintDone = false;

  function readCanonicalHistory() {
    try {
      if (APlus.learner && typeof APlus.learner.getHistory === 'function') {
        var rows = APlus.learner.getHistory();
        return Array.isArray(rows) ? rows : [];
      }
    } catch (err) {
      console.warn('[readiness-ui] canonical history read failed:', err);
    }
    return [];
  }

  function render() {
    var hw = null;
    try {
      if (!document || !document.body) return;
      injectStyles();

      hw = widgets();
      if (!hw) return;

      if (!APlus.readiness2 || typeof APlus.readiness2.compute !== 'function') {
        console.warn('[readiness-ui] APlus.readiness2 missing; nothing to render.');
        return;
      }

      var profile = (APlus.onboarding && typeof APlus.onboarding.getProfile === 'function')
        ? APlus.onboarding.getProfile() : null;
      var exam = (APlus.onboarding && typeof APlus.onboarding.profileExam === 'function')
        ? APlus.onboarding.profileExam() : 'core1';

      // One synchronous history read, one compute call, shared by every
      // surface this module paints.
      var history = readCanonicalHistory();
      var result = APlus.readiness2.compute({ exam: exam, history: history });
      var sum = APlus.readiness2.format.summary(result);

      // Guard: a re-render must never show 0 or "--" while attempts exist.
      // If history came back non-empty but the reading says "no data", the
      // read was inconsistent, so repaint the last good numbers instead.
      // A genuinely empty history (the learner cleared it, or is new) is real
      // and does go cold, which is the only way "--" is ever shown.
      if (!sum.hasData && history.length > 0 && lastGood && lastGood.sum.hasData) {
        console.warn('[readiness-ui] inconsistent read with ' + history.length +
          ' attempts on record; repainting the last good reading.');
        result = lastGood.result;
        sum = lastGood.sum;
        history = lastGood.history;
      }
      lastGood = sum.hasData ? { result: result, sum: sum, history: history } : null;

      renderHero(result, sum, history, profile, hw);
      renderTodayCard(result, sum, history, hw);

      try { hw.renderCards(history); } catch (_) {}
      try { hw.renderCounts(false); } catch (_) {}
    } catch (err) {
      console.warn('[readiness-ui] render failed:', err);
    } finally {
      // Always flip the ring and gap-scale to their real values, even if one
      // of the sections above threw. A half-painted hero must not read 0.
      try { if (hw) hw.animateIn(); } catch (_) {}
    }
  }

  var scheduled = false;
  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(function () { scheduled = false; render(); }, 60);
  }

  function init() {
    render();
    if (APlus.bus && typeof APlus.bus.on === 'function') {
      APlus.bus.on('exam:finished', scheduleRender);
      APlus.bus.on('storage:changed', scheduleRender);
      APlus.bus.on('shell:ready', scheduleRender);
    } else {
      console.warn('[readiness-ui] APlus.bus missing; rendering once only.');
    }
  }

  APlus.readinessUI = {
    VERSION: '2.0.0',
    render: render,
    refresh: scheduleRender,
    daysUntil: daysUntil,
    daysLine: daysLine,
    focusLine: focusLine,
    focusItems: focusItems
  };

  if (typeof APlus.registerFeature === 'function') {
    try {
      APlus.registerFeature('readinessUI', {
        version: '2.0.0',
        description: 'Readiness hero and today plan card',
        api: APlus.readinessUI
      });
    } catch (err) {
      console.warn('[readiness-ui] registerFeature failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
