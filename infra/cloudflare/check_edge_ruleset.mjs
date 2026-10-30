#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const t = readFileSync(join(root, '.env'), 'utf8');
function get(key) {
  const m = t.match(new RegExp(`^${key}=([^\\r\\n]*)`, 'm'));
  if (!m) return '';
  return m[1].trim().replace(/^["']|["']$/g, '');
}
const token = get('CF_API_TOKEN') || get('CLOUDFLARE_API_TOKEN');
const zone = get('CF_ZONE_ID') || get('CLOUDFLARE_ZONE_ID');
const url = `https://api.cloudflare.com/client/v4/zones/${zone}/rulesets/phases/http_ratelimit/entrypoint`;
const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const j = await r.json();
if (!j.success) {
  console.log('EDGE_RULESET=MISSING_OR_ERROR', r.status);
  console.log((j.errors || []).map((e) => e.message).join('; '));
  process.exitCode = 1;
} else {
  const res = j.result;
  console.log(`EDGE_RULESET=OK id=${res.id} version=${res.version} rules=${(res.rules || []).length}`);
}
