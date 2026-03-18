import { createPublicClient, http } from 'viem';
import { baseSepolia, foundry } from 'viem/chains';

// Contract addresses — Base Sepolia deployment (2026-03-18)
// Deployed via Foundry script: contracts/script/Deploy.s.sol
const CONTRACTS = {
  serviceBoard: process.env.NEXT_PUBLIC_SERVICE_BOARD_ADDRESS || '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
  escrowVault: process.env.NEXT_PUBLIC_ESCROW_VAULT_ADDRESS || '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
  reputationRegistry: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
};

const isLocal = process.env.NEXT_PUBLIC_CHAIN === 'local';
const chain = isLocal ? foundry : baseSepolia;
const rpcUrl = isLocal ? 'http://127.0.0.1:8545' : (process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org');

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const ServiceBoardABI = [
  { type: 'function', name: 'getTask', inputs: [{ name: 'taskId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'uint256' }, { name: 'buyer', type: 'address' }, { name: 'seller', type: 'address' }, { name: 'taskType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'reward', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'deliveryHash', type: 'string' }, { name: 'createdAt', type: 'uint256' }, { name: 'claimedAt', type: 'uint256' }, { name: 'deliveredAt', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getTaskCount', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getOpenTasks', inputs: [], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'buyer', type: 'address' }, { name: 'seller', type: 'address' }, { name: 'taskType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'reward', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'deliveryHash', type: 'string' }, { name: 'createdAt', type: 'uint256' }, { name: 'claimedAt', type: 'uint256' }, { name: 'deliveredAt', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'event', name: 'TaskPosted', inputs: [{ name: 'taskId', type: 'uint256', indexed: true }, { name: 'buyer', type: 'address', indexed: true }, { name: 'taskType', type: 'string', indexed: false }, { name: 'reward', type: 'uint256', indexed: false }, { name: 'deadline', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'TaskClaimed', inputs: [{ name: 'taskId', type: 'uint256', indexed: true }, { name: 'seller', type: 'address', indexed: true }] },
  { type: 'event', name: 'TaskDelivered', inputs: [{ name: 'taskId', type: 'uint256', indexed: true }, { name: 'deliveryHash', type: 'string', indexed: false }] },
  { type: 'event', name: 'TaskCompleted', inputs: [{ name: 'taskId', type: 'uint256', indexed: true }, { name: 'buyer', type: 'address', indexed: true }, { name: 'seller', type: 'address', indexed: true }, { name: 'reward', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'TaskCancelled', inputs: [{ name: 'taskId', type: 'uint256', indexed: true }] },
  { type: 'event', name: 'TaskReceipt', inputs: [{ name: 'taskId', type: 'uint256', indexed: true }, { name: 'buyer', type: 'address', indexed: true }, { name: 'seller', type: 'address', indexed: true }, { name: 'taskType', type: 'string', indexed: false }, { name: 'reward', type: 'uint256', indexed: false }, { name: 'timestamp', type: 'uint256', indexed: false }] },
] as const;

export const ReputationRegistryABI = [
  { type: 'function', name: 'getReputation', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'tasksCompleted', type: 'uint256' }, { name: 'tasksFailed', type: 'uint256' }, { name: 'totalEarned', type: 'uint256' }, { name: 'totalSpent', type: 'uint256' }, { name: 'firstActiveAt', type: 'uint256' }, { name: 'lastActiveAt', type: 'uint256' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getScore', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export const EscrowVaultABI = [
  { type: 'function', name: 'getEscrow', inputs: [{ name: 'taskId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'taskId', type: 'uint256' }, { name: 'buyer', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'released', type: 'bool' }, { name: 'refunded', type: 'bool' }] }], stateMutability: 'view' },
  { type: 'function', name: 'getBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

export { CONTRACTS, chain };
