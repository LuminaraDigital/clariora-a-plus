/**
 * tools/test_az900_integration.js
 * Verification suite for Clariora Multi-Track Certification Architecture & Microsoft AZ-900
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('TESTING MULTI-TRACK ARCHITECTURE & MICROSOFT AZ-900 SUITE');
console.log('================================================================');

// 1. Verify Track Registry Module
console.log('\n1. Verifying Track Registry Module...');
const trackRegistry = require('../js/track-registry.js');
const tracks = trackRegistry.getTracks();
assert.ok(tracks.length >= 3, 'TrackRegistry should contain at least 3 tracks');
const azTrack = trackRegistry.getTrack('az900');
assert.strictEqual(azTrack.vendor, 'Microsoft');
assert.strictEqual(azTrack.code, 'AZ-900');
assert.strictEqual(azTrack.scoreMax, 1000);
assert.strictEqual(azTrack.scoreMin, 100);
assert.strictEqual(azTrack.passingScore, 700);
assert.strictEqual(azTrack.blueprint.length, 3);
console.log('   ✔ TrackRegistry tracks, vendor metadata, and blueprint confirmed.');

// 2. Verify Scaled Scoring Logic
console.log('\n2. Verifying Multi-Scale Score Mathematics...');
const engineCore = require('../js/engine-core.js');
// CompTIA 100-900
const c1Full = engineCore.calcScaledScore(90, 90, 'core1');
const c1Half = engineCore.calcScaledScore(45, 90, 'core1');
const c1Zero = engineCore.calcScaledScore(0, 90, 'core1');
assert.strictEqual(c1Full, 900, 'CompTIA full score must be 900');
assert.strictEqual(c1Half, 500, 'CompTIA half score must be 500');
assert.strictEqual(c1Zero, 100, 'CompTIA zero score must be 100');

// Microsoft 100-1000
const azFull = engineCore.calcScaledScore(45, 45, 'az900');
const azHalf = engineCore.calcScaledScore(22.5, 45, 'az900');
const azZero = engineCore.calcScaledScore(0, 45, 'az900');
assert.strictEqual(azFull, 1000, 'AZ-900 full score must be 1000');
assert.strictEqual(azHalf, 550, 'AZ-900 half score must be 550');
assert.strictEqual(azZero, 100, 'AZ-900 zero score must be 100');
console.log('   ✔ Both CompTIA (100-900) and Microsoft (100-1000) scaled score curves verified.');

// 3. Verify Compiled AZ-900 Assets on Disk
console.log('\n3. Verifying Compiled AZ-900 JSON & JS Assets on Disk...');
const examDataPath = path.join(__dirname, '..', 'az900_exam_data.json');
const objDataPath = path.join(__dirname, '..', 'az900_objectives_data.json');
const studyLibPath = path.join(__dirname, '..', 'az900_study_library.json');

assert.ok(fs.existsSync(examDataPath), 'az900_exam_data.json must exist');
assert.ok(fs.existsSync(objDataPath), 'az900_objectives_data.json must exist');
assert.ok(fs.existsSync(studyLibPath), 'az900_study_library.json must exist');

const examData = JSON.parse(fs.readFileSync(examDataPath, 'utf8'));
const objData = JSON.parse(fs.readFileSync(objDataPath, 'utf8'));
const studyLib = JSON.parse(fs.readFileSync(studyLibPath, 'utf8'));

assert.ok(Array.isArray(examData.az900), 'az900_exam_data.json must have az900 array');
assert.ok(examData.az900.length >= 45, 'az900 must contain at least 45 questions');
assert.ok(Array.isArray(objData.objectives), 'az900_objectives_data.json must contain objectives');
assert.ok(objData.objectives.length >= 80, 'Must have at least 80 objectives extracted from guide');
assert.ok(Array.isArray(studyLib.labs), 'az900_study_library.json must contain labs array');
assert.strictEqual(studyLib.labs.length, 5, 'Must contain 5 extracted MicrosoftLearning labs');
console.log(`   ✔ az900_exam_data: ${examData.az900.length} questions.`);
console.log(`   ✔ az900_objectives_data: ${objData.objectives.length} syllabus objectives.`);
console.log(`   ✔ az900_study_library: ${studyLib.labs.length} hands-on labs.`);

// 4. Verify Question Bank Integrity & Distractor Analysis
console.log('\n4. Verifying Question Schema & Distractor Analysis...');
examData.az900.forEach((q, idx) => {
  assert.ok(q.id, `Question #${idx} missing id`);
  assert.strictEqual(q.exam, 'az900');
  assert.ok(q.domain, `Question ${q.id} missing domain`);
  assert.ok(q.explanation && q.explanation.length > 20, `Question ${q.id} missing thorough explanation`);
  if (q.type === 'single' || q.type === 'multi') {
    assert.ok(Array.isArray(q.options) && q.options.length >= 4, `Question ${q.id} must have >= 4 options`);
    assert.ok(q.distractor_analysis && typeof q.distractor_analysis === 'object', `Question ${q.id} missing distractor analysis`);
  } else if (q.type === 'match') {
    assert.ok(Array.isArray(q.pairs) && q.pairs.length >= 3, `Matching question ${q.id} must have >= 3 pairs`);
  } else if (q.type === 'order') {
    assert.ok(Array.isArray(q.sequence) && q.sequence.length >= 3, `Ordering question ${q.id} must have >= 3 steps`);
  }
});
console.log('   ✔ All AZ-900 questions conform to Clariora psychometric schema.');

// 5. Verify Stratified Sampling for Timed Mock Exam
console.log('\n5. Verifying Stratified Sampler with compulsory Cloud PBQs...');
const fullSample = engineCore.sampleStratified(examData.az900, 45, 'az900');
assert.strictEqual(fullSample.length, 45, 'Sampled exam must contain exactly 45 questions');
const samplePbqs = fullSample.filter(q => q.type === 'pbq');
assert.strictEqual(samplePbqs.length, 3, 'Must have 3 compulsory Cloud PBQs placed first');
assert.strictEqual(fullSample[0].type, 'pbq', 'Question 1 must be PBQ');
assert.strictEqual(fullSample[1].type, 'pbq', 'Question 2 must be PBQ');
assert.strictEqual(fullSample[2].type, 'pbq', 'Question 3 must be PBQ');
console.log('   ✔ 45-question AZ-900 mock exam sampling with 3 compulsory Cloud PBQs verified.');

// 6. Verify Backwards Compatibility with CompTIA Tests
console.log('\n6. Verifying Backwards Compatibility with CompTIA Core 1 & Core 2...');
const mockPool = Array.from({ length: 90 }, (_, i) => ({
  id: `MOCK-${i}`,
  exam: 'core1',
  domain: '1.0 Mobile Devices',
  type: 'single',
  question: 'Sample question',
  options: ['A', 'B', 'C', 'D'],
  answer: 0
}));
const c1Sample = engineCore.sampleStratified(mockPool, 90, 'core1');
assert.strictEqual(c1Sample.length, 90, 'Must sample 90 questions');
assert.strictEqual(c1Sample.filter(q => q.type === 'pbq').length, 3, 'Must have 3 default Core 1 PBQs');
assert.strictEqual(engineCore.getPassingScore('core1'), 675);
assert.strictEqual(engineCore.getPassingScore('core2'), 700);
assert.strictEqual(engineCore.getPassingScore('az900'), 700);
console.log('   ✔ Zero regression: CompTIA Core 1 and Core 2 functionality completely intact.');

console.log('\n================================================================');
console.log('✅ ALL MULTI-TRACK & AZ-900 INTEGRATION TESTS PASSED (100%)');
console.log('================================================================\n');
