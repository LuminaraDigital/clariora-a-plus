/**
 * tools/test_soft_streak.js
 * Unit tests for P0 soft streak helpers exported on CompTIALedger.
 *
 * Loads ledger_engine.js in a bare vm sandbox (same pattern as test_shell_gate /
 * test_curriculum). Pure helpers (computeSoftStreak, localDayKey) do not need
 * crypto; the UMD IIFE only defines functions at load time.
 *
 * Run: node tools/test_soft_streak.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var ROOT = path.resolve(__dirname, '..');
var LEDGER = path.join(ROOT, 'ledger_engine.js');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ok   ' + name);
  } catch (err) {
    failed += 1;
    console.log('  FAIL ' + name);
    console.log(
      '       ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n       ') : err)
    );
  }
}

function loadLedger() {
  var windowObj = {};
  var sandbox = {
    window: windowObj,
    console: console,
    Date: Date,
    Math: Math,
    Set: Set,
    Array: Array,
    Object: Object,
    Number: Number,
    String: String,
    JSON: JSON,
    parseInt: parseInt,
    isNaN: isNaN
  };
  sandbox.global = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(LEDGER, 'utf8'), sandbox, { filename: 'ledger_engine.js' });
  assert.ok(sandbox.window.CompTIALedger, 'CompTIALedger should attach to window');
  return sandbox.window.CompTIALedger;
}

function shiftDay(isoDay, delta) {
  var d = new Date(String(isoDay) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

console.log('=== Soft streak (P0) ===\n');

var L = loadLedger();

test('exports computeSoftStreak, localDayKey, getStreak, QUALIFYING_STREAK_TYPES', function () {
  assert.strictEqual(typeof L.computeSoftStreak, 'function');
  assert.strictEqual(typeof L.localDayKey, 'function');
  assert.strictEqual(typeof L.getStreak, 'function');
  assert.ok(L.QUALIFYING_STREAK_TYPES && typeof L.QUALIFYING_STREAK_TYPES.has === 'function');
  assert.ok(L.QUALIFYING_STREAK_TYPES.has('EXAM_COMPLETE'));
  assert.ok(L.QUALIFYING_STREAK_TYPES.has('DAILY_QUEST_COMPLETE'));
  assert.ok(L.QUALIFYING_STREAK_TYPES.has('MEMORY_RECALL'));
  assert.ok(!L.QUALIFYING_STREAK_TYPES.has('SPEND_INSIGHT'));
  assert.ok(!L.QUALIFYING_STREAK_TYPES.has('DOMAIN_STAKE_LOCK'));
});

test('localDayKey returns YYYY-MM-DD in local calendar', function () {
  var key = L.localDayKey(new Date(2026, 8, 24, 15, 30, 0));
  assert.strictEqual(key, '2026-09-24');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(L.localDayKey()));
});

test('empty set => streak 0, not frozen', function () {
  var r = L.computeSoftStreak(new Set(), '2026-09-24');
  assert.strictEqual(r.streak, 0);
  assert.strictEqual(r.streakFrozen, false);
  assert.strictEqual(r.lastQualifyingDay, null);
});

test('active today: consecutive run, not frozen', function () {
  var today = '2026-09-24';
  var set = new Set([
    today,
    shiftDay(today, -1),
    shiftDay(today, -2)
  ]);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.streak, 3);
  assert.strictEqual(r.streakFrozen, false);
  assert.strictEqual(r.lastQualifyingDay, today);
});

test('last was yesterday: live streak, not frozen', function () {
  var today = '2026-09-24';
  var yday = shiftDay(today, -1);
  var set = new Set([yday, shiftDay(today, -2), shiftDay(today, -3)]);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.streak, 3);
  assert.strictEqual(r.streakFrozen, false);
  assert.strictEqual(r.lastQualifyingDay, yday);
});

test('miss 1 calendar day: frozen, streak preserved', function () {
  var today = '2026-09-24';
  var last = shiftDay(today, -2);
  var set = new Set([last, shiftDay(today, -3), shiftDay(today, -4)]);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.streak, 3);
  assert.strictEqual(r.streakFrozen, true);
  assert.strictEqual(r.lastQualifyingDay, last);
});

test('miss 2 consecutive days: reset to 0', function () {
  var today = '2026-09-24';
  var last = shiftDay(today, -3);
  var set = new Set([last, shiftDay(today, -4), shiftDay(today, -5)]);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.streak, 0);
  assert.strictEqual(r.streakFrozen, false);
  assert.strictEqual(r.lastQualifyingDay, last);
});

test('return after freeze bridges one hole', function () {
  var today = '2026-09-24';
  // Mon Tue Wed [miss Thu] Fri(today)
  var fri = today;
  var wed = shiftDay(today, -2);
  var tue = shiftDay(today, -3);
  var mon = shiftDay(today, -4);
  var set = new Set([fri, wed, tue, mon]);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.streak, 4);
  assert.strictEqual(r.streakFrozen, false);
  assert.strictEqual(r.lastQualifyingDay, fri);
});

test('two holes: only one freeze bridge, then stop', function () {
  var today = '2026-09-24';
  // Fri + Wed + Mon (two gaps)
  var set = new Set([today, shiftDay(today, -2), shiftDay(today, -4)]);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.streak, 2);
  assert.strictEqual(r.streakFrozen, false);
});

test('future days beyond todayKey are ignored for lastQualifyingDay', function () {
  var today = '2026-09-20';
  var set = new Set(['2026-09-19', '2026-09-21']);
  var r = L.computeSoftStreak(set, today);
  assert.strictEqual(r.lastQualifyingDay, '2026-09-19');
  assert.strictEqual(r.streak, 1);
  assert.strictEqual(r.streakFrozen, false);
});

test('claimDailyQuest stub is exported', function () {
  assert.strictEqual(typeof L.claimDailyQuest, 'function');
});

console.log('');
if (failed) {
  console.log('FAILED: ' + failed + ' (passed ' + passed + ')');
  process.exit(1);
}
console.log('PASSED: ' + passed);
process.exit(0);
