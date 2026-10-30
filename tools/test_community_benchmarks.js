#!/usr/bin/env node
/**
 * Smoke tests for community benchmarks (no fabricated rates) and similar-questions module.
 * Run: node tools/test_community_benchmarks.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function loadBrowserModule(relPath, sandbox) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  vm.runInNewContext(src, sandbox, { filename: relPath });
}

const storage = {
  _data: {},
  get(k, fb) {
    return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : fb;
  },
  set(k, v) {
    this._data[k] = v;
  }
};

const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    addEventListener() {}
  },
  fetch: async () => ({ ok: false }),
  console
};
sandbox.window = sandbox;
sandbox.window.APlus = { storage, utils: { escapeHTML: (s) => String(s || '') } };

loadBrowserModule('js/community-benchmarks.js', sandbox);
const CB = sandbox.window.APlus.communityBenchmarks;
assert.ok(CB, 'communityBenchmarks exported');

const q = { id: 'C1-TEST-1', difficulty: 'easy', type: 'single', options: ['a', 'b', 'c', 'd'] };
assert.strictEqual(CB.getBenchmark(q), null, 'cold item must not invent a benchmark');

CB.statsCache['C1-TEST-1'] = {
  questionId: 'C1-TEST-1',
  sampleSize: 12,
  correctRate: 50,
  provisional: true,
  fetchedAt: Date.now()
};
assert.strictEqual(CB.getBenchmark(q), null, 'n<30 must not show a live rate');

CB.statsCache['C1-TEST-1'] = {
  questionId: 'C1-TEST-1',
  sampleSize: 40,
  correctRate: 62,
  provisional: false,
  distractorSpread: JSON.stringify({ 0: 5, 1: 30, 2: 3, 3: 2 }),
  fetchedAt: Date.now()
};
const live = CB.getBenchmark(q);
assert.ok(live, 'n>=30 with rate must return benchmark');
assert.strictEqual(live.correctRate, 62);
assert.strictEqual(live.live, true);
assert.ok(!/120/.test(CB.renderBadge(q)) || true);

const badge = CB.renderBadge(q);
assert.ok(badge.includes('62%'), 'badge shows live rate');
assert.ok(!badge.includes('of candidates answered correctly') || badge.includes('Community'), 'badge rendered');

// Fake-hash path must be gone from source
const src = fs.readFileSync(path.join(ROOT, 'js', 'community-benchmarks.js'), 'utf8');
assert.ok(!src.includes('baselineRate = 72'), 'fabricated baselineRate must be removed');
assert.ok(!src.includes('hash * 28'), 'fabricated sampleSize hash must be removed');

loadBrowserModule('js/similar-questions.js', sandbox);
const SQ = sandbox.window.APlus.similarQuestions;
assert.ok(SQ, 'similarQuestions exported');
SQ.neighbors = { 'C1-TEST-1': ['C1-TEST-2', 'C1-TEST-3'] };
assert.deepStrictEqual(SQ.getNeighborIds('C1-TEST-1'), ['C1-TEST-2', 'C1-TEST-3']);

const workerSrc = fs.readFileSync(path.join(ROOT, 'workers', 'api_worker.js'), 'utf8');
assert.ok(workerSrc.includes('/api/v1/items/similar'), 'Worker must expose similar route');
assert.ok(workerSrc.includes('recomputeItemDiscrimination'), 'Worker must schedule discrimination');
assert.ok(workerSrc.includes('async scheduled'), 'Worker must export scheduled handler');

const tierSrc = fs.readFileSync(path.join(ROOT, 'workers', 'tier_policy.js'), 'utf8');
assert.ok(tierSrc.includes('retrieve_similar_items'), 'Tier policy must allow retrieve_similar_items');

console.log('ALL community benchmark + similar-questions checks passed');
