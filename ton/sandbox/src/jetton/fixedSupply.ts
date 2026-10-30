/**
 * Fixed-supply Jetton helpers for the local @ton/sandbox emulator.
 * Mint once, then revoke admin (addr_none) so further minting fails.
 *
 * Uses precompiled Jetton bytecode from @ton-community/assets-sdk wrappers.
 * No TonClient, mainnet, or testnet calls.
 */
import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Sender,
  StateInit,
  toNano,
} from '@ton/core';
import {
  JettonMinter,
  JettonWallet,
  JETTON_CHANGE_ADMIN_OPCODE,
} from '@ton-community/assets-sdk';
import { buildOnchainJettonContent, JettonOnchainMetadata } from './tep64.js';

export const SANDBOX_JETTON_META: JettonOnchainMetadata = {
  name: 'Clariora Sandbox Jetton',
  symbol: 'CSJ',
  description: 'LOCAL SANDBOX ONLY fixed-supply Jetton. Not for production.',
  decimals: '9',
};

export function createSandboxJettonContent(
  meta: JettonOnchainMetadata = SANDBOX_JETTON_META,
): Cell {
  return buildOnchainJettonContent(meta);
}

export function buildRevokeMintAdminBody(queryId: bigint = 0n): Cell {
  return beginCell()
    .storeUint(JETTON_CHANGE_ADMIN_OPCODE, 32)
    .storeUint(queryId, 64)
    .storeAddress(null)
    .endCell();
}

/**
 * Thin Contract wrapper so openContract injects provider into sendRevokeMintAdmin.
 * Delegates mint / getters to assets-sdk JettonMinter.
 */
export class FixedSupplyJettonMinter implements Contract {
  readonly address: Address;
  readonly init?: StateInit;
  private readonly inner: JettonMinter;

  private constructor(inner: JettonMinter) {
    this.inner = inner;
    this.address = inner.address;
    this.init = inner.init;
  }

  static createFromConfig(admin: Address, content?: Cell): FixedSupplyJettonMinter {
    const inner = JettonMinter.createFromConfig({
      admin,
      content: content ?? createSandboxJettonContent(),
    });
    return new FixedSupplyJettonMinter(inner);
  }

  static createFromAddress(address: Address): FixedSupplyJettonMinter {
    return new FixedSupplyJettonMinter(JettonMinter.createFromAddress(address));
  }

  sendDeploy(provider: ContractProvider, via: Sender, value?: bigint) {
    return this.inner.sendDeploy(provider, via, value);
  }

  sendMint(
    provider: ContractProvider,
    via: Sender,
    recipient: Address,
    amount: bigint,
    options?: { value?: bigint; queryId?: bigint },
  ) {
    return this.inner.sendMint(provider, via, recipient, amount, options);
  }

  /**
   * Fixed-supply step: set admin to addr_none so mint authority is permanently revoked
   * in this sandbox (until a new contract is deployed). Prefer the SDK helper so the
   * cell layout stays aligned with the precompiled minter.
   */
  async sendRevokeMintAdmin(
    provider: ContractProvider,
    via: Sender,
    options?: { value?: bigint; queryId?: bigint },
  ): Promise<void> {
    if (typeof (this.inner as { sendChangeAdmin?: Function }).sendChangeAdmin === 'function') {
      await (this.inner as any).sendChangeAdmin(provider, via, null, options);
      return;
    }
    await provider.internal(via, {
      value: options?.value ?? toNano('0.05'),
      bounce: true,
      body: buildRevokeMintAdminBody(options?.queryId ?? 0n),
    });
  }

  getData(provider: ContractProvider) {
    return this.inner.getData(provider);
  }

  getWalletAddress(provider: ContractProvider, owner: Address) {
    return this.inner.getWalletAddress(provider, owner);
  }

  getWallet(provider: ContractProvider, owner: Address) {
    return this.inner.getWallet(provider, owner);
  }
}

export { JettonMinter, JettonWallet };
