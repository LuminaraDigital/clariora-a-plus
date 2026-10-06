/**
 * course-switch.js - Remount home surfaces when the certification track changes.
 *
 * The header selector used to update a global and leave readiness, the
 * objective heatmap, the diagnostic, and the mock cards on the previous course.
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};
  var APlus = window.APlus;

  function honesty() {
    return APlus.honesty || null;
  }

  function surfaces(trackId) {
    var H = honesty();
    if (H && typeof H.courseSurfaces === 'function') return H.courseSurfaces(trackId);
    var exam = (trackId === 'core1' || trackId === 'core2') ? trackId : null;
    return {
      trackId: trackId || 'core1',
      exam: exam,
      remount: ['readiness', 'objectives', 'diagnostic', 'mocks']
    };
  }

  function activeTrackId() {
    try {
      if (APlus.trackRegistry && typeof APlus.trackRegistry.getActiveTrackId === 'function') {
        return APlus.trackRegistry.getActiveTrackId();
      }
    } catch (_) {}
    return 'core1';
  }

  function remountReadiness() {
    try {
      if (APlus.readinessUI && typeof APlus.readinessUI.render === 'function') {
        APlus.readinessUI.render();
      }
    } catch (err) {
      console.warn('[course-switch] readiness remount failed:', err);
    }
  }

  function remountObjectives(exam) {
    if (exam !== 'core1' && exam !== 'core2') return;
    try {
      if (!APlus.masteryHeatmap || typeof APlus.masteryHeatmap.render !== 'function') return;
      APlus.masteryHeatmap.selectedExam = exam;
      var mount = document.getElementById('masteryHeatmapMount');
      if (mount) APlus.masteryHeatmap.render(mount);
    } catch (err) {
      console.warn('[course-switch] objectives remount failed:', err);
    }
  }

  function remountDiagnostic(exam) {
    var H = honesty();
    var offer = (H && typeof H.diagnosticOffer === 'function')
      ? H.diagnosticOffer(exam || 'core1')
      : null;
    if (!offer) return;
    var heading = document.getElementById('shellDiagnosticHeading');
    if (heading) heading.textContent = offer.takeLabel + ' to get your readiness score.';
    var btn = document.getElementById('shellDiagnosticBtn');
    if (btn) btn.textContent = offer.startLabel;
    var heroBtn = document.getElementById('heroDiagnosticBtn');
    if (heroBtn) heroBtn.textContent = offer.takeLabel;
  }

  function remountMocks(trackId) {
    var grid = document.querySelector('.mock-grid');
    if (!grid) return;
    var cards = grid.querySelectorAll(':scope > .card[data-course]');
    var active = null;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var on = card.getAttribute('data-course') === trackId;
      card.classList.toggle('is-active-course', on);
      if (on) active = card;
    }
    if (active && active.parentNode) {
      active.parentNode.insertBefore(active, active.parentNode.firstChild);
    }
    var heading = document.getElementById('mockExamsHeading');
    if (heading && APlus.trackRegistry && typeof APlus.trackRegistry.getTrack === 'function') {
      var track = APlus.trackRegistry.getTrack(trackId);
      if (track && track.title) heading.textContent = track.title + ' mock';
    }
  }

  function remount(track) {
    var id = (track && track.id) || activeTrackId();
    var model = surfaces(id);
    if (typeof document === 'undefined') return model;
    var root = document.getElementById('startScreen');
    if (root) root.setAttribute('data-active-course', id);
    remountReadiness();
    remountObjectives(model.exam);
    remountDiagnostic(model.exam || id);
    remountMocks(id);
    return model;
  }

  function startPlacementDiagnostic() {
    var id = activeTrackId();
    var model = surfaces(id);
    var exam = model.exam || 'core1';
    var H = honesty();
    var offer = (H && typeof H.diagnosticOffer === 'function')
      ? H.diagnosticOffer(exam)
      : { count: 20, minutes: 20 };
    try {
      if (APlus.onboarding && typeof APlus.onboarding.start === 'function') {
        var profile = (typeof APlus.onboarding.getProfile === 'function')
          ? APlus.onboarding.getProfile()
          : null;
        var needsWizard = !profile || (!profile.completedAt && !profile.skippedAt);
        if (needsWizard) {
          APlus.onboarding.start(true);
          return;
        }
      }
    } catch (err) {
      console.warn('[course-switch] onboarding check failed:', err);
    }
    syncDiagnosticLabels(offer.count);
    try {
      if (APlus.engine && typeof APlus.engine.start === 'function') {
        APlus.engine.start({
          type: exam,
          questionCount: offer.count,
          timeMinutes: offer.minutes,
          mode: 'diagnostic'
        });
        return;
      }
    } catch (err) {
      console.warn('[course-switch] diagnostic start failed:', err);
    }
    if (typeof window.startExam === 'function') {
      window.startExam(exam, offer.count, offer.minutes, 'diagnostic');
    }
  }

  function syncDiagnosticLabels(count) {
    var H = honesty();
    if (!H || !count) return;
    var heading = document.getElementById('shellDiagnosticHeading');
    if (heading && typeof H.diagnosticTakeLabel === 'function') {
      heading.textContent = H.diagnosticTakeLabel(count) + ' to get your readiness score.';
    }
    var btn = document.getElementById('shellDiagnosticBtn');
    if (btn && typeof H.diagnosticStartLabel === 'function') btn.textContent = H.diagnosticStartLabel(count);
    var heroBtn = document.getElementById('heroDiagnosticBtn');
    if (heroBtn && typeof H.diagnosticTakeLabel === 'function') heroBtn.textContent = H.diagnosticTakeLabel(count);
  }

  function boot() {
    try {
      if (APlus.trackRegistry && typeof APlus.trackRegistry.onTrackChange === 'function') {
        APlus.trackRegistry.onTrackChange(function (track) { remount(track); });
      }
    } catch (err) {
      console.warn('[course-switch] listener failed:', err);
    }
    remount();
    try {
      if (APlus.bus && typeof APlus.bus.on === 'function') {
        APlus.bus.on('exam:started', function (payload) {
          if (!payload || payload.mode !== 'diagnostic') return;
          syncDiagnosticLabels(payload.totalQuestions);
        });
      }
    } catch (err) {
      console.warn('[course-switch] diagnostic label sync failed:', err);
    }
  }

  APlus.courseSwitch = {
    surfaces: surfaces,
    remount: remount,
    startPlacementDiagnostic: startPlacementDiagnostic
  };
  window.startPlacementDiagnostic = startPlacementDiagnostic;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        window.setTimeout(boot, 0);
      });
    } else {
      window.setTimeout(boot, 0);
    }
  }
})(typeof window !== 'undefined' ? window : this);
