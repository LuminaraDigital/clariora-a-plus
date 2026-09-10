/**
 * js/crucible-ui.js - Clariora Level 4: Datacenter Crucible UI Adapter
 *
 * Renders the human-native mechanics for Level 4:
 * 1. Pacing Horizon toolbar bar.
 * 2. Diagnostic Commitment Gate (strikethrough & flaw tags).
 * 3. Instinct & Panic Behavioral Telemetry Audit.
 * 4. 4-Quadrant Root-Cause Incident Post-Mortem.
 * 5. Crucible Mode toggle & environment switch.
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrucibleUI = factory();
    if (root.APlus) {
      root.APlus.crucibleUI = root.CrucibleUI;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const STORAGE_KEY = 'aplus_crucible_mode_v1';
  let cadenceCalc = null;
  let activeMutationTracker = null;

  function isCrucibleActive() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setCrucibleActive(enable) {
    try {
      localStorage.setItem(STORAGE_KEY, enable ? '1' : '0');
    } catch (e) {}

    if (enable) {
      document.body.classList.add('crucible-active');
    } else {
      document.body.classList.remove('crucible-active');
    }

    // Synchronize any toggle buttons in the DOM
    document.querySelectorAll('.crucible-switch-container').forEach(el => {
      if (enable) el.classList.add('active');
      else el.classList.remove('active');
    });

    const badge = document.getElementById('crucibleHeaderBadge');
    if (badge) {
      badge.style.display = enable ? 'inline-flex' : 'none';
    }
  }

  function toggleCrucible() {
    setCrucibleActive(!isCrucibleActive());
  }

  // =========================================================================
  // TOOLBAR: PACING HORIZON
  // =========================================================================

  function renderToolbarPacing(currentIndex, remainingSeconds, totalQuestions, totalSeconds) {
    let container = document.getElementById('cruciblePacingHorizon');
    if (!container) {
      const timerDisplay = document.getElementById('timerDisplay');
      if (!timerDisplay || !timerDisplay.parentNode) return;
      container = document.createElement('div');
      container.id = 'cruciblePacingHorizon';
      container.className = 'pacing-horizon-container';
      timerDisplay.parentNode.insertBefore(container, timerDisplay);
    }

    if (!isCrucibleActive()) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    if (!cadenceCalc || cadenceCalc.totalQuestions !== totalQuestions) {
      const Engine = window.CrucibleEngine || (window.APlus && window.APlus.crucibleEngine);
      if (!Engine) return;
      cadenceCalc = new Engine.CadenceCalculator(totalQuestions, totalSeconds, 60);
    }

    const state = cadenceCalc.calculate(currentIndex, remainingSeconds);

    let statusText = 'Nominal (+PBQ Bank)';
    if (state.status === 'lagging') statusText = 'Pacing Lag';
    if (state.status === 'critical') statusText = 'Critical Deficit';

    container.innerHTML = `
      <div class="pacing-horizon-header">
        <span class="pacing-label">PBQ Reserve:</span>
        <span class="pacing-reserve-val ${state.status}">${state.formattedReserve} (${statusText})</span>
      </div>
      <div class="pacing-track" title="Pacing Horizon: target 60s per multiple choice question">
        <div class="pacing-fill ${state.status}" style="width: ${state.fillPct}%"></div>
      </div>
    `;
  }

  // =========================================================================
  // QUESTION OPTIONS: DIAGNOSTIC COMMITMENT GATE
  // =========================================================================

  function enhanceQuestionOptions(optionsContainer, qIndex, question, onOptionChosen) {
    if (!optionsContainer || !isCrucibleActive()) return;

    const items = optionsContainer.querySelectorAll('.option-item');
    items.forEach((item, optIdx) => {
      // Avoid duplicate enhancement
      if (item.querySelector('.crucible-strike-btn')) return;

      const strikeBtn = document.createElement('button');
      strikeBtn.type = 'button';
      strikeBtn.className = 'crucible-strike-btn';
      strikeBtn.title = 'Eliminate this distractor with diagnostic rationale';
      strikeBtn.innerHTML = `<span>&times; Eliminate</span>`;

      // Prevent triggering option select when clicking eliminate
      strikeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isStruck = item.classList.toggle('eliminated');
        strikeBtn.classList.toggle('struck', isStruck);

        if (isStruck) {
          strikeBtn.innerHTML = `<span>&#10003; Struck</span>`;
          if (!item.querySelector('.flaw-tag')) {
            const flawTag = document.createElement('span');
            flawTag.className = 'flaw-tag';
            flawTag.textContent = 'Distractor Eliminated';
            item.appendChild(flawTag);
          }
        } else {
          strikeBtn.innerHTML = `<span>&times; Eliminate</span>`;
          const existingTag = item.querySelector('.flaw-tag');
          if (existingTag) existingTag.remove();
        }

        if (activeMutationTracker) {
          activeMutationTracker.recordElimination(qIndex, optIdx, isStruck, question.id);
        }
      });

      item.insertBefore(strikeBtn, item.firstChild);
    });
  }

  // =========================================================================
  // RESULTS: INSTINCT AUDIT & 4-QUADRANT POST-MORTEM
  // =========================================================================

  function renderResultsDebrief(resultsScreen, session, questions, userAnswers, mutationTracker) {
    if (!resultsScreen || !isCrucibleActive()) return;

    // 1. Render Instinct & Panic Telemetry Card
    let auditPanel = document.getElementById('crucibleAuditPanel');
    if (!auditPanel) {
      auditPanel = document.createElement('div');
      auditPanel.id = 'crucibleAuditPanel';
      auditPanel.className = 'crucible-audit-panel';
      const domainReport = resultsScreen.querySelector('.domain-report');
      if (domainReport) {
        resultsScreen.insertBefore(auditPanel, domainReport);
      } else {
        resultsScreen.appendChild(auditPanel);
      }
    }

    const auditData = mutationTracker ? mutationTracker.getAuditSummary() : null;
    if (auditData) {
      auditPanel.innerHTML = `
        <div class="crucible-audit-header">
          <div class="crucible-audit-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Instinct & Behavioral Telemetry Audit
          </div>
          <span class="crucible-badge">Level 4 Craft</span>
        </div>
        <div class="crucible-audit-grid">
          <div class="crucible-audit-stat">
            <div class="crucible-audit-stat-label">Answer Mutations</div>
            <div class="crucible-audit-stat-value">${auditData.totalSwitches}</div>
            <div class="crucible-audit-stat-sub">Times answer was altered</div>
          </div>
          <div class="crucible-audit-stat">
            <div class="crucible-audit-stat-label">Instinct Betrayals</div>
            <div class="crucible-audit-stat-value cr-text-red">${auditData.correctToWrong}</div>
            <div class="crucible-audit-stat-sub">Correct switched to wrong</div>
          </div>
          <div class="crucible-audit-stat">
            <div class="crucible-audit-stat-label">Calibrated Corrections</div>
            <div class="crucible-audit-stat-value cr-text-green">${auditData.wrongToCorrect}</div>
            <div class="crucible-audit-stat-sub">Wrong switched to correct</div>
          </div>
          <div class="crucible-audit-stat">
            <div class="crucible-audit-stat-label">Net Score Impact</div>
            <div class="crucible-audit-stat-value ${auditData.netScoreImpact >= 0 ? 'cr-text-green' : 'cr-text-red'}">
              ${auditData.netScoreImpact >= 0 ? '+' : ''}${auditData.netScoreImpact}
            </div>
            <div class="crucible-audit-stat-sub">Estimated scaled points</div>
          </div>
        </div>
        <div class="crucible-psych-verdict">
          <strong>Behavioral Analysis:</strong> ${auditData.verdictText}
        </div>
      `;
    }

    // 2. Render 4-Quadrant Root-Cause Incident Post-Mortem
    const Engine = window.CrucibleEngine || (window.APlus && window.APlus.crucibleEngine);
    if (!Engine || !Engine.RootCauseClassifier) return;

    const postMortem = Engine.RootCauseClassifier.generatePostMortem(questions, userAnswers, mutationTracker);

    let postMortemPanel = document.getElementById('cruciblePostMortemPanel');
    if (!postMortemPanel) {
      postMortemPanel = document.createElement('div');
      postMortemPanel.id = 'cruciblePostMortemPanel';
      postMortemPanel.className = 'post-mortem-section';
      const domainReport = resultsScreen.querySelector('.domain-report');
      if (domainReport) {
        domainReport.parentNode.insertBefore(postMortemPanel, domainReport.nextSibling);
      } else {
        resultsScreen.appendChild(postMortemPanel);
      }
    }

    const kg = postMortem.categories.KNOWLEDGE_GAP;
    const sm = postMortem.categories.STEM_MISREAD;
    const pp = postMortem.categories.PACING_PANIC;
    const ds = postMortem.categories.DOUBT_SWITCH;

    postMortemPanel.innerHTML = `
      <div class="post-mortem-header">
        <div class="post-mortem-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Root-Cause Incident Post-Mortem
        </div>
        <span class="post-mortem-total-label">
          Total Faults: ${postMortem.totalErrors}
        </span>
      </div>
      <div class="post-mortem-grid">
        <!-- 1. Knowledge Gap -->
        <div class="post-mortem-quadrant quadrant-knowledge">
          <div>
            <div class="quadrant-head">
              <span class="quadrant-name">1. Knowledge Gap</span>
              <span class="quadrant-count">${kg.count}</span>
            </div>
            <p class="quadrant-desc">Technical specification, port number, or command syntax unfamiliarity.</p>
          </div>
          <button type="button" class="quadrant-action-btn" onclick="CrucibleUI.launchRemediation('KNOWLEDGE_GAP')">
            Launch Knowledge Drill &rarr;
          </button>
        </div>

        <!-- 2. Stem Misread -->
        <div class="post-mortem-quadrant quadrant-misread">
          <div>
            <div class="quadrant-head">
              <span class="quadrant-name">2. Stem Misread</span>
              <span class="quadrant-count">${sm.count}</span>
            </div>
            <p class="quadrant-desc">Overlooked scenario qualifiers: FIRST, BEST, LEAST, NOT, or NEXT step priority.</p>
          </div>
          <button type="button" class="quadrant-action-btn" onclick="CrucibleUI.launchRemediation('STEM_MISREAD')">
            Review Qualifying Traps &rarr;
          </button>
        </div>

        <!-- 3. Pacing Panic -->
        <div class="post-mortem-quadrant quadrant-pacing">
          <div>
            <div class="quadrant-head">
              <span class="quadrant-name">3. Pacing Panic</span>
              <span class="quadrant-count">${pp.count}</span>
            </div>
            <p class="quadrant-desc">Anomalous velocity: rushed blind clicks (&lt;15s) or paralysis stalls (&gt;150s).</p>
          </div>
          <button type="button" class="quadrant-action-btn" onclick="CrucibleUI.launchRemediation('PACING_PANIC')">
            Practice 60s Speed Drill &rarr;
          </button>
        </div>

        <!-- 4. Doubt Switch -->
        <div class="post-mortem-quadrant quadrant-doubt">
          <div>
            <div class="quadrant-head">
              <span class="quadrant-name">4. Doubt Switch</span>
              <span class="quadrant-count">${ds.count}</span>
            </div>
            <p class="quadrant-desc">Original correct technical deduction abandoned for an incorrect distractor.</p>
          </div>
          <button type="button" class="quadrant-action-btn" onclick="CrucibleUI.launchRemediation('DOUBT_SWITCH')">
            Drill Instinct Conviction &rarr;
          </button>
        </div>
      </div>
    `;
  }

  function launchRemediation(categoryKey) {
    if (typeof window.startMissedDrill === 'function') {
      window.startMissedDrill();
    } else {
      alert('Launching targeted remediation drill for ' + categoryKey);
    }
  }

  // =========================================================================
  // INIT & SETUP
  // =========================================================================

  function init() {
    const Engine = window.CrucibleEngine || (window.APlus && window.APlus.crucibleEngine);
    if (Engine) {
      activeMutationTracker = new Engine.MutationTracker();
    }

    // Default to Crucible mode active for Level 4 experience
    if (localStorage.getItem(STORAGE_KEY) === null) {
      setCrucibleActive(true);
    } else {
      setCrucibleActive(isCrucibleActive());
    }

    // Mount header toggle if brand exists
    const brand = document.querySelector('.brand');
    if (brand && !document.getElementById('crucibleToggleBtn')) {
      const toggle = document.createElement('div');
      toggle.id = 'crucibleToggleBtn';
      toggle.className = 'crucible-switch-container' + (isCrucibleActive() ? ' active' : '');
      toggle.title = 'Toggle Level 4 Datacenter Crucible Mode';
      toggle.innerHTML = `
        <span class="crucible-switch-label">Crucible</span>
        <div class="crucible-switch-pill"><div class="crucible-switch-dot"></div></div>
      `;
      toggle.addEventListener('click', toggleCrucible);
      brand.parentNode.insertBefore(toggle, brand.nextSibling);
    }
  }

  return {
    init: init,
    isCrucibleActive: isCrucibleActive,
    setCrucibleActive: setCrucibleActive,
    toggleCrucible: toggleCrucible,
    renderToolbarPacing: renderToolbarPacing,
    enhanceQuestionOptions: enhanceQuestionOptions,
    renderResultsDebrief: renderResultsDebrief,
    launchRemediation: launchRemediation,
    getMutationTracker: function () { return activeMutationTracker; },
    resetMutationTracker: function () {
      if (activeMutationTracker) activeMutationTracker.reset();
    }
  };
});
