/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * app.js - Application Lifecycle, Sound Engine, Theme, and Modal-Safe Keyboard Shortcuts
 * File: js/app.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  /**
   * Sound Engine: Web Audio API Synthesizer
   */
  class SoundEngine {
    constructor() {
      this.isEnabled = true;
      this.audioCtx = null;
    }

    _getContext() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      return this.audioCtx;
    }

    toggle() {
      this.isEnabled = !this.isEnabled;
      const btn = document.getElementById('soundToggleBtn');
      if (btn) btn.textContent = this.isEnabled ? 'Sound' : 'Muted';
      return this.isEnabled;
    }

    playTone(freq, type = 'sine', duration = 0.15) {
      if (!this.isEnabled) return;
      try {
        const ctx = this._getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (_) {}
    }

    playClick() {
      this.playTone(580, 'triangle', 0.08);
    }

    playSuccess() {
      this.playTone(523.25, 'sine', 0.1);
      setTimeout(() => this.playTone(659.25, 'sine', 0.15), 100);
      setTimeout(() => this.playTone(783.99, 'sine', 0.25), 200);
    }

    playError() {
      this.playTone(220, 'sawtooth', 0.2);
    }
  }

  APlus.sound = new SoundEngine();

  /**
   * Theme Management
   */
  const ThemeManager = {
    init() {
      const savedTheme = (APlus.storage ? APlus.storage.get('theme', 'dark') : localStorage.getItem('comptia_theme')) || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.updateThemeBtn(savedTheme);
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = (current === 'dark') ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      if (APlus.storage) APlus.storage.set('theme', next);
      localStorage.setItem('comptia_theme', next);
      this.updateThemeBtn(next);
      return next;
    },

    updateThemeBtn(theme) {
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.textContent = (theme === 'dark') ? 'Light mode' : 'Dark mode';
    }
  };

  APlus.theme = ThemeManager;

  /**
   * Modal-Safe Keyboard Shortcuts Handler
   * Fixes leak into PBQ / Messer / Review modals
   */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // If any modal overlay is active, disable exam runner shortcuts
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) {
        if (e.key === 'Escape') {
          // If review modal or other modal is open, close on escape
          activeModal.classList.remove('active');
        }
        return;
      }

      // If active focus is inside an input, textarea, or select, disable shortcuts
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Only operate when active screen is examScreen
      const examScreen = document.getElementById('examScreen');
      if (!examScreen || !examScreen.classList.contains('active')) return;

      const key = e.key.toUpperCase();
      const session = APlus.engine;

      if (['A', 'B', 'C', 'D'].includes(key)) {
        const optIdx = ['A', 'B', 'C', 'D'].indexOf(key);
        session.answerQuestion(optIdx);
      } else if (['1', '2', '3', '4'].includes(key)) {
        const optIdx = parseInt(key, 10) - 1;
        session.answerQuestion(optIdx);
      } else if (key === 'N' || e.key === 'ArrowRight') {
        session.navigate(1);
      } else if (key === 'P' || e.key === 'ArrowLeft') {
        session.navigate(-1);
      } else if (key === 'F') {
        session.toggleFlag();
      } else if (key === 'M') {
        APlus.ui.openReviewModal();
      } else if (key === 'S') {
        const currAns = session.userAnswers[session.currentIndex];
        if (typeof currAns === 'number') {
          session.toggleEliminateOption(currAns);
        }
      }
    });
  }

  /**
   * Global Shims for Complete Backward Compatibility with existing HTML inline handlers
   */
  function registerGlobalShims() {
    window.startExam = function(type, questionCount, timeMinutes) {
      APlus.engine.start({
        type: type || 'core1',
        questionCount: questionCount || 90,
        timeMinutes: timeMinutes || 90
      });
    };

    window.startDomainDrill = function() {
      const selectEl = document.getElementById('domainSelect');
      const val = selectEl ? selectEl.value : 'c1_1';

      const domainMap = {
        'c1_1': { exam: 'core1', filter: '1.0 Mobile Devices' },
        'c1_2': { exam: 'core1', filter: '2.0 Networking' },
        'c1_3': { exam: 'core1', filter: '3.0 Hardware' },
        'c1_4': { exam: 'core1', filter: '4.0 Virtualization and Cloud Computing' },
        'c1_5': { exam: 'core1', filter: '5.0 Hardware and Network Troubleshooting' },
        'c2_1': { exam: 'core2', filter: '1.0 Operating Systems' },
        'c2_2': { exam: 'core2', filter: '2.0 Security' },
        'c2_3': { exam: 'core2', filter: '3.0 Software Troubleshooting' },
        'c2_4': { exam: 'core2', filter: '4.0 Operational Procedures' }
      };

      const spec = domainMap[val] || domainMap['c1_1'];
      const rawQuestions = APlus.data.getQuestions(spec.exam);
      const filtered = rawQuestions.filter(q => (q.domain || '').toLowerCase().includes(spec.filter.toLowerCase().substring(0, 3)));

      APlus.engine.start({
        type: 'domain',
        customPool: filtered,
        domainKey: spec.filter,
        questionCount: filtered.length,
        timeMinutes: filtered.length
      });
    };

    window.startMissedDrill = function() {
      const missedIds = APlus.storage ? APlus.storage.get('missed', []) : [];
      if (missedIds.length === 0) {
        alert('No missed questions recorded yet! Take a practice exam first.');
        return;
      }

      const all = APlus.data.getQuestions('both');
      const missedPool = all.filter(q => missedIds.includes(q.id));

      APlus.engine.start({
        type: 'missed',
        customPool: missedPool,
        questionCount: missedPool.length,
        timeMinutes: Math.ceil((missedPool.length * 75) / 60)
      });
    };

    window.retakeCurrentExam = function() {
      const session = APlus.engine;
      session.start({
        type: session.type,
        customPool: session.questions,
        questionCount: session.questions.length,
        timeMinutes: Math.floor(session.totalSeconds / 60)
      });
    };

    window.selectOption = function(optIdx) {
      APlus.engine.answerQuestion(optIdx);
    };

    window.toggleEliminate = function(e, optIdx) {
      if (e && e.stopPropagation) e.stopPropagation();
      APlus.engine.toggleEliminateOption(optIdx);
    };

    window.toggleFlagCurrentQuestion = function() {
      APlus.engine.toggleFlag();
    };

    window.navigateQuestion = function(delta) {
      const session = APlus.engine;
      const moved = session.navigate(delta);
      if (!moved && delta > 0 && session.currentIndex === session.questions.length - 1) {
        APlus.ui.openReviewModal();
      }
    };

    window.jumpToQuestion = function(idx) {
      APlus.engine.jumpTo(idx);
    };

    window.openReviewModal = function() {
      APlus.ui.openReviewModal();
    };

    window.closeReviewModal = function() {
      APlus.ui.closeReviewModal();
    };

    window.confirmFinishExam = function() {
      APlus.ui.confirmFinishExam();
    };

    window.finishExam = function() {
      APlus.engine.finish();
    };

    window.showScreen = function(screenId) {
      APlus.ui.showScreen(screenId);
    };

    window.togglePause = function() {
      APlus.engine.togglePause();
    };

    window.filterReview = function(filter) {
      APlus.ui.filterReview(filter);
    };

    window.toggleAppTheme = function() {
      APlus.theme.toggle();
    };

    window.toggleSound = function() {
      APlus.sound.toggle();
    };

    window.clearHistory = function() {
      const wipe = () => {
        if (APlus.storage) {
          APlus.storage.remove('history');
          APlus.storage.remove('missed');
          APlus.storage.remove('ghost_coach');
        }
        localStorage.removeItem('comptia_a_plus_history');
        localStorage.removeItem('comptia_a_plus_missed');
        renderHistoryTable();
        updateMissedCountDisplay();
        if (APlus.ghostCoach && typeof APlus.ghostCoach.refreshMission === 'function') {
          APlus.ghostCoach.refreshMission();
        }
      };
      if (APlus.dialog && typeof APlus.dialog.confirm === 'function') {
        APlus.dialog.confirm({
          title: 'Clear attempt history?',
          body: 'This removes every exam attempt and the missed question pool on this device. Your progress record is kept.',
          confirmLabel: 'Clear history',
          cancelLabel: 'Keep it',
          danger: true
        }).then((yes) => { if (yes) wipe(); });
        return;
      }
      if (confirm('Clear exam attempt history and missed question pool?')) wipe();
    };

    window.renderHistoryTable = function() {
      const records = APlus.storage ? APlus.storage.get('history', []) : [];
      const container = document.getElementById('historyTableContainer');
      if (!container) return;

      if (records.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">No exam attempts recorded yet. Complete an exam to view your score progression!</p>`;
        return;
      }

      let html = `
        <table class="history-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Exam Mode</th>
              <th>Score</th>
              <th>Raw Correct</th>
              <th>Accuracy</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      records.forEach(r => {
        const statusColor = (r.status === 'PASSED') ? 'var(--accent-green)' : 'var(--accent-red)';
        html += `
          <tr>
            <td>${escapeHTML(r.date)}</td>
            <td><strong>${escapeHTML(r.examType)}</strong></td>
            <td style="font-family: monospace; font-weight: 700; font-size: 1.05rem;">${escapeHTML(String(r.scaledScore))} / 900</td>
            <td>${escapeHTML(r.raw)}</td>
            <td>${escapeHTML(r.percentage)}</td>
            <td style="color: ${statusColor}; font-weight: 700;">${escapeHTML(r.status)}</td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    };

    window.updateMissedCountDisplay = function() {
      const count = (APlus.storage ? APlus.storage.get('missed', []) : []).length;
      const el = document.getElementById('missedCountText');
      const btn = document.getElementById('retakeMissedBtn');
      if (el) el.innerText = `${count} missed question(s) in personal bank.`;
      if (btn) btn.disabled = (count === 0);
    };
  }

  /**
   * Main App Initialization
   */
  function initApp() {
    ThemeManager.init();
    registerGlobalShims();
    initKeyboardShortcuts();

    renderHistoryTable();
    updateMissedCountDisplay();

    if (window.CompTIALedgerUI && typeof window.CompTIALedgerUI.init === 'function') {
      window.CompTIALedgerUI.init();
    }
    if (window.CompTIAProductTrust && typeof window.CompTIAProductTrust.init === 'function') {
      window.CompTIAProductTrust.init();
    }
    if (window.TutorMode && typeof window.TutorMode.init === 'function') {
      window.TutorMode.init();
      window.TutorMode.syncToggleUi();
    }
    if (APlus.ghostCoach && typeof APlus.ghostCoach.init === 'function') {
      // ghost-coach self-inits on DOMContentLoaded; refresh UI if already live
      if (typeof APlus.ghostCoach.refreshMission === 'function' && !APlus.ghostCoach.getCurrentMission()) {
        APlus.ghostCoach.refreshMission();
      }
    }

    console.log('[APlus] Initialized CompTIA A+ Master Exam Simulator v' + (APlus.APP_VERSION || '3.1.1'));
  }

  APlus.init = initApp;

  window.addEventListener('DOMContentLoaded', () => {
    APlus.init();
  });

})(typeof window !== 'undefined' ? window : this);
