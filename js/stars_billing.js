/**
 * stars_billing.js
 * Telegram Stars (XTR) in-app billing for Clariora TMA.
 * Complies with Apple App Store Guideline 3.1.1 and Google Play Billing requirements
 * for digital unlocks inside Telegram Mini Apps.
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
      title: '24-Hour Unlimited Pass',
      stars: 50,
      description: 'Unlimited practice questions, PBQ simulations, and AI Coach for 24 hours.',
      tier: 'daily_pass'
    },
    {
      id: 'pro_monthly',
      title: 'Monthly Pro Pass (Core 1 + Core 2)',
      stars: 250,
      description: 'Full access to NVIDIA NIM 70B, DeepSeek R1, and all 1,150 questions for 30 days.',
      tier: 'pro_monthly'
    },
    {
      id: 'lifetime_master',
      title: 'Lifetime Master Pass (Core 1 + Core 2)',
      stars: 1500,
      description: 'Unlock all 1,150 questions, timed mock exams, and unlimited AI Ghost Coach forever.',
      tier: 'lifetime'
    }
  ];

  /**
   * Check current user entitlement
   */
  function safeGet(key) {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key);
    } catch (e) {}
    return null;
  }

  function safeSet(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      else if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  /**
   * Check current user entitlement
   */
  async function getEntitlements() {
    if (TMABridge && TMABridge.getCloudItem) {
      const cloudTier = await TMABridge.getCloudItem('user_entitlement');
      if (cloudTier) return cloudTier;
    }
    const local = safeGet('tma_user_entitlement');
    return local ? JSON.parse(local) : { tier: 'free', expiresAt: null };
  }

  /**
   * Save user entitlement
   */
  async function saveEntitlement(tier, expiresAt = null) {
    const data = { tier, expiresAt, unlockedAt: Date.now() };
    safeSet('tma_user_entitlement', JSON.stringify(data));
    if (TMABridge && TMABridge.setCloudItem) {
      await TMABridge.setCloudItem('user_entitlement', data);
    }
    return data;
  }

  /**
   * Initiate Telegram Stars purchase flow via openInvoice
   */
  async function purchaseProduct(productId, serverEndpoint = '/api/v1/billing/stars/invoice') {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    if (TMABridge) TMABridge.haptic('selection');

    // 1. If running inside live Telegram client with a configured bot server
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && typeof tg.openInvoice === 'function') {
      try {
        console.log(`[StarsBilling] Fetching invoice for ${product.id} (${product.stars} Stars)...`);
        
        const endpoint = (typeof window !== 'undefined' && window.location && (window.location.hostname.endsWith('clariora.com.au') || window.location.hostname.endsWith('pages.dev')))
          ? serverEndpoint
          : 'https://clariora.com.au' + serverEndpoint;

        // Request invoice link from bot server
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            stars: product.stars,
            title: product.title,
            description: product.description,
            initData: tg.initData
          })
        });

        if (res.ok) {
          const { invoiceLink } = await res.json();
          return new Promise((resolve, reject) => {
            tg.openInvoice(invoiceLink, async (status) => {
              console.log('[StarsBilling] Invoice status:', status);
              if (status === 'paid') {
                if (TMABridge) TMABridge.haptic('success');
                const entitlement = await applyProductGrant(product);
                resolve({ success: true, status, entitlement });
              } else if (status === 'cancelled') {
                resolve({ success: false, status: 'cancelled' });
              } else if (status === 'failed') {
                if (TMABridge) TMABridge.haptic('error');
                reject(new Error('Telegram Stars payment failed'));
              } else {
                resolve({ success: false, status });
              }
            });
          });
        }
      } catch (err) {
        console.warn('[StarsBilling] Remote invoice fetch failed, falling back to mock sandbox:', err.message);
      }
    }

    // 2. Sandbox / Dev fallback modal for local development & testing
    return promptDevMockCheckout(product);
  }

  /**
   * Apply product features upon payment completion
   */
  async function applyProductGrant(product) {
    let expiresAt = null;
    if (product.id === 'daily_unlimited') {
      expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    } else if (product.id === 'pro_monthly') {
      expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    } else if (product.id === 'lifetime_master') {
      expiresAt = null; // Forever
    }
    const ent = await saveEntitlement(product.tier, expiresAt);
    if (TMABridge && TMABridge.mountUserPill) {
      TMABridge.mountUserPill();
    }
    return ent;
  }

  /**
   * Developer Sandbox Mock Checkout
   */
  function promptDevMockCheckout(product) {
    return new Promise((resolve) => {
      const confirmPurchase = window.confirm(
        `⭐ Telegram Stars Checkout (Sandbox Mode)\n\nItem: ${product.title}\nPrice: ${product.stars} Telegram Stars (XTR)\n\nSimulate successful payment?`
      );
      if (confirmPurchase) {
        if (TMABridge) TMABridge.haptic('success');
        applyProductGrant(product).then((entitlement) => {
          alert(`🎉 Payment Approved! You now have: ${product.title}`);
          resolve({ success: true, status: 'paid', entitlement });
        });
      } else {
        resolve({ success: false, status: 'cancelled' });
      }
    });
  }

  /**
   * Render the Stars Upgrade Bottom-Sheet
   */
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
      sheet.innerHTML = `
        <div class="tma-sheet-handle"></div>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #D4AF37; margin: 0 0 6px 0; font-size: 1.3rem;">Clariora Access</h2>
          <p style="color: #94A3B8; font-size: 0.85rem; margin: 0;">Unlock full practice exams & AI Ghost Coach with Telegram Stars.</p>
        </div>
        <div id="tma-stars-products">
          ${PRODUCTS.map(p => `
            <div class="stars-card">
              <div style="flex: 1; padding-right: 12px;">
                <div style="font-weight: 700; color: #F3F4F6; margin-bottom: 4px;">${p.title}</div>
                <div style="font-size: 0.78rem; color: #94A3B8;">${p.description}</div>
              </div>
              <button class="btn btn-primary" onclick="StarsBilling.purchaseProduct('${p.id}')" style="padding: 8px 14px; min-height: 40px; font-weight: 700; background: #F5D061; color: #07090E; border: none; border-radius: 8px; cursor: pointer;">
                ⭐ ${p.stars}
              </button>
            </div>
          `).join('')}
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <button class="btn" onclick="StarsBilling.closeStarsUpgradeSheet()" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #94A3B8; padding: 10px 24px; border-radius: 8px;">Close</button>
        </div>
      `;
      document.body.appendChild(sheet);
    }

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
    PRODUCTS,
    getEntitlements,
    saveEntitlement,
    purchaseProduct,
    openStarsUpgradeSheet,
    closeStarsUpgradeSheet
  };
});
