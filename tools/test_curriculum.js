/**
 * tools/test_curriculum.js
 * Node unit test for js/curriculum.js, the course library renderer.
 * Run: node tools/test_curriculum.js
 *
 * The parsers and HTML builders are pure, so this loads the module against a
 * bare window object and checks: the slide deck model (from the 1.1 catalog
 * shape and from old flat text), slide kinds, the lab worksheet model (steps,
 * parts, questions, terminal grouping, tables), the markdown subset, and that
 * every user supplied string is escaped on the way out. If curriculum_data.js
 * exists locally it also renders every real deck and lab once so a bad source
 * document fails here rather than in front of a learner.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

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
    console.log('       ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n       ') : err));
  }
}

function has(hay, needle, msg) {
  assert.ok(String(hay).indexOf(needle) >= 0, (msg || 'missing') + ': ' + needle);
}

function same(actual, expected, msg) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected), msg || 'values differ');
}

function lacks(hay, needle, msg) {
  assert.ok(String(hay).indexOf(needle) < 0, (msg || 'unexpected') + ': ' + needle);
}

/* ---------------- load module against a bare window ---------------- */

var win = { APlus: {}, localStorage: null };
win.window = win;
var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'curriculum.js'), 'utf8');
vm.runInNewContext(src, { window: win, document: undefined, navigator: {}, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console });
var C = win.APlus.curriculum;
var model = C.model;
var html = C.html;

/* ---------------- fixtures ---------------- */

var deckItem = {
  id: 'slide-test',
  kind: 'slide',
  title: 'Core 1 Module 2: Motherboards and CPUs',
  short_title: 'Motherboards and CPUs',
  module_no: 2,
  exam: 'core1',
  slides: 4,
  media_path: 'media/slides/A220-1201_M02_PPT.pptx',
  deck: [
    { n: 1, title: 'Exam 220-1201', subtitle: 'A+ Core 1', bullets: [], images: [], notes: '' },
    {
      n: 2,
      title: 'Cables and Connectors',
      subtitle: 'Lesson 2.1',
      bullets: [],
      images: [],
      notes: 'Core 1 Exam Objectives\n3.1 Compare display components.\n3.2 Summarize cable types.\nLearning Outcomes\nHow would you upgrade?'
    },
    {
      n: 3,
      title: 'Personal Computers <b>',
      subtitle: '',
      bullets: [
        { text: 'Front', level: 0 },
        { text: 'Access to drives & LEDs', level: 1 },
        { text: 'Air vents', level: 1 },
        { text: 'Back', level: 0 }
      ],
      images: ['media/slides/img/a220-1201-m02-ppt/s3-1.png', 'media/slides/img/a220-1201-m02-ppt/s3-2.png'],
      notes: 'Demonstrate with a tower.'
    },
    { n: 4, title: 'Summary', subtitle: '', bullets: [{ text: 'Done', level: 0 }], images: [], notes: '' }
  ]
};

var flatDeckItem = {
  id: 'slide-flat',
  kind: 'slide',
  title: 'Old shape deck',
  exam: 'core2',
  media_path: 'media/slides/x.pptx',
  content: '--- Slide 1 ---\nExam 220-1202\nA+ Core 2\n1\n\n--- Slide 2 ---\nBest Practice\nIdentify the problem\nTest the theory\n10'
};

var labItem = {
  id: 'lab-test',
  kind: 'lab',
  title: 'Configure a NIC to Use DHCP in Windows',
  lab_no: 5,
  exam: 'core2',
  format: 'docx-text',
  media_path: 'media/labs/Lab 05.docx',
  blocks: [
    { t: 'title', text: 'Lab - Configure a NIC to Use DHCP in Windows' },
    { t: 'h1', text: 'Introduction' },
    { t: 'p', text: 'In this lab, you will configure an Ethernet NIC.' },
    { t: 'h1', text: 'Recommended Equipment' },
    { t: 'bullet', text: 'Wireless router' },
    { t: 'bullet', text: 'Two computers running Windows' },
    { t: 'h1', text: 'Instructions' },
    { t: 'h2', text: 'Connect the hosts to the router.' },
    { t: 'step', text: 'Plug one end of the cable into Port 1.' },
    { t: 'step', text: 'Plug the other end into the <NIC>.' },
    { t: 'h2', text: 'Record the IP address.' },
    { t: 'step', text: 'Open a command prompt and enter ipconfig /all.' },
    { t: 'cmd', text: 'C:\\Users\\ITEUser> ipconfig /all' },
    { t: 'output', text: 'Windows IP Configuration' },
    { t: 'output', text: 'IPv4 Address. . . : 192.168.1.10' },
    { t: 'qhead', text: 'Questions' },
    { t: 'question', text: 'What is the IP address of Host A?' },
    { t: 'answer', text: '' },
    { t: 'question', text: 'What is the default gateway?' },
    { t: 'answer', text: '' },
    { t: 'note', text: 'Note: Your addresses will differ.' },
    { t: 'h1', text: 'Reflection Question' },
    { t: 'p', text: 'Why use DHCP instead of static addressing?' }
  ]
};

var partsLabItem = {
  id: 'lab-parts',
  kind: 'lab',
  title: 'Two part lab',
  lab_no: 9,
  exam: 'core2',
  format: 'docx-text',
  media_path: 'media/labs/Lab 09.docx',
  blocks: [
    { t: 'title', text: 'Lab - Two part' },
    { t: 'h1', text: 'Instructions' },
    { t: 'h2', text: 'Prepare' },
    { t: 'h3', text: 'Log in' },
    { t: 'step', text: 'Log on.' },
    { t: 'h3', text: 'Open tool' },
    { t: 'step', text: 'Open Disk Management.' },
    { t: 'h2', text: 'Verify' },
    { t: 'h3', text: 'Check' },
    { t: 'step', text: 'Confirm the partition.' },
    { t: 'table', rows: [['#', 'Item', '\u00fc'], ['1', 'Racked the servers', '\u2610'], ['2', 'Cabled the switches', '\u2610']] }
  ]
};

/* ---------------- deck model ---------------- */

test('deckOf keeps the 1.1 catalog shape', function () {
  var d = model.deckOf(deckItem);
  assert.strictEqual(d.length, 4);
  assert.strictEqual(d[2].bullets.length, 4);
  assert.strictEqual(d[2].images.length, 2);
});

test('deckOf parses old flat "--- Slide N ---" text and drops the trailing slide number', function () {
  var d = model.deckOf(flatDeckItem);
  assert.strictEqual(d.length, 2);
  assert.strictEqual(d[0].title, 'Exam 220-1202');
  assert.strictEqual(d[1].title, 'Best Practice');
  same(
    d[1].bullets.map(function (b) {
      return b.text;
    }),
    ['Identify the problem', 'Test the theory']
  );
});

test('slideKind tells cover, section and content apart', function () {
  var d = model.deckOf(deckItem);
  assert.strictEqual(model.slideKind(d[0], 0), 'cover');
  assert.strictEqual(model.slideKind(d[1], 1), 'section');
  assert.strictEqual(model.slideKind(d[2], 2), 'content');
});

test('sectionPoints pulls objectives out of the notes and stops at Learning Outcomes', function () {
  var pts = model.sectionPoints(deckItem.deck[1].notes);
  same(pts, ['3.1 Compare display components.', '3.2 Summarize cable types.']);
});

/* ---------------- deck html ---------------- */

test('slide html escapes titles, nests bullet levels and shows the image', function () {
  var out = html.slide(deckItem, model.deckOf(deckItem), 3);
  has(out, 'Personal Computers &lt;b&gt;');
  lacks(out, '<b>');
  has(out, 'cl-bullets-0');
  has(out, 'cl-bullets-1');
  has(out, 'Access to drives &amp; LEDs');
  has(out, 'media/slides/img/a220-1201-m02-ppt/s3-1.png');
  has(out, 'cl-slide-thumbs');
  has(out, '3 / 4');
});

test('cover slide names the module and the slide count', function () {
  var out = html.slide(deckItem, model.deckOf(deckItem), 1);
  has(out, 'cl-slide-cover');
  has(out, 'Module 2');
  has(out, '4 slides');
});

test('section slide lists exam objectives', function () {
  var out = html.slide(deckItem, model.deckOf(deckItem), 2);
  has(out, 'cl-slide-section');
  has(out, 'Lesson 2.1');
  has(out, '3.2 Summarize cable types.');
});

test('deck html carries nav, filmstrip, notes and progress', function () {
  var out = html.deck(deckItem, model.deckOf(deckItem), 3, { at: 3, seen: [1, 2, 3] });
  has(out, 'data-cl-action="prev"');
  has(out, 'data-cl-action="next"');
  has(out, 'Slide 3 of 4');
  has(out, 'aria-valuenow="75"');
  assert.strictEqual((out.match(/class="cl-film[ "]/g) || []).length, 4);
  has(out, 'cl-film is-active');
  has(out, 'Demonstrate with a tower.');
  has(out, 'Open PowerPoint');
  has(out, 'href="media/slides/A220-1201_M02_PPT.pptx"');
});

test('first and last slide disable the matching nav button', function () {
  var d = model.deckOf(deckItem);
  has(html.deck(deckItem, d, 1, { at: 1, seen: [1] }), 'data-cl-action="prev" aria-label="Previous slide" disabled');
  has(html.deck(deckItem, d, 4, { at: 4, seen: [4] }), 'data-cl-action="next" aria-label="Next slide" disabled');
});

/* ---------------- lab model ---------------- */

test('labOf splits intro, equipment, steps, questions and reflection', function () {
  var lab = model.labOf(labItem);
  assert.strictEqual(lab.intro.length, 1);
  same(lab.equipment, ['Wireless router', 'Two computers running Windows']);
  assert.strictEqual(lab.parts.length, 1);
  assert.strictEqual(lab.parts[0].steps.length, 2);
  assert.strictEqual(lab.parts[0].steps[0].heading, 'Connect the hosts to the router.');
  assert.strictEqual(lab.checkables, 3);
  assert.strictEqual(lab.questions, 3, 'two questions plus the reflection');
  assert.ok(lab.minutes >= 5);
  var keys = [];
  lab.parts[0].steps.forEach(function (s) {
    s.items.forEach(function (b) {
      if (b.key) keys.push(b.key);
    });
  });
  same(keys, ['s1', 's2', 's3', 'q1', 'q2']);
  assert.strictEqual(lab.reflection[0].key, 'q3');
});

test('labOf uses the shallow heading as Part when two heading levels exist', function () {
  var lab = model.labOf(partsLabItem);
  assert.strictEqual(lab.parts.length, 2);
  assert.strictEqual(lab.parts[0].heading, 'Prepare');
  assert.strictEqual(lab.parts[0].steps.length, 2);
  assert.strictEqual(lab.parts[1].steps[0].no, 3, 'step numbers run across parts');
});

test('blocksFromText recovers structure from old flat lab text', function () {
  var blocks = model.blocksFromText(
    'Lab - Install Windows\nObjectives\nIn this lab, you will install Windows.\nRequired Resources\nA computer\nInstructions\nStep 1: Start\nInsert the DVD.\nQuestion:\nWhat key did you press?\nType your answers here.\nC:\\> ipconfig'
  );
  var types = blocks.map(function (b) {
    return b.t;
  });
  same(types, ['title', 'h1', 'p', 'h1', 'p', 'h1', 'h3', 'p', 'qhead', 'question', 'answer', 'cmd']);
  var lab = model.labOf({ content: 'x', blocks: blocks, title: 'Install Windows' });
  assert.strictEqual(lab.parts[0].steps[0].heading, 'Step 1: Start');
});

/* ---------------- lab html ---------------- */

test('lab html renders checkboxes, letters, questions with textareas and a terminal pane', function () {
  var lab = model.labOf(labItem);
  var out = html.lab(labItem, lab, { done: { s1: true }, answers: { q1: 'It was 192.168.1.10 <ok>' } });
  has(out, 'Lab 05');
  has(out, '3 steps');
  has(out, '3 questions');
  has(out, '1 of 3 steps done');
  has(out, '1 of 3 answered');
  has(out, 'data-cl-step="s1" checked');
  has(out, 'data-cl-step="s2"');
  lacks(out, 'data-cl-step="s2" checked');
  has(out, 'cl-substep-letter">a<');
  has(out, 'cl-substep-letter">b<');
  has(out, 'Plug the other end into the &lt;NIC&gt;.');
  has(out, 'data-cl-answer="q1"');
  has(out, 'It was 192.168.1.10 &lt;ok&gt;');
  has(out, 'cl-question is-answered');
  has(out, 'cl-term-cmd');
  has(out, 'cl-term-out');
  has(out, 'data-copy="ipconfig /all"');
  lacks(out, 'Type your answers here');
  has(out, 'Your addresses will differ.');
  has(out, 'cl-reflection');
  has(out, 'What you will do');
  has(out, 'You will need');
  has(out, 'Reset progress');
});

test('a fully done lab says so', function () {
  var lab = model.labOf(labItem);
  var out = html.lab(labItem, lab, { done: { s1: true, s2: true, s3: true }, answers: {} });
  has(out, 'Lab complete');
  has(out, 'aria-valuenow="100"');
});

test('checklist tables become checkbox rows', function () {
  var lab = model.labOf(partsLabItem);
  var out = html.lab(partsLabItem, lab, { done: { t1: true }, answers: {} });
  has(out, '<th>Done</th>');
  has(out, 'data-cl-step="t0"');
  has(out, 'data-cl-step="t1" checked');
  has(out, 'Racked the servers');
  lacks(out, '\u00fc');
});

test('table rows do not count towards step progress', function () {
  var lab = model.labOf(partsLabItem);
  assert.strictEqual(lab.checkables, 3);
});

/* ---------------- markdown ---------------- */

test('markdown subset: headings, lists, tables, code, links; script never survives', function () {
  var md =
    '# Title <script>\n\nSome **bold** and `code` and a [link](https://example.com/a).\n\n| Need | Answer |\n|---|---|\n| RAM | 16 GB |\n\n- one\n- two\n\n1. first\n2. second\n\n```\nnet user\n```\n\n> careful\n\n---\n';
  var out = model.markdown(md);
  has(out, '<h4 class="cl-md-h cl-md-h1">Title &lt;script&gt;</h4>');
  has(out, '<strong>bold</strong>');
  has(out, '<code>code</code>');
  has(out, '<a href="https://example.com/a" target="_blank" rel="noopener">link</a>');
  has(out, '<table class="cl-table">');
  has(out, '<th>Need</th>');
  has(out, '<td>16 GB</td>');
  has(out, '<ul class="cl-md-list"><li>one</li><li>two</li></ul>');
  has(out, '<ol class="cl-md-list"><li>first</li><li>second</li></ol>');
  has(out, '<pre class="cl-code">net user</pre>');
  has(out, '<blockquote class="cl-note">careful</blockquote>');
  has(out, '<hr class="cl-md-hr">');
  lacks(out, '<script>');
});

test('markdown ignores javascript: links', function () {
  var out = model.markdown('[x](javascript:alert(1))');
  lacks(out, 'href="javascript');
});

/* ---------------- list items ---------------- */

test('list items carry the badge, exam and progress', function () {
  has(html.listItem(deckItem, true, '2 viewed'), 'M02');
  has(html.listItem(deckItem, true, '2 viewed'), 'is-active');
  has(html.listItem(deckItem, true, '2 viewed'), '2 viewed');
  has(html.listItem(labItem, false, ''), 'Lab 05');
  has(html.listItem({ kind: 'lab', format: 'markdown', title: 'Guide', exam: 'both', id: 'g' }, false, ''), 'Guide');
  has(html.listItem({ kind: 'video', title: 'V', exam: 'core1', id: 'v', size_mb: '73.5' }, false, 'Watched'), 'Watched');
});

test('sortLabs puts guides first, then numbered labs in order, then the capstone', function () {
  var sorted = C.sortLabs([
    { title: 'Capstone', format: 'docx-text', lab_no: null },
    { title: 'B', format: 'docx-text', lab_no: 12 },
    { title: 'Guide', format: 'markdown', lab_no: null },
    { title: 'A', format: 'docx-text', lab_no: 3 }
  ]);
  same(
    sorted.map(function (x) {
      return x.title;
    }),
    ['Guide', 'A', 'B', 'Capstone']
  );
});

/* ---------------- real catalog, when present ---------------- */

var catalogPath = path.join(__dirname, '..', 'curriculum_data.js');
if (fs.existsSync(catalogPath)) {
  var sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(catalogPath, 'utf8'), sandbox);
  var cat = sandbox.window.COMPTIA_CURRICULUM;

  test('every real slide deck renders every slide', function () {
    var decks = 0;
    var slides = 0;
    (cat.slides || []).forEach(function (item) {
      var d = model.deckOf(item);
      assert.ok(d.length > 0, item.id + ' has no slides');
      d.forEach(function (_, i) {
        var out = html.slide(item, d, i + 1);
        assert.ok(out.indexOf('cl-slide') >= 0, item.id);
        slides++;
      });
      html.deck(item, d, 1, { at: 1, seen: [] });
      decks++;
    });
    console.log('       rendered ' + slides + ' slides across ' + decks + ' decks');
  });

  test('every real lab renders with steps or a guide body', function () {
    var n = 0;
    (cat.labs || []).forEach(function (item) {
      if (item.format === 'markdown') {
        var md = html.markdownLab(item);
        assert.ok(md.indexOf('cl-md-h') >= 0, item.id + ' produced no headings');
      } else {
        var lab = model.labOf(item);
        var out = html.lab(item, lab, { done: {}, answers: {} });
        assert.ok(lab.checkables > 0 || out.indexOf('cl-table') >= 0, item.id + ' has neither steps nor a table');
        assert.ok(out.indexOf('data-cl-step=') >= 0, item.id + ' has nothing to tick');
      }
      n++;
    });
    console.log('       rendered ' + n + ' labs');
  });

  test('no real lab leaks the answer placeholder text', function () {
    (cat.labs || []).forEach(function (item) {
      if (item.format === 'markdown') return;
      var out = html.lab(item, model.labOf(item), { done: {}, answers: {} });
      lacks(out, 'Type your answers here', item.id);
      lacks(out, 'Open configuration window', item.id);
    });
  });
} else {
  console.log('  skip real catalog checks (curriculum_data.js not built here)');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
