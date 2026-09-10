/**
 * Clariora Exam Simulator v3.0.0
 * entitlements.js - Free tier limits, offline license verification, quiet upgrade card
 * File: js/entitlements.js
 *
 * Loads after js/entitlements-config.js and js/shell-ux.js. Plain IIFE, no modules,
 * file:// safe. Never throws at load. Attaches window.APlus.entitlements.
 *
 * Free:  the 20 question diagnostic once a day, 20 practice questions a day across
 *        all modes, and reviewing explanations of questions already taken.
 * Paid:  unlimited questions, 90 question mocks, study coach, unlimited flashcards
 *        and labs. One offline license key, valid forever on this PC.
 */

(function (window) {
  'use strict';

  if (!window) return;

  window.APlus = window.APlus || {};
  var APlus = window.APlus;

  var LOG = '[APlus.entitlements]';

  /* ----------------------------------------------------------------------- */
  /* Configuration                                                            */
  /* ----------------------------------------------------------------------- */

  var DEFAULTS = {
    enabled: true,
    freeQuestionsPerDay: 20,
    freeCardsPerDay: 20,
    freeLabsPerDay: 1,
    freeCoachPerDay: 5,
    diagnostic: { type: 'both', count: 20 },
    fullMockThreshold: 90,
    minTrimmedSession: 5,
    priceLabel: '39 USD or Telegram Stars',
    buyUrl: 'https://clariora.com.au/landing/pricing.html',
    supportEmail: 'support@clariora.com.au',
    revoked: [],
    publicKeyJwk: null
  };

  function config() {
    var out = {};
    var k;
    for (k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k];
    }
    try {
      var user = window.APLUS_ENTITLEMENTS_CONFIG;
      if (user && typeof user === 'object') {
        for (k in user) {
          if (Object.prototype.hasOwnProperty.call(user, k) && typeof user[k] !== 'undefined') {
            out[k] = user[k];
          }
        }
      }
    } catch (_) {}
    return out;
  }

  function gatingEnabled() {
    try { return config().enabled !== false; } catch (_) { return true; }
  }

  /* ----------------------------------------------------------------------- */
  /* Storage helpers                                                          */
  /* ----------------------------------------------------------------------- */

  var PREFIX = 'aplus3_';

  var store = {
    get: function (key, fallback) {
      try {
        if (APlus.storage && typeof APlus.storage.get === 'function') {
          return APlus.storage.get(key, fallback);
        }
      } catch (_) {}
      try {
        var raw = window.localStorage.getItem(PREFIX + key);
        if (raw === null || typeof raw === 'undefined') return fallback;
        return JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        if (APlus.storage && typeof APlus.storage.set === 'function') {
          return APlus.storage.set(key, value);
        }
      } catch (_) {}
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    },
    remove: function (key) {
      try {
        if (APlus.storage && typeof APlus.storage.remove === 'function') {
          return APlus.storage.remove(key);
        }
      } catch (_) {}
      try {
        window.localStorage.removeItem(PREFIX + key);
        return true;
      } catch (_) {
        return false;
      }
    }
  };

  /* ----------------------------------------------------------------------- */
  /* Day boundary (local midnight)                                            */
  /* ----------------------------------------------------------------------- */

  function todayKey(date) {
    var d = date instanceof Date ? date : new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }

  function usageStorageKey(dayKey) {
    return 'usage_' + (dayKey || todayKey());
  }

  function getUsage(dayKey) {
    var raw = store.get(usageStorageKey(dayKey), null);
    var out = { questions: 0, cards: 0, diagnostics: 0, labs: 0, coach: 0 };
    if (raw && typeof raw === 'object') {
      out.questions = numberOr(raw.questions, 0);
      out.cards = numberOr(raw.cards, 0);
      out.diagnostics = numberOr(raw.diagnostics, 0);
      out.labs = numberOr(raw.labs, 0);
      out.coach = numberOr(raw.coach, 0);
    }
    return out;
  }

  function setUsage(usage, dayKey) {
    store.set(usageStorageKey(dayKey), {
      questions: numberOr(usage.questions, 0),
      cards: numberOr(usage.cards, 0),
      diagnostics: numberOr(usage.diagnostics, 0),
      labs: numberOr(usage.labs, 0),
      coach: numberOr(usage.coach, 0)
    });
  }

  function numberOr(v, fallback) {
    var n = Number(v);
    return (isFinite(n) && n >= 0) ? Math.floor(n) : fallback;
  }

  /* ----------------------------------------------------------------------- */
  /* Base32 (RFC 4648, no padding)                                            */
  /* ----------------------------------------------------------------------- */

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

  var state = {
    pro: false,
    payload: null,
    checked: false
  };

  function loadLicense() {
    var rec = store.get('license', null);
    if (rec && typeof rec === 'object' && rec.key && rec.verifiedAt) {
      if (isRevoked(rec.key, rec.payload) || isExpired(rec.payload)) {
        store.remove('license');
        state.pro = false;
        state.payload = null;
        return null;
      }
      state.pro = true;
      state.payload = rec.payload || null;
      return rec;
    }
    state.pro = false;
    state.payload = null;
    return null;
  }

  function reverifyStoredLicense() {
    var rec = store.get('license', null);
    if (!rec || !rec.key) {
      state.checked = true;
      return Promise.resolve(false);
    }
    return verifyKey(rec.key).then(function (res) {
      state.checked = true;
      if (res.ok) {
        if (isExpired(res.payload)) {
          store.remove('license');
          state.pro = false;
          state.payload = null;
          renderChip();
          return false;
        }
        state.pro = true;
        state.payload = res.payload;
        return true;
      }
      if (res.unverifiable) {
        // WebCrypto missing on this run. Keep the previously verified unlock,
        // it was written only after a real signature check.
        return state.pro;
      }
      store.remove('license');
      state.pro = false;
      state.payload = null;
      renderChip();
      return false;
    }).catch(function () {
      state.checked = true;
      return state.pro;
    });
  }

  /* ----------------------------------------------------------------------- */
  /* Public entitlement logic                                                 */
  /* ----------------------------------------------------------------------- */

  var UNLIMITED = Infinity;

  function starsTierIsPro(ent) {
    if (!ent || !ent.tier || ent.tier === 'free') return false;
    if (ent.expiresAt && Number(ent.expiresAt) > 0 && Number(ent.expiresAt) < Date.now()) return false;
    return true;
  }

  function isPro() {
    if (!gatingEnabled()) return true;
    if (state.pro === true) {
      if (state.payload && isExpired(state.payload)) {
        state.pro = false;
        state.payload = null;
        store.remove('license');
        renderChip();
        return false;
      }
      return true;
    }
    try {
      if (starsTierIsPro(window.__CLARIORA_SERVER_ENTITLEMENT__)) return true;
    } catch (_) {}
    return false;
  }

  function limitFor(feature) {
    var cfg = config();
    if (feature === 'cards' || feature === 'flashcards') return numberOr(cfg.freeCardsPerDay, 20);
    if (feature === 'labs') return numberOr(cfg.freeLabsPerDay, 1);
    if (feature === 'coach') return numberOr(cfg.freeCoachPerDay, 5);
    if (feature === 'diagnostic') return 1;
    return numberOr(cfg.freeQuestionsPerDay, 20);
  }

  function counterFor(feature) {
    if (feature === 'cards' || feature === 'flashcards') return 'cards';
    if (feature === 'labs') return 'labs';
    if (feature === 'coach') return 'coach';
    if (feature === 'diagnostic') return 'diagnostics';
    return 'questions';
  }

  function remainingToday(feature) {
    if (isPro()) return UNLIMITED;
    var f = feature || 'questions';
    var usage = getUsage();
    var used = numberOr(usage[counterFor(f)], 0);
    return Math.max(0, limitFor(f) - used);
  }

  /**
   * can(feature, { count })
   * feature: 'questions' | 'full_mock' | 'coach' | 'flashcards' | 'labs' | 'diagnostic'
   * returns { ok, reason, remaining }
   */
  function can(feature, opts) {
    var f = String(feature || 'questions');
    var count = (opts && typeof opts.count === 'number' && opts.count > 0) ? Math.floor(opts.count) : 1;

    if (isPro()) {
      return { ok: true, reason: 'pro', remaining: UNLIMITED };
    }

    if (f === 'full_mock') {
      return { ok: false, reason: 'pro_only', remaining: 0 };
    }

    var remaining = remainingToday(f);
    if (remaining >= count) {
      return { ok: true, reason: 'free_allowance', remaining: remaining };
    }
    return { ok: false, reason: 'daily_limit', remaining: remaining };
  }

  function consume(feature, count) {
    if (isPro()) return { unlimited: true };
    var f = String(feature || 'questions');
    var n = (typeof count === 'number' && count > 0) ? Math.floor(count) : 1;
    var usage = getUsage();
    var key = counterFor(f);
    usage[key] = numberOr(usage[key], 0) + n;
    setUsage(usage);
    renderChip();
    try {
      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('entitlements:usage', { feature: f, usage: usage, remaining: remainingToday(f) });
      }
    } catch (_) {}
    return usage;
  }

  function activate(key) {
    return verifyKey(key).then(function (res) {
      if (!res.ok) {
        return { ok: false, error: res.error || 'This license key could not be verified.' };
      }
      store.set('license', {
        key: normaliseKey(key),
        verifiedAt: new Date().toISOString(),
        payload: res.payload
      });
      state.pro = true;
      state.payload = res.payload;
      renderChip();
      closeUpgrade();
      try {
        if (APlus.bus && typeof APlus.bus.emit === 'function') {
          APlus.bus.emit('entitlements:activated', { payload: res.payload });
        }
      } catch (_) {}
      return { ok: true, payload: res.payload };
    }).catch(function () {
      return { ok: false, error: 'This license key could not be verified.' };
    });
  }

  function deactivate() {
    store.remove('license');
    state.pro = false;
    state.payload = null;
    renderChip();
    try {
      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('entitlements:deactivated', {});
      }
    } catch (_) {}
    return true;
  }

  /* ----------------------------------------------------------------------- */
  /* UI: root, styles, chip, upgrade card                                     */
  /* ----------------------------------------------------------------------- */

  var STYLE_ID = 'aplusEntitlementsStyles';
  var lastFocused = null;

  function hasDom() {
    return typeof window.document !== 'undefined' && window.document && !!window.document.createElement;
  }

  function ensureRoot() {
    if (!hasDom()) return null;
    var doc = window.document;
    var root = doc.getElementById('entitlementsRoot');
    if (!root) {
      if (!doc.body) return null;
      root = doc.createElement('div');
      root.id = 'entitlementsRoot';
      doc.body.appendChild(root);
    }
    ensureStyles();
    return root;
  }

  function ensureStyles() {
    if (!hasDom()) return;
    var doc = window.document;
    if (doc.getElementById(STYLE_ID)) return;
    var head = doc.head || doc.getElementsByTagName('head')[0] || doc.body;
    if (!head) return;
    var style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#entitlementsRoot .ent-chip{position:fixed;left:16px;bottom:16px;z-index:9000;',
      'display:inline-flex;align-items:center;gap:.5rem;padding:.45rem .8rem;',
      'font-family:var(--font-family,"Segoe UI",sans-serif);font-size:.78rem;line-height:1.2;',
      'color:var(--text-secondary,#a39e93);background:var(--bg-card,#121212);',
      'border:1px solid var(--border-color,rgba(201,162,39,.22));border-radius:var(--radius,4px);',
      'cursor:pointer;}',
      '#entitlementsRoot .ent-chip:hover{color:var(--text-primary,#f5f2ea);',
      'border-color:var(--border-gold,#c9a227);}',
      '#entitlementsRoot .ent-chip:focus-visible{outline:2px solid var(--border-focus,#e0b83a);outline-offset:2px;}',
      '#entitlementsRoot .ent-chip .ent-dot{width:6px;height:6px;border-radius:50%;',
      'background:var(--gold-primary,#c9a227);flex:0 0 auto;}',
      '#entitlementsRoot .ent-overlay{position:fixed;inset:0;z-index:9500;display:flex;',
      'align-items:center;justify-content:center;padding:1.25rem;',
      'background:rgba(0,0,0,.72);}',
      '#entitlementsRoot .ent-card{width:100%;max-width:460px;box-sizing:border-box;',
      'background:var(--bg-card,#121212);color:var(--text-primary,#f5f2ea);',
      'border:1px solid var(--border-color,rgba(201,162,39,.22));',
      'border-radius:var(--radius,4px);padding:1.5rem;',
      'font-family:var(--font-family,"Segoe UI",sans-serif);}',
      '#entitlementsRoot .ent-card h2{margin:0 0 .6rem;font-size:1.12rem;line-height:1.35;',
      'font-family:var(--font-display,Georgia,serif);font-weight:600;color:var(--text-primary,#f5f2ea);}',
      '#entitlementsRoot .ent-card p{margin:0 0 .9rem;font-size:.88rem;line-height:1.55;',
      'color:var(--text-secondary,#a39e93);}',
      '#entitlementsRoot .ent-price{font-size:.82rem;color:var(--text-muted,#6f6a62);',
      'margin:0 0 1.1rem;letter-spacing:.02em;}',
      '#entitlementsRoot .ent-actions{display:flex;flex-direction:column;gap:.55rem;}',
      '#entitlementsRoot .ent-btn{display:block;width:100%;box-sizing:border-box;',
      'padding:.7rem 1rem;font:inherit;font-size:.88rem;font-weight:600;text-align:center;',
      'border-radius:var(--radius,4px);cursor:pointer;}',
      '#entitlementsRoot .ent-btn-primary{background:var(--gold-primary,#c9a227);color:#0a0a0a;',
      'border:1px solid var(--gold-primary,#c9a227);}',
      '#entitlementsRoot .ent-btn-primary:hover{background:var(--gold-light,#e0b83a);',
      'border-color:var(--gold-light,#e0b83a);}',
      '#entitlementsRoot .ent-btn-secondary{background:transparent;',
      'color:var(--text-primary,#f5f2ea);border:1px solid var(--border-color,rgba(201,162,39,.22));}',
      '#entitlementsRoot .ent-btn-secondary:hover{border-color:var(--text-secondary,#a39e93);}',
      '#entitlementsRoot .ent-link{background:none;border:0;padding:.35rem;font:inherit;',
      'font-size:.8rem;color:var(--text-muted,#6f6a62);cursor:pointer;text-decoration:underline;',
      'align-self:center;}',
      '#entitlementsRoot .ent-link:hover{color:var(--text-secondary,#a39e93);}',
      '#entitlementsRoot .ent-btn:focus-visible,#entitlementsRoot .ent-link:focus-visible,',
      '#entitlementsRoot .ent-input:focus-visible{outline:2px solid var(--border-focus,#e0b83a);outline-offset:2px;}',
      '#entitlementsRoot .ent-activate{margin-top:.4rem;display:flex;flex-direction:column;gap:.5rem;}',
      '#entitlementsRoot .ent-input{width:100%;box-sizing:border-box;padding:.6rem .7rem;',
      'font:inherit;font-size:.85rem;letter-spacing:.04em;',
      'background:var(--bg-secondary,#0c0c0c);color:var(--text-primary,#f5f2ea);',
      'border:1px solid var(--border-color,rgba(201,162,39,.22));border-radius:var(--radius,4px);}',
      '#entitlementsRoot .ent-status{margin:0;font-size:.8rem;line-height:1.45;min-height:1em;',
      'color:var(--text-secondary,#a39e93);}',
      '#entitlementsRoot .ent-status.is-error{color:var(--accent-red,#c45c4a);}',
      '#entitlementsRoot .ent-status.is-ok{color:var(--accent-green,#7d9b6a);}',
      '@media (max-width:640px){#entitlementsRoot .ent-chip{left:12px;bottom:12px;font-size:.72rem;}}'
    ].join('');
    try { head.appendChild(style); } catch (_) {}
  }

  function renderChip() {
    if (!hasDom()) return;
    var root = ensureRoot();
    if (!root) return;
    var doc = window.document;
    var chip = doc.getElementById('entitlementsChip');

    if (!gatingEnabled() || isPro()) {
      if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
      return;
    }

    var remaining = remainingToday('questions');
    var limit = limitFor('questions');
    var label = remaining + ' of ' + limit + ' free questions left today';

    if (!chip) {
      chip = doc.createElement('button');
      chip.id = 'entitlementsChip';
      chip.type = 'button';
      chip.className = 'ent-chip';
      chip.setAttribute('aria-live', 'polite');
      chip.addEventListener('click', function () { openUpgrade('chip'); });
      root.appendChild(chip);
    }
    chip.title = 'The full version removes the daily limit';
    chip.innerHTML = '';
    var dot = doc.createElement('span');
    dot.className = 'ent-dot';
    dot.setAttribute('aria-hidden', 'true');
    var text = doc.createElement('span');
    text.textContent = label;
    chip.appendChild(dot);
    chip.appendChild(text);
    chip.hidden = !chipShouldShow();
    ensureChipVisibilityWatch();
  }

  /**
   * The chip only belongs on the home screen. It must never sit on top of the onboarding
   * overlay, an open modal, the upgrade card, or the exam toolbar.
   */
  function chipShouldShow() {
    if (!hasDom()) return false;
    var doc = window.document;
    try {
      if (doc.querySelector('.modal-overlay.active')) return false;
      if (doc.querySelector('#onboardingRoot .onb-overlay, #onboardingRoot [role="dialog"]')) return false;
      if (doc.querySelector('#entitlementsRoot .ent-overlay')) return false;
      var gate = doc.getElementById('aplusBootGate');
      if (gate && !gate.hidden) return false;
      var start = doc.getElementById('startScreen');
      if (start && !start.classList.contains('active')) return false;
    } catch (_) {}
    return true;
  }

  var chipWatchTimer = null;
  function ensureChipVisibilityWatch() {
    if (chipWatchTimer || !hasDom()) return;
    chipWatchTimer = window.setInterval(function () {
      var chip = window.document.getElementById('entitlementsChip');
      if (!chip) return;
      var show = chipShouldShow();
      if (chip.hidden === show) chip.hidden = !show;
    }, 500);
  }

  function titleForReason(reason) {
    if (reason === 'full_mock') return 'Full 90-question mocks require Pro';
    if (reason === 'coach') return 'The study coach requires Pro';
    if (reason === 'flashcards') return 'You have used today\'s free flashcards';
    if (reason === 'labs') return 'You have used today\'s free lab';
    if (reason === 'chip' || reason === 'upgrade') return 'Upgrade to Clariora Pro';
    return 'You have used today\'s free questions';
  }

  function closeUpgrade() {
    if (!hasDom()) return;
    var doc = window.document;
    var overlay = doc.getElementById('entitlementsUpgrade');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
    lastFocused = null;
  }

  function openUpgrade(reason) {
    if (!gatingEnabled() || isPro()) return;
    if (!hasDom()) return;
    var root = ensureRoot();
    if (!root) return;
    var doc = window.document;
    if (doc.getElementById('entitlementsUpgrade')) return;

    try { lastFocused = doc.activeElement; } catch (_) { lastFocused = null; }

    var cfg = config();

    var overlay = doc.createElement('div');
    overlay.id = 'entitlementsUpgrade';
    overlay.className = 'ent-overlay';

    var card = doc.createElement('div');
    card.className = 'ent-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'entitlementsUpgradeTitle');

    var h = doc.createElement('h2');
    h.id = 'entitlementsUpgradeTitle';
    h.textContent = titleForReason(reason);

    var p = doc.createElement('p');
    p.textContent = 'Unlock the complete question bank, full 90-question timed mocks, PBQ labs, and study coach.';

    var price = doc.createElement('p');
    price.className = 'ent-price';
    price.textContent = 'Pass option: ' + String(cfg.priceLabel || '39 USD or Telegram Stars');

    var actions = doc.createElement('div');
    actions.className = 'ent-actions';

    var buy = doc.createElement('button');
    buy.type = 'button';
    buy.className = 'ent-btn ent-btn-primary';
    buy.textContent = 'Get the full version';
    buy.addEventListener('click', function () {
      try { window.open(String(cfg.buyUrl || ''), '_blank', 'noopener'); } catch (_) {}
    });

    var haveKey = doc.createElement('button');
    haveKey.type = 'button';
    haveKey.className = 'ent-btn ent-btn-secondary';
    haveKey.textContent = 'I have a license key';
    haveKey.setAttribute('aria-expanded', 'false');
    haveKey.setAttribute('aria-controls', 'entitlementsActivate');

    var activateBox = doc.createElement('div');
    activateBox.className = 'ent-activate';
    activateBox.id = 'entitlementsActivate';
    activateBox.hidden = true;

    var input = doc.createElement('input');
    input.type = 'text';
    input.className = 'ent-input';
    input.id = 'entitlementsKeyInput';
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-label', 'License key');
    input.placeholder = 'APLUS-...';

    var activateBtn = doc.createElement('button');
    activateBtn.type = 'button';
    activateBtn.className = 'ent-btn ent-btn-secondary';
    activateBtn.textContent = 'Activate';

    var status = doc.createElement('p');
    status.className = 'ent-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    function setStatus(message, kind) {
      status.textContent = message || '';
      status.className = 'ent-status' + (kind ? ' is-' + kind : '');
    }

    function doActivate() {
      var value = input.value;
      if (!value || !String(value).trim()) {
        setStatus('Paste the license key from your receipt email first.', 'error');
        return;
      }
      activateBtn.disabled = true;
      setStatus('Checking the key...', '');
      activate(value).then(function (res) {
        activateBtn.disabled = false;
        if (res && res.ok) {
          var payload = res.payload || state.payload;
          var msg = 'Thank you! The full version is unlocked.';
          if (payload && payload.expires) {
            var days = daysRemaining(payload);
            var passName = payload.tier_name || 'Study Pass';
            msg = 'Thank you! ' + passName + ' active until ' + payload.expires + ' (' + days + ' days left).';
          }
          setStatus(msg, 'ok');
        } else {
          setStatus((res && res.error) || 'This license key could not be verified.', 'error');
        }
      }).catch(function () {
        activateBtn.disabled = false;
        setStatus('This license key could not be verified.', 'error');
      });
    }

    activateBtn.addEventListener('click', doActivate);
    input.addEventListener('keydown', function (e) {
      if (e && e.key === 'Enter') {
        e.preventDefault();
        doActivate();
      }
    });

    haveKey.addEventListener('click', function () {
      var showing = activateBox.hidden;
      activateBox.hidden = !showing;
      haveKey.setAttribute('aria-expanded', showing ? 'true' : 'false');
      if (showing) {
        try { input.focus(); } catch (_) {}
      }
    });

    var notNow = doc.createElement('button');
    notNow.type = 'button';
    notNow.className = 'ent-link';
    notNow.textContent = 'Not now';
    notNow.addEventListener('click', closeUpgrade);

    activateBox.appendChild(input);
    activateBox.appendChild(activateBtn);
    activateBox.appendChild(status);

    actions.appendChild(buy);
    actions.appendChild(haveKey);
    actions.appendChild(activateBox);
    actions.appendChild(notNow);

    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(price);
    card.appendChild(actions);
    overlay.appendChild(card);

    overlay.addEventListener('click', function (e) {
      if (e && e.target === overlay) closeUpgrade();
    });
    overlay.addEventListener('keydown', function (e) {
      if (!e) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeUpgrade();
        return;
      }
      if (e.key === 'Tab') {
        var focusables = card.querySelectorAll('button:not([disabled]), input:not([disabled])');
        var visible = [];
        var i;
        for (i = 0; i < focusables.length; i++) {
          if (focusables[i].offsetParent !== null || focusables[i] === doc.activeElement) {
            visible.push(focusables[i]);
          }
        }
        if (!visible.length) return;
        var first = visible[0];
        var last = visible[visible.length - 1];
        if (e.shiftKey && doc.activeElement === first) {
          e.preventDefault();
          try { last.focus(); } catch (_) {}
        } else if (!e.shiftKey && doc.activeElement === last) {
          e.preventDefault();
          try { first.focus(); } catch (_) {}
        }
      }
    });

    root.appendChild(overlay);
    try { buy.focus(); } catch (_) {}

    try {
      if (APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('entitlements:upgrade:shown', { reason: reason || 'daily_limit' });
      }
    } catch (_) {}
  }

  /* ----------------------------------------------------------------------- */
  /* Gating: wrapping global entry points without editing other files         */
  /* ----------------------------------------------------------------------- */

  var WRAP_FLAG = '__aplusEntitled';
  var traps = {};

  /**
   * Installs an accessor trap on window[name] so that any later assignment
   * (app.js registerGlobalShims runs on DOMContentLoaded) is re-wrapped.
   * A global function DECLARATION in a later inline script replaces the accessor
   * with a plain data property, so rewrapAll() is also called on a schedule.
   */
  function installTrap(name, factory) {
    traps[name] = factory;
    var current = null;
    try { current = window[name]; } catch (_) {}
    var held = (typeof current === 'function') ? wrapOnce(current, factory) : current;

    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: function () { return held; },
        set: function (value) {
          held = (typeof value === 'function') ? wrapOnce(value, factory) : value;
        }
      });
      return true;
    } catch (_) {
      try { window[name] = held; } catch (__) {}
      return false;
    }
  }

  function wrapOnce(fn, factory) {
    if (!fn || typeof fn !== 'function') return fn;
    if (fn[WRAP_FLAG]) return fn;
    var wrapped;
    try {
      wrapped = factory(fn);
    } catch (_) {
      return fn;
    }
    if (typeof wrapped !== 'function') return fn;
    try {
      wrapped[WRAP_FLAG] = true;
      wrapped.__aplusOriginal = fn;
    } catch (_) {}
    return wrapped;
  }

  function rewrapAll() {
    var name;
    for (name in traps) {
      if (!Object.prototype.hasOwnProperty.call(traps, name)) continue;
      try {
        var current = window[name];
        if (typeof current === 'function' && !current[WRAP_FLAG]) {
          window[name] = current; // goes through the setter if the trap survived
          if (typeof window[name] === 'function' && !window[name][WRAP_FLAG]) {
            installTrap(name, traps[name]); // trap was overwritten, rebuild it
          }
        }
      } catch (_) {}
    }
    wrapGhostCoach();
  }

  /* startExam ------------------------------------------------------------- */

  var diagnosticThisSession = false;

  function isDiagnosticRequest(type, count) {
    var cfg = config();
    var d = cfg.diagnostic || {};
    var wantType = String(d.type || 'both');
    var wantCount = numberOr(d.count, 20);
    return String(type) === wantType && Number(count) === wantCount;
  }

  function startExamFactory(original) {
    return function (type, questionCount, timeMinutes) {
      var args = Array.prototype.slice.call(arguments);
      try {
        if (!gatingEnabled() || isPro()) {
          diagnosticThisSession = false;
          return original.apply(this, args);
        }

        var count = numberOr(questionCount, 90);
        var minutes = numberOr(timeMinutes, count);
        var cfg = config();

        // Free daily diagnostic: always allowed once per day, does not spend questions.
        if (isDiagnosticRequest(type, count)) {
          if (can('diagnostic', { count: 1 }).ok) {
            consume('diagnostic', 1);
            diagnosticThisSession = true;
            return original.apply(this, args);
          }
          diagnosticThisSession = false;
        } else {
          diagnosticThisSession = false;
        }

        // Full mocks are paid only.
        if (count >= numberOr(cfg.fullMockThreshold, 90)) {
          openUpgrade('full_mock');
          return undefined;
        }

        var remaining = remainingToday('questions');
        if (remaining <= 0) {
          openUpgrade('daily_limit');
          return undefined;
        }
        if (count > remaining) {
          if (remaining < numberOr(cfg.minTrimmedSession, 5)) {
            openUpgrade('daily_limit');
            return undefined;
          }
          var scale = remaining / (count || 1);
          args[1] = remaining;
          args[2] = Math.max(1, Math.ceil(minutes * scale));
        }
        return original.apply(this, args);
      } catch (err) {
        try { console.warn(LOG, 'startExam gate error', err); } catch (_) {}
        return original.apply(this, args);
      }
    };
  }

  /* Simple pro-only or daily-limited window function gates ----------------- */

  function proOnlyFactory(reason) {
    return function (original) {
      return function () {
        try {
          if (!gatingEnabled() || isPro()) return original.apply(this, arguments);
          openUpgrade(reason);
          return undefined;
        } catch (_) {
          return original.apply(this, arguments);
        }
      };
    };
  }

  function dailyFeatureFactory(feature, reason) {
    return function (original) {
      return function () {
        try {
          if (!gatingEnabled() || isPro()) return original.apply(this, arguments);
          var check = can(feature, { count: 1 });
          if (!check.ok) {
            openUpgrade(reason);
            return undefined;
          }
          consume(feature, 1);
          return original.apply(this, arguments);
        } catch (_) {
          return original.apply(this, arguments);
        }
      };
    };
  }

  /* Ghost Coach ----------------------------------------------------------- */

  var ghostWrapped = false;

  function wrapGhostCoach() {
    try {
      var gc = APlus.ghostCoach;
      if (!gc || typeof gc !== 'object') return;
      var names = ['startCurrentMission', 'composeExplainOnMiss'];
      var i;
      var did = false;
      for (i = 0; i < names.length; i++) {
        var n = names[i];
        if (typeof gc[n] === 'function' && !gc[n][WRAP_FLAG]) {
          gc[n] = wrapOnce(gc[n], dailyFeatureFactory('coach', 'coach'));
          did = true;
        }
      }
      if (did) ghostWrapped = true;
    } catch (_) {}
  }

  /* ----------------------------------------------------------------------- */
  /* Consumption on answered questions                                        */
  /* ----------------------------------------------------------------------- */

  var sessionId = 0;
  var countedThisSession = {};

  function bindBus() {
    try {
      if (!APlus.bus || typeof APlus.bus.on !== 'function') return false;
      APlus.bus.on('exam:started', function () {
        sessionId++;
        countedThisSession = {};
      });
      APlus.bus.on('exam:answered', function (payload) {
        try {
          if (!gatingEnabled() || isPro()) return;
          if (diagnosticThisSession) return;
          var idx = (payload && typeof payload.index === 'number') ? payload.index : -1;
          var mark = sessionId + ':' + idx;
          if (idx < 0 || countedThisSession[mark]) return;
          countedThisSession[mark] = true;
          consume('questions', 1);
        } catch (_) {}
      });
      APlus.bus.on('exam:finished', function () {
        renderChip();
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  /* ----------------------------------------------------------------------- */
  /* Boot                                                                     */
  /* ----------------------------------------------------------------------- */

  function installGates() {
    installTrap('startExam', startExamFactory);
    installTrap('startDomainDrill', function (original) {
      return function () {
        try {
          if (!gatingEnabled() || isPro()) return original.apply(this, arguments);
          if (remainingToday('questions') <= 0) {
            openUpgrade('daily_limit');
            return undefined;
          }
          return original.apply(this, arguments);
        } catch (_) {
          return original.apply(this, arguments);
        }
      };
    });
    installTrap('startMissedDrill', function (original) {
      return function () {
        try {
          if (!gatingEnabled() || isPro()) return original.apply(this, arguments);
          if (remainingToday('questions') <= 0) {
            openUpgrade('daily_limit');
            return undefined;
          }
          return original.apply(this, arguments);
        } catch (_) {
          return original.apply(this, arguments);
        }
      };
    });
    installTrap('startGhostCoachMission', dailyFeatureFactory('coach', 'coach'));
    installTrap('openMemoryModal', dailyFeatureFactory('flashcards', 'flashcards'));
    installTrap('openPBQModal', dailyFeatureFactory('labs', 'labs'));
  }

  function syncStarsEntitlement() {
    try {
      if (!window.StarsBilling || typeof window.StarsBilling.getEntitlements !== 'function') return;
      window.StarsBilling.getEntitlements().then(function (ent) {
        try {
          window.__CLARIORA_SERVER_ENTITLEMENT__ = ent || { tier: 'free' };
          renderChip();
        } catch (_) {}
      }).catch(function () {});
    } catch (_) {}
  }

  function boot() {
    try {
      loadLicense();
      renderChip();
      bindBus();
      wrapGhostCoach();
      syncStarsEntitlement();
      try {
        window.addEventListener('clariora:entitlement-updated', function () {
          syncStarsEntitlement();
          renderChip();
        });
      } catch (_) {}
      reverifyStoredLicense().then(function () {
        renderChip();
      });
    } catch (err) {
      try { console.warn(LOG, 'boot error', err); } catch (_) {}
    }
  }

  function scheduleRewraps() {
    var delays = [0, 500, 1500, 3000, 8000];
    var i;
    for (i = 0; i < delays.length; i++) {
      (function (ms) {
        try { window.setTimeout(rewrapAll, ms); } catch (_) {}
      })(delays[i]);
    }
    try {
      window.addEventListener('load', rewrapAll);
    } catch (_) {}
    try {
      if (window.document && window.document.addEventListener) {
        window.document.addEventListener('click', rewrapAll, true);
      }
    } catch (_) {}
  }

  /* ----------------------------------------------------------------------- */
  /* Public API                                                               */
  /* ----------------------------------------------------------------------- */

  APlus.entitlements = {
    isPro: isPro,
    remainingToday: remainingToday,
    can: can,
    consume: consume,
    activate: activate,
    deactivate: deactivate,
    openUpgrade: openUpgrade,
    closeUpgrade: closeUpgrade,
    getUsage: getUsage,
    getLicensePayload: function () { return state.payload; },
    getStatus: function () {
      var pro = isPro();
      var payload = state.payload;
      return {
        pro: pro,
        tier: payload && payload.tier ? payload.tier : (pro ? 'pro' : 'free'),
        tierName: payload && payload.tier_name ? payload.tier_name : (pro ? 'Pro' : 'Free'),
        expires: payload && payload.expires ? payload.expires : null,
        daysRemaining: pro ? (payload && payload.expires ? daysRemaining(payload) : Infinity) : 0,
        isLifetime: pro && (!payload || !payload.expires)
      };
    },
    daysRemaining: function () {
      return daysRemaining(state.payload);
    },
    isEnabled: gatingEnabled,
    todayKey: todayKey,
    refresh: renderChip,
    verifyKey: verifyKey,
    _internal: {
      base32Encode: base32Encode,
      base32Decode: base32Decode,
      utf8Encode: utf8Encode,
      utf8Decode: utf8Decode,
      rewrapAll: rewrapAll,
      setUsage: setUsage,
      usageStorageKey: usageStorageKey,
      isExpired: isExpired,
      daysRemaining: daysRemaining,
      state: state,
      boot: boot
    }
  };

  // Install the traps immediately (before app.js DOMContentLoaded assignment).
  try { installGates(); } catch (_) {}

  try {
    if (window.document && window.document.readyState === 'loading') {
      window.document.addEventListener('DOMContentLoaded', function () {
        boot();
        scheduleRewraps();
      });
    } else {
      boot();
      scheduleRewraps();
    }
  } catch (_) {
    try { boot(); } catch (__) {}
  }

})(typeof window !== 'undefined' ? window : this);
