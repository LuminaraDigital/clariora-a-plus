#!/usr/bin/env node
/**
 * test_readiness_path.js - Unit checks for the 7-day readiness path planner.
 */
'use strict';

const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const api = require(path.join(ROOT, 'js', 'readiness-path.js'));

assert.strictEqual(typeof api.buildPath, 'function');
assert.strictEqual(typeof api.rankDomains, 'function');

const stats = {
  'core1|2.1': {
    exam: 'core1',
    code: '2.1',
    domain: '2.0 Networking',
    rawCorrect: 1,
    rawTotal: 10,
    wCorrect: 1,
    wTotal: 10,
    lastUpdate: Date.now()
  },
  'core1|3.1': {
    exam: 'core1',
    code: '3.1',
    domain: '3.0 Hardware',
    rawCorrect: 8,
    rawTotal: 10,
    wCorrect: 8,
    wTotal: 10,
    lastUpdate: Date.now()
  }
};

const ranked = api.rankDomains('core1', stats);
assert.ok(ranked.length >= 3);
assert.ok(String(ranked[0].name).toLowerCase().indexOf('network') >= 0, 'weak networking should rank first');

const plan = api.buildPath({ exam: 'core1', stats: stats, minutes: 20 });
assert.strictEqual(plan.version, 1);
assert.strictEqual(plan.exam, 'core1');
assert.strictEqual(plan.days.length, 7);
assert.ok(plan.days[0].focusDomains.length >= 1);
assert.ok(plan.days[0].tinyWin && plan.days[0].tinyWin.label);
assert.ok(plan.days[0].dateKey);

const indexHtml = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(/js\/readiness-path\.js/.test(indexHtml));
assert.ok(/id="readinessPathStrip"/.test(indexHtml));

console.log('PASS readiness-path: day1=', plan.days[0].focusDomains[0]);
process.exit(0);
