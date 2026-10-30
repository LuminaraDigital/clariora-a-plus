#!/usr/bin/env node
/**
 * Scan tracked git files for likely live secrets. Prints paths/kinds only.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const assignRe =
  /(?:CLOUDFLARE_API_TOKEN|CF_API_TOKEN|TELEGRAM_BOT_TOKEN|OPENAI_API_KEY|GROQ_API_KEY|NVIDIA_API_KEY|OPENROUTER_API_KEY|AUTH_SESSION_SECRET|ADMIN_API_KEY|TONCENTER_API_KEY|EDGE_WEBHOOK_SECRET|TELEGRAM_WEBHOOK_SECRET|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["']?([^\s"']+)/gi;

const shapeRe =
  /\b(cfat_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g;

const pemRe = /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/;
const hits = [];

for (const f of files) {
  if (/\.(png|jpe?g|webp|gif|woff2|ico|pdf|pptx|docx|map|webm)$/i.test(f)) continue;
  let t;
  try {
    t = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  let m;
  assignRe.lastIndex = 0;
  while ((m = assignRe.exec(t))) {
    const val = m[1] || '';
    const placeholder =
      /^(your-|changeme|xxx|TODO|REPLACE|<|\$\{|process\.env|example)/i.test(val) ||
      val.length < 12;
    if (!placeholder) {
      hits.push({ file: f, kind: 'ASSIGN', key: m[0].split(/[:=]/)[0].trim(), len: val.length });
    }
  }
  shapeRe.lastIndex = 0;
  while ((m = shapeRe.exec(t))) {
    hits.push({ file: f, kind: 'TOKEN_SHAPE', prefix: `${m[1].slice(0, 5)}…`, len: m[1].length });
  }
  if (pemRe.test(t)) hits.push({ file: f, kind: 'PEM_PRIVATE_KEY' });
}

console.log(hits.length ? JSON.stringify(hits, null, 2) : 'NO_HARDCODED_SECRET_ASSIGNMENTS_IN_TRACKED_FILES');

// Local ignore check
try {
  const out = execSync('git check-ignore -v .env', { encoding: 'utf8' }).trim();
  console.log('LOCAL_ENV_IGNORE=' + out);
} catch {
  console.log('LOCAL_ENV_IGNORE=NOT_IGNORED_OR_MISSING');
}

try {
  const hist = execSync('git log --all --oneline -- .env .env.production .env.local', {
    encoding: 'utf8',
  }).trim();
  console.log(hist ? 'ENV_IN_GIT_HISTORY=YES' : 'ENV_IN_GIT_HISTORY=no');
} catch {
  console.log('ENV_IN_GIT_HISTORY=unknown');
}
