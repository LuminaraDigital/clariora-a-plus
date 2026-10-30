/**
 * Process pending ton_sbt_mints by sending MintMasterySBT from the oracle wallet.
 * Usage (local ops, staging):
 *   TONCENTER_API_KEY=... npx tsx scripts/mint-oracle.ts --recipient EQ... --exam 220-1201 --score 800 --ledger 0xabc
 *
 * For D1 queue drain, pass --mint-id and fields explicitly (Worker stores queue; this script signs).
 */
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell, toNano, TonClient, WalletContractV4, internal } from '@ton/ton';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClarioraMasterySBTCollection } from '../build/ClarioraMasterySBT_ClarioraMasterySBTCollection';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

function arg(name: string, fallback = '') {
  const idx = process.argv.indexOf('--' + name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function loadOracle() {
  if (process.env.TON_ORACLE_MNEMONIC || process.env.TON_DEPLOYER_MNEMONIC) {
    const mnemonic = String(process.env.TON_ORACLE_MNEMONIC || process.env.TON_DEPLOYER_MNEMONIC)
      .trim()
      .split(/\s+/);
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    return { keyPair, wallet };
  }
  const secretsPath = path.join(repoRoot, '.secrets', 'ton_testnet_deployer.json');
  const raw = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  const keyPair = await mnemonicToPrivateKey(raw.mnemonic);
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  return { keyPair, wallet };
}

function collectionAddress(): string {
  const fromArg = arg('collection');
  if (fromArg) return fromArg;
  const deployed = path.join(repoRoot, '.secrets', 'ton_sbt_testnet.json');
  if (fs.existsSync(deployed)) {
    const j = JSON.parse(fs.readFileSync(deployed, 'utf8'));
    if (j.collectionAddress) return j.collectionAddress;
  }
  throw new Error('Pass --collection or deploy first (.secrets/ton_sbt_testnet.json)');
}

function ledgerToUint256(hexOrNum: string): bigint {
  const s = String(hexOrNum || '0').trim();
  if (s.startsWith('0x') || s.startsWith('0X')) return BigInt(s);
  // Hash-like strings: take first 32 hex chars if present, else numeric
  const hex = s.replace(/[^0-9a-fA-F]/g, '').slice(0, 64);
  if (hex.length >= 8) return BigInt('0x' + hex);
  return BigInt(Number(s) || 0);
}

async function main() {
  const recipient = arg('recipient');
  const exam = arg('exam', '220-1201');
  const score = BigInt(arg('score', '800'));
  const ledger = ledgerToUint256(arg('ledger', '0x1'));
  if (!recipient) throw new Error('--recipient required');

  const oracle = await loadOracle();
  const client = new TonClient({
    endpoint: process.env.TONCENTER_API_KEY
      ? `https://testnet.toncenter.com/api/v2/jsonRPC?api_key=${encodeURIComponent(process.env.TONCENTER_API_KEY)}`
      : 'https://testnet.toncenter.com/api/v2/jsonRPC'
  });
  const opened = client.open(oracle.wallet);
  const collection = ClarioraMasterySBTCollection.fromAddress(Address.parse(collectionAddress()));
  const openedCollection = client.open(collection);

  const seqno = await opened.getSeqno();
  await openedCollection.send(
    opened.sender(oracle.keyPair.secretKey),
    { value: toNano('0.12') },
    {
      $$type: 'MintMasterySBT',
      queryId: BigInt(Date.now() % 1e12),
      recipient: Address.parse(recipient),
      examCode: exam,
      scaledScore: score,
      ledgerHash: ledger,
      metadataUri: `https://clariora.com.au/ton/sbt/${exam}/${recipient.slice(0, 8)}.json`
    }
  );

  console.log(JSON.stringify({
    status: 'MINT_SUBMITTED',
    recipient,
    exam,
    score: score.toString(),
    collection: collectionAddress(),
    oracle: oracle.wallet.address.toString({ bounceable: true, testOnly: true }),
    prevSeqno: seqno
  }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'ERROR', message: String(err && err.message ? err.message : err) }));
  process.exit(1);
});
