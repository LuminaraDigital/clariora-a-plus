# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 3.1.x | Yes |
| Older | No |

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's advisory form:

https://github.com/LuminaraDigital/clariora-a-plus/security/advisories/new

If you cannot use that form, email luminaradigitalagency@gmail.com with the subject line "Clariora security".

Include the version, the platform, steps to reproduce and any proof of concept. You will get an acknowledgement within five working days and a fix or a mitigation plan within thirty days for confirmed issues.

Please do not open a public issue for a security problem and please do not test against other people's deployments.

## Scope

In scope:

- The web app, the Electron desktop app and the preload bridge
- The offline licence and entitlement checks
- The optional Supabase sync layer and its schema
- The build, release and deploy tooling in `tools/`

Out of scope:

- Third-party services the app can talk to (Groq, Supabase, Cloudflare) unless the issue is in how this project uses them
- Denial of service against a self-hosted instance

## Design notes for reviewers

- The Electron renderer runs with context isolation on and node integration off. All privileged operations go through the allow-list in `preload.js`.
- Licence keys are verified with an ECDSA P-256 public key that ships in `js/entitlements-config.js`. The private key never leaves the build machine and is gitignored under `build/certs/`.
- The AI tutor key is supplied by the user at runtime and held in local storage. It is never written to the repository or sent anywhere except the configured Groq endpoint.
- Learner progress is stored locally. Cloud sync is opt-in and off by default.

## Production secrets hygiene (ops checklist)

Rotate and store these outside git (Cloudflare `wrangler secret put`, never commit values):

| Secret | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | initData HMAC and Bot API |
| `TELEGRAM_WEBHOOK_SECRET` / `EDGE_WEBHOOK_SECRET` | Telegram webhook auth |
| `AUTH_SESSION_SECRET` | Signed session cookies (required in production; do not reuse `ADMIN_API_KEY`) |
| `ADMIN_API_KEY` | Admin routes only |
| `GROQ_API_KEY` / `NVIDIA_API_KEY` / `OPENROUTER_API_KEY` | Coach providers |
| Firebase / Supabase service credentials | Sync and Functions |

After any suspected leak: rotate the bot token and webhook secret first, then session and AI keys, then redeploy the Worker. Confirm `AUTH_SESSION_SECRET` is set in production before relying on cookie sessions.

## Hardening verification

Run locally before production deploy:

```text
node tools/verify_security_architecture.js
node tools/test_payment_binding.js
node tools/test_stars_binding.js
node tools/test_tma_ai_paywall.js
node tools/test_auth_session.js
```
