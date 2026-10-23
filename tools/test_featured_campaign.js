#!/usr/bin/env node
/**
 * test_featured_campaign.js - Contract + unit checks for Featured Campaign + Reward Center.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

const fcSrc = fs.readFileSync(path.join(ROOT, 'js', 'featured-campaign.js'), 'utf8');
const rcSrc = fs.readFileSync(path.join(ROOT, 'js', 'reward-center.js'), 'utf8');
const ledgerSrc = fs.readFileSync(path.join(ROOT, 'ledger_engine.js'), 'utf8');
const featuresSrc = fs.readFileSync(path.join(ROOT, 'js', 'features-config.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssSrc = fs.readFileSync(path.join(ROOT, 'css', 'featured-campaign.css'), 'utf8');

const fc = require(path.join(ROOT, 'js', 'featured-campaign.js'));
const rc = require(path.join(ROOT, 'js', 'reward-center.js'));

assert.strictEqual(typeof fc.isEnabled, 'function');
assert.strictEqual(typeof fc.selectCampaign, 'function');
assert.strictEqual(typeof fc.getState, 'function');
assert.strictEqual(typeof fc.markLearn, 'function');
assert.strictEqual(typeof fc.markQuiz, 'function');
assert.strictEqual(typeof fc.isActive, 'function');
assert.strictEqual(typeof fc.shouldDemoteCompetitors, 'function');
assert.strictEqual(typeof rc.isEnabled, 'function');
assert.strictEqual(typeof rc.upsertPending, 'function');
assert.strictEqual(typeof rc.openApxSurface, 'function');

// Flags present
assert.ok(/featuredCampaign\s*:/.test(featuresSrc), 'features-config must declare featuredCampaign');
assert.ok(/rewardCenter\s*:/.test(featuresSrc), 'features-config must declare rewardCenter');
assert.ok(/todayMission\s*:/.test(featuresSrc), 'features-config must declare todayMission');
assert.ok(/achievementWallet\s*:/.test(featuresSrc), 'features-config must declare achievementWallet');

// Ledger contract
assert.ok(/FEATURED_OBJECTIVE_CLAIM/.test(ledgerSrc), 'ledger must define FEATURED_OBJECTIVE_CLAIM');
assert.ok(/claimFeaturedObjective/.test(ledgerSrc), 'ledger must export claimFeaturedObjective');
assert.ok(
  /budgetedTypes:[\s\S]*FEATURED_OBJECTIVE_CLAIM/.test(ledgerSrc),
  'FEATURED_OBJECTIVE_CLAIM must be budgeted'
);

// Static HTML / CSS wiring
assert.ok(/js\/featured-campaign\.js/.test(indexHtml), 'index must load featured-campaign.js');
assert.ok(/js\/reward-center\.js/.test(indexHtml), 'index must load reward-center.js');
assert.ok(/css\/featured-campaign\.css/.test(indexHtml), 'index must link featured-campaign.css');
assert.ok(/id="featuredCampaignCard"/.test(indexHtml), 'index must host featuredCampaignCard');
assert.ok(/id="rewardCenterModal"/.test(indexHtml), 'index must host rewardCenterModal');
assert.ok(/openApxSurface/.test(indexHtml), 'APX chip must route via openApxSurface');
assert.ok(/prefers-reduced-motion/.test(cssSrc), 'CSS must honour reduced motion');

// Ban FOMO / one-attempt copy and em dashes in new modules
const banRe = /limited time|only \d+ left|one attempt only|slots? fill|—|&mdash;|&#8212;/i;
assert.ok(!banRe.test(fcSrc), 'featured-campaign must not use FOMO/em-dash copy');
assert.ok(!banRe.test(rcSrc), 'reward-center must not use FOMO/em-dash copy');
assert.ok(!banRe.test(cssSrc), 'featured-campaign.css must not use em dashes');

// claimApxHint mastery tilt
assert.strictEqual(fc.claimApxHint(70), 13);
assert.strictEqual(fc.claimApxHint(100), 15);
assert.ok(fc.claimApxHint(0) <= 20);

// selectCampaign with fixture packs (no window readiness)
const campaign = fc.selectCampaign({
  exam: 'core1',
  day: '2099-01-01',
  weak: { code: '2.1', title: 'Networking tools', domain: '2.0 Networking', exam: 'core1' }
});
assert.ok(campaign.campaignId.indexOf('foc-core1-2.1-2099-01-01') === 0);
assert.strictEqual(campaign.objectiveCode, '2.1');
assert.ok(campaign.steps.learn && campaign.steps.quiz && campaign.steps.claim);

// Quiz retry keeps best percent + claimPending when threshold met
const mem = {};
global.window = {
  APLUS_FEATURES_CONFIG: {
    featuredCampaign: {
      enabled: true,
      showOnPracticeHome: true,
      demoteCompetingCtAs: true,
      awardClaimBonus: true
    },
    rewardCenter: { enabled: true, openFromApxChip: true }
  },
  localStorage: {
    getItem: function (k) {
      return mem[k] || null;
    },
    setItem: function (k, v) {
      mem[k] = String(v);
    },
    removeItem: function (k) {
      delete mem[k];
    }
  },
  CompTIALedger: {
    localDayKey: function () {
      return '2099-01-02';
    }
  },
  APlus: {
    storage: {
      get: function (k, fb) {
        if (!(k in mem)) return fb;
        try {
          return JSON.parse(mem[k]);
        } catch (_) {
          return fb;
        }
      },
      set: function (k, v) {
        mem[k] = JSON.stringify(v);
      }
    },
    rewardCenter: rc,
    featuredCampaign: null
  }
};
// Re-bind modules against mocked window by re-requiring is hard; call APIs that use storage via APlus.
// Manually drive markQuiz through a fresh state written into storage.
const seed = fc.selectCampaign({
  exam: 'core1',
  day: '2099-01-02',
  weak: { code: '3.2', title: 'Cables', domain: '3.0 Hardware', exam: 'core1' }
});
mem[fc.STATE_KEY] = JSON.stringify(seed);
global.window.APlus.featuredCampaign = fc;

assert.strictEqual(fc.isEnabled(), true);
assert.strictEqual(rc.isEnabled(), true);

let st = fc.markQuiz({ percent: 40 });
assert.strictEqual(st.steps.quiz.attempts, 1);
assert.strictEqual(st.steps.quiz.bestPercent, 40);
assert.strictEqual(st.claimPending, false);

st = fc.markQuiz({ percent: 85 });
assert.strictEqual(st.steps.quiz.attempts, 2);
assert.strictEqual(st.steps.quiz.bestPercent, 85);
assert.strictEqual(st.steps.quiz.done, true);
assert.strictEqual(st.claimPending, true);
assert.strictEqual(fc.shouldDemoteCompetitors(), true);

const inbox = rc.loadInbox();
assert.ok(inbox.items.some(function (it) {
  return it.status === 'pending' && String(it.meta.campaignId) === String(st.campaignId);
}));

// Static demote hooks
const tinySrc = fs.readFileSync(path.join(ROOT, 'js', 'tiny-win.js'), 'utf8');
const questSrc = fs.readFileSync(path.join(ROOT, 'js', 'daily-quest.js'), 'utf8');
const pathSrc = fs.readFileSync(path.join(ROOT, 'js', 'readiness-path.js'), 'utf8');
assert.ok(/shouldDemoteCompetitors/.test(tinySrc), 'tiny-win must demote when campaign active');
assert.ok(/shouldDemoteCompetitors/.test(questSrc), 'daily-quest must demote when campaign active');
assert.ok(/shouldDemoteCompetitors/.test(pathSrc), 'readiness-path must demote when campaign active');

// claimFeaturedObjective idempotency via source contract (async ledger needs browser crypto)
assert.ok(/already_claimed/.test(ledgerSrc), 'claim must be idempotent');

// Claim safety: must not clear pending when ledger missing
assert.ok(/ledger_missing/.test(rcSrc), 'claim must keep pending when ledger missing');
assert.ok(/okToClear/.test(rcSrc) || /Reward kept pending/.test(rcSrc), 'claim must not burn pending on failure');

// Double-count guard
assert.ok(/examType === 'assessment'/.test(fcSrc), 'must ignore assessment exam:finished for packs');

// Demote today-plan gold CTA
const readinessUi = fs.readFileSync(path.join(ROOT, 'js', 'readiness-ui.js'), 'utf8');
assert.ok(/Featured campaign is your focus today/.test(readinessUi), 'readiness-ui must quiet today plan when demoted');

console.log('PASS featured-campaign + reward-center contracts');
process.exit(0);
