/**
 * Canonical AI / feature gates for Clariora TMA.
 * Stars (XTR) is the Telegram digital-goods rail; TON is a parallel on-chain unlock.
 * Paid tiers have HARD token/call budgets (never unlimited).
 */

export const TIER_POLICY = {
  free: {
    id: 'free',
    label: 'Free',
    freeCoachCallsPerDay: 5,
    rateLimitPerMinute: 8,
    ipRateLimitPerMinute: 30,
    dailyTokenBudget: 4000,
    monthlyTokenBudget: 40000,
    maxTurns: 1,
    streaming: false,
    intents: ['explain'],
    tools: ['lookup_objective'],
    specialists: ['hardware'],
    providers: ['groq', 'workers_ai'],
    modelsAllowlist: {
      groq: ['llama-3.1-8b-instant'],
      workers_ai: ['@cf/meta/llama-3.1-8b-instruct']
    },
    asyncJobs: false,
    warRoom: false
  },
  daily_pass: {
    id: 'daily_pass',
    label: '24-Hour Pass',
    freeCoachCallsPerDay: 40,
    rateLimitPerMinute: 20,
    ipRateLimitPerMinute: 60,
    dailyTokenBudget: 25000,
    monthlyTokenBudget: 25000,
    maxTurns: 2,
    streaming: true,
    intents: ['explain', 'drill'],
    tools: ['lookup_objective', 'get_miss_history'],
    specialists: ['hardware', 'networking'],
    providers: ['groq', 'workers_ai', 'nvidia'],
    modelsAllowlist: {
      groq: ['llama-3.1-8b-instant'],
      nvidia: ['meta/llama-3.1-70b-instruct'],
      workers_ai: ['@cf/meta/llama-3.1-8b-instruct']
    },
    asyncJobs: false,
    warRoom: false
  },
  pro_monthly: {
    id: 'pro_monthly',
    label: 'Pro Monthly',
    freeCoachCallsPerDay: 120,
    rateLimitPerMinute: 40,
    ipRateLimitPerMinute: 120,
    dailyTokenBudget: 80000,
    monthlyTokenBudget: 1200000,
    maxTurns: 4,
    streaming: true,
    intents: ['explain', 'drill', 'pbq', 'strategy'],
    tools: ['lookup_objective', 'get_miss_history', 'build_raid_set'],
    specialists: ['hardware', 'networking', 'security', 'os', 'pbq'],
    providers: ['groq', 'nvidia', 'ollama', 'openrouter', 'workers_ai'],
    modelsAllowlist: {
      groq: ['llama-3.1-8b-instant'],
      nvidia: ['meta/llama-3.1-70b-instruct', 'meta/llama-3.3-70b-instruct'],
      ollama: ['deepseek-r1:8b'],
      openrouter: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-r1'],
      workers_ai: ['@cf/meta/llama-3.1-8b-instruct']
    },
    asyncJobs: true,
    warRoom: false
  },
  lifetime: {
    id: 'lifetime',
    label: 'Lifetime Master',
    freeCoachCallsPerDay: 200,
    rateLimitPerMinute: 60,
    ipRateLimitPerMinute: 180,
    dailyTokenBudget: 150000,
    monthlyTokenBudget: 3000000,
    maxTurns: 5,
    streaming: true,
    intents: ['explain', 'drill', 'pbq', 'strategy', 'war_room'],
    tools: ['lookup_objective', 'get_miss_history', 'build_raid_set'],
    specialists: ['hardware', 'networking', 'security', 'os', 'pbq', 'exam_strategy'],
    providers: ['groq', 'nvidia', 'ollama', 'openrouter', 'workers_ai'],
    modelsAllowlist: {
      groq: ['llama-3.1-8b-instant'],
      nvidia: ['meta/llama-3.1-70b-instruct', 'meta/llama-3.3-70b-instruct'],
      ollama: ['deepseek-r1:8b'],
      openrouter: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-r1'],
      workers_ai: ['@cf/meta/llama-3.1-8b-instruct']
    },
    asyncJobs: true,
    warRoom: true
  }
};

export function normalizeTier(tier) {
  const t = String(tier || 'free').toLowerCase();
  if (t === 'daily_pass' || t === 'daily_unlimited') return 'daily_pass';
  if (t === 'pro_monthly' || t === 'pro') return 'pro_monthly';
  if (t === 'lifetime' || t === 'lifetime_master') return 'lifetime';
  return 'free';
}

export function getTierPolicy(tier) {
  return TIER_POLICY[normalizeTier(tier)] || TIER_POLICY.free;
}

export function featuresForTier(tier) {
  const p = getTierPolicy(tier);
  return {
    tier: p.id,
    streaming: p.streaming,
    maxTurns: p.maxTurns,
    intents: p.intents.slice(),
    tools: p.tools.slice(),
    specialists: p.specialists.slice(),
    providers: p.providers.slice(),
    asyncJobs: p.asyncJobs,
    warRoom: p.warRoom,
    dailyTokenBudget: p.dailyTokenBudget,
    monthlyTokenBudget: p.monthlyTokenBudget,
    coachCallsPerDay: p.freeCoachCallsPerDay,
    rateLimitPerMinute: p.rateLimitPerMinute
  };
}

export function allowProvider(tier, provider) {
  const p = getTierPolicy(tier);
  return p.providers.includes(String(provider || '').toLowerCase());
}

export function resolveAllowedModel(tier, provider, requestedModel) {
  const p = getTierPolicy(tier);
  const list = (p.modelsAllowlist && p.modelsAllowlist[provider]) || [];
  if (!list.length) return null;
  if (requestedModel && list.includes(requestedModel)) return requestedModel;
  return list[0];
}

export function allowIntent(tier, intent) {
  const p = getTierPolicy(tier);
  const i = String(intent || 'explain').toLowerCase();
  return p.intents.includes(i) ? i : p.intents[0];
}

export function allowTool(tier, toolName) {
  return getTierPolicy(tier).tools.includes(toolName);
}

export function allowSpecialist(tier, specialist) {
  const p = getTierPolicy(tier);
  const s = String(specialist || 'hardware').toLowerCase();
  return p.specialists.includes(s) ? s : p.specialists[0];
}

/** Free-tier surface: local-first, capped edge AI, explain-only. */
export const FREE_SURFACE = {
  localExplainOnMiss: true,
  offlineRemediation: true,
  edgeCoach: {
    provider: 'groq',
    callsPerDay: TIER_POLICY.free.freeCoachCallsPerDay,
    maxTurns: 1,
    tools: TIER_POLICY.free.tools,
    specialists: TIER_POLICY.free.specialists,
    streaming: false
  },
  payRails: ['telegram_stars', 'ton_onchain']
};
