# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and the project uses semantic versioning.

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
