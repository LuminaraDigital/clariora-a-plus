# Clariora agent workflow and production plan

Date: 2026-09-10  
Scope: mem0, CrewAI, AutoGen, LangChain, Crawl4AI patterns + auth, Stars, TON, security, deploy.

## Pushback (intentional)

Do **not** vendor full Python stacks (CrewAI / AutoGen / LangChain / mem0 / Crawl4AI) into this Cloudflare Workers + static web product.

Reasons:

1. Learners are non-developers. Runtime must stay invisible and server-owned.
2. Workers edge runtime cannot host those Python frameworks.
3. AutoGen is in maintenance mode; Microsoft points new work at Agent Framework.
4. Shipping five frameworks duplicates what `workers/coach_orchestrator.js` already does (triage, specialists, tools, max turns).

**Strategy:** extract proven patterns into a lean Clariora Agent Runtime (CAR) on the Worker.

Research clones (analysis only, not product deps): `%TEMP%\clariora-agent-research\{mem0,crewAI,autogen,langchain,crawl4ai}`.

---

## What to take from each repo

| Repo | Keep | Skip |
|------|------|------|
| **mem0** | User / session / agent memory add+search; inject top memories into coach prompts; persist weak objectives and preferences | Hosted Qdrant SaaS, Python SDK in client |
| **CrewAI** | Role + goal + backstory packs; sequential process (handoff chain); tool allowlists per role | Full multi-agent fleet, Python crews in browser |
| **AutoGen** | Max-round termination, tool-using assistant, explicit handoff | GroupChat fleets; Autogen as dependency (maintenance) |
| **LangChain** | Chain composition, allowlisted tools, structured output, callback/trace hooks | Full LangChain/LangGraph Python or JS runtime on edge |
| **Crawl4AI** | LLM-ready markdown extract for **allowlisted admin ingest only** | Open web crawl of copyrighted CompTIA/exam content |

---

## Current Clariora baseline (verified)

- Edge coach: `workers/coach_handler.js` + `coach_orchestrator.js` + tier/budget/rate-limit/circuit.
- Auth: Firebase (Google/email) + Telegram Login + TMA `initData`; wall in `js/auth-gate.js`.
- Stars (XTR): `js/stars_billing.js` + Worker invoice/webhook (Telegram digital goods path).
- TON: server `/api/v1/billing/ton/verify` exists; client TonConnect manifest pointed at dead host; credentials mint is demo-grade.
- Live host: `https://clariora.com.au` (Worker). Pages.dev has no API.

### Critical bug found this session

Auth modal `z-index: 1000` vs login wall `z-index: 10050`. Email/Google modal opens **behind** the wall. Users cannot complete signup/signin. That reads as "app not loading."

---

## Target UX (non-developer)

1. Landing CTA → `/app` → clear gate: Google / Telegram / Email / **Create account**.
2. After auth: unlock practice; free AI quotas apply; Stars upgrade in TMA; TON Connect for web on-chain unlock + mastery credentials.
3. Ghost Coach stays invisible: watches misses, writes memories, builds missions. No agent control panel for learners.
4. Backend agents only: orchestrator + memory + allowlisted tools. Humans never "drive" LangChain graphs.

---

## Implementation phases

### Phase 0: Unblock production (same deploy)

1. Raise auth modal z-index above wall; wall Create account CTA.
2. Session audit soft-fail: verified Firebase/Telegram identity unlocks; show sync warning if POST fails.
3. Fix landing canonicals to `https://clariora.com.au`.
4. Service worker: never cache `/api/*`; network-first for `/app`.
5. Sync version stamps; stop sending gated users to Pages-only URLs.

### Phase 1: Lean Agent Runtime (CAR)

1. `workers/agent_memory.js`: D1 `learner_memories` (user_id, kind, content, objective, score, updated_at).
2. Coach path: search memories → inject into specialist prompt → write miss/preference memories after turn.
3. Expand CrewAI-style specialist packs (role/goal/backstory) without new deps.
4. LangChain-style tool schema registry + turn trace stored in D1 for ops (no PII in logs).
5. Admin-only curriculum ingest job (Crawl4AI pattern): allowlist hosts only; markdown normalize; never public crawl.

### Phase 2: Payments and credentials

1. Telegram Stars: keep XTR invoices; verify webhook grants; surface paywall clearly for free quota.
2. TON Connect: host `tonconnect-manifest.json` on `clariora.com.au`; load `@tonconnect/ui`; wire verify rail for web unlocks.
3. Separate **payment** (Stars/TON unlock) from **credential mint** (proof-of-mastery SBT/memo). No simulated paid entitlement in production.

### Phase 3: Security harden

1. Rate limiter: fail-closed when DO errors in production; only fail-open in explicit local/dev.
2. Kill browser direct Groq (`api.groq.com`) for web; Electron may keep user-supplied key via IPC.
3. All coach/stream require Firebase idToken or Telegram auth.
4. Firebase Console: authorized domains for clariora.com.au + workers.dev.
5. Keep hard token budgets on paid tiers (never unlimited AI).

### Phase 4: Dead code / bloat

1. Deduplicate Ghost Coach messaging (local heuristics vs edge LLM stay, one product story).
2. Remove demo TON simulation mint from production builds.
3. Align docs (`MONETIZATION.md`, README) with Firebase + Stars + TON reality.
4. Defer heavy `exam_data.js` off critical path where safe.

### Phase 5: Verify, deploy, push

1. `python tools/build_web_dist.py`
2. `python tools/deploy_cloudflare.py --skip-build` (or full)
3. Smoke: landing, `/app` gate, email modal visible, `/api/v1/health`, Stars invoice error shape, auth session.
4. `git push` after local verify (user requested).

---

## Success metrics

- Sign-in / Create account modal visible above gate (manual browser check).
- Unauthenticated browser cannot use app shell; authenticated can.
- Coach without auth → 401; free over quota → 402; over rate → 429.
- Memories influence next coach response for same uid.
- Stars invoice path live with bot token; TON manifest 200 on clariora.com.au.
- Live URL: https://clariora.com.au/

## Sources retrieved this session

- https://github.com/mem0ai/mem0 (README patterns)
- https://github.com/crewAIInc/crewAI
- https://github.com/microsoft/autogen (maintenance notice)
- https://github.com/langchain-ai/langchain
- https://github.com/unclecode/crawl4ai
- https://docs.ton.org/v3/guidelines/ton-connect/overview
- https://core.telegram.org/bots/payments-stars
