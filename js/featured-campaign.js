/**
 * featured-campaign.js - One Learn → Quiz → Claim objective campaign on Practice home.
 *
 * Additive: reuses readiness2 weakest, assessment packs, study library, APX ledger.
 * No new currency. Retries allowed. No scarcity timers.
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
    w.APlus.featuredCampaign = api;
    if (typeof w.APlus.registerFeature === 'function') {
      try {
        w.APlus.registerFeature('featuredCampaign', {
          description: 'Featured objective campaign (Learn → Quiz → Claim)',
          api: api
        });
      } catch (_) {}
    }
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          api.init();
        });
      } else {
        setTimeout(function () {
          api.init();
        }, 0);
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var STATE_KEY = 'aplus3_featured_campaign_v1';
  var HOST_ID = 'featuredCampaignCard';
  var PASS_THRESHOLD = 70;
  var QUIZ_FALLBACK_MIN_POOL = 5;
  var wired = false;
  var lastRendered = '';

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

  function urlFlagOn() {
    try {
      var w = W();
      if (!w || !w.location || !w.location.search) return false;
      return /(?:\?|&)ff_featured_campaign=1(?:&|$)/.test(w.location.search);
    } catch (_) {
      return false;
    }
  }

  function cfg() {
    try {
      var c = (W() && W().APLUS_FEATURES_CONFIG) || {};
      return c.featuredCampaign || {};
    } catch (_) {
      return {};
    }
  }

  function todayMissionCfg() {
    try {
      var c = (W() && W().APLUS_FEATURES_CONFIG) || {};
      return c.todayMission || {};
    } catch (_) {
      return {};
    }
  }

  function todayMissionUrlOn() {
    try {
      var w = W();
      if (!w || !w.location || !w.location.search) return false;
      return /(?:\?|&)ff_today_mission=1(?:&|$)/.test(w.location.search);
    } catch (_) {
      return false;
    }
  }

  function todayMissionEnabled() {
    if (todayMissionUrlOn()) return true;
    var tm = todayMissionCfg();
    return tm.enabled === true;
  }

  function isEnabled() {
    if (urlFlagOn()) return true;
    if (todayMissionEnabled() && todayMissionCfg().showOnPracticeHome !== false) {
      // Today Mission rides the Featured Campaign spine when its own flag is on.
      return cfg().enabled !== false;
    }
    return cfg().enabled === true;
  }

  function showOnHome() {
    if (todayMissionEnabled()) return todayMissionCfg().showOnPracticeHome !== false;
    return cfg().showOnPracticeHome !== false;
  }

  function demoteFlag() {
    if (todayMissionEnabled()) {
      var tm = todayMissionCfg();
      if (tm.demoteCompetingCtAs === false) return false;
      return true;
    }
    return cfg().demoteCompetingCtAs !== false;
  }

  function awardClaimBonus() {
    if (todayMissionEnabled() && todayMissionCfg().awardClaimBonus === false) return false;
    return cfg().awardClaimBonus !== false;
  }

  function keepReadinessPath() {
    if (!todayMissionEnabled()) return false;
    return todayMissionCfg().keepReadinessPath !== false;
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

  function profileExam() {
    try {
      var a = A();
      if (a && a.onboarding && typeof a.onboarding.profileExam === 'function') {
        var ex = a.onboarding.profileExam();
        if (ex === 'core1' || ex === 'core2' || ex === 'az900' || ex === 'az500') return ex;
      }
    } catch (_) {}
    try {
      var sel = W() && W().document && W().document.getElementById('certTrackSelect');
      if (sel && sel.value) return String(sel.value);
    } catch (_) {}
    return 'core1';
  }

  function estimateMinutes(pack) {
    if (pack && typeof pack.estimated_minutes === 'number') return pack.estimated_minutes;
    var n = (pack && pack.question_count) || 10;
    return Math.max(8, Math.ceil((n * 75) / 60) + 4);
  }

  function claimApxHint(bestPercent) {
    var pct = typeof bestPercent === 'number' ? bestPercent : 70;
    return Math.min(20, 10 + Math.floor(pct / 20));
  }

  function libraryDocs() {
    var w = W();
    if (w && w.COMPTIA_STUDY_LIBRARY && Array.isArray(w.COMPTIA_STUDY_LIBRARY.documents)) {
      return w.COMPTIA_STUDY_LIBRARY.documents;
    }
    return [];
  }

  function resolveStudyDoc(exam, objectiveCode, domain, title) {
    var docs = libraryDocs();
    var code = String(objectiveCode || '').trim();
    var domainLc = String(domain || '').toLowerCase();
    var titleLc = String(title || '').toLowerCase();
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      if (!d || !d.id) continue;
      var dex = String(d.exam || 'both');
      if (dex !== 'both' && exam && dex !== exam && exam !== 'both') continue;
      var hay = ((d.title || '') + ' ' + (d.domain || '') + ' ' + (d.excerpt || '') + ' ' + String(d.content || '').slice(0, 800)).toLowerCase();
      var score = 0;
      if (code && hay.indexOf(code.toLowerCase()) >= 0) score += 5;
      if (domainLc && hay.indexOf(domainLc.slice(0, 12)) >= 0) score += 2;
      if (titleLc) {
        var parts = titleLc.split(/\s+/).filter(function (p) {
          return p.length > 3;
        });
        for (var p = 0; p < parts.length && p < 4; p++) {
          if (hay.indexOf(parts[p]) >= 0) score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best) return best.id;
    for (var j = 0; j < docs.length; j++) {
      var d2 = docs[j];
      if (!d2) continue;
      var e2 = String(d2.exam || 'both');
      if (e2 === exam || e2 === 'both') return d2.id;
    }
    return docs[0] ? docs[0].id : null;
  }

  function listPacks(exam) {
    var a = A();
    if (a && a.assessmentPacks && typeof a.assessmentPacks.list === 'function') {
      return a.assessmentPacks.list({ exam: exam }) || [];
    }
    var outline =
      (W() && W().COMPTIA_CURRICULUM_OUTLINE) ||
      null;
    if (!outline || !Array.isArray(outline.assessments)) return [];
    return outline.assessments.filter(function (p) {
      return !exam || exam === 'all' || p.exam === exam;
    });
  }

  function packHasCode(pack, code) {
    if (!pack || !code) return false;
    var codes = Array.isArray(pack.objective_codes) ? pack.objective_codes : [];
    for (var i = 0; i < codes.length; i++) {
      var c = String(codes[i]);
      if (c === code || c.indexOf(code + '.') === 0 || code.indexOf(c + '.') === 0) return true;
    }
    return false;
  }

  function resolvePack(exam, objectiveCode, domain) {
    var packs = listPacks(exam);
    var code = String(objectiveCode || '');
    var domainLc = String(domain || '').toLowerCase();
    var lesson = null;
    var moduleQuiz = null;
    var domainHit = null;
    for (var i = 0; i < packs.length; i++) {
      var p = packs[i];
      if (packHasCode(p, code)) {
        if (p.kind === 'lesson_review' && !lesson) lesson = p;
        else if (p.kind === 'module_quiz' && !moduleQuiz) moduleQuiz = p;
        else if (!lesson && !moduleQuiz) lesson = p;
      }
      if (
        !domainHit &&
        domainLc &&
        String(p.domain || '')
          .toLowerCase()
          .indexOf(domainLc.slice(0, 8)) >= 0
      ) {
        domainHit = p;
      }
    }
    return lesson || moduleQuiz || domainHit || packs[0] || null;
  }

  function pickWeakest(exam) {
    try {
      var a = A();
      if (a && a.readiness2 && typeof a.readiness2.compute === 'function') {
        var r = a.readiness2.compute({ exam: exam, weakestLimit: 5 });
        if (r && Array.isArray(r.weakest) && r.weakest[0]) {
          var w0 = r.weakest[0];
          return {
            code: String(w0.code || w0.objective || ''),
            title: String(w0.title || w0.code || 'Weak objective'),
            domain: String(w0.domain || ''),
            exam: String(w0.exam || exam)
          };
        }
      }
    } catch (_) {}
    return null;
  }

  function coldStartObjective(exam) {
    var packs = listPacks(exam);
    for (var i = 0; i < packs.length; i++) {
      var p = packs[i];
      if (p && Array.isArray(p.objective_codes) && p.objective_codes[0]) {
        return {
          code: String(p.objective_codes[0]),
          title: String(p.title || p.objective_codes[0]),
          domain: String(p.domain || ''),
          exam: String(p.exam || exam)
        };
      }
    }
    return {
      code: exam === 'core2' ? '1.1' : '2.1',
      title: 'Foundational objectives',
      domain: exam === 'core2' ? '1.0 Operating systems' : '2.0 Networking',
      exam: exam
    };
  }

  function selectCampaign(options) {
    options = options || {};
    var exam = options.exam || profileExam();
    if (exam === 'both') exam = 'core1';
    var weak = options.weak || pickWeakest(exam) || coldStartObjective(exam);
    var pack = resolvePack(exam, weak.code, weak.domain);
    var studyDocId = resolveStudyDoc(exam, weak.code, weak.domain, weak.title);
    var day = options.day || localDayKey();
    var campaignId =
      'foc-' +
      String(exam) +
      '-' +
      String(weak.code || 'x').replace(/[^a-zA-Z0-9._-]/g, '_') +
      '-' +
      day;
    return {
      day: day,
      campaignId: campaignId,
      exam: exam,
      objectiveCode: weak.code,
      title: weak.title || weak.code,
      domain: weak.domain || '',
      studyDocId: studyDocId,
      packId: pack ? pack.id : null,
      packTitle: pack ? pack.title : null,
      estimatedMinutes: estimateMinutes(pack),
      claimApxHint: claimApxHint(70),
      steps: {
        learn: { done: false, at: null },
        quiz: { done: false, at: null, attempts: 0, bestPercent: null, lastAssessmentId: null },
        claim: { done: false, at: null, ledgerBlockIndex: null }
      },
      claimPending: false,
      claimed: false,
      version: 1
    };
  }

  function emptySteps() {
    return {
      learn: { done: false, at: null },
      quiz: { done: false, at: null, attempts: 0, bestPercent: null, lastAssessmentId: null },
      claim: { done: false, at: null, ledgerBlockIndex: null }
    };
  }

  function getState() {
    var day = localDayKey();
    var st = storageGet(STATE_KEY, null);
    if (!st || st.day !== day || !st.campaignId) {
      st = selectCampaign({ day: day });
      storageSet(STATE_KEY, st);
    }
    if (!st.steps) st.steps = emptySteps();
    return st;
  }

  function saveState(st) {
    var next = JSON.stringify(st);
    if (JSON.stringify(storageGet(STATE_KEY, null)) === next) return st;
    storageSet(STATE_KEY, st);
    return st;
  }

  function isActive() {
    if (!isEnabled() || !showOnHome()) return false;
    var st = getState();
    return !!(st && st.campaignId && !st.claimed);
  }

  function shouldDemoteCompetitors() {
    return isEnabled() && demoteFlag() && isActive();
  }

  function shouldDemotePathStrip() {
    // Today Mission keeps the 7-day path visible beside the single mission CTA.
    if (keepReadinessPath()) return false;
    return shouldDemoteCompetitors();
  }

  function shouldDemoteTinyWin() {
    if (todayMissionEnabled() && todayMissionCfg().foldTinyWin === false) return false;
    return shouldDemoteCompetitors();
  }

  function applyDemote() {
    if (!shouldDemoteCompetitors()) return;
    if (shouldDemoteTinyWin()) {
      try {
        var tw = W() && W().document && W().document.getElementById('tinyWinCard');
        if (tw) {
          tw.hidden = true;
          tw.setAttribute('aria-hidden', 'true');
          tw.innerHTML = '';
        }
      } catch (_) {}
    }
    if (shouldDemotePathStrip()) {
      try {
        var path = W() && W().document && W().document.getElementById('readinessPathStrip');
        if (path) {
          path.hidden = true;
          path.setAttribute('aria-hidden', 'true');
          path.innerHTML = '';
        }
      } catch (_) {}
    }
    // Soften competing today-plan primary when mission owns the CTA.
    try {
      var plan = W() && W().document && W().document.getElementById('todayPlanCard');
      if (plan && todayMissionEnabled()) {
        plan.classList.add('is-mission-demoted');
      }
    } catch (_) {}
  }

  function questFoldHtml() {
    if (!todayMissionEnabled() || todayMissionCfg().foldDailyQuest === false) return '';
    try {
      var dq = A() && A().dailyQuest;
      if (!dq || typeof dq.getTodayStatus !== 'function') return '';
      var st = dq.getTodayStatus();
      if (!st || !st.enabled) return '';
      var p = typeof st.progress === 'number' ? st.progress : 0;
      return (
        '<p class="foc-quest-fold">Daily habit legs: ' +
        p +
        '/3' +
        (st.allComplete ? ' complete' : ' in progress') +
        '. Mission Learn/Quiz still counts toward Attack when you finish a scored set.</p>'
      );
    } catch (_) {
      return '';
    }
  }

  function readinessFoldHtml() {
    if (!todayMissionEnabled()) return '';
    try {
      var a = A();
      if (!a || !a.readiness2 || typeof a.readiness2.compute !== 'function') return '';
      var history = [];
      if (a.learner && typeof a.learner.getHistory === 'function') {
        history = a.learner.getHistory() || [];
      }
      var r = a.readiness2.compute({ history: history });
      if (!r || r.predicted == null) return '';
      var pred = Math.round(r.predicted);
      var pct = r.readiness != null ? Math.round(r.readiness) : null;
      return (
        '<p class="foc-readiness-fold">Predicted score ' +
        pred +
        (pct != null ? ' · readiness ' + pct + '%' : '') +
        '. APX is evidence of study, not the goal.</p>'
      );
    } catch (_) {
      return '';
    }
  }

  function markLearn(meta) {
    var st = getState();
    if (!st.steps.learn.done) {
      st.steps.learn.done = true;
      st.steps.learn.at = new Date().toISOString();
      if (meta && meta.studyOpenSkipped) st.steps.learn.studyOpenSkipped = true;
      saveState(st);
      track('featured_campaign_learn_done', { campaignId: st.campaignId });
    }
    mount();
    return st;
  }

  function quizQualifies(bestPercent, packId) {
    if (typeof bestPercent === 'number' && bestPercent >= PASS_THRESHOLD) return true;
    try {
      var a = A();
      if (a && a.assessmentPacks && typeof a.assessmentPacks.find === 'function') {
        var pack = a.assessmentPacks.find(packId);
        if (pack && a.assessmentPacks.filterPool) {
          var pool = a.assessmentPacks.filterPool(pack) || [];
          if (pool.length < QUIZ_FALLBACK_MIN_POOL && typeof bestPercent === 'number') return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function markQuiz(payload) {
    payload = payload || {};
    var st = getState();
    var pct =
      typeof payload.percent === 'number'
        ? payload.percent
        : typeof payload.bestPercent === 'number'
          ? payload.bestPercent
          : null;
    st.steps.quiz.attempts = (st.steps.quiz.attempts || 0) + 1;
    st.steps.quiz.lastAssessmentId = payload.id || payload.assessmentId || st.packId;
    if (typeof pct === 'number') {
      if (typeof st.steps.quiz.bestPercent !== 'number' || pct > st.steps.quiz.bestPercent) {
        st.steps.quiz.bestPercent = pct;
      }
    }
    var best = st.steps.quiz.bestPercent;
    if (quizQualifies(best, st.packId)) {
      st.steps.quiz.done = true;
      st.steps.quiz.at = new Date().toISOString();
      if (!st.claimed) {
        st.claimPending = true;
        st.claimApxHint = claimApxHint(best);
        try {
          var rc = A() && A().rewardCenter;
          if (rc && typeof rc.upsertPending === 'function') {
            rc.upsertPending({
              id: 'foc-' + st.campaignId,
              kind: 'featured_objective',
              title: st.title,
              apxHint: st.claimApxHint,
              meta: {
                day: st.day,
                campaignId: st.campaignId,
                exam: st.exam,
                objectiveCode: st.objectiveCode,
                bestPercent: best,
                attempts: st.steps.quiz.attempts
              }
            });
          }
        } catch (_) {}
      }
    }
    saveState(st);
    track('featured_campaign_quiz_update', {
      campaignId: st.campaignId,
      bestPercent: best,
      done: st.steps.quiz.done
    });
    mount();
    return st;
  }

  function markClaimed(result) {
    var st = getState();
    st.claimPending = false;
    st.claimed = true;
    st.steps.claim.done = true;
    st.steps.claim.at = new Date().toISOString();
    if (result && result.block && typeof result.block.index === 'number') {
      st.steps.claim.ledgerBlockIndex = result.block.index;
    }
    saveState(st);
    track('featured_campaign_claimed', {
      campaignId: st.campaignId,
      apx: result && result.apx
    });
    mount();
    return st;
  }

  function startLearn() {
    var st = getState();
    var docId = st.studyDocId;
    track('featured_campaign_learn_start', { campaignId: st.campaignId, docId: docId });
    try {
      if (docId && typeof W().showStudyDocument === 'function') {
        W().showStudyDocument(docId);
      } else if (typeof W().openStudyLibrary === 'function') {
        W().openStudyLibrary();
      } else {
        var a = A();
        if (a && a.studyhub && typeof a.studyhub.open === 'function') a.studyhub.open();
      }
    } catch (_) {}
    try {
      if (docId && W().CompTIALedgerUI && typeof CompTIALedgerUI.onStudyOpen === 'function') {
        CompTIALedgerUI.onStudyOpen({ id: docId, title: st.title });
      }
    } catch (_) {}
    markLearn({});
    return st;
  }

  function startQuiz() {
    var st = getState();
    if (!st.steps.learn.done) {
      // Soft gate: allow quiz but nudge learn first via mount labels.
    }
    track('featured_campaign_quiz_start', { campaignId: st.campaignId, packId: st.packId });
    try {
      var a = A();
      if (st.packId && a && a.assessmentPacks && typeof a.assessmentPacks.start === 'function') {
        a.assessmentPacks.start(st.packId);
        return st;
      }
    } catch (_) {}
    try {
      if (typeof W().startExam === 'function') {
        W().startExam(st.exam === 'both' ? 'core1' : st.exam, 15, 15, 'practice');
      }
    } catch (_) {}
    return st;
  }

  function inApxHoldout() {
    try {
      var h = A() && A().apxHoldout;
      return !!(h && typeof h.isHoldout === 'function' && h.isHoldout());
    } catch (_) {
      return false;
    }
  }

  function openClaim() {
    if (inApxHoldout()) return;
    try {
      var rc = A() && A().rewardCenter;
      if (rc && typeof rc.open === 'function') {
        rc.open();
        return;
      }
    } catch (_) {}
    try {
      if (typeof W().openApxSurface === 'function') W().openApxSurface();
      else if (typeof W().openLedgerModal === 'function') W().openLedgerModal();
    } catch (_) {}
  }

  function stepClass(done, current) {
    if (done) return 'is-done';
    if (current) return 'is-current';
    return 'is-todo';
  }

  function renderCard(st) {
    var learnDone = !!(st.steps && st.steps.learn && st.steps.learn.done);
    var quizDone = !!(st.steps && st.steps.quiz && st.steps.quiz.done);
    var claimDone = !!(st.claimed || (st.steps && st.steps.claim && st.steps.claim.done));
    var current = !learnDone ? 'learn' : !quizDone ? 'quiz' : !claimDone ? 'claim' : 'done';
    var mins = st.estimatedMinutes || 12;
    var apx = st.claimApxHint || claimApxHint(st.steps.quiz.bestPercent || 70);
    var best =
      typeof st.steps.quiz.bestPercent === 'number' ? Math.round(st.steps.quiz.bestPercent) + '%' : 'n/a';
    // Use ASCII hyphen for "up to" line; avoid em dash in UI copy.
    var metaLine =
      'Earn up to ' + apx + ' APX · about ' + mins + ' min · ' + esc(st.objectiveCode || '');

    var primaryLabel = 'Start Learn step';
    var primaryAction = 'learn';
    if (current === 'quiz') {
      primaryLabel = learnDone ? 'Start Quiz' : 'Start Quiz (Learn first recommended)';
      primaryAction = 'quiz';
    } else if (current === 'claim') {
      if (inApxHoldout()) {
        primaryLabel = 'Mission practice complete';
        primaryAction = 'done';
      } else {
        primaryLabel = 'Claim reward';
        primaryAction = 'claim';
      }
    } else if (current === 'done') {
      primaryLabel = todayMissionEnabled() ? 'Mission complete' : 'Campaign complete';
      primaryAction = 'done';
    }

    var kicker = todayMissionEnabled() ? "Today's Mission" : 'Featured campaign';
    var stepsLabel = todayMissionEnabled() ? 'Mission steps' : 'Campaign steps';
    var html = '';
    html += '<div class="foc-inner' + (todayMissionEnabled() ? ' foc-today-mission' : '') + '">';
    html += '<div class="foc-head">';
    html += '<span class="foc-kicker">' + esc(kicker) + '</span>';
    html += '<span class="foc-meta">' + metaLine + '</span>';
    html += '</div>';
    html += '<h3 class="foc-title">' + esc(st.title || st.objectiveCode) + '</h3>';
    if (st.domain) html += '<p class="foc-domain">' + esc(st.domain) + '</p>';
    html += readinessFoldHtml();
    html += questFoldHtml();
    html += '<ol class="foc-steps" aria-label="' + esc(stepsLabel) + '">';
    html +=
      '<li class="foc-step ' +
      stepClass(learnDone, current === 'learn') +
      '"><span class="foc-step-n">1</span><span class="foc-step-label">Learn</span></li>';
    html +=
      '<li class="foc-step ' +
      stepClass(quizDone, current === 'quiz') +
      '"><span class="foc-step-n">2</span><span class="foc-step-label">Quiz</span></li>';
    html +=
      '<li class="foc-step ' +
      stepClass(claimDone, current === 'claim' || current === 'done') +
      '"><span class="foc-step-n">3</span><span class="foc-step-label">Claim</span></li>';
    html += '</ol>';
    if (quizDone && !claimDone) {
      html +=
        '<p class="foc-note">Best quiz: ' +
        esc(best) +
        '. Open Achievement Wallet to claim your mission bonus.</p>';
    } else if (!quizDone && typeof st.steps.quiz.attempts === 'number' && st.steps.quiz.attempts > 0) {
      html +=
        '<p class="foc-note">Attempts: ' +
        st.steps.quiz.attempts +
        ' · best ' +
        esc(best) +
        ' (need ' +
        PASS_THRESHOLD +
        '%). Retries welcome.</p>';
    }
    html += '<div class="foc-actions">';
    if (primaryAction !== 'done') {
      html +=
        '<button type="button" class="btn btn-primary foc-primary" data-foc-action="' +
        primaryAction +
        '">' +
        esc(primaryLabel) +
        '</button>';
    } else {
      html +=
        '<span class="foc-complete">' +
        (todayMissionEnabled() ? 'Mission complete for today.' : 'All steps complete for today.') +
        '</span>';
    }
    if (current === 'quiz' || current === 'claim') {
      html +=
        '<button type="button" class="btn btn-secondary foc-secondary" data-foc-action="learn">Reopen Learn</button>';
    }
    if (current === 'claim' || (quizDone && !claimDone)) {
      html +=
        '<button type="button" class="btn btn-secondary foc-secondary" data-foc-action="quiz">Retry Quiz</button>';
    }
    html += '</div></div>';
    return html;
  }

  function bindActions(host, st) {
    var buttons = host.querySelectorAll('[data-foc-action]');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.getAttribute('data-foc-action');
          if (act === 'learn') startLearn();
          else if (act === 'quiz') startQuiz();
          else if (act === 'claim') openClaim();
        });
      })(buttons[i]);
    }
  }

  function mount() {
    var host = W() && W().document && W().document.getElementById(HOST_ID);
    if (!host) return false;
    if (!isEnabled() || !showOnHome()) {
      host.hidden = true;
      host.innerHTML = '';
      lastRendered = '';
      return false;
    }
    var st = getState();
    host.hidden = false;
    host.removeAttribute('aria-hidden');
    var html = renderCard(st);
    if (html !== lastRendered) {
      host.innerHTML = html;
      lastRendered = html;
      bindActions(host, st);
      track('featured_campaign_shown', { campaignId: st.campaignId, claimed: !!st.claimed });
      if (todayMissionEnabled()) {
        track('today_mission_shown', {
          campaignId: st.campaignId,
          foldedQuest: todayMissionCfg().foldDailyQuest !== false,
          foldedTinyWin: todayMissionCfg().foldTinyWin !== false,
          claimed: !!st.claimed
        });
      }
    }
    applyDemote();
    return true;
  }

  function onAssessmentFinished(payload) {
    if (!isEnabled() || !payload) return;
    var st = getState();
    var id = payload.id || payload.assessmentId || payload.domainKey;
    if (!st.packId || !id) return;
    if (String(id) !== String(st.packId)) return;
    markQuiz({
      id: id,
      percent: typeof payload.percent === 'number' ? payload.percent : payload.bestPercent,
      bestPercent: payload.bestPercent
    });
  }

  function onExamFinished(payload) {
    if (!isEnabled() || !payload) return;
    // Packs emit assessment:finished after exam:finished. Ignore assessment exams here
    // so markQuiz is not double-counted.
    if (payload.examType === 'assessment') return;
    var key = payload.domainKey || payload.assessmentId;
    if (key && (String(key).indexOf('assess-') === 0 || String(key).indexOf('exam-practice-') === 0)) {
      return;
    }
    var st = getState();
    if (!st.packId || !key) return;
    if (String(key) !== String(st.packId)) return;
    var pct = null;
    if (typeof payload.rawCorrect === 'number' && payload.totalQuestions) {
      pct = Math.round((payload.rawCorrect / payload.totalQuestions) * 1000) / 10;
    } else if (typeof payload.scaledScore === 'number') {
      pct = Math.min(100, Math.round((payload.scaledScore / 900) * 1000) / 10);
    }
    markQuiz({ id: key, percent: pct });
  }

  function wire() {
    if (wired) return;
    wired = true;
    try {
      var a = A();
      if (a && a.bus && typeof a.bus.on === 'function') {
        a.bus.on('assessment:finished', onAssessmentFinished);
        a.bus.on('exam:finished', onExamFinished);
        a.bus.on('home:tab', function () {
          mount();
        });
      }
    } catch (_) {}
    try {
      var w = W();
      if (w && typeof w.addEventListener === 'function') {
        w.addEventListener('storage:changed', function (ev) {
          try {
            var key = (ev && ev.detail && ev.detail.key) || '';
            if (String(key).indexOf(STATE_KEY) !== -1) return;
          } catch (_) {}
          mount();
        });
      }
    } catch (_) {}
  }

  function init() {
    if (!isEnabled()) return;
    wire();
    mount();
  }

  function refresh() {
    return mount();
  }

  return {
    VERSION: VERSION,
    STATE_KEY: STATE_KEY,
    PASS_THRESHOLD: PASS_THRESHOLD,
    isEnabled: isEnabled,
    selectCampaign: selectCampaign,
    getState: getState,
    markLearn: markLearn,
    markQuiz: markQuiz,
    markClaimed: markClaimed,
    isActive: isActive,
    shouldDemoteCompetitors: shouldDemoteCompetitors,
    shouldDemotePathStrip: shouldDemotePathStrip,
    shouldDemoteTinyWin: shouldDemoteTinyWin,
    todayMissionEnabled: todayMissionEnabled,
    startLearn: startLearn,
    startQuiz: startQuiz,
    openClaim: openClaim,
    mount: mount,
    refresh: refresh,
    init: init,
    claimApxHint: claimApxHint,
    resolvePack: resolvePack,
    resolveStudyDoc: resolveStudyDoc,
    awardClaimBonus: awardClaimBonus
  };
});
