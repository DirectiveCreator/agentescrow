#!/usr/bin/env node

/**
 * MetaMask Delegation Framework × AgentEscrow — Full Demo
 *
 * Demonstrates the complete delegation lifecycle:
 *
 *   Phase 1: Setup — Create smart accounts for human, buyer, seller, mediator
 *   Phase 2: Delegate — Human signs spending + confirmation delegations to buyer
 *   Phase 3: Re-Delegate — Buyer re-delegates confirmation authority to mediator
 *   Phase 4: Execute — Agents redeem delegations to operate ServiceBoard autonomously
 *
 * Two modes:
 *   - SIMULATION (default): Builds everything off-chain, shows what would happen
 *   - LIVE (PIMLICO_API_KEY set): Actually sends UserOperations on Base Sepolia
 *
 * Run: node agents/src/delegation/demo.js
 */

import { createSmartAccount, createAllAccounts, logAccount, publicClient, getEnvironment, AGENTESCROW_CONTRACTS } from './setup.js';
import {
  createSpendingDelegation,
  createConfirmationDelegation,
  createMediatorDelegation,
  signDelegationWithAccount,
  describeDelegation,
} from './delegate.js';
import {
  buildPostTaskExecution,
  buildConfirmDeliveryExecution,
  simulateRedemption,
  redeemToPostTask,
  redeemToConfirmDelivery,
  ExecutionMode,
} from './redeem.js';
import { config } from 'dotenv';
import { formatEther } from 'viem';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

// ─── Helpers ────────────────────────────────────────────────────────────────

function banner(text) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${text}`);
  console.log(`${'═'.repeat(70)}`);
}

function step(num, text) {
  console.log(`\n  [${'▸'.repeat(num)}] ${text}`);
}

// ─── Main Demo ──────────────────────────────────────────────────────────────

async function runDemo() {
  banner('🔐 MetaMask Delegation Framework × AgentEscrow Demo');
  console.log('  Building delegated agent autonomy with enforced guardrails\n');

  const isLive = !!process.env.PIMLICO_API_KEY;
  console.log(`  Mode: ${isLive ? '🟢 LIVE (sending real transactions)' : '🟡 SIMULATION (off-chain only)'}`);
  console.log(`  Chain: Base Sepolia (84532)`);
  console.log(`  ServiceBoard: ${AGENTESCROW_CONTRACTS.serviceBoard}`);

  // ── Phase 1: Smart Account Setup ──────────────────────────────────────

  banner('Phase 1: Smart Account Setup');
  console.log('  Creating HybridDeleGator smart accounts for all roles...\n');

  const accounts = await createAllAccounts();

  logAccount('👤 Human (wallet owner)', accounts.human);
  logAccount('🤖 Buyer Agent', accounts.buyer);
  logAccount('🛠️  Seller Agent', accounts.seller);
  logAccount('⚖️  Mediator Agent', accounts.mediator);

  // Show environment info
  const env = getEnvironment();
  console.log(`\n  DelegationManager: ${env.DelegationManager}`);
  console.log(`  EntryPoint:        ${env.EntryPoint}`);
  console.log(`  Enforcers loaded:  ${Object.keys(env.caveatEnforcers).length}`);

  // ── Phase 2: Create & Sign Delegations ────────────────────────────────

  banner('Phase 2: Delegation Creation & Signing');

  // 2a. Spending Delegation: Human → Buyer Agent
  step(1, 'Creating SPENDING delegation: Human → Buyer Agent');
  console.log('    Policy: Up to 0.005 ETH per task, 0.02 ETH total budget');
  console.log('    Limit:  10 task postings, expires in 24 hours');

  const spendingDelegation = createSpendingDelegation({
    humanAddress: accounts.human.address,
    buyerAddress: accounts.buyer.address,
    maxEthPerTask: '0.005',
    totalBudget: '0.02',
    maxTasks: 10,
    expiryHours: 24,
  });

  console.log('\n  Unsigned delegation:');
  console.log(describeDelegation(spendingDelegation, 'Spending'));

  // Sign the spending delegation
  step(2, 'Signing spending delegation (EIP-712)...');
  const signedSpending = await signDelegationWithAccount(
    accounts.human.smartAccount,
    spendingDelegation,
  );
  console.log(`    ✅ Signed! Sig: ${signedSpending.signature.slice(0, 42)}...`);

  // 2b. Confirmation Delegation: Human → Buyer Agent
  step(3, 'Creating CONFIRMATION delegation: Human → Buyer Agent');
  console.log('    Policy: Confirm up to 10 deliveries, expires in 24 hours');

  const confirmationDelegation = createConfirmationDelegation({
    humanAddress: accounts.human.address,
    buyerAddress: accounts.buyer.address,
    maxConfirmations: 10,
    expiryHours: 24,
  });

  console.log('\n  Unsigned delegation:');
  console.log(describeDelegation(confirmationDelegation, 'Confirmation'));

  step(4, 'Signing confirmation delegation (EIP-712)...');
  const signedConfirmation = await signDelegationWithAccount(
    accounts.human.smartAccount,
    confirmationDelegation,
  );
  console.log(`    ✅ Signed! Sig: ${signedConfirmation.signature.slice(0, 42)}...`);

  // ── Phase 3: Re-Delegation (Buyer → Mediator) ────────────────────────

  banner('Phase 3: Delegation Chain — Buyer Re-Delegates to Mediator');
  console.log('  The buyer agent delegates confirmDelivery authority to a mediator.');
  console.log('  This creates a 2-link chain: Human → Buyer → Mediator');
  console.log('  The mediator inherits ALL restrictions from both delegations.\n');

  step(5, 'Creating MEDIATOR re-delegation: Buyer → Mediator');
  console.log('    Policy: Confirm up to 5 deliveries, expires in 12 hours');
  console.log('    Chain:  Human → Buyer → Mediator (narrowing only)');

  const mediatorDelegation = createMediatorDelegation({
    buyerAddress: accounts.buyer.address,
    mediatorAddress: accounts.mediator.address,
    parentDelegation: signedConfirmation,
    maxConfirmations: 5,
    expiryHours: 12,
  });

  console.log('\n  Unsigned delegation:');
  console.log(describeDelegation(mediatorDelegation, 'Mediator'));

  step(6, 'Signing mediator delegation (EIP-712)...');
  const signedMediator = await signDelegationWithAccount(
    accounts.buyer.smartAccount,
    mediatorDelegation,
  );
  console.log(`    ✅ Signed! Sig: ${signedMediator.signature.slice(0, 42)}...`);

  // ── Phase 4: Simulated Execution ──────────────────────────────────────

  banner('Phase 4: Delegation Redemption');

  // 4a. Buyer redeems spending delegation to post a task
  step(7, 'Buyer Agent redeems spending delegation → postTask()');
  const postExecution = buildPostTaskExecution({
    taskType: 'text_summary',
    description: 'Summarize the MetaMask Delegation Framework whitepaper',
    deadlineSeconds: 3600,
    rewardEth: '0.001',
  });

  console.log(`    Target:   ${postExecution.target} (ServiceBoard)`);
  console.log(`    Value:    ${formatEther(postExecution.value)} ETH`);
  console.log(`    Calldata: ${postExecution.callData.slice(0, 42)}... (${postExecution.callData.length} chars)`);

  const postSim = simulateRedemption([signedSpending], [postExecution]);
  console.log('\n    Simulation result:');
  console.log(`      DelegationManager: ${postSim.to}`);
  console.log(`      Chain length:      ${postSim.delegationChainLength}`);
  console.log(`      Caveats checked:   ${postSim.caveatsPerDelegation.join(', ')}`);

  // 4b. Mediator redeems chain to confirm delivery
  step(8, 'Mediator Agent redeems delegation chain → confirmDelivery()');
  console.log('    Chain: [Human→Buyer, Buyer→Mediator] (2-link)');

  const confirmExecution = buildConfirmDeliveryExecution(42);
  console.log(`    Target:   ${confirmExecution.target} (ServiceBoard)`);
  console.log(`    TaskId:   42`);
  console.log(`    Value:    0 ETH (non-payable)`);

  const confirmSim = simulateRedemption(
    [signedConfirmation, signedMediator],
    [confirmExecution],
  );
  console.log('\n    Simulation result:');
  console.log(`      DelegationManager: ${confirmSim.to}`);
  console.log(`      Chain length:      ${confirmSim.delegationChainLength}`);
  console.log(`      Caveats per link:  ${confirmSim.caveatsPerDelegation.join(' → ')}`);

  // ── Phase 5: Live Execution (if bundler available) ────────────────────

  if (isLive) {
    banner('Phase 5: LIVE On-Chain Execution');
    console.log('  Sending real transactions via ERC-4337 bundler...\n');

    try {
      const { getWalletClient } = await import('../config.js');
      const buyerWallet = getWalletClient(process.env.BUYER_PRIVATE_KEY);

      // Post task via delegation
      step(9, 'LIVE: Posting task via delegation redemption...');
      const postTx = await redeemToPostTask({
        walletClient: buyerWallet,
        signedDelegation: signedSpending,
        taskType: 'text_summary',
        description: 'Delegated task: summarize MM delegation framework',
        rewardEth: '0.001',
      });
      console.log(`    TX Hash: ${postTx}`);
    } catch (err) {
      console.log(`    ⚠️  Live execution failed: ${err.message}`);
      console.log('    This is expected if smart accounts are not yet deployed on-chain.');
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────

  banner('🏁 Demo Complete');
  console.log(`
  What we demonstrated:

  ✅ Phase 1: Created 4 HybridDeleGator smart accounts (counterfactual)
     - Human, Buyer Agent, Seller Agent, Mediator Agent
     - All derived deterministically from EOA keys + salts

  ✅ Phase 2: Created & signed 2 root delegations (off-chain, EIP-712)
     - Spending: Human → Buyer (postTask, 0.005 ETH/task, 0.02 ETH total, 10 calls, 24h)
     - Confirmation: Human → Buyer (confirmDelivery, 10 calls, 24h)

  ✅ Phase 3: Created delegation chain (re-delegation)
     - Human → Buyer → Mediator (confirmDelivery, 5 calls, 12h)
     - Mediator authority is NARROWER than buyer's (fewer calls, shorter window)

  ✅ Phase 4: Simulated delegation redemption
     - Buyer redeems to post tasks (msg.sender = Human's smart account)
     - Mediator redeems chain to confirm delivery (2-link chain validated)

  Key insight: All ServiceBoard calls appear to come FROM the human's
  smart account — the delegations are transparent to the contract.
  Agents operate autonomously within human-set guardrails.

  Enforcer contracts used:
    - AllowedTargetsEnforcer:             Only ServiceBoard
    - AllowedMethodsEnforcer:             Only specific functions
    - ValueLteEnforcer:                   Max ETH per call
    - NativeTokenTransferAmountEnforcer:  Total spending budget
    - LimitedCallsEnforcer:               Max number of calls
    - TimestampEnforcer:                  Time-limited validity

  On-chain artifacts:
    - DelegationManager: ${env.DelegationManager}
    - ServiceBoard:      ${AGENTESCROW_CONTRACTS.serviceBoard}
    - Chain:             Base Sepolia (84532)
`);
}

// ─── Run ────────────────────────────────────────────────────────────────────

runDemo().catch(err => {
  console.error('\n❌ Demo failed:', err);
  process.exit(1);
});
