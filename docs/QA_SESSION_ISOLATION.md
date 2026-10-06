# Session isolation QA (Phase A)

Date: 2026-09-30

Production symptom (UX audit 2026-09-29, clariora.com.au): after a reload while signed in, the header display name changed from Tundji Williams-Fulwood to Luminara Digital Agency.

## Root cause

Two identity stores on the same origin were both allowed to paint the header and to mint the session.

1. `js/firebase-auth-ui.js` drew the header from `localStorage.clariora_telegram_auth` before any session check. That cache is not the authenticated subject.
2. Firebase Auth keeps the last Google user in IndexedDB (LOCAL persistence). On reload, `onAuthStateChanged` replaced the header with that user's `displayName`.
3. `js/auth-gate.js` resumed the HttpOnly cookie from `GET /api/v1/auth/me`, then called the same Firebase user handler. If IndexedDB still held a different Google account, the client `POST /api/v1/auth/session` and the worker minted a new cookie for that account. The display name in the cookie was whatever profile the client submitted. The claim was not mis-read. It was minted for the wrong subject.
4. Learner keys (`comptia_*`, `aplus3_*`, and the IndexedDB snapshot `CompTIA_A_Plus_Database`) were not scoped by user id. `clariora_active_account_id` was written and never checked. A cloud snapshot for the Firebase user could overwrite the other person's history and profile meta.

Luminara Digital Agency is not a hard-coded label. It is the Google display name left in Firebase persistence on the shared audit browser. The signed-in subject (cookie and/or the name shown before reload) was a different account.

There is no separate "wrong JWT field" bug in the worker. The client told the worker the Firebase user was the session.

## Repro (before this fix)

Use one browser profile. Do not clear site data between steps.

1. Sign in at clariora.com.au with the Google account whose display name is Luminara Digital Agency. Confirm the header shows that name. Firebase writes that user to IndexedDB for this origin.
2. Sign in on the same origin as a different person (Telegram, or another account) so the header shows Tundji Williams-Fulwood. Leave the agency Google user in Firebase persistence. A sign-out that only cleared the Telegram key, or a second identity written beside the IndexedDB user, is enough.
3. Reload the app.
4. The header paints the first cached name, then changes to Luminara Digital Agency. Progress can follow the Firebase user's cloud blob because learner keys are shared.

Private window, single account: reload keeps that account, because cookie uid and Firebase uid match. The flip needs two identities in one browser profile.

## Fix

- Boot authority is the verified server session. The header binds to that subject's display name and uid only.
- If IndexedDB Firebase uid differs, the client signs that Firebase user out and does not mint a cookie for them.
- An explicit sign-in (or the return from Google redirect) may replace the subject.
- On a uid change, live learner keys are parked under `clariora_ns_<previousUid>__` and the next uid's keys are restored. Theme, tutor mode, and boot flags stay on the device.
- Firestore apply and upload run only when the Firebase uid equals `clariora_storage_owner_uid`.
- Telegram `localStorage` is not a session. A profile that does not match the subject is removed. It is not drawn.

## Automated check

```bash
node tools/test_session_identity.js
```

The script covers: login A, reload with a foreign Firebase user, still A; switch to B, live history and profile meta do not contain A's attempts; switching back restores A's parked history.

## Checklist: sign out and clear site data

Already-mixed browsers cannot be unmixed reliably. If this browser was used for more than one Clariora account before the fix, do this once, then sign in as one person.

1. Open the account chip and choose Sign out. That signs out Firebase, clears the Clariora session cookie, and clears the Telegram profile cache for this origin.
2. Clear site data for `clariora.com.au` so leftover IndexedDB and localStorage are gone.
   - Chrome: Settings, Privacy and security, Cookies and other site data, See all site data and permissions. Search `clariora.com.au`. Clear data (cookies, local storage, and IndexedDB).
   - Firefox: Settings, Privacy and Security, Cookies and Site Data, Manage Data. Remove `clariora.com.au`.
   - Safari: Settings, Privacy, Manage Website Data. Remove `clariora.com.au`.
3. Close every tab on clariora.com.au. Open a new tab and sign in as one account.
4. Confirm the header name. Reload. The same name and account must still be shown.
5. Open Progress. Attempts must belong to that account. If they do not, stop and clear site data again before another sign-in. Do not keep testing on a mixed store.

Sign out covers this browser profile only. It does not sign out other browsers, other devices, or other accounts in the Google account chooser. On the next Google sign-in, pick the intended account. A shared QA machine should use one browser profile per tester, or clear site data when the tester changes.

## Pass bar

- Reload while signed in as A: header still shows A's display name. It does not switch to another account stored in IndexedDB.
- Sign in as B on that same browser: header shows B. A's history and profile meta are not in the live keys.
- Sign out, then clear site data, is the recovery step for browsers that already mixed agency and learner cookies.
