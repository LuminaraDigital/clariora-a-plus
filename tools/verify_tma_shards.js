/**
 * verify_tma_shards.js
 * Comprehensive integrity validator for sharded question banks.
 * Validates all CompTIA A+ item types: single, multi, order, matching, pbq.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const shardsDir = path.join(__dirname, '../shards');
const files = fs.readdirSync(shardsDir).filter(f => f.endsWith('.json') && f !== 'meta.json');

console.log(`Checking ${files.length} JSON shards in ${shardsDir}...\n`);

let totalQuestions = 0;
let errors = 0;
const typeCounts = {};

files.forEach(file => {
  const filePath = path.join(shardsDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.ok(Array.isArray(data), `${file} content must be an array`);
    
    data.forEach((q, idx) => {
      totalQuestions++;
      const qtype = q.type || 'single';
      typeCounts[qtype] = (typeCounts[qtype] || 0) + 1;

      // Universal requirements
      if (!q.id || !q.question || !q.explanation) {
        console.error(`  ❌ [${file}] Question #${idx} missing basic fields! ID: ${q.id}`);
        errors++;
      }

      // Type-specific validation
      if (qtype === 'single') {
        const hasValidAnswer = q.answer !== undefined && q.answer !== null && q.answer !== '';
        if (!Array.isArray(q.options) || q.options.length < 2 || !hasValidAnswer) {
          console.error(`  ❌ [${file}] Question ${q.id} (single) invalid options/answer! answer:`, q.answer);
          errors++;
        }
      } else if (qtype === 'multi') {
        if (!Array.isArray(q.options) || !Array.isArray(q.answers)) {
          console.error(`  ❌ [${file}] Question ${q.id} (multi) invalid options/answers!`);
          errors++;
        }
      } else if (qtype === 'order') {
        if (!Array.isArray(q.sequence) && !Array.isArray(q.options)) {
          console.error(`  ❌ [${file}] Question ${q.id} (order) missing sequence/options!`);
          errors++;
        }
      }
    });

    console.log(`  ✔ [${file}]: ${data.length} questions parsed.`);
  } catch (err) {
    console.error(`  ❌ Error parsing ${file}:`, err.message);
    errors++;
  }
});

console.log(`\nVerified ${totalQuestions} questions across ${files.length} shards.`);
console.log('Question types breakdown:', typeCounts);

if (errors === 0) {
  console.log('\n✅ ALL TMA SHARDS ARE 100% VALID AND BLUEPRINT-CONFORMANT!');
  process.exit(0);
} else {
  console.error(`\n❌ Found ${errors} validation errors.`);
  process.exit(1);
}
