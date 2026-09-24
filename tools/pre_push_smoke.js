#!/usr/bin/env node
/**
 * tools/pre_push_smoke.js
 *
 * Fast local gate before pushing to staging or opening a PR to main.
 * Run: npm run smoke:prepush
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(label, command, args) {
  console.log(`\n[prepush] ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`[prepush] FAILED: ${label}`);
    process.exit(result.status || 1);
  }
}

run('Syntax check', 'npm', ['run', 'check']);
run('Node self-tests', 'npm', ['test']);
run('Exam bank validate', process.platform === 'win32' ? 'python' : 'python3', [
  'tools/validate_bank.py',
  '--bank',
  'exam_data.json',
]);

console.log('\n[prepush] OK - safe to push to feature/* or open a PR into staging.');
