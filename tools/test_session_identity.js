/**
 * Regression: login A, reload, still A; switch to B, no A learner data.
 * Run: node tools/test_session_identity.js
 *
 * Repro names are the 2026-09-29 production audit:
 * signed-in subject "Tundji Williams-Fulwood" must not become
 * "Luminara Digital Agency" because Firebase IndexedDB still holds that account.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const id = require('../js/session-identity.js');

let failures = 0;

function check(name, ok, detail) {
  if (ok) {
    console.log('PASS ' + name);
  } else {
    failures++;
    console.log('FAIL ' + name + (detail ? ' :: ' + detail : ''));
  }
}

function createStorage(seed) {
  const map = Object.assign({}, seed || {});
  return {
    get length() {
      return Object.keys(map).length;
    },
    key: function (i) {
      return Object.keys(map)[i] || null;
    },
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null;
    },
    setItem: function (k, v) {
      map[k] = String(v);
    },
    removeItem: function (k) {
      delete map[k];
    }
  };
}

const TUNDJI = {
  uid: 'uid_tundji',
  provider: 'google',
  displayName: 'Tundji Williams-Fulwood',
  email: 'tundji@example.com',
  photoURL: ''
};

const AGENCY = {
  uid: 'uid_luminara',
  provider: 'google',
  displayName: 'Luminara Digital Agency',
  email: 'studio@luminara.example',
  photoURL: ''
};

function testReloadKeepsA() {
  const storage = createStorage();
  const first = id.adoptSubject(storage, TUNDJI);
  storage.setItem('aplus3_history', JSON.stringify([{ id: 'attempt-A', who: 'Tundji' }]));
  storage.setItem('comptia_profiles_meta_v1', JSON.stringify({ name: 'Tundji Williams-Fulwood' }));
  storage.setItem('comptia_theme', 'dark');

  const decision = id.resolveBootIdentity(TUNDJI, AGENCY, false);
  check('reload: foreign Firebase is dropped', decision.dropFirebase === true, decision.reason);
  check('reload: reason is foreign persistence', decision.reason === 'foreign-firebase-persistence');
  check(
    'reload: display name stays Tundji Williams-Fulwood',
    decision.subject && decision.subject.displayName === 'Tundji Williams-Fulwood',
    decision.subject && decision.subject.displayName
  );
  check('reload: uid stays A', decision.subject && decision.subject.uid === TUNDJI.uid);

  const again = id.adoptSubject(storage, decision.subject);
  check('reload: adopt keeps the same owner', again.uid === TUNDJI.uid && again.previousUid === TUNDJI.uid);
  check(
    'reload: attempt A still in the live history',
    storage.getItem('aplus3_history').indexOf('attempt-A') !== -1
  );
  check(
    'reload: profile meta still names A',
    storage.getItem('comptia_profiles_meta_v1').indexOf('Tundji Williams-Fulwood') !== -1
  );
  const cached = JSON.parse(storage.getItem(id.STORAGE_SESSION));
  check('reload: session cache uid is A', cached.uid === TUNDJI.uid);
  check('reload: session cache name is A', cached.displayName === 'Tundji Williams-Fulwood');
}

function testSwitchDropsAData() {
  const storage = createStorage();
  id.adoptSubject(storage, TUNDJI);
  storage.setItem('aplus3_history', JSON.stringify([{ id: 'attempt-A' }]));
  storage.setItem('comptia_a_plus_history', JSON.stringify([{ id: 'attempt-A-scoped' }]));
  storage.setItem('comptia_profiles_meta_v1', JSON.stringify({ name: 'Tundji Williams-Fulwood' }));
  storage.setItem('comptia_theme', 'dark');
  storage.setItem(id.STORAGE_TG, JSON.stringify({
    id: 4242,
    first_name: 'Luminara',
    last_name: 'Digital Agency'
  }));

  const switched = id.adoptSubject(storage, AGENCY);
  check('switch: display name is B', switched.displayName === 'Luminara Digital Agency', switched.displayName);
  check('switch: owner is B', storage.getItem(id.STORAGE_OWNER) === AGENCY.uid);
  check('switch: live history does not contain attempt A', storage.getItem('aplus3_history') == null);
  check('switch: live exam history does not contain attempt A', storage.getItem('comptia_a_plus_history') == null);
  check('switch: live profile meta is not A', storage.getItem('comptia_profiles_meta_v1') == null);

  const parked = storage.getItem(id.namespaceKey(TUNDJI.uid, 'aplus3_history'));
  check('switch: attempt A is parked under A', parked && parked.indexOf('attempt-A') !== -1, parked);
  check('switch: theme stays on the device', storage.getItem('comptia_theme') === 'dark');
  check('switch: foreign telegram profile is removed', storage.getItem(id.STORAGE_TG) == null);

  const cached = JSON.parse(storage.getItem(id.STORAGE_SESSION));
  check('switch: session cache is B, not A', cached.uid === AGENCY.uid && cached.displayName === 'Luminara Digital Agency');

  id.adoptSubject(storage, TUNDJI);
  check(
    'switch back: attempt A is restored',
    storage.getItem('aplus3_history') && storage.getItem('aplus3_history').indexOf('attempt-A') !== -1
  );
  check('switch back: B history is not left in the live key', storage.getItem('aplus3_history').indexOf('attempt-B') === -1);
}

function testExplicitSignInMayReplace() {
  const decision = id.resolveBootIdentity(TUNDJI, AGENCY, true);
  check('explicit sign-in selects the Firebase subject', decision.reason === 'explicit-firebase');
  check('explicit sign-in does not drop that Firebase user', decision.dropFirebase === false);
  check(
    'explicit sign-in display name is the account just chosen',
    decision.subject.displayName === 'Luminara Digital Agency'
  );
}

function testFirebaseResumeWithoutCookie() {
  const decision = id.resolveBootIdentity(null, AGENCY, false);
  check('cookie absent: persisted Firebase user is the subject', decision.reason === 'firebase-resume');
  check('cookie absent: Firebase is not dropped', decision.dropFirebase === false);
  check('cookie absent: name comes from that Firebase user', decision.subject.displayName === 'Luminara Digital Agency');
}

function testAnonymousIgnoresTelegramCache() {
  const decision = id.resolveBootIdentity(null, null, false);
  check('no server session and no Firebase: anonymous', decision.reason === 'anonymous');
  check('anonymous has no display name subject', decision.subject == null);
}

function testEmptyDisplayNameFallsBackToSameSubjectEmail() {
  const decision = id.resolveBootIdentity(
    { uid: 'uid_tundji', email: 'tundji@example.com', displayName: '' },
    { uid: 'uid_luminara', displayName: 'Luminara Digital Agency', email: 'studio@luminara.example' },
    false
  );
  check(
    'empty A name uses A email, not the foreign display name',
    decision.subject.displayName === 'tundji' && decision.dropFirebase === true,
    decision.subject && decision.subject.displayName
  );
}

function testSourceGuards() {
  const root = path.resolve(__dirname, '..');
  const ui = fs.readFileSync(path.join(root, 'js', 'firebase-auth-ui.js'), 'utf8');
  const gate = fs.readFileSync(path.join(root, 'js', 'auth-gate.js'), 'utf8');
  const service = fs.readFileSync(path.join(root, 'js', 'firebase-service.js'), 'utf8');
  const db = fs.readFileSync(path.join(root, 'js', 'database_memory_engine.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  check('auth ui exposes bindSubject', ui.indexOf('function bindSubject') !== -1);
  check('auth ui does not paint telegram cache as tgName', ui.indexOf('displayName: tgName') === -1);
  check('auth ui marks explicit Google sign-in', ui.indexOf('markExplicitSignIn') !== -1);
  check('gate resolves boot identity', gate.indexOf('resolveBootIdentity') !== -1);
  check('gate drops foreign Firebase persistence', gate.indexOf('dropForeignFirebase') !== -1);
  check('gate adopts the subject before learner surfaces refresh', gate.indexOf('adoptSubject') !== -1);
  check('firestore apply is owner-scoped', service.indexOf('clariora_storage_owner_uid') !== -1);
  check('database rebind exists for subject switches', db.indexOf('rebindFromLocalStorage') !== -1);
  check('index loads session-identity before the auth gate', index.indexOf('js/session-identity.js') !== -1 &&
    index.indexOf('js/session-identity.js') < index.indexOf('js/auth-gate.js'));
}

testReloadKeepsA();
testSwitchDropsAData();
testExplicitSignInMayReplace();
testFirebaseResumeWithoutCookie();
testAnonymousIgnoresTelegramCache();
testEmptyDisplayNameFallsBackToSameSubjectEmail();
testSourceGuards();

if (failures) {
  console.error('test_session_identity: ' + failures + ' failed');
  process.exit(1);
}
console.log('test_session_identity: OK');
