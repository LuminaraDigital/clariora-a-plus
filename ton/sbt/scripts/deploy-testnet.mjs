/**
 * Deploy ClarioraMasterySBTCollection to TON testnet.
 * Reads mnemonic from repo-root .secrets/ton_testnet_deployer.json (never logs it).
 * Optional: TON_DEPLOYER_MNEMONIC env overrides file.
 */
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, toNano, TonClient, WalletContractV4, internal } from '@ton/ton';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sbtRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');
const secretsPath = path.join(repoRoot, '.secrets', 'ton_testnet_deployer.json');
const outPath = path.join(repoRoot, '.secrets', 'ton_sbt_testnet.json');

async function loadDeployer() {
  if (process.env.TON_DEPLOYER_MNEMONIC) {
    const mnemonic = String(process.env.TON_DEPLOYER_MNEMONIC).trim().split(/\s+/);
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    return {
      mnemonic,
      keyPair,
      wallet,
      address: wallet.address.toString({ bounceable: true, testOnly: true }),
      source: 'env'
    };
  }
  if (!fs.existsSync(secretsPath)) {
    throw new Error('Missing deployer secrets. Run: node scripts/generate-deployer.mjs');
  }
  const raw = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  const mnemonic = raw.mnemonic;
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return {
    mnemonic,
    keyPair,
    wallet,
    address: wallet.address.toString({ bounceable: true, testOnly: true }),
    source: 'file'
  };
}

function toncenterEndpoint() {
  const key = process.env.TONCENTER_API_KEY || '';
  const base = 'https://testnet.toncenter.com/api/v2/jsonRPC';
  return key ? `${base}?api_key=${encodeURIComponent(key)}` : base;
}

async function main() {
  const bindingsUrl = pathToFileURL(
    path.join(sbtRoot, 'build', 'ClarioraMasterySBT_ClarioraMasterySBTCollection.ts')
  ).href;
  // Compiled bindings are TypeScript; load via dynamic import after tsx, or use boc+abi path.
  // Prefer prebuilt init via compiled .ts executed under tsx. This .mjs expects build/*.js
  // so we call the TS binding through a child approach: import from built pkg.
  const { ClarioraMasterySBTCollection } = await import(
    pathToFileURL(path.join(sbtRoot, 'build', 'ClarioraMasterySBT_ClarioraMasterySBTCollection.ts')).href
  ).catch(() => ({ ClarioraMasterySBTCollection: null }));

  if (!ClarioraMasterySBTCollection) {
    throw new Error('Run deploy via: npx tsx scripts/deploy-testnet.ts');
  }

  const deployer = await loadDeployer();
  const client = new TonClient({ endpoint: toncenterEndpoint() });
  const opened = client.open(deployer.wallet);
  const balance = await opened.getBalance();
  const min = toNano('0.25');
  if (balance < min) {
    console.log(JSON.stringify({
      status: 'NEED_FUNDS',
      address: deployer.address,
      balanceNanotons: balance.toString(),
      needNanotons: min.toString(),
      faucet: 'https://t.me/testgiver_ton_bot',
      merchantCanFund: 'EQBWc5GBhGYm5d-xKTQ7bVEOgFlBFiYY_pJmhB9rFo3cMOak'
    }, null, 2));
    process.exit(2);
  }

  const content = beginCell().storeUint(0, 8).storeStringTail('https://clariora.com.au/ton/sbt/collection.json').endCell();
  const owner = deployer.wallet.address;
  const oracle = deployer.wallet.address;
  const collection = await ClarioraMasterySBTCollection.fromInit(owner, oracle, content);
  const collectionAddress = collection.address.toString({ bounceable: true, testOnly: true });

  const seqno = await opened.getSeqno();
  await opened.sendTransfer({
    seqno,
    secretKey: deployer.keyPair.secretKey,
    messages: [
      internal({
        to: collection.address,
        value: toNano('0.15'),
        init: collection.init,
        body: beginCell()
          .storeUint(0x88dd6c7, 32) // Deploy opcode from bindings (2490013878 -> check)
          .storeUint(0, 64)
          .endCell(),
        bounce: false
      })
    ]
  });

  const record = {
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    collectionAddress,
    ownerAddress: deployer.address,
    oracleAddress: deployer.address,
    deployerSource: deployer.source,
    explorer: `https://testnet.tonscan.org/address/${collectionAddress}`
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));

  console.log(JSON.stringify({ status: 'DEPLOY_SUBMITTED', ...record }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'ERROR', message: String(err && err.message ? err.message : err) }));
  process.exit(1);
});
