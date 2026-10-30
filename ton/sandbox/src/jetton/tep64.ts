/**
 * TEP-64 on-chain Jetton content helpers (LOCAL SANDBOX ONLY).
 * Builds and parses the standard on-chain metadata dict (prefix 0x00).
 */
import { beginCell, Cell, Dictionary } from '@ton/core';
import { sha256_sync } from '@ton/crypto';

export type JettonOnchainMetadata = {
  name: string;
  symbol: string;
  description?: string;
  decimals?: string;
  image?: string;
};

function hashKey(key: string): Buffer {
  return sha256_sync(key);
}

function storeSnakeString(value: string): Cell {
  return beginCell().storeUint(0, 8).storeStringTail(value).endCell();
}

function loadSnakeString(cell: Cell): string {
  const s = cell.beginParse();
  const tag = s.loadUint(8);
  if (tag !== 0) {
    throw new Error(`Expected snake string tag 0, got ${tag}`);
  }
  return s.loadStringTail();
}

/**
 * Encode TEP-64 on-chain content: uint8(0x00) + dict(sha256(key) -> snake string cell).
 */
export function buildOnchainJettonContent(meta: JettonOnchainMetadata): Cell {
  const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());
  dict.set(hashKey('name'), storeSnakeString(meta.name));
  dict.set(hashKey('symbol'), storeSnakeString(meta.symbol));
  if (meta.description !== undefined) {
    dict.set(hashKey('description'), storeSnakeString(meta.description));
  }
  if (meta.decimals !== undefined) {
    dict.set(hashKey('decimals'), storeSnakeString(meta.decimals));
  }
  if (meta.image !== undefined) {
    dict.set(hashKey('image'), storeSnakeString(meta.image));
  }
  return beginCell().storeUint(0, 8).storeDict(dict).endCell();
}

/**
 * Parse TEP-64 on-chain content without any network / IPFS calls.
 */
export function parseOnchainJettonContent(content: Cell): Partial<JettonOnchainMetadata> & {
  type: 'onchain';
} {
  const ds = content.beginParse();
  const contentType = ds.loadUint(8);
  if (contentType !== 0) {
    throw new Error(`Expected on-chain content type 0x00, got 0x${contentType.toString(16)}`);
  }
  const dict = ds.loadDict(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());
  const out: Partial<JettonOnchainMetadata> & { type: 'onchain' } = { type: 'onchain' };

  const nameCell = dict.get(hashKey('name'));
  if (nameCell) out.name = loadSnakeString(nameCell);
  const symbolCell = dict.get(hashKey('symbol'));
  if (symbolCell) out.symbol = loadSnakeString(symbolCell);
  const descriptionCell = dict.get(hashKey('description'));
  if (descriptionCell) out.description = loadSnakeString(descriptionCell);
  const decimalsCell = dict.get(hashKey('decimals'));
  if (decimalsCell) out.decimals = loadSnakeString(decimalsCell);
  const imageCell = dict.get(hashKey('image'));
  if (imageCell) out.image = loadSnakeString(imageCell);

  return out;
}
