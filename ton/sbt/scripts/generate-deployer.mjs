/**
 * Create a gitignored testnet deployer wallet for ClarioraMasterySBT.
 * Never prints the mnemonic. Writes .secrets/ton_testnet_deployer.json (repo-root).
 */
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const secretsDir = path.join(root, '.secrets');
const outPath = path.join(secretsDir, 'ton_testnet_deployer.json');

fs.mkdirSync(secretsDir, { recursive: true });

if (fs.existsSync(outPath) && !process.argv.includes('--force')) {
  const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  console.log(JSON.stringify({
    status: 'exists',
    address: existing.address,
    network: existing.network,
    path: outPath
  }, null, 2));
  process.exit(0);
}

const mnemonic = await mnemonicNew(24);
const keyPair = await mnemonicToPrivateKey(mnemonic);
const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
const address = wallet.address.toString({ bounceable: true, testOnly: true });

const record = {
  network: 'testnet',
  createdAt: new Date().toISOString(),
  address,
  workchain: 0,
  walletVersion: 'v4r2',
  mnemonic
};

fs.writeFileSync(outPath, JSON.stringify(record, null, 2), { mode: 0o600 });
try {
  fs.chmodSync(outPath, 0o600);
} catch (_) {}

console.log(JSON.stringify({
  status: 'created',
  address,
  network: 'testnet',
  path: outPath,
  note: 'Mnemonic written to gitignored .secrets only. Fund this address with testnet TON, then run deploy-testnet.mjs'
}, null, 2));
