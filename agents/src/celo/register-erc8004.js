#!/usr/bin/env node

/**
 * Register AgentEscrow agents on Celo ERC-8004 IdentityRegistry
 *
 * Registers Buyer and Seller agents with Celo-specific metadata:
 * - IPFS avatars (same as Base)
 * - Celo chain info + stablecoin capabilities
 * - Contract endpoints for Celo deployment
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/register-erc8004.js
 *
 * @module celo/register-erc8004
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import { CELO_REGISTRIES } from './client.js';

// ─── Config ─────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('\u274C DEPLOYER_PRIVATE_KEY required');
  process.exit(1);
}

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);

const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org'),
});

const walletClient = createWalletClient({
  account,
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org'),
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

// ─── Agent Metadata ─────────────────────────────────────────────────────────

const BUYER_METADATA = {
  name: 'AgentEscrow Buyer (Celo)',
  description: 'Autonomous buyer agent — posts tasks with cUSD escrow, verifies deliveries, manages reputation on Celo.',
  avatar: 'ipfs://bafybeihvvgxvbskdhhvb5mxl2wyvdyqo4zvltbkyuzy4sctjml26mbbdna',
  capabilities: ['task_posting', 'delivery_verification', 'escrow_management', 'stablecoin_escrow', 'fee_abstraction'],
  chain: 'celo-alfajores',
  chainId: 44787,
  protocol: 'agentescrow',
  stablecoins: ['cUSD', 'USDC'],
  repository: 'https://github.com/DirectiveCreator/agentescrow',
};

const SELLER_METADATA = {
  name: 'AgentEscrow Seller (Celo)',
  description: 'Autonomous seller agent — discovers tasks, executes work, delivers results, earns cUSD on Celo.',
  avatar: 'ipfs://bafybeidxbkskf4unq5vgdp2n4spbknl3e3w6r7oka7gvyh6bdoimxyyrwy',
  capabilities: ['task_discovery', 'task_execution', 'delivery', 'stablecoin_earnings', 'fee_abstraction'],
  chain: 'celo-alfajores',
  chainId: 44787,
  protocol: 'agentescrow',
  stablecoins: ['cUSD', 'USDC'],
  repository: 'https://github.com/DirectiveCreator/agentescrow',
};

// ─── Register Function ──────────────────────────────────────────────────────

async function registerAgent(name, metadata) {
  const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

  console.log(`\u{1F680} Registering ${name}...`);
  console.log(`   URI length: ${agentURI.length} bytes`);

  const hash = await walletClient.writeContract({
    address: CELO_REGISTRIES.identityRegistry.alfajores,
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
  console.log(`   Explorer: https://alfajores.celoscan.io/tx/${hash}`);

  return { agentId, hash };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('\u{1F7E2} ERC-8004 Registration on Celo Alfajores');
  console.log('\u2550'.repeat(50));
  console.log(`   Registry: ${CELO_REGISTRIES.identityRegistry.alfajores}`);
  console.log(`   Deployer: ${account.address}`);
  console.log('');

  const buyer = await registerAgent('Buyer Agent', BUYER_METADATA);
  console.log('');
  const seller = await registerAgent('Seller Agent', SELLER_METADATA);

  console.log('');
  console.log('\u{1F389} Both agents registered on Celo!');
  console.log(`   Buyer:  #${buyer.agentId}`);
  console.log(`   Seller: #${seller.agentId}`);
  console.log('');
}

main().catch(err => {
  console.error('\u274C Registration failed:', err.message);
  process.exit(1);
});
