/**
 * tools/test_daily_quest.js
 * Pure Node tests for js/daily-quest.js checklist / status helpers.
 * Run: node tools/test_daily_quest.js
 */
'use strict';

var path = require('path');
var assert = require('assert');

var dq = require(path.join(__dirname, '..', 'js', 'daily-quest.js'));

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
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

console.log('\ndaily-quest\n');

test('exports API surface', function () {
  assert.strictEqual(typeof dq.isEnabled, 'function');
  assert.strictEqual(typeof dq.getTodayStatus, 'function');
  assert.strictEqual(typeof dq.buildChecklist, 'function');
  assert.strictEqual(typeof dq.markLeg, 'function');
  assert.strictEqual(typeof dq.renderInto, 'function');
});

test('disabled by default without window config', function () {
  assert.strictEqual(dq.isEnabled(), false);
});

test('checklist has three legs', function () {
  var status = {
    legs: { defend: true, attack: false, recover: false },
    defendSkipped: false
  };
  var list = dq.buildChecklist(status);
  assert.strictEqual(list.length, 3);
  assert.strictEqual(list[0].id, 'defend');
  assert.strictEqual(list[0].done, true);
  assert.strictEqual(list[1].done, false);
  assert.strictEqual(list[2].id, 'recover');
});

test('checklist marks skipped defend hint', function () {
  var list = dq.buildChecklist({
    legs: { defend: true, attack: false, recover: false },
    defendSkipped: true
  });
  assert.ok(String(list[0].hint).indexOf('No cards due') >= 0);
});

test('getTodayStatus returns shape when no DOM', function () {
  var st = dq.getTodayStatus();
  assert.ok(st && typeof st.day === 'string');
  assert.ok(st.legs && typeof st.legs.defend === 'boolean');
  assert.strictEqual(typeof st.progress, 'number');
  assert.strictEqual(typeof st.allComplete, 'boolean');
  assert.strictEqual(st.enabled, false);
});

console.log('\n' + (failed ? 'FAILED: ' + failed : 'PASSED: ' + passed));
process.exit(failed ? 1 : 0);
