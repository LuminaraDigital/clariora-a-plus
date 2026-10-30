#!/usr/bin/env node
/**
 * Unit tests for point-biserial discrimination helper.
 * Run: node tools/test_item_discrimination.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const modPath = path.join(__dirname, '..', 'workers', 'item_discrimination.js');
  const mod = await import(pathToFileURL(modPath).href);
  const { pointBiserialFromGroups } = mod;

  // Strong positive discrimination: high ability get it right.
  const high = [0.8, 0.85, 0.9, 0.95, 0.88, 0.92, 0.87, 0.91, 0.89, 0.93];
  const low = [0.2, 0.25, 0.15, 0.3, 0.22, 0.18, 0.28, 0.21, 0.19, 0.24];
  const r = pointBiserialFromGroups(high, low);
  assert.ok(r != null && r > 0.3, 'expected strong positive point-biserial, got ' + r);

  // Too few samples -> null
  assert.strictEqual(pointBiserialFromGroups([0.9], [0.1]), null);

  // Negative discrimination
  const rNeg = pointBiserialFromGroups(low, high);
  assert.ok(rNeg != null && rNeg < -0.3, 'expected negative point-biserial, got ' + rNeg);

  console.log('ALL item_discrimination unit checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
