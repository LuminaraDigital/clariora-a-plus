/**
 * Tutor Mode: why wrong/right panels with Study Library + Professor Messer links.
 */
(function (global) {
  const STORAGE_KEY = "comptia_tutor_mode";
  let includeCorrect = true;

  /** The learner's stored preference, independent of the running session. */
  function isEnabledByUser() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "off";
    } catch (_) {
      return true;
    }
  }

  /** Active session mode, defaulting to practice when nothing is running. */
  function currentMode() {
    const modes = global.APlus && global.APlus.modes;
    if (modes && typeof modes.currentExamMode === "function") {
      try {
        return modes.currentExamMode();
      } catch (_) {}
    }
    const sess = (global.APlus && global.APlus.engine) || global.currentExamSession;
    if (sess && sess.mode) return sess.mode;
    return "practice";
  }

  /** True only when this session may reveal answers as they are selected. */
  function isRevealAllowed() {
    const modes = global.APlus && global.APlus.modes;
    const mode = currentMode();
    if (modes && typeof modes.shouldRevealOnSelect === "function") {
      return modes.shouldRevealOnSelect(mode, isEnabledByUser());
    }
    if (mode === "mock" || mode === "diagnostic") return false;
    return isEnabledByUser();
  }

  /**
   * Legacy name kept for every existing caller. It now answers the live
   * question "may explanations show right now", so mock and diagnostic runs
   * stay clean even when the learner has explanations switched on.
   */
  function isOn() {
    return isRevealAllowed();
  }

  function setOn(on) {
    try {
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    } catch (_) {}
    syncToggleUi();
  }

  function syncToggleUi() {
    const pref = isEnabledByUser();
    const examConditions = !isRevealAllowed() && pref;
    const toggles = document.querySelectorAll("[data-tutor-toggle]");
    toggles.forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = pref;
      } else {
        el.setAttribute("aria-pressed", pref ? "true" : "false");
        el.textContent = pref ? "Explanations: on" : "Explanations: off";
      }
      el.disabled = false;
      el.title = examConditions
        ? "Explanations appear after you submit this exam"
        : "Show explanations while you answer";
    });
    const label = document.getElementById("tutorModeStatusLabel");
    if (label) label.textContent = pref ? "On" : "Off";
    syncExamToolbarNote();
  }

  /**
   * Mock and diagnostic runs get a quiet line in the exam toolbar instead of
   * a live toggle, so the contract is visible without offering a way to break it.
   */
  function syncExamToolbarNote() {
    if (typeof document === "undefined") return;
    const actions = document.querySelector(".exam-toolbar-actions");
    if (!actions) return;
    let note = document.getElementById("examExplanationsNote");
    const examConditions = !isRevealAllowed();
    if (!examConditions) {
      if (note) note.hidden = true;
      return;
    }
    if (!note) {
      note = document.createElement("span");
      note.id = "examExplanationsNote";
      note.className = "toolbar-note";
      note.textContent = "Explanations after submit";
      actions.insertBefore(note, actions.firstChild);
    }
    note.hidden = false;
  }

  function escapeHTML(str) {
    if (typeof global.escapeHTML === "function") return global.escapeHTML(str);
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s.]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
  }

  const STOP = new Set([
    "the", "and", "for", "that", "with", "this", "from", "are", "was", "were",
    "what", "when", "which", "into", "your", "you", "has", "have", "will",
    "can", "not", "most", "likely", "technician", "should", "would", "about",
    "their", "them", "then", "than", "also", "using", "used", "use"
  ]);

  function scoreText(haystack, tokens) {
    const h = String(haystack || "").toLowerCase();
    let score = 0;
    tokens.forEach((t) => {
      if (h.includes(t)) score += t.length > 5 ? 2 : 1;
    });
    return score;
  }

  function findStudyDocs(question) {
    const lib = global.COMPTIA_STUDY_LIBRARY;
    if (!lib || !Array.isArray(lib.documents)) return [];
    const tokens = tokenize(
      [question.domain, question.question, question.explanation, (question.options || []).join(" ")].join(" ")
    );
    const domainHint = String(question.domain || "").toLowerCase();
    const ranked = (lib.documents || [])
      .map((doc) => {
        let score = scoreText(
          [doc.title, doc.domain, doc.category, doc.excerpt, doc.content].join(" "),
          tokens
        );
        if (domainHint && String(doc.domain || "").toLowerCase().includes(domainHint.slice(0, 8))) {
          score += 8;
        }
        if (question.exam && doc.exam && (doc.exam === question.exam || doc.exam === "both")) {
          score += 2;
        }
        return { doc, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return ranked.slice(0, 3).map((x) => x.doc);
  }

  function allMesserVideos() {
    const bags = [];
    if (Array.isArray(global.PROFESSOR_MESSER_1201_VIDEOS)) bags.push(...global.PROFESSOR_MESSER_1201_VIDEOS);
    if (Array.isArray(global.PROFESSOR_MESSER_1202_VIDEOS)) bags.push(...global.PROFESSOR_MESSER_1202_VIDEOS);
    const pm = global.PROFESSOR_MESSER;
    if (pm) {
      if (Array.isArray(pm.Core1)) bags.push(...pm.Core1);
      if (Array.isArray(pm.Core2)) bags.push(...pm.Core2);
      if (Array.isArray(pm.core1)) bags.push(...pm.core1);
      if (Array.isArray(pm.core2)) bags.push(...pm.core2);
    }
    return bags;
  }

  function findMesserVideo(question) {
    if (question.video_reference && question.video_reference.url) {
      return {
        title: question.video_reference.title || "Professor Messer lesson",
        url: question.video_reference.url,
        duration: question.video_reference.duration || "",
        source: "question"
      };
    }
    const videos = allMesserVideos();
    if (!videos.length) return null;
    const tokens = tokenize([question.domain, question.question, question.explanation].join(" "));
    const domainNum = String(question.domain || "").match(/^(\d)/);
    let best = null;
    let bestScore = 0;
    videos.forEach((v) => {
      let score = scoreText([v.title, v.objective, v.duration].join(" "), tokens);
      if (domainNum && String(v.objective || "").startsWith(domainNum[1] + ".")) score += 6;
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    });
    if (!best || bestScore < 2) return null;
    return {
      title: best.title,
      url: best.url || (best.videoId ? `https://www.youtube.com/watch?v=${best.videoId}` : ""),
      duration: best.duration || "",
      source: "search"
    };
  }

  function openStudyNote(docId) {
    if (typeof global.openStudyLibraryModal === "function") global.openStudyLibraryModal();
    window.setTimeout(() => {
      if (typeof global.showStudyDocument === "function") global.showStudyDocument(docId);
    }, 80);
  }

  function buildTutorPanelHtml(q, isCorrect) {
    // Review panels are built after submit, so the stored preference governs
    // here, not the live reveal gate.
    if (!isEnabledByUser()) return "";
    if (isCorrect && !includeCorrect) return "";

    const whyTitle = isCorrect ? "Why this is right" : "Why this was wrong";
    const explanation = q.explanation || "No explanation available for this item.";
    const docs = findStudyDocs(q);
    const video = findMesserVideo(q);

    const docButtons = docs.length
      ? docs
          .map(
            (d) =>
              `<button type="button" class="btn btn-secondary tutor-action-btn" onclick="TutorMode.openStudyNote('${escapeHTML(d.id)}')">Open related study note: ${escapeHTML(d.title.substring(0, 48))}${d.title.length > 48 ? "..." : ""}</button>`
          )
          .join("")
      : `<p class="tutor-muted">No closely matching Study Library document found. Browse the Study Library manually.</p>`;

    const videoBtn = video && video.url
      ? `<a class="btn btn-red tutor-action-btn" href="${escapeHTML(video.url)}" target="_blank" rel="noopener noreferrer">Watch related video: ${escapeHTML(video.title.substring(0, 56))}${video.title.length > 56 ? "..." : ""}</a>`
      : `<p class="tutor-muted">No Professor Messer match found for this domain.</p>`;

    return `
      <div class="tutor-panel" role="region" aria-label="Tutor guidance">
        <div class="tutor-panel-header">${isCorrect ? "Tutor check" : "Tutor coaching"} · ${whyTitle}</div>
        <p class="tutor-why">${escapeHTML(explanation)}</p>
        <div class="tutor-actions">
          ${docButtons}
          ${videoBtn}
        </div>
      </div>`;
  }

  function injectIntoReviewBodies() {
    if (!global.currentExamSession || !isEnabledByUser()) return;
    const sess = global.currentExamSession;
    sess.questions.forEach((q, idx) => {
      const body = document.getElementById(`reviewBody_${idx}`);
      if (!body) return;
      if (body.querySelector(".tutor-panel")) return;
      const userAns = sess.userAnswers[idx];
      const isCorrect = userAns === q.answer;
      body.insertAdjacentHTML("beforeend", buildTutorPanelHtml(q, isCorrect));
    });
  }

  function wrapReviewAccordion() {
    const orig = global.renderReviewAccordion;
    if (typeof orig !== "function" || orig._tutorWrapped) return;
    global.renderReviewAccordion = function wrappedReviewAccordion() {
      orig.apply(this, arguments);
      injectIntoReviewBodies();
    };
    global.renderReviewAccordion._tutorWrapped = true;
  }

  function toggleFromUi() {
    setOn(!isEnabledByUser());
    if (typeof global.renderReviewAccordion === "function" && global.currentExamSession) {
      const filter = global.currentReviewFilter || "all";
      global.renderReviewAccordion(filter);
    }
    if (global.ExamA11y) {
      ExamA11y.announce(isEnabledByUser() ? "Explanations on" : "Explanations off");
    }
  }

  function init() {
    wrapReviewAccordion();
    syncToggleUi();
  }

  global.TutorMode = {
    isOn,
    isEnabledByUser,
    isRevealAllowed,
    currentMode,
    syncExamToolbarNote,
    setOn,
    syncToggleUi,
    toggleFromUi,
    openStudyNote,
    buildTutorPanelHtml,
    findStudyDocs,
    findMesserVideo,
    init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
