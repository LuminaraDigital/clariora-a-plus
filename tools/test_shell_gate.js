/**
 * tools/test_shell_gate.js
 * Proves the first launch only startup intro gate that lives in js/shell-ux.js
 * and in the inline pre-paint script in index.html.
 *
 * Run: node tools/test_shell_gate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SHELL = path.join(ROOT, 'js', 'shell-ux.js');
const INDEX = path.join(ROOT, 'index.html');
const KEY = 'aplus3_boot_intro_seen_v2';

let failures = 0;

function check(name, ok, detail) {
  if (ok) {
    console.log('PASS ' + name);
  } else {
    failures++;
    console.log('FAIL ' + name + (detail ? ' :: ' + detail : ''));
  }
}

function fakeStorage(seed) {
  const map = Object.assign({}, seed || {});
  return {
    map: map,
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
    },
    setItem: function (k, v) {
      map[k] = String(v);
    },
    removeItem: function (k) {
      delete map[k];
    }
  };
}

function fakeClassList() {
  const set = Object.create(null);
  return {
    add: function () {
      Array.prototype.forEach.call(arguments, function (c) {
        set[c] = true;
      });
    },
    remove: function () {
      Array.prototype.forEach.call(arguments, function (c) {
        delete set[c];
      });
    },
    contains: function (c) {
      return !!set[c];
    },
    toggle: function (c, on) {
      if (on) set[c] = true;
      else delete set[c];
      return !!set[c];
    },
    _set: set
  };
}

function fakeElement(id) {
  return {
    id: id,
    hidden: false,
    style: {},
    textContent: '',
    innerHTML: '',
    classList: fakeClassList(),
    children: [],
    parentNode: null,
    type: '',
    setAttribute: function (k, v) {
      this['attr_' + k] = String(v);
    },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(this, 'attr_' + k) ? this['attr_' + k] : null;
    },
    removeAttribute: function (k) {
      delete this['attr_' + k];
    },
    addEventListener: function () {},
    querySelectorAll: function () {
      return [];
    },
    querySelector: function () {
      return null;
    },
    appendChild: function () {},
    focus: function () {}
  };
}

/**
 * Loads js/shell-ux.js in a stub window and returns the recorded boot intro
 * calls once the first launch chain has settled.
 */
function launch(storage, onRun) {
  const calls = [];
  const elements = Object.create(null);
  const htmlClassList = fakeClassList();
  if (storage.getItem(KEY) !== '1') htmlClassList.add('boot-intro-active');

  const listeners = Object.create(null);
  const events = [];

  const document = {
    readyState: 'complete',
    documentElement: {
      classList: htmlClassList,
      getAttribute: function () {
        return 'dark';
      },
      setAttribute: function () {}
    },
    body: {
      classList: fakeClassList(),
      style: {},
      innerText: '',
      querySelectorAll: function () {
        return [];
      }
    },
    getElementById: function (id) {
      if (!elements[id]) elements[id] = fakeElement(id);
      return elements[id];
    },
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
    createElement: function (tag) {
      return fakeElement(tag);
    },
    addEventListener: function (name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    },
    createTreeWalker: null
  };

  const window = {
    document: document,
    localStorage: storage,
    matchMedia: function () {
      return { matches: false };
    },
    setTimeout: function (fn) {
      return 0;
    },
    clearTimeout: function () {},
    setInterval: function () {
      return 0;
    },
    clearInterval: function () {},
    MutationObserver: null,
    NodeFilter: { SHOW_TEXT: 4 },
    APLUS_VERSION: '3.1.0',
    console: console,
    Promise: Promise,
    APlus: {
      bus: {
        emit: function (name, payload) {
          events.push(name);
        },
        on: function () {}
      },
      storage: {
        get: function (k, d) {
          return d;
        },
        set: function () {}
      },
      bootIntro: {
        run: function (opts) {
          calls.push('run');
          if (typeof onRun === 'function') onRun();
          const p = opts && typeof opts.provision === 'function' ? opts.provision() : Promise.resolve();
          /* Mirrors js/boot-intro.js: the seen key is written on intro exit, not before. */
          return Promise.resolve(p).then(function () {
            storage.setItem(KEY, '1');
          });
        },
        hide: function () {
          calls.push('hide');
          htmlClassList.remove('boot-intro-active');
        },
        ensure: function () {
          calls.push('ensure');
        },
        setProgress: function () {}
      }
    }
  };
  window.window = window;
  window.localStorage = storage;

  const sandbox = { window: window, document: document, console: console, localStorage: storage, Promise: Promise };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SHELL, 'utf8'), sandbox, { filename: 'shell-ux.js' });

  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve({
        calls: calls,
        events: events,
        seen: storage.getItem(KEY),
        htmlHasGateClass: htmlClassList.contains('boot-intro-active'),
        introHidden: elements.aplusBootIntro ? elements.aplusBootIntro.hidden : null
      });
    }, 60);
  });
}

(async function () {
  /* 1. First launch: the intro runs and the key is written. */
  const store = fakeStorage({});
  const first = await launch(store);
  check('first launch calls run', first.calls.indexOf('run') !== -1, JSON.stringify(first.calls));
  check('first launch sets the key', first.seen === '1', String(first.seen));
  check('first launch emits shell:ready', first.events.indexOf('shell:ready') !== -1, JSON.stringify(first.events));

  /* 2. Second launch on the same storage: no intro, straight to the app. */
  const second = await launch(store);
  check('second launch calls hide', second.calls.indexOf('hide') !== -1, JSON.stringify(second.calls));
  check('second launch never calls run', second.calls.indexOf('run') === -1, JSON.stringify(second.calls));
  check('second launch emits shell:ready', second.events.indexOf('shell:ready') !== -1, JSON.stringify(second.events));
  check('second launch clears the black stage class', second.htmlHasGateClass === false);
  check('second launch hides the static stage', second.introHidden === true);

  /* 3. The key is written by boot-intro.js when the user exits the intro, never
        before, so a user who closes the app mid intro sees it again next launch. */
  const crashStore = fakeStorage({});
  let keyAtRunTime = null;
  const probe = await launch(crashStore, function () {
    keyAtRunTime = crashStore.getItem(KEY);
  });
  check('key is not set before run() is called', keyAtRunTime !== '1', String(keyAtRunTime));
  check('key is set once the intro has exited', probe.seen === '1', String(probe.seen));
  check('probe launch still emits shell:ready', probe.events.indexOf('shell:ready') !== -1);

  /* 4. The inline pre-paint script in index.html carries the same key check. */
  const html = fs.readFileSync(INDEX, 'utf8');
  const inline = html.match(/<script>[^<]*aplus3_boot_intro_seen_v2[^<]*<\/script>/);
  check('index.html inline script checks the key', !!inline, 'no inline gate script found');
  if (inline) {
    const text = inline[0];
    check('inline script adds boot-intro-active only when unseen', /!==\s*'1'|!==\s*"1"/.test(text) && /boot-intro-active/.test(text), text);
    check('inline script defaults to showing on error', /catch\s*\([^)]*\)\s*\{[^}]*boot-intro-active/.test(text), text);
  }

  /* 5. The stage cannot paint before shell-ux runs. */
  check(
    'index.html hides the stage without the gate class',
    /html:not\(\.boot-intro-active\)\s*#aplusBootIntro\s*\{[^}]*display:\s*none\s*!important/.test(html)
  );

  console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
  process.exit(failures === 0 ? 0 : 1);
})();
