/**
 * MetaMask Delegation Framework — Delegation Creation & Signing (v0.13.0 API)
 *
 * Creates scoped, time-limited, chainable delegations for the AgentEscrow system.
 * Human owners delegate specific authorities to AI agents with enforced guardrails.
 *
 * Delegation Types:
 *   1. Spending Delegation: Human → Buyer Agent (postTask with ETH limits)
 *   2. Confirmation Delegation: Human → Buyer Agent (confirmDelivery)
 *   3. Mediator Delegation: Buyer Agent → Mediator Agent (confirmDelivery re-delegation)
 *
 * All delegations are signed off-chain (EIP-712) and only enforced on-chain at redemption.
 *
 * v0.13.0 API uses scope-based delegation with typed caveats:
 *   - scope.type = 'functionCall' with targets[] and selectors[]
 *   - caveats use { type, ...config } format (e.g. { type: 'limitedCalls', limit: 10 })
 *   - environment param required (from getDeleGatorEnvironment)
 */

import {
  createDelegation,
  ROOT_AUTHORITY,
} from '@metamask/delegation-toolkit';
import {
  parseEther,
  toFunctionSelector,
} from 'viem';
import { getEnvironment, AGENTESCROW_CONTRACTS } from './setup.js';

// ─── Delegation Builders ────────────────────────────────────────────────────

/**
 * Create a SPENDING DELEGATION: Human → Buyer Agent
 *
 * Allows the buyer agent to call ServiceBoard.postTask() autonomously,
 * with enforced spending limits, call count limits, and time expiry.
 *
 * Scope: functionCall → auto-adds AllowedTargets + AllowedMethods enforcers
 * Additional caveats: valueLte, nativeTokenTransferAmount, limitedCalls, timestamp
 *
 * @param {Object} params
 * @param {string} params.humanAddress - Human's smart account address (delegator)
 * @param {string} params.buyerAddress - Buyer agent's smart account address (delegate)
 * @param {string} params.maxEthPerTask - Max ETH per task (e.g. "0.005")
 * @param {string} params.totalBudget - Total ETH budget (e.g. "0.02")
 * @param {number} params.maxTasks - Max number of tasks to post (e.g. 10)
 * @param {number} params.expiryHours - Hours until delegation expires (e.g. 24)
 * @returns {Object} Unsigned delegation object
 */
export function createSpendingDelegation({
  humanAddress,
  buyerAddress,
  maxEthPerTask = '0.005',
  totalBudget = '0.02',
  maxTasks = 10,
  expiryHours = 24,
}) {
  const env = getEnvironment();
  const serviceBoardAddr = AGENTESCROW_CONTRACTS.serviceBoard;
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

  return createDelegation({
    from: humanAddress,
    to: buyerAddress,
    environment: env,
    scope: {
      type: 'functionCall',
      targets: [serviceBoardAddr],
      selectors: [toFunctionSelector('function postTask(string,string,uint256)')],
    },
    caveats: [
      { type: 'valueLte', maxValue: parseEther(maxEthPerTask) },
      { type: 'nativeTokenTransferAmount', maxAmount: parseEther(totalBudget) },
      { type: 'limitedCalls', limit: maxTasks },
      { type: 'timestamp', afterThreshold: 0, beforeThreshold: expiryTimestamp },
    ],
  });
}

/**
 * Create a CONFIRMATION DELEGATION: Human → Buyer Agent
 *
 * Allows the buyer agent to call ServiceBoard.confirmDelivery() autonomously.
 * No ETH value needed (confirmDelivery is non-payable), limited by call count and time.
 *
 * @param {Object} params
 * @param {string} params.humanAddress - Human's smart account address
 * @param {string} params.buyerAddress - Buyer agent's smart account address
 * @param {number} params.maxConfirmations - Max confirmations allowed
 * @param {number} params.expiryHours - Hours until expiry
 * @returns {Object} Unsigned delegation object
 */
export function createConfirmationDelegation({
  humanAddress,
  buyerAddress,
  maxConfirmations = 10,
  expiryHours = 24,
}) {
  const env = getEnvironment();
  const serviceBoardAddr = AGENTESCROW_CONTRACTS.serviceBoard;
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

  return createDelegation({
    from: humanAddress,
    to: buyerAddress,
    environment: env,
    scope: {
      type: 'functionCall',
      targets: [serviceBoardAddr],
      selectors: [toFunctionSelector('function confirmDelivery(uint256)')],
    },
    caveats: [
      { type: 'limitedCalls', limit: maxConfirmations },
      { type: 'timestamp', afterThreshold: 0, beforeThreshold: expiryTimestamp },
    ],
  });
}

/**
 * Create a MEDIATOR RE-DELEGATION: Buyer Agent → Mediator Agent
 *
 * The buyer re-delegates confirmDelivery authority to a mediator agent
 * for automated quality verification. This creates a delegation chain:
 *   Human → Buyer → Mediator
 *
 * The mediator can only confirm (never post/spend), and the chain
 * inherits ALL restrictions from the parent delegation.
 *
 * @param {Object} params
 * @param {string} params.buyerAddress - Buyer agent's smart account address
 * @param {string} params.mediatorAddress - Mediator agent's smart account address
 * @param {Object} params.parentDelegation - The signed human→buyer confirmation delegation
 * @param {number} params.maxConfirmations - Max confirmations (must be <= parent's limit)
 * @param {number} params.expiryHours - Hours until expiry (must be <= parent's expiry)
 * @returns {Object} Unsigned delegation object
 */
export function createMediatorDelegation({
  buyerAddress,
  mediatorAddress,
  parentDelegation,
  maxConfirmations = 5,
  expiryHours = 12,
}) {
  const env = getEnvironment();
  const serviceBoardAddr = AGENTESCROW_CONTRACTS.serviceBoard;
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);

  return createDelegation({
    from: buyerAddress,
    to: mediatorAddress,
    environment: env,
    parentDelegation,
    scope: {
      type: 'functionCall',
      targets: [serviceBoardAddr],
      selectors: [toFunctionSelector('function confirmDelivery(uint256)')],
    },
    caveats: [
      { type: 'limitedCalls', limit: maxConfirmations },
      { type: 'timestamp', afterThreshold: 0, beforeThreshold: expiryTimestamp },
    ],
  });
}

/**
 * Sign a delegation using a smart account.
 * Uses the toolkit's signDelegation which handles EIP-712 typed data signing.
 *
 * @param {Object} smartAccount - The delegator's smart account instance
 * @param {Object} delegation - The unsigned delegation to sign
 * @returns {Promise<Object>} Signed delegation (same struct with signature field populated)
 */
export async function signDelegationWithAccount(smartAccount, delegation) {
  // signDelegation returns just the signature hex string
  const signature = await smartAccount.signDelegation({ delegation });
  // Return the full delegation struct with signature attached
  return { ...delegation, signature };
}

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Pretty-print a delegation for logging.
 */
export function describeDelegation(delegation, label = 'Delegation') {
  const env = getEnvironment();
  const enforcers = env.caveatEnforcers;

  const caveatDescriptions = delegation.caveats.map((c, i) => {
    const name = Object.entries(enforcers).find(
      ([_, addr]) => addr.toLowerCase() === c.enforcer.toLowerCase()
    )?.[0] || 'Unknown';
    return `    [${i}] ${name}`;
  });

  return [
    `  ${label}:`,
    `    Delegator: ${delegation.delegator}`,
    `    Delegate:  ${delegation.delegate}`,
    `    Authority: ${delegation.authority === ROOT_AUTHORITY ? 'ROOT (direct grant)' : delegation.authority.slice(0, 18) + '... (re-delegation)'}`,
    `    Caveats (${delegation.caveats.length}):`,
    ...caveatDescriptions,
    `    Signature: ${delegation.signature === '0x' ? '(unsigned)' : delegation.signature.slice(0, 18) + '...'}`,
  ].join('\n');
}
