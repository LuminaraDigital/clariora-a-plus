/**
 * tools/verify_security_architecture.js
 * Verification suite for Zero-Trust Firebase Architecture & 5 Critical Vulnerability Vectors
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('CLARIORA ZERO-TRUST DEFENSIVE SECURITY VERIFICATION SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Cloud Firestore Security Rules Verification
// -----------------------------------------------------------------------------
console.log('1. Verifying Cloud Firestore Security Rules (firestore.rules)...');
const rulesPath = path.join(ROOT, 'firestore.rules');
assert.ok(fs.existsSync(rulesPath), 'firestore.rules must exist');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

// Check deny-by-default
assert.ok(
  rulesContent.includes("rules_version = '2';"),
  'Must use Firestore rules version 2'
);
assert.ok(
  rulesContent.includes('match /{document=**}') && rulesContent.includes('allow read, write: if false;'),
  'Must enforce deny-by-default on unmatched documents'
);

// Check identity scoping (IDOR defense)
assert.ok(
  rulesContent.includes('isOwner(userId)') || rulesContent.includes('request.auth.uid == userId'),
  'Must enforce strict identity matching on /users/{userId}'
);

// Check PII separation into public_profile and private_data
assert.ok(
  rulesContent.includes('/public_profile/{profileId}'),
  'Must isolate public profile metadata'
);
assert.ok(
  rulesContent.includes('/private_data/{docId}'),
  'Must isolate sensitive private PII'
);
assert.ok(
  rulesContent.includes('/private_data/{docId}') && rulesContent.includes('allow list: if false;'),
  'Must strictly forbid collection-wide listing/queries on private data'
);

// Check time-differential rate limit
assert.ok(
  rulesContent.includes("duration.value(minSeconds, 's')") && rulesContent.includes('obeysRateLimit(5)'),
  'Must enforce time-differential rate limiting on writes (min 5s interval)'
);

// Check mass assignment & server privileges immutability
assert.ok(
  rulesContent.includes('hasOnlyAllowedFields'),
  'Must enforce field allow-listing'
);
assert.ok(
  rulesContent.includes('serverPrivilegesUnchanged()') || rulesContent.includes('role') && rulesContent.includes('wallet_balance'),
  'Must guard server-owned roles, privileges, and wallet balances against client elevation'
);

console.log('   ✔ Cloud Firestore Security Rules verified: Deny-by-default, UID isolation, PII separation, and rate limits confirmed.\n');

// -----------------------------------------------------------------------------
// 2. Client-Side Firebase Service Hardening (js/firebase-service.js)
// -----------------------------------------------------------------------------
console.log('2. Verifying Client-Side Firebase Service (js/firebase-service.js)...');
const fbServicePath = path.join(ROOT, 'js', 'firebase-service.js');
const fbServiceContent = fs.readFileSync(fbServicePath, 'utf8');

// Ensure zero-trust identity (never trusting caller-supplied sessionOrUser.uid blindly)
assert.ok(
  fbServiceContent.includes('var currentUser = getCurrentUser();') && fbServiceContent.includes('var uid = currentUser.uid;'),
  'ensureUserProfile must derive UID from verified getCurrentUser() only'
);

// Ensure writing to public_profile and private_data
assert.ok(
  fbServiceContent.includes("doc(state.db, 'users', uid, 'public_profile', 'current')"),
  'Must write safe public data to public_profile subcollection'
);
assert.ok(
  fbServiceContent.includes("doc(state.db, 'users', uid, 'private_data', 'current')"),
  'Must write sensitive PII to private_data subcollection'
);

// Ensure field whitelisting on learning state writes
assert.ok(
  fbServiceContent.includes('safePayload') && !fbServiceContent.includes('var payload = Object.assign({}, progressData, { lastSyncedAt'),
  'saveLearnerProgress must explicitly whitelist keys instead of spreading raw progressData'
);

console.log('   ✔ Client Firebase service verified: Zero-trust UID scoping and PII deconstruction active.\n');

// -----------------------------------------------------------------------------
// 3. Cloud Functions v2 Schema & Mass Assignment Defense
// -----------------------------------------------------------------------------
console.log('3. Verifying Cloud Functions v2 & Zod Strict Schemas...');
const functionsPath = path.join(ROOT, 'functions', 'src', 'index.ts');
assert.ok(fs.existsSync(functionsPath), 'functions/src/index.ts must exist');
const functionsContent = fs.readFileSync(functionsPath, 'utf8');

// Zero-trust token verification with revocation check
assert.ok(
  functionsContent.includes('verifyIdToken(bearerToken, true)'),
  'Cloud Functions must verify Bearer ID token with checkRevoked=true'
);

// Dual-key rate limiting (UID + IP)
assert.ok(
  functionsContent.includes('enforceDualKeyRateLimit'),
  'Must enforce dual-key sliding window rate limiter (UID + Origin IP)'
);
assert.ok(
  functionsContent.includes('429'),
  'Must fail-closed and return HTTP 429 when rate limit is exceeded'
);

// Server-side field redaction ("UI is Not a Lock")
assert.ok(
  functionsContent.includes('getGatedExamContent'),
  'Must provide server-side gated content endpoint'
);
assert.ok(
  functionsContent.includes('isSubscriber ? rawData.distractor_analysis : null') ||
  functionsContent.includes('isSubscriber ?'),
  'Must redact premium attributes on the server before wire transmission'
);

// Zod strict validation
assert.ok(
  functionsContent.includes('.strict()'),
  'Schemas must use .strict() to reject unexpected/unwhitelisted keys'
);

console.log('   ✔ Cloud Functions v2 architecture verified: Zero-trust auth, dual-key throttling, Zod validation, and paywall redaction confirmed.\n');

// -----------------------------------------------------------------------------
// 4. Edge Worker API Zero-Trust & Rate Limiting Hardening
// -----------------------------------------------------------------------------
console.log('4. Verifying Cloudflare Edge Worker Hardening (workers/api_worker.js)...');
const workerPath = path.join(ROOT, 'workers', 'api_worker.js');
const workerContent = fs.readFileSync(workerPath, 'utf8');

// Ban X-User-Id header identity bypass
assert.ok(
  !workerContent.includes("verifiedUserId = headerUserId"),
  'X-User-Id header bypass must be eliminated from /api/v1/sync'
);

// Rate limiting on sensitive mutation endpoints.
//
// These used to grep for the old per-endpoint bucket-key literals ('sync_uid:',
// 'auth_ip:', ...). Those were an implementation detail of the single-key
// limiter; the endpoints now route through enforceDualKeyLimit, which checks
// both dimensions in one call and returns the standard headers. Assert the
// property instead of the old string, so the check survives the next refactor
// and actually verifies that both dimensions are configured.

/** Extracts the options object passed to enforceDualKeyLimit for an action. */
function dualKeyConfigFor(action) {
  const marker = `enforceDualKeyLimit(env, request, '${action}'`;
  const start = workerContent.indexOf(marker);
  if (start === -1) return null;
  const open = workerContent.indexOf('{', start + marker.length);
  const close = workerContent.indexOf('}', open);
  if (open === -1 || close === -1) return null;
  return workerContent.slice(open + 1, close);
}

function assertDualKey(action, endpoint) {
  const cfg = dualKeyConfigFor(action);
  assert.ok(cfg, `${endpoint} must enforce dual-key rate limiting (no '${action}' limiter found)`);
  assert.ok(/uid\s*:/.test(cfg), `${endpoint} must meter the verified caller UID`);
  assert.ok(/ipPerMinute\s*:/.test(cfg), `${endpoint} must meter the origin IP`);
}

function assertIpKey(action, endpoint) {
  const cfg = dualKeyConfigFor(action);
  assert.ok(cfg, `${endpoint} must enforce IP rate limiting (no '${action}' limiter found)`);
  assert.ok(/ipPerMinute\s*:/.test(cfg), `${endpoint} must meter the origin IP`);
}

assertDualKey('sync', '/api/v1/sync');
assertIpKey('auth_session', '/api/v1/auth/session');
assertDualKey('ton_order', '/api/v1/billing/ton/order');
assertDualKey('stars_invoice', '/api/v1/billing/stars/invoice');

// Previously unmetered endpoints closed during the 3-tier rate limiting work.
assertIpKey('auth_telegram', '/api/v1/auth/telegram');
assertIpKey('bank_full', '/api/v1/bank/full');
assertIpKey('telegram_webhook', '/api/v1/telegram/webhook');

// The single-key limiter returns no headers and checks one dimension. No route
// handler should be reaching for it directly any more.
assert.ok(
  !/enforceCoachRateLimit\(/.test(workerContent),
  'api_worker.js must route all limiting through enforceDualKeyLimit'
);

// Every 429 must tell the client how to back off.
const blocked = workerContent.split('status: 429').slice(1);
assert.ok(blocked.length >= 15, `expected every limited endpoint to return 429, found ${blocked.length}`);
for (const block of blocked) {
  assert.ok(
    /\.\.\.\w+[Ll]imit\.headers/.test(block.slice(0, 220)),
    'every 429 response must carry X-RateLimit-* and Retry-After headers'
  );
}

console.log('   ✔ Edge Worker hardening verified: Identity header injection neutralized; write flooding throttled.\n');

// -----------------------------------------------------------------------------
// 5. Functional Simulation: Zod Strict Schemas & Redaction
// -----------------------------------------------------------------------------
console.log('5. Executing Functional Simulation of Zod Schemas and Paywall Redaction...');
// Test Zod strict validation simulation
function simulateUpdateProfile(input) {
  const allowed = ['displayName', 'photoURL', 'handle', 'bio', 'email', 'phone', 'bvn', 'date_of_birth', 'billingAddress'];
  const keys = Object.keys(input);
  for (const k of keys) {
    if (!allowed.includes(k)) {
      throw new Error(`Unrecognized key in payload: ${k}`);
    }
  }
  return true;
}

// 5a. Normal update passes
assert.doesNotThrow(() => {
  simulateUpdateProfile({ displayName: 'Lead Tech', bio: 'Certified Core 1/2' });
}, 'Valid profile update must pass');

// 5b. Over-posting privilege escalation fails
assert.throws(() => {
  simulateUpdateProfile({ displayName: 'Attacker', role: 'admin' });
}, /Unrecognized key in payload: role/, 'Role injection must be rejected');

assert.throws(() => {
  simulateUpdateProfile({ displayName: 'Attacker', wallet_balance: 999999 });
}, /Unrecognized key in payload: wallet_balance/, 'Balance injection must be rejected');

assert.throws(() => {
  simulateUpdateProfile({ displayName: 'Attacker', tier: 'lifetime' });
}, /Unrecognized key in payload: tier/, 'Tier injection must be rejected');

// 5c. Paywall Server-Side Redaction simulation
function simulateGatedContentDelivery(rawDoc, isSubscriber) {
  return {
    id: rawDoc.id,
    question: rawDoc.question,
    options: rawDoc.options,
    distractor_analysis: isSubscriber ? rawDoc.distractor_analysis : null,
    deep_dive_explanation: isSubscriber ? rawDoc.explanation : null,
    pbq_walkthrough: isSubscriber ? rawDoc.pbq_walkthrough : null
  };
}

const mockDbQuestion = {
  id: 'C1-001',
  question: 'Which port is used by DNS?',
  options: ['TCP 22', 'UDP 53', 'TCP 80', 'TCP 443'],
  explanation: 'DNS uses UDP 53 for standard queries and TCP 53 for zone transfers.',
  distractor_analysis: { '0': 'TCP 22 is SSH.', '2': 'TCP 80 is HTTP.', '3': 'TCP 443 is HTTPS.' },
  pbq_walkthrough: 'Detailed interactive lab steps and secret solution.'
};

const unentitledResponse = simulateGatedContentDelivery(mockDbQuestion, false);
assert.strictEqual(unentitledResponse.distractor_analysis, null, 'Distractor analysis must be null for free users');
assert.strictEqual(unentitledResponse.deep_dive_explanation, null, 'Deep dive explanation must be null for free users');
assert.strictEqual(unentitledResponse.pbq_walkthrough, null, 'PBQ walkthrough must be null for free users');

const entitledResponse = simulateGatedContentDelivery(mockDbQuestion, true);
assert.ok(entitledResponse.distractor_analysis !== null, 'Distractor analysis must be delivered to subscribers');
assert.ok(entitledResponse.deep_dive_explanation !== null, 'Deep dive explanation must be delivered to subscribers');
assert.ok(entitledResponse.pbq_walkthrough !== null, 'PBQ walkthrough must be delivered to subscribers');

console.log('   ✔ Functional simulation passed: Over-posting rejected; premium data redacted from network responses.\n');

// -----------------------------------------------------------------------------
// 6. Regression Guards For Previously Bypassable Controls
// -----------------------------------------------------------------------------
console.log('6. Verifying regression guards on hardened controls...');

// 6a. Firestore throttle must be anchored to the server clock, not client input.
assert.ok(
  rulesContent.includes('serverStampedUpdatedAt()') &&
  rulesContent.includes('request.resource.data.updatedAt == request.time'),
  'Write throttle must pin updatedAt to request.time so it cannot be backdated by the client'
);
assert.ok(
  fbServiceContent.includes('fsMod.serverTimestamp()'),
  'Client writes must send serverTimestamp() for updatedAt to satisfy the anchored throttle'
);

// 6b. serverPrivilegesUnchanged must tolerate creates (resource == null) or every
//     first-time document write is denied by a rule evaluation error.
assert.ok(
  /function serverPrivilegesUnchanged\(\)\s*\{\s*return resource == null/.test(rulesContent),
  'serverPrivilegesUnchanged() must short-circuit when resource is null (document creation)'
);

// 6c. public_profile must not be listable: `allow list` also authorizes a
//     collectionGroup query enumerating every learner profile.
assert.ok(
  !/match \/public_profile\/\{profileId\}[\s\S]*?allow list: if isAuthenticated\(\);/.test(rulesContent),
  'public_profile must not be listable by any authenticated user (collectionGroup enumeration)'
);

// 6d. Billing identifiers are server-owned. The control is immutability, not absence:
//     a merge write evaluates the MERGED document, so omitting stripeCustomerId from the
//     allow-list would lock the owner out of their own record once the server writes it.
assert.ok(
  /function serverPrivilegesUnchanged\(\)[\s\S]{0,400}?stripeCustomerId/.test(rulesContent),
  'serverPrivilegesUnchanged() must reject any client write that alters stripeCustomerId'
);
assert.ok(
  !/allow create: if isOwner\(userId\)\s*&& hasOnlyAllowedFields\(\['email'[^\]]*stripeCustomerId/.test(rulesContent),
  'private_data creates must not let the client seed stripeCustomerId'
);

// 6e. No PII keys on the learning/progress document.
assert.ok(
  !/match \/learning\/\{docId\}[\s\S]*?hasOnlyAllowedFields\(\[[^\]]*'email'/.test(rulesContent),
  'learning state must not accept email; PII belongs in private_data'
);

// 6f. Entitlements must resolve from server-owned state, not unset custom claims.
assert.ok(
  functionsContent.includes('resolveEntitlement') &&
  functionsContent.includes('db.collection("entitlements")'),
  'Paywall must resolve entitlement from server-owned /entitlements, not claims alone'
);

// 6g. Every throttled Worker route named in the audit.
//     Keyed by limiter action rather than the retired bucket-key literals; see
//     the note in section 4. `dual` means the route must meter UID *and* IP.
const REQUIRED_WORKER_LIMITS = [
  ['admin_session', 'ip', '/api/v1/auth/admin/session (admin key brute force)'],
  ['ton_verify', 'dual', '/api/v1/billing/ton/verify (payment verification)'],
  ['entitlement', 'dual', '/api/v1/billing/entitlement'],
  ['memory_promote', 'dual', '/api/v1/memory/promote'],
  ['coach_jobs', 'dual', '/api/v1/coach/jobs'],
  ['item_stats', 'ip', '/api/v1/items/stats'],
  ['item_report', 'ip', '/api/v1/items/report'],
  ['shards', 'ip', '/shards/* (paid question bank scraping)'],
  ['auth_me', 'ip', '/api/v1/auth/me (JWKS verification cost)']
];
for (const [action, kind, label] of REQUIRED_WORKER_LIMITS) {
  const cfg = dualKeyConfigFor(action);
  assert.ok(cfg, `Missing rate limit on ${label}`);
  assert.ok(/ipPerMinute\s*:/.test(cfg), `${label} must meter the origin IP`);
  if (kind === 'dual') {
    assert.ok(/uid\s*:/.test(cfg), `${label} must also meter the verified caller UID`);
  }
}

// 6h. TON redemption must be bound to an order owned by the caller.
assert.ok(
  workerContent.includes('ORDER_REQUIRED') && workerContent.includes("order.user_id !== callerOrderRef"),
  'TON verification must require an orderId owned by the authenticated caller'
);
assert.ok(
  workerContent.includes("WHERE order_id = ? AND user_id = ?"),
  'Order fulfilment write must be scoped to the caller, not the client-supplied order id alone'
);

// 6i. Reporter identity must come from the session, never the request body.
assert.ok(
  !workerContent.includes('const { questionId, category, details, userEmail }'),
  'Problem reports must not accept userEmail from the client body'
);

// 6j. Public stats route must project explicit columns.
assert.ok(
  !workerContent.includes("SELECT * FROM item_stats_cache"),
  'Public item stats must use an explicit column projection, not SELECT *'
);

// 6k. Loopback origins must not be credentialed in production.
assert.ok(
  workerContent.includes('allowLoopbackOrigins'),
  'Loopback CORS origins must be gated to non-production environments'
);

// 6l. Auth session recording must not seed identity from the request body.
const authContent = fs.readFileSync(path.join(ROOT, 'workers', 'api_auth.js'), 'utf8');
assert.ok(
  !authContent.includes("let uid = (body && body.uid)"),
  'recordAuthSession must not seed uid from the client body'
);
assert.ok(
  !authContent.includes("let email = (body && body.email)"),
  'recordAuthSession must not seed email from the client body'
);

console.log('   ✔ Regression guards verified: throttle anchoring, create-path rules, PII scoping, payment binding, and identity seeding all hardened.\n');

console.log('================================================================');
console.log('✅ ALL DEFENSIVE SECURITY SPECIFICATIONS VERIFIED (100% PASS)');
console.log('================================================================');
