/**
 * tools/test_readiness_truth.js
 * Node test for the single readiness truth: one history reader, one compute
 * call, one set of formatters, and the same numbers on every surface.
 * Run: node tools/test_readiness_truth.js
 *
 * Builds a fake window with a working localStorage and a profile-scoping stub,
 * seeds the five reviewer attempts under the profile-scoped history key, then
 * exercises learner_state.js, js/onboarding.js, js/home-widgets.js and
 * js/analytics.js against it.
 */

'use strict';

var path = require('path');
var assert = require('assert');

var ROOT = path.join(__dirname, '..');
var PROFILE_ID = 'p_test_learner';
var SCOPED_HISTORY_KEY = 'comptia_p_' + PROFILE_ID + '__comptia_a_plus_history';
var LEGACY_HISTORY_KEY = 'comptia_a_plus_history';

/* ---------------- fake environment ---------------- */

function makeLocalStorage() {
  var data = Object.create(null);
  return {
    _data: data,
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    clear: function () { Object.keys(data).forEach(function (k) { delete data[k]; }); }
  };
}

var localStorageStub = makeLocalStorage();
var storeData = {};
var busHandlers = {};

var fakeWindow = {
  localStorage: localStorageStub,
  CompTIAProfiles: {
    ensureInitialized: function () { return { activeProfileId: PROFILE_ID }; },
    getActiveId: function () { return PROFILE_ID; },
    scopedGet: function (baseKey) {
      return localStorageStub.getItem('comptia_p_' + PROFILE_ID + '__' + baseKey);
    },
    scopedSet: function (baseKey, value) {
      localStorageStub.setItem('comptia_p_' + PROFILE_ID + '__' + baseKey, value);
    },
    objectivesCompletion: function () { return 0; }
  },
  APlus: {
    bus: {
      on: function (evt, cb) { (busHandlers[evt] = busHandlers[evt] || []).push(cb); return function () {}; },
      emit: function (evt, payload) { (busHandlers[evt] || []).forEach(function (cb) { cb(payload); }); }
    },
    storage: {
      get: function (key, fallback) {
        return Object.prototype.hasOwnProperty.call(storeData, key) ? storeData[key] : fallback;
      },
      set: function (key, value) { storeData[key] = value; return true; },
      remove: function (key) { delete storeData[key]; return true; }
    },
    registerFeature: function () {}
  }
  // deliberately no `document`: every module must stay inert without a DOM
};

global.window = fakeWindow;
global.localStorage = localStorageStub;

require(path.join(ROOT, 'learner_state.js'));
var onboarding = require(path.join(ROOT, 'js', 'onboarding.js'));
var hw = require(path.join(ROOT, 'js', 'home-widgets.js'));
require(path.join(ROOT, 'js', 'analytics.js'));

var APlus = fakeWindow.APlus;
var readiness2 = APlus.readiness2;

/* ---------------- the reviewer's fixture ---------------- */
/* Five Core 1 attempts, newest first, exactly the scores the reviewer used.
   `status` is the graded fact stored with each attempt; two of the five were
   recorded as passes, which is where "2 of 5 passed" comes from. */

var DAY = 86400000;
var BASE_TS = Date.UTC(2026, 7, 1, 12, 0, 0);

var SEEDED = [
  { score: 655, status: 'FAILED' },
  { score: 703, status: 'PASSED' },
  { score: 671, status: 'PASSED' },
  { score: 590, status: 'FAILED' },
  { score: 537, status: 'FAILED' }
];

function seedHistory(key) {
  var rows = SEEDED.map(function (s, i) {
    var ts = BASE_TS - i * DAY; // index 0 is the newest
    return {
      date: new Date(ts).toISOString(),
      timestamp: ts,
      examType: 'CORE1',
      scaledScore: s.score,
      raw: Math.round((s.score - 100) / 8 * 0.9) + '/90',
      percentage: '0.0%',
      status: s.status,
      domainStats: {}
    };
  });
  localStorageStub.setItem(key, JSON.stringify(rows));
}

function clearAll() {
  localStorageStub.clear();
  Object.keys(storeData).forEach(function (k) { delete storeData[k]; });
}

/* ---------------- tiny test harness ---------------- */

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    clearAll();
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

function computeSeeded() {
  var history = APlus.learner.getHistory();
  return readiness2.compute({ exam: 'core1', history: history });
}

/* ================================================================== *
 * canonical history reader
 * ================================================================== */

console.log('\ncanonical history reader\n');

test('reads the profile-scoped key and returns 5 records newest first', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var h = APlus.learner.getHistory();
  assert.strictEqual(h.length, 5, 'length was ' + h.length);
  assert.deepStrictEqual(
    h.map(function (r) { return r.scaledScore; }),
    [655, 703, 671, 590, 537]
  );
  assert.ok(h[0].timestamp > h[4].timestamp, 'not sorted newest first');
});

test('normalises every record to the canonical shape', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var r = APlus.learner.getHistory()[1];
  assert.strictEqual(r.examType, 'core1');
  assert.strictEqual(r.scaledScore, 703);
  assert.strictEqual(r.passed, true);
  assert.strictEqual(typeof r.timestamp, 'number');
  assert.strictEqual(typeof r.rawCorrect, 'number');
  assert.strictEqual(typeof r.totalQuestions, 'number');
});

test('falls back to the legacy unscoped key when the scoped key is empty', function () {
  seedHistory(LEGACY_HISTORY_KEY);
  var h = APlus.learner.getHistory();
  assert.strictEqual(h.length, 5);
  assert.strictEqual(h[0].scaledScore, 655);
});

test('falls back to the aplus3 mirror when both keys are empty', function () {
  storeData.history = JSON.parse(localStorageStub.getItem(SCOPED_HISTORY_KEY) || 'null') || (function () {
    seedHistory(SCOPED_HISTORY_KEY);
    var rows = JSON.parse(localStorageStub.getItem(SCOPED_HISTORY_KEY));
    localStorageStub.removeItem(SCOPED_HISTORY_KEY);
    return rows;
  })();
  var h = APlus.learner.getHistory();
  assert.strictEqual(h.length, 5);
});

test('dedupes on timestamp plus score', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var rows = JSON.parse(localStorageStub.getItem(SCOPED_HISTORY_KEY));
  localStorageStub.setItem(SCOPED_HISTORY_KEY, JSON.stringify(rows.concat(rows)));
  assert.strictEqual(APlus.learner.getHistory().length, 5);
});

test('an empty store yields an empty array, never a throw', function () {
  assert.deepStrictEqual(APlus.learner.getHistory(), []);
});

test('a new attempt in the aplus3 mirror is not hidden by a scoped history', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  // js/engine.js writes each finished exam to the mirror only.
  storeData.history = [{
    date: new Date(BASE_TS + 3600000).toISOString(),
    timestamp: BASE_TS + 3600000,
    examType: 'CORE1',
    scaledScore: 742,
    raw: '80/90',
    status: 'PASSED'
  }];
  var h = APlus.learner.getHistory();
  assert.strictEqual(h.length, 6, 'length was ' + h.length);
  assert.strictEqual(h[0].scaledScore, 742, 'the newest attempt must sort first');
  assert.strictEqual(h[1].scaledScore, 655);
});

/* ================================================================== *
 * canonical readiness compute
 * ================================================================== */

console.log('\ncanonical readiness compute\n');

test('history fallback predicts 620 to 660 for the seeded set', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var r = computeSeeded();
  assert.strictEqual(r.source, 'history', 'source was ' + r.source);
  assert.ok(r.predicted >= 620 && r.predicted <= 660, 'predicted was ' + r.predicted);
  assert.notStrictEqual(r.predicted, 500, 'predicted must never be the 500 coin flip with real attempts');
});

test('readiness lands between 30 and 55 percent, never 5', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var r = computeSeeded();
  assert.ok(r.readiness >= 30 && r.readiness <= 55, 'readiness was ' + r.readiness);
});

test('the "You" marker on the gap scale equals predicted', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var r = computeSeeded();
  var markup = hw.buildGapScale(r.predicted, r.passing);
  assert.ok(markup.indexOf('>You <span class="tnum">' + r.predicted + '</span>') >= 0,
    'marker did not carry ' + r.predicted + ': ' + markup);
  assert.strictEqual(markup.indexOf('You <span class="tnum">500</span>'), -1, 'the 500 marker is back');
});

test('recent pass rate reads "2 of 5 passed"', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var r = computeSeeded();
  assert.strictEqual(readiness2.format.passRateText(r), '2 of 5 passed');
  assert.strictEqual(r.passRate.passes, 2);
  assert.strictEqual(r.passRate.attempts, 5);
});

test('compute is deterministic across two calls', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var a = computeSeeded();
  var b = computeSeeded();
  assert.strictEqual(a.predicted, b.predicted);
  assert.strictEqual(a.readiness, b.readiness);
  assert.deepStrictEqual(readiness2.format.summary(a), readiness2.format.summary(b));
});

test('a prediction at or above the pass mark never reads under 50 percent', function () {
  var high = [{ examType: 'core1', scaledScore: 690, passed: true, timestamp: BASE_TS }];
  var r = readiness2.compute({ exam: 'core1', history: high });
  assert.ok(r.predicted >= r.passing, 'predicted ' + r.predicted + ' vs passing ' + r.passing);
  assert.ok(r.readiness >= 50, 'readiness was ' + r.readiness);
});

test('objective evidence and history blend 60/40 when both are thick', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var stats = {};
  ['1', '2', '3', '4', '5'].forEach(function (d) {
    stats['core1|' + d + '.1'] = {
      exam: 'core1', code: d + '.1', domain: '', wCorrect: 10, wTotal: 10,
      rawCorrect: 10, rawTotal: 10, lastUpdate: Date.now()
    };
  });
  var r = readiness2.compute({ exam: 'core1', stats: stats, history: APlus.learner.getHistory(), now: Date.now() });
  assert.strictEqual(r.source, 'blend');
  var expected = Math.round(0.6 * r.predictedObjective + 0.4 * r.predictedHistory);
  assert.ok(Math.abs(r.predicted - expected) <= 1, 'predicted ' + r.predicted + ' vs ' + expected);
});

/* ================================================================== *
 * cold state
 * ================================================================== */

console.log('\ncold state\n');

test('no history and no objective stats yields "--" everywhere', function () {
  var r = readiness2.compute({ exam: 'core1', history: [], stats: {} });
  var sum = readiness2.format.summary(r);
  assert.strictEqual(sum.hasData, false);
  assert.strictEqual(sum.readinessText, '--');
  assert.strictEqual(sum.predictedText, '--');
  assert.strictEqual(sum.passRateText, 'No attempts yet');
  assert.strictEqual(sum.statusText, 'No attempts yet');
  assert.ok(hw.buildRingMarkup(null).indexOf('>--<') >= 0, 'cold ring must show --');
  assert.strictEqual(hw.buildGapScale(null, 675), '', 'cold state must not draw a gap scale');
});

test('"--" is not shown once a single attempt exists', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var sum = readiness2.format.summary(computeSeeded());
  assert.strictEqual(sum.hasData, true);
  assert.notStrictEqual(sum.readinessText, '--');
  assert.notStrictEqual(sum.predictedText, '--');
});

/* ================================================================== *
 * every surface agrees
 * ================================================================== */

console.log('\nevery surface agrees\n');

test('analytics and the hero render identical numbers', function () {
  seedHistory(SCOPED_HISTORY_KEY);

  // What the hero renders.
  var heroSummary = readiness2.format.summary(computeSeeded());
  // What the results analytics panel renders.
  var analyticsSummary = APlus.analytics.readinessSummary({ examType: 'core1' });

  assert.deepStrictEqual(analyticsSummary, heroSummary);
  assert.strictEqual(analyticsSummary.passRateText, '2 of 5 passed');
  assert.strictEqual(analyticsSummary.predictedText, heroSummary.predictedText);
  assert.strictEqual(analyticsSummary.readinessText, heroSummary.readinessText);
});

test('analytics readiness index is a view over the same summary', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var sum = readiness2.format.summary(computeSeeded());
  var idx = APlus.analytics.calculateReadinessIndex({ examType: 'core1' });
  assert.strictEqual(idx.predicted, sum.predicted);
  assert.strictEqual(idx.readiness, sum.readiness);
  assert.strictEqual(idx.passRateText, sum.passRateText);
});

test('mock card stats read the same history array', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var rows = hw.readHistory(); // canonical, mapped oldest first
  assert.strictEqual(rows.length, 5);
  assert.strictEqual(rows[rows.length - 1].scaledScore, 655, 'last entry must be the newest attempt');
  var s = hw.summarizeAttempts(rows);
  assert.strictEqual(s.last, 655);
  assert.strictEqual(s.best, 703);
  assert.strictEqual(s.attempts, 5);

  var sum = readiness2.format.summary(computeSeeded());
  var html = hw.buildCardStats(s, [], sum.passRateText);
  assert.ok(html.indexOf('>655<') >= 0, 'card must show the newest score: ' + html);
  assert.ok(html.indexOf('2 of 5 passed') >= 0, 'card must carry the shared pass rate: ' + html);
});

test('the caption and the ring cannot contradict each other', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var sum = readiness2.format.summary(computeSeeded());
  assert.strictEqual(sum.lastAttemptText, 'Last attempt 655');
  // Last attempt is under the pass mark, so readiness must read under 50.
  assert.ok(sum.readiness < 50, 'readiness was ' + sum.readiness);

  var above = readiness2.compute({
    exam: 'core1',
    history: [{ examType: 'core1', scaledScore: 703, passed: true, timestamp: BASE_TS }],
    stats: {}
  });
  var aboveSum = readiness2.format.summary(above);
  assert.strictEqual(aboveSum.lastAttemptText, 'Last attempt 703');
  assert.ok(aboveSum.readiness >= 50, 'readiness was ' + aboveSum.readiness);
});

/* ---------------- house rules ---------------- */

test('no emoji and no em dashes in the shared strings', function () {
  seedHistory(SCOPED_HISTORY_KEY);
  var sum = readiness2.format.summary(computeSeeded());
  var text = [sum.statusText, sum.passRateText, sum.lastAttemptText, sum.predictedText, sum.readinessText].join(' ');
  assert.strictEqual(text.indexOf('—'), -1, 'em dash found');
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text), 'emoji found');
});

/* ---------------- summary ---------------- */

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
