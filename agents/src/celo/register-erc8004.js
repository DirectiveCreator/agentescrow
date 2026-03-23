#!/usr/bin/env node

/**
 * Register Escroue agents on Celo ERC-8004 IdentityRegistry
 *
 * Registers Buyer and Seller agents with Celo-specific metadata:
 * - IPFS avatars (same as Base)
 * - Celo Sepolia chain info + contract endpoints
 * - Multi-chain identity (Base Sepolia + Celo Sepolia)
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/register-erc8004.js
 *
 * @module celo/register-erc8004
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoSepolia } from 'viem/chains';
import { CELO_REGISTRIES } from './client.js';

// ─── Config ─────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('\u274C DEPLOYER_PRIVATE_KEY required');
  process.exit(1);
}

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);

const RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org';

const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: celoSepolia,
  transport: http(RPC_URL),
});

// ─── ERC-8004 ABI (register function) ───────────────────────────────────────

const IDENTITY_REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
];

// ─── Deployed Contract Addresses (Celo Sepolia) ─────────────────────────────

const CELO_CONTRACTS = {
  serviceBoard: '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
  escrowVault: '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
  reputationRegistry: '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
};

// ─── Agent Metadata ─────────────────────────────────────────────────────────

const BUYER_METADATA = {
  name: 'Escroue Buyer (Celo)',
  description: 'Autonomous buyer agent — posts tasks with native CELO escrow, verifies deliveries, manages reputation. Deployed on Celo Sepolia for fast, low-cost agent commerce.',
  avatar: 'ipfs://bafybeihvvgxvbskdhhvb5mxl2wyvdyqo4zvltbkyuzy4sctjml26mbbdna',
  capabilities: ['task_posting', 'delivery_verification', 'escrow_management', 'multi_chain', 'celo_native'],
  chain: 'celo-sepolia',
  chainId: 11142220,
  protocol: 'escroue',
  contracts: CELO_CONTRACTS,
  repository: 'https://github.com/DirectiveCreator/agentescrow',
  frontend: 'https://escroue.com/celo',
  multiChain: {
    baseSepolia: { agentId: 2194, chainId: 84532 },
    celoSepolia: { chainId: 11142220 },
  },
};

const SELLER_METADATA = {
  name: 'Escroue Seller (Celo)',
  description: 'Autonomous seller agent — discovers tasks, executes work, delivers results, earns CELO. Optimized for Celo\'s fast finality and low-cost transactions.',
  avatar: 'ipfs://bafybeidxbkskf4unq5vgdp2n4spbknl3e3w6r7oka7gvyh6bdoimxyyrwy',
  capabilities: ['task_discovery', 'task_execution', 'delivery', 'multi_chain', 'celo_native'],
  chain: 'celo-sepolia',
  chainId: 11142220,
  protocol: 'escroue',
  contracts: CELO_CONTRACTS,
  repository: 'https://github.com/DirectiveCreator/agentescrow',
  frontend: 'https://escroue.com/celo',
  multiChain: {
    baseSepolia: { agentId: 2195, chainId: 84532 },
    celoSepolia: { chainId: 11142220 },
  },
};

// ─── Register Function ──────────────────────────────────────────────────────

async function registerAgent(name, metadata) {
  const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

  console.log(`\u{1F680} Registering ${name}...`);
  console.log(`   URI length: ${agentURI.length} bytes`);

  const hash = await walletClient.writeContract({
    address: CELO_REGISTRIES.identityRegistry.sepolia,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
  });

  console.log(`   TX: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse agentId from logs (Transfer event, tokenId is topic[3])
  const transferLog = receipt.logs.find(log =>
    log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  );

  const agentId = transferLog ? BigInt(transferLog.topics[3]).toString() : 'unknown';

  console.log(`   \u2705 ${name} registered! Agent ID: #${agentId}`);
  console.log(`   Explorer: https://celo-sepolia.blockscout.com/tx/${hash}`);

  return { agentId, hash };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('\u{1F7E2} ERC-8004 Registration on Celo Sepolia');
  console.log('\u2550'.repeat(50));
  console.log(`   Registry: ${CELO_REGISTRIES.identityRegistry.sepolia}`);
  console.log(`   Deployer: ${account.address}`);
  console.log('');

  const buyer = await registerAgent('Buyer Agent', BUYER_METADATA);
  console.log('');
  const seller = await registerAgent('Seller Agent', SELLER_METADATA);

  console.log('');
  console.log('\u{1F389} Both agents registered on Celo Sepolia!');
  console.log(`   Buyer:  #${buyer.agentId}`);
  console.log(`   Seller: #${seller.agentId}`);
  console.log('');
  console.log('   Verify on agentscan: https://agentscan.info/');
  console.log('');
}

main().catch(err => {
  console.error('\u274C Registration failed:', err.message);
  process.exit(1);
});
