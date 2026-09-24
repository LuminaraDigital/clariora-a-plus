/**
 * Clariora Cloudflare Edge Worker API
 * Domain: clariora.com.au
 * Route: /api/v1/*
 *
 * Edge services provided:
 * 1. /api/v1/auth/telegram        - Telegram Login Widget verification (+ HttpOnly session cookie)
 * 2. /api/v1/auth/session         - Record signup / sign-in (Firebase + Telegram) + session cookie
 * 2b. /api/v1/auth/me|/logout     - Session introspection and teardown
 * 2c. /api/v1/auth/admin/session  - Exchange ADMIN_API_KEY for short-lived admin cookie
 * 3. /api/v1/auth/accounts        - Admin list of accounts and recent auth events
 * 4. /api/v1/sync                 - Cross-device learner state delta sync
 * 5. /api/v1/items/report         - Question problem & ambiguity reporting
 * 6. /api/v1/items/stats          - Community item difficulty & discrimination stats
 * 6b. /api/v1/items/telemetry     - Anonymous item outcome ingest (upserts item_stats_cache)
 * 7. /api/v1/coach                - Gated multi-provider AI gateway (budgets, triage, tools)
 * 7b. /api/v1/coach/stream        - SSE streaming coach (paid tiers)
 * 7c. /api/v1/coach/jobs          - Pro async exam review packs + DLQ
 * 7d. /api/v1/memory/promote      - Promote Ghost Coach confusion pairs / weak objectives to D1
 * 8. /api/v1/billing/stars/invoice- Telegram Stars (XTR) Invoice generation
 * 9. /api/v1/billing/entitlement - Resolve paid tier from verified identity
 * 10. /api/v1/telegram/webhook    - Telegram Bot Webhook (Commands, Pre-checkout, Successful payment)
 * 11. /api/v1/health|/ready       - Liveness and readiness probes
 *
 * Identity plane: Firebase Auth (web) + Telegram HMAC (TMA/widget). Custom magic-link auth is retired.
 */

import {
  CoachRateLimiter,
  enforceDualKeyLimit,
  rateLimitHeaders
} from './coach_rate_limiter.js';
import { listCircuits } from './circuit_breaker.js';
import {
  featuresForTier,
  getTierPolicy,
  FREE_SURFACE,
  normalizeTier
} from './tier_policy.js';
import {
  enqueueCoachJob,
  getCoachJob,
  processNextCoachJob,
  buildExamReviewPack,
  ensureJobTables
} from './coach_jobs.js';
import { handleCoachRequest } from './coach_handler.js';
import { promoteGhostCoachTelemetry } from './agent_memory.js';
import { ingestItemTelemetryBatch } from './item_stats.js';

import {
  withAppBase,
  isAdminAuthorized,
  verifyFirebaseIdToken,
  recordAuthSession,
  listAuthAccounts,
  issueAdminSession,
  clearUserSessionCookie,
  clearAdminSessionCookie,
  mintUserSessionToken,
  userSessionCookieHeader
} from './api_auth.js';
import {
  STARS_PRODUCTS,
  getStarsProduct,
  parseStarsInvoicePayload,
  resolveStarsGrant,
  validateStarsPreCheckout,
  validateStarsSuccessfulPayment
} from './api_stars.js';
import { timingSafeEqualStr } from './api_crypto.js';
import { verifyTelegramInitData, verifyTelegramLoginWidget } from './api_telegram.js';
import { resolveRequestAuth, getSessionSecret } from './api_session.js';
import {
  resolveUserEntitlement,
  incrementFreeAiUsage,
  ensureAuthAccountAiColumns,
  resolveFirebaseEntitlement,
  incrementFirebaseFreeAiUsage,
  decrementProPreviewTokens
} from './api_entitlement_store.js';
import {
  executeNvidiaNim,
  executeOllama,
  executeOpenRouter,
  executeGroq,
  executeWorkersAi
} from './api_ai_providers.js';

/** Explicit public API routes. Everything else under /api/v1 requires auth or is admin/webhook gated. */
const PUBLIC_API_ROUTES = [
  { method: 'GET', path: '/api/v1/health' },
  { method: 'GET', path: '/api/v1/live' },
  { method: 'GET', path: '/api/v1/ready' },
  { method: 'GET', path: '/api/v1/items/stats' },
  { method: 'POST', path: '/api/v1/items/telemetry' },
  { method: 'POST', path: '/api/v1/auth/session' },
  { method: 'POST', path: '/api/v1/auth/telegram' },
  { method: 'POST', path: '/api/v1/auth/admin/session' },
  { method: 'POST', path: '/api/v1/auth/logout' },
  { method: 'POST', path: '/api/v1/auth/admin/logout' },
  { method: 'GET', path: '/api/v1/auth/me' },
  { method: 'POST', path: '/api/v1/items/report' },
  { method: 'POST', path: '/api/v1/telegram/webhook' }
];

function isPublicApiRoute(method, path) {
  return PUBLIC_API_ROUTES.some((r) => r.method === method && r.path === path);
}

function withSetCookies(response, cookies) {
  if (!cookies || !cookies.length) return response;
  const headers = new Headers(response.headers);
  for (let i = 0; i < cookies.length; i++) {
    if (cookies[i]) headers.append('Set-Cookie', cookies[i]);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
export function resolveEffectiveTierUpgrade(existingUser, newTier, newExpiresAt) {
  const currentTier = existingUser ? (existingUser.tier || 'free') : 'free';
  const currentExpiresAt = existingUser ? (existingUser.tier_expires_at || null) : null;
  const now = Date.now();

  // Lifetime is forever - never downgrade
  if (currentTier === 'lifetime') {
    return { tier: 'lifetime', expiresAt: null };
  }

  // If new purchase is lifetime, grant lifetime
  if (newTier === 'lifetime') {
    return { tier: 'lifetime', expiresAt: null };
  }

  // Check if current subscription is still active
  const currentIsActive = currentTier !== 'free' && (currentExpiresAt === null || currentExpiresAt > now);

  if (currentIsActive) {
    // If user currently has active pro_monthly and buys daily_pass, keep pro_monthly
    if (currentTier === 'pro_monthly' && newTier === 'daily_pass') {
      return { tier: 'pro_monthly', expiresAt: currentExpiresAt };
    }
    // If extending same tier
    if (currentTier === newTier && currentExpiresAt && newExpiresAt) {
      const remainingMs = Math.max(0, currentExpiresAt - now);
      const addedMs = newExpiresAt - now;
      return { tier: newTier, expiresAt: now + remainingMs + addedMs };
    }
    // If upgrading from daily_pass to pro_monthly
    if (currentTier === 'daily_pass' && newTier === 'pro_monthly') {
      return { tier: 'pro_monthly', expiresAt: newExpiresAt };
    }
  }

  return { tier: newTier, expiresAt: newExpiresAt };
}

export { CoachRateLimiter };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Strict CORS allowlist for clariora.com.au, telegram webviews, pages, and local dev
    const ALLOWED_ORIGINS = [
      'https://clariora.com.au',
      'https://www.clariora.com.au',
      'https://comptia-a-plus-master.pages.dev',
      'https://web.telegram.org'
    ];
    // Loopback origins are echoed back with Allow-Credentials only outside production.
    // In production any page a victim loads from a local dev server or a localhost-bound
    // desktop app would otherwise be a fully credentialed cross-origin caller.
    const allowLoopbackOrigins = !(env && (env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production'));
    let resolvedOrigin = 'https://clariora.com.au';
    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
        /^https:\/\/([a-zA-Z0-9-]+\.)?telegram\.org$/.test(origin) ||
        (allowLoopbackOrigins && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')));
      if (isAllowed) {
        resolvedOrigin = origin;
      }
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': resolvedOrigin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Telegram-Init-Data, X-Admin-Key',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const path = url.pathname;

    // Crawl files: force correct Content-Type so SPA fallback never indexes as HTML.
    if ((path === '/robots.txt' || path === '/sitemap.xml') && request.method === 'GET' && env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.ok) {
        const body = await assetRes.arrayBuffer();
        const contentType =
          path === '/robots.txt'
            ? 'text/plain; charset=utf-8'
            : 'application/xml; charset=utf-8';
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600, must-revalidate'
          }
        });
      }
    }

    // Exact .html URLs that must stay at their canonical path with HTTP 200.
    // Assets html_handling otherwise 307-redirects to the extensionless path,
    // which breaks Google Search Console, BotFather privacy/terms links, and
    // in-app legal deep links that expect the .html form.
    const exactHtmlPath =
      path === '/privacy.html' ||
      path === '/terms.html' ||
      /^\/google[a-z0-9]+\.html$/i.test(path);
    if (exactHtmlPath && request.method === 'GET' && env.ASSETS) {
      const barePath = path.replace(/\.html$/i, '');
      const assetRes = await env.ASSETS.fetch(new Request(new URL(barePath, request.url), request));
      if (assetRes.ok) {
        const body = await assetRes.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate'
          }
        });
      }
    }

    // Route root to marketing landing page
    if (path === '/' || path === '') {
      return Response.redirect(`${url.origin}/landing/${url.search}`, 302);
    }

    // Route /app to exam simulator app shell (canonical URL without trailing slash)
    if (path === '/app/') {
      return Response.redirect(`${url.origin}/app${url.search}`, 302);
    }
    if (path === '/app') {
      if (env.ASSETS) {
        // Prefer dedicated shell copy so /index.html -> / -> /landing bounce cannot trap users.
        const shellUrl = new URL('/app/index.html', request.url);
        shellUrl.search = url.search;
        let assetRes = await env.ASSETS.fetch(new Request(shellUrl.toString(), request));
        if (assetRes.status === 404) {
          const fallback = new URL('/index.html', request.url);
          fallback.search = url.search;
          assetRes = await env.ASSETS.fetch(new Request(fallback.toString(), request));
        }
        // Follow Assets html_handling redirects internally; never send browser to /
        // because the worker maps / to the marketing landing.
        if (assetRes.status >= 300 && assetRes.status < 400) {
          const loc = assetRes.headers.get('Location') || '';
          const follow = new URL(loc, request.url);
          if (follow.pathname === '/' || follow.pathname === '') {
            const rootIndex = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
            if (rootIndex.ok) return await withAppBase(rootIndex);
          }
          assetRes = await env.ASSETS.fetch(new Request(follow.toString(), request));
        }
        return await withAppBase(assetRes);
      }
      return Response.redirect(`${url.origin}/index.html${url.search}`, 302);
    }

    try {
      // Question bank gating: full questions require Pro; free visitors receive free diagnostic pack
      if (path === '/exam_data.js' && request.method === 'GET') {
        let isProUser = false;
        try {
          const auth = await resolveRequestAuth(
            request, env, {}, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
          );
          if (auth && auth.ok) {
            let ent = null;
            if (auth.telegramId) ent = await resolveUserEntitlement(auth.telegramId, env.DB);
            else if (auth.firebaseUid) ent = await resolveFirebaseEntitlement(auth.firebaseUid, env.DB);
            if (ent && ent.tier && ent.tier !== 'free') isProUser = true;
          }
        } catch (_) {}

        if (isProUser && env.ASSETS) {
          return await env.ASSETS.fetch(request);
        }
        if (env.ASSETS) {
          const freeReq = new Request(new URL('/exam_data_free.js', request.url), request);
          const freeRes = await env.ASSETS.fetch(freeReq);
          if (freeRes.ok) return freeRes;
        }
        return new Response('/* Free Tier Question Bank */ window.COMPTIA_EXAM_DATA = window.COMPTIA_EXAM_DATA || { core1: [], core2: [] };', {
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript; charset=utf-8' }
        });
      }

      // Shard gating: full domain shards require Pro; only diagnostic pack & manifest are public
      if (path.startsWith('/shards/') && request.method === 'GET') {
        const isPublicShard = path === '/shards/diagnostic_pack.json' ||
                              path === '/shards/meta.json' ||
                              path === '/shards/manifest.js';
        if (!isPublicShard) {
          // Gated shards are the question bank in slices. Walking every shard
          // is the cheapest way to export the paid product, and the entitlement
          // check below does nothing to slow that down.
          const shardLimit = await enforceDualKeyLimit(env, request, 'shards', {
            ipPerMinute: 30
          });
          if (!shardLimit.allowed) {
            return new Response(JSON.stringify({
              error: 'RATE_LIMITED',
              message: 'Too many shard requests. Please wait a moment.'
            }), {
              status: 429,
              headers: { ...corsHeaders, ...shardLimit.headers, 'Content-Type': 'application/json' }
            });
          }

          let isProUser = false;
          try {
            const auth = await resolveRequestAuth(
              request, env, {}, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
            );
            if (auth && auth.ok) {
              let ent = null;
              if (auth.telegramId) ent = await resolveUserEntitlement(auth.telegramId, env.DB);
              else if (auth.firebaseUid) ent = await resolveFirebaseEntitlement(auth.firebaseUid, env.DB);
              if (ent && ent.tier && ent.tier !== 'free') isProUser = true;
            }
          } catch (_) {}

          if (!isProUser) {
            return new Response(JSON.stringify({
              error: 'PRO_REQUIRED',
              message: 'A paid pass is required to access full domain question shards.',
              payRails: ['telegram_stars', 'ton_onchain']
            }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
        if (env.ASSETS) {
          return await env.ASSETS.fetch(request);
        }
      }

      // Full question bank API (authenticated Pro users only)
      if (path === '/api/v1/bank/full' && request.method === 'GET') {
        // This path returns the paid asset itself (~2MB). An entitled account
        // looping it is both an egress bill and a clean export of the product,
        // so entitlement alone is not a sufficient gate.
        const bankIpLimit = await enforceDualKeyLimit(env, request, 'bank_full', {
          ipPerMinute: 10
        });
        if (!bankIpLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many bank downloads. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...bankIpLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        const auth = await resolveRequestAuth(
          request, env, {}, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
            status: 401,
            headers: { ...corsHeaders, ...bankIpLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        // Now that identity is proven, meter the caller as well: IP rotation
        // must not buy a fresh bank-download allowance.
        const bankUidLimit = await enforceDualKeyLimit(env, request, 'bank_full_uid', {
          uid: auth.uid,
          uidPerMinute: 5,
          ipPerMinute: 20
        });
        if (!bankUidLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many bank downloads for this account. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...bankUidLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        let ent = null;
        if (auth.telegramId) ent = await resolveUserEntitlement(auth.telegramId, env.DB);
        else if (auth.firebaseUid) ent = await resolveFirebaseEntitlement(auth.firebaseUid, env.DB);
        if (!ent || !ent.tier || ent.tier === 'free') {
          return new Response(JSON.stringify({
            error: 'PRO_REQUIRED',
            message: 'Pro subscription required for complete 1,130+ question bank.'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (env.ASSETS) {
          const bankReq = new Request(new URL('/exam_data.json', request.url), request);
          const bankRes = await env.ASSETS.fetch(bankReq);
          if (bankRes.ok) return bankRes;
        }
        return new Response(JSON.stringify({ error: 'BANK_UNAVAILABLE' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // TON Pre-payment Order Generation (links on-chain payment to authenticated account)
      if (path === '/api/v1/billing/ton/order' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Authentication required to create a TON payment order.'
          }), { status: 401, headers: corsHeaders });
        }
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const orderLimit = await enforceDualKeyLimit(env, request, 'ton_order', {
          uid: auth.uid, uidPerMinute: 10, ipPerMinute: 20
        });
        if (!orderLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many order requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...orderLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        const productId = String(body.productId || 'pro_monthly').trim();
        const TON_PRICES = {
          daily_unlimited: { nanotons: 1500000000, amountTon: '1.5' },
          pro_monthly: { nanotons: 7000000000, amountTon: '7.0' },
          lifetime_master: { nanotons: 35000000000, amountTon: '35.0' }
        };
        const prod = TON_PRICES[productId];
        if (!prod) {
          return new Response(JSON.stringify({
            error: 'UNKNOWN_PRODUCT',
            message: 'Unknown TON product. Use daily_unlimited, pro_monthly, or lifetime_master.'
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Match verify path: ENVIRONMENT or NODE_ENV. Never serve RegistryMockTON when either is production.
        const isProd = env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production';
        const isTestPayment = !isProd && (env.ALLOW_TEST_PAYMENTS === '1' || env.TON_VERIFY_RELAXED === '1');
        const merchantWallet = env.TON_MERCHANT_WALLET_ADDRESS || (isTestPayment ? 'EQBvW8Z5huBkMJYdn3GuLD5Co_V7bB0N12_RegistryMockTON' : '');
        if (!merchantWallet) {
          return new Response(JSON.stringify({
            error: 'TON_MERCHANT_UNCONFIGURED',
            message: 'TON payments require TON_MERCHANT_WALLET_ADDRESS in production.'
          }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (isProd && !env.DB) {
          return new Response(JSON.stringify({
            error: 'TON_ORDERS_UNAVAILABLE',
            message: 'TON orders require D1 in production so payments can be bound to an account.'
          }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const userId = auth.firebaseUid || (auth.telegramId ? 'tg_' + auth.telegramId : auth.uid);
        const orderId = `clar_${auth.telegramId || auth.firebaseUid}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

        if (env.DB) {
          try {
            await env.DB.prepare(`
              INSERT INTO ton_orders (order_id, user_id, telegram_id, product_id, amount_nanotons, status)
              VALUES (?, ?, ?, ?, ?, 'pending')
            `).bind(orderId, userId, auth.telegramId || 0, productId, String(prod.nanotons)).run();
          } catch (e) {
            console.warn('[TON] ton_orders insert failed:', e && e.message ? e.message : e);
            return new Response(JSON.stringify({
              error: 'TON_ORDER_PERSIST_FAILED',
              message: 'Could not create a payment order. Try again shortly.'
            }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          orderId,
          memo: orderId,
          merchantWallet,
          amountTon: prod.amountTon,
          nanotons: prod.nanotons,
          productId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 1. Health / ready probes
      if (path === '/api/v1/health' || path === '/api/v1/live') {
        return new Response(JSON.stringify({
          status: 'ok',
          domain: 'clariora.com.au',
          edge: 'Cloudflare Workers',
          tmaSupported: true,
          aiProviders: ['groq', 'nvidia', 'ollama', 'openrouter', 'workers_ai'],
          freeSurface: FREE_SURFACE,
          payRails: ['telegram_stars', 'ton_onchain'],
          auth: {
            identityPlane: 'firebase+telegram',
            sessionCookies: true,
            publicApiRouteCount: PUBLIC_API_ROUTES.filter((r) => isPublicApiRoute(r.method, r.path)).length
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/v1/ready') {
        let dbOk = false;
        if (env.DB) {
          try {
            await env.DB.prepare('SELECT 1 AS ok').first();
            dbOk = true;
          } catch (e) {
            console.error('[ReadyProbe] DB check failed:', e && e.message ? e.message : e);
          }
        }
        const circuits = dbOk ? await listCircuits(env.DB) : [];
        const rateLimiterBound = !!(env.COACH_RATE_LIMITER);
        const ready = dbOk;
        // Booleans only: never echo secret values. Used to confirm wrangler secrets landed.
        const aiConfigured = {
          groq: Boolean(env.GROQ_API_KEY),
          nvidia: Boolean(env.NVIDIA_API_KEY),
          openrouter: Boolean(env.OPENROUTER_API_KEY),
          ollama: Boolean(env.OLLAMA_ENDPOINT) &&
            !String(env.OLLAMA_ENDPOINT).toLowerCase().includes('127.0.0.1') &&
            !String(env.OLLAMA_ENDPOINT).toLowerCase().includes('localhost'),
          workersAi: Boolean(env.AI)
        };
        return new Response(JSON.stringify({
          status: ready ? 'ready' : 'not_ready',
          db: dbOk,
          rateLimiterBound,
          aiConfigured,
          circuits,
          checkedAt: new Date().toISOString()
        }), {
          status: ready ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Custom magic-link auth retired. Firebase Auth owns email identity.
      if ((path === '/api/v1/auth/magic' || path === '/api/v1/auth/magic/verify') &&
          (request.method === 'POST' || request.method === 'GET')) {
        return new Response(JSON.stringify({
          error: 'GONE',
          message: 'Custom magic-link auth is retired. Sign in with Firebase (Google or email) or Telegram.'
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Auth: Telegram Web Login Widget verification + HttpOnly session cookie
      if (path === '/api/v1/auth/telegram' && request.method === 'POST') {
        // Unauthenticated entry point: every call runs an HMAC verification and
        // a D1 upsert, and there is no caller identity to meter against, so IP
        // is the only key available. Left unlimited this is a free D1 write
        // amplifier and a signature-brute-force surface.
        const tgLoginLimit = await enforceDualKeyLimit(env, request, 'auth_telegram', {
          ipPerMinute: 15
        });
        if (!tgLoginLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many Telegram sign-in attempts. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...tgLoginLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        const body = await request.json();
        const verifiedUser = await verifyTelegramLoginWidget(body, env.TELEGRAM_BOT_TOKEN);
        if (!verifiedUser) {
          return new Response(JSON.stringify({ error: 'Invalid or expired Telegram login signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (env.DB) {
          await env.DB.prepare(`
            INSERT INTO telegram_users (telegram_id, username, first_name, last_name, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(telegram_id) DO UPDATE SET
              username = excluded.username,
              first_name = excluded.first_name,
              last_name = excluded.last_name,
              updated_at = CURRENT_TIMESTAMP
          `).bind(verifiedUser.id, verifiedUser.username || '', verifiedUser.first_name || '', verifiedUser.last_name || '').run();
        }

        const entitlement = await resolveUserEntitlement(verifiedUser.id, env.DB);
        const cookies = [];
        if (getSessionSecret(env)) {
          try {
            const token = await mintUserSessionToken(env, {
              uid: 'tg_' + verifiedUser.id,
              provider: 'telegram',
              email: verifiedUser.username ? '@' + verifiedUser.username : '',
              displayName: ((verifiedUser.first_name || '') + (verifiedUser.last_name ? ' ' + verifiedUser.last_name : '')).trim(),
              photoURL: verifiedUser.photo_url || '',
              telegramId: verifiedUser.id
            });
            cookies.push(userSessionCookieHeader(token, request));
          } catch (err) {
            console.warn('[Auth] telegram session cookie mint failed:', err && err.message ? err.message : err);
          }
        }

        return withSetCookies(new Response(JSON.stringify({
          success: true,
          user: verifiedUser,
          entitlement: entitlement
        }), {
          headers: { ...corsHeaders, ...tgLoginLimit.headers, 'Content-Type': 'application/json' }
        }), cookies);
      }

      // Auth: record signup / sign-in for Firebase + Telegram (audit + HttpOnly session)
      if (path === '/api/v1/auth/session' && request.method === 'POST') {
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const sessionLimit = await enforceDualKeyLimit(env, request, 'auth_session', {
          ipPerMinute: 20
        });
        if (!sessionLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many authentication requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...sessionLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        const body = await request.json();
        const recorded = await recordAuthSession(body, env, request);
        if (!recorded.ok) {
          return new Response(JSON.stringify({ error: recorded.error || 'Auth session rejected' }), {
            status: recorded.status || 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return withSetCookies(new Response(JSON.stringify({
          success: true,
          account: recorded.account,
          event: recorded.event
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }), recorded.sessionCookie ? [recorded.sessionCookie] : []);
      }

      // Auth: session introspection (cookie)
      if (path === '/api/v1/auth/me' && request.method === 'GET') {
        // Cheap-looking but not free: resolveRequestAuth verifies a Firebase ID
        // token against JWKS. Metered on IP first because the caller has no
        // proven identity until that verification succeeds.
        const meIpLimit = await enforceDualKeyLimit(env, request, 'auth_me', {
          ipPerMinute: 60
        });
        if (!meIpLimit.allowed) {
          return new Response(JSON.stringify({ authenticated: false, error: 'RATE_LIMITED' }), {
            status: 429,
            headers: { ...corsHeaders, ...meIpLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        const auth = await resolveRequestAuth(
          request, env, {}, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({ authenticated: false }), {
            status: 401,
            headers: { ...corsHeaders, ...meIpLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({
          authenticated: true,
          uid: auth.uid,
          provider: auth.provider,
          email: auth.email,
          displayName: auth.displayName,
          photoURL: auth.photoURL,
          telegramId: auth.telegramId,
          source: auth.source
        }), {
          headers: { ...corsHeaders, ...meIpLimit.headers, 'Content-Type': 'application/json' }
        });
      }

      // Auth: logout clears user session cookie
      if (path === '/api/v1/auth/logout' && request.method === 'POST') {
        return withSetCookies(new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }), [clearUserSessionCookie(request)]);
      }

      // Auth: admin cookie exchange (one-time key -> HttpOnly admin session)
      if (path === '/api/v1/auth/admin/session' && request.method === 'POST') {
        // The admin key is a single shared secret guarding every admin route, so this
        // exchange is the one endpoint where unthrottled guessing is worth the most.
        const adminIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const adminLimit = await enforceDualKeyLimit(env, request, 'admin_session', {
          ipPerMinute: 5
        });
        if (!adminLimit.allowed) {
          console.warn('[Security] Admin session exchange throttled', { ip: adminIp, retryAfter: adminLimit.retryAfter });
          return new Response(JSON.stringify({ error: 'Too many admin authentication attempts.' }), {
            status: 429,
            headers: { ...corsHeaders, ...adminLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        const issued = await issueAdminSession(request, env);
        if (!issued.ok) {
          return new Response(JSON.stringify({ error: issued.error || 'Unauthorized' }), {
            status: issued.status || 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return withSetCookies(new Response(JSON.stringify({
          success: true,
          expiresIn: issued.expiresIn
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }), [issued.cookie]);
      }

      if (path === '/api/v1/auth/admin/logout' && request.method === 'POST') {
        return withSetCookies(new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }), [clearAdminSessionCookie(request)]);
      }

      // Billing: resolve entitlement for verified Telegram or session identity
      if (path === '/api/v1/billing/entitlement' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({ error: 'Valid Telegram initData or signed session required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const entIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const entLimit = await enforceDualKeyLimit(env, request, 'entitlement', {
          uid: auth.uid, uidPerMinute: 30, ipPerMinute: 120
        });
        if (!entLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many entitlement checks. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...entLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        let entitlement;
        if (auth.telegramId) {
          entitlement = await resolveUserEntitlement(auth.telegramId, env.DB);
        } else if (auth.firebaseUid) {
          entitlement = await resolveFirebaseEntitlement(auth.firebaseUid, env.DB);
        } else {
          entitlement = await resolveUserEntitlement(null, env.DB);
        }
        return new Response(JSON.stringify({
          success: true,
          telegramId: auth.telegramId,
          uid: auth.uid,
          entitlement: {
            tier: entitlement.tier,
            expiresAt: entitlement.user && entitlement.user.tier_expires_at != null
              ? entitlement.user.tier_expires_at
              : null,
            freeUsedToday: entitlement.freeUsedToday,
            trialDaysRemaining: entitlement.trialDaysRemaining,
            proPreviewTokensRemaining: entitlement.proPreviewTokensRemaining,
            features: featuresForTier(entitlement.tier),
            payRails: ['telegram_stars', 'ton_onchain'],
            source: 'server'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Auth: admin visibility of who signed up / signed in
      if (path === '/api/v1/auth/accounts' && request.method === 'GET') {
        if (!(await isAdminAuthorized(request, env))) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);
        const payload = await listAuthAccounts(env.DB, limit);
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sync: Get or Save Learner State
      if (path === '/api/v1/sync') {
        const bodyForAuth = request.method === 'POST' ? await request.clone().json().catch(() => ({})) : {};
        const auth = await resolveRequestAuth(
          request, env, bodyForAuth, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );

        // ZERO-TRUST IDENTITY: Derive UID solely from verified cryptographic token/session
        if (!auth.ok || !auth.uid) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Valid Telegram initData, session cookie, or Firebase ID token required for cloud sync.'
          }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const userId = auth.uid;

        // DUAL-KEY RATE LIMITING (UID + IP)
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const syncLimit = await enforceDualKeyLimit(env, request, 'sync', {
          uid: userId, uidPerMinute: 30, ipPerMinute: 60
        });
        if (!syncLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many sync requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...syncLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        if (request.method === 'GET') {
          if (!env.DB) {
            return new Response(JSON.stringify({ state: null }), { headers: corsHeaders });
          }
          const row = await env.DB.prepare('SELECT state_blob, revision, updated_at FROM learner_sync_state WHERE user_id = ?').bind(userId).first();
          let parsedState = null;
          if (row && row.state_blob) {
            try {
              parsedState = JSON.parse(row.state_blob);
            } catch (_) {
              console.warn('[Sync] Corrupt state blob detected for user', userId);
              parsedState = null;
            }
          }
          return new Response(JSON.stringify({
            state: parsedState,
            revision: row ? row.revision : 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { stateBlob, revision, deviceName } = body || {};
          if (!stateBlob || typeof stateBlob !== 'object' || Array.isArray(stateBlob)) {
            return new Response(JSON.stringify({ error: 'stateBlob must be a valid non-null object' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const serializedBlob = JSON.stringify(stateBlob);
          if (serializedBlob.length > 512 * 1024) {
            return new Response(JSON.stringify({ error: 'stateBlob exceeds 512KB size ceiling' }), {
              status: 413,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const safeDeviceName = String(deviceName || 'Web').slice(0, 64);
          const safeRevision = Math.max(1, Math.min(2147483647, Number(revision) || 1));

          if (env.DB) {
            await env.DB.prepare(`
              INSERT INTO learner_sync_state (user_id, revision, state_blob, device_name, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(user_id) DO UPDATE SET
                revision = excluded.revision,
                state_blob = excluded.state_blob,
                device_name = excluded.device_name,
                updated_at = CURRENT_TIMESTAMP
            `).bind(userId, safeRevision, serializedBlob, safeDeviceName).run();
          }
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // 4. Problem Reporting
      if (path === '/api/v1/items/report' && request.method === 'POST') {
        const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
        const reportLimit = await enforceDualKeyLimit(env, request, 'item_report', {
          ipPerMinute: 10
        });
        if (!reportLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many reports submitted. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...reportLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        const body = await request.json().catch(() => ({}));
        const { questionId, category, details } = body || {};
        if (!questionId || !category || typeof questionId !== 'string' || typeof category !== 'string') {
          return new Response(JSON.stringify({ error: 'Missing or invalid questionId or category' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        const safeQid = questionId.slice(0, 64);
        const safeCat = category.slice(0, 64);
        const safeDetails = String(details || '').slice(0, 1000);

        // Reporter identity is derived from the verified session, never from body.userEmail.
        // Accepting it from the client let an anonymous caller write an arbitrary third
        // party's address into item_reports, both spoofing reports and seeding PII.
        const reportAuth = await resolveRequestAuth(
          request, env, {}, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        const safeEmail = (reportAuth.ok && reportAuth.email)
          ? String(reportAuth.email).slice(0, 128)
          : 'anon';

        if (env.DB) {
          await env.DB.prepare(
            'INSERT INTO item_reports (question_id, category, details, user_email) VALUES (?, ?, ?, ?)'
          ).bind(safeQid, safeCat, safeDetails, safeEmail).run();
        }

        return new Response(JSON.stringify({ success: true, message: 'Report received' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 5. Community Stats & Item Benchmarks
      if (path === '/api/v1/items/stats' && request.method === 'GET') {
        const questionId = String(url.searchParams.get('qid') || '').slice(0, 64);
        const statsLimit = await enforceDualKeyLimit(env, request, 'item_stats', {
          ipPerMinute: 120
        });
        if (!statsLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many stats requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...statsLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        if (env.DB && questionId) {
          // Explicit column projection: this route is public, so `SELECT *` would publish
          // any column later added to item_stats_cache without a second look.
          const row = await env.DB.prepare(
            'SELECT question_id, sample_size, p_value, point_biserial, distractor_spread, flagged_miskey ' +
            'FROM item_stats_cache WHERE question_id = ?'
          ).bind(questionId).first();
          if (row) {
            return new Response(JSON.stringify({
              question_id: row.question_id,
              sample_size: row.sample_size,
              p_value: row.p_value,
              point_biserial: row.point_biserial,
              distractor_spread: row.distractor_spread,
              flagged_miskey: row.flagged_miskey || 0
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        // No fabricated crowd size. Clients treat sample_size 0 as "no data yet".
        return new Response(JSON.stringify({
          question_id: questionId || null,
          p_value: null,
          sample_size: 0,
          provisional: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 5b. Anonymous item outcome ingest (feeds item_stats_cache)
      if (path === '/api/v1/items/telemetry' && request.method === 'POST') {
        const telLimit = await enforceDualKeyLimit(env, request, 'item_telemetry', {
          ipPerMinute: 60
        });
        if (!telLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many telemetry uploads. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...telLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        if (!env.DB) {
          return new Response(JSON.stringify({
            error: 'TELEMETRY_UNAVAILABLE',
            message: 'Item telemetry requires D1.'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        let body = {};
        try {
          body = await request.json();
        } catch (_) {
          body = {};
        }
        // Ignore installId and any other identity fields. Only events are processed.
        const rawEvents = Array.isArray(body.events) ? body.events : [];
        const result = await ingestItemTelemetryBatch(env.DB, rawEvents);
        return new Response(JSON.stringify({
          success: true,
          inserted: result.inserted,
          upserted: result.upserted,
          skipped: result.skipped
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Multi-Provider AI Gateway (rate limits, budgets, triage, tools)
      if ((path === '/api/v1/coach' || path === '/api/v1/coach/stream') && request.method === 'POST') {
        const body = await request.json();
        const stream = path === '/api/v1/coach/stream' || body.stream === true;

        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Sign in with Telegram or Google before using Ghost Coach.'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const telegramId = auth.telegramId;
        const firebaseUid = auth.firebaseUid;
        let entitlement = await resolveUserEntitlement(telegramId, env.DB);
        if (!telegramId && firebaseUid) {
          entitlement = await resolveFirebaseEntitlement(firebaseUid, env.DB);
        }

        return await handleCoachRequest({
          request,
          env,
          body,
          corsHeaders,
          stream,
          auth: { telegramId, firebaseUid },
          entitlement,
          providerExecutors: {
            nvidia: executeNvidiaNim,
            ollama: executeOllama,
            openrouter: executeOpenRouter,
            groq: executeGroq,
            workers_ai: (userMessage, systemPrompt, _model, e) => executeWorkersAi(userMessage, systemPrompt, e),
            incrementFreeAiUsage,
            incrementFirebaseFreeAiUsage,
            decrementProPreviewTokens
          }
        });
      }

      // Pro async exam review packs (queue + DLQ)
      if (path === '/api/v1/coach/jobs' && request.method === 'POST') {
        const body = await request.json();
        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok || (!auth.telegramId && !auth.firebaseUid)) {
          return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const userId = auth.firebaseUid ? ('fb:' + auth.firebaseUid) : ('tg:' + auth.telegramId);
        const entitlement = auth.firebaseUid
          ? await resolveFirebaseEntitlement(auth.firebaseUid, env.DB)
          : await resolveUserEntitlement(auth.telegramId, env.DB);
        const policy = getTierPolicy(entitlement.tier);
        if (!policy.asyncJobs) {
          return new Response(JSON.stringify({
            error: 'PAYWALL_REQUIRED',
            message: 'Async exam review packs require Pro Monthly or Lifetime (Stars or TON).',
            payRails: ['telegram_stars', 'ton_onchain'],
            features: featuresForTier(entitlement.tier)
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const jobsIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const jobsLimit = await enforceDualKeyLimit(env, request, 'coach_jobs', {
          uid: userId, uidPerMinute: 10, ipPerMinute: 40
        });
        if (!jobsLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many review pack requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...jobsLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        await ensureJobTables(env.DB);
        const job = await enqueueCoachJob(env.DB, {
          userId: userId,
          telegramId: auth.telegramId != null ? auth.telegramId : null,
          tier: normalizeTier(entitlement.tier),
          jobType: body.jobType || 'exam_review_pack',
          payload: {
            weakDomains: body.weakDomains || [],
            exam: body.exam || 'core1'
          }
        });
        const processed = await processNextCoachJob(env.DB, userId, async (jobType, payload) => {
          if (jobType === 'exam_review_pack') return buildExamReviewPack(payload);
          throw new Error('unknown_job_type');
        });
        return new Response(JSON.stringify({ success: true, job, processed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('/api/v1/coach/jobs/') && request.method === 'GET') {
        const jobId = path.split('/').pop();
        const auth = await resolveRequestAuth(
          request, env, {}, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok || (!auth.telegramId && !auth.firebaseUid)) {
          return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const userRef = auth.firebaseUid ? ('fb:' + auth.firebaseUid) : ('tg:' + auth.telegramId);
        const job = await getCoachJob(env.DB, jobId, userRef);
        if (!job) {
          return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ success: true, job }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Promote local Ghost Coach telemetry (confusion pairs + weak objectives) into D1
      if (path === '/api/v1/memory/promote' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Sign in before syncing Ghost Coach memory.'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (!env.DB) {
          return new Response(JSON.stringify({
            success: false,
            error: 'DB_UNAVAILABLE',
            message: 'Memory store is temporarily unavailable.'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const memIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const memLimit = await enforceDualKeyLimit(env, request, 'memory_promote', {
          uid: auth.uid, uidPerMinute: 20, ipPerMinute: 60
        });
        if (!memLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many memory sync requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...memLimit.headers, 'Content-Type': 'application/json' }
          });
        }
        const result = await promoteGhostCoachTelemetry(env.DB, {
          telegramId: auth.telegramId,
          firebaseUid: auth.firebaseUid
        }, {
          confusionPairs: body.confusionPairs || [],
          weakObjectives: body.weakObjectives || []
        });
        return new Response(JSON.stringify({
          success: Boolean(result && result.ok),
          stored: result ? result.stored : 0,
          updated: result ? result.updated : 0,
          pairs: result ? result.pairs : 0,
          weaks: result ? result.weaks : 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // TON Blockchain Transaction Verification & Activation
      // Parallel unlock rail (Stars remain required for in-Telegram digital goods).
      // @see https://docs.ton.org/
      if (path === '/api/v1/billing/ton/verify' && request.method === 'POST') {
        const body = await request.json();
        const { productId, txHash, amountTon, walletAddress } = body;

        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Valid Telegram initData, session cookie, or Firebase idToken required before TON entitlement grant.'
          }), {
            status: 401,
            headers: corsHeaders
          });
        }
        const resolvedId = auth.telegramId;
        const firebaseUid = auth.firebaseUid;

        const tonIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const tonLimit = await enforceDualKeyLimit(env, request, 'ton_verify', {
          uid: auth.uid, uidPerMinute: 5, ipPerMinute: 20
        });
        if (!tonLimit.allowed) {
          console.warn('[Security] TON verification throttled', { uid: auth.uid, ip: tonIp });
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many verification attempts. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...tonLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        const cleanTxHash = String(txHash || '').trim();
        const cleanProductId = String(productId || '').trim();
        if (!cleanTxHash || !cleanProductId) {
          return new Response(JSON.stringify({ error: 'Missing txHash or productId' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        const isProd = env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production';

        // Bind the redemption to an order this caller created. Without it, memo matching is
        // skipped and ANY unredeemed inbound transfer to the merchant wallet can be claimed
        // by whoever quotes its hash first, letting an on-chain observer steal a stranger's
        // payment. The order must also belong to the caller, or orderId is an IDOR handle.
        const cleanOrderId = String((body && body.orderId) || '').trim().slice(0, 128);
        const callerOrderRef = auth.firebaseUid || (auth.telegramId ? 'tg_' + auth.telegramId : auth.uid);
        if (isProd && !cleanOrderId) {
          return new Response(JSON.stringify({
            error: 'ORDER_REQUIRED',
            message: 'Create a payment order via /api/v1/billing/ton/order before verifying a transaction.'
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (cleanOrderId && env.DB) {
          const order = await env.DB.prepare(
            'SELECT order_id, user_id, product_id, status FROM ton_orders WHERE order_id = ?'
          ).bind(cleanOrderId).first();
          if (!order || order.user_id !== callerOrderRef) {
            console.warn('[Security] TON order ownership mismatch', { uid: auth.uid, orderId: cleanOrderId });
            return new Response(JSON.stringify({
              error: 'ORDER_NOT_FOUND',
              message: 'No pending payment order matches this account.'
            }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (order.status === 'fulfilled') {
            return new Response(JSON.stringify({
              error: 'ORDER_ALREADY_FULFILLED',
              message: 'This payment order was already redeemed.'
            }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (order.product_id !== cleanProductId) {
            return new Response(JSON.stringify({
              error: 'ORDER_PRODUCT_MISMATCH',
              message: 'The requested product does not match this payment order.'
            }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        const isTestPayment = !isProd && (env.ALLOW_TEST_PAYMENTS === '1' || env.TON_VERIFY_RELAXED === '1');
        const isValidHashFormat = /^[a-fA-F0-9]{64}$/.test(cleanTxHash) || /^[a-zA-Z0-9+/]{42,44}={0,2}$/.test(cleanTxHash);
        if (!isValidHashFormat && !isTestPayment) {
          return new Response(JSON.stringify({
            error: 'INVALID_TX_HASH_FORMAT',
            message: 'Transaction hash must be a valid 64-char hex or 44-char base64 string.'
          }), {
            status: 400,
            headers: corsHeaders
          });
        }

        if (env.DB) {
          const prior = await env.DB.prepare(
            'SELECT id FROM ton_transactions WHERE id = ? OR LOWER(id) = LOWER(?)'
          ).bind(cleanTxHash, cleanTxHash).first();
          if (prior) {
            return new Response(JSON.stringify({
              error: 'TX_ALREADY_USED',
              message: 'This TON transaction was already redeemed.'
            }), {
              status: 409,
              headers: corsHeaders
            });
          }
        }

        let onChainConfirmed = false;
        let canonicalTxHash = cleanTxHash.toLowerCase();
        const TON_PRICES = {
          daily_unlimited: { nanotons: 1500000000 },
          pro_monthly: { nanotons: 7000000000 },
          lifetime_master: { nanotons: 35000000000 }
        };
        const expectedProduct = TON_PRICES[cleanProductId];
        if (!expectedProduct) {
          return new Response(JSON.stringify({
            error: 'UNKNOWN_PRODUCT',
            message: 'Unknown TON product. Use daily_unlimited, pro_monthly, or lifetime_master.'
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const merchantWallet = env.TON_MERCHANT_WALLET_ADDRESS || (isTestPayment ? 'EQBvW8Z5huBkMJYdn3GuLD5Co_V7bB0N12_RegistryMockTON' : '');
        if (!merchantWallet && !isTestPayment) {
          return new Response(JSON.stringify({
            error: 'TON_MERCHANT_UNCONFIGURED',
            message: 'TON verification requires TON_MERCHANT_WALLET_ADDRESS in production.'
          }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (env.TONCENTER_API_KEY && (merchantWallet || walletAddress)) {
          try {
            const targetAddress = merchantWallet || walletAddress;
            const tcUrl = 'https://toncenter.com/api/v2/getTransactions?address=' +
              encodeURIComponent(targetAddress) + '&limit=20';
            const tcRes = await fetch(tcUrl, {
              headers: { 'X-API-Key': env.TONCENTER_API_KEY }
            });
            if (tcRes.ok) {
              const tcData = await tcRes.json();
              const txs = (tcData && tcData.result) || [];
              onChainConfirmed = txs.some((t) => {
                const onChainHash = t.transaction_id && (t.transaction_id.hash || t.transaction_id);
                if (!onChainHash) return false;
                const normOnChain = String(onChainHash).trim().toLowerCase();
                const normInput = cleanTxHash.toLowerCase();
                const hashMatch = normOnChain === normInput;
                if (!hashMatch) return false;

                // Validate recency: transaction must have been created within last 2 hours (7200s)
                const nowSec = Math.floor(Date.now() / 1000);
                const txTime = Number(t.utime || 0);
                if (txTime > 0 && (nowSec - txTime > 7200 || txTime - nowSec > 300)) {
                  console.warn('[TON] Transaction expired:', txTime, 'now:', nowSec);
                  return false;
                }

                canonicalTxHash = (t.transaction_id.hash || onChainHash).toLowerCase();

                // Validate destination wallet matches merchant wallet and payment amount
                const outMsgs = t.out_msgs || [];
                const destMatch = outMsgs.some((m) => {
                  const dest = m.destination || '';
                  const val = Number(m.value || 0);
                  const validDest = isTestPayment ? true : (merchantWallet && dest.toLowerCase() === merchantWallet.toLowerCase());
                  const validVal = val >= (expectedProduct.nanotons * 0.95);
                  return validDest && validVal;
                });
                const inMsg = t.in_msg || {};
                const inDestMatch = inMsg.destination &&
                  (isTestPayment ? true : (merchantWallet && inMsg.destination.toLowerCase() === merchantWallet.toLowerCase())) &&
                  Number(inMsg.value || 0) >= (expectedProduct.nanotons * 0.95);

                // Check order memo binding if orderId was provided
                let memoMatch = !isProd;
                if (cleanOrderId) {
                  const memoText = inMsg.message || (inMsg.msg_data && inMsg.msg_data.text) || '';
                  memoMatch = isTestPayment || memoText.includes(cleanOrderId);
                }

                const success = !t.compute_ph || t.compute_ph.exit_code === 0;
                return success && (destMatch || inDestMatch) && memoMatch;
              });
            }
          } catch (tcErr) {
            console.debug('TonCenter check notice:', tcErr.message);
          }
        } else if (isTestPayment) {
          // Strictly limited to automated test harnesses passing explicit flag in mockEnv
          onChainConfirmed = cleanTxHash.length >= 16;
        }

        if (onChainConfirmed && env.DB && canonicalTxHash !== cleanTxHash.toLowerCase()) {
          const priorCanonical = await env.DB.prepare(
            'SELECT id FROM ton_transactions WHERE id = ? OR LOWER(id) = LOWER(?)'
          ).bind(canonicalTxHash, canonicalTxHash).first();
          if (priorCanonical) {
            return new Response(JSON.stringify({
              error: 'TX_ALREADY_USED',
              message: 'This TON transaction was already redeemed.'
            }), {
              status: 409,
              headers: corsHeaders
            });
          }
        }

        if (!onChainConfirmed) {
          return new Response(JSON.stringify({
            error: 'TON_NOT_CONFIRMED',
            message: 'Could not confirm TON transaction on-chain. Configure TONCENTER_API_KEY or retry after confirmation.'
          }), {
            status: 402,
            headers: corsHeaders
          });
        }

        let newTier = 'daily_pass';
        let newExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        if (cleanProductId === 'pro_monthly') {
          newTier = 'pro_monthly';
          newExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        } else if (cleanProductId === 'lifetime_master') {
          newTier = 'lifetime';
          newExpiresAt = null;
        }

        let effective = { tier: newTier, expiresAt: newExpiresAt };

        if (env.DB) {
          if (resolvedId) {
            const existingUser = await env.DB.prepare(
              'SELECT tier, tier_expires_at FROM telegram_users WHERE telegram_id = ?'
            ).bind(resolvedId).first();
            effective = resolveEffectiveTierUpgrade(existingUser, newTier, newExpiresAt);

            await env.DB.prepare(
              'INSERT INTO telegram_users (telegram_id, tier, tier_expires_at, ton_wallet_address, updated_at) ' +
              'VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ' +
              'ON CONFLICT(telegram_id) DO UPDATE SET ' +
              'tier = excluded.tier, tier_expires_at = excluded.tier_expires_at, ' +
              'ton_wallet_address = excluded.ton_wallet_address, updated_at = CURRENT_TIMESTAMP'
            ).bind(resolvedId, effective.tier, effective.expiresAt, walletAddress || '').run();

            await env.DB.prepare(
              'INSERT INTO ton_transactions (id, telegram_id, product_id, amount_ton, wallet_address, status) ' +
              "VALUES (?, ?, ?, ?, ?, 'confirmed') ON CONFLICT(id) DO NOTHING"
            ).bind(canonicalTxHash, resolvedId, cleanProductId, String(amountTon || '0'), walletAddress || '').run();
          }
          if (firebaseUid) {
            await ensureAuthAccountAiColumns(env.DB);
            const existingAccount = await env.DB.prepare(
              'SELECT tier, tier_expires_at FROM auth_accounts WHERE uid = ?'
            ).bind(firebaseUid).first();
            effective = resolveEffectiveTierUpgrade(existingAccount, newTier, newExpiresAt);

            await env.DB.prepare(
              'UPDATE auth_accounts SET tier = ?, tier_expires_at = ? WHERE uid = ?'
            ).bind(effective.tier, effective.expiresAt, firebaseUid).run();
            await env.DB.prepare(
              'INSERT INTO ton_transactions (id, telegram_id, product_id, amount_ton, wallet_address, status) ' +
              "VALUES (?, ?, ?, ?, ?, 'confirmed') ON CONFLICT(id) DO NOTHING"
            ).bind(canonicalTxHash, 0, cleanProductId, String(amountTon || '0'), walletAddress || '').run();
          }

          if (cleanOrderId) {
            try {
              // Scoped to the caller: an order id alone must never mutate another account's row.
              await env.DB.prepare(
                "UPDATE ton_orders SET status = 'fulfilled', tx_hash = ?, updated_at = CURRENT_TIMESTAMP " +
                "WHERE order_id = ? AND user_id = ?"
              ).bind(canonicalTxHash, cleanOrderId, callerOrderRef).run();
            } catch (_) {}
          }
        }

        return new Response(JSON.stringify({
          success: true,
          tier: effective.tier,
          expiresAt: effective.expiresAt,
          onChainConfirmed: true,
          features: featuresForTier(effective.tier),
          message: 'TON transaction confirmed. Paid tier unlocked with hard AI budgets.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 8. Telegram Stars (XTR) Invoice Generation
      // Digital goods must use currency XTR; provider_token empty.
      // @see https://core.telegram.org/bots/payments-stars
      if (path === '/api/v1/billing/stars/invoice' && request.method === 'POST') {
        const body = await request.json();
        const { productId } = body;
        const catalogProduct = getStarsProduct(productId);
        if (!catalogProduct) {
          return new Response(JSON.stringify({ error: 'Unknown Stars product' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const auth = await resolveRequestAuth(
          request, env, body, verifyFirebaseIdToken, verifyTelegramInitData, verifyTelegramLoginWidget
        );
        if (!auth.ok || !auth.telegramId) {
          return new Response(JSON.stringify({ error: 'Valid Telegram WebApp initData or session required' }), {
            status: 401,
            headers: corsHeaders
          });
        }
        const telegramId = auth.telegramId;
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const invoiceLimit = await enforceDualKeyLimit(env, request, 'stars_invoice', {
          uid: telegramId, uidPerMinute: 10, ipPerMinute: 20
        });
        if (!invoiceLimit.allowed) {
          return new Response(JSON.stringify({
            error: 'RATE_LIMITED',
            message: 'Too many invoice requests. Please wait a moment.'
          }), {
            status: 429,
            headers: { ...corsHeaders, ...invoiceLimit.headers, 'Content-Type': 'application/json' }
          });
        }

        if (!env.TELEGRAM_BOT_TOKEN) {
          if (env.ENVIRONMENT === 'production') {
            return new Response(JSON.stringify({
              error: 'TELEGRAM_BOT_TOKEN_REQUIRED',
              message: 'Stars invoices require TELEGRAM_BOT_TOKEN in production.'
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify({
            success: true,
            sandbox: true,
            invoiceLink: `https://t.me/$sandbox_invoice_${catalogProduct.id}_${catalogProduct.stars}`,
            message: 'Sandbox mode active (configure TELEGRAM_BOT_TOKEN for live Stars invoices)'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Payload must stay within 1-128 bytes (Bot API).
        const payload = JSON.stringify({
          p: catalogProduct.id,
          u: telegramId,
          s: catalogProduct.stars
        });
        if (new TextEncoder().encode(payload).length > 128) {
          return new Response(JSON.stringify({ error: 'Invoice payload too large' }), {
            status: 500,
            headers: corsHeaders
          });
        }

        const tgRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: catalogProduct.title,
            description: catalogProduct.description,
            payload,
            provider_token: '',
            currency: 'XTR',
            prices: [{ label: catalogProduct.title, amount: catalogProduct.stars }]
          })
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) {
          return new Response(JSON.stringify({ error: tgData.description || 'Failed to create Stars invoice' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        return new Response(JSON.stringify({
          success: true,
          invoiceLink: tgData.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 9. Telegram Bot Webhook (Commands, Pre-checkout, Successful Payment)
      if (path === '/api/v1/telegram/webhook') {
        if (request.method === 'GET') {
          return new Response(JSON.stringify({
            status: 'ok',
            service: 'telegram_bot_webhook',
            bot: '@clariorabot',
            webhookUrl: 'https://clariora.com.au/api/v1/telegram/webhook'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (request.method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
        }

        // Validate webhook secret token (support both TELEGRAM_WEBHOOK_SECRET and EDGE_WEBHOOK_SECRET)
        const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET || env.EDGE_WEBHOOK_SECRET;
        if (webhookSecret) {
          const incomingSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
          if (!incomingSecret || !timingSafeEqualStr(incomingSecret, webhookSecret)) {
            console.warn('Telegram webhook rejected: unauthorized secret token');
            return new Response('Unauthorized', { status: 403, headers: corsHeaders });
          }
        } else if (env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production') {
          console.error('Telegram webhook rejected: TELEGRAM_WEBHOOK_SECRET / EDGE_WEBHOOK_SECRET is not configured in production');
          return new Response('Webhook secret not configured', { status: 503, headers: corsHeaders });
        }

        // Backstop behind the edge rule. An attacker who learns the secret, or
        // any Telegram-side retry storm, still cannot drive unbounded D1 writes
        // and Bot API calls. Sits after the secret check on purpose: a spoofed
        // request is already rejected above and must not consume the budget
        // that real payment callbacks depend on.
        const hookLimit = await enforceDualKeyLimit(env, request, 'telegram_webhook', {
          ipPerMinute: 600
        });
        if (!hookLimit.allowed) {
          console.warn(JSON.stringify({
            event: 'rate_limit_exceeded',
            action: 'telegram_webhook',
            dimension: hookLimit.dimension,
            ip: hookLimit.ip,
            ts: new Date().toISOString()
          }));
          // 429 tells Telegram to retry with backoff; it will redeliver, so a
          // throttled payment callback is delayed rather than lost.
          return new Response('Too Many Requests', {
            status: 429,
            headers: { ...corsHeaders, ...hookLimit.headers }
          });
        }

        const update = await request.json().catch(() => ({}));
        if (!update || typeof update !== 'object') {
          return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: corsHeaders });
        }

        // Strict guard: if no webhook secret is configured, reject payment delivery outright
        if (!webhookSecret && update.message && update.message.successful_payment && env.ALLOW_TEST_PAYMENTS !== '1') {
          console.warn('Telegram webhook rejected: payment delivery requires configured webhook secret');
          return new Response('Webhook secret required for payment confirmation', { status: 403, headers: corsHeaders });
        }

        // A. Handle bot commands and chat messages (not payment receipts)
        if (update.message && update.message.text && !update.message.successful_payment) {
          const text = update.message.text.trim();
          const chatId = update.message.chat.id;
          const firstName = update.message.from?.first_name || 'Technician';
          const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();

          let replyText = `Welcome to **Clariora CompTIA A+ Master**, ${firstName}!\n\nPrepare for your 220-1201 Core 1 and 220-1202 Core 2 exams with:\n• 7 Interactive Performance-Based Questions (PBQs)\n• Pearson VUE Exam-Day Mode & Score Reports\n• Multi-Model AI Ghost Coach (Groq, NVIDIA NIM 70B, DeepSeek R1)\n• 61-Objective Mastery Heatmap\n\nTap the button below to launch the Mini App:`;
          let showLaunchButton = true;

          if (cmd === '/pro') {
            replyText = `**Clariora AI Pro Pass** (Telegram Stars / XTR)\n\nUnlock unlimited enterprise AI tutoring and exam simulations:\n• **NVIDIA NIM 70B**: Deep technical distractor breakdowns\n• **Private Ollama DeepSeek R1**: Chain-of-thought troubleshooting\n• **OpenRouter**: Comprehensive syllabus guidance\n\n**Stars pricing (digital goods inside Telegram):**\n• 50 Stars: 24-Hour Unlimited Pass\n• 250 Stars: Monthly Pro Pass\n• 1500 Stars: Lifetime Master Pass\n\nIncludes 14-day free practice trial with 5 daily Groq sessions and 3 Pro preview tokens.\n\nOpen the Mini App to upgrade with Stars:`;
          } else if (cmd === '/help' || cmd === '/support') {
            replyText = `**Clariora CompTIA A+ Support**\n\n• **Diagnostic Mode**: 20 rapid questions across Core 1 & Core 2.\n• **PBQ Simulator**: Motherboards, RAID, IP configuration, and cloud architectures.\n• **Readiness Engine**: Scaled scoring against real pass marks (675 Core 1, 700 Core 2).\n\nProduct / billing issues: use /paysupport (Telegram Support cannot help with bot purchases).\nTerms: /terms\n\nTap below to open your workspace:`;
          } else if (cmd === '/terms') {
            showLaunchButton = false;
            replyText = `**Clariora Terms of Sale (Digital Goods)**\n\n1. Digital unlocks sold inside Telegram bots and Mini Apps are paid **only in Telegram Stars (XTR)**.\n2. Purchases grant access to Clariora exam practice features for the product term shown at checkout.\n3. By paying, you confirm you have read these terms.\n4. Telegram Support and BotFather Support cannot assist with purchases made via this bot.\n5. For refunds or billing disputes, message /paysupport here. We process legitimate disputes promptly.\n6. Keep your payment receipt (Stars charge ID) for support.\n\nMini App: https://clariora.com.au/app`;
          } else if (cmd === '/paysupport') {
            showLaunchButton = false;
            replyText = `**Payment Support (Stars)**\n\nTelegram Support cannot help with purchases made through this bot.\n\nReply in this chat with:\n1. Your Telegram username\n2. Approximate purchase time\n3. Product name (24-Hour / Monthly / Lifetime)\n4. The Stars payment charge ID from your receipt (if available)\n\nWe will review and, when appropriate, refund via Telegram Stars (\`refundStarPayment\`).\n\nTypical response time: within 2 business days.`;
          }

          if (env.TELEGRAM_BOT_TOKEN) {
            const payload = {
              chat_id: chatId,
              text: replyText,
              parse_mode: 'Markdown'
            };
            if (showLaunchButton) {
              payload.reply_markup = {
                inline_keyboard: [
                  [
                    {
                      text: 'Launch Clariora A+ Mini App',
                      web_app: { url: 'https://clariora.com.au/app' }
                    }
                  ]
                ]
              };
            }
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }

        // B. Pre-checkout: must answer within 10 seconds
        if (update.pre_checkout_query) {
          const pcq = update.pre_checkout_query;
          const decision = validateStarsPreCheckout(pcq);
          if (env.TELEGRAM_BOT_TOKEN) {
            const answer = {
              pre_checkout_query_id: pcq.id,
              ok: decision.ok
            };
            if (!decision.ok) answer.error_message = decision.error_message;
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(answer)
            });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }

        // C. Successful payment (only deliver after this update, not after pre-checkout alone)
        if (update.message && update.message.successful_payment) {
          const payment = update.message.successful_payment;
          const telegramId = update.message.from.id;
          const chargeId = payment.telegram_payment_charge_id;
          const amount = payment.total_amount;
          const validation = validateStarsSuccessfulPayment(payment, telegramId);

          if (!validation.ok) {
            console.warn('Ignoring invalid successful_payment', validation.error, {
              chargeId: chargeId || null,
              telegramId
            });
            // Ask Telegram to retry when we cannot persist a grant that should have succeeded.
            if (validation.error === 'unknown_product' || validation.error === 'amount_mismatch' ||
                validation.error === 'payer_mismatch') {
              return new Response(JSON.stringify({ ok: false, error: validation.error }), {
                status: 400,
                headers: corsHeaders
              });
            }
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
          }

          const productId = validation.product.id;
          const grant = validation.grant;

          if (!env.DB || !chargeId) {
            console.error('Stars grant cannot persist: missing DB or chargeId', {
              hasDb: !!env.DB,
              chargeId: chargeId || null
            });
            return new Response(JSON.stringify({ ok: false, error: 'GRANT_PERSIST_UNAVAILABLE' }), {
              status: 500,
              headers: corsHeaders
            });
          }

          // Atomic-ish idempotency: insert charge with ON CONFLICT DO NOTHING, then
          // always re-apply the tier upsert so a post-insert user-write failure recovers
          // on Telegram redelivery. stars_spent is derived from the charge ledger.
          try {
            await env.DB.prepare(`
              INSERT INTO stars_transactions (id, telegram_id, product_id, stars_amount, status, invoice_payload)
              VALUES (?, ?, ?, ?, 'paid', ?)
              ON CONFLICT(id) DO NOTHING
            `).bind(chargeId, telegramId, productId, amount, payment.invoice_payload || '').run();

            const existingUser = await env.DB.prepare(
              'SELECT tier, tier_expires_at FROM telegram_users WHERE telegram_id = ?'
            ).bind(telegramId).first();
            const effective = resolveEffectiveTierUpgrade(existingUser, grant.tier, grant.expiresAt);

            const spentRow = await env.DB.prepare(
              'SELECT COALESCE(SUM(stars_amount), 0) AS total FROM stars_transactions WHERE telegram_id = ?'
            ).bind(telegramId).first();
            const starsSpentTotal = spentRow && spentRow.total != null ? Number(spentRow.total) : Number(amount);

            await env.DB.prepare(`
              INSERT INTO telegram_users (telegram_id, username, first_name, last_name, tier, tier_expires_at, stars_spent, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(telegram_id) DO UPDATE SET
                tier = excluded.tier,
                tier_expires_at = excluded.tier_expires_at,
                stars_spent = excluded.stars_spent,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              telegramId,
              update.message.from.username || '',
              update.message.from.first_name || '',
              update.message.from.last_name || '',
              effective.tier,
              effective.expiresAt,
              starsSpentTotal
            ).run();
          } catch (grantErr) {
            console.error('Stars grant persistence failed', grantErr);
            return new Response(JSON.stringify({ ok: false, error: 'GRANT_PERSIST_FAILED' }), {
              status: 500,
              headers: corsHeaders
            });
          }

          if (env.TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: update.message.chat.id,
                text: `**Payment Verified!**\n\nYour Clariora **${productId.replace(/_/g, ' ').toUpperCase()}** is now active.\nCharge ID (keep for /paysupport): \`${chargeId || 'n/a'}\`\n\nYou have unlocked full practice exams, performance-based labs, and AI Ghost Coach.`,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Open Clariora', web_app: { url: 'https://clariora.com.au/app' } }]
                  ]
                }
              })
            });
          }

          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (err) {
      const isProd = env.ENVIRONMENT === 'production' || env.NODE_ENV === 'production';
      console.error('[API Error]', err);
      return new Response(JSON.stringify({
        error: isProd ? 'Internal Server Error' : (err.message || 'Internal Edge Error')
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// =========================================================================
// Helper Functions: App shell, Auth audit, Telegram Cryptographic Auth
// =========================================================================
