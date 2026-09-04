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
    if (!global.CompTIAMemorySRS) return;
    syncFromMissedBank();
    refreshMemoryHome();
  }

  global.CompTIAMemoryMode = {
    RAID_SIZE,
    init,
    refreshMemoryHome,
    syncFromMissedBank,
    startMemoryRaid,
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
