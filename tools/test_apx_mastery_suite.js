/**
 * tools/test_apx_mastery_suite.js
 * Verification suite for Clariora APX Multi-Track Mastery Engine, Azure Milestones & Unlocks.
 *
 * Requirements:
 * 1. AZ-900 45Q pass gets full milestone bonus + XP.
 * 2. AZ-900 850 score unlocks SCORE_850.
 * 3. PASS_AZ900 is minted upon passing full AZ-900.
 * 4. Azure domain staking locks and resolves with yield on day 2.
 * 5. PRO_PASS_30D can be unlocked and consumed.
 *
 * Run: node tools/test_apx_mastery_suite.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(ROOT, 'ledger_engine.js');
const LEDGER_UI_PATH = path.join(ROOT, 'ledger_ui.js');
const TRACK_REGISTRY_PATH = path.join(ROOT, 'js', 'track-registry.js');
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

function createMasteryContext(includeTrackRegistry = true) {
  clock.offsetMs = 0;
  const store = {};
  const localStorageMock = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
  };

  const elements = {};
  function getElementById(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        options: [],
        appendChild(child) {
          if (child.options) this.options.push(...child.options);
          if (child.tagName === 'OPTION') this.options.push(child);
        },
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 })
      };
    }
    return elements[id];
  }

  const documentMock = {
    getElementById,
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        options: [],
        appendChild(child) {
          if (this.options) this.options.push(child);
        },
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
        remove: () => {},
        removeAttribute: () => {}
      };
      return el;
    },
    body: {
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      appendChild: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 })
    }
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
    setTimeout,
    clearTimeout,
    TextEncoder,
    TextDecoder,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    localStorage: localStorageMock,
    document: documentMock,
    indexedDB: null
  };

  sandbox.global = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);

  if (includeTrackRegistry && fs.existsSync(TRACK_REGISTRY_PATH)) {
    vm.runInContext(fs.readFileSync(TRACK_REGISTRY_PATH, 'utf8'), sandbox, { filename: 'track-registry.js' });
  }

  vm.runInContext(fs.readFileSync(LEDGER_PATH, 'utf8'), sandbox, { filename: 'ledger_engine.js' });
  vm.runInContext(fs.readFileSync(LEDGER_UI_PATH, 'utf8'), sandbox, { filename: 'ledger_ui.js' });

  assert.ok(sandbox.window.CompTIALedger, 'CompTIALedger must attach to window');
  assert.ok(sandbox.window.CompTIALedgerUI, 'CompTIALedgerUI must attach to window');
  sandbox.CompTIALedger = sandbox.window.CompTIALedger;
  sandbox.CompTIALedgerUI = sandbox.window.CompTIALedgerUI;

  return {
    Ledger: sandbox.window.CompTIALedger,
    LedgerUI: sandbox.window.CompTIALedgerUI,
    APlus: sandbox.window.APlus,
    sandbox,
    elements
  };
}

async function run() {
  console.log('=== Clariora APX Multi-Track Mastery & Protocol Test Suite ===\n');

  await test('AZ-900 45Q pass gets full milestone bonus + XP', async () => {
    const { Ledger } = createMasteryContext(true);
    const result = {
      examType: 'az900',
      total: 45,
      rawCorrect: 40,
      scaledScore: 820,
      passed: true
    };

    const out = await Ledger.recordExamComplete(result);
    assert.strictEqual(out.reward.isFull, true, '45Q AZ-900 must qualify as full exam attempt');
    assert.ok(out.reward.milestoneAwarded >= 50, 'Full pass milestone bonus must be paid in full (>= 50 APX)');
    assert.strictEqual(out.reward.milestoneAlreadyClaimed, false);
    // XP breakdown: 15 base + (40 * 3) = 135 practice + 80 full exam pass = 215 XP
    assert.strictEqual(out.reward.xp, 215, 'XP must include 80 XP full exam milestone');
    assert.strictEqual(out.wallet.balance, 100 + out.reward.apx + (out.minted.reduce((acc, m) => acc + (m.tokenDelta || 0), 0)));
  });

  await test('Fallback full-exam detection without TrackRegistry (AZ-900 >= 40, AZ-500 >= 45)', async () => {
    const { Ledger } = createMasteryContext(false);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'az900', total: 40 }), true);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'az900', total: 39 }), false);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'az500', total: 45 }), true);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'az500', total: 44 }), false);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'core1', total: 60 }), true);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'core1', total: 59 }), false);
    assert.strictEqual(Ledger.isFullExamAttempt({ examType: 'domain', total: 90 }), false);
  });

  await test('AZ-900 850 score unlocks SCORE_850', async () => {
    const { Ledger } = createMasteryContext(true);
    const result = {
      examType: 'az900',
      total: 45,
      rawCorrect: 42,
      scaledScore: 860,
      passed: true
    };

    const out = await Ledger.recordExamComplete(result);
    assert.strictEqual(out.wallet.achievements.includes('SCORE_850'), true, 'SCORE_850 must be unlocked');
    const mintedScore850 = out.minted.some((b) => b.payload && b.payload.achievementId === 'SCORE_850');
    assert.ok(mintedScore850, 'SCORE_850 achievement block must be minted');

    // A sub-full exam with 860 must NOT unlock SCORE_850
    const fresh = createMasteryContext(true);
    const shortExam = await fresh.Ledger.recordExamComplete({
      examType: 'az900',
      total: 20,
      rawCorrect: 19,
      scaledScore: 860,
      passed: true
    });
    assert.strictEqual(shortExam.wallet.achievements.includes('SCORE_850'), false, 'Sub-full exam must not unlock SCORE_850');
  });

  await test('PASS_AZ900 is minted upon passing full AZ-900', async () => {
    const { Ledger } = createMasteryContext(true);

    // 1. Failing exam does not mint PASS_AZ900
    const failOut = await Ledger.recordExamComplete({
      examType: 'az900',
      total: 45,
      rawCorrect: 20,
      scaledScore: 600,
      passed: false
    });
    assert.strictEqual(failOut.wallet.achievements.includes('PASS_AZ900'), false);

    // 2. Passing full exam mints PASS_AZ900
    const passOut = await Ledger.recordExamComplete({
      examType: 'az900',
      total: 45,
      rawCorrect: 38,
      scaledScore: 750,
      passed: true
    });
    assert.strictEqual(passOut.wallet.achievements.includes('PASS_AZ900'), true);
    const mintedAz900 = passOut.minted.some((b) => b.payload && b.payload.achievementId === 'PASS_AZ900');
    assert.ok(mintedAz900, 'PASS_AZ900 block must be minted');

    // 3. Passing AZ-500 full exam mints PASS_AZ500
    const az500Out = await Ledger.recordExamComplete({
      examType: 'az500',
      total: 50,
      rawCorrect: 42,
      scaledScore: 780,
      passed: true
    });
    assert.strictEqual(az500Out.wallet.achievements.includes('PASS_AZ500'), true);
  });

  await test('Azure domain staking locks and resolves with yield on day 2', async () => {
    const { Ledger, LedgerUI, sandbox, APlus } = createMasteryContext(true);

    // Set active track to AZ-900
    if (APlus && APlus.trackRegistry) {
      APlus.trackRegistry.setActiveTrack('az900');
    }

    // Set domainSelect to az900_1
    const domainSelect = sandbox.document.getElementById('domainSelect');
    domainSelect.value = 'az900_1';

    // Stake 30 APX using UI helper stakeSelectedDomain()
    const stakeOut = await LedgerUI.stakeSelectedDomain();
    assert.strictEqual(stakeOut.ok, true, 'Staking through UI helper must succeed');
    const stakeId = stakeOut.stakeId;
    assert.strictEqual(stakeOut.wallet.balance, 70, '30 APX should be deducted from initial 100 APX');
    assert.strictEqual(stakeOut.wallet.stakes[stakeId].domainKey, '1.0 Describe cloud concepts');
    assert.strictEqual(stakeOut.wallet.stakes[stakeId].status, 'locked');

    // Attempting to resolve on the same day must not yield
    const sameDay = await Ledger.recordExamComplete({
      examType: 'domain',
      total: 10,
      rawCorrect: 9,
      domainKey: '1.0 Describe cloud concepts',
      domainPct: 90
    });
    assert.strictEqual(sameDay.stakeBlocks.length, 0, 'Stake must not resolve on same day');
    assert.strictEqual(sameDay.wallet.stakes[stakeId].status, 'locked');

    // Advance clock to Day 2
    clock.offsetMs += DAY_MS;

    // Drill scoring 90% (>= 80%) on Day 2
    const nextDay = await Ledger.recordExamComplete({
      examType: 'domain',
      total: 10,
      rawCorrect: 9,
      domainKey: '1.0 Describe cloud concepts',
      domainPct: 90
    });
    assert.strictEqual(nextDay.stakeBlocks.length, 1, 'Stake must resolve on day 2');
    // 30 returned + 40% yield (12) = 42 tokenDelta
    assert.strictEqual(nextDay.stakeBlocks[0].tokenDelta, 42, 'Yield payout must be 30 + 12 = 42 APX');
    assert.strictEqual(nextDay.wallet.stakes[stakeId].status, 'yielded');
  });

  await test('PRO_PASS_30D can be unlocked and consumed', async () => {
    const { Ledger } = createMasteryContext(true);

    // Verify catalog entry
    const cat = Ledger.getUnlocksCatalog();
    assert.ok(cat.PRO_PASS_30D, 'PRO_PASS_30D must exist in catalog');
    assert.strictEqual(cat.PRO_PASS_30D.cost, 2500);
    assert.strictEqual(cat.PRO_PASS_30D.type, 'consumable');
    assert.strictEqual(cat.PRO_PASS_30D.charges, 30);
    assert.strictEqual(cat.PRO_PASS_30D.desc, '30-day Pro Pass unlockable with earned APX');

    // Reject purchase without sufficient balance
    const reject = await Ledger.spendUnlock('PRO_PASS_30D');
    assert.strictEqual(reject.ok, false);
    assert.ok(reject.error.includes('Need 2500'));

    // Grant 3000 APX funding
    await Ledger.appendBlock('TEST_GRANT', { note: 'Fund Pro Pass' }, 3000, 0);

    // Spend unlock
    const unlockRes = await Ledger.spendUnlock('PRO_PASS_30D');
    assert.strictEqual(unlockRes.ok, true, unlockRes.error);
    assert.strictEqual(unlockRes.wallet.balance, 600); // 100 + 3000 - 2500 = 600
    assert.strictEqual(unlockRes.wallet.unlocks.consumables.PRO_PASS_30D, 30);
    assert.strictEqual(await Ledger.hasActiveUnlock('PRO_PASS_30D'), true);

    // Consume 1 charge (e.g. daily pass activation)
    const consumeRes = await Ledger.consumeUnlock('PRO_PASS_30D', 1);
    assert.strictEqual(consumeRes.ok, true);
    assert.strictEqual(consumeRes.wallet.unlocks.consumables.PRO_PASS_30D, 29);
    assert.strictEqual(await Ledger.hasActiveUnlock('PRO_PASS_30D'), true);

    // Consume remaining 29 charges
    const consumeAll = await Ledger.consumeUnlock('PRO_PASS_30D', 29);
    assert.strictEqual(consumeAll.ok, true);
    assert.strictEqual(consumeAll.wallet.unlocks.consumables.PRO_PASS_30D, 0);
    assert.strictEqual(await Ledger.hasActiveUnlock('PRO_PASS_30D'), false);
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
