/**
 * ERC-8004 Agent Identity Registration Script
 *
 * Registers AgentEscrow Buyer and Seller agents on the ERC-8004 IdentityRegistry.
 * Currently targets Base Sepolia for testnet iteration.
 *
 * Usage:
 *   node --experimental-json-modules agents/src/register-erc8004.js [buyer|seller|both]
 *
 * Environment:
 *   PRIVATE_KEY - deployer private key (same as contract deployer)
 *   BASE_SEPOLIA_RPC - RPC URL for Base Sepolia
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config({ path: '../.env' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ERC-8004 IdentityRegistry on Base Sepolia
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

// Minimal ABI for register(string agentURI)
const REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'Registered',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
];

// Agent metadata (Base Sepolia versions)
const BUYER_METADATA = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "AgentEscrow Buyer",
  description: "Autonomous AI agent that discovers, commissions, and pays for services on the AgentEscrow protocol. Posts tasks to the ServiceBoard smart contract, locks ETH in escrow via EscrowVault, reviews deliverables, and confirms completion — all on-chain on Base. Built for the Synthesis hackathon by Socialure.",
  image: "ipfs://bafybeihvvgxvbskdhhvb5mxl2wyvdyqo4zvltbkyuzy4sctjml26mbbdna",
  services: [
    { name: "web", endpoint: "https://agentescrow.onrender.com/" },
    { name: "ServiceBoard", endpoint: "eip155:84532:0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2" },
    { name: "EscrowVault", endpoint: "eip155:84532:0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579" }
  ],
  x402Support: false,
  active: true,
  registrations: [],
  supportedTrust: ["reputation", "crypto-economic"]
};

const SELLER_METADATA = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "AgentEscrow Seller",
  description: "Autonomous AI agent that fulfills service requests on the AgentEscrow protocol. Monitors the ServiceBoard for open tasks, claims work, executes deliverables (text summaries, code reviews, data analysis), and submits results on-chain via Base. Earns reputation through the ReputationRegistry. Built for the Synthesis hackathon by Socialure.",
  image: "ipfs://bafybeidxbkskf4unq5vgdp2n4spbknl3e3w6r7oka7gvyh6bdoimxyyrwy",
  services: [
    { name: "web", endpoint: "https://agentescrow.onrender.com/" },
    { name: "ServiceBoard", endpoint: "eip155:84532:0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2" },
    { name: "ReputationRegistry", endpoint: "eip155:84532:0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df" }
  ],
  x402Support: false,
  active: true,
  registrations: [],
  supportedTrust: ["reputation", "crypto-economic"]
};

function makeDataUri(metadata) {
  const json = JSON.stringify(metadata);
  const base64 = Buffer.from(json).toString('base64');
  return `data:application/json;base64,${base64}`;
}

async function registerAgent(name, metadata) {
  const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set — pass via env or .env');

  const rpcUrl = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
  const account = privateKeyToAccount(`0x${pk.replace('0x', '')}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const agentURI = makeDataUri(metadata);
  console.log(`\n🤖 Registering ${name} on ERC-8004 IdentityRegistry...`);
  console.log(`   Registry: ${IDENTITY_REGISTRY}`);
  console.log(`   Owner: ${account.address}`);
  console.log(`   URI length: ${agentURI.length} chars (data: URI)`);

  try {
    // Simulate first
    const { result } = await publicClient.simulateContract({
      address: IDENTITY_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'register',
      args: [agentURI],
      account: account,
    });
    console.log(`   Simulated agentId: ${result}`);

    // Execute
    const hash = await walletClient.writeContract({
      address: IDENTITY_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'register',
      args: [agentURI],
    });
    console.log(`   ⏳ Tx submitted: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`   🎉 ${name} registered as agentId #${result}`);
    console.log(`   View: https://sepolia.basescan.org/tx/${hash}`);

    return { agentId: result, txHash: hash, receipt };
  } catch (err) {
    console.error(`   ❌ Registration failed: ${err.message}`);
    if (err.cause) console.error(`   Cause: ${JSON.stringify(err.cause)}`);
    throw err;
  }
}

async function main() {
  const target = process.argv[2] || 'both';
  console.log('═══════════════════════════════════════');
  console.log('  ERC-8004 Agent Identity Registration');
  console.log('  Network: Base Sepolia (84532)');
  console.log('═══════════════════════════════════════');

  const results = {};

  if (target === 'buyer' || target === 'both') {
    results.buyer = await registerAgent('Buyer Agent', BUYER_METADATA);
  }

  if (target === 'seller' || target === 'both') {
    results.seller = await registerAgent('Seller Agent', SELLER_METADATA);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Registration Summary');
  console.log('═══════════════════════════════════════');
  if (results.buyer) {
    console.log(`  Buyer:  agentId #${results.buyer.agentId} — ${results.buyer.txHash}`);
  }
  if (results.seller) {
    console.log(`  Seller: agentId #${results.seller.agentId} — ${results.seller.txHash}`);
  }
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
