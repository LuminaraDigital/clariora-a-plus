# LOCAL SANDBOX ONLY - TON Jetton

**LOCAL SANDBOX ONLY.** This package is not for the production learner app.

- Emulates a fixed-supply Jetton with `@ton/sandbox` (`Blockchain.create()` only).
- Never connects to mainnet or testnet. No `TonClient` network calls.
- Disposable wallets use `keyPairFromSeed(randomBytes(32))` / `Blockchain.treasury`.
- Never reads Tonkeeper seeds, `.env` private keys, or remote endpoints.
- APX soft currency in the learner app stays separate from this Jetton.

## What it does

1. Deploys a Jetton minter (precompiled TEP-74 bytecode via `@ton-community/assets-sdk` wrappers; Path A, no Tact compile).
2. Mints a fixed supply once.
3. Revokes admin mint (`addr_none`) so further minting fails (exit code 73).
4. Tests transfers, TEP-64 on-chain metadata, and admin permission checks.

Note: this reference Jetton bytecode may still report `mintable=true` after revoke; the authoritative lock is `adminAddress === null` plus failed mint transactions.

## Setup

```bash
cd ton/sandbox
npm install
```

## Run tests

```bash
npm test
```

## Print disposable public addresses

Private keys stay in memory and are never written to disk.

```bash
npm run sandbox:wallets
npm run sandbox:wallets -- 5
```

## Layout

```
ton/sandbox/
  package.json          # nested package (same pattern as bot/)
  src/jetton/           # TEP-64 helpers + fixed-supply minter wrapper
  src/wallets.ts        # disposable keypairs (public addresses only)
  scripts/sandbox-wallets.ts
  tests/jetton.spec.ts
```

## Safety

Do not copy scripts from here into production deploy pipelines. Do not fund these addresses on mainnet. Learner-facing APX balance is app soft currency and is not this Jetton.
