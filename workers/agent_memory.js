/**
 * Lean agent memory (mem0-inspired patterns) for Clariora coach.
 * User / session memories in D1. No Python mem0 dependency.
 *
 * Step A: promoteGhostCoachTelemetry (confusion pairs + weak objectives)
 * Step B: extractAndStoreCoachTurn (deterministic facts after /api/v1/coach)
 * Step C: buildSessionBootPack / assembleCoachBootContext (capped coach boot)
 */

import {
  sanitizeMemoryItem,
  formatSandboxedMemories,
  sanitizePromptInput
} from './coach_security_guard.js';

const MEMORY_KINDS = new Set([
  'preference',
  'weak_objective',
  'miss_pattern',
  'confusion_pair',
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

function normalizeFingerprint(fp) {
  return String(fp || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9:|_.\- /]/g, '')
    .trim()
    .slice(0, 120);
}

function withFingerprintMarker(content, fingerprint) {
  const fp = normalizeFingerprint(fingerprint);
  const body = String(content || '').trim();
  if (!fp) return body.slice(0, 1200);
  const marker = '[fp:' + fp + ']';
  if (body.includes(marker)) return body.slice(0, 1200);
  return (marker + ' ' + body).slice(0, 1200);
}

async function listRecentMemories(db, userId, limit) {
  const lim = Math.min(Math.max(Number(limit) || 40, 1), 80);
  try {
    const stmt = db.prepare(`
      SELECT id, kind, content, objective, score, updated_at
      FROM learner_memories
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `).bind(userId, lim);
    if (typeof stmt.all === 'function') {
      const rows = await stmt.all();
      return (rows && rows.results) || [];
    }
    if (typeof stmt.first === 'function') {
      const one = await stmt.first();
      return one ? [one] : [];
    }
  } catch (_) {
    return [];
  }
  return [];
}

/**
 * Insert or refresh a memory by fingerprint marker inside content.
 * Keeps D1 lean: repeated DHCP/DNS misses update one row instead of spamming.
 */
export async function upsertMemory(db, auth, { kind, content, objective, score, fingerprint }) {
  const userId = memoryUserId(auth);
  if (!db || !userId || !content) return null;
  const safeKind = MEMORY_KINDS.has(String(kind)) ? String(kind) : 'session_note';
  const fp = normalizeFingerprint(fingerprint);
  const cleanContent = sanitizeMemoryItem(content);
  if (!cleanContent) return null;
  const safeContent = withFingerprintMarker(cleanContent, fp);
  const now = Date.now();
  await ensureMemorySchema(db);

  if (fp) {
    const recent = await listRecentMemories(db, userId, 40);
    const marker = '[fp:' + fp + ']';
    const hit = recent.find((row) => row.kind === safeKind && String(row.content || '').includes(marker));
    if (hit && hit.id != null) {
      try {
        await db.prepare(`
          UPDATE learner_memories
          SET content = ?, objective = ?, score = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `).bind(
          safeContent,
          objective ? String(objective).slice(0, 64) : null,
          Number.isFinite(score) ? score : 1.0,
          now,
          hit.id,
          userId
        ).run();
        return { updated: true, id: hit.id };
      } catch (_) {
        // Fall through to insert if UPDATE unsupported in mock.
      }
    }
  }

  const result = await db.prepare(`
    INSERT INTO learner_memories (user_id, kind, content, objective, score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    safeKind,
    safeContent,
    objective ? String(objective).slice(0, 64) : null,
    Number.isFinite(score) ? score : 1.0,
    now,
    now
  ).run();
  return { inserted: true, result };
}

export async function addMemory(db, auth, { kind, content, objective, score, fingerprint }) {
  return upsertMemory(db, auth, { kind, content, objective, score, fingerprint });
}

export async function searchMemories(db, auth, { query, topK, kinds } = {}) {
  const userId = memoryUserId(auth);
  if (!db || !userId) return [];
  await ensureMemorySchema(db);
  const limit = Math.min(Math.max(Number(topK) || 5, 1), 12);
  const list = await listRecentMemories(db, userId, 40);
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
    if (row.kind === 'confusion_pair') rank += 1.5;
    if (row.kind === 'miss_pattern') rank += 1.0;
    if (row.kind === 'preference') rank += 0.4;
    return { ...row, rank };
  }).filter(Boolean);

  scored.sort((a, b) => b.rank - a.rank || b.updated_at - a.updated_at);
  return scored.slice(0, limit);
}

export function formatMemoriesForPrompt(memories) {
  return formatSandboxedMemories(memories);
}

/** Hard cap for session boot context (~450 tokens). Keeps coach prompts lean. */
export const SESSION_BOOT_MAX_CHARS = 1800;

function stripFp(text) {
  return String(text || '').replace(/\[fp:[^\]]+\]\s*/g, '').trim();
}

function summarizeMission(mission) {
  if (!mission || typeof mission !== 'object') return '';
  const title = sanitizeMemoryItem(String(mission.title || '').trim().slice(0, 120));
  const summary = sanitizeMemoryItem(String(mission.summary || '').trim().slice(0, 220));
  const primary = mission.primaryObjective
    ? sanitizePromptInput(String(mission.primaryObjective).slice(0, 40), 40)
    : '';
  const parts = [];
  if (title) parts.push(title);
  if (primary) parts.push('focus ' + primary);
  if (summary) parts.push(summary);
  return parts.join(' | ').slice(0, 320);
}

function summarizeConfusionPair(pair) {
  if (!pair) return '';
  if (typeof pair === 'string') return sanitizeMemoryItem(stripFp(pair).slice(0, 200));
  if (pair.key || (pair.a && pair.b)) {
    const a = sanitizeMemoryItem(String(pair.a || (String(pair.key || '').split('|')[0]) || '').slice(0, 40));
    const b = sanitizeMemoryItem(String(pair.b || (String(pair.key || '').split('|')[1]) || '').slice(0, 40));
    const count = Number(pair.count) || 0;
    const obj = pair.objective ? sanitizePromptInput(String(pair.objective).slice(0, 40), 40) : '';
    let line = 'Confuses ' + a + ' with ' + b;
    if (count) line += ' (' + count + 'x)';
    if (obj) line += ' [' + obj + ']';
    return line.slice(0, 200);
  }
  if (pair.content) return sanitizeMemoryItem(stripFp(pair.content).slice(0, 200));
  return '';
}

/**
 * Step C: fixed session boot pack for Ghost Coach.
 * Always prefer: current mission + top confusion pair + up to 5 memories.
 * Hard character cap; never invent fields.
 */
export function buildSessionBootPack({
  memories,
  mission,
  confusionPair,
  maxChars
} = {}) {
  const cap = Math.min(
    Math.max(Number(maxChars) || SESSION_BOOT_MAX_CHARS, 400),
    4000
  );
  const header = 'Session boot (private learner context; do not invent beyond this):';
  const sections = [];

  const missionLine = summarizeMission(mission);
  if (missionLine) {
    sections.push({ key: 'mission', text: 'Mission: ' + missionLine });
  }

  const pairLine = summarizeConfusionPair(confusionPair);
  if (pairLine) {
    sections.push({ key: 'confusion', text: 'Top confusion: ' + pairLine });
  }

  const memList = Array.isArray(memories) ? memories.slice(0, 5) : [];
  const memLines = memList.map((m, i) => {
    const obj = m.objective ? ' [' + m.objective + ']' : '';
    const cleaned = stripFp(m.content).slice(0, 220);
    return (i + 1) + '. (' + (m.kind || 'note') + ')' + obj + ' ' + cleaned;
  }).filter((line) => line.trim().length > 4);

  if (memLines.length) {
    sections.push({
      key: 'memories',
      text: 'Memories:\n' + memLines.join('\n')
    });
  }

  if (!sections.length) {
    return { text: '', chars: 0, capped: false, included: { mission: false, confusion: false, memories: 0 } };
  }

  let body = '';
  const included = { mission: false, confusion: false, memories: 0 };
  for (const section of sections) {
    const next = body ? (body + '\n' + section.text) : section.text;
    const full = header + '\n' + next;
    if (full.length > cap) {
      // Always try to keep mission + confusion even if memories must shrink.
      if (section.key === 'memories' && memLines.length) {
        let kept = [];
        for (const line of memLines) {
          const trialMem = 'Memories:\n' + kept.concat([line]).join('\n');
          const trialBody = body ? (body + '\n' + trialMem) : trialMem;
          if ((header + '\n' + trialBody).length > cap) break;
          kept.push(line);
        }
        if (kept.length) {
          body = body ? (body + '\nMemories:\n' + kept.join('\n')) : ('Memories:\n' + kept.join('\n'));
          included.memories = kept.length;
        }
      }
      break;
    }
    body = next;
    if (section.key === 'mission') included.mission = true;
    if (section.key === 'confusion') included.confusion = true;
    if (section.key === 'memories') included.memories = memLines.length;
  }

  let text = body ? (header + '\n' + body) : '';
  let capped = false;
  if (text.length > cap) {
    text = text.slice(0, cap - 1).trimEnd() + '...';
    capped = true;
  } else if (sections.length && included.memories < memLines.length) {
    capped = true;
  }

  return {
    text,
    chars: text.length,
    capped: capped || text.length >= cap,
    included
  };
}

/**
 * Assemble boot pack from D1 hits + optional client mission/pairs.
 */
export async function assembleCoachBootContext(db, auth, body = {}) {
  const query = [body.objective, body.domain, body.topic]
    .filter(Boolean)
    .join(' ')
    .slice(0, 200);

  const [memoryHits, confusionHits] = await Promise.all([
    searchMemories(db, auth, { query, topK: 5 }),
    searchMemories(db, auth, { query, topK: 2, kinds: ['confusion_pair'] })
  ]);

  // Prefer dedicated confusion hits; fall back to client payload or memory list.
  let confusionPair = confusionHits[0] || null;
  if (!confusionPair && Array.isArray(body.confusionPairs) && body.confusionPairs.length) {
    confusionPair = body.confusionPairs[0];
  }
  if (!confusionPair) {
    const fromHits = memoryHits.find((m) => m.kind === 'confusion_pair');
    if (fromHits) confusionPair = fromHits;
  }

  const mission = body.currentMission || body.mission || null;

  // Confusion is rendered in its own boot section; keep memory list for other kinds.
  const memoriesForPack = memoryHits
    .filter((m) => m.kind !== 'confusion_pair')
    .slice(0, 5);

  const pack = buildSessionBootPack({
    memories: memoriesForPack,
    mission,
    confusionPair,
    maxChars: SESSION_BOOT_MAX_CHARS
  });

  return {
    memoryHits,
    confusionPair,
    pack,
    memoryBlock: pack.text || formatMemoriesForPrompt(memoryHits)
  };
}

/**
 * Promote local Ghost Coach telemetry into durable D1 memories.
 * Idempotent via fingerprints on pair keys and objective ids.
 */
export async function promoteGhostCoachTelemetry(db, auth, payload) {
  const userId = memoryUserId(auth);
  if (!db || !userId || !payload || typeof payload !== 'object') {
    return { ok: false, reason: 'auth_or_payload', stored: 0, updated: 0 };
  }

  const pairs = Array.isArray(payload.confusionPairs) ? payload.confusionPairs.slice(0, 12) : [];
  const weaks = Array.isArray(payload.weakObjectives) ? payload.weakObjectives.slice(0, 12) : [];
  let stored = 0;
  let updated = 0;

  for (const raw of pairs) {
    const key = String((raw && (raw.key || raw.pair)) || '').trim().toLowerCase();
    if (!key || !key.includes('|')) continue;
    const parts = key.split('|');
    const a = sanitizeMemoryItem(String((raw && raw.a) || parts[0] || '').slice(0, 40));
    const b = sanitizeMemoryItem(String((raw && raw.b) || parts[1] || '').slice(0, 40));
    const count = Math.min(99, Math.max(1, Number(raw && raw.count) || 1));
    const objective = raw && raw.objective ? sanitizePromptInput(String(raw.objective).slice(0, 64), 64) : null;
    const sample = raw && raw.sample
      ? (' Example: chose "' + sanitizeMemoryItem(String(raw.sample.wrong || '').slice(0, 60)) +
        '" vs "' + sanitizeMemoryItem(String(raw.sample.correct || '').slice(0, 60)) + '".')
      : '';
    const fp = 'cp:' + key;
    const content = 'Confuses ' + a + ' with ' + b + ' (seen ' + count + 'x).' + sample;
    const score = Math.min(3, 1.2 + count * 0.15 + (Number(raw && raw.score) || 0) * 0.05);
    const result = await upsertMemory(db, auth, {
      kind: 'confusion_pair',
      fingerprint: fp,
      content,
      objective,
      score
    });
    if (result && result.updated) updated += 1;
    else if (result) stored += 1;
  }

  for (const raw of weaks) {
    const objective = sanitizePromptInput(String((raw && (raw.objective || raw.id)) || '').trim().slice(0, 64), 64);
    if (!objective) continue;
    const wrong = Math.min(99, Math.max(0, Number(raw && raw.wrong) || 0));
    const attempts = Math.min(99, Math.max(0, Number(raw && raw.attempts) || 0));
    const domain = raw && raw.domain ? sanitizePromptInput(String(raw.domain).slice(0, 80), 80) : '';
    const acc = attempts > 0
      ? Math.round((Number(raw.accuracy != null ? raw.accuracy : ((attempts - wrong) / attempts)) || 0) * 100)
      : null;
    const fp = 'wo:' + objective.toLowerCase();
    const content = 'Weak on objective ' + objective +
      (domain ? ' (' + domain + ')' : '') +
      (attempts ? '; ' + wrong + '/' + attempts + ' wrong' : '') +
      (acc != null ? ' (~' + acc + '% accuracy)' : '');
    const score = Math.min(3, 1.3 + wrong * 0.1 + (Number(raw && raw.weakness) || 0));
    const result = await upsertMemory(db, auth, {
      kind: 'weak_objective',
      fingerprint: fp,
      content,
      objective,
      score
    });
    if (result && result.updated) updated += 1;
    else if (result) stored += 1;
  }

  return { ok: true, stored, updated, pairs: pairs.length, weaks: weaks.length };
}

/**
 * Deterministic extract-and-store (no second LLM call).
 * Turns one coach turn into up to 3 durable facts + optional pair promote.
 */
export function extractCoachFacts({ body, triage, replyText } = {}) {
  const facts = [];
  const b = body && typeof body === 'object' ? body : {};
  const objective = String(b.objective || b.domain || b.topic || '').trim().slice(0, 64);
  const chosen = String(b.chosenAnswer || b.userChoice || '').trim().slice(0, 120);
  const correct = String(b.correctAnswer || '').trim().slice(0, 120);
  const specialist = triage && triage.specialist ? String(triage.specialist) : '';
  const intent = triage && triage.intent ? String(triage.intent) : 'explain';

  if (objective) {
    const fp = 'wo:' + objective.toLowerCase();
    let line = 'Weak on objective ' + objective;
    if (chosen && correct && chosen.toLowerCase() !== correct.toLowerCase()) {
      line += '; chose "' + chosen + '" over "' + correct + '"';
    }
    facts.push({
      kind: 'weak_objective',
      fingerprint: fp,
      content: line,
      objective,
      score: 1.5
    });
  }

  if (chosen && correct && chosen.toLowerCase() !== correct.toLowerCase()) {
    const fp = normalizeFingerprint('mp:' + chosen.slice(0, 48) + '|' + correct.slice(0, 48));
    facts.push({
      kind: 'miss_pattern',
      fingerprint: fp,
      content: 'Miss pattern: selected "' + chosen + '" instead of "' + correct + '"' +
        (objective ? ' (' + objective + ')' : ''),
      objective: objective || null,
      score: 1.4
    });
  }

  if (replyText && specialist) {
    const snip = String(replyText).replace(/\s+/g, ' ').trim().slice(0, 180);
    const fp = normalizeFingerprint('at:' + intent + ':' + specialist + ':' + (objective || 'gen'));
    facts.push({
      kind: 'agent_trace',
      fingerprint: fp,
      content: 'Coach ' + intent + '/' + specialist + ': ' + snip,
      objective: objective || null,
      score: 0.75
    });
  }

  return facts.slice(0, 3);
}

export async function extractAndStoreCoachTurn(db, auth, { body, triage, replyText } = {}) {
  const userId = memoryUserId(auth);
  if (!db || !userId) return { ok: false, reason: 'auth', stored: 0, updated: 0, promoted: null };

  let stored = 0;
  let updated = 0;
  const facts = extractCoachFacts({ body, triage, replyText });
  for (const fact of facts) {
    const result = await upsertMemory(db, auth, fact);
    if (result && result.updated) updated += 1;
    else if (result) stored += 1;
  }

  let promoted = null;
  const promotePayload = (body && body.ghostCoachPromote) || null;
  const inlinePairs = body && Array.isArray(body.confusionPairs) ? body.confusionPairs : null;
  const inlineWeaks = body && Array.isArray(body.weakObjectives) ? body.weakObjectives : null;
  if (promotePayload || inlinePairs || inlineWeaks) {
    promoted = await promoteGhostCoachTelemetry(db, auth, promotePayload || {
      confusionPairs: inlinePairs || [],
      weakObjectives: inlineWeaks || []
    });
  }

  return { ok: true, stored, updated, facts: facts.length, promoted };
}

/** @deprecated Prefer extractAndStoreCoachTurn; kept for older call sites. */
export async function rememberMiss(db, auth, body) {
  const objective = body && (body.objective || body.domain || body.topic);
  if (!objective && !(body && (body.chosenAnswer || body.prompt || body.missSummary))) return null;
  const facts = extractCoachFacts({ body, triage: { intent: 'explain', specialist: 'hardware' }, replyText: '' });
  if (!facts.length) {
    const rawContent = body.missSummary || body.questionSummary || body.prompt || ('Weak on objective ' + objective);
    return upsertMemory(db, auth, {
      kind: 'weak_objective',
      fingerprint: objective ? 'wo:' + String(objective).toLowerCase() : null,
      content: sanitizeMemoryItem(rawContent),
      objective: objective ? sanitizePromptInput(String(objective).slice(0, 64), 64) : null,
      score: 1.5
    });
  }
  let last = null;
  for (const fact of facts.slice(0, 2)) {
    last = await upsertMemory(db, auth, fact);
  }
  return last;
}
