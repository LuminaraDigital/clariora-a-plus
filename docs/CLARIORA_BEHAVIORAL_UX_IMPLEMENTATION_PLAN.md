# Clariora behavioral UX + HD labs: production implementation plan

Status date: 2026-09-29  
**Phase status:** 0 complete · 1 complete (path + close-loop + friction) · 2 partial (JIT live; exam-day via existing Pearson mode; HD Blender textures deferred) · 3 complete (habit-66 + prune dark + social-proof hide-until-data) · 4 partial (Proof of Readiness export live; Telegram digest Worker deferred) · 5 complete for CI governance (Clariora governance gates live)

Scope: close the loop between what learners do and what they feel; ship adaptive coaching, not more unused features; raise Three.js / Blender labs to industry-grade teaching twins; use Clariora-native release budgets in `config/clariora_governance.json` (no third-party agent orchestrator in this repo).

Related plans (do not duplicate; extend):

- `docs/L2E_RETENTION_IMPLEMENTATION_PLAN.md` (APX, streak, quests)
- `docs/ROADMAP_10X.md` (trust, calibration, exam-day mode)
- `docs/AGENT_WORKFLOW_IMPLEMENTATION_PLAN.md` (lean agent runtime on Workers)
- `docs/BIG_DATA_IMPLEMENTATION_PLAN.md` (item stats / IRT)
- `docs/ANALYTICS.md` (event contract)

---

## 0. Pushback (intentional)

1. **Do not build all seven "sticky" ideas in parallel.** The same literature that motivates this plan shows most shipped features go unused. Clariora already has diagnostic, today-set, adaptive raids, daily quest, soft streak, SRS, hansei journal, Ghost Coach, PBQs, and 3D stages. Shipping seven new surfaces on top without pruning guarantees more dead chrome.
2. **Do not vendor third-party agent orchestrators into this repo.** Extract useful budget ideas only. Clariora gates live in `config/clariora_governance.json` and `tools/test_clariora_governance.js`.
3. **Do not market "photoreal / FLIR / Top 1%" until the render stack earns it.** Current GLBs are procedures with 0 texture images. Upgrade materials and lighting first; then tighten copy.
4. **Cite carefully.** Standish "70% unused" is often a LinkedIn paraphrase. Standish materials more commonly report ~50% features never/hardly used and ~20% used often (and the famous 64% figure came from four internal apps). Retention curves from Andrew Chen / Quettra (2015-era Android) are real but old; use them as directional, not as Clariora's measured baseline.

---

## 1. North Star and supporting metrics

**Primary North Star (threshold):** share of learners who reach predicted scaled score >= 750 (Core 1) or >= 700 (Core 2) within 30 days of first diagnostic completion.

**Co-primary North Star (lift, from CEO review):** Day-21 predicted-score lift (points) among weekly active learners who completed the diagnostic and logged >= 3 qualifying study days in days 1-21. Score SSOT remains `readiness2.compute` (day 0 post-diagnostic vs day 21). Cut Core 1 / Core 2 separately.

**Supporting metrics (instrument before feature work):**

| Metric | Definition | Source |
|---|---|---|
| D1 / D3 / D7 / D30 return | Distinct install or uid active on day N after diagnostic complete | `telemetry` + Firebase `learning/state` |
| Tiny-win completion | Share of home "next tiny win" taps that finish the task | `tiny_win_*` events |
| Loop action rate | Share of close-loop panels where the CTA is taken | `loop_shown` / `loop_action_taken` (Phase 1) |
| Friction answer rate | Share of JIT micro-surveys answered (not dismissed) | new events |
| Domain climb | Objective_stats accuracy delta over 7 days for weakest domain | `readiness2` |
| PBQ start-to-complete | PBQ opens that reach `pbq:completed` | bus + telemetry |
| Feature discovery | Unique features opened per user in first 7 days (cap; not maximize) | `feature_opened` |
| Coach cost USD / successful session | Unit economics kill switch | Worker token_budget + orchestrator dailyLimitUsd |
| Lab visual budget | Each GLB <= 500 KB; PWA precache shell <= 12 MB | CI gates from orchestrator |

Holdout: 10% of new accounts never see the new coaching chrome (reuse L2E holdout pattern) so retention lifts are causal, not vanity.

### 1a. Phase 0 status (reconciled 2026-09-29)

CEO review preferred "prune first, then close-loop on raid finish." Repo already shipped a thinner Phase 0 in the same session:

| Item | Status |
|---|---|
| Clariora governance CI (`tools/test_clariora_governance.js`) | Shipped |
| Next Tiny Win Home CTA (`js/tiny-win.js`) | Shipped + staging |
| `media/hardware/` in `build_web_dist.py` | Shipped |
| Feature-usage prune logger (`js/feature-prune.js`, dark) | **Next** (CEO Phase 0 remainder) |
| Close-loop panel on weak-raid finish (`js/close-loop-ux.js`) | **Phase 1a** (parallel with Readiness Path) |

Do not reset Phase 0. Fold prune logging and close-loop into Phase 1 tickets below.

---

## 2. What already exists (reuse, do not rebuild)

| Capability | SSOT / files | Gap vs this plan |
|---|---|---|
| Diagnostic + profile | `js/onboarding.js`, `shards/diagnostic_pack.json` | Static after first run; no behavior-reorder of steps |
| Predicted score / readiness | `js/readiness2.js`, `js/readiness-ui.js`, `js/home-widgets.js` | Shows %; rarely explains *why stuck* |
| Today set (60% weak) | `onboarding.buildTodaySet` | Heuristic; not a multi-day "Readiness Path" |
| Adaptive raids | `js/adaptive-loop.js` | Post-exam only; miss-count, not skill tags |
| Daily quest + soft streak | `js/daily-quest.js`, `js/streak.js`, `ledger_engine.js` | Day-scale habit; no 66-day arc / relapse recovery UX |
| Mistake taxonomy | `js/mastery.js` hansei journal | Optional; not auto-diagnosing friction |
| Telemetry ring + docs | `js/telemetry.js`, `docs/ANALYTICS.md` | `tiny_win_*` live; still missing JIT, loop-closed, skill-tag events |
| Tiny Win CTA | `js/tiny-win.js` | Shipped; needs path + close-loop as richer inputs |
| Firestore sync | `js/firebase-service.js` `users/{uid}/learning/state` | Syncs keys; no server-side path planner |
| PBQ + 3D | `js/pbq-engine.js`, `js/app-3d-stage.js`, `landing/labs-3d.js` | Interactive teaching stage; not HD PBR twins |
| Clariora governance JSON | `config/clariora_governance.json` | CI gates live via `tools/test_clariora_governance.js` |
| Telegram | `workers/api_telegram.js`, TMA auth | No study-buddy nudges / contextual proof |

---

## 3. Evidence base (retrieved 2026-09-29)

| Claim | Status | Source |
|---|---|---|
| Average app loses ~77% DAU by day 3, ~90% by day 30, ~95% by day 90 | Verified (Quettra / Chen, mobile Android cohort) | https://andrewchen.com/new-data-shows-why-losing-80-of-your-mobile-users-is-normal-and-that-the-best-apps-do-much-better/ |
| Habit automaticity median ~66 days; miss one day does not kill formation | Verified (Lally et al.; UCL) | https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit |
| Habit time highly variable (medians ~59-66; means often longer) | Verified (2024 systematic review) | https://pmc.ncbi.nlm.nih.gov/articles/PMC11641623/ |
| ~50% features never/hardly used; ~20% used often | Verified (Standish CHAOS-style reporting) | Standish 2013 summary PDF (athena.ecs.csus.edu mirror); XP2002 64% figure is 4 internal apps only (Mountain Goat critique) |
| Gamification "up to 150% engagement / 25-35% retention" | Weaker (vendor blog recirculation) | Treat as hypothesis until Clariora A/B proves lift |

Implication for Clariora: win days 1-7 with one clear aha (diagnostic -> personalized path -> first tiny win), then design a 66-day study habit with relapse recovery, not endless feature adds.

---

## 4. Target product: personalized exam coach (not another bank)

Closing the loop means every tracked behavior changes the next UI the learner sees, and the UI *says so*.

> "Because you skipped PBQs twice, we moved labs after a 2-minute primer and set today's tiny win to one cable lab."

That single sentence is the brand differentiator vs static question dumps.

### 4.1 Feature map (priority order)

| # | Idea | Reuse | Build | Priority |
|---|---|---|---|---|
| A | Adaptive Readiness Path | `objective_stats`, `buildTodaySet`, `adaptive-loop` | `js/readiness-path.js` + home path strip | P0 |
| B | Why-you're-stuck micro-coach | hansei tags + objective_stats | skill tags on bank + `js/friction-coach.js` | P0 |
| C | Next tiny win | daily-quest legs | single CTA on home that always starts one task | P0 |
| D | JIT one-question feedback | telemetry, funnel_abandon | `js/jit-survey.js` at PBQ skip / module exit | P1 |
| E | Close-the-loop messaging | telemetry | toast / home card from path mutations | P1 |
| F | Contextual social proof | community-benchmarks, item_stats Worker | peer cohort cards (score band + cadence) | P2 |
| G | Feature pruning + rediscovery | entitlements, features-config | progressive disclosure by readiness tier | P2 |
| H | 66-day Exam Habit | streak, daily-quest, ledger | habit calendar + relapse recovery + day-11 reflection | P2 |
| I | Proof of Readiness export | ledger / outcomes-evidence | hash-chained JSON + printable PDF | P3 |
| J | Telegram study buddy | api_telegram | opt-in nudges from path + tiny win | P3 |
| K | Offline full mock exam-day mode | engine, ROADMAP 1.3 | downloadable timed pack + offline path regen | P2 |
| L | HD 3D / Blender 10x | blender pipeline, app-3d-stage | textures, PMREM, Three upgrade, shared engine | P1 parallel track |
| M | Clariora governance as CI | governance JSON | `tools/test_clariora_governance.js` + GLB/budget gates | P0 |

---

## 5. Phased delivery

### Phase 0 (days 1-3): instrument + governance + one closed loop

**Goal:** measure North Star inputs; enforce budgets; ship *one* visible loop.

1. **Events** (extend `docs/ANALYTICS.md` + `js/telemetry.js`):
   - `tiny_win_shown` / `tiny_win_started` / `tiny_win_completed`
   - `path_reordered` {reason, fromDomain, toDomain}
   - `friction_diagnosed` {tag, domain, accuracy}
   - `jit_survey_shown` / `jit_survey_answered` {reason}
   - `loop_closed_shown` {mutation}
   - `pbq_opened` / `pbq_abandoned` (wire bus; today only `pbq:completed` is strong)
2. **Clariora CI gates** (`tools/test_clariora_governance.js`):
   - Read `config/clariora_governance.json`
   - Fail if any `media/hardware/*.glb` or `landing/models/*.glb` > `budgets.maxGlbKb`
   - Fail if build precache estimate > `budgets.offlineShellMb`
   - Fail if GLB has 0 textures *and* `extras.quality_tier` is `hd` (block fake HD claims)
3. **Ship MVP loop:** Next Tiny Win on Home (C) driven by weakest `objective_stats` domain + daily quest incomplete leg.
4. **Close-the-loop toast** when today-set or path changes (E minimal).
5. **Deploy:** `python tools/build_web_dist.py` then `python tools/deploy_cloudflare.py`; sync desktop `CompTIA_A_Plus_Desktop_App/resources/app/` if installer cut.

**Done when:** a learner sees "Your next tiny win" after diagnostic; completing it emits telemetry; CI rejects oversized GLBs.

**Tests:** `tools/test_tiny_win.js`, extend telemetry unit coverage, governance test in `tools/run_tests.js`.

---

### Phase 1 (week 1-2): Adaptive Readiness Path + Why Stuck

**A. Readiness Path**

- New module `js/readiness-path.js`:
  - Input: diagnostic domain mix + `objective_stats` + missed + SRS due
  - Output: ordered 7-day plan `{ day, focusDomains[], tinyWin, estimatedMinutes }`
  - Persist `aplus3_readiness_path_v1`; recompute on `exam:finished`, every 10 `item_answered`, and each morning
  - UI: path strip under home score ring (not a new dashboard)
- Wire `onboarding.buildTodaySet` to prefer path focus domains for the day.

**B. Why Stuck**

- Add optional `skillTags: string[]` on bank items (start with Networking + Hardware hot tags: `subnetting`, `cidr`, `ports`, `raid`, `cable-types`).
- `js/friction-coach.js`: after >= 8 answers in a tag with accuracy < 45%, show one micro-coach card (30s primer + 3Q mini drill). Cap 1/day.
- Prefer auto-diagnosis over new charts.

**Done when:** two learners with different diagnostics get different day-1 paths; a subnetting-weak learner gets a friction card without opening Analytics.

**Files:** `js/readiness-path.js`, `js/friction-coach.js`, `js/home-widgets.js`, `index.html`, bank shards (tagged subset), `css/brand-black-gold.css`, tests.

---

### Phase 2 (week 3-4): JIT surveys + HD labs track + exam-day offline

**D. JIT survey**

- `js/jit-survey.js`: one question, three chips, optional free-text disabled (privacy).
- Triggers: PBQ modal close without complete; today-session exit < 40% done; onboarding abandon (already has funnel).
- Answers write `aplus3_friction_reasons_v1` and can bump path (e.g. "too hard" -> insert primer day).

**L. HD labs (parallel, Graphics Lead)**

| Step | Work | Effort |
|---|---|---|
| L1 | Ship `media/hardware/` in `build_web_dist.py` (`MEDIA_PATH_RE`) | S |
| L2 | Shared engine: extract common Three code from `labs-3d.js` + `app-3d-stage.js` into `js/lab-3d-engine.js` | M |
| L3 | Upgrade Three (module build or modern global); `outputColorSpace`, physical lights | M |
| L4 | Blender pipeline: ORM/albedo/normal bake into GLB; keep <= 500 KB via Draco or 512px atlases | L |
| L5 | Real PMREM / RoomEnvironment IBL; remove canvas fake HDR as primary | S-M |
| L6 | PBQ scoring hooks on hotspots (pin-1 fail, slot snap tolerances) | L |
| L7 | Thermal as emissive from node extras (credible teaching, not fake FLIR marketing) | M |

**K. Offline exam-day mode** (from ROADMAP 1.3): timed full mock, PBQs first, no pause, offline path regen after submit.

**Done when:** JIT answers change next path; motherboard GLB has real basecolor+normal; shared engine used by landing + app; governance test still green.

---

### Phase 3 (week 5-6): Habit architecture + pruning + social proof

**H. 66-day Exam Habit**

- Calendar UI over existing streak (do not replace soft streak math).
- Milestones: day 7 / 30 / 66 badges (shareable via `share-loop.js`).
- Relapse recovery: if soft freeze / shield used, offer 10-min catch-up tiny win (aligns with Lally: one miss is OK).
- Day 11 / 22 / 33 / 44 / 55 reflection: one question "What's working?"

**G. Feature pruning**

- Default home shows: score, path, tiny win, daily quest. Labs / coach / cram / notebook unlock by readiness thresholds or micro-challenge ("Try 1 lab to unlock score boost").
- Track unused features via `feature_opened`; if unused 14 days after unlock, hide again with rediscovery challenge.

**F. Contextual social proof**

- Server (D1): cohort aggregates by diagnostic score band + study minutes band (no PII).
- Client card: "Learners who started near your diagnostic and studied ~20 min/day typically reached 700+ in N days."
- Never invent numbers; if cache miss, hide the card (no synthetic placeholders).

**Done when:** habit calendar ships; home chrome is smaller for new users; social card only renders on real cohort data.

---

### Phase 4 (week 7-8): Unfair advantages

**I. Proof of Readiness export**

- Extend `js/outcomes-evidence.js` / ledger: export hash-chained progress JSON + printable summary for TAFE/instructors.
- No instructor account required; verify by re-hashing the file.

**J. Telegram study buddy**

- Opt-in only. Nudges: incomplete tiny win, path day focus, relapse recovery.
- Reuse `workers/api_telegram.js`; store opt-in + quiet hours on user private profile.
- Fix D7 from L2E plan (reminders promised but not built).

**Done when:** instructor can verify an export offline; TMA user receives one contextual nudge/day max.

---

### Phase 5 (ongoing): Clariora release governance

| Keep as Clariora policy | Skip |
|---|---|
| Role prompts as Cursor agent briefs | Nested monorepo / runner inside PWA |
| Budget + GLB + em-dash / zero-fail governance as CI | Fake heartbeats in production JS |
| Graphics Lead checklist for Blender PRs | Claiming agents run in the browser |
| CEO release gate: human approve deploy | Auto-deploy without human |

Optional agent ops stay outside this product repo. Clariora consumes only artifacts (GLBs, test reports).

---

## 6. Data shapes (new)

```text
aplus3_readiness_path_v1 = {
  version: 1,
  exam: 'core1'|'core2'|'both',
  generatedAt: ms,
  days: [{ day: 1..66, focusDomains: string[], tinyWin: { type, id, label }, minutes: number }],
  mutations: [{ at, reason, detail }]
}

aplus3_friction_reasons_v1 = {
  events: [{ at, surface, reason: 'time'|'hard'|'unclear'|'other', domain? }]
}

aplus3_habit_66_v1 = {
  startedAt: ms,
  dayIndex: number,
  reflections: [{ day, textHash }],  // store hash or enum only if privacy-strict
  relapseRecoveries: number
}
```

Firestore: continue syncing `aplus3_*` keys via existing `syncLocalToFirestore` allowlist; no new PII fields.

Skill tags: additive optional field on shard items; validators warn if Core 1 networking items lack tags after Phase 1.

---

## 7. Workers / edge

| Endpoint | Purpose | Phase |
|---|---|---|
| existing `/api/v1/items/telemetry` | item events | 0 |
| `POST /api/v1/cohorts/readiness` (aggregate write) | anonymized band counters | 3 |
| `GET /api/v1/cohorts/readiness?band=&minutes=` | contextual proof | 3 |
| Telegram nudge job (cron or queue) | study buddy | 4 |

Rate-limit and consent gates required; no question text in payloads (existing ANALYTICS rules).

---

## 8. Test and deploy contract

**Every phase:**

1. Unit / harness tests under `tools/test_*.js` added to `tools/run_tests.js`
2. `node tools/test_clariora_governance.js`
3. `python tools/build_web_dist.py`
4. `python tools/deploy_cloudflare.py` (or `--skip-build` if just built)
5. Smoke: diagnostic -> tiny win -> path strip on staging
6. Desktop sync when cutting an installer: `tools/build_windows_installer.py` path

**Do not** claim Cloudflare is live without a successful deploy in-session.

---

## 9. 7-day MVP (ship this first)

Day 1-2: events + governance CI + `tiny_win` CTA  
Day 3-4: Readiness Path v1 (7 days only, not full 66) + close-the-loop toast  
Day 5: Friction coach for one skill tag (`subnetting`)  
Day 6: JIT survey on PBQ abandon  
Day 7: deploy, measure D1 return of cohort, holdout check

If D1/D3 does not move vs holdout after two weeks, stop adding surfaces; fix the path algorithm and copy instead.

---

## 10. Anti-patterns

- New dashboards without coaching actions
- Global leaderboards before contextual cohorts
- Long surveys
- Unlocking every feature on first login
- Nesting third-party agent orchestrators / CrewAI / LangChain in the client
- Inflating GLB past 500 KB for "HD" without Draco + atlas discipline
- Marketing language ahead of render quality

---

## 11. Ownership (Cursor agent roles for Clariora)

| Role | Owns |
|---|---|
| CEO | North Star, release approval, scope cuts |
| Full-stack Edge | path, tiny win, JIT, Workers, deploy |
| AI Mentor | friction coach copy, Socratic 3D strings grounded in misses |
| Graphics Lead | Blender/Three 10x track |
| QA | governance tests, live crawl, zero em-dash in new UI copy |

---

## 12. Immediate next engineering tickets

Done this session: governance CI, Tiny Win, hardware in dist, staging deploy.

Next (Phase 1, one experiment at a time):

1. `js/close-loop-ux.js`: after weak-raid finish, show what happened / why it matters / one CTA; events `loop_shown`, `loop_action_taken`, `loop_completed`
2. `js/readiness-path.js` (alias `path-reorder.js` in CEO draft): 7-day ordered focus; feed Tiny Win
3. Dark `js/feature-prune.js`: count `feature_opened` / impressions; no hide UI until 14 days of data
4. Telemetry + `docs/ANALYTICS.md` for path / loop / JIT
5. Keep Three r128 dual viewers; HD lift via bake + shared helper, not an engine chase (CEO decision)

### Module name aliases (CEO draft <-> this plan)

| CEO name | This plan |
|---|---|
| `path-reorder.js` | `readiness-path.js` |
| `close-loop-ux.js` | same (Phase 1a) |
| `habit-66.js` | 66-day Exam Habit (Phase 3) |
| governance CI | `tools/test_clariora_governance.js` (already shipped) |

Phase 0 is live on staging. Subsequent phases execute on the engineering loop one experiment per week, not as a big-bang rewrite.

CEO review source: agent session that produced Day-21 lift, close-loop MVP, prune-before-habit, and Clariora-native CI governance decisions.
