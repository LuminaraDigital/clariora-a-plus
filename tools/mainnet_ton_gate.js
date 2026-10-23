#!/usr/bin/env node
/**
 * Mainnet TON pay + SBT gate. Refuses to proceed without explicit confirm + fresh wallet.
 * Never prints mnemonics. Exit 0 only when all gates pass (still does not spend).
 */
'use strict';

const gates = {
  explicitConfirm: process.env.CLARIORA_MAINNET_CONFIRM === 'I_CONFIRM_MAINNET_TON',
  freshMerchantAddress: Boolean(process.env.TON_MAINNET_MERCHANT_WALLET_ADDRESS),
  freshMerchantNotTestnetReuse:
    process.env.TON_MAINNET_MERCHANT_WALLET_ADDRESS !==
    'EQBWc5GBhGYm5d-xKTQ7bVEOgFlBFiYY_pJmhB9rFo3cMOak',
  sbtCollectionReady: Boolean(process.env.TON_MAINNET_SBT_COLLECTION_ADDRESS),
  noChatMnemonic: !process.env.TON_DEPLOYER_MNEMONIC && !process.env.TON_ORACLE_MNEMONIC
    ? true
    : process.env.CLARIORA_ALLOW_ENV_MNEMONIC === '1'
};

const failed = Object.entries(gates).filter(([, ok]) => !ok).map(([k]) => k);
const report = {
  status: failed.length ? 'MAINNET_NO_GO' : 'MAINNET_GATES_PASS',
  gates,
  failed,
  next: failed.length
    ? 'Generate a new mainnet merchant offline, fund it, set CF production secrets, set CLARIORA_MAINNET_CONFIRM=I_CONFIRM_MAINNET_TON, then redeploy production.'
    : 'Gates clear. Run production deploy scripts manually with secrets from a secure store (never paste mnemonics into chat).'
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 2 : 0);
