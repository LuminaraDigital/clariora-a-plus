#!/usr/bin/env node
/**
 * tools/eval_coach.js - grounding eval for the AI coach.
 *
 *   node tools/eval_coach.js --ci
 *     Replays labelled replies (tools/fixtures/coach_golden.json) through the real
 *     post-processing in runCoachTurns and fails on any wrong verdict. Offline.
 *
 *   node tools/eval_coach.js --live --base https://clariora.com.au [--n 10] [--min-grounded 0.9]
 *     Sends bank questions to a deployed coach and reports grounded rate, option-letter
 *     rate, tokens per call and latency. Needs COACH_EVAL_ID_TOKEN (a Firebase ID token
 *     for a test account). Each call spends that account's real AI budget.
 */
import { readFileSync } from 'node:fs';
import { runCoachTurns } from '../workers/coach_orchestrator.js';
import { referencesOptionLetters } from '../workers/explain_cache.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

function verdictOf(result, original) {
  if (!result) return 'no_result';
  if (result.grounded === false) return 'fallback';
  const sec = result.security || {};
  if (sec.unknownObjectives && sec.unknownObjectives.length) return 'objective_replaced';
  if (!sec.clean) return 'unclean';
  if (referencesOptionLetters(original)) return 'uncacheable_letters';
  return 'pass';
}

async function runCi() {
  const fixtures = JSON.parse(readFileSync('tools/fixtures/coach_golden.json', 'utf8'));
  let wrong = 0;
  for (const c of fixtures.cases) {
    const ran = await runCoachTurns({
      tier: 'free',
      body: { ...c.question, intent: 'explain', tools: ['lookup_objective'] },
      triage: { intent: 'explain', specialist: 'hardware', maxTurns: 1 },
      callModel: async () => ({ text: c.reply, tokens_used: 0 })
    });
    const got = verdictOf(ran.result, c.reply);
    const ok = got === c.expect;
    if (!ok) wrong += 1;
    let extra = '';
    if (got === 'fallback' && ran.result && !String(ran.result.text).includes(c.question.correctAnswer)) {
      wrong += ok ? 1 : 0;
      extra = ' (fallback text is missing the bank answer)';
    }
    console.log(`  ${ok && !extra ? 'PASS' : 'FAIL'}  ${c.id}: expected ${c.expect}, got ${got}${extra}`);
  }
  console.log(`\n${fixtures.cases.length - wrong}/${fixtures.cases.length} golden cases behave as labelled`);
  return wrong === 0;
}

function sampleBank(n) {
  const bank = JSON.parse(readFileSync('exam_data.json', 'utf8'));
  const all = ['core1', 'core2'].flatMap((c) => (Array.isArray(bank[c]) ? bank[c] : (bank[c] || {}).questions || []));
  const usable = all.filter((q) => q && q.id && Array.isArray(q.options) && q.options.length >= 2);
  const step = Math.max(1, Math.floor(usable.length / n));
  return usable.filter((_, i) => i % step === 0).slice(0, n);
}

function answerText(q) {
  const idx = Number(q.answer);
  return Number.isInteger(idx) && q.options[idx] !== undefined ? String(q.options[idx]) : String(q.answer);
}

async function runLive() {
  const base = opt('--base', process.env.CLARIORA_BASE_URL || '');
  const token = process.env.COACH_EVAL_ID_TOKEN || '';
  if (!base || !token) {
    console.error('Live mode needs --base <url> and COACH_EVAL_ID_TOKEN in the environment.');
    return false;
  }
  const n = Math.max(1, Math.min(50, Number(opt('--n', '10')) || 10));
  const minGrounded = Number(opt('--min-grounded', '0.9'));
  const rows = [];
  for (const q of sampleBank(n)) {
    const correct = answerText(q);
    const wrong = q.options.map(String).find((o) => o !== correct) || '';
    const started = Date.now();
    const res = await fetch(base.replace(/\/$/, '') + '/api/v1/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'explain',
        tools: ['lookup_objective'],
        idToken: token,
        questionId: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: correct,
        chosenAnswer: wrong,
        objective: q.objective || '',
        officialExplanation: q.explanation || ''
      })
    });
    const body = await res.json().catch(() => ({}));
    const text = String(body.text || body.reply || '');
    rows.push({
      id: q.id,
      status: res.status,
      grounded: res.ok && body.grounded !== false,
      letters: referencesOptionLetters(text),
      tokens: Number(body.tokensUsed) || 0,
      cached: !!(body.cached || body.provider === 'cache'),
      ms: Date.now() - started
    });
    const r = rows[rows.length - 1];
    console.log(`  ${r.status} ${r.id} grounded=${r.grounded} letters=${r.letters} tokens=${r.tokens} cached=${r.cached} ${r.ms}ms`);
    if (res.status === 429 || res.status === 402) {
      console.log('  budget or rate limit reached; stopping early');
      break;
    }
  }
  const ok = rows.filter((r) => r.status === 200);
  const rate = (f) => (ok.length ? ok.filter(f).length / ok.length : 0);
  const grounded = rate((r) => r.grounded);
  const sortedMs = ok.map((r) => r.ms).sort((a, b) => a - b);
  console.log(JSON.stringify({
    calls: rows.length,
    ok: ok.length,
    groundedRate: Math.round(grounded * 1000) / 1000,
    letterRate: Math.round(rate((r) => r.letters) * 1000) / 1000,
    cacheRate: Math.round(rate((r) => r.cached) * 1000) / 1000,
    tokensPerCall: ok.length ? Math.round(ok.reduce((a, r) => a + r.tokens, 0) / ok.length) : 0,
    p50Ms: sortedMs.length ? sortedMs[Math.floor(sortedMs.length / 2)] : 0
  }, null, 2));
  return ok.length > 0 && grounded >= minGrounded;
}

const run = flag('--live') ? runLive : runCi;
run().then((ok) => process.exit(ok ? 0 : 1), (err) => {
  console.error(err);
  process.exit(1);
});
