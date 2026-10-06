/**
 * APX integrity flags over the telemetry mirror (admin only).
 *
 * Observe, never punish: nothing here modifies an account. The ledger is
 * client-side, so these rows are what a device reported, not proof of fraud.
 */
import { maskUserRef } from './ai_pricing.js';

/** Mirrors EARN_RULES in ledger_engine.js; keep the two in step. */
export const DAILY_APX_BUDGET = 160;
export const BUDGETED_SOURCES = [
  'EXAM_COMPLETE',
  'STUDY_OPEN',
  'PBQ_COMPLETE',
  'STUDY_PLAN_TASK',
  'DAILY_CHECKIN',
  'DAILY_QUEST_COMPLETE',
  'MEMORY_RECALL',
  'MEMORY_RAID_COMPLETE'
];

/** Sources both arms emit; APX-only UI (store, quests) would bias the comparison. */
export const ACTIVITY_SOURCES = ['EXAM_COMPLETE', 'STUDY_OPEN', 'PBQ_COMPLETE', 'MEMORY_RECALL'];

const Z_95 = 1.959964;
const Z_80_POWER = 0.841621;

export function wilsonInterval(successes, n) {
  if (!n) return [0, 1];
  const p = successes / n;
  const z2 = Z_95 * Z_95;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (Z_95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Users per arm to detect `lift` over `baseline` (two-sided 5%, 80% power). */
export function requiredPerArm(baseline, lift) {
  const p1 = baseline;
  const p2 = baseline + lift;
  const pBar = (p1 + p2) / 2;
  const a = Z_95 * Math.sqrt(2 * pBar * (1 - pBar));
  const b = Z_80_POWER * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil(((a + b) ** 2) / (lift ** 2));
}

/**
 * D7 return: of users whose first activity day is at least 13 days old, the
 * share active again on days 7-13 after it. Verdict stays "inconclusive" until
 * both arms reach the sample needed for a 5-point lift.
 */
export function holdoutVerdict(arms, { baseline = 0.3, lift = 0.05 } = {}) {
  const need = requiredPerArm(baseline, lift);
  const summary = {};
  for (const name of ['apx', 'holdout']) {
    const a = arms[name] || { users: 0, retained: 0 };
    summary[name] = {
      users: a.users,
      retained: a.retained,
      rate: a.users ? a.retained / a.users : null,
      ci95: wilsonInterval(a.retained, a.users)
    };
  }
  const x = summary.apx;
  const y = summary.holdout;
  let diff = null;
  let diffCi95 = null;
  if (x.users && y.users) {
    diff = x.rate - y.rate;
    const se = Math.sqrt((x.rate * (1 - x.rate)) / x.users + (y.rate * (1 - y.rate)) / y.users);
    diffCi95 = [diff - Z_95 * se, diff + Z_95 * se];
  }
  let verdict = 'inconclusive';
  if (x.users >= need && y.users >= need && diffCi95) {
    if (diffCi95[0] > 0) verdict = 'apx_improves_retention';
    else if (diffCi95[1] < 0) verdict = 'apx_hurts_retention';
    else verdict = 'no_detectable_effect';
  }
  return { requiredPerArm: need, assumedBaseline: baseline, minimumLift: lift, arms: summary, diff, diffCi95, verdict };
}

export async function buildHoldoutReport(db, opts = {}) {
  const placeholders = ACTIVITY_SOURCES.map(() => '?').join(', ');
  const rows = (await db.prepare(`
    WITH activity AS (
      SELECT user_id, day, MIN(arm) AS arm, COUNT(DISTINCT arm) AS arms
      FROM apx_events
      WHERE source IN (${placeholders}) AND day IS NOT NULL AND length(day) = 10 AND arm IS NOT NULL
      GROUP BY user_id, day
    ),
    firsts AS (
      -- Arms are assigned per device; an account seen in both arms is contaminated.
      SELECT user_id, MIN(day) AS first_day, MIN(arm) AS arm
      FROM activity
      GROUP BY user_id
      HAVING COUNT(DISTINCT arm) = 1 AND MAX(arms) = 1
    )
    SELECT f.arm AS arm,
           COUNT(*) AS users,
           SUM(CASE WHEN EXISTS (
             SELECT 1 FROM activity a
             WHERE a.user_id = f.user_id
               AND a.day BETWEEN date(f.first_day, '+7 days') AND date(f.first_day, '+13 days')
           ) THEN 1 ELSE 0 END) AS retained
    FROM firsts f
    WHERE f.arm IN ('apx', 'holdout') AND f.first_day <= date('now', '-13 days')
    GROUP BY f.arm
  `).bind(...ACTIVITY_SOURCES).all()).results || [];
  const arms = {};
  for (const r of rows) arms[r.arm] = { users: Number(r.users) || 0, retained: Number(r.retained) || 0 };
  return holdoutVerdict(arms, opts);
}

export async function buildApxAnomalyReport(db, { days = 7 } = {}) {
  const window = Math.min(90, Math.max(1, Math.floor(Number(days) || 7)));
  const since = `-${window} days`;
  const placeholders = BUDGETED_SOURCES.map(() => '?').join(', ');

  const overBudget = (await db.prepare(`
    SELECT user_id, day, SUM(amount) AS budgeted_minted
    FROM apx_events
    WHERE amount > 0 AND source IN (${placeholders}) AND day >= date('now', ?)
    GROUP BY user_id, day
    HAVING SUM(amount) > ?
    ORDER BY budgeted_minted DESC
    LIMIT 50
  `).bind(...BUDGETED_SOURCES, since, DAILY_APX_BUDGET).all()).results || [];

  const suspectSources = (await db.prepare(`
    SELECT source, COUNT(*) AS events, COUNT(DISTINCT user_id) AS users, COALESCE(SUM(amount), 0) AS amount
    FROM apx_events
    WHERE (source LIKE 'TEST%' OR source = 'UNKNOWN') AND created_at >= datetime('now', ?)
    GROUP BY source
    ORDER BY events DESC
  `).bind(since).all()).results || [];

  const totals = (await db.prepare(`
    SELECT COUNT(DISTINCT user_id) AS users, COUNT(*) AS events
    FROM apx_events
    WHERE created_at >= datetime('now', ?)
  `).bind(since).first()) || { users: 0, events: 0 };

  return {
    windowDays: window,
    dailyBudget: DAILY_APX_BUDGET,
    reportingUsers: Number(totals.users) || 0,
    events: Number(totals.events) || 0,
    overBudgetUserDays: overBudget.length,
    overBudget: overBudget.map((r) => ({ ...r, user_id: maskUserRef(r.user_id) })),
    suspectSources
  };
}
