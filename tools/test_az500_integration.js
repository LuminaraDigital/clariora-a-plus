/**
 * tools/test_az500_integration.js
 * Verification suite for Clariora Multi-Track Certification Architecture & Microsoft AZ-500
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('TESTING MULTI-TRACK ARCHITECTURE & MICROSOFT AZ-500 SUITE');
console.log('================================================================');

// 1. Verify Track Registry Module
console.log('\n1. Verifying Track Registry Module...');
const trackRegistry = require('../js/track-registry.js');
const tracks = trackRegistry.getTracks();
assert.ok(tracks.length >= 4, 'TrackRegistry should contain at least 4 tracks (core1, core2, az900, az500)');
const azTrack = trackRegistry.getTrack('az500');
assert.ok(azTrack, 'TrackRegistry must return track for az500');
assert.strictEqual(azTrack.vendor, 'Microsoft');
assert.strictEqual(azTrack.code, 'AZ-500');
assert.strictEqual(azTrack.scoreMax, 1000);
assert.strictEqual(azTrack.scoreMin, 100);
assert.strictEqual(azTrack.passingScore, 700);
assert.strictEqual(azTrack.blueprint.length, 4);
console.log('   ✔ TrackRegistry az500 tracks, vendor metadata, and blueprint confirmed.');

// 2. Verify Scaled Scoring Logic
console.log('\n2. Verifying Multi-Scale Score Mathematics (AZ-500 100-1000)...');
const engineCore = require('../js/engine-core.js');

// Microsoft AZ-500 100-1000
const azFull = engineCore.calcScaledScore(50, 50, 'az500');
const azHalf = engineCore.calcScaledScore(25, 50, 'az500');
const azZero = engineCore.calcScaledScore(0, 50, 'az500');
assert.strictEqual(azFull, 1000, 'AZ-500 full score must be 1000');
assert.strictEqual(azHalf, 550, 'AZ-500 half score must be 550');
assert.strictEqual(azZero, 100, 'AZ-500 zero score must be 100');
assert.strictEqual(engineCore.getPassingScore('az500'), 700);
assert.strictEqual(engineCore.evaluatePass(700, 'az500'), true);
assert.strictEqual(engineCore.evaluatePass(699, 'az500'), false);
console.log('   ✔ Microsoft AZ-500 (100-1000) scaled score curves and passing gates verified.');

// 3. Verify Compiled AZ-500 Assets on Disk
console.log('\n3. Verifying Compiled AZ-500 JSON & JS Assets on Disk...');
const examDataPath = path.join(__dirname, '..', 'az500_exam_data.json');
const objDataPath = path.join(__dirname, '..', 'az500_objectives_data.json');
const studyLibPath = path.join(__dirname, '..', 'az500_study_library.json');
const shardsDir = path.join(__dirname, '..', 'shards', 'az500');

assert.ok(fs.existsSync(examDataPath), 'az500_exam_data.json must exist');
assert.ok(fs.existsSync(objDataPath), 'az500_objectives_data.json must exist');
assert.ok(fs.existsSync(studyLibPath), 'az500_study_library.json must exist');
assert.ok(fs.existsSync(shardsDir), 'shards/az500 directory must exist');

const examData = JSON.parse(fs.readFileSync(examDataPath, 'utf8'));
const objData = JSON.parse(fs.readFileSync(objDataPath, 'utf8'));
const studyLib = JSON.parse(fs.readFileSync(studyLibPath, 'utf8'));

assert.ok(Array.isArray(examData.az500), 'az500_exam_data.json must have az500 array');
assert.ok(examData.az500.length >= 50, 'az500 must contain at least 50 questions');
assert.ok(Array.isArray(objData.objectives), 'az500_objectives_data.json must contain objectives');
assert.ok(objData.objectives.length >= 70, 'Must have at least 70 objectives extracted from guide');
assert.ok(Array.isArray(studyLib.labs), 'az500_study_library.json must contain labs array');
assert.ok(studyLib.labs.length >= 8, 'Must contain hands-on labs');
console.log(`   ✔ az500_exam_data: ${examData.az500.length} questions.`);
console.log(`   ✔ az500_objectives_data: ${objData.objectives.length} syllabus objectives.`);
console.log(`   ✔ az500_study_library: ${studyLib.labs.length} hands-on labs.`);

// 4. Verify Question Bank Integrity & Distractor Analysis
console.log('\n4. Verifying Question Schema & Distractor Analysis...');
examData.az500.forEach((q, idx) => {
  assert.ok(q.id, `Question #${idx} missing id`);
  assert.strictEqual(q.exam, 'az500');
  assert.ok(q.domain, `Question ${q.id} missing domain`);
  assert.ok(q.explanation && q.explanation.length > 20, `Question ${q.id} missing thorough explanation`);
  if (q.type === 'single' || q.type === 'multi') {
    assert.ok(Array.isArray(q.options) && q.options.length >= 4, `Question ${q.id} must have >= 4 options`);
    assert.ok(q.distractor_analysis && typeof q.distractor_analysis === 'object', `Question ${q.id} missing distractor analysis`);
  }
});
console.log('   ✔ All AZ-500 questions conform to Clariora psychometric schema.');

// 5. Verify Stratified Sampling for Timed Mock Exam with Compulsory PBQs
console.log('\n5. Verifying Stratified Sampler with compulsory Cloud PBQs...');
const fullSample = engineCore.sampleStratified(examData.az500, 50, 'az500');
assert.strictEqual(fullSample.length, 50, 'Sampled exam must contain exactly 50 questions');
const samplePbqs = fullSample.filter(q => q.type === 'pbq');
assert.strictEqual(samplePbqs.length, 3, 'Must have 3 compulsory Cloud PBQs placed first');
assert.strictEqual(fullSample[0].type, 'pbq', 'Question 1 must be PBQ');
assert.strictEqual(fullSample[1].type, 'pbq', 'Question 2 must be PBQ');
assert.strictEqual(fullSample[2].type, 'pbq', 'Question 3 must be PBQ');
console.log('   ✔ 50-question AZ-500 mock exam sampling with 3 compulsory PBQs verified.');

// 6. Verify Shard Files on Disk
console.log('\n6. Verifying Individual Shard Files in shards/az500/...');
const expectedShards = [
  'az500_1_0_manage_identity_and_access.json',
  'az500_2_0_secure_networking.json',
  'az500_3_0_secure_compute_storage_and_databases.json',
  'az500_4_0_manage_security_operations.json'
];

let totalShardQuestions = 0;
expectedShards.forEach((sName) => {
  const sPath = path.join(shardsDir, sName);
  assert.ok(fs.existsSync(sPath), `Shard ${sName} must exist on disk`);
  const sData = JSON.parse(fs.readFileSync(sPath, 'utf8'));
  assert.ok(Array.isArray(sData) && sData.length > 0, `Shard ${sName} must have questions`);
  totalShardQuestions += sData.length;
});
assert.strictEqual(totalShardQuestions, examData.az500.length, 'Total shard questions must equal master bank questions');
console.log(`   ✔ All 4 AZ-500 domain shards verified (${totalShardQuestions} questions total).`);

console.log('\n================================================================');
console.log('✅ ALL MICROSOFT AZ-500 SUITE INTEGRATION TESTS PASSED (100%)');
console.log('================================================================');
