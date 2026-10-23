#!/usr/bin/env node
/**
 * Static gates for TON Mastery SBT mint hardening (CEO production checklist).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'workers/api_worker.js'), 'utf8');
const creds = fs.readFileSync(path.join(root, 'js/ton_credentials.js'), 'utf8');
const features = fs.readFileSync(path.join(root, 'js/features-config.js'), 'utf8');
const wrangler = fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8');

assert.ok(worker.includes("/api/v1/credentials/ton/mint"), 'mint route present');
assert.ok(worker.includes('VERIFIED_ATTEMPT_REQUIRED'), 'prod mint requires verified attempt');
assert.ok(worker.includes('SBT_COLLECTION_NETWORK_MISMATCH'), 'prod rejects testnet-form collection');
assert.ok(worker.includes('SBT_COLLECTION_UNCONFIGURED'), 'unconfigured collection gate');
assert.ok(worker.includes("path === '/api/v1/exam/submit'"), 'exam submit route present');

assert.ok(creds.includes('submitExamAttempt'), 'client submits exam before mint');
assert.ok(creds.includes('attemptId'), 'client passes attemptId');
assert.ok(creds.includes('tonSbtConfigured'), 'auto-mint arms from health flag');

assert.ok(/autoMintAfterPass:\s*false/.test(features), 'features default autoMintAfterPass false');
assert.ok(/TON_NETWORK\s*=\s*"mainnet"/.test(wrangler), 'prod wrangler TON_NETWORK mainnet');
assert.ok(/TON_SBT_COLLECTION_ADDRESS\s*=\s*""/.test(wrangler), 'prod collection empty until unlock');
assert.ok(!/kQAOn0qiRkQo6V_pjn1BY6m-TqqmvP9RgcNQOSmB8mv4OUbJ/.test(wrangler), 'prod must not inherit staging collection');

console.log('TON SBT mint gates: ALL PASSED');
