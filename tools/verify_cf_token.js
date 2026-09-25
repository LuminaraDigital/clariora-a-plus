#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const text = readFileSync(join(root, '.env'), 'utf8');
const m = text.match(/^\s*CLOUDFLARE_API_TOKEN=(.*)$/m);
if (!m) {
  console.log('token_verify=missing');
  process.exit(1);
}
const token = m[1].trim().replace(/^["']|["']$/g, '');
const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
  headers: { Authorization: `Bearer ${token}` },
});
const j = await res.json();
console.log(`token_verify_success=${!!j.success}`);
console.log(`token_status=${(j.result && j.result.status) || 'unknown'}`);
console.log(`token_id_prefix=${j.result && j.result.id ? String(j.result.id).slice(0, 8) + '…' : 'none'}`);
if (!j.success) process.exitCode = 1;
