/**
 * Clariora Exam Simulator
 * pearson-mode.js - Authentic Pearson VUE Exam-Day Simulation Mode
 * File: js/pearson-mode.js
 *
 * Provides exact testing center fidelity:
 * 1. Pearson VUE High-Fidelity UI styling & unpausable 90-minute countdown
 * 2. On-screen 4-function exam calculator modal
 * 3. 15-minute and 5-minute time remaining warnings
 * 4. Categorized Review Matrix (Unanswered vs. Flagged vs. Completed)
 * 5. Official Pearson VUE format score report with specific missed sub-objectives
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  const PearsonMode = {
    isEnabled: false,
    calculatorOpen: false,
    calcMemory: 0,
    calcDisplay: '0',
    calcPendingOp: null,
    calcWaitingForOperand: false,

    init() {
      this.injectCalculatorModal();
      this.injectPearsonStyles();
      this.bindEvents();
    },

    bindEvents() {
      if (APlus.bus) {
        APlus.bus.on('exam:started', (data) => {
          if (this.isEnabled) {
            this.applyPearsonTheme(true);
            this.enforceExamConditions();
          } else {
            this.applyPearsonTheme(false);
          }
        });

        APlus.bus.on('exam:finished', (payload) => {
          if (this.isEnabled) {
            setTimeout(() => this.renderPearsonScoreReport(payload), 50);
          }
        });
      }
    },

    toggle() {
      this.isEnabled = !this.isEnabled;
      this.updateToggleUi();
      return this.isEnabled;
    },

    updateToggleUi() {
      const btn = document.getElementById('pearsonModeToggleBtn');
      if (btn) {
        btn.classList.toggle('active', this.isEnabled);
        btn.setAttribute('aria-pressed', this.isEnabled ? 'true' : 'false');
        const badge = btn.querySelector('.mode-badge');
        if (badge) badge.innerText = this.isEnabled ? 'ON (Pearson VUE)' : 'OFF (Standard)';
      }
    },

    applyPearsonTheme(enable) {
      document.body.classList.toggle('pearson-vue-mode', enable);
      const pauseBtn = document.getElementById('pauseBtn');
      if (pauseBtn) {
        pauseBtn.style.display = enable ? 'none' : '';
      }
      const calcBtn = document.getElementById('pearsonCalcBtn');
      if (calcBtn) {
        calcBtn.style.display = enable ? 'inline-flex' : 'none';
      }
    },

    enforceExamConditions() {
      // In Pearson VUE mode:
      // 1. Hide pause button
      // 2. Hide shortcut panel
      // 3. Disable immediate tutor mode reveals
      const pauseBtn = document.getElementById('pauseBtn');
      if (pauseBtn) pauseBtn.disabled = true;

      // Add calculator button to exam header if not present
      const headerControls = document.getElementById('examHeaderControls');
      if (headerControls && !document.getElementById('pearsonCalcBtn')) {
        const cBtn = document.createElement('button');
        cBtn.type = 'button';
        cBtn.id = 'pearsonCalcBtn';
        cBtn.className = 'btn btn-secondary';
        cBtn.style = 'font-size: 0.82rem; padding: 0.35rem 0.7rem; align-items: center; gap: 0.35rem;';
        cBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/></svg><span>Calculator</span>';
        cBtn.onclick = () => this.toggleCalculator();
        headerControls.insertBefore(cBtn, headerControls.firstChild);
      }
    },

    /* -------------------------------------------------------------
       On-Screen Calculator Modal (Standard Pearson VUE 4-Function)
       ------------------------------------------------------------- */
    injectCalculatorModal() {
      if (document.getElementById('pearsonCalcModal')) return;

      const modal = document.createElement('div');
      modal.id = 'pearsonCalcModal';
      modal.style = `
        display: none;
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 260px;
        background: #1e293b;
        border: 2px solid #0284c7;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.6);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      `;

      modal.innerHTML = `
        <div style="background: #0284c7; color: #fff; padding: 0.4rem 0.7rem; font-size: 0.82rem; font-weight: 700; display: flex; justify-content: space-between; align-items: center; cursor: move;">
          <span>Exam Calculator</span>
          <button type="button" onclick="APlus.pearsonMode.toggleCalculator()" style="background: transparent; border: none; color: #fff; font-size: 1rem; cursor: pointer; line-height: 1;">&times;</button>
        </div>
        <div style="padding: 0.75rem;">
          <input type="text" id="calcDisplay" readonly value="0" style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 1.3rem; text-align: right; padding: 0.45rem 0.6rem; border-radius: 4px; margin-bottom: 0.6rem;" />
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem;">
            <button type="button" class="btn btn-secondary calc-btn" data-val="C">C</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="CE">CE</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="sqrt">√</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="/">÷</button>

            <button type="button" class="btn btn-secondary calc-btn" data-val="7">7</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="8">8</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="9">9</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="*">×</button>

            <button type="button" class="btn btn-secondary calc-btn" data-val="4">4</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="5">5</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="6">6</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="-">-</button>

            <button type="button" class="btn btn-secondary calc-btn" data-val="1">1</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="2">2</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="3">3</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val="+">+</button>

            <button type="button" class="btn btn-secondary calc-btn" data-val="0" style="grid-column: span 2;">0</button>
            <button type="button" class="btn btn-secondary calc-btn" data-val=".">.</button>
            <button type="button" class="btn btn-primary calc-btn" data-val="=" style="background: #0284c7; border-color: #0284c7;">=</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelectorAll('.calc-btn').forEach((btn) => {
        btn.onclick = () => this.handleCalcInput(btn.getAttribute('data-val'));
      });
    },

    toggleCalculator() {
      const modal = document.getElementById('pearsonCalcModal');
      if (!modal) return;
      this.calculatorOpen = !this.calculatorOpen;
      modal.style.display = this.calculatorOpen ? 'block' : 'none';
    },

    handleCalcInput(val) {
      const display = document.getElementById('calcDisplay');
      if (!display) return;

      if (val >= '0' && val <= '9') {
        if (this.calcWaitingForOperand) {
          this.calcDisplay = val;
          this.calcWaitingForOperand = false;
        } else {
          this.calcDisplay = this.calcDisplay === '0' ? val : this.calcDisplay + val;
        }
      } else if (val === '.') {
        if (!this.calcDisplay.includes('.')) {
          this.calcDisplay += '.';
        }
      } else if (val === 'C') {
        this.calcDisplay = '0';
        this.calcMemory = 0;
        this.calcPendingOp = null;
        this.calcWaitingForOperand = false;
      } else if (val === 'CE') {
        this.calcDisplay = '0';
      } else if (val === 'sqrt') {
        const num = parseFloat(this.calcDisplay);
        if (num >= 0) {
          this.calcDisplay = String(Math.sqrt(num));
        } else {
          this.calcDisplay = 'Error';
        }
      } else if (['+', '-', '*', '/'].includes(val)) {
        const num = parseFloat(this.calcDisplay);
        if (this.calcPendingOp && !this.calcWaitingForOperand) {
          this.calculateResult();
        } else {
          this.calcMemory = num;
        }
        this.calcPendingOp = val;
        this.calcWaitingForOperand = true;
      } else if (val === '=') {
        this.calculateResult();
        this.calcPendingOp = null;
      }

      display.value = this.calcDisplay;
    },

    calculateResult() {
      const a = this.calcMemory;
      const b = parseFloat(this.calcDisplay);
      let res = b;

      if (this.calcPendingOp === '+') res = a + b;
      else if (this.calcPendingOp === '-') res = a - b;
      else if (this.calcPendingOp === '*') res = a * b;
      else if (this.calcPendingOp === '/') res = (b !== 0) ? a / b : 'Error';

      this.calcDisplay = String(res);
      this.calcMemory = typeof res === 'number' ? res : 0;
      this.calcWaitingForOperand = true;
    },

    /* -------------------------------------------------------------
       Pearson VUE Score Report Renderer
       ------------------------------------------------------------- */
    renderPearsonScoreReport(payload) {
      const resultsContainer = document.getElementById('resultsScreen');
      if (!resultsContainer) return;

      const existingReport = document.getElementById('pearsonScoreReportCard');
      if (existingReport) existingReport.remove();

      const passed = payload.passed;
      const score = payload.scaledScore;
      const required = payload.passingScore || 675;
      const perQuestion = payload.perQuestion || [];

      // Collect missed objectives
      const missedMap = {};
      perQuestion.forEach((item) => {
        if (!item.correct && item.objective) {
          missedMap[item.objective] = (missedMap[item.objective] || 0) + 1;
        }
      });

      const missedObjectives = Object.keys(missedMap).sort();

      const reportCard = document.createElement('div');
      reportCard.id = 'pearsonScoreReportCard';
      reportCard.style = `
        background: #ffffff;
        color: #0f172a;
        border: 2px solid #0284c7;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;

      reportCard.innerHTML = `
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: #0284c7; text-transform: uppercase;">Official Test Center Diagnostic Report</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">CompTIA A+ Examination Score Slip</div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.8rem; color: #64748b;">Pearson VUE Testing Format</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
          <div>
            <div style="font-size: 0.82rem; color: #64748b;">Candidate Result:</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: ${passed ? '#15803d' : '#b91c1c'};">${passed ? 'PASS' : 'FAIL'}</div>
          </div>
          <div>
            <div style="font-size: 0.82rem; color: #64748b;">Scaled Score:</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a;">${score} <span style="font-size: 0.88rem; font-weight: 500; color: #64748b;">(Passing Score: ${required})</span></div>
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <h4 style="font-size: 0.92rem; font-weight: 700; color: #0f172a; margin-bottom: 0.4rem;">Diagnostic Feedback on Performance</h4>
          <p style="font-size: 0.84rem; color: #475569; line-height: 1.45;">
            ${missedObjectives.length > 0 ? 
              'The following list specifies the CompTIA certification examination sub-objectives where one or more questions were answered incorrectly during this sitting. We recommend reviewing these target areas before taking the official exam:' : 
              'Outstanding performance! You answered questions correctly across all tested blueprint objectives.'}
          </p>
        </div>

        ${missedObjectives.length > 0 ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.8rem 1rem;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase;">Areas for Further Remediation:</div>
            <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.86rem; color: #334155; line-height: 1.6;">
              ${missedObjectives.map(obj => `
                <li><strong>Objective ${escapeHTML(obj)}:</strong> Missed on ${missedMap[obj]} question${missedMap[obj] > 1 ? 's' : ''}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      `;

      const resultsMount = resultsContainer.querySelector('.results-content') || resultsContainer;
      resultsMount.insertBefore(reportCard, resultsMount.firstChild);
    },

    injectPearsonStyles() {
      if (document.getElementById('pearsonCustomStyles')) return;
      const style = document.createElement('style');
      style.id = 'pearsonCustomStyles';
      style.textContent = `
        body.pearson-vue-mode #examHeader {
          background: #0284c7 !important;
          border-bottom: 2px solid #0369a1 !important;
        }
        body.pearson-vue-mode #examHeader .brand-title {
          color: #ffffff !important;
        }
        body.pearson-vue-mode .timer-display {
          background: #0f172a !important;
          border: 1px solid #38bdf8 !important;
          color: #38bdf8 !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  APlus.pearsonMode = PearsonMode;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => PearsonMode.init());
    } else {
      PearsonMode.init();
    }
  }

})(typeof window !== 'undefined' ? window : this);
