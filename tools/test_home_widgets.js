/**
 * tools/test_home_widgets.js
 * Node unit test for js/home-widgets.js (pure markup builders + history math).
 * Run: node tools/test_home_widgets.js
 *
 * No DOM. The module is required with no global `window`, so its browser boot
 * path stays inert and only the pure builders are exercised.
 */

'use strict';

var path = require('path');
var assert = require('assert');

var hw = require(path.join(__dirname, '..', 'js', 'home-widgets.js'));

/* ---------------- tiny test harness ---------------- */

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failed++;
    console.log('  FAIL ' + name);
    console.log('       ' + (err && err.message ? err.message : err));
  }
}

function has(hay, needle, msg) {
  assert.ok(String(hay).indexOf(needle) >= 0, (msg || 'missing') + ': ' + needle + '\n  in: ' + hay);
}

function lacks(hay, needle, msg) {
  assert.ok(String(hay).indexOf(needle) < 0, (msg || 'unexpected') + ': ' + needle + '\n  in: ' + hay);
}

var C = 2 * Math.PI * 52;
var C1 = String(Math.round(C * 10) / 10);

console.log('\nhome-widgets builders\n');

/* ---------------- buildRingMarkup ---------------- */

test('ring markup uses the contract classes and a 120 viewBox', function () {
  var html = hw.buildRingMarkup(62);
  has(html, '<div class="score-ring-wrap"');
  has(html, 'class="score-ring" viewBox="0 0 120 120"');
  has(html, 'role="img"');
  has(html, 'aria-label="Readiness 62 percent"');
  has(html, 'class="track" cx="60" cy="60" r="52"');
  has(html, 'class="progress" cx="60" cy="60" r="52"');
  has(html, '<div class="score-ring-text">');
  has(html, '<div class="value stat-display">');
  has(html, '<div class="sub label">readiness</div>');
});

test('ring paints empty first, with the real offset parked in data-offset', function () {
  var html = hw.buildRingMarkup(62);
  has(html, 'stroke-dasharray="' + C1 + '"', 'dasharray is the circumference');
  has(html, 'stroke-dashoffset="' + C1 + '"', 'first paint is a full offset');
  var expected = String(Math.round(C * (1 - 0.62) * 10) / 10);
  has(html, 'data-offset="' + expected + '"');
});

test('ring 0 and 100 percent clamp to the full and empty offsets', function () {
  has(hw.buildRingMarkup(0), 'data-offset="' + C1 + '"');
  has(hw.buildRingMarkup(100), 'data-offset="0"');
  has(hw.buildRingMarkup(140), 'data-offset="0"', 'over 100 clamps');
  has(hw.buildRingMarkup(-20), 'data-offset="' + C1 + '"', 'under 0 clamps');
});

test('cold start ring shows -- and "no data yet", never a fake percentage', function () {
  var html = hw.buildRingMarkup(null);
  has(html, 'data-state="cold"');
  has(html, '<div class="value stat-display">--</div>');
  has(html, '<div class="sub label">no data yet</div>');
  lacks(html, '0%');
  has(html, 'aria-label="Readiness not measured yet"');
});

test('ring value is tabular', function () {
  has(hw.buildRingMarkup(62), '<span class="tnum">62%</span>');
});

/* ---------------- buildGapScale ---------------- */

test('gap scale places fill and markers on the 100 to 900 scale', function () {
  var html = hw.buildGapScale(640, 675);
  // pct = (score - 100) / 8
  has(html, 'data-fill="67.5"');           // (640-100)/8
  has(html, 'class="marker pass" style="left:71.9%"'); // (675-100)/8 = 71.875 -> 71.9
  has(html, 'class="marker you" style="left:67.5%"');
});

test('gap scale starts at width 0 so the shell transition can run', function () {
  has(hw.buildGapScale(640, 675), 'class="fill" style="width:0%"');
});

test('gap scale fill sits inside the .track the shell styles', function () {
  has(hw.buildGapScale(640, 675), '<div class="track"><div class="fill"');
});

test('gap scale carries the contract classes and aria label', function () {
  var html = hw.buildGapScale(640, 675);
  has(html, '<div class="gap-scale" role="img" aria-label="Predicted 640, pass mark 675">');
  has(html, '<span>Pass <span class="tnum">675</span></span>');
  has(html, '<span>You <span class="tnum">640</span></span>');
});

test('gap scale clamps out-of-range scores and skips missing data', function () {
  has(hw.buildGapScale(2000, 675), 'data-fill="100"');
  has(hw.buildGapScale(0, 675), 'data-fill="0"');
  assert.strictEqual(hw.buildGapScale(null, 675), '');
  assert.strictEqual(hw.buildGapScale(640, null), '');
});

test('scorePct matches the documented formula', function () {
  assert.strictEqual(hw.scorePct(100), 0);
  assert.strictEqual(hw.scorePct(900), 100);
  assert.strictEqual(hw.scorePct(500), 50);
});

/* ---------------- buildActivityStrip ---------------- */

test('activity strip always renders exactly 7 days, last one flagged today', function () {
  var html = hw.buildActivityStrip([true, false, true, true, false, false, true]);
  has(html, '<div class="activity-strip" aria-label="Last 7 days">');
  var cells = html.match(/class="day /g) || [];
  assert.strictEqual(cells.length, 7);
  assert.strictEqual((html.match(/ today"/g) || []).length, 1);
  has(html, '<span class="day on today"></span>', 'today active cell');
});

test('activity strip pads short input with off days at the front', function () {
  var html = hw.buildActivityStrip([true]);
  assert.strictEqual((html.match(/class="day off"/g) || []).length, 6);
  has(html, 'class="day on today"');
});

test('activity strip trims to the last 7 entries', function () {
  var html = hw.buildActivityStrip([true, true, true, true, true, true, true, true, false]);
  var cells = html.match(/class="day /g) || [];
  assert.strictEqual(cells.length, 7);
  has(html, 'class="day off today"');
});

test('activity strip handles no input without throwing', function () {
  var html = hw.buildActivityStrip(null);
  assert.strictEqual((html.match(/class="day /g) || []).length, 7);
});

/* ---------------- buildSparklinePoints ---------------- */

test('sparkline is hidden under 2 scores', function () {
  assert.strictEqual(hw.buildSparklinePoints([]), '');
  assert.strictEqual(hw.buildSparklinePoints([640]), '');
  assert.strictEqual(hw.buildSparkline([640]), '');
});

test('sparkline spans the full 0 to 100 width', function () {
  var pts = hw.buildSparklinePoints([500, 600, 700]).split(' ');
  assert.strictEqual(pts.length, 3);
  assert.strictEqual(pts[0].split(',')[0], '0');
  assert.strictEqual(pts[2].split(',')[0], '100');
  assert.strictEqual(pts[1].split(',')[0], '50');
});

test('sparkline puts the best score highest and the worst lowest', function () {
  var pts = hw.buildSparklinePoints([500, 700]).split(' ').map(function (p) { return Number(p.split(',')[1]); });
  assert.ok(pts[0] > pts[1], 'lower score should sit lower on screen (larger y)');
  assert.strictEqual(pts[1], 3);   // top pad
  assert.strictEqual(pts[0], 37);  // 40 - pad
});

test('sparkline keeps a flat run on the middle line', function () {
  var pts = hw.buildSparklinePoints([640, 640, 640]).split(' ');
  pts.forEach(function (p) { assert.strictEqual(p.split(',')[1], '20'); });
});

test('sparkline uses at most the last 8 scores', function () {
  var many = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return 500 + n; });
  var pts = hw.buildSparklinePoints(many).split(' ');
  assert.strictEqual(pts.length, 8);
});

test('sparkline svg carries the contract markup', function () {
  var html = hw.buildSparkline([600, 650]);
  has(html, '<svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none"');
  has(html, '<polyline points="0,37 100,3"');
});

/* ---------------- buildCardStats ---------------- */

test('card stats show last score, attempt count and best', function () {
  var html = hw.buildCardStats({ last: 640, attempts: 3, best: 655 }, [false, false, true, false, false, false, true]);
  has(html, '<div class="card-stats">');
  has(html, '<div class="last-score stat-display"><span class="tnum">640</span></div>');
  has(html, 'Last score, <span class="tnum">3</span> attempts, best <span class="tnum">655</span>');
  has(html, 'class="activity-strip"');
});

test('card stats singularise a lone attempt', function () {
  has(hw.buildCardStats({ last: 655, attempts: 1, best: 655 }, []), '</span> attempt, best ');
});

test('card stats cold state shows -- and "No attempts yet"', function () {
  var html = hw.buildCardStats({ attempts: 0 }, []);
  has(html, '<div class="last-score stat-display">--</div>');
  has(html, '<div class="stats-meta label">No attempts yet</div>');
  lacks(html, '0 attempts');
});

/* ---------------- normalizeHistory ---------------- */

test('history normalises the stored newest-first shape to oldest first', function () {
  var list = hw.normalizeHistory([
    { examType: 'CORE1', scaledScore: 700, status: 'PASSED', date: '3/4/2026 10:00 AM' },
    { examType: 'CORE1', scaledScore: 640, status: 'FAILED', date: '3/1/2026 10:00 AM' }
  ]);
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].scaledScore, 640);
  assert.strictEqual(list[1].scaledScore, 700);
  assert.strictEqual(list[0].exam, 'core1');
  assert.strictEqual(list[1].passed, true);
  assert.strictEqual(list[0].passed, false);
});

test('history accepts a JSON string and the bus payload shape', function () {
  var list = hw.normalizeHistory(JSON.stringify([
    { examType: 'core2', scaledScore: 720, passed: true, timestamp: 200 },
    { examType: 'core2', scaledScore: 660, passed: false, timestamp: 100 }
  ]));
  assert.strictEqual(list[0].scaledScore, 660);
  assert.strictEqual(list[1].exam, 'core2');
});

test('history drops junk rows and never throws', function () {
  assert.deepStrictEqual(hw.normalizeHistory(null), []);
  assert.deepStrictEqual(hw.normalizeHistory('not json'), []);
  assert.strictEqual(hw.normalizeHistory([null, {}, { scaledScore: 'x' }]).length, 0);
});

test('history keeps stored order when timestamps are unparseable', function () {
  var list = hw.normalizeHistory([
    { examType: 'core1', scaledScore: 3, date: 'nonsense' },
    { examType: 'core1', scaledScore: 2, date: 'nonsense' },
    { examType: 'core1', scaledScore: 1, date: 'nonsense' }
  ]);
  assert.deepStrictEqual(list.map(function (r) { return r.scaledScore; }), [1, 2, 3]);
});

test('220-1201 and 220-1202 exam labels map to core1 and core2', function () {
  var list = hw.normalizeHistory([
    { examType: '220-1202', scaledScore: 710 },
    { examType: '220-1201', scaledScore: 690 }
  ]);
  var byScore = {};
  list.forEach(function (r) { byScore[r.scaledScore] = r.exam; });
  assert.strictEqual(byScore[710], 'core2');
  assert.strictEqual(byScore[690], 'core1');
});

/* ---------------- summarizeAttempts + activityDays ---------------- */

test('summarizeAttempts reports last, best and count', function () {
  var s = hw.summarizeAttempts([
    { scaledScore: 600 }, { scaledScore: 655 }, { scaledScore: 640 }
  ]);
  assert.strictEqual(s.last, 640);
  assert.strictEqual(s.best, 655);
  assert.strictEqual(s.attempts, 3);
  assert.deepStrictEqual(s.scores, [600, 655, 640]);
});

test('summarizeAttempts on an empty list is the cold state', function () {
  var s = hw.summarizeAttempts([]);
  assert.strictEqual(s.attempts, 0);
  assert.strictEqual(s.last, null);
});

test('activityDays marks the right cells for the last 7 local days', function () {
  var now = new Date(2026, 2, 10, 15, 0, 0).getTime(); // 10 March 2026, local
  var day = 86400000;
  var days = hw.activityDays([now, now - 2 * day, now - 6 * day, now - 30 * day], now);
  assert.strictEqual(days.length, 7);
  assert.deepStrictEqual(days, [true, false, false, false, true, false, true]);
});

test('activityDays with no timestamps is all off', function () {
  var days = hw.activityDays([], Date.now());
  assert.deepStrictEqual(days, [false, false, false, false, false, false, false]);
});

/* ---------------- house rules ---------------- */

test('no emoji and no em dashes in any generated markup', function () {
  var samples = [
    hw.buildRingMarkup(62), hw.buildRingMarkup(null),
    hw.buildGapScale(640, 675),
    hw.buildActivityStrip([true, false, true, false, true, false, true]),
    hw.buildSparkline([600, 650, 700]),
    hw.buildCardStats({ last: 640, attempts: 3, best: 655 }, []),
    hw.buildCardStats({ attempts: 0 }, [])
  ].join('');
  assert.strictEqual(samples.indexOf('—'), -1, 'em dash found');
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(samples), 'emoji found');
});

test('builders escape hostile input rather than emitting raw markup', function () {
  var html = hw.buildActivityStrip([true], { ariaLabel: '"><script>x</script>' });
  lacks(html, '<script>');
  has(html, '&lt;script&gt;');
});

/* ---------------- summary ---------------- */

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
