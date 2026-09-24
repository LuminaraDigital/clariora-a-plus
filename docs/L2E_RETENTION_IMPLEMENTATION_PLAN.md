# APX Learn-to-Earn and Retention: Senior Implementation Plan

Status date: 2026-09-24. Scope: the in-house APX token (`ledger_engine.js`, `ledger_ui.js`), the retention surfaces on Home, and the systems they depend on (entitlements, sync, telemetry, Telegram bot).

Every finding below was checked against the code in this repo on the status date. Anything not reproduced is labelled **hypothesis**.

## 1. Verdict

The token engine is sound: a signed local ledger, APX that can't be transferred or cashed out, and (after the 2026-09-24 rebalance) an economy with a daily cap and price ladder. The retention layer around it looks finished but isn't. Four of the five store items don't deliver what the learner paid for, the streak shield has no effect, spending isn't measured, and nothing brings a lapsed learner back. Those are the gaps between "nice gamification" and a top-tier habit product.

Design stance: aim for **habit that tracks learning**, not compulsion for its own sake. Every reward should point at a behaviour that raises exam readiness (accuracy, spaced recall, weak-domain improvement). Guardrails in section 8 keep loss aversion honest. This matters commercially too: a study app that feels manipulative loses trust, and trust is the product.

## 2. Audit scorecard: the six "top 1%" items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Header APX chip, one tap to store | Done, partial | `index.html:219` `#apxHeaderChip`. Balance snaps instantly; the rolling counter and pulse from the audit were not built. |
| 2 | Next-unlock goal card on Home | Done | `index.html:284` `#l2eGoalCard`. Target selection was hardcoded to old prices; now reads the catalog (`ledger_ui.js`, 2026-09-24). The audit's example (`65 / 120 APX`) uses pre-rebalance prices. |
| 3 | Streak shield badge | Badge done, **feature broken** | `index.html:230` badge renders when a shield is owned, but nothing ever consumes `STREAK_FREEZE`, and `computeSoftStreak` already bridges one missed day for free. See defect D1. |
| 4 | Coin shower and haptics | Done, partial | `ledger_ui.js:37` `spawnCoinShower()`, `haptic("success")` at 4 call sites. No `prefers-reduced-motion` check, a single haptic type, no sound. |
| 5 | Three-part daily quest | Already existed before the audit | `js/daily-quest.js` (defend / attack / recover legs), enabled in `js/features-config.js`. The audit's proposed "stake" leg conflicts with the new rule that stakes resolve on a later day. |
| 6 | Animated block appending | Not built | No implementation. Recommend a reduced version only (section 6, phase 6), since heavy "crypto theatre" contradicts the "not crypto" positioning. |

**Answer:** 2 of 6 are fully done, 2 are done in part, 1 is visible but broken, 1 wasn't built, and the quest was already in the app. `npm test` passes 45 of 45 scripts, but no test covers the gaps below.

## 3. Status of items from the earlier session

| Item | Status |
|---|---|
| Economy rebalance (daily cap 120, repeat decay 100/50/20%, once-per-day milestones, stake rules, new prices) | Done, 14 of 14 ledger tests pass. **Staging only** (Worker version `bbcf2ff5-11e3-4aa7-b32a-b056e7b6b2a2`). Production not deployed. |
| More unlocks to spend on | Not started. Now more urgent, see D2. |
| Measurement (visible vs hidden APX, analytics) | Not started. Only 2 gamification events exist (`streak_soft_freeze`, `gamification_cta_clicked`). |
| Separate APX from TON and crypto wording | Not started. `js/ton_credentials.js` targets TON mainnet; copy still says "mined", "hashrate", "yield". |
| Desktop app copy | Stale snapshot that predates the unlock store; needs a full resync, not a file copy. |
| Balances inflated before the rebalance | Untouched by design (ledger history can't be rewritten). Needs a decision, see phase 3. |

## 3a. Phase 0 outcome (2026-09-24, production build `58f2f791`)

Fixed and deployed: D1, D2, D3, D4, plus two release-blocking defects found while verifying on staging.

- **D0. Web progress was lost on every reload (fixed).** `js/daily-quest.js` rewrote its plan on every `storage:changed`, and each write fired `storage:changed` again: about 32 writes per second, measured in the browser. Every write reset the 300 ms debounce in `js/database_memory_engine.js`, so the IndexedDB snapshot never saved, and the next boot restored the stale snapshot over localStorage. APX, history and flashcard progress written since the loop started were discarded. Fix: the plan is written only when it changes, the quest ignores its own key, and the engine now saves at least every 2 s under continuous writes and retries instead of dropping an overlapping save. Regression test: `tools/test_daily_quest_writes.js` (fails 3 of 4 against the old code).
- **D0b. The service worker could pin stale files for a whole build (fixed).** `sw.js` precached with `cache.add(url)`, which can be answered by the HTTP or edge cache, and then served those bytes cache-first until the next build. Seen on staging: a new build ID holding old `daily-quest.js`. Fix: each file is fetched with `cache: 'reload'` and a `__rev=<sha1>` query from the manifest.
- **D1 to D4:** shields now spend automatically (fewest needed, none if they can't save the run); the Cram Sheet unlock gates a printable export of every tab; the Deficit Scan ranks weak objectives per exam from readiness2's `objective_stats`; owned cosmetics reapply at boot; AI Burst charges read the profile-scoped ledger and each extra prompt costs one charge (regression test fails against the old code). `tools/test_ledger_unlocks.js` now fails if any store item has no fulfilment check.

New findings, not yet fixed:
- Returning users run the previous release for one visit after each deploy (cache-first shell, update applies next load). Consider an "update ready, reload" prompt.
- The heatmap's objective titles are wrong for 220-1201 (for example Core 1 2.8 is labelled "Cables and connectors"; the exam and the coach call it networking tools). The heatmap also reads per-question history that most saved sessions lack, so it is often empty; the Deficit Scan uses `objective_stats` instead.
- Signed-out web users now see a sign-in wall on staging and production; confirm this is intended, since it gates the free diagnostic.

## 4. Defects (fix before anything new)

**D1. Streak shield does nothing.** `STREAK_FREEZE` costs 200 APX. No code calls `consumeUnlock("STREAK_FREEZE")`, and `computeSoftStreak` (`ledger_engine.js`) ignores shields. Separately, the soft streak already forgives one missed day for free, so a shield has no job to do.
Fix: define the rule as "the free grace covers 1 missed day; each shield covers one extra consecutive missed day". Consume a shield with a `CONSUME_UNLOCK` block when replay detects a gap the grace can't cover. Show a "Shield used, 7-day streak saved" moment on next launch.

**D2. Two paid unlocks grant nothing.** `CRAM_SHEET` (1,800 APX) and `WEAK_SCAN` (150 APX) are never checked. `hasActiveUnlock` and `checkWalletUnlock` have no callers, and the cram sheet opens free from the menu (`index.html:2660`).
Fix: either gate a real extra (for example the printable or PDF export of the cram sheet, a deeper sub-objective scan report) or replace the items. Add a test that fails if any catalog item has no fulfilment check.

**D3. Cyber theme is lost on reload.** The class is only added right after purchase (`ledger_ui.js:379`); nothing reapplies it at startup.
Fix: apply owned cosmetics during `refreshWalletBadge` or at boot.

**D4. Purchased AI prompts are probably invisible.** `js/entitlements.js:405` reads the unscoped key `comptia_pom_ledger_v1`, but the ledger always writes the profile-scoped key `comptia_p_<id>__comptia_pom_ledger_v1` (`profiles.js:73`). It also re-implements wallet replay instead of calling the ledger, and it counts an over-limit prompt against both the daily usage and the charges, so each extra prompt costs two. **Hypothesis until a test reproduces it.**
Fix: read charges via `CompTIALedger` (or the scoped key), count each prompt once, add a regression test.

**D5. Using two devices may lose APX and break the chain.** `js/sync.js` syncs the ledger as a plain key with newest-wins (`mergeKeyEntry`, line 220). Each device signs with its own non-extractable key, and `verifyChain` checks every block against the local key only. Expected result: blocks earned on one device are dropped, and the other device shows "Chain INVALID". **Hypothesis: reproduce first.**
Fix: see architecture item A3.

**D6. Performance and storage grow without bound.** Measured in Node on this machine: at 1,000 blocks, `getState()` takes 92 ms, one `recordExamComplete` takes 486 ms (it calls `getState` several times, each re-verifying every signature), and storage uses about 456 KB. Low-end phones in the Telegram WebView will be slower, and browsers limit `localStorage` (commonly around 5 MB per site).
Fix: see A1 and A2.

**D7. Streak reminders are promised but not built.** `bot/bot_server.js:5` says "study streak reminders"; the bot only replies to commands and has no scheduler. The server also doesn't know anyone's streak, because the ledger is local only.

## 5. Architecture changes

**A1. Incremental wallet state.** Cache the replayed wallet plus the last verified block index. On append, verify and apply only the new block. Call `getState` once per user action and pass the result down. Target: under 50 ms for an exam submission at 5,000 blocks.

**A2. Move the chain to IndexedDB.** Keys already live there. Keep a small wallet summary in `localStorage` for instant first paint. Migrate once, keep the old key as a backup for one release, then remove it.

**A3. Multi-device ledger.** Recommended: one chain per device, plus a registry of device public keys stored on the account. The wallet is the sum across a user's device chains, and each chain is verified with its own key. Sync merges chains by device id instead of newest-wins. The alternative (the server issues all blocks) is more work but becomes necessary if APX ever feeds public leaderboards.

**A4. Server-side counters for anything social.** Leagues, group leaderboards and reminders need numbers the server trusts. Mirror earn events to the existing Worker and D1 database (`clariora_edge_db`) with the same caps enforced server-side. Public rankings use server numbers only. The local ledger stays the UX source of truth.

**A5. Unlock fulfilment contract.** Each catalog item declares how it is granted (`gate`, `consumable`, or `cosmetic`) and names the function that checks it. A CI test walks `UNLOCK_CATALOG` and fails on any item without a fulfilment path. This prevents D2 from happening again.

**A6. Economy telemetry.** Emit events from the ledger itself (single source): `apx_earned` {source, amount, capped, multiplier}, `apx_spent` {item, cost, balance_after}, `unlock_used` {item}, `stake_locked`, `stake_resolved` {success}, `streak_shield_used`, `goal_card_clicked`, `cap_reached`. No personal data beyond what `js/telemetry.js` already sends.

## 6. Phased plan

Size: S = up to a day, M = a few days, L = a week or more.

**Phase 0: fix what's broken (S to M). Done 2026-09-24, see section 3a.** D1, D2, D3, D4 with regression tests, plus the fulfilment test (A5). D7 is still open (build reminders in phase 4, or remove the promise).
Done when: every catalog item delivers something testable, the shield saves a streak in a test, and purchased AI prompts appear in the allowance.

**Phase 1: measure before adding more (S to M).** A6 events. A 10% holdout group that never sees APX surfaces (balance chip, goal card, store, coin shower), assigned once per account.
Done when: a dashboard shows 1, 7 and 30-day retention, questions per active day, accuracy trend and readiness change for both groups, plus spend rate, unspent balance and cap-hit rate.

**Phase 2: scale and multi-device (M to L).** A1, A2, then reproduce D5 and ship A3.
Done when: an exam submission at 5,000 blocks stays under 50 ms on desktop, and two devices on one account show the same balance with a valid chain.

**Phase 3: a store worth saving for (M).**
- Real sinks: extra lab packs, full mock exam unlocks for free users, explanation or hint packs, cosmetic rank frames, and a rotating monthly cosmetic so the store stays fresh.
- Shield rules from D1, an evening "streak at risk" state on the streak chip when there's no shield and no activity today, and a "shield used" screen.
- Rolling balance counter with a pulse; honour `prefers-reduced-motion` in `spawnCoinShower` and all new animation.
- Pinned goal: let the learner choose the item the goal card tracks, and show "about N more drills" computed from their recent earn rate.
- Pre-rebalance balances: either leave them alone, or add one "season reset" that converts old balance into a cosmetic badge and a capped carry-over. Product decision.

**Phase 4: bring people back (M).**
- Telegram bot reminders at a time the learner chooses, at most one per day, with a single evening streak-at-risk nudge. Easy opt-out. Needs a minimal "last active day" ping to the Worker (part of A4).
- Rank-up moment: the ledger already has 5 ranks with no ceremony.
- Weekly recap card: APX earned, readiness change, weakest domain, one suggested drill.
- Comeback quest after a lapse (a short, easy win) instead of a bare zero.

**Phase 5: social (L, needs A4).** Opt-in weekly leagues or Telegram study-group leaderboards ranked on server-validated learning points (accuracy-weighted), not raw APX.

**Phase 6: positioning cleanup (S to M).** Rename "mined / hashrate / yield" to plain learning language. Keep TON credentials as a separate opt-in feature that never touches APX. Replace the full "animated blockchain" idea with a subtle 300 to 400 ms link animation inside the ledger view, skipped under reduced motion.

**Phase 7: desktop parity (M).** Full resync of `CompTIA_A_Plus_Desktop_App/resources/app/` from the web build, then run the desktop test script.

## 7. Rewards that track learning (design rules)

1. Pay for quality, not volume: first-attempt accuracy, correct spaced-review recall, and weak-domain improvement earn more than repeats. The cap and repeat decay already enforce half of this.
2. Surprise bonuses, if added, come from the same daily budget and are never purchasable.
3. Always show readiness next to APX, so the currency reads as evidence of progress, not the goal.
4. Every rule change ships with a ledger test and an economy simulation (earn per typical day vs days to the top item).

## 8. Guardrails

- No fake urgency: timers and "at risk" states reflect real rules only.
- Notifications: opt-in, at most one per day, quiet hours respected.
- No loss screens that shame; a lapse leads to a comeback quest.
- Reduced motion and haptics respected everywhere.
- APX is never bought with money, transferred, or cashed out. Get legal advice before changing any of these, because it changes what APX is.

## 9. Success criteria (from the holdout test)

APX earns its place only if the visible group beats the holdout on 7 and 30-day retention **without** lower accuracy or readiness gains. If retention rises but learning metrics fall, the rewards are pulling people away from learning: rebalance before expanding. If there's no difference, cut scope back to the quest and streak and stop investing in the store.
