# Roadmap: the next order-of-magnitude

An implementation plan for the changes that would make CompTIA A+ Master
materially better for a learner, not merely more polished. Each item states the
problem it fixes, the design, the files it touches, how to know it is done, and
the risks. Items are ordered by value per week of effort. Effort assumes one
experienced developer who knows the codebase.

The plan is grounded in the state of the app on 6 September 2026: 1,130
questions, five fresh mocks per core, a readiness model with a confidence
range, a coach mission on the home screen, Windows, macOS and Linux desktop
builds, and a web edition waiting on a Cloudflare token.

---

## Phase 1: make the product trustworthy (weeks 1 to 3)

### 1.1 Item analysis and a "report this question" loop

**Problem.** The bank is large now, but nothing measures whether each question
is good. A miskeyed answer or an ambiguous stem silently teaches the wrong thing
and erodes the learner's trust in the predicted score. Professional exam
publishers run item analysis on every question; this app has the data to do it
and does not.

**Design.** Record per-question outcomes locally (already in `missed` and
attempt history) and, when telemetry is on, send anonymised item events:
question id, chosen option, correct flag, seconds. A nightly job computes for
each question the p-value (share correct), the point-biserial discrimination
(do strong learners get it right more than weak ones), and the distractor
spread. Flag questions where more than 60 percent of learners choose the same
wrong option (likely miskeyed), where p is above 0.95 (too easy) or below 0.2
(too hard or broken), or where discrimination is negative. Add a "Report a
problem" control in the review screen that files a structured record with the
question id and free text.

**Files.** `js/telemetry.js` (new `item_answered` event), `js/ui.js` review
panel (report control), `docs/telemetry-worker.js` (accept and store item
events), a new `tools/item_analysis.py` that reads exported events and writes
`_bank/analysis/item_stats.json`, and `tools/validate_bank.py` gaining a
warning when a question appears in the flagged list.

**Done when.** A validator run on the bank prints the flagged questions with
their statistics, the review screen has a working report control, and at least
one miskeyed question has been found and fixed through the loop.

**Effort.** Five days. **Risk.** Low volume of testers gives noisy statistics;
require a minimum of thirty answers before flagging.

### 1.2 Calibrate the predicted score against real exam results

**Problem.** The predicted score is a linear map from accuracy to the 100 to
900 scale. It is presented with a confidence range now, but the mapping itself
has never been checked against a real CompTIA result.

**Design.** After a learner reports sitting the exam (a one-field form reached
from the home screen and a reminder after their test date), store the real
scaled score alongside their last predicted score and readiness. With consent,
send both to telemetry. Once thirty pairs exist, fit a monotone calibration
curve and ship it as a small table in `js/onboarding.js` that replaces the
linear map. Show the learner "Predictions have been within N points of real
results for most learners" once the data supports it.

**Files.** `js/onboarding.js` (calibration table, `predictedObjective`), a new
`js/exam-result.js` for the report form, `js/telemetry.js`,
`tools/fit_calibration.py`.

**Done when.** The form exists, at least one real result is recorded end to end,
and the calibration table is loaded from data rather than hard-coded.

**Effort.** Three days. **Risk.** Self-reported scores are noisy; store pass or
fail as well as the number, since pass or fail is what the learner cares about.

### 1.3 Exam-day mode

**Problem.** Practice mode shows explanations after submit and lets the learner
pause. The real exam has none of that, and the first real sitting is often a
shock: performance-based questions come first, the clock does not stop, and
there is no feedback until the end.

**Design.** A single toggle when starting a full mock: exam-day mode disables
pause, hides the shortcut panel, puts the performance-based items first as
CompTIA does, shows only the flag and matrix controls, and presents the result
as pass or fail with the scaled score before revealing any breakdown. The
results page gains a "what the real exam does next" panel explaining the score
report the learner will receive.

**Files.** `js/engine.js` (question ordering and pause gate), `js/ui.js`
(toolbar variants and results reveal), `index.html` (toggle on the mock cards),
`css/brand-black-gold.css`.

**Done when.** A mock in exam-day mode cannot be paused, starts with the
performance-based items, and the results page reveals in two stages.

**Effort.** Three days. **Risk.** None significant; it is a presentation mode
over the existing engine.

---

## Phase 2: keep learners coming back (weeks 4 to 6)

### 2.1 Cross-device continuity with a one-tap account

**Problem.** Progress lives on one machine. A learner who practises on a work
laptop and revises on a phone in the evening has two histories and two
readiness scores. The Supabase sync exists but is off and needs setup.

**Design.** Turn sync on behind a magic-link email sign-in. No password, no
profile page: enter an email, tap the link, and the device joins the account.
The existing merge logic in `js/sync.js` reconciles attempts, missed
questions, flashcards and the ledger. Show a small "Synced 2 minutes ago" line
in the More drawer and a conflict notice only when the merge cannot decide.

**Files.** `js/sync-config.js` (enabled, project URL), `js/sync.js` (magic-link
flow using Supabase auth), `supabase/schema.sql` (row-level security per
user), `index.html` (sign-in panel in the Data group), `docs/SYNC_SUPABASE.md`.

**Done when.** A diagnostic taken on the desktop app shows on the web edition
on a phone within a minute, and signing out leaves local data intact.

**Effort.** Five days. **Risk.** Row-level security must be right before this
goes live; a reviewer other than the author should read the policies. Keep the
free Supabase tier limits in mind and batch writes.

### 2.2 Study reminders that respect the plan

**Problem.** The daily plan is good but passive. Nothing brings the learner back
tomorrow.

**Design.** Desktop notifications from the Electron app and web push from the
service worker, both opt-in at the end of onboarding: one reminder at the
learner's chosen time, suppressed on days they have already studied, with a
weekly summary on Sunday showing the readiness trend. Streak protection: a
single reminder if the streak is about to break.

**Files.** `main.js` (notification scheduling via the Electron API and a
tray icon), `sw.js` (push handler), `js/onboarding.js` (reminder preference),
a small Worker in `docs/telemetry-worker.js` to send web push at the scheduled
time.

**Done when.** A reminder fires at the set time on both desktop and installed
web app, and does not fire on a day with a completed session.

**Effort.** Four days. **Risk.** Web push needs a server to hold subscriptions;
the existing telemetry Worker is the natural home.

### 2.3 Objective mastery map

**Problem.** Readiness is one number. The learner cannot see which of the 61
objectives they have covered, which are weak and which they have never seen,
which is what decides what to do tomorrow.

**Design.** A full-screen grid, one tile per objective, coloured by mastery
(not seen, weak, developing, secure) and sized by blueprint weight, with the
number of questions answered and the last accuracy on hover. Tapping a tile
starts a ten-question drill on that objective and opens the matching note and
video. This replaces the objectives checklist in the drawer as the Progress
landing page.

**Files.** New `js/mastery-map.js`, `js/onboarding.js` (expose per-objective
effective accuracy, already computed in `computeExam`), `objectives_data.json`
(titles), `index.html` and CSS.

**Done when.** Every objective in both blueprints appears, tiles reflect real
history, and a drill launched from a tile records to that objective.

**Effort.** Four days. **Risk.** None; the data already exists.

---

## Phase 3: distribution that does not depend on one vendor (weeks 7 to 8)

### 3.1 Move auto-update to GitHub Releases

**Problem.** The updater and the installer downloads point at a Cloudflare URL
that is not live. Every release so far has been distributed by hand.

**Design.** Switch electron-updater to the `github` provider, which reads
`latest.yml`, `latest-mac.yml` and `latest-linux.yml` straight from the GitHub
release for the tag. The release workflow already attaches Linux files; extend
it with Windows and macOS runners so one tag produces every platform's
packages and update manifests. Cloudflare then hosts only the web edition,
which is what it is good at.

**Files.** `main.js` (provider config), `release.config.json` (repo owner and
name replace `updateBaseUrl`), `tools/build_windows_installer.py` and
`tools/build_macos_app.py` (write the yml files with the GitHub URL),
`.github/workflows/ci.yml` (Windows and macOS build jobs on tags),
`docs/RELEASE_CHECKLIST.md`.

**Done when.** A 3.1.1 install updates itself to the next tagged release with
no manual upload anywhere.

**Effort.** Three days. **Risk.** macOS builds need signing and notarisation
secrets in the repository to be useful; without them the macOS job produces
unsigned artefacts that Gatekeeper blocks.

### 3.2 Code signing certificate and store listings

**Problem.** SmartScreen warns on every Windows install. Testers can click past
it; the public will not.

**Design.** Buy an OV code-signing certificate (an EV certificate builds
SmartScreen reputation immediately but costs more and needs a hardware token),
store it as a repository secret, and sign in the Windows CI job. Then submit to
winget (a manifest pull request) and, later, the Microsoft Store, which removes
the warning entirely. For Linux, publish the AppImage to Flathub through a
Flatpak manifest.

**Files.** `.github/workflows/ci.yml` (signing step), `build/` (certificate
handling documented, never committed), a `packaging/winget/` manifest and a
`packaging/flathub/` manifest.

**Done when.** A fresh Windows machine installs the app from winget without a
SmartScreen prompt.

**Effort.** Two days of work plus certificate lead time of one to two weeks.
**Risk.** Cost; an OV certificate is a few hundred pounds a year.

---

## Phase 4: content depth (ongoing)

### 4.1 Grow the binding domains to seven fresh mocks

The fresh-mock capacity of each core is set by its scarcest domain relative to
blueprint weight. The current binding domains are Networking (107) and
Troubleshooting (131) for Core 1, and Operating Systems (130) and Security
(131) for Core 2. Reaching seven fresh mocks per core needs roughly 40, 50, 50
and 50 more questions respectively. Continue the shard approach: author to the
thinnest objectives first (the validator prints per-objective counts), keep the
scenario style, and run `tools/validate_bank.py --shard` on every file before
building.

### 4.2 Performance-based questions that behave like the exam

The engine has ordering and matching items, and a separate PBQ module with
simulations. The real exam mixes them into the first few minutes of the
sitting. Fold the PBQ simulations into the question pool as a fifth item type so
they are sampled, scored and reviewed like everything else, and add three more
simulation scenarios: a SOHO router configuration, a Windows user and
permissions task, and a cable and port identification task.

**Files.** `js/pbq.js`, `js/qtypes.js` (scoring), `js/engine-core.js`
(sampling quota for the type), `_bank/shards/` (PBQ item records).

### 4.3 Question versioning and changelog per question

Once item analysis flags questions and testers report problems, edits will be
frequent. Add a `revision` field and a `changelog` array to each shard record
so a learner's history can be interpreted against the version they saw, and so
a rewritten question is not scored as the same item it replaced.

---

## Sequencing summary

| Weeks | Work | Why first |
| --- | --- | --- |
| 1 to 3 | Item analysis, calibration, exam-day mode | Trust in the score is the product |
| 4 to 6 | Sync, reminders, mastery map | Retention decides whether anyone passes |
| 7 to 8 | GitHub Releases updater, signing, stores | Removes the manual release burden and the SmartScreen wall |
| Ongoing | Bank growth, PBQ integration, question versioning | Content is never finished |

## What this plan deliberately leaves out

- A chat tutor. Ghost Coach's strength is that it builds a drill from evidence
  rather than talking. Adding open chat would raise cost and moderation load
  without improving pass rates.
- A native mobile app. The installed web app on a phone covers evening
  revision once sync exists, at a fraction of the cost of two native codebases.
- Payment gating. Keep the licence code but leave it off until the pass-rate
  data from Phase 1 gives something worth charging for.
