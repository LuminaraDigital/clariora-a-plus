#!/usr/bin/env node
/**
 * tools/test_config_validator.js
 *
 * Automated test suite for tools/config_validator.js.
 * Verifies entropy calculation, placeholder rejection, key schemas,
 * and strict/partial validation modes.
 */

'use strict';

const assert = require('assert');
const {
  validateConfig,
  calculateShannonEntropy,
  countUniqueChars,
  isPlaceholder,
  parseEnvContent,
  REQUIRED_KEYS,
} = require('./config_validator');

console.log('=== test_config_validator.js ===');

// 1. Shannon Entropy Calculations
console.log('1. Verifying Shannon Entropy calculation...');
const zeroEntropy = calculateShannonEntropy('aaaaaa');
assert.strictEqual(zeroEntropy, 0, 'Uniform string must have 0 entropy');

const lowEntropy = calculateShannonEntropy('abababababab');
assert.strictEqual(lowEntropy, 1.0, 'Binary alternating string must have 1.0 entropy');

const hexEntropy = calculateShannonEntropy('3e90c1c8f8cb2a9bd8968fba1e15396aa3e3d9c8aaa798456977c25892cfd78b');
assert.ok(hexEntropy >= 3.5, `High-entropy hex must exceed 3.5 bits/char (got ${hexEntropy})`);
console.log(`   ✔ Shannon entropy logic verified (Uniform: ${zeroEntropy}, Hex: ${hexEntropy})`);

// 2. Dummy / Placeholder Rejection
console.log('2. Verifying placeholder & dummy string rejection...');
assert.strictEqual(isPlaceholder('your-token'), true);
assert.strictEqual(isPlaceholder('insert_here'), true);
assert.strictEqual(isPlaceholder('changeme'), true);
assert.strictEqual(isPlaceholder('00000000000000000000000000000000'), true);
assert.strictEqual(isPlaceholder(''), true);
assert.strictEqual(isPlaceholder('3e90c1c8f8cb2a9bd8968fba1e15396aa3e3d9c8aaa798456977c25892cfd78b'), false);
console.log('   ✔ Dummy placeholder rejection passed.');

// 3. Complete Valid Configuration
console.log('3. Testing complete valid production configuration...');
// Helper to generate deterministic synthetic hex and token strings for tests
function generateMockHex(len) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[(i * 7 + 3) % chars.length];
  }
  return out;
}

function generateMockBase64(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[(i * 11 + 5) % chars.length];
  }
  return out;
}

const mockAccountId = generateMockHex(32);
const validConfig = {
  CLOUDFLARE_API_TOKEN: 'mock_cfat_' + generateMockBase64(32),
  CLOUDFLARE_ACCOUNT_ID: mockAccountId,
  CLOUDFLARE_ZONE_ID: generateMockHex(32),
  R2_ACCESS_KEY_ID: generateMockHex(32),
  R2_SECRET_ACCESS_KEY: generateMockHex(64),
  R2_ENDPOINT: 'https://' + mockAccountId + '.r2.cloudflarestorage.com',
  ADMIN_API_KEY: generateMockHex(64),
  TELEGRAM_BOT_TOKEN: '9876543210:' + generateMockBase64(35),
  WEB_APP_URL: 'https://clariora.com.au/app',
  EDGE_WEBHOOK_SECRET: generateMockHex(48),
};

const validReport = validateConfig(validConfig, { strict: true });
assert.strictEqual(validReport.valid, true, 'Valid configuration must return valid: true');
assert.strictEqual(validReport.errors.length, 0, 'Valid configuration must have 0 errors');
console.log('   ✔ Complete valid configuration passed with 0 errors.');

// 4. Missing Keys in Strict vs Partial Mode
console.log('4. Testing missing keys handling...');
const partialConfig = { ...validConfig };
delete partialConfig.TELEGRAM_BOT_TOKEN;

const strictFail = validateConfig(partialConfig, { strict: true });
assert.strictEqual(strictFail.valid, false, 'Missing key in strict mode must fail');
assert.ok(
  strictFail.errors.some((e) => e.key === 'TELEGRAM_BOT_TOKEN'),
  'Errors must include TELEGRAM_BOT_TOKEN'
);

const partialPass = validateConfig(partialConfig, { allowMissing: true });
assert.strictEqual(partialPass.valid, true, 'Missing key in partial mode must pass');
assert.strictEqual(partialPass.warnings.length, 1);
console.log('   ✔ Strict and partial modes verified.');

// 5. Placeholder Injection Detection
console.log('5. Testing placeholder injection rejection...');
const placeholderConfig = {
  ...validConfig,
  ADMIN_API_KEY: 'changeme_your-token_placeholder',
};
const placeholderReport = validateConfig(placeholderConfig);
assert.strictEqual(placeholderReport.valid, false);
assert.ok(
  placeholderReport.errors.some((e) => e.key === 'ADMIN_API_KEY'),
  'Must reject placeholder in ADMIN_API_KEY'
);
console.log('   ✔ Placeholder injection rejected.');

// 6. Format Validation (Invalid Hex, Bad URL, Bad Telegram Token)
console.log('6. Testing schema format enforcement...');
const badHexConfig = {
  ...validConfig,
  CLOUDFLARE_ACCOUNT_ID: 'not_a_valid_hex_id_12345',
};
assert.strictEqual(validateConfig(badHexConfig).valid, false, 'Bad hex ID must be rejected');

const badEndpointConfig = {
  ...validConfig,
  R2_ENDPOINT: 'https://wrongaccountid.r2.cloudflarestorage.com',
};
assert.strictEqual(
  validateConfig(badEndpointConfig).valid,
  false,
  'Mismatched R2 endpoint account ID must be rejected'
);

const badBotConfig = {
  ...validConfig,
  TELEGRAM_BOT_TOKEN: 'invalid_bot_token_format',
};
assert.strictEqual(
  validateConfig(badBotConfig).valid,
  false,
  'Malformed Telegram Bot Token must be rejected'
);
console.log('   ✔ Format validation rules enforced.');

// 7. Low-Entropy Secret Rejection
console.log('7. Testing low-entropy secret rejection...');
const lowEntropyConfig = {
  ...validConfig,
  ADMIN_API_KEY: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};
const lowEntropyReport = validateConfig(lowEntropyConfig);
assert.strictEqual(lowEntropyReport.valid, false, 'Low entropy secret must be rejected');
console.log('   ✔ Low entropy secret successfully rejected.');

// 8. .env Parser Verification
console.log('8. Testing minimal .env parser...');
const rawEnv = `
# Comment line
CLOUDFLARE_ACCOUNT_ID=2373013c66331e9660e47ffa3ae40f5c
WEB_APP_URL="https://clariora.com.au/app"
R2_ACCESS_KEY_ID='d1d1d527b196fdfafc1389318a66d104'
`;
const parsed = parseEnvContent(rawEnv);
assert.strictEqual(parsed.CLOUDFLARE_ACCOUNT_ID, '2373013c66331e9660e47ffa3ae40f5c');
assert.strictEqual(parsed.WEB_APP_URL, 'https://clariora.com.au/app');
assert.strictEqual(parsed.R2_ACCESS_KEY_ID, 'd1d1d527b196fdfafc1389318a66d104');
console.log('   ✔ .env parser parsed comments and quotes accurately.');

console.log('\n✅ ALL CONFIG VALIDATOR TESTS PASSED!');
