/**
 * MetaMask Delegation Framework — Delegation Redemption
 *
 * Redeems signed delegations to execute ServiceBoard calls on behalf of the delegator.
 * When redeemed, the call appears to come FROM the delegator's smart account —
 * so msg.sender at ServiceBoard = delegator's address. This is the key insight
 * that makes delegations transparent to existing contracts.
 *
 * Redemption Flow:
 *   1. Agent encodes the target function call (e.g. postTask calldata)
 *   2. Agent builds a redemption with the signed delegation chain
 *   3. DelegationManager validates all caveats and signatures
 *   4. DelegationManager calls executeFromExecutor on the delegator's smart account
 *   5. Smart account executes the call → msg.sender = smart account address ✓
 */

import {
  redeemDelegations,
  ExecutionMode,
  createExecution,
} from '@metamask/delegation-toolkit';
import {
  encodeFunctionData,
  parseEther,
  getAddress,
} from 'viem';
import { publicClient, getBundlerClient, getEnvironment, ESCROUE_CONTRACTS } from './setup.js';

// ServiceBoard ABI fragments for encoding calldata
const SERVICE_BOARD_ABI = [
  {
    name: 'postTask',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'taskType', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'taskId', type: 'uint256' }],
  },
  {
    name: 'confirmDelivery',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'taskId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimTask',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'taskId', type: 'uint256' }],
    outputs: [],
  },
];

// ─── Execution Builders ─────────────────────────────────────────────────────

/**
 * Build an execution for ServiceBoard.postTask()
 *
 * @param {Object} params
 * @param {string} params.taskType - e.g. "text_summary"
 * @param {string} params.description - Task description
 * @param {number} params.deadlineSeconds - Seconds from now until deadline
 * @param {string} params.rewardEth - ETH reward as string (e.g. "0.001")
 * @returns {Object} Execution struct { target, value, callData }
 */
export function buildPostTaskExecution({ taskType, description, deadlineSeconds = 3600, rewardEth = '0.001' }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const callData = encodeFunctionData({
    abi: SERVICE_BOARD_ABI,
    functionName: 'postTask',
    args: [taskType, description, deadline],
  });

  return createExecution({
    target: getAddress(ESCROUE_CONTRACTS.serviceBoard),
    value: parseEther(rewardEth),
    callData,
  });
}

/**
 * Build an execution for ServiceBoard.confirmDelivery()
 *
 * @param {number} taskId - The task ID to confirm
 * @returns {Object} Execution struct
 */
export function buildConfirmDeliveryExecution(taskId) {
  const callData = encodeFunctionData({
    abi: SERVICE_BOARD_ABI,
    functionName: 'confirmDelivery',
    args: [BigInt(taskId)],
  });

  return createExecution({
    target: getAddress(ESCROUE_CONTRACTS.serviceBoard),
    value: 0n,
    callData,
  });
}

// ─── Redemption ─────────────────────────────────────────────────────────────

/**
 * Redeem a delegation to execute a ServiceBoard call.
 *
 * This is the core function — it takes a signed delegation chain and an execution,
 * then calls DelegationManager.redeemDelegations() which:
 *   1. Validates all signatures in the delegation chain
 *   2. Runs beforeHook on every caveat enforcer
 *   3. Executes the call from the delegator's smart account
 *   4. Runs afterHook on every caveat enforcer
 *
 * @param {Object} params
 * @param {Object} params.walletClient - The delegate's wallet client (who is redeeming)
 * @param {Object[]} params.delegationChain - Array of signed delegations (from root to leaf)
 * @param {Object[]} params.executions - Array of Execution structs to execute
 * @param {string} params.mode - ExecutionMode (default: SingleDefault)
 * @returns {Promise<string>} Transaction hash
 */
export async function redeemDelegation({
  walletClient,
  delegationChain,
  executions,
  mode = ExecutionMode.SingleDefault,
}) {
  const env = getEnvironment();
  const delegationManagerAddress = env.DelegationManager;

  console.log(`  Redeeming delegation via DelegationManager @ ${delegationManagerAddress}`);
  console.log(`    Chain length: ${delegationChain.length} delegation(s)`);
  console.log(`    Executions:   ${executions.length}`);

  const txHash = await redeemDelegations(
    walletClient,
    publicClient,
    delegationManagerAddress,
    [{
      permissionContext: delegationChain,
      executions,
      mode,
    }]
  );

  console.log(`  ✅ Redeemed! TX: ${txHash}`);
  return txHash;
}

/**
 * Redeem a spending delegation to post a task on ServiceBoard.
 *
 * @param {Object} params
 * @param {Object} params.walletClient - Buyer agent's wallet
 * @param {Object} params.signedDelegation - Signed human→buyer spending delegation
 * @param {string} params.taskType - Task type
 * @param {string} params.description - Task description
 * @param {string} params.rewardEth - ETH reward
 * @param {number} params.deadlineSeconds - Seconds until deadline
 * @returns {Promise<string>} Transaction hash
 */
export async function redeemToPostTask({
  walletClient,
  signedDelegation,
  taskType,
  description,
  rewardEth = '0.001',
  deadlineSeconds = 3600,
}) {
  console.log(`\n  📋 Posting task via delegation: "${taskType}"`);
  console.log(`    Reward: ${rewardEth} ETH | Deadline: ${deadlineSeconds}s`);

  const execution = buildPostTaskExecution({
    taskType,
    description,
    deadlineSeconds,
    rewardEth,
  });

  return redeemDelegation({
    walletClient,
    delegationChain: [signedDelegation],
    executions: [execution],
  });
}

/**
 * Redeem a confirmation delegation to confirm task delivery.
 *
 * @param {Object} params
 * @param {Object} params.walletClient - Agent's wallet (buyer or mediator)
 * @param {Object[]} params.delegationChain - Chain of signed delegations
 *   - For buyer: [human→buyer confirmation delegation]
 *   - For mediator: [human→buyer delegation, buyer→mediator delegation]
 * @param {number} params.taskId - Task ID to confirm
 * @returns {Promise<string>} Transaction hash
 */
export async function redeemToConfirmDelivery({
  walletClient,
  delegationChain,
  taskId,
}) {
  console.log(`\n  ✅ Confirming delivery for task #${taskId} via delegation chain`);

  const execution = buildConfirmDeliveryExecution(taskId);

  return redeemDelegation({
    walletClient,
    delegationChain,
    executions: [execution],
  });
}

// ─── Simulation (No Bundler Required) ───────────────────────────────────────

/**
 * Simulate a delegation redemption without sending a transaction.
 * Useful for validation and demos without a bundler.
 *
 * @param {Object[]} delegationChain - Chain of signed delegations
 * @param {Object[]} executions - Executions to simulate
 * @returns {Object} Simulation result with encoded calldata
 */
export function simulateRedemption(delegationChain, executions) {
  const env = getEnvironment();

  // Build the raw calldata that would be sent to DelegationManager
  const result = {
    to: env.DelegationManager,
    delegationChainLength: delegationChain.length,
    executionCount: executions.length,
    caveatsPerDelegation: delegationChain.map(d => d.caveats.length),
    executions: executions.map(e => ({
      target: e.target,
      value: e.value.toString(),
      callDataLength: e.callData.length,
    })),
  };

  return result;
}

export { SERVICE_BOARD_ABI, ExecutionMode };
