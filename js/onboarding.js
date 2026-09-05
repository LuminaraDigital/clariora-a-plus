/**
 * CompTIA A+ Master Exam Simulator
 * onboarding.js - First-run diagnostic, readiness math (readiness2), and the daily plan builder.
 * File: js/onboarding.js
 *
 * Plain script, IIFE, no ES modules, file:// compatible.
 * Browser: attaches window.APlus.onboarding and window.APlus.readiness2
 * Node:    module.exports = { readiness2, buildTodaySet, accumulateStats, ... } for unit tests.
 *
 * Nothing in this file throws at load time. Every dependency (APlus.bus, APlus.storage,
 * APlus.engine, APlus.data, COMPTIA_OBJECTIVES_DATA, CompTIAMemorySRS, APlus.telemetry)
 * is treated as optional and guarded.
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
    w.APlus.readiness2 = api.readiness2;
    w.APlus.onboarding = api.onboarding;
    api.onboarding._boot(w);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */

  // Official CompTIA v15 blueprint weights (BUILD_SPEC.md).
  var BLUEPRINTS = {
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

  var PASSING = { core1: 675, core2: 700, both: 675 };

  // Domain title -> exam. Domain strings are unique across the two exams.
  var DOMAIN_TO_EXAM = {};
  Object.keys(BLUEPRINTS).forEach(function (exam) {
    BLUEPRINTS[exam].forEach(function (d) {
      DOMAIN_TO_EXAM[d.name.toLowerCase()] = exam;
    });
  });

  var HALF_LIFE_DAYS = 7;
  var HALF_LIFE_MS = HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;

  // Bayesian prior: each domain / objective is topped up to PRIOR_N observations
  // with pseudo-data at PRIOR_P accuracy. Once real (recency weighted) evidence
  // reaches PRIOR_N the prior contributes nothing, so a fully answered, fully
  // correct history reaches a true 900 rather than asymptotically approaching it.
  var PRIOR_N = 8;
  var PRIOR_P = 0.5;

  // Readiness logistic: 50% at the passing score, ~73% at passing + 60 points,
  // ~27% at passing - 60 points. Cleaner than a linear mapping because it never
  // clips oddly at the extremes and it is flat where a single exam cannot move you.
  var READINESS_SCALE = 60;

  /* ------------------------------------------------------------------ *
   * THE CANONICAL READINESS FORMULA (defined once, here, and nowhere else)
   * ------------------------------------------------------------------ *
   * Two independent estimators of the same thing, then one blend.
   *
   *   P_obj  = 100 + 800 * weightedAccuracy
   *            weightedAccuracy is the blueprint-weighted mean of each
   *            domain's posterior accuracy from objective_stats.
   *
   *   P_hist = sum(w_i * s_i) / sum(w_i)
   *            over the last 5 scaled scores for the target exam, NEWEST
   *            FIRST, with weights w = 5, 4, 3, 2, 1. A learner's most
   *            recent attempt is worth five times their fifth-most recent.
   *
   *   predicted =
   *      P_obj                      when there is no history for the exam
   *      P_hist                     when objective evidence is thin,
   *                                 i.e. effective observations < 8
   *      0.6 * P_obj + 0.4 * P_hist when both exist
   *      500                        when neither exists (a coin flip)
   *
   *   readiness = 100 / (1 + exp(-(predicted - passing) / 60))
   *               floored at 50 whenever predicted >= passing, so the ring
   *               can never contradict a caption that already clears the
   *               pass mark.
   *
   *   recent pass rate = passes / attempts over the last 10 attempts of
   *                      that exam, reported as "2 of 5 passed".
   *
   * Every surface in the app (home hero, mock cards, results analytics,
   * outcomes evidence, readiness banner) renders these numbers and only
   * these numbers.
   * ------------------------------------------------------------------ */
  var HISTORY_WEIGHTS = [5, 4, 3, 2, 1];
  var HISTORY_WINDOW = HISTORY_WEIGHTS.length;
  var THIN_OBSERVATIONS = 8;
  var OBJECTIVE_BLEND = 0.6;
  var PASS_RATE_WINDOW = 10;

  var STORAGE_KEYS = {
    onboarding: 'onboarding',
    objectiveStats: 'objective_stats',
    diagnosticPending: 'diagnostic_pending',
    todaySession: 'today_session',
    todayPending: 'today_session_pending'
  };

  var DEFAULT_MINUTES = 25;

  /* ------------------------------------------------------------------ *
   * Small helpers (pure)
   * ------------------------------------------------------------------ */

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function normExam(v) {
    var t = String(v || '').toLowerCase();
    if (t.indexOf('core2') >= 0 || t === 'c2' || t.indexOf('1202') >= 0 || t.indexOf('1102') >= 0) return 'core2';
    if (t.indexOf('both') >= 0 || t.indexOf('mixed') >= 0) return 'both';
    return 'core1';
  }

  function examForDomain(domain, fallbackExam) {
    var key = String(domain || '').toLowerCase().trim();
    if (DOMAIN_TO_EXAM[key]) return DOMAIN_TO_EXAM[key];
    var e = normExam(fallbackExam);
    return e === 'both' ? 'core1' : e;
  }

  function domainPrefixForCode(code) {
    var head = String(code || '').split('.')[0];
    if (!head) return '';
    return head + '.0';
  }

  function statKey(exam, code) { return exam + '|' + code; }

  function shuffle(arr, rng) {
    var r = typeof rng === 'function' ? rng : Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function decayFactor(lastUpdate, now) {
    if (!lastUpdate) return 1;
    var dt = now - lastUpdate;
    if (!(dt > 0)) return 1;
    return Math.pow(0.5, dt / HALF_LIFE_MS);
  }

  /* ------------------------------------------------------------------ *
   * Objective stats accumulation
   * ------------------------------------------------------------------ *
   * Shape of the 'objective_stats' storage value:
   * {
   *   "core1|2.4": {
   *     exam, code, domain,
   *     wCorrect, wTotal,      // recency weighted (decayed on every write)
   *     rawCorrect, rawTotal,  // lifetime counts, never decayed
   *     lastUpdate             // epoch ms
   *   }, ...
   * }
   */

  function accumulateStats(stats, perQuestion, opts) {
    var o = opts || {};
    var now = typeof o.now === 'number' ? o.now : Date.now();
    var out = stats && typeof stats === 'object' ? stats : {};
    if (!Array.isArray(perQuestion)) return out;

    perQuestion.forEach(function (pq) {
      if (!pq) return;
      var code = String(pq.objective || '').trim();
      if (!code) return;
      var exam = examForDomain(pq.domain, pq.exam || o.examType);
      var key = statKey(exam, code);
      var rec = out[key];
      if (!rec) {
        rec = out[key] = {
          exam: exam, code: code, domain: pq.domain || '',
          wCorrect: 0, wTotal: 0, rawCorrect: 0, rawTotal: 0, lastUpdate: now
        };
      }
      // Decay whatever is already banked up to "now", then add this observation
      // at full weight. Accuracy is unchanged by decay; only its confidence fades.
      var d = decayFactor(rec.lastUpdate, now);
      rec.wCorrect = rec.wCorrect * d + (pq.correct ? 1 : 0);
      rec.wTotal = rec.wTotal * d + 1;
      rec.rawCorrect += pq.correct ? 1 : 0;
      rec.rawTotal += 1;
      rec.lastUpdate = now;
      if (pq.domain) rec.domain = pq.domain;
    });

    return out;
  }

  /* ------------------------------------------------------------------ *
   * readiness2: pure readiness math
   * ------------------------------------------------------------------ */

  function posterior(effCorrect, effTotal, priorN) {
    var k = Math.max(0, (typeof priorN === 'number' ? priorN : PRIOR_N) - effTotal);
    var denom = effTotal + k;
    if (denom <= 0) return PRIOR_P;
    return (effCorrect + k * PRIOR_P) / denom;
  }

  function objectiveCatalog(explicit) {
    if (Array.isArray(explicit)) return explicit;
    var g = (typeof window === 'object' && window) ? window : null;
    var data = g && g.COMPTIA_OBJECTIVES_DATA;
    if (!data || !Array.isArray(data.objectives)) return [];
    return data.objectives.map(function (o) {
      return {
        exam: normExam(o.exam) === 'core2' ? 'core2' : 'core1',
        code: String(o.code || ''),
        title: String(o.title || ''),
        domain: String(o.domain || '')
      };
    });
  }

  function titleFor(catalog, exam, code) {
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].exam === exam && catalog[i].code === code) return catalog[i].title;
    }
    return '';
  }

  function weightForCode(exam, code) {
    var bp = BLUEPRINTS[exam] || [];
    var prefix = domainPrefixForCode(code);
    for (var i = 0; i < bp.length; i++) {
      if (bp[i].prefix === prefix) return bp[i].weight;
    }
    return 0;
  }

  function domainNameForCode(exam, code) {
    var bp = BLUEPRINTS[exam] || [];
    var prefix = domainPrefixForCode(code);
    for (var i = 0; i < bp.length; i++) {
      if (bp[i].prefix === prefix) return bp[i].name;
    }
    return '';
  }

  /**
   * computeExam(stats, exam, now, priorN) -> per-exam accuracy roll-up.
   */
  function computeExam(stats, exam, now, priorN) {
    var bp = BLUEPRINTS[exam] || [];
    var buckets = {};
    bp.forEach(function (d) { buckets[d.prefix] = { correct: 0, total: 0 }; });

    var effByKey = {};
    var attempts = 0;

    Object.keys(stats || {}).forEach(function (key) {
      var rec = stats[key];
      if (!rec || rec.exam !== exam) return;
      var d = decayFactor(rec.lastUpdate, now);
      var effCorrect = (rec.wCorrect || 0) * d;
      var effTotal = (rec.wTotal || 0) * d;
      effByKey[key] = { rec: rec, effCorrect: effCorrect, effTotal: effTotal };
      attempts += rec.rawTotal || 0;
      var prefix = domainPrefixForCode(rec.code);
      if (buckets[prefix]) {
        buckets[prefix].correct += effCorrect;
        buckets[prefix].total += effTotal;
      }
    });

    var wsum = 0, acc = 0;
    var domains = bp.map(function (d) {
      var b = buckets[d.prefix];
      var a = posterior(b.correct, b.total, priorN);
      wsum += d.weight;
      acc += d.weight * a;
      return { prefix: d.prefix, name: d.name, weight: d.weight, accuracy: a, observations: b.total };
    });

    return {
      exam: exam,
      weightedAccuracy: wsum > 0 ? acc / wsum : PRIOR_P,
      domains: domains,
      effByKey: effByKey,
      attempts: attempts
    };
  }

  function pickWeakest(effByKeyList, opts) {
    var o = opts || {};
    var catalog = objectiveCatalog(o.catalog);
    var limit = o.limit || 3;
    var minAttempts = typeof o.minAttempts === 'number' ? o.minAttempts : 2;
    var priorN = o.prior;

    var candidates = [];
    effByKeyList.forEach(function (entry) {
      var rec = entry.rec;
      if ((rec.rawTotal || 0) < minAttempts) return;
      candidates.push({
        exam: rec.exam,
        code: rec.code,
        title: titleFor(catalog, rec.exam, rec.code),
        domain: rec.domain || domainNameForCode(rec.exam, rec.code),
        accuracy: posterior(entry.effCorrect, entry.effTotal, priorN),
        attempts: rec.rawTotal || 0,
        weight: weightForCode(rec.exam, rec.code),
        attempted: true
      });
    });

    candidates.sort(function (a, b) {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      if (a.weight !== b.weight) return b.weight - a.weight;    // heavier domain first
      return a.code < b.code ? -1 : (a.code > b.code ? 1 : 0);
    });

    var picked = candidates.slice(0, limit);
    if (picked.length >= limit) return picked;

    // Fill with never-attempted objectives from the heaviest domains.
    var seen = {};
    effByKeyList.forEach(function (e) { seen[statKey(e.rec.exam, e.rec.code)] = true; });
    picked.forEach(function (p) { seen[statKey(p.exam, p.code)] = true; });

    var examFilter = o.exams || null;
    var fill = catalog.filter(function (c) {
      if (examFilter && examFilter.indexOf(c.exam) < 0) return false;
      return !seen[statKey(c.exam, c.code)];
    }).map(function (c) {
      return {
        exam: c.exam, code: c.code, title: c.title,
        domain: c.domain || domainNameForCode(c.exam, c.code),
        accuracy: PRIOR_P, attempts: 0,
        weight: weightForCode(c.exam, c.code),
        attempted: false
      };
    });

    fill.sort(function (a, b) {
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.code < b.code ? -1 : (a.code > b.code ? 1 : 0);
    });

    return picked.concat(fill.slice(0, limit - picked.length));
  }

  /* ------------------------------------------------------------------ *
   * History side of the canonical formula
   * ------------------------------------------------------------------ */

  /**
   * Canonical history read. There is exactly one reader in the app and this
   * is the call to it. Never parse localStorage history here.
   */
  function readCanonicalHistory() {
    var w = W();
    try {
      if (w && w.APlus && w.APlus.learner && typeof w.APlus.learner.getHistory === 'function') {
        var rows = w.APlus.learner.getHistory();
        return Array.isArray(rows) ? rows : [];
      }
    } catch (err) {
      console.warn('[onboarding] canonical history read failed:', err);
    }
    return [];
  }

  /** Attempts that count toward `exam`, newest first. 'both' matches everything. */
  function historyForExam(history, exam) {
    var e = normExam(exam);
    return (Array.isArray(history) ? history : []).filter(function (r) {
      if (!r || typeof r.scaledScore !== 'number' || !isFinite(r.scaledScore)) return false;
      if (e === 'both') return true;
      return r.examType === e || r.examType === 'both';
    });
  }

  /**
   * P_hist: recency weighted mean of the last 5 scaled scores, newest first,
   * weights 5, 4, 3, 2, 1. Returns null when there is nothing to weight.
   */
  function historyPredicted(history, exam) {
    var rows = historyForExam(history, exam).slice(0, HISTORY_WINDOW);
    if (!rows.length) return { predicted: null, count: 0, scores: [] };
    var wsum = 0;
    var acc = 0;
    var scores = [];
    rows.forEach(function (r, i) {
      var w = HISTORY_WEIGHTS[i];
      wsum += w;
      acc += w * r.scaledScore;
      scores.push(r.scaledScore);
    });
    return { predicted: acc / wsum, count: rows.length, scores: scores };
  }

  /** Recent pass rate over the last 10 attempts of that exam. */
  function passRateFor(history, exam) {
    var rows = historyForExam(history, exam).slice(0, PASS_RATE_WINDOW);
    var passes = rows.filter(function (r) { return r.passed === true; }).length;
    return { passes: passes, attempts: rows.length };
  }

  /**
   * readiness2.compute(options)
   *
   * options = {
   *   stats:   objective_stats map (default: read from APlus.storage)
   *   history: normalised attempts, newest first (default: APlus.learner.getHistory)
   *   exam:    'core1' | 'core2' | 'both'   (default 'core1')
   *   now:     epoch ms (default Date.now())
   *   catalog: [{exam, code, title, domain}] (default window.COMPTIA_OBJECTIVES_DATA)
   *   prior:   pseudo-observation count (default 8; pass 0 to disable shrinkage)
   * }
   *
   * Returns { exam, passing, predicted, readiness, weightedAccuracy, attempts,
   *           domains, weakest:[{code,title,domain,exam,accuracy,attempts}], parts }
   *
   * predicted = round(100 + 800 * weightedAccuracy), where weightedAccuracy is the
   * blueprint-domain-weighted mean of each domain's posterior accuracy. Each domain
   * is topped up to `prior` observations with 50%-accurate pseudo-data, so a thin
   * sample is pulled toward a coin-flip and a thick sample is left alone.
   *
   * readiness = 100 / (1 + exp(-(predicted - passing) / 60)), rounded and clamped 0..100.
   */
  function compute(options) {
    var o = options || {};
    var now = typeof o.now === 'number' ? o.now : Date.now();
    var priorN = typeof o.prior === 'number' ? o.prior : PRIOR_N;
    var stats = o.stats;
    if (!stats) stats = readStorage(STORAGE_KEYS.objectiveStats, {}) || {};
    var exam = normExam(o.exam || 'core1');

    var examList = exam === 'both' ? ['core1', 'core2'] : [exam];
    var parts = examList.map(function (e) { return computeExam(stats, e, now, priorN); });

    var weightedAccuracy = parts.reduce(function (a, p) { return a + p.weightedAccuracy; }, 0) / parts.length;
    var attempts = parts.reduce(function (a, p) { return a + p.attempts; }, 0);
    var passing = PASSING[exam] || 675;

    // Effective (recency decayed) observations behind the objective estimate.
    var observations = 0;
    parts.forEach(function (p) {
      p.domains.forEach(function (d) { observations += d.observations || 0; });
    });

    var history = Array.isArray(o.history) ? o.history : readCanonicalHistory();
    var examHistory = historyForExam(history, exam);
    var hist = historyPredicted(history, exam);
    var passRate = passRateFor(history, exam);

    // --- the canonical blend, documented at the top of this file ---
    var predictedObjective = 100 + 800 * weightedAccuracy;
    var predictedHistory = hist.predicted;
    var predicted;
    var source;
    if (predictedHistory === null) {
      predicted = predictedObjective;
      source = observations > 0 ? 'objectives' : 'none';
    } else if (observations < THIN_OBSERVATIONS) {
      predicted = predictedHistory;
      source = 'history';
    } else {
      predicted = OBJECTIVE_BLEND * predictedObjective + (1 - OBJECTIVE_BLEND) * predictedHistory;
      source = 'blend';
    }
    predicted = Math.round(clamp(predicted, 100, 900));

    var readiness = Math.round(100 / (1 + Math.exp(-(predicted - passing) / READINESS_SCALE)));
    // A prediction at or above the pass mark can never read as under half ready.
    if (predicted >= passing) readiness = Math.max(50, readiness);
    readiness = clamp(readiness, 0, 100);

    var hasData = observations > 0 || examHistory.length > 0;
    var lastAttempt = examHistory.length ? examHistory[0].scaledScore : null;

    var effList = [];
    parts.forEach(function (p) {
      Object.keys(p.effByKey).forEach(function (k) { effList.push(p.effByKey[k]); });
    });

    var weakest = pickWeakest(effList, {
      catalog: o.catalog,
      limit: o.weakestLimit || 3,
      prior: priorN,
      exams: examList
    });

    var domains = [];
    parts.forEach(function (p) {
      p.domains.forEach(function (d) { domains.push({ exam: p.exam, prefix: d.prefix, name: d.name, weight: d.weight, accuracy: d.accuracy, observations: d.observations }); });
    });

    return {
      exam: exam,
      passing: passing,
      predicted: predicted,
      readiness: readiness,
      weightedAccuracy: weightedAccuracy,
      attempts: attempts,
      source: source,
      hasData: hasData,
      observations: observations,
      predictedObjective: Math.round(clamp(predictedObjective, 100, 900)),
      predictedHistory: predictedHistory === null ? null : Math.round(predictedHistory),
      historyAttempts: examHistory.length,
      historyScores: hist.scores,
      lastAttempt: lastAttempt,
      passes: passRate.passes,
      passAttempts: passRate.attempts,
      passRate: passRate,
      domains: domains,
      weakest: weakest,
      parts: parts.map(function (p) {
        return { exam: p.exam, weightedAccuracy: p.weightedAccuracy, attempts: p.attempts, passing: PASSING[p.exam] };
      })
    };
  }

  /* ------------------------------------------------------------------ *
   * Pure formatters
   * ------------------------------------------------------------------ *
   * Every surface renders a compute() result through these, so the hero, the
   * mock cards, the results analytics panel, the outcomes panel and the
   * readiness banner cannot drift apart. Strings only, no DOM, no storage.
   */

  function scoreText(value) {
    if (value === null || value === undefined || !isFinite(Number(value))) return '--';
    return String(Math.round(Number(value)));
  }

  function percentText(value) {
    if (value === null || value === undefined || !isFinite(Number(value))) return '--';
    return Math.round(Number(value)) + '%';
  }

  /** "2 of 5 passed" - never a bare percentage. */
  function passRateText(result) {
    var passes = result && result.passRate ? result.passRate.passes : 0;
    var attempts = result && result.passRate ? result.passRate.attempts : 0;
    if (!attempts) return 'No attempts yet';
    return passes + ' of ' + attempts + ' passed';
  }

  function statusText(result) {
    if (!result || !result.hasData) return 'No attempts yet';
    if (result.readiness >= 75) return 'Ready to book';
    if (result.readiness >= 50) return 'Close';
    return 'Not ready';
  }

  function lastAttemptText(result) {
    if (!result || result.lastAttempt === null || result.lastAttempt === undefined) return '';
    return 'Last attempt ' + scoreText(result.lastAttempt);
  }

  /** One object every renderer reads from. Identical numbers by construction. */
  function summary(result) {
    var r = result || {};
    return {
      exam: r.exam || 'core1',
      passing: r.passing === undefined ? null : r.passing,
      hasData: Boolean(r.hasData),
      predicted: r.hasData ? r.predicted : null,
      predictedText: r.hasData ? scoreText(r.predicted) : '--',
      readiness: r.hasData ? r.readiness : null,
      readinessText: r.hasData ? percentText(r.readiness) : '--',
      statusText: statusText(r),
      passes: r.passRate ? r.passRate.passes : 0,
      passAttempts: r.passRate ? r.passRate.attempts : 0,
      passRateText: passRateText(r),
      lastAttempt: r.lastAttempt === undefined ? null : r.lastAttempt,
      lastAttemptText: lastAttemptText(r),
      source: r.source || 'none',
      band: band(r),
      confidenceText: confidenceText(r)
    };
  }

  /**
   * band(result)
   * The likely range around the predicted score, from the binomial standard
   * error of the observed accuracy: se = sqrt(p(1-p)/n), score = 100 + 800p.
   * Few observations give a wide band; the band tightens as n grows. Attempt
   * history counts toward n at 90 answers per recorded exam, since a recorded
   * attempt is itself a sample of the same skill.
   */
  function band(result) {
    var r = result || {};
    if (!r.hasData || !isFinite(r.predicted)) return null;
    var n = Math.max(0, Number(r.observations) || 0) + 90 * Math.max(0, Number(r.historyAttempts) || 0);
    if (n < 1) return null;
    var p = clamp(((Number(r.predicted) || 100) - 100) / 800, 0.02, 0.98);
    var se = Math.sqrt(p * (1 - p) / n);
    var half = Math.max(15, Math.round(800 * 1.96 * se));
    return {
      low: Math.round(clamp(r.predicted - half, 100, 900)),
      high: Math.round(clamp(r.predicted + half, 100, 900)),
      n: Math.round(n),
      thin: n < 60,
      source: r.source || 'none'
    };
  }

  /** One plain sentence about how much the estimate should be trusted. */
  function confidenceText(result) {
    var b = band(result);
    if (!b) return '';
    var answers = b.n === 1 ? '1 answer' : b.n + ' answers';
    if (b.thin) return 'Early estimate from ' + answers + '. It tightens as you practise.';
    if (b.source === 'history') return 'Based on your recorded attempts (' + answers + ').';
    return 'Based on ' + answers + ' across objectives and attempts.';
  }

  var format = {
    band: band,
    confidenceText: confidenceText,
    scoreText: scoreText,
    percentText: percentText,
    passRateText: passRateText,
    statusText: statusText,
    lastAttemptText: lastAttemptText,
    summary: summary
  };

  var readiness2 = {
    BLUEPRINTS: BLUEPRINTS,
    PASSING: PASSING,
    HALF_LIFE_DAYS: HALF_LIFE_DAYS,
    PRIOR_N: PRIOR_N,
    READINESS_SCALE: READINESS_SCALE,
    HISTORY_WEIGHTS: HISTORY_WEIGHTS,
    THIN_OBSERVATIONS: THIN_OBSERVATIONS,
    OBJECTIVE_BLEND: OBJECTIVE_BLEND,
    PASS_RATE_WINDOW: PASS_RATE_WINDOW,
    compute: compute,
    accumulate: accumulateStats,
    posterior: posterior,
    examForDomain: examForDomain,
    statKey: statKey,
    readHistory: readCanonicalHistory,
    historyForExam: historyForExam,
    historyPredicted: historyPredicted,
    passRateFor: passRateFor,
    format: format
  };

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

  var STYLE_ID = 'onboardingStyles_v425';
  var STYLES = [
    '#onboardingRoot .ob-overlay{position:fixed;inset:0;z-index:9000;',
    'overflow-y:auto;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,560px);',
    'background:var(--bg-primary,#050505);padding:0;}',
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
    draft: { exam: 'core1', testDate: null, notBooked: false, minutesPerDay: DEFAULT_MINUTES }
  };

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
      (d.notBooked ? ' disabled' : '') + '>';
    html += '<label class="ob-check"><input type="checkbox" id="obNotBooked"' + (d.notBooked ? ' checked' : '') +
      '> Not booked yet</label></div></div>';

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
      });
    }

    var dateEl = byId('obTestDate');
    if (dateEl) dateEl.addEventListener('change', function () { state.draft.testDate = dateEl.value || null; });

    var nb = byId('obNotBooked');
    if (nb) {
      nb.addEventListener('change', function () {
        state.draft.notBooked = Boolean(nb.checked);
        if (dateEl) {
          dateEl.disabled = state.draft.notBooked;
          if (state.draft.notBooked) { dateEl.value = ''; state.draft.testDate = null; }
        }
      });
    }

    var go = byId('obStartDiagnostic');
    if (go) go.addEventListener('click', function () { startDiagnostic(); });

    var skip = byId('obSkip');
    if (skip) skip.addEventListener('click', function () { skipOnboarding(); });

    track('onboarding_shown', {});
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
    track('onboarding_skipped', { exam: d.exam });
    closePanel();
    renderHero();
  }

  function startDiagnostic() {
    var d = state.draft;
    var a = A();

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
    track('diagnostic_started', { exam: d.exam, minutesPerDay: d.minutesPerDay });

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
      var w = W();
      if (w && typeof w.startExam === 'function') {
        w.startExam(d.exam, 20, 20);
        started = true;
      }
    }
    if (!started) {
      console.warn('[onboarding] no exam engine available; diagnostic could not start.');
      writeStorage(STORAGE_KEYS.diagnosticPending, false);
      renderStep1();
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
    ensureMount('readinessHero');
    ensureMount('todayPlanCard');
    if (!force && !shouldShowOnboarding()) {
      renderHero();
      return false;
    }
    var p = getProfile();
    if (p) {
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
    writeStorage(STORAGE_KEYS.diagnosticPending, false);
    writeStorage(STORAGE_KEYS.todayPending, false);
    writeStorage(STORAGE_KEYS.todaySession, null);
    state.draft = { exam: 'core1', testDate: null, notBooked: false, minutesPerDay: DEFAULT_MINUTES };
    closePanel();
    return true;
  }

  function boot(w) {
    if (state.booted) return;
    state.booted = true;
    if (!w || !w.document) return;

    var a = w.APlus;

    if (a && a.bus && typeof a.bus.on === 'function') {
      a.bus.on('exam:finished', onExamFinished);
      a.bus.on('shell:ready', function () { safeStart(); });
    } else {
      console.warn('[onboarding] APlus.bus missing; running on DOM timers only.');
    }

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
