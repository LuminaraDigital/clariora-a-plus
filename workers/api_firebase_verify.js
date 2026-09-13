/**
 * Firebase ID token verification via Google securetoken JWKS.
 * Falls back to Identity Toolkit accounts:lookup when FIREBASE_WEB_API_KEY is set.
 */
import { timingSafeEqualStr } from './api_crypto.js';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const JWKS_TTL_MS = 60 * 60 * 1000;

let jwksCache = { keys: null, fetchedAt: 0 };

function b64urlToBytes(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJwtPart(part) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
}

function getProjectId(env) {
  return (env && (env.FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT)) || 'clariora';
}

async function loadJwks() {
  const now = Date.now();
  if (jwksCache.keys && (now - jwksCache.fetchedAt) < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URL, {
    cf: { cacheTtl: 3600, cacheEverything: true }
  });
  if (!res.ok) throw new Error('Failed to fetch Firebase JWKS');
  const data = await res.json();
  jwksCache = { keys: data.keys || [], fetchedAt: now };
  return jwksCache.keys;
}

async function importRsaKey(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Verify a Firebase ID token locally with JWKS.
 * Returns a normalized user-like object compatible with Identity Toolkit lookup shape.
 */
export async function verifyFirebaseIdTokenJwks(idToken, env) {
  if (!idToken || typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  let header;
  let payload;
  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch (_) {
    return null;
  }

  if (!header || header.alg !== 'RS256' || !header.kid) return null;

  const projectId = getProjectId(env);
  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload !== 'object') return null;
  if (payload.exp && Number(payload.exp) < now) return null;
  if (payload.iat && Number(payload.iat) > now + 60) return null;
  if (!timingSafeEqualStr(String(payload.aud || ''), projectId)) return null;
  const expectedIss = `https://securetoken.google.com/${projectId}`;
  if (!timingSafeEqualStr(String(payload.iss || ''), expectedIss)) return null;
  if (!payload.sub || typeof payload.sub !== 'string') return null;

  try {
    const keys = await loadJwks();
    const jwk = keys.find((k) => k && k.kid === header.kid);
    if (!jwk) return null;
    const key = await importRsaKey(jwk);
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);
    const ok = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      signature,
      data
    );
    if (!ok) return null;
  } catch (_) {
    return null;
  }

  return {
    localId: payload.sub,
    user_id: payload.sub,
    uid: payload.sub,
    sub: payload.sub,
    email: payload.email || '',
    emailVerified: !!payload.email_verified,
    displayName: payload.name || '',
    photoUrl: payload.picture || '',
    providerUserInfo: payload.firebase && payload.firebase.sign_in_provider
      ? [{ providerId: payload.firebase.sign_in_provider }]
      : []
  };
}

/** Legacy Identity Toolkit lookup (optional fallback). */
export async function verifyFirebaseIdTokenLookup(idToken, apiKey) {
  if (!idToken || !apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.users && data.users[0] ? data.users[0] : null;
  } catch (_) {
    return null;
  }
}

/**
 * Preferred verifier: JWKS first, then Identity Toolkit if FIREBASE_WEB_API_KEY is present.
 */
export async function verifyFirebaseIdToken(idToken, envOrApiKey) {
  const env = (typeof envOrApiKey === 'string')
    ? { FIREBASE_WEB_API_KEY: envOrApiKey }
    : (envOrApiKey || {});

  const viaJwks = await verifyFirebaseIdTokenJwks(idToken, env);
  if (viaJwks) return viaJwks;

  const apiKey = env.FIREBASE_WEB_API_KEY || '';
  if (apiKey) return verifyFirebaseIdTokenLookup(idToken, apiKey);
  return null;
}
