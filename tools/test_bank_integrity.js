/**
 * tools/test_bank_integrity.js
 * Node unit test for js/bank-integrity.js, the one-time repair for practice
 * data recorded against the miskeyed bank that shipped before 3.1.3.
 * Run: node tools/test_bank_integrity.js
 */

'use strict';

var path = require('path');
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
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

/** Loads a fresh module against a stub window with an in-memory store. */
function load(opts) {
  opts = opts || {};
  var data = Object.assign({}, opts.initial || {});
  var win = {
    APlus: {
      storage: {
        get: function (k, d) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : d; },
        set: function (k, v) { data[k] = v; }
      }
    }
  };
  if (opts.history) win.APlus.learner = { getHistory: function () { return opts.history; } };

  var file = path.join(__dirname, '..', 'js', 'bank-integrity.js');
  delete require.cache[require.resolve(file)];
  var prev = global.window;
  global.window = win;
  try {
    require(file);
  } finally {
    if (prev === undefined) delete global.window; else global.window = prev;
  }
  return { api: win.APlus.bankIntegrity, data: data };
}

console.log('\nbank integrity repair\n');

test('a fresh install records the marker and raises no notice', function () {
  var ctx = load({ history: [] });
  var m = ctx.api.apply();
  assert.ok(m.appliedAt > 0, 'marker should carry a timestamp');
  assert.strictEqual(m.affectedAttempts, 0);
  assert.strictEqual(ctx.api.noticePending(), false, 'nothing to explain on a clean install');
});

test('existing attempts are counted and the notice is raised', function () {
  var ctx = load({
    history: [
      { timestamp: 1000, scaledScore: 500 },
      { timestamp: 2000, scaledScore: 600 }
    ]
  });
  var m = ctx.api.apply();
  assert.strictEqual(m.affectedAttempts, 2);
  assert.strictEqual(ctx.api.noticePending(), true);
});

test('polluted objective statistics are cleared, history is never deleted', function () {
  var hist = [{ timestamp: 1000, scaledScore: 500 }];
  var ctx = load({
    history: hist,
    initial: { objective_stats: { '1.1': { seen: 12, correct: 5 }, '2.3': { seen: 8, correct: 2 } } }
  });
  var m = ctx.api.apply();
  assert.strictEqual(m.clearedObservations, 20, 'should count every observation it clears');
  assert.deepStrictEqual(ctx.data.objective_stats, {}, 'statistics are reset');
  assert.strictEqual(hist.length, 1, 'attempt history is left untouched');
});

test('attempts finished before the cutoff are stale, later ones are not', function () {
  var ctx = load({ history: [] });
  var at = ctx.api.cutoff();
  assert.ok(at > 0);
  assert.strictEqual(ctx.api.isStale({ timestamp: at - 1000 }), true);
  assert.strictEqual(ctx.api.isStale({ timestamp: at + 1000 }), false);
});

test('an attempt stamped with the current bank revision always counts', function () {
  var ctx = load({ history: [] });
  var at = ctx.api.cutoff();
  var rev = ctx.api.BANK_REVISION;
  assert.strictEqual(ctx.api.isStale({ timestamp: at - 5000, bankRevision: rev }), false,
    'a corrected-era attempt must survive even with an older timestamp');
});

test('an attempt with no timestamp and no revision is treated as stale', function () {
  var ctx = load({ history: [] });
  ctx.api.apply();
  assert.strictEqual(ctx.api.isStale({ scaledScore: 500 }), true);
});

test('the repair runs only once and keeps its original cutoff', function () {
  var ctx = load({ history: [{ timestamp: 1000, scaledScore: 500 }] });
  var first = ctx.api.apply();
  var second = ctx.api.apply();
  assert.strictEqual(first.appliedAt, second.appliedAt, 'the cutoff must not move on later launches');
  assert.strictEqual(second.affectedAttempts, first.affectedAttempts);
});

test('asking for the cutoff triggers the repair when boot has not run', function () {
  var ctx = load({ history: [{ timestamp: 1000, scaledScore: 500 }] });
  // No apply() call: cutoff() is the first thing touched, as it would be if
  // readiness computed before the boot hook fired.
  var at = ctx.api.cutoff();
  assert.ok(at > 0, 'cutoff should self-heal by applying the repair');
  assert.ok(ctx.data.bank_fix_v2, 'the marker should now exist');
});

test('dismissing the notice sticks', function () {
  var ctx = load({ history: [{ timestamp: 1000, scaledScore: 500 }] });
  ctx.api.apply();
  assert.strictEqual(ctx.api.noticePending(), true);
  ctx.api.dismissNotice();
  assert.strictEqual(ctx.api.noticePending(), false);
});

test('missing storage degrades quietly rather than throwing', function () {
  var file = path.join(__dirname, '..', 'js', 'bank-integrity.js');
  delete require.cache[require.resolve(file)];
  var prev = global.window;
  global.window = { APlus: {} };
  try {
    require(file);
    var api = global.window.APlus.bankIntegrity;
    assert.doesNotThrow(function () { api.apply(); api.cutoff(); api.isStale({}); });
    assert.strictEqual(api.cutoff(), 0, 'no storage means nothing is excluded');
  } finally {
    if (prev === undefined) delete global.window; else global.window = prev;
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
