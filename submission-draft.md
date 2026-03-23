# Escroue — Synthesis Hackathon Submission Draft

**Status: DRAFT — DO NOT SUBMIT**
**Last updated: 2026-03-22**

---

## Pre-Submission Checklist

### Blockers (Must Fix Before Publishing)

- [x] **Self-custody transfer COMPLETED** ✅ — `custodyType: "self_custody"`, owner: `0x02Ed3674AA39dDB33C3CFd6761a585fC35105600`, tx: `0x8d73b313b6a944acbb5f91657510ddba26c08129cbd5a59aa834c35c9aac90a1`, verified: 2026-03-22T18:43:49Z
- [x] **Conversation log** ✅ — structured markdown at `docs/build-log.md` in repo (6-phase timeline, 186 lines, covers full human-agent collaboration)
- [ ] **Video URL** — no demo video recorded yet (biggest force multiplier for Open Track)
- [ ] **Moltbook post** — script ready at `scripts/post-to-moltbook.js` (dry run verified), needs SIWA auth + human approval to post
- [x] **Cover image** ✅ — Cover.png (dedicated cover graphic)
- [x] **Screenshots/pictures** ✅ — 8 files in `docs/images/` — Escroue.jpeg (logo), Cover.png (cover), + 6 screenshots (Identity, Multi-chain, Metamask, Integration, CeloFeatures, SupportedStable)

### Ready

- [x] Team UUID confirmed: `b329b473066548038ebc520dd7652d7c`
- [x] We are team admin
- [x] Repo is public: https://github.com/DirectiveCreator/agentescrow
- [x] 11 track UUIDs verified against live catalog (see below)
- [x] API key working: `sk-synth-73fc...`
- [x] Deployed URL: https://escroue.com

---

## API Details

```
Base URL: https://synthesis.devfolio.co
Auth: Authorization: Bearer sk-synth-73fcf025dd79c11c0625ef381c50feee1f75deee72184dbb
Team UUID: b329b473066548038ebc520dd7652d7c
Participant UUID: 4819268e7ea044b49704b0afbef02ab9
Agent ID (on-chain): 33295
Current custody: SELF_CUSTODY ✅ (transferred 2026-03-22)
```

---

## Step 0: Self-Custody Transfer (REQUIRED FIRST)

```bash
# Step 1: Initiate transfer
curl -X POST https://synthesis.devfolio.co/participants/me/transfer/init \
  -H "Authorization: Bearer sk-synth-73fcf025dd79c11c0625ef381c50feee1f75deee72184dbb" \
  -H "Content-Type: application/json" \
  -d '{"targetOwnerAddress": "0x02Ed3674AA39dDB33C3CFd6761a585fC35105600"}'

# Step 2: Confirm transfer (use transferToken from step 1 response)
curl -X POST https://synthesis.devfolio.co/participants/me/transfer/confirm \
  -H "Authorization: Bearer sk-synth-73fcf025dd79c11c0625ef381c50feee1f75deee72184dbb" \
  -H "Content-Type: application/json" \
  -d '{
    "transferToken": "<TOKEN_FROM_STEP_1>",
    "targetOwnerAddress": "0x02Ed3674AA39dDB33C3CFd6761a585fC35105600"
  }'
```

⚠️ VERIFY the `targetOwnerAddress` in the init response matches `0x02Ed3674AA39dDB33C3CFd6761a585fC35105600` before confirming!

---

## Track UUIDs (11 tracks — verified against live catalog 2026-03-22)

| # | Track Name | Catalog UUID | Sponsor |
|---|-----------|-------------|---------|
| 1 | ENS Identity | `627a3f5a288344489fe777212b03f953` | ENS |
| 2 | Agents With Receipts — ERC-8004 | `3bf41be958da497bbb69f1a150c76af9` | Protocol Labs |
| 3 | Best OpenServ Build Story | `a73320342ae74465b8e71e5336442dc3` | OpenServ |
| 4 | Let the Agent Cook — No Humans Required | `10bd47fac07e4f85bda33ba482695b24` | Protocol Labs |
| 5 | Best Use of Delegations | `0d69d56a8a084ac5b7dbe0dc1da73e1d` | MetaMask |
| 6 | Ship Something Real with OpenServ | `9bd8b3fde4d0458698d618daf496d1c7` | OpenServ |
| 7 | Agent Services on Base | `6f0e3d7dcadf4ef080d3f424963caff5` | Base |
| 8 | Private Agents, Trusted Actions | `ea3b366947c54689bd82ae80bf9f3310` | Venice |
| 9 | Best Agent on Celo | `ff26ab4933c84eea856a5c6bf513370b` | Celo |
| 10 | Synthesis Open Track | `fdb76d08812b43f6a5f454744b66f590` | Synthesis Community |
| 11 | Best Use Case with Agentic Storage | `49a19e54cdde48a6a22bd7604d07292e` | Filecoin Foundation |

**Note**: Open Track does NOT count toward the 10-track limit, so we have 10 + Open Track = 11 total. ✅

---

## Draft Project Body (POST /projects)

```json
{
  "teamUUID": "b329b473066548038ebc520dd7652d7c",
  "name": "Escroue",
  "description": "Escroue lets AI agents hire each other. One agent posts a task, another picks it up, payment sits in escrow until the work's done. Three smart contracts on Base handle the whole thing: ServiceBoard posts the jobs, EscrowVault holds the funds, ReputationRegistry tracks who delivers and who doesn't. Agents get on-chain identities through ERC-8004, spend within MetaMask delegation limits, and pay over x402. Venice AI evaluates deliverables privately so neither side can game the review. No human in the loop. No middleman holding the money.",
  "problemStatement": "AI agents are increasingly capable of performing useful work — writing code, analyzing data, generating content — but they have no trustless way to transact with each other. Today, agent-to-agent payments require centralized intermediaries, manual human approval, or blind trust. If Agent A wants to hire Agent B for a task, there's no mechanism to (1) lock payment until work is verified, (2) track B's reliability over time, or (3) resolve disputes without a human in the loop. This means agents can't form autonomous supply chains, can't build reputation, and can't participate in open markets. Escroue solves this with smart contract escrow (payment locked until delivery is confirmed), an on-chain reputation registry (trust scores computed from completed tasks), and ERC-8004 identity (agents are discoverable and verifiable across chains). The result: a permissionless labor market for AI agents, governed entirely by code.",
  "repoURL": "https://github.com/DirectiveCreator/agentescrow",
  "trackUUIDs": [
    "fdb76d08812b43f6a5f454744b66f590",
    "627a3f5a288344489fe777212b03f953",
    "3bf41be958da497bbb69f1a150c76af9",
    "a73320342ae74465b8e71e5336442dc3",
    "10bd47fac07e4f85bda33ba482695b24",
    "0d69d56a8a084ac5b7dbe0dc1da73e1d",
    "9bd8b3fde4d0458698d618daf496d1c7",
    "6f0e3d7dcadf4ef080d3f424963caff5",
    "ea3b366947c54689bd82ae80bf9f3310",
    "ff26ab4933c84eea856a5c6bf513370b",
    "49a19e54cdde48a6a22bd7604d07292e"
  ],
  "conversationLog": "Full structured build log at docs/build-log.md: https://github.com/DirectiveCreator/agentescrow/blob/main/docs/build-log.md — 6-phase timeline (Days 1-6, Mar 17-22), human-agent collaboration model (190+ sessions, 50+ commits, 66 tests), on-chain artifacts across 4 chains (Base Mainnet, Base Sepolia, Celo Sepolia, local Anvil), 7 protocol integrations, and Build Story narrative. Includes key decisions, biggest challenges (ENS Sepolia V3 ABI), and what we'd do differently.",
  "submissionMetadata": {
    "agentFramework": "other",
    "agentFrameworkOther": "Custom Node.js agent harness with viem for EVM interaction — autonomous buyer/seller agents that discover tasks, execute work, and settle payments via smart contracts",
    "agentHarness": "claude-code",
    "model": "claude-sonnet-4-6",
    "skills": [
      "superpowers:brainstorming",
      "superpowers:test-driven-development",
      "superpowers:verification-before-completion",
      "superpowers:systematic-debugging",
      "superpowers:dispatching-parallel-agents",
      "superpowers:writing-plans",
      "superpowers:executing-plans",
      "superpowers:requesting-code-review",
      "solidity-auditor"
    ],
    "tools": [
      "Foundry",
      "Next.js",
      "viem",
      "wagmi",
      "Tailwind CSS",
      "@x402/express",
      "@x402/fetch",
      "@openserv-labs/sdk",
      "@metamask/delegation-toolkit",
      "@filoz/synapse-sdk",
      "ethers.js",
      "IPFS",
      "Render",
      "Base Mainnet",
      "Base Sepolia",
      "Celo Sepolia",
      "ENS",
      "ERC-8004 IdentityRegistry"
    ],
    "helpfulResources": [
      "https://synthesis.md/skill.md",
      "https://viem.sh/docs",
      "https://docs.openserv.dev",
      "https://docs.metamask.io/delegation-toolkit/",
      "https://docs.ens.domains/",
      "https://eips.ethereum.org/EIPS/eip-8004",
      "https://x402.org",
      "https://docs.venice.ai/api-reference/",
      "https://book.getfoundry.sh/"
    ],
    "helpfulSkills": [
      {
        "name": "superpowers:systematic-debugging",
        "reason": "Unblocked the ENS Sepolia V3 registration — the controller uses struct-based Registration tuples instead of individual params. Without systematic debugging we would have spent much longer finding the correct function selectors (0xcf7d6e01, 0xef9c8805)."
      },
      {
        "name": "superpowers:dispatching-parallel-agents",
        "reason": "On Day 5 we had the Front-End Designer, Founding Engineer, and Research Analyst all pushing to main simultaneously. Parallel dispatch let us ship Celo deployment, Filecoin integration, and frontend polish in the same session."
      },
      {
        "name": "solidity-auditor",
        "reason": "Caught reentrancy risks in EscrowVault before deployment. Led to adding ReentrancyGuard and the emergency pause mechanism that made the security audit track viable."
      }
    ],
    "intention": "continuing",
    "intentionNotes": "Escroue will continue as core infrastructure in the Socialure agent ecosystem. Post-hackathon plans: mainnet deployment on Base, integration with more agent frameworks (Eliza, AutoGPT), and adding stablecoin (USDC) escrow alongside ETH. The multi-chain architecture is already proven — expanding to additional L2s is straightforward.",
    "moltbookPostURL": "TODO — NEED TO POST ON MOLTBOOK"
  },
  "deployedURL": "https://escroue.com",
  "videoURL": "TODO — NEED TO RECORD DEMO VIDEO",
  "logoURL": "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/agentescrow/docs/images/Main.jpeg",
  "pictures": [
    "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Identity.png",
    "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Multi-chain.png",
    "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Metamask.png",
    "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Integration.png",
    "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/CeloFeatures.png",
    "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/SupportedStable.png"
  ],
  "coverImageURL": "https://raw.githubusercontent.com/DirectiveCreator/agentescrow/main/docs/images/Cover.png"
}
```

---

## Conversation Log (Draft)

The `conversationLog` field needs a structured markdown summary. Here's the draft:

```markdown
# Escroue — Human-Agent Collaboration Log

## Participants
- **Human**: Directive Creator (@escapation) — direction, design decisions, wallet funding, strategic review
- **Agent**: The Hacker (Claude Sonnet 4.6 via Claude Code) — all code execution, deployments, integrations, documentation

## Build Timeline (5 days, March 17-22, 2026)

### Day 1 — Core Marketplace (Mar 17)
- Human: "Build a trustless escrow marketplace where AI agents can hire each other"
- Agent: Designed 3 Solidity contracts (ServiceBoard, EscrowVault, ReputationRegistry), wrote 40 Foundry tests, built buyer/seller agent harness in Node.js, ran 5 full task lifecycles on local Anvil
- Key decision: Keep contracts chain-agnostic from day 1 (paid off massively for multi-chain later)

### Day 2 — On-Chain Deployment (Mar 18)
- Agent: Deployed to Base Sepolia, ran 3 real on-chain tasks, registered ERC-8004 identities (Buyer #2194, Seller #2195)
- Agent: Built frontend dashboard (Next.js + Tailwind), deployed to Render
- Agent: Integrated x402 payment protocol — 20 USDC real payment verified on Base Sepolia
- Human: Provided ETH + USDC funding for testnet operations

### Day 3 — Multi-Agent Network (Mar 19)
- Agent: OpenServ integration — Agent #3973 registered, 6 capabilities, tunnel connected
- Agent: Venice AI TEE privacy integration — private task evaluation with attestation proofs
- Agent: MetaMask Delegation Toolkit — smart account delegation with 6 enforcer contracts
- Agent: ENS identity scripts — agentescrow.eth registration + subdomains
- Human: Directed UI overhaul — "make it human-friendly, not just agent-focused"
- Human: Prioritized bounty tracks, directed competitive analysis
- Pivot: Added Human→Agent hire interface based on human feedback

### Day 4 — ENS Registration & Polish (Mar 20)
- Agent: Registered agentescrow.eth on Sepolia via commit-reveal, created buyer/seller subdomains, set 32 text records + ENSIP-25 bidirectional verification
- Major debugging: ENS Sepolia V3 uses different ABI (struct-based Registration tuple) — 2+ hours to find correct selectors
- Human: Evaluated Ampersend SDK — decided strong fit but deprioritized for time

### Day 5 — Multi-Chain & Hardening (Mar 21-22)
- Agent: Deployed to Celo Sepolia (same contract addresses — deterministic deployment), registered ERC-8004 on Celo (#225, #226), ran 6 demo tasks
- Agent: Built Filecoin AgentStorage integration with @filoz/synapse-sdk
- Agent: Emergency pause + UUPS proxy upgrade — security hardening, 66 Foundry tests
- Agent: V2 UUPS proxy deployment to Base Sepolia — new proxy addresses
- Human: Coordinated multi-agent support team (Front-End Designer, Founding Engineer, Research Analyst) for parallel workstreams
- Human: Directed final track selection — cut from 14 to 11 tracks based on confidence analysis

## Key Stats
- 190+ Claude Code sessions
- 50+ git commits
- 66 Foundry tests passing
- 7 protocol integrations
- 4 chains (Base Mainnet, Base Sepolia, Celo Sepolia, local Anvil)
- 9+ on-chain task completions verified
- Seller trust score: 100/100

## On-Chain Artifacts
- Base Sepolia V2 (UUPS): ServiceBoard `0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2`, EscrowVault `0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579`, ReputationRegistry `0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df`
- Celo Sepolia: ServiceBoard `0xDd04B859874947b9861d671DEEc8c39e5CD61c6C`, EscrowVault `0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E`, ReputationRegistry `0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c`
- ERC-8004: Buyer #2194, Seller #2195 (Base Sepolia); Buyer #225, Seller #226 (Celo Sepolia)
- ENS: agentescrow.eth + buyer.agentescrow.eth + seller.agentescrow.eth (Sepolia)
- OpenServ: Agent #3973

## Full conversation data: See docs/build-log.md in repo
```

---

## What's Still Missing (Action Items)

### ✅ BLOCKERS (ALL RESOLVED)

| # | Item | Status |
|---|------|--------|
| 1 | **Self-custody transfer** | ✅ DONE — transferred to `0x02Ed3674AA39dDB33C3CFd6761a585fC35105600` on 2026-03-22 |
| 2 | **Conversation log** | ✅ DONE — structured markdown at `docs/build-log.md` (6-phase timeline, on-chain artifacts, collaboration stats, build story) |
| 3 | **Base Mainnet deployment** | ✅ DONE — ServiceBoard `0x509a...fa1`, EscrowVault `0x3f67...c6`, ReputationRegistry `0x50de...fe2` |

### 🟡 STRONGLY RECOMMENDED (significantly improves scoring)

| # | Item | Action | Who |
|---|------|--------|-----|
| 3 | **Demo video** | Record 2-3 min walkthrough showing: contract deployment, agent task flow, frontend, multi-chain | Human + Agent — IN PROGRESS |
| 4 | **Moltbook post** | Script ready at `scripts/post-to-moltbook.js` — run to post via SIWA auth | Agent — READY TO EXECUTE |
| 5 | **Logo + Cover image** | ✅ Logo: `Escroue.jpeg`, Cover: `Cover.png` — pushed to GitHub | ✅ DONE |
| 6 | **Screenshots** | ✅ 6 screenshots in `docs/images/` — GitHub raw URLs in submission JSON | ✅ DONE |

### 🟢 NICE TO HAVE

| # | Item | Action | Who |
|---|------|--------|-----|
| 7 | ~~**Base Mainnet deployment**~~ | ✅ DEPLOYED | ✅ Done |
| 8 | **Venice API key** | ✅ RECEIVED — saved to `.env` and `/Users/agents/.secrets/venice-api-key` | ✅ Done |
| 9 | **Tweet about project** | Post on X tagging @synthesis_md after publishing | Human + Agent |
| 10 | **Mainnet ERC-8004** | Register agent identities on Base Mainnet | Agent (next step) |
| 11 | **Mainnet demo tasks** | Run real agent tasks on mainnet to show live activity | Agent (needs small ETH) |

---

## Submission Command (DO NOT RUN — FOR REFERENCE ONLY)

```bash
# Create draft project
curl -X POST https://synthesis.devfolio.co/projects \
  -H "Authorization: Bearer sk-synth-73fcf025dd79c11c0625ef381c50feee1f75deee72184dbb" \
  -H "Content-Type: application/json" \
  -d '<INSERT FINAL JSON FROM ABOVE>'

# After creating draft, publish (only after self-custody + all fields ready):
curl -X POST https://synthesis.devfolio.co/projects/<PROJECT_UUID>/publish \
  -H "Authorization: Bearer sk-synth-73fcf025dd79c11c0625ef381c50feee1f75deee72184dbb"
```

---

## Quick Reference

| Field | Value | Status |
|-------|-------|--------|
| teamUUID | `b329b473066548038ebc520dd7652d7c` | ✅ Confirmed |
| participantId | `4819268e7ea044b49704b0afbef02ab9` | ✅ |
| Agent on-chain ID | 33295 | ✅ |
| Wallet (self-custody) | `0x02Ed3674AA39dDB33C3CFd6761a585fC35105600` | ✅ Transferred |
| API Key | `sk-synth-73fc...` (full in docs/synthesis-registration.md) | ✅ |
| Repo | https://github.com/DirectiveCreator/agentescrow | ✅ Public |
| Deployed | https://escroue.com | ✅ Live |
| Track count | 11 (10 + Open Track) | ✅ Within limits |
| Self-custody | ✅ SELF_CUSTODY | ✅ Transferred |
| Conversation log | `docs/build-log.md` | ✅ Complete |
| Base Mainnet | SB `0x509a...`, EV `0x3f67...`, RR `0x50de...` | ✅ Deployed |
| Venice API key | ✅ Saved to .env + secrets | ✅ Received |
| Logo | `docs/images/Escroue.jpeg` | ✅ Ready |
| Screenshots | 6 PNGs in `docs/images/` | ✅ Ready |
| Cover image | `docs/images/Cover.png` | ✅ Ready |
| Moltbook post | Script ready, needs human approval to execute | 🟡 Ready to post |
| Video | ❌ Not recorded | 🟡 In progress |
