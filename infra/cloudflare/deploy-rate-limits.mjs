#!/usr/bin/env node
/**
 * Deploys infra/cloudflare/rate-limit-ruleset.json to the zone's http_ratelimit
 * entrypoint ruleset.
 *
 * These rules run in Cloudflare's proxy BEFORE the Worker is dispatched, which is
 * the only place in this stack where a hostile request can be dropped without
 * being billed as a Worker invocation.
 *
 * Free/Pro zones allow only 1 rule in http_ratelimit (Cloudflare error 50001).
 * Default JSON is the single-rule Free/Pro set. Use --full for Business/Enterprise.
 *
 * Usage:
 *   CF_API_TOKEN=... CF_ZONE_ID=... node infra/cloudflare/deploy-rate-limits.mjs
 *   CF_API_TOKEN=... CF_ZONE_ID=... node infra/cloudflare/deploy-rate-limits.mjs --dry-run
 *   CF_API_TOKEN=... CF_ZONE_ID=... node infra/cloudflare/deploy-rate-limits.mjs --full
 *
 * Or: node infra/cloudflare/run_deploy_rate_limits.mjs  (maps CLOUDFLARE_* from .env)
 *
 * The API token needs the "Zone / Zone WAF / Edit" permission on the target zone.
 * Never commit the token; use `wrangler secret`-style handling or a CI secret.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULESET_DEFAULT = join(HERE, 'rate-limit-ruleset.json');
const RULESET_FULL = join(HERE, 'rate-limit-ruleset.full.json');
const API_BASE = 'https://api.cloudflare.com/client/v4';

const VALID_PERIODS = new Set([10, 60, 120, 300, 600, 3600]);

function fail(message) {
  console.error(`\n  ERROR  ${message}\n`);
  process.exitCode = 1;
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

    const isCatchAll = /^\(starts_with\(http\.request\.uri\.path, "\/api\/"\)\)$/.test(rule.expression.trim());
    if (isCatchAll && rl.period === 60 && catchAllIndex === -1) catchAllIndex = i;
    else if (catchAllIndex !== -1 && rl.period === 60) {
      problems.push(`${label}: shadowed by the 60s /api/ catch-all at rule[${catchAllIndex}] - move it above`);
    }
  });

  if (problems.length) {
    fail(`ruleset validation failed:\n    - ${problems.join('\n    - ')}`);
    throw new Error('validation failed');
  }
}

async function cfRequest(token, method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok && payload.success !== false, status: res.status, payload };
}

function formatErrors(payload) {
  return (payload.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ')
    || JSON.stringify(payload).slice(0, 400);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const useFull = process.argv.includes('--full');
  const token = process.env.CF_API_TOKEN;
  const zoneId = process.env.CF_ZONE_ID;
  const RULESET_PATH = useFull ? RULESET_FULL : RULESET_DEFAULT;

  const raw = await readFile(RULESET_PATH, 'utf8').catch(() => {
    fail(`cannot read ${RULESET_PATH}`);
    throw new Error('missing ruleset');
  });
  const parsed = JSON.parse(raw);
  const ruleset = stripDocKeys(parsed);

  validate(parsed);

  console.log(`\n  Ruleset: ${ruleset.name} (${ruleset.rules.length} rules) [${useFull ? 'full' : 'free/pro'}]\n`);
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

  if (!token) {
    fail('CF_API_TOKEN is not set');
    return;
  }
  if (!zoneId) {
    fail('CF_ZONE_ID is not set');
    return;
  }

  const entryPath = `/zones/${zoneId}/rulesets/phases/http_ratelimit/entrypoint`;
  const getResult = await cfRequest(token, 'GET', entryPath);

  let result;
  if (getResult.ok && getResult.payload.result) {
    // Phase entrypoint PUT rejects kind/phase (implied by URL).
    const put = await cfRequest(token, 'PUT', entryPath, {
      name: ruleset.name,
      description: ruleset.description,
      rules: ruleset.rules
    });
    if (!put.ok) {
      fail(`Cloudflare API PUT ${entryPath} -> ${put.status}\n         ${formatErrors(put.payload)}`);
      return;
    }
    result = put.payload.result;
  } else {
    // Entrypoint missing: create zone ruleset with kind + phase.
    const create = await cfRequest(token, 'POST', `/zones/${zoneId}/rulesets`, {
      name: ruleset.name,
      kind: 'zone',
      phase: 'http_ratelimit',
      description: ruleset.description,
      rules: ruleset.rules
    });
    if (!create.ok) {
      const errText = formatErrors(create.payload);
      if (String(errText).includes('50001') && useFull) {
        fail(
          `${errText}\n\n         Free/Pro plans allow only 1 http_ratelimit rule.\n` +
          `         Re-run without --full to deploy rate-limit-ruleset.json.`
        );
        return;
      }
      fail(`Cloudflare API POST /zones/.../rulesets -> ${create.status}\n         ${errText}`);
      return;
    }
    result = create.payload.result;
  }

  console.log(`  Deployed. Ruleset id ${result.id}, version ${result.version}.\n`);
  console.log('  Verify with: node infra/cloudflare/verify-edge-limits.mjs https://clariora.com.au\n');
}

main().catch((err) => {
  fail(err && err.stack ? err.stack : String(err));
});
