/**
 * Clariora Exam Simulator v3.0.0
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
    // Anonymous item outcomes (and other consented events) land on the edge ingest.
    // Upload stays OFF until enabled is true AND APlus.telemetry.setConsent(true).
    endpoint: 'https://clariora.com.au/api/v1/items/telemetry',

    // Master switch. Even when true, nothing is sent until the user consents.
    enabled: true,

    // How often (ms) the buffer is flushed to the endpoint when online.
    flushIntervalMs: 60000,

    // Maximum number of events sent per upload request.
    batchSize: 50
  };

})(typeof window !== 'undefined' ? window : this);
