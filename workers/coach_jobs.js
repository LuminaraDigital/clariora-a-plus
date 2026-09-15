/**
 * Pro async coach jobs + dead-letter queue (exam review packs).
 * Pattern from fastapi-async queues, implemented on D1 (no Redis/Celery).
 */

export async function ensureJobTables(db) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS coach_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        telegram_id INTEGER,
        tier TEXT NOT NULL,
        job_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        result_json TEXT,
        last_error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        available_at INTEGER
      )
    `).run();
    try {
      await db.prepare('ALTER TABLE coach_jobs ADD COLUMN user_id TEXT').run();
    } catch (_) {}
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS coach_job_dlq (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT,
        telegram_id INTEGER,
        job_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        last_error TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    try {
      await db.prepare('ALTER TABLE coach_job_dlq ADD COLUMN user_id TEXT').run();
    } catch (_) {}
  } catch (e) {
    console.debug('job table ensure skipped:', e.message);
  }
}

export async function enqueueCoachJob(db, {
  userId,
  telegramId,
  tier,
  jobType,
  payload,
  maxAttempts = 3
}) {
  await ensureJobTables(db);
  if (!db) return null;
  const id = crypto.randomUUID();
  const payloadJson = JSON.stringify(payload || {}).slice(0, 8000);
  const effectiveUserId = userId || (telegramId != null ? 'tg:' + telegramId : null);
  const effectiveTgId = telegramId != null ? Number(telegramId) : null;
  await db.prepare(`
    INSERT INTO coach_jobs (id, user_id, telegram_id, tier, job_type, payload_json, status, max_attempts, available_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(id, effectiveUserId, effectiveTgId, tier, jobType, payloadJson, maxAttempts, Date.now()).run();
  return { id, status: 'pending' };
}

export async function getCoachJob(db, jobId, userRef) {
  await ensureJobTables(db);
  if (!db || !jobId) return null;
  try {
    const userStr = String(userRef || '');
    const tgNum = Number(userRef) || (userStr.startsWith('tg:') ? Number(userStr.slice(3)) : null);
    const row = await db.prepare(
      'SELECT * FROM coach_jobs WHERE id = ? AND (user_id = ? OR (telegram_id IS NOT NULL AND telegram_id = ?))'
    ).bind(jobId, userStr, tgNum || -1).first();
    return row || null;
  } catch (_) {
    return null;
  }
}

/**
 * Process one pending exam_review_pack job synchronously (Worker-friendly).
 * Retries with backoff metadata; exhausted jobs move to DLQ.
 */
export async function processNextCoachJob(db, userRef, processor) {
  await ensureJobTables(db);
  if (!db) return null;
  const now = Date.now();
  const userStr = String(userRef || '');
  const tgNum = Number(userRef) || (userStr.startsWith('tg:') ? Number(userStr.slice(3)) : null);
  const job = await db.prepare(`
    SELECT * FROM coach_jobs
    WHERE (user_id = ? OR (telegram_id IS NOT NULL AND telegram_id = ?))
      AND status IN ('pending', 'retry')
      AND (available_at IS NULL OR available_at <= ?)
    ORDER BY created_at ASC
    LIMIT 1
  `).bind(userStr, tgNum || -1, now).first();

  if (!job) return null;

  const attempts = Number(job.attempts || 0) + 1;
  await db.prepare(`
    UPDATE coach_jobs SET status = 'active', attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(attempts, job.id).run();

  try {
    const payload = JSON.parse(job.payload_json || '{}');
    const result = await processor(job.job_type, payload, job);
    await db.prepare(`
      UPDATE coach_jobs SET status = 'completed', result_json = ?, last_error = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(JSON.stringify(result || {}).slice(0, 12000), job.id).run();
    return { id: job.id, status: 'completed', result };
  } catch (err) {
    const message = String(err && err.message || 'job_failed').slice(0, 500);
    const maxAttempts = Number(job.max_attempts || 3);
    if (attempts >= maxAttempts) {
      await db.prepare(`
        UPDATE coach_jobs SET status = 'dlq', last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(message, job.id).run();
      await db.prepare(`
        INSERT INTO coach_job_dlq (id, job_id, user_id, telegram_id, job_type, payload_json, last_error, attempts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), job.id, job.user_id, job.telegram_id, job.job_type, job.payload_json, message, attempts).run();
      return { id: job.id, status: 'dlq', error: message };
    }
    const backoffMs = Math.min(300000, 2000 * Math.pow(2, attempts - 1));
    await db.prepare(`
      UPDATE coach_jobs SET status = 'retry', last_error = ?, available_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(message, Date.now() + backoffMs, job.id).run();
    return { id: job.id, status: 'retry', error: message, availableAt: Date.now() + backoffMs };
  }
}

export function buildExamReviewPack(payload) {
  const weak = Array.isArray(payload.weakDomains) ? payload.weakDomains.slice(0, 8) : [];
  const domains = weak.length ? weak : ['hardware', 'networking', 'security'];
  return {
    type: 'exam_review_pack',
    generatedAt: new Date().toISOString(),
    days: 7,
    plan: domains.map((domain, idx) => ({
      day: idx + 1,
      domain: String(domain).slice(0, 40),
      blocks: [
        { kind: 'drill', minutes: 25, detail: `20 questions on ${domain}` },
        { kind: 'pbq', minutes: 20, detail: `One PBQ checklist for ${domain}` },
        { kind: 'coach', minutes: 10, detail: `Ghost Coach strategy intent on ${domain}` }
      ]
    })),
    notes: 'Pro async pack. Caps still apply to live coach calls.'
  };
}
