#!/usr/bin/env node
/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * tools/test_entitlements.js - Self-check for the entitlements module.
 * File: tools/test_entitlements.js
 *
 * Run:  node tools/test_entitlements.js
 *
 * Loads js/entitlements.js against a fake window (no DOM, no browser), generates a
 * throwaway ECDSA P-256 key pair with node:crypto webcrypto, issues a key with the
 * real tools/issue_license.js logic, and checks activation, tampering, daily usage
 * math across the local midnight boundary, feature gates and the internal kill switch.
 *
 * Touches nothing on disk: no private key is written and js/entitlements-config.js
 * is never read or modified.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

const webcrypto = nodeCrypto.webcrypto || globalThis.crypto;
const issuer = require('./issue_license.js');

const ROOT = path.resolve(__dirname, '..');
const ENTITLEMENTS_SRC = fs.readFileSync(path.join(ROOT, 'js', 'entitlements.js'), 'utf8');

/* ------------------------------------------------------------------------- */
/* Tiny assertion harness                                                      */
/* ------------------------------------------------------------------------- */

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    process.stdout.write('  ok   ' + name + '\n');
  } else {
    failures.push(name + (detail ? ' :: ' + detail : ''));
    process.stdout.write('  FAIL ' + name + (detail ? ' :: ' + detail : '') + '\n');
  }
}

function section(title) {
  process.stdout.write('\n' + title + '\n');
}

/* ------------------------------------------------------------------------- */
/* Fake window                                                                 */
/* ------------------------------------------------------------------------- */

function makeStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
    _map: map
  };
}

function makeBus() {
  const listeners = new Map();
  return {
    on(evt, cb) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(cb);
    },
    emit(evt, payload) {
      (listeners.get(evt) || []).forEach(cb => { try { cb(payload); } catch (_) {} });
    }
  };
}

function loadEntitlements(configOverrides) {
  const storage = makeStorage();
  const bus = makeBus();
  const win = {
    localStorage: storage,
    crypto: webcrypto,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    setTimeout: () => 0,
    clearTimeout: () => {},
    addEventListener: () => {},
    open: () => {},
    APLUS_ENTITLEMENTS_CONFIG: Object.assign({
      enabled: true,
      freeQuestionsPerDay: 20,
      freeCardsPerDay: 20,
      freeLabsPerDay: 1,
      diagnostic: { type: 'both', count: 20 },
      fullMockThreshold: 90,
      minTrimmedSession: 5,
      priceLabel: '39 USD',
      buyUrl: 'https://example.invalid/aplus',
      revoked: [],
      publicKeyJwk: null
    }, configOverrides || {}),
    APlus: { bus: bus }
  };
  win.window = win;

  // Same realm as the host so WebCrypto accepts our typed arrays.
  const factory = new Function('window', 'console', ENTITLEMENTS_SRC);
  factory(win, console);

  return { win, storage, bus, ent: win.APlus.entitlements };
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* ------------------------------------------------------------------------- */

async function makeKeyPair() {
  const pair = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const priv = pair.privateKey.export({ format: 'jwk' });
  const pub = pair.publicKey.export({ format: 'jwk' });
  return {
    privateJwk: { kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y, d: priv.d },
    publicJwk: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y }
  };
}

function tamper(key) {
  // Flip one base32 character inside the payload segment.
  const body = key.slice('APLUS-'.length);
  const dash = body.lastIndexOf('-');
  const payload = body.slice(0, dash);
  const sig = body.slice(dash + 1);
  const pos = Math.floor(payload.length / 2);
  const ch = payload.charAt(pos);
  const next = ch === 'A' ? 'B' : 'A';
  return 'APLUS-' + payload.slice(0, pos) + next + payload.slice(pos + 1) + '-' + sig;
}

function dayShift(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/* ------------------------------------------------------------------------- */
/* Tests                                                                       */
/* ------------------------------------------------------------------------- */

async function run() {
  process.stdout.write('Entitlements self-check\n=======================\n');

  const keys = await makeKeyPair();
  const issued = await issuer.issueLicense({ email: 'Buyer@Example.COM', privateJwk: keys.privateJwk });

  section('License format');
  check('key starts with APLUS-', issued.key.indexOf('APLUS-') === 0, issued.key.slice(0, 12));
  check('key has exactly two segments after the prefix',
    issued.key.slice(6).split('-').length === 2, issued.key);
  check('key body is base32 only', /^APLUS-[A-Z2-7]+-[A-Z2-7]+$/.test(issued.key));
  check('payload v is 1', issued.payload.v === 1);
  check('payload sku is aplus_pro', issued.payload.sku === 'aplus_pro');
  check('email hash is 8 lowercase hex', /^[0-9a-f]{8}$/.test(issued.payload.email_hash), issued.payload.email_hash);
  check('email hash is case insensitive',
    issuer.emailHash('buyer@example.com') === issuer.emailHash('  BUYER@EXAMPLE.COM '));
  check('anonymous keys hash to anon', issuer.emailHash('') === 'anon');
  check('issued date is YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(issued.payload.issued));
  check('seats defaults to 1', issued.payload.seats === 1);

  section('Activation with a genuine key');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    check('starts as free', env.ent.isPro() === false);
    const res = await env.ent.activate(issued.key);
    check('activate returns ok', res.ok === true, JSON.stringify(res));
    check('isPro is true after activation', env.ent.isPro() === true);
    check('license persisted under aplus3_license',
      env.storage._map.has('aplus3_license'), Array.from(env.storage._map.keys()).join(','));
    const rec = JSON.parse(env.storage._map.get('aplus3_license'));
    check('stored record keeps key, verifiedAt and payload',
      !!rec.key && !!rec.verifiedAt && !!rec.payload && rec.payload.sku === 'aplus_pro');
    check('pro remaining is unlimited', env.ent.remainingToday('questions') === Infinity);
    check('deactivate drops back to free', (env.ent.deactivate(), env.ent.isPro() === false));
    check('license removed from storage', !env.storage._map.has('aplus3_license'));
  }

  section('Rejection paths');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    const bad = await env.ent.activate(tamper(issued.key));
    check('tampered key is rejected', bad.ok === false, JSON.stringify(bad));
    check('tampered key leaves the app free', env.ent.isPro() === false);
    check('tampered key writes no license', !env.storage._map.has('aplus3_license'));

    const nonsense = await env.ent.activate('not-a-key');
    check('malformed key is rejected', nonsense.ok === false);
    check('malformed key has an explanation', typeof nonsense.error === 'string' && nonsense.error.length > 0);

    const wrongPair = await makeKeyPair();
    const env2 = loadEntitlements({ publicKeyJwk: wrongPair.publicJwk });
    const wrong = await env2.ent.activate(issued.key);
    check('key signed by another private key is rejected', wrong.ok === false);
    check('foreign key leaves the app free', env2.ent.isPro() === false);

    const env3 = loadEntitlements({ publicKeyJwk: null });
    const placeholder = await env3.ent.activate(issued.key);
    check('missing public key never unlocks', placeholder.ok === false && env3.ent.isPro() === false);

    const env4 = loadEntitlements({ publicKeyJwk: keys.publicJwk, revoked: [issued.payload.email_hash] });
    const revoked = await env4.ent.activate(issued.key);
    check('revoked email hash is rejected offline', revoked.ok === false && env4.ent.isPro() === false);

    const env5 = loadEntitlements({ publicKeyJwk: keys.publicJwk, revoked: [issued.key] });
    const revokedKey = await env5.ent.activate(issued.key);
    check('revoked full key is rejected offline', revokedKey.ok === false && env5.ent.isPro() === false);
  }

  section('Feature gates on the free tier');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    check('free full_mock is blocked', env.ent.can('full_mock').ok === false);
    check('free full_mock reason is pro_only', env.ent.can('full_mock').reason === 'pro_only');
    check('free coach is blocked', env.ent.can('coach').ok === false);
    check('free questions allowed', env.ent.can('questions', { count: 1 }).ok === true);
    check('free diagnostic allowed once', env.ent.can('diagnostic').ok === true);
    check('free flashcards allowed', env.ent.can('flashcards', { count: 1 }).ok === true);
    check('free labs allowed', env.ent.can('labs').ok === true);
    check('free 20 question block fits the budget', env.ent.can('questions', { count: 20 }).ok === true);
    check('free 21 question block does not', env.ent.can('questions', { count: 21 }).ok === false);

    await env.ent.activate(issued.key);
    check('pro full_mock allowed', env.ent.can('full_mock').ok === true);
    check('pro full_mock reason is pro', env.ent.can('full_mock').reason === 'pro');
    check('pro coach allowed', env.ent.can('coach').ok === true);
    check('pro 900 questions allowed', env.ent.can('questions', { count: 900 }).ok === true);
  }

  section('Daily consumption math');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    const today = env.ent.todayKey();

    check('starts with 20 questions left', env.ent.remainingToday('questions') === 20);
    env.ent.consume('questions', 6);
    check('after 6 questions, 14 left', env.ent.remainingToday('questions') === 14);
    env.ent.consume('questions', 9);
    check('after 15 questions, 5 left', env.ent.remainingToday('questions') === 5);
    check('a 6 question block no longer fits', env.ent.can('questions', { count: 6 }).ok === false);
    check('a 5 question block still fits', env.ent.can('questions', { count: 5 }).ok === true);
    env.ent.consume('questions', 5);
    check('budget lands exactly on zero', env.ent.remainingToday('questions') === 0);
    check('nothing fits at zero', env.ent.can('questions', { count: 1 }).ok === false);
    check('reason at zero is daily_limit', env.ent.can('questions', { count: 1 }).reason === 'daily_limit');
    check('remaining never goes negative',
      (env.ent.consume('questions', 50), env.ent.remainingToday('questions') === 0));

    check('usage stored under aplus3_usage_' + today,
      env.storage._map.has('aplus3_usage_' + today),
      Array.from(env.storage._map.keys()).join(','));

    check('flashcards use a separate counter', env.ent.remainingToday('flashcards') === 20);
    env.ent.consume('flashcards', 20);
    check('flashcards exhaust independently',
      env.ent.remainingToday('flashcards') === 0 && env.ent.can('flashcards').ok === false);
    check('labs counter is separate', env.ent.remainingToday('labs') === 1);
  }

  section('Local midnight boundary');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    const today = env.ent.todayKey();
    const tomorrow = dayShift(1);
    const yesterday = dayShift(-1);

    env.ent.consume('questions', 20);
    check('today is exhausted', env.ent.remainingToday('questions') === 0);
    check('today key matches local date', today === dayShift(0), today + ' vs ' + dayShift(0));
    check('tomorrow uses a different bucket',
      env.ent._internal.usageStorageKey(tomorrow) !== env.ent._internal.usageStorageKey(today));
    check('tomorrow bucket starts empty', env.ent.getUsage(tomorrow).questions === 0);
    check('today bucket holds 20', env.ent.getUsage(today).questions === 20);

    // Yesterday being full must not affect today, and vice versa.
    const env2 = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    env2.ent._internal.setUsage({ questions: 20, cards: 20, diagnostics: 1, labs: 1 }, yesterday);
    check('yesterday usage does not spend today', env2.ent.remainingToday('questions') === 20);
    check('yesterday diagnostic does not block today', env2.ent.can('diagnostic').ok === true);
  }

  section('Free diagnostic');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    check('diagnostic allowed on a fresh day', env.ent.can('diagnostic').ok === true);
    env.ent.consume('diagnostic', 1);
    check('second diagnostic in a day is blocked', env.ent.can('diagnostic').ok === false);
    check('diagnostic did not spend the question budget', env.ent.remainingToday('questions') === 20);
  }

  section('startExam wrapping');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    let lastCall = null;
    env.win.startExam = function (type, count, minutes) {
      lastCall = { type, count, minutes };
      return 'started';
    };
    check('assignment through the trap produced a wrapper',
      env.win.startExam.__aplusEntitled === true);

    // The diagnostic runs untouched and free.
    lastCall = null;
    env.win.startExam('both', 20, 25);
    check('diagnostic passes through untouched',
      lastCall && lastCall.count === 20 && lastCall.minutes === 25, JSON.stringify(lastCall));
    check('diagnostic spent the diagnostic counter', env.ent.getUsage().diagnostics === 1);
    check('diagnostic left the question budget alone', env.ent.remainingToday('questions') === 20);

    // A 90 question mock is paid only.
    lastCall = null;
    env.win.startExam('core1', 90, 90);
    check('full mock is blocked for free users', lastCall === null);

    // A 30 question set with only 5 left is trimmed to 5.
    env.ent.consume('questions', 15);
    lastCall = null;
    env.win.startExam('core1', 30, 30);
    check('oversized free session is trimmed to the remaining count',
      lastCall && lastCall.count === 5, JSON.stringify(lastCall));
    check('trimmed session keeps a sane timer',
      lastCall && lastCall.minutes > 0 && lastCall.minutes <= 30, JSON.stringify(lastCall));

    // With fewer than minTrimmedSession left, show the card instead.
    env.ent.consume('questions', 4);
    lastCall = null;
    env.win.startExam('core1', 30, 30);
    check('a sliver of budget shows the card instead of a 1 question exam', lastCall === null);

    // Pro runs everything as asked.
    await env.ent.activate(issued.key);
    lastCall = null;
    env.win.startExam('core1', 90, 90);
    check('pro gets the full 90 question mock',
      lastCall && lastCall.count === 90 && lastCall.minutes === 90, JSON.stringify(lastCall));
  }

  section('Consumption from the exam bus');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    env.win.startExam = function () { return 'started'; };
    env.bus.emit('exam:started', { totalQuestions: 10 });
    check('starting a session spends nothing', env.ent.remainingToday('questions') === 20);
    env.bus.emit('exam:answered', { index: 0 });
    env.bus.emit('exam:answered', { index: 1 });
    check('two answers spend two questions', env.ent.remainingToday('questions') === 18);
    env.bus.emit('exam:answered', { index: 1 });
    check('changing an answer does not spend twice', env.ent.remainingToday('questions') === 18);
    env.bus.emit('exam:started', { totalQuestions: 10 });
    env.bus.emit('exam:answered', { index: 0 });
    check('a new session counts its own question 0', env.ent.remainingToday('questions') === 17);
  }

  section('Ghost Coach gate');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    let coachRan = false;
    env.win.startGhostCoachMission = function () { coachRan = true; return 'coach'; };
    check('coach entry point is wrapped', env.win.startGhostCoachMission.__aplusEntitled === true);
    env.win.startGhostCoachMission();
    check('free users do not reach the coach', coachRan === false);
    await env.ent.activate(issued.key);
    env.win.startGhostCoachMission();
    check('pro users reach the coach', coachRan === true);

    // APlus.ghostCoach methods are wrapped on the late re-check.
    const env2 = loadEntitlements({ publicKeyJwk: keys.publicJwk });
    let missionRan = false;
    env2.win.APlus.ghostCoach = { startCurrentMission: function () { missionRan = true; } };
    env2.ent._internal.rewrapAll();
    check('APlus.ghostCoach.startCurrentMission is wrapped',
      env2.win.APlus.ghostCoach.startCurrentMission.__aplusEntitled === true);
    env2.win.APlus.ghostCoach.startCurrentMission();
    check('free users do not reach the coach mission', missionRan === false);
  }

  section('Flashcards and labs gates');
  {
    const env = loadEntitlements({ publicKeyJwk: keys.publicJwk, freeCardsPerDay: 2, freeLabsPerDay: 1 });
    let cardOpens = 0;
    env.win.openMemoryModal = function () { cardOpens++; };
    env.win.openMemoryModal();
    env.win.openMemoryModal();
    env.win.openMemoryModal();
    check('flashcards stop at the daily allowance', cardOpens === 2, 'opens=' + cardOpens);

    let labOpens = 0;
    env.win.openPBQModal = function () { labOpens++; };
    env.win.openPBQModal();
    env.win.openPBQModal();
    check('labs stop at the daily allowance', labOpens === 1, 'opens=' + labOpens);

    await env.ent.activate(issued.key);
    env.win.openMemoryModal();
    env.win.openPBQModal();
    check('pro reopens flashcards and labs freely', cardOpens === 3 && labOpens === 2);
  }

  section('Internal builds (enabled: false)');
  {
    const env = loadEntitlements({ enabled: false, publicKeyJwk: null });
    check('kill switch reports pro', env.ent.isPro() === true);
    check('kill switch unlocks full mocks', env.ent.can('full_mock').ok === true);
    check('kill switch unlocks the coach', env.ent.can('coach').ok === true);
    check('kill switch gives unlimited questions', env.ent.remainingToday('questions') === Infinity);
    check('kill switch consumes nothing',
      (env.ent.consume('questions', 100), env.ent.remainingToday('questions') === Infinity));

    let ran = null;
    env.win.startExam = function (t, c, m) { ran = { t, c, m }; };
    env.win.startExam('core1', 90, 90);
    check('kill switch runs a 90 question mock untouched',
      ran && ran.c === 90 && ran.m === 90, JSON.stringify(ran));

    let coachRan = false;
    env.win.startGhostCoachMission = function () { coachRan = true; };
    env.win.startGhostCoachMission();
    check('kill switch runs the coach', coachRan === true);
  }

  section('Loads safely without a DOM or WebCrypto');
  {
    let threw = null;
    try {
      const storage = makeStorage();
      const win = {
        localStorage: storage,
        setTimeout: () => 0,
        addEventListener: () => {},
        APLUS_ENTITLEMENTS_CONFIG: { enabled: true, publicKeyJwk: keys.publicJwk }
      };
      win.window = win;
      new Function('window', 'console', ENTITLEMENTS_SRC)(win, console);
      const res = await win.APlus.entitlements.activate(issued.key);
      check('no WebCrypto means no unlock',
        res.ok === false && win.APlus.entitlements.isPro() === false, JSON.stringify(res));
      check('no WebCrypto still reports a plain message',
        typeof res.error === 'string' && res.error.length > 0);
      check('free limits still work without a DOM',
        win.APlus.entitlements.remainingToday('questions') === 20);
    } catch (err) {
      threw = err;
    }
    check('module never throws at load without a DOM', threw === null, threw && threw.message);
  }

  /* ----------------------------------------------------------------------- */

  process.stdout.write('\n=======================\n');
  process.stdout.write(passed + ' passed, ' + failures.length + ' failed\n');
  if (failures.length) {
    failures.forEach(f => process.stdout.write('  FAILED: ' + f + '\n'));
    process.exitCode = 1;
  } else {
    process.stdout.write('All entitlements checks passed.\n');
  }
}

run().catch(function (err) {
  process.stderr.write('Test harness crashed: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exitCode = 1;
});
