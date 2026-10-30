#!/usr/bin/env node
/**
 * Unit tests for workers/item_stats.js normalize + distractor merge.
 * Run: node tools/test_item_stats_ingest.js
 */
'use strict';

import {
  mergeDistractorSpread,
  normalizeTelemetryEvent
} from '../workers/item_stats.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const clean = normalizeTelemetryEvent({
  questionId: 'c1-test-qid',
  selectedOption: 2,
  isCorrect: 1,
  secondsSpent: 12,
  examType: 'core1_mock'
});
assert(clean && clean.questionId === 'c1-test-qid', 'clean questionId');
assert(clean.selectedOption === 2, 'clean selectedOption');
assert(clean.isCorrect === 1, 'clean isCorrect');

const telem = normalizeTelemetryEvent({
  n: 'item_answered',
  t: '2026-09-22T00:00:00.000Z',
  p: {
    questionId: 'c2-x',
    correct: false,
    selectedOption: 1,
    seconds: 9,
    examType: 'drill'
  }
});
assert(telem && telem.questionId === 'c2-x', 'telem questionId');
assert(telem.isCorrect === 0, 'telem correct false -> 0');
assert(telem.selectedOption === 1, 'telem selectedOption');
assert(telem.secondsSpent === 9, 'telem seconds');

assert(normalizeTelemetryEvent({ n: 'session_start', p: {} }) === null, 'skip non-item');
assert(normalizeTelemetryEvent({ n: 'item_answered', p: {} }) === null, 'require qid');

const spread = JSON.parse(mergeDistractorSpread('{"0":2}', 1));
assert(spread['0'] === 2 && spread['1'] === 1, 'distractor merge');

console.log('ALL item_stats ingest unit checks passed');
