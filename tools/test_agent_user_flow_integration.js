#!/usr/bin/env node
/**
 * tools/test_agent_user_flow_integration.js
 * End-to-end integration test suite for User Flow & AI Agent Flow improvements:
 * 1. Edge worker coach jobs supporting unified identity (Firebase UID & Telegram ID)
 * 2. Canonical 63 objectives grounding in coach_orchestrator
 * 3. Client Action Cards in tma_ghost_coach
 * 4. Automatic SRS flashcard enqueuing on exam completion
 * 5. Ghost Coach Autopsy & Recovery Drill rendering in UI
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

function createFakeJobsDb() {
  let seq = 1;
  const jobs = [];
  return {
    jobs,
    prepare(sql) {
      const self = {
        _params: [],
        bind(...params) {
          self._params = params;
          return self;
        },
        async run() {
          if (/CREATE TABLE|ALTER TABLE/i.test(sql)) return { success: true };
          if (/INSERT INTO coach_jobs/i.test(sql)) {
            const [id, user_id, telegram_id, tier, job_type, payload_json, max_attempts, available_at] = self._params;
            const row = {
              id,
              user_id,
              telegram_id,
              tier,
              job_type,
              payload_json,
              status: 'pending',
              attempts: 0,
              max_attempts,
              available_at,
              created_at: Date.now()
            };
            jobs.push(row);
            return { success: true };
          }
          if (/UPDATE coach_jobs SET status = 'active'/i.test(sql)) {
            const [attempts, id] = self._params;
            const j = jobs.find(x => x.id === id);
            if (j) {
              j.status = 'active';
              j.attempts = attempts;
            }
            return { success: true };
          }
          if (/UPDATE coach_jobs SET status = 'completed'/i.test(sql)) {
            const [result_json, id] = self._params;
            const j = jobs.find(x => x.id === id);
            if (j) {
              j.status = 'completed';
              j.result_json = result_json;
            }
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (/WHERE id = \?/i.test(sql)) {
            const [jobId, userStr, tgNum] = self._params;
            const row = jobs.find(j => j.id === jobId && (j.user_id === userStr || (tgNum != null && tgNum > 0 && j.telegram_id === tgNum)));
            return row || null;
          }
          if (/FROM coach_jobs/i.test(sql)) {
            const [userStr, tgNum] = self._params;
            const row = jobs.find(j => (j.user_id === userStr || (tgNum != null && tgNum > 0 && j.telegram_id === tgNum)) && (j.status === 'pending' || j.status === 'retry'));
            return row || null;
          }
          return null;
        }
      };
      return self;
    }
  };
}

async function runTests() {
  console.log('=== CompTIA A+ User Flow & AI Agent Flow Integration Tests ===\n');

  // 1. Test Coach Jobs with Unified Identity
  console.log('Test 1: Testing Coach Jobs with Firebase UID & Telegram ID...');
  const coachJobsModule = await import(pathToFileURL(path.join(ROOT, 'workers', 'coach_jobs.js')).href);
  const db = createFakeJobsDb();

  // 1A. Enqueue and process Firebase user job
  const fbJob = await coachJobsModule.enqueueCoachJob(db, {
    userId: 'fb:firebase_tester_99',
    tier: 'pro_monthly',
    jobType: 'exam_review_pack',
    payload: { weakDomains: ['Networking', 'Security'] }
  });
  assert(fbJob && fbJob.id, 'Firebase coach job must return an id');
  assert.strictEqual(fbJob.status, 'pending');

  const fbFetched = await coachJobsModule.getCoachJob(db, fbJob.id, 'fb:firebase_tester_99');
  assert(fbFetched, 'Should fetch job by Firebase user ID');
  assert.strictEqual(fbFetched.user_id, 'fb:firebase_tester_99');

  const fbProcessed = await coachJobsModule.processNextCoachJob(db, 'fb:firebase_tester_99', async (type, payload) => {
    return coachJobsModule.buildExamReviewPack(payload);
  });
  assert(fbProcessed && fbProcessed.status === 'completed', 'Firebase job should complete');
  assert(fbProcessed.result && fbProcessed.result.plan.length === 2, 'Review pack should cover 2 weak domains');
  console.log('  ✔ Firebase user coach job successfully enqueued and processed.');

  // 1B. Enqueue and process Telegram user job
  const tgJob = await coachJobsModule.enqueueCoachJob(db, {
    telegramId: 888777666,
    tier: 'pro_monthly',
    jobType: 'exam_review_pack',
    payload: { weakDomains: ['Hardware'] }
  });
  assert(tgJob && tgJob.id, 'Telegram coach job must return an id');

  const tgFetched = await coachJobsModule.getCoachJob(db, tgJob.id, 888777666);
  assert(tgFetched, 'Should fetch job by Telegram ID');
  assert.strictEqual(tgFetched.telegram_id, 888777666);

  const tgProcessed = await coachJobsModule.processNextCoachJob(db, 888777666, async (type, payload) => {
    return coachJobsModule.buildExamReviewPack(payload);
  });
  assert(tgProcessed && tgProcessed.status === 'completed', 'Telegram job should complete');
  console.log('  ✔ Telegram user coach job successfully enqueued and processed.');

  // 2. Test Canonical 63 Objectives Grounding
  console.log('\nTest 2: Testing Canonical 63 Objectives in Coach Orchestrator...');
  const orchModule = await import(pathToFileURL(path.join(ROOT, 'workers', 'coach_orchestrator.js')).href);

  const lookups = [
    { code: '2.1', expectedContains: 'Ports and protocols' },
    { code: '1202-2.1', expectedContains: 'Physical and logical security' },
    { code: 'c1-1-1', expectedContains: 'Laptop hardware' },
    { code: 'c2-4-10', expectedContains: 'AI in IT operations' }
  ];

  for (const item of lookups) {
    const res = orchModule.runAllowlistedTools('free', ['lookup_objective'], { objective: item.code });
    assert(Array.isArray(res) && res.length === 1, `lookup_objective for ${item.code} must return a tool result`);
    const summary = res[0].result && res[0].result.summary;
    assert(summary && summary.includes(item.expectedContains), `Summary for ${item.code} should contain "${item.expectedContains}", got: "${summary}"`);
  }
  console.log('  ✔ Canonical Core 1 & Core 2 objectives resolved accurately.');

  // 3. Test Action Cards in tma_ghost_coach.js
  console.log('\nTest 3: Testing Action Cards in TMAGhostCoach...');
  let drillStarted = null;
  let srsEnqueued = null;

  global.window = {
    APlus: {
      data: {
        getQuestions(exam) {
          return [
            { id: 'Q1', objective: '2.1', domain: '2.0 Networking', exam: 'core1', question: 'Port 80?' },
            { id: 'Q2', objective: '2.1', domain: '2.0 Networking', exam: 'core1', question: 'Port 443?' }
          ];
        }
      },
      engineCore: {
        shuffle(arr) { return arr.slice(); }
      },
      engine: {
        start(options) {
          drillStarted = options;
        }
      },
      storage: {
        get(key, fallback) { return fallback !== undefined ? fallback : []; },
        set() {}
      }
    },
    CompTIAMemorySRS: {
      enqueueMissed(ids, fn) {
        srsEnqueued = ids;
      }
    }
  };

  const TMAGhostCoach = require('../js/tma_ghost_coach.js');
  assert(typeof TMAGhostCoach.launchTargetedDrill === 'function', 'TMAGhostCoach.launchTargetedDrill must be exported');
  assert(typeof TMAGhostCoach.addToFlashcards === 'function', 'TMAGhostCoach.addToFlashcards must be exported');
  console.log('  ✔ TMAGhostCoach action methods verified.');

  // 4. Test SRS Auto-Enqueue on Exam Submission
  console.log('\nTest 4: Testing SRS Auto-Enqueue on Exam Submission in engine.js...');
  delete require.cache[require.resolve('../js/engine.js')];
  let memoryModeRefreshed = false;
  let enqueuedFromEngine = null;
  let lookupMetaCalls = 0;
  let lookupThrew = false;

  global.window.CompTIAMemorySRS = {
    enqueueMissed(ids, fn) {
      enqueuedFromEngine = ids;
      // Real memory_srs.js invokes lookupFn synchronously per id.
      (ids || []).forEach((id) => {
        try {
          const meta = typeof fn === 'function' ? fn(id) : {};
          lookupMetaCalls += 1;
          assert(meta && (meta.exam || meta.domain), 'lookupFn must return exam/domain metadata without throwing');
        } catch (e) {
          lookupThrew = true;
          throw e;
        }
      });
    }
  };
  global.window.CompTIAMemoryMode = {
    refreshMemoryHome() {
      memoryModeRefreshed = true;
    }
  };

  global.APlus = global.window.APlus;
  global.APlus.bus = {
    emit(event, data) {},
    on(event, fn) {}
  };
  global.APlus.bankIntegrity = { BANK_REVISION: 3 };
  global.APlus.qtypes = {
    score(q, userAns) {
      return q.correct_answer === userAns;
    }
  };
  global.APlus.engineCore = {
    calcScaledScore(raw, total) {
      return 100 + Math.round(800 * (raw / (total || 1)));
    }
  };

  require('../js/engine.js');
  const engine = global.APlus.engine;
  assert(engine, 'APlus.engine must exist');

  engine.questions = [
    { id: 'C1-01', question: 'Test 1', domain: 'Networking', exam: 'core1', options: ['A', 'B'], correct_answer: 0 },
    { id: 'C1-02', question: 'Test 2', domain: 'Hardware', exam: 'core1', options: ['A', 'B'], correct_answer: 1 }
  ];
  engine.userAnswers = { 0: 0, 1: 0 }; // 0 is correct, 1 is wrong
  engine.type = 'core1';
  engine.passingScore = 675;

  const results = engine.finish();
  assert(results && results.missedIds, 'Results must contain missedIds');
  assert.strictEqual(results.missedIds.length, 1, 'Should detect 1 missed question');
  assert.strictEqual(results.missedIds[0], 'C1-02');
  assert(enqueuedFromEngine && enqueuedFromEngine.includes('C1-02'), 'Engine must automatically enqueue C1-02 to CompTIAMemorySRS');
  assert(!lookupThrew, 'SRS lookupFn must not throw (TDZ / temporal dead zone regression)');
  assert.strictEqual(lookupMetaCalls, 1, 'SRS lookupFn must run once per missed id');
  assert(results.perQuestion[1].userAnswerText === 'A', 'Missed row must expose userAnswerText for Ghost Coach consult');
  assert(memoryModeRefreshed, 'Engine must notify CompTIAMemoryMode.refreshMemoryHome');
  console.log('  ✔ Missed questions automatically enqueued to Spaced Repetition deck.');

  // 5. Test Post-Exam Autopsy in UI
  console.log('\nTest 5: Testing Post-Exam Autopsy Card Rendering in ui.js...');
  delete require.cache[require.resolve('../js/ui.js')];

  let autopsyMountHtml = '';
  let recoveryStarted = null;
  let coachOpened = null;
  const fakeButtons = {};

  global.document = {
    getElementById(id) {
      if (id === 'coachAutopsyMount') {
        return {
          set innerHTML(val) { autopsyMountHtml = val; },
          get innerHTML() { return autopsyMountHtml; }
        };
      }
      if (id === 'btnLaunchRecoveryDrill' || id === 'btnConsultGhostCoach') {
        if (!fakeButtons[id]) fakeButtons[id] = { onclick: null };
        return fakeButtons[id];
      }
      return null;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() {
      return {
        setAttribute() {},
        style: {}
      };
    }
  };

  global.window.APlus.data = {
    getQuestionById(id) {
      return { id, question: 'Full stem', options: ['A', 'B'], answer: 0, domain: 'Networking', exam: 'core1' };
    }
  };
  global.window.APlus.engine.start = function (options) {
    recoveryStarted = options;
  };
  global.window.TMAGhostCoach = {
    openCoachSheet(q, ans) {
      coachOpened = { q, ans };
    }
  };

  require('../js/ui.js');
  const ui = global.APlus.ui;
  assert(ui && typeof ui.renderGhostCoachAutopsy === 'function', 'APlus.ui.renderGhostCoachAutopsy must exist');

  ui.renderGhostCoachAutopsy({
    perQuestion: [
      { id: 'C1-01', correct: true, domain: 'Hardware' },
      { id: 'C1-02', correct: false, domain: 'Networking', userAnswerText: 'Wrong pick' },
      { id: 'C1-03', correct: false, domain: 'Networking' }
    ]
  });

  assert(autopsyMountHtml.includes('Ghost Coach Autopsy &amp; Recovery'), 'Autopsy card must be rendered');
  assert(autopsyMountHtml.includes('Networking'), 'Weakest domain must be highlighted');
  assert(autopsyMountHtml.includes('Launch Exam Recovery Drill'), 'Recovery drill button must be rendered');
  assert(typeof fakeButtons.btnLaunchRecoveryDrill.onclick === 'function', 'Recovery drill button must have click handler');
  assert(typeof fakeButtons.btnConsultGhostCoach.onclick === 'function', 'Consult coach button must have click handler');

  fakeButtons.btnLaunchRecoveryDrill.onclick();
  assert(recoveryStarted && recoveryStarted.type === 'missed', 'Recovery drill must start a missed session');
  assert(recoveryStarted.customPool && recoveryStarted.customPool.length === 2, 'Recovery drill pool must resolve full bank questions');

  fakeButtons.btnConsultGhostCoach.onclick();
  assert(coachOpened && coachOpened.ans === 'Wrong pick', 'Consult coach must pass userAnswerText');
  console.log('  ✔ Ghost Coach Autopsy card & recovery drill button rendered successfully.');

  console.log('\n=============================================================');
  console.log('✅ ALL USER FLOW & AI AGENT FLOW INTEGRATION TESTS PASSED!');
  console.log('=============================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
