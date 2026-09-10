#!/usr/bin/env node
/**
 * tools/test_tma_ai_paywall.js
 * Verification suite for Telegram Mini App, Multi-Model AI Gateway, and Stars Paywall:
 * 1. Telegram initData HMAC-SHA256 verification
 * 2. Multi-model AI routing (Groq Free vs Pro NVIDIA/Ollama/OpenRouter)
 * 3. Daily free quota tracking & paywall 402 enforcement
 * 4. Telegram Stars invoice generation & Webhook lifecycle
 * 5. TMA Bridge & Client ergonomics
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('TESTING TELEGRAM MINI APP & BUSINESS AI PAYWALL GATEWAY');
console.log('====================================================\n');

// 1. Test Client Modules
console.log('1. Verifying Client-Side TMA Modules...');
const tmaBridge = require(path.join(ROOT, 'js', 'tma_bridge.js'));
assert.ok(tmaBridge, 'TMABridge must export');
assert.ok(typeof tmaBridge.init === 'function', 'TMABridge.init must exist');
assert.ok(typeof tmaBridge.mountUserPill === 'function', 'TMABridge.mountUserPill must exist');

const starsBilling = require(path.join(ROOT, 'js', 'stars_billing.js'));
assert.ok(starsBilling, 'StarsBilling must export');
assert.ok(Array.isArray(starsBilling.PRODUCTS), 'PRODUCTS list must exist');
assert.ok(starsBilling.PRODUCTS.find(p => p.id === 'daily_unlimited'), 'daily_unlimited product must exist');
assert.ok(starsBilling.PRODUCTS.find(p => p.id === 'pro_monthly'), 'pro_monthly product must exist');
assert.ok(starsBilling.PRODUCTS.find(p => p.id === 'lifetime_master'), 'lifetime_master product must exist');
starsBilling.PRODUCTS.forEach((p) => {
  assert.ok((p.invoiceTitle || p.title).length <= 32, `${p.id} invoice title must be <= 32 chars`);
  assert.ok(Number.isInteger(p.stars) && p.stars > 0, `${p.id} stars must be a positive integer`);
});
assert.ok(typeof starsBilling.purchaseProduct === 'function', 'purchaseProduct must exist');
assert.ok(typeof starsBilling.purchaseProductWithTon === 'function', 'Web TON unlock helper may exist');
assert.ok(
  String(starsBilling.purchaseProductWithTon).includes('Inside Telegram, use Stars'),
  'TON helper must refuse TMA digital-goods checkout and force Stars'
);

const ghostCoach = require(path.join(ROOT, 'js', 'tma_ghost_coach.js'));
assert.ok(ghostCoach, 'TMAGhostCoach must export');
assert.ok(Array.isArray(ghostCoach.COACH_CONFIG.providers), 'providers list must exist');
assert.strictEqual(ghostCoach.COACH_CONFIG.providers.length, 4, 'Must define 4 AI providers (Groq, NVIDIA, Ollama, OpenRouter)');
console.log('   ✔ Client TMA modules verified.\n');

// 2. Test Edge Worker Logic
console.log('2. Testing Edge Worker AI Router & Paywall...');
let workerModule;
async function loadWorker() {
  if (!workerModule) {
    workerModule = (await import(pathToFileURL(path.join(ROOT, 'workers', 'api_worker.js')).href)).default;
  }
  assert.ok(workerModule, 'api_worker default export must exist');
  assert.ok(typeof workerModule.fetch === 'function', 'api_worker.fetch must exist');
  return workerModule;
}

// In-Memory D1 Mock
class MockD1 {
  constructor() {
    this.users = new Map();
    this.transactions = [];
    this.logs = [];
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...params) {
        return {
          async first() {
            if (sql.includes('FROM telegram_users WHERE telegram_id = ?')) {
              const id = params[0];
              return self.users.get(id) || null;
            }
            if (sql.includes('FROM stars_transactions WHERE id = ?')) {
              return self.transactions.find(t => t.id === params[0]) || null;
            }
            return null;
          },
          async run() {
            if (sql.includes('INSERT INTO telegram_users')) {
              // UPSERT telegram_users
              const id = params[0];
              const existing = self.users.get(id) || {};
              // Parse bound params based on query shape
              if (params.length === 3) {
                // Quota update: id, free_ai_used_today, free_ai_last_date
                self.users.set(id, {
                  ...existing,
                  telegram_id: id,
                  free_ai_used_today: params[1],
                  free_ai_last_date: params[2]
                });
              } else if (params.length >= 7) {
                // Payment update: id, username, first_name, last_name, tier, tier_expires_at, stars_spent
                self.users.set(id, {
                  ...existing,
                  telegram_id: id,
                  username: params[1],
                  first_name: params[2],
                  last_name: params[3],
                  tier: params[4],
                  tier_expires_at: params[5],
                  stars_spent: (existing.stars_spent || 0) + params[6]
                });
              }
            } else if (sql.includes('INSERT INTO stars_transactions')) {
              self.transactions.push({ id: params[0], telegram_id: params[1], product_id: params[2], amount: params[3] });
            } else if (sql.includes('INSERT INTO ai_usage_log')) {
              self.logs.push({ telegram_id: params[0], tier: params[1], provider: params[2], model: params[3] });
            }
            return { success: true };
          }
        };
      }
    };
  }
}

// Generate valid Telegram WebApp initData
function createTestInitData(userObj, botToken) {
  const userJson = JSON.stringify(userObj);
  const authDate = Math.floor(Date.now() / 1000);
  const params = [
    `auth_date=${authDate}`,
    `query_id=AAHdF6IQAAAAAN0XohD4v98L`,
    `user=${userJson}`
  ];
  params.sort();
  const dataCheckString = params.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return `auth_date=${authDate}&query_id=AAHdF6IQAAAAAN0XohD4v98L&user=${encodeURIComponent(userJson)}&hash=${hash}`;
}

async function runTests() {
  await loadWorker();
  const mockDb = new MockD1();
  const TEST_BOT_TOKEN = '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ';
  const testUser = { id: 777888999, first_name: 'Alex', username: 'alex_tech' };
  const validInitData = createTestInitData(testUser, TEST_BOT_TOKEN);

  const mockEnv = {
    DB: mockDb,
    TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
    GROQ_API_KEY: 'gsk_mock_test_key_123',
    NVIDIA_API_KEY: 'nvapi_mock_test_key_456',
    OPENROUTER_API_KEY: 'sk-or-mock_test_key_789'
  };

  // 2A. Test Free User requesting NVIDIA NIM -> Expect 402 PAYWALL_REQUIRED
  console.log('2A. Testing Free User accessing Pro NVIDIA model...');
  const reqNvidia = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': validInitData
    },
    body: JSON.stringify({
      question: 'Which connector is used for 10GBASE-SR fiber?',
      chosenAnswer: 'RJ-45',
      correctAnswer: 'LC',
      provider: 'nvidia'
    })
  });

  const resNvidia = await workerModule.fetch(reqNvidia, mockEnv, {});
  assert.strictEqual(resNvidia.status, 402, 'Free user requesting NVIDIA must receive HTTP 402');
  const dataNvidia = await resNvidia.json();
  assert.strictEqual(dataNvidia.error, 'PAYWALL_REQUIRED', 'Error code must be PAYWALL_REQUIRED');
  console.log('   ✔ Paywall enforced for Pro NVIDIA model (HTTP 402 received).');

  // 2B. Test Free User requesting Groq (within quota) -> Success
  console.log('2B. Testing Free User accessing Groq (within quota)...');
  // Mock global fetch for Groq API
  const originalFetch = global.fetch;
  global.fetch = async function (url, opts) {
    if (url.includes('api.groq.com')) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'RJ-45 is copper twisted-pair; 10GBASE-SR requires LC optical connectors.' } }]
        })
      };
    }
    if (url.includes('api.telegram.org')) {
      return {
        ok: true,
        json: async () => ({ ok: true, result: 'https://t.me/$test_invoice_link_999' })
      };
    }
    return originalFetch ? originalFetch(url, opts) : { ok: true, json: async () => ({}) };
  };

  const reqGroq = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': validInitData
    },
    body: JSON.stringify({
      question: 'Which connector is used for 10GBASE-SR fiber?',
      chosenAnswer: 'RJ-45',
      correctAnswer: 'LC',
      provider: 'groq'
    })
  });

  const resGroq = await workerModule.fetch(reqGroq, mockEnv, {});
  assert.strictEqual(resGroq.status, 200, 'Groq request within quota must return 200');
  const dataGroq = await resGroq.json();
  assert.strictEqual(dataGroq.provider, 'groq', 'Provider must be groq');
  assert.strictEqual(dataGroq.freeQuotaRemaining, 4, 'Remaining quota must decrement to 4');
  console.log('   ✔ Free Groq AI session granted (Remaining quota: 4/5).');

  // 2C. Test Free Quota Exhaustion (5/5 used) -> Expect 402 FREE_QUOTA_EXHAUSTED
  console.log('2C. Testing Daily Quota Exhaustion...');
  // Manually set usage to 5 in DB
  const todayStr = new Date().toISOString().slice(0, 10);
  mockDb.users.set(testUser.id, {
    telegram_id: testUser.id,
    tier: 'free',
    free_ai_used_today: 5,
    free_ai_last_date: todayStr
  });

  const reqExhausted = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': validInitData
    },
    body: JSON.stringify({
      question: 'Which connector is used for 10GBASE-SR fiber?',
      chosenAnswer: 'RJ-45',
      correctAnswer: 'LC',
      provider: 'groq'
    })
  });

  const resExhausted = await workerModule.fetch(reqExhausted, mockEnv, {});
  assert.strictEqual(resExhausted.status, 402, 'Exhausted quota must receive HTTP 402');
  const dataExhausted = await resExhausted.json();
  assert.strictEqual(dataExhausted.error, 'FREE_QUOTA_EXHAUSTED', 'Error must be FREE_QUOTA_EXHAUSTED');
  console.log('   ✔ Free quota exhaustion enforced (HTTP 402 received).');

  // 2D. Test Telegram Stars Payment & Tier Upgrade
  console.log('2D. Testing Telegram Stars Payment & Tier Upgrade...');
  const webhookPaymentReq = new Request('https://clariora.com.au/api/v1/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: 10001,
      message: {
        message_id: 501,
        from: { id: testUser.id, first_name: 'Alex', username: 'alex_tech' },
        chat: { id: testUser.id },
        successful_payment: {
          currency: 'XTR',
          total_amount: 250,
          invoice_payload: JSON.stringify({ productId: 'pro_monthly', telegramId: testUser.id }),
          telegram_payment_charge_id: 'tx_test_charge_12345'
        }
      }
    })
  });

  const resPayment = await workerModule.fetch(webhookPaymentReq, mockEnv, {});
  assert.strictEqual(resPayment.status, 200, 'Webhook must return 200');
  const upgradedUser = mockDb.users.get(testUser.id);
  assert.ok(upgradedUser, 'User must exist in DB');
  assert.strictEqual(upgradedUser.tier, 'pro_monthly', 'User tier must be upgraded to pro_monthly');
  assert.strictEqual(upgradedUser.stars_spent, 250, 'Stars spent must be 250');
  console.log('   ✔ Telegram Stars payment verified. User upgraded to Pro Monthly.');

  // 2D2. Invoice link uses catalog price + empty provider_token + XTR
  console.log('2D2. Testing createInvoiceLink (XTR) request shape...');
  let capturedInvoiceBody = null;
  global.fetch = async function (url, opts) {
    if (url.includes('/createInvoiceLink')) {
      capturedInvoiceBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ ok: true, result: 'https://t.me/$XTR_invoice_live' }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const invoiceReq = new Request('https://clariora.com.au/api/v1/billing/stars/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'pro_monthly',
      stars: 1,
      title: 'Hacked Overlong Title That Would Break Telegram Invoice Limits!!!!!',
      initData: validInitData
    })
  });
  const invoiceRes = await workerModule.fetch(invoiceReq, mockEnv, {});
  assert.strictEqual(invoiceRes.status, 200, 'Invoice endpoint must return 200');
  const invoiceData = await invoiceRes.json();
  assert.strictEqual(invoiceData.invoiceLink, 'https://t.me/$XTR_invoice_live');
  assert.strictEqual(capturedInvoiceBody.currency, 'XTR');
  assert.strictEqual(capturedInvoiceBody.provider_token, '');
  assert.strictEqual(capturedInvoiceBody.prices[0].amount, 250, 'Must use server catalog Stars amount, not client');
  assert.ok(capturedInvoiceBody.title.length <= 32, 'Invoice title must be <= 32');
  console.log('   ✔ createInvoiceLink uses XTR, empty provider_token, and server-side catalog price.');

  // 2D3. Pre-checkout rejects non-XTR / bad amount
  console.log('2D3. Testing pre_checkout_query validation...');
  let preCheckoutAnswer = null;
  global.fetch = async function (url, opts) {
    if (url.includes('answerPreCheckoutQuery')) {
      preCheckoutAnswer = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const badPre = new Request('https://clariora.com.au/api/v1/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: 10002,
      pre_checkout_query: {
        id: 'pcq_bad_1',
        currency: 'USD',
        total_amount: 250,
        invoice_payload: JSON.stringify({ p: 'pro_monthly', u: testUser.id, s: 250 })
      }
    })
  });
  await workerModule.fetch(badPre, mockEnv, {});
  assert.strictEqual(preCheckoutAnswer.ok, false, 'Non-XTR pre-checkout must be rejected');

  const goodPre = new Request('https://clariora.com.au/api/v1/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      update_id: 10003,
      pre_checkout_query: {
        id: 'pcq_ok_1',
        currency: 'XTR',
        total_amount: 250,
        invoice_payload: JSON.stringify({ p: 'pro_monthly', u: testUser.id, s: 250 })
      }
    })
  });
  await workerModule.fetch(goodPre, mockEnv, {});
  assert.strictEqual(preCheckoutAnswer.ok, true, 'Valid XTR pre-checkout must be approved');
  console.log('   ✔ pre_checkout_query validates currency and catalog price.');

  // 2E. Test Upgraded User accessing Pro NVIDIA model -> Success
  console.log('2E. Testing Upgraded Pro User accessing NVIDIA NIM...');
  global.fetch = async function (url, opts) {
    if (url.includes('integrate.api.nvidia.com')) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'NVIDIA 70B: LC (Lucent Connector) is the standard small form-factor optical connector.' } }]
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  const reqProNvidia = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': validInitData
    },
    body: JSON.stringify({
      question: 'Which connector is used for 10GBASE-SR fiber?',
      chosenAnswer: 'RJ-45',
      correctAnswer: 'LC',
      provider: 'nvidia'
    })
  });

  const resProNvidia = await workerModule.fetch(reqProNvidia, mockEnv, {});
  assert.strictEqual(resProNvidia.status, 200, 'Pro user must receive 200 for NVIDIA model');
  const dataProNvidia = await resProNvidia.json();
  assert.strictEqual(dataProNvidia.provider, 'nvidia', 'Provider must be nvidia');
  assert.ok(typeof dataProNvidia.freeQuotaRemaining === 'number', 'Pro quota must be a hard remaining call count');
  assert.ok(dataProNvidia.budget && dataProNvidia.budget.dailyTokenBudget > 0, 'Pro must expose hard token budget');
  console.log('   ✔ Pro user successfully received NVIDIA NIM 70B inference.');

  // Restore fetch
  global.fetch = originalFetch;

  console.log('\n====================================================');
  console.log('✅ ALL TELEGRAM MINI APP & AI PAYWALL TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
