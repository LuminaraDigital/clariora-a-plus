#!/usr/bin/env node
/**
 * tools/prewarm_explain_cache.js - fill ai_explain_cache with 70B-quality explanations.
 *
 * For each standard bank question and each wrong option, builds the exact
 * canonical request the live coach would cache, generates a reply through the
 * real orchestrator (same prompts, same guards), and keeps only replies that are
 * grounded, clean and free of option letters. Output is a SQL file; nothing is
 * written to D1 unless --apply is given.
 *
 *   node tools/prewarm_explain_cache.js --limit 20                 # dry run, SQL to _bank/analysis/
 *   node tools/prewarm_explain_cache.js --limit 20 --apply staging # also runs wrangler d1 execute
 *
 * Needs NVIDIA_API_KEY (default provider) or GROQ_API_KEY with --provider groq,
 * read from the environment. Spends real provider tokens: ~900 per pair.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { runCoachTurns, triageRequest } from '../workers/coach_orchestrator.js';
import {
  canonicalExplainBody,
  canonicalExplainTriage,
  explainCacheKey,
  referencesOptionLetters,
  CACHEABLE_SYSTEM_SUFFIX,
  PREWARM_MODEL,
  EXPLAIN_PROMPT_VERSION
} from '../workers/explain_cache.js';
import { executeNvidiaNim, executeGroq } from '../workers/api_ai_providers.js';
import { similarItemsWithStems } from '../workers/coach_handler.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const limit = Math.max(1, Number(opt('--limit', '20')) || 20);
const offset = Math.max(0, Number(opt('--offset', '0')) || 0);
const provider = opt('--provider', 'nvidia');
const apply = opt('--apply', '');
const out = opt('--out', '_bank/analysis/prewarm_explain_cache.sql');
const TIERS = ['free', 'daily_pass', 'pro_monthly', 'lifetime'];

const PROVIDERS = {
  nvidia: { run: executeNvidiaNim, model: 'meta/llama-3.3-70b-instruct', key: 'NVIDIA_API_KEY' },
  groq: { run: executeGroq, model: 'llama-3.3-70b-versatile', key: 'GROQ_API_KEY' }
};

function bankPairs() {
  const bank = JSON.parse(readFileSync('exam_data.json', 'utf8'));
  const qs = ['core1', 'core2'].flatMap((c) => (Array.isArray(bank[c]) ? bank[c] : (bank[c] || {}).questions || []));
  const pairs = [];
  for (const q of qs) {
    if (!q || !q.id || !Array.isArray(q.options) || q.options.length < 2 || typeof q.answer !== 'number') continue;
    const correct = q.options[q.answer];
    if (correct === undefined) continue;
    q.options.forEach((opt, i) => {
      if (i !== q.answer) pairs.push({ q, chosen: opt, correct });
    });
  }
  return pairs;
}

/** The request body js/tma_ghost_coach.js sends for this miss. */
function clientBody({ q, chosen, correct }) {
  return {
    intent: 'explain',
    tools: ['lookup_objective'],
    objective: q.objective || '',
    question: q.question,
    questionId: q.id,
    options: q.options,
    officialExplanation: q.explanation || undefined,
    chosenAnswer: chosen,
    correctAnswer: correct,
    distractorAnalysis: q.distractor_analysis || {}
  };
}

function neighborIds(qid) {
  try {
    const payload = JSON.parse(readFileSync('similar_neighbors.json', 'utf8'));
    return ((payload.neighbors || {})[qid] || []).filter((id) => id !== qid).slice(0, 5);
  } catch (_) {
    return [];
  }
}

const sqlText = (s) => "'" + String(s).replace(/'/g, "''") + "'";

async function main() {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider ${provider}; use nvidia or groq.`);
  if (!process.env[p.key]) throw new Error(`${p.key} is not set in the environment.`);
  if (apply && !['staging', 'production'].includes(apply)) throw new Error('--apply takes staging or production.');

  const pairs = bankPairs().slice(offset, offset + limit);
  const env = { [p.key]: process.env[p.key] };
  const now = Date.now();
  const lines = [];
  const stats = { pairs: pairs.length, accepted: 0, rejected: 0, rows: 0, tokens: 0, reasons: {} };

  for (const pair of pairs) {
    const raw = clientBody(pair);
    const body = canonicalExplainBody(raw);
    body._similarItems = similarItemsWithStems(neighborIds(body.questionId), body);
    const triage = canonicalExplainTriage(triageRequest(body, 'lifetime'));

    let tokens = 0;
    const ran = await runCoachTurns({
      tier: 'lifetime',
      body,
      triage,
      callModel: async ({ systemPrompt, userMessage }) => {
        const r = await p.run(userMessage, systemPrompt + '\n\n' + CACHEABLE_SYSTEM_SUFFIX, p.model, env);
        const used = Number(r && r.raw && r.raw.usage && r.raw.usage.total_tokens) || 0;
        tokens += used;
        return r ? { ...r, tokens_used: used } : null;
      }
    });
    stats.tokens += tokens;

    const result = ran.result;
    const reason = !result || !result.text ? 'no_reply'
      : result.grounded === false ? 'contradiction'
        : !(result.security && result.security.clean) ? 'unclean'
          : referencesOptionLetters(result.text) ? 'option_letters'
            : result.text.length < 80 ? 'too_short'
              : null;
    if (reason) {
      stats.rejected += 1;
      stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
      console.log(`  skip ${body.questionId} / ${String(pair.chosen).slice(0, 30)}: ${reason}`);
      continue;
    }
    stats.accepted += 1;

    // The live key uses the specialist each tier resolves to; one vetted reply serves them all.
    const specialists = new Set(TIERS.map((t) => canonicalExplainTriage(triageRequest(body, t)).specialist));
    for (const specialist of specialists) {
      const key = await explainCacheKey(body, PREWARM_MODEL, specialist);
      lines.push(
        'INSERT INTO ai_explain_cache (cache_key, qid, model, prompt_version, body, hits, created_at) VALUES (' +
        [sqlText(key), sqlText(body.questionId), sqlText(PREWARM_MODEL), sqlText(EXPLAIN_PROMPT_VERSION), sqlText(result.text), 0, now].join(', ') +
        ') ON CONFLICT(cache_key) DO UPDATE SET body = excluded.body, created_at = excluded.created_at;'
      );
      stats.rows += 1;
    }
    console.log(`  ok   ${body.questionId} / ${String(pair.chosen).slice(0, 30)} (${tokens} tokens, ${specialists.size} keys)`);
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log(JSON.stringify({ ...stats, out }, null, 2));

  if (apply && lines.length) {
    const config = apply === 'staging' ? 'wrangler.staging.toml' : 'wrangler.toml';
    const db = apply === 'staging' ? 'clariora_edge_db_staging' : 'clariora_edge_db';
    const r = spawnSync('npx', ['-y', 'wrangler@4', 'd1', 'execute', db, '--remote', '-c', config, '--file', out], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    if (r.status !== 0) throw new Error('wrangler d1 execute failed');
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
