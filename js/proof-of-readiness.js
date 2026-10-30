/**
 * proof-of-readiness.js - Signed readiness export for instructors (no account).
 * Payload is SHA-256 hashed (or legacy fingerprint on file://).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.proofOfReadiness = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function A() {
    return typeof window !== 'undefined' ? window.APlus || null : null;
  }
  function track(n, p) {
    try {
      var a = A();
      if (a && a.telemetry && a.telemetry.track) a.telemetry.track(n, p || {});
    } catch (_) {}
  }

  function canonicalPayload(exam) {
    var a = A();
    var history = [];
    try {
      if (a && a.learner && typeof a.learner.getHistory === 'function') history = a.learner.getHistory() || [];
    } catch (_) {}
    var readiness = null;
    try {
      if (a && a.readiness2 && typeof a.readiness2.compute === 'function') {
        readiness = a.readiness2.compute({ exam: exam || 'core1', history: history });
      }
    } catch (_) {}
    var path = null;
    try {
      if (a && a.storage) path = a.storage.get('readiness_path_v1', null);
    } catch (_) {}
    var habit = null;
    try {
      if (a && a.storage) habit = a.storage.get('habit_66_v1', null);
    } catch (_) {}
    return {
      schema: 'clariora.proof_of_readiness.v1',
      exportedAt: new Date().toISOString(),
      exam: exam || 'core1',
      predicted: readiness && readiness.predicted != null ? Math.round(readiness.predicted) : null,
      readinessPct: readiness && readiness.readiness != null ? Math.round(readiness.readiness) : null,
      attempts: history.length,
      lastScores: history.slice(0, 5).map(function (h) {
        return { scaledScore: h.scaledScore, examType: h.examType, timestamp: h.timestamp || h.date || null };
      }),
      pathDay1: path && path.days && path.days[0] ? path.days[0].focusDomains : [],
      habitDay: habit && habit.dayIndex != null ? habit.dayIndex : null
    };
  }

  function sha256Hex(text) {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      var data = new TextEncoder().encode(text);
      return crypto.subtle.digest('SHA-256', data).then(function (buf) {
        var arr = Array.from(new Uint8Array(buf));
        return arr
          .map(function (b) {
            return ('0' + b.toString(16)).slice(-2);
          })
          .join('');
      });
    }
    // Fallback: non-crypto fingerprint for offline/file:// only (labeled).
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return Promise.resolve('legacy-' + h.toString(16));
  }

  function exportProof(exam) {
    try {
      var cfg = (typeof window !== 'undefined' && window.APLUS_FEATURES_CONFIG) || {};
      if (cfg.proofOfReadiness && cfg.proofOfReadiness.enabled === false) {
        return Promise.reject(new Error('proof export disabled'));
      }
    } catch (_) {}
    var payload = canonicalPayload(exam);
    var body = JSON.stringify(payload);
    return sha256Hex(body).then(function (hash) {
      var envelope = { payload: payload, hash: hash, alg: String(hash).indexOf('legacy-') === 0 ? 'fnv-legacy' : 'SHA-256' };
      track('proof_export', { exam: String(exam || 'core1').slice(0, 20), alg: envelope.alg });
      try {
        var a = A();
        if (a && a.storage) {
          a.storage.set('proof_last_export', { at: Date.now(), hash: hash });
        }
      } catch (_) {}
      return envelope;
    });
  }

  function verify(envelope) {
    if (!envelope || !envelope.payload || !envelope.hash) return Promise.resolve({ ok: false, reason: 'missing' });
    var body = JSON.stringify(envelope.payload);
    return sha256Hex(body).then(function (hash) {
      return { ok: hash === envelope.hash, expected: hash, got: envelope.hash };
    });
  }

  function download(exam) {
    return exportProof(exam).then(function (envelope) {
      var blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'clariora-proof-of-readiness.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
        a.remove();
      }, 500);
      return envelope;
    });
  }

  return {
    version: '1.0.0',
    canonicalPayload: canonicalPayload,
    exportProof: exportProof,
    verify: verify,
    download: download
  };
});
