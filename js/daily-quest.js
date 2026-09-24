/**
 * daily-quest.js - Unify Memory Raid + today's plan + kaizen 3Q into one home habit.
 *
 * Behind APLUS_FEATURES_CONFIG.gamification.enabled (or ?ff_daily_quest=1).
 * Ledger remains reward authority via claimDailyQuest / existing leg blocks.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var api = factory();
    root.APlus = root.APlus || {};
    root.APlus.dailyQuest = api;
    if (typeof root.APlus.registerFeature === 'function') {
      try {
        root.APlus.registerFeature('dailyQuest', {
          description: 'Daily Quest home checklist',
          api: api
        });
      } catch (_) {}
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var PLAN_KEY = 'aplus3_daily_quest_plan_v1';
  var shownTracked = false;

  function W() {
    return typeof window !== 'undefined' ? window : null;
  }

  function A() {
    var w = W();
    return (w && w.APlus) || null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function localDayKey() {
    try {
      if (W() && W().CompTIALedger && typeof CompTIALedger.localDayKey === 'function') {
        return CompTIALedger.localDayKey();
      }
    } catch (_) {}
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function urlFlagOn() {
    try {
      var w = W();
      if (!w || !w.location || !w.location.search) return false;
      return /(?:\?|&)ff_daily_quest=1(?:&|$)/.test(w.location.search);
    } catch (_) {
      return false;
    }
  }

  function isEnabled() {
    if (urlFlagOn()) return true;
    try {
      var cfg = (W() && W().APLUS_FEATURES_CONFIG) || {};
      var g = cfg.gamification || {};
      return g.enabled === true && g.showHomeQuest !== false;
    } catch (_) {
      return false;
    }
  }

  function awardBonusEnabled() {
    try {
      var cfg = (W() && W().APLUS_FEATURES_CONFIG) || {};
      var g = cfg.gamification || {};
      return g.awardQuestBonus !== false;
    } catch (_) {
      return true;
    }
  }

  function track(name, props) {
    try {
      var a = A();
      if (a && a.telemetry && typeof a.telemetry.track === 'function') {
        a.telemetry.track(name, props || {});
      }
    } catch (_) {}
  }

  function storageGet(key, fallback) {
    try {
      var a = A();
      if (a && a.storage && typeof a.storage.get === 'function') {
        return a.storage.get(key, fallback);
      }
    } catch (_) {}
    try {
      var raw = W() && W().localStorage && W().localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      var a = A();
      if (a && a.storage && typeof a.storage.set === 'function') {
        a.storage.set(key, value);
        return;
      }
    } catch (_) {}
    try {
      if (W() && W().localStorage) {
        W().localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_) {}
  }

  function loadPlan() {
    var day = localDayKey();
    var plan = storageGet(PLAN_KEY, null);
    if (!plan || plan.day !== day) {
      plan = {
        day: day,
        legs: { defend: false, attack: false, recover: false },
        defendSkipped: false,
        dueAtStart: null,
        claimed: false
      };
      storageSet(PLAN_KEY, plan);
    }
    return plan;
  }

  /**
   * Writing emits storage:changed, which re-renders this card and re-syncs the plan.
   * Only write on a real change, or that cycle loops and starves the database flush.
   */
  function savePlan(plan) {
    var next = JSON.stringify(plan);
    if (JSON.stringify(storageGet(PLAN_KEY, null)) === next) return plan;
    storageSet(PLAN_KEY, plan);
    return plan;
  }

  function dueCount() {
    try {
      if (W() && W().CompTIAMemorySRS && typeof CompTIAMemorySRS.getStats === 'function') {
        var st = CompTIAMemorySRS.getStats();
        if (st && typeof st.due === 'number') return st.due;
        if (st && typeof st.dueCount === 'number') return st.dueCount;
      }
      if (W() && W().CompTIAMemorySRS && typeof CompTIAMemorySRS.getDueCards === 'function') {
        var cards = CompTIAMemorySRS.getDueCards() || [];
        return cards.length;
      }
    } catch (_) {}
    return 0;
  }

  function raidClaimedToday() {
    try {
      if (W() && W().CompTIAMemorySRS && typeof CompTIAMemorySRS.raidClaimedToday === 'function') {
        return !!CompTIAMemorySRS.raidClaimedToday();
      }
    } catch (_) {}
    return false;
  }

  function todayPlanDone() {
    try {
      var a = A();
      if (a && a.onboarding && typeof a.onboarding.todayStatus === 'function') {
        var st = a.onboarding.todayStatus();
        return !!(st && st.done);
      }
    } catch (_) {}
    return false;
  }

  function ensureDefendSnapshot(plan) {
    if (plan.dueAtStart === null || plan.dueAtStart === undefined) {
      plan.dueAtStart = dueCount();
      if (plan.dueAtStart === 0) {
        plan.defendSkipped = true;
        plan.legs.defend = true;
      }
      savePlan(plan);
    }
    return plan;
  }

  function syncLegsFromWorld(plan) {
    plan = ensureDefendSnapshot(plan);
    if (!plan.legs.defend) {
      if (raidClaimedToday() || (plan.defendSkipped && plan.dueAtStart === 0)) {
        plan.legs.defend = true;
      }
    }
    if (!plan.legs.attack && todayPlanDone()) {
      plan.legs.attack = true;
    }
    savePlan(plan);
    return plan;
  }

  function markLeg(legId, meta) {
    meta = meta || {};
    var plan = loadPlan();
    plan = syncLegsFromWorld(plan);
    if (legId === 'defend' || legId === 'attack' || legId === 'recover') {
      if (!plan.legs[legId]) {
        plan.legs[legId] = true;
        if (legId === 'defend' && meta.skipped) plan.defendSkipped = true;
        savePlan(plan);
        track('daily_quest_leg_complete', { leg: legId });
        try {
          var a = A();
          if (a && a.bus && typeof a.bus.emit === 'function') {
            a.bus.emit('daily_quest:leg', { leg: legId });
          }
        } catch (_) {}
      }
    }
    return getTodayStatus();
  }

  function progressOf(legs) {
    var n = 0;
    if (legs.defend) n += 1;
    if (legs.attack) n += 1;
    if (legs.recover) n += 1;
    return n;
  }

  function getTodayStatus() {
    var plan = syncLegsFromWorld(loadPlan());
    var streak = 0;
    var streakFrozen = false;
    try {
      if (A() && A().streak) {
        var s = A().streak.get ? A().streak.get() : null;
        if (s) {
          streak = s.streak || 0;
          streakFrozen = !!s.streakFrozen;
        }
      }
    } catch (_) {}
    var progress = progressOf(plan.legs);
    var allComplete = progress >= 3;
    return {
      day: plan.day,
      legs: {
        defend: !!plan.legs.defend,
        attack: !!plan.legs.attack,
        recover: !!plan.legs.recover
      },
      progress: progress,
      allComplete: allComplete,
      claimable: allComplete && !plan.claimed && awardBonusEnabled(),
      claimed: !!plan.claimed,
      defendSkipped: !!plan.defendSkipped,
      dueAtStart: plan.dueAtStart,
      streak: streak,
      streakFrozen: streakFrozen,
      enabled: isEnabled()
    };
  }

  function claimAllCompleteBonus() {
    var status = getTodayStatus();
    if (!status.allComplete) {
      return Promise.resolve({ skipped: true, reason: 'incomplete' });
    }
    if (status.claimed) {
      return Promise.resolve({ skipped: true, reason: 'already_claimed' });
    }
    if (!awardBonusEnabled()) {
      return Promise.resolve({ skipped: true, reason: 'bonus_disabled' });
    }
    var L = W() && W().CompTIALedger;
    if (!L || typeof L.claimDailyQuest !== 'function') {
      return Promise.resolve({ skipped: true, reason: 'no_ledger' });
    }
    return L.claimDailyQuest({
      day: status.day,
      legs: status.legs,
      defendSkipped: status.defendSkipped
    }).then(function (out) {
      if (out && !out.skipped) {
        var plan = loadPlan();
        plan.claimed = true;
        savePlan(plan);
        track('daily_quest_all_complete', {
          streak: status.streak,
          defendSkipped: !!status.defendSkipped
        });
        try {
          if (W().CompTIALedgerUI && typeof CompTIALedgerUI.refreshWalletBadge === 'function') {
            CompTIALedgerUI.refreshWalletBadge();
          }
          if (A() && A().streak && typeof A().streak.invalidate === 'function') {
            A().streak.invalidate();
          }
        } catch (_) {}
      }
      return out;
    });
  }

  function nextLeg(status) {
    if (!status.legs.defend) return 'defend';
    if (!status.legs.attack) return 'attack';
    if (!status.legs.recover) return 'recover';
    return null;
  }

  function startPrimary(ctx) {
    ctx = ctx || {};
    var status = getTodayStatus();
    var cold = !!ctx.cold;
    var a = A();
    if (cold && a && a.onboarding && typeof a.onboarding.start === 'function') {
      a.onboarding.start(true);
      return { action: 'diagnostic' };
    }
    var leg = nextLeg(status);
    if (!leg) {
      claimAllCompleteBonus().then(function (out) {
        refresh();
        try {
          if (out && !out.skipped && W().CompTIALedgerUI && CompTIALedgerUI.toast) {
            CompTIALedgerUI.toast('Daily quest complete (+' + (out.apx || 0) + ' APX)');
          }
        } catch (_) {}
      });
      return { action: 'claim' };
    }
    if (leg === 'defend') {
      try {
        if (typeof W().startMemoryRaid === 'function') W().startMemoryRaid();
        else if (W().CompTIAMemoryMode && CompTIAMemoryMode.startMemoryRaid) {
          CompTIAMemoryMode.startMemoryRaid();
        }
      } catch (_) {}
      return { action: 'defend' };
    }
    if (leg === 'attack') {
      if (a && a.onboarding && typeof a.onboarding.startToday === 'function') {
        a.onboarding.startToday();
      }
      return { action: 'attack' };
    }
    if (leg === 'recover') {
      startKaizenSession();
      return { action: 'recover' };
    }
    return { action: 'none' };
  }

  function startKaizenSession() {
    var a = A();
    var bank = [];
    try {
      if (a && a.engineCore && typeof a.engineCore.getAllQuestions === 'function') {
        bank = a.engineCore.getAllQuestions() || [];
      } else if (W().QUESTIONS) bank = W().QUESTIONS;
      else if (a && a.questions) bank = a.questions;
    } catch (_) {}
    var picks = [];
    try {
      if (a && a.mastery && typeof a.mastery.getDailyKaizenQuestions === 'function') {
        picks = a.mastery.getDailyKaizenQuestions(bank) || [];
      }
    } catch (_) {}
    if (!picks.length) {
      markLeg('recover');
      refresh();
      return;
    }
    try {
      if (typeof W().startExam === 'function') {
        // Lightweight path: open a short drill if the engine supports id list;
        // otherwise mark recover when session finishes via bus hook.
        W()._dailyQuestKaizenIds = picks.map(function (q) { return q && q.id; }).filter(Boolean);
        if (typeof W().startCustomDrill === 'function') {
          W().startCustomDrill(picks, { source: 'daily_quest_kaizen', count: picks.length });
        } else if (a && a.engine && typeof a.engine.startWithQuestions === 'function') {
          a.engine.startWithQuestions(picks, { mode: 'kaizen', minutes: 10 });
        } else {
          // Fallback: run a tiny both-exam subset size 3
          W().startExam('both', Math.min(3, picks.length), 10);
        }
      }
    } catch (err) {
      console.warn('[daily-quest] kaizen start failed', err);
      markLeg('recover');
    }
  }

  function buildChecklist(status) {
    status = status || getTodayStatus();
    function row(id, title, hint, done) {
      return {
        id: id,
        title: title,
        hint: hint,
        done: !!done
      };
    }
    return [
      row(
        'defend',
        'Defend',
        status.defendSkipped ? 'No cards due. Cleared.' : 'Flashcard recall (Memory Raid)',
        status.legs.defend
      ),
      row('attack', 'Attack', "Complete today's study set", status.legs.attack),
      row('recover', 'Recover', 'Three missed-item refresher questions', status.legs.recover)
    ];
  }

  function primaryLabel(status, ctx) {
    ctx = ctx || {};
    if (ctx.cold) return 'Take the 20-question diagnostic';
    if (status.claimed) return 'Quest complete. Start another session';
    if (status.claimable) return 'Claim daily quest bonus';
    var leg = nextLeg(status);
    if (leg === 'defend') return status.defendSkipped ? 'Continue quest' : 'Start flashcard session';
    if (leg === 'attack') {
      var mins = 25;
      try {
        if (A() && A().onboarding && A().onboarding.minutesPerDay) {
          mins = A().onboarding.minutesPerDay() || 25;
        }
      } catch (_) {}
      return "Start today's " + mins + ' minutes';
    }
    if (leg === 'recover') return 'Start 3-question refresher';
    return "Start today's plan";
  }

  function renderInto(el, ctx) {
    if (!el) return null;
    ctx = ctx || {};
    if (!isEnabled()) return null;

    var status = getTodayStatus();
    if (!shownTracked) {
      shownTracked = true;
      track('daily_quest_shown', { day: status.day });
    }

    var cold = !!ctx.cold;
    var checklist = buildChecklist(status);
    var label = primaryLabel(status, { cold: cold });
    var cls;
    if (cold) cls = 'btn tp-secondary';
    else if (status.claimed) cls = 'btn btn-secondary tp-primary';
    else cls = 'btn btn-primary-lg tp-primary';

    var html = '';
    html += '<div class="daily-quest" data-daily-quest="1">';
    html += '<div class="dq-head"><span class="label">Daily quest</span>';
    html += '<span class="dq-progress" aria-live="polite">' + status.progress + ' / 3</span></div>';

    if (status.streakFrozen && status.streak > 0) {
      html += '<p class="dq-note">Study streak paused at ' + status.streak +
        ' days. Study today to keep it.</p>';
      track('streak_soft_freeze', { streak: status.streak });
    }

    html += '<ul class="dq-legs" role="list">';
    checklist.forEach(function (item) {
      var markSvg = item.done
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:-1px;"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:-1px;"><circle cx="12" cy="12" r="9"/></svg>';
      html += '<li class="dq-leg' + (item.done ? ' is-done' : '') + '"' +
        (item.done ? ' aria-current="true"' : '') + '>';
      html += '<span class="dq-mark" aria-hidden="true">' + markSvg + '</span>';
      html += '<span class="dq-text"><strong>' + esc(item.title) + '</strong> ';
      html += '<span class="dq-hint">' + esc(item.hint) + '</span></span></li>';
    });
    html += '</ul>';

    html += '<button type="button" class="' + cls + '" id="todayPlanStartBtn">' + esc(label) + '</button>';
    if (cold) {
      html += '<span class="tp-note">Best after the diagnostic</span>';
    }
    html += '</div>';

    // Preserve focus items + activity strip from readiness-ui if provided
    if (ctx.focusHtml) html += ctx.focusHtml;
    if (ctx.stripHtml) html += ctx.stripHtml;

    el.innerHTML = html;

    var btn = el.querySelector('#todayPlanStartBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        track('gamification_cta_clicked', { surface: 'home' });
        startPrimary({ cold: cold });
        setTimeout(refresh, 400);
      });
    }
    return status;
  }

  function refresh() {
    var el = W() && W().document && W().document.getElementById('todayPlanCard');
    if (!el || !isEnabled()) return;
    // Re-render via readiness-ui when available so focus/strip stay consistent
    try {
      if (A() && A().readinessUI && typeof A().readinessUI.refresh === 'function') {
        A().readinessUI.refresh();
        return;
      }
    } catch (_) {}
    renderInto(el, {});
  }

  function wireBus() {
    var a = A();
    if (!a || !a.bus || typeof a.bus.on !== 'function') return;
    a.bus.on('exam:finished', function (payload) {
      payload = payload || {};
      var plan = loadPlan();
      // Kaizen / short recover sessions
      if (payload.source === 'daily_quest_kaizen' || payload.mode === 'kaizen' ||
          (W() && W()._dailyQuestKaizenIds)) {
        markLeg('recover');
        try { if (W()) W()._dailyQuestKaizenIds = null; } catch (_) {}
      }
      // Today plan completion often emits exam:finished; sync attack from onboarding
      syncLegsFromWorld(plan);
      if (todayPlanDone()) markLeg('attack');
      refresh();
    });
    a.bus.on('memory:raid:complete', function () {
      markLeg('defend');
      refresh();
    });
    a.bus.on('storage:changed', function (payload) {
      var key = payload && payload.key ? String(payload.key) : '';
      if (key.indexOf(PLAN_KEY) !== -1) return;
      refresh();
    });
    a.bus.on('shell:ready', function () {
      refresh();
    });
  }

  function _boot() {
    wireBus();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _boot);
    } else {
      _boot();
    }
  }

  return {
    VERSION: VERSION,
    isEnabled: isEnabled,
    getTodayStatus: getTodayStatus,
    markLeg: markLeg,
    claimAllCompleteBonus: claimAllCompleteBonus,
    buildChecklist: buildChecklist,
    renderInto: renderInto,
    startPrimary: startPrimary,
    refresh: refresh,
    _boot: _boot,
    PLAN_KEY: PLAN_KEY
  };
});
