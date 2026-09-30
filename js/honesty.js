/**
 * honesty.js - Shared honesty rules for diagnostic length and course switch.
 *
 * Diagnostic length has one target (20). The number shown on the button, the
 * number of questions started, and the timer all come from resolveDiagnosticLength
 * so a short pool cannot advertise 20 and then run 10.
 *
 * Browser: window.APlus.honesty
 * Node:    module.exports
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  var w = (typeof window === 'object' && window) ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.honesty = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Canonical diagnostic length. One number for copy, session, and timer. */
  var DIAGNOSTIC_TARGET = 20;

  /**
   * resolveDiagnosticLength(available, target) -> questions to run and advertise.
   * available <= 0 means the bank is not loaded yet, so the target stands.
   * A shorter loaded pool clamps the target. Never advertise more than will run.
   */
  function resolveDiagnosticLength(available, target) {
    var cap = (typeof target === 'number' && target > 0) ? Math.round(target) : DIAGNOSTIC_TARGET;
    var n = Number(available);
    if (!isFinite(n) || n <= 0) return cap;
    return Math.max(1, Math.min(cap, Math.floor(n)));
  }

  /** One minute per delivered question so the clock matches the question count. */
  function diagnosticMinutes(questionCount) {
    var n = Math.round(Number(questionCount));
    if (!isFinite(n) || n < 1) n = DIAGNOSTIC_TARGET;
    return n;
  }

  function diagnosticClockSeconds(deliveredCount) {
    return diagnosticMinutes(deliveredCount) * 60;
  }

  function diagnosticTakeLabel(questionCount) {
    return 'Take the ' + diagnosticMinutes(questionCount) + '-question diagnostic';
  }

  function diagnosticStartLabel(questionCount) {
    return 'Start the ' + diagnosticMinutes(questionCount) + '-question diagnostic';
  }

  function questionPoolSize(exam) {
    var w = (typeof window === 'object' && window) ? window : null;
    try {
      var data = w && w.APlus && w.APlus.data;
      if (!data || typeof data.getQuestions !== 'function') return 0;
      var pool = data.getQuestions(exam || 'core1') || [];
      var n = 0;
      for (var i = 0; i < pool.length; i++) {
        if (pool[i] && pool[i].type !== 'pbq') n++;
      }
      return n;
    } catch (_) {
      return 0;
    }
  }

  function diagnosticOffer(exam) {
    var count = resolveDiagnosticLength(questionPoolSize(exam));
    return {
      exam: exam || 'core1',
      count: count,
      minutes: diagnosticMinutes(count),
      takeLabel: diagnosticTakeLabel(count),
      startLabel: diagnosticStartLabel(count)
    };
  }

  /**
   * Which home surfaces a course switch must rebuild.
   * Core 1 and Core 2 own readiness, objectives, and the diagnostic.
   * Other tracks still remount mocks so the selected card is the one shown.
   */
  function courseSurfaces(trackId) {
    var id = trackId || 'core1';
    var exam = (id === 'core1' || id === 'core2') ? id : null;
    return {
      trackId: id,
      exam: exam,
      remount: ['readiness', 'objectives', 'diagnostic', 'mocks']
    };
  }

  return {
    DIAGNOSTIC_TARGET: DIAGNOSTIC_TARGET,
    resolveDiagnosticLength: resolveDiagnosticLength,
    diagnosticMinutes: diagnosticMinutes,
    diagnosticClockSeconds: diagnosticClockSeconds,
    diagnosticTakeLabel: diagnosticTakeLabel,
    diagnosticStartLabel: diagnosticStartLabel,
    questionPoolSize: questionPoolSize,
    diagnosticOffer: diagnosticOffer,
    courseSurfaces: courseSurfaces
  };
});
