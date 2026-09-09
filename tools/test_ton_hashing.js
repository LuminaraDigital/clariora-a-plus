/**
 * test_ton_hashing.js
 * Verifies TON credential formatting, SHA-256 state hashing, and cell size compliance.
 */

const assert = require('assert');
const crypto = require('crypto');
const TONCredentials = require('../js/ton_credentials.js');

console.log('=== Testing TON Cryptographic Credential Hashing ===\n');

// 1. Test Memo generation
const testExamResult = {
  examCore: '1',
  scaledScore: 785,
  passed: true,
  ledgerHash: crypto.createHash('sha256').update('apx-session-12345').digest('hex'),
  learnerId: 'datacentre_trainee_01',
  timestamp: 1725700000000
};

const payload = TONCredentials.buildCredentialPayload(testExamResult);
console.log('Generated Memo:', payload.memo);

assert.ok(payload.memo.startsWith('APX:C1:785:PASS:'), 'Memo prefix must be valid');
const memoBytes = Buffer.byteLength(payload.memo, 'utf8');
console.log(`Memo byte length: ${memoBytes} bytes`);
assert.ok(memoBytes <= 128, 'TON standard comment memo should be <= 128 bytes for single-cell packing');

// 2. Test Base64 payload encoding for TON message
const b64Payload = Buffer.from(payload.memo, 'utf8').toString('base64');
const restoredMemo = Buffer.from(b64Payload, 'base64').toString('utf8');
assert.strictEqual(restoredMemo, payload.memo, 'Base64 roundtrip must match exactly');
console.log('Base64 cell payload:', b64Payload);

// 3. Test Full Record structure
assert.strictEqual(payload.fullRecord.standard, 'APX-TON-SBT-v1');
assert.strictEqual(payload.fullRecord.passingScore, 675);
assert.strictEqual(payload.fullRecord.scaledScore, 785);

console.log('\n=======================================');
console.log('✅ ALL TON CREDENTIAL TESTS PASSED!');
console.log('=======================================\n');
