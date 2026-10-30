#!/usr/bin/env node
/**
 * tools/test_payment_binding.js
 *
 * Functional regression tests for the TON redemption path under PRODUCTION settings.
 *
 * The production suite exercises /api/v1/billing/ton/verify with TON_VERIFY_RELAXED=1,
 * which short-circuits order binding and memo matching. These tests run the same endpoint
 * with ENVIRONMENT=production so the hardened controls are actually executed:
 *
 *   1. A redemption with no orderId is rejected. This is the payment-hijack regression:
 *      previously an omitted orderId defaulted memo matching to true, so any confirmed
 *      inbound transfer to the merchant wallet could be claimed by whoever quoted its
 *      hash first - an on-chain observer could steal a stranger's purchase.
 *   2. An orderId belonging to another account is rejected (IDOR).
 *   3. A confirmed on-chain transfer whose memo does not carry the caller's own orderId
 *      is rejected, so a supplied-but-mismatched order cannot stand in for the real one.
 *   4. The legitimate owner, with a matching memo, is upgraded.
 *   5. Order fulfilment is scoped to the caller, never the order id alone.
 *   6. The verification endpoint is throttled per caller.
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

const TEST_BOT_TOKEN = '987654321:ABC_DefGhIklmnOpqrstuvwxyz123';
const MERCHANT_WALLET = 'EQMerchantWalletAddressForClarioraProductionTests01';
const OWNER = { id: 888999111, first_name: 'Jordan', username: 'jordan_engineer' };
const ATTACKER = { id: 111222333, first_name: 'Mallory', username: 'mallory' };
const PRO_MONTHLY_NANOTONS = 7000000000;

console.log('================================================================');
console.log('TON PAYMENT BINDING & REDEMPTION HARDENING TESTS (PRODUCTION)');
console.log('================================================================\n');

function generateValidInitData(userObj, botToken) {
  const userJson = JSON.stringify(userObj);
  const authDate = Math.floor(Date.now() / 1000);
  const params = [
    `auth_date=${authDate}`,
    'query_id=AAHdF6IQAAAAAN0XohD4v98L',
    `user=${userJson}`
  ];
  params.sort();
  const dataCheckString = params.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return `auth_date=${authDate}&query_id=AAHdF6IQAAAAAN0XohD4v98L&user=${encodeURIComponent(userJson)}&hash=${hash}`;
}

/** Minimal D1 mock covering only the statements the TON redemption path issues. */
class MockD1 {
  constructor() {
    this.orders = new Map();
    this.tonTransactions = [];
    this.telegramUsers = new Map();
    this.fulfilmentStatements = [];
  }

  seedOrder(orderId, userId, productId) {
    this.orders.set(orderId, { order_id: orderId, user_id: userId, product_id: productId, status: 'pending' });
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...params) {
        return {
          async first() {
            if (sql.includes('FROM ton_orders WHERE order_id = ?')) {
              return self.orders.get(params[0]) || null;
            }
            if (sql.includes('FROM ton_transactions WHERE id = ?')) {
              const needle = String(params[0]).toLowerCase();
              return self.tonTransactions.find((t) => String(t.id).toLowerCase() === needle) || null;
            }
            if (sql.includes('FROM telegram_users WHERE telegram_id = ?')) {
              return self.telegramUsers.get(params[0]) || null;
            }
            return null;
          },
          async run() {
            if (sql.includes('UPDATE ton_orders')) {
              self.fulfilmentStatements.push({ sql, params });
              const order = self.orders.get(params[1]);
              // Scoped update: only applies when the caller owns the order.
              if (order && order.user_id === params[2]) {
                order.status = 'fulfilled';
                order.tx_hash = params[0];
              }
              return { success: true };
            }
            if (sql.includes('INSERT INTO ton_transactions')) {
              self.tonTransactions.push({ id: params[0], telegram_id: params[1], product_id: params[2] });
              return { success: true };
            }
            if (sql.includes('INSERT INTO telegram_users')) {
              const existing = self.telegramUsers.get(params[0]) || {};
              self.telegramUsers.set(params[0], {
                ...existing,
                telegram_id: params[0],
                tier: params[1],
                tier_expires_at: params[2]
              });
              return { success: true };
            }
            return { success: true };
          },
          async all() {
            return { results: [] };
          }
        };
      },
      async run() { return { success: true }; },
      async first() { return null; }
    };
  }
}

/** In-memory stand-in for the CoachRateLimiter Durable Object namespace. */
function makeRateLimiterBinding() {
  const counts = new Map();
  return {
    reset() { counts.clear(); },
    idFromName(name) { return { name: String(name) }; },
    get(id) {
      return {
        async fetch(url) {
          const capacity = Number(new URL(url).searchParams.get('capacity')) || 10;
          const used = (counts.get(id.name) || 0) + 1;
          counts.set(id.name, used);
          if (used > capacity) {
            return new Response(JSON.stringify({ allowed: false, remaining: 0, retryAfter: 60 }), { status: 429 });
          }
          return new Response(JSON.stringify({ allowed: true, remaining: capacity - used }), { status: 200 });
        }
      };
    }
  };
}

/**
 * Stub TonCenter so the transfer looks genuinely confirmed on-chain: correct destination,
 * correct amount, recent. Only the memo varies, which is exactly the control under test.
 */
function stubTonCenter(memoText) {
  global.fetch = async function (url) {
    if (String(url).includes('toncenter.com')) {
      return {
        ok: true,
        json: async () => ({
          result: [{
            transaction_id: { hash: 'a'.repeat(64) },
            utime: Math.floor(Date.now() / 1000) - 30,
            compute_ph: { exit_code: 0 },
            in_msg: {
              destination: MERCHANT_WALLET,
              value: PRO_MONTHLY_NANOTONS,
              message: memoText
            },
            out_msgs: []
          }]
        })
      };
    }
    throw new Error('Unexpected outbound fetch in test: ' + url);
  };
}

function verifyRequest(initData, body) {
  return new Request('https://clariora.com.au/api/v1/billing/ton/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
    body: JSON.stringify(body)
  });
}

async function run() {
  const worker = (await import(pathToFileURL(path.join(ROOT, 'workers', 'api_worker.js')).href)).default;

  const ownerInitData = generateValidInitData(OWNER, TEST_BOT_TOKEN);
  const attackerInitData = generateValidInitData(ATTACKER, TEST_BOT_TOKEN);

  const db = new MockD1();
  const rateLimiter = makeRateLimiterBinding();
  const env = {
    DB: db,
    TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
    ENVIRONMENT: 'production',
    TON_MERCHANT_WALLET_ADDRESS: MERCHANT_WALLET,
    TONCENTER_API_KEY: 'toncenter_mock_key',
    COACH_RATE_LIMITER: rateLimiter
  };

  const OWNER_ORDER = 'clar_888999111_abc123_def456';
  db.seedOrder(OWNER_ORDER, 'tg_' + OWNER.id, 'pro_monthly');

  const TX_HASH = 'a'.repeat(64);
  const originalFetch = global.fetch;

  try {
    // ---------------------------------------------------------------------
    // Regression: under the previous logic an omitted orderId skipped memo matching
    // entirely, so this exact request granted a paid tier off someone else's transfer.
    console.log('1. Redemption without an orderId must be rejected in production...');
    stubTonCenter('memo: ' + OWNER_ORDER);
    let res = await worker.fetch(verifyRequest(ownerInitData, {
      productId: 'pro_monthly',
      txHash: TX_HASH,
      amountTon: '7.0'
    }), env, {});
    assert.strictEqual(res.status, 400, 'Missing orderId must return 400');
    assert.strictEqual((await res.json()).error, 'ORDER_REQUIRED', 'Must report ORDER_REQUIRED');
    console.log('   ✔ Unbound redemption refused (ORDER_REQUIRED).\n');

    // ---------------------------------------------------------------------
    console.log("2. Redeeming against another account's order must be rejected (IDOR)...");
    rateLimiter.reset();
    res = await worker.fetch(verifyRequest(attackerInitData, {
      productId: 'pro_monthly',
      txHash: TX_HASH,
      amountTon: '7.0',
      orderId: OWNER_ORDER
    }), env, {});
    assert.strictEqual(res.status, 404, "Another account's order must return 404");
    assert.strictEqual((await res.json()).error, 'ORDER_NOT_FOUND', 'Must report ORDER_NOT_FOUND');
    assert.strictEqual(
      db.orders.get(OWNER_ORDER).status, 'pending',
      "The owner's order must remain pending after a foreign redemption attempt"
    );
    console.log('   ✔ Cross-account order reference refused; victim order untouched.\n');

    // ---------------------------------------------------------------------
    console.log('3. Confirmed transfer whose memo omits the orderId must be rejected (hijack)...');
    rateLimiter.reset();
    const ATTACKER_ORDER = 'clar_111222333_zzz999_yyy888';
    db.seedOrder(ATTACKER_ORDER, 'tg_' + ATTACKER.id, 'pro_monthly');
    // The on-chain transfer is real and confirmed, but it carries the victim's memo.
    stubTonCenter('memo: ' + OWNER_ORDER);
    res = await worker.fetch(verifyRequest(attackerInitData, {
      productId: 'pro_monthly',
      txHash: TX_HASH,
      amountTon: '7.0',
      orderId: ATTACKER_ORDER
    }), env, {});
    assert.strictEqual(res.status, 402, 'Memo mismatch must return 402');
    assert.strictEqual((await res.json()).error, 'TON_NOT_CONFIRMED', 'Must report TON_NOT_CONFIRMED');
    assert.ok(
      !db.telegramUsers.has(ATTACKER.id),
      'Hijacker must not be granted a paid tier from a stranger transaction'
    );
    console.log('   ✔ Foreign transaction hash refused: memo binding held.\n');

    // ---------------------------------------------------------------------
    console.log('4. Legitimate owner with a matching memo is upgraded...');
    rateLimiter.reset();
    stubTonCenter('memo: ' + OWNER_ORDER);
    res = await worker.fetch(verifyRequest(ownerInitData, {
      productId: 'pro_monthly',
      txHash: TX_HASH,
      amountTon: '7.0',
      orderId: OWNER_ORDER
    }), env, {});
    assert.strictEqual(res.status, 200, 'Legitimate redemption must return 200');
    const okBody = await res.json();
    assert.strictEqual(okBody.success, true, 'Legitimate redemption must succeed');
    assert.strictEqual(okBody.tier, 'pro_monthly', 'Owner must be upgraded to pro_monthly');
    assert.strictEqual(db.orders.get(OWNER_ORDER).status, 'fulfilled', 'Order must be marked fulfilled');
    console.log('   ✔ Owner upgraded and order fulfilled.\n');

    // ---------------------------------------------------------------------
    console.log('5. Fulfilment write must be scoped to the caller...');
    assert.ok(db.fulfilmentStatements.length > 0, 'A fulfilment statement must have been issued');
    for (const stmt of db.fulfilmentStatements) {
      assert.ok(
        stmt.sql.includes('WHERE order_id = ? AND user_id = ?'),
        'Order fulfilment must filter on user_id, not the client-supplied order id alone'
      );
    }
    console.log('   ✔ Fulfilment scoped by user_id.\n');

    // ---------------------------------------------------------------------
    console.log('6. Verification endpoint must throttle a single caller...');
    rateLimiter.reset();
    stubTonCenter('memo: nothing');
    let throttled = false;
    for (let i = 0; i < 12; i++) {
      const r = await worker.fetch(verifyRequest(ownerInitData, {
        productId: 'pro_monthly',
        txHash: 'b'.repeat(64),
        amountTon: '7.0',
        orderId: OWNER_ORDER
      }), env, {});
      if (r.status === 429) { throttled = true; break; }
    }
    assert.ok(throttled, 'Repeated verification attempts must be rate limited');
    console.log('   ✔ Repeated redemption attempts throttled (429).\n');
  } finally {
    global.fetch = originalFetch;
  }

  console.log('================================================================');
  console.log('✅ TON PAYMENT BINDING VERIFIED: ORDER OWNERSHIP, MEMO BINDING, THROTTLING');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('\n❌ PAYMENT BINDING TEST FAILED\n');
  console.error(err);
  process.exit(1);
});
