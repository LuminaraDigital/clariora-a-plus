/**
 * reward-center.js - Achievement Wallet (claims + Degree + FAQ) + APX chip router.
 *
 * Claim mints FEATURED_OBJECTIVE_CLAIM once via CompTIALedger (same family as quest claim).
 * Degree ranks are cosmetic from ledger XP/RANKS. APX stays non-cashable.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  var w = typeof window === 'object' && window ? window : root;
  if (w) {
    w.APlus = w.APlus || {};
    w.APlus.rewardCenter = api;
    if (typeof w.APlus.registerFeature === 'function') {
      try {
        w.APlus.registerFeature('rewardCenter', {
          description: 'Achievement Wallet claim inbox',
          api: api
        });
      } catch (_) {}
    }
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          api.wireChip();
        });
      } else {
        setTimeout(function () {
          api.wireChip();
        }, 0);
      }
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '1.1.0';
  var INBOX_KEY = 'aplus3_reward_inbox_v1';
  var MODAL_ID = 'rewardCenterModal';

  function W() {
    return typeof window !== 'undefined' ? window : null;
  }

  function A() {
    var w = W();
    return (w && w.APlus) || null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function urlFlagOn() {
    try {
      var w = W();
      if (!w || !w.location || !w.location.search) return false;
      return /(?:\?|&)ff_reward_center=1(?:&|$)/.test(w.location.search);
    } catch (_) {
      return false;
    }
  }

  function walletUrlOn() {
    try {
      var w = W();
      if (!w || !w.location || !w.location.search) return false;
      return /(?:\?|&)ff_achievement_wallet=1(?:&|$)/.test(w.location.search);
    } catch (_) {
      return false;
    }
  }

  function cfg() {
    try {
      var c = (W() && W().APLUS_FEATURES_CONFIG) || {};
      return c.rewardCenter || {};
    } catch (_) {
      return {};
    }
  }

  function walletCfg() {
    try {
      var c = (W() && W().APLUS_FEATURES_CONFIG) || {};
      return c.achievementWallet || {};
    } catch (_) {
      return {};
    }
  }

  function walletEnabled() {
    if (walletUrlOn()) return true;
    return walletCfg().enabled === true;
  }

  function isEnabled() {
    if (urlFlagOn() || walletUrlOn()) return true;
    if (walletEnabled()) return cfg().enabled !== false;
    return cfg().enabled === true;
  }

  function openFromChip() {
    if (walletEnabled() && walletCfg().openFromApxChip === false) return false;
    return cfg().openFromApxChip !== false;
  }

  function showDegree() {
    return walletEnabled() && walletCfg().showDegree !== false;
  }

  function showEconomyFaq() {
    return walletEnabled() && walletCfg().showEconomyFaq !== false;
  }

  function prefersReducedMotion() {
    try {
      return !!(W() && W().matchMedia && W().matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {
      return false;
    }
  }

  function track(name, props) {
    try {
      var a = A();
      if (a && a.telemetry && typeof a.telemetry.track === 'function') {
        a.telemetry.track(name, props || {});
      }
    } catch (_) {}
  }

  function storageGet(key, fallback) {
    try {
      var a = A();
      if (a && a.storage && typeof a.storage.get === 'function') {
        return a.storage.get(key, fallback);
      }
    } catch (_) {}
    try {
      var raw = W() && W().localStorage && W().localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      var a = A();
      if (a && a.storage && typeof a.storage.set === 'function') {
        a.storage.set(key, value);
        return;
      }
    } catch (_) {}
    try {
      if (W() && W().localStorage) {
        W().localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_) {}
  }

  function loadInbox() {
    var box = storageGet(INBOX_KEY, null);
    if (!box || !Array.isArray(box.items)) {
      box = { items: [], version: 1 };
    }
    return box;
  }

  function saveInbox(box) {
    var next = JSON.stringify(box);
    if (JSON.stringify(storageGet(INBOX_KEY, null)) === next) return box;
    storageSet(INBOX_KEY, box);
    return box;
  }

  function upsertPending(item) {
    if (!item || !item.id) return loadInbox();
    var box = loadInbox();
    var found = null;
    for (var i = 0; i < box.items.length; i++) {
      if (box.items[i].id === item.id) {
        found = box.items[i];
        break;
      }
    }
    if (found && found.status === 'claimed') return box;
    if (found) {
      found.title = item.title || found.title;
      found.apxHint = item.apxHint != null ? item.apxHint : found.apxHint;
      found.meta = item.meta || found.meta;
      found.status = 'pending';
    } else {
      box.items.unshift({
        id: item.id,
        kind: item.kind || 'featured_objective',
        status: 'pending',
        title: item.title || 'Campaign reward',
        apxHint: item.apxHint != null ? item.apxHint : 15,
        createdAt: new Date().toISOString(),
        claimedAt: null,
        meta: item.meta || {}
      });
    }
    // Cap inbox size
    if (box.items.length > 40) box.items = box.items.slice(0, 40);
    saveInbox(box);
    render();
    return box;
  }

  function pendingCount() {
    var box = loadInbox();
    var n = 0;
    for (var i = 0; i < box.items.length; i++) {
      if (box.items[i].status === 'pending') n++;
    }
    return n;
  }

  function markItemClaimed(id) {
    var box = loadInbox();
    for (var i = 0; i < box.items.length; i++) {
      if (box.items[i].id === id) {
        box.items[i].status = 'claimed';
        box.items[i].claimedAt = new Date().toISOString();
      }
    }
    saveInbox(box);
    return box;
  }

  function toast(msg) {
    try {
      if (W() && W().CompTIALedgerUI && typeof CompTIALedgerUI.toast === 'function') {
        CompTIALedgerUI.toast(msg);
        return;
      }
    } catch (_) {}
    try {
      if (typeof console !== 'undefined') console.log('[RewardCenter]', msg);
    } catch (_) {}
  }

  async function claimItem(id) {
    var box = loadInbox();
    var item = null;
    for (var i = 0; i < box.items.length; i++) {
      if (box.items[i].id === id) {
        item = box.items[i];
        break;
      }
    }
    if (!item) return { skipped: true, reason: 'not_found' };
    if (item.status === 'claimed') return { skipped: true, reason: 'already_claimed' };

    var meta = item.meta || {};
    var fc = A() && A().featuredCampaign;
    var award = !(fc && typeof fc.awardClaimBonus === 'function' && fc.awardClaimBonus() === false);

    var result;
    try {
      if (!award) {
        result = { skipped: false, apx: 0, ceremonyOnly: true };
      } else if (!W().CompTIALedger || typeof CompTIALedger.claimFeaturedObjective !== 'function') {
        toast('Ledger not ready. Try again in a moment.');
        track('reward_center_claim_error', { id: id, reason: 'ledger_missing' });
        return { skipped: true, reason: 'ledger_missing' };
      } else {
        result = await CompTIALedger.claimFeaturedObjective({
          day: meta.day || (fc && fc.getState && fc.getState().day),
          campaignId: meta.campaignId,
          exam: meta.exam,
          objectiveCode: meta.objectiveCode,
          bestPercent: meta.bestPercent,
          attempts: meta.attempts
        });
      }
    } catch (err) {
      toast('Claim failed. Your reward is still pending.');
      track('reward_center_claim_error', { id: id, reason: 'throw' });
      return { skipped: true, reason: 'throw' };
    }

    var okToClear =
      result &&
      (!result.skipped ||
        result.reason === 'already_claimed' ||
        result.reason === 'budget' ||
        result.ceremonyOnly === true);

    if (!okToClear) {
      if (result && result.reason === 'missing_campaign') {
        toast('Campaign id missing. Reward kept pending.');
      } else {
        toast('Could not claim yet. Reward kept pending.');
      }
      track('reward_center_claim', {
        id: id,
        apx: 0,
        skipped: true,
        reason: (result && result.reason) || 'unknown'
      });
      render();
      return result || { skipped: true, reason: 'unknown' };
    }

    markItemClaimed(id);
    try {
      if (fc && typeof fc.markClaimed === 'function') fc.markClaimed(result);
    } catch (_) {}

    try {
      if (W().CompTIALedgerUI && typeof CompTIALedgerUI.refreshWalletBadge === 'function') {
        await CompTIALedgerUI.refreshWalletBadge();
      }
    } catch (_) {}

    if (!prefersReducedMotion() && result && !result.skipped && result.apx > 0) {
      try {
        if (W().CompTIALedgerUI && typeof CompTIALedgerUI.spawnCoinShower === 'function') {
          CompTIALedgerUI.spawnCoinShower();
        }
      } catch (_) {}
    }

    if (result && result.skipped && result.reason === 'already_claimed') {
      toast('Already claimed');
    } else if (result && result.skipped && result.reason === 'budget') {
      toast('Daily APX limit reached. Progress still counts.');
    } else if (result && result.ceremonyOnly) {
      toast('Campaign marked complete');
    } else {
      toast('+' + (result.apx || 0) + ' APX claimed');
    }

    track('reward_center_claim', {
      id: id,
      apx: result && result.apx,
      skipped: !!(result && result.skipped)
    });
    render();
    return result;
  }

  function unlockProgressHtml() {
    try {
      var goalTitle = '';
      var goalText = '';
      var elT = W().document.getElementById('l2eGoalTitle');
      var elP = W().document.getElementById('l2eGoalProgressText');
      if (elT) goalTitle = elT.textContent || '';
      if (elP) goalText = elP.textContent || '';
      if (!goalTitle && !goalText) return '';
      return (
        '<div class="rc-unlock">' +
        '<div class="rc-section-label">Next unlock</div>' +
        '<p><strong>' +
        esc(goalTitle) +
        '</strong><br><span class="rc-muted">' +
        esc(goalText) +
        '</span></p></div>'
      );
    } catch (_) {
      return '';
    }
  }

  function streakHtml(ledgerState) {
    try {
      var streak = null;
      if (ledgerState && ledgerState.wallet && typeof ledgerState.wallet.streak === 'number') {
        streak = ledgerState.wallet.streak;
      }
      var chip = W().document.getElementById('streakHeaderChip') || W().document.getElementById('streakChip');
      var txt = chip ? chip.textContent.trim() : '';
      if (streak != null) txt = streak + (streak === 1 ? ' day streak' : ' day streak');
      if (!txt) return '';
      return (
        '<div class="rc-streak"><div class="rc-section-label">Streak</div><p>' +
        esc(txt) +
        '</p></div>'
      );
    } catch (_) {
      return '';
    }
  }

  function readinessBesideHtml() {
    if (!walletEnabled() || walletCfg().showReadinessBesideApx === false) return '';
    try {
      var neighbor = W().document.getElementById('apxReadinessNeighbor');
      var txt = neighbor ? neighbor.textContent.trim() : '';
      if (!txt) {
        var a = A();
        if (a && a.readiness2 && typeof a.readiness2.compute === 'function') {
          var history = [];
          if (a.learner && typeof a.learner.getHistory === 'function') {
            history = a.learner.getHistory() || [];
          }
          var r = a.readiness2.compute({ history: history });
          if (r && r.predicted != null) {
            txt =
              'Predicted ' +
              Math.round(r.predicted) +
              (r.readiness != null ? ' · ' + Math.round(r.readiness) + '% ready' : '');
          }
        }
      }
      if (!txt) return '';
      return (
        '<div class="rc-readiness">' +
        '<div class="rc-section-label">Readiness (the real goal)</div>' +
        '<p>' +
        esc(txt) +
        '</p></div>'
      );
    } catch (_) {
      return '';
    }
  }

  function degreeHtml(ledgerState) {
    if (!showDegree()) return '';
    try {
      var w = ledgerState && ledgerState.wallet;
      var rank = w && w.rank;
      if (!rank || !rank.name) return '';
      var xp = typeof w.xp === 'number' ? w.xp : null;
      var ranks = (ledgerState && ledgerState.ranks) || [];
      var next = null;
      if (xp != null && ranks.length) {
        for (var i = 0; i < ranks.length; i++) {
          if (ranks[i].minXp > xp) {
            next = ranks[i];
            break;
          }
        }
      }
      track('degree_shown', { rankId: rank.id || '', xp: xp });
      var nextLine = next
        ? 'Next Degree at ' + next.minXp + ' XP: ' + next.name
        : 'Top Degree reached. Keep readiness climbing.';
      return (
        '<div class="rc-degree">' +
        '<div class="rc-section-label">Degree</div>' +
        '<p><strong>' +
        esc(rank.name) +
        '</strong>' +
        (xp != null ? ' <span class="rc-muted">(' + xp + ' XP)</span>' : '') +
        '<br><span class="rc-muted">' +
        esc(nextLine) +
        '</span></p></div>'
      );
    } catch (_) {
      return '';
    }
  }

  function achievementsHtml(ledgerState) {
    if (!walletEnabled()) return '';
    try {
      var earned = (ledgerState && ledgerState.wallet && ledgerState.wallet.achievements) || [];
      var catalog = (ledgerState && ledgerState.achievementsCatalog) || {};
      var ids = Array.isArray(earned)
        ? earned.slice()
        : Object.keys(earned).filter(function (id) {
            return !!earned[id];
          });
      if (!ids.length) {
        return (
          '<div class="rc-achievements">' +
          '<div class="rc-section-label">Achievements</div>' +
          '<p class="rc-empty">No achievements yet. Finish a scored exam or streak milestone to mint one.</p></div>'
        );
      }
      var html =
        '<div class="rc-achievements"><div class="rc-section-label">Achievements</div><ul class="rc-list rc-ach-list">';
      ids.slice(0, 8).forEach(function (id) {
        var meta = catalog[id] || { name: id, desc: '' };
        html +=
          '<li class="rc-item is-claimed"><div class="rc-item-main"><strong>' +
          esc(meta.name || id) +
          '</strong><span class="rc-muted">' +
          esc(meta.desc || '') +
          '</span></div></li>';
      });
      html += '</ul></div>';
      return html;
    } catch (_) {
      return '';
    }
  }

  function economyFaqHtml() {
    if (!showEconomyFaq()) return '';
    track('economy_faq_opened', {});
    return (
      '<div class="rc-faq" id="rcEconomyFaq">' +
      '<div class="rc-section-label">APX economy FAQ</div>' +
      '<dl class="rc-faq-list">' +
      '<dt>What is APX?</dt><dd>Study points earned for real practice. They unlock in-app tools. They cannot be bought, transferred, or cashed out.</dd>' +
      '<dt>What is a Degree?</dt><dd>A cosmetic rank from lifetime XP on your local ledger. Higher Degrees mark habit depth. Your predicted exam score is still the goal.</dd>' +
      "<dt>What is Today's Mission?</dt><dd>One Learn, Quiz, Claim loop for your weakest objective. Finish it to claim a bonus under the daily APX cap.</dd>" +
      '<dt>What is a streak?</dt><dd>Consecutive days with qualifying study. Soft grace covers one miss; shields cover extra misses when equipped.</dd>' +
      '<dt>What can I claim?</dt><dd>Mission bonuses and store unlocks that help you study. No lottery, Lucky Draw, or crypto prizes.</dd>' +
      '</dl></div>'
    );
  }

  function surfaceTitle() {
    return walletEnabled() ? 'Achievement Wallet' : 'Reward Center';
  }

  function surfaceSub() {
    return walletEnabled()
      ? 'Claims, Degree, and study evidence. Readiness stays the real score.'
      : 'Claim campaign bonuses. Study APX still earns from Learn and Quiz as usual.';
  }

  function renderList(box, ledgerState) {
    var pending = box.items.filter(function (it) {
      return it.status === 'pending';
    });
    var claimed = box.items.filter(function (it) {
      return it.status === 'claimed';
    }).slice(0, 8);

    var html = '';
    html += '<div class="rc-body">';
    html += readinessBesideHtml();
    html += degreeHtml(ledgerState);
    html += unlockProgressHtml();
    html += streakHtml(ledgerState);
    html += '<div class="rc-section-label">Pending claims</div>';
    if (!pending.length) {
      html +=
        "<p class=\"rc-empty\">No pending mission rewards. Complete Today's Mission quiz (Learn then Quiz) to earn a claim.</p>";
    } else {
      html += '<ul class="rc-list" role="list">';
      pending.forEach(function (it) {
        html += '<li class="rc-item">';
        html += '<div class="rc-item-main"><strong>' + esc(it.title) + '</strong>';
        html +=
          '<span class="rc-apx">+' +
          esc(String(it.apxHint != null ? it.apxHint : '?')) +
          ' APX</span></div>';
        html +=
          '<button type="button" class="btn btn-primary rc-claim-btn" data-rc-claim="' +
          esc(it.id) +
          '">Claim</button>';
        html += '</li>';
      });
      html += '</ul>';
    }
    if (claimed.length) {
      html += '<div class="rc-section-label">Recently claimed</div><ul class="rc-list rc-claimed">';
      claimed.forEach(function (it) {
        html +=
          '<li class="rc-item is-claimed"><strong>' +
          esc(it.title) +
          '</strong><span class="rc-muted">Claimed</span></li>';
      });
      html += '</ul>';
    }
    html += achievementsHtml(ledgerState);
    html += economyFaqHtml();
    html +=
      '<div class="rc-footer-actions">' +
      '<button type="button" class="btn btn-secondary" id="rcOpenStoreBtn">Superpowers Store</button>' +
      '<button type="button" class="btn btn-secondary" id="rcCloseBtn">Close</button>' +
      '</div>';
    html += '</div>';
    return html;
  }

  function ensureModal() {
    var doc = W() && W().document;
    if (!doc) return null;
    var modal = doc.getElementById(MODAL_ID);
    var created = false;
    var title = surfaceTitle();
    var sub = surfaceSub();
    if (!modal) {
      created = true;
      modal = doc.createElement('div');
      modal.id = MODAL_ID;
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', title);
      modal.innerHTML =
        '<div class="modal-card rc-modal-card">' +
        '<div class="modal-header">' +
        '<div><h3 class="rc-title">' +
        esc(title) +
        '</h3>' +
        '<p class="rc-sub">' +
        esc(sub) +
        '</p></div>' +
        '<button type="button" class="rc-x" aria-label="Close ' +
        esc(title) +
        '" id="rcHeaderClose">&times;</button>' +
        '</div>' +
        '<div id="rewardCenterBody"></div>' +
        '</div>';
      doc.body.appendChild(modal);
    } else {
      modal.setAttribute('aria-label', title);
      var tEl = modal.querySelector('.rc-title');
      var sEl = modal.querySelector('.rc-sub');
      if (tEl) tEl.textContent = title;
      if (sEl) sEl.textContent = sub;
      var hxLabel = modal.querySelector('#rcHeaderClose');
      if (hxLabel) hxLabel.setAttribute('aria-label', 'Close ' + title);
    }
    if (!modal.getAttribute('data-rc-wired')) {
      modal.setAttribute('data-rc-wired', '1');
      modal.addEventListener('click', function (ev) {
        if (ev.target === modal) close();
      });
      if (!created) {
        var hx = modal.querySelector('#rcHeaderClose') || modal.querySelector('.rc-x');
        if (hx && !hx.getAttribute('data-rc-close')) {
          hx.setAttribute('data-rc-close', '1');
          hx.addEventListener('click', close);
        }
      }
    }
    return modal;
  }

  function render(ledgerState) {
    var modal = ensureModal();
    if (!modal) return;
    var body = modal.querySelector('#rewardCenterBody');
    if (!body) return;
    var box = loadInbox();
    body.innerHTML = renderList(box, ledgerState || null);

    var claimBtns = body.querySelectorAll('[data-rc-claim]');
    for (var i = 0; i < claimBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-rc-claim');
          btn.disabled = true;
          Promise.resolve(claimItem(id)).finally(function () {
            btn.disabled = false;
          });
        });
      })(claimBtns[i]);
    }
    var storeBtn = body.querySelector('#rcOpenStoreBtn');
    if (storeBtn) {
      storeBtn.addEventListener('click', function () {
        close();
        if (typeof W().openLedgerModal === 'function') W().openLedgerModal();
      });
    }
    var closeBtn = body.querySelector('#rcCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var x = modal.querySelector('#rcHeaderClose');
    if (x) x.addEventListener('click', close);
  }

  function open() {
    if (!isEnabled()) {
      if (typeof W().openLedgerModal === 'function') W().openLedgerModal();
      return;
    }
    var modal = ensureModal();
    var finish = function (state) {
      render(state);
      modal.classList.add('active');
      track('reward_center_opened', { pending: pendingCount(), wallet: walletEnabled() });
      if (walletEnabled()) {
        track('wallet_opened', { tab: 'claims', pending: pendingCount() });
      }
    };
    try {
      if (W().CompTIALedger && typeof CompTIALedger.getState === 'function') {
        Promise.resolve(CompTIALedger.getState())
          .then(finish)
          .catch(function () {
            finish(null);
          });
        return;
      }
    } catch (_) {}
    finish(null);
  }

  function close() {
    var modal = W() && W().document && W().document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove('active');
  }

  function openApxSurface() {
    if (isEnabled() && openFromChip()) {
      open();
      return;
    }
    if (typeof W().openLedgerModal === 'function') W().openLedgerModal();
  }

  function wireChip() {
    var w = W();
    if (!w) return;
    w.openApxSurface = openApxSurface;
    w.openRewardCenter = open;
    w.closeRewardCenter = close;
    // Keep chip onclick wiring via HTML; openApxSurface is global.
  }

  return {
    VERSION: VERSION,
    INBOX_KEY: INBOX_KEY,
    isEnabled: isEnabled,
    upsertPending: upsertPending,
    pendingCount: pendingCount,
    claimItem: claimItem,
    open: open,
    close: close,
    openApxSurface: openApxSurface,
    wireChip: wireChip,
    render: render,
    loadInbox: loadInbox,
    walletEnabled: walletEnabled,
    showDegree: showDegree,
    showEconomyFaq: showEconomyFaq,
    surfaceTitle: surfaceTitle
  };
});
