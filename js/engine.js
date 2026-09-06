/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * engine.js - Exam Session State Machine & Controller
 * File: js/engine.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  /* ------------------------------------------------------------------ *
   * Session modes
   *
   * 'mock'       full-length and timed speed simulations. Exam conditions:
   *              no reveal, no coloring, no coaching until submit.
   * 'practice'   drills and coached study. Immediate feedback allowed.
   * 'diagnostic' placement run. Exam conditions, same as mock.
   * ------------------------------------------------------------------ */
  const MODE_BY_TYPE = {
    core1: 'mock',
    core2: 'mock',
    both: 'mock',
    mixed: 'mock',
    mock: 'mock',
    diagnostic: 'diagnostic',
    placement: 'diagnostic',
    domain: 'practice',
    missed: 'practice',
    today: 'practice',
    plan: 'practice',
    coach: 'practice',
    memory: 'practice',
    raid: 'practice'
  };

  /** Resolve the session mode from a session type plus an optional override. */
  function examModeForType(type, config) {
    const explicit = config && config.mode;
    if (explicit === 'mock' || explicit === 'practice' || explicit === 'diagnostic') {
      return explicit;
    }
    return MODE_BY_TYPE[String(type || '').toLowerCase()] || 'practice';
  }

  /**
   * Pure decision: may selecting an option reveal the answer right now?
   * False for every exam-condition mode regardless of the tutor preference.
   */
  function shouldRevealOnSelect(mode, tutorOn) {
    if (mode === 'mock' || mode === 'diagnostic') return false;
    return Boolean(tutorOn);
  }

  /**
   * Pure eliminate toggle over a plain state object.
   * state: { eliminatedOptions: { [questionIndex]: Set }, currentIndex }
   * Returns a new state; the original object is not mutated.
   */
  function eliminateOption(state, idx) {
    const src = state || {};
    const qIdx = typeof src.currentIndex === 'number' ? src.currentIndex : 0;
    const nextMap = {};
    Object.keys(src.eliminatedOptions || {}).forEach(function (k) {
      nextMap[k] = new Set(src.eliminatedOptions[k]);
    });
    if (!nextMap[qIdx]) nextMap[qIdx] = new Set();
    if (nextMap[qIdx].has(idx)) nextMap[qIdx].delete(idx);
    else nextMap[qIdx].add(idx);
    return Object.assign({}, src, { eliminatedOptions: nextMap });
  }

  /** Countdown alert band: critical under one minute, warning under five. */
  function timerAlertLevel(remainingSeconds) {
    const s = Number(remainingSeconds);
    if (!isFinite(s)) return 'none';
    if (s <= 60) return 'critical';
    if (s <= 300) return 'warning';
    return 'none';
  }

  /** The active session mode, or 'practice' when nothing is running. */
  function currentExamMode() {
    if (APlus.engine && APlus.engine.mode) return APlus.engine.mode;
    const shell = window.currentExamSession;
    if (shell && shell.mode) return shell.mode;
    if (shell && shell.type) return examModeForType(shell.type, null);
    return 'practice';
  }

  APlus.modes = {
    MODE_BY_TYPE: MODE_BY_TYPE,
    examModeForType: examModeForType,
    shouldRevealOnSelect: shouldRevealOnSelect,
    eliminateOption: eliminateOption,
    currentExamMode: currentExamMode,
    timerAlertLevel: timerAlertLevel
  };

  class ExamSession {
    constructor() {
      this.reset();
    }

    reset() {
      this.type = 'core1';
      this.mode = 'mock';
      this.questions = [];
      this.currentIndex = 0;
      this.userAnswers = {};
      this.eliminatedOptions = {};
      this.flaggedQuestions = new Set();
      this.totalSeconds = 90 * 60;
      this.remainingSeconds = 90 * 60;
      this.timerInterval = null;
      this.isPaused = false;
      this.passingScore = 675;
      this.domainKey = null;
      this.coachMissionId = null;
      this.questionEnteredAt = Date.now();
      this.questionSeconds = {};
    }

    start(config = {}) {
      if (this.timerInterval) clearInterval(this.timerInterval);

      const type = config.type || 'core1';
      const questionCount = config.questionCount || 90;
      const timeMinutes = config.timeMinutes || 90;

      let pool = [];
      if (config.customPool && Array.isArray(config.customPool)) {
        pool = [...config.customPool];
      } else if (APlus.data) {
        pool = APlus.data.getQuestions(type === 'both' ? 'both' : (type === 'core2' ? 'core2' : 'core1'));
      }

      let sampled = [];
      if (type === 'domain' || type === 'missed' || type === 'coach') {
        sampled = APlus.engineCore.shuffle(pool).slice(0, Math.min(questionCount, pool.length));
      } else {
        sampled = APlus.engineCore.sampleStratified(pool, questionCount, type);
      }

      // Prepare questions: shuffle options and remap answer indices
      const preparedQuestions = sampled.map(q => APlus.engineCore.prepareQuestionForSession(q));

      this.type = type;
      this.mode = examModeForType(type, config);
      this.questions = preparedQuestions;
      this.currentIndex = 0;
      this.userAnswers = {};
      this.eliminatedOptions = {};
      this.flaggedQuestions = new Set();
      this.totalSeconds = timeMinutes * 60;
      this.remainingSeconds = timeMinutes * 60;
      this.isPaused = false;
      this.domainKey = config.domainKey || null;
      this.coachMissionId = config.coachMissionId || null;
      this.questionSeconds = {};
      this.questionEnteredAt = Date.now();
      this.passingScore = APlus.engineCore.getPassingScore(type);

      this.startTimer();

      APlus.bus.emit('exam:started', {
        type: this.type,
        mode: this.mode,
        totalQuestions: this.questions.length,
        totalSeconds: this.totalSeconds,
        passingScore: this.passingScore,
        coachMissionId: this.coachMissionId
      });

      return this;
    }

    startTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (!this.isPaused) {
          this.remainingSeconds--;
          APlus.bus.emit('exam:timer:tick', {
            remainingSeconds: this.remainingSeconds,
            totalSeconds: this.totalSeconds,
            alertLevel: timerAlertLevel(this.remainingSeconds)
          });

          if (this.remainingSeconds <= 0) {
            clearInterval(this.timerInterval);
            alert('Time has expired! Submitting your exam now.');
            this.finish();
          }
        }
      }, 1000);
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      APlus.bus.emit('exam:paused:toggled', { isPaused: this.isPaused });
      return this.isPaused;
    }

    getCurrentQuestion() {
      return this.questions[this.currentIndex] || null;
    }

    _secondsOnCurrentQuestion() {
      const entered = this.questionEnteredAt || Date.now();
      const secs = Math.max(0, Math.round((Date.now() - entered) / 1000));
      return secs;
    }

    _markQuestionEnter() {
      this.questionEnteredAt = Date.now();
    }

    answerQuestion(answerValue) {
      const q = this.getCurrentQuestion();
      if (!q) return;

      const idx = this.currentIndex;
      this.userAnswers[idx] = answerValue;

      const secondsOnQuestion = this._secondsOnCurrentQuestion();
      this.questionSeconds[idx] = secondsOnQuestion;

      const isCorrect = APlus.qtypes.score(q, answerValue);
      const tutorPref = Boolean(
        window.TutorMode && (
          (typeof window.TutorMode.isEnabledByUser === 'function' && window.TutorMode.isEnabledByUser()) ||
          (typeof window.TutorMode.isEnabled === 'function' && window.TutorMode.isEnabled()) ||
          (typeof window.TutorMode.isOn === 'function' && window.TutorMode.isOn())
        )
      );
      // Exam conditions win over the learner preference. In mock and
      // diagnostic runs nothing downstream may reveal, colour or coach.
      const revealAllowed = shouldRevealOnSelect(this.mode, tutorPref);

      APlus.bus.emit('exam:answered', {
        index: idx,
        mode: this.mode,
        revealAllowed: revealAllowed,
        id: q.id,
        objective: q.objective,
        domain: q.domain,
        type: q.type || 'single',
        answer: answerValue,
        correctAnswer: typeof q.answer === 'number' ? q.answer : null,
        correct: isCorrect,
        flagged: this.flaggedQuestions.has(idx),
        secondsOnQuestion: secondsOnQuestion,
        question: q,
        isTutorMode: revealAllowed
      });
    }

    toggleEliminateOption(optionIdx) {
      const idx = this.currentIndex;
      if (!this.eliminatedOptions[idx]) {
        this.eliminatedOptions[idx] = new Set();
      }
      const set = this.eliminatedOptions[idx];
      if (set.has(optionIdx)) {
        set.delete(optionIdx);
      } else {
        set.add(optionIdx);
      }

      APlus.bus.emit('exam:eliminate:toggled', {
        questionIndex: idx,
        optionIndex: optionIdx,
        eliminated: set
      });
    }

    toggleFlag() {
      const idx = this.currentIndex;
      if (this.flaggedQuestions.has(idx)) {
        this.flaggedQuestions.delete(idx);
      } else {
        this.flaggedQuestions.add(idx);
      }

      APlus.bus.emit('exam:flagged', {
        index: idx,
        isFlagged: this.flaggedQuestions.has(idx)
      });
    }

    navigate(delta) {
      const next = this.currentIndex + delta;
      if (next >= 0 && next < this.questions.length) {
        this.currentIndex = next;
        this._markQuestionEnter();
        APlus.bus.emit('exam:navigated', { currentIndex: this.currentIndex });
        return true;
      }
      return false;
    }

    jumpTo(index) {
      if (index >= 0 && index < this.questions.length) {
        this.currentIndex = index;
        this._markQuestionEnter();
        APlus.bus.emit('exam:navigated', { currentIndex: this.currentIndex });
        return true;
      }
      return false;
    }

    finish() {
      if (this.timerInterval) clearInterval(this.timerInterval);

      const total = this.questions.length;
      let rawCorrect = 0;
      const domainStats = {};
      const newlyMissedIds = [];
      const perQuestion = [];

      this.questions.forEach((q, idx) => {
        const userAns = this.userAnswers[idx];
        const isCorrect = APlus.qtypes.score(q, userAns);

        if (isCorrect) {
          rawCorrect++;
        } else {
          newlyMissedIds.push(q.id);
        }

        const domain = q.domain || (q.exam === 'core1' ? 'Core 1' : 'Core 2');
        if (!domainStats[domain]) {
          domainStats[domain] = { total: 0, correct: 0 };
        }
        domainStats[domain].total++;
        if (isCorrect) domainStats[domain].correct++;

        perQuestion.push({
          id: q.id,
          objective: q.objective,
          domain: domain,
          type: q.type || 'single',
          correct: isCorrect,
          flagged: this.flaggedQuestions.has(idx),
          answer: userAns,
          correctAnswer: typeof q.answer === 'number' ? q.answer : null,
          secondsOnQuestion: this.questionSeconds[idx] || 0
        });
      });

      const scaledScore = APlus.engineCore.calcScaledScore(rawCorrect, total);
      const passed = scaledScore >= this.passingScore;
      const secondsSpent = this.totalSeconds - this.remainingSeconds;

      // Update storage
      if (APlus.storage) {
        const existingMissed = APlus.storage.get('missed', []);
        const mergedMissed = Array.from(new Set([...existingMissed, ...newlyMissedIds]));
        APlus.storage.set('missed', mergedMissed);

        const history = APlus.storage.get('history', []);
        const finishedAt = new Date();
        history.unshift({
          // Millisecond timestamp so attempts inside the same minute still
          // order correctly. The locale date string is display only, and
          // Date.parse of it is only minute precision.
          timestamp: finishedAt.getTime(),
          date: finishedAt.toLocaleDateString() + ' ' + finishedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          examType: this.type.toUpperCase(),
          mode: this.mode,
          scaledScore: scaledScore,
          rawCorrect: rawCorrect,
          totalQuestions: total,
          raw: `${rawCorrect}/${total}`,
          percentage: `${((rawCorrect / (total || 1)) * 100).toFixed(1)}%`,
          passed: passed,
          status: passed ? 'PASSED' : 'FAILED',
          passingScore: this.passingScore,
          domainStats: domainStats,
          // Which generation of the question bank scored this attempt. Lets a
          // future correction invalidate exactly the affected attempts instead
          // of guessing from timestamps.
          bankRevision: (APlus.bankIntegrity && APlus.bankIntegrity.BANK_REVISION) || 2
        });
        if (history.length > 25) history.pop();
        APlus.storage.set('history', history);
      }

      const resultsPayload = {
        examType: this.type,
        totalQuestions: total,
        rawCorrect: rawCorrect,
        scaledScore: scaledScore,
        passingScore: this.passingScore,
        passed: passed,
        domainStats: domainStats,
        perQuestion: perQuestion,
        secondsSpent: secondsSpent,
        flaggedCount: this.flaggedQuestions.size,
        domainKey: this.domainKey,
        coachMissionId: this.coachMissionId,
        timestamp: new Date().toISOString()
      };

      APlus.bus.emit('exam:finished', resultsPayload);

      return resultsPayload;
    }
  }

  APlus.engine = new ExamSession();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = APlus.modes;
  }

})(typeof window !== 'undefined' ? window : this);
