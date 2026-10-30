#!/usr/bin/env node
/**
 * test_achievement_wallet.js - Contract checks for Achievement Wallet + Degree + FAQ.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const featuresSrc = fs.readFileSync(path.join(ROOT, 'js', 'features-config.js'), 'utf8');
const rcSrc = fs.readFileSync(path.join(ROOT, 'js', 'reward-center.js'), 'utf8');
const ledgerUiSrc = fs.readFileSync(path.join(ROOT, 'ledger_ui.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'css', 'featured-campaign.css'), 'utf8');

assert.ok(/achievementWallet\s*:/.test(featuresSrc), 'features-config must declare achievementWallet');
assert.ok(/showDegree\s*:\s*true/.test(featuresSrc), 'showDegree must be enabled');
assert.ok(/showEconomyFaq\s*:\s*true/.test(featuresSrc), 'showEconomyFaq must be enabled');
assert.ok(/Achievement Wallet/.test(rcSrc), 'reward-center must brand Achievement Wallet');
assert.ok(/economy_faq_opened/.test(rcSrc), 'FAQ telemetry required');
assert.ok(/wallet_opened/.test(rcSrc), 'wallet_opened telemetry required');
assert.ok(/degree_shown/.test(rcSrc), 'degree_shown telemetry required');
assert.ok(/cannot be bought, transferred, or cashed out/.test(rcSrc), 'FAQ must state non-cashable APX');
assert.ok(!/Lucky Draw|airdrop|crypto prizes/i.test(rcSrc) || /No lottery, Lucky Draw/.test(rcSrc), 'FAQ may only mention lottery to forbid it');
assert.ok(/apxDegreeBadge/.test(indexHtml), 'header must host Degree badge');
assert.ok(/apxReadinessNeighbor/.test(indexHtml), 'header must host readiness neighbor');
assert.ok(/apxDegreeBadge/.test(ledgerUiSrc), 'ledger_ui must paint Degree badge');
assert.ok(/apxReadinessNeighbor/.test(ledgerUiSrc), 'ledger_ui must paint readiness neighbor');
assert.ok(/rc-faq-list/.test(cssSrc), 'wallet FAQ styles required');

const banRe = /—|&mdash;|&#8212;/;
assert.ok(!banRe.test(rcSrc), 'reward-center must not use em dashes');
assert.ok(!/cash out|cashed out to|withdraw APX|sell APX/i.test(rcSrc.replace(/cannot be bought, transferred, or cashed out/g, '')), 'must not market cashout');

const rc = require(path.join(ROOT, 'js', 'reward-center.js'));
assert.strictEqual(typeof rc.walletEnabled, 'function');
assert.strictEqual(typeof rc.showDegree, 'function');
assert.strictEqual(typeof rc.surfaceTitle, 'function');

console.log('test_achievement_wallet: PASS');
