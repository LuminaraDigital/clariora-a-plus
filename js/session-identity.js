/**
 * js/session-identity.js
 * Bind the signed-in subject to one uid.
 *
 * The header used to paint localStorage clariora_telegram_auth immediately, then
 * Firebase Auth LOCAL persistence (IndexedDB) overwrote it inside onAuthStateChanged.
 * On a shared browser that left a second Google user signed in, reload flipped the
 * display name and /api/v1/auth/session minted a cookie for the wrong subject.
 * Learner keys were also device-global, so that subject's cloud snapshot could
 * replace the other person's progress.
 *
 * Authority: the verified server session wins on boot. A Firebase user who does
 * not match that uid is foreign persistence and must be signed out, not rendered.
 * An explicit sign-in may replace the subject. Learner keys move with the uid.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ClarioraSessionIdentity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var STORAGE_OWNER = 'clariora_storage_owner_uid';
  var STORAGE_SESSION = 'clariora_auth_session_v1';
  var STORAGE_TG = 'clariora_telegram_auth';
  var STORAGE_TG_LOGIN = 'clariora_telegram_login_payload';
  var ACTIVE_ACCOUNT = 'clariora_active_account_id';
  var SYNC_USER = 'clariora_sync_user_id';
  var NS_MARK = 'clariora_ns_';

  var explicitSignIn = false;

  function markExplicitSignIn() {
    explicitSignIn = true;
  }

  function peekExplicitSignIn() {
    return explicitSignIn;
  }

  function consumeExplicitSignIn() {
    var value = explicitSignIn;
    explicitSignIn = false;
    return value;
  }

  function bumpGeneration() {
    var next = (root.__CLARIORA_IDENTITY_GEN || 0) + 1;
    root.__CLARIORA_IDENTITY_GEN = next;
    return next;
  }

  function displayNameFor(subject) {
    if (!subject) return '';
    var name = String(subject.displayName || '').trim();
    if (name) return name;
    var email = String(subject.email || '');
    if (email && email.charAt(0) !== '@' && email.indexOf('@') !== -1) {
      return email.split('@')[0];
    }
    return 'Learner';
  }

  function subjectFromSession(session) {
    if (!session || !session.uid) return null;
    var subject = {
      uid: String(session.uid),
      displayName: session.displayName || '',
      email: session.email || '',
      photoURL: session.photoURL || '',
      provider: session.provider || '',
      telegramId: session.telegramId != null ? session.telegramId : null,
      username: session.username || ''
    };
    subject.displayName = displayNameFor(subject);
    return subject;
  }

  function subjectFromFirebaseUser(user) {
    if (!user || !user.uid) return null;
    var providerId = user.providerData && user.providerData[0] && user.providerData[0].providerId;
    var provider = user.provider || ((providerId === 'google.com') ? 'google' : 'email');
    return subjectFromSession({
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      provider: provider
    });
  }

  /**
   * Boot decision. Telegram localStorage is not an input: it is not a session.
   * explicitSignIn is true only after the person just completed a sign-in action
   * (or a Google redirect returned to this page).
   */
  function resolveBootIdentity(serverSession, firebaseUser, explicitSignInFlag) {
    var server = subjectFromSession(serverSession);
    var firebase = subjectFromFirebaseUser(firebaseUser);
    if (explicitSignInFlag && firebase) {
      return { subject: firebase, dropFirebase: false, reason: 'explicit-firebase' };
    }
    if (server && firebase && server.uid !== firebase.uid) {
      return { subject: server, dropFirebase: true, reason: 'foreign-firebase-persistence' };
    }
    if (server) {
      return { subject: server, dropFirebase: false, reason: 'server-session' };
    }
    if (firebase) {
      return { subject: firebase, dropFirebase: false, reason: 'firebase-resume' };
    }
    return { subject: null, dropFirebase: false, reason: 'anonymous' };
  }

  function isDevicePreferenceKey(key) {
    return key === 'comptia_theme' ||
      key === 'comptia_tutor_mode' ||
      key === 'aplus3_boot_intro_seen_v2' ||
      key === 'aplus3_boot_complete_v1' ||
      key.indexOf('telemetry') !== -1;
  }

  function isLearnerKey(key) {
    if (typeof key !== 'string' || !key) return false;
    if (key.indexOf('clariora_') === 0) return false;
    if (key.indexOf('comptia_database_master') === 0) return false;
    if (isDevicePreferenceKey(key)) return false;
    return key.indexOf('comptia_') === 0 || key.indexOf('aplus3_') === 0;
  }

  function namespaceKey(uid, key) {
    var safe = String(uid || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_');
    return NS_MARK + safe + '__' + key;
  }

  function listKeys(storage) {
    var keys = [];
    if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') {
      return keys;
    }
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  function readJson(storage, key) {
    try {
      var raw = storage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function telegramMatches(tgUser, subject) {
    if (!tgUser || tgUser.id == null || !subject) return false;
    if (subject.telegramId != null && String(subject.telegramId) === String(tgUser.id)) return true;
    if (subject.uid === 'tg_' + tgUser.id) return true;
    return false;
  }

  function parkLiveLearning(storage, uid) {
    var keys = listKeys(storage);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!isLearnerKey(key)) continue;
      var val = storage.getItem(key);
      if (val != null) storage.setItem(namespaceKey(uid, key), val);
      storage.removeItem(key);
    }
  }

  function restoreNamespace(storage, uid) {
    var prefix = namespaceKey(uid, '');
    var keys = listKeys(storage);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.indexOf(prefix) !== 0) continue;
      var live = key.slice(prefix.length);
      if (!live || !isLearnerKey(live)) continue;
      var val = storage.getItem(key);
      if (val != null) storage.setItem(live, val);
    }
  }

  /**
   * Make `subject` the only identity in the live working set.
   * When the owner uid changes, the previous learner keys are parked under
   * clariora_ns_<uid>__ and the next uid's parked keys are restored.
   * Device preferences (theme, tutor, boot flags) stay put.
   */
  function adoptSubject(storage, subject) {
    var bound = subjectFromSession(subject);
    if (!storage || !bound) {
      return { ok: false, clearedForeign: false, displayName: '', uid: '' };
    }
    var prevOwner = '';
    try { prevOwner = storage.getItem(STORAGE_OWNER) || ''; } catch (_) { prevOwner = ''; }
    var clearedForeign = false;

    if (prevOwner && prevOwner !== bound.uid) {
      bumpGeneration();
      parkLiveLearning(storage, prevOwner);
      restoreNamespace(storage, bound.uid);
      clearedForeign = true;
    }

    var tg = readJson(storage, STORAGE_TG);
    if (tg && !telegramMatches(tg, bound)) {
      try {
        storage.removeItem(STORAGE_TG);
        storage.removeItem(STORAGE_TG_LOGIN);
      } catch (_) {}
      clearedForeign = true;
    }

    var cached = readJson(storage, STORAGE_SESSION);
    if (cached && cached.uid && String(cached.uid) !== bound.uid) {
      clearedForeign = true;
    }

    var record = {
      provider: bound.provider || 'unknown',
      uid: bound.uid,
      telegramId: bound.telegramId != null ? bound.telegramId : null,
      displayName: bound.displayName,
      username: bound.username || '',
      photoURL: bound.photoURL || '',
      email: bound.email || ''
    };
    storage.setItem(STORAGE_SESSION, JSON.stringify(record));
    storage.setItem(STORAGE_OWNER, bound.uid);
    storage.setItem(ACTIVE_ACCOUNT, bound.uid);
    if (bound.provider === 'telegram' || bound.provider === 'telegram_tma') {
      storage.setItem(SYNC_USER, bound.uid);
    }

    return {
      ok: true,
      clearedForeign: clearedForeign,
      previousUid: prevOwner,
      uid: bound.uid,
      displayName: bound.displayName
    };
  }

  return {
    STORAGE_OWNER: STORAGE_OWNER,
    STORAGE_SESSION: STORAGE_SESSION,
    STORAGE_TG: STORAGE_TG,
    displayNameFor: displayNameFor,
    subjectFromSession: subjectFromSession,
    subjectFromFirebaseUser: subjectFromFirebaseUser,
    resolveBootIdentity: resolveBootIdentity,
    isLearnerKey: isLearnerKey,
    namespaceKey: namespaceKey,
    adoptSubject: adoptSubject,
    markExplicitSignIn: markExplicitSignIn,
    peekExplicitSignIn: peekExplicitSignIn,
    consumeExplicitSignIn: consumeExplicitSignIn,
    bumpGeneration: bumpGeneration
  };
});
