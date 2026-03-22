import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Celo Sepolia chain definition
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
  testnet: true as const,
} as const;

// Enable mainnet chains via env var (default: false)
const enableMainnet = process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true';

const chains = enableMainnet
  ? [base, baseSepolia, celoSepolia] as const
  : [baseSepolia, celoSepolia] as const;

const transports: Record<number, ReturnType<typeof http>> = {
  [baseSepolia.id]: http('https://sepolia.base.org'),
  [celoSepolia.id]: http('https://forno.celo-sepolia.celo-testnet.org'),
};
if (enableMainnet) {
  transports[base.id] = http('https://mainnet.base.org');
}

export const config = createConfig({
  chains: chains as any,
  connectors: [injected()],
  transports: transports as any,
});

// Re-export chain helpers
const testnetChains = [
  { id: 84532, name: 'Base Sepolia', explorer: 'https://sepolia.basescan.org', currency: 'ETH' },
  { id: 11142220, name: 'Celo Sepolia', explorer: 'https://celo-sepolia.blockscout.com', currency: 'CELO' },
] as const;

const mainnetChains = [
  { id: 8453, name: 'Base', explorer: 'https://basescan.org', currency: 'ETH' },
] as const;

export const SUPPORTED_CHAINS = enableMainnet
  ? [...mainnetChains, ...testnetChains]
  : [...testnetChains];

export function getExplorerUrl(chainId: number) {
  return SUPPORTED_CHAINS.find(c => c.id === chainId)?.explorer || 'https://sepolia.basescan.org';
}

export function getChainCurrency(chainId: number) {
  return SUPPORTED_CHAINS.find(c => c.id === chainId)?.currency || 'ETH';
}

export function getChainName(chainId: number) {
  return SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || `Chain ${chainId}`;
}

// Contract addresses (same on both chains)
export const CONTRACTS = {
  serviceBoard: '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C' as `0x${string}`,
  escrowVault: '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E' as `0x${string}`,
  reputationRegistry: '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c' as `0x${string}`,
};
