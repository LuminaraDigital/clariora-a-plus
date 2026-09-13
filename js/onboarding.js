/**
 * Clariora Exam Simulator
 * onboarding.js - First-run diagnostic UI and the daily plan builder.
 * File: js/onboarding.js
 *
 * Readiness math lives in js/readiness2.js (loaded first in the browser, or
 * required from this file under Node).
 *
 * Plain script, IIFE, no ES modules, file:// compatible.
 * Browser: attaches window.APlus.onboarding (readiness2 already on APlus)
 * Node:    module.exports = { readiness2, buildTodaySet, accumulateStats, ... }
 */

(function (root, factory) {
  'use strict';
  var shared = null;
  try {
    if (typeof require === 'function') {
      shared = require('./readiness2.js');
    }
  } catch (_) { shared = null; }
  var w = (typeof window === 'object' && window) ? window : root;
  if (!shared && w && w.APlus && w.APlus._readinessShared) {
    shared = w.APlus._readinessShared;
  }
  if (!shared) {
    throw new Error('[onboarding] js/readiness2.js must load before onboarding.js');
  }
  var api = factory(shared);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.readiness2 = shared.readiness2;
    w.APlus.onboarding = api.onboarding;
    api.onboarding._boot(w);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (shared) {
  'use strict';

  var BLUEPRINTS = shared.BLUEPRINTS;
  var PASSING = shared.PASSING;
  var STORAGE_KEYS = shared.STORAGE_KEYS;
  var DEFAULT_MINUTES = shared.DEFAULT_MINUTES;
  var readiness2 = shared.readiness2;
  var accumulateStats = shared.accumulateStats;
  var compute = shared.compute;
  var pickWeakest = shared.pickWeakest;
  var shuffle = shared.shuffle;
  var clamp = shared.clamp;
  var examForDomain = shared.examForDomain;
  var normExam = shared.normExam;
  var domainPrefixForCode = shared.domainPrefixForCode;
  var statKey = shared.statKey;


  /* ------------------------------------------------------------------ *
   * Today plan composition (pure)
   * ------------------------------------------------------------------ */

  function quotaSample(pool, exam, n, rng) {
    if (n <= 0 || !pool.length) return [];
    var bp = BLUEPRINTS[exam] || BLUEPRINTS.core1;
    var totalWeight = bp.reduce(function (a, d) { return a + d.weight; }, 0);
    var picked = [];
    var used = {};

    bp.forEach(function (d) {
      var quota = Math.floor((d.weight / totalWeight) * n);
      var bucket = shuffle(pool.filter(function (q) {
        return domainPrefixForCode(q.objective) === d.prefix && !used[q.id];
      }), rng);
      bucket.slice(0, quota).forEach(function (q) { used[q.id] = true; picked.push(q); });
    });

    if (picked.length < n) {
      var rest = shuffle(pool.filter(function (q) { return !used[q.id]; }), rng);
      rest.slice(0, n - picked.length).forEach(function (q) { used[q.id] = true; picked.push(q); });
    }

    return picked.slice(0, n);
  }

  /**
   * buildTodaySet({ pool, exam, count, weakKeys, missedIds, dueIds, rng })
   *
   * weakKeys: array of "exam|code" strings (or plain codes, matched loosely).
   * 60% of the set is drawn from the weak objectives plus anything in the missed
   * pool; spaced-repetition due cards are taken first inside that 60%. The
   * remaining 40% is a blueprint-weighted draw from everything else. Ids are unique.
   */
  function buildTodaySet(options) {
    var o = options || {};
    var pool = Array.isArray(o.pool) ? o.pool.filter(function (q) { return q && q.id; }) : [];
    var exam = normExam(o.exam || 'core1');
    var sampleExam = exam === 'both' ? 'core1' : exam;
    var rng = o.rng;
    var count = Math.max(0, Math.min(o.count || 0, pool.length));
    if (!count) return { questions: [], focusCount: 0, restCount: 0, targetFocus: 0, targetRest: 0 };

    var weakSet = {};
    (o.weakKeys || []).forEach(function (k) {
      var s = String(k);
      weakSet[s] = true;
      if (s.indexOf('|') >= 0) weakSet[s.split('|')[1]] = true;
    });
    var missedSet = {};
    (o.missedIds || []).forEach(function (id) { missedSet[id] = true; });
    var dueSet = {};
    (o.dueIds || []).forEach(function (id) { dueSet[id] = true; });

    function isFocus(q) {
      if (missedSet[q.id]) return true;
      var code = String(q.objective || '');
      var qExam = examForDomain(q.domain, q.exam || exam);
      return Boolean(weakSet[statKey(qExam, code)] || weakSet[code]);
    }

    var targetFocus = Math.round(count * 0.6);
    var targetRest = count - targetFocus;

    var focusPool = pool.filter(isFocus);
    var tierDue = shuffle(focusPool.filter(function (q) { return dueSet[q.id]; }), rng);
    var tierMissed = shuffle(focusPool.filter(function (q) { return !dueSet[q.id] && missedSet[q.id]; }), rng);
    var tierWeak = shuffle(focusPool.filter(function (q) { return !dueSet[q.id] && !missedSet[q.id]; }), rng);

    var used = {};
    var focus = [];
    [tierDue, tierMissed, tierWeak].forEach(function (tier) {
      tier.forEach(function (q) {
        if (focus.length >= targetFocus || used[q.id]) return;
        used[q.id] = true;
        focus.push(q);
      });
    });

    // Anything the focus pool could not supply rolls into the blueprint-weighted half.
    var restTarget = count - focus.length;
    var restPool = pool.filter(function (q) { return !used[q.id] && !isFocus(q); });
    var rest = quotaSample(restPool, sampleExam, restTarget, rng);
    rest.forEach(function (q) { used[q.id] = true; });

    if (focus.length + rest.length < count) {
      var filler = shuffle(pool.filter(function (q) { return !used[q.id]; }), rng);
      filler.slice(0, count - focus.length - rest.length).forEach(function (q) {
        used[q.id] = true;
        rest.push(q);
      });
    }

    return {
      questions: focus.concat(rest),
      focusCount: focus.length,
      restCount: rest.length,
      targetFocus: targetFocus,
      targetRest: targetRest
    };
  }

  /* ------------------------------------------------------------------ *
   * Environment-safe accessors
   * ------------------------------------------------------------------ */

  function W() { return (typeof window === 'object' && window) ? window : null; }
  function A() { var w = W(); return (w && w.APlus) || null; }

  function readStorage(key, fallback) {
    var a = A();
    try {
      if (a && a.storage && typeof a.storage.get === 'function') return a.storage.get(key, fallback);
    } catch (err) {
      console.warn('[onboarding] storage read failed for "' + key + '":', err);
    }
    return fallback;
  }

  function writeStorage(key, value) {
    var a = A();
    try {
      if (a && a.storage && typeof a.storage.set === 'function') return a.storage.set(key, value);
    } catch (err) {
      console.warn('[onboarding] storage write failed for "' + key + '":', err);
    }
    return false;
  }

  function track(name, payload) {
    var a = A();
    try {
      if (a && a.telemetry && typeof a.telemetry.track === 'function') a.telemetry.track(name, payload || {});
    } catch (_) {}
  }

  function esc(s) {
    var a = A();
    if (a && a.utils && typeof a.utils.escapeHTML === 'function') return a.utils.escapeHTML(s);
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  /* ------------------------------------------------------------------ *
   * Styles
   * ------------------------------------------------------------------ */

  var STYLE_ID = 'onboardingStyles_v426';
  var STYLES = [
    '#onboardingRoot .ob-overlay{position:fixed;inset:0;z-index:9000;',
    'overflow-y:auto;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,560px);',
    'background:var(--bg-primary,#050505);padding:0;}',
    '#onboardingRoot .ob-field-error{display:none;margin:.45rem 0 0;font-size:.85rem;color:#E8A0A0;}',
    '#onboardingRoot .ob-field-error.is-visible{display:block;}',
    '#onboardingRoot input[aria-invalid="true"]{border-color:#C45C5C!important;}',
    '#onboardingRoot .ob-primary.is-busy{position:relative;pointer-events:none;}',
    '#onboardingRoot .ob-primary.is-busy::after{content:"";position:absolute;right:1rem;top:50%;',
    'width:.85rem;height:.85rem;margin-top:-.425rem;border-radius:50%;',
    'border:2px solid rgba(18,16,12,.25);border-top-color:rgba(18,16,12,.9);',
    'animation:obSpin .7s linear infinite;}',
    '@keyframes obSpin{to{transform:rotate(360deg);}}',
    '#onboardingRoot .ob-stage{position:relative;min-height:100dvh;overflow:hidden;',
    'background:#050505;}',
    '#onboardingRoot .ob-stage img,#onboardingRoot .ob-stage .ob-stage-art{position:absolute;inset:0;width:100%;height:100%;',
    'object-fit:cover;object-position:center bottom;opacity:.92;}',
    '#onboardingRoot .ob-stage::after{content:"";position:absolute;inset:0;pointer-events:none;',
    'background:linear-gradient(90deg,transparent 55%,rgba(5,5,5,.55) 100%),',
    'linear-gradient(180deg,rgba(0,0,0,.25),transparent 35%,rgba(0,0,0,.45));}',
    '#onboardingRoot .ob-panel{width:100%;max-width:none;min-height:100dvh;background:var(--bg-card,#121212);',
    'border:none;border-left:1px solid var(--border-light,rgba(255,255,255,.08));border-radius:0;',
    'padding:clamp(28px,4vw,56px);display:flex;flex-direction:column;justify-content:center;}',
    '#onboardingRoot .ob-kicker{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;',
    'color:var(--text-muted,#6f6a62);margin:0 0 .55rem;font-weight:600;}',
    '#onboardingRoot h2.ob-title{font-size:clamp(1.35rem,2vw,1.7rem);margin:0 0 1.35rem;',
    'color:var(--text-primary,#f5f2ea);letter-spacing:-.02em;line-height:1.25;}',
    '#onboardingRoot .ob-field{margin-bottom:1.35rem;}',
    '#onboardingRoot .ob-label{display:block;font-size:.9rem;margin-bottom:.55rem;color:var(--text-primary,#f5f2ea);}',
    '#onboardingRoot .ob-choices{display:flex;flex-wrap:wrap;gap:.5rem;}',
    '#onboardingRoot .ob-choice{flex:1 1 auto;min-width:120px;min-height:44px;padding:.65rem .85rem;border-radius:6px;cursor:pointer;',
    'background:transparent;color:var(--text-primary,#f5f2ea);font:inherit;font-size:.9rem;',
    'border:1px solid var(--border-light,rgba(255,255,255,.08));text-align:center;}',
    '#onboardingRoot .ob-choice[aria-pressed="true"]{border-color:var(--border-gold,#c9a227);',
    'background:rgba(212,175,55,.08);}',
    '#onboardingRoot .ob-date{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;}',
    '#onboardingRoot input[type="date"]{padding:.6rem .75rem;border-radius:6px;font:inherit;font-size:.9rem;min-height:44px;',
    'background:transparent;color:var(--text-primary,#f5f2ea);',
    'border:1px solid var(--border-light,rgba(255,255,255,.08));}',
    '#onboardingRoot .ob-check{display:inline-flex;gap:.4rem;align-items:center;font-size:.9rem;',
    'color:var(--text-secondary,#a39e93);cursor:pointer;}',
    '#onboardingRoot .ob-primary{display:block;width:100%;margin-top:.5rem;padding:.9rem 1rem;border-radius:6px;',
    'cursor:pointer;font:inherit;font-size:.95rem;font-weight:700;border:1px solid var(--gold-primary,#c9a227);',
    'background:var(--gold-primary,#c9a227);color:#12100c;min-height:48px;}',
    '#onboardingRoot .ob-primary:disabled{opacity:.55;cursor:not-allowed;}',
    '#onboardingRoot .ob-quiet{display:block;width:100%;margin-top:.9rem;background:none;border:0;cursor:pointer;',
    'font:inherit;font-size:.88rem;color:var(--text-muted,#6f6a62);text-decoration:underline;}',
    '#onboardingRoot .ob-big{font-size:clamp(2.8rem,4vw,3.4rem);line-height:1;font-weight:700;color:var(--gold-primary,#c9a227);',
    'margin:.25rem 0;font-variant-numeric:tabular-nums;letter-spacing:-.03em;}',
    '#onboardingRoot .ob-sub{color:var(--text-secondary,#a39e93);font-size:.95rem;margin:0 0 .6rem;}',
    '#onboardingRoot .ob-confidence{color:var(--text-muted,#6f6a62);font-size:.85rem;margin:0 0 1.2rem;}',
    '#onboardingRoot .ob-weak{list-style:none;padding:0;margin:0 0 1.4rem;}',
    '#onboardingRoot .ob-weak li{padding:.65rem .8rem;border-radius:6px;margin-bottom:.4rem;font-size:.92rem;',
    'background:transparent;border:1px solid var(--border-light,rgba(255,255,255,.08));',
    'color:var(--text-primary,#f5f2ea);}',
    '#onboardingRoot .ob-weak .ob-code{font-weight:700;margin-right:.4rem;}',
    '@media (max-width:900px){#onboardingRoot .ob-overlay{grid-template-columns:1fr;padding:1rem;}',
    '#onboardingRoot .ob-stage{display:none;}',
    '#onboardingRoot .ob-panel{min-height:auto;border-radius:12px;border:1px solid var(--border-light,rgba(255,255,255,.08));',
    'padding:1.5rem;}}',
    /* ---------------------------------------------------------------- *
     * Home widget fallbacks.
     *
     * Every selector below is wrapped in :where() so it carries zero
     * specificity. The shell stylesheet owns the real look of these classes
     * and overrides all of this with any normal selector; these rules only
     * keep the widgets legible if the shell has not styled them yet.
     * ---------------------------------------------------------------- */
    ':where(#readinessHero,#todayPlanCard){display:block;padding:1.25rem 1.35rem;border-radius:12px;',
    'background:var(--bg-card,#121212);border:1px solid var(--border-light,rgba(255,255,255,.08));}',
    ':where(#readinessHero,#todayPlanCard,.card-stats) :where(.label){font-size:.72rem;letter-spacing:.1em;',
    'text-transform:uppercase;color:var(--text-muted,#6f6a62);font-weight:600;}',
    ':where(.tnum){font-variant-numeric:tabular-nums;}',

    ':where(#readinessHero) :where(.hero-head){display:flex;align-items:baseline;justify-content:space-between;',
    'gap:.75rem;margin-bottom:1rem;}',
    ':where(#readinessHero) :where(.hero-days){font-size:.8rem;color:var(--text-secondary,#a39e93);}',
    ':where(#readinessHero) :where(.hero-body){display:flex;flex-direction:column;gap:1.15rem;align-items:stretch;}',

    ':where(.score-ring-wrap){position:relative;width:120px;height:120px;align-self:center;}',
    ':where(.score-ring){width:120px;height:120px;display:block;transform:rotate(-90deg);}',
    ':where(.score-ring) :where(.track){color:var(--border-light,rgba(255,255,255,.10));}',
    ':where(.score-ring) :where(.progress){color:var(--gold-primary,#c9a227);',
    'transition:stroke-dashoffset .9s cubic-bezier(.22,.61,.36,1);}',
    ':where(.score-ring-text){position:absolute;inset:0;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:.15rem;pointer-events:none;}',
    ':where(.score-ring-text) :where(.value){font-size:1.75rem;line-height:1;font-weight:700;',
    'color:var(--gold-primary,#c9a227);letter-spacing:-.02em;font-variant-numeric:tabular-nums;}',

    // The hero body centres its children, so the scale has to claim the full
    // width itself or it collapses to the width of its absolute markers.
    ':where(.gap-scale){position:relative;margin:1.4rem 0 1.9rem;width:100%;align-self:stretch;}',
    ':where(.gap-scale) :where(.track){height:8px;border-radius:4px;overflow:hidden;',
    'background:var(--border-light,rgba(255,255,255,.08));}',
    ':where(.gap-scale) :where(.fill){display:block;height:100%;border-radius:4px;background:var(--gold-primary,#c9a227);',
    'transition:width .9s cubic-bezier(.22,.61,.36,1);}',
    ':where(.gap-scale) :where(.marker){position:absolute;top:-4px;width:2px;height:16px;',
    'background:var(--text-muted,#6f6a62);}',
    ':where(.gap-scale) :where(.marker.you){background:var(--gold-primary,#c9a227);}',
    ':where(.gap-scale) :where(.marker) :where(span){position:absolute;top:18px;left:50%;transform:translateX(-50%);',
    'white-space:nowrap;font-size:.68rem;color:var(--text-secondary,#a39e93);}',
    ':where(.gap-scale) :where(.marker.pass) :where(span){top:-20px;}',

    ':where(#readinessHero) :where(.hero-meta){display:flex;flex-wrap:wrap;gap:.35rem 1rem;',
    'font-size:.82rem;color:var(--text-secondary,#a39e93);}',
    ':where(.sparkline){width:100%;height:40px;display:block;color:var(--gold-primary,#c9a227);opacity:.8;}',
    ':where(#readinessHero) :where(.hero-cta){width:100%;}',

    ':where(#todayPlanCard) :where(.tp-primary){width:100%;padding:.85rem 1.15rem;border-radius:6px;cursor:pointer;',
    'font:inherit;font-size:.95rem;font-weight:700;min-height:48px;}',

    /* ---------------------------------------------------------------- *
     * Cold-start button hierarchy.
     *
     * With no attempts the ONE gold button on the home screen is the hero
     * diagnostic; the plan button drops to an outline. Warm state puts the
     * gold back on the plan button and the hero carries no button at all.
     * The shell stylesheet paints #todayPlanCard .tp-primary gold with
     * !important, so the cold plan button uses .tp-secondary instead and
     * these two rules need !important to win the same way.
     * ---------------------------------------------------------------- */
    '#readinessHero .hero-cta.hero-cta-gold{width:100%;padding:.85rem 1.15rem;border-radius:6px;cursor:pointer;',
    'font:inherit;font-size:.95rem;font-weight:700;min-height:48px;',
    'background:var(--gold-primary,#c9a227)!important;color:#07090E!important;',
    'border:1px solid var(--gold-primary,#c9a227)!important;}',
    '#readinessHero .hero-cta.hero-cta-gold:hover{background:var(--gold-light,#F5D061)!important;',
    'border-color:var(--gold-light,#F5D061)!important;color:#07090E!important;}',
    '#todayPlanCard .tp-secondary{width:100%;padding:.85rem 1.15rem;border-radius:6px;cursor:pointer;',
    'font:inherit;font-size:.95rem;font-weight:700;min-height:48px;',
    'background:transparent!important;color:var(--text-primary,#f5f2ea)!important;',
    'border:1px solid var(--border-light,rgba(255,255,255,.18))!important;}',
    '#todayPlanCard .tp-secondary:hover{border-color:var(--gold-primary,#c9a227)!important;',
    'color:var(--gold-primary,#c9a227)!important;}',
    '#todayPlanCard .tp-note{display:block;margin-top:.45rem;font-size:.78rem;',
    'color:var(--text-secondary,#a39e93);}',
    ':where(#todayPlanCard) :where(.plan-focus){margin:1rem 0 .9rem;}',
    ':where(#todayPlanCard) :where(.plan-focus ul){list-style:none;padding:0;margin:.45rem 0 0;}',
    ':where(#todayPlanCard) :where(.plan-focus li){font-size:.85rem;line-height:1.5;',
    'color:var(--text-secondary,#a39e93);padding:.1rem 0;}',

    ':where(.activity-strip){display:flex;gap:4px;align-items:stretch;}',
    ':where(.activity-strip) :where(.day){flex:1 1 0;height:8px;border-radius:3px;',
    'background:var(--border-light,rgba(255,255,255,.08));}',
    ':where(.activity-strip) :where(.day.on){background:var(--gold-primary,#c9a227);}',
    ':where(.activity-strip) :where(.day.today){box-shadow:0 0 0 1px var(--gold-primary,#c9a227);}',

    ':where(.card-stats){margin:.85rem 0 1rem;}',
    ':where(.card-stats) :where(.last-score){font-size:1.5rem;line-height:1;font-weight:700;',
    'color:var(--gold-primary,#c9a227);font-variant-numeric:tabular-nums;letter-spacing:-.02em;}',
    ':where(.card-stats) :where(.stats-meta){margin:.3rem 0 .55rem;}',

    '@media (prefers-reduced-motion:reduce){:where(.score-ring) :where(.progress),',
    ':where(.gap-scale) :where(.fill){transition:none;}}'
  ].join('');

  function injectStyles() {
    var w = W();
    if (!w || !w.document) return;
    if (w.document.getElementById(STYLE_ID)) return;
    try {
      var el = w.document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = STYLES;
      (w.document.head || w.document.documentElement).appendChild(el);
    } catch (err) {
      console.warn('[onboarding] could not inject styles:', err);
    }
  }

  /**
   * Mount lookup. The UI shell is expected to provide #readinessHero,
   * #todayPlanCard and #onboardingRoot. If any is missing we create it at the
   * top of #startScreen so this module never blocks on the UI agent.
   */
  function ensureMount(id) {
    var w = W();
    if (!w || !w.document) return null;
    var el = w.document.getElementById(id);
    if (el) return el;
    var host = w.document.getElementById('startScreen') || w.document.body;
    if (!host) return null;
    try {
      el = w.document.createElement(id === 'onboardingRoot' ? 'div' : 'section');
      el.id = id;
      host.insertBefore(el, host.firstChild);
      return el;
    } catch (err) {
      console.warn('[onboarding] could not create mount #' + id + ':', err);
      return null;
    }
  }

  /* ------------------------------------------------------------------ *
   * Onboarding controller
   * ------------------------------------------------------------------ */

  var state = {
    booted: false,
    shown: false,
    busy: false,
    draft: { exam: 'core1', testDate: null, notBooked: false, minutesPerDay: DEFAULT_MINUTES }
  };

  function ensureFirstSeen() {
    var existing = readStorage(STORAGE_KEYS.firstSeenAt, null);
    if (existing) return existing;
    var now = new Date().toISOString();
    writeStorage(STORAGE_KEYS.firstSeenAt, now);
    return now;
  }

  function markFirstValue(action) {
    if (readStorage(STORAGE_KEYS.firstValueAt, null)) return;
    var firstSeen = ensureFirstSeen();
    var nowMs = Date.now();
    var firstMs = Date.parse(String(firstSeen)) || nowMs;
    var seconds = Math.max(0, Math.round((nowMs - firstMs) / 1000));
    writeStorage(STORAGE_KEYS.firstValueAt, new Date(nowMs).toISOString());
    track('time_to_first_value', { action: String(action || 'unknown'), seconds: seconds });
  }

  function persistDraft() {
    writeStorage(STORAGE_KEYS.onboardingDraft, {
      exam: state.draft.exam,
      testDate: state.draft.testDate,
      notBooked: Boolean(state.draft.notBooked),
      minutesPerDay: state.draft.minutesPerDay,
      savedAt: new Date().toISOString()
    });
  }

  function restoreDraft() {
    var d = readStorage(STORAGE_KEYS.onboardingDraft, null);
    if (!d || typeof d !== 'object') return false;
    state.draft.exam = normExam(d.exam || state.draft.exam);
    state.draft.testDate = d.testDate || null;
    state.draft.notBooked = Boolean(d.notBooked);
    state.draft.minutesPerDay = Number(d.minutesPerDay) || DEFAULT_MINUTES;
    track('onboarding_draft_restored', { exam: state.draft.exam });
    return true;
  }

  function clearDraft() {
    writeStorage(STORAGE_KEYS.onboardingDraft, null);
  }

  function setFieldError(id, message) {
    var w = W();
    if (!w || !w.document) return;
    var el = w.document.getElementById(id);
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.add('is-visible');
    } else {
      el.textContent = '';
      el.classList.remove('is-visible');
    }
  }

  function setBusy(btn, on, labelBusy, labelIdle) {
    state.busy = Boolean(on);
    if (!btn) return;
    btn.disabled = state.busy;
    if (state.busy) {
      btn.classList.add('is-busy');
      btn.setAttribute('aria-busy', 'true');
      if (labelBusy) btn.textContent = labelBusy;
    } else {
      btn.classList.remove('is-busy');
      btn.removeAttribute('aria-busy');
      if (labelIdle) btn.textContent = labelIdle;
    }
  }

  function getProfile() {
    var p = readStorage(STORAGE_KEYS.onboarding, null);
    return (p && typeof p === 'object') ? p : null;
  }

  function minutesPerDay() {
    var p = getProfile();
    var m = p && Number(p.minutesPerDay);
    return (m && m > 0) ? m : DEFAULT_MINUTES;
  }

  function profileExam() {
    var p = getProfile();
    return normExam((p && p.exam) || 'core1');
  }

  function passingLabel(exam) {
    if (exam === 'core2') return 700;
    return 675;
  }

  function closePanel() {
    var root = ensureMount('onboardingRoot');
    if (root) root.innerHTML = '';
    state.shown = false;
  }

  /**
   * The black and gold stage shown beside every onboarding panel. With no
   * arguments it shows the A+ mark and a partial ring. Pass a result to turn
   * the ring into the readiness gauge with the predicted score in the centre,
   * so the diagnostic summary reads as one screen instead of a half-empty one.
   */
  function stageArt(result) {
    var circumference = 2 * Math.PI * 150;
    var pct = result && isFinite(result.readiness) ? Math.max(0.02, Math.min(1, result.readiness / 100)) : 0.626;
    var filled = (circumference * pct).toFixed(1);
    var gap = (circumference - circumference * pct).toFixed(1);
    var centre = result && isFinite(result.predicted) ? String(result.predicted) : 'A+';
    var label = result ? 'PREDICTED SCORE' : 'READINESS';
    var centreSize = result ? 84 : 72;
    var caption = '';
    if (result) {
      var need = result.exam === 'core2' ? 700 : 675;
      caption = '<text x="300" y="560" text-anchor="middle" font-family="Sora, system-ui, sans-serif" font-weight="600" font-size="14" letter-spacing="2" fill="#A3ADC2">' +
        'READINESS ' + esc(String(result.readiness)) + ' PERCENT</text>' +
        '<text x="300" y="586" text-anchor="middle" font-family="Sora, system-ui, sans-serif" font-weight="500" font-size="13" letter-spacing="1" fill="#6F7A90">' +
        'PASS MARK ' + need + '</text>';
    }
    return '<div class="ob-stage" aria-hidden="true">' +
      '<svg class="ob-stage-art" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice" focusable="false">' +
      '<defs><radialGradient id="obGlow" cx="50%" cy="48%" r="55%">' +
      '<stop offset="0" stop-color="#D4AF37" stop-opacity="0.16"/><stop offset="1" stop-color="#07090E" stop-opacity="0"/>' +
      '</radialGradient></defs>' +
      '<rect width="600" height="900" fill="#07090E"/>' +
      '<rect width="600" height="900" fill="url(#obGlow)"/>' +
      '<g fill="none" stroke="#D4AF37" stroke-linecap="round">' +
      '<circle cx="300" cy="430" r="250" stroke-opacity="0.08" stroke-width="1"/>' +
      '<circle cx="300" cy="430" r="200" stroke-opacity="0.14" stroke-width="1.5"/>' +
      '<circle cx="300" cy="430" r="150" stroke-opacity="0.22" stroke-width="2"/>' +
      '<circle cx="300" cy="430" r="150" stroke-opacity="0.9" stroke-width="8" stroke-dasharray="' + filled + ' ' + gap + '" transform="rotate(-90 300 430)"/>' +
      '</g>' +
      '<text x="300" y="452" text-anchor="middle" font-family="Sora, system-ui, sans-serif" font-weight="700" font-size="' + centreSize + '" fill="#F3F4F6" font-variant-numeric="tabular-nums">' + esc(centre) + '</text>' +
      '<text x="300" y="492" text-anchor="middle" font-family="Sora, system-ui, sans-serif" font-weight="600" font-size="13" letter-spacing="3" fill="#A3ADC2">' + label + '</text>' +
      caption +
      '<line x1="60" y1="820" x2="540" y2="820" stroke="#D4AF37" stroke-opacity="0.35" stroke-width="1"/>' +
      '</svg>' +
      '</div>';
  }

  function renderStep1() {
    var root = ensureMount('onboardingRoot');
    if (!root) return;
    injectStyles();
    state.shown = true;

    var d = state.draft;
    var examOpts = [
      { v: 'core1', label: 'Core 1 (220-1201)' },
      { v: 'core2', label: 'Core 2 (220-1202)' },
      { v: 'both', label: 'Both' }
    ];
    var minOpts = [15, 25, 45];

    var html = '<div class="ob-overlay">' +
      stageArt() +
      '<div class="ob-panel card" role="dialog" aria-modal="true" aria-labelledby="obTitle">';
    html += '<p class="ob-kicker">Set up in under a minute</p>';
    html += '<h2 class="ob-title" id="obTitle">Which exam are you preparing for?</h2>';

    html += '<div class="ob-field"><div class="ob-choices" id="obExamChoices">';
    examOpts.forEach(function (o) {
      html += '<button type="button" class="ob-choice" data-exam="' + o.v + '" aria-pressed="' +
        (d.exam === o.v ? 'true' : 'false') + '">' + esc(o.label) + '</button>';
    });
    html += '</div></div>';

    html += '<div class="ob-field"><label class="ob-label" for="obTestDate">When is your test date?</label>';
    html += '<div class="ob-date"><input type="date" id="obTestDate" value="' + esc(d.testDate || '') + '"' +
      (d.notBooked ? ' disabled' : '') + ' aria-describedby="obDateError">';
    html += '<label class="ob-check"><input type="checkbox" id="obNotBooked"' + (d.notBooked ? ' checked' : '') +
      '> Not booked yet</label></div>';
    html += '<p class="ob-field-error" id="obDateError" role="alert"></p></div>';

    html += '<div class="ob-field"><span class="ob-label">How many minutes a day can you study?</span>';
    html += '<div class="ob-choices" id="obMinChoices">';
    minOpts.forEach(function (m) {
      html += '<button type="button" class="ob-choice" data-min="' + m + '" aria-pressed="' +
        (d.minutesPerDay === m ? 'true' : 'false') + '">' + m + '</button>';
    });
    html += '</div></div>';

    html += '<button type="button" class="ob-primary btn" id="obStartDiagnostic">Start the 20-question diagnostic</button>';
    html += '<button type="button" class="ob-quiet" id="obSkip">Skip for now</button>';
    html += '</div></div>';

    root.innerHTML = html;

    var w = W();
    var byId = function (id) { return w.document.getElementById(id); };

    var examWrap = byId('obExamChoices');
    if (examWrap) {
      examWrap.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-exam]') : null;
        if (!btn) return;
        state.draft.exam = btn.getAttribute('data-exam');
        Array.prototype.forEach.call(examWrap.querySelectorAll('[data-exam]'), function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        persistDraft();
      });
    }

    var minWrap = byId('obMinChoices');
    if (minWrap) {
      minWrap.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-min]') : null;
        if (!btn) return;
        state.draft.minutesPerDay = parseInt(btn.getAttribute('data-min'), 10) || DEFAULT_MINUTES;
        Array.prototype.forEach.call(minWrap.querySelectorAll('[data-min]'), function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        persistDraft();
      });
    }

    var dateEl = byId('obTestDate');
    if (dateEl) {
      dateEl.addEventListener('change', function () {
        state.draft.testDate = dateEl.value || null;
        dateEl.removeAttribute('aria-invalid');
        setFieldError('obDateError', '');
        persistDraft();
      });
    }

    var nb = byId('obNotBooked');
    if (nb) {
      nb.addEventListener('change', function () {
        state.draft.notBooked = Boolean(nb.checked);
        if (dateEl) {
          dateEl.disabled = state.draft.notBooked;
          if (state.draft.notBooked) {
            dateEl.value = '';
            state.draft.testDate = null;
            dateEl.removeAttribute('aria-invalid');
            setFieldError('obDateError', '');
          }
        }
        persistDraft();
      });
    }

    var go = byId('obStartDiagnostic');
    if (go) go.addEventListener('click', function () { startDiagnostic(); });

    var skip = byId('obSkip');
    if (skip) skip.addEventListener('click', function () { skipOnboarding(); });

    track('onboarding_shown', { exam: d.exam, restored: Boolean(d.testDate || d.notBooked) });
  }

  function skipOnboarding() {
    var d = state.draft;
    writeStorage(STORAGE_KEYS.onboarding, {
      exam: d.exam,
      testDate: d.notBooked ? null : (d.testDate || null),
      minutesPerDay: d.minutesPerDay,
      completedAt: null,
      skippedAt: new Date().toISOString(),
      diagnostic: null
    });
    clearDraft();
    track('onboarding_skipped', { exam: d.exam });
    closePanel();
    renderHero();
  }

  function validateDraft() {
    var d = state.draft;
    var w = W();
    var dateEl = w && w.document ? w.document.getElementById('obTestDate') : null;
    setFieldError('obDateError', '');
    if (dateEl) dateEl.removeAttribute('aria-invalid');
    if (!d.notBooked && !d.testDate) {
      if (dateEl) dateEl.setAttribute('aria-invalid', 'true');
      setFieldError('obDateError', 'Pick a test date, or check "Not booked yet".');
      track('form_validation_error', { form: 'onboarding', field: 'testDate' });
      return false;
    }
    return true;
  }

  function startDiagnostic() {
    if (state.busy) return;
    if (!validateDraft()) return;

    var d = state.draft;
    var a = A();
    var w = W();
    var go = w && w.document ? w.document.getElementById('obStartDiagnostic') : null;
    setBusy(go, true, 'Starting diagnostic...', 'Start the 20-question diagnostic');

    // Persist the answers so the profile survives a reload mid-diagnostic.
    var existing = getProfile() || {};
    writeStorage(STORAGE_KEYS.onboarding, {
      exam: d.exam,
      testDate: d.notBooked ? null : (d.testDate || null),
      minutesPerDay: d.minutesPerDay,
      completedAt: existing.completedAt || null,
      skippedAt: null,
      diagnostic: existing.diagnostic || null
    });
    writeStorage(STORAGE_KEYS.diagnosticPending, true);
    persistDraft();
    track('diagnostic_started', { exam: d.exam, minutesPerDay: d.minutesPerDay });
    markFirstValue('diagnostic_started');

    closePanel();

    var started = false;
    try {
      if (a && a.engine && typeof a.engine.start === 'function') {
        a.engine.start({ type: d.exam, questionCount: 20, timeMinutes: 20, mode: 'diagnostic' });
        started = true;
      }
    } catch (err) {
      console.warn('[onboarding] engine.start failed, falling back to startExam:', err);
    }
    if (!started) {
      if (w && typeof w.startExam === 'function') {
        w.startExam(d.exam, 20, 20);
        started = true;
      }
    }
    if (!started) {
      console.warn('[onboarding] no exam engine available; diagnostic could not start.');
      writeStorage(STORAGE_KEYS.diagnosticPending, false);
      track('form_validation_error', { form: 'onboarding', field: 'engine' });
      renderStep1();
      var retry = w && w.document ? w.document.getElementById('obStartDiagnostic') : null;
      setBusy(retry, false, null, 'Start the 20-question diagnostic');
      setFieldError('obDateError', 'Could not start the diagnostic. Refresh the page and try again.');
    }
  }

  function byObjectiveFrom(perQuestion) {
    var out = {};
    (perQuestion || []).forEach(function (pq) {
      if (!pq || !pq.objective) return;
      var exam = examForDomain(pq.domain, pq.exam);
      var key = statKey(exam, String(pq.objective));
      if (!out[key]) out[key] = { correct: 0, total: 0 };
      out[key].total += 1;
      if (pq.correct) out[key].correct += 1;
    });
    return out;
  }

  function renderSummary(result, payload) {
    var root = ensureMount('onboardingRoot');
    if (!root) return;
    injectStyles();
    state.shown = true;

    var mins = minutesPerDay();
    var exam = result.exam;
    var need = exam === 'core2' ? 700 : 675;
    var needLine = exam === 'both'
      ? 'You need 675 for Core 1 and 700 for Core 2.'
      : 'You need ' + need + '.';

    var html = '<div class="ob-overlay">' + stageArt(result) +
      '<div class="ob-panel card" role="dialog" aria-modal="true" aria-labelledby="obSumTitle">';
    html += '<p class="ob-kicker">Your diagnostic result</p>';
    html += '<h2 class="ob-title" id="obSumTitle">Predicted score ' + result.predicted + '</h2>';
    var b = band(result);
    var rangeLine = b ? ' Likely range ' + b.low + ' to ' + b.high + '.' : '';
    html += '<p class="ob-sub">' + esc(needLine) + ' Readiness ' + result.readiness + ' percent.' + esc(rangeLine) + '</p>';
    var conf = confidenceText(result);
    if (conf) html += '<p class="ob-confidence">' + esc(conf) + '</p>';
    html += '<p class="ob-kicker">Work on these first</p><ul class="ob-weak">';
    (result.weakest || []).forEach(function (wk) {
      html += '<li><span class="ob-code">' + esc(wk.code) + '</span> ' + esc(wk.title || wk.domain || '') + '</li>';
    });
    html += '</ul>';
    html += '<button type="button" class="ob-primary btn" id="obStartToday">Start today\'s ' + mins + ' minutes</button>';
    html += '<button type="button" class="ob-quiet" id="obGoHome">Go to home</button>';
    html += '</div></div>';

    root.innerHTML = html;

    var w = W();
    var st = w.document.getElementById('obStartToday');
    if (st) st.addEventListener('click', function () { closePanel(); startToday(); });
    var home = w.document.getElementById('obGoHome');
    if (home) home.addEventListener('click', function () {
      closePanel();
      if (typeof w.showScreen === 'function') { try { w.showScreen('startScreen'); } catch (_) {} }
      renderHero();
    });
  }

  function handleDiagnosticFinished(payload) {
    var profile = getProfile() || {};
    var exam = normExam(profile.exam || payload.examType || 'core1');
    var byObjective = byObjectiveFrom(payload.perQuestion);
    var result = compute({ exam: exam });

    writeStorage(STORAGE_KEYS.onboarding, {
      exam: exam,
      testDate: profile.testDate || null,
      minutesPerDay: Number(profile.minutesPerDay) || DEFAULT_MINUTES,
      completedAt: new Date().toISOString(),
      skippedAt: null,
      diagnostic: {
        scaledScore: payload.scaledScore,
        byObjective: byObjective
      }
    });

    track('diagnostic_completed', {
      exam: exam,
      scaledScore: payload.scaledScore,
      predicted: result.predicted,
      readiness: result.readiness,
      totalQuestions: payload.totalQuestions,
      weakest: (result.weakest || []).map(function (w) { return w.code; })
    });
    track('onboarding_completed', { exam: exam, readiness: result.readiness });
    clearDraft();
    markFirstValue('diagnostic_completed');

    renderSummary(result, payload);
    renderHero();
  }

  /* ------------------------------------------------------------------ *
   * Today's session
   * ------------------------------------------------------------------ */

  function srsDueIds() {
    var w = W();
    try {
      if (w && w.CompTIAMemorySRS && typeof w.CompTIAMemorySRS.getDueCards === 'function') {
        return (w.CompTIAMemorySRS.getDueCards(200) || []).map(function (c) { return c.id; });
      }
    } catch (err) {
      console.warn('[onboarding] SRS due lookup failed:', err);
    }
    return [];
  }

  function missedIds() {
    var ids = readStorage('missed', []);
    return Array.isArray(ids) ? ids : [];
  }

  function questionPool(exam) {
    var a = A();
    try {
      if (a && a.data && typeof a.data.getQuestions === 'function') {
        return a.data.getQuestions(exam === 'both' ? 'both' : exam) || [];
      }
    } catch (err) {
      console.warn('[onboarding] question pool unavailable:', err);
    }
    return [];
  }

  /**
   * APlus.onboarding.startToday()
   * N = round(minutesPerDay * 1.1), capped to the bank. 60% weak objectives plus
   * recent misses (SRS due cards first), 40% blueprint-weighted from the rest.
   * Timer = minutesPerDay.
   */
  function startToday() {
    var a = A();
    var w = W();
    var mins = minutesPerDay();
    var exam = profileExam();
    var pool = questionPool(exam);

    if (!pool.length) {
      console.warn('[onboarding] no question bank loaded; cannot start today\'s session.');
      return null;
    }

    var result = compute({ exam: exam });
    var weakKeys = (result.weakest || []).map(function (wk) { return statKey(wk.exam, wk.code); });

    var count = Math.min(Math.round(mins * 1.1), pool.length);
    var built = buildTodaySet({
      pool: pool,
      exam: exam,
      count: count,
      weakKeys: weakKeys,
      missedIds: missedIds(),
      dueIds: srsDueIds()
    });

    if (!built.questions.length) {
      console.warn('[onboarding] today plan produced no questions.');
      return null;
    }

    writeStorage(STORAGE_KEYS.todaySession, {
      date: todayISO(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      minutes: mins,
      count: built.questions.length,
      focusCount: built.focusCount,
      restCount: built.restCount,
      focus: weakKeys
    });
    writeStorage(STORAGE_KEYS.todayPending, true);
    track('today_session_started', {
      exam: exam, minutes: mins, count: built.questions.length,
      focusCount: built.focusCount, restCount: built.restCount
    });
    markFirstValue('today_session_started');

    var started = false;
    try {
      if (a && a.engine && typeof a.engine.start === 'function') {
        a.engine.start({
          type: 'domain',
          customPool: built.questions,
          domainKey: 'Today plan',
          questionCount: built.questions.length,
          timeMinutes: mins,
          mode: 'today'
        });
        started = true;
      }
    } catch (err) {
      console.warn('[onboarding] engine.start for today plan failed:', err);
    }
    if (!started && w && typeof w.startExam === 'function') {
      w.startExam(exam, built.questions.length, mins);
      started = true;
    }
    if (!started) writeStorage(STORAGE_KEYS.todayPending, false);

    return built;
  }

  function todayStatus() {
    var s = readStorage(STORAGE_KEYS.todaySession, null);
    var iso = todayISO();
    if (!s || s.date !== iso) return { date: iso, started: false, done: false };
    return { date: iso, started: true, done: Boolean(s.completedAt), minutes: s.minutes, count: s.count };
  }

  function handleTodayFinished(payload) {
    var s = readStorage(STORAGE_KEYS.todaySession, null) || {};
    s.date = s.date || todayISO();
    s.completedAt = new Date().toISOString();
    s.scaledScore = payload.scaledScore;
    writeStorage(STORAGE_KEYS.todaySession, s);
    writeStorage(STORAGE_KEYS.todayPending, false);
    track('today_session_completed', { scaledScore: payload.scaledScore, count: payload.totalQuestions });
  }

  /* ------------------------------------------------------------------ *
   * Bus wiring
   * ------------------------------------------------------------------ */

  function onExamFinished(payload) {
    if (!payload) return;

    // Always fold results into objective_stats, whatever the exam type was.
    try {
      var stats = readStorage(STORAGE_KEYS.objectiveStats, {}) || {};
      stats = accumulateStats(stats, payload.perQuestion, { examType: payload.examType });
      writeStorage(STORAGE_KEYS.objectiveStats, stats);
    } catch (err) {
      console.warn('[onboarding] could not update objective_stats:', err);
    }

    var wasDiagnostic = Boolean(readStorage(STORAGE_KEYS.diagnosticPending, false));
    var wasToday = Boolean(readStorage(STORAGE_KEYS.todayPending, false));

    if (wasToday) {
      writeStorage(STORAGE_KEYS.todayPending, false);
      try { handleTodayFinished(payload); } catch (err) { console.warn('[onboarding] today finish:', err); }
    }

    if (wasDiagnostic) {
      writeStorage(STORAGE_KEYS.diagnosticPending, false);
      try { handleDiagnosticFinished(payload); } catch (err) { console.warn('[onboarding] diagnostic finish:', err); }
    }

    renderHero();
  }

  function renderHero() {
    var a = A();
    try {
      if (a && a.readinessUI && typeof a.readinessUI.render === 'function') a.readinessUI.render();
    } catch (err) {
      console.warn('[onboarding] hero render failed:', err);
    }
  }

  function shouldShowOnboarding() {
    var p = getProfile();
    if (!p) return true;
    return !p.completedAt && !p.skippedAt;
  }

  function start(force) {
    injectStyles();
    ensureFirstSeen();
    ensureMount('readinessHero');
    ensureMount('todayPlanCard');
    if (!force && !shouldShowOnboarding()) {
      renderHero();
      return false;
    }
    var restored = restoreDraft();
    var p = getProfile();
    if (!restored && p) {
      state.draft.exam = normExam(p.exam || 'core1');
      state.draft.testDate = p.testDate || null;
      state.draft.notBooked = !p.testDate;
      state.draft.minutesPerDay = Number(p.minutesPerDay) || DEFAULT_MINUTES;
    }
    renderStep1();
    return true;
  }

  function reset() {
    writeStorage(STORAGE_KEYS.onboarding, null);
    writeStorage(STORAGE_KEYS.onboardingDraft, null);
    writeStorage(STORAGE_KEYS.diagnosticPending, false);
    writeStorage(STORAGE_KEYS.todayPending, false);
    writeStorage(STORAGE_KEYS.todaySession, null);
    state.draft = { exam: 'core1', testDate: null, notBooked: false, minutesPerDay: DEFAULT_MINUTES };
    state.busy = false;
    closePanel();
    return true;
  }

  function boot(w) {
    if (state.booted) return;
    state.booted = true;
    if (!w || !w.document) return;

    ensureFirstSeen();
    var a = w.APlus;

    if (a && a.bus && typeof a.bus.on === 'function') {
      a.bus.on('exam:finished', onExamFinished);
      a.bus.on('shell:ready', function () { safeStart(); });
    } else {
      console.warn('[onboarding] APlus.bus missing; running on DOM timers only.');
    }

    try {
      w.addEventListener('pagehide', function () {
        if (!state.shown) return;
        var p = getProfile();
        if (p && (p.completedAt || p.skippedAt)) return;
        persistDraft();
        track('funnel_abandon', { funnel: 'onboarding', exam: state.draft.exam });
      });
    } catch (_) {}

    if (a && typeof a.registerFeature === 'function') {
      try {
        a.registerFeature('onboarding', {
          version: '1.0.0',
          description: 'First-run diagnostic, readiness estimate, and daily plan',
          api: onboarding
        });
      } catch (err) {
        console.warn('[onboarding] registerFeature failed:', err);
      }
    }

    // Fallback if shell:ready never fires.
    var kick = function () { w.setTimeout(safeStart, 800); };
    if (w.document.readyState === 'loading') {
      w.document.addEventListener('DOMContentLoaded', kick);
    } else {
      kick();
    }
  }

  var startedOnce = false;
  var gateWaits = 0;

  // The shell first-run gate (#aplusBootGate) sits above everything at z-index
  // 10000 and emits shell:ready when it closes. The cinematic boot intro sits
  // even higher (12000). If our DOM-timer fallback fires while either is up,
  // wait rather than rendering underneath a blank stage.
  function bootGateVisible() {
    var w = W();
    if (!w || !w.document) return false;
    try {
      if (w.document.documentElement.classList.contains('boot-intro-active')) {
        return true;
      }
      var intro = w.document.getElementById('aplusBootIntro');
      if (intro && !intro.hidden && intro.classList.contains('is-active')) {
        return true;
      }
    } catch (_) {}
    var gate = w.document.getElementById('aplusBootGate');
    if (!gate || gate.hidden) return false;
    try {
      return w.getComputedStyle(gate).display !== 'none';
    } catch (_) {
      return true;
    }
  }

  function safeStart() {
    if (startedOnce) return;
    var w = W();
    if (bootGateVisible() && gateWaits < 40 && w) {
      gateWaits++;
      w.setTimeout(safeStart, 400);
      return;
    }
    startedOnce = true;
    try {
      start(false);
    } catch (err) {
      console.warn('[onboarding] start failed:', err);
    }
  }

  var onboarding = {
    VERSION: '1.0.0',
    STORAGE_KEYS: STORAGE_KEYS,
    start: start,
    startToday: startToday,
    reset: reset,
    todayStatus: todayStatus,
    getProfile: getProfile,
    minutesPerDay: minutesPerDay,
    profileExam: profileExam,
    passingLabel: passingLabel,
    buildTodaySet: buildTodaySet,
    ensureMount: ensureMount,
    injectStyles: injectStyles,
    _boot: boot,
    _onExamFinished: onExamFinished
  };

  return {
    readiness2: readiness2,
    onboarding: onboarding,
    buildTodaySet: buildTodaySet,
    accumulateStats: accumulateStats,
    compute: compute,
    pickWeakest: pickWeakest,
    BLUEPRINTS: BLUEPRINTS,
    PASSING: PASSING,
    STORAGE_KEYS: STORAGE_KEYS
  };
});
