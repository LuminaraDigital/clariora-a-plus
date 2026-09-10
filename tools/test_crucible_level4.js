#!/usr/bin/env node
/**
 * tools/test_crucible_level4.js
 *
 * Automated verification suite for Clariora Level 4: The Datacenter Crucible.
 * Tests:
 * 1. MutationTracker (answer-switching telemetry, instinct audit, points impact)
 * 2. CadenceCalculator (60s pacing horizon, PBQ reserve bank)
 * 3. RootCauseClassifier (4-quadrant post-mortem incident autopsy)
 */
'use strict';

const assert = require('assert');
const path = require('path');

const CrucibleEngine = require(path.join(__dirname, '..', 'js', 'crucible-engine.js'));

console.log('=== test_crucible_level4.js ===');

// -----------------------------------------------------------------------------
// Test 1: MutationTracker (Instinct Audit & Second-Guessing Detection)
// -----------------------------------------------------------------------------
console.log('1. Testing MutationTracker...');
const tracker = new CrucibleEngine.MutationTracker();

// Q0: Candidate chose right answer (0) and never switched
tracker.recordSelection(0, 0, 5340, 0, 'C1-001');
tracker.recordTimeSpent(0, 45, 'C1-001');

// Q1: Candidate chose right answer (1), then second-guessed and picked wrong answer (2)
tracker.recordSelection(1, 1, 5280, 1, 'C1-002');
tracker.recordSelection(1, 2, 5250, 1, 'C1-002'); // switched to wrong!
tracker.recordTimeSpent(1, 60, 'C1-002');

// Q2: Candidate chose wrong answer (0), then revised to right answer (3)
tracker.recordSelection(2, 0, 5200, 3, 'C1-003');
tracker.recordSelection(2, 3, 5170, 3, 'C1-003'); // switched to right!
tracker.recordTimeSpent(2, 50, 'C1-003');

// Q3: Candidate chose wrong answer (1) and switched to another wrong answer (2)
tracker.recordSelection(3, 1, 5100, 0, 'C1-004');
tracker.recordSelection(3, 2, 5060, 0, 'C1-004');
tracker.recordTimeSpent(3, 40, 'C1-004');

const summary = tracker.getAuditSummary();

assert.strictEqual(summary.totalTracked, 4, 'Should track 4 questions');
assert.strictEqual(summary.totalSwitches, 3, 'Should record 3 switch events');
assert.strictEqual(summary.correctToWrong, 1, 'Should record 1 correct-to-wrong switch');
assert.strictEqual(summary.wrongToCorrect, 1, 'Should record 1 wrong-to-correct switch');
assert.strictEqual(summary.wrongToWrong, 1, 'Should record 1 wrong-to-wrong switch');
assert(typeof summary.verdictText === 'string' && summary.verdictText.length > 20, 'Should produce detailed behavioral verdict');

console.log('   MutationTracker verified successfully.');

// -----------------------------------------------------------------------------
// Test 2: CadenceCalculator (60-Second Pacing Horizon & PBQ Reserves)
// -----------------------------------------------------------------------------
console.log('2. Testing CadenceCalculator...');
const cadence = new CrucibleEngine.CadenceCalculator(90, 5400, 60);

// At Q30 with 4600 seconds remaining:
// Remaining Qs = 60. Seconds needed at 60s/q = 3600s.
// PBQ Reserve = 4600 - 3600 = +1000s (> 600s -> nominal)
const stateNominal = cadence.calculate(30, 4600);
assert.strictEqual(stateNominal.status, 'nominal', 'Reserve >= 600s should be nominal');
assert.strictEqual(stateNominal.formattedReserve, '+16:40', 'Should format positive reserve correctly');
assert(stateNominal.fillPct >= 50, 'Fill percentage should reflect surplus');

// At Q30 with 3900 seconds remaining:
// Remaining Qs = 60. Seconds needed = 3600s.
// PBQ Reserve = 3900 - 3600 = +300s (0 <= x < 600 -> lagging)
const stateLagging = cadence.calculate(30, 3900);
assert.strictEqual(stateLagging.status, 'lagging', 'Reserve between 0 and 600s should be lagging');
assert.strictEqual(stateLagging.formattedReserve, '+05:00', 'Should format lagging reserve');

// At Q30 with 3200 seconds remaining:
// Remaining Qs = 60. Seconds needed = 3600s.
// PBQ Reserve = 3200 - 3600 = -400s (< 0 -> critical deficit)
const stateCritical = cadence.calculate(30, 3200);
assert.strictEqual(stateCritical.status, 'critical', 'Reserve < 0 should be critical deficit');
assert.strictEqual(stateCritical.formattedReserve, '-06:40', 'Should format negative deficit');

console.log('   CadenceCalculator verified successfully.');

// -----------------------------------------------------------------------------
// Test 3: RootCauseClassifier (4-Quadrant Post-Mortem Incident Autopsy)
// -----------------------------------------------------------------------------
console.log('3. Testing RootCauseClassifier...');

// Category 1: Doubt Switch
const doubtTele = { initialWasCorrect: true, finalWasCorrect: false, secondsSpent: 45 };
const qDoubt = { id: 'Q-01', question: 'Configure RAID 5 with hot spare.', answer: 2 };
const classDoubt = CrucibleEngine.RootCauseClassifier.classify(qDoubt, doubtTele, false);
assert.strictEqual(classDoubt.category, 'DOUBT_SWITCH', 'Should identify doubt switch');

// Category 2: Pacing Panic (hurried click under 15s)
const panicTele = { initialWasCorrect: false, finalWasCorrect: false, secondsSpent: 8 };
const qPanic = { id: 'Q-02', question: 'Which port is used by DNS queries?', answer: 1 };
const classPanic = CrucibleEngine.RootCauseClassifier.classify(qPanic, panicTele, false);
assert.strictEqual(classPanic.category, 'PACING_PANIC', 'Should identify hurried pacing panic');

// Category 3: Stem Misread (contains qualifier keyword)
const misreadTele = { initialWasCorrect: false, finalWasCorrect: false, secondsSpent: 55 };
const qMisread = { id: 'Q-03', question: 'Which of the following is LEAST likely to resolve the printer jam?', answer: 3 };
const classMisread = CrucibleEngine.RootCauseClassifier.classify(qMisread, misreadTele, false);
assert.strictEqual(classMisread.category, 'STEM_MISREAD', 'Should identify stem qualifier misread');

// Category 4: Knowledge Gap (technical fact gap without behavioral triggers)
const gapTele = { initialWasCorrect: false, finalWasCorrect: false, secondsSpent: 50 };
const qGap = { id: 'Q-04', question: 'Identify the maximum length of a 10GBASE-T Cat 6 segment.', answer: 0 };
const classGap = CrucibleEngine.RootCauseClassifier.classify(qGap, gapTele, false);
assert.strictEqual(classGap.category, 'KNOWLEDGE_GAP', 'Should identify knowledge gap');

// Aggregate Post-Mortem verification
const mockQuestions = [qDoubt, qPanic, qMisread, qGap];
const mockUserAnswers = { 0: 1, 1: 0, 2: 0, 3: 2 }; // all wrong
const mockTracker = {
  getRecord: function (idx) {
    if (idx === 0) return doubtTele;
    if (idx === 1) return panicTele;
    if (idx === 2) return misreadTele;
    if (idx === 3) return gapTele;
    return null;
  }
};

const postMortem = CrucibleEngine.RootCauseClassifier.generatePostMortem(mockQuestions, mockUserAnswers, mockTracker);
assert.strictEqual(postMortem.totalErrors, 4, 'Should record 4 total errors');
assert.strictEqual(postMortem.categories.DOUBT_SWITCH.count, 1, 'Should have 1 doubt switch');
assert.strictEqual(postMortem.categories.PACING_PANIC.count, 1, 'Should have 1 pacing panic');
assert.strictEqual(postMortem.categories.STEM_MISREAD.count, 1, 'Should have 1 stem misread');
assert.strictEqual(postMortem.categories.KNOWLEDGE_GAP.count, 1, 'Should have 1 knowledge gap');
assert(postMortem.primaryRemediation !== null, 'Should determine primary remediation target');

console.log('   RootCauseClassifier verified successfully.');

console.log('\n=============================================');
console.log('ALL LEVEL 4 CRUCIBLE TESTS PASSED WITH 100%!');
console.log('=============================================\n');
process.exit(0);
