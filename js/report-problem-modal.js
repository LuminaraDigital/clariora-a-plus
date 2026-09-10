/**
 * Clariora Exam Simulator
 * report-problem-modal.js - Question Defect & Ambiguity Reporting Loop
 * File: js/report-problem-modal.js
 *
 * Implements Item Analysis crowdsourcing:
 * - Direct "Report a problem" dialog from question review
 * - Categorized reports (Miskeyed answer, Ambiguous stem, Typo, Outdated objective)
 * - Transmits to Cloudflare Worker API (/api/v1/items/report) with offline fallback
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  const ProblemReporter = {
    activeQuestionId: null,

    init() {
      this.injectModal();
    },

    injectModal() {
      if (document.getElementById('problemReportModal')) return;

      const modal = document.createElement('div');
      modal.id = 'problemReportModal';
      modal.className = 'modal-overlay';
      modal.style = `
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        z-index: 10000;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      `;

      modal.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--gold-primary); border-radius: 8px; width: 100%; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); overflow: hidden;">
          <div style="background: rgba(212, 175, 55, 0.15); padding: 0.8rem 1.2rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; color: var(--gold-primary); font-size: 0.95rem; display: flex; align-items: center; gap: 6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Report a Problem with Question <span id="reportQId"></span></div>
            <button type="button" onclick="APlus.problemReporter.closeModal()" style="background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer;">&times;</button>
          </div>
          <div style="padding: 1.2rem;">
            <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 0.8rem;">
              Help improve Clariora's question bank. Professional exam authors review all flagged items nightly.
            </p>
            <div style="margin-bottom: 0.8rem;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.3rem;">Issue Category:</label>
              <select id="reportCategory" style="width: 100%; background: var(--bg-primary); border: 1px solid var(--border-color); color: #fff; padding: 0.45rem; border-radius: 4px; font-size: 0.85rem;">
                <option value="miskeyed">Suspected Miskeyed / Incorrect Answer Key</option>
                <option value="ambiguous">Ambiguous or Confusing Question Stem</option>
                <option value="typo">Typo, Spelling or Grammatical Error</option>
                <option value="outdated">Outdated Standard or Deprecated Objective</option>
                <option value="distractor">Distractor Explanation Inaccurate</option>
              </select>
            </div>
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.3rem;">Details / Explanation (optional):</label>
              <textarea id="reportDetails" rows="3" placeholder="Provide context, errata, or why you believe this item is flawed..." style="width: 100%; box-sizing: border-box; background: var(--bg-primary); border: 1px solid var(--border-color); color: #fff; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; resize: vertical;"></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.6rem;">
              <button type="button" class="btn btn-secondary" onclick="APlus.problemReporter.closeModal()" style="font-size: 0.82rem;">Cancel</button>
              <button type="button" class="btn btn-primary" id="submitReportBtn" onclick="APlus.problemReporter.submit()" style="font-size: 0.82rem;">Submit Report</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    },

    openModal(questionId) {
      this.activeQuestionId = questionId;
      const modal = document.getElementById('problemReportModal');
      const qIdEl = document.getElementById('reportQId');
      if (qIdEl) qIdEl.innerText = questionId || '';
      if (modal) {
        modal.style.display = 'flex';
      }
    },

    closeModal() {
      const modal = document.getElementById('problemReportModal');
      if (modal) modal.style.display = 'none';
      const details = document.getElementById('reportDetails');
      if (details) details.value = '';
    },

    async submit() {
      const category = document.getElementById('reportCategory').value;
      const details = (document.getElementById('reportDetails').value || '').trim();
      const questionId = this.activeQuestionId;

      const payload = {
        questionId: questionId,
        category: category,
        details: details,
        timestamp: new Date().toISOString()
      };

      // Store in local reported list
      if (APlus.storage) {
        const reports = APlus.storage.get('item_reports_local', []);
        reports.push(payload);
        APlus.storage.set('item_reports_local', reports);
      }

      // Send to Cloudflare Worker API if online
      try {
        const endpoint = (typeof window !== 'undefined' && window.location && (window.location.hostname.endsWith('clariora.com.au') || window.location.hostname.endsWith('pages.dev')))
          ? '/api/v1/items/report'
          : 'https://clariora.com.au/api/v1/items/report';
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        // Silently queued in localStorage for next sync
      }

      alert('Thank you! Your feedback has been recorded and submitted for review.');
      this.closeModal();
    }
  };

  APlus.problemReporter = ProblemReporter;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ProblemReporter.init());
    } else {
      ProblemReporter.init();
    }
  }

})(typeof window !== 'undefined' ? window : this);
