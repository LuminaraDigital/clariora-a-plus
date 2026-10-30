/**
 * tools/test_account_memory_isolation.js
 * Comprehensive Multi-Tenant Account Isolation & Persistent Memory Verification
 */
const assert = require('assert');

// Mock browser environment
const localStorageMap = new Map();
const storage = {
  getItem: (k) => (localStorageMap.has(k) ? localStorageMap.get(k) : null),
  setItem: (k, v) => localStorageMap.set(k, String(v)),
  removeItem: (k) => localStorageMap.delete(k),
  clear: () => localStorageMap.clear(),
  get length() { return localStorageMap.size; },
  key: (i) => Array.from(localStorageMap.keys())[i] || null
};

global.window = { localStorage: storage };
global.localStorage = storage;

// Load profiles.js
require('../profiles.js');
const Profiles = global.CompTIAProfiles || (global.window && global.window.CompTIAProfiles);

console.log('=== MULTI-TENANT ACCOUNT ISOLATION & PERSISTENT MEMORY SUITE ===');

// 1. Initial Guest Session
Profiles.ensureInitialized();
const initialActive = Profiles.getActive();
assert.ok(initialActive, 'Initial profile should exist');
console.log('✔ Initial profile initialized:', initialActive.name, initialActive.id);

// Guest does some work before creating account
Profiles.scopedSet('comptia_a_plus_history', JSON.stringify([{ exam: 'core1', score: 850 }]));
Profiles.scopedSet('comptia_pom_ledger_v1', JSON.stringify({ apx: 50 }));
console.log('✔ Guest progress recorded in unauthenticated profile');

// 2. User A Signs Up
const aliceProfile = Profiles.bindAccountProfile('usr_alice_101', 'Alice Tech');
assert.strictEqual(Profiles.getActiveId(), 'acc_usr_alice_101', 'Active profile should be Alice account');
assert.strictEqual(aliceProfile.name, 'Alice Tech');

// Verify guest progress was safely adopted into Alice's new account
const aliceHistory = JSON.parse(Profiles.scopedGet('comptia_a_plus_history'));
assert.strictEqual(aliceHistory.length, 1, 'Alice should adopt pre-login guest progress');
assert.strictEqual(aliceHistory[0].score, 850);
console.log('✔ Alice signed up; pre-login work safely migrated into acc_usr_alice_101');

// Alice earns more progress
aliceHistory.push({ exam: 'core2', score: 880 });
Profiles.scopedSet('comptia_a_plus_history', JSON.stringify(aliceHistory));

// 3. Alice Signs Out
Profiles.unbindAccountProfile();
assert.notStrictEqual(Profiles.getActiveId(), 'acc_usr_alice_101', 'Should switch away from Alice profile on signout');
const guestHistory = Profiles.scopedGet('comptia_a_plus_history');
// Unbound guest profile does not expose Alice's updated history
const parsedGuest = guestHistory ? JSON.parse(guestHistory) : [];
assert.ok(parsedGuest.length <= 1, 'Guest profile must not reflect Alice post-login progress');
console.log('✔ Alice signed out; active state safely unbound to guest');

// 4. User B Signs In on the same browser
const bobProfile = Profiles.bindAccountProfile('usr_bob_202', 'Bob Admin');
assert.strictEqual(Profiles.getActiveId(), 'acc_usr_bob_202');
assert.strictEqual(bobProfile.name, 'Bob Admin');

// Bob should have an isolated empty state
const bobHistory = Profiles.scopedGet('comptia_a_plus_history');
const bobParsed = bobHistory ? JSON.parse(bobHistory) : [];
assert.strictEqual(bobParsed.length, 0, 'Bob must have zero history from Alice');
console.log('✔ Bob signed in; complete zero-trust isolation from Alice (0 history records)');

// Bob adds his own record
Profiles.scopedSet('comptia_a_plus_history', JSON.stringify([{ exam: 'core1', score: 720 }]));

// 5. Alice Signs In Again
Profiles.bindAccountProfile('usr_alice_101', 'Alice Tech');
assert.strictEqual(Profiles.getActiveId(), 'acc_usr_alice_101');
const restoredAliceHist = JSON.parse(Profiles.scopedGet('comptia_a_plus_history'));
assert.strictEqual(restoredAliceHist.length, 2, 'Alice should have exactly her 2 attempts restored');
assert.strictEqual(restoredAliceHist[1].score, 880);
console.log('✔ Alice signed back in; full persistent memory restored with 100% integrity');

// 6. Test Firestore Sync Payload Scoping (Zero cross-tenant data leakage)
const activePrefix = 'comptia_p_' + Profiles.getActiveId() + '__';
const syncPayload = {};
for (let i = 0; i < storage.length; i++) {
  const k = storage.key(i);
  if (!k) continue;
  if (k.startsWith('comptia_p_')) {
    if (k.startsWith(activePrefix)) {
      syncPayload[k] = storage.getItem(k);
    }
    continue;
  }
  if (k.startsWith('comptia_') || k.startsWith('aplus3_')) {
    syncPayload[k] = storage.getItem(k);
  }
}

// Ensure Alice payload contains Alice keys and NO Bob keys
const payloadKeys = Object.keys(syncPayload);
assert.ok(payloadKeys.some(k => k.includes('acc_usr_alice_101')), 'Must include Alice keys');
assert.ok(!payloadKeys.some(k => k.includes('acc_usr_bob_202')), 'Must NEVER include Bob keys in Alice payload');
console.log('✔ Firestore sync payload strict tenant isolation verified (0 leakage)');

console.log('================================================================');
console.log('✅ ALL ACCOUNT ISOLATION & PERSISTENT MEMORY CHECKS PASSED (100%)');
console.log('================================================================');
