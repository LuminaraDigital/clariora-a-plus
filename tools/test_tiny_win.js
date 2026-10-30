#!/usr/bin/env node
/**
 * test_tiny_win.js - Unit checks for Next Tiny Win module + API contracts.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js', 'tiny-win.js'), 'utf8');
const api = require(path.join(ROOT, 'js', 'tiny-win.js'));

assert.strictEqual(typeof api.chooseWin, 'function');
assert.strictEqual(typeof api.mount, 'function');

// Dead API ban: these never existed on dailyQuest / adaptive.
assert.ok(!/dailyQuest\.getOpenLeg/.test(src), 'must not call getOpenLeg');
assert.ok(!/dailyQuest\.startLeg/.test(src), 'must not call startLeg');
assert.ok(!/adaptive\.startRaid/.test(src), 'must not call adaptive.startRaid');
assert.ok(/daily_quest:leg/.test(src) || /daily_quest:leg_complete/.test(src), 'must listen for quest leg bus');
assert.ok(/startRaidOrToday|startWeakObjectiveRaid/.test(src), 'must use raid with fallback');
assert.ok(/tiny_win_completed/.test(src), 'must emit tiny_win_completed');
assert.ok(/readinessPath/.test(src), 'must prefer readiness path when ready');
assert.ok(/questWin\(\) \|\| pathWin\(\)/.test(src) || /questWin\(\)\s*\|\|/.test(src), 'quest before path');

const win = api.chooseWin();
assert.ok(win && win.type && win.label && typeof win.start === 'function');

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(/js\/tiny-win\.js/.test(indexHtml), 'index must load tiny-win.js');
assert.ok(/id="tinyWinCard"/.test(indexHtml), 'index must host tinyWinCard');
assert.ok(/js\/readiness-path\.js/.test(indexHtml), 'index must load readiness-path before tiny-win');
assert.ok(/id="readinessPathStrip"/.test(indexHtml), 'index must host readinessPathStrip');

console.log('PASS tiny-win chooseWin returns', win.type, '-', win.label.slice(0, 60));
process.exit(0);
