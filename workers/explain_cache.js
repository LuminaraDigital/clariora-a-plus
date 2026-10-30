/**
 * Shared explanation cache (D1 table ai_explain_cache).
 *
 * Only impersonal "explain" requests are cached: no memory boot pack and no
 * learner-specific tools, so a row never carries one learner's data to another.
 * Keys hash the canonical question material rather than the client prompt,
 * because the client shuffles options per session and letters differ.
 */

export const EXPLAIN_PROMPT_VERSION = 'explain-v1';
/** Rows written by tools/prewarm_explain_cache.js with a stronger model. */
export const PREWARM_MODEL = 'prewarm';
export const EXPLAIN_CACHE_TTL_MS = 90 * 86400000;
export const CACHEABLE_SYSTEM_SUFFIX =
  'Refer to answer options by their text, never by letter (A, B, C, D): option order differs between learners.';

const IMPERSONAL_TOOLS = new Set(['lookup_objective', 'retrieve_similar_items']);
const LETTER_REFERENCE = /\b(?:[Oo]ption|[Aa]nswer|[Cc]hoice)s?\s*\(?[A-F]\)?(?![A-Za-z])|^\s*\(?[A-F][.)]\s/m;

export function questionIdOf(body) {
  return String((body && (body.questionId || body.qid)) || '').slice(0, 120);
}

export function isExplainCacheable(body, triage, memoryBlock) {
  if (!triage || triage.intent !== 'explain') return false;
  if (!questionIdOf(body) || memoryBlock) return false;
  if (!body.question || !body.correctAnswer || !body.chosenAnswer) return false;
  const tools = Array.isArray(body.tools) ? body.tools : [];
  return tools.every((t) => IMPERSONAL_TOOLS.has(typeof t === 'string' ? t : t && t.name));
}

export function referencesOptionLetters(text) {
  return LETTER_REFERENCE.test(String(text || ''));
}

/**
 * The request a cached reply is generated from. Every field the model can read
 * must be part of explainCacheKey(), otherwise one client could inject text
 * (for example through its free-form prompt) into a reply served to everyone.
 */
export function canonicalExplainBody(body) {
  const out = Object.assign({}, body);
  for (const field of ['prompt', 'system', 'domain', 'missHistory', 'weakDomains', 'maxTurns', '_similarItems', '_memoryBlock', '_bootPack']) {
    delete out[field];
  }
  out.options = Array.isArray(body.options) ? body.options.map(String).sort() : [];
  // Tool names and args reach the model as trusted context; fix them server-side.
  out.tools = ['lookup_objective'];
  return out;
}

/** Triage for a cached explain: derived from the canonical body only, one turn. */
export function canonicalExplainTriage(triage) {
  return Object.assign({}, triage, { maxTurns: 1 });
}

export async function explainCacheKey(body, model, specialist) {
  const canon = canonicalExplainBody(body);
  const material = JSON.stringify([
    EXPLAIN_PROMPT_VERSION,
    String(specialist || ''),
    questionIdOf(canon),
    String(canon.question || ''),
    canon.options,
    String(canon.correctAnswer || ''),
    String(canon.chosenAnswer || ''),
    String(canon.objective || ''),
    JSON.stringify(canon.distractorAnalysis || {}),
    String(model || '')
  ]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

let tableReady = false;

export async function ensureExplainCacheTable(db) {
  if (!db || tableReady) return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_explain_cache (
      cache_key TEXT PRIMARY KEY,
      qid TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      body TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `).run();
  tableReady = true;
}

/** First live row for any of the keys, in order. Bumps its hit counter. */
export async function readExplainCache(db, keys, now) {
  if (!db || !Array.isArray(keys) || !keys.length) return null;
  try {
    await ensureExplainCacheTable(db);
    const minCreated = (now || Date.now()) - EXPLAIN_CACHE_TTL_MS;
    for (const key of keys) {
      const row = await db.prepare(
        'SELECT cache_key, qid, model, body FROM ai_explain_cache WHERE cache_key = ? AND created_at >= ?'
      ).bind(key, minCreated).first();
      if (row && row.body) {
        await db.prepare('UPDATE ai_explain_cache SET hits = hits + 1 WHERE cache_key = ?').bind(key).run();
        return row;
      }
    }
  } catch (err) {
    console.warn('explain cache read skipped:', err && err.message);
  }
  return null;
}

export async function writeExplainCache(db, { key, qid, model, text }, now) {
  if (!db || !key || !text) return false;
  try {
    await ensureExplainCacheTable(db);
    await db.prepare(`
      INSERT INTO ai_explain_cache (cache_key, qid, model, prompt_version, body, hits, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(cache_key) DO UPDATE SET body = excluded.body, created_at = excluded.created_at
    `).bind(key, qid, model, EXPLAIN_PROMPT_VERSION, text, now || Date.now()).run();
    return true;
  } catch (err) {
    console.warn('explain cache write skipped:', err && err.message);
    return false;
  }
}

export async function purgeExpiredExplainCache(db, now) {
  if (!db) return 0;
  await ensureExplainCacheTable(db);
  const res = await db.prepare('DELETE FROM ai_explain_cache WHERE created_at < ?')
    .bind((now || Date.now()) - EXPLAIN_CACHE_TTL_MS).run();
  return (res && res.meta && res.meta.changes) || 0;
}
