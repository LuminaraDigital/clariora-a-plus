/**
 * Deploy ClarioraMasterySBTCollection to TON testnet.
 * Secrets: env TON_DEPLOYER_MNEMONIC or repo-root .secrets/ton_testnet_deployer.json
 * Never logs the mnemonic.
 * Uses TonAPI for reads/sends when TonCenter is rate-limited.
 */
import { mnemonicToPrivateKey } from '@ton/crypto';
import {
  Address,
  beginCell,
  Cell,
  external,
  internal,
  storeMessage,
  toNano,
  WalletContractV4
} from '@ton/ton';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClarioraMasterySBTCollection } from '../build/ClarioraMasterySBT_ClarioraMasterySBTCollection';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const secretsPath = path.join(repoRoot, '.secrets', 'ton_testnet_deployer.json');
const outPath = path.join(repoRoot, '.secrets', 'ton_sbt_testnet.json');
const TONAPI = 'https://testnet.tonapi.io';

async function loadDeployer() {
  let mnemonic: string[];
  let source: string;
  if (process.env.TON_DEPLOYER_MNEMONIC) {
    mnemonic = String(process.env.TON_DEPLOYER_MNEMONIC).trim().split(/\s+/);
    source = 'env';
  } else {
    if (!fs.existsSync(secretsPath)) {
      throw new Error('Missing deployer secrets. Run: node scripts/generate-deployer.mjs');
    }
    const raw = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
    mnemonic = raw.mnemonic;
    source = 'file';
  }
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return {
    keyPair,
    wallet,
    address: wallet.address.toString({ bounceable: true, testOnly: true }),
    source
  };
}

async function tonapiGet(pathSuffix: string) {
  const res = await fetch(TONAPI + pathSuffix, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TonAPI GET ${pathSuffix} -> ${res.status} ${text.slice(0, 160)}`);
  }
  return res.json();
}

async function tonapiPost(pathSuffix: string, body: unknown) {
  const res = await fetch(TONAPI + pathSuffix, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TonAPI POST ${pathSuffix} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function getBalanceNano(addr: string): Promise<bigint> {
  const data = await tonapiGet('/v2/blockchain/accounts/' + encodeURIComponent(addr));
  return BigInt(data.balance || 0);
}

async function getAccountStatus(addr: string): Promise<string> {
  const data = await tonapiGet('/v2/blockchain/accounts/' + encodeURIComponent(addr));
  return String(data.status || 'unknown');
}

async function getSeqno(addr: string): Promise<number> {
  try {
    const data = await tonapiGet('/v2/wallet/' + encodeURIComponent(addr) + '/seqno');
    if (typeof data.seqno === 'number') return data.seqno;
  } catch (_) {}
  // Uninitialized wallets start at seqno 0
  const status = await getAccountStatus(addr);
  if (status === 'nonexist' || status === 'uninit') return 0;
  throw new Error('Could not resolve wallet seqno');
}

async function sendBoc(bocBase64: string) {
  return tonapiPost('/v2/blockchain/message', { boc: bocBase64 });
}

async function main() {
  const deployer = await loadDeployer();
  const min = toNano('0.25');
  const balance = await getBalanceNano(deployer.address);
  if (balance < min) {
    console.log(JSON.stringify({
      status: 'NEED_FUNDS',
      address: deployer.address,
      balanceNanotons: balance.toString(),
      needNanotons: min.toString(),
      faucet: 'https://t.me/testgiver_ton_bot',
      hint: 'Send >= 0.5 testnet TON to the address above, then re-run deploy-testnet.ts'
    }, null, 2));
    process.exit(2);
  }

  const content = beginCell()
    .storeUint(0, 8)
    .storeStringTail('https://clariora.com.au/ton/sbt/collection.json')
    .endCell();
  const owner = deployer.wallet.address;
  const oracle = deployer.wallet.address;
  const collection = await ClarioraMasterySBTCollection.fromInit(owner, oracle, content);
  const collectionAddress = collection.address.toString({ bounceable: true, testOnly: true });

  try {
    const status = await getAccountStatus(collectionAddress);
    if (status === 'active') {
      const record = {
        network: 'testnet',
        deployedAt: new Date().toISOString(),
        collectionAddress,
        ownerAddress: deployer.address,
        oracleAddress: deployer.address,
        deployerSource: deployer.source,
        alreadyDeployed: true,
        explorer: `https://testnet.tonscan.org/address/${collectionAddress}`
      };
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      console.log(JSON.stringify({ status: 'ALREADY_DEPLOYED', ...record }, null, 2));
      return;
    }
  } catch (_) {}

  const seqno = await getSeqno(deployer.address);
  const transfer = deployer.wallet.createTransfer({
    seqno,
    secretKey: deployer.keyPair.secretKey,
    messages: [
      internal({
        to: collection.address,
        value: toNano('0.15'),
        init: collection.init,
        body: beginCell()
          .storeUint(ClarioraMasterySBTCollection.opcodes.Deploy, 32)
          .storeUint(0n, 64)
          .endCell(),
        bounce: false
      })
    ]
  });

  const ext = external({
    to: deployer.wallet.address,
    init: seqno === 0 ? deployer.wallet.init : undefined,
    body: transfer
  });
  const boc = beginCell().store(storeMessage(ext)).endCell().toBoc().toString('base64');
  await sendBoc(boc);

  let active = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const status = await getAccountStatus(collectionAddress);
      if (status === 'active') {
        active = true;
        break;
      }
    } catch (_) {}
  }

  const record = {
    network: 'testnet',
    deployedAt: new Date().toISOString(),
    collectionAddress,
    ownerAddress: deployer.address,
    oracleAddress: deployer.address,
    deployerSource: deployer.source,
    active,
    explorer: `https://testnet.tonscan.org/address/${collectionAddress}`
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ status: active ? 'DEPLOYED' : 'DEPLOY_SUBMITTED', ...record }, null, 2));
  if (!active) process.exit(3);
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'ERROR', message: String(err && err.message ? err.message : err) }));
  process.exit(1);
});
