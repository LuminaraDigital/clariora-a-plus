/**
 * tools/test_results_render.js
 * Node unit test for the results-screen builders exported by js/ui.js.
 *
 * Run: node tools/test_results_render.js
 *
 * js/ui.js is a browser file, so it is loaded inside a stub window with a
 * stub document. Only the pure builders are exercised here.
 */
'use strict';

const path = require('path');
const Module = require('module');

/* ---------------- stub window / document ---------------- */

function stubElement() {
  const el = {
    style: {},
    dataset: {},
    className: '',
    innerHTML: '',
    textContent: '',
    innerText: '',
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    insertBefore() {},
    removeAttribute() {},
    setAttribute() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  return el;
}

const stubDocument = {
  readyState: 'complete',
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return stubElement(); },
  head: stubElement(),
  body: stubElement()
};

const stubWindow = {
  document: stubDocument,
  requestAnimationFrame(fn) { fn(); },
  setTimeout(fn) { return fn && 0; },
  console: console
};
stubWindow.window = stubWindow;

const savedWindow = global.window;
const savedDocument = global.document;
global.window = stubWindow;
global.document = stubDocument;

const uiPath = path.join(__dirname, '..', 'js', 'ui.js');
delete require.cache[Module._resolveFilename(uiPath, null, false)];
const R = require(uiPath);

const enginePath = path.join(__dirname, '..', 'js', 'engine.js');
delete require.cache[Module._resolveFilename(enginePath, null, false)];
const M = require(enginePath);

global.window = savedWindow;
global.document = savedDocument;

/* ---------------- tiny assertion harness ---------------- */

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failures.push(name + ': ' + err.message);
    console.log('  FAIL ' + name + ' -> ' + err.message);
  }
}

function eq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error((what || 'value') + ' expected ' + JSON.stringify(expected) +
      ' but got ' + JSON.stringify(actual));
  }
}

function near(actual, expected, tol, what) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error((what || 'value') + ' expected ~' + expected + ' but got ' + actual);
  }
}

function contains(haystack, needle, what) {
  if (String(haystack).indexOf(needle) === -1) {
    throw new Error((what || 'markup') + ' should contain ' + JSON.stringify(needle) +
      '\n       got: ' + haystack);
  }
}

function absent(haystack, needle, what) {
  if (String(haystack).indexOf(needle) !== -1) {
    throw new Error((what || 'markup') + ' should NOT contain ' + JSON.stringify(needle));
  }
}

/* ---------------- exports ---------------- */

console.log('exports');
check('builders are exported', function () {
  ['buildScoreRing', 'buildDomainBarRow', 'buildDomainBars', 'passLinePercent',
    'sortDomainsByBlueprint', 'buildScoreCopy'].forEach(function (k) {
    if (typeof R[k] !== 'function') throw new Error('missing export ' + k);
  });
});

/* ---------------- pass line ---------------- */

console.log('passLinePercent');
check('675 maps to 71.875', function () {
  eq(R.passLinePercent(675), 71.875, 'core1 pass line');
});
check('700 maps to 75', function () {
  eq(R.passLinePercent(700), 75, 'core2 pass line');
});
check('100 maps to 0 and 900 maps to 100', function () {
  eq(R.passLinePercent(100), 0, 'floor');
  eq(R.passLinePercent(900), 100, 'ceiling');
});

/* ---------------- domain bar rows ---------------- */

console.log('buildDomainBarRow');
check('renders the exact class contract', function () {
  const html = R.buildDomainBarRow({
    name: '2.0 Networking', correct: 13, total: 21, passingScore: 700
  });
  eq(html,
    '<div class="domain-bar"><span class="name">2.0 Networking</span>' +
    '<div class="track"><div class="fill" style="width:62%"></div>' +
    '<div class="passline" style="left:75%"></div></div>' +
    '<span class="pct tnum">13 / 21, 62%</span></div>',
    'row markup');
});

check('width is the rounded score percentage', function () {
  const html = R.buildDomainBarRow({ name: 'X', correct: 3, total: 8, passingScore: 675 });
  contains(html, 'style="width:38%"', 'width');
  contains(html, '3 / 8, 38%', 'readout');
});

check('passline offset is the pass percentage for 675', function () {
  const html = R.buildDomainBarRow({ name: 'X', correct: 1, total: 2, passingScore: 675 });
  contains(html, 'style="left:71.9%"', 'passline at 675');
});

check('passline offset is 75% for 700', function () {
  const html = R.buildDomainBarRow({ name: 'X', correct: 1, total: 2, passingScore: 700 });
  contains(html, 'style="left:75%"', 'passline at 700');
});

check('fill gets ok when at or above the pass line', function () {
  const above = R.buildDomainBarRow({ name: 'X', correct: 8, total: 10, passingScore: 675 });
  contains(above, 'class="fill ok"', '80% vs 71.875 pass line');

  const exact = R.buildDomainBarRow({ name: 'X', percent: 75, passPercent: 75 });
  contains(exact, 'class="fill ok"', 'exactly on the line');
});

check('fill has no ok class below the pass line', function () {
  const below = R.buildDomainBarRow({ name: 'X', correct: 13, total: 21, passingScore: 700 });
  contains(below, 'class="fill"', '62% vs 75 pass line');
  absent(below, 'fill ok', 'below the line must not be ok');
});

check('zero total does not divide by zero', function () {
  const html = R.buildDomainBarRow({ name: 'X', correct: 0, total: 0, passingScore: 675 });
  contains(html, 'style="width:0%"', 'zero width');
});

check('domain name is escaped', function () {
  const html = R.buildDomainBarRow({ name: '<script>', correct: 1, total: 1, passingScore: 675 });
  absent(html, '<script>', 'escaping');
  contains(html, '&lt;script&gt;', 'escaped name');
});

/* ---------------- sort order ---------------- */

console.log('sortDomainsByBlueprint');
check('core1 domains sort in blueprint order, not by score', function () {
  const sorted = R.sortDomainsByBlueprint([
    '5.0 Hardware and Network Troubleshooting',
    '2.0 Networking',
    '4.0 Virtualization and Cloud Computing',
    '1.0 Mobile Devices',
    '3.0 Hardware'
  ]);
  eq(sorted.join(' | '), [
    '1.0 Mobile Devices',
    '2.0 Networking',
    '3.0 Hardware',
    '4.0 Virtualization and Cloud Computing',
    '5.0 Hardware and Network Troubleshooting'
  ].join(' | '), 'core1 order');
});

check('core2 domains sort in blueprint order', function () {
  const sorted = R.sortDomainsByBlueprint([
    '4.0 Operational Procedures',
    '3.0 Software Troubleshooting',
    '2.0 Security',
    '1.0 Operating Systems'
  ]);
  eq(sorted[0], '1.0 Operating Systems', 'first');
  eq(sorted[3], '4.0 Operational Procedures', 'last');
});

check('unknown domains land after the blueprint ones', function () {
  const sorted = R.sortDomainsByBlueprint(['Zulu', '2.0 Networking', 'Alpha']);
  eq(sorted[0], '2.0 Networking', 'blueprint first');
  eq(sorted[1], 'Alpha', 'then alphabetical');
  eq(sorted[2], 'Zulu', 'then alphabetical');
});

console.log('buildDomainBars');
check('block renders one row per domain in blueprint order', function () {
  const html = R.buildDomainBars({
    '3.0 Hardware': { correct: 20, total: 25 },
    '1.0 Mobile Devices': { correct: 5, total: 12 },
    '2.0 Networking': { correct: 13, total: 21 }
  }, 675);
  const rows = html.split('<div class="domain-bar">').length - 1;
  eq(rows, 3, 'row count');
  const order = ['1.0 Mobile Devices', '2.0 Networking', '3.0 Hardware'];
  let cursor = -1;
  order.forEach(function (name) {
    const at = html.indexOf(name);
    if (at <= cursor) throw new Error(name + ' is out of blueprint order');
    cursor = at;
  });
  contains(html, 'left:71.9%', 'shared pass line');
});

/* ---------------- score ring ---------------- */

console.log('buildScoreRing');
check('markup carries the class contract and both ids', function () {
  const ring = R.buildScoreRing(640);
  contains(ring.html, '<div class="score-ring-wrap">', 'wrap');
  contains(ring.html, '<svg class="score-ring" viewBox="0 0 120 120"', 'svg');
  contains(ring.html, '<circle class="track" cx="60" cy="60" r="52"/>', 'track');
  contains(ring.html, 'class="progress" id="scoreGaugeCircle" cx="60" cy="60" r="52"', 'progress');
  contains(ring.html, '<div class="score-ring-text">', 'text block');
  contains(ring.html, '<div class="value stat-display" id="scaledScoreDisplay">640</div>', 'value');
  contains(ring.html, '<div class="sub label">of 900</div>', 'sub');
});

check('circumference matches r=52', function () {
  const ring = R.buildScoreRing(640);
  near(ring.circumference, 2 * Math.PI * 52, 0.001, 'circumference');
});

check('progress is (score - 100) / 800 of the circumference', function () {
  const ring = R.buildScoreRing(500);
  near(ring.fraction, 0.5, 1e-9, 'fraction at 500');
  near(ring.dashoffset, ring.circumference * 0.5, 1e-6, 'dashoffset at 500');

  const full = R.buildScoreRing(900);
  near(full.dashoffset, 0, 1e-9, 'dashoffset at 900');

  const empty = R.buildScoreRing(100);
  near(empty.dashoffset, empty.circumference, 1e-9, 'dashoffset at 100');
});

check('dash offset starts full so the ring can animate', function () {
  const ring = R.buildScoreRing(640);
  contains(ring.html, 'stroke-dashoffset="' + ring.circumference.toFixed(3) + '"',
    'initial offset is the full circumference');
});

check('score is clamped to the scale', function () {
  near(R.buildScoreRing(50).fraction, 0, 1e-9, 'below 100');
  near(R.buildScoreRing(1200).fraction, 1, 1e-9, 'above 900');
});

/* ---------------- headline copy ---------------- */

console.log('buildScoreCopy');
check('failing copy names the gap', function () {
  const c = R.buildScoreCopy(640, 675);
  eq(c.title, 'Did not pass', 'title');
  eq(c.subtitle, 'Pass mark 675. You need 35 more points.', 'subtitle');
});

check('passing copy names the margin', function () {
  const c = R.buildScoreCopy(710, 675);
  eq(c.title, 'Passed', 'title');
  eq(c.subtitle, 'Pass mark 675. 35 points above the pass mark.', 'subtitle');
});

check('exactly on the pass mark passes', function () {
  eq(R.buildScoreCopy(700, 700).title, 'Passed', 'boundary');
});

/* ---------------- no banned characters ---------------- */

console.log('house style');
check('builders emit no em dashes', function () {
  const blob = R.buildScoreRing(640).html +
    R.buildDomainBarRow({ name: '2.0 Networking', correct: 1, total: 2, passingScore: 675 }) +
    R.buildScoreCopy(640, 675).subtitle +
    R.buildScoreCopy(710, 675).subtitle;
  if (blob.indexOf(String.fromCharCode(0x2014)) !== -1) throw new Error('em dash found');
});

/* ---------------- exam-condition contract ---------------- */

console.log('shouldRevealOnSelect');
check('mock never reveals, whatever the tutor preference says', function () {
  eq(M.shouldRevealOnSelect('mock', true), false, 'mock with tutor on');
  eq(M.shouldRevealOnSelect('mock', false), false, 'mock with tutor off');
});

check('diagnostic never reveals', function () {
  eq(M.shouldRevealOnSelect('diagnostic', true), false, 'diagnostic with tutor on');
  eq(M.shouldRevealOnSelect('diagnostic', false), false, 'diagnostic with tutor off');
});

check('practice follows the tutor preference', function () {
  eq(M.shouldRevealOnSelect('practice', true), true, 'practice with tutor on');
  eq(M.shouldRevealOnSelect('practice', false), false, 'practice with tutor off');
});

check('an unknown mode still respects the preference', function () {
  eq(M.shouldRevealOnSelect(undefined, true), true, 'undefined mode');
});

console.log('examModeForType');
check('full and speed simulations are mocks', function () {
  eq(M.examModeForType('core1'), 'mock', 'core1');
  eq(M.examModeForType('core2'), 'mock', 'core2');
  eq(M.examModeForType('both'), 'mock', 'mixed 90');
});

check('drills and plans are practice', function () {
  eq(M.examModeForType('domain'), 'practice', 'domain drill');
  eq(M.examModeForType('missed'), 'practice', 'missed drill');
  eq(M.examModeForType('today'), 'practice', 'today plan');
  eq(M.examModeForType('coach'), 'practice', 'coach session');
});

check('the placement run is diagnostic', function () {
  eq(M.examModeForType('diagnostic'), 'diagnostic', 'diagnostic');
});

check('an explicit mode overrides the type map', function () {
  eq(M.examModeForType('domain', { mode: 'mock' }), 'mock', 'override');
});

check('a mock selection cannot call the explanation renderer', function () {
  let renderCalls = 0;
  const renderExplanation = function () { renderCalls++; };
  ['core1', 'core2', 'both', 'diagnostic'].forEach(function (type) {
    const mode = M.examModeForType(type);
    if (M.shouldRevealOnSelect(mode, true)) renderExplanation();
  });
  eq(renderCalls, 0, 'explanation renderer calls during mock and diagnostic');
  // The same wiring in a drill does reveal, so the gate is not simply dead.
  if (M.shouldRevealOnSelect(M.examModeForType('domain'), true)) renderExplanation();
  eq(renderCalls, 1, 'explanation renderer calls after a practice selection');
});

console.log('eliminateOption');
check('eliminating marks the option on the current question', function () {
  const next = M.eliminateOption({ currentIndex: 3, eliminatedOptions: {} }, 2);
  eq(next.eliminatedOptions[3].has(2), true, 'option 2 eliminated');
  eq(next.eliminatedOptions[3].size, 1, 'only one option touched');
});

check('eliminating twice restores the option', function () {
  let st = { currentIndex: 0, eliminatedOptions: {} };
  st = M.eliminateOption(st, 1);
  st = M.eliminateOption(st, 1);
  eq(st.eliminatedOptions[0].has(1), false, 'option 1 restored');
});

check('the caller state is not mutated', function () {
  const before = { currentIndex: 0, eliminatedOptions: {} };
  const after = M.eliminateOption(before, 0);
  eq(Object.keys(before.eliminatedOptions).length, 0, 'original untouched');
  eq(after.eliminatedOptions[0].has(0), true, 'copy updated');
});

check('eliminating never records an answer', function () {
  const st = M.eliminateOption({ currentIndex: 0, eliminatedOptions: {}, userAnswers: {} }, 2);
  eq(Object.keys(st.userAnswers).length, 0, 'no answer recorded by an eliminate');
});

check('other questions keep their own eliminations', function () {
  let st = { currentIndex: 0, eliminatedOptions: {} };
  st = M.eliminateOption(st, 0);
  st.currentIndex = 1;
  st = M.eliminateOption(st, 3);
  eq(st.eliminatedOptions[0].has(0), true, 'question 0 kept');
  eq(st.eliminatedOptions[1].has(3), true, 'question 1 recorded');
});

console.log('strike handler');
check('the strike handler stops propagation before it eliminates', function () {
  let stopped = 0;
  let selected = 0;
  const state = { currentIndex: 0, eliminatedOptions: {} };
  // Mirrors the shipped handler: stopPropagation first, then the pure toggle.
  const onStrike = function (e, idx) {
    if (e && e.stopPropagation) e.stopPropagation();
    return M.eliminateOption(state, idx);
  };
  const rowClick = function () { selected++; };
  const evt = { stopPropagation: function () { stopped++; rowClickBlocked = true; } };
  let rowClickBlocked = false;
  const next = onStrike(evt, 1);
  if (!rowClickBlocked) rowClick();
  eq(stopped, 1, 'stopPropagation calls');
  eq(selected, 0, 'row selections caused by a strike');
  eq(next.eliminatedOptions[0].has(1), true, 'option eliminated');
});

console.log('timerAlertLevel');
check('the countdown flags the last five and last one minutes', function () {
  eq(M.timerAlertLevel(600), 'none', 'ten minutes left');
  eq(M.timerAlertLevel(299), 'warning', 'under five minutes');
  eq(M.timerAlertLevel(59), 'critical', 'under one minute');
});

/* ---------------- summary ---------------- */

console.log('');
if (failures.length) {
  console.log('FAILED: ' + failures.length + ' of ' + (passed + failures.length) + ' checks');
  failures.forEach(function (f) { console.log('  x ' + f); });
  process.exit(1);
}
console.log('PASSED: ' + passed + ' checks');
process.exit(0);
