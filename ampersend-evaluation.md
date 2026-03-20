# Ampersend SDK Evaluation — Synthesis Hackathon Prize #126

**Prize**: $500 — "Best Agent Built with ampersend-sdk"
**Evaluated**: 2026-03-19

## What Ampersend Is

Ampersend is an **agent payment management platform** by **Edge & Node** (the team behind The Graph). It provides:
- Smart account wallets for autonomous AI agents
- Human operator dashboard for spend limits & monitoring
- Integration with **x402** (HTTP 402 payment protocol) and **Google A2A**
- Runs on **Base** (USDC payments)

**Key insight**: Ampersend wraps x402 with managed wallets + spend controls. We already have x402 integrated in AgentEscrow — Ampersend adds the wallet/treasury layer on top.

## SDK Details

| Property | Value |
|----------|-------|
| Package | `@ampersend_ai/ampersend-sdk` (TS) / `ampersend-sdk` (Python) |
| Version | 0.0.12 |
| GitHub | `edgeandnode/ampersend-sdk` (15 stars) |
| License | Apache 2.0 |
| Protocols | x402 HTTP, MCP (TS), A2A (Python) |

### Core Components
1. **Treasurer** — Authorizes payments, enforces spend limits
2. **Wallets** — EOA + ERC-4337 Smart Accounts with ERC-1271 signatures
3. **Client** — Auto-handles 402 payment flow (transparent to agent)
4. **Server** — Verifies payments on seller side

### Setup Requirements
1. Create agent at `app.staging.ampersend.ai` (testnet) — free
2. Get Smart Account address + session key
3. Fund with testnet USDC from `faucet.circle.com`
4. Set env vars, run

## Fit with AgentEscrow

**STRONG FIT** — Ampersend directly complements our architecture:

| AgentEscrow Component | Ampersend Addition |
|----------------------|-------------------|
| x402 payment layer | Managed wallets + spend limits via Treasurer |
| Seller agents | Can become paid A2A services accepting USDC |
| Buyer agents | Get smart account wallets with budget controls |
| ServiceBoard task matching | Could use A2A agent discovery protocol |

### Integration Concept: "Ampersend-Powered Agent Marketplace"

Replace our raw x402 layer with Ampersend SDK:
- **Buyer agent** gets an Ampersend smart account with spend limits
- **Seller agent** becomes a paid A2A/MCP service
- Payments flow through Ampersend's Treasurer (auditable, capped)
- Human operators see all agent spending in Ampersend dashboard

This is basically our x402 integration but with managed wallets + human controls.

## Effort Estimate

| Approach | Effort | Risk |
|----------|--------|------|
| Swap x402 layer → Ampersend SDK | 4-6 hours | Medium (SDK is v0.0.12) |
| Build standalone demo agent | 2-3 hours | Low (follow their examples) |
| Add Ampersend as optional payment backend | 3-4 hours | Low-Medium |

**Recommended approach**: Build a standalone demo agent that uses Ampersend SDK to:
1. Discover a paid service (could be our seller agent exposed as A2A)
2. Auto-pay for task execution via Treasurer
3. Show the payment flow with spend controls

## Recommendation

### ✅ BUILD — Low effort, good fit, $500 is easy money

**Why build**:
- 2-4 hours of work for $500
- We already understand x402 — Ampersend is just a managed wrapper
- Strong narrative: "AgentEscrow + Ampersend = managed agent marketplace payments"
- Working examples exist to crib from
- Testnet is free — no real USDC needed
- Very few competitors likely (15 GitHub stars = tiny ecosystem)

**Why it might not work**:
- SDK is v0.0.12 — could have bugs
- Requires signing up for their platform (staging)
- Prize might have few/no submissions and get cancelled

**What to build**: A TypeScript MCP agent that:
1. Uses Ampersend SDK for wallet management
2. Calls a paid tool/service with automatic x402 payment
3. Shows Treasurer enforcing spend limits
4. Ties into our AgentEscrow narrative (agent marketplace payments)

**Timeline**: 3-4 hours, can be done as a side quest without disrupting main submission work.
