/**
 * tools/mock_d1_budget.js
 *
 * Shared test fixture: teaches the in-memory MockD1 classes about the AI token
 * budget statements in workers/token_budget.js.
 *
 * Those statements are deliberately not simple upserts. reserveBudget() gates
 * the increment on a WHERE clause so the check and the debit happen in one
 * atomic statement, and it reads `meta.changes` to learn whether it won. A mock
 * that returns `{ success: true }` with no `meta` makes every reservation look
 * like a miss, so the counters never move and the fixture silently stops
 * modelling the thing under test.
 *
 * This helper applies the same semantics in JavaScript, including the daily and
 * monthly window rollover, so quota assertions in the TMA suites stay honest.
 *
 * Real atomicity is verified against an actual SQLite engine in
 * tools/test_rate_limit_defense.js; this file only keeps the legacy mocks
 * behaviourally faithful.
 */
'use strict';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Applies a token_budget.js statement against a Map-backed user store.
 *
 * @param {Map} store        keyed by telegram id
 * @param {string} sql
 * @param {Array} params     bound parameters, in order
 * @returns {{handled: boolean, changes: number}}
 */
function applyBudgetSql(store, sql, params) {
  const isBudgetStatement =
    sql.includes('ai_tokens_used_today') ||
    sql.includes('ai_calls_used_today');

  if (!isBudgetStatement) return { handled: false, changes: 0 };

  // --- ALTER TABLE ... ADD COLUMN probes: no-ops against an object store.
  if (sql.trim().toUpperCase().startsWith('ALTER TABLE')) {
    return { handled: true, changes: 0 };
  }

  // --- reserveBudget(): conditional UPDATE, 17 bound params.
  //     [today, reserve, today, month, reserve, month, today, today,
  //      id, today, callBudget, today, reserve, dailyBudget,
  //      month, reserve, monthlyBudget]
  if (sql.includes('UPDATE') && params.length === 17) {
    const today = params[0];
    const reserve = num(params[1]);
    const month = params[3];
    const id = params[8];
    const callBudget = num(params[10]);
    const dailyBudget = num(params[13]);
    const monthlyBudget = num(params[16]);

    const row = store.get(id);
    if (!row) return { handled: true, changes: 0 };

    // Window rollover, exactly as the CASE expressions in the SQL do it.
    const tokensToday = row.ai_tokens_last_date === today ? num(row.ai_tokens_used_today) : 0;
    const tokensMonth = row.ai_tokens_month === month ? num(row.ai_tokens_used_month) : 0;
    const callsToday = row.ai_calls_last_date === today ? num(row.ai_calls_used_today) : 0;

    const withinCalls = callsToday < callBudget;
    const withinDaily = tokensToday + reserve <= dailyBudget;
    const withinMonthly = tokensMonth + reserve <= monthlyBudget;

    if (!withinCalls || !withinDaily || !withinMonthly) {
      return { handled: true, changes: 0 };
    }

    store.set(id, Object.assign({}, row, {
      ai_tokens_used_today: tokensToday + reserve,
      ai_tokens_last_date: today,
      ai_tokens_used_month: tokensMonth + reserve,
      ai_tokens_month: month,
      ai_calls_used_today: callsToday + 1,
      ai_calls_last_date: today
    }));
    return { handled: true, changes: 1 };
  }

  // --- settleBudget(): relative adjustment, 5 bound params.
  //     [delta, delta, id, today, month]
  if (sql.includes('UPDATE') && params.length === 5) {
    const delta = num(params[0]);
    const id = params[2];
    const today = params[3];
    const month = params[4];

    const row = store.get(id);
    if (!row) return { handled: true, changes: 0 };
    // The SQL guards on the date columns so a settlement landing after midnight
    // is dropped rather than charged to the new day.
    if (row.ai_tokens_last_date !== today || row.ai_tokens_month !== month) {
      return { handled: true, changes: 0 };
    }

    store.set(id, Object.assign({}, row, {
      ai_tokens_used_today: Math.max(0, num(row.ai_tokens_used_today) + delta),
      ai_tokens_used_month: Math.max(0, num(row.ai_tokens_used_month) + delta)
    }));
    return { handled: true, changes: 1 };
  }

  // --- insertReservationRow(): first-use upsert, 6 bound params.
  //     [id, reserve, today, reserve, month, today]
  if (sql.includes('INSERT INTO telegram_users') && params.length === 6) {
    const id = params[0];
    const reserve = num(params[1]);
    const today = params[2];
    const month = params[4];

    const existing = store.get(id) || { telegram_id: id };
    const tokensToday = existing.ai_tokens_last_date === today ? num(existing.ai_tokens_used_today) : 0;
    const tokensMonth = existing.ai_tokens_month === month ? num(existing.ai_tokens_used_month) : 0;
    const callsToday = existing.ai_calls_last_date === today ? num(existing.ai_calls_used_today) : 0;

    store.set(id, Object.assign({}, existing, {
      telegram_id: id,
      ai_tokens_used_today: tokensToday + reserve,
      ai_tokens_last_date: today,
      ai_tokens_used_month: tokensMonth + reserve,
      ai_tokens_month: month,
      ai_calls_used_today: callsToday + 1,
      ai_calls_last_date: today
    }));
    return { handled: true, changes: 1 };
  }

  // A budget statement we do not recognise. Report it rather than silently
  // succeeding, so a future change to token_budget.js does not quietly
  // invalidate every quota assertion in the suite.
  return { handled: true, changes: 0, unrecognised: true };
}

module.exports = { applyBudgetSql };
