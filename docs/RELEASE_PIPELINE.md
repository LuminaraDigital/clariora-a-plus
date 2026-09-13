# Release pipeline: staging before production

Direct pushes to production without staging validation are a critical failure.
This document is the source of truth for branch flow, environment isolation,
and CI gates.

## Branch hierarchy (required)

```
feature/*  ->  staging  ->  main (production)
```

1. Create `feature/<short-name>` from the latest `staging` (or `main` only if staging does not exist yet).
2. Open a pull request into `staging`. CI must pass.
3. Validate on the staging Worker (`clariora-a-plus-staging`).
4. Open a pull request from `staging` into `main`. CI must pass again.
5. Merge to `main` only after staging sign-off. Production deploy runs from `main`.

Never push feature branches straight to `main`. Never deploy production from a laptop using production credentials without a staging pass first, except documented emergencies.

## Environment isolation

| File | Purpose |
|------|---------|
| `.env.local` (from `.env.local.example`) | Laptop / mock keys |
| `.env.staging` (from `.env.staging.example`) | Staging Worker, staging D1, staging R2 bucket, sandbox Telegram bot |
| `.env.production` (from `.env.production.example`) | Production only |
| `wrangler.toml` | Production Worker + zone routes |
| `wrangler.staging.toml` | Staging Worker, no production DNS routes |

Rules:

- Staging must use a separate D1 database id and R2 bucket name.
- Staging Telegram bot tokens must not be the production bot.
- `APP_ENV` must match the file (`staging` / `production` / `local`).
- Validate before deploy: `node tools/config_validator.js --env-file=.env.staging --app-env=staging`

## CI / CD gates

Workflow: `.github/workflows/ci.yml`

| Trigger | Jobs |
|---------|------|
| PR to `staging` or `main` | Lint/syntax, web build, Node tests, bank validate, secret/media guard |
| Push to `staging` | Same tests + deploy staging Worker (`wrangler.staging.toml`) when token present |
| Push to `main` | Same tests + deploy production Worker (`wrangler.toml`) when token present |
| Tag `v*` / manual | Linux desktop packages + smoke |

Local pre-push:

```bash
npm run smoke:prepush
```

## GitHub branch protection (dashboard)

Apply in the GitHub repo settings (cannot be enforced from this file alone):

**`staging`**

- Require pull request before merge
- Require status check: `Lint, test, validate bank`
- Dismiss stale reviews
- Restrict who can push

**`main`**

- Require pull request before merge
- Require status check: `Lint, test, validate bank`
- Require branches to be up to date
- Optionally require the PR head branch to be `staging`
- No force pushes; no deletions

## Deploy commands

```bash
# Staging
python tools/deploy_cloudflare.py --env staging

# Production (only after staging validation)
python tools/deploy_cloudflare.py --env production
```

## Verification checklist

See the Phase 3 checklist at the bottom of any release PR, or copy:

- [ ] Async actions show busy / disabled state (onboarding diagnostic, license activate, auth submit)
- [ ] Inline validation errors are plain language next to fields
- [ ] Empty home "Recent attempts" shows a Next step CTA
- [ ] Adaptive raid failures use inline feedback (no blocking `alert`)
- [ ] Onboarding draft restores after accidental navigation away
- [ ] Telemetry events fire for onboarding, TTFV, funnel abandon, validation errors (local buffer)
- [ ] `.env.staging` and `.env.production` are separate files with different secrets
- [ ] Staging Worker has no production zone routes
- [ ] CI green on the PR into `staging`, then again into `main`
- [ ] Staging smoke passed before production merge
