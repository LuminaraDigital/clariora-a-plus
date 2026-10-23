/**
 * LOCAL SANDBOX ONLY Jetton tests.
 * Blockchain.create() only. No TonClient / mainnet / testnet.
 */
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import {
  findTransaction,
  findTransactionRequired,
} from '@ton/test-utils';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FixedSupplyJettonMinter,
  JettonWallet,
  SANDBOX_JETTON_META,
  createSandboxJettonContent,
} from '../src/jetton/fixedSupply.js';
import { parseOnchainJettonContent } from '../src/jetton/tep64.js';
import { createDisposableKeyPair, walletAddressFromKeyPair } from '../src/wallets.js';

describe('Fixed-supply Jetton (local sandbox)', () => {
  let blockchain: Blockchain;
  let admin: SandboxContract<TreasuryContract>;
  let alice: SandboxContract<TreasuryContract>;
  let bob: SandboxContract<TreasuryContract>;
  let minter: SandboxContract<FixedSupplyJettonMinter>;

  const FIXED_SUPPLY = toNano('1000000');

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    admin = await blockchain.treasury('admin');
    alice = await blockchain.treasury('alice');
    bob = await blockchain.treasury('bob');

    minter = blockchain.openContract(
      FixedSupplyJettonMinter.createFromConfig(
        admin.address,
        createSandboxJettonContent(SANDBOX_JETTON_META),
      ),
    );

    const deployResult = await minter.sendDeploy(admin.getSender(), toNano('0.1'));
    findTransactionRequired(deployResult.transactions, {
      from: admin.address,
      to: minter.address,
      deploy: true,
      success: true,
    });

    const mintResult = await minter.sendMint(
      admin.getSender(),
      alice.address,
      FIXED_SUPPLY,
      { value: toNano('0.1') },
    );
    findTransactionRequired(mintResult.transactions, {
      from: admin.address,
      to: minter.address,
      success: true,
    });

    const revokeResult = await minter.sendRevokeMintAdmin(admin.getSender());
    findTransactionRequired(revokeResult.transactions, {
      from: admin.address,
      to: minter.address,
      success: true,
    });
  });

  it('exposes TEP-64 on-chain metadata (name, symbol, decimals)', async () => {
    const data = await minter.getData();
    const meta = parseOnchainJettonContent(data.jettonContent);

    expect(meta.type).toBe('onchain');
    expect(meta.name).toBe(SANDBOX_JETTON_META.name);
    expect(meta.symbol).toBe(SANDBOX_JETTON_META.symbol);
    expect(meta.decimals).toBe(SANDBOX_JETTON_META.decimals);
    expect(meta.description).toBe(SANDBOX_JETTON_META.description);
  });

  it('reports fixed supply and null admin after revoke', async () => {
    const data = await minter.getData();
    expect(data.totalSupply).toBe(FIXED_SUPPLY);
    // Reference Jetton bytecode keeps mintable=-1; revoke is admin=addr_none.
    expect(data.adminAddress).toBeNull();
  });

  it('transfers jettons between wallets', async () => {
    const aliceWallet = blockchain.openContract(
      JettonWallet.createFromAddress(await minter.getWalletAddress(alice.address)),
    );
    const bobWalletAddr = await minter.getWalletAddress(bob.address);
    const transferAmount = toNano('42');

    const beforeAlice = (await aliceWallet.getData()).balance;
    expect(beforeAlice).toBe(FIXED_SUPPLY);

    const transferResult = await aliceWallet.send(
      alice.getSender(),
      bob.address,
      transferAmount,
      { value: toNano('0.1') },
    );

    findTransactionRequired(transferResult.transactions, {
      from: alice.address,
      to: aliceWallet.address,
      success: true,
    });
    findTransactionRequired(transferResult.transactions, {
      from: aliceWallet.address,
      to: bobWalletAddr,
      success: true,
    });

    const bobWallet = blockchain.openContract(JettonWallet.createFromAddress(bobWalletAddr));
    expect((await aliceWallet.getData()).balance).toBe(FIXED_SUPPLY - transferAmount);
    expect((await bobWallet.getData()).balance).toBe(transferAmount);
  });

  it('rejects mint from non-admin before revoke (fresh minter)', async () => {
    const fresh = blockchain.openContract(
      FixedSupplyJettonMinter.createFromConfig(
        admin.address,
        createSandboxJettonContent({
          name: 'Temp',
          symbol: 'TMP',
          decimals: '9',
        }),
      ),
    );
    await fresh.sendDeploy(admin.getSender(), toNano('0.1'));

    const nonAdminMint = await fresh.sendMint(
      alice.getSender(),
      alice.address,
      toNano('1'),
      { value: toNano('0.1') },
    );

    findTransactionRequired(nonAdminMint.transactions, {
      from: alice.address,
      to: fresh.address,
      success: false,
    });

    const data = await fresh.getData();
    expect(data.totalSupply).toBe(0n);
    expect(data.mintable).toBe(true);
    expect(data.adminAddress?.equals(admin.address)).toBe(true);
  });

  it('rejects mint after admin revoke (fixed supply)', async () => {
    const dataBefore = await minter.getData();
    expect(dataBefore.adminAddress).toBeNull();

    const postRevokeMint = await minter.sendMint(
      admin.getSender(),
      bob.address,
      toNano('1'),
      { value: toNano('0.1') },
    );

    const failed = findTransactionRequired(postRevokeMint.transactions, {
      from: admin.address,
      to: minter.address,
      success: false,
    });
    expect(failed.description.type).toBe('generic');
    if (failed.description.type === 'generic') {
      const phase = failed.description.computePhase;
      expect(phase.type).toBe('vm');
      if (phase.type === 'vm') {
        // Standard jetton: mint with null admin exits 73
        expect(phase.exitCode).toBe(73);
      }
    }

    const dataAfter = await minter.getData();
    expect(dataAfter.totalSupply).toBe(FIXED_SUPPLY);
    expect(dataAfter.adminAddress).toBeNull();

    expect(
      findTransaction(postRevokeMint.transactions, {
        from: admin.address,
        to: minter.address,
        success: true,
      }),
    ).toBeUndefined();
  });

  it('creates disposable wallets via keyPairFromSeed(randomBytes(32))', () => {
    const kp = createDisposableKeyPair();
    const addr = walletAddressFromKeyPair(kp);
    expect(addr.toString().length).toBeGreaterThan(10);
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(64);
  });
});
