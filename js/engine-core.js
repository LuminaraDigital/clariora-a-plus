/**
 * Clariora Exam Simulator v3.0.0
 * engine-core.js - Pure algorithmic logic (Sampling, Scoring, Option Shuffle Remap, SM-2)
 * File: js/engine-core.js
 * PURE LOGIC: Zero DOM references. Requireable from Node.js and Browser.
 */

(function(root, factory) {
  const instance = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = instance;
  }
  if (typeof root === 'object' && root) {
    root.APlus = root.APlus || {};
    root.APlus.engineCore = instance;
  }
  if (typeof window === 'object' && window) {
    window.APlus = window.APlus || {};
    window.APlus.engineCore = instance;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  /**
   * Official CompTIA v15 Exam Domain Weight Blueprints
   */
  const DOMAIN_BLUEPRINTS = {
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

  const PASSING_SCORES = {
    core1: 675,
    core2: 700,
    both: 675,
    domain: 675,
    missed: 675,
    coach: 675
  };

  /**
   * Internal Shuffle (Fisher-Yates)
   */
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Calculate Domain Quotas based on blueprint weights
   */
  function calculateDomainQuotas(blueprint, totalQuestions) {
    const totalWeight = blueprint.reduce((acc, d) => acc + d.weight, 0);
    const quotas = [];
    let allocated = 0;

    blueprint.forEach((dom) => {
      const exact = (dom.weight / totalWeight) * totalQuestions;
      const rounded = Math.floor(exact);
      const remainder = exact - rounded;
      quotas.push({
        ...dom,
        quota: rounded,
        remainder: remainder
      });
      allocated += rounded;
    });

    let shortfall = totalQuestions - allocated;
    if (shortfall > 0) {
      quotas.sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < shortfall; i++) {
        quotas[i % quotas.length].quota += 1;
      }
    }

    return quotas;
  }

  /**
   * Stratified Sampler for single core
   */
  function sampleCoreStratified(pool, blueprint, targetCount) {
    const quotas = calculateDomainQuotas(blueprint, targetCount);
    let result = [];

    quotas.forEach((spec) => {
      const domainQuestions = pool.filter((q) => {
        const dom = (q.domain || '').toLowerCase();
        return dom.startsWith(spec.prefix.toLowerCase()) || dom.includes(spec.name.toLowerCase());
      });

      const shuffledDomain = shuffle(domainQuestions);
      const selected = shuffledDomain.slice(0, Math.min(spec.quota, shuffledDomain.length));
      result = result.concat(selected);
    });

    // If pool was sparse in certain domains, fill remaining from leftover pool
    if (result.length < targetCount) {
      const pickedIds = new Set(result.map(q => q.id));
      const remainingPool = shuffle(pool.filter(q => !pickedIds.has(q.id)));
      const extraNeeded = targetCount - result.length;
      result = result.concat(remainingPool.slice(0, extraNeeded));
    }

    return shuffle(result);
  }

  /**
   * Main Stratified Sampler
   * Supports 'core1', 'core2', 'both', 'quick'
   */
  function sampleStratified(allQuestions, targetCount = 90, examType = 'core1') {
    if (!allQuestions || allQuestions.length === 0) return [];

    if (examType === 'core1') {
      const c1Pool = allQuestions.filter(q => q.exam === 'core1' || !q.exam);
      return sampleCoreStratified(c1Pool, DOMAIN_BLUEPRINTS.core1, Math.min(targetCount, c1Pool.length));
    }

    if (examType === 'core2') {
      const c2Pool = allQuestions.filter(q => q.exam === 'core2');
      return sampleCoreStratified(c2Pool, DOMAIN_BLUEPRINTS.core2, Math.min(targetCount, c2Pool.length));
    }

    if (examType === 'both') {
      const c1Count = Math.floor(targetCount / 2);
      const c2Count = targetCount - c1Count;
      const c1Pool = allQuestions.filter(q => q.exam === 'core1' || !q.exam);
      const c2Pool = allQuestions.filter(q => q.exam === 'core2');

      const c1Sample = sampleCoreStratified(c1Pool, DOMAIN_BLUEPRINTS.core1, Math.min(c1Count, c1Pool.length));
      const c2Sample = sampleCoreStratified(c2Pool, DOMAIN_BLUEPRINTS.core2, Math.min(c2Count, c2Pool.length));

      return shuffle([...c1Sample, ...c2Sample]);
    }

    // Default fallback: random draw
    return shuffle(allQuestions).slice(0, targetCount);
  }

  /**
   * Option Shuffle with Answer Remap
   * Ensures option presentation is randomized per render/session without breaking scoring
   */
  function prepareQuestionForSession(q) {
    if (!q || !Array.isArray(q.options) || q.options.length === 0) {
      return JSON.parse(JSON.stringify(q || {}));
    }

    const type = q.type || 'single';
    const clone = JSON.parse(JSON.stringify(q));

    if (type === 'single' || type === 'multi') {
      const originalOptions = [...q.options];
      const indices = originalOptions.map((_, i) => i);
      const shuffledIndices = shuffle(indices);

      // New options array in shuffled order
      clone.options = shuffledIndices.map(oldIdx => originalOptions[oldIdx]);

      // Create oldIdx -> newIdx mapping
      const oldToNew = {};
      const newToOld = {};
      shuffledIndices.forEach((oldIdx, newIdx) => {
        oldToNew[oldIdx] = newIdx;
        newToOld[newIdx] = oldIdx;
      });

      clone._originalAnswer = q.answer;
      clone._originalAnswers = q.answers;
      clone._newToOldMap = newToOld;
      clone._oldToNewMap = oldToNew;

      if (type === 'single') {
        if (typeof q.answer === 'number' && oldToNew[q.answer] !== undefined) {
          clone.answer = oldToNew[q.answer];
        }
      } else if (type === 'multi') {
        if (Array.isArray(q.answers)) {
          clone.answers = q.answers.map(ans => oldToNew[ans]).sort((a, b) => a - b);
        }
      }

      // Remap distractor analysis keys
      if (q.distractor_analysis && typeof q.distractor_analysis === 'object') {
        const remappedDistractors = {};
        Object.keys(q.distractor_analysis).forEach((oldKey) => {
          const oldIdx = parseInt(oldKey, 10);
          if (!isNaN(oldIdx) && oldToNew[oldIdx] !== undefined) {
            remappedDistractors[String(oldToNew[oldIdx])] = q.distractor_analysis[oldKey];
          }
        });
        clone.distractor_analysis = remappedDistractors;
      }
    }

    return clone;
  }

  /**
   * CompTIA Scaled Score Math: 100 to 900 scale
   */
  function calcScaledScore(rawCorrect, totalQuestions) {
    if (!totalQuestions || totalQuestions <= 0) return 100;
    const ratio = Math.min(1, Math.max(0, rawCorrect / totalQuestions));
    return Math.round(100 + (800 * ratio));
  }

  function getPassingScore(examType) {
    return PASSING_SCORES[examType] || 675;
  }

  function evaluatePass(scaledScore, examType) {
    const required = getPassingScore(examType);
    return scaledScore >= required;
  }

  /**
   * SM-2 Spaced Repetition Algorithm
   * @param {Object} state - { repetitions: number, interval: number, easeFactor: number }
   * @param {number} grade - 0 to 5 rating (5: perfect recall, 4: correct with hesitation, 3: correct with difficulty, 2: wrong easy recall, 1: wrong, 0: total blackout)
   * @returns {Object} updated { repetitions, interval, easeFactor, nextReviewDate }
   */
  function calcSM2(state = {}, grade = 5) {
    let { repetitions = 0, interval = 1, easeFactor = 2.5 } = state;
    const clampedGrade = Math.min(5, Math.max(0, Math.round(grade)));

    // EF calculation: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    const efDelta = 0.1 - (5 - clampedGrade) * (0.08 + (5 - clampedGrade) * 0.02);
    let newEF = Math.max(1.3, easeFactor + efDelta);
    newEF = Number(newEF.toFixed(2));

    let newInterval = 1;
    let newRepetitions = repetitions;

    if (clampedGrade >= 3) {
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEF);
      }
      newRepetitions = repetitions + 1;
    } else {
      newRepetitions = 0;
      newInterval = 1;
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const nextReviewDate = Date.now() + (newInterval * ONE_DAY_MS);

    return {
      repetitions: newRepetitions,
      interval: newInterval,
      easeFactor: newEF,
      nextReviewDate: nextReviewDate
    };
  }

  return {
    DOMAIN_BLUEPRINTS,
    PASSING_SCORES,
    calculateDomainQuotas,
    sampleStratified,
    prepareQuestionForSession,
    calcScaledScore,
    getPassingScore,
    evaluatePass,
    calcSM2,
    shuffle
  };
});
