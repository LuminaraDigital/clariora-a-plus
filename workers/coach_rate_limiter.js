/**
 * Per-user / per-IP token-bucket rate limiter (Durable Object).
 * Pattern stolen from FastAPI rate-limiter ideas; Cloudflare-native implementation.
 */
export class CoachRateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.replace(/^\//, '') || 'consume';

    if (action === 'ping') {
      return json({ ok: true });
    }

    if (action === 'status') {
      const bucket = (await this.state.storage.get('bucket')) || defaultBucket(10, 60000);
      return json({
        tokens: bucket.tokens,
        capacity: bucket.capacity,
        refillPerMs: bucket.refillPerMs,
        lastRefill: bucket.lastRefill
      });
    }

    // POST /consume?capacity=10&windowMs=60000&cost=1
    const capacity = clampInt(url.searchParams.get('capacity'), 1, 1000, 10);
    const windowMs = clampInt(url.searchParams.get('windowMs'), 1000, 3600000, 60000);
    const cost = clampInt(url.searchParams.get('cost'), 1, 20, 1);
    const refillPerMs = capacity / windowMs;

    let bucket = await this.state.storage.get('bucket');
    const now = Date.now();
    if (!bucket || bucket.capacity !== capacity) {
      bucket = { tokens: capacity, capacity, refillPerMs, lastRefill: now };
    } else {
      const elapsed = Math.max(0, now - (bucket.lastRefill || now));
      bucket.tokens = Math.min(capacity, (bucket.tokens || 0) + elapsed * refillPerMs);
      bucket.lastRefill = now;
      bucket.capacity = capacity;
      bucket.refillPerMs = refillPerMs;
    }

    if (bucket.tokens < cost) {
      const deficit = cost - bucket.tokens;
      const retryAfterMs = Math.ceil(deficit / refillPerMs);
      await this.state.storage.put('bucket', bucket);
      return json({
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs,
        retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000))
      }, 429);
    }

    bucket.tokens -= cost;
    await this.state.storage.put('bucket', bucket);

    return json({
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: 0,
      retryAfter: 0
    });
  }
}

function defaultBucket(capacity, windowMs) {
  return {
    tokens: capacity,
    capacity,
    refillPerMs: capacity / windowMs,
    lastRefill: Date.now()
  };
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Helper used by the Worker fetch handler.
 * Missing DO binding (local/tests): fail-open so paywall/budget tests still run.
 * DO present but errors: fail-closed in production unless APLUS_RATE_LIMIT_FAIL_OPEN=1.
 */
export async function enforceCoachRateLimit(env, key, capacityPerMinute) {
  const failOpen = !!(env && (env.APLUS_RATE_LIMIT_FAIL_OPEN === '1' || env.APLUS_RATE_LIMIT_FAIL_OPEN === true));
  if (!env || !env.COACH_RATE_LIMITER || !key) {
    return { allowed: true, remaining: capacityPerMinute, degraded: true, reason: 'RATE_LIMITER_UNBOUND' };
  }
  try {
    const id = env.COACH_RATE_LIMITER.idFromName(String(key));
    const stub = env.COACH_RATE_LIMITER.get(id);
    const capacity = Math.max(1, Number(capacityPerMinute) || 10);
    const res = await stub.fetch(
      `https://rate-limiter/consume?capacity=${capacity}&windowMs=60000&cost=1`,
      { method: 'POST' }
    );
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data.allowed === false) {
      return {
        allowed: false,
        remaining: data.remaining || 0,
        retryAfter: data.retryAfter || 60,
        retryAfterMs: data.retryAfterMs || 60000
      };
    }
    return {
      allowed: true,
      remaining: data.remaining != null ? data.remaining : capacity,
      retryAfter: 0
    };
  } catch (err) {
    console.warn('Rate limiter error:', err && err.message);
    if (failOpen) {
      return { allowed: true, remaining: capacityPerMinute, degraded: true };
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfter: 30,
      retryAfterMs: 30000,
      degraded: true,
      reason: 'RATE_LIMITER_ERROR'
    };
  }
}
