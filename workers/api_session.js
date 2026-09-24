/**
 * Signed HttpOnly session cookies for the edge BFF.
 * Tokens never need to live in localStorage; the Worker mints and verifies cookies.
 */
import { timingSafeEqualStr } from './api_crypto.js';

export const SESSION_COOKIE = 'clariora_session';
export const ADMIN_COOKIE = 'clariora_admin';

const SESSION_TTL_SEC = 60 * 60 * 12; // 12 hours
const ADMIN_TTL_SEC = 60 * 30; // 30 minutes

function b64urlEncode(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecodeToBytes(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlEncodeJson(obj) {
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(obj)));
}

function b64urlDecodeJson(str) {
  const text = new TextDecoder().decode(b64urlDecodeToBytes(str));
  return JSON.parse(text);
}

export function getSessionSecret(env) {
  const dedicated = env && typeof env.AUTH_SESSION_SECRET === 'string'
    ? env.AUTH_SESSION_SECRET.trim()
    : '';
  if (dedicated) return dedicated;
  const isProd = env && (env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production');
  // Production must use a dedicated session secret (do not share ADMIN_API_KEY).
  if (isProd) return '';
  const fallback = env && typeof env.ADMIN_API_KEY === 'string' ? env.ADMIN_API_KEY.trim() : '';
  return fallback;
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

export async function signPayload(secret, payload) {
  if (!secret) throw new Error('AUTH_SESSION_SECRET (or ADMIN_API_KEY) is required to sign sessions');
  const body = b64urlEncodeJson(payload);
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

export async function verifySignedToken(secret, token) {
  if (!secret || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = await hmacSign(secret, body);
  if (!timingSafeEqualStr(sig, expected)) return null;
  let payload;
  try {
    payload = b64urlDecodeJson(body);
  } catch (_) {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) return null;
  if (typeof payload.iat === 'number' && payload.iat > now + 60) return null;
  return payload;
}

export function parseCookieHeader(cookieHeader) {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return out;
  const chunks = cookieHeader.split(';');
  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i].trim();
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    out[name] = decodeURIComponent(value);
  }
  return out;
}

export function readCookie(request, name) {
  const cookies = parseCookieHeader(request.headers.get('Cookie') || '');
  return cookies[name] || '';
}

function buildCookie(name, value, maxAgeSec, secure) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, maxAgeSec | 0)}`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name, secure) {
  return buildCookie(name, '', 0, secure);
}

export function isSecureRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.protocol === 'https:') return true;
    const proto = (request.headers.get('X-Forwarded-Proto') || '').toLowerCase();
    return proto === 'https';
  } catch (_) {
    return true;
  }
}

export async function mintUserSessionToken(env, identity) {
  const secret = getSessionSecret(env);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    typ: 'user',
    uid: identity.uid || '',
    provider: identity.provider || 'unknown',
    email: identity.email || '',
    displayName: identity.displayName || '',
    photoURL: identity.photoURL || '',
    telegramId: identity.telegramId != null ? Number(identity.telegramId) : null,
    // Persist so Firebase-linked Telegram ids survive cookie resume (Stars invoice, etc.).
    telegramVerified: identity.telegramVerified === true ||
      identity.provider === 'telegram' ||
      identity.provider === 'telegram_tma',
    iat: now,
    exp: now + SESSION_TTL_SEC
  };
  if (!payload.uid) throw new Error('uid required for session');
  return signPayload(secret, payload);
}

export async function mintAdminSessionToken(env) {
  const secret = getSessionSecret(env);
  const now = Math.floor(Date.now() / 1000);
  return signPayload(secret, {
    typ: 'admin',
    role: 'admin',
    iat: now,
    exp: now + ADMIN_TTL_SEC
  });
}

export function userSessionCookieHeader(token, request) {
  return buildCookie(SESSION_COOKIE, token, SESSION_TTL_SEC, isSecureRequest(request));
}

export function adminSessionCookieHeader(token, request) {
  return buildCookie(ADMIN_COOKIE, token, ADMIN_TTL_SEC, isSecureRequest(request));
}

export async function readUserSession(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifySignedToken(getSessionSecret(env), token);
  if (!payload || payload.typ !== 'user' || !payload.uid) return null;
  return payload;
}

export async function readAdminSession(request, env) {
  const token = readCookie(request, ADMIN_COOKIE);
  if (!token) return null;
  const payload = await verifySignedToken(getSessionSecret(env), token);
  if (!payload || payload.typ !== 'admin' || payload.role !== 'admin') return null;
  return payload;
}

/**
 * Resolve caller identity: HttpOnly session cookie, then Telegram, then Firebase bearer/body token.
 */
export async function resolveRequestAuth(request, env, body, verifyFirebase, verifyTelegramInit, verifyTelegramLogin) {
  const session = await readUserSession(request, env);
  if (session) {
    return {
      ok: true,
      source: 'cookie',
      uid: session.uid,
      provider: session.provider || 'unknown',
      email: session.email || '',
      displayName: session.displayName || '',
      photoURL: session.photoURL || '',
      telegramId: (session.telegramId != null && Number.isFinite(Number(session.telegramId)) &&
        (session.provider === 'telegram' || session.provider === 'telegram_tma' || session.telegramVerified === true))
        ? Number(session.telegramId)
        : null,
      firebaseUid: session.provider === 'telegram' || session.provider === 'telegram_tma'
        ? null
        : session.uid
    };
  }

  const initDataRaw = request.headers.get('X-Telegram-Init-Data')
    || (body && body.initData)
    || '';
  if (initDataRaw && env.TELEGRAM_BOT_TOKEN && verifyTelegramInit) {
    const tgUser = await verifyTelegramInit(initDataRaw, env.TELEGRAM_BOT_TOKEN);
    if (tgUser && tgUser.id) {
      return {
        ok: true,
        source: 'telegram_init',
        uid: 'tg_' + tgUser.id,
        provider: 'telegram_tma',
        email: tgUser.username ? '@' + tgUser.username : '',
        displayName: ((tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '')).trim(),
        photoURL: tgUser.photo_url || '',
        telegramId: tgUser.id,
        firebaseUid: null,
        tgUser
      };
    }
  }

  if (body && body.telegramLogin && verifyTelegramLogin && env.TELEGRAM_BOT_TOKEN) {
    const tgUser = await verifyTelegramLogin(body.telegramLogin, env.TELEGRAM_BOT_TOKEN);
    if (tgUser && tgUser.id) {
      return {
        ok: true,
        source: 'telegram_login',
        uid: 'tg_' + tgUser.id,
        provider: 'telegram',
        email: tgUser.username ? '@' + tgUser.username : '',
        displayName: ((tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '')).trim(),
        photoURL: tgUser.photo_url || '',
        telegramId: tgUser.id,
        firebaseUid: null,
        tgUser
      };
    }
  }

  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const idToken = bearer || (body && body.idToken) || '';
  if (idToken && verifyFirebase) {
    const fbUser = await verifyFirebase(idToken, env);
    if (fbUser) {
      const uid = fbUser.localId || fbUser.user_id || fbUser.uid || fbUser.sub || '';
      if (uid) {
        const providerInfo = fbUser.providerUserInfo && fbUser.providerUserInfo[0];
        const provider = (providerInfo && providerInfo.providerId === 'google.com') ? 'google' : 'email';
        return {
          ok: true,
          source: 'firebase_token',
          uid,
          provider,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.name || '',
          photoURL: fbUser.photoUrl || fbUser.picture || '',
          telegramId: null,
          firebaseUid: uid,
          fbUser
        };
      }
    }
  }

  return { ok: false };
}
