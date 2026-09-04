#!/usr/bin/env node
/**
 * test_web_dist.js - Verifies dist_web/ after `python tools/build_web_dist.py`.
 *
 * Run: node tools/test_web_dist.js
 * Exits 1 on any failure. Prints a PASS/FAIL line per check.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist_web');

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PRECACHE_ENTRY_BYTES = 3 * 1024 * 1024;
const MAX_PRECACHE_TOTAL_BYTES = 12 * 1024 * 1024;

let failures = 0;
let warnings = 0;

function ok(label) {
  console.log(`[test_web_dist] PASS - ${label}`);
}

function fail(label, detail) {
  failures += 1;
  console.log(`[test_web_dist] FAIL - ${label}`);
  if (detail) console.log(`    ${detail}`);
}

function warn(label, detail) {
  warnings += 1;
  console.log(`[test_web_dist] WARN - ${label}`);
  if (detail) console.log(`    ${detail}`);
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function fmtMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function walk(dir, out) {
  out = out || [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (stat.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// 0. dist_web must exist at all.
// ---------------------------------------------------------------------
if (!fs.existsSync(DIST)) {
  fail('dist_web/ exists', 'run: python tools/build_web_dist.py');
  process.exit(1);
}

const indexPath = path.join(DIST, 'index.html');

// ---------------------------------------------------------------------
// 1. dist_web/index.html exists and every script/link/img it references
//    exists in dist_web (query strings such as ?v=4.2.9 are stripped
//    before resolving the file on disk).
// ---------------------------------------------------------------------
if (!fs.existsSync(indexPath)) {
  fail('dist_web/index.html exists');
  process.exit(1);
}
ok('dist_web/index.html exists');

const indexHtml = readText(indexPath);
const attrRe = /<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*"([^"]+)"[^>]*>/gi;
const referencedMissing = [];
let m;
let refCount = 0;
while ((m = attrRe.exec(indexHtml)) !== null) {
  const url = m[1].trim();
  if (!url || /^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('mailto:') || url.startsWith('#')) {
    continue;
  }
  const clean = url.split('?')[0].split('#')[0];
  if (!clean) continue;
  refCount += 1;
  const target = path.join(DIST, clean);
  if (!fs.existsSync(target)) {
    referencedMissing.push(clean);
  }
}
if (referencedMissing.length) {
  fail(`all ${refCount} index.html script/link/img references exist in dist_web`,
    referencedMissing.map((f) => `missing: ${f}`).join('\n    '));
} else {
  ok(`all ${refCount} index.html script/link/img references exist in dist_web`);
}

// ---------------------------------------------------------------------
// 2. precache-manifest.json entries all exist and none over 3 MB;
//    total precache under 12 MB.
// ---------------------------------------------------------------------
const manifestPath = path.join(DIST, 'precache-manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail('dist_web/precache-manifest.json exists');
} else {
  ok('dist_web/precache-manifest.json exists');
  let entries;
  try {
    entries = JSON.parse(readText(manifestPath));
  } catch (err) {
    fail('precache-manifest.json is valid JSON', String(err));
    entries = [];
  }

  const entryMissing = [];
  const entryTooLarge = [];
  let precacheTotal = 0;

  for (const entry of entries) {
    const rel = String(entry.url || '').replace(/^\.\//, '');
    const full = path.join(DIST, rel);
    if (!fs.existsSync(full)) {
      entryMissing.push(rel);
      continue;
    }
    const size = fs.statSync(full).size;
    precacheTotal += size;
    if (size > MAX_PRECACHE_ENTRY_BYTES) {
      entryTooLarge.push([rel, size]);
    }
  }

  if (entryMissing.length) {
    fail('every precache-manifest.json entry exists on disk',
      entryMissing.map((f) => `missing: ${f}`).join('\n    '));
  } else {
    ok(`every precache-manifest.json entry exists on disk (${entries.length} entries)`);
  }

  if (entryTooLarge.length) {
    fail('no precache-manifest.json entry exceeds 3 MB',
      entryTooLarge.map(([f, s]) => `${f} (${fmtMb(s)})`).join('\n    '));
  } else {
    ok('no precache-manifest.json entry exceeds 3 MB');
  }

  if (precacheTotal > MAX_PRECACHE_TOTAL_BYTES) {
    fail('total precache size is under 12 MB', `actual: ${fmtMb(precacheTotal)}`);
  } else {
    ok(`total precache size is under 12 MB (actual: ${fmtMb(precacheTotal)})`);
  }
}

// ---------------------------------------------------------------------
// 3. No file in dist_web over 25 MB.
// ---------------------------------------------------------------------
const allFiles = walk(DIST);
const overLimit = [];
for (const f of allFiles) {
  const size = fs.statSync(f).size;
  if (size > MAX_FILE_BYTES) {
    overLimit.push([path.relative(DIST, f), size]);
  }
}
if (overLimit.length) {
  fail('no file in dist_web exceeds 25 MB',
    overLimit.map(([f, s]) => `${f} (${fmtMb(s)})`).join('\n    '));
} else {
  ok(`no file in dist_web exceeds 25 MB (${allFiles.length} files checked)`);
}

// ---------------------------------------------------------------------
// 4. sw.js contains the BUILD_ID and the replacesPreviousWorker guard.
// ---------------------------------------------------------------------
const swPath = path.join(DIST, 'sw.js');
if (!fs.existsSync(swPath)) {
  fail('dist_web/sw.js exists');
} else {
  const swText = readText(swPath);
  const buildIdMatch = /const BUILD_ID\s*=\s*'([^']+)'/.exec(swText);
  if (!buildIdMatch || buildIdMatch[1] === 'dev' || !buildIdMatch[1]) {
    fail('sw.js has a real BUILD_ID injected (not the "dev" placeholder)',
      buildIdMatch ? `found: '${buildIdMatch[1]}'` : 'const BUILD_ID not found');
  } else {
    ok(`sw.js has a real BUILD_ID injected (${buildIdMatch[1]})`);
  }

  if (!swText.includes('replacesPreviousWorker')) {
    fail('sw.js contains the replacesPreviousWorker first-install guard');
  } else {
    ok('sw.js contains the replacesPreviousWorker first-install guard');
  }
}

// ---------------------------------------------------------------------
// 5. _headers has the media section.
// ---------------------------------------------------------------------
const headersPath = path.join(DIST, '_headers');
if (!fs.existsSync(headersPath)) {
  fail('dist_web/_headers exists');
} else {
  const headersText = readText(headersPath);
  if (!/\/media\/\*/.test(headersText) || !/Accept-Ranges:\s*bytes/i.test(headersText)) {
    fail('_headers has a /media/* section with Accept-Ranges: bytes');
  } else {
    ok('_headers has a /media/* section with Accept-Ranges: bytes');
  }
}

// ---------------------------------------------------------------------
// 6. No em dash in any emitted text file, except curriculum_data.js (warn only).
// ---------------------------------------------------------------------
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.txt']);
const EM_DASH = '—';
let emDashFailures = 0;
for (const f of allFiles) {
  const ext = path.extname(f).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) continue;
  const rel = path.relative(DIST, f).split(path.sep).join('/');
  let text;
  try {
    text = readText(f);
  } catch (err) {
    continue; // binary masquerading as a text extension - skip
  }
  if (!text.includes(EM_DASH)) continue;
  if (rel === 'curriculum_data.js') {
    warn(`em dash found in ${rel} (curriculum content, not app code - not a failure)`);
  } else {
    emDashFailures += 1;
    fail(`no em dash in ${rel}`);
  }
}
if (!emDashFailures) {
  ok('no em dash in emitted text files (excluding curriculum_data.js)');
}

// ---------------------------------------------------------------------
console.log('');
console.log(`[test_web_dist] ${failures} failure(s), ${warnings} warning(s)`);
if (failures > 0) {
  process.exit(1);
}
console.log('[test_web_dist] ALL CHECKS PASSED');
