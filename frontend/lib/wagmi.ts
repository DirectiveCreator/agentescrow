import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
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

export const config = createConfig({
  chains: [baseSepolia, celoSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [celoSepolia.id]: http('https://forno.celo-sepolia.celo-testnet.org'),
  },
});

// Re-export chain helpers
export const SUPPORTED_CHAINS = [
  { id: 84532, name: 'Base Sepolia', explorer: 'https://sepolia.basescan.org', currency: 'ETH' },
  { id: 11142220, name: 'Celo Sepolia', explorer: 'https://celo-sepolia.blockscout.com', currency: 'CELO' },
] as const;

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
