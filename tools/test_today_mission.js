#!/usr/bin/env node
/**
 * test_today_mission.js - Contract checks for Today Mission unification flags + demote helpers.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const featuresSrc = fs.readFileSync(path.join(ROOT, 'js', 'features-config.js'), 'utf8');
const fcSrc = fs.readFileSync(path.join(ROOT, 'js', 'featured-campaign.js'), 'utf8');
const pathSrc = fs.readFileSync(path.join(ROOT, 'js', 'readiness-path.js'), 'utf8');
const twSrc = fs.readFileSync(path.join(ROOT, 'js', 'tiny-win.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

assert.ok(/todayMission\s*:/.test(featuresSrc), 'features-config must declare todayMission');
assert.ok(/keepReadinessPath\s*:\s*true/.test(featuresSrc), 'todayMission should keep readiness path');
assert.ok(/shouldDemotePathStrip/.test(fcSrc), 'featured-campaign must export path demote helper');
assert.ok(/shouldDemoteTinyWin/.test(fcSrc), 'featured-campaign must export tiny-win demote helper');
assert.ok(/todayMissionEnabled/.test(fcSrc), 'featured-campaign must expose todayMissionEnabled');
assert.ok(/Today's Mission/.test(fcSrc) || /Today\\'s Mission/.test(fcSrc), 'UI kicker for Today Mission');
assert.ok(/today_mission_shown/.test(fcSrc), 'telemetry today_mission_shown required');
assert.ok(/shouldDemotePathStrip/.test(pathSrc), 'readiness-path must honour shouldDemotePathStrip');
assert.ok(/shouldDemoteTinyWin/.test(twSrc), 'tiny-win must honour shouldDemoteTinyWin');
assert.ok(/id="featuredCampaignCard"/.test(indexHtml), 'mission host remains featuredCampaignCard');

const banRe = /limited time|only \d+ left|one attempt only|slots? fill|—|&mdash;|&#8212;/i;
assert.ok(!banRe.test(fcSrc), 'featured-campaign must not use FOMO/em-dash copy');

const fc = require(path.join(ROOT, 'js', 'featured-campaign.js'));
assert.strictEqual(typeof fc.todayMissionEnabled, 'function');
assert.strictEqual(typeof fc.shouldDemotePathStrip, 'function');
assert.strictEqual(typeof fc.shouldDemoteTinyWin, 'function');

console.log('test_today_mission: PASS');
