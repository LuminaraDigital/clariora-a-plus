/**
 * Clariora Cloud Functions (v2) - Enterprise Zero-Trust Security Gateway
 * 
 * Mandated Security Posture:
 * 1. IDOR Elimination: Derived cryptographically from verified Firebase ID token (checkRevoked = true).
 * 2. PII Isolation: Public profile vs private PII segregation with explicit schema projection.
 * 3. Multi-Tier Dual-Key Rate Limiting: Enforced across caller UID and origin IP (sliding window).
 * 4. Server-Side Entitlement Gating: Premium payload fields redacted before crossing the wire.
 * 5. Mass Assignment Defense: Zod .strict() input validation rejecting unwhitelisted keys.
 */

import { onRequest, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { z } from "zod";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// =============================================================================
// MULTI-TIER DUAL-KEY SLIDING-WINDOW RATE LIMITER
// =============================================================================

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

/** What a limiter decision tells the caller; enough to build response headers. */
interface RateLimitVerdict {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;      // UTC epoch SECONDS
  retryAfter?: number;  // seconds
  dimension?: "UID" | "IP" | "QUOTA";
  reason?: string;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 5, // Max 5 requests / minute per identifier
};

// Read-only endpoints are throttled more loosely than mutations, but still throttled:
// an unthrottled gated-content read is a question-bank scraping endpoint.
const READ_RATE_LIMIT: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 30,
};

/**
 * Plan-specific daily allowances, keyed by the tier resolveEntitlement() derives
 * from server-owned state. Never from a client-supplied tier.
 *
 * The per-minute window shapes burst; this caps total daily volume, which is
 * what actually bounds the monthly bill.
 */
const DAILY_QUOTA_BY_TIER: Record<string, number> = {
  free: 50,
  daily_pass: 400,
  pro_monthly: 1000,
  lifetime: 2000
};

function dailyQuotaFor(tier: string): number {
  const quota = DAILY_QUOTA_BY_TIER[tier];
  return typeof quota === "number" ? quota : DAILY_QUOTA_BY_TIER.free;
}

/**
 * The IP tier must be materially wider than the UID tier. A shared 5/min ceiling keyed on
 * IP would lock out every learner behind one campus or corporate NAT the moment a single
 * user hits their own limit, which is a denial of service dressed up as a rate limit.
 */
function ipTierFor(config: RateLimitConfig): RateLimitConfig {
  return {
    windowSeconds: config.windowSeconds,
    maxRequests: config.maxRequests * 10,
  };
}

/** Writes the standard headers onto a response. Reset is a UTC epoch in SECONDS. */
function applyRateLimitHeaders(res: any, verdict: RateLimitVerdict): void {
  res.set("X-RateLimit-Limit", String(verdict.limit));
  res.set("X-RateLimit-Remaining", String(Math.max(0, verdict.remaining)));
  res.set("X-RateLimit-Reset", String(verdict.resetAt));
  if (!verdict.allowed && verdict.retryAfter) {
    res.set("Retry-After", String(verdict.retryAfter));
  }
}

/** Structured breach record for Cloud Logging alerting. */
function logRateLimitBreach(
  action: string,
  verdict: RateLimitVerdict,
  caller: { uid?: string; ip?: string; tier?: string }
): void {
  logger.warn("Rate limit threshold breached (fail-closed)", {
    event: "rate_limit_exceeded",
    action,
    dimension: verdict.dimension,
    reason: verdict.reason || "THRESHOLD_EXCEEDED",
    uid: caller.uid,
    ip: caller.ip,
    tier: caller.tier,
    limit: verdict.limit,
    retryAfter: verdict.retryAfter,
    timestamp: new Date().toISOString()
  });
}

/**
 * Atomic sliding-window rate limiter utilizing Firestore with short TTLs.
 * Checks both Caller UID and Origin IP simultaneously to thwart proxy rotation and NAT collisions.
 *
 * OPERATIONAL NOTE: these documents carry an `expiresAt` field, but Firestore only
 * deletes them if a TTL policy is configured for that field on the `rate_limits`
 * collection. Without the policy this collection grows without bound and the limiter
 * becomes its own storage bill. The gcloud command is in infra/cloudflare/README.md.
 */
async function enforceDualKeyRateLimit(
  callerUid: string,
  originIp: string,
  action: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<RateLimitVerdict> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;
  const fallbackReset = Math.ceil((now + windowMs) / 1000);

  const identifiers = [
    { key: `uid_${callerUid}_${action}`, type: "UID" as const, value: callerUid, limit: config },
    {
      key: `ip_${originIp.replace(/[:.]/g, "_")}_${action}`,
      type: "IP" as const,
      value: originIp,
      limit: ipTierFor(config)
    }
  ];

  // Report against the dimension the caller is closest to exhausting, so the
  // advertised headers describe the limit that will actually stop them next.
  let tightest: RateLimitVerdict = {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests,
    resetAt: fallbackReset
  };

  for (const id of identifiers) {
    const docRef = db.collection("rate_limits").doc(id.key);

    try {
      const outcome = await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        const data = snap.data();
        let timestamps: number[] = data && Array.isArray(data.timestamps) ? data.timestamps : [];

        // Prune timestamps older than sliding window
        timestamps = timestamps.filter((ts) => typeof ts === "number" && ts > cutoff);

        if (timestamps.length >= id.limit.maxRequests) {
          const oldest = Math.min(...timestamps);
          return {
            allowed: false,
            remaining: 0,
            // A sliding window frees a slot when its oldest entry ages out,
            // not when some fixed window rolls over.
            resetAt: Math.ceil((oldest + windowMs) / 1000)
          };
        }

        timestamps.push(now);
        transaction.set(
          docRef,
          {
            timestamps,
            identifierType: id.type,
            identifierValue: id.value,
            action,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Expire document after 2 sliding windows
            expiresAt: new Date(now + windowMs * 2)
          },
          { merge: true }
        );

        return {
          allowed: true,
          remaining: id.limit.maxRequests - timestamps.length,
          resetAt: Math.ceil((Math.min(...timestamps) + windowMs) / 1000)
        };
      });

      if (!outcome.allowed) {
        return {
          allowed: false,
          limit: id.limit.maxRequests,
          remaining: 0,
          resetAt: outcome.resetAt,
          retryAfter: Math.max(1, outcome.resetAt - Math.ceil(now / 1000)),
          dimension: id.type,
          reason: "THRESHOLD_EXCEEDED"
        };
      }

      if (outcome.remaining < tightest.remaining) {
        tightest = {
          allowed: true,
          limit: id.limit.maxRequests,
          remaining: outcome.remaining,
          resetAt: outcome.resetAt,
          dimension: id.type
        };
      }
    } catch (err: any) {
      logger.error("Rate limit verification error - failing closed", {
        identifier: id.key,
        error: err?.message || String(err)
      });
      // Fail-closed security architecture
      return {
        allowed: false,
        limit: id.limit.maxRequests,
        remaining: 0,
        resetAt: fallbackReset,
        retryAfter: config.windowSeconds,
        dimension: id.type,
        reason: "LIMITER_ERROR"
      };
    }
  }

  return tightest;
}

/**
 * Plan-based daily quota, enforced on the verified UID only.
 *
 * This is the dimension that bounds spend. The per-minute window stops a burst;
 * this stops a patient script that stays under the burst ceiling all day.
 *
 * IP is deliberately not a key here: a daily cap keyed on a shared NAT address
 * would lock out an entire campus for the rest of the day.
 *
 * Counted inside a transaction against a per-UID-per-day document, so two
 * concurrent requests cannot both read the same count and both pass.
 */
async function enforceDailyQuota(
  callerUid: string,
  tier: string,
  action: string
): Promise<RateLimitVerdict> {
  const quota = dailyQuotaFor(tier);
  const day = new Date().toISOString().slice(0, 10);
  const docRef = db.collection("rate_limits").doc(`quota_${callerUid}_${day}`);

  // Quotas reset at 00:00 UTC.
  const resetAt = Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000) + 86400;

  try {
    const outcome = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      const data = snap.data();
      const used = Number(data && data.count) || 0;

      if (used >= quota) return { allowed: false, remaining: 0 };

      transaction.set(
        docRef,
        {
          count: used + 1,
          uid: callerUid,
          tier,
          day,
          lastAction: action,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Keep one extra day so an audit read still finds the record.
          expiresAt: new Date(resetAt * 1000 + 86400000)
        },
        { merge: true }
      );

      return { allowed: true, remaining: quota - (used + 1) };
    });

    return {
      allowed: outcome.allowed,
      limit: quota,
      remaining: outcome.remaining,
      resetAt,
      retryAfter: outcome.allowed ? undefined : Math.max(1, resetAt - Math.floor(Date.now() / 1000)),
      dimension: "QUOTA",
      reason: outcome.allowed ? undefined : "DAILY_QUOTA_EXHAUSTED"
    };
  } catch (err: any) {
    logger.error("Daily quota verification error - failing closed", {
      uid: callerUid,
      error: err?.message || String(err)
    });
    return {
      allowed: false,
      limit: quota,
      remaining: 0,
      resetAt,
      retryAfter: 60,
      dimension: "QUOTA",
      reason: "QUOTA_STORE_ERROR"
    };
  }
}

// =============================================================================
// ZERO-TRUST TOKEN VERIFICATION MIDDLEWARE
// =============================================================================

interface VerifiedCaller {
  uid: string;
  email?: string;
  claims: Record<string, any>;
  ip: string;
}

/**
 * Extracts and cryptographically verifies Firebase Bearer token.
 * All caller context is derived strictly from the token. Query parameters and body IDs are banned.
 */
async function verifyZeroTrustCaller(req: any): Promise<VerifiedCaller> {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new HttpsError("unauthenticated", "Missing or malformed Authorization header. Expected Bearer token.");
  }

  const bearerToken = authHeader.split("Bearer ")[1]?.trim();
  if (!bearerToken) {
    throw new HttpsError("unauthenticated", "Bearer token is empty.");
  }

  try {
    // Enforce token revocation check: verifyIdToken(bearerToken, true)
    const decoded = await auth.verifyIdToken(bearerToken, true);
    const originIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown-ip";

    return {
      uid: decoded.uid,
      email: decoded.email,
      claims: decoded,
      ip: originIp
    };
  } catch (err: any) {
    logger.warn("Zero-trust authentication failure", { error: err?.message });
    throw new HttpsError("unauthenticated", "Invalid or revoked authentication token.");
  }
}

// =============================================================================
// SERVER-OWNED ENTITLEMENT RESOLUTION
// =============================================================================

const PAID_TIERS = new Set(["premium", "pro_monthly", "lifetime", "daily_pass"]);

/**
 * Resolves the caller's paid tier from server-owned state only.
 *
 * Custom claims alone are not a sufficient source of truth here: nothing in this codebase
 * calls setCustomUserClaims, so `token.claims.tier` is permanently undefined and a
 * claims-only gate silently denies every paying subscriber. Purchases are recorded by the
 * billing rails, so /entitlements/{uid} is authoritative and the claim is only a fast path.
 *
 * Fails closed: any read error resolves to the free tier.
 */
async function resolveEntitlement(caller: VerifiedCaller): Promise<{ tier: string; isSubscriber: boolean }> {
  const claimTier = typeof caller.claims.tier === "string" ? caller.claims.tier : "";
  if (PAID_TIERS.has(claimTier)) {
    return { tier: claimTier, isSubscriber: true };
  }

  try {
    const snap = await db.collection("entitlements").doc(caller.uid).get();
    const data = snap.data();
    if (!data) return { tier: "free", isSubscriber: false };

    const tier = typeof data.tier === "string" ? data.tier : "free";
    if (!PAID_TIERS.has(tier)) return { tier: "free", isSubscriber: false };

    // A lapsed subscription is not a subscription. Null expiry means lifetime.
    const expiresAt = data.expiresAt;
    if (expiresAt !== null && expiresAt !== undefined) {
      const expiryMs =
        typeof expiresAt === "number"
          ? expiresAt
          : typeof expiresAt?.toMillis === "function"
            ? expiresAt.toMillis()
            : Date.parse(String(expiresAt));
      if (!Number.isFinite(expiryMs) || expiryMs < Date.now()) {
        return { tier: "free", isSubscriber: false };
      }
    }

    return { tier, isSubscriber: true };
  } catch (err: any) {
    logger.error("Entitlement resolution failed - defaulting to free tier", {
      uid: caller.uid,
      error: err?.message || String(err)
    });
    return { tier: "free", isSubscriber: false };
  }
}

// =============================================================================
// ZOD STRICT SCHEMAS (MASS ASSIGNMENT & OVER-POSTING PREVENTION)
// =============================================================================

export const UpdateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    photoURL: z.string().url().max(500).optional(),
    handle: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
    bio: z.string().max(500).optional(),
    // Sensitive PII fields
    email: z.string().email().max(120).optional(),
    phone: z.string().max(32).optional(),
    bvn: z.string().max(32).optional(),
    date_of_birth: z.string().max(32).optional(),
    billingAddress: z.string().max(250).optional()
  })
  .strict(); // REJECT ANY UNRECOGNIZED KEYS (role, tier, balance, etc.)

export const SyncStateSchema = z
  .object({
    revision: z.number().int().min(1).max(2147483647),
    stateBlob: z.record(z.unknown()),
    deviceName: z.string().max(64).optional()
  })
  .strict();

export const GatedContentQuerySchema = z
  .object({
    questionId: z.string().min(1).max(64),
    examType: z.enum(["core1", "core2"])
  })
  .strict();

export const ExamAttemptSchema = z
  .object({
    examId: z.enum(["core1", "core2"]),
    score: z.number().int().min(100).max(900),
    passed: z.boolean(),
    totalQuestions: z.number().int().min(1).max(120),
    timeSpentSeconds: z.number().int().min(0).max(10800)
  })
  .strict();

// =============================================================================
// ENDPOINT 1: ZERO-TRUST PROFILE MUTATION & PII ISOLATION
// =============================================================================

export const updateUserProfile = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      // 1. Zero-Trust Caller Identity
      const caller = await verifyZeroTrustCaller(req);

      // 2. Dual-Key Rate Limiting (UID + Origin IP)
      const rateLimit = await enforceDualKeyRateLimit(caller.uid, caller.ip, "updateUserProfile");
      applyRateLimitHeaders(res, rateLimit);
      if (!rateLimit.allowed) {
        logRateLimitBreach("updateUserProfile", rateLimit, { uid: caller.uid, ip: caller.ip });
        res.status(429).json({
          error: "Too Many Requests",
          message: `Exceeded rate limit of ${rateLimit.limit} requests/min.`,
          retryAfter: rateLimit.retryAfter
        });
        return;
      }

      // 2b. Plan-based daily quota. The burst window above cannot stop a
      // patient script; this can. Tier comes from server-owned entitlement
      // state, never from a client-supplied value.
      const { tier: profileTier } = await resolveEntitlement(caller);
      const profileQuota = await enforceDailyQuota(caller.uid, profileTier, "updateUserProfile");
      applyRateLimitHeaders(res, profileQuota);
      if (!profileQuota.allowed) {
        logRateLimitBreach("updateUserProfile", profileQuota, {
          uid: caller.uid, ip: caller.ip, tier: profileTier
        });
        res.status(429).json({
          error: "Daily Quota Exhausted",
          message: `Your ${profileTier} plan allows ${profileQuota.limit} requests per day.`,
          tier: profileTier,
          retryAfter: profileQuota.retryAfter
        });
        return;
      }

      // 3. Zod Strict Validation
      const parseResult = UpdateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation Failed",
          details: parseResult.error.flatten().fieldErrors
        });
        return;
      }

      const validated = parseResult.data;
      // Admin SDK writes bypass security rules, so they must still stamp updatedAt with the
      // server clock: the rules treat a non-timestamp updatedAt as un-migrated and grant the
      // document one un-throttled client write.
      const nowStamp = admin.firestore.FieldValue.serverTimestamp();

      // 4. PII Isolation: Split into distinct Firestore subcollections
      const publicFields: Record<string, any> = { updatedAt: nowStamp };
      if (validated.displayName !== undefined) publicFields.displayName = validated.displayName;
      if (validated.photoURL !== undefined) publicFields.photoURL = validated.photoURL;
      if (validated.handle !== undefined) publicFields.handle = validated.handle;
      if (validated.bio !== undefined) publicFields.bio = validated.bio;

      const privatePiiFields: Record<string, any> = { updatedAt: nowStamp };
      if (validated.email !== undefined) privatePiiFields.email = validated.email;
      if (validated.phone !== undefined) privatePiiFields.phone = validated.phone;
      if (validated.bvn !== undefined) privatePiiFields.bvn = validated.bvn;
      if (validated.date_of_birth !== undefined) privatePiiFields.date_of_birth = validated.date_of_birth;
      if (validated.billingAddress !== undefined) privatePiiFields.billingAddress = validated.billingAddress;

      const batch = db.batch();

      // Write public data to /users/{callerUid}/public_profile/current
      const publicRef = db.collection("users").doc(caller.uid).collection("public_profile").doc("current");
      batch.set(publicRef, publicFields, { merge: true });

      // Write sensitive PII to /users/{callerUid}/private_data/current
      if (Object.keys(privatePiiFields).length > 1) {
        const privateRef = db.collection("users").doc(caller.uid).collection("private_data").doc("current");
        batch.set(privateRef, privatePiiFields, { merge: true });
      }

      // Maintain server-scoped anchor document
      const rootRef = db.collection("users").doc(caller.uid);
      batch.set(
        rootRef,
        {
          uid: caller.uid,
          updatedAt: nowStamp,
          displayName: validated.displayName || caller.claims.name || "Technician",
          photoURL: validated.photoURL || caller.claims.picture || ""
        },
        { merge: true }
      );

      await batch.commit();

      // 5. Explicit Safe Data Projection (Zero PII leakage in response)
      res.status(200).json({
        success: true,
        publicProfile: {
          uid: caller.uid,
          displayName: validated.displayName,
          handle: validated.handle,
          photoURL: validated.photoURL,
          bio: validated.bio
        },
        hasPrivateData: Object.keys(privatePiiFields).length > 1
      });
    } catch (err: any) {
      const status = err instanceof HttpsError ? (err.httpErrorCode?.status || 401) : 500;
      res.status(status).json({ error: err.message || "Internal Server Error" });
    }
  }
);

// =============================================================================
// ENDPOINT 2: SECURE PROFILE PROJECTION
// =============================================================================

export const getUserProfile = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const caller = await verifyZeroTrustCaller(req);

      const rateLimit = await enforceDualKeyRateLimit(
        caller.uid, caller.ip, "getUserProfile", READ_RATE_LIMIT
      );
      applyRateLimitHeaders(res, rateLimit);
      if (!rateLimit.allowed) {
        logRateLimitBreach("getUserProfile", rateLimit, { uid: caller.uid, ip: caller.ip });
        res.status(429).json({ error: "Too Many Requests", retryAfter: rateLimit.retryAfter });
        return;
      }

      // Caller reads their own isolated data
      const publicSnap = await db.collection("users").doc(caller.uid).collection("public_profile").doc("current").get();
      const privateSnap = await db.collection("users").doc(caller.uid).collection("private_data").doc("current").get();

      const publicData = publicSnap.data() || {};
      const privateData = privateSnap.data() || {};

      // Explicit Data Projection: Never spread raw docs ({ ...doc.data() })
      res.status(200).json({
        success: true,
        profile: {
          uid: caller.uid,
          displayName: publicData.displayName || caller.claims.name || "",
          photoURL: publicData.photoURL || caller.claims.picture || "",
          handle: publicData.handle || "",
          bio: publicData.bio || ""
        },
        privateData: {
          email: privateData.email || caller.email || "",
          phone: privateData.phone ? `***-***-${privateData.phone.slice(-4)}` : null,
          hasBvn: Boolean(privateData.bvn),
          hasBillingAddress: Boolean(privateData.billingAddress)
        }
      });
    } catch (err: any) {
      const status = err instanceof HttpsError ? (err.httpErrorCode?.status || 401) : 500;
      res.status(status).json({ error: err.message || "Unauthorized" });
    }
  }
);

// =============================================================================
// ENDPOINT 3: SERVER-SIDE FIELD REDACTION (PAYWALL & ENTITLEMENT GATING)
// =============================================================================

export const getGatedExamContent = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const caller = await verifyZeroTrustCaller(req);

      // An unthrottled gated-content endpoint is a question-bank scraper: one authenticated
      // free account could walk every question id at full speed.
      const rateLimit = await enforceDualKeyRateLimit(
        caller.uid, caller.ip, "getGatedExamContent", READ_RATE_LIMIT
      );
      applyRateLimitHeaders(res, rateLimit);
      if (!rateLimit.allowed) {
        logRateLimitBreach("getGatedExamContent", rateLimit, { uid: caller.uid, ip: caller.ip });
        res.status(429).json({ error: "Too Many Requests", retryAfter: rateLimit.retryAfter });
        return;
      }

      const parseResult = GatedContentQuerySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: "Invalid Query Parameters", details: parseResult.error.flatten() });
        return;
      }

      const { questionId, examType } = parseResult.data;

      // Check verified server-side entitlement (server-owned state, not client claims)
      const { tier: contentTier, isSubscriber } = await resolveEntitlement(caller);

      // Plan-based daily ceiling on gated reads. Without it, one entitled
      // account can walk the entire question bank at 30 requests a minute all
      // day, which is the paid product exported in full.
      const contentQuota = await enforceDailyQuota(caller.uid, contentTier, "getGatedExamContent");
      applyRateLimitHeaders(res, contentQuota);
      if (!contentQuota.allowed) {
        logRateLimitBreach("getGatedExamContent", contentQuota, {
          uid: caller.uid, ip: caller.ip, tier: contentTier
        });
        res.status(429).json({
          error: "Daily Quota Exhausted",
          message: `Your ${contentTier} plan allows ${contentQuota.limit} content reads per day.`,
          tier: contentTier,
          retryAfter: contentQuota.retryAfter
        });
        return;
      }

      // Fetch source question from server repository
      const questionDoc = await db.collection("questions").doc(`${examType}_${questionId}`).get();
      const rawData = questionDoc.data();

      if (!rawData) {
        res.status(404).json({ error: "Question not found" });
        return;
      }

      // CRITICAL: SERVER-SIDE REDACTION ("UI IS NOT A GATE")
      // If not entitled, premium attributes NEVER leave the database or appear in network packets.
      const safePayload = {
        id: rawData.id,
        exam: rawData.exam,
        domain: rawData.domain,
        objective: rawData.objective,
        type: rawData.type,
        difficulty: rawData.difficulty,
        question: rawData.question,
        options: rawData.options,
        // Gated attributes: evaluated and redacted on server
        distractor_analysis: isSubscriber ? rawData.distractor_analysis : null,
        deep_dive_explanation: isSubscriber ? rawData.explanation : null,
        pbq_walkthrough: isSubscriber ? rawData.pbq_walkthrough : null,
        isEntitled: isSubscriber
      };

      res.status(200).json({
        success: true,
        data: safePayload
      });
    } catch (err: any) {
      const status = err instanceof HttpsError ? (err.httpErrorCode?.status || 401) : 500;
      res.status(status).json({ error: err.message || "Access Denied" });
    }
  }
);

// =============================================================================
// ENDPOINT 4: SECURE STATE SYNCHRONIZATION
// =============================================================================

export const syncLearnerState = onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const caller = await verifyZeroTrustCaller(req);

      const rateLimit = await enforceDualKeyRateLimit(caller.uid, caller.ip, "syncLearnerState");
      applyRateLimitHeaders(res, rateLimit);
      if (!rateLimit.allowed) {
        logRateLimitBreach("syncLearnerState", rateLimit, { uid: caller.uid, ip: caller.ip });
        res.status(429).json({ error: "Too Many Requests", retryAfter: rateLimit.retryAfter });
        return;
      }

      // Sync is a write path a looping client can hold open all day.
      const { tier: syncTier } = await resolveEntitlement(caller);
      const syncQuota = await enforceDailyQuota(caller.uid, syncTier, "syncLearnerState");
      applyRateLimitHeaders(res, syncQuota);
      if (!syncQuota.allowed) {
        logRateLimitBreach("syncLearnerState", syncQuota, {
          uid: caller.uid, ip: caller.ip, tier: syncTier
        });
        res.status(429).json({
          error: "Daily Quota Exhausted",
          message: `Your ${syncTier} plan allows ${syncQuota.limit} syncs per day.`,
          tier: syncTier,
          retryAfter: syncQuota.retryAfter
        });
        return;
      }

      const parseResult = SyncStateSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: "Invalid Sync Payload", details: parseResult.error.flatten() });
        return;
      }

      const { revision, stateBlob, deviceName } = parseResult.data;
      const serialized = JSON.stringify(stateBlob);
      if (serialized.length > 512 * 1024) {
        res.status(413).json({ error: "Payload exceeds 512KB limit" });
        return;
      }

      const stateDocRef = db.collection("users").doc(caller.uid).collection("learning").doc("state");
      await stateDocRef.set(
        {
          revision,
          data: stateBlob,
          deviceName: deviceName || "Web",
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      res.status(200).json({ success: true, revision, syncedAt: new Date().toISOString() });
    } catch (err: any) {
      const status = err instanceof HttpsError ? (err.httpErrorCode?.status || 401) : 500;
      res.status(status).json({ error: err.message || "Sync Failed" });
    }
  }
);
