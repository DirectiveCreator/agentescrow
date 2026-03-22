import { createPublicClient, createWalletClient, custom, http, type WalletClient } from 'viem';
import { baseSepolia, celoAlfajores, foundry } from 'viem/chains';

// Celo Sepolia chain definition (not in viem yet — chain ID 11142220)
export const celoSepolia = {
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' },
  },
  testnet: true,
} as const;

// Supported chains for wallet connection
export const SUPPORTED_CHAINS = [
  { id: 84532, name: 'Base Sepolia', chain: baseSepolia, explorer: 'https://sepolia.basescan.org', currency: 'ETH' },
  { id: 11142220, name: 'Celo Sepolia', chain: celoSepolia, explorer: 'https://celo-sepolia.blockscout.com', currency: 'CELO' },
] as const;

// Contract addresses — deployed on both Base Sepolia and Celo Sepolia (same addresses)
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

// Create a wallet client from browser wallet (MetaMask etc.)
export function getWalletClient(chainId?: number): WalletClient | null {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  const targetChain = chainId === 11142220 ? celoSepolia : baseSepolia;
  return createWalletClient({
    chain: targetChain,
    transport: custom(window.ethereum),
  });
}

// Get public client for a specific chain
export function getPublicClientForChain(chainId: number) {
  if (chainId === 11142220) {
    return createPublicClient({ chain: celoSepolia, transport: http('https://forno.celo-sepolia.celo-testnet.org') });
  }
  return publicClient; // default Base Sepolia
}

// Request wallet connection
export async function connectWallet(): Promise<{ address: string; chainId: number } | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
    const chainId = parseInt(chainIdHex, 16);
    return { address: accounts[0], chainId };
  } catch {
    return null;
  }
}

// Switch to a supported chain
export async function switchChain(chainId: number): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) return false;
  const hexChainId = '0x' + chainId.toString(16);
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
    return true;
  } catch (err: unknown) {
    // Chain not added — try to add it
    if ((err as { code?: number })?.code === 4902) {
      const chainInfo = SUPPORTED_CHAINS.find(c => c.id === chainId);
      if (!chainInfo) return false;
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: hexChainId,
            chainName: chainInfo.name,
            nativeCurrency: chainId === 11142220
              ? { name: 'CELO', symbol: 'CELO', decimals: 18 }
              : { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: chainId === 11142220
              ? ['https://forno.celo-sepolia.celo-testnet.org']
              : ['https://sepolia.base.org'],
            blockExplorerUrls: [chainInfo.explorer],
          }],
        });
        return true;
      } catch { return false; }
    }
    return false;
  }
}

export const ServiceBoardABI = [
  // Write functions
  { type: 'function', name: 'postTask', inputs: [{ name: 'taskType', type: 'string' }, { name: 'description', type: 'string' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'payable' },
  // Read functions
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

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
