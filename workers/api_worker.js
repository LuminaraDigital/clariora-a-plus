/**
 * Clariora Cloudflare Edge Worker API
 * Domain: clariora.com.au
 * Route: /api/v1/*
 *
 * Edge services provided:
 * 1. /api/v1/auth/magic           - Passwordless Magic-Link authentication
 * 2. /api/v1/auth/telegram        - Telegram Login Widget verification
 * 3. /api/v1/auth/session         - Record signup / sign-in events (Firebase + Telegram)
 * 4. /api/v1/auth/accounts        - Admin list of accounts and recent auth events
 * 5. /api/v1/sync                 - Cross-device learner state delta sync
 * 6. /api/v1/items/report         - Question problem & ambiguity reporting
 * 7. /api/v1/items/stats          - Community item difficulty & discrimination stats
 * 8. /api/v1/coach                - Gated multi-provider AI gateway (budgets, triage, tools)
 * 8b. /api/v1/coach/stream        - SSE streaming coach (paid tiers)
 * 8c. /api/v1/coach/jobs          - Pro async exam review packs + DLQ
 * 9. /api/v1/billing/stars/invoice- Telegram Stars (XTR) Invoice generation
 * 10. /api/v1/billing/entitlement - Resolve paid tier from verified Telegram identity
 * 11. /api/v1/telegram/webhook    - Telegram Bot Webhook (Commands, Pre-checkout, Successful payment)
 * 12. /api/v1/health|/ready       - Liveness and readiness probes
 */

import { CoachRateLimiter, enforceCoachRateLimit } from './coach_rate_limiter.js';
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
    let resolvedOrigin = 'https://clariora.com.au';
    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
        /^https:\/\/([a-zA-Z0-9-]+\.)?telegram\.org$/.test(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');
      if (isAllowed) {
        resolvedOrigin = origin;
      }
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': resolvedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Telegram-Init-Data, X-Admin-Key',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const path = url.pathname;

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
      // 1. Health / ready probes
      if (path === '/api/v1/health' || path === '/api/v1/live') {
        return new Response(JSON.stringify({
          status: 'ok',
          domain: 'clariora.com.au',
          edge: 'Cloudflare Workers',
          tmaSupported: true,
          aiProviders: ['groq', 'nvidia', 'ollama', 'openrouter', 'workers_ai'],
          freeSurface: FREE_SURFACE,
          payRails: ['telegram_stars', 'ton_onchain']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/v1/ready') {
        let dbOk = false;
        let dbError = null;
        if (env.DB) {
          try {
            await env.DB.prepare('SELECT 1 AS ok').first();
            dbOk = true;
          } catch (e) {
            dbError = e && e.message ? e.message : 'db_error';
          }
        }
        const circuits = dbOk ? await listCircuits(env.DB) : [];
        const rateLimiterBound = !!(env.COACH_RATE_LIMITER);
        const ready = dbOk;
        return new Response(JSON.stringify({
          status: ready ? 'ready' : 'not_ready',
          db: dbOk,
          dbError,
          rateLimiterBound,
          circuits,
          checkedAt: new Date().toISOString()
        }), {
          status: ready ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. Auth: Magic Link Request
      if (path === '/api/v1/auth/magic' && request.method === 'POST') {
        const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
        const rateCheck = await enforceCoachRateLimit(env, `magic:${clientIp}`, 5);
        if (!rateCheck.allowed) {
          return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Retry-After': '60' }
          });
        }

        const { email } = await request.json();
        if (!email || !email.includes('@')) {
          return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers: corsHeaders });
        }

        const token = crypto.randomUUID();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

        if (env.DB) {
          await env.DB.prepare(
            'INSERT OR REPLACE INTO users (id, email, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
          ).bind(crypto.randomUUID(), email).run();

          await env.DB.prepare(
            'INSERT INTO magic_links (token, email, expires_at) VALUES (?, ?, ?)'
          ).bind(token, email, expiresAt).run();
        }

        // Security: Never leak the raw authentication token in the HTTP API response.
        return new Response(JSON.stringify({
          success: true,
          message: 'If an account exists for this email address, a secure sign-in link has been sent.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2a. Auth: Magic Link Token Verification
      if (path === '/api/v1/auth/magic/verify' && request.method === 'GET') {
        const tokenParam = url.searchParams.get('token') || '';
        if (!tokenParam || tokenParam.length < 16) {
          return new Response(JSON.stringify({ error: 'Invalid or missing verification token' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (!env.DB) {
          return new Response(JSON.stringify({ error: 'Database unavailable' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const record = await env.DB.prepare(
          'SELECT token, email, expires_at FROM magic_links WHERE token = ?'
        ).bind(tokenParam).first();

        if (!record || Number(record.expires_at) < Date.now()) {
          return new Response(JSON.stringify({ error: 'Magic link has expired or is invalid' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Single-use token consumption
        await env.DB.prepare('DELETE FROM magic_links WHERE token = ?').bind(tokenParam).run();

        const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(record.email).first();
        return new Response(JSON.stringify({
          success: true,
          verified: true,
          email: record.email,
          userId: user ? user.id : null,
          message: 'Authentication successful'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2b. Auth: Telegram Web Login Widget verification
      if (path === '/api/v1/auth/telegram' && request.method === 'POST') {
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

        return new Response(JSON.stringify({
          success: true,
          user: verifiedUser,
          entitlement: entitlement
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2c. Auth: record signup / sign-in for Firebase + Telegram (audit + account memory key)
      if (path === '/api/v1/auth/session' && request.method === 'POST') {
        const body = await request.json();
        const recorded = await recordAuthSession(body, env);
        if (!recorded.ok) {
          return new Response(JSON.stringify({ error: recorded.error || 'Auth session rejected' }), {
            status: recorded.status || 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({
          success: true,
          account: recorded.account,
          event: recorded.event
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2c2. Billing: resolve entitlement for verified Telegram identity
      if (path === '/api/v1/billing/entitlement' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const initDataRaw = request.headers.get('X-Telegram-Init-Data') || body.initData || '';
        const tgUser = await verifyTelegramInitData(initDataRaw, env.TELEGRAM_BOT_TOKEN);
        if (!tgUser || !tgUser.id) {
          return new Response(JSON.stringify({ error: 'Valid Telegram initData required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const entitlement = await resolveUserEntitlement(tgUser.id, env.DB);
        return new Response(JSON.stringify({
          success: true,
          telegramId: tgUser.id,
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

      // 2d. Auth: admin visibility of who signed up / signed in
      if (path === '/api/v1/auth/accounts' && request.method === 'GET') {
        if (!isAdminAuthorized(request, env)) {
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

      // 3. Sync: Get or Save Learner State
      if (path === '/api/v1/sync') {
        const initDataRaw = request.headers.get('X-Telegram-Init-Data') || '';
        const authHeader = request.headers.get('Authorization') || '';
        const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

        let verifiedUserId = null;
        if (initDataRaw && env.TELEGRAM_BOT_TOKEN) {
          const tgUser = await verifyTelegramInitData(initDataRaw, env.TELEGRAM_BOT_TOKEN);
          if (tgUser && tgUser.id) {
            verifiedUserId = 'tg_' + tgUser.id;
          }
        }
        if (!verifiedUserId && bearerToken) {
          const apiKey = env.FIREBASE_WEB_API_KEY || 'AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8';
          const fbUser = await verifyFirebaseIdToken(bearerToken, apiKey);
          if (fbUser && (fbUser.localId || fbUser.user_id || fbUser.uid)) {
            verifiedUserId = fbUser.localId || fbUser.user_id || fbUser.uid;
          }
        }

        // Support explicit test token / localhost development environments
        const headerUserId = request.headers.get('X-User-Id');
        if (!verifiedUserId && headerUserId && (env.ALLOW_TEST_AUTH === '1' || url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
          verifiedUserId = headerUserId;
        }

        if (!verifiedUserId) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Valid Telegram initData or Firebase ID token required for cloud sync.'
          }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const userId = verifiedUserId;

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
        const rateCheck = await enforceCoachRateLimit(env, `report:${clientIp}`, 10);
        if (!rateCheck.allowed) {
          return new Response(JSON.stringify({ error: 'Too many reports submitted. Please wait a moment.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Retry-After': '60' }
          });
        }

        const body = await request.json().catch(() => ({}));
        const { questionId, category, details, userEmail } = body || {};
        if (!questionId || !category || typeof questionId !== 'string' || typeof category !== 'string') {
          return new Response(JSON.stringify({ error: 'Missing or invalid questionId or category' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        const safeQid = questionId.slice(0, 64);
        const safeCat = category.slice(0, 64);
        const safeDetails = String(details || '').slice(0, 1000);
        const safeEmail = String(userEmail || 'anon').slice(0, 128);

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
        const questionId = url.searchParams.get('qid');
        if (env.DB && questionId) {
          const row = await env.DB.prepare('SELECT * FROM item_stats_cache WHERE question_id = ?').bind(questionId).first();
          if (row) {
            return new Response(JSON.stringify(row), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        return new Response(JSON.stringify({ p_value: 0.72, sample_size: 100 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 6. Multi-Provider AI Gateway (rate limits, budgets, triage, tools)
      if ((path === '/api/v1/coach' || path === '/api/v1/coach/stream') && request.method === 'POST') {
        const body = await request.json();
        const stream = path === '/api/v1/coach/stream' || body.stream === true;

        const initDataRaw = request.headers.get('X-Telegram-Init-Data') || body.initData || '';
        const tgUser = await verifyTelegramInitData(initDataRaw, env.TELEGRAM_BOT_TOKEN);
        let firebaseUser = null;
        if (!tgUser && body.idToken) {
          const apiKey = env.FIREBASE_WEB_API_KEY || 'AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8';
          firebaseUser = await verifyFirebaseIdToken(body.idToken, apiKey);
        }
        if (!tgUser && !firebaseUser) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Sign in with Telegram or Google before using Ghost Coach.'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const telegramId = tgUser ? tgUser.id : null;
        const firebaseUid = firebaseUser ? (firebaseUser.localId || null) : null;
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

      // 6b. Pro async exam review packs (queue + DLQ)
      if (path === '/api/v1/coach/jobs' && request.method === 'POST') {
        const body = await request.json();
        const initDataRaw = request.headers.get('X-Telegram-Init-Data') || body.initData || '';
        const tgUser = await verifyTelegramInitData(initDataRaw, env.TELEGRAM_BOT_TOKEN);
        if (!tgUser) {
          return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const entitlement = await resolveUserEntitlement(tgUser.id, env.DB);
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
        await ensureJobTables(env.DB);
        const job = await enqueueCoachJob(env.DB, {
          telegramId: tgUser.id,
          tier: normalizeTier(entitlement.tier),
          jobType: body.jobType || 'exam_review_pack',
          payload: {
            weakDomains: body.weakDomains || [],
            exam: body.exam || 'core1'
          }
        });
        const processed = await processNextCoachJob(env.DB, tgUser.id, async (jobType, payload) => {
          if (jobType === 'exam_review_pack') return buildExamReviewPack(payload);
          throw new Error('unknown_job_type');
        });
        return new Response(JSON.stringify({ success: true, job, processed }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('/api/v1/coach/jobs/') && request.method === 'GET') {
        const jobId = path.split('/').pop();
        const initDataRaw = request.headers.get('X-Telegram-Init-Data') || '';
        const tgUser = await verifyTelegramInitData(initDataRaw, env.TELEGRAM_BOT_TOKEN);
        if (!tgUser) {
          return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const job = await getCoachJob(env.DB, jobId, tgUser.id);
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

      // 7. TON Blockchain Transaction Verification & Activation
      // Parallel unlock rail (Stars remain required for in-Telegram digital goods).
      // @see https://docs.ton.org/
      if (path === '/api/v1/billing/ton/verify' && request.method === 'POST') {
        const body = await request.json();
        const { productId, txHash, amountTon, walletAddress, initData, idToken } = body;

        const tgUser = await verifyTelegramInitData(
          initData || request.headers.get('X-Telegram-Init-Data') || '',
          env.TELEGRAM_BOT_TOKEN
        );
        let firebaseUser = null;
        if (!tgUser && idToken) {
          const apiKey = env.FIREBASE_WEB_API_KEY || '';
          firebaseUser = apiKey ? await verifyFirebaseIdToken(idToken, apiKey) : null;
        }
        if (!tgUser && !firebaseUser) {
          return new Response(JSON.stringify({
            error: 'AUTH_REQUIRED',
            message: 'Valid Telegram initData or Firebase idToken required before TON entitlement grant.'
          }), {
            status: 401,
            headers: corsHeaders
          });
        }
        const resolvedId = tgUser ? tgUser.id : null;
        const firebaseUid = firebaseUser ? firebaseUser.localId || firebaseUser.user_id || firebaseUser.uid : null;

        const cleanTxHash = String(txHash || '').trim();
        const cleanProductId = String(productId || '').trim();
        if (!cleanTxHash || !cleanProductId) {
          return new Response(JSON.stringify({ error: 'Missing txHash or productId' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        const isTestPayment = env.ALLOW_TEST_PAYMENTS === '1' || env.TON_VERIFY_RELAXED === '1';
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
            'SELECT id FROM ton_transactions WHERE id = ?'
          ).bind(cleanTxHash).first();
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
        let canonicalTxHash = cleanTxHash;
        const TON_PRICES = {
          daily_unlimited: { nanotons: 1500000000 },
          pro_monthly: { nanotons: 7000000000 },
          lifetime_master: { nanotons: 35000000000 }
        };
        const expectedProduct = TON_PRICES[cleanProductId] || TON_PRICES.daily_unlimited;
        const merchantWallet = env.TON_MERCHANT_WALLET_ADDRESS || (isTestPayment ? 'EQBvW8Z5huBkMJYdn3GuLD5Co_V7bB0N12_RegistryMockTON' : '');

        if (env.TONCENTER_API_KEY && walletAddress) {
          try {
            const tcUrl = 'https://toncenter.com/api/v2/getTransactions?address=' +
              encodeURIComponent(walletAddress) + '&limit=20';
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

                canonicalTxHash = t.transaction_id.hash || onChainHash;

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

                const success = !t.compute_ph || t.compute_ph.exit_code === 0;
                return success && (destMatch || inDestMatch);
              });
            }
          } catch (tcErr) {
            console.debug('TonCenter check notice:', tcErr.message);
          }
        } else if (isTestPayment) {
          // Strictly limited to automated test harnesses passing explicit flag in mockEnv
          onChainConfirmed = cleanTxHash.length >= 16;
        }

        if (onChainConfirmed && env.DB && canonicalTxHash !== cleanTxHash) {
          const priorCanonical = await env.DB.prepare(
            'SELECT id FROM ton_transactions WHERE id = ?'
          ).bind(canonicalTxHash).first();
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

        let tier = 'daily_pass';
        let expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        if (cleanProductId === 'pro_monthly') {
          tier = 'pro_monthly';
          expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        } else if (cleanProductId === 'lifetime_master') {
          tier = 'lifetime';
          expiresAt = null;
        }

        if (env.DB) {
          if (resolvedId) {
            await env.DB.prepare(
              'INSERT INTO telegram_users (telegram_id, tier, tier_expires_at, ton_wallet_address, updated_at) ' +
              'VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ' +
              'ON CONFLICT(telegram_id) DO UPDATE SET ' +
              'tier = excluded.tier, tier_expires_at = excluded.tier_expires_at, ' +
              'ton_wallet_address = excluded.ton_wallet_address, updated_at = CURRENT_TIMESTAMP'
            ).bind(resolvedId, tier, expiresAt, walletAddress || '').run();

            await env.DB.prepare(
              'INSERT INTO ton_transactions (id, telegram_id, product_id, amount_ton, wallet_address, status) ' +
              "VALUES (?, ?, ?, ?, ?, 'confirmed') ON CONFLICT(id) DO NOTHING"
            ).bind(canonicalTxHash, resolvedId, cleanProductId, String(amountTon || '0'), walletAddress || '').run();
          }
          if (firebaseUid) {
            await env.DB.prepare(`
              CREATE TABLE IF NOT EXISTS auth_accounts (
                uid TEXT PRIMARY KEY,
                email TEXT,
                display_name TEXT,
                photo_url TEXT,
                provider TEXT,
                signup_at INTEGER,
                last_signin_at INTEGER,
                signin_count INTEGER DEFAULT 0,
                free_ai_used_today INTEGER DEFAULT 0,
                free_ai_last_date TEXT,
                tier TEXT DEFAULT 'free',
                tier_expires_at INTEGER
              )
            `).run();
            await env.DB.prepare(
              'UPDATE auth_accounts SET tier = ?, tier_expires_at = ? WHERE uid = ?'
            ).bind(tier, expiresAt, firebaseUid).run();
            await env.DB.prepare(
              'INSERT INTO ton_transactions (id, telegram_id, product_id, amount_ton, wallet_address, status) ' +
              "VALUES (?, ?, ?, ?, ?, 'confirmed') ON CONFLICT(id) DO NOTHING"
            ).bind(String(txHash), 0, productId, String(amountTon || '0'), walletAddress || '').run();
          }
        }

        return new Response(JSON.stringify({
          success: true,
          tier: tier,
          expiresAt: expiresAt,
          onChainConfirmed: true,
          features: featuresForTier(tier),
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
        const { productId, initData } = body;
        const catalogProduct = getStarsProduct(productId);
        if (!catalogProduct) {
          return new Response(JSON.stringify({ error: 'Unknown Stars product' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const tgUser = await verifyTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
        if (env.TELEGRAM_BOT_TOKEN && !tgUser) {
          return new Response(JSON.stringify({ error: 'Valid Telegram WebApp initData required' }), {
            status: 401,
            headers: corsHeaders
          });
        }
        const telegramId = tgUser ? tgUser.id : Number(body.telegramId || 0);

        if (!env.TELEGRAM_BOT_TOKEN) {
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
          const parsed = parseStarsInvoicePayload(payment.invoice_payload);
          const productId = parsed.productId || 'daily_unlimited';
          const grant = resolveStarsGrant(productId);

          if (payment.currency !== 'XTR') {
            console.warn('Ignoring non-XTR successful_payment', payment.currency);
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
          }

          if (env.DB && chargeId) {
            const existing = await env.DB.prepare(
              'SELECT id FROM stars_transactions WHERE id = ?'
            ).bind(chargeId).first();

            if (!existing) {
              await env.DB.prepare(`
                INSERT INTO stars_transactions (id, telegram_id, product_id, stars_amount, status, invoice_payload)
                VALUES (?, ?, ?, ?, 'paid', ?)
              `).bind(chargeId, telegramId, productId, amount, payment.invoice_payload || '').run();

              await env.DB.prepare(`
                INSERT INTO telegram_users (telegram_id, username, first_name, last_name, tier, tier_expires_at, stars_spent, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(telegram_id) DO UPDATE SET
                  tier = excluded.tier,
                  tier_expires_at = excluded.tier_expires_at,
                  stars_spent = telegram_users.stars_spent + excluded.stars_spent,
                  updated_at = CURRENT_TIMESTAMP
              `).bind(
                telegramId,
                update.message.from.username || '',
                update.message.from.first_name || '',
                update.message.from.last_name || '',
                grant.tier,
                grant.expiresAt,
                amount
              ).run();
            }
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
      return new Response(JSON.stringify({ error: err.message || 'Internal Edge Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// =========================================================================
// Helper Functions: App shell, Auth audit, Telegram Cryptographic Auth
// =========================================================================

/**
 * Ensure HTML served under /app resolves relative assets against site root.
 */
function withAppBase(response) {
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

function isAdminAuthorized(request, env) {
  const key = env.ADMIN_API_KEY || env.AUTH_ADMIN_KEY || '';
  if (!key) return false;
  const headerKey = request.headers.get('X-Admin-Key') || '';
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return timingSafeEqualStr(headerKey, key) || timingSafeEqualStr(bearer, key);
}

async function verifyFirebaseIdToken(idToken, apiKey) {
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

async function recordAuthSession(body, env) {
  const eventType = (body && body.event === 'signup') ? 'signup' : 'signin';
  let provider = (body && body.provider) || 'unknown';
  let uid = (body && body.uid) || '';
  let email = (body && body.email) || '';
  let displayName = (body && body.displayName) || '';
  let photoURL = (body && body.photoURL) || '';
  let telegramId = body && body.telegramId != null ? Number(body.telegramId) : null;

  if (body && body.initData && env.TELEGRAM_BOT_TOKEN) {
    const tgUser = await verifyTelegramInitData(body.initData, env.TELEGRAM_BOT_TOKEN);
    if (!tgUser) return { ok: false, status: 401, error: 'Invalid Telegram initData' };
    provider = provider === 'telegram_tma' ? 'telegram_tma' : 'telegram';
    telegramId = tgUser.id;
    uid = 'tg_' + tgUser.id;
    displayName = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    email = tgUser.username ? '@' + tgUser.username : email;
    photoURL = tgUser.photo_url || photoURL;
  } else if (body && body.telegramLogin) {
    const tgUser = await verifyTelegramLoginWidget(body.telegramLogin, env.TELEGRAM_BOT_TOKEN);
    if (!tgUser) return { ok: false, status: 401, error: 'Invalid or expired Telegram login signature' };
    provider = 'telegram';
    telegramId = tgUser.id;
    uid = 'tg_' + tgUser.id;
    displayName = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    email = tgUser.username ? '@' + tgUser.username : email;
    photoURL = tgUser.photo_url || photoURL;
  } else if (body && body.idToken) {
    const apiKey = env.FIREBASE_WEB_API_KEY || 'AIzaSyAt5MnWAXJcL84vG6gxRoIksJL2bcfr4y8';
    const fbUser = await verifyFirebaseIdToken(body.idToken, apiKey);
    if (!fbUser) return { ok: false, status: 401, error: 'Invalid Firebase ID token' };
    uid = fbUser.localId || uid;
    email = fbUser.email || email;
    displayName = fbUser.displayName || displayName;
    photoURL = fbUser.photoUrl || photoURL;
    if (!provider || provider === 'unknown') {
      provider = (fbUser.providerUserInfo && fbUser.providerUserInfo[0] && fbUser.providerUserInfo[0].providerId === 'google.com')
        ? 'google'
        : 'email';
    }
  } else {
    return {
      ok: false,
      status: 401,
      error: 'Firebase idToken, Telegram initData, or Telegram login payload required'
    };
  }

  if (!env.DB) {
    return { ok: true, account: { uid, email, displayName, provider }, event: eventType };
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
    `).bind(uid, provider, email, displayName, photoURL, telegramId).run();
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
    `).bind(provider, email, displayName, photoURL, telegramId, uid).run();
  }

  if (telegramId && Number.isFinite(telegramId)) {
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
  return { ok: true, account, event: resolvedEvent };
}

async function listAuthAccounts(db, limit) {
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

/**
 * Canonical Stars (XTR) catalog. Amounts are whole Stars; invoice titles <= 32 chars.
 * @see https://core.telegram.org/bots/payments-stars
 */
const STARS_PRODUCTS = {
  daily_unlimited: {
    id: 'daily_unlimited',
    stars: 50,
    tier: 'daily_pass',
    title: '24-Hour Study Pass',
    description: 'Higher hard AI budgets, streaming coach, Core 1+networking specialists for 24 hours.'
  },
  pro_monthly: {
    id: 'pro_monthly',
    stars: 250,
    tier: 'pro_monthly',
    title: 'Monthly Pro Pass',
    description: 'Multi-specialist handoffs, tools, NVIDIA/OpenRouter, hard daily/monthly AI caps for 30 days.'
  },
  lifetime_master: {
    id: 'lifetime_master',
    stars: 1500,
    tier: 'lifetime',
    title: 'Lifetime Master Pass',
    description: 'Highest hard AI budgets, war-room plans, priority models, and full Core 1+2 forever.'
  }
};

function getStarsProduct(productId) {
  if (!productId) return null;
  return STARS_PRODUCTS[String(productId)] || null;
}

function parseStarsInvoicePayload(raw) {
  let data = {};
  try {
    data = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch (e) {
    return { productId: null, telegramId: null, stars: null };
  }
  return {
    productId: data.p || data.productId || null,
    telegramId: data.u != null ? data.u : (data.telegramId != null ? data.telegramId : null),
    stars: data.s != null ? data.s : (data.stars != null ? data.stars : null)
  };
}

function resolveStarsGrant(productId) {
  const product = getStarsProduct(productId) || STARS_PRODUCTS.daily_unlimited;
  let expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  if (product.id === 'pro_monthly') {
    expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  } else if (product.id === 'lifetime_master') {
    expiresAt = null;
  }
  return { tier: product.tier, expiresAt, product };
}

function validateStarsPreCheckout(pcq) {
  if (!pcq) {
    return { ok: false, error_message: 'Missing checkout details. Please try again.' };
  }
  if (pcq.currency !== 'XTR') {
    return {
      ok: false,
      error_message: 'Digital goods must be paid in Telegram Stars (XTR) only.'
    };
  }
  const parsed = parseStarsInvoicePayload(pcq.invoice_payload);
  const product = getStarsProduct(parsed.productId);
  if (!product) {
    return {
      ok: false,
      error_message: 'This product is no longer available. Open the Mini App for current passes.'
    };
  }
  if (Number(pcq.total_amount) !== Number(product.stars)) {
    return {
      ok: false,
      error_message: 'Price mismatch. Please reopen checkout from the Mini App.'
    };
  }
  return { ok: true };
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Validates Telegram WebApp initData HMAC-SHA256 signature
 */
async function verifyTelegramInitData(initData, botToken) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  // Replay Protection: Validate auth_date freshness
  const authDateStr = params.get('auth_date');
  if (authDateStr) {
    const authDate = parseInt(authDateStr, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    // Reject if expired (> 24 hours / 86400s) or clock-skewed into future (> 300s)
    if (isNaN(authDate) || (nowSeconds - authDate) > 86400 || (authDate - nowSeconds) > 300) {
      console.warn('initData rejected: auth_date expired or invalid timestamp');
      return null;
    }
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

  // Validate auth_date freshness (within 24 hours)
  const authDate = parseInt(data.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(authDate) || (now - authDate) > 86400 || (authDate - now) > 300) {
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

/**
 * Resolves user entitlement, 14-day trial status, and daily quota usage from D1
 */
async function resolveUserEntitlement(telegramId, db) {
  const defaultEntitlement = {
    tier: 'free',
    freeUsedToday: 0,
    trialStartedAt: Date.now(),
    trialDaysRemaining: 14,
    proPreviewTokensRemaining: 3
  };

  if (!telegramId || !db) {
    return defaultEntitlement;
  }

  try {
    const user = await db.prepare('SELECT * FROM telegram_users WHERE telegram_id = ?').bind(telegramId).first();
    if (!user) {
      return defaultEntitlement;
    }

    // Check expiry
    let tier = user.tier || 'free';
    if (user.tier_expires_at && user.tier_expires_at < Date.now()) {
      tier = 'free';
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const freeUsed = user.free_ai_last_date === todayStr ? (user.free_ai_used_today || 0) : 0;
    const trialStartedAt = user.trial_started_at || (user.created_at ? new Date(user.created_at).getTime() : Date.now());
    const trialDaysRemaining = Math.max(0, Math.ceil((trialStartedAt + 14 * 86400000 - Date.now()) / 86400000));
    const proPreviewTokens = typeof user.pro_preview_tokens_remaining === 'number' ? user.pro_preview_tokens_remaining : 3;

    return {
      tier,
      freeUsedToday: freeUsed,
      trialStartedAt,
      trialDaysRemaining,
      proPreviewTokensRemaining: proPreviewTokens,
      user
    };
  } catch (e) {
    return defaultEntitlement;
  }
}

/**
 * Updates daily AI quota counter
 */
async function incrementFreeAiUsage(telegramId, newCount, todayStr, db) {
  if (!telegramId || !db) return;
  try {
    await db.prepare(`
      INSERT INTO telegram_users (telegram_id, free_ai_used_today, free_ai_last_date, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_id) DO UPDATE SET
        free_ai_used_today = excluded.free_ai_used_today,
        free_ai_last_date = excluded.free_ai_last_date,
        updated_at = CURRENT_TIMESTAMP
    `).bind(telegramId, newCount, todayStr).run();
  } catch (e) {
    console.debug('Failed to update free quota:', e);
  }
}

async function ensureAuthAccountAiColumns(db) {
  if (!db) return;
  const alters = [
    'ALTER TABLE auth_accounts ADD COLUMN free_ai_used_today INTEGER DEFAULT 0',
    'ALTER TABLE auth_accounts ADD COLUMN free_ai_last_date TEXT',
    'ALTER TABLE auth_accounts ADD COLUMN tier TEXT DEFAULT \'free\'',
    'ALTER TABLE auth_accounts ADD COLUMN tier_expires_at INTEGER'
  ];
  for (const sql of alters) {
    try { await db.prepare(sql).run(); } catch (_) {}
  }
}

async function resolveFirebaseEntitlement(uid, db) {
  const defaultEntitlement = {
    tier: 'free',
    freeUsedToday: 0,
    trialStartedAt: Date.now(),
    trialDaysRemaining: 14,
    proPreviewTokensRemaining: 0
  };
  if (!uid || !db) return defaultEntitlement;
  try {
    await ensureAuthAccountAiColumns(db);
    const row = await db.prepare('SELECT * FROM auth_accounts WHERE uid = ?').bind(uid).first();
    if (!row) return defaultEntitlement;
    let tier = row.tier || 'free';
    if (row.tier_expires_at && row.tier_expires_at < Date.now()) tier = 'free';
    const todayStr = new Date().toISOString().slice(0, 10);
    const freeUsed = row.free_ai_last_date === todayStr ? (row.free_ai_used_today || 0) : 0;
    return {
      tier,
      freeUsedToday: freeUsed,
      trialStartedAt: Date.now(),
      trialDaysRemaining: 14,
      proPreviewTokensRemaining: 0,
      user: row
    };
  } catch (_) {
    return defaultEntitlement;
  }
}

async function incrementFirebaseFreeAiUsage(uid, newCount, todayStr, db) {
  if (!uid || !db) return;
  try {
    await ensureAuthAccountAiColumns(db);
    await db.prepare(`
      UPDATE auth_accounts
      SET free_ai_used_today = ?, free_ai_last_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE uid = ?
    `).bind(newCount, todayStr, uid).run();
  } catch (e) {
    console.debug('Failed to update Firebase free quota:', e);
  }
}

/**
 * Decrements complimentary Pro preview token count
 */
async function decrementProPreviewTokens(telegramId, currentCount, db) {
  if (!telegramId || !db || currentCount <= 0) return;
  try {
    const nextCount = Math.max(0, currentCount - 1);
    await db.prepare(`
      UPDATE telegram_users SET pro_preview_tokens_remaining = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?
    `).bind(nextCount, telegramId).run();
  } catch (e) {
    console.debug('Failed to decrement pro preview tokens:', e);
  }
}

// =========================================================================
// AI Provider Implementations (NVIDIA NIM, Ollama, OpenRouter, Groq, Workers AI)
// =========================================================================

/**
 * NVIDIA NIM Inference Provider
 */
async function executeNvidiaNim(userMessage, systemPrompt, model, env) {
  if (!env.NVIDIA_API_KEY) return null;
  const targetModel = model || 'meta/llama-3.1-70b-instruct';

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'nvidia',
        raw: data
      };
    }
  } catch (e) {
    console.warn('NVIDIA NIM call failed:', e.message);
  }
  return null;
}

/**
 * Private Self-Hosted Ollama Provider
 */
async function executeOllama(userMessage, systemPrompt, model, env) {
  const endpoint = env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
  const targetModel = model || env.OLLAMA_MODEL || 'deepseek-r1:8b';

  const headers = { 'Content-Type': 'application/json' };
  if (env.OLLAMA_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${env.OLLAMA_AUTH_TOKEN}`;
  }

  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'ollama',
        raw: data
      };
    }
  } catch (e) {
    console.warn('Ollama call failed:', e.message);
  }
  return null;
}

/**
 * OpenRouter Multi-Model Provider
 */
async function executeOpenRouter(userMessage, systemPrompt, model, env) {
  if (!env.OPENROUTER_API_KEY) return null;
  const targetModel = model || 'anthropic/claude-3.5-sonnet';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://clariora.com.au',
        'X-Title': 'Clariora A+'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 450
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'openrouter',
        raw: data
      };
    }
  } catch (e) {
    console.warn('OpenRouter call failed:', e.message);
  }
  return null;
}

/**
 * Groq Cloud Free Tier Provider
 */
async function executeGroq(userMessage, systemPrompt, model, env) {
  if (!env.GROQ_API_KEY) return null;
  const targetModel = model || 'llama-3.1-8b-instant';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 350
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        model: targetModel,
        provider: 'groq',
        raw: data
      };
    }
  } catch (e) {
    console.warn('Groq call failed:', e.message);
  }
  return null;
}

/**
 * Cloudflare Workers AI Native Edge Fallback
 */
async function executeWorkersAi(userMessage, systemPrompt, env) {
  if (!env.AI) return null;
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 350
    });
    return {
      text: response.response,
      model: '@cf/meta/llama-3.1-8b-instruct',
      provider: 'workers_ai'
    };
  } catch (e) {
    console.warn('Workers AI call failed:', e.message);
  }
  return null;
}
