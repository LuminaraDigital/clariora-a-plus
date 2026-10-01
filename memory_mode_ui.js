/**
 * Memory Mode UI: SRS queue panel, Daily Memory Raid, APX settlement.
 */
(function (global) {
  const RAID_SIZE = 10;
  const RAID_SECONDS_PER_Q = 45;

  function $(id) {
    return document.getElementById(id);
  }

  function allQuestions() {
    const data = global.examData || global.COMPTIA_EXAM_DATA;
    if (!data) return [];
    return [...(data.core1 || []), ...(data.core2 || [])];
  }

  function questionById(id) {
    return allQuestions().find((q) => q.id === id) || null;
  }

  function lookupMeta(id) {
    const q = questionById(id);
    if (!q) return {};
    return { domain: q.domain || "", exam: q.exam || "" };
  }

  function syncFromMissedBank() {
    if (!global.CompTIAMemorySRS) return { added: 0 };
    let missed = [];
    try {
      if (typeof getStoredMissedQuestions === "function") {
        missed = getStoredMissedQuestions();
      } else {
        const raw = localStorage.getItem("comptia_a_plus_missed");
        missed = raw ? JSON.parse(raw) : [];
      }
    } catch (_) {
      missed = [];
    }
    return CompTIAMemorySRS.enqueueMissed(missed, lookupMeta);
  }

  function refreshMemoryHome() {
    if (!global.CompTIAMemorySRS) return;
    syncFromMissedBank();
    const stats = CompTIAMemorySRS.getStats();
    const dueEl = $("memoryDueCount");
    const totalEl = $("memoryTotalCount");
    const raidBtn = $("memoryRaidBtn");
    const statusEl = $("memoryRaidStatus");
    if (dueEl) dueEl.textContent = String(stats.due);
    if (totalEl) totalEl.textContent = String(stats.total);
    if (statusEl) {
      if (CompTIAMemorySRS.raidClaimedToday()) {
        statusEl.textContent = "Daily Memory Raid bonus already claimed today. You can still review due cards.";
      } else {
        statusEl.textContent = stats.due
          ? `${stats.due} card(s) due. Run the raid for APX + spaced mastery.`
          : "No cards due. Miss exam questions or start a seed review to fill the queue.";
      }
    }
    if (raidBtn) {
      raidBtn.disabled = stats.total === 0 && stats.due === 0;
    }
    const learningEl = $("memoryLearningCount");
    const matureEl = $("memoryMatureCount");
    if (learningEl) learningEl.textContent = String(stats.learning);
    if (matureEl) matureEl.textContent = String(stats.mature);
  }

  function buildRaidPool() {
    syncFromMissedBank();
    const due = CompTIAMemorySRS.getDueCards(RAID_SIZE);
    const pool = [];
    const seen = new Set();
    due.forEach((card) => {
      const q = questionById(card.id);
      if (q && !seen.has(q.id)) {
        pool.push(q);
        seen.add(q.id);
      }
    });

    // Fill from remaining SRS cards if needed
    if (pool.length < RAID_SIZE) {
      const state = CompTIAMemorySRS.loadState();
      const rest = Object.values(state.cards)
        .filter((c) => !seen.has(c.id))
        .sort((a, b) => (b.lapses || 0) - (a.lapses || 0));
      for (const card of rest) {
        if (pool.length >= RAID_SIZE) break;
        const q = questionById(card.id);
        if (q) {
          pool.push(q);
          seen.add(q.id);
        }
      }
    }

    // Seed from full bank if still empty (first-time learners)
    if (pool.length === 0) {
      const all = allQuestions();
      const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, RAID_SIZE);
      const st = CompTIAMemorySRS.loadState();
      shuffled.forEach((q) => {
        CompTIAMemorySRS.ensureCard(st, q.id, { domain: q.domain, exam: q.exam });
        pool.push(q);
        seen.add(q.id);
      });
      CompTIAMemorySRS.saveState(st);
    }

    return pool.slice(0, RAID_SIZE);
  }

  function setFlashcardChrome(on) {
    const btn = $("flashcardExitBtn");
    if (btn) {
      btn.hidden = !on;
      btn.style.display = on ? "" : "none";
    }
    if (document.body) document.body.classList.toggle("flashcard-session", !!on);
    const pacing = $("cruciblePacingHorizon");
    if (pacing) {
      pacing.hidden = true;
      pacing.style.display = "none";
      if (!on) pacing.innerHTML = "";
    }
  }

  function leaveExamScreen() {
    const doc = global.document;
    if (!doc) return;
    const screens = doc.querySelectorAll(".screen");
    for (let i = 0; i < screens.length; i++) {
      const on = screens[i].id === "startScreen";
      screens[i].classList.toggle("active", on);
      screens[i].setAttribute("aria-hidden", on ? "false" : "true");
    }
    const header = doc.getElementById("examHeaderControls");
    if (header) header.style.display = "none";
  }

  /**
   * Leave a flashcard session and return to Study. Does not reload the page
   * and does not record the sitting as an exam attempt.
   */
  function abandonMemorySession() {
    global.__aplusFlashcardAbandoned = true;
    try {
      if (global.__aplusShellTimer) {
        clearInterval(global.__aplusShellTimer);
        global.__aplusShellTimer = null;
      }
    } catch (_) {}
    try {
      if (global.currentExamSession) {
        global.currentExamSession.memoryAbandoned = true;
        global.currentExamSession.isPaused = true;
        if (global.currentExamSession.timerInterval) {
          clearInterval(global.currentExamSession.timerInterval);
          global.currentExamSession.timerInterval = null;
        }
      }
    } catch (_) {}
    try {
      const engine = global.APlus && global.APlus.engine;
      if (engine && engine.timerInterval) {
        clearInterval(engine.timerInterval);
        engine.timerInterval = null;
        engine.isPaused = true;
      }
    } catch (_) {}
    setFlashcardChrome(false);
    leaveExamScreen();
    if (typeof global.showScreen === "function") {
      try { global.showScreen("startScreen"); } catch (_) {}
    }
    if (typeof global.switchHomeTab === "function") {
      try { global.switchHomeTab("study"); } catch (_) {}
    }
  }

  function startMemoryRaid() {
    if (!global.CompTIAMemorySRS) {
      alert("Memory SRS engine not loaded.");
      return;
    }
    if (typeof startTimer !== "function" || typeof showScreen !== "function") {
      alert("Exam engine not ready.");
      return;
    }
    const pool = buildRaidPool();
    if (!pool.length) {
      alert("No questions available for Memory Raid yet.");
      return;
    }
    if (typeof shuffleArray === "function") shuffleArray(pool);

    const seconds = Math.max(5 * 60, pool.length * RAID_SECONDS_PER_Q);
    global.__aplusFlashcardAbandoned = false;
    try {
      const engine = global.APlus && global.APlus.engine;
      if (engine && engine.timerInterval) {
        clearInterval(engine.timerInterval);
        engine.timerInterval = null;
      }
    } catch (_) {}
    global.currentExamSession = {
      type: "memory",
      questions: pool,
      currentIndex: 0,
      userAnswers: {},
      eliminatedOptions: {},
      flaggedQuestions: new Set(),
      totalSeconds: seconds,
      remainingSeconds: seconds,
      timerInterval: null,
      isPaused: false,
      passingScore: 675,
      memoryRaid: true
    };
    setFlashcardChrome(true);
    startTimer();
    showScreen("examScreen");
    renderQuestion();
    renderMatrix();
    if (global.CompTIALedgerUI && CompTIALedgerUI.toast) {
      CompTIALedgerUI.toast(
        `<strong>Memory Raid</strong><br>${pool.length} cards · spaced recall · APX for successes`,
        "earn"
      );
    }
  }

  function startDueReview() {
    // Same as raid but labeled review; still awards per-recall APX, raid bonus only once/day via settle
    startMemoryRaid();
  }

  /**
   * Called from finishExam when session.type === 'memory'
   */
  async function settleMemorySession(result) {
    const questions = result.questions || [];
    const answers = result.userAnswers || {};
    let correct = 0;
    let apxTotal = 0;
    let xpTotal = 0;
    const details = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isCorrect = answers[i] === q.answer;
      const grade = isCorrect ? 4 : 1;
      const before = CompTIAMemorySRS.loadState().cards[q.id];
      const reviewed = CompTIAMemorySRS.reviewCard(q.id, grade, {
        domain: q.domain,
        exam: q.exam
      });
      if (isCorrect) {
        correct += 1;
        const cardForReward = before || (reviewed.card || {});
        const apx = CompTIAMemorySRS.apxForSuccessfulRecall(cardForReward, grade);
        apxTotal += apx;
        xpTotal += 8;
        details.push({ id: q.id, correct: true, apx, grade });
        if (global.CompTIALedger && CompTIALedger.appendBlock) {
          await CompTIALedger.appendBlock(
            "MEMORY_RECALL",
            {
              questionId: q.id,
              domain: q.domain,
              grade,
              lapses: (cardForReward && cardForReward.lapses) || 0
            },
            apx,
            8
          );
        }
      } else {
        details.push({ id: q.id, correct: false, apx: 0, grade });
      }
    }

    let raidBonus = 0;
    let perfectBonus = 0;
    const already = CompTIAMemorySRS.raidClaimedToday();
    if (!already && questions.length >= Math.min(5, RAID_SIZE)) {
      raidBonus = 15;
      if (correct === questions.length) perfectBonus = 10;
      CompTIAMemorySRS.markRaidComplete();
      if (global.CompTIALedger && CompTIALedger.appendBlock) {
        await CompTIALedger.appendBlock(
          "MEMORY_RAID_COMPLETE",
          {
            day: CompTIAMemorySRS.todayKey(),
            correct,
            total: questions.length,
            perfect: correct === questions.length,
            perRecallApx: apxTotal
          },
          raidBonus + perfectBonus,
          20
        );
      }
      apxTotal += raidBonus + perfectBonus;
      xpTotal += 20;
      try {
        if (global.APlus && APlus.bus && typeof APlus.bus.emit === "function") {
          APlus.bus.emit("memory:raid:complete", {
            day: CompTIAMemorySRS.todayKey(),
            correct,
            total: questions.length,
            perfect: correct === questions.length
          });
        }
        if (global.APlus && APlus.dailyQuest && typeof APlus.dailyQuest.markLeg === "function") {
          APlus.dailyQuest.markLeg("defend");
        }
      } catch (_) {}
    }

    refreshMemoryHome();
    if (global.CompTIALedgerUI && CompTIALedgerUI.refreshWalletBadge) {
      await CompTIALedgerUI.refreshWalletBadge();
    }

    const banner = $("apxExamRewardBanner");
    if (banner) {
      banner.style.display = "block";
      banner.innerHTML = `<strong style="color:var(--accent-cyan);">Memory Mode +${apxTotal} APX</strong> · ${correct}/${questions.length} recalls succeeded` +
        (raidBonus ? ` · daily raid +${raidBonus}` : already ? " · daily raid bonus already claimed" : "") +
        (perfectBonus ? ` · perfect +${perfectBonus}` : "");
    }
    if (global.CompTIALedgerUI && CompTIALedgerUI.toast) {
      CompTIALedgerUI.toast(
        `<strong>+${apxTotal} APX</strong> from Memory Mode<br>${correct}/${questions.length} successful recalls`,
        "earn"
      );
    }

    return { correct, total: questions.length, apxTotal, xpTotal, details, raidBonus, perfectBonus };
  }

  function openMemoryModal() {
    const modal = $("memoryModal");
    if (!modal) {
      startMemoryRaid();
      return;
    }
    refreshMemoryHome();
    modal.classList.add("active");
  }

  function closeMemoryModal() {
    const modal = $("memoryModal");
    if (modal) modal.classList.remove("active");
  }

  function init() {
    const exitBtn = $("flashcardExitBtn");
    if (exitBtn && exitBtn.getAttribute("data-exit-bound") !== "1") {
      exitBtn.setAttribute("data-exit-bound", "1");
      exitBtn.addEventListener("click", function (e) {
        if (e && e.preventDefault) e.preventDefault();
        abandonMemorySession();
      });
    }
    if (!global.CompTIAMemorySRS) return;
    syncFromMissedBank();
    refreshMemoryHome();
    try {
      if (global.APlus && global.APlus.bus && typeof global.APlus.bus.on === "function") {
        global.APlus.bus.on("exam:started", function (payload) {
          const memory = payload && (payload.type === "memory" || payload.mode === "memory");
          setFlashcardChrome(!!memory);
        });
      }
    } catch (_) {}
  }

  global.CompTIAMemoryMode = {
    RAID_SIZE,
    init,
    refreshMemoryHome,
    syncFromMissedBank,
    startMemoryRaid,
    abandonMemorySession,
    startDueReview,
    settleMemorySession,
    openMemoryModal,
    closeMemoryModal,
    buildRaidPool
  };

  global.openMemoryModal = openMemoryModal;
  global.closeMemoryModal = closeMemoryModal;
  global.startMemoryRaid = startMemoryRaid;
})(window);
