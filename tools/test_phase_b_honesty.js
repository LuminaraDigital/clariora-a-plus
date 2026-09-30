/**
 * tools/test_phase_b_honesty.js
 * Phase B honesty: sample-size copy, diagnostic length, and one attempt store.
 * Run: node tools/test_phase_b_honesty.js
 */
'use strict';

var path = require('path');
var assert = require('assert');

var ROOT = path.join(__dirname, '..');
var honesty = require(path.join(ROOT, 'js', 'honesty.js'));

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
    console.log('       ' + (err && err.stack ? err.stack : err));
  }
}

console.log('\ndiagnostic length\n');

test('target is 20 when the bank size is unknown', function () {
  assert.strictEqual(honesty.resolveDiagnosticLength(0), 20);
  assert.strictEqual(honesty.resolveDiagnosticLength(undefined), 20);
  assert.strictEqual(honesty.DIAGNOSTIC_TARGET, 20);
});

test('a short pool clamps the advertised length', function () {
  assert.strictEqual(honesty.resolveDiagnosticLength(10), 10);
  assert.strictEqual(honesty.resolveDiagnosticLength(10, 20), 10);
});

test('a full bank stays at the target', function () {
  assert.strictEqual(honesty.resolveDiagnosticLength(500), 20);
});

test('timer seconds equal the delivered question count', function () {
  assert.strictEqual(honesty.diagnosticClockSeconds(20), 20 * 60);
  assert.strictEqual(honesty.diagnosticClockSeconds(10), 10 * 60);
  assert.strictEqual(honesty.diagnosticMinutes(10), 10);
});

test('button copy uses that same count', function () {
  assert.strictEqual(honesty.diagnosticTakeLabel(20), 'Take the 20-question diagnostic');
  assert.strictEqual(honesty.diagnosticStartLabel(10), 'Start the 10-question diagnostic');
  assert.strictEqual(honesty.diagnosticTakeLabel(20).indexOf('10'), -1);
});

test('course switch lists the four surfaces and the selected exam', function () {
  var core2 = honesty.courseSurfaces('core2');
  assert.strictEqual(core2.exam, 'core2');
  assert.deepStrictEqual(core2.remount, ['readiness', 'objectives', 'diagnostic', 'mocks']);
  var core1 = honesty.courseSurfaces('core1');
  assert.strictEqual(core1.exam, 'core1');
});

console.log('\nsample size\n');

var readinessApi = require(path.join(ROOT, 'js', 'readiness2.js'));
var readiness2 = readinessApi.readiness2;

test('10 answers plus one attempt is not reported as 100', function () {
  var now = Date.now();
  var stats = {
    'core1|4.2': {
      exam: 'core1',
      code: '4.2',
      domain: '4.0 Virtualization and Cloud Computing',
      wCorrect: 2,
      wTotal: 10,
      rawCorrect: 2,
      rawTotal: 10,
      lastUpdate: now
    }
  };
  var history = [{
    examType: 'core1',
    scaledScore: 260,
    passed: false,
    timestamp: now,
    totalQuestions: 10,
    rawCorrect: 2
  }];
  var result = readiness2.compute({
    exam: 'core1',
    history: history,
    stats: stats,
    now: now
  });
  assert.strictEqual(result.answersUsed, 10, 'answersUsed was ' + result.answersUsed);
  var text = readiness2.format.confidenceText(result);
  assert.ok(text.indexOf('10 answers') >= 0, 'copy was: ' + text);
  assert.strictEqual(text.indexOf('100'), -1, 'inflated copy: ' + text);
  assert.strictEqual(text.indexOf('90'), -1, 'padded exam length: ' + text);
});

test('history-only sample uses attempt length, not 90 per attempt', function () {
  var result = readiness2.compute({
    exam: 'core1',
    history: [{
      examType: 'core1',
      scaledScore: 400,
      passed: false,
      timestamp: 10,
      totalQuestions: 10,
      rawCorrect: 2
    }],
    stats: {}
  });
  assert.strictEqual(result.source, 'history');
  assert.strictEqual(result.answersUsed, 10, 'answersUsed was ' + result.answersUsed);
  var text = readiness2.format.confidenceText(result);
  assert.ok(text.indexOf('10 answers') >= 0, text);
  assert.strictEqual(text.indexOf('100'), -1, text);
});

test('blend does not add observations on top of the same attempt', function () {
  assert.strictEqual(
    readiness2.answersUsedFor('blend', 10, { sum: 10, known: 1 }),
    10
  );
  assert.strictEqual(
    readiness2.answersUsedFor('history', 2, { sum: 10, known: 1 }),
    10
  );
  assert.strictEqual(
    readiness2.answersUsedFor('objectives', 10, { sum: 90, known: 1 }),
    10
  );
});

console.log('\nattempt store\n');

function makeLocalStorage() {
  var data = Object.create(null);
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    clear: function () {
      Object.keys(data).forEach(function (k) { delete data[k]; });
    }
  };
}

test('recordAttempt is visible to getHistory and the mirror', function () {
  var localStorageStub = makeLocalStorage();
  var storeData = {};
  var profileId = 'p_phase_b';
  var fakeWindow = {
    localStorage: localStorageStub,
    CompTIAProfiles: {
      ensureInitialized: function () { return { activeProfileId: profileId }; },
      getActiveId: function () { return profileId; },
      scopedGet: function (baseKey) {
        return localStorageStub.getItem('comptia_p_' + profileId + '__' + baseKey);
      },
      scopedSet: function (baseKey, value) {
        localStorageStub.setItem('comptia_p_' + profileId + '__' + baseKey, value);
      },
      scopedRemove: function (baseKey) {
        localStorageStub.removeItem('comptia_p_' + profileId + '__' + baseKey);
      }
    },
    APlus: {
      storage: {
        get: function (key, fallback) {
          return Object.prototype.hasOwnProperty.call(storeData, key) ? storeData[key] : fallback;
        },
        set: function (key, value) { storeData[key] = value; return true; },
        remove: function (key) { delete storeData[key]; return true; }
      }
    }
  };
  global.window = fakeWindow;
  global.localStorage = localStorageStub;
  global.CompTIAProfiles = fakeWindow.CompTIAProfiles;
  global.APlus = fakeWindow.APlus;
  var learner = require(path.join(ROOT, 'learner_state.js'));
  learner.resetHistorySourceLog();

  var rows = learner.recordAttempt({
    timestamp: 1700000000000,
    examType: 'CORE2',
    scaledScore: 710,
    rawCorrect: 8,
    totalQuestions: 10,
    passed: true,
    status: 'PASSED',
    date: 'test'
  });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].examType, 'core2');
  assert.strictEqual(rows[0].scaledScore, 710);
  assert.strictEqual(rows[0].totalQuestions, 10);

  var mirror = fakeWindow.APlus.storage.get('history', []);
  assert.strictEqual(mirror.length, 1, 'mirror length');
  assert.strictEqual(mirror[0].scaledScore, 710);

  var scoped = localStorageStub.getItem('comptia_p_' + profileId + '__comptia_a_plus_history');
  assert.ok(scoped && scoped.indexOf('710') >= 0, 'scoped history missing the attempt');

  learner.clearHistory();
  learner.resetHistorySourceLog();
  assert.strictEqual(learner.getHistory().length, 0);
});

console.log('\nlive QA clock, history, flashcards\n');

test('diagnostic clock follows the delivered count, not the requested 20 minutes', function () {
  assert.strictEqual(honesty.sessionClockSeconds({
    mode: 'diagnostic',
    questionCount: 20,
    timeMinutes: 20,
    delivered: 10
  }), 10 * 60);
  assert.strictEqual(honesty.sessionClockSeconds({
    mode: 'diagnostic',
    questionCount: 20,
    timeMinutes: 20,
    delivered: 20
  }), 20 * 60);
});

test('a 20-minute request that only delivered 10 does not keep a 20:00 clock', function () {
  assert.strictEqual(honesty.sessionClockSeconds({
    mode: 'mock',
    questionCount: 20,
    timeMinutes: 20,
    delivered: 10
  }), 10 * 60);
});

test('full mocks and sprints keep their own minutes', function () {
  assert.strictEqual(honesty.sessionClockSeconds({
    mode: 'mock',
    questionCount: 90,
    timeMinutes: 90,
    delivered: 90
  }), 90 * 60);
  assert.strictEqual(honesty.sessionClockSeconds({
    mode: 'mock',
    questionCount: 20,
    timeMinutes: 25,
    delivered: 20
  }), 25 * 60);
});

test('fresh attempt keeps bankRevision and paints in the history table', function () {
  var localStorageStub = makeLocalStorage();
  var storeData = {};
  var profileId = 'p_live_qa';
  var fakeWindow = {
    localStorage: localStorageStub,
    CompTIAProfiles: {
      scopedGet: function (baseKey) {
        return localStorageStub.getItem('comptia_p_' + profileId + '__' + baseKey);
      },
      scopedSet: function (baseKey, value) {
        localStorageStub.setItem('comptia_p_' + profileId + '__' + baseKey, value);
      },
      scopedRemove: function (baseKey) {
        localStorageStub.removeItem('comptia_p_' + profileId + '__' + baseKey);
      }
    },
    APlus: {
      storage: {
        get: function (key, fallback) {
          return Object.prototype.hasOwnProperty.call(storeData, key) ? storeData[key] : fallback;
        },
        set: function (key, value) { storeData[key] = value; return true; },
        remove: function (key) { delete storeData[key]; return true; }
      }
    }
  };
  global.window = fakeWindow;
  global.localStorage = localStorageStub;
  global.CompTIAProfiles = fakeWindow.CompTIAProfiles;
  global.APlus = fakeWindow.APlus;
  var learnerPath = require.resolve(path.join(ROOT, 'learner_state.js'));
  delete require.cache[learnerPath];
  var learner = require(learnerPath);
  learner.resetHistorySourceLog();
  learner.clearHistory();

  var rows = learner.recordAttempt({
    examType: 'CORE2',
    scaledScore: 340,
    raw: '3/10',
    status: 'FAILED',
    bankRevision: 2,
    mode: 'diagnostic',
    date: '30/09/2026, 07:45 am'
  });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].scaledScore, 340);
  assert.strictEqual(rows[0].rawCorrect, 3);
  assert.strictEqual(rows[0].totalQuestions, 10);
  assert.strictEqual(rows[0].bankRevision, 2);
  assert.strictEqual(rows[0].examType, 'core2');

  var html = learner.buildHistoryTableHtml(learner.getHistory());
  assert.ok(html.indexOf('340') >= 0, 'table should show the score');
  assert.ok(html.indexOf('3/10') >= 0, 'table should show the raw score');
  assert.strictEqual(html.indexOf('No exam attempts recorded yet'), -1);

  learner.resetHistorySourceLog();
  localStorageStub.setItem('comptia_p_' + profileId + '__comptia_a_plus_history', '[]');
  localStorageStub.removeItem('comptia_a_plus_history');
  var fromMirror = learner.getHistory();
  assert.strictEqual(fromMirror.length, 1, 'empty profile key must not hide the mirror');
  assert.strictEqual(fromMirror[0].scaledScore, 340);
  learner.clearHistory();
});

test('PBQ reserve stays off for flashcards and exit does not record an attempt', function () {
  assert.strictEqual(honesty.shouldShowPbqReserve({ type: 'memory', memoryRaid: true }), false);
  assert.strictEqual(honesty.shouldShowPbqReserve({ type: 'core2', flashcard: true }), false);
  assert.strictEqual(honesty.shouldShowPbqReserve({ type: 'core2' }), true);
  var plan = honesty.flashcardExitPlan();
  assert.strictEqual(plan.recordAttempt, false);
  assert.strictEqual(plan.screen, 'startScreen');
  assert.strictEqual(plan.tab, 'study');
  assert.strictEqual(plan.hidePbqReserve, true);
});

test('exit control is hidden by CSS and the shell history reader is shared', function () {
  var fs = require('fs');
  var css = fs.readFileSync(path.join(ROOT, 'css', 'brand-black-gold.css'), 'utf8');
  assert.ok(/#flashcardExitBtn\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css));
  assert.ok(/body\.flashcard-session\s+#cruciblePacingHorizon\s*\{[^}]*display:\s*none\s*!important/.test(css));
  var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.indexOf('APlus.learner.getHistory') >= 0);
  assert.ok(html.indexOf('APlus.learner.recordAttempt') >= 0);
  assert.ok(html.indexOf("startExam('core1',20,20,'diagnostic')") >= 0);
  var engine = fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8');
  assert.ok(engine.indexOf('sessionClockSeconds') >= 0);
  assert.ok(engine.indexOf('recordAttempt') >= 0);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
