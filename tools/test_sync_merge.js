/**
 * Node test for js/sync.js merge logic.
 * Run with: node tools/test_sync_merge.js
 *
 * Stubs a minimal `window` (no document, no localStorage) before requiring
 * sync.js, so the file's browser-runtime section short-circuits and only
 * the pure merge API is attached.
 */
'use strict';

var assert = require('assert');
var path = require('path');

var stubWindow = { APlus: {} };
global.window = stubWindow;

var syncPath = path.join(__dirname, '..', 'js', 'sync.js');
delete require.cache[require.resolve(syncPath)];
require(syncPath);

var sync = stubWindow.APlus && stubWindow.APlus.sync;

assert.ok(sync, 'APlus.sync should be attached to the stub window');
assert.strictEqual(typeof sync.merge, 'function', 'APlus.sync.merge must be a function');

var failures = 0;
var passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok - ' + name);
  } catch (err) {
    failures++;
    console.error('  FAIL - ' + name);
    console.error('    ' + (err && err.stack ? err.stack : err));
  }
}

function entry(v, u) { return { v: v, u: u }; }

/* ------------------------------------------------------------------ *
 * 1. Newest-wins per plain key
 * ------------------------------------------------------------------ */
test('plain key: newest updatedAt wins', function () {
  var local = { keys: { comptia_theme: entry('"dark"', '2024-01-01T00:00:00.000Z') }, updatedAt: '2024-01-01T00:00:00.000Z' };
  var remote = { keys: { comptia_theme: entry('"light"', '2024-06-01T00:00:00.000Z') }, updatedAt: '2024-06-01T00:00:00.000Z' };
  var merged = sync.merge(local, remote);
  assert.strictEqual(merged.keys.comptia_theme.v, '"light"');

  var local2 = { keys: { comptia_theme: entry('"dark"', '2024-09-01T00:00:00.000Z') }, updatedAt: '2024-09-01T00:00:00.000Z' };
  var remote2 = { keys: { comptia_theme: entry('"light"', '2024-06-01T00:00:00.000Z') }, updatedAt: '2024-06-01T00:00:00.000Z' };
  var merged2 = sync.merge(local2, remote2);
  assert.strictEqual(merged2.keys.comptia_theme.v, '"dark"');
});

test('plain key: value present on only one side survives', function () {
  var local = { keys: { comptia_tutor_mode: entry('"on"', '2024-01-01T00:00:00.000Z') }, updatedAt: '2024-01-01T00:00:00.000Z' };
  var remote = { keys: {}, updatedAt: null };
  var merged = sync.merge(local, remote);
  assert.strictEqual(merged.keys.comptia_tutor_mode.v, '"on"');
});

/* ------------------------------------------------------------------ *
 * 2. History union without duplicates
 * ------------------------------------------------------------------ */
test('history: union without duplicates, sorted newest first', function () {
  var histA = [
    { id: 'a1', date: '1/1/2024 9:00 AM', examType: 'CORE1', scaledScore: 720, raw: '80/90', status: 'PASSED' },
    { id: 'a2', date: '1/2/2024 9:00 AM', examType: 'CORE1', scaledScore: 650, raw: '70/90', status: 'FAILED' }
  ];
  var histB = [
    { id: 'a2', date: '1/2/2024 9:00 AM', examType: 'CORE1', scaledScore: 650, raw: '70/90', status: 'FAILED' }, // duplicate of a2
    { id: 'a3', date: '1/3/2024 9:00 AM', examType: 'CORE2', scaledScore: 800, raw: '90/90', status: 'PASSED' }
  ];
  var local = { keys: { comptia_a_plus_history: entry(JSON.stringify(histA), '2024-01-02T09:00:00.000Z') }, updatedAt: '2024-01-02T09:00:00.000Z' };
  var remote = { keys: { comptia_a_plus_history: entry(JSON.stringify(histB), '2024-01-03T09:00:00.000Z') }, updatedAt: '2024-01-03T09:00:00.000Z' };

  var merged = sync.merge(local, remote);
  var mergedHist = JSON.parse(merged.keys.comptia_a_plus_history.v);

  assert.strictEqual(mergedHist.length, 3, 'expected 3 unique attempts, got ' + mergedHist.length);
  var ids = mergedHist.map(function (e) { return e.id; }).sort();
  assert.deepStrictEqual(ids, ['a1', 'a2', 'a3']);
  // Newest first (a3 has the latest date).
  assert.strictEqual(mergedHist[0].id, 'a3');
});

test('history: dedupes entries without an id via content fingerprint', function () {
  var row = { date: '1/1/2024 9:00 AM', examType: 'CORE1', scaledScore: 720, raw: '80/90', status: 'PASSED' };
  var local = { keys: { comptia_a_plus_history: entry(JSON.stringify([row]), '2024-01-01T09:00:00.000Z') }, updatedAt: '2024-01-01T09:00:00.000Z' };
  var remote = { keys: { comptia_a_plus_history: entry(JSON.stringify([row]), '2024-01-01T09:00:00.000Z') }, updatedAt: '2024-01-01T09:00:00.000Z' };
  var merged = sync.merge(local, remote);
  var mergedHist = JSON.parse(merged.keys.comptia_a_plus_history.v);
  assert.strictEqual(mergedHist.length, 1);
});

/* ------------------------------------------------------------------ *
 * 3. Missed pool union
 * ------------------------------------------------------------------ */
test('missed pool: id union without duplicates', function () {
  var local = { keys: { comptia_a_plus_missed: entry(JSON.stringify(['q1', 'q2']), '2024-01-01T00:00:00.000Z') }, updatedAt: '2024-01-01T00:00:00.000Z' };
  var remote = { keys: { comptia_a_plus_missed: entry(JSON.stringify(['q2', 'q3']), '2024-01-02T00:00:00.000Z') }, updatedAt: '2024-01-02T00:00:00.000Z' };
  var merged = sync.merge(local, remote);
  var mergedMissed = JSON.parse(merged.keys.comptia_a_plus_missed.v);
  assert.deepStrictEqual(mergedMissed.slice().sort(), ['q1', 'q2', 'q3']);
});

/* ------------------------------------------------------------------ *
 * 4. SRS per-card merge (newest lastReview wins per card)
 * ------------------------------------------------------------------ */
test('SRS: per-card merge picks newest lastReviewed, keeps unique cards from both sides', function () {
  var srsA = {
    version: 1,
    cards: {
      q1: { repetitions: 1, interval: 1, easeFactor: 2.5, lastReviewed: '2024-01-01T00:00:00.000Z' },
      q2: { repetitions: 3, interval: 6, easeFactor: 2.6, lastReviewed: '2024-01-05T00:00:00.000Z' }
    }
  };
  var srsB = {
    version: 1,
    cards: {
      q1: { repetitions: 2, interval: 3, easeFactor: 2.5, lastReviewed: '2024-01-03T00:00:00.000Z' }, // newer than A's q1
      q3: { repetitions: 0, interval: 1, easeFactor: 2.5, lastReviewed: '2024-01-02T00:00:00.000Z' }
    }
  };
  var local = { keys: { comptia_memory_srs_v1: entry(JSON.stringify(srsA), '2024-01-05T00:00:00.000Z') }, updatedAt: '2024-01-05T00:00:00.000Z' };
  var remote = { keys: { comptia_memory_srs_v1: entry(JSON.stringify(srsB), '2024-01-03T00:00:00.000Z') }, updatedAt: '2024-01-03T00:00:00.000Z' };

  var merged = sync.merge(local, remote);
  var mergedSrs = JSON.parse(merged.keys.comptia_memory_srs_v1.v);

  assert.strictEqual(Object.keys(mergedSrs.cards).length, 3);
  assert.strictEqual(mergedSrs.cards.q1.repetitions, 2, 'q1 should take remote (newer lastReviewed)');
  assert.strictEqual(mergedSrs.cards.q2.repetitions, 3, 'q2 only exists locally, must survive');
  assert.strictEqual(mergedSrs.cards.q3.repetitions, 0, 'q3 only exists remotely, must survive');
});

test('SRS: flat deck shape (qId -> card) merges per-card too', function () {
  var deckA = { q1: { repetitions: 1, lastReviewed: 1000 } };
  var deckB = { q1: { repetitions: 4, lastReviewed: 5000 }, q2: { repetitions: 0, lastReviewed: 2000 } };
  var local = { keys: { aplus3_srs_deck: entry(JSON.stringify(deckA), '2024-01-01T00:00:00.000Z') }, updatedAt: '2024-01-01T00:00:00.000Z' };
  var remote = { keys: { aplus3_srs_deck: entry(JSON.stringify(deckB), '2024-01-02T00:00:00.000Z') }, updatedAt: '2024-01-02T00:00:00.000Z' };
  var merged = sync.merge(local, remote);
  var mergedDeck = JSON.parse(merged.keys.aplus3_srs_deck.v);
  assert.strictEqual(mergedDeck.q1.repetitions, 4);
  assert.strictEqual(mergedDeck.q2.repetitions, 0);
});

/* ------------------------------------------------------------------ *
 * 5. Excluded keys never appear in the outbound payload
 * ------------------------------------------------------------------ */
test('excluded keys (groq/license/telemetry/api_key/master db) never appear in merge output', function () {
  var local = {
    keys: {
      aplus3_groq_api_key: entry('"sk-secret"', '2024-01-01T00:00:00.000Z'),
      aplus3_groq_enabled: entry('true', '2024-01-01T00:00:00.000Z'),
      comptia_license_key: entry('"XXXX-YYYY"', '2024-01-01T00:00:00.000Z'),
      comptia_telemetry_buffer: entry('[1,2,3]', '2024-01-01T00:00:00.000Z'),
      comptia_database_master_v3: entry('{"huge":"blob"}', '2024-01-01T00:00:00.000Z'),
      comptia_theme: entry('"dark"', '2024-01-01T00:00:00.000Z')
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  var remote = { keys: {}, updatedAt: null };
  var merged = sync.merge(local, remote);

  assert.ok(!('aplus3_groq_api_key' in merged.keys), 'groq api key must be excluded');
  assert.ok(!('aplus3_groq_enabled' in merged.keys), 'groq_enabled matches /groq/ and must be excluded');
  assert.ok(!('comptia_license_key' in merged.keys), 'license key must be excluded');
  assert.ok(!('comptia_telemetry_buffer' in merged.keys), 'telemetry buffer must be excluded');
  assert.ok(!('comptia_database_master_v3' in merged.keys), 'master db blob must be excluded');
  assert.ok('comptia_theme' in merged.keys, 'ordinary keys must still pass through');
});

test('isExcludedKey matches the documented patterns directly', function () {
  assert.strictEqual(sync.isExcludedKey('aplus3_groq_api_key'), true);
  assert.strictEqual(sync.isExcludedKey('anything_license_anything'), true);
  assert.strictEqual(sync.isExcludedKey('telemetry_buffer'), true);
  assert.strictEqual(sync.isExcludedKey('some_api_key_field'), true);
  assert.strictEqual(sync.isExcludedKey('comptia_database_master'), true);
  assert.strictEqual(sync.isExcludedKey('comptia_database_master_v3'), true);
  assert.strictEqual(sync.isExcludedKey('comptia_a_plus_history'), false);
});

/* ------------------------------------------------------------------ *
 * 6. Idempotency: merge(a, merge(a,b)) === merge(a,b)
 * ------------------------------------------------------------------ */
test('idempotency: merge(a, merge(a,b)) deep-equals merge(a,b) across mixed key kinds', function () {
  var a = {
    keys: {
      comptia_theme: entry('"dark"', '2024-01-01T00:00:00.000Z'),
      comptia_a_plus_history: entry(JSON.stringify([
        { id: 'h1', date: '1/1/2024', examType: 'CORE1', scaledScore: 700, raw: '75/90', status: 'PASSED' }
      ]), '2024-01-01T00:00:00.000Z'),
      comptia_a_plus_missed: entry(JSON.stringify(['q1', 'q5']), '2024-01-01T00:00:00.000Z'),
      comptia_memory_srs_v1: entry(JSON.stringify({
        version: 1,
        cards: { q1: { repetitions: 1, lastReviewed: '2024-01-01T00:00:00.000Z' } }
      }), '2024-01-01T00:00:00.000Z')
    },
    updatedAt: '2024-01-01T00:00:00.000Z'
  };
  var b = {
    keys: {
      comptia_theme: entry('"light"', '2024-02-01T00:00:00.000Z'),
      comptia_a_plus_history: entry(JSON.stringify([
        { id: 'h2', date: '1/5/2024', examType: 'CORE2', scaledScore: 810, raw: '88/90', status: 'PASSED' }
      ]), '2024-01-05T00:00:00.000Z'),
      comptia_a_plus_missed: entry(JSON.stringify(['q5', 'q9']), '2024-01-05T00:00:00.000Z'),
      comptia_memory_srs_v1: entry(JSON.stringify({
        version: 1,
        cards: { q1: { repetitions: 3, lastReviewed: '2024-01-06T00:00:00.000Z' }, q2: { repetitions: 0, lastReviewed: '2024-01-02T00:00:00.000Z' } }
      }), '2024-01-06T00:00:00.000Z')
    },
    updatedAt: '2024-01-06T00:00:00.000Z'
  };

  var m1 = sync.merge(a, b);
  var m2 = sync.merge(a, m1);
  var m3 = sync.merge(m1, m1);

  assert.deepStrictEqual(m2, m1, 'merge(a, merge(a,b)) must equal merge(a,b)');
  assert.deepStrictEqual(m3, m1, 'merge(m,m) must equal m (idempotent under self-merge)');
});

test('idempotency holds for empty / missing sides', function () {
  var empty = { keys: {}, updatedAt: null };
  var m1 = sync.merge(empty, empty);
  var m2 = sync.merge(empty, m1);
  assert.deepStrictEqual(m2, m1);

  var onlyLocal = { keys: { comptia_theme: entry('"dark"', '2024-01-01T00:00:00.000Z') }, updatedAt: '2024-01-01T00:00:00.000Z' };
  var r1 = sync.merge(onlyLocal, empty);
  var r2 = sync.merge(onlyLocal, r1);
  assert.deepStrictEqual(r2, r1);
});

/* ------------------------------------------------------------------ */

console.log('\n' + passed + ' passed, ' + failures + ' failed.');
if (failures > 0) {
  process.exit(1);
}
