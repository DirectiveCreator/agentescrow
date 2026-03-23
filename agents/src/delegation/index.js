/**
 * MetaMask Delegation Framework — Escroue Integration
 *
 * Provides delegated agent autonomy:
 *   - Smart account creation for humans and AI agents
 *   - Scoped delegations with enforced guardrails
 *   - Delegation chains (re-delegation) for multi-agent workflows
 *   - Redemption to execute ServiceBoard calls through delegators' accounts
 *
 * @module delegation
 */

export {
  createSmartAccount,
  createAllAccounts,
  logAccount,
  publicClient,
  getBundlerClient,
  getEnvironment,
  ESCROUE_CONTRACTS,
} from './setup.js';

export {
  createSpendingDelegation,
  createConfirmationDelegation,
  createMediatorDelegation,
  signDelegationWithAccount,
  describeDelegation,
} from './delegate.js';

export {
  buildPostTaskExecution,
  buildConfirmDeliveryExecution,
  redeemDelegation,
  redeemToPostTask,
  redeemToConfirmDelivery,
  simulateRedemption,
  ExecutionMode,
} from './redeem.js';
