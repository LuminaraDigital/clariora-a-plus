/**
 * ton_credentials.js
 * TON Blockchain Proof-of-Mastery credentialing for Clariora.
 * Bridges ledger_engine.js cryptographic audit trails to the TON blockchain
 * using TON Connect 2.0.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./tma_bridge'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tma_bridge'));
  } else {
    root.TONCredentials = factory(root.TMABridge);
  }
})(typeof self !== 'undefined' ? self : this, function (TMABridge) {
  'use strict';

  /**
   * Tier 1 request guard (js/request-guard.js). Creates a payment order bound to the caller. A retried order is a second
   * order, so this is single-attempt.
   * Degrades to plain fetch when the guard has not loaded.
   */
  function guardedFetch(url, init, guardOpts) {
    var g = (typeof window !== 'undefined' && window.APlus && window.APlus.guard) || null;
    if (g) return g.fetch(url, init, guardOpts);
    return fetch(url, init);
  }


  const CONFIG = {
    manifestUrl: 'https://clariora.com.au/tonconnect-manifest.json',
    // Merchant wallet is resolved from /api/v1/billing/ton/order (server secret).
    // This address is only a last-resort fallback for local demos.
    merchantWalletAddress: null,
    registryContractAddress: null,
    network: 'mainnet',
    allowSimulatedMint: false
  };

  let tonConnectUI = null;
  let currentWallet = null;

  /**
   * Initializes TON Connect UI
   */
  async function initTonConnect(containerId = 'ton-connect-btn') {
    if (typeof window === 'undefined') return;

    if (window.TonConnectUI && !tonConnectUI) {
      try {
        const container = document.getElementById(containerId);
        if (!container) return;

        tonConnectUI = new window.TonConnectUI.TonConnectUI({
          manifestUrl: CONFIG.manifestUrl,
          buttonRootId: containerId
        });

        tonConnectUI.onStatusChange(wallet => {
          currentWallet = wallet;
          console.log('[TON] Wallet status changed:', wallet ? wallet.account.address : 'disconnected');
          if (wallet && TMABridge) {
            TMABridge.haptic('success');
          }
        });
      } catch (err) {
        console.warn('[TON] TON Connect initialization error:', err);
      }
    }
  }

  /**
   * Get connected wallet address
   */
  function getWalletAddress() {
    if (!currentWallet || !currentWallet.account) return null;
    return currentWallet.account.address;
  }

  /**
   * Generates a cryptographic verification payload from ledger_engine exam results
   */
  function buildCredentialPayload(examResult) {
    const {
      examCore = '1',
      scaledScore = 0,
      passed = false,
      ledgerHash = '0000000000000000',
      timestamp = Date.now(),
      learnerId = 'technician'
    } = examResult;

    // Compact on-chain verification comment
    const memo = `APX:C${examCore}:${scaledScore}:${passed ? 'PASS' : 'FAIL'}:${ledgerHash.slice(0, 16)}`;

    return {
      memo,
      fullRecord: {
        standard: 'APX-TON-SBT-v1',
        exam: `CompTIA A+ Core ${examCore} (220-120${examCore})`,
        scaledScore,
        passed,
        passingScore: examCore === '1' ? 675 : 700,
        ledgerHash,
        timestamp,
        learnerId
      }
    };
  }

  /**
   * Sends an on-chain verification transaction to the TON registry
   */
  async function mintExamCredential(examResult, options = {}) {
    if (TMABridge) TMABridge.haptic('medium');

    const payload = buildCredentialPayload(examResult);

    // 1. If TON Connect UI is active and wallet is connected
    if (tonConnectUI && currentWallet) {
      const registry = CONFIG.registryContractAddress || CONFIG.merchantWalletAddress;
      if (!registry) {
        throw new Error('TON credential registry is not configured. Open the Mini App or refresh and try again.');
      }
      try {
        // Construct TON transaction to the registry contract with memo
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
          messages: [
            {
              address: registry,
              amount: '50000000', // 0.05 TON for network gas and storage
              payload: btoa(payload.memo) // Base64 encoded payload
            }
          ]
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('[TON] Transaction broadcasted:', result);

        const record = {
          ...payload.fullRecord,
          walletAddress: getWalletAddress(),
          boc: result.boc,
          explorerUrl: `https://${CONFIG.network === 'testnet' ? 'testnet.' : ''}tonscan.org/address/${registry}`
        };

        saveVerifiedCredential(record);
        if (TMABridge) TMABridge.haptic('success');
        return { success: true, record };

      } catch (err) {
        console.error('[TON] Transaction failed or rejected:', err);
        throw err;
      }
    }

    // 2. Simulation only when explicitly allowed (local demos, tests). Production real browser requires wallet.
    const isRealBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.getElementById === 'function';
    if (!CONFIG.allowSimulatedMint && !(options && options.simulate) && isRealBrowser) {
      throw new Error('Connect a TON wallet to mint an on-chain mastery credential.');
    }
    console.log('[TON] Simulating on-chain ledger registration (non-production only)...');
    const simulatedRecord = {
      ...payload.fullRecord,
      walletAddress: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
      txHash: 'a7b8c9d0e1f234567890abcdef1234567890abcdef1234567890abcdef123456',
      explorerUrl: `https://${CONFIG.network === 'testnet' ? 'testnet.' : ''}tonscan.org/tx/simulated`,
      simulated: true
    };

    saveVerifiedCredential(simulatedRecord);
    return { success: true, record: simulatedRecord, simulated: true };
  }

  /**
   * 1-Click TON payment for subscription tier upgrades (https://docs.ton.org/)
   * Creates a server order first so memo + merchant wallet are authoritative.
   */
  async function sendTonPayment(productId, options = {}) {
    const TON_PRICES = {
      daily_unlimited: { amountTon: '1.5', nanotons: '1500000000', title: '24-Hour Study Pass' },
      pro_monthly: { amountTon: '7.0', nanotons: '7000000000', title: 'Monthly Pro Pass' },
      lifetime_master: { amountTon: '35.0', nanotons: '35000000000', title: 'Lifetime Master Pass' }
    };

    const item = TON_PRICES[productId] || TON_PRICES.daily_unlimited;
    const userId = options.userId || safeGet('clariora_sync_user_id') || 'technician';

    // Resolve merchant wallet + order memo from the edge (never trust client mock addresses).
    let order = null;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (options.idToken) headers['Authorization'] = 'Bearer ' + options.idToken;
      const tg = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;
      if (tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData;
      const orderRes = await guardedFetch('/api/v1/billing/ton/order', {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({
          productId: productId,
          idToken: options.idToken || null,
          initData: tg && tg.initData ? tg.initData : null
        })
      });
      order = await orderRes.json().catch(function () { return null; });
      if (!orderRes.ok || !order || !order.merchantWallet) {
        throw new Error((order && (order.message || order.error)) || 'Could not create TON payment order');
      }
      CONFIG.merchantWalletAddress = order.merchantWallet;
    } catch (orderErr) {
      if (!(CONFIG.allowSimulatedMint || (options && options.simulate))) {
        throw orderErr;
      }
    }

    const recipient = options.recipient || (order && order.merchantWallet) || CONFIG.merchantWalletAddress;
    const nanotons = String((order && order.nanotons) || item.nanotons);
    const amountTon = (order && order.amountTon) || item.amountTon;
    const memo = (order && (order.memo || order.orderId)) || ('APX:SUB:' + productId + ':' + userId);

    if (!recipient) {
      throw new Error('TON merchant wallet is not configured.');
    }

    if (!tonConnectUI || !currentWallet) {
      if (CONFIG.allowSimulatedMint || (options && options.simulate) || typeof window === 'undefined') {
        return {
          success: true,
          txHash: 'ton_sim_' + Date.now().toString(16),
          amountTon: amountTon,
          orderId: order && order.orderId,
          walletAddress: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
          simulated: true
        };
      }
      throw new Error('Please connect your TON wallet first using the button above.');
    }

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: recipient,
          amount: nanotons,
          payload: btoa(memo)
        }
      ]
    };

    const result = await tonConnectUI.sendTransaction(transaction);
    const txHash = result && (result.boc ? result.boc.slice(0, 64) : 'ton_' + Date.now().toString(16));

    if (TMABridge) TMABridge.haptic('success');
    return {
      success: true,
      txHash: txHash,
      boc: result ? result.boc : null,
      amountTon: amountTon,
      orderId: order && order.orderId,
      walletAddress: getWalletAddress()
    };
  }

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
   * Save verified credential locally and to Telegram cloud
   */
  function saveVerifiedCredential(record) {
    const list = getVerifiedCredentials();
    list.unshift(record);
    safeSet('tma_ton_credentials', JSON.stringify(list));
    if (TMABridge && TMABridge.setCloudItem) {
      TMABridge.setCloudItem('ton_credentials', list);
    }
  }

  function getVerifiedCredentials() {
    try {
      const val = safeGet('tma_ton_credentials');
      return val ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Render verification badge into UI
   */
  function renderCredentialCard(containerEl, examResult) {
    if (!containerEl) return;
    const isPassed = examResult.scaledScore >= (examResult.examCore === '1' ? 675 : 700);

    containerEl.innerHTML = `
      <div class="ton-credential-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#0098EA">
              <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
              <path d="M2 17L12 22L22 17"/>
              <path d="M2 12L12 17L22 12"/>
            </svg>
            <span style="font-weight: 700; color: #38BDF8; font-size: 0.95rem;">TON Blockchain Credential</span>
          </div>
          <span style="font-size: 0.72rem; padding: 2px 8px; background: rgba(0, 152, 234, 0.2); border-radius: 99px; color: #38BDF8;">
            APX-SBT
          </span>
        </div>
        <p style="font-size: 0.8rem; color: #94A3B8; margin: 0 0 12px 0;">
          ${isPassed 
            ? 'Score verified with cryptographic hash-chain ledger. Mint your immutable Soulbound achievement on TON.' 
            : 'Pass this exam to mint your verified credential on the TON blockchain.'}
        </p>
        ${isPassed ? `
          <button id="mint-ton-btn" class="ton-btn">
            Mint Verified Outcome on TON
          </button>
        ` : `
          <button disabled class="ton-btn" style="opacity: 0.5; cursor: not-allowed;">
            Score below passing mark (Need ${examResult.examCore === '1' ? 675 : 700})
          </button>
        `}
      </div>
    `;

    const mintBtn = containerEl.querySelector('#mint-ton-btn');
    if (mintBtn) {
      mintBtn.onclick = async () => {
        mintBtn.disabled = true;
        mintBtn.innerText = 'Publishing to TON...';
        try {
          const res = await mintExamCredential(examResult);
          mintBtn.innerText = 'Verified on TON';
          mintBtn.style.background = '#10B981';
          if (res.record && res.record.explorerUrl) {
            window.open(res.record.explorerUrl, '_blank');
          }
        } catch (e) {
          mintBtn.disabled = false;
          mintBtn.innerText = 'Failed (Retry)';
        }
      };
    }
  }

  function setConfig(newConfig = {}) {
    Object.assign(CONFIG, newConfig);
    return CONFIG;
  }

  return {
    CONFIG,
    setConfig,
    initTonConnect,
    getWalletAddress,
    buildCredentialPayload,
    mintExamCredential,
    sendTonPayment,
    getVerifiedCredentials,
    renderCredentialCard
  };
});
