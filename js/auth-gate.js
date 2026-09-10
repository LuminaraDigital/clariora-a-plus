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
    unlocked: true,
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
    // Wall styles removed: Clariora operates value-first with guest access and single-layer auth modal.
  }

  function ensureWall() {
    var existing = document.getElementById(GATE_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    return null;
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
      authUI.openModal({ mode: 'signup' });
    }
  }

  function setGateError(message) {
    if (authUI && typeof authUI.showError === 'function' && message) {
      authUI.showError(message);
    }
  }

  function showWall() {
    // Value-first architecture: Never block cold arrival with a login wall.
    hideWall();
  }

  function hideWall() {
    document.documentElement.classList.remove('clariora-auth-locked');
    var wall = document.getElementById(GATE_ID);
    if (wall && wall.parentNode) wall.parentNode.removeChild(wall);
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
    state.unlocked = true; // Guest mode stays usable
    state.lastReportKey = '';
    writeCachedSession(null);
    clearTelegramLocalAuth();
    hideWall();
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
      localStorage.setItem(STORAGE_TG, JSON.stringify(u));
    } catch (_) {}
    var reported = await reportSession(session, 'signin');
    if (!reported.ok) {
      console.warn('[AuthGate] Telegram session reporting notice; continuing with local TMA session.');
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

    openSignupIntentIfRequested();

    var service = firebaseService || window.ClarioraFirebaseService;
    if (service) {
      service.onAuthStateChanged(function (user) {
        if (user) handleFirebaseUser(user);
        else lock();
      });
      try {
        await service.init();
        var current = service.getCurrentUser && service.getCurrentUser();
        if (current) {
          await handleFirebaseUser(current);
        }
      } catch (err) {
        console.warn('[AuthGate] Firebase init notice:', err);
      }
    }

    state.ready = true;
    state.unlocked = true;
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
