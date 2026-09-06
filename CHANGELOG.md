# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses semantic versioning.

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
