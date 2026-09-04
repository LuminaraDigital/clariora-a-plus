/**
 * media-config.js - where course media comes from.
 *
 * remoteBase is the public base URL that the "Videos For A+" folder is
 * uploaded to. It is filled at runtime from
 * electronAPI.app.getReleaseInfo().mediaBaseUrl when the desktop app
 * provides one. If that is not available the constant below is used. If
 * that is empty too, media is looked for next to the app (relative paths).
 *
 * Keep the trailing slash on remoteBase.
 */
(function (window) {
  'use strict';

  if (!window) return;

  var existing = window.APLUS_MEDIA_CONFIG;

  window.APLUS_MEDIA_CONFIG = {
    // Example: 'https://media.datacentreacademy.com/media/'
    remoteBase: (existing && typeof existing.remoteBase === 'string') ? existing.remoteBase : '',
    packName: 'CompTIA_A_Plus_Course_Videos_v1.zip',
    packSizeLabel: '2.4 GB',
    streamByDefault: true
  };
})(typeof window !== 'undefined' ? window : this);
