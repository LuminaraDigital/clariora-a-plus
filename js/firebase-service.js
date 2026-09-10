/**
 * js/firebase-service.js
 * Clariora Firebase Authentication & Real-time Learning Database Service
 * Connects to project 'clariora' for Google Sign-in, Email/Password, and Firestore.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./firebase-config'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./firebase-config'));
  } else {
    root.ClarioraFirebaseService = factory(root.ClarioraFirebaseConfig);
  }
})(typeof self !== 'undefined' ? self : this, function (config) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var CDN_BASE = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';

  var state = {
    initialized: false,
    initPromise: null,
    app: null,
    auth: null,
    db: null,
    modules: null,
    currentUser: null,
    firestoreAvailable: false,
    authSubscribers: [],
    firestoreUnsubscribe: null
  };

  /**
   * Dynamically loads Firebase ESM modules from official CDN.
   * Gracefully catches network failures for offline capability.
   */
  async function loadModules() {
    if (state.modules) return state.modules;

    try {
      var appModule = await import(CDN_BASE + 'firebase-app.js');
      var authModule = await import(CDN_BASE + 'firebase-auth.js');
      var firestoreModule = await import(CDN_BASE + 'firebase-firestore.js');

      state.modules = {
        app: appModule,
        auth: authModule,
        firestore: firestoreModule
      };
      return state.modules;
    } catch (err) {
      console.warn('[Firebase] Could not load Firebase SDK (offline or blocked):', err);
      return null;
    }
  }

  /**
   * Initializes Firebase App, Auth, and Firestore
   */
  async function init() {
    if (state.initPromise) return state.initPromise;

    state.initPromise = (async function () {
      var resolvedConfig = config || (typeof window !== 'undefined' ? window.ClarioraFirebaseConfig : null);
      if (!resolvedConfig || !resolvedConfig.apiKey) {
        console.warn('[Firebase] Configuration missing or incomplete.');
        return state;
      }

      var mods = await loadModules();
      if (!mods) {
        state.initialized = false;
        return state;
      }

      try {
        state.app = mods.app.initializeApp(resolvedConfig);
        state.auth = mods.auth.getAuth(state.app);

        // Firestore initialization
        try {
          state.db = mods.firestore.getFirestore(state.app);
          state.firestoreAvailable = true;
        } catch (fsErr) {
          console.warn('[Firebase] Firestore initialization notice:', fsErr);
          state.firestoreAvailable = false;
        }

        // Listen for authentication changes
        mods.auth.onAuthStateChanged(state.auth, function (user) {
          state.currentUser = user;
          notifyAuthSubscribers(user);

          // Real-time synchronization when user logs in
          if (user && state.firestoreAvailable) {
            ensureUserProfile({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              provider: (user.providerData && user.providerData[0] && user.providerData[0].providerId) || 'password'
            }).catch(function (e) {
              console.debug('[Firebase] profile upsert notice:', e);
            });
            setupRealtimeLearningSync(user.uid);
          } else if (!user && state.firestoreUnsubscribe) {
            state.firestoreUnsubscribe();
            state.firestoreUnsubscribe = null;
          }
        });

        state.initialized = true;
        console.log('[Firebase] Initialized for project:', resolvedConfig.projectId);
      } catch (initErr) {
        console.warn('[Firebase] Initialization error:', initErr);
      }

      return state;
    })();

    return state.initPromise;
  }

  function notifyAuthSubscribers(user) {
    for (var i = 0; i < state.authSubscribers.length; i++) {
      try {
        state.authSubscribers[i](user);
      } catch (subErr) {
        console.error('[Firebase] Auth subscriber error:', subErr);
      }
    }
  }

  /**
   * Sign in with Google (Popup with Redirect fallback)
   */
  async function signInWithGoogle() {
    await init();
    if (!state.auth || !state.modules) {
      throw new Error('Firebase Auth is not available');
    }

    var authMod = state.modules.auth;
    var provider = new authMod.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      var result = await authMod.signInWithPopup(state.auth, provider);
      return result.user;
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        console.log('[Firebase] Popup blocked or closed; trying redirect...');
        return authMod.signInWithRedirect(state.auth, provider);
      }
      throw err;
    }
  }

  /**
   * Sign in with Email and Password
   */
  async function signInWithEmail(email, password) {
    await init();
    if (!state.auth || !state.modules) {
      throw new Error('Firebase Auth is not available');
    }

    var authMod = state.modules.auth;
    var result = await authMod.signInWithEmailAndPassword(state.auth, email, password);
    return result.user;
  }

  /**
   * Sign up with Email, Password, and Display Name
   */
  async function signUpWithEmail(email, password, displayName) {
    await init();
    if (!state.auth || !state.modules) {
      throw new Error('Firebase Auth is not available');
    }

    var authMod = state.modules.auth;
    var result = await authMod.createUserWithEmailAndPassword(state.auth, email, password);
    if (displayName && result.user) {
      try {
        await authMod.updateProfile(result.user, { displayName: displayName });
      } catch (pErr) {
        console.debug('[Firebase] Display name update notice:', pErr);
      }
    }
    return result.user;
  }

  /**
   * Send password reset email
   */
  async function sendPasswordReset(email) {
    await init();
    if (!state.auth || !state.modules) {
      throw new Error('Firebase Auth is not available');
    }
    var authMod = state.modules.auth;
    return authMod.sendPasswordResetEmail(state.auth, email);
  }

  /**
   * Sign out current user
   */
  async function signOutUser() {
    await init();
    if (state.firestoreUnsubscribe) {
      state.firestoreUnsubscribe();
      state.firestoreUnsubscribe = null;
    }
    if (state.auth && state.modules) {
      await state.modules.auth.signOut(state.auth);
    }
  }

  /**
   * Register auth state change listener
   */
  function onAuthStateChanged(callback) {
    state.authSubscribers.push(callback);
    if (state.currentUser !== undefined) {
      callback(state.currentUser);
    }
    return function unsubscribe() {
      var idx = state.authSubscribers.indexOf(callback);
      if (idx !== -1) state.authSubscribers.splice(idx, 1);
    };
  }

  /**
   * Get current authenticated user
   */
  function getCurrentUser() {
    return state.currentUser || (state.auth ? state.auth.currentUser : null);
  }

  /* ============================================================
     Real-time Learning State Synchronization (Firestore)
     ============================================================ */

  /**
   * Upsert per-account profile doc so each learner has durable identity + timestamps.
   * Path: users/{uid}
   */
  async function ensureUserProfile(sessionOrUser) {
    await init();
    if (!state.db || !state.modules || !state.firestoreAvailable) return false;
    var uid = sessionOrUser && (sessionOrUser.uid || sessionOrUser.id);
    if (!uid) return false;

    var fsMod = state.modules.firestore;
    var docRef = fsMod.doc(state.db, 'users', uid);
    var now = new Date().toISOString();
    var existing = null;
    try {
      var snap = await fsMod.getDoc(docRef);
      if (snap.exists()) existing = snap.data();
    } catch (_) {}

    var payload = {
      uid: uid,
      email: (sessionOrUser && sessionOrUser.email) || (existing && existing.email) || '',
      displayName: (sessionOrUser && sessionOrUser.displayName) || (existing && existing.displayName) || '',
      photoURL: (sessionOrUser && sessionOrUser.photoURL) || (existing && existing.photoURL) || '',
      provider: (sessionOrUser && sessionOrUser.provider) || (existing && existing.provider) || 'unknown',
      lastSignInAt: now,
      updatedAt: now
    };
    if (!existing || !existing.createdAt) payload.createdAt = now;
    if (!existing) payload.signupAt = now;

    try {
      await fsMod.setDoc(docRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase] profile save notice:', err.message);
      return false;
    }
  }

  /**
   * Listen to real-time learner updates from Firestore
   */
  function setupRealtimeLearningSync(uid) {
    if (!state.db || !state.modules || !state.firestoreAvailable) return;
    var fsMod = state.modules.firestore;

    try {
      var docRef = fsMod.doc(state.db, 'users', uid, 'learning', 'state');
      if (state.firestoreUnsubscribe) {
        state.firestoreUnsubscribe();
      }

      state.firestoreUnsubscribe = fsMod.onSnapshot(docRef, function (docSnap) {
        if (docSnap.exists()) {
          var cloudData = docSnap.data();
          applyRemoteToLocal(cloudData);
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('clariora:cloud-sync-received', { detail: cloudData }));
          }
        }
      }, function (err) {
        console.warn('[Firebase] Firestore real-time listener notice:', err.message);
      });
    } catch (err) {
      console.warn('[Firebase] Error configuring Firestore listener:', err);
    }
  }

  var syncDebounceTimer = null;
  function scheduleSyncToFirestore() {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(function () {
      syncLocalToFirestore();
    }, 1500);
  }

  /**
   * Syncs local learning database to Firestore
   */
  async function syncLocalToFirestore() {
    var user = getCurrentUser();
    if (!user || !state.db || !state.modules || !state.firestoreAvailable) return false;

    var payload = {};
    if (typeof localStorage !== 'undefined') {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.startsWith('comptia_') || k.startsWith('aplus3_'))) {
          if (k === 'comptia_database_master_v3' || k.indexOf('telemetry') !== -1 || k.indexOf('groq') !== -1) continue;
          payload[k] = localStorage.getItem(k);
        }
      }
    }

    return saveLearnerProgress({
      data: payload,
      syncedAt: new Date().toISOString()
    });
  }

  /**
   * Applies remote Firestore snapshot to local database
   */
  function applyRemoteToLocal(remotePayload) {
    if (!remotePayload || !remotePayload.data) return;
    var remoteData = remotePayload.data;
    var changed = false;

    for (var k in remoteData) {
      if (Object.prototype.hasOwnProperty.call(remoteData, k)) {
        var val = remoteData[k];
        try {
          if (localStorage.getItem(k) !== val) {
            localStorage.setItem(k, val);
            changed = true;
          }
        } catch (_) {}
      }
    }

    if (changed && typeof window !== 'undefined' && window.CompTIADatabase && typeof window.CompTIADatabase.init === 'function') {
      try {
        window.CompTIADatabase.init();
      } catch (_) {}
    }
  }

  /**
   * Save learner progress to Firestore
   */
  async function saveLearnerProgress(progressData) {
    var user = getCurrentUser();
    if (!user || !state.db || !state.modules || !state.firestoreAvailable) return false;

    var fsMod = state.modules.firestore;
    try {
      var docRef = fsMod.doc(state.db, 'users', user.uid, 'learning', 'state');
      var payload = Object.assign({}, progressData, {
        lastSyncedAt: new Date().toISOString(),
        email: user.email || '',
        displayName: user.displayName || ''
      });

      await fsMod.setDoc(docRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase] Firestore save notice:', err.message);
      return false;
    }
  }

  /**
   * Load learner progress from Firestore
   */
  async function loadLearnerProgress() {
    var user = getCurrentUser();
    if (!user || !state.db || !state.modules || !state.firestoreAvailable) return null;

    var fsMod = state.modules.firestore;
    try {
      var docRef = fsMod.doc(state.db, 'users', user.uid, 'learning', 'state');
      var snap = await fsMod.getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.warn('[Firebase] Firestore load notice:', err.message);
      return null;
    }
  }

  return {
    init: init,
    isInitialized: function () { return state.initialized; },
    isAvailable: function () { return !!state.auth; },
    getCurrentUser: getCurrentUser,
    onAuthStateChanged: onAuthStateChanged,
    signInWithGoogle: signInWithGoogle,
    signInWithEmail: signInWithEmail,
    signUpWithEmail: signUpWithEmail,
    sendPasswordReset: sendPasswordReset,
    signOutUser: signOutUser,
    ensureUserProfile: ensureUserProfile,
    saveLearnerProgress: saveLearnerProgress,
    loadLearnerProgress: loadLearnerProgress,
    syncLocalToFirestore: syncLocalToFirestore,
    scheduleSyncToFirestore: scheduleSyncToFirestore,
    applyRemoteToLocal: applyRemoteToLocal
  };
});
