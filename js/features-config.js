/**
 * features-config.js - Client kill switches for product surfaces.
 *
 * Same pattern as telemetry-config / sync-config / entitlements-config.
 * There is no remote flag API; flip enabled and redeploy for rollout/rollback.
 */
(function (window) {
  'use strict';

  window.APLUS_FEATURES_CONFIG = window.APLUS_FEATURES_CONFIG || {
    gamification: {
      enabled: true,
      showHomeQuest: true,
      awardQuestBonus: true
    },
    // Featured Learn → Quiz → Claim campaign on Practice home (Binance L&E shape, APX only).
    featuredCampaign: {
      enabled: true,
      showOnPracticeHome: true,
      demoteCompetingCtAs: true,
      awardClaimBonus: true
    },
    // Unify Home into one Today Mission (Featured Campaign spine; fold quest + tiny-win CTAs).
    todayMission: {
      enabled: true,
      showOnPracticeHome: true,
      foldDailyQuest: true,
      foldTinyWin: true,
      demoteCompetingCtAs: true,
      keepReadinessPath: true,
      awardClaimBonus: true
    },
    // Reward Center inbox from APX chip; rollback by setting enabled false and redeploying.
    rewardCenter: {
      enabled: true,
      openFromApxChip: true
    },
    // Achievement Wallet: claims + Degree ranks + economy FAQ (extends reward-center).
    achievementWallet: {
      enabled: true,
      openFromApxChip: true,
      showDegree: true,
      showEconomyFaq: true,
      showReadinessBesideApx: true
    },
    closeLoopUx: { enabled: true },
    frictionCoach: { enabled: true },
    jitSurvey: { enabled: true },
    habit66: { enabled: true },
    featurePrune: {
      enabled: true,
      hideEnabled: false
    },
    // Off until a real cohort API returns n >= 25 (never invent numbers).
    socialProof: {
      enabled: false,
      endpoint: null
    },
    proofOfReadiness: { enabled: true },
    // Off until Worker digest cron exists.
    telegramBuddy: { enabled: false },
    // TON Mastery SBT (TEP-85). Auto-mint only arms after /api/v1/health reports tonSbtConfigured.
    tonSbt: {
      enabled: true,
      autoMintAfterPass: false,
      registryAddress: null,
      mintEndpoint: '/api/v1/credentials/ton/mint',
      attestEndpoint: '/api/v1/oracle/attest',
      examSubmitEndpoint: '/api/v1/exam/submit'
    }
  };

})(typeof window !== 'undefined' ? window : this);
