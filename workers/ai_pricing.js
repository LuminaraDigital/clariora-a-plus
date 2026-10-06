/**
 * AI cost reporting over ai_usage_log (admin only).
 *
 * Prices are blended USD per 1M tokens and are estimates: set AI_PRICE_JSON
 * (for example {"groq":0.69,"workers_ai":0.3}) to the rates on the current
 * invoices. Providers on free credits or self-hosted default to 0.
 */

export const DEFAULT_PRICE_PER_M = {
  groq: 0.69,
  openrouter: 0.6,
  workers_ai: 0.3,
  nvidia: 0,
  ollama: 0,
  cache: 0
};

export function priceTable(env) {
  let override = {};
  try {
    override = env && env.AI_PRICE_JSON ? JSON.parse(env.AI_PRICE_JSON) : {};
  } catch (_) {
    override = {};
  }
  const out = { ...DEFAULT_PRICE_PER_M };
  for (const [k, v] of Object.entries(override || {})) {
    if (Number.isFinite(Number(v)) && Number(v) >= 0) out[k] = Number(v);
  }
  return out;
}

export function estimateCostUsd(provider, tokens, prices) {
  const rate = prices[provider] !== undefined ? prices[provider] : 0;
  return (Number(tokens) || 0) * rate / 1e6;
}

/**
 * Flags users whose token use is far above the population: more than
 * `multiple` times the median and above mean + 3 standard deviations.
 * Both conditions keep a small or uniform population from flagging everyone.
 */
export function findUsageOutliers(rows, { multiple = 5, limit = 20 } = {}) {
  const totals = rows.map((r) => Number(r.tokens) || 0);
  if (totals.length < 3) return [];
  const sorted = [...totals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  const sd = Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length);
  return rows
    .filter((r) => {
      const t = Number(r.tokens) || 0;
      return t > median * multiple && t > mean + 3 * sd;
    })
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, limit)
    .map((r) => ({ ...r, timesMedian: median > 0 ? Math.round((r.tokens / median) * 10) / 10 : null }));
}

export async function buildAiCostReport(db, env, { days = 7 } = {}) {
  const window = Math.min(90, Math.max(1, Math.floor(Number(days) || 7)));
  const since = `-${window} days`;
  const prices = priceTable(env);

  const byProvider = (await db.prepare(`
    SELECT provider, model, COALESCE(intent, 'unknown') AS intent,
           COUNT(*) AS calls, COALESCE(SUM(tokens_used), 0) AS tokens,
           COALESCE(SUM(cache_hit), 0) AS cache_hits, COALESCE(AVG(latency_ms), 0) AS avg_latency_ms
    FROM ai_usage_log
    WHERE created_at >= datetime('now', ?)
    GROUP BY provider, model, intent
    ORDER BY tokens DESC
  `).bind(since).all()).results || [];

  const perUser = (await db.prepare(`
    SELECT user_ref, tier, COUNT(*) AS calls, COALESCE(SUM(tokens_used), 0) AS tokens
    FROM ai_usage_log
    WHERE created_at >= datetime('now', ?) AND user_ref IS NOT NULL
    GROUP BY user_ref, tier
  `).bind(since).all()).results || [];

  let tokens = 0;
  let calls = 0;
  let costUsd = 0;
  let explainCalls = 0;
  let cacheHits = 0;
  const rows = byProvider.map((r) => {
    const cost = estimateCostUsd(r.provider, r.tokens, prices);
    tokens += Number(r.tokens) || 0;
    calls += Number(r.calls) || 0;
    costUsd += cost;
    cacheHits += Number(r.cache_hits) || 0;
    if (r.intent === 'explain') explainCalls += Number(r.calls) || 0;
    return { ...r, est_cost_usd: Math.round(cost * 10000) / 10000 };
  });

  const outliers = findUsageOutliers(perUser);
  return {
    windowDays: window,
    prices,
    pricesAreEstimates: !(env && env.AI_PRICE_JSON),
    totals: {
      calls,
      tokens,
      estCostUsd: Math.round(costUsd * 100) / 100,
      activeUsers: perUser.length,
      tokensPerCall: calls ? Math.round(tokens / calls) : 0,
      explainCacheHitRate: explainCalls ? Math.round((cacheHits / explainCalls) * 1000) / 1000 : null
    },
    byProvider: rows,
    outliers: outliers.map((o) => ({ ...o, user_ref: maskUserRef(o.user_ref) }))
  };
}

/** Enough to correlate with the accounts table, not enough to paste into chat. */
export function maskUserRef(ref) {
  const s = String(ref || '');
  const [kind, id = ''] = s.includes(':') ? s.split(/:(.*)/) : ['', s];
  const tail = id.slice(-4);
  return (kind ? kind + ':' : '') + '***' + tail;
}
