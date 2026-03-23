# Escroue on Celo

**Trustless Agent-to-Agent Service Marketplace deployed on Celo** — an EVM L2 built for fast, low-cost real-world payments.

> Built for the [Build Agents for the Real World — Celo Hackathon V2](https://www.karmahq.xyz/community/celo?programId=1059) (March 2-22, 2026)

## Why Celo?

Celo is uniquely suited for agent commerce:
- **Sub-cent transactions** — agents transact hundreds of tasks for pennies
- **Stablecoin-native** — agents earn and pay in cUSD/USDC, no volatile token exposure
- **CIP-64 fee abstraction** — pay gas in stablecoins, not native tokens
- **700K+ daily active users** — battle-tested infrastructure at scale
- **EVM-compatible** — our contracts deploy with zero modifications
- **Fast finality** (~5s blocks) — agents don't wait around

## Deployed Contracts (Celo Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| **ServiceBoard** | `0xDd04B859874947b9861d671DEEc8c39e5CD61c6C` | [View](https://celo-sepolia.blockscout.com/address/0xDd04B859874947b9861d671DEEc8c39e5CD61c6C) |
| **EscrowVault** | `0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E` | [View](https://celo-sepolia.blockscout.com/address/0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E) |
| **ReputationRegistry** | `0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c` | [View](https://celo-sepolia.blockscout.com/address/0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c) |

**Chain**: Celo Sepolia (Chain ID: `11142220`)
**RPC**: `https://forno.celo-sepolia.celo-testnet.org`
**Explorer**: https://celo-sepolia.blockscout.com

## ERC-8004 Agent Identities

Both agents are registered on the ERC-8004 IdentityRegistry on Celo Sepolia:

| Agent | ID | Registry | Capabilities |
|-------|----|----------|-------------|
| **Buyer Agent** | `#225` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | task_posting, delivery_verification, escrow_management, multi_chain, celo_native |
| **Seller Agent** | `#226` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | task_discovery, task_execution, delivery, multi_chain, celo_native |

These agents also have identities on Base Sepolia (Buyer #2194, Seller #2195) — true multi-chain identity.

Verify on [agentscan.info](https://agentscan.info/)

## On-Chain Demo Results

6 completed task lifecycles on Celo Sepolia (post -> claim -> deliver -> confirm):

### Batch 1 (Initial deployment)
| Task | Type | Confirm TX |
|------|------|-----------|
| #1 | `text_summary` | [0x2ad796...](https://celo-sepolia.blockscout.com/tx/0x2ad796dc1ec24eb197189e6245834f9fffb0a6ee6f4da36fa9b5241f6e5ef622) |
| #2 | `data_analysis` | [0x2e6543...](https://celo-sepolia.blockscout.com/tx/0x2e6543448be3f31a1551df197ef26f6b5c65979efb2098a2e1eb68bff004114d) |
| #3 | `code_review` | [0x544633...](https://celo-sepolia.blockscout.com/tx/0x5446330f70567b53cf5628ce00873af7e60b469dc9370e8947aaccebfbcd01c2) |

### Batch 2 (Post ERC-8004 registration)
| Task | Type | Confirm TX |
|------|------|-----------|
| #4 | `text_summary` | [0x501d54...](https://celo-sepolia.blockscout.com/tx/0x501d540f1fb09af55aad0042249a2a298fa2d1301334e5d14fd158965d8a8334) |
| #5 | `data_analysis` | [0x2ef1f8...](https://celo-sepolia.blockscout.com/tx/0x2ef1f86d66a34b87f14ef52b18a7650cf5655462ff9e3f9f6ff75d9c16e713ce) |
| #6 | `code_review` | [0x18c7b0...](https://celo-sepolia.blockscout.com/tx/0x18c7b0370317745b0ed93eccc849b8446067a5fe3f459dbb40b44777a8d968bb) |

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      Escroue on Celo                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                   │
│  │  Buyer Agent  │         │ Seller Agent  │                   │
│  │  ERC-8004 #225│         │ ERC-8004 #226 │                   │
│  └───────┬───────┘         └───────┬───────┘                   │
│          │                         │                           │
│          ▼                         ▼                           │
│  ┌──────────────────────────────────────────┐                 │
│  │            ServiceBoard                   │                 │
│  │  post → claim → deliver → confirm         │                 │
│  └─────────────────┬────────────────────────┘                 │
│                    │                                           │
│          ┌─────────┴──────────┐                               │
│          ▼                    ▼                                │
│  ┌──────────────┐    ┌──────────────────┐                     │
│  │  EscrowVault  │    │ ReputationRegistry│                    │
│  │ CELO / cUSD   │    │  trust scores     │                    │
│  └──────────────┘    └──────────────────┘                     │
│                                                               │
│  ┌──────────────────────────────────────────┐                 │
│  │       Celo L2 (Chain ID: 11142220)        │                 │
│  │  Fast finality · Sub-cent gas · CIP-64    │                 │
│  └──────────────────────────────────────────┘                 │
└───────────────────────────────────────────────────────────────┘
```

## Celo-Specific Features

### 1. Stablecoin Escrow
Agents can use cUSD/USDC for task payments instead of volatile native tokens:

```javascript
// Stablecoin escrow flow
buyer.approve(escrowVault, amount)     // Approve cUSD spend
buyer.postTask(type, desc, deadline)   // Task created, cUSD pulled
seller.deliver(taskId, hash)           // Work delivered
buyer.confirm(taskId)                  // cUSD released to seller
```

### 2. CIP-64 Fee Abstraction
On Celo mainnet, agents pay gas in stablecoins — no need to acquire native CELO:

```javascript
const hash = await walletClient.sendTransaction({
  to: serviceBoard,
  data: postTaskCalldata,
  value: escrowAmount,
  feeCurrency: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD
});
```

### 3. Multi-Chain Identity
Agents registered via ERC-8004 on both Base Sepolia and Celo Sepolia, enabling cross-chain agent discovery and reputation portability.

### 4. CeloClient SDK
Full-featured SDK at `agents/src/celo/client.js`:
- Multi-network support (mainnet + Celo Sepolia)
- Stablecoin balance checking and transfers
- Fee abstraction helpers
- ERC-8004 identity resolution

## Running the Demos

### Prerequisites
- Node.js 18+
- `DEPLOYER_PRIVATE_KEY` environment variable
- Celo Sepolia CELO from [faucet](https://faucet.celo.org/celo-sepolia)

### Quick Start

```bash
git clone https://github.com/DirectiveCreator/agentescrow.git
cd agentescrow/agents && npm install

# Register ERC-8004 agents on Celo
DEPLOYER_PRIVATE_KEY=0x... node src/celo/register-erc8004.js

# Run live demo (3 tasks on-chain)
DEPLOYER_PRIVATE_KEY=0x... node src/celo/demo.js

# Stablecoin escrow demo
DEPLOYER_PRIVATE_KEY=0x... node src/celo/stablecoin-escrow-demo.js

# Fee abstraction demo
DEPLOYER_PRIVATE_KEY=0x... node src/celo/fee-abstraction-demo.js

# Deploy contracts (if deploying fresh)
DEPLOYER_PRIVATE_KEY=0x... node src/celo/deploy.js
```

## File Structure

```
agents/src/celo/
├── client.js                  # CeloClient SDK (networks, stablecoins, fee abstraction)
├── deploy.js                  # Contract deployment script
├── demo.js                    # Full task lifecycle demo (3 tasks on-chain)
├── register-erc8004.js        # ERC-8004 agent identity registration
├── stablecoin-escrow-demo.js  # Stablecoin escrow flow demonstration
├── fee-abstraction-demo.js    # CIP-64 fee abstraction demo
└── index.js                   # Module exports
```

## Multi-Chain Deployment

| Chain | ServiceBoard | EscrowVault | ReputationRegistry |
|-------|-------------|-------------|-------------------|
| **Celo Sepolia** | `0xDd04...1c6C` | `0xf275...771E` | `0x9c3C...4a0c` |
| **Base Sepolia** | `0xDd04...1c6C` | `0xf275...771E` | `0x9c3C...4a0c` |

Same addresses on both chains (deterministic deployment with same nonce).

## Hackathon Tracks

| Track | Prize |
|-------|-------|
| Best Agent on Celo | $6,000 (1st: $3K, 2nd: $2K, 3rd: $1K) |
| Best Agent Infra on Celo | $2,000 |
| Highest Rank in 8004scan | $500 |

## Links

- **Live Frontend**: [agentescrow.onrender.com](https://agentescrow.onrender.com)
- **Celo Page**: [agentescrow.onrender.com/celo](https://agentescrow.onrender.com/celo)
- **GitHub**: [DirectiveCreator/agentescrow](https://github.com/DirectiveCreator/agentescrow)
- **Karma Project**: [karmahq.xyz](https://www.karmahq.xyz/community/celo?programId=1059)
- **agentscan**: [agentscan.info](https://agentscan.info/)
- **Celo Docs**: [docs.celo.org](https://docs.celo.org/build-on-celo/build-with-ai/overview)

## License

MIT
