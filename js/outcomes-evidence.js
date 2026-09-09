/**
 * Clariora - Outcome Evidence Panel
 * Attempt metrics read from local history.
 * File: js/outcomes-evidence.js
 *
 * Local metrics only. No claim about any real exam result.
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const SNAPSHOT_KEY = 'outcomes_snapshot';
  const STYLE_ID = 'aplus-outcomes-evidence-styles';

  const escapeHTML =
    (APlus.utils && APlus.utils.escapeHTML) ||
    function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

  /** The one canonical history reader. Never parse storage history here. */
  function getHistory() {
    try {
      if (APlus.learner && typeof APlus.learner.getHistory === 'function') {
        const rows = APlus.learner.getHistory();
        return Array.isArray(rows) ? rows : [];
      }
    } catch (err) {
      console.warn('[outcomes] canonical history read failed:', err);
    }
    return [];
  }

  /**
   * The same compute call and the same formatters the home hero and the
   * results analytics panel use. Returns null when readiness2 is not loaded.
   */
  function getSummary(history) {
    try {
      if (!APlus.readiness2 || typeof APlus.readiness2.compute !== 'function') return null;
      const exam = (APlus.onboarding && typeof APlus.onboarding.profileExam === 'function')
        ? APlus.onboarding.profileExam()
        : 'core1';
      const result = APlus.readiness2.compute({ exam: exam, history: history || getHistory() });
      return APlus.readiness2.format.summary(result);
    } catch (err) {
      console.warn('[outcomes] readiness summary failed:', err);
      return null;
    }
  }

  /**
   * computeMetrics(history, summary)
   *
   * Descriptive facts about the stored attempts only. Every judgement about
   * readiness (the status line and the pass rate string) comes from the
   * canonical readiness2 summary, so this panel cannot disagree with the home
   * hero or the results panel.
   */
  function computeMetrics(history, summary) {
    const rows = Array.isArray(history) ? history : [];
    const sum = summary || getSummary(rows);
    const attempts = rows.length;

    // History is newest-first; trend shows oldest -> newest among last 5.
    const recentNewestFirst = rows.slice(0, 5);
    const last5Trend = recentNewestFirst
      .slice()
      .reverse()
      .map(function (h) {
        return Number(h && h.scaledScore) || 0;
      });

    let bestScore = null;
    rows.forEach(function (h) {
      const s = Number(h && h.scaledScore);
      if (!isNaN(s) && (bestScore === null || s > bestScore)) bestScore = s;
    });

    const passedCount = rows.filter(function (h) { return h && h.passed === true; }).length;

    return {
      attempts: attempts,
      bestScore: bestScore,
      last5Trend: last5Trend,
      passedCount: passedCount,
      // Canonical, shared with the hero and the results analytics panel.
      passRateText: sum ? sum.passRateText : 'No attempts yet',
      passes: sum ? sum.passes : 0,
      passAttempts: sum ? sum.passAttempts : 0,
      readinessText: sum ? sum.readinessText : '--',
      predictedText: sum ? sum.predictedText : '--',
      readinessHint: sum
        ? (sum.hasData
            ? sum.statusText + '. Predicted score ' + sum.predictedText + ' of 900, readiness ' + sum.readinessText + '.'
            : 'No attempts yet. Finish a timed exam to get a reading.')
        : 'No attempts yet. Finish a timed exam to get a reading.',
      hasData: sum ? sum.hasData : false,
      avgRecent:
        last5Trend.length > 0
          ? Math.round(last5Trend.reduce(function (a, b) { return a + b; }, 0) / last5Trend.length)
          : null
    };
  }

  function buildAnonymizedSnapshot(metrics) {
    return {
      v: 1,
      attempts: metrics.attempts,
      recent_passes: metrics.passes,
      recent_attempts: metrics.passAttempts,
      best_scaled: metrics.bestScore,
      last5_scaled: metrics.last5Trend.slice(),
      readiness_hint_code: readinessCode(metrics),
      updated_at: new Date().toISOString()
    };
  }

  /** Derived from the canonical readiness only, no second formula. */
  function readinessCode(metrics) {
    if (!metrics.hasData) return 'none';
    const status = String(metrics.readinessHint || '');
    if (status.indexOf('Ready to book') === 0) return 'ready';
    if (status.indexOf('Close') === 0) return 'approaching';
    if (metrics.attempts < 3) return 'early';
    return 'needs_work';
  }

  let lastSnapshotJson = null;

  /**
   * Writing the snapshot emits storage:changed, and this panel listens to
   * storage:changed. Only write when the payload actually changed, and ignore
   * the field that changes on every call, or the two feed each other forever.
   */
  function persistSnapshot(metrics) {
    const snap = buildAnonymizedSnapshot(metrics);
    const comparable = JSON.stringify(Object.assign({}, snap, { updated_at: null }));
    if (comparable === lastSnapshotJson) return snap;
    lastSnapshotJson = comparable;
    if (APlus.storage && typeof APlus.storage.set === 'function') {
      APlus.storage.set(SNAPSHOT_KEY, snap);
    }
    return snap;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.oe-panel{background:#0a0a0a;border:1px solid var(--border-gold,rgba(212,175,55,0.5));',
      'border-radius:8px;padding:1rem 1.1rem;color:var(--text-primary,#f5f5f5);}',
      '.oe-panel h4{margin:0 0 0.65rem;font-size:0.95rem;font-weight:700;',
      'color:var(--gold-light,#F5D061);letter-spacing:0.02em;}',
      '.oe-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:0.65rem;',
      'margin-bottom:0.75rem;}',
      '.oe-stat{background:#111;border:1px solid rgba(212,175,55,0.28);border-radius:6px;padding:0.55rem 0.65rem;}',
      '.oe-stat .oe-label{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;',
      'color:var(--text-secondary,#a3a3a3);}',
      '.oe-stat .oe-value{font-size:1.15rem;font-weight:700;font-family:ui-monospace,monospace;',
      'color:var(--gold-light,#F5D061);margin-top:0.15rem;}',
      '.oe-trend{font-family:ui-monospace,monospace;font-size:0.82rem;color:var(--gold-primary,#D4AF37);',
      'margin:0.35rem 0 0.5rem;word-break:break-word;}',
      '.oe-hint{font-size:0.82rem;color:var(--text-secondary,#a3a3a3);line-height:1.4;margin:0;}',
      '.oe-note{font-size:0.72rem;color:var(--text-secondary,#737373);margin:0.55rem 0 0;}',
      '.oe-details{margin-top:0.75rem;}',
      '.oe-details > summary{cursor:pointer;font-size:0.88rem;font-weight:600;',
      'color:var(--gold-light,#F5D061);list-style:none;}',
      '.oe-details > summary::-webkit-details-marker{display:none;}'
    ].join('');
    document.head.appendChild(style);
  }

  function formatTrend(trend) {
    if (!trend || trend.length === 0) return 'No recent scores';
    return trend.join(' -> ');
  }

  function renderPanelHtml(metrics) {
    const attempts = String(metrics.attempts);
    // Use ASCII hyphen placeholders only (no em/en dash characters).
    const passDisplay = metrics.passRateText;
    const bestDisplay = metrics.bestScore == null ? '--' : String(metrics.bestScore);

    return [
      '<div class="oe-panel" role="region" aria-label="Your record">',
      '<div class="label">Your record</div>',
      '<div class="oe-grid">',
      '<div class="oe-stat"><div class="oe-label label">Attempts</div>',
      '<div class="oe-value tnum">' + escapeHTML(attempts) + '</div></div>',
      '<div class="oe-stat"><div class="oe-label label">Recent pass rate</div>',
      '<div class="oe-value tnum">' + escapeHTML(passDisplay) + '</div></div>',
      '<div class="oe-stat"><div class="oe-label label">Best score</div>',
      '<div class="oe-value tnum">' + escapeHTML(bestDisplay) + '</div></div>',
      '</div>',
      '<div class="oe-label label">Last 5 scaled scores</div>',
      '<div class="oe-trend tnum">' + escapeHTML(formatTrend(metrics.last5Trend)) + '</div>',
      '<div class="oe-label label">Estimated readiness</div>',
      '<p class="oe-hint">' + escapeHTML(metrics.readinessHint) + '</p>',
      '<p class="oe-note">Kept on this device only. Not a Pearson VUE result.</p>',
      '</div>'
    ].join('');
  }

  function resolveMount(explicitMount) {
    if (explicitMount) {
      if (typeof explicitMount === 'string') {
        return document.querySelector(explicitMount);
      }
      return explicitMount;
    }

    let mount = document.getElementById('outcomesEvidenceMount');
    if (mount) return mount;

    const settings =
      document.getElementById('settingsPanel') ||
      document.getElementById('settingsScreen') ||
      document.getElementById('settingsMount');
    if (settings) {
      mount = document.createElement('div');
      mount.id = 'outcomesEvidenceMount';
      settings.appendChild(mount);
      return mount;
    }

    const start = document.getElementById('startScreen');
    if (!start) return null;

    let details = document.getElementById('outcomesEvidenceDetails');
    if (!details) {
      details = document.createElement('details');
      details.id = 'outcomesEvidenceDetails';
      details.className = 'oe-details';
      const summary = document.createElement('summary');
      summary.textContent = 'Your record';
      details.appendChild(summary);
      mount = document.createElement('div');
      mount.id = 'outcomesEvidenceMount';
      mount.style.marginTop = '0.65rem';
      details.appendChild(mount);
      const historyCard = start.querySelector('.history-card');
      if (historyCard && historyCard.parentNode) {
        historyCard.parentNode.insertBefore(details, historyCard.nextSibling);
      } else {
        start.appendChild(details);
      }
    } else {
      mount = document.getElementById('outcomesEvidenceMount');
      if (!mount) {
        mount = document.createElement('div');
        mount.id = 'outcomesEvidenceMount';
        details.appendChild(mount);
      }
    }
    return mount;
  }

  function render(mountArg) {
    ensureStyles();
    const mount = resolveMount(mountArg);
    if (!mount) return null;

    const history = getHistory();
    const metrics = computeMetrics(history, getSummary(history));
    persistSnapshot(metrics);
    mount.innerHTML = renderPanelHtml(metrics);
    return metrics;
  }

  function refresh() {
    return render(document.getElementById('outcomesEvidenceMount') || undefined);
  }

  function boot() {
    render();
    if (APlus.bus && typeof APlus.bus.on === 'function') {
      APlus.bus.on('exam:finished', function () {
        refresh();
      });
      // Any storage write, including a theme toggle, repaints to the same
      // canonical numbers rather than leaving a stale reading behind. This
      // panel's own snapshot write is skipped so the two cannot loop.
      const onStorage = function (payload) {
        const key = payload && payload.key ? String(payload.key) : '';
        if (key.indexOf(SNAPSHOT_KEY) !== -1) return;
        refresh();
      };
      APlus.bus.on('storage:changed', onStorage);
      APlus.bus.on('storage:removed', onStorage);
      APlus.bus.on('shell:ready', function () { refresh(); });
    }
  }

  window.APlusOutcomes = {
    render: render,
    refresh: refresh,
    computeMetrics: computeMetrics
  };

  APlus.outcomesEvidence = window.APlusOutcomes;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
