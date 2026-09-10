/**
 * Provider circuit breaker (Closed / Open / Half-Open).
 * Pattern from fastapi-async: fail soft, cool down, prevent cascade.
 */

const DEFAULTS = {
  failureThreshold: 5,
  coolDownMs: 60_000,
  halfOpenMax: 1
};

/**
 * @param {D1Database|null} db
 */
export async function ensureCircuitTable(db) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS provider_circuit_state (
        provider TEXT PRIMARY KEY,
        state TEXT NOT NULL DEFAULT 'closed',
        failure_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        opened_at INTEGER,
        next_attempt_at INTEGER,
        last_error TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (_) {}
}

export async function getCircuit(db, provider) {
  await ensureCircuitTable(db);
  if (!db) {
    return { provider, state: 'closed', failure_count: 0, next_attempt_at: 0 };
  }
  try {
    const row = await db.prepare(
      'SELECT * FROM provider_circuit_state WHERE provider = ?'
    ).bind(provider).first();
    return row || { provider, state: 'closed', failure_count: 0, next_attempt_at: 0 };
  } catch (_) {
    return { provider, state: 'closed', failure_count: 0, next_attempt_at: 0 };
  }
}

export async function canCallProvider(db, provider, now = Date.now()) {
  const circuit = await getCircuit(db, provider);
  const state = String(circuit.state || 'closed').toLowerCase();
  if (state === 'open') {
    const next = Number(circuit.next_attempt_at || 0);
    if (now >= next) {
      return { allowed: true, circuit, halfOpen: true };
    }
    return {
      allowed: false,
      circuit,
      retryAfterMs: Math.max(0, next - now),
      reason: 'CIRCUIT_OPEN'
    };
  }
  return { allowed: true, circuit, halfOpen: state === 'half_open' };
}

export async function recordProviderSuccess(db, provider) {
  await ensureCircuitTable(db);
  if (!db) return;
  try {
    await db.prepare(`
      INSERT INTO provider_circuit_state (provider, state, failure_count, success_count, opened_at, next_attempt_at, last_error, updated_at)
      VALUES (?, 'closed', 0, 1, NULL, NULL, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT(provider) DO UPDATE SET
        state = 'closed',
        failure_count = 0,
        success_count = COALESCE(provider_circuit_state.success_count, 0) + 1,
        opened_at = NULL,
        next_attempt_at = NULL,
        last_error = NULL,
        updated_at = CURRENT_TIMESTAMP
    `).bind(provider).run();
  } catch (e) {
    console.debug('circuit success write skipped:', e.message);
  }
}

export async function recordProviderFailure(db, provider, errorMessage, opts = {}) {
  await ensureCircuitTable(db);
  if (!db) return { state: 'closed' };
  const threshold = opts.failureThreshold || DEFAULTS.failureThreshold;
  const coolDownMs = opts.coolDownMs || DEFAULTS.coolDownMs;
  const now = Date.now();

  try {
    const current = await getCircuit(db, provider);
    const failures = Number(current.failure_count || 0) + 1;
    const open = failures >= threshold;
    const state = open ? 'open' : 'closed';
    const nextAttempt = open ? now + coolDownMs : null;
    const openedAt = open ? (current.opened_at || now) : null;

    await db.prepare(`
      INSERT INTO provider_circuit_state (provider, state, failure_count, success_count, opened_at, next_attempt_at, last_error, updated_at)
      VALUES (?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(provider) DO UPDATE SET
        state = excluded.state,
        failure_count = excluded.failure_count,
        opened_at = excluded.opened_at,
        next_attempt_at = excluded.next_attempt_at,
        last_error = excluded.last_error,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      provider,
      state,
      failures,
      openedAt,
      nextAttempt,
      String(errorMessage || 'error').slice(0, 500)
    ).run();

    return { state, failure_count: failures, next_attempt_at: nextAttempt };
  } catch (e) {
    console.debug('circuit failure write skipped:', e.message);
    return { state: 'closed' };
  }
}

export async function listCircuits(db) {
  await ensureCircuitTable(db);
  if (!db) return [];
  try {
    const res = await db.prepare('SELECT * FROM provider_circuit_state').all();
    return (res && res.results) || [];
  } catch (_) {
    return [];
  }
}

/**
 * Wrap a provider executor with circuit checks.
 */
export async function withCircuit(db, provider, executor) {
  const gate = await canCallProvider(db, provider);
  if (!gate.allowed) {
    return {
      ok: false,
      skipped: true,
      reason: gate.reason,
      retryAfterMs: gate.retryAfterMs,
      result: null
    };
  }
  try {
    const result = await executor();
    if (result) {
      await recordProviderSuccess(db, provider);
      return { ok: true, result };
    }
    await recordProviderFailure(db, provider, 'empty_result');
    return { ok: false, result: null, reason: 'EMPTY_RESULT' };
  } catch (err) {
    await recordProviderFailure(db, provider, err && err.message);
    return { ok: false, result: null, reason: 'PROVIDER_ERROR', error: err && err.message };
  }
}
