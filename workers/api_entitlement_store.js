/** D1 entitlement and free-AI usage helpers. */
export async function resolveUserEntitlement(telegramId, db) {
  const defaultEntitlement = {
    tier: 'free',
    freeUsedToday: 0,
    trialStartedAt: Date.now(),
    trialDaysRemaining: 14,
    proPreviewTokensRemaining: 3
  };

  if (!telegramId || !db) {
    return defaultEntitlement;
  }

  try {
    const user = await db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').bind(telegramId).first();
    if (!user) {
      return defaultEntitlement;
    }

    // Check expiry
    let tier = user.tier || 'free';
    if (user.tier_expires_at && user.tier_expires_at < Date.now()) {
      tier = 'free';
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const freeUsed = user.free_ai_last_date === todayStr ? (user.free_ai_used_today || 0) : 0;
    const trialStartedAt = user.trial_started_at || (user.created_at ? new Date(user.created_at).getTime() : Date.now());
    const trialDaysRemaining = Math.max(0, Math.ceil((trialStartedAt + 14 * 86400000 - Date.now()) / 86400000));
    const proPreviewTokens = typeof user.pro_preview_tokens_remaining === 'number' ? user.pro_preview_tokens_remaining : 3;

    return {
      tier,
      freeUsedToday: freeUsed,
      trialStartedAt,
      trialDaysRemaining,
      proPreviewTokensRemaining: proPreviewTokens,
      user
    };
  } catch (e) {
    return defaultEntitlement;
  }
}

/**
 * Updates daily AI quota counter
 */
export async function incrementFreeAiUsage(telegramId, newCount, todayStr, db) {
  if (!telegramId || !db) return;
  try {
    await db.prepare(`
      INSERT INTO telegram_users (telegram_id, free_ai_used_today, free_ai_last_date, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_id) DO UPDATE SET
        free_ai_used_today = excluded.free_ai_used_today,
        free_ai_last_date = excluded.free_ai_last_date,
        updated_at = CURRENT_TIMESTAMP
    `).bind(telegramId, newCount, todayStr).run();
  } catch (e) {
    console.debug('Failed to update free quota:', e);
  }
}

export async function ensureAuthAccountAiColumns(db) {
  if (!db) return;
  const alters = [
    'ALTER TABLE auth_accounts ADD COLUMN free_ai_used_today INTEGER DEFAULT 0',
    'ALTER TABLE auth_accounts ADD COLUMN free_ai_last_date TEXT',
    'ALTER TABLE auth_accounts ADD COLUMN tier TEXT DEFAULT \'free\'',
    'ALTER TABLE auth_accounts ADD COLUMN tier_expires_at INTEGER'
  ];
  for (const sql of alters) {
    try { await db.prepare(sql).run(); } catch (_) {}
  }
}

export async function resolveFirebaseEntitlement(uid, db) {
  const defaultEntitlement = {
    tier: 'free',
    freeUsedToday: 0,
    trialStartedAt: Date.now(),
    trialDaysRemaining: 14,
    proPreviewTokensRemaining: 0
  };
  if (!uid || !db) return defaultEntitlement;
  try {
    await ensureAuthAccountAiColumns(db);
    const row = await db.prepare('SELECT * FROM auth_accounts WHERE uid = ?').bind(uid).first();
    if (!row) return defaultEntitlement;
    let tier = row.tier || 'free';
    if (row.tier_expires_at && row.tier_expires_at < Date.now()) tier = 'free';
    const todayStr = new Date().toISOString().slice(0, 10);
    const freeUsed = row.free_ai_last_date === todayStr ? (row.free_ai_used_today || 0) : 0;
    return {
      tier,
      freeUsedToday: freeUsed,
      trialStartedAt: Date.now(),
      trialDaysRemaining: 14,
      proPreviewTokensRemaining: 0,
      user: row
    };
  } catch (_) {
    return defaultEntitlement;
  }
}

export async function incrementFirebaseFreeAiUsage(uid, newCount, todayStr, db) {
  if (!uid || !db) return;
  try {
    await ensureAuthAccountAiColumns(db);
    await db.prepare(`
      UPDATE auth_accounts
      SET free_ai_used_today = ?, free_ai_last_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uid = ?
    `).bind(newCount, todayStr, uid).run();
  } catch (e) {
    console.debug('Failed to update Firebase free quota:', e);
  }
}

/**
 * Decrements complimentary Pro preview token count
 */
export async function decrementProPreviewTokens(telegramId, currentCount, db) {
  if (!telegramId || !db || currentCount <= 0) return;
  try {
    const nextCount = Math.max(0, currentCount - 1);
    await db.prepare(`
      UPDATE telegram_users SET pro_preview_tokens_remaining = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
    `).bind(nextCount, telegramId).run();
  } catch (e) {
    console.debug('Failed to decrement pro preview tokens:', e);
  }
}

// =========================================================================
// AI Provider Implementations (NVIDIA NIM, Ollama, OpenRouter, Groq, Workers AI)
// =========================================================================

/**
 * NVIDIA NIM Inference Provider
 */
