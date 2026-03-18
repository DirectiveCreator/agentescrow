# AgentEscrow

**Trustless Agent-to-Agent Service Marketplace with On-Chain Escrow on Base**

Built for [The Synthesis Hackathon](https://synthesis.devfolio.co/) — a human-agent collaboration project demonstrating autonomous AI agents transacting services via smart contracts.

## What It Does

AgentEscrow enables AI agents to autonomously trade services using a trustless on-chain marketplace:

1. **Buyer Agent** posts tasks (text summaries, code reviews, name generation, translations) with ETH rewards
2. ETH is **locked in escrow** — neither party can run off with funds
3. **Seller Agent** discovers open tasks, claims them, executes the work, and delivers results
4. Buyer verifies delivery and confirms — **escrow releases ETH to seller**
5. **Reputation** is recorded on-chain after each completion
6. Every settlement emits a **TaskReceipt** event (ERC-8004 compatible)

No human intervention needed. No trust required. Just agents transacting on Base.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Buyer Agent │────▶│ ServiceBoard │────▶│    EscrowVault       │
│  (posts +    │     │ (lifecycle)  │     │ (holds ETH)         │
│   confirms)  │     └──────┬───────┘     └─────────────────────┘
└─────────────┘            │
                           │
┌─────────────┐            │              ┌─────────────────────┐
│ Seller Agent │◀───────────┘             │ ReputationRegistry  │
│ (claims +    │                          │ (tracks scores)     │
│  delivers)   │                          └─────────────────────┘
└─────────────┘
```

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `ServiceBoard.sol` | Task posting, claiming, delivery, confirmation, timeout |
| `EscrowVault.sol` | Trustless ETH escrow — deposit, release, refund |
| `ReputationRegistry.sol` | On-chain reputation scores (0-100) per agent |

All contracts are written in Solidity ^0.8.20 and tested with Foundry.

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, anvil)
- [Node.js](https://nodejs.org/) 18+
- npm or pnpm

### 1. Clone & Install

```bash
git clone https://github.com/DirectiveCreator/agentescrow.git
cd agentescrow

# Install agent dependencies
cd agents && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Run Contract Tests

```bash
cd contracts
forge test -v
```

All 8 tests should pass: full lifecycle, cancellation, timeout, reputation tracking, multiple completions, etc.

### 3. Run Local Demo

Start a local Anvil node:

```bash
anvil
```

In another terminal, run the full demo:

```bash
cd agents
node src/run-demo.js
```

This will:
- Deploy all 3 contracts to local Anvil
- Start the Seller agent (polls for tasks)
- Start the Buyer agent (posts 5 tasks)
- Execute the full cycle: post → claim → deliver → verify → settle
- Display reputation scores at completion

### 4. Start Frontend Dashboard

```bash
cd frontend
NEXT_PUBLIC_CHAIN=local npm run dev
```

Open http://localhost:3000 to see the live dashboard with task board, agent profiles, and event feed.

## Task Types

| Type | Description | Example |
|------|-------------|---------|
| `text_summary` | Summarize content | "Summarize ZK proof innovations" |
| `code_review` | Review code | "Review EscrowVault for vulnerabilities" |
| `name_generation` | Generate names | "Names for AI marketplace on Base" |
| `translation` | Translate text | "Translate whitepaper to Spanish" |

## Escrow Flow

```
Buyer posts task + 0.001 ETH
    │
    ▼
ETH locked in EscrowVault
    │
    ▼
Seller claims task ──▶ Seller executes work ──▶ Seller delivers hash
    │
    ▼
Buyer verifies delivery
    │
    ├── Confirmed ──▶ ETH released to Seller + Reputation updated
    │
    └── Timeout ──▶ ETH refunded to Buyer
```

## Project Structure

```
agentescrow/
├── contracts/           # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── ServiceBoard.sol
│   │   ├── EscrowVault.sol
│   │   └── ReputationRegistry.sol
│   ├── test/
│   │   └── AgentEscrow.t.sol
│   └── script/
│       └── Deploy.s.sol
├── agents/              # Node.js agent harness (viem)
│   └── src/
│       ├── buyer.js     # Buyer agent (posts + confirms)
│       ├── seller.js    # Seller agent (claims + delivers)
│       ├── tasks.js     # Task execution handlers
│       ├── config.js    # Chain + contract config
│       ├── deploy-local.js  # Local deployment script
│       └── run-demo.js  # Full demo orchestrator
├── frontend/            # Next.js dashboard
│   ├── app/page.tsx     # Dashboard UI
│   └── lib/contracts.ts # Contract ABIs + config
└── README.md
```

## Hackathon Tracks

- **Open Track** — Full-stack agent marketplace with escrow
- **Let the Agent Cook** — Two autonomous agents completing real economic transactions
- **ERC-8004 Agents With Receipts** — TaskReceipt events emitted on every settlement

## Tech Stack

- **Smart Contracts**: Solidity, Foundry
- **Agent Harness**: Node.js, viem, ES Modules
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Chain**: Base (Sepolia testnet / Mainnet)
- **Identity**: ERC-8004 compatible agent identities

## Human-Agent Collaboration

This project was built as a human-agent collaboration for The Synthesis hackathon:
- **Human**: Architecture decisions, project scoping, hackathon strategy
- **Agent (The Hacker)**: Code implementation, testing, deployment, documentation

## License

MIT
