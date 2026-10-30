/** Telegram WebApp / Login Widget verification. */
import { timingSafeEqualStr } from './api_crypto.js';

/** WebApp session mint: short replay window (stolen initData expires quickly). */
const WEBAPP_AUTH_MAX_AGE_SEC = 3600;
/** Login Widget: Telegram documents up to 24h for widget payloads. */
const WIDGET_AUTH_MAX_AGE_SEC = 86400;
const AUTH_FUTURE_SKEW_SEC = 300;

/**
 * Validates Telegram WebApp initData HMAC-SHA256 signature
 */
async function verifyTelegramInitData(initData, botToken) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  // Replay protection: auth_date is mandatory (Telegram always sends it).
  const authDateStr = params.get('auth_date');
  if (!authDateStr) {
    console.warn('initData rejected: missing auth_date');
    return null;
  }
  const authDate = parseInt(authDateStr, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    isNaN(authDate) ||
    (nowSeconds - authDate) > WEBAPP_AUTH_MAX_AGE_SEC ||
    (authDate - nowSeconds) > AUTH_FUTURE_SKEW_SEC
  ) {
    console.warn('initData rejected: auth_date expired or invalid timestamp');
    return null;
  }

  params.delete('hash');
  const pairs = [];
  for (const [k, v] of params.entries()) {
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  // Production: never trust initData without HMAC verification.
  if (!botToken) {
    console.warn('initData rejected: TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  // WebAppData HMAC validation
  try {
    const enc = new TextEncoder();
    const keySecret = await crypto.subtle.importKey(
      'raw',
      enc.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretKeyBuf = await crypto.subtle.sign('HMAC', keySecret, enc.encode(botToken));
    const signingKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', signingKey, enc.encode(dataCheckString));
    const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (timingSafeEqualStr(hex, hash)) {
      const userRaw = params.get('user');
      return userRaw ? JSON.parse(userRaw) : null;
    }
  } catch (e) {
    console.debug('HMAC verification failure:', e);
  }

  return null;
}

/**
 * Validates Telegram Web Login Widget authorization data
 * https://core.telegram.org/widgets/login#checking-authorization
 */
async function verifyTelegramLoginWidget(data, botToken) {
  if (!data || !data.hash) return null;
  const hash = data.hash;

  // Validate auth_date freshness (within 24 hours for Login Widget)
  const authDate = parseInt(data.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (
    isNaN(authDate) ||
    (now - authDate) > WIDGET_AUTH_MAX_AGE_SEC ||
    (authDate - now) > AUTH_FUTURE_SKEW_SEC
  ) {
    return null;
  }

  // Collect and sort data check string
  const pairs = [];
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'hash' && v !== undefined && v !== null && v !== '') {
      pairs.push(`${k}=${v}`);
    }
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  if (!botToken) {
    console.warn('Telegram login widget rejected: TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  try {
    const enc = new TextEncoder();
    const secretKeyBuf = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
    const signingKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', signingKey, enc.encode(dataCheckString));
    const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (timingSafeEqualStr(hex, hash)) {
      return {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        photo_url: data.photo_url
      };
    }
  } catch (e) {
    console.debug('Telegram login widget HMAC error:', e);
  }
  return null;
}

export { verifyTelegramInitData, verifyTelegramLoginWidget };
