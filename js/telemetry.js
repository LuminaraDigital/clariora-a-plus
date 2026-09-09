/**
 * Clariora Exam Simulator v3.0.0
 * telemetry.js - Privacy-respecting local-first usage telemetry
 * File: js/telemetry.js
 *
 * Collects anonymous, aggregate product-usage events into a local ring
 * buffer (localStorage / APlus.storage) so the team can see how the app is
 * actually used. Nothing leaves the device unless the operator turns on
 * upload in js/telemetry-config.js AND the user explicitly consents via
 * APlus.telemetry.setConsent(true).
 *
 * Never collects: names, emails, question text/content, answer text,
 * free-form input, exact file paths, or any other personally identifying
 * information. See docs/ANALYTICS.md for the full field list.
 *
 * Plain IIFE, no ES modules, safe to open via file://. Never throws.
 */
(function (window) {
  'use strict';

  if (!window) return;

  var APlus = window.APlus = window.APlus || {};

  var MAX_EVENTS = 500;
  var PROP_VALUE_MAX = 80;
  var ERROR_MSG_MAX = 160;
  var INSTALL_ID_KEY = 'telemetry_install_id';
  var EVENTS_KEY = 'telemetry_events';
  var CONSENT_KEY = 'telemetry_consent';

  // ---------------------------------------------------------------------
  // Storage helpers (fall back to raw localStorage if APlus.storage isn't
  // loaded yet, so this file never depends on load order).
  // ---------------------------------------------------------------------

  function storageGet(key, fallback) {
    try {
      if (APlus.storage && typeof APlus.storage.get === 'function') {
        return APlus.storage.get(key, fallback);
      }
    } catch (err) { /* fall through */ }
    try {
      var raw = window.localStorage.getItem('aplus3_' + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      if (APlus.storage && typeof APlus.storage.set === 'function') {
        return APlus.storage.set(key, value);
      }
    } catch (err) { /* fall through */ }
    try {
      window.localStorage.setItem('aplus3_' + key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // Anonymous install id (random UUID v4, created once, no PII)
  // ---------------------------------------------------------------------

  function makeUuidV4() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (err) { /* fall through */ }
    var d = Date.now();
    var d2 = (typeof performance !== 'undefined' && performance.now) ? performance.now() * 1000 : 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16;
      if (d > 0) { r = (d + r) % 16 | 0; d = Math.floor(d / 16); }
      else { r = (d2 + r) % 16 | 0; d2 = Math.floor(d2 / 16); }
      var v = (c === 'x') ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getInstallId() {
    var id = storageGet(INSTALL_ID_KEY, null);
    if (typeof id === 'string' && id.length > 0) return id;
    id = makeUuidV4();
    storageSet(INSTALL_ID_KEY, id);
    return id;
  }

  var installId = getInstallId();
  var sessionId = makeUuidV4();
  var sessionStartedAt = Date.now();
  var lastActiveStart = sessionStartedAt;
  var sessionEndEmitted = false;

  // ---------------------------------------------------------------------
  // Event buffer (ring buffer capped at MAX_EVENTS)
  // ---------------------------------------------------------------------

  function loadBuffer() {
    var buf = storageGet(EVENTS_KEY, []);
    if (!Array.isArray(buf)) return [];
    return buf;
  }

  function saveBuffer(buf) {
    storageSet(EVENTS_KEY, buf);
  }

  var buffer = loadBuffer();

  function truncateString(str, max) {
    if (typeof str !== 'string') str = String(str);
    if (str.length <= max) return str;
    return str.slice(0, max);
  }

  // Only flat primitives survive; nested objects/arrays are dropped
  // entirely (never serialized) to guarantee no accidental PII leakage.
  function sanitizeProps(props) {
    var out = {};
    if (!props || typeof props !== 'object') return out;
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = props[k];
      var t = typeof v;
      if (v === null) {
        out[k] = null;
      } else if (t === 'boolean' || t === 'number') {
        out[k] = v;
      } else if (t === 'string') {
        out[k] = truncateString(v, PROP_VALUE_MAX);
      }
      // objects, arrays, functions, undefined: intentionally dropped
    }
    return out;
  }

  function pushEvent(name, props) {
    try {
      var evt = {
        t: new Date().toISOString(),
        n: String(name),
        p: sanitizeProps(props),
        s: sessionId
      };
      buffer.push(evt);
      if (buffer.length > MAX_EVENTS) {
        buffer.splice(0, buffer.length - MAX_EVENTS);
      }
      saveBuffer(buffer);
      return evt;
    } catch (err) {
      return null;
    }
  }

  function track(name, props) {
    if (!name) return null;
    return pushEvent(name, props);
  }

  // ---------------------------------------------------------------------
  // Consent + upload config
  // ---------------------------------------------------------------------

  function getConsent() {
    return storageGet(CONSENT_KEY, false) === true;
  }

  function setConsent(value) {
    var v = Boolean(value);
    storageSet(CONSENT_KEY, v);
    if (v) scheduleFlush(true);
    return v;
  }

  function getConfig() {
    var cfg = window.APLUS_TELEMETRY_CONFIG || {};
    return {
      endpoint: typeof cfg.endpoint === 'string' ? cfg.endpoint : '',
      enabled: cfg.enabled === true,
      flushIntervalMs: typeof cfg.flushIntervalMs === 'number' ? cfg.flushIntervalMs : 60000,
      batchSize: typeof cfg.batchSize === 'number' ? cfg.batchSize : 50
    };
  }

  function uploadIsAllowed() {
    var cfg = getConfig();
    if (!cfg.enabled) return false;
    if (!cfg.endpoint || cfg.endpoint.indexOf('https://') !== 0) return false;
    if (!getConsent()) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    } catch (err) { /* ignore */ }
    return true;
  }

  var backoffMs = 0;
  var BACKOFF_BASE = 5000;
  var BACKOFF_MAX = 5 * 60 * 1000;

  function sendBatch(batch, cfg, onDone) {
    var body;
    try {
      body = JSON.stringify({ installId: installId, events: batch });
    } catch (err) {
      onDone(false);
      return;
    }

    var sentViaBeacon = false;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        var blob;
        try {
          blob = new Blob([body], { type: 'application/json' });
        } catch (err) {
          blob = null;
        }
        if (blob) {
          sentViaBeacon = navigator.sendBeacon(cfg.endpoint, blob);
        }
      }
    } catch (err) {
      sentViaBeacon = false;
    }

    if (sentViaBeacon) {
      onDone(true);
      return;
    }

    try {
      if (typeof fetch === 'function') {
        fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).then(function (res) {
          onDone(Boolean(res && res.ok));
        }).catch(function () {
          onDone(false);
        });
        return;
      }
    } catch (err) { /* fall through */ }

    onDone(false);
  }

  function flush(force) {
    try {
      if (!force && !uploadIsAllowed()) return;
      if (force && !getConsent()) return;
      var cfg = getConfig();
      if (!cfg.endpoint || cfg.endpoint.indexOf('https://') !== 0) return;
      if (buffer.length === 0) return;

      var batch = buffer.slice(0, cfg.batchSize);
      sendBatch(batch, cfg, function (ok) {
        try {
          if (ok) {
            buffer.splice(0, batch.length);
            saveBuffer(buffer);
            backoffMs = 0;
          } else {
            backoffMs = backoffMs ? Math.min(backoffMs * 2, BACKOFF_MAX) : BACKOFF_BASE;
          }
        } catch (err) { /* never throw */ }
      });
    } catch (err) {
      // Upload must never break the app.
    }
  }

  var flushTimer = null;

  function scheduleFlush(immediate) {
    try {
      var cfg = getConfig();
      if (!cfg.enabled) return;
      if (immediate) flush(false);
      if (flushTimer) return;
      flushTimer = setInterval(function () {
        if (backoffMs > 0) {
          backoffMs -= cfg.flushIntervalMs;
          if (backoffMs > 0) return;
          backoffMs = 0;
        }
        flush(false);
      }, cfg.flushIntervalMs);
    } catch (err) { /* never throw */ }
  }

  // ---------------------------------------------------------------------
  // Desktop bridge: mirror error events to electronAPI.log when present
  // ---------------------------------------------------------------------

  function mirrorToDesktopLog(level, message) {
    try {
      if (window.electronAPI && typeof window.electronAPI.log === 'function') {
        window.electronAPI.log(level, message);
      }
    } catch (err) { /* never throw */ }
  }

  // ---------------------------------------------------------------------
  // Auto-tracked events
  // ---------------------------------------------------------------------

  function detectPlatform() {
    try {
      if (window.electronAPI && window.electronAPI.isDesktopApp) return 'desktop';
    } catch (err) { /* ignore */ }
    try {
      var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
      if (standalone) return 'pwa';
    } catch (err) { /* ignore */ }
    return 'web';
  }

  function widthBucket() {
    try {
      var w = window.innerWidth || 0;
      if (w < 480) return 'xs';
      if (w < 768) return 'sm';
      if (w < 1024) return 'md';
      if (w < 1440) return 'lg';
      return 'xl';
    } catch (err) {
      return 'unknown';
    }
  }

  function trackSessionStart() {
    track('session_start', {
      platform: detectPlatform(),
      version: (APlus.APP_VERSION || 'unknown'),
      width: widthBucket()
    });
  }

  function trackSessionEnd() {
    if (sessionEndEmitted) return;
    var seconds = Math.max(0, Math.round((Date.now() - lastActiveStart) / 1000));
    track('session_end', { seconds: seconds });
    sessionEndEmitted = true;
  }

  function wireVisibility() {
    try {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          trackSessionEnd();
        } else {
          lastActiveStart = Date.now();
          sessionEndEmitted = false;
        }
      });
    } catch (err) { /* ignore */ }
    try {
      window.addEventListener('pagehide', function () {
        trackSessionEnd();
      });
    } catch (err) { /* ignore */ }
  }

  function wireBusEvents() {
    var bus = APlus.bus;
    if (!bus || typeof bus.on !== 'function') return;

    bus.on('exam:started', function (payload) {
      payload = payload || {};
      track('exam_started', {
        examType: payload.type,
        count: payload.totalQuestions,
        minutes: typeof payload.totalSeconds === 'number' ? Math.round(payload.totalSeconds / 60) : null,
        mode: payload.domainKey || 'standard'
      });
    });

    bus.on('exam:finished', function (payload) {
      payload = payload || {};
      track('exam_finished', {
        examType: payload.examType,
        total: payload.totalQuestions,
        rawCorrect: payload.rawCorrect,
        scaledScore: payload.scaledScore,
        passed: payload.passed,
        seconds: payload.secondsSpent,
        flagged: payload.flaggedCount
      });
    });

    bus.on('onboarding:diagnostic_started', function (payload) {
      track('diagnostic_started', sanitizeProps(payload));
    });

    bus.on('onboarding:diagnostic_completed', function (payload) {
      track('diagnostic_completed', sanitizeProps(payload));
    });

    // No confirmed emitter exists yet for these; wiring is defensive so
    // this module never depends on load order or another team's rollout.
    bus.on('today:session:started', function (payload) {
      track('today_session_started', sanitizeProps(payload));
    });

    bus.on('feature:opened', function (payload) {
      payload = payload || {};
      track('feature_opened', { feature: payload.feature });
    });
  }

  function wireErrorHandlers() {
    try {
      window.addEventListener('error', function (event) {
        try {
          var message = event && event.message ? String(event.message) : 'unknown error';
          var source = '';
          if (event && event.filename) {
            var parts = String(event.filename).split(/[\\/]/);
            source = parts[parts.length - 1] || '';
          }
          var line = event && typeof event.lineno === 'number' ? event.lineno : null;
          message = truncateString(message, ERROR_MSG_MAX);
          track('error', { message: message, source: source, line: line });
          mirrorToDesktopLog('error', message + (source ? (' (' + source + ':' + line + ')') : ''));
        } catch (err) { /* never throw */ }
      });
    } catch (err) { /* ignore */ }

    try {
      window.addEventListener('unhandledrejection', function (event) {
        try {
          var reason = event && event.reason;
          var message = 'unhandled rejection';
          if (reason) {
            if (typeof reason === 'string') message = reason;
            else if (reason.message) message = String(reason.message);
            else {
              try { message = JSON.stringify(reason); } catch (e) { message = String(reason); }
            }
          }
          message = truncateString(message, ERROR_MSG_MAX);
          track('error', { message: message, source: 'unhandledrejection', line: null });
          mirrorToDesktopLog('error', message);
        } catch (err) { /* never throw */ }
      });
    } catch (err) { /* ignore */ }
  }

  // ---------------------------------------------------------------------
  // Derived metrics (computed locally from the buffer only)
  // ---------------------------------------------------------------------

  function eventsByName(name) {
    return buffer.filter(function (e) { return e && e.n === name; });
  }

  function metrics() {
    var sessionStarts = eventsByName('session_start');
    var diagStarted = eventsByName('diagnostic_started');
    var diagCompleted = eventsByName('diagnostic_completed');
    var examsFinished = eventsByName('exam_finished');
    var errors = eventsByName('error');

    var sessionsTotal = sessionStarts.length;

    var diagnosticCompletionRate = diagStarted.length > 0
      ? diagCompleted.length / diagStarted.length
      : 0;

    // Day-7 return: true if any session_start happened 6-8 days after the
    // very first recorded session_start.
    var day7Return = false;
    var rollingWeeksFraction = 0;
    if (sessionStarts.length > 0) {
      var times = sessionStarts.map(function (e) {
        return new Date(e.t).getTime();
      }).filter(function (n) { return !isNaN(n); }).sort(function (a, b) { return a - b; });

      if (times.length > 0) {
        var first = times[0];
        var last = times[times.length - 1];
        var DAY = 24 * 60 * 60 * 1000;

        for (var i = 0; i < times.length; i++) {
          var deltaDays = (times[i] - first) / DAY;
          if (deltaDays >= 6 && deltaDays <= 8) {
            day7Return = true;
            break;
          }
        }

        // Rolling: fraction of elapsed weeks (since first session) that
        // contain at least one session_start.
        var totalWeeks = Math.max(1, Math.ceil((last - first) / (7 * DAY)) + 1);
        var weeksWithSession = {};
        for (var j = 0; j < times.length; j++) {
          var weekIdx = Math.floor((times[j] - first) / (7 * DAY));
          weeksWithSession[weekIdx] = true;
        }
        rollingWeeksFraction = Object.keys(weeksWithSession).length / totalWeeks;
      }
    }

    var last5Scores = examsFinished
      .slice(-5)
      .map(function (e) { return e.p && typeof e.p.scaledScore === 'number' ? e.p.scaledScore : null; })
      .filter(function (n) { return n !== null; });
    var meanScaledScoreLast5 = last5Scores.length > 0
      ? last5Scores.reduce(function (a, b) { return a + b; }, 0) / last5Scores.length
      : null;

    var sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    var errorsLast7Days = errors.filter(function (e) {
      var t = new Date(e.t).getTime();
      return !isNaN(t) && t >= sevenDaysAgo;
    }).length;

    return {
      sessionsTotal: sessionsTotal,
      diagnosticCompletionRate: diagnosticCompletionRate,
      day7Return: {
        returned: day7Return,
        rollingWeeksFraction: rollingWeeksFraction
      },
      examsFinished: examsFinished.length,
      meanScaledScoreLast5: meanScaledScoreLast5,
      errorsLast7Days: errorsLast7Days
    };
  }

  function exportJson() {
    // Deep copy so callers can't mutate the live buffer.
    try {
      return JSON.parse(JSON.stringify(buffer));
    } catch (err) {
      return [];
    }
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  APlus.telemetry = {
    track: track,
    metrics: metrics,
    exportJson: exportJson,
    setConsent: setConsent,
    getConsent: getConsent,
    getInstallId: function () { return installId; },
    getSessionId: function () { return sessionId; },
    flush: function () { flush(true); },
    _bufferLength: function () { return buffer.length; } // test/debug helper
  };

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function init() {
    try { wireBusEvents(); } catch (err) { /* never throw */ }
    try { wireVisibility(); } catch (err) { /* never throw */ }
    try { wireErrorHandlers(); } catch (err) { /* never throw */ }
    try { trackSessionStart(); } catch (err) { /* never throw */ }
    try { scheduleFlush(false); } catch (err) { /* never throw */ }
  }

  init();

})(typeof window !== 'undefined' ? window : this);
