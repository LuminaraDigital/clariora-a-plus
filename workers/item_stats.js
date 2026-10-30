/**
 * Community item telemetry ingest + incremental stats cache upsert.
 * Privacy: question id, option index, correct flag, seconds, exam type only.
 * Never store user ids, emails, install ids, or answer text.
 */

const MAX_EVENTS = 50;
const MAX_QID = 64;
const MAX_EXAM_TYPE = 32;
const MAX_SECONDS = 3600;

/**
 * @param {string|null|undefined} existingJson
 * @param {number|null} selectedOption
 * @returns {string}
 */
export function mergeDistractorSpread(existingJson, selectedOption) {
  let spread = {};
  if (existingJson && typeof existingJson === 'string') {
    try {
      const parsed = JSON.parse(existingJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        spread = parsed;
      }
    } catch (_) {
      spread = {};
    }
  }
  if (typeof selectedOption === 'number' && Number.isFinite(selectedOption) && selectedOption >= 0) {
    const key = String(Math.floor(selectedOption));
    const prev = Number(spread[key]) || 0;
    spread[key] = prev + 1;
  }
  return JSON.stringify(spread);
}

/**
 * Normalize one event from either clean shape or telemetry {name, props} shape.
 * @param {any} raw
 * @returns {null|{questionId:string,selectedOption:number|null,isCorrect:0|1,secondsSpent:number,examType:string|null,abilityProxy:number|null}}
 */
export function normalizeTelemetryEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  let src = raw;
  const name = String(raw.name || raw.type || raw.event || raw.n || '').toLowerCase();
  if (name === 'item_answered' || name === 'item:answered') {
    src = (raw.props && typeof raw.props === 'object')
      ? raw.props
      : (raw.p && typeof raw.p === 'object')
        ? raw.p
        : raw;
  } else if (name && name !== 'item_answered' && name !== 'item:answered') {
    return null;
  } else if (!raw.questionId && !raw.question_id && !raw.qid && raw.p && typeof raw.p === 'object') {
    // Compact telemetry buffer shape without an explicit name (rare).
    src = raw.p;
  }

  const questionId = String(src.questionId || src.question_id || src.qid || '').trim().slice(0, MAX_QID);
  if (!questionId) return null;

  let selectedOption = null;
  const optRaw = src.selectedOption != null ? src.selectedOption : src.selected_option;
  if (typeof optRaw === 'number' && Number.isFinite(optRaw) && optRaw >= 0 && optRaw < 64) {
    selectedOption = Math.floor(optRaw);
  }

  const correctRaw = src.isCorrect != null ? src.isCorrect : src.is_correct != null ? src.is_correct : src.correct;
  const isCorrect = correctRaw === true || correctRaw === 1 || correctRaw === '1' ? 1 : 0;

  let secondsSpent = Number(src.secondsSpent != null ? src.secondsSpent : src.seconds_spent != null ? src.seconds_spent : src.seconds);
  if (!Number.isFinite(secondsSpent) || secondsSpent < 0) secondsSpent = 0;
  secondsSpent = Math.min(MAX_SECONDS, Math.floor(secondsSpent));

  let examType = src.examType != null ? src.examType : src.exam_type;
  if (examType == null || examType === '') {
    examType = null;
  } else {
    examType = String(examType).slice(0, MAX_EXAM_TYPE);
  }

  // Anonymous 0..1 ability estimate (session accuracy / readiness). Never a user id.
  let abilityProxy = null;
  const abRaw = src.abilityProxy != null ? src.abilityProxy : src.ability_proxy;
  if (typeof abRaw === 'number' && Number.isFinite(abRaw)) {
    abilityProxy = Math.max(0, Math.min(1, abRaw));
  }

  return { questionId, selectedOption, isCorrect, secondsSpent, examType, abilityProxy };
}

/**
 * @param {D1Database} db
 * @param {{questionId:string,selectedOption:number|null,isCorrect:0|1,secondsSpent:number,examType:string|null,abilityProxy:number|null}} event
 */
export async function appendTelemetryAndUpsertStats(db, event) {
  try {
    await db.prepare(
      'INSERT INTO item_telemetry (question_id, selected_option, is_correct, seconds_spent, exam_type, ability_proxy) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      event.questionId,
      event.selectedOption,
      event.isCorrect,
      event.secondsSpent,
      event.examType,
      event.abilityProxy
    ).run();
  } catch (_) {
    // Pre-migration D1: column may not exist yet.
    await db.prepare(
      'INSERT INTO item_telemetry (question_id, selected_option, is_correct, seconds_spent, exam_type) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      event.questionId,
      event.selectedOption,
      event.isCorrect,
      event.secondsSpent,
      event.examType
    ).run();
  }

  const existing = await db.prepare(
    'SELECT distractor_spread, point_biserial FROM item_stats_cache WHERE question_id = ?'
  ).bind(event.questionId).first();

  const distractorJson = mergeDistractorSpread(
    existing && existing.distractor_spread != null ? String(existing.distractor_spread) : null,
    event.selectedOption
  );

  // Preserve prior point_biserial until the discrimination cron recomputes it.
  const priorPb =
    existing && existing.point_biserial != null && Number.isFinite(Number(existing.point_biserial))
      ? Number(existing.point_biserial)
      : null;

  const pNew = event.isCorrect;
  await db.prepare(
    `INSERT INTO item_stats_cache (
      question_id, sample_size, correct_count, p_value, point_biserial, distractor_spread, flagged_miskey, last_computed
    ) VALUES (?, 1, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(question_id) DO UPDATE SET
      sample_size = item_stats_cache.sample_size + 1,
      correct_count = item_stats_cache.correct_count + excluded.correct_count,
      p_value = CAST(item_stats_cache.correct_count + excluded.correct_count AS REAL)
                / (item_stats_cache.sample_size + 1),
      distractor_spread = excluded.distractor_spread,
      last_computed = CURRENT_TIMESTAMP`
  ).bind(event.questionId, pNew, pNew, priorPb, distractorJson).run();

  // Optional miskey hint when enough samples and a wrong option dominates.
  const row = await db.prepare(
    'SELECT sample_size, p_value, distractor_spread FROM item_stats_cache WHERE question_id = ?'
  ).bind(event.questionId).first();
  if (row && row.sample_size >= 30 && Number(row.p_value) < 0.4) {
    let dominantShare = 0;
    try {
      const spread = JSON.parse(String(row.distractor_spread || '{}'));
      const total = Object.keys(spread).reduce((n, k) => n + (Number(spread[k]) || 0), 0);
      if (total > 0) {
        dominantShare = Math.max.apply(null, Object.keys(spread).map((k) => (Number(spread[k]) || 0) / total));
      }
    } catch (_) {
      dominantShare = 0;
    }
    if (dominantShare > 0.6) {
      await db.prepare(
        'UPDATE item_stats_cache SET flagged_miskey = 1 WHERE question_id = ?'
      ).bind(event.questionId).run();
    }
  }
}

/**
 * @param {D1Database} db
 * @param {any[]} rawEvents
 * @returns {Promise<{ok:boolean,inserted:number,upserted:number,skipped:number}>}
 */
export async function ingestItemTelemetryBatch(db, rawEvents) {
  if (!db) return { ok: false, inserted: 0, upserted: 0, skipped: 0 };
  const list = Array.isArray(rawEvents) ? rawEvents.slice(0, MAX_EVENTS) : [];
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < list.length; i++) {
    const event = normalizeTelemetryEvent(list[i]);
    if (!event) {
      skipped += 1;
      continue;
    }
    await appendTelemetryAndUpsertStats(db, event);
    inserted += 1;
  }
  return { ok: true, inserted, upserted: inserted, skipped };
}
