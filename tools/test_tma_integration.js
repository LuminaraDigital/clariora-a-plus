/**
 * test_tma_integration.js
 * Automated test runner for CompTIA A+ Telegram Mini App (TMA) components:
 * 1. TMABridge lifecycle and navigation stack
 * 2. StarsBilling product definitions and checkout flow
 * 3. TONCredentials payload generation and verification
 * 4. DataLoader sharding and metadata retrieval
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser globals for headless testing
global.window = {
  Telegram: {
    WebApp: {
      ready: () => {},
      expand: () => {},
      enableClosingConfirmation: () => {},
      initDataUnsafe: {
        user: { id: 12345678, first_name: 'Alex', username: 'alex_tech' }
      },
      themeParams: { bg_color: '#07090E', text_color: '#F3F4F6' },
      BackButton: {
        show: () => { global.window.Telegram.WebApp.BackButton._visible = true; },
        hide: () => { global.window.Telegram.WebApp.BackButton._visible = false; },
        onClick: (cb) => { global.window.Telegram.WebApp.BackButton._cb = cb; },
        _visible: false
      },
      HapticFeedback: {
        impactOccurred: (style) => { global.__lastHaptic = style; },
        notificationOccurred: (type) => { global.__lastNotification = type; },
        selectionChanged: () => { global.__lastSelection = true; }
      },
      onEvent: () => {}
    }
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  }
};
global.localStorage = global.window.localStorage;

global.document = {
  documentElement: {
    style: { setProperty: () => {} },
    setAttribute: () => {}
  },
  querySelectorAll: () => []
};

async function runTests() {
  console.log('=== CompTIA A+ TMA Integration Tests ===\n');

  // Test 1: TMABridge Initialization
  console.log('Test 1: Testing TMABridge...');
  const TMABridge = require('../js/tma_bridge.js');
  const bridgeState = TMABridge.init();
  assert.strictEqual(bridgeState.isTMA, true, 'TMABridge should detect WebApp');
  assert.strictEqual(bridgeState.user.id, 12345678, 'TMABridge should capture user ID');

  // Test Navigation Stack
  let backClicked = false;
  TMABridge.pushNav('test_view', () => { backClicked = true; });
  assert.strictEqual(global.window.Telegram.WebApp.BackButton._visible, true, 'BackButton should be visible');
  TMABridge.handleBackClick();
  assert.strictEqual(backClicked, true, 'Back callback should be invoked');
  assert.strictEqual(global.window.Telegram.WebApp.BackButton._visible, false, 'BackButton should hide when stack is empty');
  console.log('  ✔ TMABridge navigation stack passed.');

  // Test 2: StarsBilling Products & Entitlements
  console.log('Test 2: Testing StarsBilling...');
  const StarsBilling = require('../js/stars_billing.js');
  assert.ok(StarsBilling.PRODUCTS.length >= 3, 'Must have at least 3 Star products');
  const dayPass = StarsBilling.PRODUCTS.find(p => p.id === 'daily_unlimited');
  assert.strictEqual(dayPass.stars, 50, 'Day pass should be 50 Stars');

  await StarsBilling.saveEntitlement('lifetime');
  const ent = await StarsBilling.getEntitlements();
  assert.strictEqual(ent.tier, 'lifetime', 'Entitlement tier should be updated to lifetime');
  console.log('  ✔ StarsBilling entitlement storage passed.');

  // Test 3: TON Credentials
  console.log('Test 3: Testing TONCredentials...');
  const TONCredentials = require('../js/ton_credentials.js');
  const payload = TONCredentials.buildCredentialPayload({
    examCore: '1',
    scaledScore: 820,
    passed: true,
    ledgerHash: 'c9f0a28b1234567890abcdef',
    learnerId: 'alex_tech'
  });

  assert.ok(payload.memo.startsWith('APX:C1:820:PASS:c9f0a28b12345678'), 'Memo format must match APX spec');
  assert.strictEqual(payload.fullRecord.scaledScore, 820, 'Score must match');
  assert.strictEqual(payload.fullRecord.passed, true, 'Passed flag must be true');

  const mintRes = await TONCredentials.mintExamCredential({
    examCore: '1',
    scaledScore: 820,
    passed: true,
    ledgerHash: 'c9f0a28b1234567890abcdef'
  });
  assert.strictEqual(mintRes.success, true, 'Minting should succeed');
  assert.ok(mintRes.record.explorerUrl.includes('tonscan.org'), 'Must generate tonscan explorer URL');
  console.log('  ✔ TONCredentials payload & verification passed.');

  // Test 4: Sharded Data Integrity
  console.log('Test 4: Verifying Shards on Disk...');
  const metaPath = path.join(__dirname, '../shards/meta.json');
  assert.ok(fs.existsSync(metaPath), 'shards/meta.json must exist');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  assert.strictEqual(meta.passing_score_core1, 675, 'Passing score Core 1 must be 675');
  assert.strictEqual(meta.passing_score_core2, 700, 'Passing score Core 2 must be 700');

  const diagPath = path.join(__dirname, '../shards/diagnostic_pack.json');
  assert.ok(fs.existsSync(diagPath), 'Diagnostic pack must exist');
  const diag = JSON.parse(fs.readFileSync(diagPath, 'utf8'));
  assert.strictEqual(diag.length, 20, 'Diagnostic pack must contain exactly 20 questions');
  console.log('  ✔ Shard validation passed (Diagnostic pack: 20 questions).');

  console.log('\n=======================================');
  console.log('✅ ALL TMA INTEGRATION TESTS PASSED!');
  console.log('=======================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
