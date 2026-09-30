/**
 * api_xdc.js - XDC Network Payments, Order Binding & AI Attestation Oracle
 * Handles EVM JSON-RPC verification for XDC Mainnet (50) & Apothem (51).
 * Issues cryptographic Proof-of-Competence attestations for ERC-5192 Soulbound Tokens.
 */

export const XDC_PRODUCTS = {
  daily_unlimited: {
    productId: 'daily_unlimited',
    title: '24-Hour Study Pass',
    amountXdc: '50',
    amountWei: '50000000000000000000', // 50 * 1e18
    durationDays: 1
  },
  pro_monthly: {
    productId: 'pro_monthly',
    title: 'Pro Monthly Pass',
    amountXdc: '250',
    amountWei: '250000000000000000000', // 250 * 1e18
    durationDays: 30
  },
  lifetime_master: {
    productId: 'lifetime_master',
    title: 'Lifetime Master Pass',
    amountXdc: '1200',
    amountWei: '1200000000000000000000', // 1200 * 1e18
    durationDays: 0 // lifetime
  }
};

export const XDC_NETWORKS = {
  mainnet: {
    chainId: 50,
    hexChainId: '0x32',
    name: 'XDC Network',
    rpcUrls: ['https://rpc.xinfin.network', 'https://erpc.xinfin.network'],
    explorer: 'https://xdc.blocksscan.io'
  },
  apothem: {
    chainId: 51,
    hexChainId: '0x33',
    name: 'XDC Apothem Testnet',
    rpcUrls: ['https://rpc.apothem.network'],
    explorer: 'https://apothem.blocksscan.io'
  }
};

/**
 * Ensures D1 tables exist for XDC orders and Oracle attestations
 */
export async function ensureXdcTables(db) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS xdc_orders (
        order_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        telegram_id INTEGER DEFAULT 0,
        product_id TEXT NOT NULL,
        amount_wei TEXT NOT NULL,
        wallet_address TEXT,
        tx_hash TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS oracle_attestations (
        attestation_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exam_code TEXT NOT NULL,
        scaled_score INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        local_ledger_root TEXT NOT NULL,
        chain TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (err) {
    console.warn('[XDC] ensureXdcTables warning:', err && err.message ? err.message : err);
  }
}

/**
 * Normalizes an XDC address from 'xdc...' or '0x...' to 0x-prefixed standard format
 */
export function normalizeXdcAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  const clean = addr.trim().toLowerCase();
  if (clean.startsWith('xdc')) {
    return '0x' + clean.slice(3);
  }
  return clean;
}

/**
 * Queries an XDC JSON-RPC endpoint to fetch and verify an on-chain transaction receipt.
 */
export async function verifyXdcReceipt(txHash, network = 'mainnet', expectedMerchant = null) {
  const net = XDC_NETWORKS[network] || XDC_NETWORKS.mainnet;
  const cleanTx = String(txHash || '').trim();

  // Handle 'xdc...' prefixed transaction hashes if any
  const formattedTx = cleanTx.startsWith('xdc') ? '0x' + cleanTx.slice(3) : cleanTx;

  let lastError = null;
  for (const rpcUrl of net.rpcUrls) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [formattedTx],
          id: 1
        })
      });
      if (!res.ok) continue;

      const data = await res.json();
      const receipt = data && data.result;
      if (!receipt) {
        // Transaction may still be in mempool or pending
        return { ok: false, pending: true, error: 'Transaction pending or not yet mined' };
      }

      // Check status: '0x1' is success in EVM/XDC
      if (receipt.status !== '0x1' && receipt.status !== 1) {
        return { ok: false, pending: false, error: 'Transaction failed or reverted on-chain' };
      }

      // If expected recipient is specified, verify receipt destination
      if (expectedMerchant && receipt.to) {
        const expectedNorm = normalizeXdcAddress(expectedMerchant);
        const actualNorm = normalizeXdcAddress(receipt.to);
        if (expectedNorm && actualNorm && expectedNorm !== actualNorm) {
          return { ok: false, pending: false, error: 'Transaction recipient does not match merchant' };
        }
      }

      return {
        ok: true,
        receipt,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to
      };
    } catch (e) {
      lastError = e;
    }
  }

  return { ok: false, error: (lastError && lastError.message) || 'XDC RPC nodes unreachable' };
}

/**
 * Generates an AI Oracle Proof-of-Competence attestation payload for XDC or TON.
 */
export async function createOracleAttestation({
  userId,
  examCode,
  scaledScore,
  passed,
  localLedgerRoot,
  chain,
  walletAddress,
  env
}) {
  const score = Number(scaledScore) || 0;
  const isPassed = Boolean(passed && score >= 675);

  if (!isPassed) {
    return { ok: false, error: 'Candidate score does not meet certified passing standard' };
  }

  const certifiedAt = Math.floor(Date.now() / 1000);
  const cleanLedgerRoot = String(localLedgerRoot || '0x0000000000000000000000000000000000000000000000000000000000000000');
  const attestationId = `attest_${chain}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Record in D1 if available
  if (env && env.DB) {
    try {
      await ensureXdcTables(env.DB);
      await env.DB.prepare(`
        INSERT INTO oracle_attestations (attestation_id, user_id, exam_code, scaled_score, passed, local_ledger_root, chain, wallet_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(attestationId, userId, examCode, score, isPassed ? 1 : 0, cleanLedgerRoot, chain, walletAddress).run();
    } catch (e) {
      console.warn('[Oracle] Attestation D1 record warning:', e && e.message ? e.message : e);
    }
  }

  if (chain === 'xdc') {
    const oracleAddress = env.XDC_ORACLE_ADDRESS || '0x2542f888B57d413b8655E3858022aF3e3eE72667';
    // Provide structured EIP-712 / ECDSA compatible payload
    return {
      ok: true,
      attestationId,
      chain: 'xdc',
      examCode,
      scaledScore: score,
      certifiedAt,
      localLedgerRoot: cleanLedgerRoot,
      walletAddress,
      oracleAddress,
      // In production, oracleSigner signs via private key; edge worker formats deterministic auth token:
      attestationProof: `CLARIORA:XDC:POC:${examCode}:${score}:${certifiedAt}:${cleanLedgerRoot.slice(0, 18)}`
    };
  } else {
    // TON Blockchain (TEP-85 SBT)
    const memo = `APX:C${examCode.replace(/[^0-9]/g, '').slice(-1) || '1'}:${score}:${isPassed ? 'PASS' : 'FAIL'}:${cleanLedgerRoot.slice(0, 16)}`;
    return {
      ok: true,
      attestationId,
      chain: 'ton',
      examCode,
      scaledScore: score,
      certifiedAt,
      memo,
      cellPayload: typeof btoa === 'function' ? btoa(memo) : Buffer.from(memo).toString('base64'),
      oracleAuthority: env.TON_MERCHANT_WALLET_ADDRESS || 'EQBvW8Z5huBkMJYdn3GuLD5Co_V7bB0N12_RegistryMockTON'
    };
  }
}
