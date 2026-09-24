/**
 * Production coach request handler: auth gates already done by caller optional;
 * this module owns rate limits, budgets, triage, circuits, metering.
 */

import { enforceCoachRateLimit, rateLimitHeaders } from './coach_rate_limiter.js';
import { withCircuit } from './circuit_breaker.js';
import {
  featuresForTier,
  getTierPolicy,
  allowProvider,
  resolveAllowedModel,
  normalizeTier
} from './tier_policy.js';
import { triageRequest, runCoachTurns } from './coach_orchestrator.js';
import {
  reserveBudget,
  settleBudget,
  estimateTokensFromText,
  extractUsageTokens
} from './token_budget.js';
import {
  extractAndStoreCoachTurn,
  assembleCoachBootContext
} from './agent_memory.js';
import {
  detectPromptInjection,
  checkIntentAndDrift,
  validateModelOutput,
  validateScriptingDependencies
} from './coach_security_guard.js';

export async function handleCoachRequest({
  request,
  env,
  body,
  corsHeaders,
  stream = false,
  auth,
  entitlement,
  providerExecutors
}) {
  const telegramId = auth.telegramId;
  const firebaseUid = auth.firebaseUid;
  const tier = normalizeTier(entitlement.tier);
  const policy = getTierPolicy(tier);
  const features = featuresForTier(tier);
  const provider = String(body.provider || 'groq').toLowerCase();
  const requestedModel = body.model || null;

  const useProPreview = body.useProPreview === true;
  let isProPreviewSession = false;
  const isPaid = tier !== 'free';

  // Legacy free daily coach counter (synced with Stars/TON entitlement UI)
  if (!isPaid && (entitlement.freeUsedToday || 0) >= policy.freeCoachCallsPerDay) {
    return json({
      error: 'FREE_QUOTA_EXHAUSTED',
      message: `You've used all ${policy.freeCoachCallsPerDay} free daily Groq AI coaching sessions. Upgrade with Telegram Stars or TON for higher hard AI budgets.`,
      tier: 'free',
      freeQuotaRemaining: 0,
      requiresStarsUpgrade: true,
      payRails: ['telegram_stars', 'ton_onchain'],
      features
    }, 402, corsHeaders);
  }

  // Rate limit: per identity, then soft IP
  const rateKey = telegramId
    ? `tg:${telegramId}`
    : (firebaseUid ? `fb:${firebaseUid}` : `ip:${request.headers.get('CF-Connecting-IP') || 'anon'}`);
  const userRate = await enforceCoachRateLimit(env, rateKey, policy.rateLimitPerMinute);
  if (!userRate.allowed) {
    logRateLimitBreach('coach', 'uid', { rateKey, tier, result: userRate });
    return json({
      error: 'RATE_LIMITED',
      message: 'Too many coach requests. Slow down and retry.',
      retryAfter: userRate.retryAfter || 60,
      tier,
      features
    }, 429, corsHeaders, rateLimitHeaders(userRate, userRate.retryAfter || 60));
  }

  // Whichever dimension the caller is closest to exhausting is the one the
  // response headers should describe, so the client backs off against the
  // limit that will actually stop it next.
  let advertisedLimit = userRate;

  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    const ipRate = await enforceCoachRateLimit(env, `ip:${ip}`, policy.ipRateLimitPerMinute);
    if (!ipRate.allowed) {
      logRateLimitBreach('coach', 'ip', { rateKey: `ip:${ip}`, tier, result: ipRate });
      return json({
        error: 'IP_RATE_LIMITED',
        message: 'Network rate limit reached. Retry shortly.',
        retryAfter: ipRate.retryAfter || 60
      }, 429, corsHeaders, rateLimitHeaders(ipRate, ipRate.retryAfter || 60));
    }
    if (ipRate.remaining < advertisedLimit.remaining) advertisedLimit = ipRate;
  }

  const limitHeaders = rateLimitHeaders(advertisedLimit);

  if (!allowProvider(tier, provider)) {
    if (!isPaid && (provider === 'nvidia' || provider === 'ollama' || provider === 'openrouter')) {
      if (useProPreview && entitlement.proPreviewTokensRemaining > 0) {
        isProPreviewSession = true;
      } else {
        return json({
          error: 'PAYWALL_REQUIRED',
          message: 'Premium models require a Clariora pass via Telegram Stars (XTR) or verified TON unlock.',
          tier: 'free',
          freeQuotaRemaining: Math.max(0, policy.freeCoachCallsPerDay - (entitlement.freeUsedToday || 0)),
          proPreviewTokensRemaining: entitlement.proPreviewTokensRemaining,
          trialDaysRemaining: entitlement.trialDaysRemaining,
          recommendedTiers: ['daily_pass', 'pro_monthly'],
          features: featuresForTier('free'),
          payRails: ['telegram_stars', 'ton_onchain']
        }, 402, corsHeaders);
      }
    } else {
      return json({
        error: 'PROVIDER_NOT_ALLOWED',
        message: `Provider ${provider} is not included in your ${tier} tier.`,
        tier,
        features
      }, 402, corsHeaders);
    }
  }

  const effectiveTier = isProPreviewSession ? 'pro_monthly' : tier;
  const effectivePolicy = getTierPolicy(effectiveTier);
  const model = resolveAllowedModel(
    effectiveTier,
    allowProvider(effectiveTier, provider) ? provider : 'groq',
    requestedModel
  );

  // Cybersecurity Guard: Prompt injection & adversarial payload detection
  const injection = detectPromptInjection(body.prompt || body.question);
  if (injection.detected) {
    return json({
      error: 'PROMPT_INJECTION_DETECTED',
      message: 'Your query contains unsupported instruction override tokens. Please rephrase your CompTIA A+ question.',
      tier,
      features
    }, 400, corsHeaders, limitHeaders);
  }

  // Cybersecurity Guard: Conversational drift & out-of-scope intent alignment
  const drift = checkIntentAndDrift(body.intent, body.question, body.prompt);
  if (drift.driftDetected) {
    return json({
      error: 'OUT_OF_SCOPE_INTENT',
      message: 'Ghost Coach is dedicated exclusively to CompTIA A+ Core 1 & Core 2 technical training. Inquiries outside this domain are restricted.',
      topic: drift.topic,
      tier,
      features
    }, 400, corsHeaders, limitHeaders);
  }

  const userRef = telegramId || firebaseUid;

  // PRE-FLIGHT CREDIT RESERVATION.
  //
  // The budget is debited here, before any provider is called, in one atomic
  // conditional UPDATE. A read-only check followed by a post-hoc debit lets
  // concurrent requests all observe the same "under budget" snapshot and all
  // spend; reserving first means an in-flight request is already counted.
  //
  // The reservation is an estimate; settleBudget() reconciles it to the
  // provider's reported usage once the turn completes.
  const estimatedCost = estimateReservation(body, triageMaxTurnsHint(effectivePolicy));
  const reservation = await reserveBudget(env.DB, userRef, effectiveTier, estimatedCost);
  if (!reservation.ok) {
    console.warn(JSON.stringify({
      event: 'ai_budget_denied',
      action: 'coach',
      tier: effectiveTier,
      reason: reservation.error,
      tokensToday: reservation.state && reservation.state.tokensToday,
      callsToday: reservation.state && reservation.state.callsToday,
      ts: new Date().toISOString()
    }));

    const isOutage = reservation.error === 'BUDGET_STORE_ERROR' ||
                     reservation.error === 'BUDGET_STORE_UNAVAILABLE' ||
                     reservation.error === 'BUDGET_RESERVATION_FAILED';

    return json({
      error: reservation.error,
      message: reservation.message,
      tier: effectiveTier,
      budget: {
        tokensToday: reservation.state.tokensToday,
        tokensMonth: reservation.state.tokensMonth,
        callsToday: reservation.state.callsToday,
        dailyTokenBudget: reservation.policy.dailyTokenBudget,
        monthlyTokenBudget: reservation.policy.monthlyTokenBudget,
        dailyCallBudget: reservation.policy.freeCoachCallsPerDay
      },
      requiresStarsUpgrade: !isOutage && effectiveTier === 'free',
      payRails: ['telegram_stars', 'ton_onchain'],
      features: featuresForTier(effectiveTier)
    // 503 for an accounting outage, 402 for a genuine quota wall. Billing a
    // paying user a paywall prompt because our own store is down is wrong.
    }, isOutage ? 503 : 402, corsHeaders, limitHeaders);
  }
  const reservedTokens = reservation.reserved;

  // Free counter keep-in-sync for any provider
  if (!isPaid && !isProPreviewSession && telegramId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (typeof providerExecutors.incrementFreeAiUsage === 'function') {
      await providerExecutors.incrementFreeAiUsage(
        telegramId,
        (entitlement.freeUsedToday || 0) + 1,
        todayStr,
        env.DB
      );
    }
  } else if (!isPaid && !isProPreviewSession && firebaseUid) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (typeof providerExecutors.incrementFirebaseFreeAiUsage === 'function') {
      await providerExecutors.incrementFirebaseFreeAiUsage(
        firebaseUid,
        (entitlement.freeUsedToday || 0) + 1,
        todayStr,
        env.DB
      );
    }
  }

  if (isProPreviewSession && telegramId && typeof providerExecutors.decrementProPreviewTokens === 'function') {
    await providerExecutors.decrementProPreviewTokens(
      telegramId,
      entitlement.proPreviewTokensRemaining,
      env.DB
    );
  }

  const triage = triageRequest(body, effectiveTier);
  if (stream && !triage.streamingAllowed) {
    return json({
      error: 'STREAMING_PAYWALL',
      message: 'Streaming coach requires Daily Pass, Pro, or Lifetime (Stars or TON).',
      tier,
      features,
      payRails: ['telegram_stars', 'ton_onchain']
    }, 402, corsHeaders);
  }

  let memoryHits = [];
  let memoryBlock = '';
  let bootMeta = null;
  try {
    const boot = await assembleCoachBootContext(env.DB, auth, body);
    memoryHits = boot.memoryHits || [];
    memoryBlock = boot.memoryBlock || '';
    bootMeta = boot.pack
      ? {
          chars: boot.pack.chars,
          capped: boot.pack.capped,
          included: boot.pack.included
        }
      : null;
    if (memoryBlock) {
      body = Object.assign({}, body, {
        _memoryBlock: memoryBlock,
        _bootPack: bootMeta
      });
    }
  } catch (memReadErr) {
    console.warn('agent_memory boot pack skipped:', memReadErr && memReadErr.message);
  }

  const startTime = Date.now();
  const routeProvider = allowProvider(effectiveTier, provider) ? provider : 'groq';

  const callModel = async ({ systemPrompt, userMessage }) => {
    const sys = memoryBlock
      ? (String(systemPrompt || '') + '\n\n' + memoryBlock)
      : systemPrompt;
    const runOne = async (pName) => {
      const exec = providerExecutors[pName];
      if (!exec) return null;
      const gated = await withCircuit(env.DB, pName, () => exec(userMessage, sys, model, env));
      return gated.ok ? gated.result : null;
    };

    let aiResult = await runOne(routeProvider);
    if (!aiResult && routeProvider !== 'groq') aiResult = await runOne('groq');
    if (!aiResult && env.AI) aiResult = await runOne('workers_ai');
    if (!aiResult) {
      return {
        text: 'AI Tutor is temporarily unavailable. Provider circuits may be cooling down. Try again shortly.',
        model: 'offline_fallback',
        provider: routeProvider,
        tokens_used: 0
      };
    }
    const estimate = estimateTokensFromText(sys, userMessage, aiResult.text);
    const tokens = extractUsageTokens(aiResult.raw, estimate);
    return { ...aiResult, tokens_used: tokens };
  };

  if (stream) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const writeEvent = async (event, data) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    (async () => {
      try {
        await writeEvent('meta', {
          tier: effectiveTier,
          intent: triage.intent,
          specialist: triage.specialist,
          maxTurns: triage.maxTurns,
          provider: routeProvider,
          model
        });

        const ran = await runCoachTurns({
          tier: effectiveTier,
          body,
          triage,
          callModel,
          onTurn: async ({ turn, result }) => {
            if (result && result.text) {
              await writeEvent('token', { turn, text: result.text });
            }
          }
        });

        const aiResult = ran.result || {
          text: '',
          provider: routeProvider,
          model,
          tokens_used: 0
        };
        const latencyMs = Date.now() - startTime;
        const tokensUsed = Number(aiResult.tokens_used) || 0;
        // Reconcile the pre-flight reservation against what the provider
        // actually charged. Relative adjustment, so concurrent turns sum.
        const budget = await settleBudget(env.DB, userRef, reservedTokens, tokensUsed, effectiveTier);
        await logUsage(env, telegramId, effectiveTier, aiResult, latencyMs, tokensUsed);

        let memoryWrite = null;
        try {
          memoryWrite = await extractAndStoreCoachTurn(env.DB, auth, {
            body,
            triage,
            replyText: aiResult.text
          });
        } catch (memErr) {
          console.warn('agent_memory extract (stream) skipped:', memErr && memErr.message);
        }

        await writeEvent('done', {
          text: aiResult.text,
          reply: aiResult.text,
          provider: aiResult.provider,
          model: aiResult.model,
          tier: effectiveTier,
          turnsUsed: ran.turnsUsed,
          toolResults: ran.toolResults,
          triage: { intent: triage.intent, specialist: triage.specialist },
          memoriesUsed: memoryHits.length,
          bootPack: bootMeta,
          memoryWrite: memoryWrite
            ? { stored: memoryWrite.stored, updated: memoryWrite.updated, facts: memoryWrite.facts }
            : null,
          tokensUsed,
          budget,
          features: featuresForTier(effectiveTier),
          freeQuotaRemaining: budget ? budget.dailyCallsRemaining : null,
          trialDaysRemaining: entitlement.trialDaysRemaining,
          proPreviewTokensRemaining: isProPreviewSession
            ? Math.max(0, entitlement.proPreviewTokensRemaining - 1)
            : entitlement.proPreviewTokensRemaining,
          isProPreview: isProPreviewSession,
          upsellMessage: buildUpsell(effectiveTier, budget)
        });
      } catch (err) {
        await writeEvent('error', { message: err && err.message ? err.message : 'stream_failed' });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...limitHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  const ran = await runCoachTurns({
    tier: effectiveTier,
    body,
    triage,
    callModel
  });

  const aiResult = ran.result || {
    text: 'AI Tutor service is temporarily unavailable.',
    model: 'offline_fallback',
    provider: routeProvider,
    tokens_used: 0
  };

  const latencyMs = Date.now() - startTime;
  const tokensUsed = Number(aiResult.tokens_used) || 0;
  // Reconcile the pre-flight reservation against actual provider usage.
  const budget = await settleBudget(env.DB, userRef, reservedTokens, tokensUsed, effectiveTier);
  await logUsage(env, telegramId, effectiveTier, aiResult, latencyMs, tokensUsed);

  let memoryWrite = null;
  try {
    memoryWrite = await extractAndStoreCoachTurn(env.DB, auth, {
      body,
      triage,
      replyText: aiResult.text
    });
  } catch (memErr) {
    console.warn('agent_memory extract skipped:', memErr && memErr.message);
  }

  const freeRemaining = budget
    ? budget.dailyCallsRemaining
    : Math.max(0, policy.freeCoachCallsPerDay - ((entitlement.freeUsedToday || 0) + 1));

  return json({
    text: aiResult.text,
    reply: aiResult.text,
    provider: aiResult.provider,
    model: aiResult.model,
    tier: effectiveTier,
    turnsUsed: ran.turnsUsed,
    toolResults: ran.toolResults,
    triage: { intent: triage.intent, specialist: triage.specialist, maxTurns: triage.maxTurns },
    memoriesUsed: memoryHits.length,
    bootPack: bootMeta,
    memoryWrite: memoryWrite
      ? { stored: memoryWrite.stored, updated: memoryWrite.updated, facts: memoryWrite.facts }
      : null,
    tokensUsed,
    budget,
    features: featuresForTier(effectiveTier),
    freeQuotaRemaining: freeRemaining,
    trialDaysRemaining: entitlement.trialDaysRemaining,
    proPreviewTokensRemaining: isProPreviewSession
      ? Math.max(0, entitlement.proPreviewTokensRemaining - 1)
      : entitlement.proPreviewTokensRemaining,
    isProPreview: isProPreviewSession,
    upsellMessage: buildUpsell(effectiveTier, budget)
  }, 200, corsHeaders, limitHeaders);
}

/** Upper bound on turns this tier can spend, used to size the reservation. */
function triageMaxTurnsHint(policy) {
  return Math.max(1, Number(policy && policy.maxTurns) || 1);
}

/**
 * Estimates what this request will cost before we spend it.
 *
 * Deliberately pessimistic: an under-estimate lets a request slip past a cap it
 * should have hit, while an over-estimate only costs the user a little headroom
 * that settleBudget() hands straight back once the real usage is known.
 */
function estimateReservation(body, maxTurns) {
  const promptChars =
    String((body && body.system) || '').length +
    String((body && body.prompt) || '').length +
    String((body && body.question) || '').length +
    String((body && body._memoryBlock) || '').length;

  const promptTokens = Math.ceil(promptChars / 4);
  // Assume a full-length completion per turn rather than a typical one.
  const completionTokens = 700;
  return Math.max(512, (promptTokens + completionTokens) * maxTurns);
}

function logRateLimitBreach(action, dimension, { rateKey, tier, result }) {
  console.warn(JSON.stringify({
    event: 'rate_limit_exceeded',
    action,
    dimension,
    key: rateKey,
    tier,
    limit: result && result.limit,
    retryAfter: result && result.retryAfter,
    degraded: !!(result && result.degraded),
    reason: (result && result.reason) || 'THRESHOLD_EXCEEDED',
    ts: new Date().toISOString()
  }));
}

function buildUpsell(tier, budget) {
  if (tier === 'free') {
    return 'Unlock streaming, multi-specialist handoffs, and higher hard AI budgets with Telegram Stars or TON.';
  }
  if (budget && budget.dailyTokensRemaining < 2000) {
    return 'Approaching your hard daily AI token budget. Lifetime raises the ceiling.';
  }
  return null;
}

async function logUsage(env, telegramId, tier, aiResult, latencyMs, tokensUsed) {
  if (!env.DB || !telegramId) return;
  try {
    await env.DB.prepare(
      'INSERT INTO ai_usage_log (telegram_id, tier, provider, model, tokens_used, latency_ms) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(telegramId, tier, aiResult.provider, aiResult.model, tokensUsed || 0, latencyMs).run();
  } catch (e) {
    console.debug('AI log insert skipped:', e.message);
  }
}

function json(body, status, corsHeaders, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders }
  });
}
