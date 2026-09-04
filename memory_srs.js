/**
 * CompTIA A+ Memory SRS (SM-2 style)
 * Spaced repetition queue for question IDs. Profile-scoped via CompTIAProfiles when available.
 *
 * Intervals (days): fail -> 1; first success -> 1; second -> 3; later -> round(prev * EF)
 * Grades: 1 again, 3 hard, 4 good, 5 easy
 */
(function (global) {
  const STORAGE_KEY = "comptia_memory_srs_v1";
  const RAID_META_KEY = "comptia_memory_raid_meta_v1";

  function storageGet(key) {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedGet) {
      return CompTIAProfiles.scopedGet(key);
    }
    return localStorage.getItem(key);
  }

  function storageSet(key, value) {
    if (global.CompTIAProfiles && CompTIAProfiles.scopedSet) {
      CompTIAProfiles.scopedSet(key, value);
      return;
    }
    localStorage.setItem(key, value);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(isoDay, days) {
    const d = new Date(isoDay + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function emptyState() {
    return { version: 1, cards: {} };
  }

  function loadState() {
    try {
      const raw = storageGet(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.cards !== "object") return emptyState();
      return parsed;
    } catch (_) {
      return emptyState();
    }
  }

  function saveState(state) {
    storageSet(STORAGE_KEY, JSON.stringify(state));
  }

  function ensureCard(state, questionId, meta) {
    if (state.cards[questionId]) return state.cards[questionId];
    const card = {
      id: questionId,
      ef: 2.5,
      interval: 0,
      repetitions: 0,
      due: todayKey(),
      lapses: 0,
      lastGrade: null,
      lastReviewed: null,
      domain: (meta && meta.domain) || "",
      exam: (meta && meta.exam) || "",
      createdAt: new Date().toISOString()
    };
    state.cards[questionId] = card;
    return card;
  }

  /**
   * SM-2 update. grade: 1=again, 3=hard, 4=good, 5=easy
   */
  function reviewCard(questionId, grade, meta) {
    const g = Number(grade);
    if (![1, 3, 4, 5].includes(g)) {
      return { ok: false, error: "Invalid grade" };
    }
    const state = loadState();
    const card = ensureCard(state, questionId, meta || {});
    if (meta && meta.domain) card.domain = meta.domain;
    if (meta && meta.exam) card.exam = meta.exam;

    const prevInterval = card.interval || 0;
    const prevReps = card.repetitions || 0;

    if (g < 3) {
      card.repetitions = 0;
      card.interval = 1;
      card.lapses = (card.lapses || 0) + 1;
      card.ef = Math.max(1.3, (card.ef || 2.5) - 0.2);
    } else {
      let ef = card.ef || 2.5;
      // SM-2 EF update
      ef = ef + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));
      if (ef < 1.3) ef = 1.3;
      card.ef = Math.round(ef * 100) / 100;

      if (prevReps === 0) {
        card.interval = g === 5 ? 2 : 1;
      } else if (prevReps === 1) {
        card.interval = g === 3 ? 2 : g === 5 ? 4 : 3;
      } else {
        let next = Math.round(prevInterval * card.ef);
        if (g === 3) next = Math.max(1, Math.round(next * 0.8));
        if (g === 5) next = Math.max(1, Math.round(next * 1.3));
        card.interval = Math.max(1, next);
      }
      card.repetitions = prevReps + 1;
    }

    card.lastGrade = g;
    card.lastReviewed = new Date().toISOString();
    card.due = addDays(todayKey(), card.interval);
    state.cards[questionId] = card;
    saveState(state);
    return { ok: true, card: { ...card } };
  }

  function enqueueMissed(questionIds, lookupFn) {
    const state = loadState();
    let added = 0;
    (questionIds || []).forEach((id) => {
      if (!id) return;
      const meta = typeof lookupFn === "function" ? lookupFn(id) || {} : {};
      const existing = state.cards[id];
      if (!existing) {
        ensureCard(state, id, meta);
        added += 1;
      } else {
        // Missed again: make due today and bump lapse lightly
        existing.due = todayKey();
        if (meta.domain) existing.domain = meta.domain;
        if (meta.exam) existing.exam = meta.exam;
      }
    });
    saveState(state);
    return { added, total: Object.keys(state.cards).length };
  }

  function getDueCards(limit) {
    const state = loadState();
    const today = todayKey();
    const due = Object.values(state.cards)
      .filter((c) => c.due <= today)
      .sort((a, b) => {
        if (a.due !== b.due) return a.due < b.due ? -1 : 1;
        return (b.lapses || 0) - (a.lapses || 0);
      });
    if (limit && limit > 0) return due.slice(0, limit);
    return due;
  }

  function getStats() {
    const state = loadState();
    const cards = Object.values(state.cards);
    const today = todayKey();
    const due = cards.filter((c) => c.due <= today).length;
    const learning = cards.filter((c) => (c.repetitions || 0) < 2).length;
    const mature = cards.filter((c) => (c.repetitions || 0) >= 2 && c.due > today).length;
    return {
      total: cards.length,
      due,
      learning,
      mature,
      today
    };
  }

  function loadRaidMeta() {
    try {
      const raw = storageGet(RAID_META_KEY);
      if (!raw) return { lastRaidDay: null, raidsCompleted: 0 };
      return JSON.parse(raw);
    } catch (_) {
      return { lastRaidDay: null, raidsCompleted: 0 };
    }
  }

  function saveRaidMeta(meta) {
    storageSet(RAID_META_KEY, JSON.stringify(meta));
  }

  function raidClaimedToday() {
    return loadRaidMeta().lastRaidDay === todayKey();
  }

  function markRaidComplete() {
    const meta = loadRaidMeta();
    meta.lastRaidDay = todayKey();
    meta.raidsCompleted = (meta.raidsCompleted || 0) + 1;
    saveRaidMeta(meta);
    return meta;
  }

  /**
   * APX for one successful recall.
   * Base 3; +2 if card had prior lapses; +1 easy grade; first-of-day card bonus handled by raid.
   */
  function apxForSuccessfulRecall(card, grade) {
    let apx = 3;
    if (card && (card.lapses || 0) > 0) apx += 2;
    if (grade === 5) apx += 1;
    if ((card && card.repetitions) >= 2) apx += 1;
    return apx;
  }

  global.CompTIAMemorySRS = {
    STORAGE_KEY,
    RAID_META_KEY,
    loadState,
    saveState,
    ensureCard,
    reviewCard,
    enqueueMissed,
    getDueCards,
    getStats,
    raidClaimedToday,
    markRaidComplete,
    loadRaidMeta,
    apxForSuccessfulRecall,
    todayKey,
    addDays
  };
})(window);
