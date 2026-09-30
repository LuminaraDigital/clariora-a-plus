/**
 * js/xdc_provider.js
 * XDC Network (EVM) Web3 Provider & Billing Bridge for Clariora A+
 * Supports MetaMask, XDC Pay, Rabby, and standard EIP-1193 EVM browser wallets.
 * Handles network auto-switching (Chain ID 50 / 51), order creation, and on-chain payment.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.XDCProvider = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const XDC_CONFIG = {
    mainnet: {
      chainId: 50,
      hexChainId: '0x32',
      chainName: 'XDC Network',
      nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
      rpcUrls: ['https://rpc.xinfin.network', 'https://erpc.xinfin.network'],
      blockExplorerUrls: ['https://xdc.blocksscan.io']
    },
    apothem: {
      chainId: 51,
      hexChainId: '0x33',
      chainName: 'XDC Apothem Testnet',
      nativeCurrency: { name: 'TXDC', symbol: 'TXDC', decimals: 18 },
      rpcUrls: ['https://rpc.apothem.network'],
      blockExplorerUrls: ['https://apothem.blocksscan.io']
    }
  };

  let currentAccount = null;
  let activeNetwork = 'mainnet';

  function getEthereum() {
    if (typeof window === 'undefined') return null;
    // Check window.ethereum or window.xdc (XDC Pay legacy provider)
    return window.ethereum || window.xdc || null;
  }

  /**
   * Detects available EVM / XDC wallet provider
   */
  function isWalletAvailable() {
    return Boolean(getEthereum());
  }

  /**
   * Connect to user's EVM wallet and ensure correct XDC network
   */
  async function connectWallet(preferredNetwork = 'mainnet') {
    const eth = getEthereum();
    if (!eth) {
      throw new Error('No EVM wallet detected. Please install MetaMask, XDC Pay, or an EVM-compatible browser wallet.');
    }

    activeNetwork = preferredNetwork;
    const targetConfig = XDC_CONFIG[preferredNetwork] || XDC_CONFIG.mainnet;

    // Request account access
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts.length) {
      throw new Error('Wallet connection rejected by user.');
    }
    currentAccount = accounts[0];

    // Ensure connected to target XDC network
    await switchOrAddNetwork(targetConfig);

    // Subscribe to account changes
    if (eth.on) {
      eth.on('accountsChanged', (newAccounts) => {
        currentAccount = newAccounts && newAccounts.length ? newAccounts[0] : null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xdc:accountChanged', { detail: { account: currentAccount } }));
        }
      });
      eth.on('chainChanged', () => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      });
    }

    return {
      account: currentAccount,
      network: targetConfig.chainName,
      chainId: targetConfig.chainId
    };
  }

  /**
   * Switch chain or prompt wallet to add XDC network if not registered
   */
  async function switchOrAddNetwork(targetConfig) {
    const eth = getEthereum();
    if (!eth) return;

    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetConfig.hexChainId }]
      });
    } catch (switchError) {
      // Error code 4902 indicates that the chain has not been added to the wallet
      if (switchError && (switchError.code === 4902 || switchError.data?.originalError?.code === 4902)) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetConfig.hexChainId,
            chainName: targetConfig.chainName,
            nativeCurrency: targetConfig.nativeCurrency,
            rpcUrls: targetConfig.rpcUrls,
            blockExplorerUrls: targetConfig.blockExplorerUrls
          }]
        });
      } else {
        console.warn('[XDC] Chain switch warning:', switchError && switchError.message ? switchError.message : switchError);
      }
    }
  }

  function getConnectedAccount() {
    return currentAccount;
  }

  /**
   * 1-Click XDC Payment: Generates order at Edge API and sends EVM transaction
   */
  async function sendXdcPayment(productId, options = {}) {
    const eth = getEthereum();
    if (!eth || !currentAccount) {
      await connectWallet(options.network || activeNetwork);
    }

    const net = options.network || activeNetwork;
    const targetConfig = XDC_CONFIG[net] || XDC_CONFIG.mainnet;

    // 1. Create edge billing order
    const orderHeaders = { 'Content-Type': 'application/json' };
    if (options.idToken) orderHeaders['Authorization'] = 'Bearer ' + options.idToken;

    const orderRes = await fetch('/api/v1/billing/xdc/order', {
      method: 'POST',
      headers: orderHeaders,
      body: JSON.stringify({
        productId,
        walletAddress: currentAccount,
        network: net
      })
    });

    const order = await orderRes.json();
    if (!orderRes.ok || !order || !order.success) {
      throw new Error((order && (order.message || order.error)) || 'Could not create XDC payment order');
    }

    // 2. Format transaction parameter
    const recipient = order.contractAddress || order.merchantAddress;
    // Format wei value to hex
    const valueHex = '0x' + BigInt(order.amountWei).toString(16);

    const txParams = {
      from: currentAccount,
      to: recipient.startsWith('xdc') ? '0x' + recipient.slice(3) : recipient,
      value: valueHex
    };

    // 3. Send transaction via EVM provider
    const txHash = await eth.request({
      method: 'eth_sendTransaction',
      params: [txParams]
    });

    // 4. Verify transaction with Clariora edge
    const verifyRes = await fetch('/api/v1/billing/xdc/verify', {
      method: 'POST',
      headers: orderHeaders,
      body: JSON.stringify({
        productId,
        orderId: order.orderId,
        txHash,
        network: net,
        walletAddress: currentAccount
      })
    });

    const verification = await verifyRes.json();
    if (!verifyRes.ok || !verification || !verification.success) {
      throw new Error((verification && (verification.message || verification.error)) || 'Payment verification pending. Please refresh in a moment.');
    }

    return {
      success: true,
      txHash,
      orderId: order.orderId,
      tier: verification.tier,
      explorerUrl: `${targetConfig.blockExplorerUrls[0]}/tx/${txHash}`
    };
  }

  /**
   * Requests an AI Proof-of-Competence attestation for exam results
   */
  async function requestAiAttestation(examResult, options = {}) {
    const {
      examCode = '220-1201',
      scaledScore = 800,
      passed = true,
      localLedgerHash = '0000000000000000'
    } = examResult;

    if (!currentAccount) {
      await connectWallet(options.network || activeNetwork);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (options.idToken) headers['Authorization'] = 'Bearer ' + options.idToken;

    const res = await fetch('/api/v1/oracle/attest', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        examCode,
        scaledScore,
        passed,
        localLedgerHash,
        chain: 'xdc',
        walletAddress: currentAccount
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error((data && (data.message || data.error)) || 'AI Oracle attestation rejected');
    }

    return data;
  }

  return {
    XDC_CONFIG,
    isWalletAvailable,
    connectWallet,
    getConnectedAccount,
    sendXdcPayment,
    requestAiAttestation
  };
});
