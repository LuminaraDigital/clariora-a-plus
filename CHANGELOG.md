# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses semantic versioning.

## [Unreleased]

### Added

- **Dual-track AZ-900:** Microsoft Azure Fundamentals bank, objectives, study
  library, and home/exam shell shortcuts alongside CompTIA A+ Core 1 and Core 2.
- **Community item analytics:** review UI fetches live D1 `item_stats` and hides
  the community badge until `sample_size >= 30` (no synthetic hash %). Telemetry
  paths cover drills and adaptive practice, not only full mocks.
- **Similar questions:** offline `similar_neighbors.json` shipped in `dist_web`,
  `GET /api/v1/items/similar`, Vectorize binding `clariora-question-embeddings`,
  and Ghost Coach tool `retrieve_similar_items`.
- **Item discrimination cron:** nightly point-biserial recompute
  (`workers/item_discrimination.js`) with quality flags for author review.
- **Daily Quest (flagged):** Home `#todayPlanCard` three-leg habit loop behind
  `js/features-config.js` (`gamification.enabled`). Soft streak freeze / reset
  in `ledger_engine.js`. Set `enabled: false` to hide.
- **System architecture doc:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
  big-data edge plan [docs/BIG_DATA_IMPLEMENTATION_PLAN.md](docs/BIG_DATA_IMPLEMENTATION_PLAN.md).

### Security

- Telegram WebApp `initData` now requires `auth_date` with a 1-hour replay window;
  TMA auth gate fails closed if server session report fails; session cookies persist
  `telegramVerified`; production requires dedicated `AUTH_SESSION_SECRET`.
- Stars webhook grants re-validate product, amount, and payload payer binding;
  charge insert uses `ON CONFLICT DO NOTHING` with ledger-derived `stars_spent` so
  redelivery recovers a paid-but-not-entitled user. New `tools/test_stars_binding.js`.
- CSP tightened: `cdn.jsdelivr.net` in `script-src`, Firebase `wss://`, `form-action`,
  `worker-src`, `manifest-src`, `upgrade-insecure-requests` (unsafe-inline retained
  until onclick migration).
- Ledger toast strips scripts/handlers before HTML insert; markdown `_renderInline`
  escapes raw HTML first and blocks `javascript:` / `data:` links.

### Changed

- The product is renamed from CompTIA A+ Master to Clariora across the app
  shell, PWA manifests, Electron window and About dialog, Telegram bot,
  TON Connect manifest, legal pages, build scripts and docs. Storage keys,
  the Electron appId, the GitHub repository, the Cloudflare project name and
  the public domain are unchanged so installed apps and links keep working.
- Packt / unlicensed git submodules removed; study notes consolidated under
  `notes/guides`. GitHub docs and advisory links point at
  `LuminaraDigital/clariora-a-plus`.
- CI Actions bumped to v7; `adm-zip` 0.6.1 and Electron 44.4.x.

## [3.2.0] - 2026-09-22

### Added

- **Pearson VUE Exam Scratchpad / Digital Whiteboard**: An authentic in-exam digital whiteboard accessible during all timed mock exams, Pearson mode sessions, and drills via the header/toolbar button or `Alt+S`. Includes instant brain-dump templates (6-Step Troubleshooting, Common Ports, IPv4 CIDR Subnetting, Laser Printing Cycle, RAID Matrix), continuous debounced autosave, and clipboard copy.
- **Per-Question Personal Takeaways & Mnemonics**: Learners can attach custom study takeaways and memory hooks directly to any question. In review mode, personal notes appear in a highlighted gold card alongside official explanations and distractor autopsies.
- **Centralized "My Study Notebook" Hub**: Aggregates all learner takeaways and notes into a dedicated drawer workspace with domain/exam filtering, live search, 1-click Markdown study guide export (`.md`), and clipboard sync.
- **Rich Markdown & Callout Rendering for Study Library**: Upgraded the study library document reader to render high-fidelity Markdown, responsive data tables, styled code blocks with copy buttons, inline math, and GitHub-style alert callouts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`).
- **Interactive High-Yield Quick Cram Sheet**: Instant tabbed reference tables for Ports & Protocols, CompTIA 6-Step Troubleshooting Flow with trap alerts, ANSI/TIA-568A/B Cabling & Ethernet Pinouts, 802.11 Wi-Fi Standards, RAID Fault Tolerances, and Essential Windows/Linux CLI Commands.
- **"Notes & Flags" Practice Drill**: Targeted practice drill generator that filters the 1,130-question bank down to questions where the learner added personal notes or flagged for review.
- **Automated CEO Test Suite (`tools/test_notes_suite.js`)**: Standalone Node test suite covering note persistence, scratchpad state, Markdown compilation, table rendering, and exam mode integration, running cleanly under CI with 40/40 passing test scripts.

## [3.1.4] - 2026-09-06

### Added

- An end-to-end answer integrity test. For all 1,130 questions and all four
  question types it takes the answer the author wrote in the shard, pushes it
  through the real runtime path a learner's answer takes (the session shuffle,
  then the scorer), and asserts the app marks it correct. It also asserts a
  deliberately wrong answer is rejected, so a scorer that accepted everything
  could not pass. This is the check that would have caught the 487 miskeyed
  questions immediately; it is proven against a deliberately corrupted bank and
  runs in CI on every push

### Fixed

- Practice recorded against the miskeyed bank no longer distorts the readiness
  score. 3.1.3 corrected the questions but left every earlier attempt and all
  accumulated per-objective accuracy in place, so a learner who upgraded kept a
  prediction built on results where choosing the right answer was marked wrong.
  On the first launch of a corrected build the app now records a cutoff, stops
  counting earlier attempts toward the prediction, and clears the per-objective
  counters, which are cumulative and cannot be filtered by date
- Attempt history is never deleted. Earlier attempts stay in the history table
  and the trend line; they simply no longer feed the prediction
- A one-time notice on the home screen explains why the readiness score changed
  and suggests a fresh diagnostic

### Added

- Attempts now record which generation of the question bank scored them, so a
  future correction can invalidate exactly the affected attempts rather than
  relying on a timestamp

## [3.1.3] - 2026-09-06

### Fixed

- **The wrong answer was keyed on 487 questions.** The bank builder balances how
  often each option position is correct by rotating the options, but it rotated
  the options one way and moved the answer index the other way. The result was
  that a different option became "correct" in the shipped bank while the source
  shards were right all along. C1-011 asked for the DDR4 pin count and its own
  explanation said 288 pins, but the app marked 168 pins correct. C1-003 asked
  what a technician should do when a job exceeds their expertise and the app
  marked "completely disassemble the server hardware" correct instead of
  "escalate to a senior engineer". Learners answering correctly were told they
  were wrong, and the readiness score was computed from those results
- Distractor analysis notes were not carried along when the builder rotated the
  options, so the notes described the wrong options. On every rotated question
  one note landed on the correct answer, explaining why the right answer was
  wrong
- The release gate validated the packaged desktop build, an untracked artefact
  that is stale between installer builds and missing on a clean clone. It now
  validates the repository copy of the bank

### Added

- The bank builder asserts that the keyed option text survives rotation, so this
  class of corruption fails the build instead of shipping
- The validator rejects any single-choice question whose keyed answer carries a
  distractor note, since that means the key and the notes disagree about which
  option is correct. This finds miskeyed questions statically, with no learner
  data needed

## [3.1.2] - 2026-09-06

### Added

- In-app software updates. The desktop app checks GitHub Releases on launch and
  every six hours, and the More drawer gains a Software update card that shows
  the state plainly: up to date with a Check for updates button, the new version
  and its release notes with a Download update button, a progress bar while it
  downloads, and a Restart and update button once it is ready. A gold "Update
  ready" button also appears in the header so a waiting update is visible
  without opening the drawer
- Manual update checking, so a learner never has to wait for the timer
- Linux desktop edition: AppImage and `.deb` packages built by GitHub Actions on every release tag from the tracked `electron-builder.linux.json`, smoke tested under a virtual display and attached to the release. `tools/build_linux_app.py` builds them locally on Linux
- Cloudflare deploy job in CI that publishes the web edition on every push to `main` once the `CLOUDFLARE_API_TOKEN` repository secret is set
- The desktop smoke test and screenshot tool pick the packaged binary for the current platform

### Changed

- The auto-updater is skipped on Linux packages that the package manager updates (`.deb`), so it no longer logs a failed check on every launch
- The update feed is GitHub Releases rather than the Cloudflare URL, so
  updates no longer depend on a separate host being live
- Updates download only when the learner asks. A background download can no
  longer compete for bandwidth during an exam
- The version shown in the About panel is read from the running build instead
  of being typed into the markup

## [3.1.1] - 2026-09-05

### Added

- 364 new exam questions across the domains that limited fresh mock exams: Mobile Devices (120), Virtualization and Cloud (80), Networking (30) and Hardware and Network Troubleshooting (36) for Core 1; Software Troubleshooting (60), Operating Systems (30) and Security (8) for Core 2. Every question has a full explanation, distractor analysis and a mapped Professor Messer video. The bank now holds 1,130 questions and supports five fresh 90-question mocks per core before any repeat
- Confidence display on the readiness hero and the diagnostic result: a likely score range drawn on the gap scale and a plain sentence stating how many answers the estimate rests on
- Coach mission card on the home screen so the targeted daily practice built from missed questions is one click away instead of buried in the More drawer
- Header navigation (Practice, Study, Progress) that opens the More drawer at the chosen section
- In-app confirm dialog for exam submit and clear history, replacing the operating system dialog box
- Desktop screenshot capture tool (`tools/capture_screenshots.js`) that drives the packaged app and writes the README images

### Fixed

- Blueprint percentages shown on the home cards now match the official 220-1201 and 220-1202 weightings that the exam sampler already used
- Release gate accepts any versioned first-run intro key and checks the shell version in `js/core.js`
- Diagnostic result screen fills the full two-column layout instead of leaving half the screen empty
- Daily shortcuts on the home screen are ordered above the mock exam cards so they are visible on laptop displays
- Shell version label reads the release version rather than a hard-coded 3.0.0
- Deploy script output survives a cp1252 console

## [3.1.0] - 2026-09-05

First public release under AGPL-3.0-only.

### Added

- Core 1 (220-1201) and Core 2 (220-1202) exam simulator with the official domain weightings, 90-question timed sessions and 100 to 900 scaled scoring
- Single, multiple, matching, ordering and performance-based question types with per-distractor explanations
- Adaptive practice loop, domain drills and missed-question drills
- Study library, spaced repetition memory mode, objective tracker and readiness score
- Professor Messer video index mapped to every objective
- Ghost Coach AI tutor (optional, bring your own Groq key)
- Hash-chained proof-of-mastery ledger and exportable outcome evidence
- Progressive web app with offline service worker
- Electron desktop builds for Windows and macOS with auto-update
- Optional Supabase cloud sync and opt-in telemetry
- Offline licence and entitlement system, disabled by default
- Build, validation, release and Cloudflare deploy tooling
- Continuous integration running syntax checks, self-tests and bank validation

### Changed

- Licence changed from MIT to AGPL-3.0-only
- Code-signing password is read from `CSC_KEY_PASSWORD` instead of source
- Open course material is referenced as git submodules rather than vendored
