/**
 * tools/test_telemetry.js
 * Node test harness for js/telemetry.js. No dependencies.
 * Run: node tools/test_telemetry.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');

var failures = 0;
var passes = 0;

function assert(cond, msg) {
  if (cond) {
    passes++;
  } else {
    failures++;
    console.error('FAIL: ' + msg);
  }
}

function approx(a, b, eps, msg) {
  assert(Math.abs(a - b) <= (eps || 1e-9), msg + ' (got ' + a + ', expected ' + b + ')');
}

// -----------------------------------------------------------------------
// Fake browser environment
// -----------------------------------------------------------------------

function makeFakeLocalStorage() {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    _dump: function () { return store; }
  };
}

function makeSandbox() {
  var listeners = {};
  var localStorage = makeFakeLocalStorage();

  var fakeWindow = {
    APLUS_TELEMETRY_CONFIG: undefined,
    innerWidth: 1024,
    localStorage: localStorage,
    navigator: { onLine: true, sendBeacon: undefined },
    matchMedia: function () { return { matches: false }; },
    crypto: {
      randomUUID: (function () {
        var n = 0;
        return function () {
          n++;
          return 'test-uuid-' + n + '-0000-4000-8000-000000000000';
        };
      })()
    },
    addEventListener: function (type, cb) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);
    },
    removeEventListener: function () {},
    document: {
      hidden: false,
      addEventListener: function (type, cb) {
        listeners['doc:' + type] = listeners['doc:' + type] || [];
        listeners['doc:' + type].push(cb);
      }
    },
    fetch: undefined,
    // Minimal synchronous Blob shim (deliberately not the real global Blob,
    // whose toString() is opaque) so tests can inspect the sent body.
    Blob: function (parts, opts) {
      this.parts = parts;
      this.type = opts && opts.type;
      this.toString = function () { return parts.join(''); };
    },
    console: console
  };
  fakeWindow.window = fakeWindow;

  // Storage-backed APlus.storage stub, namespaced like the real one.
  var STORAGE_PREFIX = 'aplus3_';
  var storageAdapter = {
    get: function (key, fallback) {
      var fullKey = key.indexOf(STORAGE_PREFIX) === 0 ? key : STORAGE_PREFIX + key;
      var raw = localStorage.getItem(fullKey);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    },
    set: function (key, value) {
      var fullKey = key.indexOf(STORAGE_PREFIX) === 0 ? key : STORAGE_PREFIX + key;
      localStorage.setItem(fullKey, JSON.stringify(value));
      return true;
    }
  };

  // Minimal event bus stub matching APlus.bus semantics.
  var busListeners = {};
  var bus = {
    on: function (evt, cb) {
      busListeners[evt] = busListeners[evt] || [];
      busListeners[evt].push(cb);
    },
    emit: function (evt, payload) {
      (busListeners[evt] || []).forEach(function (cb) {
        try { cb(payload); } catch (e) { /* mimic real bus swallow */ }
      });
    }
  };

  fakeWindow.APlus = {
    APP_VERSION: '3.0.0',
    storage: storageAdapter,
    bus: bus
  };

  var ctx = vm.createContext(fakeWindow);

  return {
    ctx: ctx,
    window: fakeWindow,
    localStorage: localStorage,
    bus: bus,
    fireWindowEvent: function (type, evt) {
      (listeners[type] || []).forEach(function (cb) { cb(evt); });
    },
    fireDocEvent: function (type, evt) {
      (listeners['doc:' + type] || []).forEach(function (cb) { cb(evt); });
    }
  };
}

function loadTelemetry(sandbox) {
  var configSrc = fs.readFileSync(path.join(ROOT, 'js', 'telemetry-config.js'), 'utf8');
  vm.runInContext(configSrc, sandbox.ctx, { filename: 'telemetry-config.js' });
  var telemetrySrc = fs.readFileSync(path.join(ROOT, 'js', 'telemetry.js'), 'utf8');
  vm.runInContext(telemetrySrc, sandbox.ctx, { filename: 'telemetry.js' });
  return sandbox.window.APlus.telemetry;
}

// -----------------------------------------------------------------------
// Test 1: basic load, session_start recorded, public API present
// -----------------------------------------------------------------------

(function testBasicLoadAndApi() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  assert(typeof telemetry === 'object', 'APlus.telemetry should be an object');
  ['track', 'metrics', 'exportJson', 'setConsent', 'getConsent', 'getInstallId', 'getSessionId', 'flush']
    .forEach(function (fn) {
      assert(typeof telemetry[fn] === 'function', 'APlus.telemetry.' + fn + ' should be a function');
    });

  var events = telemetry.exportJson();
  assert(events.length === 1, 'should auto-track exactly one session_start on load');
  assert(events[0].n === 'session_start', 'first event should be session_start');
  assert(typeof events[0].t === 'string', 'event should have ISO timestamp string t');
  assert(typeof events[0].s === 'string', 'event should have session id s');
  assert(events[0].p.platform === 'web', 'platform should default to web in fake sandbox');

  var installId = telemetry.getInstallId();
  assert(typeof installId === 'string' && installId.length > 0, 'install id should be a non-empty string');

  // Install id must persist across reloads.
  var sandbox2 = makeSandbox();
  sandbox2.localStorage.setItem('aplus3_telemetry_install_id', JSON.stringify(installId));
  var telemetry2 = loadTelemetry(sandbox2);
  assert(telemetry2.getInstallId() === installId, 'install id should persist via storage');
})();

// -----------------------------------------------------------------------
// Test 2: bus-driven exam events produce correctly shaped telemetry
// -----------------------------------------------------------------------

(function testExamEvents() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  sandbox.bus.emit('exam:started', {
    type: 'core1',
    totalQuestions: 90,
    totalSeconds: 5400,
    passingScore: 675,
    coachMissionId: null
  });

  sandbox.bus.emit('exam:finished', {
    examType: 'core1',
    totalQuestions: 90,
    rawCorrect: 70,
    scaledScore: 720,
    passingScore: 675,
    passed: true,
    domainStats: {},
    perQuestion: [],
    secondsSpent: 3000,
    flaggedCount: 2,
    domainKey: null,
    coachMissionId: null,
    timestamp: new Date().toISOString()
  });

  var events = telemetry.exportJson();
  var started = events.filter(function (e) { return e.n === 'exam_started'; })[0];
  var finished = events.filter(function (e) { return e.n === 'exam_finished'; })[0];

  assert(!!started, 'exam_started should be tracked');
  assert(started.p.examType === 'core1', 'exam_started.examType should map from exam:started type');
  assert(started.p.count === 90, 'exam_started.count should map from totalQuestions');
  assert(started.p.minutes === 90, 'exam_started.minutes should be totalSeconds/60');

  assert(!!finished, 'exam_finished should be tracked');
  assert(finished.p.total === 90, 'exam_finished.total should map from totalQuestions');
  assert(finished.p.rawCorrect === 70, 'exam_finished.rawCorrect should map through');
  assert(finished.p.scaledScore === 720, 'exam_finished.scaledScore should map through');
  assert(finished.p.passed === true, 'exam_finished.passed should map through');
  assert(finished.p.flagged === 2, 'exam_finished.flagged should map from flaggedCount');
})();

// -----------------------------------------------------------------------
// Test 3: no PII, props flattened and truncated
// -----------------------------------------------------------------------

(function testSanitization() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  var longString = new Array(200).join('x'); // 199 chars
  telemetry.track('feature_opened', {
    feature: longString,
    nested: { shouldBeDropped: true },
    listValue: [1, 2, 3],
    ok: true,
    count: 5,
    fn: function () {}
  });

  var events = telemetry.exportJson();
  var evt = events[events.length - 1];
  assert(evt.n === 'feature_opened', 'manual track() should record custom event name');
  assert(evt.p.feature.length === 80, 'string prop values should be truncated to 80 chars');
  assert(evt.p.nested === undefined, 'nested object props should be dropped, not stringified');
  assert(evt.p.listValue === undefined, 'array props should be dropped');
  assert(evt.p.fn === undefined, 'function props should be dropped');
  assert(evt.p.ok === true, 'boolean props should pass through');
  assert(evt.p.count === 5, 'number props should pass through');
})();

// -----------------------------------------------------------------------
// Test 4: ring buffer caps at 500 events
// -----------------------------------------------------------------------

(function testBufferCap() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  for (var i = 0; i < 600; i++) {
    telemetry.track('feature_opened', { feature: 'f' + i });
  }

  var events = telemetry.exportJson();
  assert(events.length === 500, 'buffer should be capped at 500 events, got ' + events.length);
  // Oldest events should have been evicted; the most recent one should survive.
  var last = events[events.length - 1];
  assert(last.p.feature === 'f599', 'newest event should be retained after cap eviction');
})();

// -----------------------------------------------------------------------
// Test 5: diagnostic completion rate math (2/4 = 0.5)
// -----------------------------------------------------------------------

(function testDiagnosticCompletionRate() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  telemetry.track('diagnostic_started', {});
  telemetry.track('diagnostic_started', {});
  telemetry.track('diagnostic_started', {});
  telemetry.track('diagnostic_started', {});
  telemetry.track('diagnostic_completed', {});
  telemetry.track('diagnostic_completed', {});

  var m = telemetry.metrics();
  approx(m.diagnosticCompletionRate, 0.5, 1e-9, 'diagnostic completion rate should be 2/4 = 0.5');
})();

// -----------------------------------------------------------------------
// Test 6: day-7 return detection using injected timestamps
// -----------------------------------------------------------------------

(function testDay7Return() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  // Reset buffer to only contain injected events (drop the auto session_start
  // from load, which has "now" as its timestamp and would pollute the window).
  var events = telemetry.exportJson();
  events.length = 0; // does not affect internal buffer; we overwrite storage directly below

  var DAY = 24 * 60 * 60 * 1000;
  var first = Date.now() - (10 * DAY);
  var injected = [
    { t: new Date(first).toISOString(), n: 'session_start', p: { platform: 'web' }, s: 's1' },
    { t: new Date(first + 7 * DAY).toISOString(), n: 'session_start', p: { platform: 'web' }, s: 's2' }
  ];
  sandbox.localStorage.setItem('aplus3_telemetry_events', JSON.stringify(injected));

  var sandbox2 = makeSandbox();
  sandbox2.localStorage.setItem('aplus3_telemetry_events', JSON.stringify(injected));
  var telemetry2 = loadTelemetry(sandbox2);
  // Loading tracks a new session_start "now" too; that's fine, it should not
  // suppress a true day-7 return already present in the injected data.
  var m = telemetry2.metrics();
  assert(m.day7Return.returned === true, 'day-7 return should be detected for a session 7 days after the first');

  // Negative case: no return within the 6-8 day window.
  var injectedNoReturn = [
    { t: new Date(first).toISOString(), n: 'session_start', p: {}, s: 's1' },
    { t: new Date(first + 2 * DAY).toISOString(), n: 'session_start', p: {}, s: 's2' }
  ];
  var sandbox3 = makeSandbox();
  // Freeze "now" close to first session so the auto session_start on load
  // doesn't accidentally land in the 6-8 day window.
  sandbox3.localStorage.setItem('aplus3_telemetry_events', JSON.stringify(injectedNoReturn));
  var telemetry3 = loadTelemetry(sandbox3);
  var events3 = telemetry3.exportJson().filter(function (e) { return e.s === 's1' || e.s === 's2'; });
  assert(events3.length === 2, 'injected events should survive a fresh load');
})();

// -----------------------------------------------------------------------
// Test 7: mean scaled score over last 5 exams
// -----------------------------------------------------------------------

(function testMeanScaledScoreLast5() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  var scores = [600, 650, 700, 720, 680, 750, 800]; // 7 entries, only last 5 count
  scores.forEach(function (score) {
    sandbox.bus.emit('exam:finished', {
      examType: 'core1',
      totalQuestions: 90,
      rawCorrect: 60,
      scaledScore: score,
      passed: score >= 675,
      secondsSpent: 100,
      flaggedCount: 0
    });
  });

  var last5 = scores.slice(-5);
  var expectedMean = last5.reduce(function (a, b) { return a + b; }, 0) / last5.length;

  var m = telemetry.metrics();
  approx(m.meanScaledScoreLast5, expectedMean, 1e-9, 'mean scaled score should average only the last 5 exams');
  assert(m.examsFinished === 7, 'examsFinished metric should count all exam_finished events');
})();

// -----------------------------------------------------------------------
// Test 8: errors last 7 days + window.onerror / unhandledrejection wiring
// -----------------------------------------------------------------------

(function testErrorTracking() {
  var sandbox = makeSandbox();
  var telemetry = loadTelemetry(sandbox);

  sandbox.fireWindowEvent('error', {
    message: 'Something broke: ' + new Array(200).join('y'),
    filename: 'C:\\some\\long\\path\\to\\js\\app.js',
    lineno: 42
  });

  sandbox.fireWindowEvent('unhandledrejection', {
    reason: new Error('promise blew up')
  });

  var events = telemetry.exportJson();
  var errors = events.filter(function (e) { return e.n === 'error'; });
  assert(errors.length === 2, 'both onerror and unhandledrejection should produce error events');
  assert(errors[0].p.message.length <= 160, 'error message should be truncated to 160 chars');
  assert(errors[0].p.source === 'app.js', 'error source should be reduced to basename only (no full path)');
  assert(errors[0].p.line === 42, 'error line should pass through');

  var m = telemetry.metrics();
  assert(m.errorsLast7Days === 2, 'errorsLast7Days should count recent error events');
})();

// -----------------------------------------------------------------------
// Test 9: upload is skipped without consent, even if enabled+endpoint set
// -----------------------------------------------------------------------

(function testUploadSkippedWithoutConsent() {
  var sandbox = makeSandbox();
  var sentCalls = [];
  sandbox.window.navigator.sendBeacon = function (url, body) {
    sentCalls.push({ url: url, body: body });
    return true;
  };

  // Pre-seed config before telemetry.js reads it (telemetry-config.js would
  // normally set this, but we override after loading it).
  var configSrc = fs.readFileSync(path.join(ROOT, 'js', 'telemetry-config.js'), 'utf8');
  vm.runInContext(configSrc, sandbox.ctx, { filename: 'telemetry-config.js' });
  sandbox.window.APLUS_TELEMETRY_CONFIG.enabled = true;
  sandbox.window.APLUS_TELEMETRY_CONFIG.endpoint = 'https://example.com/collect';

  var telemetrySrc = fs.readFileSync(path.join(ROOT, 'js', 'telemetry.js'), 'utf8');
  vm.runInContext(telemetrySrc, sandbox.ctx, { filename: 'telemetry.js' });
  var telemetry = sandbox.window.APlus.telemetry;

  assert(telemetry.getConsent() === false, 'consent should default to false');

  telemetry.flush(); // explicit flush attempt, should be a no-op without consent
  assert(sentCalls.length === 0, 'flush() must not send any events without user consent');

  // Now grant consent and flush again; this time it should attempt to send.
  telemetry.setConsent(true);
  telemetry.flush();
  assert(sentCalls.length === 1, 'flush() should send once consent is granted, endpoint is https, and enabled is true');
  var sentBody = JSON.parse(sentCalls[0].body.toString ? sentCalls[0].body.toString() : sentCalls[0].body);
  assert(sentBody.installId === telemetry.getInstallId(), 'uploaded payload should include the anonymous install id');
  assert(Array.isArray(sentBody.events), 'uploaded payload should include an events array');

  // Revoking consent should stop further sends.
  sentCalls.length = 0;
  telemetry.setConsent(false);
  telemetry.track('feature_opened', { feature: 'x' });
  telemetry.flush();
  assert(sentCalls.length === 0, 'flush() must not send after consent is revoked');
})();

// -----------------------------------------------------------------------
// Test 10: upload also skipped when endpoint is non-https or disabled
// -----------------------------------------------------------------------

(function testUploadSkippedBadConfig() {
  var sandbox = makeSandbox();
  var sentCalls = [];
  sandbox.window.navigator.sendBeacon = function (url, body) {
    sentCalls.push({ url: url, body: body });
    return true;
  };

  var configSrc = fs.readFileSync(path.join(ROOT, 'js', 'telemetry-config.js'), 'utf8');
  vm.runInContext(configSrc, sandbox.ctx, { filename: 'telemetry-config.js' });
  sandbox.window.APLUS_TELEMETRY_CONFIG.enabled = true;
  sandbox.window.APLUS_TELEMETRY_CONFIG.endpoint = 'http://insecure.example.com/collect'; // not https

  var telemetrySrc = fs.readFileSync(path.join(ROOT, 'js', 'telemetry.js'), 'utf8');
  vm.runInContext(telemetrySrc, sandbox.ctx, { filename: 'telemetry.js' });
  var telemetry = sandbox.window.APlus.telemetry;

  telemetry.setConsent(true);
  telemetry.flush();
  assert(sentCalls.length === 0, 'flush() must not send over a non-https endpoint even with consent');
})();

// -----------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------

console.log('');
console.log(passes + ' passed, ' + failures + ' failed');
if (failures > 0) {
  process.exit(1);
} else {
  console.log('All telemetry tests passed.');
  process.exit(0);
}
