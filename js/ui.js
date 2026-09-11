/**
 * Clariora Exam Simulator v3.0.0
 * ui.js - User Interface Controller (Screens, Question Runner, Matrix, Review Accordion, Modals)
 * File: js/ui.js
 *
 * Results screen markup contract (the shell stylesheet owns the look of these classes):
 *   Score hero  .score-ring-wrap > svg.score-ring > circle.track + circle.progress
 *               .score-ring-text > .value.stat-display + .sub.label
 *   Domain rows .domain-bar > .name + .track(.fill[.ok] + .passline) + .pct.tnum
 *   Review rows .dot.correct | .dot.wrong | .dot.flagged, .label eyebrows
 * This file only emits markup and inline widths/offsets. It sets no colors.
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const hasDoc = (typeof document !== 'undefined');

  const escapeHTML = (window.APlus.utils && window.APlus.utils.escapeHTML) || function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /* ------------------------------------------------------------------ *
   * Pure builders (unit tested from Node by tools/test_results_render.js)
   * ------------------------------------------------------------------ */

  const RING_RADIUS = 52;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const BLUEPRINT_ORDER = [
    '1.0 Mobile Devices',
    '2.0 Networking',
    '3.0 Hardware',
    '4.0 Virtualization and Cloud Computing',
    '5.0 Hardware and Network Troubleshooting',
    '1.0 Operating Systems',
    '2.0 Security',
    '3.0 Software Troubleshooting',
    '4.0 Operational Procedures'
  ];

  /** Pass mark expressed as a percentage of the 100-900 scale. 675 -> 71.875 */
  function passLinePercent(passingScore) {
    const p = Number(passingScore);
    if (!isFinite(p)) return 0;
    return ((p - 100) / 800) * 100;
  }

  /** Fraction (0..1) of the ring the score fills. */
  function scoreFraction(score) {
    const s = Number(score);
    if (!isFinite(s)) return 0;
    return Math.max(0, Math.min(1, (s - 100) / 800));
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  /**
   * Score ring markup plus the dash geometry the animation needs.
   * Returns { html, circumference, dashoffset, fraction }.
   */
  function buildScoreRing(score, options) {
    const opts = options || {};
    const max = opts.max || 900;
    const fraction = scoreFraction(score);
    const circumference = RING_CIRCUMFERENCE;
    const dashoffset = circumference - (fraction * circumference);
    const value = (score == null || isNaN(Number(score))) ? '0' : String(score);

    const html =
      '<div class="score-ring-wrap">' +
        '<svg class="score-ring" viewBox="0 0 120 120" aria-hidden="true">' +
          '<circle class="track" cx="60" cy="60" r="' + RING_RADIUS + '"/>' +
          '<circle class="progress" id="scoreGaugeCircle" cx="60" cy="60" r="' + RING_RADIUS + '"' +
            ' stroke-dasharray="' + circumference.toFixed(3) + '"' +
            ' stroke-dashoffset="' + circumference.toFixed(3) + '"/>' +
        '</svg>' +
        '<div class="score-ring-text">' +
          '<div class="value stat-display" id="scaledScoreDisplay">' + escapeHTML(value) + '</div>' +
          '<div class="sub label">of ' + escapeHTML(String(max)) + '</div>' +
        '</div>' +
      '</div>';

    return {
      html: html,
      circumference: circumference,
      dashoffset: dashoffset,
      fraction: fraction
    };
  }

  /**
   * One domain result row.
   * spec: { name, correct, total, passingScore } or { name, percent, passPercent }
   */
  function buildDomainBarRow(spec) {
    const s = spec || {};
    const total = Number(s.total) || 0;
    const correct = Number(s.correct) || 0;
    const percent = (s.percent != null)
      ? Number(s.percent)
      : (total ? Math.round((correct / total) * 100) : 0);
    const passPercent = (s.passPercent != null)
      ? Number(s.passPercent)
      : passLinePercent(s.passingScore != null ? s.passingScore : 675);

    const width = Math.max(0, Math.min(100, percent));
    const linePos = Math.max(0, Math.min(100, passPercent));
    const isOk = percent >= passPercent;
    const fillClass = isOk ? 'fill ok' : 'fill';
    const readout = total
      ? (correct + ' / ' + total + ', ' + percent + '%')
      : (percent + '%');

    return '<div class="domain-bar">' +
      '<span class="name">' + escapeHTML(s.name || '') + '</span>' +
      '<div class="track">' +
        '<div class="' + fillClass + '" style="width:' + width + '%"></div>' +
        '<div class="passline" style="left:' + round1(linePos) + '%"></div>' +
      '</div>' +
      '<span class="pct tnum">' + escapeHTML(readout) + '</span>' +
    '</div>';
  }

  /** Blueprint order first, then anything unrecognised alphabetically. */
  function sortDomainsByBlueprint(names) {
    return (names || []).slice().sort(function (a, b) {
      const ia = BLUEPRINT_ORDER.indexOf(a);
      const ib = BLUEPRINT_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return String(a).localeCompare(String(b));
    });
  }

  /** Full domain block, blueprint ordered. */
  function buildDomainBars(domainStats, passingScore) {
    if (!domainStats) return '';
    const names = sortDomainsByBlueprint(Object.keys(domainStats));
    const passPercent = passLinePercent(passingScore != null ? passingScore : 675);
    return names.map(function (name) {
      const stats = domainStats[name] || {};
      return buildDomainBarRow({
        name: name,
        correct: stats.correct,
        total: stats.total,
        passPercent: passPercent
      });
    }).join('');
  }

  /** Headline + subtitle copy for the score hero. */
  function buildScoreCopy(score, passingScore) {
    const s = Number(score) || 0;
    const p = Number(passingScore) || 675;
    const diff = Math.abs(s - p);
    if (s >= p) {
      return {
        title: 'Passed',
        subtitle: 'Pass mark ' + p + '. ' + diff + ' points above the pass mark.'
      };
    }
    return {
      title: 'Did not pass',
      subtitle: 'Pass mark ' + p + '. You need ' + diff + ' more points.'
    };
  }

  /* ------------------------------------------------------------------ *
   * DOM helpers
   * ------------------------------------------------------------------ */

  /**
   * Run fn on the next paint so a transition has a start value to animate from.
   * A timer backstop guarantees the final value even when rAF is starved
   * (background tab, headless render), so bars never stay stuck at zero.
   */
  /**
   * True when animating is pointless or unwanted: a hidden document starves
   * requestAnimationFrame, and reduced-motion users asked for no sweep.
   */
  function prefersNoAnimation() {
    if (!hasDoc) return true;
    if (document.hidden) return true;
    try {
      if (typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    } catch (_) {}
    return false;
  }

  /**
   * Apply the final value.
   * When motion is off, or the tab is hidden, set it synchronously under a
   * .no-anim class so the value lands even with no frames at all.
   * Otherwise sweep on the second frame, with a 150ms timer backstop.
   */
  function applyFinalValue(el, fn) {
    if (prefersNoAnimation()) {
      if (el && el.classList) el.classList.add('no-anim');
      fn();
      return;
    }
    nextFrame(fn);
  }

  function nextFrame(fn) {
    let done = false;
    const once = function () {
      if (done) return;
      done = true;
      fn();
    };
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(once);
      });
    }
    // Backstop: guarantees the final value even when no frame ever runs.
    setTimeout(once, 150);
  }

  /* ------------------------------------------------------------------ *
   * Option row normaliser
   *
   * Every renderer that paints answer rows routes through here, so the strike
   * affordance is one 40x40 button at the row end with a drawn icon, an
   * accessible name, and a click that never bubbles up into row selection.
   * ------------------------------------------------------------------ */

  const STRIKE_ICON =
    '<svg class="strike-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"' +
    ' stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"' +
    ' focusable="false"><circle cx="12" cy="12" r="8"></circle><path d="M6.5 6.5l11 11"></path>' +
    '</svg>';

  const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

  /**
   * Rewrite whatever the question renderer produced into the agreed contract.
   * Idempotent: a row already normalised is left alone.
   */
  function normalizeOptionRows(container) {
    if (!hasDoc || !container) return;
    const rows = container.querySelectorAll('.option-item');
    Array.prototype.forEach.call(rows, function (row, i) {
      const btn = row.querySelector('.strike-btn');
      if (!btn) return;
      const letter = OPTION_LETTERS[i] || String(i + 1);

      if (btn.dataset.aplusStrike !== '1') {
        btn.dataset.aplusStrike = '1';
        btn.innerHTML = STRIKE_ICON;
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', 'Eliminate option ' + letter);
        btn.setAttribute('title', 'Eliminate option ' + letter);
        // Guard the row click no matter what the renderer wired up.
        // Bubble phase, registered after the renderer's own handler, so the
        // eliminate still runs and only then is propagation to the row cut.
        ['click', 'mousedown', 'pointerdown'].forEach(function (evt) {
          btn.addEventListener(evt, function (e) {
            if (e.stopPropagation) e.stopPropagation();
          }, false);
        });
      }
      btn.setAttribute('aria-pressed', row.classList.contains('eliminated') ? 'true' : 'false');
      // Always the last child, so the hit area sits at the row end.
      if (row.lastElementChild !== btn) row.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------ *
   * Viewport reset
   * ------------------------------------------------------------------ */

  function scrollAppToTop() {
    if (typeof window.scrollAppToTop === 'function' && window.scrollAppToTop !== scrollAppToTop) {
      try { window.scrollAppToTop(); return; } catch (_) {}
    }
    try {
      if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
    } catch (_) {}
    try {
      if (document.documentElement) document.documentElement.scrollTop = 0;
    } catch (_) {}
    try {
      if (document.body) document.body.scrollTop = 0;
    } catch (_) {}
  }

  /* ------------------------------------------------------------------ *
   * UI controller
   * ------------------------------------------------------------------ */

  class UIController {
    constructor() {
      this.currentFilter = 'all';
      this.initBusListeners();
    }

    initBusListeners() {
      if (!APlus.bus) return;

      APlus.bus.on('exam:started', () => {
        this.showScreen('examScreen');
        this.renderActiveQuestion();
        this.renderMatrix();
        scrollAppToTop();
      });

      APlus.bus.on('exam:navigated', () => {
        this.renderActiveQuestion();
        this.highlightMatrixActive();
        scrollAppToTop();
      });

      APlus.bus.on('exam:answered', () => {
        this.renderActiveQuestion();
        this.renderMatrix();
      });

      APlus.bus.on('exam:eliminate:toggled', () => {
        this.renderActiveQuestion();
      });

      APlus.bus.on('exam:flagged', () => {
        this.renderActiveQuestion();
        this.renderMatrix();
      });

      APlus.bus.on('exam:timer:tick', (payload) => {
        this.updateTimerDisplay(payload.remainingSeconds);
      });

      APlus.bus.on('exam:paused:toggled', (payload) => {
        const btn = document.getElementById('pauseBtn');
        if (btn) {
          btn.innerText = payload.isPaused ? 'Resume' : 'Pause';
          btn.classList.toggle('btn-amber', payload.isPaused);
        }
      });

      APlus.bus.on('exam:finished', (payload) => {
        this.renderResults(payload);
        this.showScreen('resultsScreen');
      });
    }

    showScreen(screenId) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const target = document.getElementById(screenId);
      if (target) target.classList.add('active');

      const headerControls = document.getElementById('examHeaderControls');
      if (headerControls) {
        headerControls.style.display = (screenId === 'examScreen') ? 'flex' : 'none';
      }

      scrollAppToTop();
    }

    updateTimerDisplay(remainingSeconds) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const digits = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const timerDigits = document.getElementById('timerDigits');
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDigits) {
        timerDigits.innerText = digits;
        timerDigits.classList.add('timer-digits');
      }

      if (timerDisplay) {
        timerDisplay.classList.add('timer-display');
        const level = (APlus.modes && APlus.modes.timerAlertLevel)
          ? APlus.modes.timerAlertLevel(remainingSeconds)
          : (remainingSeconds <= 60 ? 'critical' : (remainingSeconds <= 300 ? 'warning' : 'none'));
        timerDisplay.classList.toggle('is-critical', level === 'critical');
        timerDisplay.classList.toggle('is-warning', level === 'warning');
        // Legacy class names kept so the shipped stylesheet keeps working.
        timerDisplay.classList.toggle('critical', level === 'critical');
        timerDisplay.classList.toggle('warning', level === 'warning');
      }
    }

    renderActiveQuestion() {
      const session = APlus.engine;
      const q = session.getCurrentQuestion();
      if (!q) return;

      const idx = session.currentIndex;
      const total = session.questions.length;

      const qNumEl = document.getElementById('currentQNumber');
      const qDomEl = document.getElementById('currentQDomain');
      const qTextEl = document.getElementById('questionText');

      if (qNumEl) qNumEl.innerText = `Question ${idx + 1} of ${total}`;
      if (qDomEl) qDomEl.innerText = q.domain || (q.exam === 'core1' ? 'Core 1' : 'Core 2');
      if (qTextEl) {
        qTextEl.innerText = q.question;
        let exMount = document.getElementById('qExhibitMount');
        if (!exMount) {
          exMount = document.createElement('div');
          exMount.id = 'qExhibitMount';
          qTextEl.parentNode.insertBefore(exMount, qTextEl.nextSibling);
        }
        if (q.exhibit) {
          const ex = q.exhibit;
          const url = escapeHTML(ex.url || ex.src || '');
          const cap = escapeHTML(ex.caption || ex.title || 'Exhibit Diagram');
          const alt = escapeHTML(ex.alt || 'Question Exhibit');
          exMount.innerHTML = `
            <div class="question-exhibit" style="margin: 0.9rem 0 1.2rem 0; background: #0c1017; border: 1px solid var(--gold-primary); border-radius: 8px; overflow: hidden;">
              <div style="background: rgba(212, 175, 55, 0.15); padding: 0.45rem 0.8rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3);">
                <span style="font-weight: 700; color: var(--gold-primary); font-size: 0.82rem; letter-spacing: 0.04em;">EXHIBIT: ${cap}</span>
                <a href="${url}" target="_blank" rel="noopener" class="btn btn-secondary" style="font-size: 0.74rem; padding: 0.15rem 0.45rem; text-decoration: none;">Full Size ↗</a>
              </div>
              <div style="padding: 0.8rem; text-align: center; background: #080b11;">
                <img src="${url}" alt="${alt}" style="max-width: 100%; max-height: 380px; object-fit: contain; border-radius: 4px;" />
              </div>
            </div>
          `;
          exMount.style.display = 'block';
        } else {
          exMount.innerHTML = '';
          exMount.style.display = 'none';
        }
      }

      // Flag button
      const flagBtn = document.getElementById('flagBtn');
      if (flagBtn) {
        const isFlagged = session.flaggedQuestions.has(idx);
        flagBtn.classList.toggle('flagged', isFlagged);
        flagBtn.setAttribute('aria-pressed', isFlagged ? 'true' : 'false');
        flagBtn.innerText = isFlagged ? 'Flagged for review' : 'Flag for review';
      }

      // Render options via qtypes
      const optContainer = document.getElementById('optionsList');
      if (optContainer) {
        const storedAns = session.userAnswers[idx];
        const userState = (typeof storedAns === 'object' && storedAns !== null && !Array.isArray(storedAns))
          ? { ...storedAns, eliminated: session.eliminatedOptions[idx] || new Set() }
          : {
              answer: storedAns,
              answers: Array.isArray(storedAns) ? storedAns : [],
              matches: storedAns || {},
              sequence: storedAns || null,
              eliminated: session.eliminatedOptions[idx] || new Set()
            };

        APlus.qtypes.render(q, userState, optContainer, {
          onSelect: (ansVal) => session.answerQuestion(ansVal),
          onToggleEliminate: (optIdx) => session.toggleEliminateOption(optIdx)
        });
        normalizeOptionRows(optContainer);
      }

      // Prev / Next button states
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      if (prevBtn) prevBtn.disabled = (idx === 0);
      if (nextBtn) {
        nextBtn.innerText = (idx === total - 1) ? 'Review / Finish' : 'Next ->';
      }

      this.updateAnsweredCounter();
      this.highlightMatrixActive();
    }

    renderMatrix() {
      const session = APlus.engine;
      const grid = document.getElementById('matrixGrid');
      const modalGrid = document.getElementById('modalMatrixGrid');
      if (!grid) return;

      grid.innerHTML = '';
      if (modalGrid) modalGrid.innerHTML = '';

      session.questions.forEach((q, idx) => {
        const btn = document.createElement('button');
        btn.className = 'matrix-btn';
        btn.innerText = idx + 1;

        const isAnswered = session.userAnswers[idx] !== undefined;
        const isFlagged = session.flaggedQuestions.has(idx);

        if (isAnswered) btn.classList.add('answered');
        if (isFlagged) btn.classList.add('flagged');
        if (session.currentIndex === idx) btn.classList.add('active');

        btn.onclick = () => {
          session.jumpTo(idx);
          this.closeReviewModal();
        };

        grid.appendChild(btn);

        if (modalGrid) {
          const mBtn = btn.cloneNode(true);
          mBtn.onclick = () => {
            session.jumpTo(idx);
            this.closeReviewModal();
          };
          modalGrid.appendChild(mBtn);
        }
      });

      this.updateAnsweredCounter();
    }

    highlightMatrixActive() {
      const session = APlus.engine;
      const buttons = document.querySelectorAll('#matrixGrid .matrix-btn');
      buttons.forEach((b, idx) => {
        const isActive = idx === session.currentIndex;
        b.classList.toggle('active', isActive);
        if (isActive && typeof b.scrollIntoView === 'function') {
          b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    updateAnsweredCounter() {
      const session = APlus.engine;
      const count = Object.keys(session.userAnswers).length;
      const total = session.questions.length;
      const el = document.getElementById('answeredCounter');
      if (el) el.innerText = `${count} / ${total}`;
    }

    openReviewModal() {
      this.renderMatrix();
      const modal = document.getElementById('reviewModal');
      if (modal) modal.classList.add('active');
    }

    closeReviewModal() {
      const modal = document.getElementById('reviewModal');
      if (modal) modal.classList.remove('active');
    }

    confirmFinishExam() {
      const session = APlus.engine;
      const total = session.questions.length;
      const answered = Object.keys(session.userAnswers).length;
      const flagged = session.flaggedQuestions.size;
      const unanswered = total - answered;

      const summary = [
        `Answered: ${answered} of ${total}`,
        `Unanswered: ${unanswered}`,
        `Flagged for review: ${flagged}`
      ];
      const warning = unanswered > 0 ? 'Unanswered questions score zero.' : '';

      const proceed = () => {
        this.closeReviewModal();
        session.finish();
      };

      if (APlus.dialog && typeof APlus.dialog.confirm === 'function') {
        APlus.dialog.confirm({
          title: 'Submit this exam?',
          body: [summary],
          warning,
          confirmLabel: 'Submit and score',
          cancelLabel: 'Keep working'
        }).then((yes) => { if (yes) proceed(); });
        return;
      }

      let msg = `Are you ready to submit your exam?\n\n- ${summary.join('\n- ')}`;
      if (warning) msg += `\n\n${warning}`;
      if (confirm(msg)) proceed();
    }

    /* ---------------- Results screen ---------------- */

    renderResults(payload) {
      const passingScore = payload.passingScore || 675;
      const isPassed = payload.passed;

      this.renderScoreHero(payload.scaledScore, passingScore, isPassed);

      const rawCorrectVal = document.getElementById('rawCorrectVal');
      if (rawCorrectVal) rawCorrectVal.innerText = `${payload.rawCorrect} / ${payload.totalQuestions}`;

      const pctVal = document.getElementById('percentageVal');
      if (pctVal) {
        pctVal.innerText = `${((payload.rawCorrect / (payload.totalQuestions || 1)) * 100).toFixed(1)}%`;
      }

      const timeVal = document.getElementById('timeSpentVal');
      if (timeVal) {
        const m = Math.floor(payload.secondsSpent / 60);
        const s = payload.secondsSpent % 60;
        timeVal.innerText = `${m}m ${s}s`;
      }

      const flagVal = document.getElementById('flaggedCountVal');
      if (flagVal) flagVal.innerText = `${payload.flaggedCount}`;

      const missedCountEl = document.getElementById('resultsMissedCount');
      if (missedCountEl) {
        const missed = (payload.perQuestion || []).filter(p => !p.correct);
        missedCountEl.innerText = `${missed.length}`;
      }

      this.renderDomainBreakdown(payload.domainStats, passingScore);
      this.renderReviewAccordion('all');

      if (isPassed && window.APlus && window.APlus.sound) {
        window.APlus.sound.playSuccess();
      }

      // Render TON Blockchain Credential Card if TONCredentials module is active
      if (window.TONCredentials && document.getElementById('tonCredentialMount')) {
        window.TONCredentials.renderCredentialCard(document.getElementById('tonCredentialMount'), {
          examCore: payload.examCore || (payload.passingScore === 700 ? '2' : '1'),
          scaledScore: payload.scaledScore,
          passed: isPassed,
          ledgerHash: (payload.ledgerEntry && payload.ledgerEntry.entryHash) || 'APX_' + Date.now().toString(16)
        });
      }
    }

    /**
     * Rebuild the inside of #scoreHero as a ring plus copy.
     * Keeps #scoreGaugeCircle, #scaledScoreDisplay, #passFailTitle, #scoreSubtitle.
     */
    renderScoreHero(score, passingScore, passed) {
      if (!hasDoc) return;
      const hero = document.getElementById('scoreHero');
      if (!hero) return;

      const isPassed = (passed != null) ? passed : (Number(score) >= Number(passingScore));
      hero.className = isPassed ? 'score-hero passed' : 'score-hero failed';

      const readout = hero.querySelector('.score-readout');
      const copy = buildScoreCopy(score, passingScore);
      const ring = buildScoreRing(score, { max: 900 });

      const markup =
        ring.html +
        '<div class="score-copy">' +
          '<div class="score-title" id="passFailTitle">' + escapeHTML(copy.title) + '</div>' +
          '<div class="score-subtitle" id="scoreSubtitle">' + escapeHTML(copy.subtitle) + '</div>' +
        '</div>';

      if (readout) {
        readout.innerHTML = markup;
      } else {
        const wrap = document.createElement('div');
        wrap.className = 'score-readout';
        wrap.innerHTML = markup;
        hero.insertBefore(wrap, hero.firstChild);
      }

      this.updateScoreGauge(score, passingScore);
    }

    /** Full offset first, real offset on the next frame so the ring sweeps. */
    updateScoreGauge(score, passingScore) {
      const circle = document.getElementById('scoreGaugeCircle');
      if (!circle) return;
      const ring = buildScoreRing(score, { max: 900 });
      circle.setAttribute('stroke-dasharray', ring.circumference.toFixed(3));
      circle.style.strokeDashoffset = ring.circumference.toFixed(3);
      circle.classList.toggle('ok', Number(score) >= Number(passingScore || 675));
      const settle = function () {
        circle.style.strokeDashoffset = ring.dashoffset.toFixed(3);
        circle.setAttribute('stroke-dashoffset', ring.dashoffset.toFixed(3));
      };
      applyFinalValue(circle, settle);
      // Belt and braces: a second backstop covers a starved frame queue that
      // outlives the first timer, so the arc never stays at zero on screen.
      setTimeout(settle, 150);
    }

    /** Blueprint-ordered .domain-bar rows, widths animated from zero. */
    renderDomainBreakdown(domainStats, passingScore) {
      const container = document.getElementById('domainBarsContainer');
      if (!container || !domainStats) return;
      // Never blank the panel: an empty stats object means we have nothing to say.
      if (!Object.keys(domainStats).length) return;

      container.innerHTML = buildDomainBars(domainStats, passingScore);

      const fills = container.querySelectorAll('.domain-bar .fill');
      const targets = [];
      fills.forEach(function (el) {
        targets.push(el.style.width);
        el.style.width = '0%';
      });
      const settle = function () {
        fills.forEach(function (el, i) {
          el.style.width = targets[i];
        });
      };
      applyFinalValue(container, settle);
      setTimeout(settle, 150);
    }

    /* ---------------- Review accordion ---------------- */

    filterReview(filter) {
      this.currentFilter = filter;
      this.renderReviewAccordion(filter);
    }

    /** Explanation body: paragraphs plus a "Why the others are wrong" eyebrow. */
    buildExplanationHtml(q) {
      const paras = String(q.explanation || '')
        .split(/\n{2,}|(?<=\.)\s{2,}/)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);

      let html = '<div class="explanation-box">';
      html += '<div class="label">Why this answer</div>';
      if (paras.length) {
        html += paras.map(function (p) { return '<p>' + escapeHTML(p) + '</p>'; }).join('');
      } else {
        html += '<p>No explanation recorded for this item.</p>';
      }

      const da = q.distractor_analysis;
      const opts = q.options || [];
      if (da && Object.keys(da).length) {
        html += '<div class="label">Why the others are wrong</div><ul>';
        Object.keys(da).sort().forEach(function (k) {
          const optText = opts[Number(k)];
          const lead = optText ? escapeHTML(optText) + ': ' : '';
          html += '<li>' + lead + escapeHTML(da[k]) + '</li>';
        });
        html += '</ul>';
      }
      html += '</div>';
      return html;
    }

    renderReviewAccordion(filter = 'all') {
      const container = document.getElementById('reviewQuestionsList');
      if (!container) return;
      container.innerHTML = '';

      const session = APlus.engine;
      const questions = session.questions;

      questions.forEach((q, idx) => {
        const userAns = session.userAnswers[idx];
        const isCorrect = APlus.qtypes.score(q, userAns);
        const isFlagged = session.flaggedQuestions.has(idx);

        if (filter === 'incorrect' && isCorrect) return;
        if (filter === 'flagged' && !isFlagged) return;

        const card = document.createElement('div');
        card.className = 'review-item';

        const dotClass = isFlagged ? 'dot flagged' : (isCorrect ? 'dot correct' : 'dot wrong');
        const statusText = isCorrect ? 'Correct' : 'Incorrect';

        card.innerHTML = `
          <div class="review-item-header" onclick="APlus.ui.toggleReviewBody(${idx})">
            <div class="review-item-stem" style="font-size: 15px; display: flex; align-items: baseline; gap: 0.6rem;">
              <span class="${dotClass}" aria-hidden="true"></span>
              <span class="qnum tnum">Q${idx + 1}</span>
              <span>${escapeHTML(q.question)}</span>
            </div>
            <div class="review-item-status" style="display: flex; align-items: center; gap: 0.75rem;">
              ${isFlagged ? '<span class="label">Flagged</span>' : ''}
              <span class="label">${statusText}</span>
            </div>
          </div>
          <div class="review-body" id="reviewBody_${idx}">
            <p class="review-stem-full" style="font-size: 15px; margin-bottom: 1rem;">${escapeHTML(q.question)}</p>
            ${q.exhibit ? `
              <div class="question-exhibit" style="margin: 0.8rem 0; background: #0c1017; border: 1px solid var(--gold-primary); border-radius: 8px; overflow: hidden;">
                <div style="background: rgba(212, 175, 55, 0.15); padding: 0.4rem 0.8rem; font-weight: 700; color: var(--gold-primary); font-size: 0.82rem;">
                  EXHIBIT: ${escapeHTML(q.exhibit.caption || q.exhibit.title || 'Diagram')}
                </div>
                <div style="padding: 0.8rem; text-align: center; background: #080b11;">
                  <img src="${escapeHTML(q.exhibit.url || q.exhibit.src || '')}" alt="${escapeHTML(q.exhibit.alt || 'Exhibit')}" style="max-width: 100%; max-height: 320px; object-fit: contain; border-radius: 4px;" />
                </div>
              </div>
            ` : ''}
            <div id="reviewOptionMount_${idx}"></div>
            ${this.buildExplanationHtml(q)}
            ${window.APlus && APlus.communityBenchmarks ? APlus.communityBenchmarks.renderBadge(q) : ''}
            ${q.video_reference ? `
              <div class="review-video">
                <span class="label">Video reference</span>
                <span>${escapeHTML(q.video_reference.title)}</span>
                <span class="tnum">${escapeHTML(q.video_reference.duration || '')}</span>
                <a href="${escapeHTML(q.video_reference.url)}" target="_blank" rel="noopener" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.7rem; text-decoration: none;">Watch lesson</a>
              </div>
            ` : ''}
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.25rem 0.55rem; color: var(--gold-light); border-color: var(--border-gold);" onclick="if(window.TMAGhostCoach)TMAGhostCoach.openCoachSheet(APlus.engine.questions[${idx}], (APlus.engine.userAnswers[${idx}] !== undefined && APlus.engine.questions[${idx}].options ? APlus.engine.questions[${idx}].options[APlus.engine.userAnswers[${idx}]] : 'None'))">Ask Ghost Coach</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.25rem 0.55rem;" onclick="APlus.mastery.openHanseiModal(APlus.engine.questions[${idx}])">Why I missed this</button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.25rem 0.55rem; color: var(--accent-amber);" onclick="if(window.APlus&&APlus.problemReporter)APlus.problemReporter.openModal('${escapeHTML(q.id)}')">Report a problem</button>
            </div>
          </div>
        `;

        container.appendChild(card);

        const mount = card.querySelector(`#reviewOptionMount_${idx}`);
        if (mount) {
          APlus.qtypes.renderReview(q, userAns, mount);
        }
      });

      if (container.children.length === 0) {
        container.innerHTML = `<p class="empty-note" style="text-align: center; padding: 2rem;">No questions match the filter "${escapeHTML(filter)}".</p>`;
      }

      APlus.bus.emit('coach:review:rendered', { filter: filter });
    }

    toggleReviewBody(idx) {
      const body = document.getElementById(`reviewBody_${idx}`);
      if (body) body.classList.toggle('open');
    }
  }

  APlus.ui = new UIController();

  /* ------------------------------------------------------------------ *
   * Live shell integration
   *
   * The shipped shell renders its results screen from its own inline
   * functions. We wrap those globals (names unchanged) so the same markup
   * contract applies there, and we relabel the explanations toggle.
   * ------------------------------------------------------------------ */

  /** Recover per-domain counts from the shell's own session object. */
  function domainStatsFromSession() {
    const session = window.currentExamSession;
    if (!session || !Array.isArray(session.questions) || !session.questions.length) return null;
    const stats = {};
    session.questions.forEach(function (q, idx) {
      const name = q.domain || (q.exam === 'core1' ? 'Core 1' : 'Core 2');
      if (!stats[name]) stats[name] = { total: 0, correct: 0 };
      stats[name].total++;
      if (session.userAnswers[idx] === q.answer) stats[name].correct++;
    });
    return stats;
  }

  /**
   * Fallback: read the rows the shell already painted.
   * Each legacy row reads "<domain>" and "12 / 20 (60%)".
   */
  function domainStatsFromMarkup() {
    const container = document.getElementById('domainBarsContainer');
    if (!container) return null;
    const rows = container.querySelectorAll('.domain-item');
    if (!rows.length) return null;
    const stats = {};
    Array.prototype.forEach.call(rows, function (row) {
      const spans = row.querySelectorAll('.domain-header span');
      if (spans.length < 2) return;
      const name = (spans[0].textContent || '').trim();
      const m = /(\d+)\s*\/\s*(\d+)/.exec(spans[1].textContent || '');
      if (!name || !m) return;
      stats[name] = { correct: parseInt(m[1], 10), total: parseInt(m[2], 10) };
    });
    return Object.keys(stats).length ? stats : null;
  }

  function domainStatsFromShell() {
    return domainStatsFromSession() || domainStatsFromMarkup();
  }

  function shellScore() {
    const el = document.getElementById('scaledScoreDisplay');
    const n = el ? parseInt(String(el.innerText).replace(/[^0-9]/g, ''), 10) : NaN;
    return isNaN(n) ? 0 : n;
  }

  function shellPassingScore() {
    const session = window.currentExamSession;
    return (session && session.passingScore) || 675;
  }

  function upgradeShellResults() {
    if (!hasDoc) return;
    const passing = shellPassingScore();
    const score = shellScore();
    const session = window.currentExamSession;
    const isMemory = !!(session && session.type === 'memory');

    if (!isMemory) {
      APlus.ui.renderScoreHero(score, passing, score >= passing);
    } else {
      APlus.ui.updateScoreGauge(score, passing);
    }

    const stats = domainStatsFromShell();
    if (stats) APlus.ui.renderDomainBreakdown(stats, passing);
    relabelExplanationToggles();
  }

  function upgradeShellReviewRows() {
    if (!hasDoc) return;
    const list = document.getElementById('reviewQuestionsList');
    if (!list) return;
    list.querySelectorAll('.review-item-header').forEach(function (header) {
      if (header.dataset.aplusDot === '1') return;
      header.dataset.aplusDot = '1';

      const spans = header.querySelectorAll('span');
      let status = null;
      let flagged = false;
      spans.forEach(function (s) {
        const t = (s.textContent || '').trim();
        if (t === 'Correct' || t === 'Incorrect') status = s;
        if (t === 'Flagged') {
          flagged = true;
          s.removeAttribute('style');
          s.className = 'label';
        }
      });
      if (status) {
        status.removeAttribute('style');
        status.className = 'label';
      }
      // Drop the caret glyph the shell appends.
      spans.forEach(function (s) {
        if ((s.textContent || '').trim() === '▼') s.remove();
      });

      const isCorrect = status ? (status.textContent || '').trim() === 'Correct' : false;
      const dot = document.createElement('span');
      dot.className = flagged ? 'dot flagged' : (isCorrect ? 'dot correct' : 'dot wrong');
      dot.setAttribute('aria-hidden', 'true');

      const first = header.firstElementChild;
      if (first) {
        first.style.fontSize = '15px';
        first.style.display = 'flex';
        first.style.alignItems = 'baseline';
        first.style.gap = '0.6rem';
        first.insertBefore(dot, first.firstChild);
      }
    });

    list.querySelectorAll('.explanation-box .explanation-title').forEach(function (title) {
      title.className = 'label';
      title.textContent = 'Why this answer';
    });

    relabelExplanationToggles();
  }

  function relabelExplanationToggles() {
    if (!hasDoc) return;
    // The toggle reflects the stored preference, which only governs practice
    // mode. Mock and diagnostic runs show a quiet toolbar note instead.
    const T = window.TutorMode;
    const on = (T && typeof T.isEnabledByUser === 'function')
      ? T.isEnabledByUser()
      : (T && typeof T.isOn === 'function' ? T.isOn() : true);
    document.querySelectorAll('[data-tutor-toggle]').forEach(function (el) {
      if (el.type === 'checkbox') return;
      el.textContent = on ? 'Explanations: on' : 'Explanations: off';
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (T && typeof T.syncExamToolbarNote === 'function') {
      try { T.syncExamToolbarNote(); } catch (_) {}
    }
  }

  function wrapGlobal(name, after) {
    const original = window[name];
    if (typeof original !== 'function' || original._aplusResultsWrapped) return;
    const wrapped = function () {
      const out = original.apply(this, arguments);
      try { after.apply(null, arguments); } catch (err) {
        console.error('[ui] results upgrade failed for ' + name + ':', err);
      }
      return out;
    };
    wrapped._aplusResultsWrapped = true;
    window[name] = wrapped;
  }

  /**
   * Give every exam toolbar control the shared 44px hit-target class and
   * make sure the countdown owns its own slot.
   */
  function decorateExamToolbar() {
    if (!hasDoc) return;
    const toolbar = document.querySelector('.exam-toolbar');
    if (toolbar) {
      toolbar.querySelectorAll('button').forEach(function (b) {
        b.classList.add('toolbar-btn');
      });
    }
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.classList.add('timer-display');
    const timerDigits = document.getElementById('timerDigits');
    if (timerDigits) timerDigits.classList.add('timer-digits');
    if (window.TutorMode && typeof window.TutorMode.syncExamToolbarNote === 'function') {
      try { window.TutorMode.syncExamToolbarNote(); } catch (_) {}
    }
  }

  /**
   * Buttons injected into the drawer by feature modules (the coach session
   * card, for one) join the same list vocabulary, so the drawer never grows a
   * second competing button style.
   */
  function normalizeDrawerButtons() {
    if (!hasDoc) return;
    const drawer = document.getElementById('moreMenu');
    if (!drawer) return;
    drawer.querySelectorAll('#featureCards .btn, #ghostCoachMission .btn').forEach(function (b) {
      if (b.dataset.aplusDrawerItem === '1') return;
      b.dataset.aplusDrawerItem = '1';
      b.classList.remove('btn', 'btn-secondary', 'btn-green', 'btn-amber', 'btn-red');
      b.classList.add('drawer-item');
      // Feature modules set a highlight colour inline. Drop it so the drawer
      // keeps exactly one accented action.
      b.style.backgroundColor = '';
      b.style.color = '';
      if (!b.querySelector('.drawer-item-text')) {
        const label = (b.textContent || '').trim();
        b.innerHTML = '<svg class="drawer-icon" width="18" height="18" viewBox="0 0 24 24"' +
          ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"' +
          ' stroke-linejoin="round" aria-hidden="true" focusable="false">' +
          '<circle cx="12" cy="12" r="9"></circle><path d="m15 9-2 5-5 2 2-5 5-2Z"></path></svg>' +
          '<span class="drawer-item-text">' + escapeHTML(label) + '</span>';
      }
    });
  }

  function installShellHooks() {
    wrapGlobal('openMoreMenu', function () {
      normalizeDrawerButtons();
      setTimeout(normalizeDrawerButtons, 120);
    });
    wrapGlobal('renderQuestion', function () {
      normalizeOptionRows(document.getElementById('optionsList'));
    });
    wrapGlobal('startExam', decorateExamToolbar);
    wrapGlobal('showResults', upgradeShellResults);
    wrapGlobal('finishExam', upgradeShellResults);
    wrapGlobal('renderReviewAccordion', upgradeShellReviewRows);
    if (window.TutorMode && typeof window.TutorMode.syncToggleUi === 'function'
        && !window.TutorMode.syncToggleUi._aplusResultsWrapped) {
      const orig = window.TutorMode.syncToggleUi;
      const wrapped = function () {
        const out = orig.apply(this, arguments);
        try { relabelExplanationToggles(); } catch (_) {}
        return out;
      };
      wrapped._aplusResultsWrapped = true;
      window.TutorMode.syncToggleUi = wrapped;
    }
    relabelExplanationToggles();
    upgradeShellReviewRows();
    decorateExamToolbar();
    if (APlus.bus) {
      APlus.bus.on('exam:started', decorateExamToolbar);
    }
    // The shell paints some controls after its own boot animation finishes.
    setTimeout(relabelExplanationToggles, 1200);
  }

  function boot() {
    // Run after the shell's own DOMContentLoaded handlers have registered.
    setTimeout(installShellHooks, 0);
  }

  if (hasDoc) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  APlus.results = {
    normalizeOptionRows: normalizeOptionRows,
    normalizeDrawerButtons: normalizeDrawerButtons,
    prefersNoAnimation: prefersNoAnimation,
    buildScoreRing: buildScoreRing,
    buildDomainBarRow: buildDomainBarRow,
    buildDomainBars: buildDomainBars,
    buildScoreCopy: buildScoreCopy,
    passLinePercent: passLinePercent,
    sortDomainsByBlueprint: sortDomainsByBlueprint,
    BLUEPRINT_ORDER: BLUEPRINT_ORDER
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = APlus.results;
  }

})(typeof window !== 'undefined' ? window : this);
