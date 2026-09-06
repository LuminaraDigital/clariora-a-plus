/**
 * bank-integrity.js - one-time repair for practice data recorded against the
 * miskeyed question bank that shipped before 3.1.3.
 *
 * Until 3.1.3 the bank builder rotated a question's options one way and moved
 * the answer index the other way, so 487 of 1032 single-choice questions had a
 * different option marked correct than their author wrote. Anything scored
 * before the fix is unreliable: a learner who chose correctly was marked wrong,
 * so their scaled scores are understated and their per-objective accuracy is
 * close to noise on the affected items.
 *
 * What this module does, once, on the first launch of a corrected build:
 *
 *   1. Records a cutoff timestamp. Attempts finished before it are excluded
 *      from the readiness prediction by readiness2 (see historyForExam).
 *      Nothing is deleted: every attempt stays visible in the history table,
 *      so the learner keeps their record and can still see the trend.
 *   2. Clears the accumulated per-objective statistics. Those are cumulative
 *      counters with no timestamps, so unlike history they cannot be filtered
 *      by date, and leaving them would keep the prediction wrong forever.
 *   3. Raises a flag so the shell can explain all of this once.
 *
 * Attempts recorded from 3.1.3 onward carry bankRevision, so a future
 * correction can filter precisely instead of relying on a timestamp.
 */
(function (global) {
  'use strict';

  var APlus = (global.APlus = global.APlus || {});

  /* Bump when a bank correction invalidates earlier scoring. 1 was the
     miskeyed era; 2 is the bank corrected on 2026-09-06. */
  var BANK_REVISION = 2;
  var MARKER_KEY = 'bank_fix_v2';
  var NOTICE_KEY = 'bank_fix_v2_notice';
  var OBJECTIVE_STATS_KEY = 'objective_stats';

  function store() {
    return APlus && APlus.storage && typeof APlus.storage.get === 'function' ? APlus.storage : null;
  }

  function read(key, fallback) {
    var s = store();
    if (!s) return fallback;
    try {
      return s.get(key, fallback);
    } catch (err) {
      console.warn('[bank-integrity] read failed for ' + key + ':', err);
      return fallback;
    }
  }

  function write(key, value) {
    var s = store();
    if (!s) return false;
    try {
      s.set(key, value);
      return true;
    } catch (err) {
      console.warn('[bank-integrity] write failed for ' + key + ':', err);
      return false;
    }
  }

  function countObjectiveObservations(stats) {
    if (!stats || typeof stats !== 'object') return 0;
    var total = 0;
    Object.keys(stats).forEach(function (key) {
      var row = stats[key];
      if (!row || typeof row !== 'object') return;
      var seen = Number(row.seen != null ? row.seen : row.total);
      if (isFinite(seen) && seen > 0) total += seen;
    });
    return total;
  }

  /**
   * Runs the repair if it has not run yet. Safe to call more than once.
   * Returns the marker, whether it was just written or read from a prior run.
   */
  function apply() {
    var existing = read(MARKER_KEY, null);
    if (existing && typeof existing === 'object' && existing.appliedAt) return existing;

    var history = [];
    try {
      if (APlus.learner && typeof APlus.learner.getHistory === 'function') {
        history = APlus.learner.getHistory() || [];
      }
    } catch (err) {
      console.warn('[bank-integrity] history read failed:', err);
    }

    var stats = read(OBJECTIVE_STATS_KEY, {}) || {};
    var observations = countObjectiveObservations(stats);

    // Attempts already stamped with the current revision were scored against a
    // corrected bank, so a fresh install with no old data needs no notice.
    var affected = 0;
    for (var i = 0; i < history.length; i++) {
      var r = history[i];
      if (r && Number(r.bankRevision) >= BANK_REVISION) continue;
      affected++;
    }

    var marker = {
      appliedAt: Date.now(),
      bankRevision: BANK_REVISION,
      affectedAttempts: affected,
      clearedObservations: observations
    };

    if (observations > 0) write(OBJECTIVE_STATS_KEY, {});
    var persisted = write(MARKER_KEY, marker);
    if (!persisted) {
      // Storage is unavailable, so the cutoff cannot be remembered. Returning a
      // live marker here would recompute it to "now" on every launch and
      // silently suppress the learner's whole history forever. Do nothing.
      return null;
    }
    // Only worth explaining when there was something to invalidate.
    if (affected > 0 || observations > 0) write(NOTICE_KEY, true);

    return marker;
  }

  /**
   * Attempts finished before this instant were scored against the miskeyed
   * bank. 0 means nothing is excluded (a fresh install, or storage missing).
   */
  function cutoff() {
    var marker = read(MARKER_KEY, null);
    // Self-healing: the first thing that asks about the cutoff triggers the
    // repair, so it does not matter whether the boot hook ran first. Without
    // this the very launch that needs filtering would be the one that skips it.
    if (!marker || typeof marker !== 'object' || !marker.appliedAt) marker = apply();
    if (!marker || typeof marker !== 'object') return 0;
    var at = Number(marker.appliedAt);
    return isFinite(at) ? at : 0;
  }

  /** True when an attempt record predates the correction. */
  function isStale(record) {
    if (!record || typeof record !== 'object') return false;
    if (Number(record.bankRevision) >= BANK_REVISION) return false;
    var at = cutoff();
    if (!at) return false;
    var ts = Number(record.timestamp);
    if (!isFinite(ts) || ts <= 0) {
      // No usable timestamp and no revision stamp: it cannot be shown to be
      // from the corrected era, so treat it as stale rather than trust it.
      return true;
    }
    return ts < at;
  }

  function noticePending() {
    return read(NOTICE_KEY, false) === true;
  }

  function dismissNotice() {
    write(NOTICE_KEY, false);
  }

  function summary() {
    var marker = read(MARKER_KEY, null) || {};
    return {
      applied: Boolean(marker.appliedAt),
      appliedAt: marker.appliedAt || null,
      affectedAttempts: Number(marker.affectedAttempts) || 0,
      clearedObservations: Number(marker.clearedObservations) || 0,
      bankRevision: BANK_REVISION,
      noticePending: noticePending()
    };
  }

  APlus.bankIntegrity = {
    BANK_REVISION: BANK_REVISION,
    apply: apply,
    cutoff: cutoff,
    isStale: isStale,
    noticePending: noticePending,
    dismissNotice: dismissNotice,
    summary: summary
  };

  // Run at boot as well, so the notice counts are recorded while the learner
  // history module is certainly loaded.
  if (global.document) {
    var boot = function () { try { apply(); } catch (err) { console.warn('[bank-integrity] apply failed:', err); } };
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  if (typeof module === 'object' && module && module.exports) {
    module.exports = APlus.bankIntegrity;
  }
})(typeof window !== 'undefined' ? window : globalThis);
