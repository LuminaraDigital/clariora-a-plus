/**
 * CompTIA A+ Master Exam Simulator v3.0.0
 * telemetry-config.js - Optional upload configuration for js/telemetry.js
 * File: js/telemetry-config.js
 *
 * Edit these values to point at your own collection endpoint. Upload stays
 * OFF unless enabled is true, endpoint is an https URL, and the user has
 * given consent via APlus.telemetry.setConsent(true).
 *
 * No personal data is ever included in uploaded events. See docs/ANALYTICS.md.
 */
(function (window) {
  'use strict';

  window.APLUS_TELEMETRY_CONFIG = window.APLUS_TELEMETRY_CONFIG || {
    // https URL of your collection endpoint (see docs/telemetry-worker.js for a
    // sample Cloudflare Worker). Leave blank to keep telemetry fully local.
    endpoint: '',

    // Master switch. Even when true, nothing is sent until the user consents.
    enabled: false,

    // How often (ms) the buffer is flushed to the endpoint when online.
    flushIntervalMs: 60000,

    // Maximum number of events sent per upload request.
    batchSize: 50
  };

})(typeof window !== 'undefined' ? window : this);
