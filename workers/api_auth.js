/** Auth session recording, Firebase token lookup, admin gate, and session cookies. */
import { timingSafeEqualStr } from './api_crypto.js';
import { verifyTelegramInitData, verifyTelegramLoginWidget } from './api_telegram.js';
import { verifyFirebaseIdToken as verifyFirebaseIdTokenCore } from './api_firebase_verify.js';
import {
  mintUserSessionToken,
  mintAdminSessionToken,
  userSessionCookieHeader,
  adminSessionCookieHeader,
  clearCookie,
  SESSION_COOKIE,
  ADMIN_COOKIE,
  readAdminSession,
  isSecureRequest,
  getSessionSecret
} from './api_session.js';

/**
 * Ensure HTML served under /app resolves relative assets against site root.
 */
export function withAppBase(response) {
  if (!response || !response.ok) return response;
  const ct = (response.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.includes('text/html')) return response;
  return response.text().then((html) => {
    let out = html;
    if (!/<base\s/i.test(out)) {
      out = out.replace(/<head([^>]*)>/i, '<head$1><base href="/">');
    }
    const headers = new Headers(response.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    headers.delete('content-length');
    return new Response(out, { status: response.status, statusText: response.statusText, headers });
  });
}

export async function verifyFirebaseIdToken(idToken, envOrApiKey) {
  return verifyFirebaseIdTokenCore(idToken, envOrApiKey);
}

export async function isAdminAuthorized(request, env) {
  const adminSession = await readAdminSession(request, env);
  if (adminSession) return true;

  const key = env.ADMIN_API_KEY || env.AUTH_ADMIN_KEY || '';
  if (!key) return false;
  const headerKey = request.headers.get('X-Admin-Key') || '';
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  // One-shot header/bearer still accepted for bootstrap of admin cookie exchange.
  return timingSafeEqualStr(headerKey, key) || timingSafeEqualStr(bearer, key);
}

export async function issueAdminSession(request, env) {
  const key = env.ADMIN_API_KEY || env.AUTH_ADMIN_KEY || '';
  if (!key) {
    return { ok: false, status: 503, error: 'ADMIN_API_KEY is not configured' };
  }
  if (!getSessionSecret(env)) {
    return { ok: false, status: 503, error: 'AUTH_SESSION_SECRET (or ADMIN_API_KEY) required for admin sessions' };
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    body = {};
  }
  const provided = (body && body.adminKey) || request.headers.get('X-Admin-Key') || '';
  if (!timingSafeEqualStr(String(provided), key)) {
    return { ok: false, status: 401, error: 'Invalid admin credentials' };
  }

  const token = await mintAdminSessionToken(env);
  return {
    ok: true,
    cookie: adminSessionCookieHeader(token, request),
    expiresIn: 30 * 60
  };
}

export function clearAuthCookies(request) {
  const secure = isSecureRequest(request);
  return [
    clearCookie(SESSION_COOKIE, secure),
    clearCookie(ADMIN_COOKIE, secure)
  ];
}

export function clearUserSessionCookie(request) {
  return clearCookie(SESSION_COOKIE, isSecureRequest(request));
}

export function clearAdminSessionCookie(request) {
  return clearCookie(ADMIN_COOKIE, isSecureRequest(request));
}

export async function recordAuthSession(body, env, request) {
  const eventType = (body && body.event === 'signup') ? 'signup' : 'signin';
  // ZERO-TRUST IDENTITY: uid, email, displayName and photoURL are seeded empty and may only
  // be filled from a cryptographically verified source below. body.provider is a presentation
  // hint, never an identity. Seeding these from the body let a caller holding a token with no
  // email claim (anonymous, phone, or custom auth) post an arbitrary address, which the
  // users-table upsert then merges ON CONFLICT(email) into a stranger's row.
  let provider = (body && body.provider) || 'unknown';
  let uid = '';
  let email = '';
  let displayName = '';
  let photoURL = '';
  let telegramId = null;
  let telegramVerified = false;

  if (body && body.initData && env.TELEGRAM_BOT_TOKEN) {
    const tgUser = await verifyTelegramInitData(body.initData, env.TELEGRAM_BOT_TOKEN);
    if (!tgUser) return { ok: false, status: 401, error: 'Invalid Telegram initData' };
    provider = provider === 'telegram_tma' ? 'telegram_tma' : 'telegram';
    telegramId = tgUser.id;
    telegramVerified = true;
    uid = 'tg_' + tgUser.id;
    displayName = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    email = tgUser.username ? '@' + tgUser.username : '';
    photoURL = tgUser.photo_url || '';
  } else if (body && body.telegramLogin) {
    const tgUser = await verifyTelegramLoginWidget(body.telegramLogin, env.TELEGRAM_BOT_TOKEN);
    if (!tgUser) return { ok: false, status: 401, error: 'Invalid or expired Telegram login signature' };
    provider = 'telegram';
    telegramId = tgUser.id;
    telegramVerified = true;
    uid = 'tg_' + tgUser.id;
    displayName = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    email = tgUser.username ? '@' + tgUser.username : '';
    photoURL = tgUser.photo_url || '';
  } else if (body && body.idToken) {
    const fbUser = await verifyFirebaseIdToken(body.idToken, env);
    if (!fbUser) return { ok: false, status: 401, error: 'Invalid Firebase ID token' };
    uid = fbUser.localId || fbUser.uid || fbUser.sub || '';
    if (!uid) return { ok: false, status: 401, error: 'Verified token carries no subject identifier' };
    email = fbUser.email || '';
    displayName = fbUser.displayName || fbUser.name || '';
    photoURL = fbUser.photoUrl || fbUser.picture || '';
    if (!provider || provider === 'unknown') {
      provider = (fbUser.providerUserInfo && fbUser.providerUserInfo[0] && fbUser.providerUserInfo[0].providerId === 'google.com')
        ? 'google'
        : 'email';
    }
    // Check if a verified Telegram link already exists in DB for this UID.
    // Client-supplied body.telegramId is strictly ignored to prevent account takeover.
    if (env.DB && uid) {
      try {
        const linked = await env.DB.prepare('SELECT telegram_id FROM auth_accounts WHERE uid = ?').bind(uid).first();
        if (linked && linked.telegram_id && Number.isFinite(Number(linked.telegram_id))) {
          telegramId = Number(linked.telegram_id);
          telegramVerified = true;
        }
      } catch (_) {}
    }
  } else {
    return {
      ok: false,
      status: 401,
      error: 'Firebase idToken, Telegram initData, or Telegram login payload required'
    };
  }

  let sessionCookie = null;
  if (request && getSessionSecret(env) && uid) {
    try {
      const token = await mintUserSessionToken(env, {
        uid,
        provider,
        email,
        displayName,
        photoURL,
        telegramId: telegramVerified ? telegramId : null,
        telegramVerified
      });
      sessionCookie = userSessionCookieHeader(token, request);
    } catch (err) {
      console.warn('[Auth] session cookie mint failed:', err && err.message ? err.message : err);
    }
  }

  if (!env.DB) {
    return {
      ok: true,
      account: { uid, email, displayName, provider },
      event: eventType,
      sessionCookie
    };
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS auth_accounts (
      uid TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      photo_url TEXT,
      telegram_id INTEGER,
      signup_at TIMESTAMP,
      last_signin_at TIMESTAMP,
      signin_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      event TEXT NOT NULL,
      provider TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const existing = await env.DB.prepare('SELECT uid, signup_at, signin_count FROM auth_accounts WHERE uid = ?')
    .bind(uid).first();

  const resolvedEvent = (!existing && eventType === 'signin') ? 'signup' : eventType;

  if (!existing) {
    await env.DB.prepare(`
      INSERT INTO auth_accounts (
        uid, provider, email, display_name, photo_url, telegram_id,
        signup_at, last_signin_at, signin_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)
    `).bind(uid, provider, email, displayName, photoURL, telegramVerified ? telegramId : null).run();
  } else {
    await env.DB.prepare(`
      UPDATE auth_accounts SET
        provider = ?,
        email = COALESCE(NULLIF(?, ''), email),
        display_name = COALESCE(NULLIF(?, ''), display_name),
        photo_url = COALESCE(NULLIF(?, ''), photo_url),
        telegram_id = COALESCE(?, telegram_id),
        last_signin_at = CURRENT_TIMESTAMP,
        signin_count = signin_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE uid = ?
    `).bind(provider, email, displayName, photoURL, telegramVerified ? telegramId : null, uid).run();
  }

  if (telegramVerified && telegramId && Number.isFinite(telegramId)) {
    await env.DB.prepare(`
      INSERT INTO telegram_users (telegram_id, username, first_name, last_name, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      telegramId,
      (email && email.startsWith('@')) ? email.slice(1) : '',
      (displayName || '').split(' ')[0] || '',
      (displayName || '').split(' ').slice(1).join(' ') || ''
    ).run();
  }

  if (email && !email.startsWith('@')) {
    await env.DB.prepare(`
      INSERT INTO users (id, email, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `).bind(uid, email).run().catch(() => {});
  }

  await env.DB.prepare(`
    INSERT INTO auth_events (uid, event, provider, email, display_name)
    VALUES (?, ?, ?, ?, ?)
  `).bind(uid, resolvedEvent, provider, email, displayName).run();

  const account = await env.DB.prepare('SELECT * FROM auth_accounts WHERE uid = ?').bind(uid).first();
  return { ok: true, account, event: resolvedEvent, sessionCookie };
}

export async function listAuthAccounts(db, limit) {
  if (!db) return { accounts: [], events: [] };
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_accounts (
      uid TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      photo_url TEXT,
      telegram_id INTEGER,
      signup_at TIMESTAMP,
      last_signin_at TIMESTAMP,
      signin_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      event TEXT NOT NULL,
      provider TEXT NOT NULL,
      email TEXT,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const accounts = await db.prepare(`
    SELECT uid, provider, email, display_name, photo_url, telegram_id,
           signup_at, last_signin_at, signin_count, created_at, updated_at
    FROM auth_accounts
    ORDER BY COALESCE(last_signin_at, created_at) DESC
    LIMIT ?
  `).bind(limit).all();

  const events = await db.prepare(`
    SELECT id, uid, event, provider, email, display_name, created_at
    FROM auth_events
    ORDER BY id DESC
    LIMIT ?
  `).bind(limit).all();

  return {
    accounts: (accounts && accounts.results) || [],
    events: (events && events.results) || []
  };
}

export { mintUserSessionToken, userSessionCookieHeader };
