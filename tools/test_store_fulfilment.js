/**
 * tools/test_store_fulfilment.js
 * Every paid APX item must deliver its effect, not just record a charge.
 *
 * Runs the real ledger_engine.js and js/engine.js together in one VM sandbox.
 * Run: node tools/test_store_fulfilment.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log('  ok   ' + name);
  } catch (err) {
    failed += 1;
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n       ') : err));
  }
}

function createContext() {
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const emitted = [];
  const windowObj = { APlus: { bus: { emit: (evt, payload) => emitted.push({ evt, payload }), on: () => {} } } };
  const sandbox = {
    window: windowObj,
    console: { ...console, warn: () => {} },
    Date, Math, Set, Map, Array, Object, Number, String, JSON, Promise, parseInt, isNaN,
    setInterval: () => 0,
    clearInterval: () => {},
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    localStorage,
    indexedDB: null
  };
  sandbox.global = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'ledger_engine.js'), 'utf8'), sandbox, { filename: 'ledger_engine.js' });
  windowObj.CompTIALedger = sandbox.window.CompTIALedger;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8'), sandbox, { filename: 'engine.js' });
  return { Ledger: windowObj.CompTIALedger, APlus: windowObj.APlus, store, localStorage, emitted };
}

function practiceQuestion() {
  return { id: 'q-hint-1', answer: 2, options: ['A', 'B', 'C', 'D'], domain: 'test' };
}

function primeSession(engine, mode) {
  engine.reset();
  engine.mode = mode;
  engine.questions = [practiceQuestion()];
  engine.currentIndex = 0;
}

async function run() {
  console.log('=== APX store fulfilment ===\n');

  await test('Hint Pack: one charge removes exactly one wrong option on a practice question', async () => {
    const { Ledger, APlus } = createContext();
    await Ledger.ensureGenesis();
    await Ledger.appendBlock('TEST_GRANT', { note: 'funding' }, 1000, 0);
    const buy = await Ledger.spendUnlock('HINT_PACK');
    assert.ok(buy.ok, buy.error);
    assert.strictEqual(Ledger.consumableChargesSync('HINT_PACK'), 10);

    primeSession(APlus.engine, 'practice');
    assert.strictEqual(APlus.engine.canUseHint(), true);
    const res = await APlus.engine.useHint();
    assert.ok(res.ok, res.error);
    assert.strictEqual(res.eliminated, 0, 'lowest wrong option removed');
    assert.notStrictEqual(res.eliminated, practiceQuestion().answer, 'never removes the correct answer');
    assert.ok(APlus.engine.eliminatedOptions[0].has(0));
    assert.strictEqual(Ledger.consumableChargesSync('HINT_PACK'), 9);

    const again = await APlus.engine.useHint();
    assert.strictEqual(again.ok, false, 'one hint per question');
    assert.strictEqual(Ledger.consumableChargesSync('HINT_PACK'), 9, 'refused hint spends nothing');
  });

  await test('Hint Pack: never available in mocks, diagnostics or after answering', async () => {
    const { Ledger, APlus } = createContext();
    await Ledger.ensureGenesis();
    await Ledger.appendBlock('TEST_GRANT', { note: 'funding' }, 1000, 0);
    await Ledger.spendUnlock('HINT_PACK');
    for (const mode of ['mock', 'diagnostic']) {
      primeSession(APlus.engine, mode);
      assert.strictEqual(APlus.engine.canUseHint(), false, mode);
      const res = await APlus.engine.useHint();
      assert.strictEqual(res.ok, false, mode);
    }
    primeSession(APlus.engine, 'practice');
    APlus.engine.userAnswers[0] = 1;
    assert.strictEqual(APlus.engine.canUseHint(), false, 'answered question');
    assert.strictEqual(Ledger.consumableChargesSync('HINT_PACK'), 10);
  });

  await test('pickHintOption skips eliminated options and returns null when only the answer is left', () => {
    const { APlus } = createContext();
    const q = practiceQuestion();
    assert.strictEqual(APlus.modes.pickHintOption(q, new Set([0])), 1);
    assert.strictEqual(APlus.modes.pickHintOption(q, new Set([0, 1, 3])), null);
  });

  await test('Peer-device APX is shown but cannot be spent on this device', async () => {
    const { Ledger, localStorage } = createContext();
    await Ledger.ensureGenesis();
    const key = Ledger.STORAGE_KEY;
    const local = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({
      format: 'multi_device_v1',
      devices: {
        dev_local: { chain: local.chain, publicKeyFingerprint: local.publicKeyFingerprint, deviceId: 'dev_local' },
        dev_peer: { chain: [{ type: 'TEST_GRANT', tokenDelta: 5000, payload: {} }], deviceId: 'dev_peer' }
      }
    }));
    const state = await Ledger.getState();
    const localBalance = state.wallet.balance;
    assert.strictEqual(state.wallet.peerDeviceBonus, 5000);
    assert.strictEqual(state.wallet.totalAcrossDevices, localBalance + 5000);
    assert.ok(localBalance < 3800, 'fixture assumes the local balance cannot afford the Pro Pass');
    const res = await Ledger.spendUnlock('PRO_PASS_30D');
    assert.strictEqual(res.ok, false, 'spend must use the local balance');
    const after = await Ledger.getState();
    assert.ok(after.wallet.balance >= 0, 'local balance never negative');
  });

  await test('Charges are read from this device in the multi-device format', async () => {
    const { Ledger, localStorage } = createContext();
    await Ledger.ensureGenesis();
    await Ledger.appendBlock('TEST_GRANT', { note: 'funding' }, 1000, 0);
    await Ledger.spendUnlock('AI_BURST');
    const key = Ledger.STORAGE_KEY;
    const local = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({
      format: 'multi_device_v1',
      devices: { dev_local: { chain: local.chain, deviceId: 'dev_local' }, dev_peer: { chain: [], deviceId: 'dev_peer' } }
    }));
    assert.strictEqual(Ledger.consumableChargesSync('AI_BURST'), 5);
  });

  await test('Pro Pass: one day spent per active day, idempotent, still Pro on the last day', async () => {
    const { Ledger } = createContext();
    await Ledger.ensureGenesis();
    await Ledger.appendBlock('TEST_GRANT', { note: 'funding' }, 4000, 0);
    assert.strictEqual(Ledger.proPassActiveSync(), false);
    const buy = await Ledger.spendUnlock('PRO_PASS_30D');
    assert.ok(buy.ok, buy.error);
    assert.strictEqual(Ledger.proPassActiveSync(), true);

    const first = await Ledger.activateProPassDay();
    assert.ok(first.ok && first.remaining === 29, JSON.stringify(first));
    const second = await Ledger.activateProPassDay();
    assert.ok(second.ok && second.alreadyActive, 'second open the same day spends nothing');
    assert.strictEqual(Ledger.consumableChargesSync('PRO_PASS_30D'), 29);

    await Ledger.consumeUnlock('PRO_PASS_30D', 29);
    assert.strictEqual(Ledger.consumableChargesSync('PRO_PASS_30D'), 0);
    assert.strictEqual(Ledger.proPassActiveSync(), true, 'the day its last charge was spent stays Pro');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
