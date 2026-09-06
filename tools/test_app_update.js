/**
 * tools/test_app_update.js
 * Node unit test for js/app-update.js, the desktop update card.
 * Run: node tools/test_app_update.js
 *
 * The module renders into the DOM, so this builds a very small stub DOM rather
 * than pulling in a browser. It checks the phase-to-markup contract, the
 * command wiring, and that the header pill appears only when an update is
 * downloaded and waiting.
 */

'use strict';

var path = require('path');
var assert = require('assert');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

function has(hay, needle, msg) {
  assert.ok(String(hay).indexOf(needle) >= 0, (msg || 'missing') + ': ' + needle);
}

function lacks(hay, needle, msg) {
  assert.ok(String(hay).indexOf(needle) < 0, (msg || 'unexpected') + ': ' + needle);
}

/* ---------------- minimal DOM ---------------- */

function makeEl(tag) {
  return {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    hidden: false,
    innerHTML: '',
    textContent: '',
    type: '',
    title: '',
    childNodes: [],
    parentNode: null,
    attrs: {},
    listeners: {},
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    addEventListener: function (name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); },
    appendChild: function (child) { child.parentNode = this; this.childNodes.push(child); return child; },
    removeChild: function (child) {
      this.childNodes = this.childNodes.filter(function (c) { return c !== child; });
      child.parentNode = null;
      return child;
    },
    insertBefore: function (child, ref) {
      child.parentNode = this;
      var i = this.childNodes.indexOf(ref);
      if (i < 0) this.childNodes.push(child);
      else this.childNodes.splice(i, 0, child);
      return child;
    },
    querySelectorAll: function () { return []; }
  };
}

function makeDom() {
  var about = makeEl('section');
  about.className = 'more-about';
  var versionLine = makeEl('p');
  versionLine.id = 'aboutVersionLine';
  about.appendChild(versionLine);
  var headerWrap = makeEl('div');
  headerWrap.className = 'header-controls-wrap';

  var registry = { aboutVersionLine: versionLine };

  var doc = {
    readyState: 'complete',
    getElementById: function (id) { return registry[id] || null; },
    createElement: function (tag) { return makeEl(tag); },
    querySelector: function (sel) {
      if (sel === '.more-about') return about;
      if (sel === '.header-controls-wrap') return headerWrap;
      return null;
    },
    addEventListener: function () {}
  };
  return { doc: doc, about: about, headerWrap: headerWrap, registry: registry, versionLine: versionLine };
}

/** Load a fresh copy of the module against a stubbed window. */
function loadModule(updatesApi) {
  var dom = makeDom();
  var win = { document: dom.doc };
  if (updatesApi) win.electronAPI = { appVersion: '3.1.1', updates: updatesApi };

  // The mount is created by the module; expose it through getElementById the
  // way a real document would once it is attached.
  var origCreate = dom.doc.createElement;
  dom.doc.createElement = function (tag) {
    var el = origCreate(tag);
    var origSet = Object.getOwnPropertyDescriptor(el, 'id');
    void origSet;
    return el;
  };
  var origAppend = dom.about.appendChild.bind(dom.about);
  dom.about.appendChild = function (child) {
    if (child.id) dom.registry[child.id] = child;
    return origAppend(child);
  };
  var origInsert = dom.about.insertBefore.bind(dom.about);
  dom.about.insertBefore = function (child, ref) {
    if (child.id) dom.registry[child.id] = child;
    return origInsert(child, ref);
  };
  var origHeaderInsert = dom.headerWrap.insertBefore.bind(dom.headerWrap);
  dom.headerWrap.insertBefore = function (child, ref) {
    if (child.id) dom.registry[child.id] = child;
    return origHeaderInsert(child, ref);
  };

  delete require.cache[require.resolve(path.join(__dirname, '..', 'js', 'app-update.js'))];
  var prevWindow = global.window;
  global.window = win;
  try {
    require(path.join(__dirname, '..', 'js', 'app-update.js'));
  } finally {
    if (prevWindow === undefined) delete global.window;
    else global.window = prevWindow;
  }
  return { win: win, dom: dom, mod: win.APlus.appUpdate };
}

function mountHtml(ctx) {
  var mount = ctx.dom.registry.appUpdateMount;
  return mount ? mount.innerHTML : '';
}

console.log('\napp-update card\n');

/* ---------------- phase rendering ---------------- */

test('web edition with no desktop bridge renders nothing', function () {
  var ctx = loadModule(null);
  ctx.mod.render({ phase: 'disabled' });
  var mount = ctx.dom.registry.appUpdateMount;
  assert.ok(!mount || mount.hidden === true, 'card should stay hidden without the desktop bridge');
});

test('idle offers a check button and says the app is current', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  ctx.mod.render({ phase: 'idle', currentVersion: '3.1.1' });
  var html = mountHtml(ctx);
  has(html, 'latest version');
  has(html, 'data-update-action="check"');
  lacks(html, 'data-update-action="install"');
});

test('available shows the version, the notes and a download button', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  ctx.mod.render({ phase: 'available', version: '3.2.0', notes: 'Adds an exam-day mode.' });
  var html = mountHtml(ctx);
  has(html, '3.2.0');
  has(html, 'Adds an exam-day mode.');
  has(html, 'data-update-action="download"');
});

test('downloading draws a progress bar at the reported percentage', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  ctx.mod.render({
    phase: 'downloading', version: '3.2.0', percent: 42,
    transferred: 43 * 1024 * 1024, total: 103 * 1024 * 1024
  });
  var html = mountHtml(ctx);
  has(html, 'width:42%');
  has(html, 'aria-valuenow="42"');
  has(html, '43.0 MB of 103.0 MB');
});

test('ready offers restart and later, and states that progress is saved', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  ctx.mod.render({ phase: 'ready', version: '3.2.0' });
  var html = mountHtml(ctx);
  has(html, 'ready to install');
  has(html, 'data-update-action="install"');
  has(html, 'data-update-action="later"');
  has(html, 'progress is saved');
});

test('error shows the message and a retry button', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  ctx.mod.render({ phase: 'error', error: 'net::ERR_INTERNET_DISCONNECTED' });
  var html = mountHtml(ctx);
  has(html, 'did not finish');
  has(html, 'net::ERR_INTERNET_DISCONNECTED');
  has(html, 'data-update-action="check"');
});

test('markup escapes anything that came from the release feed', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  ctx.mod.render({ phase: 'available', version: '3.2.0', notes: '<img src=x onerror=alert(1)>' });
  var html = mountHtml(ctx);
  lacks(html, '<img src=x', 'release notes must be escaped');
  has(html, '&lt;img');
});

/* ---------------- header pill ---------------- */

test('the header pill appears only when an update is ready', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });

  ctx.mod.render({ phase: 'available', version: '3.2.0' });
  assert.ok(!ctx.dom.registry.appUpdatePill, 'no pill while the update is only available');

  ctx.mod.render({ phase: 'ready', version: '3.2.0' });
  var pill = ctx.dom.registry.appUpdatePill;
  assert.ok(pill, 'pill should exist once the update is downloaded');
  has(pill.innerHTML, 'Update ready');

  ctx.mod.render({ phase: 'idle' });
  assert.ok(!ctx.dom.registry.appUpdatePill || !ctx.dom.registry.appUpdatePill.parentNode,
    'pill should be removed when there is nothing to install');
});

/* ---------------- command wiring ---------------- */

test('check, download and install reach the desktop bridge', function () {
  var calls = [];
  var ctx = loadModule({
    onStatus: function () {},
    getStatus: function () { return Promise.resolve(null); },
    check: function () { calls.push('check'); return Promise.resolve({ phase: 'idle' }); },
    download: function () { calls.push('download'); return Promise.resolve({ ok: true }); },
    installNow: function () { calls.push('install'); return Promise.resolve({ ok: true }); }
  });
  ctx.mod.check();
  ctx.mod.download();
  ctx.mod.install();
  assert.deepStrictEqual(calls, ['check', 'download', 'install']);
});

test('a missing bridge method is survivable rather than throwing', function () {
  var ctx = loadModule({ onStatus: function () {}, getStatus: function () { return Promise.resolve(null); } });
  assert.doesNotThrow(function () { ctx.mod.check(); ctx.mod.download(); ctx.mod.install(); });
});

test('the About version line follows the running build', function () {
  // init() subscribes during require, so the callback is captured here rather
  // than off the context object, which does not exist yet at that point.
  var pushStatus = null;
  var ctx = loadModule({
    onStatus: function (cb) { pushStatus = cb; },
    getStatus: function () { return Promise.resolve(null); }
  });
  assert.strictEqual(typeof pushStatus, 'function', 'module should subscribe to status');
  ctx.mod.render({ phase: 'idle', currentVersion: '9.9.9' });
  assert.strictEqual(ctx.dom.versionLine.textContent, '', 'render alone does not touch the version line');
  pushStatus({ phase: 'idle', currentVersion: '9.9.9' });
  assert.strictEqual(ctx.dom.versionLine.textContent, 'Version 9.9.9');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
