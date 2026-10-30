/**
 * LOCAL SANDBOX ONLY: print disposable public addresses.
 * Private keys are generated in memory and never written to disk.
 */
import { createDisposablePublicWallets } from '../src/wallets.js';

async function main(): Promise<void> {
  const count = Number.parseInt(process.argv[2] ?? '3', 10);
  if (!Number.isFinite(count) || count < 1 || count > 20) {
    console.error('Usage: npm run sandbox:wallets [count 1-20]');
    process.exit(1);
  }

  console.log('LOCAL SANDBOX ONLY - disposable public addresses (no private keys):');
  const wallets = createDisposablePublicWallets(count);
  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    console.log(`[${i}] ${w.address}`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
