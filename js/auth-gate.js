/**
 * js/auth-gate.js
 * Login wall / gated product access for Clariora.
 * Browser users must sign in (Google, email, or Telegram Login).
 * Telegram Mini App users authenticate via native WebApp initData (no second login).
 * Unlock requires verified session exchange where possible; resume prefers server cookie.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./firebase-service', './firebase-auth-ui'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./firebase-service'),
      require('./firebase-auth-ui')
    );
  } else {
    root.ClarioraAuthGate = factory(root.ClarioraFirebaseService, root.ClarioraAuthUI);
  }
})(typeof self !== 'undefined' ? self : this, function (firebaseService, authUI) {
  'use strict';

  var STORAGE_TG = 'clariora_telegram_auth';
  var STORAGE_TG_LOGIN = 'clariora_telegram_login_payload';
  var STORAGE_SESSION = 'clariora_auth_session_v1';
  var GATE_ID = 'clarioraLoginWall';

  /**
   * Tier 1 request guard (js/request-guard.js). Auth endpoints are credential-
   * stuffing targets and the edge limits them hard, so the client must not turn
   * a rejection into a retry loop. Falls back to plain fetch when unloaded.
   */
  function guardedFetch(url, init, guardOpts) {
    var g = (typeof window !== 'undefined' && window.APlus && window.APlus.guard) || null;
    if (g) return g.fetch(url, init, guardOpts);
    return fetch(url, init);
  }

  var state = {
    ready: false,
    unlocked: false,
    isTMA: false,
    session: null,
    waiters: [],
    lastReportKey: ''
  };

  /** Profile-only cache. Never store idToken, initData, hashes, or login payloads. */
  function sanitizeSessionForStorage(session) {
    if (!session) return null;
    return {
      provider: session.provider || 'unknown',
      uid: session.uid || '',
      telegramId: session.telegramId != null ? session.telegramId : null,
      displayName: session.displayName || '',
      username: session.username || '',
      photoURL: session.photoURL || '',
      email: session.email || ''
    };
  }

  function sanitizeTelegramProfile(user) {
    if (!user || !user.id) return null;
    return {
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      photo_url: user.photo_url || ''
    };
  }

  function isTelegramMiniApp() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      return !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0);
    } catch (_) {
      return false;
    }
  }

  function writeTelegramLoginPayload(data) {
    try {
      if (data && data.hash) localStorage.setItem(STORAGE_TG_LOGIN, JSON.stringify(data));
      else localStorage.removeItem(STORAGE_TG_LOGIN);
    } catch (_) {}
  }

  function readTelegramSession() {
    try {
      var raw = localStorage.getItem(STORAGE_TG);
      if (!raw) return null;
      var user = JSON.parse(raw);
      if (!user || !user.id) return null;
      return {
        provider: 'telegram',
        uid: 'tg_' + user.id,
        telegramId: user.id,
        displayName: (user.first_name || '') + (user.last_name ? ' ' + user.last_name : ''),
        username: user.username || '',
        photoURL: user.photo_url || '',
        email: user.username ? '@' + user.username : ''
      };
    } catch (_) {
      return null;
    }
  }

  function readCachedSession() {
    try {
      var raw = localStorage.getItem(STORAGE_SESSION);
      if (!raw) return null;
      return sanitizeSessionForStorage(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function writeCachedSession(session) {
    var safe = sanitizeSessionForStorage(session);
    state.session = safe;
    try {
      if (safe) localStorage.setItem(STORAGE_SESSION, JSON.stringify(safe));
      else localStorage.removeItem(STORAGE_SESSION);
    } catch (_) {}
  }

  function clearTelegramLocalAuth() {
    try {
      localStorage.removeItem(STORAGE_TG);
      localStorage.removeItem(STORAGE_TG_LOGIN);
    } catch (_) {}
  }

  function notifyWaiters() {
    var list = state.waiters.slice();
    state.waiters = [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](state.session); } catch (_) {}
    }
  }

  function wantsCreateAccount() {
    try {
      var q = new URLSearchParams(window.location.search || '');
      if (q.get('signup') === '1' || q.get('mode') === 'signup') return true;
      var hash = String(window.location.hash || '').toLowerCase();
      return hash === '#create-account' || hash === '#signup';
    } catch (_) {
      return false;
    }
  }

  function openSignupIntentIfRequested() {
    if (!wantsCreateAccount()) return;
    if (authUI && authUI.openModal) {
      authUI.openModal({ mode: 'signup', wall: true });
    }
  }

  function injectWallStyles() {
    if (document.getElementById('clarioraAuthGateStyles')) return;
    var css = [
      '#' + GATE_ID + ' {',
      '  position: fixed; inset: 0; z-index: 10050;',
      '  display: flex; align-items: center; justify-content: center;',
      '  padding: 20px;',
      '  background: rgba(5, 7, 11, 0.92);',
      '  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);',
      '}',
      '#' + GATE_ID + '[hidden] { display: none !important; }',
      '#' + GATE_ID + ' .gate-card {',
      '  width: 100%; max-width: 420px;',
      '  background: rgba(15, 19, 27, 0.96);',
      '  border: 1px solid rgba(212, 175, 55, 0.32);',
      '  border-radius: 16px;',
      '  box-shadow: 0 24px 56px rgba(0,0,0,0.72), inset 0 1px 0 rgba(212,175,55,0.2);',
      '  padding: 28px 24px 22px;',
      '}',
      '#' + GATE_ID + ' .gate-eyebrow {',
      '  margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em;',
      '  text-transform: uppercase; color: #D4AF37; font-weight: 700;',
      '}',
      '#' + GATE_ID + ' h1 {',
      '  margin: 0 0 8px; font-size: 1.45rem; color: #F3F4F6; font-weight: 700;',
      '}',
      '#' + GATE_ID + ' .gate-lead {',
      '  margin: 0 0 18px; font-size: 0.92rem; line-height: 1.45; color: #A3ADC2;',
      '}',
      '#' + GATE_ID + ' .gate-actions { display: grid; gap: 10px; }',
      '#' + GATE_ID + ' .gate-actions button {',
      '  display: inline-flex; align-items: center; justify-content: center; gap: 10px;',
      '  min-height: 44px; width: 100%; border-radius: 8px; font-weight: 700;',
      '  font-size: 0.92rem; cursor: pointer; font-family: inherit;',
      '}',
      '#' + GATE_ID + ' .btn-google {',
      '  background: #fff; color: #1f2937; border: 1px solid rgba(0,0,0,0.08);',
      '}',
      '#' + GATE_ID + ' .btn-google:hover { background: #f3f4f6; }',
      '#' + GATE_ID + ' .btn-telegram {',
      '  background: #229ED9; color: #fff; border: 1px solid transparent;',
      '}',
      '#' + GATE_ID + ' .btn-telegram:hover { background: #1b8fc4; }',
      '#' + GATE_ID + ' .btn-auth-submit {',
      '  background: #D4AF37; color: #0B0B0F; border: 1px solid transparent;',
      '}',
      '#' + GATE_ID + ' .btn-auth-submit:hover { background: #E4C558; }',
      '#' + GATE_ID + ' .btn-auth-secondary {',
      '  background: transparent; border: 1px solid rgba(212,175,55,0.55); color: #D4AF37;',
      '}',
      '#' + GATE_ID + ' .btn-auth-secondary:hover { background: rgba(212,175,55,0.12); }',
      '#' + GATE_ID + ' .gate-actions button:focus-visible {',
      '  outline: 2px solid #D4AF37; outline-offset: 2px;',
      '}',
      '#' + GATE_ID + ' .gate-note {',
      '  margin: 16px 0 0; font-size: 12px; color: #8B95A8; text-align: center; line-height: 1.45;',
      '}',
      '#' + GATE_ID + ' .gate-note a { color: #D4AF37; }',
      '#' + GATE_ID + ' .gate-error {',
      '  margin: 12px 0 0; font-size: 12px; line-height: 1.4; color: #FCA5A5; text-align: center;',
      '}',
      'html.clariora-auth-locked, html.clariora-auth-locked body {',
      '  overflow: hidden !important;',
      '}',
      'html.clariora-auth-locked #aplusBootIntro { visibility: hidden !important; }',
      'html.clariora-auth-locked #onboardingOverlay,',
      'html.clariora-auth-locked .onboarding-overlay,',
      'html.clariora-auth-locked [data-onboarding],',
      'html.clariora-auth-locked #licenseKeyModal,',
      'html.clariora-auth-locked .license-key-modal {',
      '  visibility: hidden !important; pointer-events: none !important;',
      '}'
    ].join('\n');
    var el = document.createElement('style');
    el.id = 'clarioraAuthGateStyles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function ensureWall() {
    injectWallStyles();
    var existing = document.getElementById(GATE_ID);
    if (existing) return existing;

    // Desktop/Electron may study offline without cloud auth. Web stays hard-gated.
    var isElectron = !!(window.electronAPI || (window.location && window.location.protocol === 'file:'));
    var offlineBtnHtml = isElectron
      ? '<button type="button" class="btn-auth-secondary" id="gateOfflineBtn">Continue offline on this device</button>'
      : '';

    var wall = document.createElement('div');
    wall.id = GATE_ID;
    wall.setAttribute('role', 'dialog');
    wall.setAttribute('aria-modal', 'true');
    wall.setAttribute('aria-labelledby', 'clarioraGateTitle');
    wall.hidden = true;
    wall.innerHTML = [
      '<div class="gate-card">',
      '  <p class="gate-eyebrow">Account required</p>',
      '  <h1 id="clarioraGateTitle">Sign in to open Clariora</h1>',
      '  <p class="gate-lead">Sign in for access. Progress stays device-local unless cloud sync is configured for your account. Free diagnostic remains free after sign-in.</p>',
      '  <div class="gate-actions">',
      '    <button type="button" class="btn-google" id="gateGoogleBtn">Continue with Google</button>',
      '    <button type="button" class="btn-telegram" id="gateTelegramBtn">Continue with Telegram</button>',
      '    <button type="button" class="btn-auth-submit" id="gateEmailBtn">Sign in with email</button>',
      '    <button type="button" class="btn-auth-secondary" id="gateSignupBtn">Create account</button>',
      offlineBtnHtml,
      '  </div>',
      '  <p class="gate-note" id="gateStatusNote">Prefer Telegram? <a href="https://t.me/ClarioraBot/app" target="_blank" rel="noopener">Open the Mini App</a>.</p>',
      '  <p class="gate-error" id="gateErrorNote" hidden></p>',
      '</div>'
    ].join('\n');
    document.body.appendChild(wall);

    var offlineBtn = document.getElementById('gateOfflineBtn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', function () {
        unlockInternal({
          provider: 'offline',
          uid: 'local_technician',
          displayName: 'Local Technician',
          email: 'offline@local'
        });
      });
    }

    document.getElementById('gateGoogleBtn').addEventListener('click', function () {
      setGateError('');
      if (authUI && authUI.handleGoogleSignIn) authUI.handleGoogleSignIn();
      else if (authUI && authUI.openModal) authUI.openModal({ mode: 'signin', wall: true });
    });
    document.getElementById('gateTelegramBtn').addEventListener('click', function () {
      setGateError('');
      if (authUI && authUI.handleTelegramSignIn) authUI.handleTelegramSignIn();
      else if (authUI && authUI.openModal) authUI.openModal({ mode: 'signin', wall: true });
    });
    document.getElementById('gateEmailBtn').addEventListener('click', function () {
      setGateError('');
      if (authUI && authUI.openModal) authUI.openModal({ mode: 'signin', wall: true });
    });
    document.getElementById('gateSignupBtn').addEventListener('click', function () {
      setGateError('');
      if (authUI && authUI.openModal) authUI.openModal({ mode: 'signup', wall: true });
    });

    return wall;
  }

  function setGateError(message) {
    var el = document.getElementById('gateErrorNote');
    if (authUI && typeof authUI.showError === 'function' && message) {
      authUI.showError(message);
    }
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function showWall() {
    if (state.isTMA) return;
    document.documentElement.classList.add('clariora-auth-locked');
    var wall = ensureWall();
    wall.hidden = false;
    if (authUI && authUI.setWallMode) authUI.setWallMode(true);
  }

  function hideWall() {
    document.documentElement.classList.remove('clariora-auth-locked');
    var wall = document.getElementById(GATE_ID);
    if (wall) wall.hidden = true;
    if (authUI && authUI.setWallMode) authUI.setWallMode(false);
  }

  function unlockInternal(session) {
    state.unlocked = true;
    state.ready = true;
    writeCachedSession(session);
    hideWall();
    try {
      window.dispatchEvent(new CustomEvent('clariora:auth-unlocked', { detail: session }));
    } catch (_) {}
    notifyWaiters();
  }

  function lock() {
    state.session = null;
    state.unlocked = false;
    state.lastReportKey = '';
    writeCachedSession(null);
    clearTelegramLocalAuth();
    logoutServerSession();
    showWall();
    try {
      window.dispatchEvent(new CustomEvent('clariora:auth-locked'));
    } catch (_) {}
  }

  async function reportSession(session, eventType) {
    if (!session) return { ok: false };
    var key = [eventType || 'signin', session.provider || '', session.uid || ''].join('|');
    if (key === state.lastReportKey && state.unlocked) return { ok: true };
    state.lastReportKey = key;
    try {
      var body = {
        event: eventType || 'signin',
        provider: session.provider || 'unknown',
        uid: session.uid || '',
        email: session.email || '',
        displayName: session.displayName || '',
        photoURL: session.photoURL || '',
        telegramId: session.telegramId || null,
        idToken: session.idToken || null,
        initData: session.initData || null,
        telegramLogin: session.telegramLogin || null
      };
      var res = await guardedFetch('/api/v1/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, { dedupeKey: 'auth:session:' + key, maxAttempts: 1 });
      if (!res.ok) {
        state.lastReportKey = '';
        return { ok: false, status: res.status };
      }
      return { ok: true };
    } catch (err) {
      console.warn('[AuthGate] session report failed:', err);
      state.lastReportKey = '';
      return { ok: false, error: err };
    }
  }

  async function fetchServerSession() {
    try {
      var res = await guardedFetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }, { dedupeKey: 'auth:me', maxAttempts: 2 });
      if (!res.ok) return null;
      var data = await res.json();
      if (!data || !data.authenticated || !data.uid) return null;
      return sanitizeSessionForStorage({
        provider: data.provider,
        uid: data.uid,
        telegramId: data.telegramId,
        displayName: data.displayName,
        photoURL: data.photoURL,
        email: data.email
      });
    } catch (_) {
      return null;
    }
  }

  async function logoutServerSession() {
    try {
      await guardedFetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }, { dedupeKey: 'auth:logout', maxAttempts: 1 });
    } catch (_) {}
  }

  async function bindAccountMemory(session) {
    if (!session || !session.uid) return;
    try {
      localStorage.setItem('clariora_active_account_id', session.uid);
    } catch (_) {}

    var service = firebaseService || window.ClarioraFirebaseService;
    if (service && session.provider !== 'telegram' && session.provider !== 'telegram_tma' &&
        session.provider !== 'offline' &&
        typeof service.ensureUserProfile === 'function') {
      try {
        await service.ensureUserProfile(session);
        if (typeof service.loadLearnerProgress === 'function') {
          var remote = await service.loadLearnerProgress();
          if (remote && typeof service.applyRemoteToLocal === 'function') {
            service.applyRemoteToLocal(remote);
          } else if (remote && remote.data) {
            for (var k in remote.data) {
              if (Object.prototype.hasOwnProperty.call(remote.data, k)) {
                try { localStorage.setItem(k, remote.data[k]); } catch (_) {}
              }
            }
          }
        }
        if (typeof service.scheduleSyncToFirestore === 'function') {
          service.scheduleSyncToFirestore();
        }
      } catch (err) {
        console.warn('[AuthGate] profile sync notice:', err);
      }
    }

    if ((session.provider === 'telegram' || session.provider === 'telegram_tma') && session.uid) {
      try {
        localStorage.setItem('clariora_sync_user_id', session.uid);
      } catch (_) {}
    }
  }

  function sessionFromFirebaseUser(user, eventType) {
    if (!user) return null;
    return {
      provider: (user.providerData && user.providerData[0] && user.providerData[0].providerId === 'google.com')
        ? 'google'
        : 'email',
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      event: eventType || 'signin',
      isNewUser: !!(user.metadata && user.metadata.creationTime &&
        user.metadata.lastSignInTime &&
        user.metadata.creationTime === user.metadata.lastSignInTime)
    };
  }

  async function handleFirebaseUser(user) {
    if (!user) {
      if (!state.isTMA) lock();
      return;
    }
    var session = sessionFromFirebaseUser(user);
    if (session.isNewUser) session.event = 'signup';
    try {
      if (user.getIdToken) session.idToken = await user.getIdToken();
    } catch (_) {}
    var reported = await reportSession(session, session.event || 'signin');
    delete session.idToken;
    if (!reported.ok) {
      setGateError('Sign-in could not be verified. Check your connection and try again.');
      showWall();
      return;
    }
    setGateError('');
    await bindAccountMemory(session);
    unlockInternal(session);
  }

  async function handleTelegramNative() {
    var tg = window.Telegram.WebApp;
    var u = (tg.initDataUnsafe && tg.initDataUnsafe.user) || null;
    if (!u || !u.id || !tg.initData) {
      // Inside TMA without usable identity: do not force Google wall.
      unlockInternal(null);
      return;
    }
    var session = {
      provider: 'telegram_tma',
      uid: 'tg_' + u.id,
      telegramId: u.id,
      displayName: (u.first_name || '') + (u.last_name ? ' ' + u.last_name : ''),
      username: u.username || '',
      photoURL: u.photo_url || '',
      email: u.username ? '@' + u.username : '',
      initData: tg.initData || ''
    };
    try {
      localStorage.setItem(STORAGE_TG, JSON.stringify(sanitizeTelegramProfile(u)));
    } catch (_) {}
    var reported = await reportSession(session, 'signin');
    delete session.initData;
    // Fail closed: mirror Firebase path. Paid APIs already 401, but the product wall
    // must not unlock on unverified / spoofed WebApp chrome.
    if (!reported.ok) {
      setGateError('Telegram sign-in could not be verified. Check your connection and try again.');
      showWall();
      return;
    }
    setGateError('');
    await bindAccountMemory(session);
    unlockInternal(session);
  }

  async function resumeTelegramWidgetSession() {
    var serverSession = await fetchServerSession();
    if (serverSession && (serverSession.provider === 'telegram' || serverSession.provider === 'telegram_tma')) {
      try {
        if (serverSession.telegramId) {
          localStorage.setItem(STORAGE_TG, JSON.stringify({
            id: serverSession.telegramId,
            first_name: (serverSession.displayName || '').split(' ')[0] || '',
            last_name: (serverSession.displayName || '').split(' ').slice(1).join(' ') || '',
            username: (serverSession.email && serverSession.email.charAt(0) === '@')
              ? serverSession.email.slice(1) : '',
            photo_url: serverSession.photoURL || ''
          }));
        }
      } catch (_) {}
      await bindAccountMemory(serverSession);
      unlockInternal(serverSession);
      return true;
    }
    clearTelegramLocalAuth();
    writeTelegramLoginPayload();
    return false;
  }

  function onTelegramWebLogin(user, rawLogin) {
    if (!user || !user.id) return;
    writeTelegramLoginPayload();
    try {
      localStorage.setItem(STORAGE_TG, JSON.stringify(sanitizeTelegramProfile(user)));
    } catch (_) {}
    var session = {
      provider: 'telegram',
      uid: 'tg_' + user.id,
      telegramId: user.id,
      displayName: (user.first_name || '') + (user.last_name ? ' ' + user.last_name : ''),
      username: user.username || '',
      photoURL: user.photo_url || '',
      email: user.username ? '@' + user.username : '',
      telegramLogin: rawLogin || null
    };
    reportSession(session, 'signin').then(function (reported) {
      delete session.telegramLogin;
      if (!reported.ok) {
        setGateError('Telegram sign-in could not be verified. Try again.');
        showWall();
        return null;
      }
      return bindAccountMemory(session);
    }).then(function (ok) {
      if (ok === null) return;
      unlockInternal(session);
    });
  }

  function whenUnlocked(cb) {
    if (state.unlocked) {
      cb(state.session);
      return function () {};
    }
    state.waiters.push(cb);
    return function () {
      var idx = state.waiters.indexOf(cb);
      if (idx !== -1) state.waiters.splice(idx, 1);
    };
  }

  async function init() {
    state.isTMA = isTelegramMiniApp();

    if (authUI && typeof authUI.onAuthenticated === 'function') {
      authUI.onAuthenticated(function (payload) {
        if (payload && payload.isTelegram && payload.user) {
          onTelegramWebLogin(payload.user, payload.loginPayload || payload.raw || null);
          return;
        }
        if (payload && payload.user) {
          handleFirebaseUser(payload.user);
        }
      });
    }

    if (state.isTMA) {
      await handleTelegramNative();
      state.ready = true;
      return state;
    }

    // Resume HttpOnly cookie session before showing the wall.
    var serverSession = await fetchServerSession();
    if (serverSession && serverSession.uid) {
      await bindAccountMemory(serverSession);
      unlockInternal(serverSession);
    } else {
      var resumedTg = await resumeTelegramWidgetSession();
      if (!resumedTg) {
        try { localStorage.removeItem(STORAGE_TG); } catch (_) {}
      }
    }

    if (!state.unlocked) {
      showWall();
      openSignupIntentIfRequested();
    }

    var service = firebaseService || window.ClarioraFirebaseService;
    if (service) {
      service.onAuthStateChanged(function (user) {
        if (user) handleFirebaseUser(user);
        else if (!state.unlocked) lock();
      });
      try {
        await service.init();
        var current = service.getCurrentUser && service.getCurrentUser();
        if (current) {
          await handleFirebaseUser(current);
        } else if (!state.unlocked) {
          showWall();
        }
      } catch (err) {
        console.warn('[AuthGate] Firebase init notice:', err);
        if (!state.unlocked) showWall();
      }
    } else if (!state.unlocked) {
      showWall();
    }

    state.ready = true;
    return state;
  }

  return {
    init: init,
    whenUnlocked: whenUnlocked,
    isUnlocked: function () { return state.unlocked; },
    getSession: function () { return state.session || readCachedSession(); },
    lock: lock,
    onTelegramWebLogin: onTelegramWebLogin,
    storeTelegramLoginPayload: writeTelegramLoginPayload,
    logoutServerSession: logoutServerSession,
    fetchServerSession: fetchServerSession
  };
});
