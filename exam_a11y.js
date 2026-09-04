/**
 * Exam accessibility: keyboard-first UX, ARIA helpers, live region, shortcut help.
 */
(function (global) {
  const HELP_ID = "examShortcutHelpModal";
  const LIVE_ID = "examA11yLiveRegion";
  let optionFocusIndex = 0;
  let installed = false;

  function isExamActive() {
    const screen = document.getElementById("examScreen");
    return !!(screen && screen.classList.contains("active"));
  }

  function anyModalOpen() {
    return !!document.querySelector(".modal-overlay.active");
  }

  function closeTopModal() {
    const open = document.querySelector(".modal-overlay.active");
    if (!open) return false;
    const id = open.id;
    if (id === "reviewModal" && typeof global.closeReviewModal === "function") global.closeReviewModal();
    else if (id === "pbqModal" && typeof global.closePBQModal === "function") global.closePBQModal();
    else if (id === "ledgerModal" && typeof global.closeLedgerModal === "function") global.closeLedgerModal();
    else if (id === "studyLibraryModal" && typeof global.closeStudyLibraryModal === "function") global.closeStudyLibraryModal();
    else if (id === "messerModal" && typeof global.closeMesserModal === "function") global.closeMesserModal();
    else if (id === HELP_ID) closeShortcutHelp();
    else open.classList.remove("active");
    announce("Dialog closed");
    return true;
  }

  function ensureLiveRegion() {
    let el = document.getElementById(LIVE_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = LIVE_ID;
    el.className = "sr-only";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    document.body.appendChild(el);
    return el;
  }

  function announce(msg) {
    const el = ensureLiveRegion();
    el.textContent = "";
    window.setTimeout(() => {
      el.textContent = msg;
    }, 30);
  }

  function ensureShortcutHelp() {
    if (document.getElementById(HELP_ID)) return;
    const overlay = document.createElement("div");
    overlay.id = HELP_ID;
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "shortcutHelpTitle");
    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header">
          <h3 id="shortcutHelpTitle" style="font-size: 1.2rem;">Exam keyboard shortcuts</h3>
          <button type="button" class="modal-close-btn" aria-label="Close shortcut help" onclick="ExamA11y.closeShortcutHelp()">&times;</button>
        </div>
        <ul class="shortcut-help-list" style="list-style:none; display:flex; flex-direction:column; gap:0.55rem; font-size:0.92rem;">
          <li><kbd>1</kbd>-<kbd>5</kbd> or <kbd>A</kbd>-<kbd>D</kbd> : Select option</li>
          <li><kbd>Shift</kbd>+<kbd>1</kbd>-<kbd>5</kbd> : Eliminate option</li>
          <li><kbd>N</kbd> / <kbd>Right arrow</kbd> : Next question</li>
          <li><kbd>P</kbd> / <kbd>Left arrow</kbd> : Previous question</li>
          <li><kbd>F</kbd> : Flag / unflag for review</li>
          <li><kbd>M</kbd> : Open question matrix / review</li>
          <li><kbd>S</kbd> : Eliminate the focused or selected option</li>
          <li><kbd>?</kbd> : Toggle this help</li>
          <li><kbd>Esc</kbd> : Close open dialog</li>
        </ul>
        <div style="display:flex; justify-content:flex-end; margin-top:1.25rem;">
          <button type="button" class="btn btn-secondary" onclick="ExamA11y.closeShortcutHelp()">Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  function openShortcutHelp() {
    ensureShortcutHelp();
    document.getElementById(HELP_ID).classList.add("active");
    announce("Shortcut help opened");
  }

  function closeShortcutHelp() {
    const el = document.getElementById(HELP_ID);
    if (el) el.classList.remove("active");
  }

  function toggleShortcutHelp() {
    const el = document.getElementById(HELP_ID);
    if (el && el.classList.contains("active")) closeShortcutHelp();
    else openShortcutHelp();
  }

  function decorateStaticAria() {
    const exam = document.getElementById("examScreen");
    if (exam) {
      exam.setAttribute("role", "main");
      exam.setAttribute("aria-label", "Active exam");
    }
    const timer = document.getElementById("timerDisplay");
    if (timer) {
      timer.setAttribute("role", "timer");
      timer.setAttribute("aria-live", "off");
      timer.setAttribute("aria-label", "Exam time remaining");
    }
    const timerDigits = document.getElementById("timerDigits");
    if (timerDigits) timerDigits.setAttribute("aria-atomic", "true");

    const opts = document.getElementById("optionsList");
    if (opts) {
      opts.setAttribute("role", "radiogroup");
      opts.setAttribute("aria-label", "Answer choices");
    }

    const matrix = document.getElementById("matrixGrid");
    if (matrix) {
      matrix.setAttribute("role", "navigation");
      matrix.setAttribute("aria-label", "Question matrix");
    }

    const qText = document.getElementById("questionText");
    if (qText) qText.setAttribute("aria-live", "polite");

    const flagBtn = document.getElementById("flagBtn");
    if (flagBtn) flagBtn.setAttribute("aria-pressed", "false");

    ["reviewModal", "pbqModal", "ledgerModal", "studyLibraryModal", "messerModal"].forEach((id) => {
      const m = document.getElementById(id);
      if (!m) return;
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      const title = m.querySelector("h3");
      if (title) {
        if (!title.id) title.id = id + "Title";
        m.setAttribute("aria-labelledby", title.id);
      }
      m.querySelectorAll(".modal-header button, .modal-header > button").forEach((btn) => {
        if (!btn.getAttribute("aria-label")) btn.setAttribute("aria-label", "Close dialog");
        btn.setAttribute("type", "button");
      });
    });

    const results = document.getElementById("resultsScreen");
    if (results) results.setAttribute("aria-label", "Exam results");

    // Floating help hint on exam screen
    if (!document.getElementById("examShortcutHintBtn") && exam) {
      const hint = document.createElement("button");
      hint.id = "examShortcutHintBtn";
      hint.type = "button";
      hint.className = "btn btn-secondary exam-shortcut-hint";
      hint.title = "Keyboard shortcuts (?)";
      hint.setAttribute("aria-label", "Show keyboard shortcuts");
      hint.textContent = "Shortcuts";
      hint.onclick = openShortcutHelp;
      const panel = exam.querySelector(".question-panel .nav-bar");
      if (panel) {
        const slot = document.createElement("div");
        slot.style.cssText = "display:flex; gap:0.5rem; align-items:center;";
        // insert before existing flex children end - add as sibling near prev
        panel.insertBefore(hint, panel.firstChild);
      }
    }
  }

  function enhanceOptionsInDom() {
    const container = document.getElementById("optionsList");
    if (!container) return;
    const items = Array.from(container.querySelectorAll(".option-item"));
    items.forEach((item, optIdx) => {
      item.setAttribute("role", "radio");
      item.setAttribute("tabindex", optIdx === optionFocusIndex ? "0" : "-1");
      item.setAttribute("aria-checked", item.classList.contains("selected") ? "true" : "false");
      item.setAttribute("aria-label", `Option ${String.fromCharCode(65 + optIdx)}`);
      if (item.classList.contains("eliminated")) {
        item.setAttribute("aria-disabled", "false");
        item.setAttribute("data-eliminated", "true");
      }
      item.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (typeof global.selectOption === "function") global.selectOption(optIdx);
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const dir = e.key === "ArrowDown" ? 1 : -1;
          const next = (optIdx + dir + items.length) % items.length;
          optionFocusIndex = next;
          items.forEach((it, i) => it.setAttribute("tabindex", i === next ? "0" : "-1"));
          items[next].focus();
        }
      };
    });
    const flagBtn = document.getElementById("flagBtn");
    if (flagBtn && global.currentExamSession) {
      const flagged = global.currentExamSession.flaggedQuestions.has(global.currentExamSession.currentIndex);
      flagBtn.setAttribute("aria-pressed", flagged ? "true" : "false");
    }
  }

  function announceQuestion() {
    if (!global.currentExamSession || !global.currentExamSession.questions.length) return;
    const sess = global.currentExamSession;
    const idx = sess.currentIndex;
    const q = sess.questions[idx];
    const flagged = sess.flaggedQuestions.has(idx) ? " Flagged." : "";
    const ans = sess.userAnswers[idx];
    const ansTxt = ans === undefined ? " No answer selected." : ` Option ${String.fromCharCode(65 + ans)} selected.`;
    announce(`Question ${idx + 1} of ${sess.questions.length}. ${q.domain || ""}.${flagged}${ansTxt}`);
    optionFocusIndex = typeof ans === "number" ? ans : 0;
  }

  /** Eliminate a specific option by its zero-based row index. */
  function eliminateByIndex(optIdx) {
    if (typeof optIdx !== "number" || optIdx < 0) return;
    const items = Array.from(document.querySelectorAll("#optionsList .option-item"));
    if (optIdx >= items.length) return;
    if (typeof global.toggleEliminate === "function") {
      global.toggleEliminate({ stopPropagation() {} }, optIdx);
    } else if (global.APlus && global.APlus.engine
      && typeof global.APlus.engine.toggleEliminateOption === "function") {
      global.APlus.engine.toggleEliminateOption(optIdx);
    } else {
      return;
    }
    announce(`Option ${String.fromCharCode(65 + optIdx)} elimination toggled`);
  }

  function strikeFocusedOrSelected() {
    if (typeof global.toggleEliminate !== "function" || !global.currentExamSession) return;
    const sess = global.currentExamSession;
    const focused = document.activeElement;
    let optIdx = null;
    if (focused && focused.classList.contains("option-item")) {
      const items = Array.from(document.querySelectorAll("#optionsList .option-item"));
      optIdx = items.indexOf(focused);
    }
    if (optIdx === null || optIdx < 0) {
      const selected = sess.userAnswers[sess.currentIndex];
      optIdx = typeof selected === "number" ? selected : optionFocusIndex;
    }
    if (optIdx === null || optIdx < 0) return;
    const fakeEvent = { stopPropagation() {} };
    global.toggleEliminate(fakeEvent, optIdx);
    announce(`Option ${String.fromCharCode(65 + optIdx)} strike toggled`);
  }

  function enhanceMatrixButtons() {
    document.querySelectorAll("#matrixGrid .matrix-btn, #modalMatrixGrid .matrix-btn").forEach((btn, i) => {
      const n = btn.textContent.trim();
      btn.setAttribute("type", "button");
      btn.setAttribute("aria-label", `Go to question ${n}`);
      if (btn.classList.contains("active")) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  function wrapRenderHooks() {
    const origRender = global.renderQuestion;
    if (typeof origRender === "function" && !origRender._a11yWrapped) {
      global.renderQuestion = function wrappedRenderQuestion() {
        origRender.apply(this, arguments);
        enhanceOptionsInDom();
        enhanceMatrixButtons();
        announceQuestion();
      };
      global.renderQuestion._a11yWrapped = true;
    }

    const origMatrix = global.renderMatrix;
    if (typeof origMatrix === "function" && !origMatrix._a11yWrapped) {
      global.renderMatrix = function wrappedRenderMatrix() {
        origMatrix.apply(this, arguments);
        enhanceMatrixButtons();
      };
      global.renderMatrix._a11yWrapped = true;
    }

    const origFinish = global.finishExam;
    if (typeof origFinish === "function" && !origFinish._a11yWrapped) {
      global.finishExam = function wrappedFinishExam() {
        const result = origFinish.apply(this, arguments);
        try {
          const scoreEl = document.getElementById("scaledScoreDisplay");
          const titleEl = document.getElementById("passFailTitle");
          if (scoreEl && titleEl) {
            announce(`${titleEl.textContent}. Scaled score ${scoreEl.textContent} out of 900.`);
          }
        } catch (_) {}
        return result;
      };
      global.finishExam._a11yWrapped = true;
    }
  }

  function onKeyDown(e) {
    const tag = (e.target && e.target.tagName) || "";
    const typing =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      (e.target && e.target.isContentEditable);

    if (e.key === "Escape") {
      if (closeTopModal()) {
        e.preventDefault();
      }
      return;
    }

    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (typing) return;
      e.preventDefault();
      toggleShortcutHelp();
      return;
    }

    if (!isExamActive()) return;
    if (typing) return;

    // Allow Esc/help already handled; skip other shortcuts when a modal (except we still want Esc)
    const helpOpen = document.getElementById(HELP_ID)?.classList.contains("active");
    if (helpOpen) return;
    if (anyModalOpen()) return;

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;

    // Shift plus a digit eliminates that option. The shifted characters are
    // sent instead of the digits on most layouts, so both are accepted.
    const SHIFTED_DIGITS = { "!": 0, "@": 1, "#": 2, "$": 3, "%": 4 };
    if (e.shiftKey && (SHIFTED_DIGITS[e.key] !== undefined || ["1", "2", "3", "4", "5"].includes(e.key))) {
      e.preventDefault();
      const elimIdx = SHIFTED_DIGITS[e.key] !== undefined
        ? SHIFTED_DIGITS[e.key]
        : parseInt(e.key, 10) - 1;
      eliminateByIndex(elimIdx);
      return;
    }

    if (["1", "2", "3", "4", "5"].includes(key)) {
      e.preventDefault();
      const idx = parseInt(key, 10) - 1;
      optionFocusIndex = idx;
      if (typeof global.selectOption === "function") global.selectOption(idx);
      announce(`Selected option ${String.fromCharCode(65 + idx)}`);
    } else if (["A", "B", "C", "D"].includes(key)) {
      e.preventDefault();
      const idx = key.charCodeAt(0) - 65;
      optionFocusIndex = idx;
      if (typeof global.selectOption === "function") global.selectOption(idx);
      announce(`Selected option ${key}`);
    } else if (key === "N" || e.key === "ArrowRight") {
      e.preventDefault();
      if (typeof global.navigateQuestion === "function") global.navigateQuestion(1);
    } else if (key === "P" || e.key === "ArrowLeft") {
      e.preventDefault();
      if (typeof global.navigateQuestion === "function") global.navigateQuestion(-1);
    } else if (key === "F") {
      e.preventDefault();
      if (typeof global.toggleFlagCurrentQuestion === "function") global.toggleFlagCurrentQuestion();
      announce("Flag toggled");
    } else if (key === "M") {
      e.preventDefault();
      if (typeof global.openReviewModal === "function") global.openReviewModal();
      announce("Review matrix opened");
    } else if (key === "S") {
      e.preventDefault();
      strikeFocusedOrSelected();
    }
  }

  function init() {
    if (installed) return;
    installed = true;
    ensureLiveRegion();
    ensureShortcutHelp();
    decorateStaticAria();
    wrapRenderHooks();
    // Replace legacy inline keydown by capturing ours (legacy still fires; we preventDefault on handled keys)
    document.addEventListener("keydown", onKeyDown, true);
  }

  global.ExamA11y = {
    init,
    announce,
    openShortcutHelp,
    closeShortcutHelp,
    toggleShortcutHelp,
    enhanceOptionsInDom
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
