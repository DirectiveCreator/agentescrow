# MetaMask Delegation Framework — Integration Evaluation for AgentEscrow

**Date**: 2026-03-19
**Bounty**: $5,000 (1st: $3K, 2nd: $1.5K, 3rd: $500) — "Best Use of Delegations"
**Verdict**: ✅ **PURSUE** — Strong architectural fit, 6-10 hours effort, high bounty value

---

## 1. What Is the MetaMask Delegation Framework?

An on-chain permissions system (now branded "Smart Accounts Kit") that lets account owners **delegate granular, scoped authority** to other accounts. Delegations are:
- **Signed off-chain** (EIP-712) — zero gas to create
- **Redeemed on-chain** via `DelegationManager.redeemDelegations()`
- **Scoped by caveats** — spending caps, time windows, call limits, target restrictions
- **Chainable** — delegates can re-delegate (sub-delegations)

**Key Standards**: ERC-7710 (redemption), ERC-7715 (permission grants), EIP-7702 (EOA→smart account), ERC-4337 (account abstraction)

**SDK**: `@metamask/smart-accounts-kit` (v0.3.0, previously `@metamask/delegation-toolkit`)
**Chains**: ✅ Base Sepolia, ✅ Base Mainnet — both supported
**Contracts**: Already deployed on all supported chains — no need to deploy framework contracts

---

## 2. Current AgentEscrow Architecture (Gap Analysis)

| Aspect | Current Design | Delegation Opportunity |
|--------|---------------|----------------------|
| **Agent auth** | Raw EOA private keys | Smart accounts with delegation chains |
| **Buyer confirms** | Only `msg.sender == buyer` can call `confirmDelivery()` | Buyer delegates confirmation authority to mediator agent |
| **Task posting** | Buyer directly funds with ETH | Human delegates spending budget to AI buyer agent |
| **Fund release** | ServiceBoard calls vault directly | Delegation-gated release with multi-party approval |
| **Agent teams** | Single buyer, single seller | Hierarchical delegation: org → team lead → worker agents |

**Critical gap**: AgentEscrow has **zero delegation capability** today. All authority is msg.sender-based. This is actually a *feature* for the bounty — we can show a clear before/after transformation.

---

## 3. Integration Concepts (Ranked)

### 🥇 Concept A: "Delegated Agent Autonomy" — Human→Agent Spending Delegation
**The pitch**: A human wallet owner delegates a **scoped spending budget** to their AI buyer agent via MetaMask smart accounts. The agent can autonomously post tasks and spend up to X ETH within a time window — no human approval per transaction.

**How it works**:
1. Human creates a MetaMask smart account (HybridDeleGator)
2. Human creates a delegation to the AI buyer agent's smart account:
   - Scope: `nativeTokenTransferAmount` (max 0.01 ETH)
   - Caveat: `AllowedTargetsEnforcer` (only ServiceBoard contract)
   - Caveat: `AllowedMethodsEnforcer` (only `postTask` selector)
   - Caveat: `TimestampEnforcer` (valid for 24 hours)
   - Caveat: `LimitedCallsEnforcer` (max 10 tasks)
3. AI buyer agent redeems the delegation to post tasks autonomously
4. When tasks complete, buyer agent can also confirm deliveries (separate delegation)

**Why it's novel**: Bridges **human oversight** with **agent autonomy** — the human sets guardrails, the agent operates freely within them. Perfect for the "AI agents in DeFi/escrow" narrative.

**Effort**: 4-6 hours
**Bounty fit**: ⭐⭐⭐⭐⭐ (exactly what "creative use of delegations" means)

---

### 🥈 Concept B: "Delegation Chain Dispute Resolution" — Hierarchical Agent Authority
**The pitch**: A buyer delegates `confirmDelivery` authority to a **mediator agent** who can verify work quality. The mediator can further sub-delegate to specialized review agents (code reviewer, content checker, etc.).

**How it works**:
1. Buyer creates smart account
2. Buyer delegates `confirmDelivery()` authority to Mediator agent
   - Caveat: `AllowedTargetsEnforcer` (ServiceBoard only)
   - Caveat: `AllowedMethodsEnforcer` (only `confirmDelivery`)
   - Caveat: `TimestampEnforcer` (delegation expires with task deadline)
3. Mediator sub-delegates specific task reviews to specialist agents
4. Specialist verifies delivery → redeems delegation chain → confirms on behalf of buyer

**Why it's novel**: Demonstrates **delegation chaining** (re-delegation) — a key framework feature. Creates a hierarchy: Human → Mediator → Specialist, mirroring real-world approval chains.

**Effort**: 6-8 hours (requires contract modifications for delegation-aware confirmation)
**Bounty fit**: ⭐⭐⭐⭐⭐ (showcases chaining, the framework's differentiator)

---

### 🥉 Concept C: "Open Delegation Bounty Board" — Anyone Can Complete, Scoped Release
**The pitch**: Post tasks as **open delegations** — any agent can claim and deliver. On delivery, a pre-signed delegation automatically authorizes fund release if caveats are met (e.g., delivery hash submitted, within deadline).

**How it works**:
1. Buyer creates an open delegation (no specific delegate)
2. Caveats enforce: correct task ID, valid delivery hash, within time window
3. Any seller agent redeems the delegation to trigger escrow release
4. NativeTokenPaymentEnforcer can require the seller to stake a small bond

**Why it's novel**: Turns the escrow into a **self-executing bounty** — no human confirmation needed if all caveats pass. Fully autonomous agent economy.

**Effort**: 8-12 hours (needs custom caveat enforcer for delivery validation)
**Bounty fit**: ⭐⭐⭐⭐ (creative but more complex)

---

## 4. Recommended Approach: Concept A + B Combined

**Build Concept A first** (Human→Agent delegation, 4-6 hours), then **layer Concept B** (mediator chain, 2-4 more hours) for a combined demo showing:
1. Human delegates spending authority to AI buyer agent (Concept A)
2. AI buyer agent posts tasks autonomously within budget
3. AI buyer agent delegates delivery confirmation to a mediator (Concept B)
4. Mediator confirms delivery on buyer's behalf
5. Full lifecycle: human sets policy → agents execute autonomously → funds flow

**Total effort**: 6-10 hours
**Unique angle**: Only project at Synthesis showing **AI agents as delegation recipients** — bridging the human-agent trust gap with on-chain permissions.

---

## 5. Technical Implementation Plan

### Phase 1: Smart Account Setup (2 hours)
```
- Install @metamask/smart-accounts-kit
- Create smart accounts for buyer, seller, mediator agents
- Set up bundler client (Pimlico or similar for Base Sepolia)
- Test: create and sign a basic delegation
```

### Phase 2: Buyer Spending Delegation (2-3 hours)
```
- Human creates delegation: buyer agent can call ServiceBoard.postTask()
- Caveats: spending cap, target restriction, time window, call limit
- Buyer agent redeems delegation to post tasks
- Test: full post-task flow via delegation
```

### Phase 3: Confirmation Delegation (2-3 hours)
```
- Buyer delegates confirmDelivery() to mediator agent
- Mediator verifies delivery quality (Venice TEE or simple check)
- Mediator redeems delegation to confirm on buyer's behalf
- Test: full lifecycle with delegated confirmation
```

### Phase 4: Demo & Polish (1-2 hours)
```
- Demo script showing complete delegation flow
- Frontend updates: show delegation status, active delegations
- Screenshot/recording for submission
```

### Dependencies
- **Bundler RPC**: Need an ERC-4337 bundler for Base Sepolia (Pimlico, Alchemy, etc.)
  - Pimlico free tier should suffice for hackathon
- **No contract changes for Phase 1-2**: Smart accounts wrap existing EOA interactions
- **Possible contract changes for Phase 3**: May need to allow delegated calls to reach ServiceBoard
  - Alternative: smart account executes the call directly (msg.sender = smart account address)

### Key Technical Detail
The MetaMask smart accounts act as **proxy wallets** — when an agent redeems a delegation, the DelegationManager calls the delegator's smart account, which then calls the target contract. So `msg.sender` at the ServiceBoard level is the **smart account address**, not the agent's EOA. This means:
- **Phase 2 works natively**: The smart account is the buyer, and it calls `postTask()`. No contract changes needed.
- **Phase 3 requires thought**: For `confirmDelivery()`, the buyer check is `msg.sender == tasks[taskId].buyer`. If the buyer is a smart account, and the mediator triggers via delegation, the call originates from the buyer's smart account — so `msg.sender == buyer` passes! This is elegant.

---

## 6. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Bundler setup complexity | Medium | Use Pimlico free tier, well-documented |
| Smart account deployment gas | Low | ~0.01 ETH on Base Sepolia (we have 0.035) |
| SDK version instability | Low | v0.3.0 is recent but has migration guides |
| Time overrun | Medium | Start with Phase 1-2 only (simpler, still bounty-worthy) |
| Contract incompatibility | Low | Smart accounts are transparent proxies — msg.sender works |

---

## 7. Competitive Advantage

Why this integration is bounty-worthy:
1. **Novel use case**: AI agents as delegation recipients — not just human→human
2. **Real escrow system**: Not a toy demo — actual fund custody and release
3. **Delegation chaining**: Human → buyer agent → mediator → specialist (multi-level)
4. **Existing on-chain artifacts**: Deployed contracts on Base Sepolia already
5. **ERC-8004 synergy**: Our agents have on-chain identity — delegation targets are verifiable agents
6. **Privacy layer**: Venice TEE verification + delegated confirmation = private + autonomous

---

## 8. Decision

### ✅ RECOMMEND: Pursue this integration

**Why**:
- $5K bounty with strong architectural fit
- 6-10 hours effort — achievable in remaining 6 days
- No contract changes needed for core functionality
- Adds genuine value to AgentEscrow (human oversight + agent autonomy)
- Differentiates us from other Synthesis projects
- Stacks with existing bounty targets (Base, Protocol Labs, OpenServ)

**Next step**: Get human approval, then start Phase 1 (smart account setup + basic delegation test).

---

## Appendix: SDK Quick Reference

```bash
npm install @metamask/smart-accounts-kit
```

```typescript
import {
  Implementation,
  toMetaMaskSmartAccount,
  createDelegation,
  createExecution,
  ExecutionMode,
} from "@metamask/smart-accounts-kit";
import { DelegationManager } from "@metamask/smart-accounts-kit/contracts";

// Create smart account
const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [ownerAddress, [], [], []],
  deploySalt: "0x",
  signer: { account: ownerAccount },
});

// Create scoped delegation
const delegation = createDelegation({
  to: delegateSmartAccount.address,
  from: delegatorSmartAccount.address,
  environment: delegatorSmartAccount.environment,
  scope: {
    type: "nativeTokenTransferAmount",
    maxAmount: parseEther("0.01"),
  },
});

// Sign + redeem
const signature = await delegatorSmartAccount.signDelegation({ delegation });
const signedDelegation = { ...delegation, signature };

const redeemCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]],
  modes: [ExecutionMode.SingleDefault],
  executions: [executions],
});
```

**Built-in Scope Types**: `erc20TransferAmount`, `erc20PeriodTransfer`, `erc20Streaming`, `erc721Transfer`, `nativeTokenTransferAmount`, `nativeTokenPeriodTransfer`, `nativeTokenStreaming`

**Built-in Caveat Enforcers**: `AllowedTargetsEnforcer`, `AllowedMethodsEnforcer`, `AllowedCalldataEnforcer`, `ERC20TransferAmountEnforcer`, `LimitedCallsEnforcer`, `TimestampEnforcer`, `BlockNumberEnforcer`, `ValueLteEnforcer`, `NativeTokenPaymentEnforcer`
