# Contributing

Thank you for helping technicians pass their exams. This guide covers how the project is organised and what a pull request needs before it can be merged.

## Ground rules

- Be respectful. The [Code of Conduct](CODE_OF_CONDUCT.md) applies everywhere in this project.
- Every contribution is licensed under AGPL-3.0-only, the same as the project. By opening a pull request you agree to that.
- Never commit secrets, certificates, signing keys, or course media you do not own. CI rejects the obvious cases, but the responsibility is yours.
- Keep user-facing text plain. No em dashes, no emoji, no marketing adjectives. The theme is black and gold and the copy should read the same way: direct.

## Getting set up

```bash
git clone https://github.com/LuminaraDigital/comptia-a-plus-master.git
cd comptia-a-plus-master
git submodule update --init --recursive
npm install
pip install -r requirements-dev.txt
```

Run the app with `npm start` (desktop) or serve the folder with any static server (web).

## Where things live

- Engine and UI modules are in `js/`. Each module is a plain IIFE that hangs off `window.APlus`. There is no bundler by design, so keep modules dependency-free and browser-safe.
- Exam questions live in `_bank/shards/*.json` and are merged into `exam_data.json` by `tools/build_bank.py`. Do not edit `exam_data.json` directly.
- The question schema, domain strings and quality bar are defined in [BUILD_SPEC.md](BUILD_SPEC.md). The validator enforces them.
- Study notes are Markdown in `CompTIA_A_Plus_Mastery/` and `notes/`. They are compiled into `study_library.json` by `build_study_library.py`.

## Adding or fixing questions

1. Edit or add to the right shard in `_bank/shards/`.
2. Every question needs an objective code from the blueprint, a full explanation, and a `distractor_analysis` entry for each wrong option.
3. Rebuild and validate:

```bash
python tools/build_bank.py
python tools/validate_bank.py --bank exam_data.json
```

4. Commit the shard change and the regenerated `exam_data.json` together.

Questions must be original. Do not copy questions from commercial practice tests or from CompTIA's own materials.

## Code changes

1. Branch from `main`.
2. Make the change. Add or update a test in `tools/test_*.js` when you touch engine logic.
3. Run the full check before you push:

```bash
npm run check
npm test
python tools/validate_bank.py --bank exam_data.json
```

4. Open a pull request using the template. Describe what changed and why. Link the issue if there is one.

## Commit messages

Use the imperative mood and keep the first line under 72 characters. Explain the reason in the body when it is not obvious from the diff.

```
Fix readiness score ignoring order-type questions

The readiness calculator only counted single and multi items, so learners
who practised sequencing tasks saw no movement on objective 5.1.
```

## Reporting bugs

Open an issue with the bug template. Include the platform, the app version and the steps to reproduce. Console output helps.

## Security

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
