/**
 * Lean agent memory (mem0-inspired patterns) for Clariora coach.
 * User / session memories in D1. No Python mem0 dependency.
 */

const MEMORY_KINDS = new Set([
  'preference',
  'weak_objective',
  'miss_pattern',
  'exam_goal',
  'session_note',
  'agent_trace'
]);

export async function ensureMemorySchema(db) {
  if (!db) return;
  try {
    const create = db.prepare(`
      CREATE TABLE IF NOT EXISTS learner_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        objective TEXT,
        score REAL DEFAULT 1.0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    if (typeof create.run === 'function') await create.run();
    else if (typeof create.bind === 'function') await create.bind().run();
    const idx = db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_learner_memories_user ON learner_memories(user_id, updated_at DESC)'
    );
    if (typeof idx.run === 'function') await idx.run();
    else if (typeof idx.bind === 'function') await idx.bind().run();
  } catch (_) {
    // Mock D1 / older schemas: memory is best-effort.
  }
}

function memoryUserId(auth) {
  if (!auth) return null;
  if (auth.firebaseUid) return 'fb:' + auth.firebaseUid;
  if (auth.telegramId) return 'tg:' + auth.telegramId;
  return null;
}

export async function addMemory(db, auth, { kind, content, objective, score }) {
  const userId = memoryUserId(auth);
  if (!db || !userId || !content) return null;
  const safeKind = MEMORY_KINDS.has(String(kind)) ? String(kind) : 'session_note';
  const now = Date.now();
  await ensureMemorySchema(db);
  const result = await db.prepare(`
    INSERT INTO learner_memories (user_id, kind, content, objective, score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    safeKind,
    String(content).slice(0, 1200),
    objective ? String(objective).slice(0, 64) : null,
    Number.isFinite(score) ? score : 1.0,
    now,
    now
  ).run();
  return result;
}

export async function searchMemories(db, auth, { query, topK, kinds } = {}) {
  const userId = memoryUserId(auth);
  if (!db || !userId) return [];
  await ensureMemorySchema(db);
  const limit = Math.min(Math.max(Number(topK) || 5, 1), 12);
  let list = [];
  try {
    const stmt = db.prepare(`
      SELECT id, kind, content, objective, score, updated_at
      FROM learner_memories
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT 40
    `).bind(userId);
    if (typeof stmt.all === 'function') {
      const rows = await stmt.all();
      list = (rows && rows.results) || [];
    } else if (typeof stmt.first === 'function') {
      const one = await stmt.first();
      list = one ? [one] : [];
    }
  } catch (_) {
    return [];
  }
  const q = String(query || '').toLowerCase().trim();
  const kindFilter = Array.isArray(kinds) && kinds.length
    ? new Set(kinds.map(String))
    : null;

  let scored = list.map((row) => {
    if (kindFilter && !kindFilter.has(row.kind)) return null;
    let rank = Number(row.score) || 1;
    if (q) {
      const hay = ((row.content || '') + ' ' + (row.objective || '')).toLowerCase();
      if (hay.includes(q)) rank += 3;
      const tokens = q.split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        if (hay.includes(t)) rank += 0.5;
      }
    }
    if (row.kind === 'weak_objective') rank += 1.2;
    if (row.kind === 'preference') rank += 0.4;
    return { ...row, rank };
  }).filter(Boolean);

  scored.sort((a, b) => b.rank - a.rank || b.updated_at - a.updated_at);
  return scored.slice(0, limit);
}

export function formatMemoriesForPrompt(memories) {
  if (!memories || !memories.length) return '';
  const lines = memories.map((m, i) => {
    const obj = m.objective ? ` [${m.objective}]` : '';
    return `${i + 1}. (${m.kind})${obj} ${m.content}`;
  });
  return [
    'Learner memory (private, use to personalize coaching; never invent memories):',
    ...lines
  ].join('\n');
}

export async function rememberMiss(db, auth, body) {
  const objective = body && (body.objective || body.domain || body.topic);
  const miss = body && (body.missSummary || body.questionSummary || body.prompt);
  if (!objective && !miss) return null;
  const content = miss
    ? String(miss).slice(0, 400)
    : ('Weak on objective ' + String(objective));
  return addMemory(db, auth, {
    kind: 'weak_objective',
    content,
    objective: objective ? String(objective).slice(0, 64) : null,
    score: 1.5
  });
}
