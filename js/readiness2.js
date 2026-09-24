/**
 * readiness2.js - Canonical readiness math + objective_stats accumulation.
 * Extracted from onboarding.js (SSOT for predicted score / readiness %).
 *
 * Browser: attaches window.APlus.readiness2 and window.APlus._readinessShared
 * Node:    module.exports = { readiness2, BLUEPRINTS, PASSING, ... }
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
    w.APlus._readinessShared = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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
    onboardingDraft: 'onboarding_draft',
    objectiveStats: 'objective_stats',
    diagnosticPending: 'diagnostic_pending',
    todaySession: 'today_session',
    todayPending: 'today_session_pending',
    firstSeenAt: 'first_seen_at',
    firstValueAt: 'first_value_at'
  };

  var DEFAULT_MINUTES = 25;

  /* ------------------------------------------------------------------ *
   * Small helpers (pure)
   * ------------------------------------------------------------------ */

  function clamp(v, lo, hi) {
    var ap = (typeof window !== 'undefined' && window.APlus) ? window.APlus : null;
    if (ap && ap.utils && typeof ap.utils.clamp === 'function') {
      return ap.utils.clamp(v, lo, hi);
    }
    return Math.min(hi, Math.max(lo, v));
  }

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
    var ap = (typeof window !== 'undefined' && window.APlus) ? window.APlus : null;
    if (!rng && ap && ap.utils && typeof ap.utils.shuffleArray === 'function') {
      return ap.utils.shuffleArray(arr);
    }
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

  function W() { return (typeof window === 'object' && window) ? window : null; }
  function A() { var w = W(); return (w && w.APlus) || null; }

  function readStorage(key, fallback) {
    var a = A();
    try {
      if (a && a.storage && typeof a.storage.get === 'function') return a.storage.get(key, fallback);
    } catch (err) {
      console.warn('[readiness2] storage read failed for "' + key + '":', err);
    }
    return fallback;
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

  /** True for attempts scored against the miskeyed bank shipped before 3.1.3. */
  function isStaleAttempt(record) {
    var a = A();
    try {
      if (a && a.bankIntegrity && typeof a.bankIntegrity.isStale === 'function') {
        return a.bankIntegrity.isStale(record);
      }
    } catch (err) {
      console.warn('[onboarding] bank integrity check failed:', err);
    }
    return false;
  }

  /**
   * Attempts that count toward `exam`, newest first. 'both' matches everything.
   * Attempts finished before the bank correction are left out: they were scored
   * against questions with the wrong answer keyed, so their scaled scores say
   * nothing about the learner. They stay visible in the history table.
   */
  function historyForExam(history, exam) {
    var e = normExam(exam);
    return (Array.isArray(history) ? history : []).filter(function (r) {
      if (!r || typeof r.scaledScore !== 'number' || !isFinite(r.scaledScore)) return false;
      if (isStaleAttempt(r)) return false;
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

  return {
    readiness2: readiness2,
    BLUEPRINTS: BLUEPRINTS,
    PASSING: PASSING,
    DOMAIN_TO_EXAM: DOMAIN_TO_EXAM,
    HALF_LIFE_DAYS: HALF_LIFE_DAYS,
    HALF_LIFE_MS: HALF_LIFE_MS,
    PRIOR_N: PRIOR_N,
    PRIOR_P: PRIOR_P,
    READINESS_SCALE: READINESS_SCALE,
    HISTORY_WEIGHTS: HISTORY_WEIGHTS,
    THIN_OBSERVATIONS: THIN_OBSERVATIONS,
    OBJECTIVE_BLEND: OBJECTIVE_BLEND,
    PASS_RATE_WINDOW: PASS_RATE_WINDOW,
    STORAGE_KEYS: STORAGE_KEYS,
    DEFAULT_MINUTES: DEFAULT_MINUTES,
    clamp: clamp,
    normExam: normExam,
    examForDomain: examForDomain,
    domainPrefixForCode: domainPrefixForCode,
    statKey: statKey,
    shuffle: shuffle,
    decayFactor: decayFactor,
    accumulateStats: accumulateStats,
    compute: compute,
    pickWeakest: pickWeakest
  };
});
