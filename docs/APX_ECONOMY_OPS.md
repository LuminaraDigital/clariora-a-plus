# APX economy ops (soft currency + money-rail testnets)

APX is a local Learn-to-Earn soft currency. It is never bought with money, transferred, or cashed out. Real Pro access is sold via Telegram Stars, TON, or XDC.

## Simulation and rebalance

```bash
# Current params (must stay Green after Phase 1)
python tools/apx_economy_sim.py --ci --n 200

# Document pre-budget leak (always exits 0)
python tools/apx_economy_sim.py --legacy --n 200

# Yellow-zone suggestions only (human opens the PR)
python tools/apx_economy_sim.py --suggest --n 200
```

Controller zones:

- Green: no change
- Yellow: apply `--suggest` as a PR; never auto-merge constants
- Red: block merge; human sign-off required

Params live in `tools/apx_economy_params.json` and must stay aligned with `ledger_engine.js` `EARN_RULES` / `UNLOCK_CATALOG`.

## Staging / production deploy

1. `python tools/build_web_dist.py`
2. Apply D1 migrations to staging: `npx wrangler d1 migrations apply clariora_edge_db_staging --remote -c wrangler.staging.toml`
3. Staging: `python tools/deploy_cloudflare.py --env staging`
4. Apply D1 migrations to production: `npx wrangler d1 migrations apply clariora_edge_db --remote`
5. Production: `python tools/deploy_cloudflare.py --env production`

CI deploys do not apply migrations. The Worker tolerates a missing 0004 (the cache table is created on first use; usage and APX rows fall back to the pre-0004 columns), but cost attribution and the holdout arm are only recorded once 0004 is applied. Migration 0004 uses `ALTER TABLE ADD COLUMN`, so it cannot be re-run by hand after it succeeds; let wrangler track it.

## AI cost controls

| Flag (`[vars]` in wrangler toml) | Staging | Production | Effect when `"0"` |
|---|---|---|---|
| `AI_EXPLAIN_CACHE` | `"1"` | `"0"` | No shared explanation cache: every explain call reaches a model |
| `AI_GUARD_CONSISTENCY` | `"1"` | `"1"` | Replies contradicting the bank answer are shown. Also disables caching |

Wrangler overwrites dashboard vars on every deploy, so change flags in the toml and redeploy. A dashboard edit is an emergency switch that lasts until the next deploy.

Turning the production cache on:

1. On staging, run `COACH_EVAL_ID_TOKEN=<test account token> node tools/eval_coach.js --live --base https://clariora-a-plus-staging.sparkling-fog-be2d.workers.dev --n 50` twice. The second pass should show cache hits, `groundedRate` of at least 0.9, and `letterRate` of 0.
2. Check `GET /api/v1/admin/ai-cost?days=1` on staging (header `X-Admin-Key`): `explainCacheHitRate` above 0, and cache rows carrying 0 tokens.
3. Set `AI_EXPLAIN_CACHE = "1"` in `wrangler.toml` and deploy production.

Pre-warm (optional, spends about 900 provider tokens per pair, about 2.7M for the bank): `NVIDIA_API_KEY=... node tools/prewarm_explain_cache.js --limit 50` writes SQL to `_bank/analysis/prewarm_explain_cache.sql`. Review a sample by hand, then re-run with `--apply staging`, and later `--apply production`. Use `--offset` to resume in batches.

Admin reports (both need `X-Admin-Key` or an admin session):

- `GET /api/v1/admin/ai-cost?days=7`: spend by provider, model and intent, cache hit rate, masked per-user outliers. Set `AI_PRICE_JSON` (for example `{"groq":0.69}` in USD per 1M tokens) to make costs match invoices; until then the report says `pricesAreEstimates: true`.
- `GET /api/v1/admin/apx-anomalies?days=7`: over-budget user-days, `TEST_*` and `UNKNOWN` mint sources, and the holdout readout. Flags are for review only; no account is changed.

Expired cache rows (90 days) are purged by the daily 06:00 UTC cron. Rebuild `workers/bank_stems.js` with `python tools/build_similar_neighbors.py` whenever the bank changes.

## Money-rail testnet QA (not APX)

You need testnet only to QA paid entitlements. You do **not** need testnet for APX balance math or for AI coach grounding.

### TON testnet

1. Staging Worker env: `TON_NETWORK=testnet`, testnet merchant wallet, TonCenter testnet API key
2. Client: set network `testnet` in non-prod (`js/ton_credentials.js` / order body)
3. Fund a test wallet with testnet TON
4. Run `node tools/test_xdc_and_ton_dual_chain.js` and a manual Mini App purchase on staging
5. Confirm `ton_orders` / `ton_transactions` rows and Pro entitlement; APX unchanged

### XDC Apothem

1. Non-prod only: `network=apothem` (chainId 51)
2. Fund Apothem XDC; use staging merchant address
3. Confirm `xdc_orders` fulfilment on staging Worker

### Stars

Use Telegram invoice sandbox / staging bot token. Digital goods use currency XTR.

## AI quality (separate from testnet)

Coach grounding is objectives map + Vectorize/neighbors + learner memories (`workers/coach_orchestrator.js`, `workers/question_vectors.js`, `workers/agent_memory.js`). Reducing hallucination means better retrieval, refusal prompts, and golden-set evals - not a blockchain.
