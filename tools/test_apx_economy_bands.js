#!/usr/bin/env node
/**
 * Asserts tools/apx_economy_params.json stays aligned with ledger_engine.js constants.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const params = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/apx_economy_params.json'), 'utf8'));

const sandbox = {
  window: {},
  globalThis: {},
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  crypto: require('crypto').webcrypto,
  console,
  TextEncoder,
  TextDecoder
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'ledger_engine.js'), 'utf8'), sandbox, { filename: 'ledger_engine.js' });
const L = sandbox.CompTIALedger || sandbox.window.CompTIALedger;
assert.ok(L, 'CompTIALedger missing');

assert.strictEqual(L.EARN_RULES.globalDailyApxBudget, params.globalDailyApxBudget);
assert.strictEqual(L.EARN_RULES.examPracticeDailyCap, params.examPracticeDailyCap);
assert.strictEqual(L.EARN_RULES.stakeYieldRate, params.stakeYieldRate);
assert.strictEqual(L.EARN_RULES.memoryDailySoftCap, params.memoryDailySoftCap);
assert.strictEqual(!!L.EARN_RULES.stakeFailBurnsPrincipal, !!params.stakeFailBurnsPrincipal);
assert.strictEqual(L.UNLOCK_CATALOG.PRO_PASS_30D.cost, params.proPassCost);
assert.strictEqual(L.UNLOCK_CATALOG.AI_BURST.cost, params.sinks.AI_BURST);
assert.strictEqual(L.UNLOCK_CATALOG.HINT_PACK.cost, params.sinks.HINT_PACK);
assert.strictEqual(L.UNLOCK_CATALOG.MOCK_UNLOCK.cost, params.sinks.MOCK_UNLOCK);

console.log('ok   apx_economy_params.json matches ledger_engine.js');
