/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * entitlements-config.js - Monetization configuration (safe to edit by hand)
 * File: js/entitlements-config.js
 *
 * This file contains NO secrets. The private signing key never ships with the app;
 * it lives only in build/certs/license_private.jwk on the build machine.
 *
 * Run "node tools/license_keygen.js" once to generate the key pair. It writes the
 * private JWK to build/certs/license_private.jwk and pastes the public x / y values
 * into this file automatically while the placeholders below are still present.
 */

(function (window) {
  'use strict';
  if (!window) return;

  window.APLUS_ENTITLEMENTS_CONFIG = {
    /**
     * Master switch. Set to false for internal academy builds: everything is
     * unlocked, no chip is rendered, no upgrade card is ever shown.
     */
    enabled: false,

    /** Free tier daily allowances (local midnight boundary). */
    freeQuestionsPerDay: 20,
    freeCardsPerDay: 20,
    freeLabsPerDay: 1,

    /** The free diagnostic: one full run per day, does not spend the question budget. */
    diagnostic: {
      type: 'both',
      count: 20
    },

    /** A session of this many questions or more is a full mock and is paid only. */
    fullMockThreshold: 90,

    /**
     * If a free session is requested that is larger than the remaining budget,
     * it is silently trimmed to the remaining count as long as at least this
     * many questions are left. Below that the upgrade card is shown instead.
     */
    minTrimmedSession: 5,

    /** Commercial copy. */
    priceLabel: '39 USD',
    buyUrl: 'https://datacentre.academy/aplus',
    supportEmail: 'support@datacentre.academy',

    /**
     * Offline revocation list, checked on every boot and on every activate().
     * Add either the full license key string or the payload email_hash of a
     * refunded customer. Ship the updated file with the next build.
     */
    revoked: [],

    /**
     * ECDSA P-256 public key (JWK) used to verify license signatures.
     * Replaced automatically by tools/license_keygen.js.
     */
    publicKeyJwk: {
      kty: 'EC',
      crv: 'P-256',
      x: 'REPLACE_WITH_PUBLIC_KEY_X',
      y: 'REPLACE_WITH_PUBLIC_KEY_Y'
    }
  };

})(typeof window !== 'undefined' ? window : this);
