/**
 * Hard daily/monthly token budgets per Stars/TON tier.
 */

import { getTierPolicy, normalizeTier } from './tier_policy.js';

export async function ensureBudgetColumns(db) {
  if (!db) return;
  const alters = [
    'ALTER TABLE telegram_users ADD COLUMN ai_tokens_used_today INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE telegram_users ADD COLUMN ai_tokens_last_date TEXT',
    'ALTER TABLE telegram_users ADD COLUMN ai_tokens_used_month INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE telegram_users ADD COLUMN ai_tokens_month TEXT',
    'ALTER TABLE telegram_users ADD COLUMN ai_calls_used_today INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE telegram_users ADD COLUMN ai_calls_last_date TEXT'
  ];
  for (const sql of alters) {
    try { await db.prepare(sql).run(); } catch (_) {}
  }
  const authAlters = [
    'ALTER TABLE auth_accounts ADD COLUMN ai_tokens_used_today INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE auth_accounts ADD COLUMN ai_tokens_last_date TEXT',
    'ALTER TABLE auth_accounts ADD COLUMN ai_tokens_used_month INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE auth_accounts ADD COLUMN ai_tokens_month TEXT',
    'ALTER TABLE auth_accounts ADD COLUMN ai_calls_used_today INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE auth_accounts ADD COLUMN ai_calls_last_date TEXT'
  ];
  for (const sql of authAlters) {
    try { await db.prepare(sql).run(); } catch (_) {}
  }
}

export function estimateTokensFromText(systemPrompt, userMessage, completionText) {
  const chars = String(systemPrompt || '').length +
    String(userMessage || '').length +
    String(completionText || '').length;
  // ~4 chars/token heuristic + small overhead
  return Math.max(32, Math.ceil(chars / 4) + 24);
}

export function extractUsageTokens(providerPayload, fallbackEstimate) {
  if (providerPayload && providerPayload.usage) {
    const u = providerPayload.usage;
    const total = Number(u.total_tokens) ||
      ((Number(u.prompt_tokens) || 0) + (Number(u.completion_tokens) || 0));
    if (total > 0) return total;
  }
  return fallbackEstimate;
}

export async function readBudgetState(db, userRef) {
  await ensureBudgetColumns(db);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const defaultState = { tokensToday: 0, tokensMonth: 0, callsToday: 0, today, month };
  if (!db || !userRef) return defaultState;

  const telegramId = (typeof userRef === 'object' ? userRef.telegramId : (typeof userRef === 'number' || /^\d+$/.test(String(userRef))) ? Number(userRef) : null);
  const firebaseUid = (typeof userRef === 'object' ? userRef.firebaseUid : (typeof userRef === 'string' && !/^\d+$/.test(userRef)) ? userRef : null);

  try {
    let user = null;
    if (telegramId) {
      user = await db.prepare(
        'SELECT ai_tokens_used_today, ai_tokens_last_date, ai_tokens_used_month, ai_tokens_month, ai_calls_used_today, ai_calls_last_date FROM telegram_users WHERE telegram_id = ?'
      ).bind(telegramId).first();
    } else if (firebaseUid) {
      user = await db.prepare(
        'SELECT ai_tokens_used_today, ai_tokens_last_date, ai_tokens_used_month, ai_tokens_month, ai_calls_used_today, ai_calls_last_date FROM auth_accounts WHERE uid = ?'
      ).bind(firebaseUid).first();
    }
    if (!user) return defaultState;

    const tokensToday = user.ai_tokens_last_date === today ? (user.ai_tokens_used_today || 0) : 0;
    const tokensMonth = user.ai_tokens_month === month ? (user.ai_tokens_used_month || 0) : 0;
    const callsToday = user.ai_calls_last_date === today ? (user.ai_calls_used_today || 0) : 0;
    return { tokensToday, tokensMonth, callsToday, today, month };
  } catch (_) {
    return defaultState;
  }
}

/**
 * Splits the polymorphic userRef into its two possible identities.
 * Accepts { telegramId, firebaseUid }, a numeric Telegram id, or a Firebase uid.
 */
function splitUserRef(userRef) {
  if (userRef && typeof userRef === 'object') {
    return {
      telegramId: userRef.telegramId != null ? Number(userRef.telegramId) : null,
      firebaseUid: userRef.firebaseUid || null
    };
  }
  if (typeof userRef === 'number' || /^\d+$/.test(String(userRef))) {
    return { telegramId: Number(userRef), firebaseUid: null };
  }
  return { telegramId: null, firebaseUid: userRef ? String(userRef) : null };
}

/**
 * ATOMIC PRE-FLIGHT RESERVATION.
 *
 * assertWithinBudget() below reads the counters and consumeBudget() writes them
 * after the model has already answered. That leaves two ways to overspend:
 *
 *   1. Time-of-check/time-of-use. Fifty concurrent requests all read
 *      "tokensToday = 0", all pass the check, and all call the model. The cap
 *      is enforced against a snapshot that every one of them shares.
 *   2. Lost updates. consumeBudget does SELECT-then-UPDATE with the new total
 *      computed in JavaScript, so concurrent settlements overwrite each other
 *      and the recorded spend is the last writer's value, not the sum.
 *
 * This function closes both by making the check and the increment a single
 * conditional UPDATE. SQLite (and therefore D1) applies one statement
 * atomically, so the WHERE clause is evaluated against the same row state the
 * SET clause mutates. A caller that loses the race gets changes === 0 and is
 * rejected before any third-party API is invoked.
 *
 * The reservation is charged up front at an estimated cost and reconciled to
 * the real usage by settleBudget(). Reserving first means an in-flight request
 * is already counted against the budget, so a burst cannot outrun its own
 * accounting.
 *
 * Returns { ok, reserved, state, policy, error?, message? }.
 */
export async function reserveBudget(db, userRef, tier, estimatedTokens) {
  const policy = getTierPolicy(tier);
  const reserve = Math.max(1, Math.ceil(Number(estimatedTokens) || 0) || 512);

  if (!db || !userRef) {
    // No store to meter against. Fail closed on the paid rails: an
    // unmeterable request is an unbounded one.
    return {
      ok: false,
      reserved: 0,
      error: 'BUDGET_STORE_UNAVAILABLE',
      message: 'AI budget accounting is temporarily unavailable. Please retry shortly.',
      state: { tokensToday: 0, tokensMonth: 0, callsToday: 0 },
      policy
    };
  }

  await ensureBudgetColumns(db);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const { telegramId, firebaseUid } = splitUserRef(userRef);

  const table = telegramId ? 'telegram_users' : 'auth_accounts';
  const idColumn = telegramId ? 'telegram_id' : 'uid';
  const idValue = telegramId || firebaseUid;
  if (!idValue) {
    return {
      ok: false,
      reserved: 0,
      error: 'BUDGET_IDENTITY_MISSING',
      message: 'Cannot meter this request: no verified caller identity.',
      state: { tokensToday: 0, tokensMonth: 0, callsToday: 0 },
      policy
    };
  }

  // Window rollover is expressed inline so a stale date resets the counter in
  // the same statement, rather than needing a separate read to decide.
  const tokensTodayExpr = `(CASE WHEN ai_tokens_last_date = ? THEN COALESCE(ai_tokens_used_today, 0) ELSE 0 END)`;
  const tokensMonthExpr = `(CASE WHEN ai_tokens_month = ? THEN COALESCE(ai_tokens_used_month, 0) ELSE 0 END)`;
  const callsTodayExpr = `(CASE WHEN ai_calls_last_date = ? THEN COALESCE(ai_calls_used_today, 0) ELSE 0 END)`;

  const sql = `
    UPDATE ${table} SET
      ai_tokens_used_today = ${tokensTodayExpr} + ?,
      ai_tokens_last_date = ?,
      ai_tokens_used_month = ${tokensMonthExpr} + ?,
      ai_tokens_month = ?,
      ai_calls_used_today = ${callsTodayExpr} + 1,
      ai_calls_last_date = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE ${idColumn} = ?
      AND ${callsTodayExpr} < ?
      AND ${tokensTodayExpr} + ? <= ?
      AND ${tokensMonthExpr} + ? <= ?
  `;

  try {
    const res = await db.prepare(sql).bind(
      // SET clause
      today, reserve,
      today,
      month, reserve,
      month,
      today,
      today,
      // WHERE clause
      idValue,
      today, policy.freeCoachCallsPerDay,
      today, reserve, policy.dailyTokenBudget,
      month, reserve, policy.monthlyTokenBudget
    ).run();

    const changes = res && res.meta && typeof res.meta.changes === 'number' ? res.meta.changes : 0;

    if (changes > 0) {
      const state = await readBudgetState(db, userRef);
      return { ok: true, reserved: reserve, state, policy };
    }

    // Zero rows changed. Either the caller is over budget, or the row does not
    // exist yet. Read once to tell the two apart and produce an honest error.
    const state = await readBudgetState(db, userRef);

    if (state.callsToday >= policy.freeCoachCallsPerDay) {
      return {
        ok: false,
        reserved: 0,
        error: 'DAILY_CALL_BUDGET_EXHAUSTED',
        message: `Daily coach call budget reached (${policy.freeCoachCallsPerDay}). Upgrade via Telegram Stars or TON for a higher hard cap.`,
        state,
        policy
      };
    }
    if (state.tokensToday + reserve > policy.dailyTokenBudget) {
      return {
        ok: false,
        reserved: 0,
        error: 'DAILY_TOKEN_BUDGET_EXHAUSTED',
        message: `Daily AI token budget reached (${policy.dailyTokenBudget}). This protects both you and Clariora from runaway spend.`,
        state,
        policy
      };
    }
    if (state.tokensMonth + reserve > policy.monthlyTokenBudget) {
      return {
        ok: false,
        reserved: 0,
        error: 'MONTHLY_TOKEN_BUDGET_EXHAUSTED',
        message: `Monthly AI token budget reached (${policy.monthlyTokenBudget}).`,
        state,
        policy
      };
    }

    // Under budget but no row matched: the account row is missing. Create it
    // with the reservation already applied, then let the request proceed.
    const inserted = await insertReservationRow(db, { telegramId, firebaseUid }, {
      reserve, today, month
    });
    if (inserted) {
      return { ok: true, reserved: reserve, state: await readBudgetState(db, userRef), policy };
    }

    return {
      ok: false,
      reserved: 0,
      error: 'BUDGET_RESERVATION_FAILED',
      message: 'Could not reserve AI budget for this request. Please retry.',
      state,
      policy
    };
  } catch (err) {
    console.warn('reserveBudget failed - failing closed:', err && err.message);
    // Fail closed. An accounting outage must not become an unmetered spend
    // window on a third-party API we pay for by the token.
    return {
      ok: false,
      reserved: 0,
      error: 'BUDGET_STORE_ERROR',
      message: 'AI budget accounting is temporarily unavailable. Please retry shortly.',
      state: { tokensToday: 0, tokensMonth: 0, callsToday: 0 },
      policy
    };
  }
}

async function insertReservationRow(db, { telegramId, firebaseUid }, { reserve, today, month }) {
  try {
    if (telegramId) {
      await db.prepare(`
        INSERT INTO telegram_users (
          telegram_id, ai_tokens_used_today, ai_tokens_last_date,
          ai_tokens_used_month, ai_tokens_month,
          ai_calls_used_today, ai_calls_last_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(telegram_id) DO UPDATE SET
          ai_tokens_used_today = COALESCE(telegram_users.ai_tokens_used_today, 0) + excluded.ai_tokens_used_today,
          ai_tokens_last_date = excluded.ai_tokens_last_date,
          ai_tokens_used_month = COALESCE(telegram_users.ai_tokens_used_month, 0) + excluded.ai_tokens_used_month,
          ai_tokens_month = excluded.ai_tokens_month,
          ai_calls_used_today = COALESCE(telegram_users.ai_calls_used_today, 0) + 1,
          ai_calls_last_date = excluded.ai_calls_last_date,
          updated_at = CURRENT_TIMESTAMP
      `).bind(telegramId, reserve, today, reserve, month, today).run();
      return true;
    }
    if (firebaseUid) {
      // auth_accounts rows are created by the auth flow. If one is genuinely
      // missing the caller is not a recognised account, so do not conjure one
      // here: that would hand an unknown uid a fresh budget.
      return false;
    }
  } catch (err) {
    console.warn('insertReservationRow failed:', err && err.message);
  }
  return false;
}

/**
 * Reconciles a reservation against what the provider actually charged.
 *
 * delta may be negative (the estimate over-reserved) or positive (the model ran
 * longer than predicted). Applied as a single relative UPDATE so concurrent
 * settlements sum instead of overwriting.
 *
 * The daily/monthly date guards mean a settlement that lands after midnight is
 * dropped rather than charged against the new day's fresh budget.
 */
export async function settleBudget(db, userRef, reservedTokens, actualTokens, tier) {
  const policy = getTierPolicy(tier);
  if (!db || !userRef) return null;

  const reserved = Math.max(0, Number(reservedTokens) || 0);
  const actual = Math.max(0, Number(actualTokens) || 0);
  const delta = actual - reserved;

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const { telegramId, firebaseUid } = splitUserRef(userRef);
  const table = telegramId ? 'telegram_users' : 'auth_accounts';
  const idColumn = telegramId ? 'telegram_id' : 'uid';
  const idValue = telegramId || firebaseUid;

  if (delta !== 0 && idValue) {
    try {
      await db.prepare(`
        UPDATE ${table} SET
          ai_tokens_used_today = MAX(0, COALESCE(ai_tokens_used_today, 0) + ?),
          ai_tokens_used_month = MAX(0, COALESCE(ai_tokens_used_month, 0) + ?),
          updated_at = CURRENT_TIMESTAMP
        WHERE ${idColumn} = ?
          AND ai_tokens_last_date = ?
          AND ai_tokens_month = ?
      `).bind(delta, delta, idValue, today, month).run();
    } catch (err) {
      // A failed settlement leaves the reservation standing, which over-counts
      // slightly. That is the correct direction to be wrong in.
      console.warn('settleBudget adjustment failed:', err && err.message);
    }
  }

  const state = await readBudgetState(db, userRef);
  return {
    tokensToday: state.tokensToday,
    tokensMonth: state.tokensMonth,
    callsToday: state.callsToday,
    dailyTokenBudget: policy.dailyTokenBudget,
    monthlyTokenBudget: policy.monthlyTokenBudget,
    dailyCallBudget: policy.freeCoachCallsPerDay,
    dailyTokensRemaining: Math.max(0, policy.dailyTokenBudget - state.tokensToday),
    monthlyTokensRemaining: Math.max(0, policy.monthlyTokenBudget - state.tokensMonth),
    dailyCallsRemaining: Math.max(0, policy.freeCoachCallsPerDay - state.callsToday),
    tier: normalizeTier(tier)
  };
}

/**
 * Read-only budget check.
 *
 * DEPRECATED for gating paid work: this is a snapshot read, so it cannot stop
 * concurrent callers from all passing it. Use reserveBudget() to gate anything
 * that spends money. Retained for read-only surfaces (quota badges, upsell
 * copy) that just want to display the current state.
 */
export async function assertWithinBudget(db, userRef, tier) {
  const policy = getTierPolicy(tier);
  const state = await readBudgetState(db, userRef);
  if (state.callsToday >= policy.freeCoachCallsPerDay) {
    return {
      ok: false,
      error: 'DAILY_CALL_BUDGET_EXHAUSTED',
      message: `Daily coach call budget reached (${policy.freeCoachCallsPerDay}). Upgrade via Telegram Stars or TON for a higher hard cap.`,
      state,
      policy
    };
  }
  if (state.tokensToday >= policy.dailyTokenBudget) {
    return {
      ok: false,
      error: 'DAILY_TOKEN_BUDGET_EXHAUSTED',
      message: `Daily AI token budget reached (${policy.dailyTokenBudget}). This protects both you and Clariora from runaway spend.`,
      state,
      policy
    };
  }
  if (state.tokensMonth >= policy.monthlyTokenBudget) {
    return {
      ok: false,
      error: 'MONTHLY_TOKEN_BUDGET_EXHAUSTED',
      message: `Monthly AI token budget reached (${policy.monthlyTokenBudget}).`,
      state,
      policy
    };
  }
  return { ok: true, state, policy };
}

/**
 * DEPRECATED: read-modify-write, so concurrent calls lose updates. Kept for
 * any caller that still settles without a prior reservation. New code should
 * pair reserveBudget() with settleBudget().
 */
export async function consumeBudget(db, userRef, tokensUsed, tier) {
  await ensureBudgetColumns(db);
  if (!db || !userRef) return null;
  const policy = getTierPolicy(tier);
  const state = await readBudgetState(db, userRef);
  const nextTokensToday = state.tokensToday + Math.max(0, Number(tokensUsed) || 0);
  const nextTokensMonth = state.tokensMonth + Math.max(0, Number(tokensUsed) || 0);
  const nextCalls = state.callsToday + 1;

  const telegramId = (typeof userRef === 'object' ? userRef.telegramId : (typeof userRef === 'number' || /^\d+$/.test(String(userRef))) ? Number(userRef) : null);
  const firebaseUid = (typeof userRef === 'object' ? userRef.firebaseUid : (typeof userRef === 'string' && !/^\d+$/.test(userRef)) ? userRef : null);

  try {
    if (telegramId) {
      const updated = await db.prepare(`
        UPDATE telegram_users SET
          ai_tokens_used_today = ?,
          ai_tokens_last_date = ?,
          ai_tokens_used_month = ?,
          ai_tokens_month = ?,
          ai_calls_used_today = ?,
          ai_calls_last_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
      `).bind(
        nextTokensToday,
        state.today,
        nextTokensMonth,
        state.month,
        nextCalls,
        state.today,
        telegramId
      ).run();

      const changes = updated && updated.meta && typeof updated.meta.changes === 'number'
        ? updated.meta.changes
        : 1;
      if (!changes) {
        await db.prepare(`
          INSERT INTO telegram_users (
            telegram_id, ai_tokens_used_today, ai_tokens_last_date,
            ai_tokens_used_month, ai_tokens_month,
            ai_calls_used_today, ai_calls_last_date, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(telegram_id) DO UPDATE SET
            ai_tokens_used_today = excluded.ai_tokens_used_today,
            ai_tokens_last_date = excluded.ai_tokens_last_date,
            ai_tokens_used_month = excluded.ai_tokens_used_month,
            ai_tokens_month = excluded.ai_tokens_month,
            ai_calls_used_today = excluded.ai_calls_used_today,
            ai_calls_last_date = excluded.ai_calls_last_date,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          telegramId,
          nextTokensToday,
          state.today,
          nextTokensMonth,
          state.month,
          nextCalls,
          state.today
        ).run();
      }
    } else if (firebaseUid) {
      await db.prepare(`
        UPDATE auth_accounts SET
          ai_tokens_used_today = ?,
          ai_tokens_last_date = ?,
          ai_tokens_used_month = ?,
          ai_tokens_month = ?,
          ai_calls_used_today = ?,
          ai_calls_last_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE uid = ?
      `).bind(
        nextTokensToday,
        state.today,
        nextTokensMonth,
        state.month,
        nextCalls,
        state.today,
        firebaseUid
      ).run();
    }
  } catch (e) {
    console.debug('Failed to commit token budget usage:', e);
  }

  return {
    tokensToday: nextTokensToday,
    tokensMonth: nextTokensMonth,
    callsToday: nextCalls,
    dailyTokenBudget: policy.dailyTokenBudget,
    monthlyTokenBudget: policy.monthlyTokenBudget,
    dailyCallBudget: policy.freeCoachCallsPerDay,
    dailyTokensRemaining: Math.max(0, policy.dailyTokenBudget - nextTokensToday),
    monthlyTokensRemaining: Math.max(0, policy.monthlyTokenBudget - nextTokensMonth),
    dailyCallsRemaining: Math.max(0, policy.freeCoachCallsPerDay - nextCalls),
    tier: normalizeTier(tier)
  };
}
