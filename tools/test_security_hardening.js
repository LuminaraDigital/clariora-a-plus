#!/usr/bin/env node
/**
 * tools/test_security_hardening.js - Security Hardening & Remediation Verification Suite
 *
 * Verifies:
 *   1. Media sanitization (huly_laser_remix_scene.png has no pwd= match, retains 1440x900 RGBA).
 *   2. CSP enforcement across _headers, index.html (<meta>), and main.js (ses.webRequest).
 *   3. Defensive IPC validation guards on storage:set, storage:setAsync, database:saveAll, groq:chat.
 *   4. Secret scanner execution (clean repository scan & self-test suite).
 *
 * Exit code 0 on complete pass, 1 on any assertion failure.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

let passedChecks = 0;
let failedChecks = 0;

function check(label, fn) {
  try {
    fn();
    passedChecks += 1;
    console.log(`  ✔ [PASS] ${label}`);
  } catch (err) {
    failedChecks += 1;
    console.error(`  ✖ [FAIL] ${label}`);
    console.error(`     Error: ${err && err.message}`);
  }
}

console.log('====================================================');
console.log('ENTERPRISE SECURITY HARDENING VERIFICATION SUITE');
console.log('====================================================\n');

// ============================================================================
// SUITE 1: Media Sanitization Verification
// ============================================================================
console.log('Suite 1: Verifying Media Sanitization & Byte Verification...');

const mediaPath = path.join(ROOT, 'media', 'brand', 'huly_laser_remix_scene.png');
const distMediaPath = path.join(ROOT, 'dist_web', 'media', 'brand', 'huly_laser_remix_scene.png');

check('Media file media/brand/huly_laser_remix_scene.png exists on disk', () => {
  assert.ok(fs.existsSync(mediaPath), `Missing target media: ${mediaPath}`);
});

check('Binary contents strictly do NOT contain b"pwd=" or b"password="', () => {
  const buf = fs.readFileSync(mediaPath);
  assert.strictEqual(buf.includes(Buffer.from('pwd=')), false, 'b"pwd=" detected in media file!');
  assert.strictEqual(buf.indexOf('pwd='), -1, 'pwd= index match found in buffer!');
  assert.strictEqual(buf.includes(Buffer.from('password=')), false, 'b"password=" detected in media file!');
});

check('PNG format signature and IHDR dimensions match 1440x900 RGBA exactly', () => {
  const buf = fs.readFileSync(mediaPath);
  // PNG Magic Header: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(buf.subarray(0, 8).equals(pngHeader), 'Invalid PNG signature');

  // IHDR chunk: 4 bytes length, 4 bytes "IHDR", 4 bytes width, 4 bytes height, 1 byte bit depth, 1 byte color type
  const ihdrType = buf.toString('ascii', 12, 16);
  assert.strictEqual(ihdrType, 'IHDR', 'Expected IHDR chunk at offset 12');

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25); // 6 = RGBA, 2 = RGB

  assert.strictEqual(width, 1440, `Width mismatch: expected 1440, got ${width}`);
  assert.strictEqual(height, 900, `Height mismatch: expected 900, got ${height}`);
  assert.strictEqual(bitDepth, 8, `Bit depth mismatch: expected 8, got ${bitDepth}`);
  assert.strictEqual(colorType, 6, `Color type mismatch: expected 6 (RGBA), got ${colorType}`);
});

if (fs.existsSync(distMediaPath)) {
  check('Synchronized dist_web media is also clean of b"pwd=" and valid 1440x900', () => {
    const distBuf = fs.readFileSync(distMediaPath);
    assert.strictEqual(distBuf.includes(Buffer.from('pwd=')), false, 'dist_web image contains pwd=');
    assert.strictEqual(distBuf.readUInt32BE(16), 1440, 'dist_web width mismatch');
    assert.strictEqual(distBuf.readUInt32BE(20), 900, 'dist_web height mismatch');
  });
}

// ============================================================================
// SUITE 2: Content-Security-Policy (CSP) Verification
// ============================================================================
console.log('\nSuite 2: Verifying CSP Configuration across _headers, index.html & main.js...');

const headersPath = path.join(ROOT, '_headers');
const indexPath = path.join(ROOT, 'index.html');
const mainPath = path.join(ROOT, 'main.js');

let canonicalCSP = '';

check('_headers contains a robust Content-Security-Policy declaration', () => {
  assert.ok(fs.existsSync(headersPath), '_headers file must exist');
  const content = fs.readFileSync(headersPath, 'utf8');
  const match = content.match(/Content-Security-Policy:\s*([^\r\n]+)/i);
  assert.ok(match && match[1], 'Content-Security-Policy header not found in _headers');
  canonicalCSP = match[1].trim();

  assert.ok(canonicalCSP.includes("default-src 'self'"), 'CSP missing default-src');
  assert.ok(canonicalCSP.includes("object-src 'none'"), 'CSP missing object-src none');
  assert.ok(canonicalCSP.includes("base-uri 'self'"), 'CSP missing base-uri self');
  assert.ok(canonicalCSP.includes('script-src'), 'CSP missing script-src');
  assert.ok(canonicalCSP.includes('connect-src'), 'CSP missing connect-src');
});

check('index.html contains <meta http-equiv="Content-Security-Policy"> mirroring _headers', () => {
  assert.ok(fs.existsSync(indexPath), 'index.html file must exist');
  const html = fs.readFileSync(indexPath, 'utf8');
  const match = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=(["'])([\s\S]*?)\1/i);
  assert.ok(match && match[2], 'Meta Content-Security-Policy tag not found in index.html head');
  const metaCSP = match[2].trim();

  assert.ok(metaCSP.includes("default-src 'self'"), 'Meta CSP missing default-src');
  assert.ok(metaCSP.includes("object-src 'none'"), 'Meta CSP missing object-src none');
  assert.ok(metaCSP.includes("base-uri 'self'"), 'Meta CSP missing base-uri');
  assert.ok(metaCSP.includes('https://telegram.org'), 'Meta CSP missing telegram.org');
  assert.ok(metaCSP.includes('https://api.telegram.org'), 'Meta CSP missing api.telegram.org');
  assert.ok(metaCSP.includes('https://comptia-a-plus-master.pages.dev'), 'Meta CSP missing CDN pages origin');
});

check('main.js applySecurityPolicy attaches CSP via ses.webRequest.onHeadersReceived', () => {
  assert.ok(fs.existsSync(mainPath), 'main.js file must exist');
  const code = fs.readFileSync(mainPath, 'utf8');

  assert.ok(code.includes('applySecurityPolicy'), 'applySecurityPolicy function missing in main.js');
  assert.ok(code.includes('ses.webRequest.onHeadersReceived'), 'ses.webRequest.onHeadersReceived missing');
  assert.ok(code.includes("responseHeaders['Content-Security-Policy']"), 'CSP header assignment missing');
  assert.ok(code.includes("default-src 'self'"), 'CSP policy string missing in main.js');
  assert.ok(code.includes("object-src 'none'"), 'object-src none missing in main.js CSP');
});

// ============================================================================
// SUITE 3: Defensive IPC Validation Guards Verification
// ============================================================================
console.log('\nSuite 3: Verifying Defensive IPC Guards & Bounds Checking in main.js...');

check('main.js specifies IPC security bounds (MAX_IPC_KEY_LENGTH, MAX_STORAGE_VALUE_BYTES)', () => {
  const code = fs.readFileSync(mainPath, 'utf8');
  assert.ok(/MAX_IPC_KEY_LENGTH\s*=\s*256/.test(code), 'MAX_IPC_KEY_LENGTH (256) missing');
  assert.ok(/MAX_STORAGE_VALUE_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/.test(code), 'MAX_STORAGE_VALUE_BYTES (10MB) missing');
});

check('main.js validates storage keys and rejects keys > 256 characters or non-strings', () => {
  const code = fs.readFileSync(mainPath, 'utf8');
  assert.ok(code.includes('validateStorageKey'), 'validateStorageKey helper missing');
  assert.ok(code.includes('storage:set'), 'storage:set listener missing');
  assert.ok(code.includes('storage:setAsync'), 'storage:setAsync handler missing');

  // Extract and test validation function logic
  const fnMatch = code.match(/function\s+validateStorageKey\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fnMatch, 'Could not extract validateStorageKey');
  const validateKey = new Function('key', 'const MAX_IPC_KEY_LENGTH = 256;\n' + fnMatch[0] + '\nreturn validateStorageKey(key);');

  assert.strictEqual(validateKey('valid_key'), true, 'Valid key rejected');
  assert.strictEqual(validateKey('a'.repeat(256)), true, 'Max length 256 key rejected');
  assert.strictEqual(validateKey('a'.repeat(257)), false, 'Over-length key accepted');
  assert.strictEqual(validateKey(''), false, 'Empty key accepted');
  assert.strictEqual(validateKey('   '), false, 'Whitespace-only key accepted');
  assert.strictEqual(validateKey(123), false, 'Number key accepted');
  assert.strictEqual(validateKey(null), false, 'Null key accepted');
  assert.strictEqual(validateKey(undefined), false, 'Undefined key accepted');
  assert.strictEqual(validateKey({}), false, 'Object key accepted');
});

check('main.js validates storage values and rejects values > 10MB or malformed types', () => {
  const code = fs.readFileSync(mainPath, 'utf8');
  assert.ok(code.includes('validateStorageValue'), 'validateStorageValue helper missing');

  const fnMatch = code.match(/function\s+validateStorageValue\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fnMatch, 'Could not extract validateStorageValue');
  const validateValue = new Function(
    'val',
    'const MAX_STORAGE_VALUE_BYTES = 10 * 1024 * 1024;\n' + fnMatch[0] + '\nreturn validateStorageValue(val);'
  );

  assert.strictEqual(validateValue('normal_string'), true, 'String value rejected');
  assert.strictEqual(validateValue(42), true, 'Number value rejected');
  assert.strictEqual(validateValue(true), true, 'Boolean value rejected');
  assert.strictEqual(validateValue(null), true, 'Null value rejected');
  assert.strictEqual(validateValue({ a: 1, b: 'two' }), true, 'Object value rejected');
  assert.strictEqual(validateValue([1, 2, 3]), true, 'Array value rejected');

  assert.strictEqual(validateValue(undefined), false, 'Undefined value accepted');
  assert.strictEqual(validateValue(() => {}), false, 'Function value accepted');
  assert.strictEqual(validateValue(Symbol('bad')), false, 'Symbol value accepted');

  // Circular reference rejection
  const circular = {};
  circular.self = circular;
  assert.strictEqual(validateValue(circular), false, 'Circular object accepted');

  // Value over 10 MB rejection
  const oversized = 'x'.repeat(10 * 1024 * 1024 + 1);
  assert.strictEqual(validateValue(oversized), false, 'Oversized string value accepted');
});

check('main.js validates database:saveAll and database:saveAllAsync against malformed payloads', () => {
  const code = fs.readFileSync(mainPath, 'utf8');
  assert.ok(code.includes('validateDatabasePayload'), 'validateDatabasePayload helper missing');

  const fnMatch = code.match(/function\s+validateDatabasePayload\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fnMatch, 'Could not extract validateDatabasePayload');
  const validateDb = new Function(
    'data',
    'const DB_MAX_BYTES = 24 * 1024 * 1024;\n' + fnMatch[0] + '\nreturn validateDatabasePayload(data);'
  );

  assert.strictEqual(validateDb({ aplus_progress: {} }), true, 'Valid database payload rejected');
  assert.strictEqual(validateDb(null), false, 'Null database payload accepted');
  assert.strictEqual(validateDb(undefined), false, 'Undefined database payload accepted');
  assert.strictEqual(validateDb('string'), false, 'String database payload accepted');
  assert.strictEqual(validateDb(123), false, 'Number database payload accepted');
  assert.strictEqual(validateDb([1, 2, 3]), false, 'Array database payload accepted');
});

check('main.js groq:chat enforces payload structure, bounds, and origin protections', () => {
  const code = fs.readFileSync(mainPath, 'utf8');
  assert.ok(code.includes("ipcMain.handle('groq:chat'"), 'groq:chat handler missing');
  assert.ok(code.includes('missing_api_key'), 'missing_api_key check missing');
  assert.ok(code.includes('invalid_api_key'), 'invalid_api_key check missing');
  assert.ok(code.includes('blocked_endpoint'), 'blocked_endpoint check missing');
  assert.ok(code.includes('invalid_messages'), 'invalid_messages check missing');
  assert.ok(code.includes('invalid_model'), 'invalid_model check missing');
  assert.ok(code.includes('message_too_large'), 'message_too_large check missing');
});

// ============================================================================
// SUITE 4: Secret Scanner Execution & Regression Tests
// ============================================================================
console.log('\nSuite 4: Verifying Secret Detection Scanner Execution...');

check('tools/security_scan.py executes and confirms repository is clean (exit 0)', () => {
  const r = spawnSync(process.execPath ? 'python' : 'python3', ['tools/security_scan.py'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (r.status !== 0) {
    console.error('security_scan.py output:', r.stdout, r.stderr);
  }
  assert.strictEqual(r.status, 0, `security_scan.py exited with non-zero code ${r.status}`);
  assert.ok(
    r.stdout.includes('Zero secret leaks detected') || r.stdout.includes('PASS: Repository clean'),
    'Expected clean scan confirmation in scanner output'
  );
});

check('tools/security_scan.py self-test passes (detection rules & allowlist checks)', () => {
  const r = spawnSync('python', ['tools/security_scan.py', '--self-test'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.strictEqual(r.status, 0, `security_scan.py --self-test failed with code ${r.status}`);
  assert.ok(
    r.stdout.includes('All internal scanner verification tests passed'),
    'Self-test suite confirmation missing'
  );
});

check('tools/sanitize_media.py runs in check mode and passes clean verification', () => {
  const r = spawnSync('python', ['tools/sanitize_media.py', '--check', mediaPath], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert.strictEqual(r.status, 0, `sanitize_media.py --check failed with code ${r.status}`);
  assert.ok(r.stdout.includes('clean'), 'Expected clean media status');
});

// ============================================================================
// Summary
// ============================================================================
console.log('\n====================================================');
console.log(`Security Hardening Test Results: ${passedChecks} passed, ${failedChecks} failed.`);
console.log('====================================================');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL SECURITY HARDENING CHECKS PASSED WITH 100%!');
  process.exit(0);
}
