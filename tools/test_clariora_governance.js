#!/usr/bin/env node
/**
 * test_clariora_governance.js - Enforce Clariora native release budgets as CI gates.
 *
 * Reads config/clariora_governance.json and fails when:
 * - GLB assets exceed budgets.maxGlbKb
 * - Any GLB marks extras.quality_tier === "hd" while containing zero textures
 * - Required budget fields are missing
 * - Precache shell exceeds budgets.offlineShellMb when dist_web exists
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GOV = path.join(ROOT, 'config', 'clariora_governance.json');
const GLB_DIRS = [
  path.join(ROOT, 'media', 'hardware'),
  path.join(ROOT, 'landing', 'models')
];

let failures = 0;

function pass(msg) {
  console.log('  PASS  ' + msg);
}

function fail(msg) {
  console.error('  FAIL  ' + msg);
  failures += 1;
}

function listGlbs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.glb$/i.test(f))
    .map((f) => path.join(dir, f));
}

function glbHasTextureImages(buf) {
  const text = buf.toString('utf8');
  if (/image\/(?:png|jpeg|webp)/i.test(text)) return true;
  if (/"images"\s*:\s*\[\s*\{/.test(text)) return true;
  if (/"mimeType"\s*:\s*"image\//i.test(text)) return true;
  return false;
}

function glbClaimsHd(buf) {
  const text = buf.toString('utf8');
  return /"quality_tier"\s*:\s*"hd"/i.test(text) || /"qualityTier"\s*:\s*"hd"/i.test(text);
}

console.log('Clariora governance gates\n');

if (!fs.existsSync(GOV)) {
  fail('missing ' + path.relative(ROOT, GOV));
  process.exit(1);
}

let gov;
try {
  gov = JSON.parse(fs.readFileSync(GOV, 'utf8'));
  pass('governance JSON parses');
} catch (e) {
  fail('governance JSON invalid: ' + e.message);
  process.exit(1);
}

const budgets = (gov && gov.budgets) || {};
const rules = (gov && gov.rules) || {};
const maxGlbKb = Number(budgets.maxGlbKb);
const maxShellMb = Number(budgets.offlineShellMb);
const maxFileMb = Number(budgets.maxSingleFileMb);

if (!(maxGlbKb > 0)) fail('budgets.maxGlbKb must be a positive number');
else pass('max GLB budget = ' + maxGlbKb + ' KB');

if (!(maxShellMb > 0)) fail('budgets.offlineShellMb must be a positive number');
else pass('offline shell budget = ' + maxShellMb + ' MB');

if (!(maxFileMb > 0)) fail('budgets.maxSingleFileMb must be a positive number');
else pass('max single file = ' + maxFileMb + ' MB');

if (gov.product !== 'Clariora') fail('product must be Clariora');
else pass('product = Clariora');

const glbs = GLB_DIRS.reduce((acc, d) => acc.concat(listGlbs(d)), []);
if (glbs.length === 0) {
  fail('no GLB assets found under media/hardware or landing/models');
} else {
  pass('found ' + glbs.length + ' GLB asset(s)');
}

const maxBytes = maxGlbKb * 1024;
glbs.forEach((abs) => {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  const st = fs.statSync(abs);
  if (st.size > maxBytes) {
    fail(rel + ' is ' + Math.ceil(st.size / 1024) + ' KB (limit ' + maxGlbKb + ' KB)');
  } else {
    pass(rel + ' size OK (' + Math.ceil(st.size / 1024) + ' KB)');
  }
  if (st.size > maxFileMb * 1024 * 1024) {
    fail(rel + ' exceeds budgets.maxSingleFileMb');
  }
  const buf = fs.readFileSync(abs);
  if (rules.blockHdClaimWithoutTextures !== false && glbClaimsHd(buf) && !glbHasTextureImages(buf)) {
    fail(rel + ' claims quality_tier=hd but has no texture images');
  }
});

const precacheManifest = path.join(ROOT, 'dist_web', 'precache-manifest.json');
if (fs.existsSync(precacheManifest)) {
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(precacheManifest, 'utf8'));
  } catch (e) {
    fail('precache-manifest.json invalid: ' + e.message);
    entries = null;
  }
  if (Array.isArray(entries)) {
    let total = 0;
    entries.forEach((e) => {
      const rel = String((e && e.url) || '').replace(/^\.\//, '');
      if (!rel) return;
      const abs = path.join(ROOT, 'dist_web', rel);
      if (fs.existsSync(abs)) total += fs.statSync(abs).size;
    });
    const totalMb = total / (1024 * 1024);
    if (totalMb > maxShellMb) {
      fail('precache shell ' + totalMb.toFixed(2) + ' MB exceeds ' + maxShellMb + ' MB');
    } else {
      pass('precache shell ' + totalMb.toFixed(2) + ' MB <= ' + maxShellMb + ' MB');
    }
  }
} else {
  pass('precache-manifest.json not built yet (shell check deferred to post-build)');
}

const govRaw = fs.readFileSync(GOV, 'utf8');
if (govRaw.includes('\u2014') || govRaw.includes('\u2013')) {
  fail('governance JSON contains em-dash or en-dash');
} else {
  pass('governance JSON has zero em/en dashes');
}

if (failures) {
  console.error('\n' + failures + ' governance failure(s)');
  process.exit(1);
}
console.log('\nAll Clariora governance gates passed');
process.exit(0);
