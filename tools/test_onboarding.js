/**
 * tools/test_onboarding.js
 * Node unit test for js/onboarding.js (readiness2 math + today plan composition).
 * Run: node tools/test_onboarding.js
 *
 * Builds a minimal fake window with stubbed APlus.bus / APlus.storage before
 * requiring the module, so the browser boot path is exercised but inert
 * (no document means no DOM work happens).
 */

'use strict';

var path = require('path');
var assert = require('assert');

/* ---------------- minimal fake window ---------------- */

var storeData = {};
var busHandlers = {};

var fakeWindow = {
  APlus: {
    bus: {
      on: function (evt, cb) {
        (busHandlers[evt] = busHandlers[evt] || []).push(cb);
        return function () {};
      },
      emit: function (evt, payload) {
        (busHandlers[evt] || []).forEach(function (cb) { cb(payload); });
      }
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
  // deliberately no `document`: the module must boot without touching the DOM
};

global.window = fakeWindow;

var mod = require(path.join(__dirname, '..', 'js', 'onboarding.js'));
var readiness2 = mod.readiness2;
var buildTodaySet = mod.buildTodaySet;

/* ---------------- tiny test harness ---------------- */

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
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

var NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

function stat(exam, code, domain, correct, total) {
  return {
    exam: exam, code: code, domain: domain,
    wCorrect: correct, wTotal: total,
    rawCorrect: correct, rawTotal: total,
    lastUpdate: NOW
  };
}

var CORE1_DOMAINS = {
  '1': '1.0 Mobile Devices',
  '2': '2.0 Networking',
  '3': '3.0 Hardware',
  '4': '4.0 Virtualization and Cloud Computing',
  '5': '5.0 Hardware and Network Troubleshooting'
};

var CATALOG = [
  { exam: 'core1', code: '1.1', title: 'Laptop hardware components', domain: CORE1_DOMAINS['1'] },
  { exam: 'core1', code: '2.1', title: 'IP, ports and protocols', domain: CORE1_DOMAINS['2'] },
  { exam: 'core1', code: '2.4', title: 'Wireless standards', domain: CORE1_DOMAINS['2'] },
  { exam: 'core1', code: '3.1', title: 'Cable types and connectors', domain: CORE1_DOMAINS['3'] },
  { exam: 'core1', code: '4.1', title: 'Cloud computing concepts', domain: CORE1_DOMAINS['4'] },
  { exam: 'core1', code: '5.1', title: 'Troubleshooting methodology', domain: CORE1_DOMAINS['5'] },
  { exam: 'core1', code: '5.3', title: 'Printer troubleshooting', domain: CORE1_DOMAINS['5'] }
];

/* ---------------- module surface ---------------- */

console.log('\nmodule surface');

test('module attaches readiness2 and onboarding to window.APlus', function () {
  assert.strictEqual(typeof fakeWindow.APlus.readiness2.compute, 'function');
  assert.strictEqual(typeof fakeWindow.APlus.onboarding.startToday, 'function');
  assert.strictEqual(typeof fakeWindow.APlus.onboarding.start, 'function');
  assert.strictEqual(typeof fakeWindow.APlus.onboarding.reset, 'function');
});

/* ---------------- readiness math ---------------- */

console.log('\nreadiness2.compute');

test('all-correct history predicts 900', function () {
  var stats = {};
  ['1', '2', '3', '4', '5'].forEach(function (d) {
    stats['core1|' + d + '.1'] = stat('core1', d + '.1', CORE1_DOMAINS[d], 10, 10);
  });
  var r = readiness2.compute({ stats: stats, exam: 'core1', now: NOW, catalog: CATALOG });
  assert.strictEqual(r.predicted, 900, 'predicted was ' + r.predicted);
  assert.strictEqual(r.passing, 675);
  assert.ok(r.readiness > 95, 'readiness was ' + r.readiness);
});

test('all-wrong history predicts 100', function () {
  var stats = {};
  ['1', '2', '3', '4', '5'].forEach(function (d) {
    stats['core1|' + d + '.1'] = stat('core1', d + '.1', CORE1_DOMAINS[d], 0, 10);
  });
  var r = readiness2.compute({ stats: stats, exam: 'core1', now: NOW, catalog: CATALOG });
  assert.strictEqual(r.predicted, 100, 'predicted was ' + r.predicted);
  assert.ok(r.readiness < 5, 'readiness was ' + r.readiness);
});

test('empty history predicts around 500 with readiness under 50', function () {
  var r = readiness2.compute({ stats: {}, exam: 'core1', now: NOW, catalog: CATALOG });
  assert.ok(Math.abs(r.predicted - 500) <= 5, 'predicted was ' + r.predicted);
  assert.ok(r.readiness < 50, 'readiness was ' + r.readiness);
  assert.strictEqual(r.attempts, 0);
});

test('core2 uses the 700 passing score', function () {
  var r = readiness2.compute({ stats: {}, exam: 'core2', now: NOW, catalog: CATALOG });
  assert.strictEqual(r.passing, 700);
});

test('stale evidence is pulled back toward the 500 midpoint', function () {
  var stats = {};
  ['1', '2', '3', '4', '5'].forEach(function (d) {
    stats['core1|' + d + '.1'] = stat('core1', d + '.1', CORE1_DOMAINS[d], 10, 10);
  });
  var fresh = readiness2.compute({ stats: stats, exam: 'core1', now: NOW, catalog: CATALOG });
  var stale = readiness2.compute({
    stats: stats, exam: 'core1', catalog: CATALOG,
    now: NOW + 28 * 24 * 60 * 60 * 1000 // four half-lives later
  });
  assert.strictEqual(fresh.predicted, 900);
  assert.ok(stale.predicted < fresh.predicted, 'stale ' + stale.predicted + ' vs fresh ' + fresh.predicted);
  assert.ok(stale.predicted > 500, 'stale should still beat a coin flip: ' + stale.predicted);
});

/* ---------------- weakest objective selection ---------------- */

console.log('\nweakest objective selection');

test('ties break by blueprint weight, heaviest domain first', function () {
  var stats = {
    // all three land on posterior 0.375; only the domain weight separates them
    'core1|1.1': stat('core1', '1.1', CORE1_DOMAINS['1'], 0, 2),  // weight 13
    'core1|3.1': stat('core1', '3.1', CORE1_DOMAINS['3'], 1, 4),  // weight 25
    'core1|5.1': stat('core1', '5.1', CORE1_DOMAINS['5'], 0, 2),  // weight 28
    // strong objective must not be selected
    'core1|2.1': stat('core1', '2.1', CORE1_DOMAINS['2'], 10, 10)
  };
  var r = readiness2.compute({ stats: stats, exam: 'core1', now: NOW, catalog: CATALOG });
  var codes = r.weakest.map(function (w) { return w.code; });
  assert.deepStrictEqual(codes, ['5.1', '3.1', '1.1'], 'got ' + JSON.stringify(codes));
  assert.strictEqual(r.weakest[0].title, 'Troubleshooting methodology');
  assert.ok(r.weakest.every(function (w) { return w.attempted === true; }));
});

test('objectives with fewer than 2 attempts are not eligible', function () {
  var stats = {
    'core1|2.1': stat('core1', '2.1', CORE1_DOMAINS['2'], 0, 1), // 1 attempt, ineligible
    'core1|1.1': stat('core1', '1.1', CORE1_DOMAINS['1'], 0, 2)
  };
  var r = readiness2.compute({ stats: stats, exam: 'core1', now: NOW, catalog: CATALOG });
  var attemptedCodes = r.weakest.filter(function (w) { return w.attempted; }).map(function (w) { return w.code; });
  assert.deepStrictEqual(attemptedCodes, ['1.1'], 'got ' + JSON.stringify(attemptedCodes));
});

test('short lists fill from never-attempted objectives in the heaviest domains', function () {
  var stats = { 'core1|1.1': stat('core1', '1.1', CORE1_DOMAINS['1'], 0, 2) };
  var r = readiness2.compute({ stats: stats, exam: 'core1', now: NOW, catalog: CATALOG });
  var codes = r.weakest.map(function (w) { return w.code; });
  assert.strictEqual(codes.length, 3);
  assert.strictEqual(codes[0], '1.1');
  // 5.0 carries weight 28 and 3.0 carries 25, so 5.1 and 5.3 outrank 3.1
  assert.deepStrictEqual(codes.slice(1), ['5.1', '5.3'], 'got ' + JSON.stringify(codes));
  assert.strictEqual(r.weakest[1].attempted, false);
});

/* ---------------- today plan composition ---------------- */

console.log('\nbuildTodaySet');

function makePool() {
  var pool = [];
  var objectives = ['1.1', '2.1', '2.4', '3.1', '4.1', '5.1', '5.3'];
  objectives.forEach(function (code) {
    var domain = CORE1_DOMAINS[code.split('.')[0]];
    for (var i = 1; i <= 20; i++) {
      pool.push({
        id: 'C1-' + code.replace('.', '') + '-' + i,
        exam: 'core1',
        domain: domain,
        objective: code,
        difficulty: 'medium'
      });
    }
  });
  return pool;
}

test('60/40 split with unique ids at 25 minutes per day', function () {
  var pool = makePool();
  var count = Math.round(25 * 1.1); // 28
  var built = buildTodaySet({
    pool: pool,
    exam: 'core1',
    count: count,
    weakKeys: ['core1|5.1', 'core1|3.1', 'core1|1.1'],
    missedIds: [],
    dueIds: []
  });

  assert.strictEqual(built.questions.length, count, 'total was ' + built.questions.length);
  assert.strictEqual(built.targetFocus, Math.round(count * 0.6));
  assert.strictEqual(built.focusCount, Math.round(count * 0.6), 'focus was ' + built.focusCount);
  assert.strictEqual(built.restCount, count - built.targetFocus, 'rest was ' + built.restCount);

  var ids = {};
  built.questions.forEach(function (q) {
    assert.ok(!ids[q.id], 'duplicate id ' + q.id);
    ids[q.id] = true;
  });
});

test('the 60% half only draws weak objectives and missed questions', function () {
  var pool = makePool();
  var built = buildTodaySet({
    pool: pool,
    exam: 'core1',
    count: 28,
    weakKeys: ['core1|5.1', 'core1|3.1', 'core1|1.1'],
    missedIds: ['C1-21-3'],
    dueIds: []
  });
  var focus = built.questions.slice(0, built.focusCount);
  focus.forEach(function (q) {
    var ok = ['5.1', '3.1', '1.1'].indexOf(q.objective) >= 0 || q.id === 'C1-21-3';
    assert.ok(ok, 'unexpected focus question ' + q.id + ' (' + q.objective + ')');
  });
  // the 40% half must avoid the weak objectives entirely while the bank allows it
  built.questions.slice(built.focusCount).forEach(function (q) {
    assert.ok(['5.1', '3.1', '1.1'].indexOf(q.objective) < 0,
      'weak objective leaked into the blueprint half: ' + q.id);
  });
});

test('spaced-repetition due cards are taken first', function () {
  var pool = makePool();
  var due = ['C1-51-1', 'C1-51-2', 'C1-31-1'];
  var built = buildTodaySet({
    pool: pool,
    exam: 'core1',
    count: 28,
    weakKeys: ['core1|5.1', 'core1|3.1', 'core1|1.1'],
    missedIds: [],
    dueIds: due
  });
  var head = built.questions.slice(0, due.length).map(function (q) { return q.id; }).sort();
  assert.deepStrictEqual(head, due.slice().sort(), 'got ' + JSON.stringify(head));
});

test('a small bank is capped rather than padded with duplicates', function () {
  var pool = makePool().slice(0, 9);
  var built = buildTodaySet({ pool: pool, exam: 'core1', count: 28, weakKeys: [], missedIds: [], dueIds: [] });
  assert.strictEqual(built.questions.length, 9);
  var ids = {};
  built.questions.forEach(function (q) {
    assert.ok(!ids[q.id], 'duplicate id ' + q.id);
    ids[q.id] = true;
  });
});

/* ---------------- storage accumulation ---------------- */

console.log('\nobjective_stats accumulation');

test('exam:finished folds perQuestion into objective_stats', function () {
  storeData = {};
  fakeWindow.APlus.onboarding._onExamFinished({
    examType: 'core1',
    totalQuestions: 3,
    scaledScore: 633,
    perQuestion: [
      { id: 'a', objective: '2.4', domain: CORE1_DOMAINS['2'], correct: true },
      { id: 'b', objective: '2.4', domain: CORE1_DOMAINS['2'], correct: false },
      { id: 'c', objective: '1.2', domain: CORE1_DOMAINS['1'], correct: false }
    ]
  });
  var stats = storeData.objective_stats;
  assert.ok(stats, 'objective_stats was not written');
  assert.strictEqual(stats['core1|2.4'].rawTotal, 2);
  assert.strictEqual(stats['core1|2.4'].rawCorrect, 1);
  assert.strictEqual(stats['core1|1.2'].rawCorrect, 0);
  assert.strictEqual(stats['core1|2.4'].exam, 'core1');
});

test('core2 domains are keyed to core2 even when codes collide with core1', function () {
  var stats = mod.accumulateStats({}, [
    { id: 'x', objective: '2.4', domain: '2.0 Security', correct: true },
    { id: 'y', objective: '2.4', domain: '2.0 Networking', correct: false }
  ], { now: NOW });
  assert.strictEqual(stats['core2|2.4'].rawCorrect, 1);
  assert.strictEqual(stats['core1|2.4'].rawCorrect, 0);
});

/* ---------------- summary ---------------- */

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
