#!/usr/bin/env node
/**
 * Staging TON pay smoke (no wallet signature required).
 * Verifies Worker health, AUTH gate on order, merchant secret presence (401 not 503),
 * and testnet merchant balance via TonCenter.
 */
'use strict';

const BASE = process.env.STAGING_BASE ||
  'https://clariora-a-plus-staging.sparkling-fog-be2d.workers.dev';
const MERCHANT = process.env.TON_MERCHANT_WALLET_ADDRESS ||
  'EQBWc5GBhGYm5d-xKTQ7bVEOgFlBFiYY_pJmhB9rFo3cMOak';

async function main() {
  const report = { base: BASE, merchant: MERCHANT, checks: {} };

  const health = await fetch(BASE + '/api/v1/health');
  const healthJson = await health.json().catch(() => ({}));
  report.checks.health = {
    ok: health.ok && healthJson.status === 'ok',
    status: health.status,
    tonNetwork: healthJson.tonNetwork || null,
    tonSbtConfigured: healthJson.tonSbtConfigured,
    payRails: healthJson.payRails
  };

  const ready = await fetch(BASE + '/api/v1/ready');
  const readyJson = await ready.json().catch(() => ({}));
  report.checks.ready = {
    ok: ready.ok && readyJson.status === 'ready',
    db: readyJson.db,
    tonMerchantConfigured: readyJson.tonConfigured && readyJson.tonConfigured.merchant,
    toncenterConfigured: readyJson.tonConfigured && readyJson.tonConfigured.toncenter
  };

  const orderRes = await fetch(BASE + '/api/v1/billing/ton/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'daily_unlimited', network: 'testnet' })
  });
  const orderJson = await orderRes.json().catch(() => ({}));
  // 401 AUTH_REQUIRED = merchant secret is present (else 503 TON_MERCHANT_UNCONFIGURED)
  report.checks.orderAuthGate = {
    ok: orderRes.status === 401 && orderJson.error === 'AUTH_REQUIRED',
    status: orderRes.status,
    error: orderJson.error || null,
    meaning: orderRes.status === 503
      ? 'Merchant secret missing'
      : (orderRes.status === 401 ? 'Auth required (merchant configured)' : 'Unexpected')
  };

  const balUrl = 'https://testnet.toncenter.com/api/v2/getAddressBalance?address=' +
    encodeURIComponent(MERCHANT);
  const balRes = await fetch(balUrl);
  const balJson = await balRes.json().catch(() => ({}));
  const nanotons = Number(balJson.result || 0);
  report.checks.merchantFunded = {
    ok: balJson.ok === true && nanotons >= 1e9,
    nanotons,
    tonApprox: nanotons / 1e9
  };

  const failed = Object.values(report.checks).some((c) => !c.ok);
  report.status = failed ? 'SMOKE_FAIL' : 'SMOKE_PASS';
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'SMOKE_ERROR', message: String(err && err.message ? err.message : err) }));
  process.exit(2);
});
