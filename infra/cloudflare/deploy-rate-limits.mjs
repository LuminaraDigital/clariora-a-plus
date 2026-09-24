#!/usr/bin/env node
/**
 * Deploys infra/cloudflare/rate-limit-ruleset.json to the zone's http_ratelimit
 * entrypoint ruleset.
 *
 * These rules run in Cloudflare's proxy BEFORE the Worker is dispatched, which is
 * the only place in this stack where a hostile request can be dropped without
 * being billed as a Worker invocation.
 *
 * Usage:
 *   CF_API_TOKEN=... CF_ZONE_ID=... node infra/cloudflare/deploy-rate-limits.mjs
 *   CF_API_TOKEN=... CF_ZONE_ID=... node infra/cloudflare/deploy-rate-limits.mjs --dry-run
 *
 * The API token needs the "Zone / Zone WAF / Edit" permission on the target zone.
 * Never commit the token; use `wrangler secret`-style handling or a CI secret.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULESET_PATH = join(HERE, 'rate-limit-ruleset.json');
const API_BASE = 'https://api.cloudflare.com/client/v4';

const VALID_PERIODS = new Set([10, 60, 120, 300, 600, 3600]);

function fail(message) {
  console.error(`\n  ERROR  ${message}\n`);
  process.exit(1);
}

/** Strips the `_comment` / `_rationale` documentation keys the API rejects. */
function stripDocKeys(value) {
  if (Array.isArray(value)) return value.map(stripDocKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('_')) continue;
      out[k] = stripDocKeys(v);
    }
    return out;
  }
  return value;
}

/**
 * Catches the configuration mistakes that fail silently rather than loudly:
 * an unsupported period is rejected by the API, but a rule ordered after the
 * catch-all simply never fires and nobody notices until the bill arrives.
 */
function validate(ruleset) {
  const problems = [];

  if (!Array.isArray(ruleset.rules) || ruleset.rules.length === 0) {
    problems.push('ruleset has no rules');
  }

  let catchAllIndex = -1;

  ruleset.rules.forEach((rule, i) => {
    const label = `rule[${i}] "${rule.description || '(no description)'}"`;

    if (!rule.expression) problems.push(`${label}: missing expression`);
    if (!rule.ratelimit) {
      problems.push(`${label}: missing ratelimit block`);
      return;
    }

    const rl = rule.ratelimit;
    if (!VALID_PERIODS.has(rl.period)) {
      problems.push(`${label}: period ${rl.period} is not one of ${[...VALID_PERIODS].join(', ')}`);
    }
    if (!Array.isArray(rl.characteristics) || !rl.characteristics.includes('cf.colo.id')) {
      problems.push(`${label}: characteristics must include "cf.colo.id" on non-Enterprise plans`);
    }
    if (!(rl.requests_per_period > 0)) {
      problems.push(`${label}: requests_per_period must be positive`);
    }

    // The catch-all matches every /api/ path, so anything below it on a 60s
    // window can never be the first rule to block.
    const isCatchAll = /^\(starts_with\(http\.request\.uri\.path, "\/api\/"\)\)$/.test(rule.expression.trim());
    if (isCatchAll && rl.period === 60 && catchAllIndex === -1) catchAllIndex = i;
    else if (catchAllIndex !== -1 && rl.period === 60) {
      problems.push(`${label}: shadowed by the 60s /api/ catch-all at rule[${catchAllIndex}] - move it above`);
    }
  });

  if (problems.length) {
    fail(`ruleset validation failed:\n    - ${problems.join('\n    - ')}`);
  }
}

async function cf(token, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.success === false) {
    const errors = (payload.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ');
    fail(`Cloudflare API ${method} ${path} -> ${res.status}\n         ${errors || JSON.stringify(payload).slice(0, 400)}`);
  }
  return payload.result;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const token = process.env.CF_API_TOKEN;
  const zoneId = process.env.CF_ZONE_ID;

  const raw = await readFile(RULESET_PATH, 'utf8').catch(() => fail(`cannot read ${RULESET_PATH}`));
  const parsed = JSON.parse(raw);
  const ruleset = stripDocKeys(parsed);

  validate(parsed);

  console.log(`\n  Ruleset: ${ruleset.name} (${ruleset.rules.length} rules)\n`);
  for (const rule of parsed.rules) {
    const rl = rule.ratelimit;
    console.log(
      `    ${String(rl.requests_per_period).padStart(4)} req / ${String(rl.period).padStart(4)}s  ` +
      `block ${String(rl.mitigation_timeout).padStart(4)}s   ${rule.description}`
    );
  }
  console.log('');

  if (dryRun) {
    console.log('  --dry-run: validated, nothing sent.\n');
    return;
  }

  if (!token) fail('CF_API_TOKEN is not set');
  if (!zoneId) fail('CF_ZONE_ID is not set');

  const result = await cf(token, 'PUT', `/zones/${zoneId}/rulesets/phases/http_ratelimit/entrypoint`, {
    name: ruleset.name,
    kind: 'zone',
    phase: 'http_ratelimit',
    description: ruleset.description,
    rules: ruleset.rules
  });

  console.log(`  Deployed. Ruleset id ${result.id}, version ${result.version}.\n`);
  console.log('  Verify with: node infra/cloudflare/verify-edge-limits.mjs https://clariora.com.au\n');
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));
