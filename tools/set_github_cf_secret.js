#!/usr/bin/env node
/**
 * Wire CLOUDFLARE_API_TOKEN from local .env into GitHub Actions secrets.
 * Never prints the token value.
 *
 * Usage: node tools/set_github_cf_secret.js
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const repo = 'LuminaraDigital/clariora-a-plus';

function getToken() {
  const text = readFileSync(envPath, 'utf8');
  const m = text.match(/^\s*CLOUDFLARE_API_TOKEN=(.*)$/m);
  if (!m) throw new Error('CLOUDFLARE_API_TOKEN not found in .env');
  const raw = m[1].trim().replace(/^["']|["']$/g, '');
  if (!raw || raw.length < 20) throw new Error('CLOUDFLARE_API_TOKEN missing or too short');
  return raw;
}

function setSecret(name, value, envName) {
  const args = ['secret', 'set', name, '--repo', repo];
  if (envName) args.push('--env', envName);
  const r = spawnSync('gh', args, {
    input: value,
    encoding: 'utf8',
    cwd: root,
    shell: true,
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    throw new Error(`gh secret set ${name}${envName ? ' --env ' + envName : ''} failed: ${err.slice(0, 200)}`);
  }
}

const token = getToken();
setSecret('CLOUDFLARE_API_TOKEN', token);
console.log('OK: set repo secret CLOUDFLARE_API_TOKEN (value not shown)');
try {
  setSecret('CLOUDFLARE_API_TOKEN', token, 'production');
  console.log('OK: set production environment secret CLOUDFLARE_API_TOKEN (value not shown)');
} catch (err) {
  console.log('WARN: production env secret not set (' + String(err.message || err).slice(0, 120) + ')');
  console.log('Create the GitHub Environment named "production" if missing, then re-run.');
}
