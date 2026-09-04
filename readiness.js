/**
 * Exam readiness banner data for Core 1 / Core 2.
 *
 * THERE IS NO FORMULA IN THIS FILE.
 *
 * The predicted score and the readiness percent both come from the one
 * canonical readiness function, APlus.readiness2.compute (js/onboarding.js),
 * reading the one canonical history reader, APlus.learner.getHistory
 * (learner_state.js). This module only shapes those numbers into the banner
 * lines and caches the result per profile.
 *
 * WEIGHTS below is retained only as the documented description of the legacy
 * component blend that used to live here, and for the existing
 * tools/verify_product_trust.js check. It no longer feeds any displayed number.
 *
 * Output cached under comptia_readiness_cache_v1 for the active profile.
 */
(function (global) {
  const STORAGE_KEY = "comptia_readiness_cache_v1";

  /** Legacy descriptive weights. Not used to compute any displayed value. */
  const WEIGHTS = {
    recentExams: 0.45,
    domainCoverage: 0.2,
    objectives: 0.2,
    volume: 0.15
  };

  function storageGet() {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedGet) {
      return CompTIAProfiles.scopedGet(STORAGE_KEY);
    }
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }

  function storageSet(value) {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedSet) {
      CompTIAProfiles.scopedSet(STORAGE_KEY, value);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
  }

  /** The one canonical history reader. Never parse storage history here. */
  function getHistory() {
    try {
      const APlus = global.APlus;
      if (APlus && APlus.learner && typeof APlus.learner.getHistory === "function") {
        const rows = APlus.learner.getHistory();
        return Array.isArray(rows) ? rows : [];
      }
    } catch (err) {
      console.warn("[readiness] canonical history read failed:", err);
    }
    return [];
  }

  function objectivesCompletion(core) {
    try {
      if (global.CompTIAProfiles && typeof CompTIAProfiles.objectivesCompletion === "function") {
        return CompTIAProfiles.objectivesCompletion(core);
      }
    } catch (_) {}
    return 0;
  }

  async function volumeDetail() {
    let streak = 0;
    let exams = 0;
    let activeDays = 0;
    if (global.CompTIALedger) {
      try {
        const state = await CompTIALedger.getState();
        streak = state.wallet.streak || 0;
        exams = state.wallet.exams || 0;
        activeDays = state.wallet.activeDays || 0;
      } catch (_) {}
    }
    return {
      streak,
      exams,
      activeDays,
      detail: "streak " + streak + "d, exams " + exams + ", active days " + activeDays
    };
  }

  /**
   * computeCore(core) - the banner reading for one exam.
   * percent and predicted are taken verbatim from APlus.readiness2.compute.
   */
  async function computeCore(core, sharedHistory) {
    const history = Array.isArray(sharedHistory) ? sharedHistory : getHistory();
    const APlus = global.APlus;

    let summary = null;
    let result = null;
    if (APlus && APlus.readiness2 && typeof APlus.readiness2.compute === "function") {
      result = APlus.readiness2.compute({ exam: core, history: history });
      summary = APlus.readiness2.format.summary(result);
    } else {
      console.warn("[readiness] APlus.readiness2 is unavailable; banner shows no reading.");
    }

    const volume = await volumeDetail();

    return {
      core,
      percent: summary && summary.hasData ? summary.readiness : 0,
      percentText: summary ? summary.readinessText : "--",
      predicted: summary ? summary.predicted : null,
      predictedText: summary ? summary.predictedText : "--",
      statusText: summary ? summary.statusText : "No attempts yet",
      passRateText: summary ? summary.passRateText : "No attempts yet",
      lastAttempt: summary ? summary.lastAttempt : null,
      hasData: Boolean(summary && summary.hasData),
      source: summary ? summary.source : "none",
      weights: WEIGHTS,
      components: {
        history: { attempts: result ? result.historyAttempts : 0, scores: result ? result.historyScores : [] },
        objectives: { factor: objectivesCompletion(core) },
        volume: volume
      },
      passingScore: result ? result.passing : core === "core2" ? 700 : 675
    };
  }

  function examDateFromPlan() {
    if (global.CompTIAStudyPlan) {
      const plan = CompTIAStudyPlan.getPlan();
      if (plan && plan.examDate) return plan.examDate;
    }
    return null;
  }

  async function computeAll() {
    // One history read shared by both cores, so the two lines cannot disagree.
    const history = getHistory();
    const core1 = await computeCore("core1", history);
    const core2 = await computeCore("core2", history);
    const examDate = examDateFromPlan();
    const result = {
      computedAt: new Date().toISOString(),
      examDate,
      core1,
      core2,
      summaryLines: [formatLine(core1, examDate), formatLine(core2, examDate)]
    };
    storageSet(JSON.stringify(result));
    return result;
  }

  function formatLine(coreResult, examDate) {
    const label = coreResult.core === "core2" ? "Core 2" : "Core 1";
    const datePart = examDate ? " by " + examDate : "";
    if (!coreResult.hasData) {
      return "No attempts yet for " + label + ". Take the diagnostic to get a reading.";
    }
    return "You are " + coreResult.percentText + " ready for " + label + datePart;
  }

  function getCached() {
    try {
      const raw = storageGet();
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function refreshAndFormat() {
    return computeAll();
  }

  global.CompTIAReadiness = {
    STORAGE_KEY,
    WEIGHTS,
    getHistory,
    computeCore,
    computeAll,
    getCached,
    refreshAndFormat,
    formatLine
  };
})(
  typeof window !== "undefined" && window
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this
);
