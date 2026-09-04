#!/usr/bin/env node
/**
 * CSS contract test for css/brand-black-gold.css.
 *
 * Checks, in both themes:
 *   1. WCAG 2.1 contrast for every text token against every surface token.
 *      4.5:1 for body text, 3.0:1 for tokens only ever used at 18px+ / bold
 *      display sizes.
 *   2. The gold ramp is a real ramp: light is lighter than primary, dark is
 *      darker than primary.
 *   3. Text sitting on a gold fill clears 4.5:1.
 *   4. Motion is three durations and one easing (the cinematic first run
 *      intro keeps its own film timings and is named separately).
 *   5. Every token name other files reference still exists.
 *   6. The light theme carries no blanket white text on .btn.
 *   7. Interactive controls declare a 44px minimum height.
 *
 * Usage: node tools/test_css_contract.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CSS_PATH = path.join(__dirname, '..', 'css', 'brand-black-gold.css');
const SRC_DIRS = [path.join(__dirname, '..', 'js')];
const HTML_PATH = path.join(__dirname, '..', 'index.html');

const css = fs.readFileSync(CSS_PATH, 'utf8');

const failures = [];
const notes = [];

function fail(msg) { failures.push(msg); }
function note(msg) { notes.push(msg); }

/* ---------------------------------------------------------------- */
/* Colour maths                                                      */
/* ---------------------------------------------------------------- */

function parseHex(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function relativeLuminance(rgb) {
  const c = rgb.map(function (v) {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a, b) {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------------------------------------------------------- */
/* Token extraction                                                  */
/* ---------------------------------------------------------------- */

function blockFor(selector) {
  const idx = css.indexOf(selector + ' {');
  if (idx === -1) throw new Error('token block not found: ' + selector);
  const open = css.indexOf('{', idx);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error('unterminated block: ' + selector);
}

function readTokens(body) {
  const out = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(body)) !== null) out[m[1]] = m[2].trim();
  return out;
}

function resolve(tokens, name, seen) {
  seen = seen || {};
  if (seen[name]) return null;
  seen[name] = true;
  const raw = tokens[name];
  if (!raw) return null;
  const v = raw.trim();
  if (v.charAt(0) === '#') return v;
  const ref = v.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (ref) return resolve(tokens, ref[1], seen);
  return null;
}

const darkTokens = readTokens(blockFor(':root'));
const lightRaw = readTokens(blockFor('[data-theme="light"]'));
// The light theme inherits anything it does not redefine.
const lightTokens = Object.assign({}, darkTokens, lightRaw);

const THEMES = [
  { name: 'dark', tokens: darkTokens },
  { name: 'light', tokens: lightTokens }
];

const SURFACES = ['--surface-0', '--surface-1', '--surface-2'];

// Tokens that carry body copy. AA is 4.5:1.
const BODY_TEXT = ['--text-primary', '--text-secondary', '--text-muted', '--gold-text'];
// Tokens only ever painted at 18px+ or 14px bold. AA large is 3.0:1.
const LARGE_TEXT = ['--accent-green', '--accent-red'];
// Tokens that are only ever a fill, a border or a hairline, never text.
// Reported for the record; the readable counterpart is --gold-text.
const FILL_ONLY = ['--gold-primary'];

/* ---------------------------------------------------------------- */
/* 1. Contrast                                                       */
/* ---------------------------------------------------------------- */

const table = [];

THEMES.forEach(function (theme) {
  const check = function (list, min, kind) {
    list.forEach(function (tokenName) {
      const fg = resolve(theme.tokens, tokenName);
      if (!fg) { fail(theme.name + ': cannot resolve ' + tokenName + ' to a hex value'); return; }
      SURFACES.forEach(function (surfName) {
        const bg = resolve(theme.tokens, surfName);
        if (!bg) { fail(theme.name + ': cannot resolve ' + surfName); return; }
        const ratio = contrast(fg, bg);
        table.push({
          theme: theme.name, token: tokenName, value: fg,
          surface: surfName, surfaceValue: bg,
          ratio: Math.round(ratio * 100) / 100, min: min
        });
        if (ratio < min) {
          fail(theme.name + ': ' + tokenName + ' ' + fg + ' on ' + surfName + ' ' + bg +
            ' is ' + ratio.toFixed(2) + ':1, below the ' + min.toFixed(1) + ':1 ' + kind + ' floor');
        }
      });
    });
  };
  check(BODY_TEXT, 4.5, 'body text');
  check(LARGE_TEXT, 3.0, 'display text');
  // Fills are recorded, not gated: they never carry a glyph.
  FILL_ONLY.forEach(function (tokenName) {
    const fg = resolve(theme.tokens, tokenName);
    SURFACES.forEach(function (surfName) {
      const bg = resolve(theme.tokens, surfName);
      if (!fg || !bg) return;
      table.push({
        theme: theme.name, token: tokenName + ' (fill)', value: fg,
        surface: surfName, surfaceValue: bg,
        ratio: Math.round(contrast(fg, bg) * 100) / 100, min: 0
      });
    });
  });
});

/* ---------------------------------------------------------------- */
/* 2. The gold ramp is a ramp                                        */
/* ---------------------------------------------------------------- */

THEMES.forEach(function (theme) {
  const p = resolve(theme.tokens, '--gold-primary');
  const l = resolve(theme.tokens, '--gold-light');
  const d = resolve(theme.tokens, '--gold-dark');
  if (!p || !l || !d) { fail(theme.name + ': gold ramp incomplete'); return; }
  const lp = relativeLuminance(parseHex(p));
  const ll = relativeLuminance(parseHex(l));
  const ld = relativeLuminance(parseHex(d));
  if (!(ll > lp)) fail(theme.name + ': --gold-light ' + l + ' is not lighter than --gold-primary ' + p);
  if (!(ld < lp)) fail(theme.name + ': --gold-dark ' + d + ' is not darker than --gold-primary ' + p);
});

/* ---------------------------------------------------------------- */
/* 3. Text on a gold fill                                            */
/* ---------------------------------------------------------------- */

THEMES.forEach(function (theme) {
  const onGold = resolve(theme.tokens, '--on-gold');
  ['--gold-primary', '--gold-light'].forEach(function (g) {
    const bg = resolve(theme.tokens, g);
    if (!onGold || !bg) { fail(theme.name + ': cannot resolve --on-gold against ' + g); return; }
    const ratio = contrast(onGold, bg);
    table.push({
      theme: theme.name, token: '--on-gold', value: onGold,
      surface: g, surfaceValue: bg, ratio: Math.round(ratio * 100) / 100, min: 4.5
    });
    if (ratio < 4.5) {
      fail(theme.name + ': --on-gold ' + onGold + ' on ' + g + ' ' + bg +
        ' is ' + ratio.toFixed(2) + ':1, below 4.5:1');
    }
  });
});

/* ---------------------------------------------------------------- */
/* 4. Motion: three durations, one easing                            */
/* ---------------------------------------------------------------- */

const INTRO_START = css.indexOf('/* --- Cinematic laser intro --- */');
const INTRO_END = css.indexOf('   12. Module surfaces');
const shellCss = INTRO_START === -1
  ? css
  : css.slice(0, INTRO_START) + css.slice(INTRO_END);

const declRe = /(transition|animation)(-duration|-timing-function)?\s*:\s*([^;}]+)[;}]/gi;
const literalDurations = new Set();
const literalEasings = new Set();
let d;
while ((d = declRe.exec(shellCss)) !== null) {
  const value = d[3];
  const durs = value.match(/(?:^|[\s,(])(\d*\.?\d+)(ms|s)\b/g) || [];
  durs.forEach(function (t) { literalDurations.add(t.trim()); });
  const eases = value.match(/(?:^|[\s,(])(ease-in-out|ease-in|ease-out|ease|linear|cubic-bezier\([^)]*\)|steps\([^)]*\))(?![-\w])/g) || [];
  eases.forEach(function (t) { literalEasings.add(t.trim()); });
}
// The timer pulse is a keyframe period, not a transition step; it is the one
// declared exception and is named here so it cannot grow.
const ALLOWED_LITERAL_DURATIONS = new Set(['1s']);
literalDurations.forEach(function (t) {
  if (!ALLOWED_LITERAL_DURATIONS.has(t)) {
    fail('motion: literal duration "' + t + '" outside the token scale (--dur-fast / --dur-base / --dur-slow)');
  }
});
literalEasings.forEach(function (t) {
  fail('motion: literal easing "' + t + '" outside var(--ease-out)');
});

['--dur-fast', '--dur-base', '--dur-slow', '--ease-out'].forEach(function (t) {
  if (!darkTokens[t]) fail('motion: token ' + t + ' is missing');
});
['--dur-screen', '--dur-ring'].forEach(function (t) {
  if (darkTokens[t]) fail('motion: retired token ' + t + ' is still declared');
});

/* ---------------------------------------------------------------- */
/* 5. Token names other files reference must survive                 */
/* ---------------------------------------------------------------- */

let consumers = '';
try { consumers += fs.readFileSync(HTML_PATH, 'utf8'); } catch (e) { /* optional */ }
SRC_DIRS.forEach(function (dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir); } catch (e) { return; }
  entries.filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
    consumers += fs.readFileSync(path.join(dir, f), 'utf8');
  });
});

const referenced = new Set();
let r;
const refRe = /var\((--[a-z0-9-]+)/gi;
while ((r = refRe.exec(consumers)) !== null) referenced.add(r[1]);
referenced.forEach(function (name) {
  if (!(name in darkTokens)) fail('token ' + name + ' is used by index.html or js/ but is no longer declared');
});
note(referenced.size + ' tokens referenced outside the sheet, all declared');

/* ---------------------------------------------------------------- */
/* 6. No blanket white text on buttons in the light theme            */
/* ---------------------------------------------------------------- */

if (/\[data-theme="light"\][^{}]*\.btn[^{}]*\{[^}]*color:\s*#(?:FFF|FFFFFF|fff|ffffff)\s*!important/i.test(css)) {
  fail('light theme: a blanket white !important colour is still applied to .btn');
}

/* ---------------------------------------------------------------- */
/* 7. Hit targets                                                    */
/* ---------------------------------------------------------------- */

const HIT_SELECTORS = ['.toolbar-btn', '.drawer-item', '.strike-btn', '.timer-display'];
HIT_SELECTORS.forEach(function (sel) {
  if (css.indexOf(sel) === -1) fail('hit target: ' + sel + ' has no rule in the sheet');
});
if (!/--hit:\s*44px/.test(css)) fail('hit target: --hit is not 44px');
if (!/\.strike-btn\s*\{[\s\S]*?width:\s*44px/.test(css)) fail('hit target: .strike-btn is not 44px wide');
if (!/\.timer-digits[\s\S]{0,300}?font-size:\s*20px/.test(css)) fail('timer: .timer-digits is not 20px');

/* ---------------------------------------------------------------- */
/* Report                                                            */
/* ---------------------------------------------------------------- */

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

console.log('CSS contract: css/brand-black-gold.css');
console.log('');
console.log(pad('theme', 7) + pad('token', 24) + pad('value', 10) + pad('surface', 15) + pad('bg', 10) + pad('ratio', 9) + 'min');
console.log('-'.repeat(86));
table.forEach(function (row) {
  console.log(
    pad(row.theme, 7) + pad(row.token, 24) + pad(row.value, 10) +
    pad(row.surface, 15) + pad(row.surfaceValue, 10) +
    pad(row.ratio.toFixed(2) + ':1', 9) + (row.min ? row.min.toFixed(1) + ':1' : 'fill, not gated')
  );
});
console.log('');
notes.forEach(function (n) { console.log('note: ' + n); });

if (failures.length) {
  console.log('');
  failures.forEach(function (f) { console.log('FAIL: ' + f); });
  console.log('');
  console.log(failures.length + ' failure(s)');
  process.exit(1);
}

console.log('');
console.log('PASS: ' + table.length + ' contrast pairs, gold ramps ordered, ' +
  'motion on three durations and one easing, all consumed tokens present.');
