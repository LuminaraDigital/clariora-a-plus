/**
 * stars_billing.js
 * Telegram Stars (XTR) in-app billing for Clariora TMA.
 * Digital goods inside Telegram Mini Apps must use Stars only
 * (Apple 3.1.1 / Google Play / Telegram Bot Payments for digital goods).
 * Authoritative entitlement is always the Cloudflare Worker / D1 grant.
 * @see https://core.telegram.org/bots/payments-stars
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./tma_bridge'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tma_bridge'));
  } else {
    root.StarsBilling = factory(root.TMABridge);
  }
})(typeof self !== 'undefined' ? self : this, function (TMABridge) {
  'use strict';

  const PRODUCTS = [
    {
      id: 'daily_unlimited',
      title: '24-Hour Study Pass',
      invoiceTitle: '24-Hour Study Pass',
      stars: 50,
      description: 'Higher hard AI budgets, streaming coach, and Core specialists for 24 hours. Pay with Telegram Stars.',
      tier: 'daily_pass'
    },
    {
      id: 'pro_monthly',
      title: 'Monthly Pro Pass (Core 1 + Core 2)',
      invoiceTitle: 'Monthly Pro Pass',
      stars: 250,
      description: 'Multi-specialist handoffs, tools, NVIDIA/OpenRouter, hard daily/monthly AI caps for 30 days.',
      tier: 'pro_monthly'
    },
    {
      id: 'lifetime_master',
      title: 'Lifetime Master Pass (Core 1 + Core 2)',
      invoiceTitle: 'Lifetime Master Pass',
      stars: 1500,
      description: 'Highest hard AI budgets, war-room plans, priority models, and full Core 1+2 forever.',
      tier: 'lifetime'
    }
  ];

  const FREE_DEFAULT = { tier: 'free', expiresAt: null, trialDaysRemaining: 14 };

  function safeGet(key) {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch (e) {}
    return null;
  }

  function safeSet(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch (e) {}
  }

  function getTelegramWebApp() {
    return (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;
  }

  function isLiveTelegramClient() {
    const tg = getTelegramWebApp();
    return !!(tg && typeof tg.openInvoice === 'function' && tg.initData);
  }

  function isDevBillingAllowed() {
    try {
      if (typeof window !== 'undefined' && window.APLUS_DEV_BILLING === true) return true;
      const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
      const localHost = host === 'localhost' || host === '127.0.0.1';
      return localHost && safeGet('APLUS_DEV_BILLING') === '1';
    } catch (_) {
      return false;
    }
  }

  function invoiceEndpoint(serverEndpoint) {
    if (typeof window !== 'undefined' && window.location &&
        (window.location.hostname.endsWith('clariora.com.au') ||
         window.location.hostname.endsWith('pages.dev') ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1')) {
      return serverEndpoint;
    }
    return 'https://clariora.com.au' + serverEndpoint;
  }

  function cacheEntitlement(data) {
    const ent = data && typeof data === 'object' ? data : FREE_DEFAULT;
    try {
      window.__CLARIORA_SERVER_ENTITLEMENT__ = ent;
      window.dispatchEvent(new CustomEvent('clariora:entitlement-updated', { detail: ent }));
    } catch (_) {}
    safeSet('tma_user_entitlement', JSON.stringify(ent));
    return ent;
  }

  function readLocalCache() {
    try {
      const local = safeGet('tma_user_entitlement');
      return local ? JSON.parse(local) : null;
    } catch (_) {
      return null;
    }
  }

  function normalizeEntitlement(raw) {
    if (!raw || typeof raw !== 'object') return Object.assign({}, FREE_DEFAULT);
    let tier = raw.tier || 'free';
    const expiresAt = raw.expiresAt != null ? Number(raw.expiresAt) : (raw.tier_expires_at != null ? Number(raw.tier_expires_at) : null);
    if (expiresAt && expiresAt > 0 && expiresAt < Date.now()) tier = 'free';
    return {
      tier: tier,
      expiresAt: expiresAt,
      trialDaysRemaining: raw.trialDaysRemaining != null ? raw.trialDaysRemaining : 14,
      freeUsedToday: raw.freeUsedToday || 0,
      proPreviewTokensRemaining: raw.proPreviewTokensRemaining != null ? raw.proPreviewTokensRemaining : 0,
      features: raw.features || null,
      payRails: raw.payRails || ['telegram_stars', 'ton_onchain'],
      source: raw.source || 'unknown'
    };
  }

  async function fetchServerEntitlement() {
    const tg = getTelegramWebApp();
    const initData = (tg && tg.initData) || '';
    if (!initData) return null;
    try {
      const res = await fetch(invoiceEndpoint('/api/v1/billing/entitlement'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData
        },
        body: JSON.stringify({ initData: initData })
      });
      if (!res.ok) return null;
      const data = await res.json().catch(function () { return null; });
      if (!data || !data.entitlement) return null;
      return normalizeEntitlement(Object.assign({}, data.entitlement, { source: 'server' }));
    } catch (_) {
      return null;
    }
  }

  async function getEntitlements() {
    const server = await fetchServerEntitlement();
    if (server) return cacheEntitlement(server);

    if (TMABridge && TMABridge.getCloudItem) {
      try {
        const cloudTier = await TMABridge.getCloudItem('user_entitlement');
        if (cloudTier) {
          const normalized = normalizeEntitlement(Object.assign({}, cloudTier, { source: 'cloud' }));
          // Cloud/local cache is UX-only until server confirms; never treat as paid without server when live.
          if (isLiveTelegramClient() && normalized.tier !== 'free') {
            return cacheEntitlement(Object.assign({}, FREE_DEFAULT, {
              trialDaysRemaining: normalized.trialDaysRemaining,
              source: 'unverified_cache'
            }));
          }
          return cacheEntitlement(normalized);
        }
      } catch (_) {}
    }

    const local = readLocalCache();
    if (local) {
      const normalized = normalizeEntitlement(Object.assign({}, local, { source: 'local' }));
      if (isLiveTelegramClient() && normalized.tier !== 'free') {
        return cacheEntitlement(Object.assign({}, FREE_DEFAULT, {
          trialDaysRemaining: normalized.trialDaysRemaining,
          source: 'unverified_cache'
        }));
      }
      return cacheEntitlement(normalized);
    }
    return cacheEntitlement(FREE_DEFAULT);
  }

  async function saveEntitlement(tier, expiresAt) {
    // Optimistic local UX cache only. Authoritative grant is webhook / D1.
    const data = normalizeEntitlement({
      tier: tier,
      expiresAt: expiresAt,
      unlockedAt: Date.now(),
      source: 'optimistic'
    });
    safeSet('tma_user_entitlement', JSON.stringify(data));
    if (TMABridge && TMABridge.setCloudItem) {
      try { await TMABridge.setCloudItem('user_entitlement', data); } catch (_) {}
    }
    try {
      window.__CLARIORA_SERVER_ENTITLEMENT__ = data;
      window.dispatchEvent(new CustomEvent('clariora:entitlement-updated', { detail: data }));
    } catch (_) {}
    return data;
  }

  function confirmTermsAccepted() {
    const accepted = window.confirm(
      'Clariora Terms & Pay Support\n\n' +
      'Digital unlocks are sold in Telegram Stars (XTR) only inside this Mini App.\n' +
      'Telegram support cannot help with bot purchases. Use /paysupport in the bot chat for refunds or billing issues.\n\n' +
      'Do you agree to the Terms (/terms) and wish to continue to checkout?'
    );
    return !!accepted;
  }

  async function purchaseProduct(productId, serverEndpoint) {
    serverEndpoint = serverEndpoint || '/api/v1/billing/stars/invoice';
    const product = PRODUCTS.find(function (p) { return p.id === productId; });
    if (!product) throw new Error('Product ' + productId + ' not found');

    if (TMABridge) TMABridge.haptic('selection');

    if (!confirmTermsAccepted()) {
      return { success: false, status: 'cancelled' };
    }

    const tg = getTelegramWebApp();
    if (tg && typeof tg.openInvoice === 'function' && tg.initData) {
      try {
        console.log('[StarsBilling] Fetching XTR invoice for ' + product.id + ' (' + product.stars + ' Stars)...');

        const res = await fetch(invoiceEndpoint(serverEndpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            initData: tg.initData || ''
          })
        });

        const data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.invoiceLink) {
          const errMsg = data.error || ('Invoice request failed (' + res.status + ')');
          if (TMABridge) TMABridge.haptic('error');
          alert('Could not start Telegram Stars checkout.\n\n' + errMsg + '\n\nTry again or message the bot with /paysupport.');
          return { success: false, status: 'failed', error: errMsg };
        }

        if (data.sandbox) {
          console.warn('[StarsBilling] Server returned sandbox invoice link');
        }

        return new Promise(function (resolve, reject) {
          tg.openInvoice(data.invoiceLink, async function (status) {
            console.log('[StarsBilling] Invoice status:', status);
            if (status === 'paid') {
              if (TMABridge) TMABridge.haptic('success');
              await applyProductGrant(product);
              // Prefer server truth after webhook grant (short poll).
              let entitlement = null;
              for (var i = 0; i < 4; i++) {
                entitlement = await fetchServerEntitlement();
                if (entitlement && entitlement.tier && entitlement.tier !== 'free') break;
                await new Promise(function (r) { setTimeout(r, 700); });
              }
              if (entitlement) cacheEntitlement(entitlement);
              closeStarsUpgradeSheet();
              resolve({ success: true, status: status, entitlement: entitlement || await getEntitlements() });
            } else if (status === 'cancelled') {
              resolve({ success: false, status: 'cancelled' });
            } else if (status === 'failed') {
              if (TMABridge) TMABridge.haptic('error');
              reject(new Error('Telegram Stars payment failed'));
            } else {
              resolve({ success: false, status: status });
            }
          });
        });
      } catch (err) {
        console.warn('[StarsBilling] Stars invoice error:', err.message || err);
        if (TMABridge) TMABridge.haptic('error');
        alert('Telegram Stars checkout is unavailable right now. Use /paysupport in the bot chat if you were charged.');
        return { success: false, status: 'failed', error: String(err.message || err) };
      }
    }

    if (isDevBillingAllowed()) {
      return promptDevMockCheckout(product);
    }

    // Browser (non-TMA): point to Mini App for Stars; offer TON Connect verify path when available.
    var tonHint = '';
    if (window.TONCredentials && typeof window.TONCredentials.getWalletAddress === 'function') {
      tonHint = '\n\nOr unlock on the web with a verified TON payment after connecting your wallet.';
    }
    alert(
      'Telegram Stars (XTR) checkout is only available inside the Clariora Mini App.\n\n' +
      'Open https://t.me/ClarioraBot/app to pay with Stars.' + tonHint
    );
    return { success: false, status: 'unavailable', rail: 'telegram_stars' };
  }

  async function purchaseProductWithTon(productId) {
    const product = PRODUCTS.find(function (p) { return p.id === productId; });
    if (!product) throw new Error('Product ' + productId + ' not found');

    // Telegram policy: digital goods inside Mini Apps must use Stars (XTR), not TON.
    const tg = getTelegramWebApp();
    if (tg && tg.initData) {
      alert('Inside Telegram, use Stars checkout for digital unlocks.');
      return purchaseProduct(productId);
    }

    if (!window.TONCredentials || typeof window.TONCredentials.initTonConnect !== 'function') {
      alert('TON Connect is not loaded. Refresh and try again.');
      return { success: false, status: 'unavailable' };
    }

    try {
      await window.TONCredentials.initTonConnect('ton-connect-btn');
      const wallet = window.TONCredentials.getWalletAddress && window.TONCredentials.getWalletAddress();
      if (!wallet) {
        alert('Connect a TON wallet first, then retry the unlock.');
        return { success: false, status: 'wallet_required' };
      }

      var idToken = null;
      try {
        var svc = window.ClarioraFirebaseService;
        var user = svc && svc.getCurrentUser && svc.getCurrentUser();
        if (user && user.getIdToken) idToken = await user.getIdToken();
      } catch (_) {}

      var txHash = null;
      var amountTon = '0';
      if (typeof window.TONCredentials.sendTonPayment === 'function') {
        try {
          const sent = await window.TONCredentials.sendTonPayment(product.id, {
            userId: user ? user.uid : null
          });
          if (sent && sent.txHash) {
            txHash = sent.txHash;
            amountTon = sent.amountTon || '0';
          }
        } catch (sendErr) {
          console.warn('[StarsBilling] Direct TON transaction prompt fallback:', sendErr.message);
        }
      }

      if (!txHash) {
        txHash = window.prompt('Paste your confirmed TON transaction hash to unlock ' + product.title + ':');
      }

      if (!txHash || String(txHash).trim().length < 10) {
        return { success: false, status: 'cancelled' };
      }

      const res = await fetch('/api/v1/billing/ton/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          txHash: String(txHash).trim(),
          walletAddress: wallet,
          amountTon: amountTon,
          idToken: idToken
        })
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.success) {
        alert((data && data.message) || (data && data.error) || 'TON verification failed');
        return { success: false, status: 'failed', error: data };
      }
      await applyProductGrant(product);
      const entitlement = await fetchServerEntitlement();
      if (entitlement) cacheEntitlement(entitlement);
      closeStarsUpgradeSheet();
      return { success: true, status: 'paid', entitlement: entitlement || data, rail: 'ton_onchain' };
    } catch (err) {
      alert(String(err && err.message || err));
      return { success: false, status: 'failed', error: String(err && err.message || err) };
    }
  }

  async function applyProductGrant(product) {
    let expiresAt = null;
    if (product.id === 'daily_unlimited') {
      expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    } else if (product.id === 'pro_monthly') {
      expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    } else if (product.id === 'lifetime_master') {
      expiresAt = null;
    }
    const ent = await saveEntitlement(product.tier, expiresAt);
    if (TMABridge && TMABridge.mountUserPill) {
      TMABridge.mountUserPill();
    }
    return ent;
  }

  function promptDevMockCheckout(product) {
    return new Promise(function (resolve) {
      const confirmPurchase = window.confirm(
        'Stars Checkout (Dev Sandbox)\n\nItem: ' + product.title +
        '\nPrice: ' + product.stars + ' Telegram Stars (XTR)\n\nSimulate approved payment?'
      );
      if (confirmPurchase) {
        if (TMABridge) TMABridge.haptic('success');
        applyProductGrant(product).then(function (entitlement) {
          alert('Payment Approved (sandbox). You now have: ' + product.title);
          closeStarsUpgradeSheet();
          resolve({ success: true, status: 'paid', entitlement: entitlement });
        });
      } else {
        resolve({ success: false, status: 'cancelled' });
      }
    });
  }

  function renderProductCards() {
    const container = document.getElementById('tma-stars-products');
    if (!container) return;

    container.innerHTML = PRODUCTS.map(function (p) {
      var inTma = !!(getTelegramWebApp() && getTelegramWebApp().initData);
      var tonBtn = inTma ? '' : (
        '<button type="button" class="btn" onclick="StarsBilling.purchaseProductWithTon(\'' + p.id + '\')" style="padding: 8px 12px; margin-top: 6px; font-size: 0.8rem; background: transparent; border: 1px solid rgba(212,175,55,0.45); color: #D4AF37; border-radius: 8px; cursor: pointer;">Unlock with TON</button>'
      );
      return '' +
      '<div class="stars-card" style="display: flex; justify-content: space-between; align-items: center; background: #131722; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 14px; margin-bottom: 10px;">' +
        '<div style="flex: 1; padding-right: 12px;">' +
          '<div style="font-weight: 700; color: #F3F4F6; font-size: 0.95rem; margin-bottom: 3px;">' + p.title + '</div>' +
          '<div style="font-size: 0.78rem; color: #94A3B8; line-height: 1.4;">' + p.description + '</div>' +
          tonBtn +
        '</div>' +
        '<button type="button" class="btn btn-primary" onclick="StarsBilling.purchaseProduct(\'' + p.id + '\')" style="padding: 10px 16px; min-height: 42px; font-weight: 700; background: linear-gradient(135deg, #D4AF37 0%, #F5D061 100%); color: #07090E; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; font-size: 0.9rem;">' +
          p.stars + ' Stars' +
        '</button>' +
      '</div>';
    }).join('');
    if (!getTelegramWebApp() || !getTelegramWebApp().initData) {
      try {
        if (window.TONCredentials && window.TONCredentials.initTonConnect) {
          window.TONCredentials.initTonConnect('ton-connect-btn');
        }
      } catch (_) {}
    }
  }

  function openStarsUpgradeSheet() {
    let sheet = document.getElementById('tma-stars-sheet');
    let backdrop = document.getElementById('tma-stars-backdrop');

    if (!sheet) {
      backdrop = document.createElement('div');
      backdrop.id = 'tma-stars-backdrop';
      backdrop.className = 'tma-sheet-backdrop';
      backdrop.onclick = closeStarsUpgradeSheet;
      document.body.appendChild(backdrop);

      sheet = document.createElement('div');
      sheet.id = 'tma-stars-sheet';
      sheet.className = 'tma-sheet';
      sheet.innerHTML =
        '<div class="tma-sheet-handle"></div>' +
        '<div style="text-align: center; margin-bottom: 16px;">' +
          '<h2 style="color: #D4AF37; margin: 0 0 6px 0; font-size: 1.3rem;">Clariora Pro Access</h2>' +
          '<p style="color: #94A3B8; font-size: 0.85rem; margin: 0 0 10px 0;">In Telegram Mini App: pay with Stars (XTR). On the web: sign in, then unlock with verified TON or open the Mini App for Stars.</p>' +
          '<div id="ton-connect-btn" style="display:flex;justify-content:center;margin:8px 0 12px;"></div>' +
          '<div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px;">' +
            '<span style="font-size: 0.78rem; color: #10B981; font-weight: 600;">Free tier: 20 questions/day + 5 AI coach sessions</span>' +
          '</div>' +
          '<p style="color: #64748B; font-size: 0.72rem; margin: 0;">Billing help: /paysupport in the bot chat. Terms: /terms</p>' +
        '</div>' +
        '<div id="tma-stars-products"></div>' +
        '<div style="text-align: center; margin-top: 16px;">' +
          '<button type="button" class="btn" onclick="StarsBilling.closeStarsUpgradeSheet()" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #94A3B8; padding: 10px 24px; border-radius: 8px;">Close</button>' +
        '</div>';
      document.body.appendChild(sheet);
    }

    renderProductCards();

    if (TMABridge) {
      TMABridge.pushNav('stars_sheet', closeStarsUpgradeSheet);
      TMABridge.haptic('light');
    }

    backdrop.classList.add('is-open');
    sheet.classList.add('is-open');
  }

  function closeStarsUpgradeSheet() {
    const sheet = document.getElementById('tma-stars-sheet');
    const backdrop = document.getElementById('tma-stars-backdrop');
    if (sheet) sheet.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    if (TMABridge) TMABridge.haptic('light');
  }

  return {
    PRODUCTS: PRODUCTS,
    getEntitlements: getEntitlements,
    saveEntitlement: saveEntitlement,
    purchaseProduct: purchaseProduct,
    purchaseProductWithTon: purchaseProductWithTon,
    openStarsUpgradeSheet: openStarsUpgradeSheet,
    closeStarsUpgradeSheet: closeStarsUpgradeSheet,
    fetchServerEntitlement: fetchServerEntitlement
  };
});
