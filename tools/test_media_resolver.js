/**
 * test_media_resolver.js - Node tests for the media resolver.
 *
 * Run: node tools/test_media_resolver.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RESOLVER = path.join(ROOT, 'js', 'media-resolver.js');
const CONFIG = path.join(ROOT, 'js', 'media-config.js');

let passed = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) {
    passed++;
    console.log('  pass  ' + name);
  } else {
    failures.push(name + (extra ? ' -> ' + extra : ''));
    console.log('  FAIL  ' + name + (extra ? ' -> ' + extra : ''));
  }
}

function eq(name, actual, expected) {
  ok(name, actual === expected, 'got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected));
}

// The resolver attaches to globalThis when there is no window.
const media = require(RESOLVER);

// -------------------------------------------------------------- resolveOrder

console.log('resolveOrder');

const REL = 'media/videos/pd_bios_uefi.mp4';

eq(
  'local pack wins over everything',
  media.resolveOrder(REL, {
    localUrl: 'file:///C:/pack/pd_bios_uefi.mp4',
    bundled: true,
    remoteBase: 'https://example.invalid/media/'
  }).source,
  'local'
);

eq(
  'bundled comes second',
  media.resolveOrder('media/slides/deck.pptx', {
    localUrl: null,
    bundled: true,
    remoteBase: 'https://example.invalid/media/'
  }).source,
  'bundled'
);

eq(
  'bundled url is the encoded relative path',
  media.resolveOrder('media/slides/Module 1 Intro.pptx', {
    localUrl: null,
    bundled: true,
    remoteBase: 'https://example.invalid/media/'
  }).url,
  'media/slides/Module%201%20Intro.pptx'
);

const remote = media.resolveOrder(REL, {
  localUrl: null,
  bundled: false,
  remoteBase: 'https://example.invalid/media/'
});
eq('remote comes third', remote.source, 'remote');
eq('remote url joins base and rel', remote.url, 'https://example.invalid/media/videos/pd_bios_uefi.mp4');
eq(
  'a shared media segment is not repeated',
  remote.url.indexOf('/media/media/'),
  -1
);

const missingSlash = media.resolveOrder(REL, {
  localUrl: null,
  bundled: false,
  remoteBase: 'https://example.invalid/media'
});
eq('a missing trailing slash on the base is added', missingSlash.url, 'https://example.invalid/media/videos/pd_bios_uefi.mp4');

const plainBase = media.resolveOrder(REL, {
  localUrl: null,
  bundled: false,
  remoteBase: 'https://example.invalid/cdn/'
});
eq('an unrelated base keeps the whole relative path', plainBase.url, 'https://example.invalid/cdn/media/videos/pd_bios_uefi.mp4');

const none = media.resolveOrder(REL, { localUrl: null, bundled: false, remoteBase: '' });
eq('nothing anywhere gives source none', none.source, 'none');
eq('nothing anywhere gives a null url', none.url, null);

// ------------------------------------------------------------------ encoding

console.log('URL encoding');

eq(
  'spaces become %20 and plus becomes %2B',
  media.encodePath('Videos For A+/pd_bios_uefi.mp4'),
  'Videos%20For%20A%2B/pd_bios_uefi.mp4'
);

eq('slashes are kept as separators', media.encodePath('a/b/c.mp4'), 'a/b/c.mp4');

eq(
  'ampersands and hashes are escaped',
  media.encodePath('Labs for A+/Lab 03 & 04 #2.docx'),
  'Labs%20for%20A%2B/Lab%2003%20%26%2004%20%232.docx'
);

eq(
  'decodePath round trips',
  media.decodePath(media.encodePath('Videos For A+/pd_bios_uefi.mp4')),
  'Videos For A+/pd_bios_uefi.mp4'
);

eq(
  'remote url for a plus sign path',
  media.resolveOrder('Videos For A+/pd_bios_uefi.mp4', {
    localUrl: null,
    bundled: false,
    remoteBase: 'https://example.invalid/media/'
  }).url,
  'https://example.invalid/media/Videos%20For%20A%2B/pd_bios_uefi.mp4'
);

// ------------------------------------------------------------- kind sorting

console.log('kind sorting');

ok('videos are not treated as bundled', media.isBundledKind('media/videos/x.mp4') === false);
ok('slides are treated as bundled', media.isBundledKind('media/slides/x.pptx') === true);
ok('labs are treated as bundled', media.isBundledKind('media/labs/Lab 01 Install OS.docx') === true);
ok('mp4 anywhere counts as video', media.isVideoPath('some/where/clip.mp4') === true);

// ------------------------------------------------------------- fake DOM test

console.log('node rewriting on a fake DOM');

function makeDoc() {
  const doc = {
    createElement(tag) {
      return makeEl(tag, doc);
    },
    getElementById() {
      return null;
    }
  };
  return doc;
}

function makeEl(tag, doc) {
  const el = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    ownerDocument: doc,
    parentNode: null,
    children: [],
    style: { cssText: '' },
    className: '',
    attrs: Object.create(null),
    getAttribute(n) {
      return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
    },
    setAttribute(n, v) {
      this.attrs[n] = String(v);
    },
    removeAttribute(n) {
      delete this.attrs[n];
    },
    hasAttribute(n) {
      return Object.prototype.hasOwnProperty.call(this.attrs, n);
    },
    appendChild(c) {
      c.parentNode = this;
      this.children.push(c);
      return c;
    },
    insertBefore(c) {
      c.parentNode = this;
      this.children.push(c);
      return c;
    },
    querySelector() {
      return null;
    },
    querySelectorAll(sel) {
      const want = String(sel).split(',').map((s) => s.trim());
      const out = [];
      const walk = (n) => {
        n.children.forEach((c) => {
          const t = c.tagName.toLowerCase();
          if (want.indexOf(t) >= 0) out.push(c);
          if (want.indexOf('a[download]') >= 0 && t === 'a' && c.hasAttribute('download')) out.push(c);
          walk(c);
        });
      };
      walk(this);
      return out;
    },
    load() {}
  };
  return el;
}

global.APLUS_MEDIA_CONFIG = {
  remoteBase: 'https://example.invalid/media/',
  packName: 'CompTIA_A_Plus_Course_Videos_v1.zip',
  packSizeLabel: '2.4 GB',
  streamByDefault: true
};
media._resetCaches();

const doc = makeDoc();
const viewer = makeEl('div', doc);
const video = makeEl('video', doc);
video.setAttribute('src', 'media/videos/pd_bios_uefi.mp4');
video.setAttribute('poster', 'media/videos/pd_bios_uefi.jpg');
viewer.appendChild(video);

const link = makeEl('a', doc);
link.setAttribute('download', '');
link.setAttribute('href', 'media/slides/Module%201%20Intro.pptx');
viewer.appendChild(link);

media.rewriteTree(viewer);

eq(
  'video src is rewritten to the remote base',
  video.getAttribute('src'),
  'https://example.invalid/media/videos/pd_bios_uefi.mp4'
);
eq(
  'video poster is rewritten too',
  video.getAttribute('poster'),
  'https://example.invalid/media/videos/pd_bios_uefi.jpg'
);
eq('the node is marked as handled', video.getAttribute('data-media-resolved'), '1');
eq('the original relative path is remembered', video.getAttribute('data-media-rel'), 'media/videos/pd_bios_uefi.mp4');

const afterFirst = video.getAttribute('src');
media.rewriteTree(viewer);
media.rewriteTree(viewer);
eq('rewriting again changes nothing', video.getAttribute('src'), afterFirst);
ok('the url was not double encoded', afterFirst.indexOf('%25') < 0);

// A download link with no local pack and no bundled hit falls through to remote
// after its HEAD check. fetch is missing in this stub, so it resolves remote.
ok(
  'download link carries a marker',
  link.getAttribute('data-media-resolved') === '1',
  link.getAttribute('data-media-resolved')
);

// ---------------------------------------------- unavailable state, no remote

console.log('unavailable state');

global.APLUS_MEDIA_CONFIG.remoteBase = '';
media._resetCaches();

const viewer2 = makeEl('div', doc);
const video2 = makeEl('video', doc);
video2.setAttribute('src', 'media/videos/pd_bios_uefi.mp4');
viewer2.appendChild(video2);
media.rewriteTree(viewer2);

eq('with no remote base the src is dropped', video2.getAttribute('src'), null);
const note = viewer2.children.filter((c) => c.className === 'media-unavailable')[0];
ok('an explanation is shown instead', !!note);
eq(
  'the explanation uses the agreed wording',
  note && note.textContent,
  'This video is not available offline. Connect to the internet or download the course pack.'
);

// ------------------------------------------------------------- source hygiene

console.log('source hygiene');

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

[RESOLVER, CONFIG, __filename].forEach((f) => {
  const src = fs.readFileSync(f, 'utf8');
  const name = path.basename(f);
  ok('no em dash in ' + name, src.indexOf(EM_DASH) < 0);
  ok('no en dash in ' + name, src.indexOf(EN_DASH) < 0);
  ok('no emoji in ' + name, !EMOJI.test(src));
});

// ------------------------------------------------------------------- summary

console.log('');
if (failures.length) {
  console.log('FAILED ' + failures.length + ' of ' + (passed + failures.length));
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('OK ' + passed + ' assertions passed');
