/**
 * Point-biserial discrimination + extreme p-value flags for item_stats_cache.
 * Ability proxy is an anonymous 0..1 score sent with item telemetry (session
 * accuracy / readiness estimate). No user ids.
 */

const MIN_N = 30;
const MIN_ABILITY_N = 20;

/**
 * Classic point-biserial correlation between a dichotomous item and continuous ability.
 * @param {number[]} abilitiesCorrect
 * @param {number[]} abilitiesIncorrect
 * @returns {number|null}
 */
export function pointBiserialFromGroups(abilitiesCorrect, abilitiesIncorrect) {
  const g1 = (abilitiesCorrect || []).filter((x) => Number.isFinite(x));
  const g0 = (abilitiesIncorrect || []).filter((x) => Number.isFinite(x));
  const n1 = g1.length;
  const n0 = g0.length;
  const n = n1 + n0;
  if (n < MIN_ABILITY_N || n1 < 2 || n0 < 2) return null;

  const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
  const m1 = mean(g1);
  const m0 = mean(g0);
  const all = g1.concat(g0);
  const mu = mean(all);
  let varSum = 0;
  for (let i = 0; i < all.length; i++) {
    const d = all[i] - mu;
    varSum += d * d;
  }
  const s = Math.sqrt(varSum / (n - 1));
  if (!Number.isFinite(s) || s < 1e-9) return null;

  const p = n1 / n;
  const r = ((m1 - m0) / s) * Math.sqrt(p * (1 - p));
  if (!Number.isFinite(r)) return null;
  return Math.max(-1, Math.min(1, r));
}

/**
 * Recompute point_biserial and quality flags for questions with enough samples.
 * @param {D1Database} db
 * @param {{limit?: number}} [opts]
 */
export async function recomputeItemDiscrimination(db, opts) {
  if (!db) return { ok: false, updated: 0, flagged: 0 };
  const limit = Math.min(500, Math.max(1, Number(opts && opts.limit) || 200));

  const rows = await db.prepare(
    `SELECT question_id, sample_size, p_value, distractor_spread, flagged_miskey
     FROM item_stats_cache
     WHERE sample_size >= ?
     ORDER BY last_computed ASC
     LIMIT ?`
  ).bind(MIN_N, limit).all();

  const list = (rows && rows.results) || [];
  let updated = 0;
  let flagged = 0;

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const qid = String(row.question_id || '');
    if (!qid) continue;

    const samples = await db.prepare(
      `SELECT is_correct, ability_proxy FROM item_telemetry
       WHERE question_id = ? AND ability_proxy IS NOT NULL
       ORDER BY id DESC LIMIT 500`
    ).bind(qid).all();

    const events = (samples && samples.results) || [];
    const correct = [];
    const incorrect = [];
    for (let j = 0; j < events.length; j++) {
      const a = Number(events[j].ability_proxy);
      if (!Number.isFinite(a)) continue;
      const clamped = Math.max(0, Math.min(1, a));
      if (Number(events[j].is_correct) === 1) correct.push(clamped);
      else incorrect.push(clamped);
    }

    let pb = pointBiserialFromGroups(correct, incorrect);
    if (pb == null) {
      // Keep prior stub only if we cannot compute; leave column unchanged when null.
      pb = null;
    }

    const p = Number(row.p_value);
    let flaggedMiskey = Number(row.flagged_miskey) === 1 ? 1 : 0;

    // Extreme p or negative discrimination => author review.
    if (Number.isFinite(p) && (p > 0.95 || p < 0.2)) {
      flaggedMiskey = 1;
    }
    if (pb != null && pb < 0) {
      flaggedMiskey = 1;
    }

    // Dominant wrong distractor (same rule as ingest).
    if (Number.isFinite(p) && p < 0.4 && Number(row.sample_size) >= MIN_N) {
      try {
        const spread = JSON.parse(String(row.distractor_spread || '{}'));
        const total = Object.keys(spread).reduce((n, k) => n + (Number(spread[k]) || 0), 0);
        if (total > 0) {
          const dominantShare = Math.max.apply(
            null,
            Object.keys(spread).map((k) => (Number(spread[k]) || 0) / total)
          );
          if (dominantShare > 0.6) flaggedMiskey = 1;
        }
      } catch (_) {
        /* ignore */
      }
    }

    if (flaggedMiskey) flagged += 1;

    if (pb != null) {
      await db.prepare(
        `UPDATE item_stats_cache
         SET point_biserial = ?, flagged_miskey = ?, last_computed = CURRENT_TIMESTAMP
         WHERE question_id = ?`
      ).bind(pb, flaggedMiskey, qid).run();
    } else {
      await db.prepare(
        `UPDATE item_stats_cache
         SET flagged_miskey = ?, last_computed = CURRENT_TIMESTAMP
         WHERE question_id = ?`
      ).bind(flaggedMiskey, qid).run();
    }
    updated += 1;
  }

  return { ok: true, updated, flagged, scanned: list.length };
}
