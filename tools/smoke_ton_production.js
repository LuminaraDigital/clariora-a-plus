#!/usr/bin/env node
/**
 * Production TON readiness smoke (no wallet signature, no mainnet spend).
 * Confirms health/ready/auth gates. SBT collection may be false until mainnet deploy.
 */
'use strict';

const BASE = process.env.PROD_BASE || 'https://clariora.com.au';

async function main() {
  const report = { base: BASE, checks: {} };

  const health = await fetch(BASE + '/api/v1/health');
  const healthJson = await health.json().catch(() => ({}));
  report.checks.health = {
    ok: health.ok && healthJson.status === 'ok' && healthJson.tonNetwork === 'mainnet',
    status: health.status,
    tonNetwork: healthJson.tonNetwork || null,
    tonSbtConfigured: Boolean(healthJson.tonSbtConfigured)
  };

  const ready = await fetch(BASE + '/api/v1/ready');
  const readyJson = await ready.json().catch(() => ({}));
  report.checks.ready = {
    ok: ready.ok && readyJson.status === 'ready' && readyJson.tonConfigured &&
      readyJson.tonConfigured.merchant === true && readyJson.tonConfigured.toncenter === true,
    db: readyJson.db,
    tonConfigured: readyJson.tonConfigured || null
  };

  const orderRes = await fetch(BASE + '/api/v1/billing/ton/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'daily_unlimited', network: 'mainnet' })
  });
  const orderJson = await orderRes.json().catch(() => ({}));
  report.checks.orderAuthGate = {
    ok: orderRes.status === 401 && orderJson.error === 'AUTH_REQUIRED',
    status: orderRes.status,
    error: orderJson.error || null
  };

  const mintRes = await fetch(BASE + '/api/v1/credentials/ton/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const mintJson = await mintRes.json().catch(() => ({}));
  report.checks.mintAuthGate = {
    ok: mintRes.status === 401 && mintJson.error === 'AUTH_REQUIRED',
    status: mintRes.status,
    error: mintJson.error || null
  };

  const collection = healthJson.tonSbtCollectionAddress || null;
  const testnetForm = collection ? /^[k0]Q/i.test(String(collection)) : false;
  // SBT collection is optional until mainnet contract deploy is confirmed.
  // Fail closed if a testnet-form address ever appears on production health.
  report.checks.sbtCollectionOptional = {
    ok: !testnetForm,
    configured: Boolean(readyJson.tonConfigured && readyJson.tonConfigured.sbtCollection),
    testnetFormRejected: !testnetForm,
    note: testnetForm
      ? 'FAIL: production health exposes a testnet-form collection address'
      : 'Mainnet Mastery SBT remains gated until explicit confirm + collection deploy'
  };

  const failed = Object.values(report.checks).some((c) => !c.ok);
  report.status = failed ? 'PROD_SMOKE_FAIL' : 'PROD_SMOKE_PASS';
  report.productionGrade = {
    payRailCodeLive: report.checks.health.ok && report.checks.orderAuthGate.ok,
    sbtMintQueueLive: report.checks.mintAuthGate.ok,
    mainnetSbtDeployed: Boolean(healthJson.tonSbtConfigured),
    githubPushed: null
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'PROD_SMOKE_ERROR', message: String(err && err.message ? err.message : err) }));
  process.exit(2);
});
