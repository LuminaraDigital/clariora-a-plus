# CompTIA A+ Master Simulator v3.0.0 - Engineering Build Specification

**CEO Program Contract.** Every subagent works against this spec. The CEO (senior software
engineer + IT lead) runs `tools/build_bank.py` and `tools/validate_bank.py` as the acceptance
gate. Nothing is considered done until the validator passes and the CEO verifies live behavior.

## Paths

- `ROOT` = `C:/Users/lumin/Desktop/Datacentre_Academy/CompTia_A+`
- `APP_DIR` = `ROOT/CompTIA_A_Plus_Desktop_App/resources/app` (what the packaged EXE loads)
- Shards (subagent deliverables): `ROOT/_bank/shards/*.json`
- Study data: `ROOT/_bank/study/*.json`
- CEO tools: `ROOT/tools/build_bank.py`, `ROOT/tools/validate_bank.py`
- Canonical objectives: `ROOT/tools/objectives_220_1201.json`, `ROOT/tools/objectives_220_1202_provisional.json`
- Objective-to-note map: `ROOT/tools/objective_notes_map.json`
- Backup of v2.0.0: `ROOT/_backup/` (never modify)

## Hard rules

1. Each agent writes ONLY the files listed in its charter. No shared-file edits.
2. No em dashes (U+2014) in any file you write. Use "-", ":" or rephrase.
3. Do not edit `exam_data.json`, `exam_data.js`, `main.js`, `preload.js`, or the HTML unless
   your charter explicitly owns them. The CEO build pipeline generates the merged bank.
4. Build JSON deliverables with Python scripts (read/transform/write), never by hand-typing
   hundreds of KB. Always verify with `json.load` and print counts.
5. Self-check before reporting: `python tools/validate_bank.py --shard <your_shard.json>`.
   A shard that fails validation will be bounced back by the CEO.
6. Report to CEO at the end: deliverable paths, question counts by domain/objective,
   self-check output summary, and anything you could not complete.

## Question schema v3

Every question object:

```json
{
  "id": "C1-001",              // stable; existing C1/C2 ids keep theirs; new ids per shard prefix
  "exam": "core1",             // "core1" | "core2"
  "domain": "5.0 Hardware and Network Troubleshooting",  // EXACT strings below
  "objective": "5.3",          // sub-objective code, must exist in the canonical objectives map
  "type": "single",            // "single" | "multi" | "match" | "order"
  "difficulty": "medium",      // "easy" | "medium" | "hard"
  "question": "plain text, no markdown, no answer leakage",
  "options": ["...","...","...","..."],   // single: 4 options; multi: 5 options
  "answer": 1,                 // single only: index into options
  "answers": [1, 4],           // multi only: exactly 2 indices, 5 options, stem ends "(Select TWO.)"
  "pairs": [ {"left":"SSH","right":"TCP 22"} ],       // match only: 4-5 pairs
  "sequence": ["Step one...", "Step two..."],          // order only: 4-6 steps, correct order
  "explanation": "why the correct answer is right AND why each distractor is wrong",
  "distractor_analysis": {"0": "...", "2": "...", "3": "..."},  // per-option why-wrong (single/multi)
  "video_reference": { "title": "...", "url": "https://www.youtube.com/watch?v=...", "duration": "12:52", "objective": "5.3" },
  "notes_reference": "16_Printers.md",   // file name from objective_notes_map.json
  "tags": ["dns", "troubleshooting"]
}
```

Notes:
- `distractor_analysis` keys are option indices as strings; include every wrong option.
- `video_reference.objective` MUST equal the question's `objective`. Attach from
  `ROOT/professor_messer_220_1201_videos.json` (Core 1) or `_bank/study/messer_1202.json`
  (Core 2). If no video matches the objective, use `null`.
- `notes_reference` MUST be the mapped file for the objective (see objective_notes_map.json).
- Scoring is all-or-nothing for multi/match/order (CompTIA convention for practice fidelity).
- Keep `answer` for single-choice; the CLI practice_exam.py depends on it.

## Exact domain strings (must match byte-for-byte)

Core 1: `1.0 Mobile Devices`, `2.0 Networking`, `3.0 Hardware`,
`4.0 Virtualization and Cloud Computing`, `5.0 Hardware and Network Troubleshooting`

Core 2: `1.0 Operating Systems`, `2.0 Security`, `3.0 Software Troubleshooting`,
`4.0 Operational Procedures`

## Official v15 blueprints (weightings the sampler must honor)

- Core 1 (220-1201): Mobile 13, Networking 23, Hardware 25, Virtualization/Cloud 11, Troubleshooting 28
- Core 2 (220-1202): Operating Systems 28, Security 28, Software Troubleshooting 23, Operational Procedures 21
- Passing: Core 1 = 675, Core 2 = 700 (scale 100-900), 90 minutes, max 90 questions.

## Content quality bar (validator-enforced)

1. No answer leakage: no "Answer:" markers, no markdown (`**`, `###`), no checkmark emojis,
   no "correct" tags inside options or stems.
2. Explanations: minimum 120 characters. Must teach: why correct + why each distractor fails.
   Banned template phrases: "This is a key requirement", "Official Core 1 reference",
   "Official Core 2 reference", "Review CompTIA objectives", "Essential knowledge for CompTIA".
3. No duplicate option texts within a question; no duplicate stems across the bank.
4. No positional references in options ("All of the above", "Both A and B", "None of these")
   because the engine shuffles option order at render time.
5. Scenario depth: at least 60% of NEW questions are scenario-based (technician/user/datacenter
   context), stems of 100+ characters. Rewritten stubs should be upgraded toward this bar too.
6. Answer-key balance: the build script auto-balances keyed positions for `single` questions
   by rotating options (it skips questions with positional references). Authors must not fight it.
7. Every question carries `objective` and `notes_reference`.
8. Senior-technician voice: precise, practical, datacenter-aware. No filler.

## Engine architecture (ARCH agent charter)

The HTML shell `APP_DIR/A_Plus_Exam_Simulator.html` stays as the single entry point
(Electron main.js and browser launches load it). Plain script tags only, NO ES modules
(file:// compatibility). Script order:

```
js/core.js        - window.APlus namespace, APP_VERSION "3.0.0", event bus (APlus.bus.on/emit),
                    feature registry (APlus.registerFeature), storage adapter
                    (localStorage now, window.electronAPI.storage later), utils (escapeHTML, shuffle)
js/data.js        - reads window.COMPTIA_EXAM_DATA, PROFESSOR_MESSER_1201_VIDEOS,
                    PROFESSOR_MESSER_1202_VIDEOS, APLUS_NOTES_INDEX; exposes APlus.data
js/engine-core.js - PURE logic, no DOM: blueprint-weighted sampler, scaled scoring,
                    option-shuffle with answer remap, SM-2 spaced-repetition state math.
                    Must be requireable from Node for unit tests.
js/qtypes.js      - APlus.qtypes = { render(q, state, mount), score(q, userState),
                    isComplete(q, userState) }. Default implementation handles "single".
                    Phase 3 QTYPES agent extends for multi/match/order.
js/pbq.js         - the 3 interactive labs (port matcher, printer sequence, CLI terminal),
                    plus APlus.pbq.examPool() hook for timed-exam PBQ integration.
js/engine.js      - exam session state machine. Calls qtypes/pbq hooks. Emits bus events:
                    "exam:started", "exam:answered" ({id,objective,domain,correct,flagged}),
                    "exam:finished" with payload {examType,totalQuestions,rawCorrect,scaledScore,
                    passingScore,passed,domainStats,perQuestion:[{id,objective,domain,type,correct,
                    flagged}],secondsSpent,flaggedCount}
js/ui.js          - start screen, exam runner, results screen, matrix, review accordion
js/srs.js         - stub (Phase 3 SRS agent owns it)
js/analytics.js   - stub (Phase 3 ANALYTICS agent owns it)
js/studyhub.js    - stub (Phase 3 STUDYHUB agent owns it)
js/app.js         - init, theme, sound, keyboard glue
```

Containers the shell must contain (feature agents mount into them):
- `#featureCards` inside the start-screen config grid (feature cards append here)
- `#analyticsPanels` and `#srsPanels` inside the results screen
- Study Hub opens a modal owned by studyhub.js

Engine fixes required in ARCH (findings F2/F5/F10 + defects):
- Shuffle options per render with answer-index remap (kills the B-bias exploit).
- v15 weightings on the start cards and badges: "Core 1 (220-1201)", "Core 2 (220-1202)".
- Blueprint-weighted stratified sampling for all exam modes (was uniform).
- Combined exam: 45 Core 1 + 45 Core 2, each domain-weighted.
- Keyboard shortcuts must be disabled while any `.modal-overlay.active` exists or an
  input is focused (leak into PBQ/Messer modals was a live bug).
- Printer lab must display the full step text (was truncated to first word).
- Domain drill filter for 4.0 must use the full domain string.
- Storage keys namespaced "aplus3_" with one-time migration from the old
  "comptia_a_plus_*" keys (missed bank + history carry over).

Preload/main contract (ANALYTICS agent implements in Phase 3; ARCH only calls defensively):
`window.electronAPI.storage.get(key)` / `.set(key, value)` / `.exportFile(name, content)`
persisting to `app.getPath('userData')/aplus_progress.json`. If absent, storage adapter
falls back to localStorage. ARCH must not edit main.js/preload.js.

## Storage adapter API (core.js)

```
APlus.storage.get(key, fallback)
APlus.storage.set(key, value)
APlus.storage.remove(key)
```
JSON-serializable values. Persisted via electronAPI.storage when available, else localStorage.

## Deliverable charters

| Agent | Shard / files | Scope |
|---|---|---|
| ARCH | APP_DIR/A_Plus_Exam_Simulator.html + APP_DIR/js/*.js | modular engine + fixes above |
| MESSER | `_bank/study/messer_1202.json`, `_bank/study/notes_index.json`, copy `ROOT/CompTIA_A_Plus_Mastery/DEEP_DIVE/*.md` to `APP_DIR/notes/`, corrected `ROOT/tools/objectives_220_1202.json` | scrape the 220-1202 course index page |
| FIX-C1 | `_bank/shards/core1_fixed.json` | ALL current Core 1 questions (271 as of 2026-09-03; re-sync from APP_DIR/exam_data.json at write time) cleaned + upgraded |
| NEW-C1T | `_bank/shards/core1_new_5x.json` | 50 new troubleshooting questions (5.1-5.6) |
| NEW-C1V | `_bank/shards/core1_new_misc.json` | 25 new: 16 Virt/Cloud, 5 Mobile, 4 Networking |
| FIX-C2 | `_bank/shards/core2_fixed.json` | all 141 Core 2 questions cleaned + upgraded |
| NEW-C2A | `_bank/shards/core2_new_security.json` | 36 new Security (2.1-2.11) |
| NEW-C2B | `_bank/shards/core2_new_swtroubleshooting.json` | 38 new Software Troubleshooting (3.1-3.4) |
| NEW-C2C | `_bank/shards/core2_new_opprocedures.json` | 32 new Operational Procedures (4.1-4.7) |

New-question ID prefixes: C1N-T-, C1N-V-, C2N-S-, C2N-W-, C2N-O- (zero-padded to 3).

## ADDENDUM 2026-09-03 (CEO): concurrent workstream + bank growth

A parallel build job (the user's own tooling, NOT this program) ran at 12:36-12:41 on
2026-09-03 and made these changes, which this program integrates with rather than reverts:

1. `APP_DIR/exam_data.{json,js}` regenerated: Core 1 is now 271 questions (was 229),
   version "2.0". 42 of them carry `"source": "220-1001 End-of-Section Quizzes"` (retired
   exam generation). FIX-C1 modernizes all 271 and flags unsalvageable ones.
2. `APP_DIR/study_library.json` + `study_library.js` added (documents library with
   folders/categories), loaded as a script tag, modal `studyLibraryModal`, global
   `openStudyLibraryModal()`. ARCH preserves this feature end to end. NO agent touches
   these files.
3. `APP_DIR/study_assets/`, `APP_DIR/CompTIA_A_Plus_Mastery/`,
   `APP_DIR/CompTIA-A-Plus-Practice-Questions/` added. Off-limits to all agents.
4. `main.js` (5149 bytes) regenerated with a Study Library menu item; its
   executeJavaScript shims now include openStudyLibraryModal(). The global-shim
   compatibility list grows accordingly. ANALYTICS (Phase 3) edits main.js ONLY to add
   the storage IPC and must preserve every existing menu item.
5. EXE repackaged at 12:39 (folder-as-is Electron build; resources/app is live-editable,
   no repackage needed for bank/UI changes).
6. RISK NOTE: if the parallel job regenerates `exam_data.{json,js}` again after the CEO
   gate build, it would clobber the v3 bank. After every CEO build, verify the file
   starts with `"version": "3.0.0"` before validating; re-run the build if not.

## Type mix per author shard

- NEW-C1T (50): 38 single, 6 multi, 3 order, 3 match
- NEW-C1V (25): 20 single, 3 multi, 1 order, 1 match
- NEW-C2A (36): 28 single, 5 multi, 1 order, 2 match
- NEW-C2B (38): 30 single, 4 multi, 2 order, 2 match
- NEW-C2C (32): 25 single, 4 multi, 1 order, 2 match

Difficulty mix roughly 20% easy / 50% medium / 30% hard.

## Build + validation (CEO gate)

```
python tools/build_bank.py                 # merge shards -> APP_DIR/exam_data.{json,js} (+ auto-balance)
python tools/validate_bank.py --core core1 # gate 1: Core 1 only
python tools/validate_bank.py              # gate 2: full bank
python tools/validate_bank.py --shard _bank/shards/<file>.json   # agent self-check
```

Validator hard-fails on: schema violations, unknown domains/objectives, spoilers, markdown,
template phrases, short explanations, duplicate stems/options, video-objective mismatch,
answer-key imbalance, bank too small for a 90-question weighted draw of any domain.