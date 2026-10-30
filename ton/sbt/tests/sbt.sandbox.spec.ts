/**
 * Local sandbox proof: deploy collection + mint one SBT item.
 * No network, no secrets.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, toNano } from '@ton/core';
import { ClarioraMasterySBTCollection } from '../build/ClarioraMasterySBT_ClarioraMasterySBTCollection';

describe('ClarioraMasterySBT sandbox', () => {
  let blockchain: Blockchain;
  let owner: SandboxContract<TreasuryContract>;
  let oracle: SandboxContract<TreasuryContract>;
  let learner: SandboxContract<TreasuryContract>;
  let collection: SandboxContract<ClarioraMasterySBTCollection>;

  beforeAll(async () => {
    blockchain = await Blockchain.create();
    owner = await blockchain.treasury('owner');
    oracle = await blockchain.treasury('oracle');
    learner = await blockchain.treasury('learner');
    const content = beginCell().storeUint(0, 8).storeStringTail('sandbox://collection').endCell();
    collection = blockchain.openContract(
      await ClarioraMasterySBTCollection.fromInit(owner.address, oracle.address, content)
    );
    await collection.send(
      owner.getSender(),
      { value: toNano('0.2') },
      { $$type: 'Deploy', queryId: 0n }
    );
  });

  it('deploys with oracle and empty index', async () => {
    const data = await collection.getGetCollectionData();
    expect(data.nextItemIndex).toBe(0n);
    expect(data.ownerAddress.equals(owner.address)).toBe(true);
    const ora = await collection.getGetOracleAddress();
    expect(ora.equals(oracle.address)).toBe(true);
  });

  it('mints from oracle and increments index', async () => {
    const res = await collection.send(
      oracle.getSender(),
      { value: toNano('0.2') },
      {
        $$type: 'MintMasterySBT',
        queryId: 1n,
        recipient: learner.address,
        examCode: '220-1201',
        scaledScore: 800n,
        ledgerHash: 0xabcdefn,
        metadataUri: 'sandbox://item/0'
      }
    );
    expect(res.transactions.length).toBeGreaterThan(0);
    const data = await collection.getGetCollectionData();
    expect(data.nextItemIndex).toBe(1n);
  });

  it('rejects mint from non-oracle', async () => {
    const res = await collection.send(
      learner.getSender(),
      { value: toNano('0.2') },
      {
        $$type: 'MintMasterySBT',
        queryId: 2n,
        recipient: learner.address,
        examCode: '220-1202',
        scaledScore: 700n,
        ledgerHash: 1n,
        metadataUri: 'sandbox://item/x'
      }
    );
    const exitCodes = res.transactions.map((t) => t.description?.type === 'generic' ? (t.description as any).computePhase?.exitCode : null);
    // Unauthorized mint custom error or aborted compute
    const rejected = res.transactions.some((t) => {
      const d: any = t.description;
      return d && d.type === 'generic' && d.computePhase && d.computePhase.exitCode && d.computePhase.exitCode !== 0;
    });
    expect(rejected || exitCodes.some((c) => c && c !== 0)).toBe(true);
  });
});
