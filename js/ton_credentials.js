/**
 * ton_credentials.js
 * TON Blockchain Proof-of-Mastery credentialing for Clariora.
 * Bridges ledger_engine.js cryptographic audit trails to the TON blockchain
 * using TON Connect 2.0.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./tma_bridge', './ton_comment'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./tma_bridge'), require('./ton_comment'));
  } else {
    root.TONCredentials = factory(root.TMABridge, root.TONComment);
  }
})(typeof self !== 'undefined' ? self : this, function (TMABridge, TONComment) {
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

  function encodeCommentPayload(text) {
    if (TONComment && typeof TONComment.encodeTonTextComment === 'function') {
      return TONComment.encodeTonTextComment(text);
    }
    throw new Error('TON comment encoder is not loaded. Refresh and try again.');
  }

  function resolveDefaultNetwork() {
    if (TONComment && typeof TONComment.detectTonNetwork === 'function') {
      return TONComment.detectTonNetwork();
    }
    return 'mainnet';
  }

  function resolveManifestUrl() {
    try {
      if (typeof location !== 'undefined' && location.origin && /staging|localhost|127\.0\.0\.1/i.test(location.hostname)) {
        return location.origin + '/tonconnect-manifest.json';
      }
    } catch (e) {}
    return 'https://clariora.com.au/tonconnect-manifest.json';
  }

  function connectNetworkId() {
    if (TONComment && typeof TONComment.tonConnectNetworkId === 'function') {
      return TONComment.tonConnectNetworkId(CONFIG.network);
    }
    return CONFIG.network === 'testnet' ? '-3' : '-239';
  }

  const CONFIG = {
    manifestUrl: resolveManifestUrl(),
    // Merchant wallet is resolved from /api/v1/billing/ton/order (server secret).
    // This address is only a last-resort fallback for local demos.
    merchantWalletAddress: null,
    registryContractAddress: null,
    network: resolveDefaultNetwork(),
    allowSimulatedMint: false,
    // Off by default; armed only when health.tonSbtConfigured is true (or force).
    autoMintAfterPass: false,
    mintEndpoint: '/api/v1/credentials/ton/mint',
    attestEndpoint: '/api/v1/oracle/attest',
    examSubmitEndpoint: '/api/v1/exam/submit'
  };

  function applyFeaturesConfig() {
    try {
      const feat = (typeof window !== 'undefined' && window.APLUS_FEATURES_CONFIG && window.APLUS_FEATURES_CONFIG.tonSbt) || null;
      if (!feat) return;
      if (typeof feat.autoMintAfterPass === 'boolean') CONFIG.autoMintAfterPass = feat.autoMintAfterPass;
      if (feat.registryAddress) CONFIG.registryContractAddress = feat.registryAddress;
      if (feat.mintEndpoint) CONFIG.mintEndpoint = feat.mintEndpoint;
      if (feat.attestEndpoint) CONFIG.attestEndpoint = feat.attestEndpoint;
      if (feat.examSubmitEndpoint) CONFIG.examSubmitEndpoint = feat.examSubmitEndpoint;
    } catch (e) {}
  }
  applyFeaturesConfig();

  /**
   * Pull staging/production collection address from /api/v1/health when available.
   * Arms autoMintAfterPass only when the edge reports tonSbtConfigured.
   */
  async function syncRegistryFromHealth() {
    try {
      const res = await guardedFetch('/api/v1/health', { credentials: 'include' });
      if (!res.ok) return CONFIG;
      const data = await res.json().catch(function () { return null; });
      if (!data) return CONFIG;
      if (data.tonNetwork === 'testnet' || data.tonNetwork === 'mainnet') {
        CONFIG.network = data.tonNetwork;
      }
      if (data.tonSbtCollectionAddress) {
        CONFIG.registryContractAddress = data.tonSbtCollectionAddress;
      }
      if (data.tonSbtConfigured === true) {
        CONFIG.autoMintAfterPass = true;
      }
    } catch (e) {}
    return CONFIG;
  }

  /**
   * Persist a verified exam attempt on the edge so attest/mint can bind to attemptId.
   */
  async function submitExamAttempt(examResult, options = {}) {
    const examCode = options.examCode ||
      ('220-120' + String(examResult && examResult.examCore === '2' ? '2' : '1'));
    const res = await guardedFetch(CONFIG.examSubmitEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({
        examCode: examCode,
        scaledScore: Number(examResult && examResult.scaledScore),
        passed: Boolean(examResult && examResult.passed),
        timeSpentSeconds: Number((examResult && examResult.secondsSpent) || 0),
        rawCorrect: Number((examResult && examResult.rawCorrect) || 0),
        totalQuestions: Number((examResult && (examResult.totalQuestions || examResult.total)) || 1)
      })
    }, { maxAttempts: 1 });
    const json = await res.json().catch(function () { return null; });
    if (!res.ok || !json || !json.attemptId) {
      throw new Error((json && (json.message || json.error)) || 'Exam submit failed');
    }
    return json;
  }

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

  function authHeaders(extra) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    try {
      const tg = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;
      if (tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData;
    } catch (e) {}
    return headers;
  }

  /**
   * Oracle path: attest + queue server-side MintMasterySBT (owner/oracle only).
   * Preferred over client TonConnect comment memos (those are not TEP-85 mints).
   */
  async function requestOracleMint(examResult, options = {}) {
    await syncRegistryFromHealth();
    const payload = buildCredentialPayload(examResult);
    const walletAddress = options.walletAddress || getWalletAddress();
    if (!walletAddress) {
      throw new Error('Connect a TON wallet so the mastery SBT can be assigned to your address.');
    }

    const examCode = options.examCode ||
      ('220-120' + String(examResult.examCore === '2' ? '2' : '1'));

    let attestation = null;
    try {
      const attestRes = await guardedFetch(CONFIG.attestEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({
          examCode: examCode,
          scaledScore: examResult.scaledScore,
          passed: Boolean(examResult.passed),
          localLedgerHash: examResult.ledgerHash || payload.fullRecord.ledgerHash,
          chain: 'ton',
          walletAddress: walletAddress,
          attemptId: options.attemptId || examResult.attemptId || null
        })
      }, { maxAttempts: 1 });
      attestation = await attestRes.json().catch(function () { return null; });
      if (!attestRes.ok || !attestation || !attestation.ok) {
        throw new Error((attestation && (attestation.message || attestation.error)) || 'Attestation rejected');
      }
      if (attestation.collectionAddress) {
        CONFIG.registryContractAddress = attestation.collectionAddress;
      }
    } catch (attestErr) {
      if (!(options && options.allowAttestSkip)) throw attestErr;
    }

    const mintRes = await guardedFetch(CONFIG.mintEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({
        examCode: examCode,
        scaledScore: examResult.scaledScore,
        passed: Boolean(examResult.passed),
        ledgerHash: examResult.ledgerHash || payload.fullRecord.ledgerHash,
        walletAddress: walletAddress,
        attestationId: attestation && attestation.attestationId ? attestation.attestationId : null,
        attemptId: options.attemptId || examResult.attemptId || null
      })
    }, { maxAttempts: 1 });
    const mintJson = await mintRes.json().catch(function () { return null; });
    if (!mintRes.ok || !mintJson || !mintJson.success) {
      throw new Error((mintJson && (mintJson.message || mintJson.error)) || 'Mint request failed');
    }

    const record = {
      ...payload.fullRecord,
      walletAddress: walletAddress,
      mintId: mintJson.mintId,
      mintStatus: mintJson.status || 'pending',
      collectionAddress: mintJson.collectionAddress || CONFIG.registryContractAddress,
      explorerUrl: mintJson.explorer || null,
      oracleQueued: true
    };
    saveVerifiedCredential(record);
    if (TMABridge) TMABridge.haptic('success');
    return { success: true, record: record, queued: true, mint: mintJson, attestation: attestation };
  }

  /**
   * Mint mastery credential after a passing exam.
   * Prefers oracle queue (real TEP-85). Optional TonConnect memo is legacy fallback only.
   */
  async function mintExamCredential(examResult, options = {}) {
    if (TMABridge) TMABridge.haptic('medium');
    applyFeaturesConfig();
    await syncRegistryFromHealth();

    // An explicit simulate request (test harnesses, demos) never reaches the oracle.
    const preferOracle = !(options && (options.forceTonConnectMemo || options.simulate));
    if (preferOracle) {
      try {
        return await requestOracleMint(examResult, options);
      } catch (oracleErr) {
        // Fall through to TonConnect memo only when explicitly allowed or collection missing mid-rollout.
        const msg = String(oracleErr && oracleErr.message ? oracleErr.message : oracleErr);
        if (options && options.requireOracle) throw oracleErr;
        if (/SBT_COLLECTION_UNCONFIGURED|not deployed/i.test(msg) && !(options && options.allowMemoFallback)) {
          throw oracleErr;
        }
        console.warn('[TON] Oracle mint unavailable, evaluating fallback:', msg);
        if (!(options && options.allowMemoFallback)) throw oracleErr;
      }
    }

    const payload = buildCredentialPayload(examResult);

    // Legacy: TonConnect text-comment to registry (not a contract MintMasterySBT call).
    if (tonConnectUI && currentWallet) {
      const registry = CONFIG.registryContractAddress || CONFIG.merchantWalletAddress;
      if (!registry) {
        throw new Error('TON credential registry is not configured. Open the Mini App or refresh and try again.');
      }
      try {
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600,
          network: connectNetworkId(),
          messages: [
            {
              address: registry,
              amount: '50000000',
              payload: encodeCommentPayload(payload.memo)
            }
          ]
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('[TON] Transaction broadcasted:', result);

        const record = {
          ...payload.fullRecord,
          walletAddress: getWalletAddress(),
          boc: result.boc,
          explorerUrl: `https://${CONFIG.network === 'testnet' ? 'testnet.' : ''}tonscan.org/address/${registry}`,
          legacyMemo: true
        };

        saveVerifiedCredential(record);
        if (TMABridge) TMABridge.haptic('success');
        return { success: true, record: record };

      } catch (err) {
        console.error('[TON] Transaction failed or rejected:', err);
        throw err;
      }
    }

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
   * Called from results UI after a passing full exam. Best-effort; never blocks results screen.
   */
  async function mintAfterPass(examResult, options = {}) {
    applyFeaturesConfig();
    try {
      await syncRegistryFromHealth();
    } catch (e) {}
    if (!CONFIG.autoMintAfterPass && !(options && options.force)) {
      return { skipped: true, reason: 'autoMintAfterPass_disabled' };
    }
    const passed = Boolean(examResult && examResult.passed);
    const core = String((examResult && examResult.examCore) || '1');
    const min = core === '2' ? 700 : 675;
    const score = Number(examResult && examResult.scaledScore);
    if (!passed || !(score >= min)) {
      return { skipped: true, reason: 'not_passed' };
    }
    try {
      if (!CONFIG.registryContractAddress && !(options && options.force)) {
        return { skipped: true, reason: 'collection_unconfigured' };
      }
      let attemptId = options.attemptId || (examResult && examResult.attemptId) || null;
      if (!attemptId) {
        try {
          const submitted = await submitExamAttempt(examResult, options);
          attemptId = submitted.attemptId;
        } catch (submitErr) {
          console.warn('[TON] exam submit before mint skipped:', submitErr && submitErr.message ? submitErr.message : submitErr);
        }
      }
      const merged = Object.assign({}, examResult || {}, { attemptId: attemptId });
      const res = await mintExamCredential(merged, Object.assign({ requireOracle: true, attemptId: attemptId }, options || {}));
      return res;
    } catch (err) {
      console.warn('[TON] mintAfterPass deferred:', err && err.message ? err.message : err);
      return { success: false, deferred: true, error: String(err && err.message ? err.message : err) };
    }
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
          network: CONFIG.network,
          idToken: options.idToken || null,
          initData: tg && tg.initData ? tg.initData : null
        })
      });
      order = await orderRes.json().catch(function () { return null; });
      if (!orderRes.ok || !order || !order.merchantWallet) {
        throw new Error((order && (order.message || order.error)) || 'Could not create TON payment order');
      }
      CONFIG.merchantWalletAddress = order.merchantWallet;
      if (order.network === 'testnet' || order.network === 'mainnet') {
        CONFIG.network = order.network;
      }
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
          network: CONFIG.network,
          walletAddress: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
          simulated: true
        };
      }
      throw new Error('Please connect your TON wallet first using the button above.');
    }

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      network: connectNetworkId(),
      messages: [
        {
          address: recipient,
          amount: nanotons,
          payload: encodeCommentPayload(memo)
        }
      ]
    };

    const result = await tonConnectUI.sendTransaction(transaction);
    // TonConnect returns a signed external-message BoC, not TonCenter transaction_id.hash.
    // Server verify resolves the on-chain hash via merchant inbound scan + order memo.
    const boc = result && result.boc ? String(result.boc) : null;
    if (!boc) {
      throw new Error('Wallet did not return a signed transaction. Try again or use recovery.');
    }

    if (TMABridge) TMABridge.haptic('success');
    return {
      success: true,
      boc: boc,
      amountTon: amountTon,
      orderId: (order && order.orderId) || null,
      memo: memo,
      merchantWallet: recipient,
      network: CONFIG.network,
      walletAddress: getWalletAddress(),
      pendingConfirm: true
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
          const res = await mintExamCredential(examResult, { requireOracle: true });
          mintBtn.innerText = (res && res.queued) ? 'Mint queued on TON' : 'Verified on TON';
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
    requestOracleMint,
    mintAfterPass,
    submitExamAttempt,
    syncRegistryFromHealth,
    sendTonPayment,
    getVerifiedCredentials,
    renderCredentialCard,
    encodeCommentPayload: encodeCommentPayload
  };
});
