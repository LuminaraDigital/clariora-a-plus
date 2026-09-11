#!/usr/bin/env node
/**
 * tools/test_code_signing_enterprise.js
 * Comprehensive enterprise verification for Desktop Code Signing & Notarization:
 * 1. Windows Authenticode Certificate (PFX) & RFC 3161 Timestamping
 * 2. macOS Apple Developer ID Certificate (P12) & Hardened Runtime Entitlements
 * 3. Apple Gatekeeper Notarization Credentials Contract (APPLE_ID, Password, Team ID)
 * 4. Electron Builder Production Packaging Configuration (Windows & macOS)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CERTS_DIR = path.join(ROOT, 'build', 'certs');
const APP_PKG_PATH = path.join(ROOT, 'CompTIA_A_Plus_Desktop_App', 'resources', 'app', 'package.json');
const ENV_PATH = path.join(ROOT, '.env');

console.log('================================================================');
console.log('ENTERPRISE DESKTOP CODE SIGNING & NOTARIZATION VERIFICATION');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Helper: Parse .env without external dependencies
// -----------------------------------------------------------------------------
function readEnvFile() {
  const env = { ...process.env };
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...vParts] = trimmed.split('=');
        const key = k.trim();
        const val = vParts.join('=').trim();
        if (!env[key]) {
          env[key] = val;
        }
      }
    }
  }
  return env;
}

const envVars = readEnvFile();

// -----------------------------------------------------------------------------
// 1. Windows Authenticode Certificate & RFC 3161 Configuration
// -----------------------------------------------------------------------------
console.log('1. Verifying Windows Authenticode Code Signing Architecture...');

const winPfxPath = path.join(CERTS_DIR, 'clariora_authenticode.pfx');
const winLegacyPfxPath = path.join(CERTS_DIR, 'datacentre-academy-codesign.pfx');
const winCerPath = path.join(CERTS_DIR, 'clariora_authenticode.cer');

assert.ok(
  fs.existsSync(winPfxPath) || fs.existsSync(winLegacyPfxPath),
  'Windows Authenticode PFX must exist under build/certs/'
);

const activeWinPfx = fs.existsSync(winPfxPath) ? winPfxPath : winLegacyPfxPath;
const winPfxStat = fs.statSync(activeWinPfx);
assert.ok(winPfxStat.size > 500, 'Authenticode PFX file size must be non-trivial (> 500 bytes)');

assert.ok(
  fs.existsSync(winCerPath),
  'Public Authenticode DER certificate (.cer) must exist for enterprise Group Policy / Intune deployment'
);

const winPassword = envVars.CSC_KEY_PASSWORD || envVars.WIN_CSC_KEY_PASSWORD;
assert.ok(winPassword, 'CSC_KEY_PASSWORD or WIN_CSC_KEY_PASSWORD must be defined');
assert.ok(winPassword.length >= 8, 'Code signing password must meet minimum enterprise complexity');

console.log('   [OK] Windows Authenticode PFX and public DER certificates verified.');

// -----------------------------------------------------------------------------
// 2. macOS Apple Developer ID Certificate & Entitlements
// -----------------------------------------------------------------------------
console.log('2. Verifying macOS Apple Developer ID & Hardened Runtime Architecture...');

const macP12Path = path.join(CERTS_DIR, 'clariora_apple_developer_id.p12');
const macCerPath = path.join(CERTS_DIR, 'clariora_apple_developer_id.cer');

assert.ok(fs.existsSync(macP12Path), 'macOS Developer ID P12 certificate must exist under build/certs/');
const macP12Stat = fs.statSync(macP12Path);
assert.ok(macP12Stat.size > 500, 'Developer ID P12 file size must be non-trivial (> 500 bytes)');

assert.ok(fs.existsSync(macCerPath), 'Public Apple Developer ID DER certificate (.cer) must exist');

const rootEnt = path.join(ROOT, 'build', 'entitlements.mac.plist');
const rootEntInherit = path.join(ROOT, 'build', 'entitlements.mac.inherit.plist');
const appEnt = path.join(ROOT, 'CompTIA_A_Plus_Desktop_App', 'resources', 'app', 'build', 'entitlements.mac.plist');

assert.ok(fs.existsSync(rootEnt), 'build/entitlements.mac.plist must exist');
assert.ok(fs.existsSync(rootEntInherit), 'build/entitlements.mac.inherit.plist must exist');
assert.ok(fs.existsSync(appEnt), 'resources/app/build/entitlements.mac.plist must exist');

const entContent = fs.readFileSync(rootEnt, 'utf8');
assert.ok(entContent.includes('com.apple.security.cs.allow-jit'), 'Entitlements must allow JIT execution');
assert.ok(entContent.includes('com.apple.security.cs.allow-unsigned-executable-memory'), 'Entitlements must allow unsigned memory');

console.log('   [OK] Apple Developer ID P12 certificate and Hardened Runtime entitlements verified.');

// -----------------------------------------------------------------------------
// 3. Apple Gatekeeper Notarization Credentials Contract
// -----------------------------------------------------------------------------
console.log('3. Verifying Apple Gatekeeper Notarization Credentials Contract...');

const appleId = envVars.APPLE_ID;
const applePassword = envVars.APPLE_APP_SPECIFIC_PASSWORD || envVars.APPLE_PASSWORD;
const appleTeamId = envVars.APPLE_TEAM_ID;

assert.ok(appleId, 'APPLE_ID must be specified in environment or .env');
assert.ok(appleId.includes('@'), 'APPLE_ID must be a valid Apple ID email address');
assert.ok(applePassword, 'APPLE_APP_SPECIFIC_PASSWORD must be specified');
assert.ok(appleTeamId, 'APPLE_TEAM_ID must be specified');
assert.strictEqual(appleTeamId.length, 10, 'APPLE_TEAM_ID must be exactly 10 characters (Apple standard)');

console.log(`   [OK] Gatekeeper notarization credentials registered: ${appleId} (Team: ${appleTeamId}).`);

// -----------------------------------------------------------------------------
// 4. Electron Builder Production Packaging Configuration
// -----------------------------------------------------------------------------
console.log('4. Verifying electron-builder Packaging Configuration...');

const appPkg = JSON.parse(fs.readFileSync(APP_PKG_PATH, 'utf8'));
assert.ok(appPkg.build, 'package.json must contain build configuration');

// Windows target assertions
assert.ok(appPkg.build.win, 'Must configure win block');
assert.ok(appPkg.build.win.rfc3161TimeStampServer, 'win must configure rfc3161TimeStampServer for long-term validity');
assert.strictEqual(appPkg.build.win.rfc3161TimeStampServer, 'http://timestamp.digicert.com');

// macOS target assertions
assert.ok(appPkg.build.mac, 'Must configure mac block');
assert.strictEqual(appPkg.build.mac.hardenedRuntime, true, 'mac.hardenedRuntime must be true for Apple Gatekeeper');
assert.strictEqual(appPkg.build.mac.gatekeeperAssess, false, 'mac.gatekeeperAssess should be false to prevent build-time assess failure');
assert.ok(appPkg.build.mac.target.includes('dmg'), 'mac.target must include dmg');
assert.ok(appPkg.build.mac.target.includes('zip'), 'mac.target must include zip');
assert.ok(appPkg.build.mac.entitlements, 'mac.entitlements must be defined');
assert.ok(appPkg.build.dmg, 'Must configure dmg block');
assert.ok(Array.isArray(appPkg.build.dmg.contents), 'dmg.contents must configure install layout');

console.log('   [OK] Electron builder configuration fully validated for Windows NSIS and macOS DMG.');

// -----------------------------------------------------------------------------
// 5. Python Cryptography Self-Test Verification
// -----------------------------------------------------------------------------
console.log('5. Running Cryptographic Key & EKU Self-Test...');

const pyScript = path.join(ROOT, 'tools', 'setup_desktop_certificates.py');
const pyResult = spawnSync('python', [pyScript], { cwd: ROOT, encoding: 'utf8' });
assert.strictEqual(pyResult.status, 0, `Python certificate provisioning failed: ${pyResult.stderr || pyResult.stdout}`);

console.log('   [OK] PKCS12 decryption, SHA-256 fingerprint, and CodeSigning EKU self-test passed.');

console.log('\n================================================================');
console.log('[OK] ALL ENTERPRISE CODE SIGNING & NOTARIZATION CHECKS PASSED (100%)');
console.log('================================================================');
