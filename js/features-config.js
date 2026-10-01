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
    telegramBuddy: { enabled: false }
  };

})(typeof window !== 'undefined' ? window : this);
