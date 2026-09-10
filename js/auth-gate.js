/**
 * js/auth-gate.js
 * Login wall / gated product access for Clariora.
 * Browser users must sign in (Google, email, or Telegram Login).
 * Telegram Mini App users authenticate via native WebApp initData (no second login).
 * Unlock is internal-only; resume requires server verification.
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

  var state = {
    ready: false,
    unlocked: false,
    isTMA: false,
    session: null,
    waiters: [],
    lastReportKey: ''
  };

  function isTelegramMiniApp() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      return !!(tg && typeof tg.initData === 'string' && tg.initData.length > 0);
    } catch (_) {
      return false;
    }
  }

  function readTelegramLoginPayload() {
    try {
      var raw = localStorage.getItem(STORAGE_TG_LOGIN);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.id || !data.hash || !data.auth_date) return null;
      return data;
    } catch (_) {
      return null;
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
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function writeCachedSession(session) {
    state.session = session;
    try {
      if (session) localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
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
      '#' + GATE_ID + ' .gate-note {',
      '  margin: 16px 0 0; font-size: 12px; color: #8B95A8; text-align: center;',
      '}',
      '#' + GATE_ID + ' .gate-note a { color: #D4AF37; }',
      '#' + GATE_ID + ' .gate-error {',
      '  margin: 12px 0 0; font-size: 12px; line-height: 1.4; color: #FCA5A5; text-align: center;',
      '}',
      '#' + GATE_ID + ' .gate-warn {',
      '  margin: 12px 0 0; font-size: 12px; line-height: 1.4; color: #FCD34D; text-align: center;',
      '}',
      'html.clariora-auth-locked, html.clariora-auth-locked body {',
      '  overflow: hidden !important;',
      '}',
      'html.clariora-auth-locked #aplusBootIntro { visibility: hidden !important; }',
      'html.clariora-auth-locked #onboardingOverlay,',
      'html.clariora-auth-locked .onboarding-overlay,',
      'html.clariora-auth-locked [data-onboarding] {',
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

    var isElectron = !!(window.electronAPI || (window.location && window.location.protocol === 'file:'));
    var offlineBtnHtml = isElectron
      ? '    <button type="button" class="btn" id="gateOfflineBtn" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);color:#94A3B8;border-radius:8px;padding:10px;font-size:13px;cursor:pointer;">Continue as Local Technician (Offline)</button>'
      : '';

    var wall = document.createElement('div');
    wall.id = GATE_ID;
    wall.setAttribute('role', 'dialog');
    wall.setAttribute('aria-modal', 'true');
    wall.setAttribute('aria-labelledby', 'clarioraGateTitle');
    wall.hidden = true;
    wall.innerHTML = [
      '<div class="gate-card">',
      '  <p class="gate-eyebrow">Gated access</p>',
      '  <h1 id="clarioraGateTitle">Sign in to open Clariora</h1>',
      '  <p class="gate-lead">Your practice history, readiness, and streaks stay tied to your account so you can continue on any device.</p>',
      '  <div class="gate-actions">',
      '    <button type="button" class="btn-google" id="gateGoogleBtn">Continue with Google</button>',
      '    <button type="button" class="btn-telegram" id="gateTelegramBtn">Log in with Telegram</button>',
      '    <button type="button" class="btn-auth-submit" id="gateEmailBtn">Sign in with email</button>',
      '    <button type="button" class="btn-auth-submit" id="gateSignupBtn" style="background:transparent;border:1px solid rgba(212,175,55,0.55);color:#D4AF37;">Create account</button>',
      offlineBtnHtml,
      '  </div>',
      '  <p class="gate-note" id="gateStatusNote">Login required. Free practice after sign-in. AI coach uses daily quotas; upgrade with Telegram Stars in the Mini App or TON Blockchain.',
      '    Prefer Telegram? <a href="https://t.me/ClarioraBot/app" target="_blank" rel="noopener">Open the Mini App</a>.',
      '  </p>',
      '  <p class="gate-error" id="gateErrorNote" hidden></p>',
      '</div>'
    ].join('\n');
    document.body.appendChild(wall);

    var offlineBtn = document.getElementById('gateOfflineBtn');
    if (offlineBtn) {
      offlineBtn.addEventListener('click', function () {
        var offlineSession = {
          provider: 'offline',
          uid: 'local_technician',
          displayName: 'Local Technician',
          email: 'offline@local'
        };
        unlockInternal(offlineSession);
      });
    }

    document.getElementById('gateGoogleBtn').addEventListener('click', function () {
      setGateError('');
      if (authUI && authUI.openModal) {
        authUI.openModal({ mode: 'signin', wall: true, prefer: 'google' });
      }
      if (authUI && authUI.handleGoogleSignIn) authUI.handleGoogleSignIn();
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
    state.unlocked = false;
    state.lastReportKey = '';
    writeCachedSession(null);
    clearTelegramLocalAuth();
    showWall();
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
      var res = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
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

  async function bindAccountMemory(session) {
    if (!session || !session.uid) return;
    try {
      localStorage.setItem('clariora_active_account_id', session.uid);
    } catch (_) {}

    var service = firebaseService || window.ClarioraFirebaseService;
    if (service && session.provider !== 'telegram' && session.provider !== 'telegram_tma' &&
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
    if (!reported.ok) {
      if (session.idToken) {
        setGateError('Account sync is delayed. You can study; AI coach needs a healthy connection.');
        await bindAccountMemory(session);
        unlockInternal(session);
        return;
      }
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
      showWall();
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
      localStorage.setItem(STORAGE_TG, JSON.stringify(u));
    } catch (_) {}
    var reported = await reportSession(session, 'signin');
    if (!reported.ok) {
      if (session.initData) {
        setGateError('Telegram sync delayed. You can study; AI coach needs a healthy connection.');
        await bindAccountMemory(session);
        unlockInternal(session);
        return;
      }
      showWall();
      return;
    }
    setGateError('');
    await bindAccountMemory(session);
    unlockInternal(session);
  }

  async function verifyTelegramWidgetPayload(payload) {
    if (!payload || !payload.hash) return null;
    try {
      var res = await fetch('/api/v1/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var result = await res.json().catch(function () { return {}; });
      if (!res.ok || !result.success || !result.user) return null;
      if (result.entitlement) {
        try {
          window.__CLARIORA_SERVER_ENTITLEMENT__ = result.entitlement;
          window.dispatchEvent(new CustomEvent('clariora:entitlement-updated'));
        } catch (_) {}
      }
      return result.user;
    } catch (_) {
      return null;
    }
  }

  async function resumeTelegramWidgetSession() {
    var payload = readTelegramLoginPayload();
    if (!payload) {
      clearTelegramLocalAuth();
      return false;
    }
    var user = await verifyTelegramWidgetPayload(payload);
    if (!user) {
      clearTelegramLocalAuth();
      return false;
    }
    try {
      localStorage.setItem(STORAGE_TG, JSON.stringify(user));
    } catch (_) {}
    var session = {
      provider: 'telegram',
      uid: 'tg_' + user.id,
      telegramId: user.id,
      displayName: (user.first_name || '') + (user.last_name ? ' ' + user.last_name : ''),
      username: user.username || '',
      photoURL: user.photo_url || '',
      email: user.username ? '@' + user.username : '',
      telegramLogin: payload
    };
    var reported = await reportSession(session, 'signin');
    if (!reported.ok) {
      clearTelegramLocalAuth();
      return false;
    }
    await bindAccountMemory(session);
    unlockInternal(session);
    return true;
  }

  function onTelegramWebLogin(user, rawLogin) {
    if (!user || !user.id) return;
    if (rawLogin && rawLogin.hash) writeTelegramLoginPayload(rawLogin);
    var session = {
      provider: 'telegram',
      uid: 'tg_' + user.id,
      telegramId: user.id,
      displayName: (user.first_name || '') + (user.last_name ? ' ' + user.last_name : ''),
      username: user.username || '',
      photoURL: user.photo_url || '',
      email: user.username ? '@' + user.username : '',
      telegramLogin: rawLogin || readTelegramLoginPayload()
    };
    reportSession(session, 'signin').then(function (reported) {
      if (!reported.ok) {
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
      return state;
    }

    var resumedTg = await resumeTelegramWidgetSession();
    if (!resumedTg) {
      // Stale profile-only cache must not unlock the wall.
      try { localStorage.removeItem(STORAGE_TG); } catch (_) {}
    }

    if (!state.unlocked) {
      showWall();
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
    storeTelegramLoginPayload: writeTelegramLoginPayload
  };
});
