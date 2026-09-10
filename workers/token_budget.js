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

export async function readBudgetState(db, telegramId) {
  await ensureBudgetColumns(db);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  if (!db || !telegramId) {
    return {
      tokensToday: 0,
      tokensMonth: 0,
      callsToday: 0,
      today,
      month
    };
  }
  try {
    const user = await db.prepare(
      'SELECT ai_tokens_used_today, ai_tokens_last_date, ai_tokens_used_month, ai_tokens_month, ai_calls_used_today, ai_calls_last_date FROM telegram_users WHERE telegram_id = ?'
    ).bind(telegramId).first();
    if (!user) {
      return { tokensToday: 0, tokensMonth: 0, callsToday: 0, today, month };
    }
    const tokensToday = user.ai_tokens_last_date === today ? (user.ai_tokens_used_today || 0) : 0;
    const tokensMonth = user.ai_tokens_month === month ? (user.ai_tokens_used_month || 0) : 0;
    const callsToday = user.ai_calls_last_date === today ? (user.ai_calls_used_today || 0) : 0;
    return { tokensToday, tokensMonth, callsToday, today, month };
  } catch (_) {
    return { tokensToday: 0, tokensMonth: 0, callsToday: 0, today, month };
  }
}

export async function assertWithinBudget(db, telegramId, tier) {
  const policy = getTierPolicy(tier);
  const state = await readBudgetState(db, telegramId);
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

export async function consumeBudget(db, telegramId, tokensUsed, tier) {
  await ensureBudgetColumns(db);
  if (!db || !telegramId) return null;
  const policy = getTierPolicy(tier);
  const state = await readBudgetState(db, telegramId);
  const nextTokensToday = state.tokensToday + Math.max(0, Number(tokensUsed) || 0);
  const nextTokensMonth = state.tokensMonth + Math.max(0, Number(tokensUsed) || 0);
  const nextCalls = state.callsToday + 1;

  try {
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
  } catch (e) {
    console.debug('budget consume skipped:', e.message);
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
