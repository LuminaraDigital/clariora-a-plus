/**
 * tools/test_notes_suite.js
 * CEO Acceptance Gate Test Suite for Clariora Notes & High-Yield Learning Suite v3.2.0
 * Run: node tools/test_notes_suite.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

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

console.log('\n=== Testing Clariora Notes & High-Yield Learning Suite (v3.2.0) ===\n');

// 1. Load Notes Engine
const NotesEngine = require('../js/notes-engine.js');
const MarkdownRenderer = require('../js/markdown-renderer.js');

test('NotesEngine: saves and retrieves question note with metadata', () => {
  const note = NotesEngine.saveNote('C1-042', 'Mnemonic: TCP 22 for SSH, TCP 23 for cleartext Telnet', {
    questionStem: 'Which port is used for encrypted administration?',
    objective: '2.1',
    domain: '2.0 Networking',
    exam: 'core1',
    tags: ['ports', 'security']
  });

  assert.ok(note, 'Note should be returned');
  assert.strictEqual(note.questionId, 'C1-042');
  assert.strictEqual(note.text, 'Mnemonic: TCP 22 for SSH, TCP 23 for cleartext Telnet');
  assert.strictEqual(note.objective, '2.1');
  assert.strictEqual(note.exam, 'core1');
  assert.ok(note.createdAt, 'Should have createdAt');
  assert.ok(note.updatedAt, 'Should have updatedAt');

  const fetched = NotesEngine.getNote('C1-042');
  assert.ok(fetched, 'Fetched note must exist');
  assert.strictEqual(fetched.text, note.text);
  assert.strictEqual(NotesEngine.hasNote('C1-042'), true);
  assert.strictEqual(NotesEngine.hasNote('NON-EXISTENT'), false);
});

test('NotesEngine: scratchpad persistence and clear operations', () => {
  const text = '1. Identify Problem\n2. Establish Theory\n3. Test Theory';
  NotesEngine.saveScratchpad('core1', text);

  assert.strictEqual(NotesEngine.getScratchpad('core1'), text);
  assert.strictEqual(NotesEngine.getScratchpad('nonexistent'), '');

  NotesEngine.clearScratchpad('core1');
  assert.strictEqual(NotesEngine.getScratchpad('core1'), '');
});

test('NotesEngine: Markdown study notes export compiler', () => {
  NotesEngine.saveNote('C1-100', 'Remember: T568B pin 1 is White/Orange', {
    questionStem: 'What is the color of pin 1 in T568B?',
    objective: '2.2',
    domain: '2.0 Networking',
    exam: 'core1'
  });

  NotesEngine.saveNote('C2-200', 'SFC repairs files, DISM restores component store', {
    questionStem: 'Which tool repairs corrupted Windows files?',
    objective: '3.1',
    domain: '3.0 Software Troubleshooting',
    exam: 'core2'
  });

  const md = NotesEngine.exportNotesAsMarkdown();
  assert.ok(md.includes('# Clariora A+ Personal Study Notes & Cram Sheet'), 'Title should be present');
  assert.ok(md.includes('## Core 1 (220-1201)'), 'Core 1 section must exist');
  assert.ok(md.includes('## Core 2 (220-1202)'), 'Core 2 section must exist');
  assert.ok(md.includes('T568B pin 1 is White/Orange'), 'Core 1 note content must exist');
  assert.ok(md.includes('SFC repairs files'), 'Core 2 note content must exist');
});

test('NotesEngine: JSON export and import', () => {
  const jsonStr = NotesEngine.exportNotesAsJson();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed['C1-100'], 'Exported JSON should contain C1-100');

  // Delete note
  NotesEngine.deleteNote('C1-100');
  assert.strictEqual(NotesEngine.hasNote('C1-100'), false);

  // Re-import
  const importedCount = NotesEngine.importNotesFromJson(jsonStr);
  assert.ok(importedCount >= 1, 'Should import at least 1 note');
  assert.strictEqual(NotesEngine.hasNote('C1-100'), true);
});

test('MarkdownRenderer: renders headings, lists, code, and inline math', () => {
  const input = `# Heading 1\n## Heading 2\n\n- Item 1\n- Item 2\n\nHere is \`code\` and $E=mc^2$ with **bold** text.`;
  const html = MarkdownRenderer.render(input);

  assert.ok(html.includes('<h1 class="md-heading md-h1">Heading 1</h1>'), 'h1 should render');
  assert.ok(html.includes('<h2 class="md-heading md-h2">Heading 2</h2>'), 'h2 should render');
  assert.ok(html.includes('<ul class="md-list md-ul">'), 'ul should render');
  assert.ok(html.includes('<li>Item 1</li>'), 'li should render');
  assert.ok(html.includes('<code class="md-inline-code">code</code>'), 'inline code should render');
  assert.ok(html.includes('<span class="md-inline-math">E=mc^2</span>'), 'math should render');
  assert.ok(html.includes('<strong>bold</strong>'), 'bold should render');
});

test('MarkdownRenderer: renders tables with alignments', () => {
  const input = `| Port | Protocol |\n| :--- | :---: |\n| 22 | SSH |\n| 53 | DNS |`;
  const html = MarkdownRenderer.render(input);

  assert.ok(html.includes('<table class="md-table">'), 'table should render');
  assert.ok(html.includes('<th style="text-align: left;">Port</th>'), 'header left align');
  assert.ok(html.includes('<th style="text-align: center;">Protocol</th>'), 'header center align');
  assert.ok(html.includes('<td style="text-align: left;">22</td>'), 'cell should render');
  assert.ok(html.includes('<td style="text-align: center;">SSH</td>'), 'cell should render');
});

test('MarkdownRenderer: renders GitHub-style alert callouts', () => {
  const input = `> [!IMPORTANT]\n> Always back up customer data before attempting repairs!`;
  const html = MarkdownRenderer.render(input);

  assert.ok(html.includes('md-alert md-alert-important'), 'important alert should render');
  assert.ok(html.includes('Always back up customer data'), 'alert body should render');
});

test('HTML Integration: index.html has notes suite and whiteboard buttons', () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const content = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(content.includes('js/notes-engine.js'), 'index.html must load notes-engine.js');
  assert.ok(content.includes('js/markdown-renderer.js'), 'index.html must load markdown-renderer.js');
  assert.ok(content.includes('js/notes-ui.js'), 'index.html must load notes-ui.js');
  assert.ok(content.includes('js/cram-sheet.js'), 'index.html must load cram-sheet.js');
  assert.ok(content.includes('examScratchpadBtn'), 'index.html must include Whiteboard toolbar button');
  assert.ok(content.includes('openStudyNotebookModal()'), 'index.html must include My study notebook in drawer');
  assert.ok(content.includes('openCramSheetModal()'), 'index.html must include Quick cram sheet in drawer');
});

test('Pearson Mode: js/pearson-mode.js injects whiteboard button', () => {
  const pPath = path.resolve(__dirname, '../js/pearson-mode.js');
  const content = fs.readFileSync(pPath, 'utf8');
  assert.ok(content.includes('pearsonWhiteboardBtn'), 'pearson-mode.js must inject pearsonWhiteboardBtn');
});

test('Engine Session Modes: js/engine.js supports notes practice mode', () => {
  const ePath = path.resolve(__dirname, '../js/engine.js');
  const content = fs.readFileSync(ePath, 'utf8');
  assert.ok(content.includes("notes: 'practice'"), 'engine.js MODE_BY_TYPE must support notes');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
process.exit(failed ? 1 : 0);
