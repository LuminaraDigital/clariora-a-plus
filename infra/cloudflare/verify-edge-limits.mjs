#!/usr/bin/env node
/**
 * Live verification that Tier 2 edge rules actually drop traffic BEFORE the
 * Worker is invoked.
 *
 * This is the one claim that cannot be proven from source: whether a flood is
 * stopped in Cloudflare's proxy (free) or by our own limiter inside the Worker
 * (billed). The two are told apart by what comes back:
 *
 *   EDGE BLOCK    429 or 403, an HTML Cloudflare challenge/error body, and no
 *                 X-RateLimit-* headers, because our code never ran.
 *   WORKER BLOCK  429 with a JSON body and the full X-RateLimit-* trio, which
 *                 means the request was dispatched and billed.
 *   NEITHER       everything returns 2xx/4xx with no throttling at all.
 *
 * This script deliberately generates enough traffic to trip a production rate
 * limit, so it requires --confirm and refuses to run without a target.
 *
 * Usage:
 *   node infra/cloudflare/verify-edge-limits.mjs https://clariora.com.au --confirm
 *   node infra/cloudflare/verify-edge-limits.mjs https://staging.example.com --confirm --path /api/v1/coach
 *
 * Run it from an IP you are willing to have rate limited for the mitigation
 * timeout (5 minutes on the LLM and auth rules).
 */

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith('http'));
const confirmed = args.includes('--confirm');
const pathFlag = args.indexOf('--path');
const onlyPath = pathFlag !== -1 ? args[pathFlag + 1] : null;

if (!base) {
  console.error('\n  Usage: node infra/cloudflare/verify-edge-limits.mjs <base-url> --confirm [--path /api/v1/coach]\n');
  process.exit(2);
}

if (!confirmed) {
  console.error(
    `\n  This sends bursts of real traffic to ${base} and will trip production\n` +
    '  rate limits for your current IP (up to 5 minutes on the LLM and auth\n' +
    '  rules). Re-run with --confirm if that is acceptable.\n'
  );
  process.exit(2);
}

/** Each probe: how many requests, and what the configured ceiling is. */
const PROBES = [
  { path: '/api/v1/coach', method: 'POST', burst: 20, expectBlockBy: 10, label: 'LLM inference' },
  { path: '/api/v1/auth/telegram', method: 'POST', burst: 20, expectBlockBy: 10, label: 'auth (unauthenticated)' },
  { path: '/api/v1/billing/stars/invoice', method: 'POST', burst: 20, expectBlockBy: 12, label: 'billing' },
  { path: '/api/v1/bank/full', method: 'GET', burst: 30, expectBlockBy: 20, label: 'bulk question bank' },
  { path: '/api/v1/health', method: 'GET', burst: 60, expectBlockBy: 40, label: 'burst guard (10s window)' }
].filter((p) => !onlyPath || p.path === onlyPath);

function classify(res, bodyText) {
  const hasLimitHeaders = Boolean(res.headers.get('x-ratelimit-limit'));
  const contentType = res.headers.get('content-type') || '';
  const looksLikeCloudflareHtml =
    contentType.includes('text/html') || /cloudflare|cf-error|Sorry, you have been blocked/i.test(bodyText.slice(0, 600));

  if (res.status === 429 || res.status === 403) {
    if (hasLimitHeaders && contentType.includes('json')) return 'WORKER';
    if (looksLikeCloudflareHtml || !hasLimitHeaders) return 'EDGE';
    return 'WORKER';
  }
  return 'PASS';
}

async function probe(spec) {
  const url = base.replace(/\/$/, '') + spec.path;
  const results = [];

  for (let i = 0; i < spec.burst; i += 1) {
    try {
      const res = await fetch(url, {
        method: spec.method,
        headers: { 'Content-Type': 'application/json' },
        body: spec.method === 'POST' ? '{}' : undefined,
        redirect: 'manual'
      });
      const text = await res.text().catch(() => '');
      results.push({ i, status: res.status, verdict: classify(res, text) });
    } catch (err) {
      results.push({ i, status: 0, verdict: 'NETWORK', error: err.message });
    }
  }

  const firstBlock = results.find((r) => r.verdict === 'EDGE' || r.verdict === 'WORKER');
  const edgeBlocks = results.filter((r) => r.verdict === 'EDGE').length;
  const workerBlocks = results.filter((r) => r.verdict === 'WORKER').length;

  return { spec, url, results, firstBlock, edgeBlocks, workerBlocks };
}

async function main() {
  console.log(`\n  Edge rate-limit verification against ${base}`);
  console.log('  EDGE = dropped before the Worker (free). WORKER = dispatched and billed.\n');

  const report = [];

  for (const spec of PROBES) {
    process.stdout.write(`  ${spec.label.padEnd(26)} ${String(spec.burst).padStart(3)} reqs -> `);
    const out = await probe(spec);
    report.push(out);

    if (!out.firstBlock) {
      console.log(`NO THROTTLING (expected a block by request ${spec.expectBlockBy})`);
    } else {
      console.log(
        `first block at #${out.firstBlock.i + 1} [${out.firstBlock.verdict}]  ` +
        `edge=${out.edgeBlocks} worker=${out.workerBlocks}`
      );
    }

    // Let the short burst window drain before the next probe so one probe's
    // mitigation timeout does not masquerade as the next probe's result.
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('\n  Summary');
  let problems = 0;

  for (const out of report) {
    const { spec } = out;
    if (!out.firstBlock) {
      console.log(`    FAIL  ${spec.path}: no rate limiting observed`);
      problems += 1;
    } else if (out.firstBlock.i + 1 > spec.expectBlockBy + 2) {
      console.log(
        `    WARN  ${spec.path}: blocked at #${out.firstBlock.i + 1}, expected around #${spec.expectBlockBy} ` +
        '(per-datacentre counting on non-Enterprise plans inflates effective limits)'
      );
    } else if (out.edgeBlocks === 0) {
      console.log(
        `    WARN  ${spec.path}: limited only by the Worker. The edge ruleset is not ` +
        'deployed or does not match this path, so every blocked request is still billed.'
      );
      problems += 1;
    } else {
      console.log(`    OK    ${spec.path}: dropped at the edge from request #${out.firstBlock.i + 1}`);
    }
  }

  console.log('');
  process.exit(problems ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
