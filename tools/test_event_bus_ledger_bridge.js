/**
 * tools/test_event_bus_ledger_bridge.js
 * Verification of the Universal Event Bus Bridge connecting APlus.engine to CompTIALedger.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log('  ok   ' + name);
    })
    .catch((err) => {
      console.log('  FAIL ' + name);
      console.error(err);
      process.exit(1);
    });
}

function createEnv() {
  const store = {};
  const localStorageMock = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
  };

  const listeners = {};
  const bus = {
    on: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    emit: (evt, data) => {
      const fns = listeners[evt] || [];
      fns.forEach((fn) => fn(data));
    }
  };

  const windowObj = {
    APlus: { bus },
    localStorage: localStorageMock,
    crypto: webcrypto
  };

  const sandbox = {
    window: windowObj,
    global: windowObj,
    globalThis: windowObj,
    console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
    Date,
    Math,
    Set,
    Array,
    Object,
    Number,
    String,
    JSON,
    parseInt,
    isNaN,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    localStorage: localStorageMock,
    indexedDB: null,
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, appendChild: () => {}, querySelectorAll: () => [], classList: { add: () => {}, remove: () => {} } }),
      body: { classList: { toggle: () => {}, add: () => {}, remove: () => {} }, appendChild: () => {} }
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {}
  };

  vm.createContext(sandbox);

  // Load ledger_engine.js
  const ledgerEngineCode = fs.readFileSync(path.join(ROOT, 'ledger_engine.js'), 'utf8');
  vm.runInContext(ledgerEngineCode, sandbox);
  sandbox.CompTIALedger = sandbox.window.CompTIALedger;

  // Load track-registry.js
  const trackRegistryCode = fs.readFileSync(path.join(ROOT, 'js', 'track-registry.js'), 'utf8');
  vm.runInContext(trackRegistryCode, sandbox);

  // Load ledger_ui.js
  const ledgerUiCode = fs.readFileSync(path.join(ROOT, 'ledger_ui.js'), 'utf8');
  vm.runInContext(ledgerUiCode, sandbox);
  sandbox.CompTIALedgerUI = sandbox.window.CompTIALedgerUI;

  return { sandbox, bus, windowObj };
}

async function run() {
  console.log('=== Event Bus Ledger Bridge & Behavioral Telemetry Suite ===\n');

  await test('Modular engine finish emits exam:finished and appends EXAM_COMPLETE block with APX', async () => {
    const { sandbox, bus, windowObj } = createEnv();
    const L = windowObj.CompTIALedger;
    await L.ensureGenesis();

    const initialState = await L.getState();
    const initialHeight = initialState.chain.length;
    const initialBalance = initialState.wallet.balance;

    // Simulate ui.js bus listener bridge
    let called = false;
    bus.on('exam:finished', async (payload) => {
      called = true;
      await windowObj.CompTIALedgerUI.onExamComplete({
        sessionId: payload.timestamp || String(Date.now()),
        examType: payload.examType || 'drill',
        scaledScore: payload.scaledScore,
        rawCorrect: payload.rawCorrect,
        total: payload.totalQuestions || payload.total || 10,
        passed: payload.passed,
        passingScore: payload.passingScore,
        domainStats: payload.domainStats || {},
        domainKey: payload.domainKey || null,
        domainPct: payload.domainPct || 0,
        crucibleAudit: payload.crucibleAudit || null
      });
    });

    // Emit exam:finished from a drill (e.g. Similar Questions)
    bus.emit('exam:finished', {
      examType: 'drill',
      totalQuestions: 10,
      rawCorrect: 9,
      scaledScore: 820,
      passingScore: 700,
      passed: true,
      domainStats: { '1.0 Mobile Devices': { total: 10, correct: 9 } },
      domainKey: '1.0 Mobile Devices',
      domainPct: 90,
      timestamp: 'session_bridge_test_001'
    });

    // Allow async execution
    await new Promise((r) => setTimeout(r, 50));

    assert.ok(called, 'exam:finished handler should be called');
    const afterState = await L.getState();
    assert.ok(afterState.chain.length >= initialHeight + 1, 'Chain should have appended blocks');
    assert.ok(afterState.wallet.balance > initialBalance, 'APX balance should have increased from drill');
    const examBlock = afterState.chain.find((b) => b.type === 'EXAM_COMPLETE');
    assert.ok(examBlock, 'Chain must contain an EXAM_COMPLETE block');
  });

  await test('Duplicate session ID is deduplicated and not mined twice', async () => {
    const { sandbox, bus, windowObj } = createEnv();
    const L = windowObj.CompTIALedger;
    await L.ensureGenesis();

    bus.on('exam:finished', async (payload) => {
      await windowObj.CompTIALedgerUI.onExamComplete({
        sessionId: payload.timestamp,
        examType: payload.examType,
        scaledScore: payload.scaledScore,
        rawCorrect: payload.rawCorrect,
        total: payload.totalQuestions,
        passed: payload.passed,
        passingScore: payload.passingScore,
        domainStats: payload.domainStats
      });
    });

    const payload = {
      examType: 'core1',
      totalQuestions: 90,
      rawCorrect: 80,
      scaledScore: 820,
      passingScore: 675,
      passed: true,
      domainStats: {},
      timestamp: 'duplicate_guard_session_123'
    };

    bus.emit('exam:finished', payload);
    await new Promise((r) => setTimeout(r, 50));
    const midState = await L.getState();
    const heightAfterFirst = midState.chain.length;

    // Emit again with same session timestamp
    bus.emit('exam:finished', payload);
    await new Promise((r) => setTimeout(r, 50));
    const finalState = await L.getState();

    assert.equal(finalState.chain.length, heightAfterFirst, 'Duplicate session must not append another block');
  });

  await test('Crucible audit telemetry awards instinct discipline (+10) and calibrated correction (+5) APX bonuses', async () => {
    const { sandbox, windowObj } = createEnv();
    const L = windowObj.CompTIALedger;

    // Quiz with crucible audit: zero instinct betrayals, 2 calibrated corrections
    const quizWithAudit = {
      examType: 'core1',
      total: 20,
      rawCorrect: 18,
      scaledScore: 800,
      passed: true,
      passingScore: 675,
      crucibleAudit: {
        totalSwitches: 3,
        correctToWrong: 0, // Zero instinct betrayals! -> +10 APX
        wrongToCorrect: 2  // Two calibrated corrections! -> 2 * 5 = +10 APX
      }
    };

    const reward = L.calcExamReward(quizWithAudit);
    assert.equal(reward.instinctBonus, 20, 'Should award 10 (discipline) + 10 (corrections) = 20 APX');

    const out = await L.recordExamComplete(quizWithAudit);
    assert.ok(out.block, 'Block should be created');
    assert.equal(out.block.payload.rewardBreakdown.instinctBonus, 20);
  });

  console.log(`\nPASSED: ${passed}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
