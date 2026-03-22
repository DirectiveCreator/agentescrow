# Filecoin Onchain Cloud Integration — Progress Tracker

## Bounty Target
- **Track**: Filecoin Foundation — "Best Use Case with Agentic Storage"
- **Prize**: $2,000
- **Requirement**: Real-world use case on FOC mainnet with autonomous storage & retrieval

## Status: ✅ BUILT (Simulation Mode) | 🔒 Live Mode Needs Key

## What Was Built

### Backend — `agents/src/filecoin/`

| File | Description | Status |
|------|-------------|--------|
| `client.js` | `AgentStorage` class wrapping `@filoz/synapse-sdk` v0.40.0 | ✅ Done |
| `enhanced-seller.js` | Seller stores task results on FOC, submits PieceCID on-chain | ✅ Done |
| `enhanced-buyer.js` | Buyer retrieves from FOC via PieceCID, verifies, confirms delivery | ✅ Done |
| `demo.js` | 6-step standalone demo (simulation + real mode) | ✅ Done |
| `index.js` | Module barrel export | ✅ Done |

### Frontend

| Component | Description | Status |
|-----------|-------------|--------|
| Filecoin tab (main dashboard) | Hero stats, workflow, receipts, architecture diagram | ✅ Done |
| `/filecoin` page | Dedicated showcase: hero, workflow, SDK ref, quick start, bounty info | ✅ Done |
| `/api/filecoin` endpoint | API returning storage status + demo receipts | ✅ Done |

### Technical Details
- **SDK**: `@filoz/synapse-sdk` v0.40.0
- **Storage**: Filecoin Onchain Cloud (Warm tier)
- **Network**: Filecoin Mainnet (Chain 314), Calibration testnet supported
- **Payment Token**: USDFC ($2.50/TiB/month)
- **Escrow Chain**: Base Sepolia (Chain 84532)
- **Bridge**: PieceCID (content-addressed identifier)

## Architecture

```
Base Sepolia (Escrow)          Filecoin (Storage)
┌─────────────────┐           ┌──────────────────┐
│ ServiceBoard    │           │ Onchain Cloud    │
│ EscrowVault     │◄──────────│ (Synapse SDK)    │
│ ReputationReg   │  PieceCID │ Warm Storage     │
└─────────────────┘           │ PDP Proofs       │
                              └──────────────────┘
```

**Cross-chain flow:**
1. Buyer posts task → Base Sepolia (ServiceBoard)
2. Seller executes task → stores result on FOC → gets PieceCID
3. Seller submits PieceCID as `deliveryHash` on-chain (Base Sepolia)
4. Buyer retrieves content from FOC using PieceCID
5. Buyer verifies → confirms on-chain → escrow released
6. Content persists on Filecoin with Proof of Data Possession (PDP)

## What Gets Stored on FOC

| Category | Description | Use Case |
|----------|-------------|----------|
| Task Deliveries | Results of every completed task | Verifiable audit trail |
| Agent Memory | Session snapshots, capabilities, trust scores | Persistent agent state |
| TEE Attestations | Venice AI cryptographic proofs | Provable computation |
| Code Artifacts | Generated code, reviews, diffs | Immutable code history |

## Storage Payload Format
```json
{
  "version": "1.0",
  "protocol": "agentescrow",
  "type": "task_delivery",
  "timestamp": "2026-03-22T00:00:00.000Z",
  "taskId": 1,
  "taskType": "text_summary",
  "result": "...",
  "agent": {
    "address": "0x...",
    "erc8004Id": 2195
  },
  "attestation": {
    "model": "tee-deepseek-r1-671b",
    "provider": "venice.ai",
    "requestId": "...",
    "enclave": "..."
  },
  "chain": {
    "escrowChain": "base-sepolia",
    "storageChain": "filecoin-mainnet"
  }
}
```

## Demo Results

Demo runs successfully in simulation mode (`node agents/src/filecoin/demo.js`):

1. ✅ Store task delivery → PieceCID generated
2. ✅ Store code review → PieceCID generated
3. ✅ Store agent memory snapshot → PieceCID generated
4. ✅ Store TEE attestation → PieceCID generated
5. ✅ Retrieve & verify content → Content matches
6. ✅ Cost estimation → ~$2.50/TiB/month

## Blockers for Live Mode

| Blocker | What's Needed | Priority |
|---------|---------------|----------|
| `FILECOIN_PRIVATE_KEY` | Wallet private key for FOC transactions | 🔴 Required |
| FIL balance | Fund wallet with FIL for gas | 🔴 Required |
| USDFC balance | Fund wallet with USDFC for storage payments | 🔴 Required |

## Timeline

| Date | Milestone |
|------|-----------|
| 2026-03-22 | ✅ Full integration built: client, agents, demo, frontend, API |
| 2026-03-22 | ✅ `/filecoin` showcase page created |
| 2026-03-22 | ✅ Prize track added to hackathon dashboard |
| TBD | 🔒 Live FOC storage (needs private key + FIL/USDFC funding) |
| TBD | 🔒 Mainnet demo with real PieceCIDs |

## Git History
- Commit `d6e727f` — Initial Filecoin integration (client, agents, demo, frontend tab, API)
- `/filecoin` page created in same or subsequent commit

## Bounty Pitch
**Autonomous Agent Task Marketplace with Filecoin Onchain Cloud** — AI agents autonomously store task deliveries, memory snapshots, and TEE attestations on FOC. PieceCIDs bridge Base Sepolia (payments/escrow) and Filecoin Mainnet (content storage), creating a complete verifiable audit trail for agent-to-agent commerce. Every task result is content-addressed, PDP-proven, and permanently retrievable.
