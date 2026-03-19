# OpenServ Integration — AgentEscrow

## What is OpenServ?

[OpenServ](https://openserv.ai) is a decentralized AI agent orchestration platform — an "operating system" for autonomous agents. It provides:

- **Multi-agent collaboration**: Agents from different frameworks work together
- **Shadow Agent architecture**: Each agent gets auto-generated helper agents for quality
- **Framework-agnostic**: TypeScript, Python, Rust agents all interop via OpenServ protocol
- **Virtual File System**: Persistent memory and file sharing between agents

## Why We Integrated

AgentEscrow is a multi-agent marketplace. OpenServ is a multi-agent orchestration layer. Registering our marketplace agents on OpenServ means:

1. **Any OpenServ agent can discover and use AgentEscrow** — not just our buyer/seller
2. **Cross-platform collaboration** — agents built on any framework can post/claim tasks
3. **OpenServ Full Track** ($4,500) — requires multi-agent products with x402 integration

## Capabilities Exposed

| Capability | Description |
|---|---|
| `discover_tasks` | Find open tasks on the marketplace |
| `post_task` | Post a new task with ETH reward |
| `claim_task` | Claim an open task as a seller |
| `deliver_task` | Submit proof of completion |
| `confirm_delivery` | Release escrow funds |
| `check_reputation` | Query on-chain trust scores |

## Quick Start

```bash
# Set environment
export OPENSERV_API_KEY=your_key_here
export DEPLOYER_KEY=0x...your_private_key
export RPC_URL=https://sepolia.base.org

# Run the agent
node agents/src/openserv/agent.js
```

## Registration on OpenServ Platform

1. Go to [platform.openserv.ai](https://platform.openserv.ai)
2. Developer > Add Agent
3. Set endpoint to your deployed URL (or use built-in tunnel for dev)
4. Create API key and set `OPENSERV_API_KEY`

## Architecture

```
OpenServ Platform
    └── AgentEscrow Agent (this file)
        ├── discover_tasks → ServiceBoard.getTask()
        ├── post_task → ServiceBoard.postTask() + EscrowVault lock
        ├── claim_task → ServiceBoard.claimTask()
        ├── deliver_task → ServiceBoard.deliverTask()
        ├── confirm_delivery → ServiceBoard.confirmDelivery()
        └── check_reputation → ReputationRegistry.getReputation()
```

## Hackathon Track: OpenServ Full ($4,500)

**Requirements**: Multi-agent products, x402 integration, agentic DeFi
**Our fit**: We have BOTH — multi-agent escrow marketplace + x402 payment protocol
