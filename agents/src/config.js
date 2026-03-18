import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry, baseSepolia } from 'viem/chains';
import { config } from 'dotenv';
import ServiceBoardABI from './abi/ServiceBoard.json' with { type: 'json' };
import EscrowVaultABI from './abi/EscrowVault.json' with { type: 'json' };
import ReputationRegistryABI from './abi/ReputationRegistry.json' with { type: 'json' };

config({ path: '../.env' });

const isLocal = process.env.CHAIN === 'local';
const chain = isLocal ? foundry : baseSepolia;
const rpcUrl = isLocal ? 'http://127.0.0.1:8545' : process.env.BASE_SEPOLIA_RPC;

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export function getWalletClient(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

export const contracts = {
  serviceBoard: {
    address: process.env.SERVICE_BOARD_ADDRESS,
    abi: ServiceBoardABI,
  },
  escrowVault: {
    address: process.env.ESCROW_VAULT_ADDRESS,
    abi: EscrowVaultABI,
  },
  reputationRegistry: {
    address: process.env.REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI,
  },
};

export { chain };
