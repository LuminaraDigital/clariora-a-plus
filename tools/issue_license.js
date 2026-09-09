#!/usr/bin/env node
/**
 * Clariora Exam Simulator v3.0.0
 * tools/issue_license.js - Issue one offline license key for a paying customer.
 * File: tools/issue_license.js
 *
 * Usage:
 *   node tools/issue_license.js --email buyer@example.com
 *   node tools/issue_license.js --email buyer@example.com --issued 2026-09-04
 *   node tools/issue_license.js --anon
 *   node tools/issue_license.js --email buyer@example.com --key build/certs/license_private.jwk
 *
 * The private key is read from build/certs/license_private.jwk, which is created by
 * tools/license_keygen.js and is inside a gitignored directory. It must never ship
 * with the app.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

const webcrypto = nodeCrypto.webcrypto || (globalThis && globalThis.crypto);

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PRIVATE_KEY = path.join(ROOT, 'build', 'certs', 'license_private.jwk');

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes) {
  let out = '';
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET.charAt((value << (5 - bits)) & 31);
  return out;
}

function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = B32_ALPHABET.indexOf(clean.charAt(i));
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** First 8 hex characters of the SHA-256 of the lowercased, trimmed email. */
function emailHash(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return 'anon';
  return nodeCrypto.createHash('sha256').update(clean, 'utf8').digest('hex').slice(0, 8);
}

function todayIso(date) {
  const d = date instanceof Date ? date : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildPayload(options) {
  const opts = options || {};
  return {
    v: 1,
    sku: 'aplus_pro',
    email_hash: opts.email ? emailHash(opts.email) : 'anon',
    issued: opts.issued || todayIso(),
    seats: typeof opts.seats === 'number' ? opts.seats : 1
  };
}

async function importPrivateKey(jwk) {
  if (!webcrypto || !webcrypto.subtle) {
    throw new Error('WebCrypto is unavailable in this Node runtime.');
  }
  const clean = {
    kty: jwk.kty || 'EC',
    crv: jwk.crv || 'P-256',
    x: jwk.x,
    y: jwk.y,
    d: jwk.d,
    ext: true
  };
  return webcrypto.subtle.importKey(
    'jwk',
    clean,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * issueLicense({ email, issued, seats, privateJwk })
 * Returns a Promise resolving to { key, payload }.
 */
async function issueLicense(options) {
  const opts = options || {};
  const privateJwk = opts.privateJwk || readPrivateJwk(opts.privateKeyPath);
  const payload = opts.payload || buildPayload(opts);
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');

  const key = await importPrivateKey(privateJwk);
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    payloadBytes
  );

  const licenseKey =
    'APLUS-' + base32Encode(new Uint8Array(payloadBytes)) + '-' + base32Encode(new Uint8Array(signature));

  return { key: licenseKey, payload };
}

function readPrivateJwk(keyPath) {
  const file = keyPath || DEFAULT_PRIVATE_KEY;
  if (!fs.existsSync(file)) {
    throw new Error(
      'Private key not found at ' + file + '\n' +
      'Run "node tools/license_keygen.js" once on the build machine first.'
    );
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || !parsed.d || !parsed.x || !parsed.y) {
    throw new Error('Private key file is not a valid EC P-256 JWK: ' + file);
  }
  return parsed;
}

function parseArgs(argv) {
  const out = { seats: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email' || a === '-e') out.email = argv[++i];
    else if (a === '--issued') out.issued = argv[++i];
    else if (a === '--seats') out.seats = parseInt(argv[++i], 10) || 1;
    else if (a === '--key') out.privateKeyPath = argv[++i];
    else if (a === '--anon') out.email = '';
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

const HELP = [
  'Issue one Clariora license key.',
  '',
  '  node tools/issue_license.js --email buyer@example.com',
  '  node tools/issue_license.js --anon',
  '',
  'Options:',
  '  --email <address>   Buyer email. Only an 8 hex character hash is stored in the key.',
  '  --anon              Issue an anonymous key (email_hash "anon").',
  '  --issued <date>     Issue date as YYYY-MM-DD. Defaults to today.',
  '  --seats <n>         Seat count recorded in the payload. Defaults to 1.',
  '  --key <path>        Private JWK path. Defaults to build/certs/license_private.jwk.',
  '  --json              Print the result as JSON.',
  ''
].join('\n');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (typeof args.email === 'undefined') {
    process.stderr.write('Missing --email (or pass --anon).\n\n' + HELP);
    process.exitCode = 1;
    return;
  }

  const result = await issueLicense(args);

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  process.stdout.write('\nLicense key issued\n');
  process.stdout.write('------------------\n');
  process.stdout.write('Buyer email hash : ' + result.payload.email_hash + '\n');
  process.stdout.write('Issued           : ' + result.payload.issued + '\n');
  process.stdout.write('Seats            : ' + result.payload.seats + '\n\n');
  process.stdout.write(result.key + '\n\n');
  process.stdout.write('Send this key to the buyer. They paste it into the app under\n');
  process.stdout.write('"I have a license key" and it unlocks the full version offline forever.\n\n');
}

module.exports = {
  issueLicense,
  buildPayload,
  emailHash,
  base32Encode,
  base32Decode,
  readPrivateJwk,
  todayIso,
  DEFAULT_PRIVATE_KEY
};

if (require.main === module) {
  main().catch(function (err) {
    process.stderr.write('Failed to issue license: ' + (err && err.message ? err.message : String(err)) + '\n');
    process.exitCode = 1;
  });
}
