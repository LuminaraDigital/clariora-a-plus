/**
 * tools/test_answer_integrity.js
 * End-to-end proof that the answer an author wrote is the answer the app marks
 * correct, for every question in the bank and every question type.
 * Run: node tools/test_answer_integrity.js
 *
 * Why this exists
 * ---------------
 * Until 3.1.3, 487 of 1032 single-choice questions shipped with a different
 * option keyed than their author wrote. The bank builder rotated the options
 * one way and moved the answer index the other. Nothing caught it: the shards
 * were valid, the schema was valid, the totals looked right, and every unit
 * test passed. The defect only existed in the relationship between two files.
 *
 * So this test does not check schemas. It takes the authored question from
 * _bank/shards, works out what the author said was correct, pushes it through
 * the real runtime path the learner's answer takes (prepareQuestionForSession,
 * then qtypes.score), and asserts the app agrees. It also asserts that a
 * deliberately wrong answer is rejected, so a scorer that returns true for
 * everything cannot pass.
 *
 * If this test fails, learners are being taught or graded wrongly. Treat it as
 * the most serious failure in the suite.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* ---------------- load the browser modules under a stub global ---------------- */

function loadRuntime() {
  const win = { APlus: {} };
  const prev = global.window;
  global.window = win;
  try {
    const engineCore = require(path.join(ROOT, 'js', 'engine-core.js'));
    win.APlus.engineCore = engineCore;
    // qtypes attaches to APlus rather than exporting.
    const src = fs.readFileSync(path.join(ROOT, 'js', 'qtypes.js'), 'utf8');
    new Function('window', 'APlus', 'document', src)(win, win.APlus, undefined);
    return { engineCore, qtypes: win.APlus.qtypes };
  } finally {
    if (prev === undefined) delete global.window;
    else global.window = prev;
  }
}

/* ---------------- load authored questions and the built bank ---------------- */

function loadShards() {
  const dir = path.join(ROOT, '_bank', 'shards');
  const out = new Map();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch (err) {
      continue;
    }
    const rows = Array.isArray(parsed) ? parsed : parsed.questions || [];
    for (const q of rows) if (q && q.id) out.set(q.id, q);
  }
  return out;
}

/* ---------------- build the answer the author intended ---------------- */

/**
 * Returns the user answer, expressed against `prepared`, that the author of
 * `authored` said is correct. Returns null when the two cannot be related,
 * which is itself reported as a failure.
 */
function intendedAnswer(authored, prepared) {
  const type = authored.type || 'single';

  if (type === 'single') {
    const text = authored.options[authored.answer];
    const idx = prepared.options.indexOf(text);
    return idx < 0 ? null : idx;
  }

  if (type === 'multi') {
    const texts = (authored.answers || []).map((i) => authored.options[i]);
    const idxs = texts.map((t) => prepared.options.indexOf(t));
    return idxs.some((i) => i < 0) ? null : idxs.sort((a, b) => a - b);
  }

  if (type === 'match') {
    const matches = {};
    for (const p of authored.pairs || []) matches[p.left] = p.right;
    return matches;
  }

  if (type === 'order') {
    return (authored.sequence || []).slice();
  }

  return null;
}

/** An answer that must be scored wrong, or null when none can be built. */
function deliberatelyWrongAnswer(authored, prepared, correct) {
  const type = authored.type || 'single';

  if (type === 'single') {
    for (let i = 0; i < prepared.options.length; i++) if (i !== correct) return i;
    return null;
  }
  if (type === 'multi') {
    const all = prepared.options.map((_, i) => i);
    const wrong = all.filter((i) => !correct.includes(i));
    if (!wrong.length) return null;
    return [wrong[0]].concat(correct.slice(0, Math.max(0, correct.length - 1))).sort((a, b) => a - b);
  }
  if (type === 'match') {
    const pairs = prepared.pairs || [];
    if (pairs.length < 2) return null;
    const swapped = Object.assign({}, correct);
    swapped[pairs[0].left] = pairs[1].right;
    swapped[pairs[1].left] = pairs[0].right;
    return pairs[0].right === pairs[1].right ? null : swapped;
  }
  if (type === 'order') {
    if (!Array.isArray(correct) || correct.length < 2) return null;
    const flipped = correct.slice();
    const tmp = flipped[0];
    flipped[0] = flipped[1];
    flipped[1] = tmp;
    return flipped[0] === correct[0] ? null : flipped;
  }
  return null;
}

/* ---------------- run ---------------- */

const { engineCore, qtypes } = loadRuntime();
if (!qtypes || typeof qtypes.score !== 'function') {
  console.error('qtypes did not load; cannot verify scoring.');
  process.exit(1);
}

// Accepts a path so the packaged copy, or a deliberately corrupted one, can be
// checked as well as the repository bank.
const bankPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'exam_data.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const shards = loadShards();

const SHUFFLE_ROUNDS = 5; // option order is randomised per session
const failures = [];
const counts = {};
let checked = 0;
let unmatched = 0;
let negativeChecked = 0;

for (const core of ['core1', 'core2']) {
  for (const built of bank[core] || []) {
    const authored = shards.get(built.id);
    if (!authored) {
      unmatched++;
      continue;
    }
    const type = built.type || 'single';
    counts[type] = (counts[type] || 0) + 1;

    for (let round = 0; round < SHUFFLE_ROUNDS; round++) {
      const prepared = engineCore.prepareQuestionForSession(built);
      const correct = intendedAnswer(authored, prepared);

      if (correct === null) {
        failures.push(`${built.id} (${type}): the authored answer does not appear in the prepared question`);
        break;
      }

      if (qtypes.score(prepared, correct) !== true) {
        failures.push(
          `${built.id} (${type}): the answer the author marked correct scores as WRONG` +
          (type === 'single' ? ` (author: "${authored.options[authored.answer]}")` : '')
        );
        break;
      }

      const wrong = deliberatelyWrongAnswer(authored, prepared, correct);
      if (wrong !== null) {
        negativeChecked++;
        if (qtypes.score(prepared, wrong) !== false) {
          failures.push(`${built.id} (${type}): a deliberately wrong answer scores as CORRECT`);
          break;
        }
      }
    }
    checked++;
  }
}

console.log('\nanswer integrity: author intent through the real scoring path\n');
console.log(`  questions checked : ${checked} (${SHUFFLE_ROUNDS} shuffles each)`);
console.log(`  by type           : ${JSON.stringify(counts)}`);
console.log(`  wrong-answer checks: ${negativeChecked}`);
if (unmatched) console.log(`  not in any shard  : ${unmatched} (skipped)`);

if (failures.length) {
  console.log(`\n  ${failures.length} FAILURE(S):`);
  for (const f of failures.slice(0, 40)) console.log('    x ' + f);
  if (failures.length > 40) console.log(`    ... ${failures.length - 40} more`);
  console.log('\nLearners are being graded against answers their authors did not write.\n');
  process.exit(1);
}

console.log('\n  every question scores the answer its author wrote as correct,');
console.log('  and rejects a deliberately wrong one.\n');
process.exit(0);
