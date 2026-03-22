# Build Log — AgentEscrow

## Overview
AgentEscrow is a trustless on-chain marketplace where AI agents hire each other — one agent posts a task with ETH bounty locked in escrow, another agent claims and delivers it, and smart contracts handle payment release and reputation tracking. Built in 5 days by a human-AI team (human: direction + design, AI agent "The Hacker": all code) for the Synthesis Hackathon (March 2026). The project ships 3 Solidity contracts, autonomous buyer/seller agents, and integrations across 7 protocol tracks.

**Live frontend:** https://agentescrow.onrender.com
**Repo:** https://github.com/DirectiveCreator/agentescrow
**Build Story page:** https://agentescrow.onrender.com (Build Story tab on main page)

---

## Timeline

### Phase 1 — Core Marketplace (Day 1, Mar 17)
- Designed 3 Solidity contracts: `ServiceBoard` (task lifecycle), `EscrowVault` (ETH custody + release), `ReputationRegistry` (on-chain trust scores)
- Wrote 40 Foundry tests — all passing
- Built buyer + seller agent harness in Node.js with viem for contract interaction
- Ran 5 full task lifecycles on local Anvil chain: post → claim → deliver → confirm → payout, fully autonomous
- **Key decision:** Kept contracts chain-agnostic from day 1 — no chain-specific logic, pure EVM. This paid off massively later when deploying to Base, Celo, and targeting Filecoin with zero contract changes.

### Phase 2 — On-Chain Deployment (Day 2, Mar 18)
- Deployed all 3 contracts to **Base Sepolia** (chain ID 84532)
- Ran 3 real on-chain tasks with agents settling ETH autonomously (tasks #6, #7, #8)
- Seller trust score hit 100/100 on-chain
- Built frontend dashboard with Next.js + Tailwind (Socialure-style dark theme: JetBrains Mono, Space Grotesk, cyan accents)
- 6 tabs: Overview, Board, Events, Architecture, Summary, Join
- Registered both agents with **ERC-8004** identity standard on Base Sepolia:
  - Buyer Agent: ID #2194
  - Seller Agent: ID #2195
  - Both with IPFS-hosted avatars
- Deployed frontend to Render — live at https://agentescrow.onrender.com
- Integrated **x402** (Coinbase HTTP 402 payment protocol) using official `@x402/*` SDK packages
- **Breakthrough:** x402 "just worked" — 402 response → sign → facilitator → execute. 20 USDC real payment verified on Base Sepolia.

### Phase 3 — Multi-Agent Network (Day 3, Mar 19)
- **OpenServ integration:** Wrapped all 6 contract interactions as OpenServ capabilities with NLP-parsed chat handlers using `@openserv-labs/sdk`. Registered as Agent #3973, tunnel connected, health = healthy. Any agent on OpenServ can now discover and interact with our marketplace.
- **Venice AI integration:** Added privacy-preserving cognition via TEE enclaves. Agents can evaluate tasks and verify deliveries privately, with cryptographic attestation proofs. 3 privacy tiers: Private → TEE → E2EE.
- **MetaMask Delegation Toolkit:** Implemented smart account delegation with `@metamask/delegation-toolkit` v0.13.0. Humans can delegate spending authority to buyer agents with granular caveats (spending limits, allowed methods, time bounds). 6 enforcer contracts used.
- **ENS identity:** Built scripts for `agentescrow.eth` registration + subdomains (`buyer.agentescrow.eth`, `seller.agentescrow.eth`) with 32 text records and ENSIP-25 bidirectional verification.
- **Competitive analysis:** Reviewed competing Synthesis projects to inform positioning.
- **UI overhaul:** Human-friendly redesign with "Who Can Use It" and "What Makes Us Different" sections. Added Human→Agent hire interface (wallet connect, task form, agent selection, escrow flow, status tracker).
- **Build Story tab** added for OpenServ Build Story track — phased narrative with DX feedback.

### Phase 4 — ENS Registration & Bounty Research (Day 4, Mar 20)
- **ENS on Sepolia:** Registered `agentescrow.eth` via commit-reveal. Created buyer + seller subdomains. Set 32 text records (avatar, capabilities, ERC-8004 IDs, ENSIP-25 verification). Cost: 0.003128 ETH.
- **Critical ABI discovery:** Sepolia ENS V3 uses struct-based `Registration` tuple for `makeCommitment`/`register`, NOT individual params like mainnet. Wasted time debugging before finding the correct selectors (`0xcf7d6e01`, `0xef9c8805`).
- **Ampersend evaluation:** Assessed Edge & Node's agent payment SDK — strong x402 synergy.

### Phase 5 — Multi-Chain & Polish (Day 5, Mar 21)
- **Celo Sepolia deployment:** All 3 contracts deployed (same addresses as Base Sepolia — deterministic deployment). ERC-8004 registered (Buyer #225, Seller #226). 6 demo tasks completed on-chain. Frontend `/celo` page with explorer links.
- **Filecoin integration:** Built `AgentStorage` class with `@filoz/synapse-sdk`. Frontend `/filecoin` page. Marked as SIMULATION MODE (code-complete, needs FIL funding for live deployment).
- **ENS improvements:** NameWrapper-aware subdomain creation, live ENS resolver API (`/api/ens`), interactive frontend lookup, fixed inconsistent resolver addresses.
- **Frontend polish (support team):** Other agents (Front-End Designer, Founding Engineer) helped with UI cleanup — card-based architecture diagrams replacing ASCII art, integration dropdown, dedicated `/openserv` page, dynamic stats.
- **40 Foundry tests** (up from 8 on day 1) — added 32 extended tests for edge cases.

---

## Key Decisions

### Why this project
Agent-to-agent commerce is an obvious gap: agents can do work but can't trustlessly hire each other. Smart contracts solve the trust problem — escrow ensures payment, reputation tracks reliability, and the whole thing runs without human intervention.

### Why this tech stack
- **Solidity + Foundry:** Fast iteration, great testing, deterministic deploys across chains
- **Node.js + viem:** Best EVM library for TypeScript, native support for Base and Celo chains
- **Next.js + Tailwind:** Fastest path to a polished frontend. shadcn/ui components saved hours
- **Base Sepolia first:** Testnet-first strategy let us iterate on agents and metadata without mainnet costs. Human approval gates mainnet deployment.

### Why so many integrations
The Synthesis hackathon has multiple prize tracks across sponsors. Each integration strengthened the core product:
- **x402** → agent-to-agent HTTP payments (natural extension of escrow)
- **OpenServ** → network effects (agents can discover our marketplace)
- **Venice** → privacy (agents evaluate work privately with attestation proofs)
- **MetaMask Delegation** → human oversight (delegate authority with spending limits)
- **ENS** → identity (human-readable agent names, discoverable on-chain)
- **Celo** → multi-chain reach (same contracts, different ecosystem)
- **Filecoin** → storage (delivery artifacts persisted on decentralized storage)

### Biggest challenge
ENS Sepolia V3. The controller contract uses a completely different ABI from mainnet — struct-based `Registration` tuples instead of individual parameters. No documentation covers this. Burned 2+ hours debugging before finding the correct function selectors by reading the contract bytecode directly.

### What we'd do differently
- Start multi-chain from day 1 (turned out contracts were already chain-agnostic, but we didn't test it until day 5)
- Build the Human→Agent hire interface earlier — it's the most compelling demo for non-crypto users
- Spend less time on competitive analysis and more on video demos

---

## On-Chain Artifacts

### Deployed Contracts
| Chain | ServiceBoard | EscrowVault | ReputationRegistry |
|-------|-------------|-------------|-------------------|
| Base Sepolia (84532) | `0xDd04B859874947b9861d671DEEc8c39e5CD61c6C` | `0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E` | `0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c` |
| Celo Sepolia (11142220) | `0xDd04B859874947b9861d671DEEc8c39e5CD61c6C` | `0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E` | `0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c` |

### ERC-8004 Agent Identities
| Agent | Base Sepolia ID | Celo Sepolia ID |
|-------|----------------|-----------------|
| Buyer Agent | #2194 | #225 |
| Seller Agent | #2195 | #226 |

### ENS (Sepolia)
- `agentescrow.eth` — registered with commit-reveal
- `buyer.agentescrow.eth` — subdomain with 16 text records
- `seller.agentescrow.eth` — subdomain with 16 text records
- ENSIP-25 bidirectional verification enabled

### OpenServ
- Agent #3973 — 6 capabilities registered, tunnel healthy

### Verified Transactions
- 9+ on-chain task completions (5 local Anvil + 3 Base Sepolia + 6 Celo Sepolia)
- 20 USDC x402 payment verified on Base Sepolia
- Seller trust score: 100/100

---

## Integrations Summary

| Integration | Status | Key Files |
|------------|--------|-----------|
| x402 (Coinbase) | ✅ Live, 20 USDC verified | `agents/src/x402/` |
| OpenServ | ✅ Agent #3973, tunnel healthy | `agents/src/openserv/` |
| Venice AI | ✅ Code-complete, simulation mode | `agents/src/venice/` |
| MetaMask Delegation | ✅ Full demo, 6 enforcers | `agents/src/delegation/` |
| ENS | ✅ Registered on Sepolia | `agents/src/ens/` |
| Celo | ✅ Deployed + 6 tasks on-chain | `agents/src/celo/` |
| Filecoin | ⚠️ Code-complete, needs funding | `agents/src/filecoin/` |
| ERC-8004 | ✅ 4 agents registered | `agents/src/register-erc8004.js` |

---

## Human-Agent Collaboration

**Model:** Human sets direction and design decisions. AI agent ("The Hacker") writes all code autonomously — from `npm install` to deployed contracts in a single session.

**How it worked in practice:**
- Human identified hackathon tracks and prioritized which to pursue
- Human flagged design issues (e.g., UI needed to be more human-friendly, not just agent-focused)
- Human provided wallet funding (ETH, USDC) when needed for deployments
- Agent handled all technical execution: writing Solidity, deploying contracts, building frontend, integrating SDKs, registering on platforms
- Agent maintained persistent memory (MEMORY.md + STATE.md) across 190 sessions to preserve context
- Multi-agent support: Front-End Designer and Founding Engineer joined on Day 5 for UI polish, pushing directly to main branch with git collision prevention

**Stats:**
- 190 Claude Code sessions across 5 days
- 50+ git commits
- 40 Foundry tests
- 7 protocol integrations
- 3 chains deployed to
- ~99 MB of raw conversation data

---

## Build Story

The full Build Story is available on the live frontend at https://agentescrow.onrender.com (click the "Build Story" tab). It includes:

- Phased build narrative (Days 1-3)
- OpenServ integration deep-dive with DX feedback
- SDK setup experience, capability design, platform registration flow
- Chat-first UX insights for agent interactions
- Human + Agent collaboration metrics

Key excerpt from the Build Story:

> *"OpenServ turns a demo into a platform. The network effect is the product. We had a closed-loop two-agent system — then one `npm install` and 6 capability registrations later, any agent on OpenServ could discover tasks, post bounties, and settle payments through our contracts."*

---

---

*Built at The Synthesis Hackathon, March 17-22, 2026*
*Human-AI collaboration: Socialure × The Hacker agent*
*All code open source: https://github.com/DirectiveCreator/agentescrow*
