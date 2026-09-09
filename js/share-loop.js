/**
 * share-loop.js - Make readiness sticky and shareable.
 *
 * After mocks, offer one-tap share of scaled score + streak.
 * On home, surface a share chip when the learner has a score worth showing.
 * Designed for career starters and academy founders who recruit peers.
 */
(function (window) {
  'use strict';

  window.APlus = window.APlus || {};

  var SHARE_KEY = 'aplus3_share_prompt_v1';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readStreak() {
    try {
      if (window.APlus && APlus.storage && typeof APlus.storage.get === 'function') {
        var meta = APlus.storage.get('memoryRaidMeta', null);
        if (meta && typeof meta.streakDays === 'number') return meta.streakDays;
      }
    } catch (_) {}
    try {
      var raw = window.localStorage && window.localStorage.getItem('comptia_memory_raid_meta_v1');
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.streakDays === 'number') return o.streakDays;
      }
    } catch (_) {}
    return 0;
  }

  function buildMessage(payload) {
    payload = payload || {};
    var score = typeof payload.scaledScore === 'number' ? payload.scaledScore : null;
    var exam = String(payload.examType || 'A+').toUpperCase();
    var passed = payload.passed === true;
    var streak = readStreak();
    var lines = [];
    lines.push('Clariora A+ readiness check');
    if (score !== null) {
      lines.push(exam + ' scaled score: ' + score + (passed ? ' (pass line cleared)' : ' (keep drilling)'));
    }
    if (streak > 0) lines.push('Study streak: ' + streak + (streak === 1 ? ' day' : ' days'));
    lines.push('Free diagnostic, no account: https://comptia-a-plus-master.sparkling-fog-be2d.workers.dev/app');
    lines.push('Why it beats the packs: https://comptia-a-plus-master.sparkling-fog-be2d.workers.dev/landing/compare.html');
    return lines.join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return false;
      });
    }
    return Promise.resolve(false);
  }

  function share(payload) {
    var text = buildMessage(payload);
    var title = 'My Clariora A+ readiness';
    if (navigator.share) {
      return navigator
        .share({ title: title, text: text })
        .then(function () {
          trackShared('native');
          return { ok: true, method: 'native' };
        })
        .catch(function () {
          return copyText(text).then(function (ok) {
            if (ok) trackShared('clipboard');
            return { ok: ok, method: 'clipboard' };
          });
        });
    }
    return copyText(text).then(function (ok) {
      if (ok) trackShared('clipboard');
      if (ok) flash('Copied share text');
      else flash('Could not share yet');
      return { ok: ok, method: 'clipboard' };
    });
  }

  function trackShared(method) {
    try {
      if (window.APlus && APlus.bus && typeof APlus.bus.emit === 'function') {
        APlus.bus.emit('share:completed', { method: method });
      }
      if (window.APlus && APlus.telemetry && typeof APlus.telemetry.track === 'function') {
        APlus.telemetry.track('share_completed', { method: method });
      }
    } catch (_) {}
  }

  function flash(msg) {
    try {
      var el = document.getElementById('shareLoopToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'shareLoopToast';
        el.setAttribute('role', 'status');
        el.style.cssText =
          'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 18px;border-radius:8px;background:rgba(15,19,27,0.95);color:#F3F4F6;border:1px solid rgba(212,175,55,0.4);font:600 14px/1.3 Sora,system-ui,sans-serif;';
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.hidden = false;
      setTimeout(function () {
        el.hidden = true;
      }, 2200);
    } catch (_) {}
  }

  function ensureResultsButton(payload) {
    var host =
      document.getElementById('resultsActions') ||
      document.querySelector('.results-actions') ||
      document.getElementById('resultsPanel') ||
      document.querySelector('[data-results-actions]');
    if (!host) return;
    if (document.getElementById('shareReadinessBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'shareReadinessBtn';
    btn.className = 'btn btn-secondary';
    btn.textContent = 'Share readiness';
    btn.addEventListener('click', function () {
      share(payload || lastPayload).then(function (r) {
        if (r && r.ok && r.method === 'native') flash('Shared');
      });
    });
    host.appendChild(btn);
  }

  function ensureHomeChip() {
    var bar = document.getElementById('streakChip');
    if (!bar || document.getElementById('shareHomeBtn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'shareHomeBtn';
    btn.className = 'streak-chip';
    btn.title = 'Share your readiness with a friend';
    btn.setAttribute('aria-label', 'Share readiness');
    btn.innerHTML = '<span class="streak-label">Share</span>';
    btn.addEventListener('click', function () {
      share(lastPayload).then(function (r) {
        if (r && r.ok && r.method === 'clipboard') flash('Copied share text');
        if (r && r.ok && r.method === 'native') flash('Shared');
      });
    });
    try {
      bar.parentNode.insertBefore(btn, bar.nextSibling);
    } catch (_) {
      document.body.appendChild(btn);
    }
  }

  function maybeCelebrate(payload) {
    if (!payload) return;
    var streak = readStreak();
    if (payload.passed) {
      flash('Pass line cleared. Share it while it is hot.');
    } else if (streak > 0 && streak % 3 === 0) {
      flash(streak + ' day streak. Bring a study buddy in.');
    }
    try {
      window.localStorage.setItem(
        SHARE_KEY,
        JSON.stringify({
          at: Date.now(),
          scaledScore: payload.scaledScore,
          examType: payload.examType,
          passed: payload.passed
        })
      );
    } catch (_) {}
  }

  var lastPayload = null;

  function wire() {
    ensureHomeChip();
    if (!window.APlus || !APlus.bus || typeof APlus.bus.on !== 'function') return;
    APlus.bus.on('exam:finished', function (payload) {
      lastPayload = payload || null;
      maybeCelebrate(payload);
      setTimeout(function () {
        ensureResultsButton(payload);
      }, 200);
    });
    APlus.bus.on('share:completed', function () {
      ensureHomeChip();
    });
  }

  window.APlus.shareLoop = {
    share: share,
    buildMessage: buildMessage,
    readStreak: readStreak
  };
  window.shareClarioraReadiness = function () {
    return share(lastPayload);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})(typeof window !== 'undefined' ? window : this);
