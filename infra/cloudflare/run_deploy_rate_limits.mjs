#!/usr/bin/env node
/**
 * Maps CLOUDFLARE_* from .env onto CF_* expected by deploy-rate-limits.mjs
 * and runs the deploy. Does not print secrets.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = join(root, '.env');
const text = readFileSync(envPath, 'utf8');

function get(key) {
  const m = text.match(new RegExp(`^${key}=([^\\r\\n]*)`, 'm'));
  if (!m) return '';
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const token = get('CF_API_TOKEN') || get('CLOUDFLARE_API_TOKEN');
const zone = get('CF_ZONE_ID') || get('CLOUDFLARE_ZONE_ID');
if (!token || !zone) {
  console.error('Missing Cloudflare token or zone id in .env');
  process.exit(1);
}

process.env.CF_API_TOKEN = token;
process.env.CF_ZONE_ID = zone;

const script = join(root, 'infra', 'cloudflare', 'deploy-rate-limits.mjs');
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
  cwd: root,
});
process.exit(result.status === null ? 1 : result.status);
