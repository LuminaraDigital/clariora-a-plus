/**
 * Clariora - Similar questions (offline neighbors + optional edge API)
 * File: js/similar-questions.js
 *
 * Loads similar_neighbors.json (built at dist time) for offline "Practice similar".
 * When online, can refresh via GET /api/v1/items/similar?qid=.
 */

(function (window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const NEIGHBORS_URL = 'similar_neighbors.json';
  const MIN_SHOW = 1;
  const MAX_SHOW = 5;

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

  function findQuestionById(id) {
    if (!id || !APlus.data || typeof APlus.data.getQuestions !== 'function') return null;
    const pools = ['core1', 'core2'];
    for (let p = 0; p < pools.length; p++) {
      const list = APlus.data.getQuestions(pools[p]) || [];
      for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) return list[i];
      }
    }
    return null;
  }

  const SimilarQuestions = {
    neighbors: null,
    loadPromise: null,

    loadNeighbors() {
      if (this.neighbors) return Promise.resolve(this.neighbors);
      if (this.loadPromise) return this.loadPromise;
      const self = this;
      this.loadPromise = fetch(NEIGHBORS_URL, { credentials: 'omit' })
        .then(function (res) {
          if (!res || !res.ok) return {};
          return res.json();
        })
        .then(function (data) {
          self.neighbors =
            data && typeof data === 'object' && data.neighbors && typeof data.neighbors === 'object'
              ? data.neighbors
              : data && typeof data === 'object'
                ? data
                : {};
          return self.neighbors;
        })
        .catch(function () {
          self.neighbors = {};
          return self.neighbors;
        });
      return this.loadPromise;
    },

    getNeighborIds(questionId) {
      const map = this.neighbors || {};
      const row = map[questionId];
      if (!row) return [];
      if (Array.isArray(row)) return row.slice(0, MAX_SHOW);
      if (row && Array.isArray(row.ids)) return row.ids.slice(0, MAX_SHOW);
      return [];
    },

    /**
     * Prefer live Vectorize when available; fall back to offline map.
     */
    resolveSimilar(questionId) {
      const qid = String(questionId || '').trim();
      if (!qid) return Promise.resolve([]);

      const offlineIds = this.getNeighborIds(qid);
      const offline = offlineIds
        .map(findQuestionById)
        .filter(Boolean)
        .slice(0, MAX_SHOW);

      const url = apiBase() + '/api/v1/items/similar?qid=' + encodeURIComponent(qid) + '&k=' + MAX_SHOW;
      return guardedFetch(url, { method: 'GET', credentials: 'omit' }, { maxAttempts: 1 })
        .then(function (res) {
          if (!res || !res.ok) return null;
          return res.json();
        })
        .then(function (data) {
          const ids = (data && Array.isArray(data.ids) ? data.ids : [])
            .map(String)
            .filter(Boolean)
            .slice(0, MAX_SHOW);
          if (!ids.length) return offline;
          const live = ids.map(findQuestionById).filter(Boolean);
          return live.length >= MIN_SHOW ? live : offline;
        })
        .catch(function () {
          return offline;
        });
    },

    startSimilarDrill(seedQuestionId) {
      const self = this;
      return this.loadNeighbors()
        .then(function () {
          return self.resolveSimilar(seedQuestionId);
        })
        .then(function (qs) {
          if (!qs.length) {
            if (window.APlus && APlus.bus) {
              APlus.bus.emit('toast', { message: 'No similar questions available yet.', tone: 'info' });
            }
            return false;
          }
          if (!APlus.engine || typeof APlus.engine.start !== 'function') return false;
          APlus.engine.start({
            type: 'drill',
            questionCount: Math.min(qs.length, MAX_SHOW),
            timeMinutes: Math.max(5, qs.length * 2),
            customPool: qs,
            mode: 'practice'
          });
          if (APlus.telemetry && typeof APlus.telemetry.track === 'function') {
            APlus.telemetry.track('similar_drill_started', {
              seedId: seedQuestionId,
              count: qs.length
            });
          }
          if (APlus.bus) {
            APlus.bus.emit('similar:drill:started', { seedId: seedQuestionId, count: qs.length });
          }
          return true;
        });
    },

    renderPanel(q) {
      if (!q || !q.id) return '';
      const self = this;
      try {
        this.loadNeighbors();
      } catch (_) {
        /* ignore */
      }
      const ids = this.getNeighborIds(q.id);
      if (!ids.length) {
        return `<div class="similar-questions-slot" data-qid="${escapeHTML(q.id)}"></div>`;
      }
      const qidEsc = escapeHTML(q.id);
      return `
        <div class="similar-questions-panel" data-qid="${qidEsc}" style="margin-top: 0.65rem; padding: 0.55rem 0.7rem; border: 1px solid rgba(212, 175, 55, 0.28); border-radius: 6px; background: rgba(212, 175, 55, 0.06);">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--gold-primary); margin-bottom: 0.35rem;">Similar practice</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.45rem;">${ids.length} related item${ids.length === 1 ? '' : 's'} from the bank</div>
          <button type="button" class="btn btn-secondary similar-drill-btn" data-seed="${qidEsc}" style="font-size: 0.78rem; padding: 0.25rem 0.55rem;">Practice similar</button>
        </div>`;
    },

    bindReviewClicks(root) {
      const el = root || document;
      if (!el || typeof el.addEventListener !== 'function') return;
      el.addEventListener('click', function (ev) {
        const btn = ev.target && ev.target.closest ? ev.target.closest('.similar-drill-btn') : null;
        if (!btn) return;
        ev.preventDefault();
        const seed = btn.getAttribute('data-seed');
        SimilarQuestions.startSimilarDrill(seed);
      });
    }
  };

  APlus.similarQuestions = SimilarQuestions;

  if (typeof document !== 'undefined') {
    const boot = function () {
      SimilarQuestions.loadNeighbors();
      SimilarQuestions.bindReviewClicks(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
})(typeof window !== 'undefined' ? window : this);
