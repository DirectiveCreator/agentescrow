# AgentEscrow

**Trustless Agent-to-Agent Service Marketplace with On-Chain Escrow — deployed on Base & Celo**

Built for [The Synthesis Hackathon](https://synthesis.devfolio.co/) and [Build Agents for the Real World — Celo Hackathon V2](https://www.karmahq.xyz/community/celo?programId=1059) — a human-agent collaboration project demonstrating autonomous AI agents transacting services via smart contracts.

## What It Does

AgentEscrow enables AI agents to autonomously trade services using a trustless on-chain marketplace:

1. **Buyer Agent** posts tasks (text summaries, code reviews, name generation, translations) with ETH rewards
2. ETH is **locked in escrow** — neither party can run off with funds
3. **Seller Agent** discovers open tasks, claims them, executes the work, and delivers results
4. Buyer verifies delivery and confirms — **escrow releases ETH to seller**
5. **Reputation** is recorded on-chain after each completion
6. Every settlement emits a **TaskReceipt** event (ERC-8004 compatible)

No human intervention needed. No trust required. Just agents transacting on Base and Celo.

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
│       ├── run-demo.js  # Full demo orchestrator
│       └── celo/        # Celo-specific integration
│           ├── client.js           # CeloClient SDK
│           ├── deploy.js           # Celo Sepolia deployment
│           ├── demo.js             # On-chain demo (3 tasks)
│           ├── register-erc8004.js # ERC-8004 registration
│           ├── stablecoin-escrow-demo.js
│           └── fee-abstraction-demo.js
├── celo/                # Celo hackathon documentation
│   └── README.md        # Celo-specific docs + on-chain results
├── frontend/            # Next.js dashboard
│   ├── app/page.tsx     # Dashboard UI
│   └── lib/contracts.ts # Contract ABIs + config
└── README.md
```

## Hackathon Tracks

### Synthesis Hackathon
- **Open Track** — Full-stack agent marketplace with escrow
- **Let the Agent Cook** — Two autonomous agents completing real economic transactions
- **ERC-8004 Agents With Receipts** — TaskReceipt events emitted on every settlement

### Celo Hackathon V2 — Build Agents for the Real World
- **Best Agent on Celo** ($6K) — Agent marketplace with on-chain escrow on Celo
- **Best Agent Infra on Celo** ($2K) — Multi-chain agent infrastructure
- **Highest Rank in 8004scan** ($500) — ERC-8004 registered agents

## Multi-Chain Deployment

| Chain | ServiceBoard | EscrowVault | ReputationRegistry |
|-------|-------------|-------------|-------------------|
| **Base Sepolia** | `0xDd04B859874947b9861d671DEEc8c39e5CD61c6C` | `0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E` | `0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c` |
| **Celo Sepolia** | `0xDd04B859874947b9861d671DEEc8c39e5CD61c6C` | `0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E` | `0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c` |

### ERC-8004 Agent Identities

| Agent | Base Sepolia | Celo Sepolia |
|-------|-------------|-------------|
| **Buyer** | #2194 | #225 |
| **Seller** | #2195 | #226 |

Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e` (same on both chains)

> See [celo/README.md](celo/README.md) for Celo-specific documentation, demos, and on-chain results.

## Tech Stack

- **Smart Contracts**: Solidity, Foundry
- **Agent Harness**: Node.js, viem, ES Modules
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Chains**: Base Sepolia, Celo Sepolia (chain-agnostic contracts)
- **Identity**: ERC-8004 agent identities (multi-chain)
- **Stablecoins**: cUSD/USDC support on Celo (CIP-64 fee abstraction)

## Human-Agent Collaboration

This project was built as a human-agent collaboration for The Synthesis hackathon:
- **Human**: Architecture decisions, project scoping, hackathon strategy
- **Agent (The Hacker)**: Code implementation, testing, deployment, documentation

### Agent Capabilities: Superpowers Skills Framework

On Day 2 of the hackathon (2026-03-18), The Founding Engineer installed the **Superpowers plugin** (v5.0.4) — a structured development skills framework that enhances The Hacker's engineering workflow. Commit `06f66a6`.

The Hacker now has access to **14 structured development skills**:

| Skill | Purpose |
|-------|---------|
| **brainstorming** | Explore intent, requirements, and design before implementation |
| **test-driven-development** | RED-GREEN-REFACTOR cycle for rigorous development |
| **systematic-debugging** | Structured debugging instead of guessing |
| **verification-before-completion** | Verify work before claiming done |
| **writing-plans** | Structured implementation plans for multi-step tasks |
| **executing-plans** | Execute plans with review checkpoints |
| **dispatching-parallel-agents** | Run 2+ independent tasks in parallel |
| **subagent-driven-development** | Execute plans with independent subtasks |
| **requesting-code-review** | Request structured code reviews |
| **receiving-code-review** | Process code review feedback with technical rigor |
| **finishing-a-development-branch** | Guided completion and integration of dev work |
| **using-git-worktrees** | Isolated git worktrees for feature work |
| **writing-skills** | Create new custom skills |
| **using-superpowers** | Bootstrap skill — loaded automatically on session start |

These skills enforce engineering discipline — structured debugging before guessing, test-driven development, verification before claiming completion — while maintaining the rapid iteration speed needed for hackathon output.

### Security Auditing: Pashov Solidity Auditor

The Hacker also has the **Pashov Solidity Auditor** skill installed (from [pashov/skills](https://github.com/pashov/skills)) — enabling automated security auditing of its own smart contracts during development.

| Feature | Details |
|---------|---------|
| **Source** | [github.com/pashov/skills](https://github.com/pashov/skills) (Pashov Audit Group) |
| **Trigger** | "audit", "check this contract", "review for security" |
| **Default mode** | Scans all `.sol` files via 4 parallel agents across attack-vector categories |
| **DEEP mode** | Adds adversarial reasoning agent for thorough review |
| **File mode** | Audit specific contract files on demand |

This means The Hacker can self-audit its AgentEscrow contracts (ServiceBoard, EscrowVault, ReputationRegistry) for common vulnerabilities, reentrancy issues, access control problems, and more — closing the loop between building and securing smart contracts within the same agent workflow.

## License

MIT
