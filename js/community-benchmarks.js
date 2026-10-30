/**
 * Clariora Exam Simulator
 * community-benchmarks.js - Live peer item analytics (no fabricated rates)
 * File: js/community-benchmarks.js
 *
 * Fetches GET /api/v1/items/stats and shows community pass rate only when
 * sample_size >= MIN_SAMPLE. Cold items show a neutral "not enough data" note
 * or are omitted. Never invents crowd percentages from question-id hashes.
 */

(function (window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const MIN_SAMPLE = 30;
  const CACHE_KEY = 'community_stats_cache';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  const escapeHTML =
    (window.APlus.utils && window.APlus.utils.escapeHTML) ||
    function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

  function apiBase() {
    try {
      const host = window.location && window.location.hostname;
      if (
        host &&
        (host.endsWith('clariora.com.au') ||
          host.endsWith('pages.dev') ||
          host === 'localhost' ||
          host === '127.0.0.1')
      ) {
        return '';
      }
    } catch (_) {
      /* ignore */
    }
    return 'https://clariora.com.au';
  }

  function guardedFetch(url, init, guardOpts) {
    const g = (typeof window !== 'undefined' && window.APlus && window.APlus.guard) || null;
    if (g) return g.fetch(url, init, guardOpts);
    return fetch(url, init);
  }

  function tierFromRate(rate) {
    if (rate >= 80) return 'Standard';
    if (rate >= 65) return 'Moderate';
    return 'High Difficulty / Trap';
  }

  function dominantTrap(spreadJson, options) {
    let spread = {};
    try {
      if (typeof spreadJson === 'string') spread = JSON.parse(spreadJson || '{}');
      else if (spreadJson && typeof spreadJson === 'object') spread = spreadJson;
    } catch (_) {
      spread = {};
    }
    let bestKey = null;
    let bestN = 0;
    let total = 0;
    Object.keys(spread).forEach(function (k) {
      const n = Number(spread[k]) || 0;
      total += n;
      if (n > bestN) {
        bestN = n;
        bestKey = k;
      }
    });
    if (bestKey == null || total < MIN_SAMPLE) return null;
    const share = bestN / total;
    if (share < 0.25) return null;
    const idx = Number(bestKey);
    let label = 'Option ' + (idx + 1);
    if (Array.isArray(options) && options[idx] != null) {
      label = String(options[idx]).slice(0, 48);
    }
    return { index: idx, label: label, share: Math.round(share * 100) };
  }

  function normalizeRemote(row) {
    if (!row || typeof row !== 'object') return null;
    const sampleSize = Number(row.sample_size) || 0;
    const p = row.p_value == null ? null : Number(row.p_value);
    const correctRate =
      p != null && Number.isFinite(p) ? Math.round(Math.min(100, Math.max(0, p * 100))) : null;
    return {
      questionId: String(row.question_id || row.questionId || ''),
      sampleSize: sampleSize,
      correctRate: correctRate,
      pValue: p,
      pointBiserial: row.point_biserial == null ? null : Number(row.point_biserial),
      distractorSpread: row.distractor_spread || null,
      flaggedMiskey: Number(row.flagged_miskey) === 1,
      fetchedAt: Date.now(),
      provisional: sampleSize < MIN_SAMPLE || row.provisional === true
    };
  }

  const CommunityBenchmarks = {
    statsCache: {},
    inflight: {},

    init() {
      this.loadCachedStats();
    },

    loadCachedStats() {
      if (!APlus.storage) return;
      try {
        const raw = APlus.storage.get(CACHE_KEY, {});
        if (raw && typeof raw === 'object') this.statsCache = raw;
      } catch (_) {
        this.statsCache = {};
      }
    },

    persistCache() {
      if (!APlus.storage) return;
      try {
        APlus.storage.set(CACHE_KEY, this.statsCache);
      } catch (_) {
        /* ignore quota */
      }
    },

    /**
     * Sync read for render. Returns null when there is not enough live data.
     * Never invents a percentage.
     */
    getBenchmark(q) {
      if (!q || !q.id) return null;
      const cached = this.statsCache[q.id];
      if (!cached || cached.provisional || cached.sampleSize < MIN_SAMPLE) return null;
      if (cached.correctRate == null) return null;
      const trap = dominantTrap(cached.distractorSpread, q.options);
      return {
        questionId: q.id,
        sampleSize: cached.sampleSize,
        correctRate: cached.correctRate,
        difficultyTier: tierFromRate(cached.correctRate),
        trapDistractor: trap ? trap.label : null,
        trapShare: trap ? trap.share : null,
        flaggedMiskey: Boolean(cached.flaggedMiskey),
        live: true
      };
    },

    /**
     * Prefetch live stats for a question (and warm cache). Safe to call often.
     */
    fetchStats(questionId) {
      const qid = String(questionId || '').trim().slice(0, 64);
      if (!qid) return Promise.resolve(null);

      const existing = this.statsCache[qid];
      if (existing && existing.fetchedAt && Date.now() - existing.fetchedAt < CACHE_TTL_MS) {
        return Promise.resolve(existing);
      }
      if (this.inflight[qid]) return this.inflight[qid];

      const url = apiBase() + '/api/v1/items/stats?qid=' + encodeURIComponent(qid);
      const self = this;
      this.inflight[qid] = guardedFetch(
        url,
        { method: 'GET', credentials: 'omit' },
        { maxAttempts: 1, coalesceKey: 'item-stats:' + qid }
      )
        .then(function (res) {
          if (!res || !res.ok) return null;
          return res.json();
        })
        .then(function (data) {
          const norm = normalizeRemote(data);
          if (norm && norm.questionId) {
            self.statsCache[norm.questionId] = norm;
            self.persistCache();
          }
          return norm;
        })
        .catch(function () {
          return null;
        })
        .then(function (norm) {
          delete self.inflight[qid];
          return norm;
        });

      return this.inflight[qid];
    },

    renderBadge(q) {
      if (!q || !q.id) return '';
      // Fire-and-forget warm; review re-render may pick it up later.
      try {
        this.fetchStats(q.id);
      } catch (_) {
        /* ignore */
      }

      const b = this.getBenchmark(q);
      if (b) {
        const rateColor =
          b.correctRate >= 75
            ? 'var(--color-success)'
            : b.correctRate >= 60
              ? 'var(--color-warning)'
              : 'var(--color-danger)';
        const trapBit = b.trapDistractor
          ? `<span style="color: var(--text-muted);">&bull;</span>
             <span style="color: var(--text-secondary);">Common trap: ${escapeHTML(b.trapDistractor)}${
               b.trapShare != null ? ' (' + b.trapShare + '%)' : ''
             }</span>`
          : '';
        const miskeyBit = b.flaggedMiskey
          ? `<span style="color: var(--color-warning); font-weight: 700;">Under review</span>`
          : '';
        return `
        <div class="community-benchmark-badge" data-qid="${escapeHTML(q.id)}" style="display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.78rem; margin-top: 0.5rem;">
          <span style="color: var(--accent-cyan); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg> Community:</span>
          <span><strong style="color: ${rateColor};">${b.correctRate}%</strong> correct (n=${b.sampleSize})</span>
          <span style="color: var(--text-muted);">&bull;</span>
          <span style="color: var(--text-secondary);">${escapeHTML(b.difficultyTier)}</span>
          ${trapBit}
          ${miskeyBit}
        </div>`;
      }

      const pending = this.statsCache[q.id];
      if (pending && pending.sampleSize > 0 && pending.sampleSize < MIN_SAMPLE) {
        return `
        <div class="community-benchmark-badge community-benchmark-pending" data-qid="${escapeHTML(q.id)}" style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(148, 163, 184, 0.08); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 6px; padding: 0.35rem 0.65rem; font-size: 0.78rem; margin-top: 0.5rem; color: var(--text-secondary);">
          Community benchmark: gathering data (${pending.sampleSize}/${MIN_SAMPLE})
        </div>`;
      }

      // No fabricated rates. Omit badge until live data exists.
      return `<div class="community-benchmark-slot" data-qid="${escapeHTML(q.id)}" hidden></div>`;
    }
  };

  APlus.communityBenchmarks = CommunityBenchmarks;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        CommunityBenchmarks.init();
      });
    } else {
      CommunityBenchmarks.init();
    }
  }
})(typeof window !== 'undefined' ? window : this);
