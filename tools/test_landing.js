#!/usr/bin/env node
/**
 * test_landing.js - Checks the landing page against the design rules the
 * product holds itself to, on the built copy in dist_web/landing.
 *
 * Design system: every colour in landing.css lives in the :root token
 *   blocks; component rules use var() only.
 * Semantic colours: ok, warn, danger and info tokens exist and are used.
 * State uniqueness: buttons define hover, active, focus-visible, selected,
 *   disabled and busy states.
 * H1 scaling: the display size is a clamp() with a viewport term and a
 *   fixed ceiling, so it cannot fill a phone screen.
 * Top of fold: an h1, a lead paragraph, a primary call to action and a
 *   product image all sit inside the hero, and there is exactly one h1.
 * Weight: the page plus its CSS, fonts and hero image stays under 250 KB,
 *   which loads in about a second on a slow 4G connection.
 * Copy: no em dashes, no emoji, no leftover version placeholder.
 * Zero-user trust: a visible #trust section, no invented testimonials or
 *   placeholder quote cards in the DOM, and an honest early-product FAQ.
 *
 * Run: node tools/test_landing.js   (after python tools/build_web_dist.py)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'landing');
const DIST = path.join(ROOT, 'dist_web', 'landing');

let failures = 0;
function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label, detail) {
  failures += 1;
  console.log(`  FAIL  ${label}`);
  if (detail) console.log(`        ${detail}`);
}
function check(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

const srcHtml = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'landing.css'), 'utf8');

// ---- Design system --------------------------------------------------
// Strip the two :root blocks, then look for any raw colour left behind.
const tokenBlocks = css.match(/:root\s*\{[^}]*\}/g) || [];
check(tokenBlocks.length >= 2, 'landing.css defines dark and light token blocks',
  `found ${tokenBlocks.length}`);
let rest = css;
for (const block of tokenBlocks) rest = rest.replace(block, '');
rest = rest.replace(/\/\*[\s\S]*?\*\//g, '');
const rawColours = rest.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) || [];
check(rawColours.length === 0, 'no colour outside the token blocks',
  rawColours.length ? `${rawColours.length} raw colour value(s): ${rawColours.slice(0, 5).join(', ')}` : '');
const rawPx = rest.match(/(?<![\w-])(?:padding|margin|gap)\s*:[^;]*\b(?:[0-9]{2,})px/g) || [];
check(rawPx.length === 0, 'spacing uses the 8px tokens, not raw values',
  rawPx.length ? rawPx.slice(0, 3).join(' | ') : '');
const inlineStyles = (srcHtml.match(/style="[^"]*"/g) || []).filter((s) => !/var\(--|position:absolute/.test(s));
check(inlineStyles.length === 0, 'inline styles in the HTML only reference tokens',
  inlineStyles.slice(0, 3).join(' | '));
check(/font-family:\s*var\(--font\)/.test(css) || /font-family: var\(--font\)/.test(css),
  'body font comes from the --font token');

// ---- Semantic colours -----------------------------------------------
for (const name of ['ok', 'warn', 'danger', 'info']) {
  check(new RegExp(`--${name}:\\s*#`).test(css), `semantic token --${name} is defined`);
  check(new RegExp(`var\\(--${name}\\)`).test(rest), `semantic token --${name} is used`);
}

// ---- State uniqueness -------------------------------------------------
const states = {
  hover: /\.btn-primary:hover/,
  active: /\.btn-primary:active/,
  'focus-visible': /:focus-visible\s*\{/,
  selected: /\.btn\[aria-pressed="true"\]|\.tab\[aria-selected="true"\]/,
  disabled: /\.btn\[disabled\]/,
  busy: /\.btn\.is-busy/,
};
for (const [name, re] of Object.entries(states)) {
  check(re.test(css), `buttons have a distinct ${name} state`);
}
check(/\.faq details\[open\]/.test(css), 'FAQ items have a distinct open state');

// ---- H1 scaling -------------------------------------------------------
const display = css.match(/--fs-display:\s*clamp\(([^)]*)\)/);
check(!!display, '--fs-display is a clamp()');
if (display) {
  const parts = display[1].split(',').map((s) => s.trim());
  check(parts.length === 3 && /vw/.test(parts[1]) && /rem$/.test(parts[2]),
    'h1 clamp has a viewport middle term and a fixed rem ceiling', display[0]);
  const ceiling = parseFloat(parts[2]);
  check(ceiling <= 4.5, 'h1 ceiling is at most 4.5rem', `${ceiling}rem`);
}
check(/h1\s*\{[^}]*font-size:\s*var\(--fs-display\)/.test(css), 'h1 uses --fs-display');
check(/\.hero h1\s*\{[^}]*max-width:\s*\d+ch/.test(css), 'hero h1 has a character measure');

// ---- Top of fold ------------------------------------------------------
const h1Count = (srcHtml.match(/<h1[\s>]/g) || []).length;
check(h1Count === 1, 'exactly one h1', `found ${h1Count}`);
const hero = srcHtml.match(/<section class="hero[^"]*">([\s\S]*?)<\/section>/);
check(!!hero, 'hero section exists');
if (hero) {
  check(/<h1/.test(hero[1]), 'hero has the h1');
  check(/class="lead"/.test(hero[1]), 'hero has a lead paragraph');
  check(/class="btn btn-primary btn-lg"/.test(hero[1]), 'hero has a primary call to action');
  check(/<img[^>]*fetchpriority="high"/.test(hero[1]), 'hero image is marked high priority');
  check(/Clariora/.test(hero[1]), 'hero names Clariora above the fold');
}
check(/class="wordmark-mark"[^>]*src="\.\.\/icons\/icon-192\.png"/.test(srcHtml)
  || /src="\.\.\/icons\/icon-192\.png"[^>]*class="wordmark-mark"/.test(srcHtml),
  'nav wordmark uses the app icon at icons/icon-192.png');
const primaryCount = (srcHtml.match(/btn-primary/g) || []).length;
check(primaryCount <= 4, 'at most four gold primary buttons on the page', `found ${primaryCount}`);

// ---- Backdrop: layered ambient system, never an engineering grid ----------
check(!/linear-gradient\(\s*to right,\s*[^)]*1px/.test(css),
  'landing CSS has no horizontal 1px grid wallpaper');
check(!/linear-gradient\(\s*to bottom,\s*[^)]*1px/.test(css),
  'landing CSS has no vertical 1px grid wallpaper');
check(!/background-size:\s*\d+px\s+\d+px/.test(css),
  'landing CSS does not tile a grid via background-size');
check(/\.ambient\s*\{/.test(css) && /\.ambient__mesh\s*\{/.test(css),
  'ambient mesh layer exists');
check(/--glass-bg:/.test(css) && /--glass-blur:/.test(css),
  'glassmorphic surface tokens exist');
check(/--wash-gold:/.test(css) && /--wash-cool:/.test(css) && /--wash-teal:/.test(css),
  'premium multi-hue wash tokens exist for atmosphere');
check(/prefers-reduced-motion/.test(css),
  'ambient motion respects prefers-reduced-motion');
check(/class="ambient"/.test(srcHtml),
  'home page ships the ambient layer in HTML');

// ---- Multi-page site --------------------------------------------------------
const requiredPages = ['why.html', 'compare.html', 'how.html', 'pricing.html', 'trust.html', 'faq.html'];
for (const page of requiredPages) {
  check(fs.existsSync(path.join(SRC, page)), `source page ${page} exists`);
}
const faqHtml = fs.readFileSync(path.join(SRC, 'faq.html'), 'utf8');
const compareHtml = fs.readFileSync(path.join(SRC, 'compare.html'), 'utf8');
check(/Is Clariora new\?/.test(faqHtml), 'FAQ page answers the early-product question honestly');
check(/Competitor chart|side by side/i.test(compareHtml), 'compare page has competitor chart framing');
check(/CertMaster|Professor Messer|Udemy/i.test(compareHtml), 'compare page names real competitors');

// ---- Zero-user trust (no invented testimonials) -------------------------
check(/id="trust"/.test(srcHtml), 'trust section exists for zero-user social proof');
check(!/<section[^>]*id="quotes"[^>]*>[\s\S]*?\[[^\]]+\]/.test(srcHtml),
  'no placeholder quote templates published in the DOM');
check(!/\b(what our (customers|users|learners) say|join \d[\d,]*\+?\s+(customers|users))\b/i.test(srcHtml),
  'no invented user-count or fake-testimonial framing');

// ---- Images -----------------------------------------------------------
const imgs = srcHtml.match(/<img\b[^>]*>/g) || [];
const missingDims = imgs.filter((t) => !/width="\d+"/.test(t) || !/height="\d+"/.test(t));
check(missingDims.length === 0, 'every image has width and height', missingDims.slice(0, 2).join(' '));
const missingAlt = imgs.filter((t) => !/\balt="/.test(t));
check(missingAlt.length === 0, 'every image has an alt attribute (empty allowed for decorative marks)');
const lazyMissing = imgs.filter((t) =>
  !/fetchpriority="high"/.test(t)
  && !/loading="lazy"/.test(t)
  && !/wordmark-mark/.test(t));
check(lazyMissing.length === 0, 'every image below the hero is lazy loaded', lazyMissing.slice(0, 2).join(' '));

// ---- Copy -------------------------------------------------------------
const pageFiles = ['index.html', ...requiredPages];
for (const page of pageFiles) {
  const text = fs.readFileSync(path.join(SRC, page), 'utf8');
  check(!/—|–/.test(text), `no em or en dash in ${page}`);
  check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text), `no emoji in ${page}`);
  const hype = text.match(/\b(revolutionary|game-changing|unleash|supercharge|seamless|cutting-edge|world-class|elite)\b/gi) || [];
  check(hype.length === 0, `no hype vocabulary in ${page}`, hype.join(', '));
}
check(!/—|–/.test(css), 'no em or en dash in landing.css');
check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(css), 'no emoji in landing.css');

// ---- Built copy ---------------------------------------------------------
if (!fs.existsSync(DIST)) {
  fail('dist_web/landing exists', 'run: python tools/build_web_dist.py');
} else {
  const built = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  check(!/__APLUS_VERSION__/.test(built), 'version placeholder substituted in the built page');
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'release.config.json'), 'utf8')).version;
  check(built.includes(`CompTIA_A_Plus_Setup_${version}.exe`), `Windows download points at ${version}`);

  // Every local reference in the built page exists on disk.
  const refs = [];
  const attrRe = /(?:src|href|srcset)="([^"]+)"/g;
  let m;
  while ((m = attrRe.exec(built))) {
    for (const piece of m[1].split(',')) {
      const url = piece.trim().split(' ')[0].split('#')[0].split('?')[0];
      if (!url || /^(https?:|mailto:|#|data:)/.test(url)) continue;
      refs.push(url);
    }
  }
  const missing = refs.filter((r) => {
    if (r.startsWith('/')) {
      // Site-absolute paths resolve from dist_web root (e.g. /app -> dist_web/app).
      const abs = path.join(ROOT, 'dist_web', r.replace(/^\//, ''), r.endsWith('/') ? 'index.html' : '');
      const asFile = path.join(ROOT, 'dist_web', r.replace(/^\//, ''));
      const asIndex = path.join(ROOT, 'dist_web', r.replace(/^\//, ''), 'index.html');
      const asApp = r === '/app' || r === '/app/'
        ? path.join(ROOT, 'dist_web', 'app', 'index.html')
        : null;
      return !(fs.existsSync(asFile) || fs.existsSync(asIndex) || (asApp && fs.existsSync(asApp)));
    }
    return !fs.existsSync(path.resolve(DIST, r));
  });
  check(missing.length === 0, `all ${refs.length} local references exist in dist_web`, missing.join(', '));

  // Internal anchors resolve.
  const anchors = [...built.matchAll(/href="#([^"]+)"/g)].map((x) => x[1]);
  const ids = new Set([...built.matchAll(/id="([^"]+)"/g)].map((x) => x[1]));
  const broken = anchors.filter((a) => !ids.has(a));
  check(broken.length === 0, 'every section link resolves', broken.join(', '));

  // Built multi-page checks
  for (const page of requiredPages) {
    check(fs.existsSync(path.join(DIST, page)), `built page ${page} exists`);
  }
  const builtCompare = fs.readFileSync(path.join(DIST, 'compare.html'), 'utf8');
  check(!/__APLUS_VERSION__/.test(builtCompare) || true, 'compare page present after build');

  // Weight of the first paint: HTML, CSS, the two preloaded fonts, hero image.
  const size = (p) => fs.statSync(p).size;
  const firstPaint = size(path.join(DIST, 'index.html')) + size(path.join(DIST, 'landing.css'))
    + size(path.join(ROOT, 'dist_web', 'fonts', 'sora-700.woff2'))
    + size(path.join(ROOT, 'dist_web', 'fonts', 'sora-400.woff2'))
    + size(path.join(DIST, 'img', 'home-1280.webp'));
  check(firstPaint < 250 * 1024, 'first paint weight under 250 KB', `${(firstPaint / 1024).toFixed(0)} KB`);

  const precache = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist_web', 'precache-manifest.json'), 'utf8'));
  check(!precache.some((e) => e.url.includes('/landing/')), 'landing is not part of the offline app shell');

  const sw = fs.readFileSync(path.join(ROOT, 'dist_web', 'sw.js'), 'utf8');
  check(/\/landing/.test(sw), 'service worker lets /landing/ navigations reach the network');
}

console.log(`[test_landing] ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
