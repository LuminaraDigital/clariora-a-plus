#!/usr/bin/env node
/**
 * Confirms local .env Cloudflare token works for Wrangler without printing it.
 * Account API tokens often fail /user/tokens/verify; wrangler whoami is the real gate.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, '.env'))) {
  console.error('missing .env');
  process.exit(1);
}

const r = spawnSync('npx', ['--yes', 'wrangler', 'whoami'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
  env: process.env,
});
const out = `${r.stdout || ''}${r.stderr || ''}`;
const ok = /logged in/i.test(out) && r.status === 0;
console.log(`wrangler_whoami_ok=${ok}`);
if (!ok) {
  console.log(out.split(/\r?\n/).slice(0, 8).join('\n'));
  process.exitCode = 1;
}
