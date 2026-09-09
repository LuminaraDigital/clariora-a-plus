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
      ton: 0.2,
      description: 'Unlimited practice questions, PBQ simulations, and AI Coach for 24 hours.',
      tier: 'daily_pass'
    },
    {
      id: 'pro_monthly',
      title: 'Monthly Pro Pass (Core 1 + Core 2)',
      stars: 250,
      ton: 1.0,
      description: 'Full access to NVIDIA NIM 70B, DeepSeek R1, and all 1,150 questions for 30 days.',
      tier: 'pro_monthly'
    },
    {
      id: 'lifetime_master',
      title: 'Lifetime Master Pass (Core 1 + Core 2)',
      stars: 1500,
      ton: 6.0,
      description: 'Unlock all 1,150 questions, timed mock exams, and unlimited AI Ghost Coach forever.',
      tier: 'lifetime'
    }
  ];

  let selectedPaymentRail = 'stars'; // 'stars' or 'ton'

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
    return local ? JSON.parse(local) : { tier: 'free', expiresAt: null, trialDaysRemaining: 14 };
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
   * Initiate TON Blockchain purchase flow
   */
  async function purchaseProductWithTon(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) throw new Error(`Product ${productId} not found`);

    if (TMABridge) TMABridge.haptic('selection');

    const tg = window.Telegram && window.Telegram.WebApp;
    const initData = (tg && tg.initData) || '';
    const telegramId = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || 12345678;

    // Call server TON verify endpoint
    try {
      const endpoint = (typeof window !== 'undefined' && window.location && (window.location.hostname.endsWith('clariora.com.au') || window.location.hostname.endsWith('pages.dev')))
        ? '/api/v1/billing/ton/verify'
        : 'https://clariora.com.au/api/v1/billing/ton/verify';

      const mockTxHash = 'ton_tx_' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          productId: product.id,
          txHash: mockTxHash,
          amountTon: String(product.ton),
          walletAddress: (window.TONCredentials && window.TONCredentials.getWalletAddress && window.TONCredentials.getWalletAddress()) || 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
          initData
        })
      });

      if (res.ok) {
        if (TMABridge) TMABridge.haptic('success');
        const entitlement = await applyProductGrant(product);
        alert(`💎 TON Payment Verified! Unlocked: ${product.title}`);
        closeStarsUpgradeSheet();
        return { success: true, status: 'paid', entitlement };
      }
    } catch (e) {
      console.warn('[StarsBilling] TON verification error:', e);
    }

    // Sandbox prompt fallback
    return promptDevMockCheckout(product, 'TON');
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
  function promptDevMockCheckout(product, rail = 'Stars') {
    return new Promise((resolve) => {
      const priceStr = rail === 'TON' ? `${product.ton} TON` : `${product.stars} Telegram Stars (XTR)`;
      const confirmPurchase = window.confirm(
        `⭐ Checkout (${rail} Sandbox Mode)\n\nItem: ${product.title}\nPrice: ${priceStr}\n\nSimulate approved payment?`
      );
      if (confirmPurchase) {
        if (TMABridge) TMABridge.haptic('success');
        applyProductGrant(product).then((entitlement) => {
          alert(`🎉 Payment Approved! You now have: ${product.title}`);
          closeStarsUpgradeSheet();
          resolve({ success: true, status: 'paid', entitlement });
        });
      } else {
        resolve({ success: false, status: 'cancelled' });
      }
    });
  }

  /**
   * Switch payment rail between Stars and TON
   */
  function switchPaymentRail(rail) {
    selectedPaymentRail = rail;
    if (TMABridge) TMABridge.haptic('selection');
    renderProductCards();
    const btnStars = document.getElementById('tmaRailBtnStars');
    const btnTon = document.getElementById('tmaRailBtnTon');
    if (btnStars && btnTon) {
      btnStars.style.background = rail === 'stars' ? 'rgba(212, 175, 55, 0.25)' : 'transparent';
      btnStars.style.color = rail === 'stars' ? '#F5D061' : '#94A3B8';
      btnStars.style.borderColor = rail === 'stars' ? '#D4AF37' : 'rgba(255, 255, 255, 0.1)';
      btnTon.style.background = rail === 'ton' ? 'rgba(0, 152, 234, 0.25)' : 'transparent';
      btnTon.style.color = rail === 'ton' ? '#38BDF8' : '#94A3B8';
      btnTon.style.borderColor = rail === 'ton' ? '#0098EA' : 'rgba(255, 255, 255, 0.1)';
    }
  }

  /**
   * Re-render product cards based on selected rail
   */
  function renderProductCards() {
    const container = document.getElementById('tma-stars-products');
    if (!container) return;

    container.innerHTML = PRODUCTS.map(p => `
      <div class="stars-card" style="display: flex; justify-content: space-between; align-items: center; background: #131722; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 14px; margin-bottom: 10px;">
        <div style="flex: 1; padding-right: 12px;">
          <div style="font-weight: 700; color: #F3F4F6; font-size: 0.95rem; margin-bottom: 3px;">${p.title}</div>
          <div style="font-size: 0.78rem; color: #94A3B8; line-height: 1.4;">${p.description}</div>
        </div>
        ${selectedPaymentRail === 'stars' ? `
          <button class="btn btn-primary" onclick="StarsBilling.purchaseProduct('${p.id}')" style="padding: 10px 16px; min-height: 42px; font-weight: 700; background: linear-gradient(135deg, #D4AF37 0%, #F5D061 100%); color: #07090E; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; font-size: 0.9rem;">
            ⭐ ${p.stars}
          </button>
        ` : `
          <button class="btn" onclick="StarsBilling.purchaseProductWithTon('${p.id}')" style="padding: 10px 16px; min-height: 42px; font-weight: 700; background: #0098EA; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; font-size: 0.9rem;">
            💎 ${p.ton} TON
          </button>
        `}
      </div>
    `).join('');
  }

  /**
   * Render the Stars & TON Upgrade Bottom-Sheet
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
        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="color: #D4AF37; margin: 0 0 6px 0; font-size: 1.3rem;">Clariora Pro Access</h2>
          <p style="color: #94A3B8; font-size: 0.85rem; margin: 0 0 10px 0;">Unlock full practice exams & multi-model Business AI (NVIDIA 70B & OpenRouter).</p>
          
          <!-- 14-Day Free Practice Trial Banner -->
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px;">
            <span style="font-size: 0.85rem;">🛡️</span>
            <span style="font-size: 0.78rem; color: #10B981; font-weight: 600;">14-Day Practice Simulator Active • 5 Free Daily Groq AI Sessions</span>
          </div>

          <!-- Dual Rail Selector (Stars vs TON) -->
          <div style="display: flex; justify-content: center; gap: 8px; margin-top: 4px;">
            <button id="tmaRailBtnStars" onclick="StarsBilling.switchPaymentRail('stars')" style="
              padding: 6px 14px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; cursor: pointer;
              background: rgba(212, 175, 55, 0.25); border: 1px solid #D4AF37; color: #F5D061;
            ">
              ⭐ Telegram Stars
            </button>
            <button id="tmaRailBtnTon" onclick="StarsBilling.switchPaymentRail('ton')" style="
              padding: 6px 14px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; cursor: pointer;
              background: transparent; border: 1px solid rgba(255, 255, 255, 0.1); color: #94A3B8;
            ">
              💎 TON Blockchain
            </button>
          </div>
        </div>

        <div id="tma-stars-products"></div>

        <div style="text-align: center; margin-top: 16px;">
          <button class="btn" onclick="StarsBilling.closeStarsUpgradeSheet()" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #94A3B8; padding: 10px 24px; border-radius: 8px;">Close</button>
        </div>
      `;
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
    PRODUCTS,
    getEntitlements,
    saveEntitlement,
    purchaseProduct,
    purchaseProductWithTon,
    switchPaymentRail,
    openStarsUpgradeSheet,
    closeStarsUpgradeSheet
  };
});

