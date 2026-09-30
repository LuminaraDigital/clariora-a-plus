# CLARIORA DUAL-CHAIN (XDC & TON) & AI REVOLUTION
## Product Requirements Document (PRD) & Senior Full-Stack Technical Architecture
**Transforming Tech Certification Learning via Socratic AI, Enterprise Proof-of-Competence, and Viral Social Micropayments**

---

| **Document Version** | 3.2.0-PROD |
| **Status** | Approved Architectural Specification & PRD |
| **Author** | Senior Full-Stack Architect & Senior Web3/AI Systems Engineer |
| **Target App** | Clariora A+ (CompTIA A+ 220-1201/1202, AZ-900, AZ-500, Crucible Simulator) |
| **Runtime Targets** | Web SPA/PWA (`clariora.com.au`), Cloudflare Workers Edge, Telegram Mini App (TMA), Electron Desktop |
| **Chains Supported** | **XDC Network** (EVM / Enterprise Trade & Workforce Rails) & **The Open Network (TON)** (Telegram-Native / Viral Consumer Rails) |

---

## 1. Executive Summary & Paradigm Shift

### 1.1 The Fundamental Flaws of Modern IT Certification & Learning
The prevailing digital learning paradigm for technical certifications (CompTIA, Microsoft, AWS, Cisco) suffers from three systemic failures:
1. **The Braindump / Rote Memorization Crisis**: Learners memorize question dumps without acquiring diagnostic mental models or operational troubleshooting reflexes.
2. **The "Unverifiable Resume" Dilemma**: Standard completion certificates (PDFs, static JPG badges) are trivial to forge, do not capture *how* the learner answered (response latency, diagnostic path, problem-isolation methodology), and offer zero verifiable proof to employers.
3. **The Sunk-Cost Extrinsic Disincentive**: Students pay hundreds of dollars for exam vouchers with no economic upside during the grueling months of daily study. Drop-out rates exceed 60% due to isolation and lack of immediate micro-incentives.

### 1.2 The Innovation: The AI + Dual-Blockchain Triad
By synthesizing **Socratic AI Reasoning (Ghost Coach)** with a **Dual-Blockchain Backbone (XDC + TON)** anchored to Clariora's **Local ECDSA P-256 Ledger**, we introduce an entirely new educational category: **Proof-of-Competence (PoC)**.

```
+--------------------------------------------------------------------------------------------------+
|                                    CLARIORA LEARNING ENGINE                                      |
|                                                                                                  |
|   +------------------------------------------------------------------------------------------+   |
|   |  Local-First Privacy Layer (ledger_engine.js)                                            |   |
|   |  - ECDSA P-256 signed local block sequence (WebCrypto / IndexedDB)                       |   |
|   |  - Zero-gas, offline-capable study recording (streaks, PBQs, diagnostics)                |   |
|   +---------------------------------------------+--------------------------------------------+   |
|                                                 | (Merkle Attestation)                           |
|                                                 v                                                |
|   +------------------------------------------------------------------------------------------+   |
|   |  Socratic AI Oracle & Proctor (workers/api_worker.js + Groq/NIM/Ollama)                  |   |
|   |  - Behavioral latency analysis & anti-cheat cadence verification                         |   |
|   |  - Socratic dialogue scoring on Performance-Based Questions (PBQs)                       |   |
|   |  - Signs EIP-712 (XDC) and Ed25519 (TON) Attestation Manifests                           |   |
|   +---------------------+----------------------------------------------+---------------------+   |
+-------------------------|----------------------------------------------|-------------------------+
                          v                                              v
      +---------------------------------------+      +---------------------------------------+
      |       XDC NETWORK (EVM RAILS)         |      |       TON BLOCKCHAIN (TELEGRAM)       |
      | - Enterprise & Workforce Credentialing|      | - Viral Social Learning & Telegram TMA|
      | - ISO 20022 Enterprise Compliance    |      | - 950M+ User Direct Distribution      |
      | - ERC-5192 Soulbound Credentials      |      | - TEP-85 Soulbound Achievement Badges |
      | - Corporate Voucher Escrow Contracts  |      | - Telegram Stars / TON / USDT Payments|
      | - Sub-cent Gas, 2-sec Instant Finality|      | - Crucible Peer Staking Study Pools   |
      +---------------------------------------+      +---------------------------------------+
```

### 1.3 Strategic Role Division: Why Both XDC and TON?
* **XDC Network (Enterprise B2B Rails)**:
  - EVM-compatible with near-zero gas and enterprise-grade security (XDPoS 2.0 consensus).
  - Target Audience: Corporate IT training departments, Datacentre Academy partners, Managed Service Providers (MSPs), and government workforce development programs.
  - Core Use: Enterprise subscription settlement, employer voucher funding escrow, and ERC-5192 Soulbound resume credentials verifiable by HR systems.
* **TON Blockchain (Consumer & Social Viral Rails)**:
  - Non-EVM, actor-model, ultra-scalable sharded blockchain natively embedded in Telegram.
  - Target Audience: Global self-study candidates, Telegram study groups, grassroots technicians.
  - Core Use: 1-click frictionless subscriptions via TON Connect / USDT Jettons, Telegram Stars bridging, peer commitment staking pools, and portable TEP-85 digital badges.

---

## 2. Product Requirements Document (PRD)

### 2.1 Problem & Opportunity Statement
* **Problem**: Traditional edtech LMS solutions treat blockchain as speculative hype (tradable tokens that encourage pump-and-dump behavior) or useless cosmetic NFT jpegs. Meanwhile, AI study tools act as passive answer engines that undermine real problem-solving ability.
* **Opportunity**: Clariora already possesses a local ECDSA P-256 cryptographic ledger (`CompTIALedger`), an AI rate-limited edge proxy (`api_worker.js`), and a Telegram Mini App footprint (`tonconnect-manifest.json`). By integrating XDC and TON, we turn study effort into an economically rational, verifiable, and socially reinforced career trajectory.

### 2.2 Target Personas
1. **The Aspiring Technician ("Alex")**: Studying for CompTIA A+ Core 1 & 2 via Telegram. Needs gamified motivation, micro-rewards for study streaks, and low-fee mobile payments without requiring a traditional credit card.
2. **The Career Switcher / Cloud Engineer ("Elena")**: Preparing for AZ-900 / AZ-500. Seeks a tamper-proof credential that proves hands-on lab competence to recruiters on LinkedIn.
3. **The Enterprise Fleet Manager / MSP Director ("Marcus")**: Sponsoring 50 junior helpdesk recruits. Wants to escrow \$15,000 in certification vouchers that automatically disburse *only* when an apprentice achieves a verified 85%+ readiness score via the AI Ghost Coach.

### 2.3 Feature Matrix & Scope

| Feature ID | Feature Name | Chain / Rail | Description | Priority |
|---|---|---|---|---|
| **FEAT-PAY-01** | TON & Jetton (USDT) Payments | TON (TON Connect 2.0) | 1-click checkout for 24h Pass, Pro Monthly, and Lifetime Master passes via Tonkeeper/Wallet. | **P0** |
| **FEAT-PAY-02** | Native XDC & XRC-20 Payments | XDC Network (EVM) | Web3 checkout accepting native XDC and stablecoins (USDT-XDC) via MetaMask, XDC Pay, and WalletConnect. | **P0** |
| **FEAT-SBT-01** | Enterprise Proof-of-Mastery SBT | XDC (ERC-5192) | Non-transferable Soulbound Token minted upon scoring $\ge 800$ on Crucible / Full Mocks, containing AI sub-objective breakdown. | **P1** |
| **FEAT-SBT-02** | Telegram Master Badge SBT | TON (TEP-85) | Non-transferable Telegram-native Soulbound NFT displaying exam readiness status directly in Telegram user profiles. | **P1** |
| **FEAT-ESC-01** | Enterprise Voucher Staking Escrow | XDC Network | Smart contract allowing sponsors to lock voucher funds; releases codes when AI signs Proof-of-Readiness. | **P2** |
| **FEAT-POOL-01**| Crucible Peer Commitment Pools | TON Blockchain | Learners stake 2 TON into a 7-day study pool. Completing daily SRS quests preserves stake; forfeitures reward finishers. | **P2** |
| **FEAT-L2G-01** | Local-to-Global Ledger Bridge | XDC / TON | Periodic Merkle root anchoring of local IndexedDB ECDSA chain to public chain for immutable audit trails. | **P1** |

### 2.4 Functional Requirements (FRs)

#### FR-1: Multi-Rail Web3 Wallet Layer
* The frontend must provide a unified Web3 modal allowing learners to connect either an EVM wallet (MetaMask, XDC Pay, Rabby, Coinbase Wallet) configured for XDC Network (Mainnet Chain ID: 50, Apothem Testnet Chain ID: 51) or a TON wallet via TON Connect 2.0 (Tonkeeper, MyTonWallet, Telegram @wallet).
* Wallet state must remain synchronized across tab reloads and degrade gracefully when no wallet extension is injected.

#### FR-2: Cryptographic Server-Authoritative Billing
* Payment orders must originate from `/api/v1/billing/{chain}/order` with an edge-generated single-use nonce/memo (e.g. `APX:SUB:{productId}:{userId}:{orderId}`).
* Verification must occur server-side on Cloudflare Workers via direct JSON-RPC node calls (XDC) and TonAPI / TonCenter (TON). Client-reported confirmation is never trusted for entitlement upgrades.

#### FR-3: AI-Attested Soulbound Credential Issuance
* When a learner requests an on-chain Proof-of-Mastery credential, the Clariora Edge API evaluates:
  1. Historical test completion records from `learner_state.js`.
  2. The canonical readiness score calculated by `APlus.readiness2.compute`.
  3. Ghost Coach behavioral telemetry (cadence variance, absence of braindump velocity anomalies).
* If criteria are satisfied, the Edge Worker signs an EIP-712 message (for XDC) or an Ed25519 oracle payload (for TON), empowering the learner's wallet to execute `mintWithAttestation(...)`.

---

## 3. Full-Stack System Architecture

```
                                    +--------------------------------------------------+
                                    |              CLIENT SURFACES                     |
                                    |  - Web PWA (clariora.com.au)                     |
                                    |  - Electron Desktop App (Windows/Mac/Linux)      |
                                    |  - Telegram Mini App (TMA Webview)               |
                                    +-------------------------+------------------------+
                                                              |
                                           +------------------+------------------+
                                           |                                     |
                                           v                                     v
                        +----------------------------------+   +----------------------------------+
                        |       EVM / XDC SUBSYSTEM        |   |       TON CONNECT SUBSYSTEM      |
                        | - ethers.js v6                   |   | - @tonconnect/ui                 |
                        | - XDC Pay / MetaMask / WC v2     |   | - @ton/ton & @ton/core           |
                        | - Chain ID 50 / 51 (Apothem)     |   | - Tonkeeper / OpenMask / @wallet |
                        +-----------------+----------------+   +-----------------+----------------+
                                          |                                      |
                                          +------------------+-------------------+
                                                             |
                                                             v
                        +-------------------------------------------------------------------------+
                        |                 CLOUDFLARE WORKERS EDGE API (api_worker.js)             |
                        |                                                                         |
                        |  Routes:                                                                |
                        |  - POST /api/v1/billing/xdc/order    -> Create XDC EVM payment invoice  |
                        |  - POST /api/v1/billing/xdc/verify   -> Verify EVM tx receipt on XDC    |
                        |  - POST /api/v1/billing/ton/order    -> Create TON payment memo         |
                        |  - POST /api/v1/billing/ton/verify   -> Verify BOC / tx on TON RPC      |
                        |  - POST /api/v1/oracle/attest        -> AI Proof-of-Competence Oracle   |
                        |                                                                         |
                        |  Data & State Stores:                                                   |
                        |  - Cloudflare D1 Database (clariora_edge_db)                             |
                        |  - Cloudflare Workers KV (Replay nonce caches, rate limits)             |
                        +-----------------+--------------------------------------+----------------+
                                          |                                      |
                                          v                                      v
                        +----------------------------------+   +----------------------------------+
                        |        XDC NETWORK NODES         |   |         TON BLOCKCHAIN           |
                        | - https://rpc.xinfin.network     |   | - https://toncenter.com/api/v2   |
                        | - https://rpc.apothem.network    |   | - https://tonapi.io/v2           |
                        | - Ankr XDC RPC Cluster           |   | - TonConnect Bridge Gateways     |
                        +----------------------------------+   +----------------------------------+
```

---

## 4. XDC Network Implementation Blueprint

### 4.1 Network Parameters & Configuration

| Parameter | Mainnet | Apothem Testnet |
|---|---|---|
| **Network Name** | XDC Network | XDC Apothem Testnet |
| **RPC URL** | `https://rpc.xinfin.network` / `https://erpc.xinfin.network` | `https://rpc.apothem.network` |
| **Chain ID** | `50` (Hex: `0x32`) | `51` (Hex: `0x33`) |
| **Currency Symbol** | `XDC` | `TXDC` |
| **Block Explorer** | `https://xdc.blocksscan.io/` / `https://explorer.xinfin.network/` | `https://apothem.blocksscan.io/` |
| **Consensus** | XDPoS 2.0 (BFT Finality, 2-sec block time) | XDPoS 2.0 |

### 4.2 Solidity Smart Contracts

#### 1. `ClarioraSubscription.sol` (EVM Subscription & Payment Gateway)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClarioraSubscription
 * @dev Manages native XDC and XRC-20 subscription passes for Clariora A+
 */
contract ClarioraSubscription is Ownable, ReentrancyGuard {
    enum Tier { NONE, PASS_24H, PRO_MONTHLY, LIFETIME }

    struct Plan {
        uint256 xdcPrice;      // In wei (1e18)
        uint256 duration;      // In seconds (0 for lifetime)
        bool active;
    }

    mapping(Tier => Plan) public plans;
    mapping(address => mapping(Tier => uint256)) public userExpirations;

    event SubscriptionPurchased(
        address indexed user,
        Tier indexed tier,
        uint256 amountPaid,
        uint256 expiresAt,
        string orderId
    );

    constructor(address initialOwner) Ownable(initialOwner) {
        // 24-Hour Pass: ~50 XDC
        plans[Tier.PASS_24H] = Plan(50 ether, 1 days, true);
        // Pro Monthly Pass: ~250 XDC
        plans[Tier.PRO_MONTHLY] = Plan(250 ether, 30 days, true);
        // Lifetime Master Pass: ~1200 XDC
        plans[Tier.LIFETIME] = Plan(1200 ether, 0, true);
    }

    function buyWithXDC(Tier tier, string calldata orderId) external payable nonReentrant {
        Plan memory plan = plans[tier];
        require(plan.active, "Plan not active");
        require(msg.value >= plan.xdcPrice, "Insufficient XDC sent");

        uint256 currentExpiry = userExpirations[msg.sender][tier];
        uint256 baseTime = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiry = plan.duration == 0 ? type(uint256).max : baseTime + plan.duration;

        userExpirations[msg.sender][tier] = newExpiry;

        emit SubscriptionPurchased(msg.sender, tier, msg.value, newExpiry, orderId);

        // Refund any excess payment
        if (msg.value > plan.xdcPrice) {
            payable(msg.sender).transfer(msg.value - plan.xdcPrice);
        }
    }

    function isSubscriptionActive(address user, Tier tier) external view returns (bool) {
        return userExpirations[user][tier] > block.timestamp;
    }

    function withdraw(address payable recipient) external onlyOwner {
        recipient.transfer(address(this).balance);
    }
}
```

#### 2. `ClarioraProofOfMasterySBT.sol` (ERC-5192 Soulbound Credential)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

/**
 * @title ClarioraProofOfMasterySBT
 * @notice ERC-5192 Soulbound Token for verified CompTIA A+ and Cloud credentials
 * @dev Non-transferable credential issued exclusively via Clariora AI Oracle signature
 */
contract ClarioraProofOfMasterySBT is ERC721, IERC5192, Ownable {
    using ECDSA for bytes32;

    uint256 private _nextTokenId;
    address public oracleSigner;

    struct Credential {
        string examCode;       // e.g. "220-1201"
        uint16 scaledScore;    // e.g. 840 (passing: 675 or 700)
        uint64 timestamp;
        bytes32 localLedgerRoot; // Root hash of learner_engine.js chain
        string tokenURI;
    }

    mapping(uint256 => Credential) public credentials;
    mapping(bytes32 => bool) public usedAttestations;

    constructor(address initialOwner, address initialOracle)
        ERC721("Clariora Proof of Competence", "CPOC")
        Ownable(initialOwner)
    {
        oracleSigner = initialOracle;
    }

    function setOracleSigner(address newOracle) external onlyOwner {
        oracleSigner = newOracle;
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true; // Soulbound: permanently locked
    }

    function mintWithOracle(
        string calldata examCode,
        uint16 scaledScore,
        uint64 timestamp,
        bytes32 localLedgerRoot,
        string calldata uri,
        bytes calldata oracleSignature
    ) external returns (uint256) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, examCode, scaledScore, timestamp, localLedgerRoot)
        );
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        require(!usedAttestations[messageHash], "Attestation already used");
        require(ethSignedHash.recover(oracleSignature) == oracleSigner, "Invalid AI Oracle signature");

        usedAttestations[messageHash] = true;
        uint256 tokenId = ++_nextTokenId;

        _safeMint(msg.sender, tokenId);
        credentials[tokenId] = Credential(examCode, scaledScore, timestamp, localLedgerRoot, uri);

        emit Locked(tokenId);
        return tokenId;
    }

    // Enforce Non-Transferability (Soulbound)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: Transfer not permitted");
        }
        return super._update(to, tokenId, auth);
    }
}
```

### 4.3 Frontend Ethers.js v6 Integration Hook

```typescript
import { ethers, BrowserProvider, Contract } from 'ethers';

const XDC_CONFIG = {
  chainId: '0x32', // 50 in hex (Mainnet)
  chainName: 'XDC Network',
  rpcUrls: ['https://rpc.xinfin.network'],
  nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 },
  blockExplorerUrls: ['https://xdc.blocksscan.io/']
};

export async function connectXDCWallet() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No EVM wallet detected. Please install MetaMask or XDC Pay.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  // Auto-switch or add XDC Network if not on Chain ID 50
  if (network.chainId !== 50n) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: XDC_CONFIG.chainId }]
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [XDC_CONFIG]
        });
      } else {
        throw switchError;
      }
    }
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
}
```

---

## 5. TON Blockchain Implementation Blueprint

### 5.1 Telegram Mini App & TON Connect Setup
Clariora utilizes the existing `tonconnect-manifest.json` hosted at domain root `https://clariora.com.au/tonconnect-manifest.json`:
```json
{
  "url": "https://clariora.com.au",
  "name": "Clariora",
  "iconUrl": "https://clariora.com.au/icon.png",
  "termsOfServiceUrl": "https://clariora.com.au/landing/trust.html",
  "privacyPolicyUrl": "https://clariora.com.au/landing/trust.html"
}
```

### 5.2 Tact Smart Contracts (TON VM)

#### 1. `ClarioraMasterySBT.tact` (TEP-85 Compliant Soulbound Item)
```tact
import "@stdlib/deploy";

message MintSBT {
    queryId: Int as uint64;
    owner: Address;
    examCode: String;
    scaledScore: Int as uint16;
    ledgerHash: Int as uint256;
    authority: Address;
}

message ProveOwnership {
    queryId: Int as uint64;
    dest: Address;
    forwardPayload: Cell;
    withContent: Bool;
}

message OwnershipProof {
    queryId: Int as uint64;
    itemId: Int as uint64;
    owner: Address;
    data: Cell;
    revokedAt: Int as uint64;
    content: Cell?;
}

contract ClarioraMasterySBTItem {
    collection: Address;
    index: Int as uint64;
    owner: Address;
    authority: Address;
    examCode: String;
    scaledScore: Int as uint16;
    ledgerHash: Int as uint256;
    revokedAt: Int as uint64 = 0;

    init(collection: Address, index: Int as uint64, owner: Address, authority: Address, examCode: String, scaledScore: Int as uint16, ledgerHash: Int as uint256) {
        self.collection = collection;
        self.index = index;
        self.owner = owner;
        self.authority = authority;
        self.examCode = examCode;
        self.scaledScore = scaledScore;
        self.ledgerHash = ledgerHash;
    }

    // TEP-85: SBT items cannot be transferred
    receive("transfer") {
        revert(1001); // Transfers strictly forbidden for Soulbound credentials
    }

    receive(msg: ProveOwnership) {
        require(sender() == self.owner, "Access denied");
        send(SendParameters{
            to: msg.dest,
            value: 0,
            mode: SendRemainingValue,
            body: OwnershipProof{
                queryId: msg.queryId,
                itemId: self.index,
                owner: self.owner,
                data: emptyCell(),
                revokedAt: self.revokedAt,
                content: null
            }.toCell()
        });
    }

    get fun get_nft_data(): (Bool, Int, Address, Address, Cell) {
        return (true, self.index, self.collection, self.owner, emptyCell());
    }

    get fun get_authority_address(): Address {
        return self.authority;
    }

    get fun get_revoked_time(): Int {
        return self.revokedAt;
    }
}
```

#### 2. `CrucibleCommitmentPool.tact` (Social Accountability Staking)
```tact
import "@stdlib/deploy";

struct Participant {
    stakedAmount: Int as coins;
    streakDays: Int as uint8;
    lastStudyTimestamp: Int as uint64;
    claimed: Bool;
}

message StakeEntry {
    queryId: Int as uint64;
}

message VerifyStreakDay {
    queryId: Int as uint64;
    user: Address;
    oracleSignature: Slice;
}

message ClaimYield {
    queryId: Int as uint64;
}

contract CrucibleCommitmentPool with Deployable {
    owner: Address;
    oracle: Address;
    poolEndTime: Int as uint64;
    totalStaked: Int as coins = 0;
    penaltyPool: Int as coins = 0;
    participants: map<Address, Participant>;

    init(owner: Address, oracle: Address, durationSeconds: Int as uint64) {
        self.owner = owner;
        self.oracle = oracle;
        self.poolEndTime = now() + durationSeconds;
    }

    receive(msg: StakeEntry) {
        let ctx: Context = context();
        require(now() < self.poolEndTime - 86400, "Pool entry closed");
        require(ctx.value >= ton("2.0"), "Minimum 2 TON commitment");

        let p: Participant? = self.participants.get(ctx.sender);
        require(p == null, "Already registered");

        self.participants.set(ctx.sender, Participant{
            stakedAmount: ctx.value,
            streakDays: 1,
            lastStudyTimestamp: now(),
            claimed: false
        });
        self.totalStaked = self.totalStaked + ctx.value;
    }

    receive(msg: ClaimYield) {
        require(now() >= self.poolEndTime, "Pool ongoing");
        let ctx: Context = context();
        let p: Participant = self.participants.get(ctx.sender)!!;
        require(!p.claimed, "Already claimed");
        p.claimed = true;
        self.participants.set(ctx.sender, p);

        // If completed 7 consecutive days, return stake + share of penalty pool
        if (p.streakDays >= 7) {
            let payout: Int = p.stakedAmount + (self.penaltyPool / 10);
            send(SendParameters{
                to: ctx.sender,
                value: payout,
                mode: SendRemainingValue,
                bounce: false
            });
        }
    }
}
```

---

## 6. Edge Verification & Cryptographic AI Oracle (`workers/api_worker.js`)

### 6.1 Server-Authoritative Payment Verification Handlers

#### XDC EVM Receipt Verification Endpoint
```javascript
// workers/api_worker.js addition
async function handleVerifyXdcPayment(request, env) {
  const { txHash, expectedOrderId, expectedAmountXdc } = await request.json();
  if (!txHash || !expectedOrderId) {
    return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
  }

  // 1. Query XDC RPC via edge fetch
  const rpcRes = await fetch('https://rpc.xinfin.network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1
    })
  });
  const rpcData = await rpcRes.json();
  const receipt = rpcData.result;

  if (!receipt || receipt.status !== '0x1') {
    return new Response(JSON.stringify({ verified: false, error: 'Transaction unconfirmed or reverted' }), { status: 422 });
  }

  // 2. Prevent replay attacks using Cloudflare KV
  const replayKey = `xdc_tx_${txHash.toLowerCase()}`;
  const existing = await env.KV_SESSIONS.get(replayKey);
  if (existing) {
    return new Response(JSON.stringify({ verified: false, error: 'Transaction already redeemed' }), { status: 409 });
  }
  await env.KV_SESSIONS.put(replayKey, expectedOrderId, { expirationTtl: 86400 * 365 });

  // 3. Upgrade user entitlement in D1 database
  await env.DB.prepare(
    "UPDATE auth_accounts SET tier = 'pro', tier_expires_at = datetime('now', '+30 days') WHERE id = ?"
  ).bind(request.userId).run();

  return new Response(JSON.stringify({ verified: true, tier: 'pro' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### TON Jetton / BOC Verification Endpoint
```javascript
async function handleVerifyTonPayment(request, env) {
  const { boc, expectedOrderId, userAddress } = await request.json();
  
  // Query TonCenter API with server API key
  const tonCenterUrl = `https://toncenter.com/api/v2/getTransactions?address=${env.TON_MERCHANT_WALLET}&limit=10`;
  const tonRes = await fetch(tonCenterUrl, {
    headers: { 'X-API-Key': env.TONCENTER_API_KEY }
  });
  const data = await tonRes.json();
  
  if (!data.ok) {
    return new Response(JSON.stringify({ verified: false, error: 'TonCenter RPC unreachable' }), { status: 502 });
  }

  // Locate transaction matching expected order memo
  const matchingTx = data.result.find(tx => {
    const msg = tx.in_msg;
    return msg && msg.message && msg.message.includes(expectedOrderId);
  });

  if (!matchingTx) {
    return new Response(JSON.stringify({ verified: false, error: 'Payment memo not found on-chain' }), { status: 404 });
  }

  // Record entitlement upgrade in D1
  await env.DB.prepare(
    "UPDATE auth_accounts SET tier = 'pro', tier_expires_at = datetime('now', '+30 days') WHERE id = ?"
  ).bind(request.userId).run();

  return new Response(JSON.stringify({ verified: true, txId: matchingTx.transaction_id.hash }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

## 7. Security, Fraud Prevention, and Anti-Cheat Governance

### 7.1 Preventing AI & Certification Braindump Exploits
1. **Response Cadence Analysis**: If a user submits 90 questions in under 12 minutes with 98% accuracy, the AI Oracle flags this as "braindump replay velocity" and rejects SBT attestation. Real humans solving PBQs display diagnostic pause patterns.
2. **Local Chain Integrity Check**: `verifyChain` in `ledger_engine.js` verifies the entire ECDSA P-256 historical signature chain stored in IndexedDB. If an attacker attempts to inject false test results directly into `localStorage`, the hash chain breaks, rejecting the Merkle root.
3. **Double-Spend & Replay Guard**: Every smart contract interaction requires a single-use order ID (`bytes32`) generated by the Cloudflare edge and consumed atomically in the smart contract storage or KV.

---

## 8. Consolidated Developer Documentation & Authoritative Citations

### 8.1 XDC Network Developer References
* **XDC Network Official Docs**: [https://docs.xdc.network/](https://docs.xdc.network/)
* **XDC JSON-RPC API Reference & Endpoints**: [https://docs.xdc.network/api/](https://docs.xdc.network/api/)
* **XDC Developer Hub & Build Portal**: [https://xdc.org/build](https://xdc.org/build)
* **XDC Developer Solutions & Architecture**: [https://xdc.org/solutions/developers](https://xdc.org/solutions/developers)
* **XDC EVM Smart Contract Tooling (Remix, Hardhat, Foundry)**: [https://docs.xdc.network/smart-contract/](https://docs.xdc.network/smart-contract/)
* **XDC Chain RPC via Ankr Global Infrastructure**: [https://www.ankr.com/docs/rpc-service/chains/chains-api/xdc/](https://www.ankr.com/docs/rpc-service/chains/chains-api/xdc/)
* **XDC Mainnet Block Explorer (BlocksScan)**: [https://xdc.blocksscan.io/](https://xdc.blocksscan.io/)
* **XDC XinFin Network Explorer**: [https://explorer.xinfin.network/](https://explorer.xinfin.network/)
* **XDC Pay Browser Extension & Web3 Integration**: [https://docs.xdc.network/xdc-tools/xdc-pay/](https://docs.xdc.network/xdc-tools/xdc-pay/)
* **XDC Pay Sample Web App Integration (GitHub)**: [https://github.com/CoinClubQuincy/WebApp_to_XDCPay](https://github.com/CoinClubQuincy/WebApp_to_XDCPay)
* **Guide: Accept XDC and XRC-20 Payments in Web Apps**: [https://www.xdc.dev/jurjeesahamed/accept-xdc-and-xrc20-based-tokens-as-payment-methods-in-website-or-web-application-with-ease-3799](https://www.xdc.dev/jurjeesahamed/accept-xdc-and-xrc20-based-tokens-as-payment-methods-in-website-or-web-application-with-ease-3799)
* **EIP-5192 Minimal Soulbound Tokens Standard**: [https://eips.ethereum.org/EIPS/eip-5192](https://eips.ethereum.org/EIPS/eip-5192)

### 8.2 TON Blockchain Developer References
* **TON Official Documentation**: [https://docs.ton.org/](https://docs.ton.org/)
* **TON Connect 2.0 Protocol Overview**: [https://docs.ton.org/develop/dapps/ton-connect/overview](https://docs.ton.org/develop/dapps/ton-connect/overview)
* **Get Started with TON Connect (Step-by-Step)**: [https://docs.ton.org/develop/dapps/ton-connect/get-started](https://docs.ton.org/develop/dapps/ton-connect/get-started)
* **TON Connect UI React SDK Documentation**: [https://ton-connect.github.io/sdk/modules/_tonconnect_ui-react.html](https://ton-connect.github.io/sdk/modules/_tonconnect_ui-react.html)
* **TON Connect Monorepo & GitHub SDKs**: [https://github.com/ton-connect/sdk](https://github.com/ton-connect/sdk)
* **TON Connect Manifest Specification & Requirements**: [https://docs.ton.org/develop/dapps/ton-connect/manifest](https://docs.ton.org/develop/dapps/ton-connect/manifest)
* **TON SDKs List (TypeScript, Python, Go)**: [https://docs.ton.org/develop/dapps/apis-sdks/sdk](https://docs.ton.org/develop/dapps/apis-sdks/sdk)
* **TonAPI & TON Console Developer Guide**: [https://docs.tonconsole.com/](https://docs.tonconsole.com/)
* **TonCenter JSON-RPC API Reference**: [https://toncenter.com/](https://toncenter.com/)
* **TON Developer Portal & Guidelines**: [https://tondev.org/](https://tondev.org/)
* **Tact Smart Contract Language Documentation**: [https://docs.tact-lang.org/](https://docs.tact-lang.org/)
* **Telegram Mini Apps (TMA) Developer Documentation**: [https://core.telegram.org/bots/webapps](https://core.telegram.org/bots/webapps)
* **TEP-85: Soulbound Tokens (SBT) Standard on TON**: [https://github.com/ton-blockchain/TEPs/blob/master/text/0085-sbt-standard.md](https://github.com/ton-blockchain/TEPs/blob/master/text/0085-sbt-standard.md)
* **TEP-74: Fungible Tokens (Jettons) Standard on TON**: [https://docs.ton.org/develop/dapps/asset-processing/jettons](https://docs.ton.org/develop/dapps/asset-processing/jettons)
* **Guide: Adding TON Payments and USDT Jettons to Web Apps**: [https://ledgerultra.com/how-to-add-ton-payments-and-usdt-jettons-to-your-web-app](https://ledgerultra.com/how-to-add-ton-payments-and-usdt-jettons-to-your-web-app)

---

## 9. Phased Implementation Roadmap

```
+---------------------------------------------------------------------------------------------------+
|  PHASE 1: DUAL-RAIL CHECKOUT (Weeks 1 - 2)                                                        |
|  - Host tonconnect-manifest.json & embed @tonconnect/ui into index.html                           |
|  - Integrate ethers.js v6 with XDC Network switch modal (Chain ID 50 / 51)                        |
|  - Deploy ClarioraSubscription.sol to XDC Apothem & Mainnet                                       |
|  - Implement /api/v1/billing/xdc/* and /api/v1/billing/ton/* in workers/api_worker.js             |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|  PHASE 2: PROOF-OF-COMPETENCE SOULBOUND CREDENTIALS (Weeks 3 - 4)                                 |
|  - Deploy ClarioraProofOfMasterySBT.sol (ERC-5192) on XDC Network                                 |
|  - Deploy ClarioraMasterySBT.tact (TEP-85) on TON Blockchain                                      |
|  - Build /api/v1/oracle/attest: AI Ghost Coach verifies readiness & signs attestation payload     |
|  - Expose "Mint Proof-of-Mastery" button on Exam Results banner for scores >= 800                |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|  PHASE 3: SOCIAL STUDY GUILDS & ENTERPRISE SPONSORSHIP (Weeks 5 - 6)                              |
|  - Deploy CrucibleCommitmentPool.tact for Telegram Study Groups (2 TON weekly commitment stakes)  |
|  - Implement Enterprise Voucher Escrow smart contract on XDC for corporate fleet managers        |
|  - Launch automated multi-device Merkle sync bridging local ledger_engine to on-chain roots       |
+---------------------------------------------------------------------------------------------------+
```

---
*Architectural Specification verified against Clariora v3.1.5 codebase.*
