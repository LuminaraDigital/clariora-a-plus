/**
 * Disposable sandbox wallets. Never reads Tonkeeper seeds, .env keys, or network endpoints.
 */
import { randomBytes } from 'node:crypto';
import { keyPairFromSeed, KeyPair } from '@ton/crypto';
import { Address, WalletContractV4 } from '@ton/ton';

export type DisposableWallet = {
  /** Human-readable bounceable test-only address string */
  address: string;
  workchain: number;
  publicKeyHex: string;
};

/**
 * Create an ephemeral keypair via keyPairFromSeed(randomBytes(32)).
 * Private key stays in memory only; never written to disk.
 */
export function createDisposableKeyPair(): KeyPair {
  return keyPairFromSeed(randomBytes(32));
}

/**
 * Derive a WalletContractV4 address from a disposable keypair (public address only).
 */
export function walletAddressFromKeyPair(
  keyPair: KeyPair,
  workchain: number = 0,
): Address {
  const wallet = WalletContractV4.create({
    workchain,
    publicKey: keyPair.publicKey,
  });
  return wallet.address;
}

/**
 * Print-ready public addresses for N disposable wallets.
 * Does not return or persist private keys.
 */
export function createDisposablePublicWallets(
  count: number = 3,
): DisposableWallet[] {
  const out: DisposableWallet[] = [];
  for (let i = 0; i < count; i++) {
    const kp = createDisposableKeyPair();
    const address = walletAddressFromKeyPair(kp);
    out.push({
      address: address.toString({ bounceable: true, urlSafe: true }),
      workchain: address.workChain,
      publicKeyHex: kp.publicKey.toString('hex'),
    });
  }
  return out;
}
