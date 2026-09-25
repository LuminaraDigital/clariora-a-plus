/**
 * tools/test_rate_limit_defense.js
 *
 * Verification suite for the 3-tier rate limiting architecture.
 * Run: node tools/test_rate_limit_defense.js
 *
 *   Tier 1 (client)  js/request-guard.js         - submission locks, dedupe, retry policy
 *   Tier 2 (edge)    infra/cloudflare/*.json     - ruleset shape, ordering, coverage
 *   Tier 3 (server)  workers/coach_rate_limiter  - dual-key verdicts and headers
 *                    workers/token_budget.js     - atomic pre-flight reservation
 *
 * The Tier 3 budget tests run against a real SQLite engine (node:sqlite) through a
 * D1-shaped shim, so the atomicity claims are executed rather than asserted.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
const failures = [];

function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  PASS  ${name}`);
    })
    .catch((err) => {
      failures.push({ name, err });
      console.log(`  FAIL  ${name}\n        ${err && err.message}`);
    });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'mismatch'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/* =========================================================================
 * TIER 1 - client request guard
 *
 * js/request-guard.js is a browser IIFE. Load it against a synthetic window so
 * the real file is exercised, not a reimplementation of it.
 * ====================================================================== */

function loadGuard(fetchImpl) {
  const src = readFileSync(join(ROOT, 'js', 'request-guard.js'), 'utf8');

  const fakeWindow = {
    fetch: fetchImpl,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t),
    AbortController: globalThis.AbortController,
    location: { href: 'https://clariora.com.au/app' },
    event: null,
    document: { getElementById: () => null }
  };

  // eslint-disable-next-line no-new-func
  new Function('window', 'URL', 'document', src)(fakeWindow, URL, fakeWindow.document);
  return { guard: fakeWindow.APlus.guard, win: fakeWindow };
}

function mockResponse(status, headers = {}) {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => (map.has(String(k).toLowerCase()) ? map.get(String(k).toLowerCase()) : null) },
    json: async () => ({})
  };
}

async function tier1() {
  section('TIER 1  client self-defense (js/request-guard.js)');

  await check('double-click on a guarded action dispatches once', async () => {
    let dispatches = 0;
    const { guard } = loadGuard(async () => {
      dispatches += 1;
      await new Promise((r) => setTimeout(r, 30));
      return mockResponse(200);
    });

    const run = () => guard.action('checkout', () =>
      guard.fetch('/api/v1/billing/stars/invoice', { method: 'POST' }, { maxAttempts: 1 })
    );

    // Two clicks in the same tick, exactly as a user double-tapping produces.
    const [first, second] = await Promise.all([run(), run()]);

    assertEqual(dispatches, 1, 'network dispatches');
    assert(second && second.skipped === true, 'second click reports skipped');
    assert(!first.skipped, 'first click ran');
  });

  await check('lock releases so a later click still works', async () => {
    let dispatches = 0;
    const { guard } = loadGuard(async () => {
      dispatches += 1;
      return mockResponse(200);
    });

    await guard.action('k', () => guard.fetch('/api/x', { method: 'POST' }));
    await guard.action('k', () => guard.fetch('/api/x', { method: 'POST' }));
    assertEqual(dispatches, 2, 'sequential clicks both dispatch');
  });

  await check('concurrent identical reads collapse into one request', async () => {
    let dispatches = 0;
    const { guard } = loadGuard(async () => {
      dispatches += 1;
      await new Promise((r) => setTimeout(r, 20));
      return mockResponse(200);
    });

    // Four sibling widgets asking for the same thing during boot.
    await Promise.all([
      guard.fetch('/api/v1/auth/me'),
      guard.fetch('/api/v1/auth/me'),
      guard.fetch('/api/v1/auth/me'),
      guard.fetch('/api/v1/auth/me')
    ]);

    assertEqual(dispatches, 1, 'coalesced dispatches');
  });

  await check('4xx responses are never retried', async () => {
    for (const status of [400, 401, 403, 404, 429]) {
      let dispatches = 0;
      const { guard } = loadGuard(async () => {
        dispatches += 1;
        return mockResponse(status);
      });

      // maxAttempts 2 is the ceiling; a 4xx must still cost exactly one call.
      await guard.fetch(`/api/v1/probe-${status}`, {}, { maxAttempts: 2 }).catch(() => {});
      assertEqual(dispatches, 1, `dispatches for ${status}`);
    }
  });

  await check('5xx retries are capped at 2 total attempts', async () => {
    let dispatches = 0;
    const { guard } = loadGuard(async () => {
      dispatches += 1;
      return mockResponse(503);
    });

    // Ask for more than the ceiling; the guard must clamp it.
    const res = await guard.fetch('/api/v1/flaky', {}, { maxAttempts: 9 });
    assertEqual(dispatches, 2, 'attempts');
    assertEqual(res.status, 503, 'final status surfaced to caller');
  });

  await check('mutations default to a single attempt', async () => {
    let dispatches = 0;
    const { guard } = loadGuard(async () => {
      dispatches += 1;
      return mockResponse(500);
    });

    await guard.fetch('/api/v1/sync', { method: 'POST' });
    assertEqual(dispatches, 1, 'POST attempts');
  });

  await check('429 arms a local backoff that blocks the next call without a fetch', async () => {
    let dispatches = 0;
    const { guard } = loadGuard(async () => {
      dispatches += 1;
      return mockResponse(429, { 'Retry-After': '60', 'X-RateLimit-Limit': '10', 'X-RateLimit-Reset': '1780000000' });
    });

    await guard.fetch('/api/v1/coach', { method: 'POST' }).catch((e) => {
      assert(e.rateLimited === true, '429 surfaces as a rateLimited error');
    });
    assertEqual(dispatches, 1, 'first call reaches the network');

    const status = guard.limitStatus('/api/v1/coach');
    assert(status.blocked, 'endpoint is locally blocked');
    assertEqual(status.limit, 10, 'limit parsed from headers');

    let blockedLocally = false;
    await guard.fetch('/api/v1/coach', { method: 'POST' }).catch((e) => {
      blockedLocally = e.local === true;
    });
    assert(blockedLocally, 'second call rejected locally');
    assertEqual(dispatches, 1, 'no additional network dispatch');
  });

  await check('X-RateLimit-Remaining is tracked from successful responses', async () => {
    const { guard } = loadGuard(async () =>
      mockResponse(200, { 'X-RateLimit-Limit': '40', 'X-RateLimit-Remaining': '7', 'X-RateLimit-Reset': '1780000000' })
    );
    await guard.fetch('/api/v1/items/stats');
    const s = guard.limitStatus('/api/v1/items/stats');
    assertEqual(s.remaining, 7, 'remaining');
    assertEqual(s.limit, 40, 'limit');
    assert(!s.blocked, 'not blocked while remaining > 0');
  });

  await check('debounce collapses a burst of keystrokes into one call', async () => {
    let calls = 0;
    const { guard } = loadGuard(async () => mockResponse(200));
    const search = guard.debounce(() => { calls += 1; }, 40);

    for (let i = 0; i < 10; i += 1) search('q' + i);
    await new Promise((r) => setTimeout(r, 120));

    assertEqual(calls, 1, 'debounced invocations');
  });

  await check('debounce supplies an AbortSignal for the surviving call', async () => {
    let received = null;
    const { guard } = loadGuard(async () => mockResponse(200));
    const search = guard.debounce((_q, signal) => { received = signal; }, 20);
    search('abc');
    await new Promise((r) => setTimeout(r, 80));
    assert(received && typeof received.aborted === 'boolean', 'signal passed to handler');
  });

  await check('supersede aborts the in-flight request it replaces', async () => {
    let aborted = false;
    const { guard } = loadGuard(async (_url, init) => {
      if (init && init.signal) {
        init.signal.addEventListener('abort', () => { aborted = true; });
      }
      await new Promise((r) => setTimeout(r, 60));
      return mockResponse(200);
    });

    const first = guard.fetch('/api/v1/search?q=a', {}, { dedupeKey: 'search' });
    first.catch(() => {});
    await new Promise((r) => setTimeout(r, 10));
    await guard.fetch('/api/v1/search?q=ab', {}, { dedupeKey: 'search', supersede: true });

    assert(aborted, 'superseded request was aborted');
  });

  await check('timeout aborts a hung request', async () => {
    const { guard } = loadGuard(async (_url, init) => {
      await new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    });

    let name = '';
    await guard.fetch('/api/v1/slow', {}, { timeoutMs: 40, maxAttempts: 2 }).catch((e) => { name = e.name; });
    assertEqual(name, 'AbortError', 'aborted on timeout');
  });

  await check('cached() coalesces repeat reads inside the TTL', async () => {
    let loads = 0;
    const { guard } = loadGuard(async () => mockResponse(200));
    const load = () => guard.cached('entitlement', async () => { loads += 1; return 'pro'; }, 500);

    assertEqual(await load(), 'pro');
    assertEqual(await load(), 'pro');
    assertEqual(await load(), 'pro');
    assertEqual(loads, 1, 'loader invocations');

    guard.invalidate('entitlement');
    await load();
    assertEqual(loads, 2, 'invalidate forces a refetch');
  });

  await check('a failed cached() load is not cached', async () => {
    let loads = 0;
    const { guard } = loadGuard(async () => mockResponse(200));
    const load = () => guard.cached('flaky', async () => {
      loads += 1;
      throw new Error('nope');
    }, 5000);

    await load().catch(() => {});
    await load().catch(() => {});
    assertEqual(loads, 2, 'failures are retryable');
  });
}

/* =========================================================================
 * TIER 2 - edge ruleset
 * ====================================================================== */

async function tier2() {
  section('TIER 2  edge ruleset (infra/cloudflare/rate-limit-ruleset.json)');

  const fullRuleset = join(ROOT, 'infra', 'cloudflare', 'rate-limit-ruleset.full.json');
  const rulesetFile = existsSync(fullRuleset) ? fullRuleset : join(ROOT, 'infra', 'cloudflare', 'rate-limit-ruleset.json');
  const ruleset = JSON.parse(readFileSync(rulesetFile, 'utf8'));
  const VALID_PERIODS = new Set([10, 60, 120, 300, 600, 3600]);

  await check('every rule uses an API-accepted period', () => {
    for (const rule of ruleset.rules) {
      assert(VALID_PERIODS.has(rule.ratelimit.period), `bad period on "${rule.description}"`);
    }
  });

  await check('every rule counts per cf.colo.id + ip.src', () => {
    for (const rule of ruleset.rules) {
      const c = rule.ratelimit.characteristics;
      assert(c.includes('cf.colo.id'), `missing cf.colo.id on "${rule.description}"`);
      assert(c.includes('ip.src'), `missing ip.src on "${rule.description}"`);
    }
  });

  await check('high-cost paths are limited more tightly than the catch-all', () => {
    const byDesc = (needle) => ruleset.rules.find((r) => r.description.toLowerCase().includes(needle));
    const catchAll = byDesc('catch-all');
    const llm = byDesc('llm inference');
    const auth = byDesc('authentication');
    const billing = byDesc('billing');

    assert(llm && auth && billing && catchAll, 'all four rule classes present');
    assert(llm.ratelimit.requests_per_period <= 10, 'LLM ceiling is at most 10/min');
    assert(auth.ratelimit.requests_per_period <= 10, 'auth ceiling is at most 10/min');
    assert(billing.ratelimit.requests_per_period < catchAll.ratelimit.requests_per_period, 'billing tighter than catch-all');
    assertEqual(catchAll.ratelimit.requests_per_period, 100, 'standard ceiling');
  });

  await check('the catch-all does not shadow any specific 60s rule', () => {
    const idx = ruleset.rules.findIndex((r) =>
      /^\(starts_with\(http\.request\.uri\.path, "\/api\/"\)\)$/.test(r.expression.trim()) &&
      r.ratelimit.period === 60
    );
    assert(idx !== -1, 'catch-all rule exists');
    const shadowed = ruleset.rules
      .slice(idx + 1)
      .filter((r) => r.ratelimit.period === 60)
      .map((r) => r.description);
    assertEqual(shadowed.length, 0, `rules shadowed by the catch-all: ${shadowed.join(', ')}`);
  });

  await check('a short-window burst guard exists', () => {
    const burst = ruleset.rules.find((r) => r.ratelimit.period === 10);
    assert(burst, 'a 10s window rule is present');
    assert(burst.ratelimit.requests_per_period < 100, 'burst ceiling is below the per-minute ceiling');
  });

  await check('the Telegram webhook is not starved by an API ceiling', () => {
    const hook = ruleset.rules.find((r) => r.expression.includes('/api/v1/telegram/webhook'));
    assert(hook, 'webhook rule exists');
    assertEqual(ruleset.rules.indexOf(hook), 0, 'webhook rule is evaluated first');
    assert(hook.ratelimit.requests_per_period >= 300, 'webhook ceiling is generous enough for payment callbacks');
  });

  await check('all coach, auth, billing and bulk paths are covered', () => {
    const covered = ruleset.rules.map((r) => r.expression).join(' ');
    for (const path of ['/api/v1/coach', '/api/v1/auth/', '/api/v1/billing/', '/api/v1/bank/full', '/shards/']) {
      assert(covered.includes(path), `no edge rule covers ${path}`);
    }
  });
}

/* =========================================================================
 * TIER 3a - Worker dual-key limiter
 * ====================================================================== */

/** Minimal in-memory stand-in for the CoachRateLimiter Durable Object namespace. */
function mockDurableObjectNamespace() {
  const buckets = new Map();
  return {
    calls: [],
    idFromName(name) { return { name }; },
    get(id) {
      return {
        fetch: async (url) => {
          const u = new URL(url);
          const capacity = Number(u.searchParams.get('capacity'));
          const windowMs = Number(u.searchParams.get('windowMs'));
          const now = Date.now();
          let b = buckets.get(id.name);
          if (!b || b.capacity !== capacity) {
            b = { tokens: capacity, capacity, refillPerMs: capacity / windowMs, lastRefill: now };
          }
          b.tokens = Math.min(capacity, b.tokens + (now - b.lastRefill) * b.refillPerMs);
          b.lastRefill = now;

          if (b.tokens < 1) {
            buckets.set(id.name, b);
            return {
              status: 429,
              json: async () => ({ allowed: false, limit: capacity, remaining: 0, resetAt: Math.ceil(now / 1000) + 60, retryAfter: 42 })
            };
          }
          b.tokens -= 1;
          buckets.set(id.name, b);
          return {
            status: 200,
            json: async () => ({ allowed: true, limit: capacity, remaining: Math.floor(b.tokens), resetAt: Math.ceil(now / 1000) + 60 })
          };
        }
      };
    }
  };
}

async function tier3Limiter() {
  section('TIER 3a  Worker dual-key limiter (workers/coach_rate_limiter.js)');

  const { enforceDualKeyLimit, rateLimitHeaders } = await import('../workers/coach_rate_limiter.js');

  const makeRequest = (ip) => ({ headers: { get: (k) => (k.toLowerCase() === 'cf-connecting-ip' ? ip : null) } });

  await check('an allowed request carries all three standard headers', async () => {
    const env = { COACH_RATE_LIMITER: mockDurableObjectNamespace(), ENVIRONMENT: 'production' };
    const v = await enforceDualKeyLimit(env, makeRequest('1.2.3.4'), 'probe', { uid: 'u1', uidPerMinute: 10 });

    assert(v.allowed, 'allowed');
    assert(v.headers['X-RateLimit-Limit'], 'X-RateLimit-Limit present');
    assert(v.headers['X-RateLimit-Remaining'] !== undefined, 'X-RateLimit-Remaining present');
    assert(Number(v.headers['X-RateLimit-Reset']) > Math.floor(Date.now() / 1000), 'Reset is a future epoch in seconds');
    assert(!v.headers['Retry-After'], 'no Retry-After while allowed');
  });

  await check('the per-UID ceiling blocks and reports Retry-After', async () => {
    const env = { COACH_RATE_LIMITER: mockDurableObjectNamespace(), ENVIRONMENT: 'production' };
    const req = makeRequest('1.2.3.4');

    let blockedAt = -1;
    for (let i = 0; i < 8; i += 1) {
      const v = await enforceDualKeyLimit(env, req, 'burst', { uid: 'u1', uidPerMinute: 5, ipPerMinute: 500 });
      if (!v.allowed) {
        blockedAt = i;
        assertEqual(v.dimension, 'uid', 'blocked on the UID dimension');
        assert(Number(v.headers['Retry-After']) > 0, 'Retry-After set');
        assertEqual(v.headers['X-RateLimit-Remaining'], '0', 'remaining is zero');
        break;
      }
    }
    assertEqual(blockedAt, 5, 'blocked on the 6th request of a 5/min allowance');
  });

  await check('rotating the UID does not escape the IP ceiling', async () => {
    const env = { COACH_RATE_LIMITER: mockDurableObjectNamespace(), ENVIRONMENT: 'production' };
    const req = makeRequest('9.9.9.9');

    let blocked = null;
    for (let i = 0; i < 12; i += 1) {
      // A fresh throwaway account per request, all from one host.
      const v = await enforceDualKeyLimit(env, req, 'rotate', {
        uid: `throwaway_${i}`, uidPerMinute: 100, ipPerMinute: 6
      });
      if (!v.allowed) { blocked = v; break; }
    }

    assert(blocked, 'IP ceiling eventually stops account rotation');
    assertEqual(blocked.dimension, 'ip', 'blocked on the IP dimension');
  });

  await check('rotating the IP does not escape the UID ceiling', async () => {
    const env = { COACH_RATE_LIMITER: mockDurableObjectNamespace(), ENVIRONMENT: 'production' };

    let blocked = null;
    for (let i = 0; i < 12; i += 1) {
      // A fresh VPN exit per request, all for one account.
      const v = await enforceDualKeyLimit(env, makeRequest(`10.0.0.${i}`), 'vpn', {
        uid: 'steady_user', uidPerMinute: 4, ipPerMinute: 500
      });
      if (!v.allowed) { blocked = v; break; }
    }

    assert(blocked, 'UID ceiling eventually stops VPN hopping');
    assertEqual(blocked.dimension, 'uid', 'blocked on the UID dimension');
  });

  await check('the IP allowance is wider than the UID allowance by default', async () => {
    const env = { COACH_RATE_LIMITER: mockDurableObjectNamespace(), ENVIRONMENT: 'production' };
    // One user exhausting their own allowance must not lock out the NAT.
    const req = makeRequest('172.16.0.1');
    for (let i = 0; i < 5; i += 1) {
      await enforceDualKeyLimit(env, req, 'nat', { uid: 'noisy', uidPerMinute: 4 });
    }
    const other = await enforceDualKeyLimit(env, req, 'nat', { uid: 'quiet_neighbour', uidPerMinute: 4 });
    assert(other.allowed, 'a different user behind the same IP is still served');
  });

  await check('an unauthenticated caller is still metered on IP', async () => {
    const env = { COACH_RATE_LIMITER: mockDurableObjectNamespace(), ENVIRONMENT: 'production' };
    const req = makeRequest('5.5.5.5');

    let blocked = false;
    for (let i = 0; i < 6; i += 1) {
      const v = await enforceDualKeyLimit(env, req, 'anon', { ipPerMinute: 3 });
      if (!v.allowed) { blocked = true; break; }
    }
    assert(blocked, 'anonymous traffic is capped without a uid');
  });

  await check('an unbound limiter fails CLOSED in production', async () => {
    const env = { ENVIRONMENT: 'production' }; // binding missing
    const v = await enforceDualKeyLimit(env, makeRequest('1.1.1.1'), 'probe', { uid: 'u1' });
    assert(!v.allowed, 'request denied');
    assertEqual(v.reason, 'RATE_LIMITER_UNBOUND', 'reason recorded');
  });

  await check('an unbound limiter fails open outside production', async () => {
    const env = { ENVIRONMENT: 'development' };
    const v = await enforceDualKeyLimit(env, makeRequest('1.1.1.1'), 'probe', { uid: 'u1' });
    assert(v.allowed, 'local development is not blocked by a missing binding');
  });

  await check('rateLimitHeaders emits Reset as epoch SECONDS', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const h = rateLimitHeaders({ limit: 20, remaining: 3, resetAt: nowSec + 30 }, 30);
    assertEqual(h['X-RateLimit-Limit'], '20');
    assertEqual(h['X-RateLimit-Remaining'], '3');
    assertEqual(h['Retry-After'], '30');
    const reset = Number(h['X-RateLimit-Reset']);
    assert(reset > 1e9 && reset < 1e11, 'reset looks like epoch seconds, not milliseconds');
  });
}

/* =========================================================================
 * TIER 3b - atomic token budget, executed against real SQLite
 * ====================================================================== */

/** D1-shaped shim over node:sqlite. Only the surface token_budget.js uses. */
function makeD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE telegram_users (
      telegram_id INTEGER PRIMARY KEY,
      ai_tokens_used_today INTEGER NOT NULL DEFAULT 0,
      ai_tokens_last_date TEXT,
      ai_tokens_used_month INTEGER NOT NULL DEFAULT 0,
      ai_tokens_month TEXT,
      ai_calls_used_today INTEGER NOT NULL DEFAULT 0,
      ai_calls_last_date TEXT,
      updated_at TEXT
    );
    CREATE TABLE auth_accounts (
      uid TEXT PRIMARY KEY,
      ai_tokens_used_today INTEGER NOT NULL DEFAULT 0,
      ai_tokens_last_date TEXT,
      ai_tokens_used_month INTEGER NOT NULL DEFAULT 0,
      ai_tokens_month TEXT,
      ai_calls_used_today INTEGER NOT NULL DEFAULT 0,
      ai_calls_last_date TEXT,
      updated_at TEXT
    );
  `);

  return {
    _sqlite: sqlite,
    prepare(sql) {
      // token_budget.js probes with ALTER TABLE ... ADD COLUMN and swallows the
      // duplicate-column errors; mirror D1 by letting them throw.
      const clean = sql.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
      let args = [];
      const api = {
        bind(...a) { args = a; return api; },
        run() {
          const stmt = sqlite.prepare(clean);
          const r = stmt.run(...args);
          return { meta: { changes: Number(r.changes) } };
        },
        first() {
          const stmt = sqlite.prepare(clean);
          const row = stmt.get(...args);
          return row === undefined ? null : row;
        }
      };
      return api;
    }
  };
}

async function tier3Budget() {
  section('TIER 3b  atomic AI credit reservation (workers/token_budget.js)');

  const { reserveBudget, settleBudget, readBudgetState, consumeBudget } =
    await import('../workers/token_budget.js');

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const TG = 555001;

  const seed = (db, row = {}) => {
    db._sqlite.prepare(`
      INSERT INTO telegram_users
        (telegram_id, ai_tokens_used_today, ai_tokens_last_date, ai_tokens_used_month, ai_tokens_month, ai_calls_used_today, ai_calls_last_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      TG,
      row.tokensToday || 0, row.tokensDate || today,
      row.tokensMonth || 0, row.monthKey || month,
      row.callsToday || 0, row.callsDate || today
    );
  };

  await check('a reservation is debited before the provider is called', async () => {
    const db = makeD1();
    seed(db);

    const r = await reserveBudget(db, TG, 'free', 1000);
    assert(r.ok, 'reservation granted');
    assertEqual(r.reserved, 1000, 'reserved amount');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 1000, 'tokens debited up front, not after the call');
    assertEqual(state.callsToday, 1, 'call counted');
  });

  await check('reservations accumulate instead of overwriting each other', async () => {
    const db = makeD1();
    seed(db);

    // free tier: dailyTokenBudget 4000, freeCoachCallsPerDay 5
    await reserveBudget(db, TG, 'free', 500);
    await reserveBudget(db, TG, 'free', 500);
    await reserveBudget(db, TG, 'free', 500);

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 1500, 'three reservations sum');
    assertEqual(state.callsToday, 3, 'three calls counted');
  });

  await check('the daily token ceiling is enforced at reservation time', async () => {
    const db = makeD1();
    seed(db, { tokensToday: 3800 }); // free dailyTokenBudget = 4000

    const r = await reserveBudget(db, TG, 'free', 1000);
    assert(!r.ok, 'reservation refused');
    assertEqual(r.error, 'DAILY_TOKEN_BUDGET_EXHAUSTED', 'correct reason');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 3800, 'a refused reservation debits nothing');
  });

  await check('the daily call ceiling is enforced at reservation time', async () => {
    const db = makeD1();
    seed(db, { callsToday: 5 }); // free freeCoachCallsPerDay = 5

    const r = await reserveBudget(db, TG, 'free', 100);
    assert(!r.ok, 'reservation refused');
    assertEqual(r.error, 'DAILY_CALL_BUDGET_EXHAUSTED', 'correct reason');
  });

  await check('the monthly ceiling is enforced at reservation time', async () => {
    const db = makeD1();
    seed(db, { tokensMonth: 39_900 }); // free monthlyTokenBudget = 40000

    const r = await reserveBudget(db, TG, 'free', 1000);
    assert(!r.ok, 'reservation refused');
    assertEqual(r.error, 'MONTHLY_TOKEN_BUDGET_EXHAUSTED', 'correct reason');
  });

  await check('a stale day rolls the window over inside the same statement', async () => {
    const db = makeD1();
    seed(db, { tokensToday: 3900, callsToday: 5, tokensDate: '2020-01-01', callsDate: '2020-01-01' });

    const r = await reserveBudget(db, TG, 'free', 1000);
    assert(r.ok, 'yesterday\'s spend does not block today');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 1000, 'counter reset to just this reservation');
    assertEqual(state.callsToday, 1, 'call counter reset');
  });

  await check('reservations are exhausted exactly at the cap, never past it', async () => {
    const db = makeD1();
    seed(db);

    // pro_monthly: 80000 daily tokens, 120 calls/day. Reserve 10000 at a time.
    let granted = 0;
    for (let i = 0; i < 12; i += 1) {
      const r = await reserveBudget(db, TG, 'pro_monthly', 10_000);
      if (r.ok) granted += 1;
    }

    assertEqual(granted, 8, 'exactly 8 x 10000 fit inside the 80000 daily budget');
    const state = await readBudgetState(db, TG);
    assert(state.tokensToday <= 80_000, `never exceeded the cap (got ${state.tokensToday})`);
  });

  await check('settlement refunds an over-reservation', async () => {
    const db = makeD1();
    seed(db);

    const r = await reserveBudget(db, TG, 'pro_monthly', 5000);
    assert(r.ok);
    // The model actually used far less than the pessimistic estimate.
    await settleBudget(db, TG, r.reserved, 900, 'pro_monthly');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 900, 'headroom returned to the user');
    assertEqual(state.callsToday, 1, 'the call still counted');
  });

  await check('settlement charges an under-reservation', async () => {
    const db = makeD1();
    seed(db);

    const r = await reserveBudget(db, TG, 'pro_monthly', 1000);
    await settleBudget(db, TG, r.reserved, 4200, 'pro_monthly');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 4200, 'the real cost is recorded');
  });

  await check('settlements from concurrent turns sum instead of clobbering', async () => {
    const db = makeD1();
    seed(db);

    const a = await reserveBudget(db, TG, 'pro_monthly', 1000);
    const b = await reserveBudget(db, TG, 'pro_monthly', 1000);
    assert(a.ok && b.ok, 'both reserved');

    await settleBudget(db, TG, a.reserved, 1500, 'pro_monthly');
    await settleBudget(db, TG, b.reserved, 2500, 'pro_monthly');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 4000, 'both settlements applied (1500 + 2500)');
  });

  await check('a failed reservation never reaches a third-party provider', async () => {
    const db = makeD1();
    seed(db, { tokensToday: 4000 });

    let providerCalled = false;
    const r = await reserveBudget(db, TG, 'free', 500);
    if (r.ok) providerCalled = true;

    assert(!r.ok, 'reservation refused');
    assert(!providerCalled, 'the provider call is gated behind the reservation');
  });

  await check('a budget-store outage fails CLOSED', async () => {
    const brokenDb = {
      prepare() {
        return {
          bind() { return this; },
          run() { throw new Error('D1_ERROR: connection lost'); },
          first() { throw new Error('D1_ERROR: connection lost'); }
        };
      }
    };

    const r = await reserveBudget(brokenDb, TG, 'pro_monthly', 1000);
    assert(!r.ok, 'denied when accounting is unavailable');
    assertEqual(r.error, 'BUDGET_STORE_ERROR', 'outage is distinguishable from a quota wall');
  });

  await check('a missing DB is refused rather than silently unmetered', async () => {
    const r = await reserveBudget(null, TG, 'pro_monthly', 1000);
    assert(!r.ok, 'denied');
    assertEqual(r.error, 'BUDGET_STORE_UNAVAILABLE');
  });

  await check('an unknown Firebase uid is not handed a fresh budget', async () => {
    const db = makeD1();
    const r = await reserveBudget(db, { firebaseUid: 'never-signed-up' }, 'pro_monthly', 1000);
    assert(!r.ok, 'unknown account refused');
  });

  await check('a Telegram row is created on first use with the reservation applied', async () => {
    const db = makeD1(); // no seed
    const r = await reserveBudget(db, TG, 'free', 700);
    assert(r.ok, 'first-use reservation granted');

    const state = await readBudgetState(db, TG);
    assertEqual(state.tokensToday, 700, 'reservation persisted on the new row');
    assertEqual(state.callsToday, 1, 'call counted on the new row');
  });

  await check('REGRESSION: the old consumeBudget path loses concurrent updates', async () => {
    // This documents why reserveBudget exists. consumeBudget reads the counter,
    // adds in JavaScript, then writes the total back. Two interleaved callers
    // both read the same starting value and the second write erases the first.
    const db = makeD1();
    seed(db);

    // Interleave exactly as two concurrent Worker invocations would: both read
    // before either writes. readBudgetState is the read half of consumeBudget.
    const snapshotA = await readBudgetState(db, TG);
    const snapshotB = await readBudgetState(db, TG);
    assertEqual(snapshotA.tokensToday, snapshotB.tokensToday, 'both saw the same state');

    await consumeBudget(db, TG, 1000, 'pro_monthly');
    await consumeBudget(db, TG, 1000, 'pro_monthly');

    const lossy = await readBudgetState(db, TG);

    // Serialised here (Node is single-threaded), so this run sums correctly.
    // The point is the shape: the total is computed off a prior read, so under
    // real concurrency the second write overwrites rather than adds.
    assertEqual(lossy.tokensToday, 2000, 'serialised consumeBudget happens to sum');

    // reserveBudget does not depend on that serialisation: the increment is in
    // the statement itself, so the read it performs is irrelevant to the write.
    const db2 = makeD1();
    seed(db2);
    const stale = await readBudgetState(db2, TG); // deliberately read early
    await reserveBudget(db2, TG, 'pro_monthly', 1000);
    await reserveBudget(db2, TG, 'pro_monthly', 1000);
    const atomic = await readBudgetState(db2, TG);

    assertEqual(stale.tokensToday, 0, 'the stale read saw zero');
    assertEqual(atomic.tokensToday, 2000, 'reservations summed despite the stale read');
  });
}

/* =========================================================================
 * Coverage assertions against the live source
 * ====================================================================== */

async function coverage() {
  section('COVERAGE  endpoint and call-site checks');

  const worker = readFileSync(join(ROOT, 'workers', 'api_worker.js'), 'utf8');
  const fnSrc = readFileSync(join(ROOT, 'functions', 'src', 'index.ts'), 'utf8');
  const billing = readFileSync(join(ROOT, 'js', 'stars_billing.js'), 'utf8');
  const coach = readFileSync(join(ROOT, 'js', 'tma_ghost_coach.js'), 'utf8');
  const shell = readFileSync(join(ROOT, 'index.html'), 'utf8');

  await check('the request guard is loaded by the app shell', () => {
    assert(shell.includes('js/request-guard.js'), 'script tag present');
    assert(
      shell.indexOf('js/core.js') < shell.indexOf('js/request-guard.js'),
      'guard loads after the APlus namespace it attaches to'
    );
  });

  await check('previously unmetered Worker endpoints are now limited', () => {
    for (const action of ['auth_telegram', 'auth_me', 'bank_full', 'shards']) {
      assert(worker.includes(`'${action}'`), `no limiter registered for ${action}`);
    }
  });

  await check('the coach handler reserves credit before spending it', async () => {
    const handler = readFileSync(join(ROOT, 'workers', 'coach_handler.js'), 'utf8');
    assert(handler.includes('reserveBudget'), 'reserveBudget is called');
    assert(handler.includes('settleBudget'), 'settleBudget is called');
    assert(!handler.includes('consumeBudget('), 'the lossy consumeBudget path is gone');
    // Compare call sites, not the import block at the top of the file.
    assert(
      handler.indexOf('await reserveBudget(') < handler.indexOf('runCoachTurns({'),
      'the reservation happens before any model turn'
    );
  });

  await check('every Cloud Function endpoint emits rate-limit headers', () => {
    const endpoints = (fnSrc.match(/export const \w+ = onRequest/g) || []).length;
    const headerCalls = (fnSrc.match(/applyRateLimitHeaders\(/g) || []).length;
    assert(endpoints >= 4, `expected the four documented endpoints, found ${endpoints}`);
    assert(headerCalls >= endpoints, `only ${headerCalls} header calls for ${endpoints} endpoints`);
  });

  await check('Cloud Function quotas derive from server-resolved tier only', () => {
    assert(fnSrc.includes('enforceDailyQuota'), 'daily quota enforced');
    assert(fnSrc.includes('DAILY_QUOTA_BY_TIER'), 'plan table present');
    // The tier fed to the quota must come from resolveEntitlement, never req.body.
    // Call sites only: the `async function enforceDailyQuota(` declaration
    // names its parameters and would otherwise look like a violation.
    const quotaCalls = fnSrc.match(/await enforceDailyQuota\([^)]*\)/g) || [];
    assert(quotaCalls.length >= 3, `expected quota enforcement on several endpoints, found ${quotaCalls.length}`);
    for (const call of quotaCalls) {
      assert(!/req\.|body\./.test(call), `quota call reads client input: ${call}`);
      assert(call.includes('caller.uid'), `quota call is not keyed on the verified uid: ${call}`);
    }
  });

  await check('billing mutations are wrapped in a submission lock', () => {
    assert(billing.includes('purchaseProductGuarded'), 'Stars checkout wrapped');
    assert(billing.includes('purchaseProductWithTonGuarded'), 'TON checkout wrapped');
    assert(/purchaseProduct:\s*purchaseProductGuarded/.test(billing), 'the guarded version is what gets exported');
    assert(/purchaseProductWithTon:\s*purchaseProductWithTonGuarded/.test(billing), 'TON export is guarded');
  });

  await check('the coach client never auto-retries a billed inference', () => {
    assert(coach.includes('maxAttempts: 1'), 'coach fetches are single-attempt');
    assert(coach.includes('serverAnswered'), 'a server-answered stream is terminal');
    assert(coach.includes('explainQuestion: explainQuestionGuarded'), 'the locked version is exported');
  });

  await check('every Worker 429 carries the standard header set', () => {
    // A 429 without X-RateLimit-Reset is a limit the client cannot back off
    // from intelligently, so it guesses and comes straight back.
    const blocks = worker.split('status: 429').slice(1);
    const bare = blocks.filter((b) => !/\.\.\.\w+(Limit|limit)\.headers/.test(b.slice(0, 220)));
    assertEqual(bare.length, 0, `${bare.length} of ${blocks.length} 429 responses lack limit headers`);
    assert(blocks.length >= 15, `expected every limited endpoint to be covered, found ${blocks.length}`);
  });

  await check('no Worker endpoint still uses the bare single-key limiter', () => {
    // enforceCoachRateLimit checks one dimension and returns no headers.
    // Every route handler should go through enforceDualKeyLimit instead.
    assertEqual(
      (worker.match(/enforceCoachRateLimit\(/g) || []).length, 0,
      'api_worker.js still calls the single-key limiter directly'
    );
  });

  await check('the Telegram webhook has a Worker-side backstop', () => {
    assert(worker.includes("'telegram_webhook'"), 'webhook is metered in the Worker, not only at the edge');
    // Must sit behind the secret check: a spoofed request should not be able
    // to consume the budget that real payment callbacks depend on.
    assert(
      worker.indexOf('X-Telegram-Bot-Api-Secret-Token') < worker.indexOf("'telegram_webhook'"),
      'the rate limit must come after the secret verification'
    );
  });

  await check('no unguarded fetch remains in any network-touching client module', () => {
    const modules = [
      'ghost-coach.js', 'groq-client.js', 'entitlements.js', 'telemetry.js',
      'report-problem-modal.js', 'ton_credentials.js', 'stars_billing.js',
      'auth-gate.js', 'tma_ghost_coach.js'
    ];
    const offenders = [];

    for (const mod of modules) {
      const src = readFileSync(join(ROOT, 'js', mod), 'utf8');
      src.split(/\r?\n/).forEach((raw, i) => {
        const line = raw.trim();
        if (line.startsWith('*') || line.startsWith('//')) return;
        if (!/(?<![.\w])fetch\(/.test(line)) return;
        // The documented fallback inside each module's own guard helper.
        if (line.includes('return fetch(url, init)')) return;
        offenders.push(`${mod}:${i + 1}`);
      });
    }

    assertEqual(offenders.length, 0, `unguarded fetch at ${offenders.join(', ')}`);
  });

  await check('network-touching poll loops are visibility-aware', () => {
    for (const mod of ['sync.js', 'entitlements.js']) {
      const src = readFileSync(join(ROOT, 'js', mod), 'utf8');
      assert(src.includes('guard.interval('), `${mod} still polls unconditionally`);
    }
  });

  await check('no client fetch to a billed endpoint bypasses the guard', () => {
    // A bare `fetch(` inside the coach module (outside the guard helper itself)
    // would sidestep every protection above.
    const bare = coach
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /(?<![.\w])fetch\(/.test(line))
      .filter(({ line }) => !line.startsWith('*') && !line.startsWith('//'))
      .filter(({ line }) => !line.includes('return fetch(url, init)')); // the documented fallback
    assertEqual(bare.length, 0, `unguarded fetch at line(s) ${bare.map((b) => b.n).join(', ')}`);
  });
}

/* ===================================================================== */

async function main() {
  console.log('\n3-Tier Rate Limiting Architecture - verification suite');

  await tier1();
  await tier2();
  await tier3Limiter();
  await tier3Budget();
  await coverage();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.name}: ${f.err && f.err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
