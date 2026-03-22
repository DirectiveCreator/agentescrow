/**
 * OpenServ Agent Integration for AgentEscrow
 *
 * Wraps AgentEscrow capabilities as an OpenServ-compatible agent.
 * This agent can be registered on the OpenServ platform and participate
 * in multi-agent collaboration through their orchestration layer.
 *
 * Capabilities exposed:
 *   - post_task: Post a new task to the AgentEscrow marketplace
 *   - discover_tasks: Find open tasks available for claiming
 *   - claim_task: Claim an open task as a seller
 *   - deliver_task: Submit proof of task completion
 *   - confirm_delivery: Confirm delivery and release escrow
 *   - check_reputation: Get on-chain reputation for any agent address
 *
 * Environment:
 *   OPENSERV_API_KEY  — Your OpenServ platform API key
 *   DEPLOYER_KEY      — Private key for on-chain transactions
 *   RPC_URL           — Base Sepolia RPC (default: public endpoint)
 *
 * Usage:
 *   node agents/src/openserv/agent.js
 *
 * @see https://docs.openserv.ai
 * @see https://github.com/openserv-labs/sdk
 */

import { Agent, run } from '@openserv-labs/sdk';
import { z } from 'zod';
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

// ─── Contract Config ─────────────────────────────────────────────────────────

const CONTRACTS = {
  serviceBoard: '0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2',
  escrowVault: '0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579',
  reputationRegistry: '0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df',
};

const ServiceBoardABI = [
  { name: 'postTask', type: 'function', stateMutability: 'payable', inputs: [{ name: 'taskType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'claimTask', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'taskId', type: 'uint256' }], outputs: [] },
  { name: 'deliverTask', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'taskId', type: 'uint256' }, { name: 'deliveryHash', type: 'string' }], outputs: [] },
  { name: 'confirmDelivery', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'taskId', type: 'uint256' }], outputs: [] },
  { name: 'getTask', type: 'function', stateMutability: 'view', inputs: [{ name: 'taskId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'buyer', type: 'address' }, { name: 'seller', type: 'address' }, { name: 'taskType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'reward', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'deliveryHash', type: 'string' }, { name: 'createdAt', type: 'uint256' }, { name: 'claimedAt', type: 'uint256' }, { name: 'deliveredAt', type: 'uint256' }] }] },
  { name: 'getTaskCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
];

const ReputationABI = [
  { name: 'getReputation', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'tasksCompleted', type: 'uint256' }, { name: 'tasksFailed', type: 'uint256' }, { name: 'totalEarned', type: 'uint256' }, { name: 'totalSpent', type: 'uint256' }, { name: 'firstActiveAt', type: 'uint256' }, { name: 'lastActiveAt', type: 'uint256' }] }] },
  { name: 'getTrustScore', type: 'function', stateMutability: 'view', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

// ─── Chain Clients ───────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getWalletClient() {
  if (!process.env.DEPLOYER_KEY) throw new Error('DEPLOYER_KEY not set');
  const account = privateKeyToAccount(process.env.DEPLOYER_KEY);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// ─── Status Labels ───────────────────────────────────────────────────────────

const STATUS = ['Open', 'Claimed', 'Delivered', 'Completed', 'Cancelled', 'Disputed'];

// ─── OpenServ Agent ──────────────────────────────────────────────────────────

const agent = new Agent({
  systemPrompt: `You are the AgentEscrow marketplace agent — an autonomous service for posting, discovering, claiming, and completing tasks on the AgentEscrow protocol (Base Sepolia).

You manage a trustless marketplace where:
- Buyers post tasks with ETH rewards locked in escrow
- Sellers claim and complete tasks
- On-chain reputation tracks performance
- x402 micropayments enable per-request billing

Always provide clear confirmations with transaction hashes and task IDs.
Available task types: text_summary, code_review, name_generation, translation.
Chain: Base Sepolia (84532).`,
});

// ── Capability: Discover Tasks ───────────────────────────────────────────────

agent.addCapability({
  name: 'discover_tasks',
  description: 'Find open tasks on the AgentEscrow marketplace. Returns all tasks or filter by status (0=Open, 3=Completed, etc.)',
  schema: z.object({
    statusFilter: z.number().optional().describe('Filter by status: 0=Open, 1=Claimed, 2=Delivered, 3=Completed'),
    limit: z.number().optional().describe('Max tasks to return (default: 20)'),
  }),
  async run({ args }) {
    const count = await publicClient.readContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'getTaskCount',
    });

    const limit = args.limit || 20;
    const tasks = [];
    const start = Math.max(0, Number(count) - limit);

    for (let i = start; i < Number(count); i++) {
      const task = await publicClient.readContract({
        address: CONTRACTS.serviceBoard,
        abi: ServiceBoardABI,
        functionName: 'getTask',
        args: [BigInt(i)],
      });
      if (args.statusFilter === undefined || task.status === args.statusFilter) {
        tasks.push({
          id: Number(task.id),
          type: task.taskType,
          description: task.description,
          reward: formatEther(task.reward) + ' ETH',
          status: STATUS[task.status] || 'Unknown',
          buyer: task.buyer,
          seller: task.seller,
        });
      }
    }

    return JSON.stringify({ count: tasks.length, tasks }, null, 2);
  },
});

// ── Capability: Post Task ────────────────────────────────────────────────────

agent.addCapability({
  name: 'post_task',
  description: 'Post a new task to the AgentEscrow marketplace with ETH reward locked in escrow',
  schema: z.object({
    taskType: z.enum(['text_summary', 'code_review', 'name_generation', 'translation']).describe('Type of task'),
    description: z.string().describe('Task description'),
    rewardEth: z.string().describe('ETH reward amount (e.g. "0.001")'),
    deadlineMinutes: z.number().optional().describe('Deadline in minutes from now (default: 60)'),
  }),
  async run({ args }) {
    const wallet = getWalletClient();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + (args.deadlineMinutes || 60) * 60);

    const hash = await wallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'postTask',
      args: [args.taskType, args.description, deadline],
      value: parseEther(args.rewardEth),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const count = await publicClient.readContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'getTaskCount',
    });

    return JSON.stringify({
      success: true,
      taskId: Number(count) - 1,
      txHash: hash,
      reward: args.rewardEth + ' ETH',
      taskType: args.taskType,
      description: args.description,
      blockNumber: Number(receipt.blockNumber),
    }, null, 2);
  },
});

// ── Capability: Claim Task ───────────────────────────────────────────────────

agent.addCapability({
  name: 'claim_task',
  description: 'Claim an open task as a seller to start working on it',
  schema: z.object({
    taskId: z.number().describe('The task ID to claim'),
  }),
  async run({ args }) {
    const wallet = getWalletClient();
    const hash = await wallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'claimTask',
      args: [BigInt(args.taskId)],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return JSON.stringify({ success: true, taskId: args.taskId, txHash: hash, action: 'claimed' });
  },
});

// ── Capability: Deliver Task ─────────────────────────────────────────────────

agent.addCapability({
  name: 'deliver_task',
  description: 'Submit proof of task completion with a delivery hash (IPFS CID or other proof)',
  schema: z.object({
    taskId: z.number().describe('The task ID to deliver'),
    deliveryHash: z.string().describe('Proof of completion (IPFS CID, hash, or URL)'),
  }),
  async run({ args }) {
    const wallet = getWalletClient();
    const hash = await wallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'deliverTask',
      args: [BigInt(args.taskId), args.deliveryHash],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return JSON.stringify({ success: true, taskId: args.taskId, txHash: hash, deliveryHash: args.deliveryHash, action: 'delivered' });
  },
});

// ── Capability: Confirm Delivery ─────────────────────────────────────────────

agent.addCapability({
  name: 'confirm_delivery',
  description: 'Confirm task delivery and release escrow funds to the seller (buyer only)',
  schema: z.object({
    taskId: z.number().describe('The task ID to confirm'),
  }),
  async run({ args }) {
    const wallet = getWalletClient();
    const hash = await wallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'confirmDelivery',
      args: [BigInt(args.taskId)],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return JSON.stringify({ success: true, taskId: args.taskId, txHash: hash, action: 'confirmed — escrow released' });
  },
});

// ── Capability: Check Reputation ─────────────────────────────────────────────

agent.addCapability({
  name: 'check_reputation',
  description: 'Get the on-chain reputation and trust score for any agent address',
  schema: z.object({
    address: z.string().describe('Ethereum address to check'),
  }),
  async run({ args }) {
    const [rep, trustScore] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.reputationRegistry,
        abi: ReputationABI,
        functionName: 'getReputation',
        args: [args.address],
      }),
      publicClient.readContract({
        address: CONTRACTS.reputationRegistry,
        abi: ReputationABI,
        functionName: 'getTrustScore',
        args: [args.address],
      }),
    ]);

    return JSON.stringify({
      address: args.address,
      trustScore: Number(trustScore),
      tasksCompleted: Number(rep.tasksCompleted),
      tasksFailed: Number(rep.tasksFailed),
      totalEarned: formatEther(rep.totalEarned) + ' ETH',
      totalSpent: formatEther(rep.totalSpent) + ' ETH',
      firstActive: rep.firstActiveAt > 0n ? new Date(Number(rep.firstActiveAt) * 1000).toISOString() : 'never',
      lastActive: rep.lastActiveAt > 0n ? new Date(Number(rep.lastActiveAt) * 1000).toISOString() : 'never',
    }, null, 2);
  },
});

// ── Start the Agent ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '7378', 10);
const USE_TUNNEL = process.env.DISABLE_TUNNEL !== 'true';

console.log('─────────────────────────────────────────────');
console.log('  AgentEscrow × OpenServ Agent');
console.log('  Chain: Base Sepolia (84532)');
console.log('  Capabilities: 6');
console.log(`  Mode: ${USE_TUNNEL ? 'DEV (tunnel via agents-proxy.openserv.ai)' : 'PRODUCTION (direct)'}`);
console.log(`  Port: ${PORT}`);
console.log('─────────────────────────────────────────────');
console.log('  ◈ discover_tasks  — Find marketplace tasks');
console.log('  ◈ post_task       — Post task with ETH escrow');
console.log('  ◈ claim_task      — Claim task as seller');
console.log('  ◈ deliver_task    — Submit completion proof');
console.log('  ◈ confirm_delivery — Release escrow');
console.log('  ◈ check_reputation — Query agent trust score');
console.log('─────────────────────────────────────────────');

async function main() {
  try {
    if (USE_TUNNEL) {
      // Dev mode: start server + WebSocket tunnel to OpenServ proxy
      // This registers the agent automatically and forwards platform requests
      console.log('🔗 Starting with OpenServ tunnel (dev mode)...');
      const result = await run(agent, { port: PORT });
      console.log('✅ OpenServ agent running with tunnel on port', PORT);
      return result;
    } else {
      // Production mode: just start the HTTP server
      // Agent must be reachable at a public URL configured in the OpenServ dashboard
      await agent.start({ port: PORT });
      console.log('✅ OpenServ agent running in production mode on port', PORT);
    }
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

main();

export default agent;
