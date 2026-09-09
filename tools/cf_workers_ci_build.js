#!/usr/bin/env node
/**
 * Runs the web dist build only inside Cloudflare Workers Builds.
 * Workers Builds injects WORKERS_CI=1. Local installs skip this so
 * `npm/bun install` stays fast.
 *
 * Why: dist_web/ is gitignored. Workers Builds was configured with an
 * empty build command and `npx wrangler deploy`, so deploy failed with
 * "assets.directory ... dist_web does not exist". This hook creates
 * dist_web during dependency install when WORKERS_CI is set.
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

if (process.env.WORKERS_CI !== '1') {
  process.exit(0);
}

const root = path.join(__dirname, '..');
const py = process.platform === 'win32' ? 'python' : 'python3';

function run(cmd, args) {
  console.log(`[cf_workers_ci_build] + ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(py, ['tools/build_web_dist.py']);
run('node', ['tools/test_web_dist.js']);
