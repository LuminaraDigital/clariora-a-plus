#!/usr/bin/env node
/**
 * tools/test_ai_production_guards.js
 * Unit coverage for tier policy, triage/tools, circuit breaker, budgets, jobs.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

async function load(rel) {
  return import(pathToFileURL(path.join(ROOT, rel)).href);
}

async function main() {
  console.log('====================================================');
  console.log('TESTING AI PRODUCTION GUARDS (policy/triage/circuit/jobs)');
  console.log('====================================================\n');

  const policy = await load('workers/tier_policy.js');
  assert.strictEqual(policy.normalizeTier('pro'), 'pro_monthly');
  assert.strictEqual(policy.getTierPolicy('free').maxTurns, 1);
  assert.strictEqual(policy.getTierPolicy('lifetime').maxTurns, 5);
  assert.ok(policy.getTierPolicy('pro_monthly').dailyTokenBudget < Infinity);
  assert.ok(!policy.allowProvider('free', 'nvidia'));
  assert.ok(policy.allowProvider('pro_monthly', 'nvidia'));
  assert.strictEqual(policy.allowIntent('free', 'war_room'), 'explain');
  assert.strictEqual(policy.allowIntent('lifetime', 'war_room'), 'war_room');
  assert.deepStrictEqual(policy.FREE_SURFACE.payRails, ['telegram_stars', 'ton_onchain']);
  console.log('1. Tier policy ✔');

  const orch = await load('workers/coach_orchestrator.js');
  const triage = orch.triageRequest({ intent: 'pbq', question: 'Configure a firewall PBQ' }, 'pro_monthly');
  assert.strictEqual(triage.intent, 'pbq');
  assert.ok(triage.maxTurns <= 4);
  const tools = orch.runAllowlistedTools('free', ['lookup_objective', 'build_raid_set'], { objective: '1101-2.2' });
  assert.strictEqual(tools.length, 1);
  assert.strictEqual(tools[0].name, 'lookup_objective');
  const proTools = orch.runAllowlistedTools('pro_monthly', ['build_raid_set'], { weakDomains: ['networking'] });
  assert.strictEqual(proTools[0].name, 'build_raid_set');
  console.log('2. Triage + tools ✔');

  const circuit = await load('workers/circuit_breaker.js');
  const mem = { rows: new Map() };
  const fakeDb = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes('FROM provider_circuit_state')) return mem.rows.get(params[0]) || null;
              return null;
            },
            async run() {
              if (sql.includes('CREATE TABLE')) return { success: true };
              if (sql.includes('INSERT INTO provider_circuit_state')) {
                const provider = params[0];
                const prev = mem.rows.get(provider) || {};
                mem.rows.set(provider, {
                  provider,
                  state: params[1],
                  failure_count: params[2],
                  success_count: prev.success_count || 0,
                  opened_at: params[3],
                  next_attempt_at: params[4],
                  last_error: params[5]
                });
              }
              return { success: true };
            },
            async all() {
              return { results: Array.from(mem.rows.values()) };
            }
          };
        }
      };
    }
  };

  for (let i = 0; i < 5; i += 1) {
    await circuit.recordProviderFailure(fakeDb, 'groq', 'boom');
  }
  const gate = await circuit.canCallProvider(fakeDb, 'groq');
  assert.strictEqual(gate.allowed, false);
  assert.strictEqual(gate.reason, 'CIRCUIT_OPEN');
  await circuit.recordProviderSuccess(fakeDb, 'groq');
  const gate2 = await circuit.canCallProvider(fakeDb, 'groq');
  assert.strictEqual(gate2.allowed, true);
  console.log('3. Circuit breaker ✔');

  const budget = await load('workers/token_budget.js');
  assert.ok(budget.estimateTokensFromText('a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)) > 30);
  assert.strictEqual(budget.extractUsageTokens({ usage: { total_tokens: 123 } }, 10), 123);
  console.log('4. Token metering helpers ✔');

  const jobs = await load('workers/coach_jobs.js');
  const pack = jobs.buildExamReviewPack({ weakDomains: ['hardware', 'security'] });
  assert.strictEqual(pack.type, 'exam_review_pack');
  assert.strictEqual(pack.plan.length, 2);
  console.log('5. Exam review pack / DLQ helpers ✔');

  const evalHarness = require(path.join(ROOT, 'tools', 'coach_eval_harness.js'));
  const report = evalHarness.runGoldenEval();
  assert.ok(report.passed >= 3, 'golden eval should pass baseline cases');
  console.log('6. Eval harness ✔ (' + report.passed + '/' + report.total + ')');

  console.log('\nAll AI production guard tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
