/**
 * entitlements-crypto.js - Base32 / UTF-8 helpers and offline license verifyKey.
 * Loaded before js/entitlements.js.
 */
(function (window) {
  'use strict';
  if (!window) return;
  window.APlus = window.APlus || {};

  function config() {
    var cfg = window.APLUS_ENTITLEMENTS_CONFIG || {};
    return cfg;
  }

  var B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Encode(bytes) {
    var out = '';
    var bits = 0;
    var value = 0;
    var i;
    for (i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        out += B32_ALPHABET.charAt((value >>> (bits - 5)) & 31);
        bits -= 5;
      }
    }
    if (bits > 0) {
      out += B32_ALPHABET.charAt((value << (5 - bits)) & 31);
    }
    return out;
  }

  function base32Decode(str) {
    var clean = String(str || '').toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
    var bits = 0;
    var value = 0;
    var out = [];
    var i;
    for (i = 0; i < clean.length; i++) {
      var idx = B32_ALPHABET.indexOf(clean.charAt(i));
      if (idx < 0) return null;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  function utf8Encode(str) {
    var s = String(str);
    if (typeof window.TextEncoder === 'function') {
      try { return new window.TextEncoder().encode(s); } catch (_) {}
    }
    var bytes = [];
    var i;
    for (i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else if (c < 2048) {
        bytes.push(192 | (c >> 6), 128 | (c & 63));
      } else {
        bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
    }
    return new Uint8Array(bytes);
  }

  function utf8Decode(bytes) {
    if (typeof window.TextDecoder === 'function') {
      try { return new window.TextDecoder('utf-8').decode(bytes); } catch (_) {}
    }
    var out = '';
    var i = 0;
    while (i < bytes.length) {
      var c = bytes[i++];
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if (c > 191 && c < 224) {
        out += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
      } else {
        out += String.fromCharCode(((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63));
      }
    }
    return out;
  }

  /* ----------------------------------------------------------------------- */
  /* License verification                                                     */
  /* ----------------------------------------------------------------------- */

  var KEY_PREFIX = 'APLUS-';

  function subtle() {
    try {
      var c = window.crypto || window.msCrypto;
      if (c && c.subtle && typeof c.subtle.importKey === 'function') return c.subtle;
    } catch (_) {}
    return null;
  }

  function normaliseKey(key) {
    return String(key || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function splitKey(key) {
    var k = normaliseKey(key);
    if (k.indexOf(KEY_PREFIX) !== 0) return null;
    var rest = k.slice(KEY_PREFIX.length);
    var dash = rest.lastIndexOf('-');
    if (dash <= 0 || dash >= rest.length - 1) return null;
    return { payloadB32: rest.slice(0, dash), signatureB32: rest.slice(dash + 1) };
  }

  function isRevoked(key, payload) {
    var cfg = config();
    var list = Array.isArray(cfg.revoked) ? cfg.revoked : [];
    var k = normaliseKey(key);
    var hash = payload && payload.email_hash ? String(payload.email_hash).toLowerCase() : '';
    var i;
    for (i = 0; i < list.length; i++) {
      var entry = String(list[i] || '').trim();
      if (!entry) continue;
      if (normaliseKey(entry) === k) return true;
      if (hash && entry.toLowerCase() === hash) return true;
    }
    return false;
  }

  function isExpired(payload) {
    if (!payload || !payload.expires) return false;
    try {
      var expStr = String(payload.expires).trim();
      var expTime = 0;
      if (/^\d{4}-\d{2}-\d{2}$/.test(expStr)) {
        var parts = expStr.split('-');
        var expDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        expTime = expDate.getTime();
      } else {
        expTime = new Date(expStr).getTime();
      }
      return !isNaN(expTime) && expTime < Date.now();
    } catch (_) {
      return false;
    }
  }

  function daysRemaining(payload) {
    if (!payload || !payload.expires) return Infinity;
    try {
      var expStr = String(payload.expires).trim();
      var parts = expStr.split('-');
      var expDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
      var diffMs = expDate.getTime() - Date.now();
      if (diffMs <= 0) return 0;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch (_) {
      return Infinity;
    }
  }

  /**
   * Verifies a license key offline.
   * Resolves { ok, payload, error, unverifiable }.
   * unverifiable is true only when WebCrypto is not available; in that case ok is
   * false and nothing is ever unlocked.
   */
  function verifyKey(key) {
    var parts = splitKey(key);
    if (!parts) {
      return Promise.resolve({ ok: false, error: 'That does not look like a license key. It should start with APLUS-.' });
    }

    var payloadBytes = base32Decode(parts.payloadB32);
    var sigBytes = base32Decode(parts.signatureB32);
    if (!payloadBytes || !payloadBytes.length || !sigBytes || !sigBytes.length) {
      return Promise.resolve({ ok: false, error: 'This license key is not readable. Please copy it again in full.' });
    }

    var payload;
    try {
      payload = JSON.parse(utf8Decode(payloadBytes));
    } catch (_) {
      return Promise.resolve({ ok: false, error: 'This license key is not readable. Please copy it again in full.' });
    }
    if (!payload || typeof payload !== 'object' || payload.v !== 1 || payload.sku !== 'aplus_pro') {
      return Promise.resolve({ ok: false, error: 'This license key is not for this product.' });
    }
    if (isRevoked(key, payload)) {
      return Promise.resolve({ ok: false, payload: payload, error: 'This license key has been refunded and is no longer active.' });
    }
    if (isExpired(payload)) {
      var expMsg = 'This license key expired on ' + payload.expires + '. Please renew your study pass.';
      return Promise.resolve({ ok: false, payload: payload, error: expMsg });
    }

    var s = subtle();
    var cfg = config();
    var jwk = cfg.publicKeyJwk;
    var placeholder = !jwk || !jwk.x || !jwk.y ||
      String(jwk.x).indexOf('REPLACE_WITH') === 0 || String(jwk.y).indexOf('REPLACE_WITH') === 0;

    if (placeholder) {
      return Promise.resolve({
        ok: false,
        unverifiable: true,
        payload: payload,
        error: 'This build has no license public key yet, so keys cannot be checked. Please contact support.'
      });
    }
    if (!s) {
      return Promise.resolve({
        ok: false,
        unverifiable: true,
        payload: payload,
        error: 'This browser cannot check license signatures here. Open the app from the desktop shortcut or a local server and try again.'
      });
    }

    var publicJwk = {
      kty: jwk.kty || 'EC',
      crv: jwk.crv || 'P-256',
      x: jwk.x,
      y: jwk.y,
      ext: true
    };

    return Promise.resolve()
      .then(function () {
        return s.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      })
      .then(function (cryptoKey) {
        return s.verify(
          { name: 'ECDSA', hash: { name: 'SHA-256' } },
          cryptoKey,
          bufferOf(sigBytes),
          bufferOf(payloadBytes)
        );
      })
      .then(function (valid) {
        if (!valid) {
          return { ok: false, payload: payload, error: 'This license key did not pass verification. Please check it for typos.' };
        }
        return { ok: true, payload: payload };
      })
      .catch(function (err) {
        try { console.warn(LOG, 'verification error', err); } catch (_) {}
        return { ok: false, payload: payload, error: 'This license key did not pass verification. Please check it for typos.' };
      });
  }

  function bufferOf(u8) {
    // Return a fresh ArrayBuffer slice so WebCrypto never sees a shared view.
    var copy = new Uint8Array(u8.length);
    copy.set(u8);
    return copy.buffer;
  }

  /* ----------------------------------------------------------------------- */
  /* License state                                                            */
  /* ----------------------------------------------------------------------- */


  window.APlus._entitlementsCrypto = {
    base32Encode: base32Encode,
    base32Decode: base32Decode,
    utf8Encode: utf8Encode,
    utf8Decode: utf8Decode,
    normaliseKey: normaliseKey,
    splitKey: splitKey,
    isRevoked: isRevoked,
    isExpired: isExpired,
    daysRemaining: daysRemaining,
    verifyKey: verifyKey,
    bufferOf: bufferOf,
    KEY_PREFIX: KEY_PREFIX
  };
})(typeof window !== 'undefined' ? window : this);
