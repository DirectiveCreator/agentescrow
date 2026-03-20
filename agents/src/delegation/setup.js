/**
 * MetaMask Delegation Framework — Smart Account Setup
 *
 * Creates HybridDeleGator smart accounts for agents in the AgentEscrow system.
 * Smart accounts wrap existing EOA keys and enable delegation capabilities.
 *
 * Architecture:
 *   Human (EOA) → creates smart account → delegates to Agent smart account
 *   Agent smart account → redeems delegations → calls ServiceBoard
 *   msg.sender at ServiceBoard = delegator's smart account (transparent proxy)
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import {
  Implementation,
  toMetaMaskSmartAccount,
  getDeleGatorEnvironment,
} from '@metamask/delegation-toolkit';
import { createBundlerClient } from 'viem/account-abstraction';
import { config } from 'dotenv';

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

// ─── Chain Config ───────────────────────────────────────────────────────────
// MetaMask Delegation Framework requires a chain where DeleGator contracts are deployed.
// Always use Base Sepolia for delegations (foundry/local chain is not supported).

const chain = baseSepolia;
const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

// ─── Clients ────────────────────────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

/**
 * Create a bundler client for sending UserOperations.
 * Requires PIMLICO_API_KEY env var for live mode.
 * Returns null in simulation mode.
 */
export function getBundlerClient() {
  const pimlicoKey = process.env.PIMLICO_API_KEY;
  if (!pimlicoKey) {
    console.log('  ⚠️  No PIMLICO_API_KEY — running in simulation mode (no on-chain UserOps)');
    return null;
  }

  const bundlerUrl = `https://api.pimlico.io/v2/${chain.id}/rpc?apikey=${pimlicoKey}`;
  return createBundlerClient({
    client: publicClient,
    transport: http(bundlerUrl),
    chain,
  });
}

// ─── Environment ────────────────────────────────────────────────────────────

/**
 * Get the MetaMask delegation environment for the current chain.
 * Contains all deployed contract addresses (DelegationManager, enforcers, etc.)
 */
export function getEnvironment() {
  return getDeleGatorEnvironment(chain.id);
}

// ─── Smart Account Creation ─────────────────────────────────────────────────

/**
 * Create a HybridDeleGator smart account from a private key.
 *
 * The smart account is a counterfactual address — it doesn't need to be
 * deployed until the first UserOperation is sent. The address is deterministic
 * based on the owner + salt.
 *
 * @param {string} privateKey - Hex private key (0x-prefixed)
 * @param {string} salt - Deploy salt for deterministic address (default "0x")
 * @returns {Promise<Object>} Smart account instance with .address, .signDelegation(), etc.
 */
export async function createSmartAccount(privateKey, salt = '0x') {
  const owner = privateKeyToAccount(privateKey);

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: salt,
    signer: { account: owner },
  });

  return {
    smartAccount,
    owner,
    address: smartAccount.address,
    environment: smartAccount.environment,
  };
}

/**
 * Create smart accounts for all AgentEscrow roles.
 * Uses different salts to ensure unique counterfactual addresses.
 *
 * @returns {Promise<Object>} { human, buyer, seller, mediator } smart accounts
 */
export async function createAllAccounts() {
  // In a real setup, these would be different keys.
  // For the demo, we use the buyer/seller keys + a mediator key.
  const buyerKey = process.env.BUYER_PRIVATE_KEY;
  const sellerKey = process.env.SELLER_PRIVATE_KEY;
  // Mediator uses deployer key (or a separate key if available)
  const mediatorKey = process.env.MEDIATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || buyerKey;

  // Human account — the wallet owner who delegates to agents
  // Uses the buyer key with a different salt to get a different smart account address
  const human = await createSmartAccount(buyerKey, '0x01');

  // Agent accounts — AI agents that receive delegations
  const buyer = await createSmartAccount(buyerKey, '0x02');
  const seller = await createSmartAccount(sellerKey, '0x03');
  const mediator = await createSmartAccount(mediatorKey, '0x04');

  return { human, buyer, seller, mediator };
}

/**
 * Display info about a smart account
 */
export function logAccount(label, account) {
  console.log(`  ${label}:`);
  console.log(`    EOA Owner:     ${account.owner.address}`);
  console.log(`    Smart Account: ${account.address}`);
}

// ─── Contract Addresses (AgentEscrow) ───────────────────────────────────────

export const AGENTESCROW_CONTRACTS = {
  serviceBoard: process.env.SERVICE_BOARD_ADDRESS || '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
  escrowVault: process.env.ESCROW_VAULT_ADDRESS || '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
  reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
};
