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

    // Time until the bucket is full again, i.e. when the caller's allowance is
    // fully restored. This is what X-RateLimit-Reset advertises.
    const msToFull = Math.ceil(Math.max(0, capacity - bucket.tokens) / refillPerMs);
    const resetAt = Math.ceil((now + msToFull) / 1000);

    if (bucket.tokens < cost) {
      const deficit = cost - bucket.tokens;
      const retryAfterMs = Math.ceil(deficit / refillPerMs);
      await this.state.storage.put('bucket', bucket);
      return json({
        allowed: false,
        limit: capacity,
        remaining: Math.floor(bucket.tokens),
        resetAt,
        retryAfterMs,
        retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000))
      }, 429);
    }

    bucket.tokens -= cost;
    await this.state.storage.put('bucket', bucket);

    return json({
      allowed: true,
      limit: capacity,
      remaining: Math.floor(bucket.tokens),
      resetAt: Math.ceil((now + Math.ceil(Math.max(0, capacity - bucket.tokens) / refillPerMs)) / 1000),
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
 * Missing DO binding: fail-open only in non-production (local/tests).
 * Production unbound or DO errors: fail-closed unless APLUS_RATE_LIMIT_FAIL_OPEN=1.
 */
export async function enforceCoachRateLimit(env, key, capacityPerMinute) {
  const failOpen = !!(env && (env.APLUS_RATE_LIMIT_FAIL_OPEN === '1' || env.APLUS_RATE_LIMIT_FAIL_OPEN === true));
  const isProd = !!(env && (env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production'));
  const nowSec = Math.ceil(Date.now() / 1000);
  if (!env || !env.COACH_RATE_LIMITER || !key) {
    if (isProd && !failOpen) {
      return {
        allowed: false,
        limit: capacityPerMinute,
        remaining: 0,
        resetAt: nowSec + 30,
        retryAfter: 30,
        retryAfterMs: 30000,
        degraded: true,
        reason: 'RATE_LIMITER_UNBOUND'
      };
    }
    return {
      allowed: true,
      limit: capacityPerMinute,
      remaining: capacityPerMinute,
      resetAt: nowSec + 60,
      degraded: true,
      reason: 'RATE_LIMITER_UNBOUND'
    };
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
        limit: data.limit != null ? data.limit : capacity,
        remaining: data.remaining || 0,
        resetAt: data.resetAt || (nowSec + (data.retryAfter || 60)),
        retryAfter: data.retryAfter || 60,
        retryAfterMs: data.retryAfterMs || 60000
      };
    }
    return {
      allowed: true,
      limit: data.limit != null ? data.limit : capacity,
      remaining: data.remaining != null ? data.remaining : capacity,
      resetAt: data.resetAt || (nowSec + 60),
      retryAfter: 0
    };
  } catch (err) {
    console.warn('Rate limiter error:', err && err.message);
    if (failOpen) {
      return {
        allowed: true,
        limit: capacityPerMinute,
        remaining: capacityPerMinute,
        resetAt: nowSec + 60,
        degraded: true
      };
    }
    return {
      allowed: false,
      limit: capacityPerMinute,
      remaining: 0,
      resetAt: nowSec + 30,
      retryAfter: 30,
      retryAfterMs: 30000,
      degraded: true,
      reason: 'RATE_LIMITER_ERROR'
    };
  }
}

/**
 * Enforces both rate-limit dimensions for one request and returns a single
 * verdict plus the standard response headers.
 *
 * Two keys, because either one alone is trivially defeated:
 *  - UID only  -> one attacker rotates throwaway accounts from a single host.
 *  - IP only   -> one attacker rotates VPN exits, and every learner behind a
 *                 campus NAT shares one bucket.
 *
 * The IP allowance is deliberately several times the per-user allowance for the
 * same reason: a shared ceiling turns one abusive user on a corporate NAT into
 * an outage for everyone else behind it.
 *
 * Returns { allowed, headers, retryAfter, reason, uid, ip }.
 */
export async function enforceDualKeyLimit(env, request, action, opts = {}) {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown';

  const uidCapacity = Math.max(1, Number(opts.uidPerMinute) || 30);
  // An explicit ipPerMinute is honoured as given. It must NOT be floored at the
  // UID capacity: on an endpoint with no caller identity the UID number is just
  // an unused default, and clamping against it silently widens the only ceiling
  // that endpoint actually has. Where both dimensions are in play, callers are
  // expected to set IP wider than UID so one noisy user cannot lock out a NAT;
  // the derived default below does that automatically.
  const ipCapacity = Math.max(1, Number(opts.ipPerMinute) || uidCapacity * 4);
  const uid = opts.uid ? String(opts.uid) : null;

  // The IP dimension is checked for everyone, authenticated or not. It is the
  // only key an unauthenticated caller has.
  const checks = [];
  if (uid) checks.push({ dimension: 'uid', key: `${action}:uid:${uid}`, capacity: uidCapacity });
  checks.push({ dimension: 'ip', key: `${action}:ip:${ip}`, capacity: ipCapacity });

  let tightest = null;

  for (const check of checks) {
    const result = await enforceCoachRateLimit(env, check.key, check.capacity);

    // Advertise whichever dimension the caller is closest to exhausting, so
    // the headers describe the limit that will actually stop them next.
    if (!tightest || result.remaining < tightest.result.remaining) {
      tightest = { check, result };
    }

    if (!result.allowed) {
      console.warn(JSON.stringify({
        event: 'rate_limit_exceeded',
        action,
        dimension: check.dimension,
        uid: check.dimension === 'uid' ? uid : undefined,
        ip: check.dimension === 'ip' ? ip : undefined,
        limit: result.limit,
        retryAfter: result.retryAfter,
        degraded: result.degraded || false,
        reason: result.reason || 'THRESHOLD_EXCEEDED',
        ts: new Date().toISOString()
      }));

      return {
        allowed: false,
        dimension: check.dimension,
        retryAfter: result.retryAfter || 60,
        reason: result.reason || (check.dimension === 'uid' ? 'UID_RATE_LIMITED' : 'IP_RATE_LIMITED'),
        headers: rateLimitHeaders(result, result.retryAfter || 60),
        uid,
        ip
      };
    }
  }

  return {
    allowed: true,
    headers: rateLimitHeaders(tightest.result),
    uid,
    ip
  };
}

/**
 * Standard rate-limit headers. Reset is a UTC epoch in SECONDS; the client
 * guard in js/request-guard.js parses it as such.
 */
export function rateLimitHeaders(result, retryAfterSeconds) {
  if (!result) return {};
  const headers = {
    'X-RateLimit-Limit': String(result.limit != null ? result.limit : ''),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining != null ? result.remaining : 0)),
    'X-RateLimit-Reset': String(result.resetAt || Math.ceil(Date.now() / 1000) + 60)
  };
  if (retryAfterSeconds) headers['Retry-After'] = String(retryAfterSeconds);
  return headers;
}
