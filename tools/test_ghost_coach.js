/**
 * Smoke tests for GhostCoachCore (Node, no DOM).
 * Run: node tools/test_ghost_coach.js
 */
const assert = require('assert');
const path = require('path');
const coach = require(path.join(__dirname, '..', 'js', 'ghost-coach.js'));
const core = coach.core || coach;

function run() {
  let state = core.emptyState();

  state = core.recordAnswerEvent(state, {
    id: 'C1-001',
    objective: '2.4',
    domain: '2.0 Networking',
    correct: false,
    flagged: true,
    secondsOnQuestion: 40,
    chosenText: 'DHCP assigns host names on the LAN',
    correctText: 'DNS resolves host names to IP addresses',
    tags: ['dns', 'dhcp']
  });

  state = core.recordAnswerEvent(state, {
    id: 'C1-002',
    objective: '2.4',
    domain: '2.0 Networking',
    correct: false,
    chosenText: 'Use DHCP to resolve www.example.com',
    correctText: 'Use DNS to resolve www.example.com',
    tags: ['dns', 'dhcp']
  });

  state = core.recordAnswerEvent(state, {
    id: 'C1-003',
    objective: '2.4',
    domain: '2.0 Networking',
    correct: true,
    chosenText: 'DNS resolves host names to IP addresses',
    correctText: 'DNS resolves host names to IP addresses',
    tags: ['dns']
  });

  const weak = core.rankWeakObjectives(state, Date.now(), 3);
  assert.ok(weak.length >= 1, 'expected weak objective');
  assert.strictEqual(weak[0].objective, '2.4');

  const pairs = core.rankConfusionPairs(state, Date.now(), 5);
  assert.ok(pairs.length >= 1, 'expected confusion pair from dns/dhcp');

  const mission = core.buildMission(state, { size: 10 });
  assert.strictEqual(mission.kind, 'weak-spot');
  assert.ok(mission.boostObjectives.includes('2.4'));
  assert.ok(mission.title.indexOf('2.4') !== -1);

  const pool = [
    { id: 'a', exam: 'core1', objective: '2.4', domain: '2.0 Networking' },
    { id: 'b', exam: 'core1', objective: '2.4', domain: '2.0 Networking' },
    { id: 'c', exam: 'core1', objective: '2.4', domain: '2.0 Networking' },
    { id: 'd', exam: 'core1', objective: '3.1', domain: '3.0 Hardware' },
    { id: 'e', exam: 'core1', objective: '3.1', domain: '3.0 Hardware' },
    { id: 'f', exam: 'core1', objective: '1.1', domain: '1.0 Mobile Devices' },
    { id: 'g', exam: 'core1', objective: '5.1', domain: '5.0 Hardware and Network Troubleshooting' },
    { id: 'h', exam: 'core1', objective: '2.2', domain: '2.0 Networking' },
    { id: 'i', exam: 'core1', objective: '2.3', domain: '2.0 Networking' },
    { id: 'j', exam: 'core1', objective: '4.1', domain: '4.0 Virtualization and Cloud Computing' },
    { id: 'k', exam: 'core1', objective: '2.4', domain: '2.0 Networking' },
    { id: 'l', exam: 'core1', objective: '2.5', domain: '2.0 Networking' }
  ];

  const missionPool = core.buildMissionPool(pool, mission, (arr) => arr.slice().reverse(), null);
  assert.ok(missionPool.length <= 10);
  assert.ok(missionPool.length >= 1);
  const boostCount = missionPool.filter((q) => q.objective === '2.4').length;
  assert.ok(boostCount >= 1, 'mission pool should prefer weak objective');

  const explain = core.composeExplainOnMiss({
    answer: 1,
    options: ['DHCP', 'DNS', 'NAT', 'VPN'],
    distractor_analysis: {
      '0': 'DHCP assigns addresses; it does not resolve names.'
    },
    explanation: 'DNS maps names to addresses.'
  }, 0);

  assert.ok(explain);
  assert.ok(explain.whyWrong.indexOf('DHCP') !== -1);

  const noExplain = core.composeExplainOnMiss({
    answer: 1,
    options: ['DHCP', 'DNS', 'NAT', 'VPN'],
    explanation: 'ok'
  }, 1);
  assert.strictEqual(noExplain, null);

  let measured = core.measureMissionOutcome(state, mission, [
    { objective: '2.4', correct: true },
    { objective: '2.4', correct: true },
    { objective: '2.4', correct: false },
    { objective: '3.1', correct: false }
  ]);
  assert.ok(measured.outcomes.length >= 1);
  assert.strictEqual(measured.outcomes[0].attempts, 3);

  const bootstrap = core.buildMission(core.emptyState(), { size: 8 });
  assert.strictEqual(bootstrap.kind, 'bootstrap');

  console.log('ghost-coach tests: PASS');
  console.log(JSON.stringify({
    weakObjective: weak[0].objective,
    confusionTop: pairs[0].key,
    missionKind: mission.kind,
    boostCount: boostCount,
    outcomeAccuracy: measured.outcomes[0].afterAccuracy
  }, null, 2));
}

run();
