/**
 * test_ton_hashing.js
 * Verifies TON credential formatting, SHA-256 state hashing, and comment BoC encoding.
 */

const assert = require('assert');
const crypto = require('crypto');
const TONComment = require('../js/ton_comment.js');
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

// 2. Text-comment BoC must match @ton/core golden vectors (not raw btoa)
const goldens = [
  { s: 'hello', b64: 'te6cckEBAQEACwAAEgAAAABoZWxsb5oNank=' },
  { s: 'clar_tg_1_testorder', b64: 'te6cckEBAQEAGQAALgAAAABjbGFyX3RnXzFfdGVzdG9yZGVyV4fWnA==' },
  { s: 'APX:C1:785:PASS:abcdef0123456789', b64: 'te6cckEBAQEAJgAASAAAAABBUFg6QzE6Nzg1OlBBU1M6YWJjZGVmMDEyMzQ1Njc4OV3rb6I=' }
];
for (const g of goldens) {
  const encoded = TONComment.encodeTonTextComment(g.s);
  assert.strictEqual(encoded, g.b64, 'BoC mismatch for comment: ' + g.s);
  console.log('  OK comment BoC:', g.s);
}

const credentialBoc = TONCredentials.encodeCommentPayload(payload.memo);
assert.ok(typeof credentialBoc === 'string' && credentialBoc.length > 20, 'Credential comment BoC required');
assert.notStrictEqual(
  credentialBoc,
  Buffer.from(payload.memo, 'utf8').toString('base64'),
  'Must not use raw btoa for TonConnect payload'
);
console.log('Credential memo BoC:', credentialBoc.slice(0, 24) + '...');

assert.strictEqual(TONComment.tonConnectNetworkId('testnet'), '-3');
assert.strictEqual(TONComment.tonConnectNetworkId('mainnet'), '-239');

// 3. Test Full Record structure
assert.strictEqual(payload.fullRecord.standard, 'APX-TON-SBT-v1');
assert.strictEqual(payload.fullRecord.passingScore, 675);
assert.strictEqual(payload.fullRecord.scaledScore, 785);

console.log('\n=======================================');
console.log('ALL TON CREDENTIAL TESTS PASSED!');
console.log('=======================================\n');
