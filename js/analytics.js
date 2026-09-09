/**
 * Clariora Exam Simulator v3.0.0
 * analytics.js - Domain Performance & Error Taxonomy Analytics Engine
 * File: js/analytics.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  class AnalyticsEngine {
    constructor() {
      this.lastPayload = null;
      this.initBusListeners();
    }

    initBusListeners() {
      if (!APlus.bus) return;

      APlus.bus.on('exam:finished', (payload) => {
        this.lastPayload = payload;
        this.renderAnalyticsPanel(payload);
      });

      // A theme toggle or any other storage write must repaint the panel to
      // the same numbers rather than leaving a stale or empty reading.
      const repaint = () => {
        const panel = document.getElementById('analyticsPanels');
        if (!panel || !panel.innerHTML) return;
        this.renderAnalyticsPanel(this.lastPayload);
      };
      APlus.bus.on('storage:changed', repaint);
      APlus.bus.on('storage:removed', repaint);
      APlus.bus.on('shell:ready', repaint);
    }

    /**
     * The one canonical history reader. This module must never parse storage
     * history itself; if learner_state.js has not loaded there is no history.
     */
    getHistoricalAttempts() {
      try {
        if (APlus.learner && typeof APlus.learner.getHistory === 'function') {
          const rows = APlus.learner.getHistory();
          return Array.isArray(rows) ? rows : [];
        }
      } catch (err) {
        console.warn('[analytics] canonical history read failed:', err);
      }
      console.warn('[analytics] APlus.learner.getHistory is unavailable; no history to report.');
      return [];
    }

    targetExam(payload) {
      try {
        if (payload && payload.examType) {
          const t = String(payload.examType).toLowerCase();
          if (t.indexOf('core2') >= 0) return 'core2';
          if (t.indexOf('core1') >= 0) return 'core1';
          if (t.indexOf('both') >= 0) return 'both';
        }
        if (APlus.onboarding && typeof APlus.onboarding.profileExam === 'function') {
          return APlus.onboarding.profileExam();
        }
      } catch (_) {}
      return 'core1';
    }

    /**
     * readinessSummary(payload) - the single source of every number rendered
     * in the results analytics panel. Identical object to the one the home
     * hero renders, produced by APlus.readiness2.compute + its formatters.
     */
    readinessSummary(payload) {
      const history = this.getHistoricalAttempts();
      const exam = this.targetExam(payload);
      if (!APlus.readiness2 || typeof APlus.readiness2.compute !== 'function') {
        console.warn('[analytics] APlus.readiness2 is unavailable; readiness not shown.');
        return null;
      }
      const result = APlus.readiness2.compute({ exam: exam, history: history });
      return APlus.readiness2.format.summary(result);
    }

    getErrorTaxonomySummary() {
      const journal = APlus.storage ? APlus.storage.get('hansei_journal', []) : [];
      const counts = {};

      journal.forEach(entry => {
        const rc = entry.rootCause || 'unclassified';
        counts[rc] = (counts[rc] || 0) + 1;
      });

      return counts;
    }

    /**
     * Kept for callers that still ask for a readiness index. It is a thin view
     * over readinessSummary(); there is no independent formula here any more.
     */
    calculateReadinessIndex(payload) {
      const sum = this.readinessSummary(payload);
      if (!sum) {
        return { status: 'No attempts yet', predicted: null, readiness: null, passes: 0, passAttempts: 0 };
      }
      return {
        status: sum.statusText,
        predicted: sum.predicted,
        predictedText: sum.predictedText,
        readiness: sum.readiness,
        readinessText: sum.readinessText,
        passes: sum.passes,
        passAttempts: sum.passAttempts,
        passRateText: sum.passRateText
      };
    }

    renderAnalyticsPanel(payload) {
      const panel = document.getElementById('analyticsPanels');
      if (!panel) return;

      const sum = this.readinessSummary(payload);
      const errorTax = this.getErrorTaxonomySummary();

      const taxLabels = {
        misread_stem: 'Misread the stem',
        knowledge_gap: 'Knowledge gap',
        tricky_distractor: 'Picked a distractor',
        order_calc_error: 'Sequence or calculation',
        rushed_guess: 'Guessed under time pressure'
      };

      const taxKeys = Object.keys(errorTax).sort((a, b) => errorTax[b] - errorTax[a]);
      let taxHtml = taxKeys.map(k =>
        '<div class="mistake-row">' +
          '<span class="name">' + escapeHTML(taxLabels[k] || k) + '</span>' +
          '<span class="pct tnum">' + errorTax[k] + '</span>' +
        '</div>'
      ).join('');

      if (!taxHtml) {
        taxHtml = '<p class="hint">Nothing logged yet. Use "Log why I missed this" in the review list.</p>';
      }

      const statusLabel = sum ? sum.statusText : 'No attempts yet';
      const readinessLabel = sum ? sum.readinessText : '--';
      const predictedLabel = sum ? sum.predictedText : '--';
      const passLabel = sum ? sum.passRateText : 'No attempts yet';

      panel.innerHTML = `
        <div class="analytics-card">
          <div class="label">Performance</div>
          <div class="stat-grid">
            <div class="stat-cell">
              <div class="label">Estimated readiness</div>
              <div class="value stat-display tnum">${escapeHTML(readinessLabel)}</div>
              <div class="sub tnum">${escapeHTML(statusLabel)}. Predicted score ${escapeHTML(predictedLabel)} of 900</div>
            </div>
            <div class="stat-cell">
              <div class="label">Recent pass rate</div>
              <div class="value stat-display tnum">${escapeHTML(passLabel)}</div>
              <div class="sub">Last 10 attempts for this exam</div>
            </div>
          </div>
          <div class="label">Common mistake types</div>
          <div class="mistake-list">
            ${taxHtml}
          </div>
        </div>
      `;
    }
  }

  APlus.analytics = new AnalyticsEngine();

})(typeof window !== 'undefined' ? window : this);
