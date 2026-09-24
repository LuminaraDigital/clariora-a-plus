/**
 * tools/test_ledger_unlocks.js
 * Verification test for In-House Learn-to-Earn (L2E) APX Unlocks, earn limits & Cryptographic Ledger.
 *
 * Runs in Node.js using WebCrypto (crypto.webcrypto).
 * Run: node tools/test_ledger_unlocks.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'ledger_engine.js');
const DAY_MS = 86400000;

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log('  ok   ' + name);
    })
    .catch((err) => {
      failed += 1;
      console.log('  FAIL ' + name);
      console.log('       ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n       ') : err));
    });
}

const clock = { offsetMs: 0 };
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + clock.offsetMs);
    else super(...args);
  }
  static now() {
    return RealDate.now() + clock.offsetMs;
  }
}

function createLedgerContext() {
  const store = {};
  const localStorageMock = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
  };

  const windowObj = {};
  const sandbox = {
    window: windowObj,
    console: { ...console, warn: () => {} },
    Date: FakeDate,
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
    indexedDB: null // test the JWK localStorage fallback directly in headless Node
  };

  sandbox.global = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(LEDGER_PATH, 'utf8'), sandbox, { filename: 'ledger_engine.js' });
  assert.ok(sandbox.window.CompTIALedger, 'CompTIALedger should attach to window');
  return sandbox.window.CompTIALedger;
}

function quiz(total, correct, domainKey) {
  const domainStats = domainKey ? { [domainKey]: { correct, total } } : {};
  return {
    examType: 'domain',
    total,
    rawCorrect: correct,
    scaledScore: 0,
    passed: false,
    domainStats,
    domainKey: domainKey || null,
    domainPct: domainKey ? (correct / total) * 100 : 0
  };
}

async function run() {
  console.log('=== In-House Learn-to-Earn (L2E) & Unlocks Test Suite ===\n');

  const Ledger = createLedgerContext();

  await test('UNLOCK_CATALOG prices target two to three weeks for the top unlock', () => {
    const catalog = Ledger.getUnlocksCatalog();
    assert.equal(catalog.AI_BURST.cost, 90);
    assert.equal(catalog.AI_BURST.type, 'consumable');
    assert.equal(catalog.AI_BURST.charges, 5);
    assert.equal(catalog.STREAK_FREEZE.cost, 200);
    assert.equal(catalog.WEAK_SCAN.cost, 150);
    assert.equal(catalog.CRAM_SHEET.type, 'permanent');
    assert.equal(catalog.CRAM_SHEET.cost, 1800);
    assert.equal(catalog.CYBER_THEME.type, 'permanent');
    assert.equal(catalog.CYBER_THEME.cost, 600);
  });

  await test('Genesis block initializes with 100 APX and signed chain tip', async () => {
    const state = await Ledger.getState();
    assert.equal(state.wallet.balance, 100);
    assert.equal(state.wallet.height, 1);
    assert.ok(state.integrity.valid);
    assert.ok(state.publicKeyFingerprint);
  });

  await test('spendUnlock("AI_BURST") deducts 90 APX, adds 5 charges, appends signed block', async () => {
    const res = await Ledger.spendUnlock('AI_BURST');
    assert.ok(res.ok, 'spendUnlock should succeed: ' + res.error);
    assert.equal(res.wallet.balance, 10);
    assert.equal(res.wallet.unlocks.consumables.AI_BURST, 5);
    assert.equal(res.block.type, 'SPEND_UNLOCK');
    assert.ok(res.block.signature);
  });

  await test('consumeUnlock("AI_BURST", 2) consumes 2 charges without altering token balance', async () => {
    const res = await Ledger.consumeUnlock('AI_BURST', 2);
    assert.ok(res.ok);
    assert.equal(res.remaining, 3);
    const state = await Ledger.getState();
    assert.equal(state.wallet.balance, 10);
  });

  await test('spendUnlock rejects overdraft without corrupting chain', async () => {
    const res = await Ledger.spendUnlock('CRAM_SHEET');
    assert.equal(res.ok, false);
    assert.ok(res.error.includes('Insufficient APX'));
    const state = await Ledger.getState();
    assert.equal(state.wallet.balance, 10);
  });

  await test('Full exam pass: practice APX capped at 120, milestone bonus paid in full', async () => {
    const res = await Ledger.recordExamComplete({
      examType: 'core1',
      total: 90,
      rawCorrect: 85,
      scaledScore: 860,
      passed: true,
      passingScore: 675,
      domainStats: { '1.0': { correct: 10, total: 10 } }
    });
    // raw practice = 10 + 85*2 + 15 = 195 -> capped to 120; milestone = 50 + 40 = 90
    assert.equal(res.reward.rawApx, 285);
    assert.equal(res.reward.practiceAwarded, 120);
    assert.equal(res.reward.milestoneAwarded, 90);
    assert.equal(res.reward.apx, 210);
    assert.equal(res.reward.capped, true);
    // 10 + 210 + one-time achievements FIRST_EXAM 20 + PASS_CORE1 60 + SCORE_850 80
    assert.equal(res.wallet.balance, 380);
  });

  await test('Repeating the full exam the same day pays no APX but still grants XP', async () => {
    const res = await Ledger.recordExamComplete({
      examType: 'core1',
      total: 90,
      rawCorrect: 85,
      scaledScore: 860,
      passed: true,
      passingScore: 675,
      domainStats: { '1.0': { correct: 10, total: 10 } }
    });
    assert.equal(res.reward.apx, 0);
    assert.equal(res.reward.milestoneAlreadyClaimed, true);
    assert.equal(res.reward.multiplier, 0.5);
    assert.ok(res.reward.xp > 0);
    assert.equal(res.wallet.balance, 380);
  });

  await test('Same quiz repeated on a new day decays 100% / 50% / 20% / 20%', async () => {
    clock.offsetMs += DAY_MS;
    const apx = [];
    for (let i = 0; i < 4; i++) {
      const res = await Ledger.recordExamComplete(quiz(10, 10, '2.0 Networking'));
      apx.push(res.reward.apx);
    }
    // raw practice = 10 + 10*2 + 15 = 45
    assert.deepEqual(apx, [45, 23, 9, 9]);
  });

  await test('Daily practice cap stops further quiz APX once 120 is reached', async () => {
    const a = await Ledger.recordExamComplete(quiz(20, 20, null));
    // earned today so far 86, raw 50 -> 34 left under the cap
    assert.equal(a.reward.apx, 34);
    assert.equal(a.reward.capped, true);
    const b = await Ledger.recordExamComplete(quiz(15, 15, null));
    assert.equal(b.reward.apx, 0);
    assert.ok(b.reward.xp > 0);
  });

  await test('Staking is refused on a domain already at 80% or higher', async () => {
    const res = await Ledger.stakeDomain('2.0 Networking', 30);
    assert.equal(res.ok, false);
    assert.ok(res.error.includes('100%'));
  });

  await test('Stake does not resolve the same day, resolves with yield on a later day', async () => {
    const lock = await Ledger.stakeDomain('3.0 Hardware', 30);
    assert.ok(lock.ok, lock.error);
    assert.equal(lock.baselinePct, null);

    const sameDay = await Ledger.recordExamComplete(quiz(10, 9, '3.0 Hardware'));
    assert.equal(sameDay.stakeBlocks.length, 0);
    assert.equal(sameDay.wallet.stakes[lock.stakeId].status, 'locked');

    clock.offsetMs += DAY_MS;
    const nextDay = await Ledger.recordExamComplete(quiz(10, 9, '3.0 Hardware'));
    assert.equal(nextDay.stakeBlocks.length, 1);
    assert.equal(nextDay.stakeBlocks[0].tokenDelta, 42);
    assert.equal(nextDay.wallet.stakes[lock.stakeId].status, 'yielded');
  });

  await test('Funded wallet can buy CRAM_SHEET once and not twice', async () => {
    await Ledger.appendBlock('TEST_GRANT', { note: 'test funding' }, 3000, 0);
    const res = await Ledger.spendUnlock('CRAM_SHEET');
    assert.ok(res.ok, res.error);
    assert.ok(res.wallet.unlocks.permanent.includes('CRAM_SHEET'));
    assert.equal(await Ledger.hasActiveUnlock('CRAM_SHEET'), true);
    const again = await Ledger.spendUnlock('CRAM_SHEET');
    assert.equal(again.ok, false);
    assert.ok(again.error.includes('already own'));
  });

  await test('WEAK_SCAN, CYBER_THEME and STREAK_FREEZE unlock correctly', async () => {
    const scan = await Ledger.spendForInsight();
    assert.ok(scan.ok);
    assert.ok(scan.wallet.unlocks.permanent.includes('WEAK_SCAN'));
    const theme = await Ledger.spendUnlock('CYBER_THEME');
    assert.ok(theme.ok);
    assert.ok(theme.wallet.unlocks.permanent.includes('CYBER_THEME'));
    const shield = await Ledger.spendUnlock('STREAK_FREEZE');
    assert.ok(shield.ok);
    assert.equal(shield.wallet.unlocks.consumables.STREAK_FREEZE, 1);
  });

  await test('Cryptographic verification passes 100% of blocks in the chain', async () => {
    const integrity = await Ledger.verifyChain();
    assert.equal(integrity.valid, true);
    assert.equal(integrity.error, null);
    assert.equal(integrity.signedCount, integrity.height);
  });

  async function studyDays(L, n) {
    for (let i = 0; i < n; i++) {
      if (i > 0) clock.offsetMs += DAY_MS;
      await L.recordExamComplete(quiz(10, 7, null));
    }
  }

  async function withShields(L, count) {
    await L.appendBlock('TEST_GRANT', { note: 'test funding' }, 1000, 0);
    for (let i = 0; i < count; i++) {
      const res = await L.spendUnlock('STREAK_FREEZE');
      assert.ok(res.ok, res.error);
    }
  }

  await test('One missed day uses the free grace and spends no shield', async () => {
    const L = createLedgerContext();
    await studyDays(L, 5);
    await withShields(L, 1);
    clock.offsetMs += 2 * DAY_MS;
    const res = await L.applyStreakShields();
    assert.equal(res.used, 0);
    const s = await L.getState();
    assert.equal(s.wallet.streak, 5);
    assert.equal(s.wallet.unlocks.consumables.STREAK_FREEZE, 1);
  });

  await test('Three missed days spend two shields and keep the streak', async () => {
    const L = createLedgerContext();
    await studyDays(L, 5);
    await withShields(L, 2);
    clock.offsetMs += 4 * DAY_MS;
    const res = await L.applyStreakShields();
    assert.equal(res.used, 2);
    assert.equal(res.coveredDays.length, 2);
    assert.equal(res.streak, 5);
    const after = await L.recordExamComplete(quiz(10, 7, null));
    assert.equal(after.wallet.streak, 6);
    assert.equal(after.wallet.unlocks.consumables.STREAK_FREEZE, 0);
  });

  await test('Shields are not wasted when they cannot save the streak', async () => {
    const L = createLedgerContext();
    await studyDays(L, 5);
    await withShields(L, 1);
    clock.offsetMs += 5 * DAY_MS;
    const res = await L.applyStreakShields();
    assert.equal(res.used, 0);
    assert.equal(res.insufficient, true);
    const s = await L.getState();
    assert.equal(s.wallet.streak, 0);
    assert.equal(s.wallet.unlocks.consumables.STREAK_FREEZE, 1);
  });

  await test('Studying after a gap spends a shield automatically', async () => {
    const L = createLedgerContext();
    await studyDays(L, 4);
    await withShields(L, 1);
    clock.offsetMs += 3 * DAY_MS;
    const res = await L.recordExamComplete(quiz(10, 7, null));
    assert.equal(res.wallet.streak, 5);
    assert.equal(res.wallet.unlocks.consumables.STREAK_FREEZE, 0);
    assert.equal(res.wallet.shieldedDays.length, 1);
    assert.equal((await L.verifyChain()).valid, true);
  });

  await test('Every store item has a fulfilment check in app code', () => {
    const sources = ['ledger_engine.js', 'ledger_ui.js']
      .concat(fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => path.join('js', f)))
      .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
      .join('\n');
    const missing = Object.keys(Ledger.getUnlocksCatalog()).filter((id) => {
      const re = new RegExp('(hasActiveUnlock|checkWalletUnlock|consumeUnlock)\\([^)]*[\'"]' + id + '[\'"]');
      return !re.test(sources);
    });
    assert.deepEqual(missing, [], 'Unlocks with no fulfilment check: ' + missing.join(', '));
  });

  console.log(`\nPASSED: ${passed}`);
  if (failed > 0) {
    console.error(`FAILED: ${failed}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
