#!/usr/bin/env node
/**
 * Clariora Exam Simulator v3.0.0
 * tools/license_keygen.js - Generate the ECDSA P-256 license signing key pair. Run ONCE.
 * File: tools/license_keygen.js
 *
 * Usage:
 *   node tools/license_keygen.js
 *   node tools/license_keygen.js --force        (overwrite an existing private key)
 *   node tools/license_keygen.js --no-write     (do not touch js/entitlements-config.js)
 *
 * Writes:
 *   build/certs/license_private.jwk   private key, gitignored, NEVER ships with the app
 *
 * Prints the public JWK and, while js/entitlements-config.js still holds the
 * REPLACE_WITH_PUBLIC_KEY placeholders, writes the public x and y values into it.
 *
 * Back up build/certs/license_private.jwk somewhere safe and offline. If it is lost,
 * every key you have already issued keeps working, but you cannot issue new ones
 * without shipping a new public key, which would invalidate every existing key.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(ROOT, 'build', 'certs');
const PRIVATE_PATH = path.join(CERT_DIR, 'license_private.jwk');
const PUBLIC_PATH = path.join(CERT_DIR, 'license_public.jwk');
const CONFIG_PATH = path.join(ROOT, 'js', 'entitlements-config.js');

function parseArgs(argv) {
  return {
    force: argv.indexOf('--force') !== -1,
    noWrite: argv.indexOf('--no-write') !== -1
  };
}

function generatePair() {
  const pair = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const privateJwk = pair.privateKey.export({ format: 'jwk' });
  const publicJwk = pair.publicKey.export({ format: 'jwk' });
  return {
    privateJwk: {
      kty: privateJwk.kty,
      crv: privateJwk.crv,
      x: privateJwk.x,
      y: privateJwk.y,
      d: privateJwk.d
    },
    publicJwk: {
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
      y: publicJwk.y
    }
  };
}

function writeConfigPublicKey(publicJwk) {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { written: false, reason: 'js/entitlements-config.js not found' };
  }
  const source = fs.readFileSync(CONFIG_PATH, 'utf8');
  if (source.indexOf('REPLACE_WITH_PUBLIC_KEY_X') === -1 &&
      source.indexOf('REPLACE_WITH_PUBLIC_KEY_Y') === -1) {
    return { written: false, reason: 'config already holds a public key, paste manually if you meant to rotate it' };
  }
  const updated = source
    .replace('REPLACE_WITH_PUBLIC_KEY_X', publicJwk.x)
    .replace('REPLACE_WITH_PUBLIC_KEY_Y', publicJwk.y);
  fs.writeFileSync(CONFIG_PATH, updated, 'utf8');
  return { written: true };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (fs.existsSync(PRIVATE_PATH) && !args.force) {
    process.stderr.write(
      'A private key already exists at:\n  ' + PRIVATE_PATH + '\n\n' +
      'Generating a new one would invalidate every license key you have already sold.\n' +
      'Pass --force only if you are deliberately rotating keys.\n'
    );
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(CERT_DIR, { recursive: true });

  const pair = generatePair();

  fs.writeFileSync(PRIVATE_PATH, JSON.stringify(pair.privateJwk, null, 2) + '\n', 'utf8');
  fs.writeFileSync(PUBLIC_PATH, JSON.stringify(pair.publicJwk, null, 2) + '\n', 'utf8');
  try {
    fs.chmodSync(PRIVATE_PATH, 0o600);
  } catch (_) {
    // Windows filesystems may not support this. The directory is gitignored either way.
  }

  process.stdout.write('\nLicense key pair generated\n');
  process.stdout.write('--------------------------\n');
  process.stdout.write('Private key (keep secret, gitignored): ' + PRIVATE_PATH + '\n');
  process.stdout.write('Public key copy                      : ' + PUBLIC_PATH + '\n\n');
  process.stdout.write('Public JWK to embed in js/entitlements-config.js:\n\n');
  process.stdout.write(JSON.stringify(pair.publicJwk, null, 2) + '\n\n');

  if (args.noWrite) {
    process.stdout.write('--no-write was passed. Paste the x and y values above into publicKeyJwk yourself.\n\n');
    return;
  }

  const res = writeConfigPublicKey(pair.publicJwk);
  if (res.written) {
    process.stdout.write('Public key written into js/entitlements-config.js.\n\n');
  } else {
    process.stdout.write('Not written automatically (' + res.reason + ').\n');
    process.stdout.write('Paste the x and y values above into publicKeyJwk in js/entitlements-config.js.\n\n');
  }

  process.stdout.write('Next: back up the private key offline, then issue a test key with\n');
  process.stdout.write('  node tools/issue_license.js --anon\n\n');
}

module.exports = { generatePair, writeConfigPublicKey, PRIVATE_PATH, PUBLIC_PATH, CONFIG_PATH };

if (require.main === module) {
  main();
}
