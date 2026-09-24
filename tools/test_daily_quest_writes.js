/**
 * tools/test_daily_quest_writes.js
 * Regression: the Daily Quest must not rewrite its plan on every storage:changed,
 * because that loop starves the database engine's debounced flush and progress is
 * lost on reload.
 *
 * Run: node tools/test_daily_quest_writes.js
 */
'use strict';

const path = require('path');
const assert = require('assert');

const store = {};
const handlers = {};
let writes = 0;
let depth = 0;

const bus = {
  on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
  emit(evt, payload) {
    depth += 1;
    if (depth > 50) throw new Error('storage:changed recursion');
    (handlers[evt] || []).forEach((fn) => fn(payload));
    depth -= 1;
  }
};

global.window = {
  APlus: {
    bus,
    storage: {
      get(key, fallback) {
        return Object.prototype.hasOwnProperty.call(store, key) ? JSON.parse(store[key]) : fallback;
      },
      set(key, value) {
        writes += 1;
        store[key] = JSON.stringify(value);
        bus.emit('storage:changed', { key, value });
      }
    },
    readinessUI: {
      refresh() {
        dq.getTodayStatus();
      }
    }
  },
  APLUS_FEATURES_CONFIG: { gamification: { enabled: true, showHomeQuest: true, awardQuestBonus: true } },
  document: { getElementById: () => ({}) },
  location: { search: '' }
};
global.document = { readyState: 'complete', getElementById: () => ({}) };

const dq = require(path.join(__dirname, '..', 'js', 'daily-quest.js'));
dq._boot();

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ok   ' + name);
  } catch (err) {
    console.log('  FAIL ' + name + '\n       ' + err.message);
    process.exitCode = 1;
  }
}

console.log('=== Daily Quest write-loop regression ===\n');

test('first status read writes the new day plan', () => {
  writes = 0;
  dq.getTodayStatus();
  assert.ok(writes >= 1, 'expected the new plan to be written once');
});

test('repeat status reads with no change write nothing', () => {
  writes = 0;
  for (let i = 0; i < 20; i++) dq.getTodayStatus();
  assert.equal(writes, 0, 'unchanged plan was rewritten ' + writes + ' times');
});

test('an unrelated storage:changed does not trigger a plan write', () => {
  writes = 0;
  bus.emit('storage:changed', { key: 'aplus3_something_else' });
  assert.equal(writes, 0, 'plan rewritten ' + writes + ' times after an unrelated change');
});

test('marking a leg writes once and does not cascade', () => {
  writes = 0;
  dq.markLeg('recover');
  assert.ok(writes >= 1 && writes <= 2, 'expected 1-2 writes, got ' + writes);
});

console.log(`\nPASSED: ${passed}`);
