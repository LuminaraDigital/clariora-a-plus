/**
 * tools/test_pbq_interactive_scoring.js
 * Comprehensive verification of PBQ Labs 4-7:
 * - Scoring & Specific Diagnostic Feedback for sohoRouter, cablePinout, motherboardAssembly, windowsConsole
 * - Interactive action toolbar (Reset, Verify & Submit, #pbqEvalResult)
 * - Sound triggering & CompTIALedgerUI.onPbqComplete APX rewards
 *
 * Run: node tools/test_pbq_interactive_scoring.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(() => {
        passed++;
        console.log('  ✔ ' + name);
      }).catch((err) => {
        failed++;
        console.error('  ✖ ' + name);
        console.error('    ' + (err && err.stack ? err.stack : err));
      });
    } else {
      passed++;
      console.log('  ✔ ' + name);
    }
  } catch (err) {
    failed++;
    console.error('  ✖ ' + name);
    console.error('    ' + (err && err.stack ? err.stack : err));
  }
}

function parseHTMLInto(parent, html) {
  parent.children = [];
  parent.childNodes = [];
  const stack = [parent];
  const tagRe = /<\/?([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    const isClosing = match[0].startsWith('</');
    const isSelfClosing = match[0].endsWith('/>') || ['input', 'br', 'hr', 'img'].includes(match[1].toLowerCase());
    const tagName = match[1];
    const attrStr = match[2];
    if (isClosing) {
      if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
        stack.pop();
      }
    } else {
      const el = makeMockElement(tagName);
      const attrRe = /([a-zA-Z0-9_\-]+)=["']([^"']*)["']/g;
      let a;
      while ((a = attrRe.exec(attrStr)) !== null) {
        if (a[1] === 'id') el.id = a[2];
        else if (a[1] === 'class') el.className = a[2];
        else el.setAttribute(a[1], a[2]);
      }
      stack[stack.length - 1].appendChild(el);
      if (!isSelfClosing) stack.push(el);
    }
  }
}

// Minimal DOM Element Mock for Headless Simulation
function makeMockElement(tag, id = '', className = '') {
  let _html = '';
  const el = {
    tagName: (tag || 'DIV').toUpperCase(),
    id,
    className,
    style: {},
    children: [],
    childNodes: [],
    attributes: {},
    parentNode: null,
    onclick: null,
    onchange: null,
    oninput: null,
    onkeydown: null,
    value: '',
    checked: false,
    setAttribute(k, v) { el.attributes[k] = String(v); },
    getAttribute(k) { return el.attributes[k] !== undefined ? el.attributes[k] : null; },
    appendChild(child) {
      child.parentNode = el;
      el.children.push(child);
      el.childNodes.push(child);
      return child;
    },
    insertBefore(newChild, refChild) {
      newChild.parentNode = el;
      const idx = el.children.indexOf(refChild);
      if (idx >= 0) {
        el.children.splice(idx, 0, newChild);
        el.childNodes.splice(idx, 0, newChild);
      } else {
        el.appendChild(newChild);
      }
      return newChild;
    },
    get innerHTML() {
      return _html;
    },
    set innerHTML(val) {
      _html = String(val || '');
      parseHTMLInto(el, _html);
    },
    get textContent() {
      return _html.replace(/<[^>]*>/g, '');
    },
    set textContent(val) {
      _html = String(val || '');
      el.children = [];
      el.childNodes = [];
    },
    querySelector(selector) {
      return findSelector(el, selector);
    },
    querySelectorAll(selector) {
      const results = [];
      findAllSelectors(el, selector, results);
      return results;
    }
  };
  return el;
}

function matchesSelector(el, sel) {
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  if (sel.startsWith('.')) return el.className && el.className.split(' ').includes(sel.slice(1));
  if (sel.includes('[')) {
    const m = sel.match(/^([a-zA-Z0-9_\-\.]*)\[([a-zA-Z0-9_\-]+)="?([^"\]]*)"?\]$/);
    if (m) {
      const [, tag, attr, val] = m;
      if (tag && tag.startsWith('.') && (!el.className || !el.className.split(' ').includes(tag.slice(1)))) return false;
      return el.getAttribute(attr) === val;
    }
  }
  return el.tagName && el.tagName.toLowerCase() === sel.toLowerCase();
}

function findSelector(root, sel) {
  for (const child of root.children) {
    if (matchesSelector(child, sel)) return child;
    const found = findSelector(child, sel);
    if (found) return found;
  }
  return null;
}

function findAllSelectors(root, sel, list) {
  for (const child of root.children) {
    if (matchesSelector(child, sel)) list.push(child);
    findAllSelectors(child, sel, list);
  }
}

// Load pbq-engine.js in a mock browser context
function loadPBQContext() {
  const soundCalls = { success: 0, click: 0 };
  const ledgerCalls = [];

  const mockDocument = {
    createElement: (tag) => makeMockElement(tag),
    getElementById: () => null
  };

  const windowObj = {
    APlus: {
      utils: { escapeHTML: (s) => String(s || '') },
      sound: {
        playSuccess: () => { soundCalls.success++; },
        playClick: () => { soundCalls.click++; }
      },
      bus: {
        events: [],
        emit(name, payload) { this.events.push({ name, payload }); }
      }
    },
    CompTIALedgerUI: {
      onPbqComplete: (labTitle) => {
        ledgerCalls.push(labTitle);
      }
    },
    document: mockDocument
  };

  const code = fs.readFileSync(path.join(ROOT, 'js', 'pbq-engine.js'), 'utf8');
  vm.runInNewContext(code, {
    window: windowObj,
    document: mockDocument,
    console
  });

  return { pbqEngine: windowObj.APlus.pbqEngine, window: windowObj, soundCalls, ledgerCalls };
}

async function runAll() {
  console.log('================================================================');
  console.log('PBQ INTERACTIVE SIMULATION & APX SCORING VERIFICATION SUITE');
  console.log('================================================================\n');

  const { pbqEngine, window: win, soundCalls, ledgerCalls } = loadPBQContext();

  // 1. Verify Catalog and Scoring Functions
  console.log('1. Verifying PBQEngine.score & getDiagnostics for Labs 4-7...');

  test('PBQEngine.catalog contains all four advanced labs', () => {
    assert.ok(pbqEngine.catalog.sohoRouter, 'sohoRouter must exist');
    assert.ok(pbqEngine.catalog.cablePinout, 'cablePinout must exist');
    assert.ok(pbqEngine.catalog.motherboardAssembly, 'motherboardAssembly must exist');
    assert.ok(pbqEngine.catalog.windowsConsole, 'windowsConsole must exist');
  });

  test('Lab 4 (sohoRouter): default state fails score and provides diagnostics', () => {
    const lab = pbqEngine.getLab('sohoRouter');
    const state = JSON.parse(JSON.stringify(lab.defaultState));
    assert.strictEqual(pbqEngine.score({ pbqType: 'sohoRouter' }, state), false);

    const diags = pbqEngine.getDiagnostics('sohoRouter', state);
    assert.ok(diags.length >= 3, 'Multiple diagnostics should be returned for default state');
    assert.ok(diags.some(d => d.includes('Wireless SSID')), 'Diagnoses missing SSID');
    assert.ok(diags.some(d => d.includes('Security mode')), 'Diagnoses non-WPA3 mode');
  });

  test('Lab 4 (sohoRouter): fully correct state passes score with 0 diagnostics', () => {
    const correctState = {
      ssid: 'Corp-Secure',
      securityMode: 'WPA3-Personal',
      encryption: 'AES',
      channelWidth: '80 MHz',
      startingIp: '192.168.1.100',
      forwardPort: '443',
      forwardIp: '192.168.1.50',
      forwardProtocol: 'TCP',
      forwardEnabled: true
    };
    assert.strictEqual(pbqEngine.score({ pbqType: 'sohoRouter' }, correctState), true);
    assert.strictEqual(pbqEngine.getDiagnostics('sohoRouter', correctState).length, 0);
  });

  test('Lab 5 (cablePinout): empty state fails score and reports all 8 pins', () => {
    const lab = pbqEngine.getLab('cablePinout');
    const state = JSON.parse(JSON.stringify(lab.defaultState));
    assert.strictEqual(pbqEngine.score({ pbqType: 'cablePinout' }, state), false);

    const diags = pbqEngine.getDiagnostics('cablePinout', state);
    assert.strictEqual(diags.length, 8, 'All 8 unassigned pins reported');
  });

  test('Lab 5 (cablePinout): T568A wiring warns user of standard mismatch', () => {
    const t568a = ['WG', 'G', 'WO', 'BL', 'WBL', 'O', 'WBR', 'BR'];
    const diags = pbqEngine.getDiagnostics('cablePinout', { sequence: t568a });
    assert.ok(diags.some(d => d.includes('T568A')), 'Detects T568A vs T568B sequence');
  });

  test('Lab 5 (cablePinout): exact T568B sequence passes score', () => {
    const t568b = ['WO', 'O', 'WG', 'BL', 'WBL', 'G', 'WBR', 'BR'];
    assert.strictEqual(pbqEngine.score({ pbqType: 'cablePinout' }, { sequence: t568b }), true);
    assert.strictEqual(pbqEngine.getDiagnostics('cablePinout', { sequence: t568b }).length, 0);
  });

  test('Lab 6 (motherboardAssembly): empty slots fail score and report unpopulated sockets', () => {
    const lab = pbqEngine.getLab('motherboardAssembly');
    const state = JSON.parse(JSON.stringify(lab.defaultState));
    assert.strictEqual(pbqEngine.score({ pbqType: 'motherboardAssembly' }, state), false);

    const diags = pbqEngine.getDiagnostics('motherboardAssembly', state);
    assert.strictEqual(diags.length, 5, 'All 5 empty slots reported');
  });

  test('Lab 6 (motherboardAssembly): correct component assignment passes score', () => {
    const sol = pbqEngine.getLab('motherboardAssembly').solution;
    assert.strictEqual(pbqEngine.score({ pbqType: 'motherboardAssembly' }, { slots: sol }), true);
    assert.strictEqual(pbqEngine.getDiagnostics('motherboardAssembly', { slots: sol }).length, 0);
  });

  test('Lab 7 (windowsConsole): uninitialized disk fails and reports GPT requirement', () => {
    const lab = pbqEngine.getLab('windowsConsole');
    const state = JSON.parse(JSON.stringify(lab.defaultState));
    assert.strictEqual(pbqEngine.score({ pbqType: 'windowsConsole' }, state), false);

    const diags = pbqEngine.getDiagnostics('windowsConsole', state);
    assert.ok(diags.some(d => d.includes('Not Initialized')), 'Requires GPT initialization');
  });

  test('Lab 7 (windowsConsole): formatted NTFS D: volume passes score', () => {
    const sol = pbqEngine.getLab('windowsConsole').solution;
    assert.strictEqual(pbqEngine.score({ pbqType: 'windowsConsole' }, sol), true);
    assert.strictEqual(pbqEngine.getDiagnostics('windowsConsole', sol).length, 0);
  });

  // 2. Action Toolbar and Verification Behavior in Render Methods
  console.log('\n2. Verifying Action Toolbar & Interactive Verification Workflow...');

  test('renderActionToolbar appends Verify, Reset, and #pbqEvalResult', () => {
    const container = makeMockElement('div');
    const state = { ...pbqEngine.getLab('sohoRouter').defaultState };
    pbqEngine.renderActionToolbar(container, 'sohoRouter', state, {}, () => {});

    const verifyBtn = container.querySelector('.pbq-verify-btn');
    const resetBtn = container.querySelector('.pbq-reset-btn');
    const evalBox = container.querySelector('#pbqEvalResult');

    assert.ok(verifyBtn, 'Verify button must be present');
    assert.ok(resetBtn, 'Reset button must be present');
    assert.ok(evalBox, '#pbqEvalResult container must be present');
  });

  test('Clicking Verify on incomplete state shows error banner and plays click sound', () => {
    const container = makeMockElement('div');
    const state = { ...pbqEngine.getLab('cablePinout').defaultState };
    const soundInitSuccess = soundCalls.success;
    pbqEngine.renderActionToolbar(container, 'cablePinout', state, {}, () => {});

    const verifyBtn = container.querySelector('.pbq-verify-btn');
    const evalBox = container.querySelector('#pbqEvalResult');

    verifyBtn.onclick();
    assert.ok(evalBox.innerHTML.includes('CONFIGURATION INCOMPLETE OR INCORRECT'), 'Error banner rendered');
    assert.ok(evalBox.innerHTML.includes('Pin 1 is unassigned'), 'Diagnostics rendered in feedback banner');
    assert.strictEqual(soundCalls.success, soundInitSuccess, 'Success sound must NOT play on failure');
  });

  test('Clicking Verify on completed state triggers success banner, success sound, and ledger award', () => {
    const container = makeMockElement('div');
    const lab = pbqEngine.getLab('motherboardAssembly');
    const state = { slots: { ...lab.solution } };

    ledgerCalls.length = 0;
    const initialSuccessSounds = soundCalls.success;

    pbqEngine.renderActionToolbar(container, 'motherboardAssembly', state, {}, () => {});
    const verifyBtn = container.querySelector('.pbq-verify-btn');
    const evalBox = container.querySelector('#pbqEvalResult');

    verifyBtn.onclick();
    assert.ok(evalBox.innerHTML.includes('CONFIGURATION VERIFIED'), 'Success banner rendered');
    assert.ok(evalBox.innerHTML.includes('+18 APX'), 'APX award stated in banner');
    assert.strictEqual(soundCalls.success, initialSuccessSounds + 1, 'playSuccess() invoked');
    assert.strictEqual(ledgerCalls.length, 1, 'CompTIALedgerUI.onPbqComplete called once');
    assert.strictEqual(ledgerCalls[0], lab.title, 'Exact lab title passed to ledger');
  });

  test('Reset Lab button executes resetFn and clears feedback banner', () => {
    const container = makeMockElement('div');
    const state = { ...pbqEngine.getLab('sohoRouter').defaultState };
    let resetRan = false;

    pbqEngine.renderActionToolbar(container, 'sohoRouter', state, {}, () => {
      resetRan = true;
    });

    const verifyBtn = container.querySelector('.pbq-verify-btn');
    const resetBtn = container.querySelector('.pbq-reset-btn');
    const evalBox = container.querySelector('#pbqEvalResult');

    verifyBtn.onclick();
    assert.ok(evalBox.innerHTML.length > 0, 'Feedback banner populated before reset');

    resetBtn.onclick();
    assert.strictEqual(evalBox.innerHTML, '', 'Feedback banner cleared on reset');
    assert.strictEqual(resetRan, true, 'resetFn executed');
  });

  // 3. Testing Real Ledger Award Integration
  console.log('\n3. Testing End-to-End Ledger APX Award for PBQ Labs...');

  await (async () => {
    const store = {};
    const localStorageMock = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    const ledgerWindow = {
      localStorage: localStorageMock,
      crypto: webcrypto,
      btoa: (s) => (typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')),
      atob: (s) => (typeof atob !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('binary'))
    };

    const ledgerCode = fs.readFileSync(path.join(ROOT, 'ledger_engine.js'), 'utf8');
    vm.runInNewContext(ledgerCode, {
      window: ledgerWindow,
      localStorage: localStorageMock,
      crypto: webcrypto,
      TextEncoder,
      TextDecoder,
      btoa: ledgerWindow.btoa,
      atob: ledgerWindow.atob,
      Date,
      console
    });

    const ledger = ledgerWindow.CompTIALedger;
    assert.ok(ledger && typeof ledger.recordPbqComplete === 'function', 'CompTIALedger.recordPbqComplete available');

    await test('CompTIALedger.recordPbqComplete awards APX and appends block to blockchain', async () => {
      const labTitle = pbqEngine.getLab('sohoRouter').title;
      const res = await ledger.recordPbqComplete(labTitle);
      assert.strictEqual(res.skipped, false, 'PBQ record is not skipped on first completion');
      assert.ok(res.block, 'Block appended to ledger');
      assert.strictEqual(res.block.type, 'PBQ_COMPLETE', 'Block type is PBQ_COMPLETE');
      assert.strictEqual(res.block.tokenDelta, 18, 'Awards APX for completing PBQ');
      assert.strictEqual(res.block.xpDelta, 25, 'Awards XP for completing PBQ');
      assert.strictEqual(res.block.payload.labName, labTitle);
    });

    await test('Completing duplicate PBQ on same day is skipped gracefully', async () => {
      const labTitle = pbqEngine.getLab('sohoRouter').title;
      const dup = await ledger.recordPbqComplete(labTitle);
      assert.strictEqual(dup.skipped, true, 'Duplicate completion skipped');
    });

    await test('Completing different lab (Lab 5 Cable Pinout) awards APX', async () => {
      const labTitle = pbqEngine.getLab('cablePinout').title;
      const res = await ledger.recordPbqComplete(labTitle);
      assert.strictEqual(res.skipped, false);
      assert.strictEqual(res.block.type, 'PBQ_COMPLETE');
      assert.strictEqual(res.block.tokenDelta, 18);
    });
  })();

  console.log('\n================================================================');
  console.log(`PBQ Verification Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
