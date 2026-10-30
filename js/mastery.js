/**
 * Clariora Exam Simulator v3.0.0
 * mastery.js - Practice drills, mistake logging and competency gates
 * File: js/mastery.js
 * 
 * Implements:
 * 1. Procedure drills: the step sequences a technician has to know cold
 * 2. Blind recall mask for answering without seeing the options
 * 3. Stop-on-miss prompt during tutor-mode practice
 * 4. Mistake log: root cause plus a short note, kept locally
 * 5. Daily three-question refresher drawn from missed items
 * 6. Competency gate: domain scores below 70 percent stay open
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || ((s) => String(s || ''));

  const ERROR_TAXONOMY = [
    { id: 'misread_stem', label: 'Misread the stem. Missed NOT, BEST, FIRST or LEAST.' },
    { id: 'knowledge_gap', label: 'Knowledge gap. Unfamiliar port, acronym or protocol.' },
    { id: 'tricky_distractor', label: 'Picked a plausible distractor over the right answer.' },
    { id: 'order_calc_error', label: 'Sequence or calculation error. Wrong order or CIDR math.' },
    { id: 'rushed_guess', label: 'Guessed under time pressure.' }
  ];

  const KATA_DRILLS = [
    {
      id: 'kata-troubleshooting-methodology',
      title: 'Drill 1: The six troubleshooting steps',
      domain: '5.0 Hardware and Network Troubleshooting',
      steps: [
        { step: 1, title: 'Identify the problem', action: 'Question user, identify changes, review logs, inquire about environmental/infrastructure changes.' },
        { step: 2, title: 'Establish a theory of probable cause', action: 'Question the obvious, consider multiple approaches (OSI model, divide and conquer).' },
        { step: 3, title: 'Test the theory to determine cause', action: 'Once confirmed, determine next steps to resolve. If theory fails, re-establish new theory or escalate.' },
        { step: 4, title: 'Establish a plan of action & implement', action: 'Plan of action to resolve problem and identify potential effects. Implement solution or escalate.' },
        { step: 5, title: 'Verify full system functionality', action: 'Implement preventative measures, confirm user satisfaction, ensure no collateral regressions.' },
        { step: 6, title: 'Document findings, actions, and outcomes', action: 'Log findings in ticketing system, document lessons learned, update network diagrams.' }
      ]
    },
    {
      id: 'kata-malware-removal',
      title: 'Drill 2: The seven malware removal steps',
      domain: '2.0 Security',
      steps: [
        { step: 1, title: 'Investigate and verify malware symptoms', action: 'Identify symptoms, unusual processes, browser redirects, ransomware alerts.' },
        { step: 2, title: 'Quarantine the infected system', action: 'Disconnect network cable, disable Wi-Fi/Bluetooth, isolate system to prevent lateral movement.' },
        { step: 3, title: 'Disable System Restore (Windows)', action: 'Turn off System Protection so malware cannot save copies in restore points.' },
        { step: 4, title: 'Remediate infected systems', action: 'Update anti-malware signatures, boot into Safe Mode/WinPE, run scans, delete malicious files.' },
        { step: 5, title: 'Schedule scans and run updates', action: 'Schedule automated recurring scans, install latest OS and application security patches.' },
        { step: 6, title: 'Enable System Restore and create snapshot', action: 'Turn System Protection back on and create a fresh known-clean restore point.' },
        { step: 7, title: 'Educate the end user', action: 'Train user on phishing awareness, safe browsing habits, and corporate security policy.' }
      ]
    }
  ];

  class MasteryEngine {
    constructor() {
      this.isBlindRecallActive = false;
      this.isAndonCordEnabled = true;
      this.activeHanseiQuestion = null;
      this.pendingHanseiQuestion = null;
      this.initBusListeners();
      if (APlus.bus) {
        APlus.bus.on('exam:navigated', () => this.clearAndonOffer());
        APlus.bus.on('exam:started', () => this.clearAndonOffer());
        APlus.bus.on('exam:finished', () => this.clearAndonOffer());
      }
    }

    initBusListeners() {
      if (!APlus.bus) return;

      APlus.bus.on('exam:answered', (payload) => {
        if (!payload || payload.correct) return;
        if (!this.isAndonCordEnabled) return;
        // Never mid-exam. Mock and diagnostic runs surface the journal from
        // the results review instead, and practice runs open it on request.
        const mode = payload.mode
          || (APlus.modes && APlus.modes.currentExamMode && APlus.modes.currentExamMode())
          || 'practice';
        if (mode === 'mock' || mode === 'diagnostic') return;
        if (!payload.revealAllowed && !payload.isTutorMode) return;
        this.offerAndonCord(payload);
      });
    }

    /**
     * 1. Procedure drills: worked examples and deliberate practice
     */
    getKataDrills() {
      return KATA_DRILLS;
    }

    openKataModal(drillId = 'kata-troubleshooting-methodology') {
      const drill = KATA_DRILLS.find(k => k.id === drillId) || KATA_DRILLS[0];
      let modal = document.getElementById('kataModal');
      if (!modal) {
        modal = this.createKataModal();
      }
      this.renderKataContent(drill);
      modal.classList.add('active');
    }

    createKataModal() {
      const modal = document.createElement('div');
      modal.id = 'kataModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 840px;">
          <div class="modal-header">
            <div>
              <h3 style="font-size: 1.25rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.5rem;">
                <span>Procedure drill</span>
              </h3>
            </div>
            <button class="modal-close-btn" onclick="document.getElementById('kataModal').classList.remove('active')">&times;</button>
          </div>
          <div id="kataBody" style="margin-top: 1rem;"></div>
          <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
            <button class="btn btn-secondary" onclick="document.getElementById('kataModal').classList.remove('active')">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      return modal;
    }

    renderKataContent(drill) {
      const body = document.getElementById('kataBody');
      if (!body) return;

      let html = `
        <div style="background: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <h4 style="font-size: 1.05rem; margin-bottom: 0.25rem;">${escapeHTML(drill.title)}</h4>
          <span class="label">${escapeHTML(drill.domain)}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
      `;

      drill.steps.forEach((s) => {
        html += `
          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 0.85rem 1rem; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
              <span style="background: var(--accent-blue); color: #fff; font-weight: 800; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">${s.step}</span>
              <strong style="font-size: 0.95rem;">${escapeHTML(s.title)}</strong>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin-left: 2rem;">${escapeHTML(s.action)}</p>
          </div>
        `;
      });

      html += '</div>';
      body.innerHTML = html;
    }

    /**
     * 2. Blind recall mask
     */
    toggleBlindRecall() {
      this.isBlindRecallActive = !this.isBlindRecallActive;
      const mask = document.getElementById('blindRecallMask');
      if (mask) {
        mask.style.display = this.isBlindRecallActive ? 'flex' : 'none';
      }
      return this.isBlindRecallActive;
    }

    /**
     * 3. Stop on a missed item during tutor-mode practice
     */
    triggerAndonCord(payload) {
      if (window.APlus && window.APlus.sound) {
        window.APlus.sound.playError();
      }
      console.log('[mastery] Stopping on a missed item for a root-cause note:', payload);
      this.openHanseiModal(payload.question || payload);
    }

    /**
     * Practice mode only. Offers the journal as a button under the question
     * rather than seizing the screen with a modal.
     */
    offerAndonCord(payload) {
      this.pendingHanseiQuestion = payload.question || payload;
      if (typeof document === 'undefined') return;
      const mount = document.getElementById('optionsList');
      if (!mount || !mount.parentNode) return;

      let strip = document.getElementById('hanseiOfferStrip');
      if (!strip) {
        strip = document.createElement('div');
        strip.id = 'hanseiOfferStrip';
        strip.className = 'hansei-offer';
        mount.parentNode.insertBefore(strip, mount.nextSibling);
      }
      strip.innerHTML =
        '<button type="button" class="btn btn-secondary" ' +
        'onclick="APlus.mastery.openPendingHansei()">Why I missed this</button>';
      strip.hidden = false;
    }

    openPendingHansei() {
      if (this.pendingHanseiQuestion) this.openHanseiModal(this.pendingHanseiQuestion);
    }

    clearAndonOffer() {
      if (typeof document === 'undefined') return;
      const strip = document.getElementById('hanseiOfferStrip');
      if (strip) {
        strip.innerHTML = '';
        strip.hidden = true;
      }
    }

    /**
     * 4. Mistake log: root cause plus a short note
     */
    openHanseiModal(question) {
      this.activeHanseiQuestion = question;
      let modal = document.getElementById('hanseiModal');
      if (!modal) {
        modal = this.createHanseiModal();
      }

      const qTextEl = document.getElementById('hanseiQuestionText');
      if (qTextEl && question) {
        qTextEl.textContent = question.question || 'Review Question';
      }

      const taxonomyContainer = document.getElementById('hanseiTaxonomyOptions');
      if (taxonomyContainer) {
        taxonomyContainer.innerHTML = '';
        ERROR_TAXONOMY.forEach((tax) => {
          const label = document.createElement('label');
          label.style = 'display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.8rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; font-size: 0.88rem;';
          label.innerHTML = `
            <input type="radio" name="hanseiRootCause" value="${tax.id}" style="accent-color: var(--accent-cyan);">
            <span>${escapeHTML(tax.label)}</span>
          `;
          taxonomyContainer.appendChild(label);
        });
      }

      modal.classList.add('active');
    }

    createHanseiModal() {
      const modal = document.createElement('div');
      modal.id = 'hanseiModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 780px;">
          <div class="modal-header">
            <div>
              <h3 style="font-size: 1.25rem; color: var(--accent-amber); display: flex; align-items: center; gap: 0.5rem;">
                <span>Log why I missed this</span>
              </h3>
            </div>
            <button class="modal-close-btn" onclick="document.getElementById('hanseiModal').classList.remove('active')">&times;</button>
          </div>

          <div style="margin-top: 1rem;">
            <div id="hanseiQuestionText" style="background: var(--bg-card); padding: 0.85rem 1rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.9rem; margin-bottom: 1rem;"></div>
            
            <div class="label" style="margin-bottom: 0.5rem;">Root cause</div>
            <div id="hanseiTaxonomyOptions" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;"></div>

            <div class="label" style="margin-bottom: 0.5rem;">Note</div>
            <textarea id="hanseiNoteInput" placeholder="What went wrong? For example: read 443 as 80 because I skimmed the stem." style="width: 100%; height: 80px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem; font-size: 0.88rem; font-family: inherit; resize: vertical;"></textarea>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 1.5rem;">
            <button class="btn btn-secondary" onclick="document.getElementById('hanseiModal').classList.remove('active')">Dismiss</button>
            <button class="btn btn-amber" onclick="APlus.mastery.saveHanseiEntry()">Save note</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      return modal;
    }

    saveHanseiEntry() {
      const selectedTax = document.querySelector('input[name="hanseiRootCause"]:checked');
      const noteInput = document.getElementById('hanseiNoteInput');
      const rootCause = selectedTax ? selectedTax.value : 'misread_stem';
      const note = noteInput ? noteInput.value.trim() : '';

      const journal = APlus.storage ? APlus.storage.get('hansei_journal', []) : [];
      const entry = {
        id: 'hansei_' + Date.now(),
        questionId: this.activeHanseiQuestion ? this.activeHanseiQuestion.id : null,
        domain: this.activeHanseiQuestion ? this.activeHanseiQuestion.domain : null,
        rootCause: rootCause,
        note: note,
        timestamp: new Date().toISOString()
      };

      journal.unshift(entry);
      if (journal.length > 50) journal.pop();

      if (APlus.storage) {
        APlus.storage.set('hansei_journal', journal);
      }

      APlus.bus.emit('hansei:logged', entry);
      const modal = document.getElementById('hanseiModal');
      if (modal) modal.classList.remove('active');
    }

    getHanseiJournal() {
      return APlus.storage ? APlus.storage.get('hansei_journal', []) : [];
    }

    /**
     * 5. Daily three-question refresher
     */
    getDailyKaizenQuestions(allQuestions) {
      if (!allQuestions || allQuestions.length === 0) return [];
      const missedIds = APlus.storage ? APlus.storage.get('missed', []) : [];
      const missedPool = allQuestions.filter(q => missedIds.includes(q.id));

      if (missedPool.length >= 3) {
        return window.APlus.engineCore.shuffle(missedPool).slice(0, 3);
      }
      return window.APlus.engineCore.shuffle(allQuestions).slice(0, 3);
    }

    /**
     * 6. Competency gate on domain scores
     */
    checkMasteryGate(examType, domainStats) {
      if (!domainStats) return { unlocked: true };
      const domains = Object.keys(domainStats);
      if (domains.length === 0) return { unlocked: true };

      const weakDomains = [];
      domains.forEach(d => {
        const s = domainStats[d];
        const pct = s.total ? (s.correct / s.total) * 100 : 0;
        if (pct < 70) {
          weakDomains.push({ domain: d, score: pct.toFixed(1) });
        }
      });

      return {
        unlocked: weakDomains.length === 0,
        weakDomains: weakDomains
      };
    }
  }

  APlus.mastery = new MasteryEngine();

})(typeof window !== 'undefined' ? window : this);
// a11y-hard-20260911
