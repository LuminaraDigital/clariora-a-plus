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
      // Master kill switch for Daily Quest shell + soft-streak chrome.
      enabled: true,
      showHomeQuest: true,
      awardQuestBonus: true
    }
  };

})(typeof window !== 'undefined' ? window : this);
