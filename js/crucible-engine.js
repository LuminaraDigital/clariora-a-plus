/**
 * js/crucible-engine.js - Clariora Level 4: Datacenter Crucible Engine
 *
 * Pure, deterministic diagnostic engine logic:
 * 1. MutationTracker: Telemetry for answer-switching, instinct audit, and doubt detection.
 * 2. CadenceCalculator: 60-second pacing horizon and PBQ time bank reserves.
 * 3. RootCauseClassifier: 4-quadrant post-mortem incident autopsy.
 *
 * Designed to be requireable in Node for unit testing and loaded in the browser.
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrucibleEngine = factory();
    if (root.APlus) {
      root.APlus.crucibleEngine = root.CrucibleEngine;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // =========================================================================
  // 1. MUTATION TRACKER (The Instinct & Behavioral Telemetry Auditor)
  // =========================================================================

  class MutationTracker {
    constructor() {
      this.records = {}; // questionIndex -> QuestionRecord
    }

    reset() {
      this.records = {};
    }

    _getRecord(qIndex, qId, correctAnswerIndex) {
      if (!this.records[qIndex]) {
        this.records[qIndex] = {
          qIndex: qIndex,
          qId: qId || ('Q-' + (qIndex + 1)),
          correctAnswerIndex: correctAnswerIndex,
          initialSelection: null,
          finalSelection: null,
          initialWasCorrect: null,
          finalWasCorrect: null,
          history: [],
          firstInteractionTime: null,
          lastInteractionTime: null,
          secondsSpent: 0,
          eliminatedOptions: new Set()
        };
      }
      return this.records[qIndex];
    }

    recordElimination(qIndex, optionIndex, isEliminated, qId) {
      const rec = this._getRecord(qIndex, qId);
      if (isEliminated) {
        rec.eliminatedOptions.add(optionIndex);
      } else {
        rec.eliminatedOptions.delete(optionIndex);
      }
    }

    recordSelection(qIndex, optionIndex, remainingSeconds, correctAnswerIndex, qId) {
      const rec = this._getRecord(qIndex, qId, correctAnswerIndex);
      const isCorrect = (optionIndex === correctAnswerIndex);
      const now = Date.now();

      if (rec.firstInteractionTime === null) {
        rec.firstInteractionTime = now;
        rec.initialSelection = optionIndex;
        rec.initialWasCorrect = isCorrect;
      }

      rec.lastInteractionTime = now;
      rec.finalSelection = optionIndex;
      rec.finalWasCorrect = isCorrect;

      rec.history.push({
        optionIndex: optionIndex,
        isCorrect: isCorrect,
        timestamp: now,
        remainingSeconds: remainingSeconds
      });
    }

    recordTimeSpent(qIndex, seconds, qId) {
      const rec = this._getRecord(qIndex, qId);
      rec.secondsSpent += Math.max(0, seconds);
    }

    getRecord(qIndex) {
      return this.records[qIndex] || null;
    }

    getAuditSummary() {
      const totalTracked = Object.keys(this.records).length;
      let totalSwitches = 0;
      let correctToWrong = 0;
      let wrongToCorrect = 0;
      let wrongToWrong = 0;
      let correctToCorrect = 0;
      let initialCorrectTotal = 0;
      let finalCorrectTotal = 0;

      for (const key of Object.keys(this.records)) {
        const rec = this.records[key];
        if (rec.initialSelection === null) continue;

        if (rec.initialWasCorrect) initialCorrectTotal++;
        if (rec.finalWasCorrect) finalCorrectTotal++;

        if (rec.history.length > 1 && rec.initialSelection !== rec.finalSelection) {
          totalSwitches++;
          if (rec.initialWasCorrect && !rec.finalWasCorrect) {
            correctToWrong++;
          } else if (!rec.initialWasCorrect && rec.finalWasCorrect) {
            wrongToCorrect++;
          } else if (!rec.initialWasCorrect && !rec.finalWasCorrect) {
            wrongToWrong++;
          } else {
            correctToCorrect++;
          }
        }
      }

      // Estimate scaled points lost: CompTIA scale is 100-900 (800 point range over ~90 q's ~ 8.8 pts/q)
      const ptsPerQ = 8.88;
      const netScoreImpact = Math.round((wrongToCorrect - correctToWrong) * ptsPerQ);

      let verdictText = '';
      if (totalSwitches === 0) {
        verdictText = 'Decisive execution: you committed to your initial technical deduction for every question with zero answer mutations.';
      } else if (correctToWrong > wrongToCorrect) {
        const diff = correctToWrong - wrongToCorrect;
        verdictText = `Instinct warning: you altered answers on ${totalSwitches} questions, and ${correctToWrong} of those switches turned a correct diagnosis into an incorrect distractor (net loss: ~${Math.abs(netScoreImpact)} points). Trust your first principles deduction unless you uncover explicit proof of an error.`;
      } else if (wrongToCorrect > correctToWrong) {
        verdictText = `Disciplined revision: your careful re-reading corrected ${wrongToCorrect} mistakes, outweighing your hesitation and securing a net gain of ~${netScoreImpact} scaled points.`;
      } else {
        verdictText = `Neutral mutation impact: you switched answers on ${totalSwitches} questions with an even balance of corrections and misfires.`;
      }

      return {
        totalTracked: totalTracked,
        totalSwitches: totalSwitches,
        correctToWrong: correctToWrong,
        wrongToCorrect: wrongToCorrect,
        wrongToWrong: wrongToWrong,
        correctToCorrect: correctToCorrect,
        initialAccuracyPct: totalTracked > 0 ? Math.round((initialCorrectTotal / totalTracked) * 100) : 0,
        finalAccuracyPct: totalTracked > 0 ? Math.round((finalCorrectTotal / totalTracked) * 100) : 0,
        netScoreImpact: netScoreImpact,
        verdictText: verdictText
      };
    }
  }

  // =========================================================================
  // 2. CADENCE CALCULATOR (The 60-Second Pacing Horizon)
  // =========================================================================

  class CadenceCalculator {
    /**
     * @param {number} totalQuestions Total count of questions in session (e.g. 90)
     * @param {number} totalSeconds Total duration in seconds (e.g. 5400)
     * @param {number} targetSecondsPerQuestion Budget per MC question (default 60s)
     */
    constructor(totalQuestions = 90, totalSeconds = 5400, targetSecondsPerQuestion = 60) {
      this.totalQuestions = Math.max(1, totalQuestions);
      this.totalSeconds = Math.max(1, totalSeconds);
      this.targetPerQ = targetSecondsPerQuestion;
    }

    /**
     * Compute real-time pacing telemetry at current state
     * @param {number} currentIndex 0-based question index
     * @param {number} remainingSeconds Seconds left on the clock
     */
    calculate(currentIndex, remainingSeconds) {
      const qRemaining = Math.max(0, this.totalQuestions - currentIndex);
      const secondsNeededForRemaining = qRemaining * this.targetPerQ;
      const pbqReserveSeconds = remainingSeconds - secondsNeededForRemaining;

      // Status categories:
      // Nominal: At least 10 minutes (600s) banked for PBQs or surplus
      // Lagging: Between 0s and 600s banked
      // Critical: Deficit (< 0s), burning into baseline question time
      let status = 'nominal';
      if (pbqReserveSeconds < 0) {
        status = 'critical';
      } else if (pbqReserveSeconds < 600) {
        status = 'lagging';
      }

      const sign = pbqReserveSeconds >= 0 ? '+' : '-';
      const absSec = Math.abs(pbqReserveSeconds);
      const mins = Math.floor(absSec / 60);
      const secs = absSec % 60;
      const formattedReserve = `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // Progress percentage through the pacing envelope (0 to 100%)
      const idealRemainingSeconds = this.totalSeconds - (currentIndex * this.targetPerQ);
      const pacingDeviation = remainingSeconds - idealRemainingSeconds;
      // Clamp fill percentage for horizon bar: 50% is exact on pace, >50% is banked surplus, <50% is deficit
      const fillPct = Math.max(5, Math.min(95, 50 + (pacingDeviation / 1800) * 50));

      return {
        currentIndex: currentIndex,
        totalQuestions: this.totalQuestions,
        remainingSeconds: remainingSeconds,
        pbqReserveSeconds: pbqReserveSeconds,
        formattedReserve: formattedReserve,
        status: status,
        fillPct: Math.round(fillPct),
        avgSecondsAllowedRemaining: qRemaining > 0 ? Math.round(remainingSeconds / qRemaining) : 0
      };
    }
  }

  // =========================================================================
  // 3. ROOT-CAUSE CLASSIFIER (4-Quadrant Incident Post-Mortem)
  // =========================================================================

  class RootCauseClassifier {
    static STEM_QUALIFIER_REGEX = /\b(NOT|LEAST|FIRST|MOST|BEST|EXCEPT|INITIAL|NEXT|PRIMARY|GREATEST|LOWEST)\b/i;

    /**
     * Categorize a single question failure
     * @param {Object} question The canonical question object
     * @param {Object} telemetry Telemetry record from MutationTracker
     * @param {boolean} isCorrect Whether user answered correctly
     */
    static classify(question, telemetry, isCorrect) {
      if (isCorrect) {
        return { category: 'SUCCESS', label: 'Correct', reason: 'Nominal operational diagnosis.' };
      }

      // Check 1: Doubt Switch (abandoned correct answer)
      if (telemetry && telemetry.initialWasCorrect === true && telemetry.finalWasCorrect === false) {
        return {
          category: 'DOUBT_SWITCH',
          label: 'Doubt Switch',
          badgeClass: 'quadrant-doubt',
          reason: 'Initial correct diagnosis was abandoned for an incorrect distractor.'
        };
      }

      // Check 2: Pacing Panic (< 15s rushed blind click OR > 150s cognitive paralysis)
      const time = (telemetry && telemetry.secondsSpent) || 0;
      if (time > 0 && (time < 15 || time > 150)) {
        return {
          category: 'PACING_PANIC',
          label: 'Pacing Panic',
          badgeClass: 'quadrant-pacing',
          reason: time < 15 ? `Answered in ${Math.round(time)}s (rushed blind selection).` : `Stalled for ${Math.round(time)}s (cognitive paralysis).`
        };
      }

      // Check 3: Stem Misread (scenario contained qualifying constraints)
      const stem = (question && (question.question || question.stem)) || '';
      if (this.STEM_QUALIFIER_REGEX.test(stem)) {
        return {
          category: 'STEM_MISREAD',
          label: 'Stem Misread',
          badgeClass: 'quadrant-misread',
          reason: 'Overlooked qualifying constraint (FIRST, BEST, LEAST, NOT, NEXT).'
        };
      }

      // Check 4: Knowledge Gap (default technical fact/port/procedure unawareness)
      return {
        category: 'KNOWLEDGE_GAP',
        label: 'Knowledge Gap',
        badgeClass: 'quadrant-knowledge',
        reason: 'Technical specification, port number, or procedural syntax gap.'
      };
    }

    /**
     * Generate an aggregate post-mortem across all questions in an exam
     */
    static generatePostMortem(questions, userAnswers, mutationTracker) {
      const summary = {
        totalQuestions: questions.length,
        totalErrors: 0,
        categories: {
          KNOWLEDGE_GAP: { name: 'Knowledge Gap', count: 0, questions: [], icon: 'tag' },
          STEM_MISREAD: { name: 'Stem Misread', count: 0, questions: [], icon: 'alert' },
          PACING_PANIC: { name: 'Pacing Panic', count: 0, questions: [], icon: 'clock' },
          DOUBT_SWITCH: { name: 'Doubt Switch', count: 0, questions: [], icon: 'refresh' }
        },
        primaryRemediation: null
      };

      questions.forEach((q, idx) => {
        const userChoice = userAnswers[idx];
        const isCorrect = (userChoice === q.answer);
        if (!isCorrect) {
          summary.totalErrors++;
          const telemetry = mutationTracker ? mutationTracker.getRecord(idx) : null;
          const classification = this.classify(q, telemetry, isCorrect);
          if (summary.categories[classification.category]) {
            summary.categories[classification.category].count++;
            summary.categories[classification.category].questions.push({
              index: idx,
              id: q.id || ('Q' + (idx + 1)),
              objective: q.objective || 'General',
              domain: q.domain || 'Core',
              reason: classification.reason
            });
          }
        }
      });

      // Find highest leverage remediation area
      let maxCount = -1;
      let primaryKey = 'KNOWLEDGE_GAP';
      for (const [key, val] of Object.entries(summary.categories)) {
        if (val.count > maxCount) {
          maxCount = val.count;
          primaryKey = key;
        }
      }

      summary.primaryRemediation = {
        category: primaryKey,
        count: maxCount,
        title: summary.categories[primaryKey].name
      };

      return summary;
    }
  }

  // =========================================================================
  // EXPORTED FACADE
  // =========================================================================

  return {
    MutationTracker: MutationTracker,
    CadenceCalculator: CadenceCalculator,
    RootCauseClassifier: RootCauseClassifier
  };
});
