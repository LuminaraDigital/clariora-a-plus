#!/usr/bin/env node
/**
 * tools/test_stars_binding.js
 *
 * Stars (XTR) webhook grant hardening, mirroring TON payment binding intent:
 *   1. Payload telegram id must match payer (from.id)
 *   2. Catalog amount must match total_amount
 *   3. Unknown productId is rejected (no silent daily_unlimited default)
 *   4. Idempotent redelivery re-applies tier if charge exists but user was never upgraded
 *   5. Missing webhook secret rejects payment in production
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const TEST_BOT_TOKEN = '987654321:ABC_DefGhIklmnOpqrstuvwxyz123';
const WEBHOOK_SECRET = 'test_stars_webhook_secret_binding';
const PAYER = { id: 42424201, first_name: 'Pat', username: 'pat_payer' };
const STRANGER = { id: 98989802, first_name: 'Sam', username: 'sam_stranger' };

console.log('================================================================');
console.log('STARS PAYMENT BINDING & GRANT HARDENING TESTS');
console.log('================================================================\n');

class MockD1 {
  constructor() {
    this.users = new Map();
    this.transactions = [];
  }

  prepare(sql) {
    const self = this;
    return {
      bind(...params) {
        return {
          async first() {
            if (sql.includes('SUM(stars_amount)') && sql.includes('stars_transactions')) {
              const id = params[0];
              const total = self.transactions
                .filter((t) => t.telegram_id === id)
                .reduce((sum, t) => sum + Number(t.stars_amount || 0), 0);
              return { total };
            }
            if (sql.includes('FROM telegram_users WHERE telegram_id = ?')) {
              return self.users.get(params[0]) || null;
            }
            if (sql.includes('FROM stars_transactions WHERE id = ?')) {
              return self.transactions.find((t) => t.id === params[0]) || null;
            }
            return null;
          },
          async run() {
            if (sql.includes('INSERT INTO stars_transactions')) {
              const chargeId = params[0];
              if (!self.transactions.find((t) => t.id === chargeId)) {
                self.transactions.push({
                  id: chargeId,
                  telegram_id: params[1],
                  product_id: params[2],
                  stars_amount: params[3]
                });
              }
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes('INSERT INTO telegram_users')) {
              const id = params[0];
              const existing = self.users.get(id) || {};
              self.users.set(id, {
                ...existing,
                telegram_id: id,
                username: params[1],
                first_name: params[2],
                last_name: params[3],
                tier: params[4],
                tier_expires_at: params[5],
                stars_spent: params[6]
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
        };
      }
    };
  }
}

function makeRateLimiterBinding() {
  return {
    idFromName() {
      return 'rl';
    },
    get() {
      return {
        async fetch() {
          return new Response(JSON.stringify({ allowed: true, remaining: 99 }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      };
    }
  };
}

function paymentUpdate(fromUser, overrides) {
  const payment = Object.assign({
    currency: 'XTR',
    total_amount: 250,
    invoice_payload: JSON.stringify({ p: 'pro_monthly', u: fromUser.id }),
    telegram_payment_charge_id: 'tx_stars_bind_' + fromUser.id
  }, overrides || {});
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: 1,
      from: fromUser,
      chat: { id: fromUser.id },
      successful_payment: payment
    }
  };
}

async function postWebhook(worker, env, body, secret) {
  return worker.fetch(new Request('https://clariora.com.au/api/v1/telegram/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Bot-Api-Secret-Token': secret || ''
    },
    body: JSON.stringify(body)
  }), env, {});
}

async function main() {
  const worker = (await import(pathToFileURL(path.join(ROOT, 'workers', 'api_worker.js')).href)).default;
  const db = new MockD1();
  const env = {
    DB: db,
    TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    ENVIRONMENT: 'production',
    COACH_RATE_LIMITER: makeRateLimiterBinding()
  };

  const originalFetch = global.fetch;
  global.fetch = async function () {
    return { ok: true, json: async () => ({ ok: true }) };
  };

  try {
    console.log('1. Payer mismatch (payload.u != from.id) must be rejected...');
    let res = await postWebhook(worker, env, paymentUpdate(STRANGER, {
      invoice_payload: JSON.stringify({ p: 'pro_monthly', u: PAYER.id }),
      telegram_payment_charge_id: 'tx_mismatch_1'
    }), WEBHOOK_SECRET);
    assert.strictEqual(res.status, 400, 'payer mismatch must 400');
    assert.strictEqual((await res.json()).error, 'payer_mismatch');
    assert.ok(!db.users.get(STRANGER.id), 'stranger must not be upgraded');
    console.log('   ✔ Cross-account invoice payload refused.\n');

    console.log('2. Amount mismatch must be rejected...');
    res = await postWebhook(worker, env, paymentUpdate(PAYER, {
      total_amount: 1,
      telegram_payment_charge_id: 'tx_amt_bad'
    }), WEBHOOK_SECRET);
    assert.strictEqual(res.status, 400);
    assert.strictEqual((await res.json()).error, 'amount_mismatch');
    console.log('   ✔ Catalog amount revalidation enforced.\n');

    console.log('3. Unknown product must be rejected (no silent default)...');
    res = await postWebhook(worker, env, paymentUpdate(PAYER, {
      invoice_payload: JSON.stringify({ p: 'not_a_real_sku', u: PAYER.id }),
      telegram_payment_charge_id: 'tx_unknown_sku'
    }), WEBHOOK_SECRET);
    assert.strictEqual(res.status, 400);
    assert.strictEqual((await res.json()).error, 'unknown_product');
    console.log('   ✔ Unknown product refused.\n');

    console.log('4. Legitimate payment upgrades the payer...');
    res = await postWebhook(worker, env, paymentUpdate(PAYER, {
      telegram_payment_charge_id: 'tx_legit_pro'
    }), WEBHOOK_SECRET);
    assert.strictEqual(res.status, 200);
    const upgraded = db.users.get(PAYER.id);
    assert.ok(upgraded, 'payer must exist');
    assert.strictEqual(upgraded.tier, 'pro_monthly');
    assert.strictEqual(upgraded.stars_spent, 250);
    console.log('   ✔ Payer upgraded to pro_monthly.\n');

    console.log('5. Idempotent redelivery recovers grant if charge exists but tier was wiped...');
    db.users.set(PAYER.id, {
      telegram_id: PAYER.id,
      tier: 'free',
      tier_expires_at: null,
      stars_spent: 0
    });
    res = await postWebhook(worker, env, paymentUpdate(PAYER, {
      telegram_payment_charge_id: 'tx_legit_pro'
    }), WEBHOOK_SECRET);
    assert.strictEqual(res.status, 200);
    const recovered = db.users.get(PAYER.id);
    assert.strictEqual(recovered.tier, 'pro_monthly', 'redelivery must re-apply tier');
    assert.strictEqual(recovered.stars_spent, 250, 'stars_spent stays ledger-derived (not doubled)');
    assert.strictEqual(db.transactions.filter((t) => t.id === 'tx_legit_pro').length, 1);
    console.log('   ✔ Redelivery restored tier without duplicate charges.\n');

    console.log('6. Production without webhook secret must reject payment delivery...');
    const envNoSecret = Object.assign({}, env, { TELEGRAM_WEBHOOK_SECRET: '', EDGE_WEBHOOK_SECRET: '' });
    res = await postWebhook(worker, envNoSecret, paymentUpdate(PAYER, {
      telegram_payment_charge_id: 'tx_no_secret'
    }), '');
    assert.ok(res.status === 401 || res.status === 403 || res.status === 500 || res.status === 503,
      'missing secret must not quietly grant (got ' + res.status + ')');
    console.log('   ✔ Payment without webhook secret blocked (status ' + res.status + ').\n');

    console.log('ALL STARS BINDING CHECKS PASSED');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
