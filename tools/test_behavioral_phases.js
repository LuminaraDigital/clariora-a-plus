#!/usr/bin/env node
/**
 * test_behavioral_phases.js - Smoke tests for Phases 1-4 behavioral modules.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const modules = [
  'close-loop-ux.js',
  'friction-coach.js',
  'jit-survey.js',
  'habit-66.js',
  'feature-prune.js',
  'social-proof.js',
  'proof-of-readiness.js',
  'telegram-buddy-client.js'
];

modules.forEach(function (name) {
  const abs = path.join(ROOT, 'js', name);
  assert.ok(fs.existsSync(abs), 'missing ' + name);
  const src = fs.readFileSync(abs, 'utf8');
  assert.ok(!src.includes('\u2014') && !src.includes('\u2013'), name + ' has em/en dash');
  assert.ok(indexHtml.indexOf('js/' + name) >= 0, 'index must load ' + name);
});

const closeLoop = require(path.join(ROOT, 'js', 'close-loop-ux.js'));
const msg = closeLoop.buildMessage({ scaledScore: 700, total: 20, rawCorrect: 14, examType: 'core1' });
assert.ok(msg.happened && msg.why && msg.cta);

const friction = require(path.join(ROOT, 'js', 'friction-coach.js'));
assert.ok(typeof friction.diagnose === 'function');
assert.ok(friction.primers('2.0 Networking').length > 10);

const habit = require(path.join(ROOT, 'js', 'habit-66.js'));
assert.strictEqual(habit.TARGET, 66);

const prune = require(path.join(ROOT, 'js', 'feature-prune.js'));
assert.ok(typeof prune.record === 'function');

const social = require(path.join(ROOT, 'js', 'social-proof.js'));
assert.strictEqual(social.MIN_N, 25);

const proof = require(path.join(ROOT, 'js', 'proof-of-readiness.js'));
assert.ok(typeof proof.canonicalPayload === 'function');
assert.ok(typeof proof.verify === 'function');

const buddy = require(path.join(ROOT, 'js', 'telegram-buddy-client.js'));
assert.ok(typeof buddy.setOptIn === 'function');

assert.ok(/id="proofExportRow"/.test(indexHtml), 'proof export button row');

console.log('PASS behavioral phases smoke (' + modules.length + ' modules wired)');
process.exit(0);
