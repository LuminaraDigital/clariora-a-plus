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
import { triageRequest, runCoachTurns, plannedTurns } from './coach_orchestrator.js';
import { PROVIDER_MAX_TOKENS } from './api_ai_providers.js';
import {
  reserveBudget,
  settleBudget,
  recordCachedCall,
  estimateTokensFromText,
  extractUsageTokens
} from './token_budget.js';
import {
  isExplainCacheable,
  explainCacheKey,
  canonicalExplainBody,
  canonicalExplainTriage,
  readExplainCache,
  writeExplainCache,
  referencesOptionLetters,
  questionIdOf,
  PREWARM_MODEL,
  CACHEABLE_SYSTEM_SUFFIX
} from './explain_cache.js';
import {
  extractAndStoreCoachTurn,
  assembleCoachBootContext,
  SESSION_BOOT_MAX_CHARS
} from './agent_memory.js';
import { findSimilarQuestionIds } from './question_vectors.js';
import { BANK_STEMS } from './bank_stems.js';
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
  providerExecutors,
  ctx = null
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
  const model = resolveAllowedModel(
    effectiveTier,
    allowProvider(effectiveTier, provider) ? provider : 'groq',
    requestedModel
  );

  // Cybersecurity Guard: Prompt injection & adversarial payload detection
  const injection = detectPromptInjection([body.prompt, body.question].filter(Boolean).join('\n'));
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

  let triage = triageRequest(body, effectiveTier);
  if (stream && !triage.streamingAllowed) {
    return json({
      error: 'STREAMING_PAYWALL',
      message: 'Streaming coach requires Daily Pass, Pro, or Lifetime (Stars or TON).',
      tier,
      features,
      payRails: ['telegram_stars', 'ton_onchain']
    }, 402, corsHeaders);
  }
  const routeProvider = allowProvider(effectiveTier, provider) ? provider : 'groq';
  const budgetOpts = {
    passExpiresAt: entitlement.tierExpiresAt ||
      (entitlement.user && entitlement.user.tier_expires_at) || null,
    windowTier: tier
  };

  const syncFreeCounters = async () => {
    if (isPaid || isProPreviewSession) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (telegramId && typeof providerExecutors.incrementFreeAiUsage === 'function') {
      await providerExecutors.incrementFreeAiUsage(telegramId, (entitlement.freeUsedToday || 0) + 1, todayStr, env.DB);
    } else if (!telegramId && firebaseUid && typeof providerExecutors.incrementFirebaseFreeAiUsage === 'function') {
      await providerExecutors.incrementFirebaseFreeAiUsage(firebaseUid, (entitlement.freeUsedToday || 0) + 1, todayStr, env.DB);
    }
  };

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

  // Shared rows are only safe while the consistency guard vets what gets stored.
  // Any eligible explain may read a row (rows are impersonal by construction);
  // only a request without learner memory may write one.
  const cacheEligible = env.AI_EXPLAIN_CACHE === '1' && env.AI_GUARD_CONSISTENCY !== '0' && !isProPreviewSession &&
    isExplainCacheable(body, triage, '');
  const cacheable = cacheEligible && !memoryBlock;
  let cacheKey = null;
  if (cacheEligible) {
    const keyBody = canonicalExplainBody(body);
    const keyTriage = canonicalExplainTriage(triageRequest(keyBody, effectiveTier));
    cacheKey = await explainCacheKey(keyBody, model, keyTriage.specialist);
    if (cacheable) {
      body = keyBody;
      triage = keyTriage;
    }
    const hit = await readExplainCache(env.DB, [
      cacheKey,
      await explainCacheKey(keyBody, PREWARM_MODEL, keyTriage.specialist)
    ]);
    if (hit) {
      const metered = await recordCachedCall(env.DB, userRef, effectiveTier, budgetOpts);
      if (!metered.ok) {
        const isOutage = metered.error !== 'DAILY_CALL_BUDGET_EXHAUSTED';
        return json({
          error: metered.error,
          message: metered.message,
          tier: effectiveTier,
          requiresStarsUpgrade: !isOutage && effectiveTier === 'free',
          payRails: ['telegram_stars', 'ton_onchain'],
          features: featuresForTier(effectiveTier)
        }, isOutage ? 503 : 402, corsHeaders, limitHeaders);
      }
      await syncFreeCounters();
      const cachedResult = { text: hit.body, provider: 'cache', model: hit.model };
      await logUsage(env, { telegramId, firebaseUid }, effectiveTier, cachedResult, 0, 0, { intent: triage.intent, cacheHit: true, turns: 0 });
      const budget = await settleBudget(env.DB, userRef, 0, 0, effectiveTier, budgetOpts);
      const payload = {
        text: hit.body,
        reply: hit.body,
        provider: 'cache',
        model: hit.model,
        cached: true,
        tier: effectiveTier,
        turnsUsed: 0,
        toolResults: [],
        triage: { intent: triage.intent, specialist: triage.specialist, maxTurns: triage.maxTurns },
        memoriesUsed: 0,
        tokensUsed: 0,
        budget,
        features: featuresForTier(effectiveTier),
        freeQuotaRemaining: budget ? budget.dailyCallsRemaining : null,
        trialDaysRemaining: entitlement.trialDaysRemaining,
        proPreviewTokensRemaining: entitlement.proPreviewTokensRemaining,
        isProPreview: false,
        upsellMessage: buildUpsell(effectiveTier, budget)
      };
      if (stream) return cachedStreamResponse(payload, corsHeaders, limitHeaders);
      return json(payload, 200, corsHeaders, limitHeaders);
    }
  }

  // PRE-FLIGHT CREDIT RESERVATION.
  //
  // The budget is debited here, before any provider is called, in one atomic
  // conditional UPDATE. A read-only check followed by a post-hoc debit lets
  // concurrent requests all observe the same "under budget" snapshot and all
  // spend; reserving first means an in-flight request is already counted.
  //
  // The reservation is an estimate; settleBudget() reconciles it to the
  // provider's reported usage once the turn completes.
  const estimatedCost = estimateReservation(body, plannedTurns(triage), PROVIDER_MAX_TOKENS[routeProvider]);
  const reservation = await reserveBudget(env.DB, userRef, effectiveTier, estimatedCost, budgetOpts);
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

  let tokensAcrossTurns = 0;
  // Every exit after a successful reservation must settle it exactly once,
  // including throws and dropped streams; otherwise the unused part stays charged.
  let settlement = null;
  const settleOnce = () => {
    if (!settlement) {
      settlement = settleBudget(env.DB, userRef, reservedTokens, tokensAcrossTurns, effectiveTier, budgetOpts);
    }
    return settlement;
  };

  try {
    await syncFreeCounters();
    if (isProPreviewSession && telegramId && typeof providerExecutors.decrementProPreviewTokens === 'function') {
      await providerExecutors.decrementProPreviewTokens(
        telegramId,
        entitlement.proPreviewTokensRemaining,
        env.DB
      );
    }
  } catch (preErr) {
    await settleOnce().catch(() => {});
    throw preErr;
  }

  // Prefetch similar bank items for RAG-style coach grounding (ids + short stems).
  // Rendered as trusted server context, so a client-supplied value must never survive.
  body = Object.assign({}, body, { _similarItems: [] });
  try {
    const seedText = [body.question, body.objective, body.prompt].filter(Boolean).join(' ').slice(0, 1200);
    const sim = await findSimilarQuestionIds(env, {
      qid: body.questionId || body.qid || '',
      text: seedText,
      k: 5
    });
    body._similarItems = similarItemsWithStems(sim && sim.ids, body);
  } catch (simErr) {
    console.warn('similar prefetch skipped:', simErr && simErr.message);
  }

  const startTime = Date.now();

  const callModel = async ({ systemPrompt, userMessage, turn }) => {
    let sys = memoryBlock && !(turn > 1)
      ? (String(systemPrompt || '') + '\n\n' + memoryBlock)
      : systemPrompt;
    if (cacheable) sys = String(sys || '') + '\n\n' + CACHEABLE_SYSTEM_SUFFIX;
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
    tokensAcrossTurns += tokens;
    return { ...aiResult, tokens_used: tokens };
  };

  const storeIfCacheable = async (aiResult) => {
    if (!cacheable || !cacheKey || !aiResult || !aiResult.text) return;
    if (aiResult.model === 'offline_fallback' || aiResult.grounded === false) return;
    // The key names the requested model; a fallback provider's reply must not fill it.
    if (aiResult.provider !== routeProvider) return;
    if (!aiResult.security || !aiResult.security.clean) return;
    if (referencesOptionLetters(aiResult.text)) return;
    await writeExplainCache(env.DB, { key: cacheKey, qid: questionIdOf(body), model, text: aiResult.text });
  };

  if (stream) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const writeEvent = async (event, data) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    const task = (async () => {
      let logged = false;
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
          guardConsistency: env.AI_GUARD_CONSISTENCY !== '0',
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
        const tokensUsed = tokensAcrossTurns;
        // Reconcile the pre-flight reservation against what the provider
        // actually charged. Relative adjustment, so concurrent turns sum.
        const budget = await settleOnce();
        await logUsage(env, { telegramId, firebaseUid }, effectiveTier, aiResult, latencyMs, tokensUsed, { intent: triage.intent, cacheHit: false, turns: ran.turnsUsed });
        logged = true;
        await storeIfCacheable(aiResult);

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
          toolResults: clientToolResults(ran.toolResults),
          grounded: !(ran.result && ran.result.grounded === false),
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
        try {
          await writeEvent('error', { message: err && err.message ? err.message : 'stream_failed' });
        } catch (_) {
          // Client already disconnected.
        }
      } finally {
        await settleOnce().catch((e) => console.warn('stream settle failed:', e && e.message));
        if (!logged && tokensAcrossTurns > 0) {
          await logUsage(env, { telegramId, firebaseUid }, effectiveTier, { provider: routeProvider, model }, Date.now() - startTime, tokensAcrossTurns, { intent: triage.intent, cacheHit: false, turns: 0 })
            .catch(() => {});
        }
        try {
          await writer.close();
        } catch (_) {
          // Stream already errored or closed by the client.
        }
      }
    })();
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(task);

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

  let ran;
  try {
    ran = await runCoachTurns({
      tier: effectiveTier,
      body,
      triage,
      callModel,
      guardConsistency: env.AI_GUARD_CONSISTENCY !== '0'
    });
  } catch (runErr) {
    await settleOnce().catch(() => {});
    throw runErr;
  }

  const aiResult = ran.result || {
    text: 'AI Tutor service is temporarily unavailable.',
    model: 'offline_fallback',
    provider: routeProvider,
    tokens_used: 0
  };

  const latencyMs = Date.now() - startTime;
  const tokensUsed = tokensAcrossTurns;
  // Reconcile the pre-flight reservation against actual provider usage.
  const budget = await settleOnce();
  await logUsage(env, { telegramId, firebaseUid }, effectiveTier, aiResult, latencyMs, tokensUsed, { intent: triage.intent, cacheHit: false, turns: ran.turnsUsed });
  await storeIfCacheable(aiResult);

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
    toolResults: clientToolResults(ran.toolResults),
    grounded: !(ran.result && ran.result.grounded === false),
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

/** Tool context as the client may see it: neighbor stems are premium bank text. */
export function clientToolResults(toolResults) {
  return (Array.isArray(toolResults) ? toolResults : []).map((t) => {
    if (!t || t.name !== 'retrieve_similar_items' || !t.result || !Array.isArray(t.result.items)) return t;
    return {
      ...t,
      result: { ...t.result, items: t.result.items.map(({ stem, ...rest }) => rest) }
    };
  });
}

/**
 * Turns neighbor ids into grounding items. Ids with no known stem are dropped:
 * a bare id gives the model nothing to cite except an invented question.
 */
export function similarItemsWithStems(ids, body, stems = BANK_STEMS) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  for (const id of ids) {
    const row = stems[String(id)];
    if (!row || !row.stem) continue;
    out.push({
      id: String(id),
      objective: row.objective || '',
      domain: (body && body.domain) || '',
      stem: row.stem
    });
  }
  return out;
}

// Context added after the reservation: system prompt (~1.5k chars), the user
// message wrapper, the memory boot pack, and similar-item retrieval.
const SERVER_PROMPT_CHARS = 1500 + 250 + SESSION_BOOT_MAX_CHARS + 1300;
// Turns after the first resend the previous draft (sanitised to 1200 chars).
const REFINE_DRAFT_CHARS = 1200;

/**
 * Estimates what this request will cost before we spend it.
 *
 * Pessimistic on input (assumes the full memory pack) and exact on output (the
 * provider's own completion cap per planned turn): an under-estimate lets a
 * request slip past a cap it should have hit, while an over-estimate only costs
 * headroom that settleBudget() hands straight back.
 */
export function estimateReservation(body, turns, completionCap) {
  const clientChars =
    String((body && body.system) || '').length +
    String((body && body.prompt) || '').length +
    String((body && body.question) || '').length +
    JSON.stringify((body && body.options) || []).length +
    JSON.stringify((body && body.distractorAnalysis) || {}).length;
  const n = Math.max(1, Number(turns) || 1);
  const completion = Number(completionCap) || 450;
  const promptTokens = Math.ceil((clientChars + SERVER_PROMPT_CHARS) / 4);
  const refineTokens = Math.ceil(REFINE_DRAFT_CHARS / 4) * (n - 1);
  return Math.max(512, (promptTokens + completion) * n + refineTokens);
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

async function logUsage(env, { telegramId, firebaseUid }, tier, aiResult, latencyMs, tokensUsed, meta = {}) {
  if (!env.DB) return;
  const base = [telegramId || null, tier, aiResult.provider, aiResult.model, tokensUsed || 0, latencyMs];
  const userRef = telegramId ? 'tg:' + telegramId : (firebaseUid ? 'fb:' + firebaseUid : null);
  try {
    await env.DB.prepare(
      'INSERT INTO ai_usage_log (telegram_id, tier, provider, model, tokens_used, latency_ms, intent, cache_hit, turns, user_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(...base, meta.intent || null, meta.cacheHit ? 1 : 0, meta.turns || 0, userRef).run();
  } catch (_) {
    // Before migration 0004 the extra columns do not exist; keep the core row.
    try {
      await env.DB.prepare(
        'INSERT INTO ai_usage_log (telegram_id, tier, provider, model, tokens_used, latency_ms) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(...base).run();
    } catch (e) {
      console.debug('AI log insert skipped:', e.message);
    }
  }
}

function cachedStreamResponse(payload, corsHeaders, limitHeaders) {
  const encoder = new TextEncoder();
  const event = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  const body = event('meta', { tier: payload.tier, intent: payload.triage.intent, specialist: payload.triage.specialist, provider: 'cache', model: payload.model, cached: true }) +
    event('token', { turn: 1, text: payload.text }) +
    event('done', payload);
  return new Response(encoder.encode(body), {
    status: 200,
    headers: {
      ...corsHeaders,
      ...limitHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
}

function json(body, status, corsHeaders, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders }
  });
}
