#!/usr/bin/env node
/**
 * tools/verify_tma_live_production.js
 * Live smoke checks against production Clariora TMA endpoints.
 * Does not require secrets. Exits 1 on any hard failure.
 */
'use strict';

const BASE = process.env.CLARIORA_BASE_URL || 'https://clariora.com.au';

async function getJson(path) {
  const res = await fetch(BASE + path, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch (_) {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('Clariora TMA live production verify:', BASE);

  const health = await getJson('/api/v1/health');
  assert(health.status === 200, 'health HTTP ' + health.status);
  assert(health.body && health.body.status === 'ok', 'health status not ok');
  assert(health.body.tmaSupported === true, 'tmaSupported must be true');
  assert(Array.isArray(health.body.payRails) && health.body.payRails.indexOf('telegram_stars') !== -1,
    'payRails must include telegram_stars');
  console.log('  OK health');

  const webhook = await getJson('/api/v1/telegram/webhook');
  assert(webhook.status === 200, 'webhook GET HTTP ' + webhook.status);
  assert(webhook.body && webhook.body.service === 'telegram_bot_webhook', 'webhook service label');
  assert(String(webhook.body.webhookUrl || '').indexOf('clariora.com.au') !== -1, 'webhook URL host');
  console.log('  OK telegram webhook probe');

  const manifestRes = await fetch(BASE + '/tonconnect-manifest.json', { method: 'GET' });
  assert(manifestRes.status === 200, 'tonconnect-manifest HTTP ' + manifestRes.status);
  const manifest = await manifestRes.json();
  assert(manifest.url === 'https://clariora.com.au', 'manifest url');
  assert(String(manifest.iconUrl || '').indexOf('clariora.com.au') !== -1, 'manifest iconUrl');
  console.log('  OK tonconnect-manifest.json');

  const appRes = await fetch(BASE + '/app', { method: 'GET', redirect: 'follow' });
  assert(appRes.status === 200, '/app HTTP ' + appRes.status);
  const appHtml = await appRes.text();
  assert(appHtml.indexOf('tma_bridge') !== -1 || appHtml.indexOf('TMABridge') !== -1 || appHtml.indexOf('telegram') !== -1,
    '/app should reference Telegram Mini App assets');
  console.log('  OK /app shell');

  // Unauthenticated Stars invoice must 401 (never sandbox-grant on production).
  const inv = await fetch(BASE + '/api/v1/billing/stars/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'pro_monthly' })
  });
  const invBody = await inv.json().catch(() => ({}));
  assert(inv.status === 401 || inv.status === 403, 'invoice without auth must reject, got ' + inv.status);
  assert(!invBody.sandbox, 'production must not return sandbox invoice without auth');
  assert(!invBody.invoiceLink, 'production must not return invoiceLink without auth');
  console.log('  OK stars invoice auth gate');

  // Unauthenticated TON order must 401.
  const ton = await fetch(BASE + '/api/v1/billing/ton/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'pro_monthly' })
  });
  assert(ton.status === 401 || ton.status === 403, 'ton order without auth must reject, got ' + ton.status);
  console.log('  OK ton order auth gate');

  if (process.env.CLARIORA_CHECK_MARKETING_COPY === '1') {
    await assertMarketingCopy();
  }

  console.log('\nALL LIVE TMA PRODUCTION CHECKS PASSED');
}

async function assertMarketingCopy() {
  const pages = [
    {
      path: '/landing/faq.html',
      need: 'Sign in to open the study app',
      forbid: 'Progress is stored on your device'
    },
    {
      path: '/landing/faq',
      need: 'Sign in to open the study app',
      forbid: 'Progress is stored on your device'
    },
    {
      path: '/landing/trust.html',
      need: 'Sign-in required on the web',
      forbid: 'No account and no phone-home'
    },
    {
      path: '/privacy.html',
      need: 'On the web, sign-in is required',
      forbid: 'You can use Clariora without creating an account'
    },
    {
      path: '/terms.html',
      need: 'On the web, an account is required',
      forbid: 'without creating an account'
    }
  ];
  for (const page of pages) {
    const res = await fetch(BASE + page.path, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    });
    const html = await res.text();
    const cache = res.headers.get('cache-control') || '';
    assert(res.status === 200, page.path + ' HTTP ' + res.status + ' (expected 200, not a cached redirect)');
    assert(html.indexOf(page.need) !== -1, page.path + ' missing sign-in copy: ' + page.need);
    assert(html.indexOf(page.forbid) === -1, page.path + ' still serves retired guest copy');
    assert(/no-store/i.test(cache), page.path + ' Cache-Control must be no-store, got ' + cache);
    console.log('  OK marketing copy ' + page.path);
  }
}

main().catch((err) => {
  console.error('LIVE VERIFY FAILED:', err && err.message ? err.message : err);
  process.exit(1);
});
