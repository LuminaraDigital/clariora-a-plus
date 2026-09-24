/**
 * Unit tests for signed session cookies (workers/api_session.js).
 * Run: node tools/test_auth_session.js
 */
import {
  signPayload,
  verifySignedToken,
  mintUserSessionToken,
  parseCookieHeader,
  userSessionCookieHeader,
  clearCookie,
  SESSION_COOKIE
} from '../workers/api_session.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

async function main() {
  const secret = 'test-session-secret-do-not-use-in-prod-0123456789abcdef';
  const env = { AUTH_SESSION_SECRET: secret };

  const token = await signPayload(secret, {
    typ: 'user',
    uid: 'abc123',
    provider: 'google',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  });
  assert(token.includes('.'), 'token has payload.sig shape');

  const ok = await verifySignedToken(secret, token);
  assert(ok && ok.uid === 'abc123', 'valid token verifies');

  const bad = await verifySignedToken(secret, token.slice(0, -2) + 'xx');
  assert(bad === null, 'tampered token rejected');

  const expired = await signPayload(secret, {
    typ: 'user',
    uid: 'x',
    iat: 1,
    exp: 2
  });
  assert((await verifySignedToken(secret, expired)) === null, 'expired rejected');

  const minted = await mintUserSessionToken(env, {
    uid: 'tg_99',
    provider: 'telegram',
    telegramId: 99,
    email: '@demo',
    displayName: 'Demo'
  });
  const payload = await verifySignedToken(secret, minted);
  assert(payload && payload.telegramId === 99, 'minted user session carries telegramId');
  assert(payload.telegramVerified === true, 'telegram sessions persist telegramVerified');

  const linked = await mintUserSessionToken(env, {
    uid: 'firebase_uid_1',
    provider: 'google',
    telegramId: 55,
    telegramVerified: true,
    email: 'a@b.c',
    displayName: 'Linked'
  });
  const linkedPayload = await verifySignedToken(secret, linked);
  assert(linkedPayload.telegramVerified === true && linkedPayload.telegramId === 55,
    'Firebase-linked telegram id survives cookie mint');

  const prodEnv = { ENVIRONMENT: 'production', ADMIN_API_KEY: 'admin-only-key-not-for-sessions' };
  let prodMintFailed = false;
  try {
    await mintUserSessionToken(prodEnv, { uid: 'x', provider: 'google' });
  } catch (_) {
    prodMintFailed = true;
  }
  assert(prodMintFailed, 'production must refuse minting without AUTH_SESSION_SECRET');

  const req = { url: 'https://clariora.com.au/app', headers: { get: () => null } };
  const cookie = userSessionCookieHeader(minted, req);
  assert(cookie.includes('HttpOnly'), 'cookie is HttpOnly');
  assert(cookie.includes('Secure'), 'cookie is Secure on https');
  assert(cookie.includes('SameSite=Lax'), 'cookie is SameSite=Lax');
  assert(cookie.startsWith(SESSION_COOKIE + '='), 'cookie name correct');

  const cleared = clearCookie(SESSION_COOKIE, true);
  assert(cleared.includes('Max-Age=0'), 'clear cookie expires immediately');

  const parsed = parseCookieHeader(`${SESSION_COOKIE}=abc; other=1`);
  assert(parsed[SESSION_COOKIE] === 'abc' && parsed.other === '1', 'cookie header parses');

  console.log('test_auth_session: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
