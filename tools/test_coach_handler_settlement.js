#!/usr/bin/env node
/**
 * tools/test_coach_handler_settlement.js
 *
 * Runs handleCoachRequest end to end against real SQLite (workers/schema.sql +
 * migrations) with stub providers, and checks the budget is settled to actual
 * usage on every exit: success, provider failure, a thrown error, a dropped
 * stream, and a shared explain-cache hit.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleCoachRequest } from '../workers/coach_handler.js';

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}: ${err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function makeDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('workers/schema.sql', 'utf8'));
  for (const m of ['0003_apx_economy.sql', '0004_ai_explain_cache.sql']) {
    sqlite.exec(readFileSync('migrations/' + m, 'utf8'));
  }
  const db = {
    _sqlite: sqlite,
    prepare(sql) {
      const clean = sql.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
      let args = [];
      const api = {
        bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return api; },
        run() { return { meta: { changes: Number(sqlite.prepare(clean).run(...args).changes) } }; },
        first() { const r = sqlite.prepare(clean).get(...args); return r === undefined ? null : r; },
        all() { return { results: sqlite.prepare(clean).all(...args) }; }
      };
      return api;
    },
    batch(stmts) { return Promise.all(stmts.map((s) => s.run())); }
  };
  return db;
}

const TG = 424242;
function seedUser(db) {
  const cols = db._sqlite.prepare('PRAGMA table_info(telegram_users)').all().map((c) => c.name);
  const row = { telegram_id: TG };
  if (cols.includes('tier')) row.tier = 'pro_monthly';
  const keys = Object.keys(row);
  db._sqlite.prepare(`INSERT INTO telegram_users (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...keys.map((k) => row[k]));
}
function tokensToday(db) {
  const r = db._sqlite.prepare('SELECT ai_tokens_used_today AS t, ai_calls_used_today AS c FROM telegram_users WHERE telegram_id = ?').get(TG);
  return { tokens: Number(r && r.t) || 0, calls: Number(r && r.c) || 0 };
}

const QUESTION = {
  intent: 'explain',
  tools: ['lookup_objective'],
  questionId: 'C1-001',
  question: 'Which tool measures AC line voltage?',
  options: ['Multimeter', 'Loopback plug', 'Tone generator', 'Cable tester'],
  correctAnswer: 'Multimeter',
  chosenAnswer: 'Cable tester',
  objective: '1201-5.2',
  provider: 'groq'
};

function call(db, { executor, stream = false, env = {}, body = QUESTION, ctx = null }) {
  return handleCoachRequest({
    request: new Request('https://test.local/api/v1/coach', { method: 'POST' }),
    env: { DB: db, ...env },
    ctx,
    body: { ...body },
    corsHeaders: {},
    stream,
    auth: { telegramId: TG, firebaseUid: null },
    entitlement: { tier: 'pro_monthly', proPreviewTokensRemaining: 0, freeUsedToday: 0 },
    providerExecutors: { groq: executor }
  });
}

const okExecutor = (text = 'Multimeter is the correct answer. A cable tester only checks continuity.') =>
  async () => ({ text, provider: 'groq', model: 'llama-3.1-8b-instant', raw: { usage: { total_tokens: 300 } } });

await check('a successful call is billed actual usage, not the reservation', async () => {
  const db = makeDb();
  seedUser(db);
  const res = await call(db, { executor: okExecutor() });
  const body = await res.json();
  assert(res.status === 200, 'status ' + res.status + ' ' + JSON.stringify(body).slice(0, 200));
  const t = tokensToday(db);
  assert(t.tokens === 300, 'tokens charged ' + t.tokens);
  assert(t.calls === 1, 'calls ' + t.calls);
});

await check('a provider outage refunds the whole reservation', async () => {
  const db = makeDb();
  seedUser(db);
  const res = await call(db, { executor: async () => { throw new Error('upstream 500'); } });
  await res.json();
  const t = tokensToday(db);
  assert(t.tokens === 0, 'tokens charged after outage ' + t.tokens);
});

await check('an error thrown after the reservation still settles it', async () => {
  const db = makeDb();
  seedUser(db);
  let threw = false;
  try {
    await handleCoachRequest({
      request: new Request('https://test.local/api/v1/coach', { method: 'POST' }),
      env: { DB: db },
      body: { ...QUESTION, provider: 'nvidia', useProPreview: true },
      corsHeaders: {},
      auth: { telegramId: TG, firebaseUid: null },
      entitlement: { tier: 'free', proPreviewTokensRemaining: 3, freeUsedToday: 0 },
      providerExecutors: {
        nvidia: okExecutor(),
        groq: okExecutor(),
        decrementProPreviewTokens: async () => { throw new Error('D1_ERROR: preview counter write failed'); }
      }
    });
  } catch (_) {
    threw = true;
  }
  assert(threw, 'the failure still surfaces to the caller');
  const t = tokensToday(db);
  assert(t.tokens === 0, `reservation left charged: ${t.tokens}`);
});

await check('a stream the client abandons is still settled and logged', async () => {
  const db = makeDb();
  seedUser(db);
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const env = { AI_EXPLAIN_CACHE: '0' };
  const res = await handleCoachRequest({
    request: new Request('https://test.local/api/v1/coach/stream', { method: 'POST' }),
    env: { DB: db, ...env },
    ctx,
    body: { ...QUESTION, stream: true },
    corsHeaders: {},
    stream: true,
    auth: { telegramId: TG, firebaseUid: null },
    entitlement: { tier: 'pro_monthly', proPreviewTokensRemaining: 0, freeUsedToday: 0 },
    providerExecutors: {
      groq: async (...a) => {
        await new Promise((r) => setTimeout(r, 30));
        return okExecutor()(...a);
      }
    }
  });
  assert(res.status === 200, 'status ' + res.status);
  const reader = res.body.getReader();
  await reader.read();
  await reader.cancel('client went away');
  assert(pending.length === 1, 'background task registered with waitUntil');
  await Promise.allSettled(pending);
  const t = tokensToday(db);
  assert(t.tokens === 300, 'stream settled to actual usage, got ' + t.tokens);
  const logged = db._sqlite.prepare('SELECT COUNT(*) AS n, SUM(tokens_used) AS t FROM ai_usage_log').get();
  assert(Number(logged.n) >= 1 && Number(logged.t) === 300, 'usage logged ' + JSON.stringify(logged));
});

await check('a reply built with learner memory is never written to the shared cache', async () => {
  const db = makeDb();
  seedUser(db);
  const env = { AI_EXPLAIN_CACHE: '1' };
  await (await call(db, { executor: okExecutor(), env })).json();
  db._sqlite.exec('DELETE FROM ai_explain_cache');
  const second = await (await call(db, { executor: okExecutor(), env })).json();
  const rows = db._sqlite.prepare('SELECT COUNT(*) AS n FROM ai_explain_cache').get();
  assert(second.bootPack && second.bootPack.chars > 0, 'second call used a memory boot pack: ' + JSON.stringify(second.bootPack));
  assert(Number(rows.n) === 0, 'personal reply stored: ' + rows.n);
});

await check('the shared explain cache serves a returning learner for 0 tokens', async () => {
  const db = makeDb();
  seedUser(db);
  const env = { AI_EXPLAIN_CACHE: '1' };
  let calls = 0;
  const executor = async (...a) => {
    calls += 1;
    return okExecutor()(...a);
  };
  const first = await call(db, { executor, env });
  assert(first.status === 200, 'first ' + first.status);
  await first.json();
  const before = tokensToday(db);
  const second = await call(db, { executor, env, body: { ...QUESTION, options: [...QUESTION.options].reverse(), prompt: 'different shuffle' } });
  const body = await second.json();
  assert(second.status === 200, 'second ' + second.status);
  assert(calls === 1, 'provider called again on a cache hit: ' + calls);
  const after = tokensToday(db);
  assert(after.tokens === before.tokens, `cache hit cost tokens (${before.tokens} -> ${after.tokens})`);
  assert(after.calls === before.calls + 1, 'cache hit still counts a call');
  assert(String(body.text || '').includes('Multimeter'), 'served cached text');
  const hit = db._sqlite.prepare('SELECT COUNT(*) AS n FROM ai_usage_log WHERE cache_hit = 1').get();
  assert(Number(hit.n) === 1, 'cache hit logged');
});

await check('with the cache flag off, the second learner reaches the model', async () => {
  const db = makeDb();
  seedUser(db);
  let calls = 0;
  const executor = async (...a) => {
    calls += 1;
    return okExecutor()(...a);
  };
  await (await call(db, { executor, env: { AI_EXPLAIN_CACHE: '0' } })).json();
  await (await call(db, { executor, env: { AI_EXPLAIN_CACHE: '0' } })).json();
  assert(calls === 2, 'calls ' + calls);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
