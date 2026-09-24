# 3-Tier Rate Limiting Architecture

Audit, implementation and verification record for defense-in-depth rate limiting across
the client runtime, the Cloudflare edge, and the server tier.

**Verification:** `node tools/test_rate_limit_defense.js` - 59 checks, part of `npm test`.

---

## 0. Scope correction

The mandate was written for a React + Firebase Cloud Functions application. The actual
codebase is:

- **Frontend:** vanilla ES5-style IIFE modules under `js/`, wired through
  `window.APlus` and inline `onclick` attributes. No React, no build step, no SWR or
  React Query. `useEffect` / `useDebouncedCallback` / `useThrottledAction` have no target
  here.
- **Primary backend:** a **Cloudflare Worker** (`workers/api_worker.js`, ~76k) on D1 +
  Durable Objects. This serves essentially all production traffic.
- **Secondary backend:** four **Firebase Cloud Functions v2**
  (`functions/src/index.ts`) - profile read/write, gated content, state sync.

The functional requirements were implemented against the real runtime: submission locks
and request coalescing in place of hooks and SWR, and enforcement work split across both
backends rather than Firebase alone.

The attached `38825.mp4` could not be read (video), so nothing in this document derives
from it.

---

## 1. Phase 1 - Surface audit

### 1.1 Findings: Frontend (Tier 1)

| # | Severity | Finding |
|---|---|---|
| F1 | **High** | **Checkout had no submission lock.** `purchaseProduct` was bound via a bare inline `onclick` in the paywall sheet (`js/stars_billing.js:454`) with no disabled state. A double tap produced two Telegram Stars invoice requests. |
| F2 | **High** | **The coach client could double-dispatch a billed LLM call.** In `js/tma_ghost_coach.js`, a streaming attempt that returned `null` fell straight through to a second full POST. `fetchCoachStream` returned `null` on *any* non-OK response and on *any* thrown error - including a server 500 raised after inference had already started. One user action, two paid inferences. |
| F3 | **High** | **No `AbortController` anywhere in the codebase.** Zero occurrences across `js/` and root modules. No request could be cancelled or timed out; a hung request held its slot indefinitely. |
| F4 | Medium | **No request coalescing.** `/api/v1/auth/me` is called from boot, from resume, and from the gate render path; `/api/v1/billing/entitlement` is read by the paywall sheet, the home widgets and the coach gate. Each produced its own round trip, and each `/auth/me` costs a Firebase JWKS token verification. |
| F5 | Medium | **No retry policy at all** - neither backoff nor a prohibition on retrying 4xx. Nothing stopped a future `catch`-and-retry from turning a 429 into a loop. |
| F6 | Low | **No rate-limit awareness.** The client discarded `Retry-After`, so after a 429 it would immediately dispatch again into a closed window. |

### 1.2 Findings: Edge (Tier 2)

| # | Severity | Finding |
|---|---|---|
| E1 | **Critical** | **The edge layer did not exist.** No Cloudflare Ruleset Engine configuration in the repository, in any form. |
| E2 | **Critical** | **`run_worker_first = true`** (`wrangler.toml:22`) means every request - static assets included - dispatches the Worker. Combined with E1, **100% of hostile traffic was billed as a Worker invocation before any limiter ran.** Existing protections guarded D1 and the AI providers; nothing guarded the invocation budget itself. |
| E3 | Medium | The Telegram payment webhook had no documented ceiling, so any blanket `/api/` rule added later would risk dropping `successful_payment` callbacks - losing real purchases. |

### 1.3 Findings: Server (Tier 3)

| # | Severity | Finding |
|---|---|---|
| S1 | **Critical** | **AI budget enforcement was not atomic.** `assertWithinBudget()` read the counters, the provider was called, then `consumeBudget()` wrote them back. Two defects: **(a) TOCTOU** - N concurrent requests all read the same "under budget" snapshot and all proceeded; **(b) lost updates** - `consumeBudget` computed the new total in JavaScript from a prior `SELECT`, so concurrent settlements overwrote rather than summed. The hard daily/monthly token caps were bypassable by parallelism. |
| S2 | **High** | **`POST /api/v1/auth/telegram` was completely unmetered.** An unauthenticated endpoint performing an HMAC verification and a D1 upsert per call. A free D1 write amplifier and a signature-brute-force surface. |
| S3 | **High** | **Bulk content paths were unmetered:** `/api/v1/bank/full` (returns ~2 MB), `/shards/*`, `/exam_data.js`. Entitlement was checked; request *volume* was not. One Pro account could export the entire paid product at full speed. |
| S4 | Medium | **`GET /api/v1/auth/me` was unmetered** despite performing a Firebase ID token verification against JWKS on every call. |
| S5 | Medium | **No `X-RateLimit-*` headers on any response,** in either backend. Clients had no way to self-regulate. |
| S6 | Medium | **Firebase quotas were not tier-derived.** `functions/src/index.ts` enforced a flat 5/min (30/min read) for everyone. No plan-specific daily allowance existed, so nothing bounded total daily volume. |
| S7 | Medium | **Firestore TTL was assumed, not configured.** The limiter writes `expiresAt` on every `rate_limits` document, but Firestore only acts on that field if a TTL policy exists. No policy was documented or applied - the cost control was accruing unbounded storage. |
| S8 | Low | `resolveEntitlement()` correctly prefers server-owned `/entitlements/{uid}` over the (permanently unset) `claims.tier`. **No defect** - recorded because it is load-bearing for the new tier-derived quotas. |

### 1.4 Already correct before this work

Worth stating, because it shaped the design: the Worker's coach path already had
**dual-key UID + IP limiting** via a Durable Object token bucket, a **tier policy table**
with per-tier per-minute and token budgets, **circuit breakers** per provider, and
**fail-closed** behaviour on an unbound or erroring limiter in production. The
`rate_limits` Firestore collection was already locked to `allow read, write: if false`.
Tier 3 was extended, not invented.

---

## 2. Phase 2 - Implementation

### Tier 1 - Client (`js/request-guard.js`, new)

Exposes `window.APlus.guard`, loaded immediately after `js/core.js` in `index.html`.

| Capability | Behaviour |
|---|---|
| `guard.action(key, fn)` | Single-flight lock. A second call while the first is pending resolves `{ skipped: true }` instead of dispatching. Optional `cooldownMs` covers "click, fail, click again". |
| `guard.button(el, fn)` | Same lock plus `disabled`, `aria-busy`, `data-guard-pending` and optional pending text for the whole life of the promise. |
| `guard.fetch(url, init, opts)` | `AbortController` timeout on every request; in-flight dedupe by key; `supersede` to abort-and-replace; retry capped at **2 total attempts**, exponential backoff with **full jitter**. |
| Retry policy | **Never** retries 4xx - 400/401/403/404/429 all cost exactly one dispatch. Retries only 408/425/500/502/503/504, and only for idempotent methods by default. Mutations default to a single attempt. |
| Local backoff | Parses `X-RateLimit-*` and `Retry-After`. After a 429, subsequent calls to that path are rejected **client-side without a network dispatch** until the window elapses. |
| `guard.debounce` / `throttle` | 350ms default (spec band 300-500ms). Debounce aborts the superseded request and hands the surviving call a fresh `AbortSignal`. |
| `guard.cached(key, loader, ttl)` | Short-TTL read coalescing - the SWR/React Query equivalent. Failures are never cached. |
| `guard.interval(fn, ms)` | Polling that skips ticks while `document.hidden`, fires once on return, and stops after 5 consecutive failures. Added in the second pass; see 3b. |

**Call sites wired:**

- `js/stars_billing.js` - Stars checkout, TON checkout and license activation now export
  locked wrappers keyed per product. Invoice and TON-verify fetches are `maxAttempts: 1`
  (a retried invoice is a second invoice; a retried TON verify re-bills TonCenter).
  Entitlement reads coalesce on one key. The Telegram "digital goods must use Stars"
  policy gate sits **ahead of** the lock, on the exported surface.
- `js/tma_ghost_coach.js` - all coach fetches `maxAttempts: 1`; `explainQuestion` locked
  per question id, including the three internal callers. **F2 fixed:** `fetchCoachStream`
  now tracks `serverAnswered` and returns `null` *only* when the request never reached
  the origin. A server-answered stream - error, empty, or interrupted - is terminal.
- `js/auth-gate.js` - `/auth/me` coalesced, `/auth/session` and `/auth/logout` single-attempt.

### Tier 2 - Edge (`infra/cloudflare/`, new)

Eight rules in the `http_ratelimit` phase, ordered so specific high-cost rules always win:

| Order | Scope | Limit | Mitigation |
|---|---|---|---|
| 1 | Telegram webhook | 600/min | 60s - generous by design; dropping a payment callback loses a real purchase |
| 2 | LLM (`/coach`, `/coach/stream`, `/coach/jobs`) | 10/min | 300s |
| 3 | Auth (`/api/v1/auth/*`) | 10/min | 300s |
| 4 | Billing (`/api/v1/billing/*`) | 12/min | 300s |
| 5 | Bulk bank & shards | 20/min | 120s |
| 6 | Sync / telemetry writes | 60/min | 60s |
| 7 | `/api/` catch-all | 100/min | 60s |
| 8 | Burst guard, 10s window | 40/10s | 60s |

`deploy-rate-limits.mjs` validates before sending and **refuses** an unsupported period,
missing `cf.colo.id`, or a specific rule ordered below the catch-all where it could never
fire. See `infra/cloudflare/README.md` for plan limitations (per-colo counting) and the
required Firestore TTL commands (**S7**).

### Tier 3 - Server

**Cloudflare Worker**

- New `enforceDualKeyLimit(env, request, action, opts)` in `workers/coach_rate_limiter.js`:
  checks UID and IP, logs a structured `rate_limit_exceeded` record on breach, and returns
  the standard headers. Reports against whichever dimension is closest to exhaustion.
- New `rateLimitHeaders()` - `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `X-RateLimit-Reset` (UTC epoch **seconds**), plus `Retry-After` on a block. **(S5)**
- Coverage closed on `/api/v1/auth/telegram` **(S2)**, `/api/v1/auth/me` **(S4)**,
  `/api/v1/bank/full` (IP *and*, after identity is proven, UID) and `/shards/*` **(S3)**.
- The coach handler now emits limit headers on success, on SSE, and on both 429 paths.

**Atomic AI credit reservation (S1)** - `workers/token_budget.js`

`reserveBudget()` replaces read-then-check. The ceiling test and the debit are a **single
conditional `UPDATE`**, so SQLite/D1 evaluates the `WHERE` against the same row state the
`SET` mutates. A caller that loses the race gets `meta.changes === 0` and is refused
**before any provider is invoked**. Window rollover is expressed inline, so a stale date
resets the counter within the same statement. `settleBudget()` reconciles the pessimistic
estimate against real provider usage as a *relative* adjustment, so concurrent settlements
sum instead of clobbering.

Fails **closed**: a budget-store outage returns `BUDGET_STORE_ERROR` and the coach handler
maps it to **503**, not 402 - a paying user should not see a paywall because our accounting
is down.

**Firebase Cloud Functions** - `functions/src/index.ts`

- `enforceDailyQuota(uid, tier, action)` **(S6)** - plan-specific daily allowances
  (free 50, daily_pass 400, pro_monthly 1000, lifetime 2000) counted in a transaction
  against a per-UID-per-day document. Tier comes from `resolveEntitlement()`, i.e.
  server-owned state; a test asserts no quota call reads `req.` or `body.`.
  Keyed on UID only - a daily cap on a shared NAT address would lock out a campus.
- `applyRateLimitHeaders()` on every endpoint, success and failure. **(S5)**
- `logRateLimitBreach()` emits a structured `rate_limit_exceeded` record with dimension,
  reason, uid, ip and tier for Cloud Logging alerting.
- The sliding-window limiter now reports `resetAt` from **when its oldest entry ages out**,
  which is what a sliding window actually does, rather than a fixed window rollover.

---

## 3. Phase 3 - Verification

`node tools/test_rate_limit_defense.js` - **59 checks, all passing**, included in
`npm test` (39/39 test scripts pass).

The Tier 1 tests load the real `js/request-guard.js` into a synthetic `window`, so the
shipped file is exercised. The Tier 3 budget tests run against a **real SQLite engine**
(`node:sqlite`) through a D1-shaped shim - the atomicity claims are executed, not asserted.

### Against the mandate's closing criteria

| Required | Evidence |
|---|---|
| Double-clicking emits no redundant requests | *"double-click on a guarded action dispatches once"* - two clicks in one tick, 1 dispatch, second reports `skipped`. Plus *"lock releases so a later click still works"*. |
| Repeated requests from one IP hit edge blocks before compute | Statically: ruleset ordering, coverage and period validity are asserted. **Live proof requires `infra/cloudflare/verify-edge-limits.mjs <url> --confirm`**, which distinguishes an EDGE block (HTML, no `X-RateLimit-*`) from a WORKER block (JSON, full headers). **Not yet run - see Outstanding.** |
| Accounts throttled at their tier boundary regardless of IP rotation | *"rotating the IP does not escape the UID ceiling"* - a fresh exit IP per request, blocked on the UID dimension. Converse also tested: *"rotating the UID does not escape the IP ceiling"*. And *"the IP allowance is wider than the UID allowance"* - one noisy user does not lock out their NAT neighbours. |
| Breaches fail closed, return 429, emit structured alerts | *"an unbound limiter fails CLOSED in production"* (and fails open in development only). *"a budget-store outage fails CLOSED"*, distinguishable from a quota wall. Structured `rate_limit_exceeded` JSON on every breach path. |

### Additional verified properties

- 4xx is never retried - all of 400/401/403/404/429 cost exactly one dispatch.
- 5xx retries clamp to 2 total attempts even when the caller asks for 9.
- A 429 arms a local backoff; the next call is rejected with **zero** network dispatches.
- Four sibling boot reads of `/auth/me` collapse into one request.
- Reservations exhaust **exactly** at the cap (8 × 10 000 into an 80 000 budget, never 9).
- Settlement refunds over-reservation, charges under-reservation, and concurrent
  settlements sum.
- A stale day rolls the window over inside the same statement.
- An unknown Firebase uid is not handed a fresh budget.

### One bug found by the tests, in this work

`enforceDualKeyLimit` originally floored the IP capacity at the UID capacity
(`Math.max(uidCapacity, ipPerMinute)`). On the endpoints with no caller identity the UID
number is an unused default of 30, so the intended 15/min ceiling on
`/api/v1/auth/telegram` was silently widening to 30/min. Caught by *"an unauthenticated
caller is still metered on IP"*, fixed, and the reasoning is now a comment at the site.

### Two pre-existing tests were updated, deliberately

`test_tma_ai_paywall.js` and `test_tma_production_suite.js` both asserted
`freeQuotaRemaining === 4` after one call. Their `MockD1.run()` returned `{ success: true }`
with no `meta`, so every reservation looked like a miss. The old assertion passed only
because `consumeBudget` computed its return value in JavaScript rather than re-reading -
the counter was never actually persisted in those fixtures either. The mocks now model the
real statements via `tools/mock_d1_budget.js`, and **assert loudly** if `token_budget.js`
grows a statement they do not recognise, rather than silently returning "no rows changed".

Their Telegram-policy assertion (`purchaseProductWithTon` must force Stars inside a Mini
App) was satisfied by moving that gate onto the exported wrapper rather than by weakening
the test - which is the better placement anyway: the policy check should not be able to
take a submission lock.

---

## 3b. Second pass - gaps closed after the initial review

A re-read of the mandate against what actually shipped found six more gaps, all
unblocked. All are now implemented and covered by regression tests.

| Gap | Fix |
|---|---|
| **11 endpoints returned bare 429s.** Only the newly-covered routes emitted `X-RateLimit-*`; the pre-existing ones returned a hardcoded `Retry-After: 60` and nothing else - so clients could not self-regulate against them. | All 11 converted to `enforceDualKeyLimit`. **16 of 16** 429 paths now carry the full header set, verified by a test that scans every `status: 429` block. `enforceCoachRateLimit` is no longer called from `api_worker.js` at all. |
| **Two more billed LLM paths were unguarded.** `js/ghost-coach.js:588` reaches the same AI gateway as the Mini App coach, and `js/groq-client.js:125` calls the Groq API *directly from the browser* with no server-side budget in front of it. Both were missed in the first pass. | Both routed through the guard, single-attempt. |
| **Four more client fetches unguarded:** the ~2 MB bank download (`entitlements.js`), telemetry flush, problem reports, and TON order creation. | All guarded with attempt caps matched to their cost; the bank download is also coalesced. |
| **Two unbounded polling loops.** `js/sync.js` diffed and stamped state every 4s **forever**, including in a backgrounded tab, and could push to the network. `js/entitlements.js` polled the DOM **twice a second, forever**. This is the vanilla-JS form of the runaway-re-render problem the mandate names. | New `guard.interval()` skips ticks while `document.hidden`, fires once on return so the UI is never stale, and stops permanently after 5 consecutive failures. Both loops converted. (`boot-intro.js` has a third interval - left alone: it self-terminates and touches no network.) |
| **The Telegram webhook had no Worker-side limit**, only an edge rule. | Backstop added at 600/min, deliberately placed *after* the secret check so a spoofed request cannot consume the budget real payment callbacks depend on. Returns 429, which Telegram honours with backoff and redelivery - a throttled callback is delayed, not lost. |
| **Nothing consumed the structured breach logs.** | `infra/gcp/alerting.yaml` - 3 log-based metrics and 5 alert policies, separating abuse signals from availability signals (a limiter failing closed is an outage, not an attack). Deployed via `infra/gcp/deploy-alerting.mjs`, which supports `--dry-run`. |

### Three pre-existing assertions were re-expressed

`tools/verify_security_architecture.js` asserted rate limiting by grepping for the old
bucket-key literals (`sync_uid:`, `admin_session_ip:`, …). Those were an implementation
detail of the single-key limiter, not the property being protected. They now parse the
actual `enforceDualKeyLimit` call options and assert that **both dimensions are
configured** - a stronger check that survives the next refactor. Three endpoints missing
from that table (`item_report`, `shards`, `auth_me`) were added while there.

### New regression guards

So none of this silently rots:

- Every `status: 429` in the Worker must spread a `*Limit.headers` object.
- `enforceCoachRateLimit(` must not appear in `api_worker.js`.
- The webhook limiter must come *after* the secret verification.
- No bare `fetch(` in any of the nine network-touching client modules.
- `sync.js` and `entitlements.js` must use `guard.interval`.

---

## 4. Outstanding - requires production credentials or an operator decision

None of these can be completed from the repository alone.

1. **Deploy the edge ruleset.** `CF_API_TOKEN` + `CF_ZONE_ID`, then
   `node infra/cloudflare/deploy-rate-limits.mjs`. Until this runs, **E1/E2 are unmitigated**
   and every blocked request is still a billed Worker invocation.
2. **Run the live edge probe** to convert the Tier 2 claim from static to empirical. It
   rate-limits the IP it runs from for up to 5 minutes, so it needs an explicit `--confirm`.
3. **Apply the Firestore TTL policy (S7)** for both projects - commands in
   `infra/cloudflare/README.md`. Without it the `rate_limits` collection grows forever.
4. **Apply the alerting config.** Definitions are written and dry-run clean; creating
   them is a production change:
   `node infra/gcp/deploy-alerting.mjs --project clariora --notification-channel <channel>`.
   Run `--dry-run` first. Needs a gcloud identity with access to the `clariora` project -
   the account authenticated on this machine (`oyaconservationassembly@gmail.com`,
   project `luminara-ledger`) is a different project.

## 5. Known limitations

- **Edge counting is per-datacentre** on non-Enterprise plans (`cf.colo.id` is a required
  characteristic). A distributed attacker sees a higher effective ceiling than the
  configured number. Tier 3 is what makes the per-user figure exact.
- **A reservation is not refunded if the Worker crashes** between `reserveBudget` and
  `settleBudget`. This over-counts the user slightly, which is the correct direction to be
  wrong in for a spend control.
- **Reservation estimates are pessimistic by design** (full-length completion per allowed
  turn). Users briefly see less headroom than they will ultimately be charged for;
  settlement returns it.
- **Tier 1 is not a security control.** It protects honest users from accidental spend.
  Every limit it applies is re-applied at Tiers 2 and 3.
