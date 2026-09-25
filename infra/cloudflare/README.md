# Tier 2: Edge rate limiting

Everything in this directory runs **in front of** the Worker. That distinction is the
whole point of the layer.

## Why this layer exists

`wrangler.toml` sets `run_worker_first = true`. Today that means **every** request to
`clariora.com.au` - including static assets and hostile floods - dispatches the Worker
and is billed as an invocation before a single line of our own limiting code executes.
The Durable Object limiter in `workers/coach_rate_limiter.js` is real protection for the
*database and the AI providers*, but it cannot protect the *Worker invocation budget*,
because by the time it runs the invocation has already been paid for.

Rules in Cloudflare's `http_ratelimit` phase evaluate in the edge proxy, before Worker
dispatch. A request blocked there costs zero Worker invocations, zero D1 reads and zero
Durable Object wakeups.

```
client ──▶ [ Tier 2: http_ratelimit ruleset ]  ← blocked here = free
               │ (passes)
               ▼
           Worker dispatch  ← billed from this point on
               │
               ├─▶ [ Tier 3: dual-key DO limiter ]
               └─▶ [ Tier 3: atomic AI budget reservation ]
```

## Files

| File | Purpose |
|---|---|
| `rate-limit-ruleset.json` | Free-plan single rule (period 10). Source of truth for production deploy. |
| `rate-limit-ruleset.full.json` | Multi-rule design for Business/Enterprise (`--full`). |
| `deploy-rate-limits.mjs` | Validates and creates/updates the zone `http_ratelimit` entrypoint. |
| `run_deploy_rate_limits.mjs` | Loads `CLOUDFLARE_*` from `.env` and runs the deploy script. |
| `verify-edge-limits.mjs` | Live probe: proves a flood is stopped at the edge, not in the Worker. |

## Deploying

```bash
node infra/cloudflare/deploy-rate-limits.mjs --dry-run
```

```bash
node infra/cloudflare/run_deploy_rate_limits.mjs
```

Or with explicit env:

```bash
CF_API_TOKEN=... CF_ZONE_ID=... node infra/cloudflare/deploy-rate-limits.mjs
```

Free plan limits: **1 rule**, **period 10**, **mitigation_timeout 10**. The full multi-rule file needs a higher Cloudflare plan (`--full`).

The API token needs **Zone → Zone WAF → Edit** on `clariora.com.au`. Do not commit it.

## Verifying

```bash
node infra/cloudflare/verify-edge-limits.mjs https://clariora.com.au --confirm
```

This sends real bursts and will rate limit the IP you run it from for up to five
minutes, which is why it requires `--confirm`. It classifies each block:

- **EDGE**: HTML Cloudflare response, no `X-RateLimit-*` headers. Our code never ran.
- **WORKER**: JSON response with the full header trio. The request was dispatched and billed.

A result of "limited only by the Worker" means the ruleset is not deployed or does not
match that path. The endpoint is still protected, but every rejection is costing money.

## Plan limitations you should know about

- **Counting is per-datacentre.** On Free/Pro/Business plans `cf.colo.id` is a required
  characteristic, so a limit of 10/min is 10/min *per Cloudflare colo*. A distributed
  attacker sees a higher effective ceiling than the number in the config. Tier 3 is what
  makes the per-user number exact.
- **Per-token counting needs Enterprise.** Counting on
  `http.request.headers["authorization"]` would let the edge enforce per-caller limits.
  Until then this layer is deliberately IP-only and per-UID enforcement is Tier 3's job.
- **Valid `period` values** are 10, 60, 120, 300, 600, 3600. Nothing else is accepted.

## Related: Firestore TTL for the Cloud Functions limiter

`functions/src/index.ts` writes rate-limit and quota documents to the `rate_limits`
collection with an `expiresAt` field. **Firestore does not act on that field unless a TTL
policy exists.** Without the policy the collection grows without bound and the rate
limiter becomes its own storage bill: a cost control that costs money.

Create it once per project:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl --project=clariora
```

```bash
gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl --project=clariora-d7ed3
```

Confirm it is active:

```bash
gcloud firestore fields ttls list --collection-group=rate_limits --project=clariora
```
