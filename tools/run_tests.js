#!/usr/bin/env node
/**
 * tools/run_tests.js - Run every self-contained Node test in tools/ and fail on the first error.
 *
 * Each tools/test_*.js and tools/verify_*.js file is a standalone script that exits
 * non-zero on failure. This runner keeps CI to a single command: npm test
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOOLS = __dirname;
const SKIP = new Set(['smoke_electron.js']); // needs a packaged Electron binary

const files = fs
  .readdirSync(TOOLS)
  .filter((f) => /^(test|verify)_.*\.js$/.test(f) && !SKIP.has(f))
  .sort();

let failed = 0;
for (const file of files) {
  const abs = path.join(TOOLS, file);
  process.stdout.write(`\n=== ${file}\n`);
  const r = spawnSync(process.execPath, [abs], { stdio: 'inherit', cwd: path.resolve(TOOLS, '..') });
  if (r.status !== 0) {
    failed += 1;
    process.stdout.write(`--- FAILED: ${file} (exit ${r.status})\n`);
  }
}

process.stdout.write(`\n${files.length - failed}/${files.length} test scripts passed\n`);
process.exit(failed ? 1 : 0);
