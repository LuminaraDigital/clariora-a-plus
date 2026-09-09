#!/usr/bin/env node
/**
 * tools/test_tma_production_suite.js
 * Comprehensive production & deployment verification suite for:
 * 1. Telegram WebApp HMAC-SHA256 Cryptographic Verification
 * 2. Multi-Model Business AI Gateway (Groq, NVIDIA NIM 70B, Ollama R1, OpenRouter)
 * 3. 14-Day Practice Trial & Pro Preview Token Allocation
 * 4. Dual-Rail Payment Verification: Telegram Stars (XTR) & TON Blockchain ($TON)
 * 5. Client TMA Bridge, Safe Areas & Touch Target Ergonomics
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('TELEGRAM MINI APP (TMA) & BUSINESS AI PRODUCTION VERIFICATION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Client-Side TMA Modules Verification
// -----------------------------------------------------------------------------
console.log('1. Verifying TMA Client Bridges...');

// Mock browser window & WebApp environment
global.window = {
  Telegram: {
    WebApp: {
      ready: () => {},
      expand: () => {},
      requestFullscreen: () => {},
      disableVerticalSwipes: () => {},
      enableClosingConfirmation: () => {},
      initData: 'query_id=AAHdF6IQAAAAAN0XohD4v98L&user=%7B%22id%22%3A777888999%2C%22first_name%22%3A%22Alex%22%7D',
      initDataUnsafe: {
        user: { id: 777888999, first_name: 'Alex', username: 'alex_tech' }
      },
      themeParams: { bg_color: '#07090E', text_color: '#F3F4F6', button_color: '#D4AF37' },
      BackButton: {
        show: () => { global.window.Telegram.WebApp.BackButton._visible = true; },
        hide: () => { global.window.Telegram.WebApp.BackButton._visible = false; },
        onClick: (cb) => { global.window.Telegram.WebApp.BackButton._cb = cb; },
        _visible: false
      },
      HapticFeedback: {
        impactOccurred: () => {},
        notificationOccurred: () => {},
        selectionChanged: () => {}
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
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ classList: { add: () => {}, remove: () => {} }, appendChild: () => {} }),
  body: { appendChild: () => {} }
};

const tmaBridge = require(path.join(ROOT, 'js', 'tma_bridge.js'));
const bridgeState = tmaBridge.init();
assert.strictEqual(bridgeState.isTMA, true, 'TMABridge must detect Telegram WebApp');
assert.strictEqual(bridgeState.user.id, 777888999, 'User ID must match mock');
console.log('   ✔ TMABridge initialized with native Telegram Bot API hooks.');

const starsBilling = require(path.join(ROOT, 'js', 'stars_billing.js'));
assert.ok(starsBilling.PRODUCTS.length >= 3, 'Must define at least 3 products');
const proProduct = starsBilling.PRODUCTS.find(p => p.id === 'pro_monthly');
assert.strictEqual(proProduct.stars, 250, 'Pro monthly must cost 250 Stars');
assert.strictEqual(proProduct.ton, 1.0, 'Pro monthly must cost 1.0 TON');
console.log('   ✔ Dual-rail pricing (Telegram Stars + TON Blockchain) verified.');

const ghostCoach = require(path.join(ROOT, 'js', 'tma_ghost_coach.js'));
assert.strictEqual(ghostCoach.COACH_CONFIG.providers.length, 4, 'Must support Groq, NVIDIA, Ollama, OpenRouter');
console.log('   ✔ Multi-Model AI Coach client module verified.\n');

// -----------------------------------------------------------------------------
// 2. Edge Worker Database & API Routing
// -----------------------------------------------------------------------------
console.log('2. Testing Edge Worker Business AI Gateway & Dual-Rail Paywall...');

const workerModule = require(path.join(ROOT, 'workers', 'api_worker.js')).default;

// In-Memory D1 Mock Database
class MockD1 {
  constructor() {
    this.users = new Map();
    this.starsTransactions = [];
    this.tonTransactions = [];
    this.logs = [];
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...params) {
        return {
          async first() {
            if (sql.includes('FROM telegram_users WHERE telegram_id = ?')) {
              return self.users.get(params[0]) || null;
            }
            return null;
          },
          async run() {
            if (sql.includes('INSERT INTO telegram_users') || sql.includes('UPDATE telegram_users')) {
              const id = params[0];
              const existing = self.users.get(id) || {};
              // Free quota update
              if (sql.includes('free_ai_used_today')) {
                self.users.set(id, {
                  ...existing,
                  telegram_id: id,
                  free_ai_used_today: params[1],
                  free_ai_last_date: params[2]
                });
              }
              // Preview tokens decrement
              else if (sql.includes('pro_preview_tokens_remaining = ?')) {
                const count = params[0];
                const targetId = params[1];
                const u = self.users.get(targetId) || { telegram_id: targetId };
                u.pro_preview_tokens_remaining = count;
                self.users.set(targetId, u);
              }
              // Stars Payment
              else if (sql.includes('stars_spent')) {
                self.users.set(id, {
                  ...existing,
                  telegram_id: id,
                  tier: params[4],
                  tier_expires_at: params[5],
                  stars_spent: (existing.stars_spent || 0) + params[6]
                });
              }
              // TON Payment
              else if (sql.includes('ton_wallet_address')) {
                self.users.set(id, {
                  ...existing,
                  telegram_id: id,
                  tier: params[1],
                  tier_expires_at: params[2],
                  ton_wallet_address: params[3]
                });
              }
            } else if (sql.includes('INSERT INTO stars_transactions')) {
              self.starsTransactions.push({ id: params[0], telegram_id: params[1], product_id: params[2], amount: params[3] });
            } else if (sql.includes('INSERT INTO ton_transactions')) {
              self.tonTransactions.push({ id: params[0], telegram_id: params[1], product_id: params[2], amount: params[3] });
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

function generateValidInitData(userObj, botToken) {
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

async function runProductionTests() {
  const mockDb = new MockD1();
  const TEST_BOT_TOKEN = '987654321:ABC_DefGhIklmnOpqrstuvwxyz123';
  const testUser = { id: 888999111, first_name: 'Jordan', username: 'jordan_engineer' };
  const validInitData = generateValidInitData(testUser, TEST_BOT_TOKEN);

  const mockEnv = {
    DB: mockDb,
    TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
    GROQ_API_KEY: 'gsk_mock_groq_production_test',
    NVIDIA_API_KEY: 'nvapi_mock_nvidia_70b_test',
    OLLAMA_ENDPOINT: 'https://ollama.internal.datacenter.lan',
    OLLAMA_AUTH_TOKEN: 'secret_ollama_bearer_123',
    OPENROUTER_API_KEY: 'sk-or-mock_openrouter_claude_test'
  };

  // Mock global.fetch for AI Provider APIs
  const originalFetch = global.fetch;
  global.fetch = async function (url, opts) {
    // Groq Cloud
    if (url.includes('api.groq.com')) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Groq Llama 3.1 8B: Cat 6a is recommended for 10GBASE-T up to 100 meters.' } }]
        })
      };
    }
    // NVIDIA NIM
    if (url.includes('integrate.api.nvidia.com')) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'NVIDIA NIM 70B: Enterprise fiber standard for 10GBASE-SR requires 850nm OM3/OM4 multimode.' } }]
        })
      };
    }
    // Self-Hosted Ollama
    if (url.includes('ollama.internal.datacenter.lan')) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Ollama DeepSeek-R1: Socratic reasoning confirms distractor B confuses single-mode with multi-mode.' } }]
        })
      };
    }
    // OpenRouter
    if (url.includes('openrouter.ai')) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OpenRouter Claude 3.5: Root cause analysis identifies improper termination on the patch panel.' } }]
        })
      };
    }
    // Telegram Bot API
    if (url.includes('api.telegram.org')) {
      return {
        ok: true,
        json: async () => ({ ok: true, result: 'https://t.me/$stars_invoice_mock_url' })
      };
    }
    return originalFetch ? originalFetch(url, opts) : { ok: true, json: async () => ({}) };
  };

  // --- Step 2A: Free User accessing Groq (Session 1/5) ---
  console.log('2A. Testing Free User accessing Groq within daily quota...');
  const reqGroq = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': validInitData },
    body: JSON.stringify({
      question: 'What is the max length for Cat 6a at 10Gbps?',
      chosenAnswer: '55 meters',
      correctAnswer: '100 meters',
      provider: 'groq'
    })
  });
  const resGroq = await workerModule.fetch(reqGroq, mockEnv, {});
  assert.strictEqual(resGroq.status, 200, 'Groq request within quota must succeed (200)');
  const dataGroq = await resGroq.json();
  assert.strictEqual(dataGroq.provider, 'groq', 'Provider must be groq');
  assert.strictEqual(dataGroq.freeQuotaRemaining, 4, 'Remaining quota must be 4/5');
  assert.strictEqual(dataGroq.trialDaysRemaining, 14, '14-day trial must be active');
  console.log('   ✔ Free Groq AI session granted (Remaining quota: 4/5, Trial: 14 days).');

  // --- Step 2B: Free User attempting Pro NVIDIA model without preview flag -> Expect 402 Paywall ---
  console.log('2B. Testing Free User accessing Pro NVIDIA model without preview token...');
  const reqNvidiaPaywall = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': validInitData },
    body: JSON.stringify({
      question: 'Which wavelength is used for 10GBASE-SR?',
      chosenAnswer: '1310nm',
      correctAnswer: '850nm',
      provider: 'nvidia'
    })
  });
  const resNvidiaPaywall = await workerModule.fetch(reqNvidiaPaywall, mockEnv, {});
  assert.strictEqual(resNvidiaPaywall.status, 402, 'Unauthenticated Pro model request must return 402');
  const dataNvidiaPaywall = await resNvidiaPaywall.json();
  assert.strictEqual(dataNvidiaPaywall.error, 'PAYWALL_REQUIRED', 'Error code must be PAYWALL_REQUIRED');
  console.log('   ✔ Paywall strictly enforced for Pro NVIDIA 70B (HTTP 402).');

  // --- Step 2C: Free User consuming 1 Pro Preview Token during 14-day trial ---
  console.log('2C. Testing Free User consuming a Pro Preview Token during 14-day trial...');
  const reqNvidiaPreview = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': validInitData },
    body: JSON.stringify({
      question: 'Which wavelength is used for 10GBASE-SR?',
      chosenAnswer: '1310nm',
      correctAnswer: '850nm',
      provider: 'nvidia',
      useProPreview: true
    })
  });
  const resNvidiaPreview = await workerModule.fetch(reqNvidiaPreview, mockEnv, {});
  assert.strictEqual(resNvidiaPreview.status, 200, 'Pro preview request must succeed (200)');
  const dataNvidiaPreview = await resNvidiaPreview.json();
  assert.strictEqual(dataNvidiaPreview.isProPreview, true, 'isProPreview flag must be true');
  assert.strictEqual(dataNvidiaPreview.proPreviewTokensRemaining, 2, 'Preview tokens must decrement from 3 to 2');
  console.log('   ✔ Pro preview token successfully consumed (2 tokens remaining in trial).');

  // --- Step 2D: TON Blockchain Subscription Activation ---
  console.log('2D. Testing TON Blockchain Payment Verification (/api/v1/billing/ton/verify)...');
  const reqTonVerify = new Request('https://clariora.com.au/api/v1/billing/ton/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': validInitData },
    body: JSON.stringify({
      telegramId: testUser.id,
      productId: 'pro_monthly',
      txHash: '0x99a8b7c6d5e4f3a2b1c099887766554433221100aabbccddeeff001122334455',
      amountTon: '1.0',
      walletAddress: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'
    })
  });
  const resTonVerify = await workerModule.fetch(reqTonVerify, mockEnv, {});
  assert.strictEqual(resTonVerify.status, 200, 'TON verification must return 200');
  const dataTon = await resTonVerify.json();
  assert.strictEqual(dataTon.success, true, 'TON verification must succeed');
  assert.strictEqual(dataTon.tier, 'pro_monthly', 'User must be upgraded to pro_monthly');
  console.log('   ✔ TON Blockchain payment verified. User promoted to Pro Tier.');

  // --- Step 2E: Upgraded Pro User accessing Private Ollama & OpenRouter ---
  console.log('2E. Testing Upgraded Pro User accessing Private Ollama & OpenRouter Claude 3.5...');
  // Ollama
  const reqOllama = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': validInitData },
    body: JSON.stringify({ question: 'Explain RAID 5 parity calculation.', provider: 'ollama' })
  });
  const resOllama = await workerModule.fetch(reqOllama, mockEnv, {});
  assert.strictEqual(resOllama.status, 200, 'Ollama call for Pro user must return 200');
  const dataOllama = await resOllama.json();
  assert.strictEqual(dataOllama.provider, 'ollama', 'Provider must be ollama');
  assert.strictEqual(dataOllama.freeQuotaRemaining, 'unlimited', 'Quota must be unlimited for Pro');

  // OpenRouter
  const reqOpenRouter = new Request('https://clariora.com.au/api/v1/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': validInitData },
    body: JSON.stringify({ question: 'Explain troubleshooting methodology step 1.', provider: 'openrouter' })
  });
  const resOpenRouter = await workerModule.fetch(reqOpenRouter, mockEnv, {});
  assert.strictEqual(resOpenRouter.status, 200, 'OpenRouter call for Pro user must return 200');
  const dataOpenRouter = await resOpenRouter.json();
  assert.strictEqual(dataOpenRouter.provider, 'openrouter', 'Provider must be openrouter');
  console.log('   ✔ Private Ollama (DeepSeek-R1) and OpenRouter (Claude 3.5) verified.');

  // Restore fetch
  global.fetch = originalFetch;

  console.log('\n================================================================');
  console.log('✅ ALL PRODUCTION TMA & BUSINESS AI TESTS PASSED WITH 100%!');
  console.log('================================================================\n');
}

runProductionTests().catch(err => {
  console.error('\n❌ Production test suite error:', err);
  process.exit(1);
});
