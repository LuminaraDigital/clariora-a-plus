/**
 * Production coach request handler: auth gates already done by caller optional;
 * this module owns rate limits, budgets, triage, circuits, metering.
 */

import { enforceCoachRateLimit } from './coach_rate_limiter.js';
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
  assertWithinBudget,
  consumeBudget,
  estimateTokensFromText,
  extractUsageTokens
} from './token_budget.js';
import {
  searchMemories,
  formatMemoriesForPrompt,
  rememberMiss,
  addMemory
} from './agent_memory.js';

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
    return json({
      error: 'RATE_LIMITED',
      message: 'Too many coach requests. Slow down and retry.',
      retryAfter: userRate.retryAfter || 60,
      tier,
      features
    }, 429, corsHeaders, { 'Retry-After': String(userRate.retryAfter || 60) });
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
    const ipRate = await enforceCoachRateLimit(env, `ip:${ip}`, policy.ipRateLimitPerMinute);
    if (!ipRate.allowed) {
      return json({
        error: 'IP_RATE_LIMITED',
        message: 'Network rate limit reached. Retry shortly.',
        retryAfter: ipRate.retryAfter || 60
      }, 429, corsHeaders, { 'Retry-After': String(ipRate.retryAfter || 60) });
    }
  }

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

  const budgetGate = await assertWithinBudget(env.DB, telegramId, effectiveTier);
  if (!budgetGate.ok) {
    return json({
      error: budgetGate.error,
      message: budgetGate.message,
      tier: effectiveTier,
      budget: {
        tokensToday: budgetGate.state.tokensToday,
        tokensMonth: budgetGate.state.tokensMonth,
        callsToday: budgetGate.state.callsToday,
        dailyTokenBudget: budgetGate.policy.dailyTokenBudget,
        monthlyTokenBudget: budgetGate.policy.monthlyTokenBudget,
        dailyCallBudget: budgetGate.policy.freeCoachCallsPerDay
      },
      requiresStarsUpgrade: effectiveTier === 'free',
      payRails: ['telegram_stars', 'ton_onchain'],
      features: featuresForTier(effectiveTier)
    }, 402, corsHeaders);
  }

  // Legacy free counter keep-in-sync for existing clients/tests
  if (!isPaid && !isProPreviewSession && provider === 'groq' && telegramId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (typeof providerExecutors.incrementFreeAiUsage === 'function') {
      await providerExecutors.incrementFreeAiUsage(
        telegramId,
        (entitlement.freeUsedToday || 0) + 1,
        todayStr,
        env.DB
      );
    }
  } else if (!isPaid && !isProPreviewSession && provider === 'groq' && firebaseUid) {
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
  try {
    memoryHits = await searchMemories(env.DB, auth, {
      query: [body.objective, body.domain, body.topic, body.prompt].filter(Boolean).join(' ').slice(0, 200),
      topK: 5
    });
    memoryBlock = formatMemoriesForPrompt(memoryHits);
    if (memoryBlock) {
      body = Object.assign({}, body, {
        _memoryBlock: memoryBlock
      });
    }
  } catch (memReadErr) {
    console.warn('agent_memory search skipped:', memReadErr && memReadErr.message);
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
        const budget = await consumeBudget(env.DB, telegramId, tokensUsed, effectiveTier);
        await logUsage(env, telegramId, effectiveTier, aiResult, latencyMs, tokensUsed);

        await writeEvent('done', {
          text: aiResult.text,
          reply: aiResult.text,
          provider: aiResult.provider,
          model: aiResult.model,
          tier: effectiveTier,
          turnsUsed: ran.turnsUsed,
          toolResults: ran.toolResults,
          triage: { intent: triage.intent, specialist: triage.specialist },
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
  const budget = await consumeBudget(env.DB, telegramId, tokensUsed, effectiveTier);
  await logUsage(env, telegramId, effectiveTier, aiResult, latencyMs, tokensUsed);

  try {
    await rememberMiss(env.DB, auth, body);
    if (aiResult && aiResult.text && triage && triage.specialist) {
      await addMemory(env.DB, auth, {
        kind: 'session_note',
        content: ('Coach ' + triage.intent + '/' + triage.specialist + ': ' + String(aiResult.text).slice(0, 280)),
        objective: body.objective || body.domain || null,
        score: 0.8
      });
    }
  } catch (memErr) {
    console.warn('agent_memory write skipped:', memErr && memErr.message);
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
  }, 200, corsHeaders);
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
