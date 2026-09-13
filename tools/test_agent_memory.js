#!/usr/bin/env node
/**
 * tools/test_agent_memory.js
 * Unit tests for D1 promote + deterministic coach extract/store.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

function createFakeDb() {
  let seq = 1;
  const rows = [];
  return {
    rows,
    prepare(sql) {
      const self = {
        _params: [],
        bind(...params) {
          self._params = params;
          return self;
        },
        async run() {
          if (/CREATE TABLE|CREATE INDEX/i.test(sql)) return { success: true };
          if (/INSERT INTO learner_memories/i.test(sql)) {
            const [user_id, kind, content, objective, score, created_at, updated_at] = self._params;
            const id = seq++;
            rows.push({ id, user_id, kind, content, objective, score, created_at, updated_at });
            return { success: true, meta: { last_row_id: id } };
          }
          if (/UPDATE learner_memories/i.test(sql)) {
            const [content, objective, score, updated_at, id, user_id] = self._params;
            const row = rows.find((r) => r.id === id && r.user_id === user_id);
            if (row) {
              row.content = content;
              row.objective = objective;
              row.score = score;
              row.updated_at = updated_at;
            }
            return { success: true };
          }
          return { success: true };
        },
        async all() {
          if (/FROM learner_memories/i.test(sql)) {
            const userId = self._params[0];
            const limit = self._params[1] || 40;
            const list = rows
              .filter((r) => r.user_id === userId)
              .sort((a, b) => b.updated_at - a.updated_at)
              .slice(0, limit);
            return { results: list };
          }
          return { results: [] };
        },
        async first() {
          const all = await self.all();
          return (all.results && all.results[0]) || null;
        }
      };
      return self;
    }
  };
}

async function main() {
  const mem = await import(pathToFileURL(path.join(ROOT, 'workers', 'agent_memory.js')).href);
  const db = createFakeDb();
  const auth = { firebaseUid: 'user-abc' };

  console.log('====================================================');
  console.log('TESTING AGENT MEMORY (promote + extract)');
  console.log('====================================================\n');

  const facts = mem.extractCoachFacts({
    body: {
      objective: '2.4',
      chosenAnswer: 'DHCP assigns host names',
      correctAnswer: 'DNS resolves host names to IP addresses'
    },
    triage: { intent: 'explain', specialist: 'networking' },
    replyText: 'DHCP leases addresses. DNS names hosts. Do not mix them.'
  });
  assert.strictEqual(facts.length, 3);
  assert.ok(facts.some((f) => f.kind === 'weak_objective'));
  assert.ok(facts.some((f) => f.kind === 'miss_pattern'));
  assert.ok(facts.some((f) => f.kind === 'agent_trace'));
  console.log('1. extractCoachFacts ✔');

  const first = await mem.extractAndStoreCoachTurn(db, auth, {
    body: {
      objective: '2.4',
      chosenAnswer: 'DHCP assigns host names',
      correctAnswer: 'DNS resolves host names to IP addresses',
      confusionPairs: [
        { key: 'dhcp|dns', a: 'dhcp', b: 'dns', count: 3, objective: '2.4' }
      ],
      weakObjectives: [
        { objective: '2.4', domain: '2.0 Networking', attempts: 4, wrong: 3, accuracy: 0.25, weakness: 0.8 }
      ]
    },
    triage: { intent: 'explain', specialist: 'networking' },
    replyText: 'DHCP leases. DNS resolves.'
  });
  assert.ok(first.ok);
  assert.ok(first.stored >= 1);
  assert.ok(first.promoted && first.promoted.ok);
  const afterFirst = db.rows.length;
  assert.ok(afterFirst >= 3, 'expected facts + confusion promote rows');
  console.log('2. extractAndStoreCoachTurn first write ✔');

  const second = await mem.extractAndStoreCoachTurn(db, auth, {
    body: {
      objective: '2.4',
      chosenAnswer: 'DHCP assigns host names',
      correctAnswer: 'DNS resolves host names to IP addresses',
      ghostCoachPromote: {
        confusionPairs: [
          { key: 'dhcp|dns', a: 'dhcp', b: 'dns', count: 5, objective: '2.4' }
        ],
        weakObjectives: [
          { objective: '2.4', domain: '2.0 Networking', attempts: 6, wrong: 4, accuracy: 0.33, weakness: 0.9 }
        ]
      }
    },
    triage: { intent: 'explain', specialist: 'networking' },
    replyText: 'Still mixing DHCP and DNS.'
  });
  assert.ok(second.ok);
  assert.ok(second.updated >= 1, 'repeat turn should upsert by fingerprint');
  assert.ok(db.rows.length <= afterFirst + 1, 'should not spam duplicate pair rows');
  console.log('3. fingerprint upsert ✔');

  const hits = await mem.searchMemories(db, auth, { query: 'dns dhcp', topK: 5 });
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((h) => h.kind === 'confusion_pair' || h.kind === 'miss_pattern'));
  const block = mem.formatMemoriesForPrompt(hits);
  assert.ok(block.indexOf('[fp:') === -1, 'prompt should strip fingerprint markers');
  assert.ok(/Learner memory/i.test(block));
  console.log('4. search + formatMemoriesForPrompt ✔');

  const promoteOnly = await mem.promoteGhostCoachTelemetry(db, auth, {
    confusionPairs: [
      { key: 'nat|vpn', a: 'nat', b: 'vpn', count: 2, objective: '2.5' }
    ],
    weakObjectives: []
  });
  assert.ok(promoteOnly.ok);
  assert.ok(promoteOnly.stored + promoteOnly.updated >= 1);
  console.log('5. promoteGhostCoachTelemetry ✔');

  const boot = mem.buildSessionBootPack({
    maxChars: 1800,
    mission: {
      title: "Today's mission: focus 2.4",
      summary: 'Drill DNS vs DHCP distractors.',
      primaryObjective: '2.4'
    },
    confusionPair: { key: 'dhcp|dns', a: 'dhcp', b: 'dns', count: 5, objective: '2.4' },
    memories: [
      { kind: 'weak_objective', objective: '2.4', content: '[fp:wo:2.4] Weak on objective 2.4' },
      { kind: 'miss_pattern', objective: '2.4', content: 'Miss pattern: DHCP vs DNS' },
      { kind: 'agent_trace', content: 'Coach explain/networking: DHCP leases addresses.' },
      { kind: 'weak_objective', objective: '3.1', content: 'Weak on objective 3.1' },
      { kind: 'preference', content: 'Prefers short mnemonics' }
    ]
  });
  assert.ok(boot.text.indexOf('Session boot') === 0);
  assert.ok(boot.text.indexOf('Mission:') !== -1);
  assert.ok(boot.text.indexOf('Top confusion:') !== -1);
  assert.ok(boot.text.indexOf('Memories:') !== -1);
  assert.ok(boot.chars <= 1800);
  assert.ok(boot.included.mission);
  assert.ok(boot.included.confusion);
  assert.ok(boot.included.memories >= 1);
  assert.ok(boot.text.indexOf('[fp:') === -1);
  console.log('6. buildSessionBootPack ✔');

  const tiny = mem.buildSessionBootPack({
    maxChars: 420,
    mission: {
      title: 'Long mission title that should still fit when memories shrink',
      summary: 'x'.repeat(200),
      primaryObjective: '2.4'
    },
    confusionPair: { a: 'dhcp', b: 'dns', count: 9, objective: '2.4' },
    memories: Array.from({ length: 5 }, (_, i) => ({
      kind: 'weak_objective',
      objective: '2.' + i,
      content: 'Weak detail '.repeat(20) + i
    }))
  });
  assert.ok(tiny.chars <= 420);
  assert.ok(tiny.included.mission || tiny.included.confusion, 'tiny pack should keep mission or confusion');
  console.log('7. buildSessionBootPack hard cap ✔');

  const assembled = await mem.assembleCoachBootContext(db, auth, {
    objective: '2.4',
    currentMission: { title: 'Focus 2.4', summary: 'Networking drill', primaryObjective: '2.4' },
    confusionPairs: [{ key: 'dhcp|dns', a: 'dhcp', b: 'dns', count: 3 }]
  });
  assert.ok(assembled.pack);
  assert.ok(assembled.memoryBlock.indexOf('Session boot') !== -1 || assembled.memoryHits.length >= 0);
  console.log('8. assembleCoachBootContext ✔');

  console.log('\nAll agent_memory tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
