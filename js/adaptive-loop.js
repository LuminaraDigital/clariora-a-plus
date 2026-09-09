/**
 * Clariora - Adaptive Loop
 * Post-exam weak-area plan, persistence, and a focused practice set.
 * File: js/adaptive-loop.js
 */

(function (window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const STORAGE_KEY = 'adaptive_plan';
  const RAID_MIN = 15;
  const RAID_MAX = 20;
  const RAID_DEFAULT = 18;

  const escapeHTML =
    (APlus.utils && APlus.utils.escapeHTML) ||
    function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

  function safeGetStorage(key, fallback) {
    if (!APlus.storage || typeof APlus.storage.get !== 'function') return fallback;
    try {
      return APlus.storage.get(key, fallback);
    } catch (_) {
      return fallback;
    }
  }

  function safeSetStorage(key, value) {
    if (!APlus.storage || typeof APlus.storage.set !== 'function') return false;
    try {
      APlus.storage.set(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function countBy(items, keyFn) {
    const map = Object.create(null);
    items.forEach(function (item) {
      const key = keyFn(item);
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  function domainAccuracy(domainStats, domain) {
    const s = domainStats && domainStats[domain];
    if (!s || !s.total) return 1;
    return s.correct / s.total;
  }

  /**
   * Rank weakest domains/objectives from incorrect perQuestion rows.
   * Primary: miss count (desc). Secondary for domains: accuracy (asc).
   */
  function computeWeakAreas(payload) {
    const perQuestion = (payload && payload.perQuestion) || [];
    const domainStats = (payload && payload.domainStats) || {};
    const incorrect = perQuestion.filter(function (p) {
      return p && p.correct === false;
    });

    const missedIds = incorrect
      .map(function (p) {
        return p.id;
      })
      .filter(Boolean);

    const objMiss = countBy(incorrect, function (p) {
      return p.objective ? String(p.objective).trim() : '';
    });
    const domMiss = countBy(incorrect, function (p) {
      return p.domain ? String(p.domain).trim() : '';
    });

    const weakObjectives = Object.keys(objMiss)
      .map(function (objective) {
        return { objective: objective, misses: objMiss[objective] };
      })
      .sort(function (a, b) {
        return b.misses - a.misses || String(a.objective).localeCompare(String(b.objective));
      });

    const weakDomains = Object.keys(domMiss)
      .map(function (domain) {
        return {
          domain: domain,
          misses: domMiss[domain],
          accuracy: domainAccuracy(domainStats, domain)
        };
      })
      .sort(function (a, b) {
        if (b.misses !== a.misses) return b.misses - a.misses;
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        return String(a.domain).localeCompare(String(b.domain));
      });

    // If nothing missed, still surface lowest-accuracy domains from domainStats.
    if (weakDomains.length === 0 && domainStats) {
      Object.keys(domainStats).forEach(function (domain) {
        weakDomains.push({
          domain: domain,
          misses: 0,
          accuracy: domainAccuracy(domainStats, domain)
        });
      });
      weakDomains.sort(function (a, b) {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        return String(a.domain).localeCompare(String(b.domain));
      });
    }

    return {
      examType: (payload && payload.examType) || 'core1',
      weakDomains: weakDomains,
      weakObjectives: weakObjectives,
      missedIds: missedIds,
      createdAt: new Date().toISOString()
    };
  }

  function persistPlan(plan) {
    const stored = {
      examType: plan.examType,
      weakDomains: (plan.weakDomains || []).map(function (d) {
        return typeof d === 'string' ? d : d.domain;
      }),
      weakObjectives: (plan.weakObjectives || []).map(function (o) {
        return typeof o === 'string' ? o : o.objective;
      }),
      missedIds: plan.missedIds || [],
      createdAt: plan.createdAt || new Date().toISOString()
    };
    safeSetStorage(STORAGE_KEY, stored);
    return stored;
  }

  function getPlan() {
    return safeGetStorage(STORAGE_KEY, null);
  }

  function resolveExamPoolType(examType) {
    const t = String(examType || 'core1').toLowerCase();
    if (t === 'core2' || t === 'c2') return 'core2';
    if (t === 'both' || t === 'mixed' || t === 'missed' || t === 'domain' || t === 'coach') return 'both';
    return 'core1';
  }

  function clampRaidCount(n, available) {
    const want = Math.max(RAID_MIN, Math.min(RAID_MAX, n || RAID_DEFAULT));
    return Math.max(1, Math.min(want, available || want));
  }

  function buildRaidPool(plan, opts) {
    opts = opts || {};
    const target = clampRaidCount(opts.count || RAID_DEFAULT, 9999);
    const poolType = resolveExamPoolType((opts.examType || (plan && plan.examType) || 'core1'));
    const all =
      APlus.data && typeof APlus.data.getQuestions === 'function'
        ? APlus.data.getQuestions(poolType)
        : [];

    const byId = Object.create(null);
    all.forEach(function (q) {
      if (q && q.id != null) byId[q.id] = q;
    });

    const selected = [];
    const seen = Object.create(null);

    function pushQ(q) {
      if (!q || q.id == null || seen[q.id]) return;
      seen[q.id] = true;
      selected.push(q);
    }

    const missedIds = (plan && plan.missedIds) || [];
    missedIds.forEach(function (id) {
      if (selected.length >= target) return;
      pushQ(byId[id]);
    });

    const weakObjectives = (plan && plan.weakObjectives) || [];
    weakObjectives.forEach(function (obj) {
      if (selected.length >= target) return;
      const key = String(obj).trim().toLowerCase();
      all.forEach(function (q) {
        if (selected.length >= target) return;
        if (String(q.objective || '')
          .trim()
          .toLowerCase() === key) {
          pushQ(q);
        }
      });
    });

    const weakDomains = (plan && plan.weakDomains) || [];
    weakDomains.forEach(function (dom) {
      if (selected.length >= target) return;
      const key = String(dom).trim().toLowerCase();
      all.forEach(function (q) {
        if (selected.length >= target) return;
        const d = String(q.domain || '').toLowerCase();
        if (d === key || d.indexOf(key.substring(0, Math.min(8, key.length))) !== -1) {
          pushQ(q);
        }
      });
    });

    return selected.slice(0, clampRaidCount(target, selected.length));
  }

  function startDomainFallback(plan, opts) {
    opts = opts || {};
    const domainName =
      (plan && plan.weakDomains && plan.weakDomains[0]) ||
      (opts.domainKey || null);

    if (!domainName || !APlus.data || !APlus.engine) {
      return false;
    }

    const poolType = resolveExamPoolType(plan.examType || opts.examType);
    let filtered = [];
    if (typeof APlus.data.getDomainQuestions === 'function') {
      filtered = APlus.data.getDomainQuestions(poolType, domainName);
    } else {
      filtered = APlus.data.getQuestions(poolType).filter(function (q) {
        return String(q.domain || '')
          .toLowerCase()
          .indexOf(String(domainName).toLowerCase().substring(0, 3)) !== -1;
      });
    }

    if (!filtered.length) return false;

    const count = clampRaidCount(opts.count || RAID_DEFAULT, filtered.length);
    const timeMinutes = opts.untimed
      ? 240
      : Math.max(15, Math.ceil(count * 1.25));

    APlus.engine.start({
      type: 'domain',
      customPool: filtered,
      domainKey: domainName,
      questionCount: count,
      timeMinutes: timeMinutes
    });
    return true;
  }

  /**
   * Start a focused weak-area practice set (15-20 questions preferred).
   * Prefer missed IDs + same objectives/domains via customPool.
   * opts.continueStudy: if true and startMissedDrill exists with missed IDs, use that.
   */
  window.startWeakObjectiveRaid = function (opts) {
    opts = opts || {};
    const plan = opts.plan || getPlan();

    if (opts.continueStudy && typeof window.startMissedDrill === 'function') {
      const missed =
        (plan && plan.missedIds && plan.missedIds.length) ||
        (safeGetStorage('missed', []) || []).length;
      if (missed > 0) {
        window.startMissedDrill();
        return true;
      }
    }

    if (!plan) {
      if (typeof window.startMissedDrill === 'function' && (safeGetStorage('missed', []) || []).length) {
        window.startMissedDrill();
        return true;
      }
      alert('No study plan yet. Finish a practice exam first.');
      return false;
    }

    if (!APlus.engine || typeof APlus.engine.start !== 'function') {
      alert('Exam engine is not ready.');
      return false;
    }

    const pool = buildRaidPool(plan, opts);
    if (!pool.length) {
      if (startDomainFallback(plan, opts)) return true;
      if (typeof window.startMissedDrill === 'function' && (plan.missedIds || []).length) {
        window.startMissedDrill();
        return true;
      }
      alert('Could not build a weak-area practice set from the last exam. Try a domain drill from the menu.');
      return false;
    }

    const count = clampRaidCount(opts.count || RAID_DEFAULT, pool.length);
    const timeMinutes = opts.untimed
      ? 240
      : Math.max(15, Math.ceil(count * 1.25));

    APlus.engine.start({
      type: 'missed',
      customPool: pool,
      domainKey: (plan.weakDomains && plan.weakDomains[0]) || null,
      questionCount: count,
      timeMinutes: timeMinutes
    });
    return true;
  };

  function ensurePanelMount() {
    let panel = document.getElementById('adaptiveNextPanel');
    if (panel) return panel;

    const results = document.getElementById('resultsScreen');
    if (!results) return null;

    panel = document.createElement('div');
    panel.id = 'adaptiveNextPanel';

    const actionRow = results.querySelector('div[style*="flex-wrap"]');
    const review = results.querySelector('.review-accordion');
    if (actionRow && actionRow.parentNode) {
      actionRow.parentNode.insertBefore(panel, actionRow);
    } else if (review && review.parentNode) {
      review.parentNode.insertBefore(panel, review);
    } else {
      results.appendChild(panel);
    }
    return panel;
  }

  function summaryLabels(plan) {
    const labels = [];
    (plan.weakDomains || []).slice(0, 3).forEach(function (d) {
      const name = typeof d === 'string' ? d : d.domain;
      if (name) labels.push(name);
    });
    if (labels.length < 2) {
      (plan.weakObjectives || []).slice(0, 3 - labels.length).forEach(function (o) {
        const name = typeof o === 'string' ? o : o.objective;
        if (name) labels.push('Objective ' + name);
      });
    }
    return labels.slice(0, 3);
  }

  /**
   * Three mini .domain-bar rows for the weakest areas.
   * Same class contract as the results-screen domain rows.
   */
  function weakAreaRows(plan, domainStats, passingScore) {
    const stats = domainStats || (plan && plan.domainStats) || {};
    const passPercent =
      APlus.results && typeof APlus.results.passLinePercent === 'function'
        ? APlus.results.passLinePercent(passingScore || 675)
        : ((passingScore || 675) - 100) / 8;

    const labels = summaryLabels(plan);
    if (!labels.length) return '';

    return labels
      .map(function (name) {
        const s = stats[name];
        const spec = {
          name: name,
          correct: s ? s.correct : 0,
          total: s ? s.total : 0,
          passPercent: passPercent
        };
        if (APlus.results && typeof APlus.results.buildDomainBarRow === 'function') {
          return APlus.results.buildDomainBarRow(spec);
        }
        const pct = spec.total ? Math.round((spec.correct / spec.total) * 100) : 0;
        return '<div class="domain-bar"><span class="name">' + escapeHTML(name) + '</span>' +
          '<div class="track"><div class="fill' + (pct >= passPercent ? ' ok' : '') +
          '" style="width:' + pct + '%"></div>' +
          '<div class="passline" style="left:' + (Math.round(passPercent * 10) / 10) + '%"></div></div>' +
          '<span class="pct tnum">' + (spec.total ? spec.correct + ' / ' + spec.total + ', ' : '') +
          pct + '%</span></div>';
      })
      .join('');
  }

  function reviewAnswers() {
    const accordion = document.querySelector('#resultsScreen .review-accordion');
    if (typeof window.filterReview === 'function') {
      window.filterReview('incorrect');
    } else if (APlus.ui && typeof APlus.ui.filterReview === 'function') {
      APlus.ui.filterReview('incorrect');
    }
    if (accordion && typeof accordion.scrollIntoView === 'function') {
      accordion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderAdaptivePanel(plan, domainStats, passingScore) {
    const panel = ensurePanelMount();
    if (!panel || !plan) return;

    const missN = (plan.missedIds || []).length;
    const rows = weakAreaRows(plan, domainStats, passingScore);
    const body = rows ||
      '<p class="hint">No weak areas from this attempt. A short set keeps recall sharp.</p>';

    panel.innerHTML =
      '<div class="adaptive-next-card">' +
      '<div class="label">Your next step</div>' +
      '<p class="adaptive-next-lead">' +
      (missN
        ? 'You missed ' + missN + ' question' + (missN === 1 ? '' : 's') + '. Start with these areas.'
        : 'Start with these areas.') +
      '</p>' +
      '<div class="adaptive-weak-bars">' + body + '</div>' +
      '<div class="adaptive-next-actions">' +
      '<button type="button" class="btn" id="adaptiveRaidBtn">Practice weak areas</button>' +
      '<button type="button" class="btn btn-secondary" id="adaptiveReviewBtn">Review answers</button>' +
      '</div>' +
      '</div>';

    const raidBtn = document.getElementById('adaptiveRaidBtn');
    const reviewBtn = document.getElementById('adaptiveReviewBtn');
    if (raidBtn) {
      raidBtn.addEventListener('click', function () {
        window.startWeakObjectiveRaid({ plan: plan });
      });
    }
    if (reviewBtn) {
      reviewBtn.addEventListener('click', function () {
        reviewAnswers();
      });
    }
  }

  function onExamFinished(payload) {
    const plan = computeWeakAreas(payload || {});
    const stored = persistPlan(plan);
    renderAdaptivePanel(
      stored,
      (payload && payload.domainStats) || null,
      (payload && payload.passingScore) || 675
    );
    if (APlus.bus && typeof APlus.bus.emit === 'function') {
      try {
        APlus.bus.emit('adaptive:plan:ready', stored);
      } catch (_) {}
    }
  }

  function register() {
    APlus.adaptive = {
      computeWeakAreas: computeWeakAreas,
      persistPlan: persistPlan,
      getPlan: getPlan,
      buildRaidPool: buildRaidPool,
      renderAdaptivePanel: renderAdaptivePanel,
      onExamFinished: onExamFinished
    };

    if (APlus.bus && typeof APlus.bus.on === 'function') {
      APlus.bus.on('exam:finished', onExamFinished);
    }
  }

  function boot() {
    try {
      register();
      ensurePanelMount();
    } catch (err) {
      console.error('[adaptive-loop] init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
