/**
 * tools/test_assessment_packs.js
 * Node tests for curriculum outline + assessment pack filtering/high-score store.
 * Run: node tools/test_assessment_packs.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n       ') : err));
  }
}

var root = path.join(__dirname, '..');
var outline = JSON.parse(fs.readFileSync(path.join(root, 'curriculum_outline.json'), 'utf8'));

test('outline has 22 modules', function () {
  assert.strictEqual(outline.modules.length, 22);
});

test('outline has assessment kinds', function () {
  var kinds = {};
  outline.assessments.forEach(function (a) {
    kinds[a.kind] = (kinds[a.kind] || 0) + 1;
  });
  assert.ok(kinds.lesson_review >= 22);
  assert.ok(kinds.module_quiz >= 22);
  assert.ok(kinds.checkpoint_review >= 5);
  assert.ok(kinds.exam_practice >= 10);
});

test('competitive targets and gaps are present', function () {
  assert.ok(outline.competitive_targets.topics > 700);
  assert.ok(outline.gaps.topics > 0);
  assert.ok(outline.ours.assessments > 0);
});

test('no CertMaster lesson body fields in outline', function () {
  var raw = JSON.stringify(outline);
  assert.ok(raw.indexOf('CertMaster proprietary') >= 0 || raw.indexOf('Does not include') >= 0);
  assert.ok(raw.indexOf('"content":') < 0);
});

/* Load assessment-packs against a fake window + curriculum store */
var memory = {};
var localStorage = {
  getItem: function (k) {
    return memory[k] == null ? null : memory[k];
  },
  setItem: function (k, v) {
    memory[k] = String(v);
  }
};

var win = {
  APlus: {},
  localStorage: localStorage,
  COMPTIA_CURRICULUM_OUTLINE: outline,
  document: {
    readyState: 'complete',
    addEventListener: function () {}
  },
  alert: function () {}
};
win.window = win;

var curriculumSrc = fs.readFileSync(path.join(root, 'js', 'curriculum.js'), 'utf8');
vm.runInNewContext(curriculumSrc, {
  window: win,
  document: win.document,
  navigator: {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console
});

var packsSrc = fs.readFileSync(path.join(root, 'js', 'assessment-packs.js'), 'utf8');
vm.runInNewContext(packsSrc, {
  window: win,
  document: win.document,
  navigator: {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console,
  alert: win.alert
});

test('assessment packs list returns packs', function () {
  var list = win.APlus.assessmentPacks.list({});
  assert.ok(list.length >= 50);
});

test('store records assessment high score', function () {
  var id = 'assess-m02-module-quiz';
  win.APlus.assessmentPacks.recordResult({
    domainKey: id,
    assessmentId: id,
    assessmentKind: 'module_quiz',
    rawCorrect: 12,
    totalQuestions: 15,
    scaledScore: 720,
    secondsSpent: 400,
    timestamp: new Date().toISOString()
  });
  var rec = win.APlus.curriculum.store.assessment(id);
  assert.strictEqual(rec.bestScore, 720);
  assert.ok(rec.bestPercent >= 79 && rec.bestPercent <= 81);
});

test('moduleProgress returns percent object', function () {
  var prog = win.APlus.curriculum.store.moduleProgress(2);
  assert.ok(prog);
  assert.strictEqual(prog.module_no, 2);
  assert.ok(typeof prog.percent === 'number');
});

test('bookmarks toggle', function () {
  var on = win.APlus.curriculum.store.toggleBookmark('assessment', 'x1');
  assert.strictEqual(on, true);
  assert.strictEqual(win.APlus.curriculum.store.isBookmarked('assessment', 'x1'), true);
  win.APlus.curriculum.store.toggleBookmark('assessment', 'x1');
  assert.strictEqual(win.APlus.curriculum.store.isBookmarked('assessment', 'x1'), false);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
