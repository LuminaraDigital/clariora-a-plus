/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * ghost-coach.js - Invisible study nervous system (no chat UI)
 *
 * Observe exam telemetry -> decide weak objectives / confusion pairs ->
 * mutate next mission (sampler + pin note/video) -> measure improvement.
 *
 * File: js/ghost-coach.js
 * Pure decision helpers are requireable from Node for unit tests.
 */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root === 'object' && root) {
    root.APlus = root.APlus || {};
    root.APlus.GhostCoachCore = api.core;
  }
  if (typeof window === 'object' && window) {
    window.APlus = window.APlus || {};
    window.APlus.GhostCoachCore = api.core;
    if (api.mountBrowser) api.mountBrowser(window);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'ghost_coach';
  const MAX_EVENTS = 250;
  const MISSION_SIZE_DEFAULT = 12;
  const RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

  function emptyState() {
    return {
      version: 1,
      objectives: {},
      confusionPairs: {},
      events: [],
      currentMission: null,
      missionHistory: [],
      outcomes: []
    };
  }

  function clamp01(n) {
    return Math.max(0, Math.min(1, Number(n) || 0));
  }

  function normalizeToken(t) {
    return String(t || '')
      .toLowerCase()
      .replace(/[^a-z0-9./+-]/g, '')
      .trim();
  }

  function tokenizeLabel(text) {
    const STOP = new Set([
      'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was', 'were',
      'what', 'when', 'which', 'into', 'your', 'you', 'has', 'have', 'will',
      'can', 'not', 'most', 'likely', 'technician', 'should', 'would', 'about',
      'their', 'them', 'then', 'than', 'also', 'using', 'used', 'use', 'option',
      'none', 'both', 'only', 'able', 'must'
    ]);
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s./+-]/g, ' ')
      .split(/\s+/)
      .map(normalizeToken)
      .filter((w) => w.length > 2 && !STOP.has(w));
  }

  function pairKey(a, b) {
    const x = normalizeToken(a);
    const y = normalizeToken(b);
    if (!x || !y || x === y) return null;
    return x < y ? `${x}|${y}` : `${y}|${x}`;
  }

  function recencyWeight(ts, now) {
    const age = Math.max(0, (now || Date.now()) - (Number(ts) || 0));
    return Math.pow(0.5, age / RECENCY_HALF_LIFE_MS);
  }

  function ensureObjective(state, objective, domain) {
    const key = String(objective || 'unknown');
    if (!state.objectives[key]) {
      state.objectives[key] = {
        objective: key,
        domain: domain || '',
        attempts: 0,
        correct: 0,
        wrong: 0,
        flaggedWrong: 0,
        lastSeen: 0,
        recentWrong: 0,
        recentAttempts: 0
      };
    }
    if (domain && !state.objectives[key].domain) {
      state.objectives[key].domain = domain;
    }
    return state.objectives[key];
  }

  function bumpConfusion(state, key, meta) {
    if (!key) return;
    if (!state.confusionPairs[key]) {
      state.confusionPairs[key] = {
        key: key,
        count: 0,
        lastSeen: 0,
        objectives: {},
        samples: []
      };
    }
    const row = state.confusionPairs[key];
    row.count += 1;
    row.lastSeen = meta.ts || Date.now();
    if (meta.objective) {
      row.objectives[meta.objective] = (row.objectives[meta.objective] || 0) + 1;
    }
    if (meta.sample) {
      row.samples.unshift(meta.sample);
      if (row.samples.length > 5) row.samples.pop();
    }
  }

  function recordAnswerEvent(state, event) {
    const next = state || emptyState();
    const ts = event.ts || Date.now();
    const obj = ensureObjective(next, event.objective, event.domain);
    obj.attempts += 1;
    obj.lastSeen = ts;
    obj.recentAttempts += 1;
    if (event.correct) {
      obj.correct += 1;
    } else {
      obj.wrong += 1;
      obj.recentWrong += 1;
      if (event.flagged) obj.flaggedWrong += 1;

      const wrongText = event.chosenText || '';
      const correctText = event.correctText || '';
      const wrongTokens = tokenizeLabel(wrongText).slice(0, 4);
      const correctTokens = tokenizeLabel(correctText).slice(0, 4);
      wrongTokens.forEach((wt) => {
        correctTokens.forEach((ct) => {
          const key = pairKey(wt, ct);
          bumpConfusion(next, key, {
            ts: ts,
            objective: event.objective,
            sample: {
              questionId: event.id,
              wrong: wrongText.slice(0, 80),
              correct: correctText.slice(0, 80)
            }
          });
        });
      });

      (event.tags || []).forEach((tag, i) => {
        (event.tags || []).slice(i + 1).forEach((other) => {
          const key = pairKey(tag, other);
          bumpConfusion(next, key, { ts: ts, objective: event.objective });
        });
      });
    }

    next.events.unshift({
      ts: ts,
      id: event.id,
      objective: event.objective,
      domain: event.domain,
      correct: Boolean(event.correct),
      flagged: Boolean(event.flagged),
      secondsOnQuestion: Number(event.secondsOnQuestion) || 0,
      chosenIndex: event.chosenIndex,
      examType: event.examType || null
    });
    if (next.events.length > MAX_EVENTS) next.events.length = MAX_EVENTS;

    return next;
  }

  function objectiveWeaknessScore(row, now) {
    if (!row || row.attempts < 1) return 0;
    const err = row.wrong / row.attempts;
    const recency = recencyWeight(row.lastSeen, now);
    const volume = Math.min(1, row.attempts / 8);
    const flagBoost = row.flaggedWrong ? 0.08 : 0;
    return clamp01(err * 0.7 + (1 - (row.correct / row.attempts)) * 0.1 + recency * 0.15 + volume * 0.05 + flagBoost);
  }

  function rankWeakObjectives(state, now, limit) {
    const n = now || Date.now();
    const lim = limit || 5;
    return Object.values(state.objectives || {})
      .filter((o) => o.attempts >= 1 && o.wrong >= 1)
      .map((o) => ({
        ...o,
        weakness: objectiveWeaknessScore(o, n),
        accuracy: o.attempts ? o.correct / o.attempts : 0
      }))
      .sort((a, b) => b.weakness - a.weakness)
      .slice(0, lim);
  }

  function rankConfusionPairs(state, now, limit) {
    const n = now || Date.now();
    const lim = limit || 5;
    return Object.values(state.confusionPairs || {})
      .filter((p) => p.count >= 2)
      .map((p) => ({
        ...p,
        score: p.count * (0.5 + 0.5 * recencyWeight(p.lastSeen, n))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, lim);
  }

  function pickExamTypeFromObjectives(weakList) {
    const counts = { core1: 0, core2: 0 };
    weakList.forEach((w) => {
      const d = String(w.domain || '');
      if (/operating systems|security|software troubleshooting|operational procedures/i.test(d)) {
        counts.core2 += 1;
      } else {
        counts.core1 += 1;
      }
    });
    if (counts.core2 > counts.core1) return 'core2';
    if (counts.core1 > counts.core2) return 'core1';
    return 'both';
  }

  function buildMission(state, options) {
    const opts = options || {};
    const now = opts.now || Date.now();
    const size = opts.size || MISSION_SIZE_DEFAULT;
    const weak = rankWeakObjectives(state, now, 5);
    const pairs = rankConfusionPairs(state, now, 3);

    if (weak.length === 0) {
      return {
        id: `mission-bootstrap-${now}`,
        createdAt: now,
        kind: 'bootstrap',
        title: "Today's mission: Core fundamentals sampler",
        summary: 'No weak-spot telemetry yet. Run a short weighted drill to feed the ghost coach.',
        examType: opts.preferredExamType || 'core1',
        size: Math.min(size, 12),
        timeMinutes: 15,
        weakObjectives: [],
        boostObjectives: [],
        confusionPairs: [],
        pinNote: null,
        pinVideo: null,
        reason: 'bootstrap'
      };
    }

    const primary = weak[0];
    const boostObjectives = weak.slice(0, 3).map((w) => w.objective);
    const examType = opts.preferredExamType || pickExamTypeFromObjectives(weak);
    const pairLabels = pairs.map((p) => p.key.replace('|', ' vs '));

    let summary = `Focus: objective ${primary.objective}`;
    if (primary.domain) summary += ` (${primary.domain})`;
    summary += `. Accuracy ${Math.round(primary.accuracy * 100)}% over ${primary.attempts} attempts.`;
    if (pairLabels.length) {
      summary += ` Blind spots: ${pairLabels.slice(0, 2).join(', ')}.`;
    }

    return {
      id: `mission-${primary.objective}-${now}`,
      createdAt: now,
      kind: 'weak-spot',
      title: `Today's mission: ${primary.objective} repair (${size}Q)`,
      summary: summary,
      examType: examType,
      size: size,
      timeMinutes: Math.max(10, Math.ceil(size * 1.1)),
      weakObjectives: weak.map((w) => ({
        objective: w.objective,
        domain: w.domain,
        weakness: Number(w.weakness.toFixed(3)),
        accuracy: Number(w.accuracy.toFixed(3)),
        attempts: w.attempts
      })),
      boostObjectives: boostObjectives,
      confusionPairs: pairs.map((p) => ({
        key: p.key,
        label: p.key.replace('|', ' vs '),
        count: p.count,
        score: Number(p.score.toFixed(2))
      })),
      pinNote: null,
      pinVideo: null,
      primaryObjective: primary.objective,
      primaryDomain: primary.domain,
      reason: 'weak-objective'
    };
  }

  function attachStudyPins(mission, questionPool, videoFinder) {
    if (!mission || !mission.primaryObjective) return mission;
    const obj = String(mission.primaryObjective);
    const sample = (questionPool || []).find((q) => String(q.objective) === obj);
    if (sample) {
      if (sample.notes_reference) {
        mission.pinNote = {
          file: sample.notes_reference,
          objective: obj
        };
      }
      if (sample.video_reference && sample.video_reference.url) {
        mission.pinVideo = {
          title: sample.video_reference.title || 'Professor Messer lesson',
          url: sample.video_reference.url,
          duration: sample.video_reference.duration || '',
          objective: obj
        };
      }
    }
    if (!mission.pinVideo && typeof videoFinder === 'function') {
      const v = videoFinder(obj, mission.examType);
      if (v && v.url) {
        mission.pinVideo = {
          title: v.title || 'Professor Messer lesson',
          url: v.url,
          duration: v.duration || '',
          objective: obj
        };
      }
    }
    return mission;
  }

  /**
   * Build a mission question pool: prefer boost objectives, fill with stratified remainder.
   */
  function buildMissionPool(allQuestions, mission, shuffleFn, sampleStratifiedFn) {
    const shuffle = shuffleFn || ((arr) => arr.slice());
    const size = (mission && mission.size) || MISSION_SIZE_DEFAULT;
    const boost = (mission && mission.boostObjectives) || [];
    const examType = (mission && mission.examType) || 'both';

    let pool = allQuestions || [];
    if (examType === 'core1') pool = pool.filter((q) => q.exam === 'core1' || !q.exam);
    if (examType === 'core2') pool = pool.filter((q) => q.exam === 'core2');

    const selected = [];
    const used = new Set();

    if (boost.length) {
      const boostTarget = Math.min(size, Math.max(6, Math.ceil(size * 0.55)));
      const boostPool = shuffle(
        pool.filter((q) => boost.includes(String(q.objective)))
      );
      boostPool.forEach((q) => {
        if (selected.length >= boostTarget) return;
        if (used.has(q.id)) return;
        used.add(q.id);
        selected.push(q);
      });
    }

    const remaining = size - selected.length;
    if (remaining > 0) {
      const leftover = pool.filter((q) => !used.has(q.id));
      let filler = [];
      if (typeof sampleStratifiedFn === 'function' && (examType === 'core1' || examType === 'core2' || examType === 'both')) {
        filler = sampleStratifiedFn(leftover, remaining, examType);
      } else {
        filler = shuffle(leftover).slice(0, remaining);
      }
      filler.forEach((q) => {
        if (selected.length >= size) return;
        if (used.has(q.id)) return;
        used.add(q.id);
        selected.push(q);
      });
    }

    return shuffle(selected).slice(0, size);
  }

  function measureMissionOutcome(state, mission, perQuestion) {
    if (!mission || !Array.isArray(perQuestion)) return state;
    const next = state || emptyState();
    const boost = new Set(mission.boostObjectives || []);
    if (boost.size === 0 && mission.primaryObjective) boost.add(mission.primaryObjective);

    let attempts = 0;
    let correct = 0;
    perQuestion.forEach((pq) => {
      if (!boost.has(String(pq.objective))) return;
      attempts += 1;
      if (pq.correct) correct += 1;
    });

    if (attempts === 0) return next;

    const afterAccuracy = correct / attempts;
    const beforeRows = (mission.weakObjectives || []).filter((w) => boost.has(String(w.objective)));
    const beforeAccuracy = beforeRows.length
      ? beforeRows.reduce((s, w) => s + (w.accuracy || 0), 0) / beforeRows.length
      : null;

    const outcome = {
      ts: Date.now(),
      missionId: mission.id,
      attempts: attempts,
      correct: correct,
      afterAccuracy: Number(afterAccuracy.toFixed(3)),
      beforeAccuracy: beforeAccuracy === null ? null : Number(beforeAccuracy.toFixed(3)),
      improved: beforeAccuracy === null ? null : afterAccuracy > beforeAccuracy + 0.02
    };

    next.outcomes.unshift(outcome);
    if (next.outcomes.length > 40) next.outcomes.length = 40;

    if (next.currentMission && next.currentMission.id === mission.id) {
      next.currentMission.lastOutcome = outcome;
    }

    return next;
  }

  function composeExplainOnMiss(question, chosenIndex) {
    if (!question || chosenIndex === null || chosenIndex === undefined) return null;
    if (typeof chosenIndex !== 'number') return null;

    const correctIdx = typeof question.answer === 'number' ? question.answer : null;
    if (correctIdx !== null && chosenIndex === correctIdx) return null;

    const options = question.options || [];
    const chosenText = options[chosenIndex] || '';
    const correctText = correctIdx !== null ? (options[correctIdx] || '') : '';
    const analysis = question.distractor_analysis || {};
    const whyWrong = analysis[String(chosenIndex)] || analysis[chosenIndex] || '';

    let line = '';
    if (whyWrong) {
      line = whyWrong;
    } else if (chosenText && correctText) {
      line = `You chose "${chosenText}". The keyed answer is "${correctText}".`;
    } else {
      line = 'Review the explanation below and isolate the distractor that looked plausible.';
    }

    return {
      chosenIndex: chosenIndex,
      chosenText: chosenText,
      correctIndex: correctIdx,
      correctText: correctText,
      whyWrong: line,
      bankExplanation: question.explanation || ''
    };
  }

  const core = {
    STORAGE_KEY,
    MISSION_SIZE_DEFAULT,
    emptyState,
    recordAnswerEvent,
    rankWeakObjectives,
    rankConfusionPairs,
    objectiveWeaknessScore,
    buildMission,
    attachStudyPins,
    buildMissionPool,
    measureMissionOutcome,
    composeExplainOnMiss,
    tokenizeLabel,
    pairKey
  };

  function mountBrowser(windowObj) {
    const APlus = windowObj.APlus;
    const escapeHTML = (APlus.utils && APlus.utils.escapeHTML)
      ? APlus.utils.escapeHTML
      : (s) => String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    function loadState() {
      if (!APlus.storage) return emptyState();
      const raw = APlus.storage.get(STORAGE_KEY, null);
      if (!raw || typeof raw !== 'object') return emptyState();
      return Object.assign(emptyState(), raw);
    }

    function saveState(state) {
      if (APlus.storage) APlus.storage.set(STORAGE_KEY, state);
    }

    function videoFinder(objective, examType) {
      if (!APlus.data || typeof APlus.data.getVideoForObjective !== 'function') return null;
      const exam = examType === 'core2' ? '1202' : '1201';
      let v = APlus.data.getVideoForObjective(objective, exam);
      if (!v && examType === 'both') {
        v = APlus.data.getVideoForObjective(objective, '1202')
          || APlus.data.getVideoForObjective(objective, '1201');
      }
      return v;
    }

    function refreshMission(preferredExamType) {
      let state = loadState();
      const pool = APlus.data ? APlus.data.getQuestions('both') : [];
      let mission = buildMission(state, {
        preferredExamType: preferredExamType,
        size: MISSION_SIZE_DEFAULT
      });
      mission = attachStudyPins(mission, pool, videoFinder);
      state.currentMission = mission;
      if (!state.missionHistory) state.missionHistory = [];
      state.missionHistory.unshift({ id: mission.id, createdAt: mission.createdAt, title: mission.title });
      if (state.missionHistory.length > 20) state.missionHistory.length = 20;
      saveState(state);
      renderMissionUi(mission, state);
      APlus.bus.emit('coach:mission:ready', mission);

      // Background Groq polish (non-blocking). Falls back silently if offline/disabled.
      enhanceMissionWithGroq(mission).then((enhanced) => {
        if (!enhanced) return;
        const latest = loadState();
        if (!latest.currentMission || latest.currentMission.id !== enhanced.id) return;
        latest.currentMission = enhanced;
        saveState(latest);
        renderMissionUi(enhanced, latest);
        APlus.bus.emit('coach:mission:enhanced', enhanced);
      }).catch(() => {});

      return mission;
    }

    async function enhanceMissionWithGroq(mission) {
      if (!mission || !APlus.groq || !APlus.groq.isEnabled()) return null;

      const system = [
        'You are the invisible ghost coach inside a CompTIA A+ desktop exam simulator.',
        'Rewrite mission copy for a datacenter / helpdesk technician.',
        'Use ONLY the structured fields provided. Do not invent objectives, ports, scores, or facts.',
        'No chatty tutor voice. No emojis. No markdown.',
        'Return JSON only with keys: title (string), summary (string, max 280 chars).'
      ].join(' ');

      const user = JSON.stringify({
        kind: mission.kind,
        examType: mission.examType,
        size: mission.size,
        timeMinutes: mission.timeMinutes,
        primaryObjective: mission.primaryObjective || null,
        primaryDomain: mission.primaryDomain || null,
        weakObjectives: mission.weakObjectives || [],
        confusionPairs: mission.confusionPairs || [],
        pinNote: mission.pinNote || null,
        pinVideo: mission.pinVideo ? { title: mission.pinVideo.title, duration: mission.pinVideo.duration } : null,
        baseTitle: mission.title,
        baseSummary: mission.summary
      });

      const result = await APlus.groq.completeJson(system, user, { temperature: 0.3, max_tokens: 220 });
      if (!result.ok || !result.data) return null;

      const title = String(result.data.title || '').trim();
      const summary = String(result.data.summary || '').trim();
      if (!title && !summary) return null;

      return Object.assign({}, mission, {
        title: title || mission.title,
        summary: summary || mission.summary,
        aiEnhanced: true,
        aiModel: result.model || null
      });
    }

    async function enhanceExplainWithGroq(explain, question) {
      if (!explain || !APlus.groq || !APlus.groq.isEnabled()) return explain;

      const system = [
        'You write one short CompTIA A+ distractor autopsy sentence for a technician.',
        'Use ONLY provided fields. Do not invent new technical claims.',
        'No markdown. No emoji. Max 40 words.',
        'Return JSON only: { "whyWrong": string }'
      ].join(' ');

      const user = JSON.stringify({
        objective: question && question.objective,
        domain: question && question.domain,
        chosenText: explain.chosenText,
        correctText: explain.correctText,
        bankWhyWrong: explain.whyWrong,
        bankExplanation: (explain.bankExplanation || '').slice(0, 400)
      });

      const result = await APlus.groq.completeJson(system, user, { temperature: 0.2, max_tokens: 120 });
      if (!result.ok || !result.data || !result.data.whyWrong) return explain;

      return Object.assign({}, explain, {
        whyWrong: String(result.data.whyWrong).trim(),
        aiEnhanced: true
      });
    }

    function getCurrentMission() {
      const state = loadState();
      return state.currentMission || null;
    }

    function startCurrentMission() {
      const state = loadState();
      let mission = state.currentMission;
      if (!mission) mission = refreshMission();

      const all = APlus.data ? APlus.data.getQuestions('both') : [];
      const pool = buildMissionPool(
        all,
        mission,
        APlus.engineCore.shuffle,
        APlus.engineCore.sampleStratified
      );

      if (!pool.length) {
        windowObj.alert('Ghost coach could not build a mission pool yet. Take any practice exam first.');
        return;
      }

      APlus.engine.start({
        type: 'coach',
        customPool: pool,
        questionCount: pool.length,
        timeMinutes: mission.timeMinutes || Math.max(10, Math.ceil(pool.length * 1.1)),
        domainKey: mission.primaryObjective || 'Ghost Coach Mission',
        coachMissionId: mission.id
      });
    }

    function optionText(q, idx) {
      if (!q || !Array.isArray(q.options) || typeof idx !== 'number') return '';
      return q.options[idx] || '';
    }

    function correctIndexFor(q) {
      if (!q) return null;
      if (typeof q.answer === 'number') return q.answer;
      return null;
    }

    function onAnswered(payload) {
      if (!payload) return;
      const q = payload.question || {};
      const chosenIndex = typeof payload.answer === 'number' ? payload.answer : null;
      const correctIdx = correctIndexFor(q);

      let state = loadState();
      state = recordAnswerEvent(state, {
        ts: Date.now(),
        id: payload.id,
        objective: payload.objective,
        domain: payload.domain,
        correct: Boolean(payload.correct),
        flagged: Boolean(payload.flagged),
        secondsOnQuestion: payload.secondsOnQuestion,
        chosenIndex: chosenIndex,
        chosenText: optionText(q, chosenIndex),
        correctText: optionText(q, correctIdx),
        tags: q.tags || [],
        examType: APlus.engine ? APlus.engine.type : null
      });
      saveState(state);

      if (!payload.correct) {
        const explain = composeExplainOnMiss(q, chosenIndex);
        if (explain) {
          APlus.bus.emit('coach:explain-on-miss', {
            questionId: payload.id,
            objective: payload.objective,
            explain: explain,
            index: payload.index
          });
          const tutorOn = Boolean(
            windowObj.TutorMode && typeof windowObj.TutorMode.isOn === 'function' && windowObj.TutorMode.isOn()
          );
          // Live coaching strip only in Tutor Mode; full exams stay clean.
          // Review autopsy still injects after finish either way.
          if (tutorOn) {
            renderLiveExplain(explain, q);
            enhanceExplainWithGroq(explain, q).then((polished) => {
              if (!polished) return;
              const stillOnSame = APlus.engine && APlus.engine.currentIndex === payload.index;
              if (stillOnSame) renderLiveExplain(polished, q);
            }).catch(() => {});
          } else {
            clearLiveExplain();
          }
        }
      } else {
        clearLiveExplain();
      }
    }

    function onFinished(payload) {
      let state = loadState();
      const mission = state.currentMission;
      if (mission && payload && payload.examType === 'coach') {
        state = measureMissionOutcome(state, mission, payload.perQuestion || []);
        saveState(state);
      }
      // Rebuild mission from latest telemetry after any exam
      refreshMission(payload && payload.examType === 'core2' ? 'core2'
        : payload && payload.examType === 'core1' ? 'core1'
          : undefined);
    }

    function clearLiveExplain() {
      const el = document.getElementById('ghostCoachLiveExplain');
      if (el) el.innerHTML = '';
    }

    function renderLiveExplain(explain, question) {
      const mount = document.getElementById('ghostCoachLiveExplain');
      if (!mount || !explain) return;

      const note = question && question.notes_reference
        ? `<div class="ghost-coach-pin">Note: ${escapeHTML(question.notes_reference)}</div>`
        : '';
      const video = question && question.video_reference && question.video_reference.url
        ? `<a class="btn btn-red" style="font-size:0.78rem;padding:0.25rem 0.55rem;text-decoration:none;" href="${escapeHTML(question.video_reference.url)}" target="_blank" rel="noopener noreferrer">Watch: ${escapeHTML(question.video_reference.title || 'Messer')}</a>`
        : '';

      mount.innerHTML = `
        <div class="ghost-coach-explain" role="status">
          <div class="ghost-coach-explain-title">Why that distractor looked right</div>
          <p>${escapeHTML(explain.whyWrong)}</p>
          ${explain.bankExplanation ? `<p class="ghost-coach-explain-bank">${escapeHTML(explain.bankExplanation)}</p>` : ''}
          <div class="ghost-coach-explain-actions">${note}${video}</div>
        </div>
      `;
    }

    /**
     * Compact copy of the mission on the home screen. The coach is the most
     * targeted thing in the app, so it must not live only at the bottom of
     * the More drawer. Hidden until a mission exists.
     */
    function renderHomeMission(mission) {
      const mount = document.getElementById('homeMissionMount');
      if (!mount) return;
      if (!mission) { mount.hidden = true; return; }
      const objective = mission.primaryObjective ? `Objective ${escapeHTML(String(mission.primaryObjective))}` : '';
      const video = (mission.pinVideo && mission.pinVideo.url)
        ? `<a class="home-mission-link" href="${escapeHTML(mission.pinVideo.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(mission.pinVideo.title || 'Lesson video')}${mission.pinVideo.duration ? ' (' + escapeHTML(mission.pinVideo.duration) + ')' : ''}</a>`
        : '';
      mount.innerHTML = `
        <div class="home-mission-copy">
          <div class="label">Coach mission</div>
          <h4 class="home-mission-title">${escapeHTML(mission.title)}</h4>
          <p class="home-mission-summary">${escapeHTML(mission.summary)}</p>
          <div class="home-mission-meta">
            ${objective ? `<span>${objective}</span>` : ''}
            <span>${escapeHTML(String(mission.size))} questions</span>
            <span>${escapeHTML(String(mission.timeMinutes))} min</span>
            ${video}
          </div>
        </div>
        <div class="home-mission-actions">
          <button type="button" class="btn btn-secondary" onclick="startGhostCoachMission()">Start mission</button>
        </div>`;
      mount.hidden = false;
    }

    function renderMissionUi(mission, state) {
      renderHomeMission(mission);
      const banner = document.getElementById('ghostCoachMission');
      if (!banner || !mission) return;

      const pairs = (mission.confusionPairs || [])
        .slice(0, 2)
        .map((p) => `<span class="ghost-coach-chip">${escapeHTML(p.label)}</span>`)
        .join('');

      const pins = [];
      if (mission.pinNote && mission.pinNote.file) {
        pins.push(`<span class="ghost-coach-pin">Notes: ${escapeHTML(mission.pinNote.file)}</span>`);
      }
      if (mission.pinVideo && mission.pinVideo.url) {
        pins.push(`<a class="ghost-coach-pin-link" href="${escapeHTML(mission.pinVideo.url)}" target="_blank" rel="noopener noreferrer">Video: ${escapeHTML(mission.pinVideo.title || 'Lesson')}${mission.pinVideo.duration ? ' (' + escapeHTML(mission.pinVideo.duration) + ')' : ''}</a>`);
      }

      const lastOutcome = (state.outcomes && state.outcomes[0]) || (mission.lastOutcome || null);
      let measureLine = '';
      if (lastOutcome && lastOutcome.beforeAccuracy !== null && lastOutcome.beforeAccuracy !== undefined) {
        const arrow = lastOutcome.improved ? 'improved' : 'still drilling';
        measureLine = `<div class="ghost-coach-measure">Last mission: ${Math.round(lastOutcome.beforeAccuracy * 100)}% -> ${Math.round(lastOutcome.afterAccuracy * 100)}% (${arrow})</div>`;
      }

      const groqStatus = (APlus.groq && typeof APlus.groq.status === 'function')
        ? APlus.groq.status()
        : { configured: false, enabled: false, model: '' };
      let groqChip = '<span class="ghost-coach-chip">Groq: offline heuristics</span>';
      if (groqStatus.configured && groqStatus.enabled) {
        groqChip = `<span class="ghost-coach-chip">Groq: on (${escapeHTML(groqStatus.model || 'model')})</span>`;
      } else if (groqStatus.configured) {
        groqChip = '<span class="ghost-coach-chip">Groq: paused</span>';
      }
      if (mission.aiEnhanced) {
        groqChip += '<span class="ghost-coach-chip">AI-polished mission</span>';
      }

      banner.innerHTML = `
        <div class="ghost-coach-card">
          <div class="ghost-coach-kicker">Ghost coach · background mission</div>
          <h3 class="ghost-coach-title">${escapeHTML(mission.title)}</h3>
          <p class="ghost-coach-summary">${escapeHTML(mission.summary)}</p>
          <div class="ghost-coach-meta">
            <span class="ghost-coach-chip">${escapeHTML(String(mission.size))} questions</span>
            <span class="ghost-coach-chip">${escapeHTML(String(mission.timeMinutes))} min</span>
            <span class="ghost-coach-chip">${escapeHTML(String(mission.examType).toUpperCase())}</span>
            ${groqChip}
            ${pairs}
          </div>
          <div class="ghost-coach-pins">${pins.join(' ') || '<span class="ghost-coach-pin">Pins appear after the first weak objective is known.</span>'}</div>
          ${measureLine}
          <div class="ghost-coach-actions">
            <button type="button" class="btn" onclick="startGhostCoachMission()">Start today's mission</button>
            <button type="button" class="btn btn-secondary" onclick="refreshGhostCoachMission()">Rebuild from latest misses</button>
          </div>
        </div>
      `;
    }

    function renderFeatureCard() {
      const host = document.getElementById('featureCards');
      if (!host || document.getElementById('ghostCoachFeatureCard')) return;

      const card = document.createElement('div');
      card.className = 'card';
      card.id = 'ghostCoachFeatureCard';
      card.style.border = '1px solid var(--accent-cyan)';
      card.style.backgroundImage = 'radial-gradient(circle at top right, rgba(6, 182, 212, 0.14), transparent 60%)';
      card.innerHTML = `
        <div>
          <div class="card-title" style="color: var(--accent-cyan);">Ghost Coach Mission</div>
          <div class="card-meta">Invisible tutor · mutates your next drill</div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            No chat. The harness watches wrong answers and builds a short repair mission from your blind spots.
          </p>
        </div>
        <button class="btn" style="background-color: var(--accent-cyan); color: #000;" onclick="startGhostCoachMission()">Start Coach Mission</button>
      `;
      host.appendChild(card);
    }

    function injectExplainIntoReview() {
      if (!APlus.engine || !APlus.ui) return;
      const session = APlus.engine;
      (session.questions || []).forEach((q, idx) => {
        const body = document.getElementById(`reviewBody_${idx}`);
        if (!body || body.querySelector('.ghost-coach-review-explain')) return;
        const userAns = session.userAnswers[idx];
        const explain = composeExplainOnMiss(q, userAns);
        if (!explain) return;

        const div = document.createElement('div');
        div.className = 'ghost-coach-review-explain';
        div.innerHTML = `
          <div class="explanation-title" style="color: var(--accent-amber);">Ghost coach: distractor autopsy</div>
          <p style="margin-top:0.35rem;">${escapeHTML(explain.whyWrong)}</p>
        `;
        const box = body.querySelector('.explanation-box');
        if (box) box.insertAdjacentElement('beforebegin', div);
        else body.appendChild(div);
      });
    }

    function init() {
      if (!APlus.bus) return;

      APlus.bus.on('exam:answered', onAnswered);
      APlus.bus.on('exam:finished', onFinished);
      APlus.bus.on('exam:started', () => clearLiveExplain());
      APlus.bus.on('exam:navigated', () => clearLiveExplain());

      // After UI paints review accordion, add distractor autopsy blocks
      APlus.bus.on('exam:finished', () => {
        windowObj.setTimeout(injectExplainIntoReview, 0);
      });
      APlus.bus.on('coach:review:rendered', () => {
        windowObj.setTimeout(injectExplainIntoReview, 0);
      });

      ensureMissionMount();
      ensureLiveExplainMount();
      renderFeatureCard();

      const state = loadState();
      if (state.currentMission) {
        renderMissionUi(state.currentMission, state);
      } else {
        refreshMission();
      }

      if (APlus.registerFeature) {
        APlus.registerFeature('ghostCoach', {
          name: 'Ghost Coach',
          start: startCurrentMission,
          refresh: refreshMission
        });
      }
    }

    function ensureMissionMount() {
      if (document.getElementById('ghostCoachMission')) return;
      const start = document.getElementById('startScreen');
      if (!start) return;
      const hero = start.querySelector('.hero-card');
      const mount = document.createElement('div');
      mount.id = 'ghostCoachMission';
      mount.className = 'ghost-coach-mission';
      if (hero && hero.parentNode) {
        hero.parentNode.insertBefore(mount, hero.nextSibling);
      } else {
        start.insertBefore(mount, start.firstChild);
      }
    }

    function ensureLiveExplainMount() {
      if (document.getElementById('ghostCoachLiveExplain')) return;
      const panel = document.querySelector('#examScreen .question-panel');
      if (!panel) return;
      const mount = document.createElement('div');
      mount.id = 'ghostCoachLiveExplain';
      mount.className = 'ghost-coach-live';
      panel.appendChild(mount);
    }

    windowObj.startGhostCoachMission = startCurrentMission;
    windowObj.refreshGhostCoachMission = function () {
      refreshMission();
    };

    APlus.ghostCoach = {
      init: init,
      refreshMission: refreshMission,
      startCurrentMission: startCurrentMission,
      getCurrentMission: getCurrentMission,
      loadState: loadState,
      composeExplainOnMiss: composeExplainOnMiss
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return { core: core, mountBrowser: mountBrowser };
});
