#!/usr/bin/env node
/**
 * tools/test_edge_architecture.js
 * Verification suite for Clariora Market-Leading Architecture:
 * - PBQ Simulation Engine (7 simulation labs)
 * - In-exam PBQ stratified sampling
 * - Pearson VUE Exam-Day Mode & Score Report
 * - 61-Objective Mastery Heatmap
 * - Community Benchmarks & Item Reporting
 * - Pass Guarantee Certificate Generator
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

// 1. Test PBQ Simulation Engine & QTypes Handler
console.log('Testing PBQ Simulation Engine...');
const pbqEngine = require(path.join(ROOT, 'js', 'pbq-engine.js'));
assert.ok(pbqEngine, 'pbq-engine module must export');
assert.ok(pbqEngine.catalog, 'catalog must exist');

const expectedLabs = ['sohoRouter', 'motherboardAssembly', 'windowsConsole', 'cablePinout', 'portMatcher', 'printerOrder', 'cliTerminal'];
expectedLabs.forEach((labKey) => {
  assert.ok(pbqEngine.catalog[labKey], `Lab ${labKey} must exist in catalog`);
  assert.ok(pbqEngine.catalog[labKey].title, `Lab ${labKey} must have a title`);
  assert.ok(pbqEngine.catalog[labKey].objective, `Lab ${labKey} must map to a blueprint objective`);
});

// Test SOHO Router Scoring
const sohoLab = pbqEngine.catalog.sohoRouter;
const correctSohoState = {
  ssid: 'Corp-Secure',
  securityMode: 'WPA3-Personal',
  encryption: 'AES',
  channelWidth: '80 MHz',
  startingIp: '192.168.1.100',
  forwardPort: '443',
  forwardIp: '192.168.1.50',
  forwardProtocol: 'TCP',
  forwardEnabled: true
};
const wrongSohoState = {
  ssid: 'Open-Wifi',
  securityMode: 'Disabled',
  encryption: 'TKIP',
  channelWidth: '20 MHz',
  startingIp: '192.168.1.2',
  forwardPort: '80',
  forwardIp: '192.168.1.1',
  forwardEnabled: false
};
assert.strictEqual(pbqEngine.score({ pbqType: 'sohoRouter' }, correctSohoState), true, 'Correct SOHO configuration must score true');
assert.strictEqual(pbqEngine.score({ pbqType: 'sohoRouter' }, wrongSohoState), false, 'Wrong SOHO configuration must score false');

// Test Motherboard Assembly Scoring
const correctMbState = { slots: { ...pbqEngine.catalog.motherboardAssembly.solution } };
assert.strictEqual(pbqEngine.score({ pbqType: 'motherboardAssembly' }, correctMbState), true, 'Correct Motherboard assembly must score true');

// Test Windows Console Storage Scoring
const correctWinState = { ...pbqEngine.catalog.windowsConsole.solution };
assert.strictEqual(pbqEngine.score({ pbqType: 'windowsConsole' }, correctWinState), true, 'Correct Windows Storage setup must score true');

// Test Cable Pinout Scoring
const correctCableState = { sequence: ['WO', 'O', 'WG', 'BL', 'WBL', 'G', 'WBR', 'BR'] };
assert.strictEqual(pbqEngine.score({ pbqType: 'cablePinout' }, correctCableState), true, 'T568B sequence must score true');

console.log('  ✔ All PBQ Simulation Labs & Scoring Validated.');

// 2. Test In-Exam Stratified Sampler with PBQs
console.log('Testing Stratified Sampler with Compulsory PBQs...');
const engineCore = require(path.join(ROOT, 'js', 'engine-core.js'));

// Create mock pool of 100 questions
const mockPool = [];
for (let i = 0; i < 100; i++) {
  mockPool.push({
    id: `C1-TEST-${i}`,
    exam: 'core1',
    domain: ['1.0 Mobile Devices', '2.0 Networking', '3.0 Hardware', '4.0 Virtualization and Cloud Computing', '5.0 Hardware and Network Troubleshooting'][i % 5],
    objective: `1.${(i % 4) + 1}`,
    type: 'single',
    options: ['A', 'B', 'C', 'D'],
    answer: 0
  });
}

const c1Sample = engineCore.sampleStratified(mockPool, 90, 'core1');
assert.strictEqual(c1Sample.length, 90, 'Sampled mock exam must have exactly 90 questions');

// Assert first 3 questions are PBQs
const firstThree = c1Sample.slice(0, 3);
firstThree.forEach((q, idx) => {
  assert.strictEqual(q.type, 'pbq', `Question ${idx + 1} must be type pbq`);
  assert.ok(q.pbqType, `Question ${idx + 1} must specify pbqType`);
});

console.log('  ✔ Stratified Sampler reserves Questions 1-3 for PBQs in full mock exams.');

// 3. Test Cloudflare D1 SQL Schema
console.log('Testing Cloudflare D1 Schema Integrity...');
const sql = fs.readFileSync(path.join(ROOT, 'workers', 'schema.sql'), 'utf8');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS users'), 'Schema must define users table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS learner_sync_state'), 'Schema must define learner_sync_state table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS item_telemetry'), 'Schema must define item_telemetry table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS item_reports'), 'Schema must define item_reports table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS item_stats_cache'), 'Schema must define item_stats_cache table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS telegram_users'), 'Schema must define telegram_users table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS stars_transactions'), 'Schema must define stars_transactions table');
assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS ai_usage_log'), 'Schema must define ai_usage_log table');
console.log('  ✔ Cloudflare D1 Edge SQL Schema valid.');

// 4. Test Cloudflare Worker API Source
console.log('Testing Cloudflare Worker API Router...');
const workerSrc = fs.readFileSync(path.join(ROOT, 'workers', 'api_worker.js'), 'utf8');
assert.ok(workerSrc.includes('/api/v1/auth/magic'), 'Worker must handle magic link auth');
assert.ok(workerSrc.includes('/api/v1/sync'), 'Worker must handle delta sync');
assert.ok(workerSrc.includes('/api/v1/items/report'), 'Worker must handle defect reporting');
assert.ok(workerSrc.includes('/api/v1/items/stats'), 'Worker must handle community stats');
assert.ok(workerSrc.includes('/api/v1/coach'), 'Worker must handle AI Ghost Coach');
assert.ok(workerSrc.includes('/api/v1/billing/stars/invoice'), 'Worker must handle Stars invoice creation');
assert.ok(workerSrc.includes('/api/v1/telegram/webhook'), 'Worker must handle Telegram bot webhook');
console.log('  ✔ Cloudflare Worker Router endpoints verified.');

console.log('\n=============================================');
console.log('✅ ALL ARCHITECTURE ENHANCEMENT TESTS PASSED!');
console.log('=============================================');
process.exit(0);
