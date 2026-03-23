/**
 * Celo Client for Escroue
 *
 * Provides Celo-specific functionality:
 * - Multi-network support (Celo mainnet + Celo Sepolia testnet)
 * - Stablecoin helpers (cUSD, USDC balance/transfer)
 * - CIP-64 fee abstraction (pay gas in stablecoins)
 * - ERC-8004 identity resolution on Celo
 *
 * NOTE: Alfajores is DEPRECATED. Celo Sepolia (chain ID 11142220) is the official testnet.
 *
 * @module celo/client
 */

import { createPublicClient, createWalletClient, http, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoSepolia } from 'viem/chains';

// ─── Network Configurations ─────────────────────────────────────────────────

export const CELO_NETWORKS = {
  mainnet: {
    chain: celo,
    chainId: 42220,
    name: 'Celo Mainnet',
    rpc: 'https://forno.celo.org',
    explorer: 'https://celoscan.io',
    faucet: null,
  },
  sepolia: {
    chain: celoSepolia,
    chainId: 11142220,
    name: 'Celo Sepolia',
    rpc: 'https://forno.celo-sepolia.celo-testnet.org',
    explorer: 'https://celo-sepolia.blockscout.com',
    faucet: 'https://faucet.celo.org/celo-sepolia',
  },
};

// ─── Stablecoin Addresses ───────────────────────────────────────────────────

export const CELO_STABLECOINS = {
  cUSD: {
    mainnet: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    sepolia: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
    decimals: 18,
    name: 'Celo Dollar',
  },
  USDC: {
    mainnet: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    sepolia: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
    decimals: 6,
    name: 'USD Coin',
  },
};

// ─── Fee Currency Adapters (for CIP-64 fee abstraction) ─────────────────────

export const FEE_CURRENCY_ADAPTERS = {
  cUSD: {
    mainnet: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    sepolia: '0x4822e58de6f5e485eF90df51C41CE01721331dC0',
  },
  USDC: {
    mainnet: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
    sepolia: '0x4822e58de6f5e485eF90df51C41CE01721331dC0',
  },
};

// ─── ERC-8004 & Reputation on Celo ──────────────────────────────────────────

export const CELO_REGISTRIES = {
  identityRegistry: {
    mainnet: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    sepolia: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  },
  reputationRegistry: {
    mainnet: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    sepolia: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
};

// ─── ERC-20 ABI (minimal for balanceOf, transfer, approve) ──────────────────

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

// ─── CeloClient Class ──────────────────────────────────────────────────────

/**
 * CeloClient — high-level client for Celo chain interactions.
 *
 * Features:
 * - Stablecoin balance/transfer/approve
 * - Fee abstraction (pay gas in cUSD/USDC)
 * - ERC-8004 identity checks
 * - Contract deployment helpers
 */
export class CeloClient {
  /**
   * @param {Object} options
   * @param {string} [options.privateKey] - Hex private key (omit for read-only/simulation)
   * @param {'mainnet'|'sepolia'} [options.network='sepolia'] - Network to use
   */
  constructor({ privateKey, network = 'sepolia' } = {}) {
    this.network = network;
    this.networkConfig = CELO_NETWORKS[network];
    this.simulation = !privateKey;

    if (!this.networkConfig) {
      throw new Error(`Unknown network: ${network}. Use 'mainnet' or 'sepolia'.`);
    }

    this.publicClient = createPublicClient({
      chain: this.networkConfig.chain,
      transport: http(this.networkConfig.rpc),
    });

    if (privateKey) {
      const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      this.account = privateKeyToAccount(key);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.networkConfig.chain,
        transport: http(this.networkConfig.rpc),
      });
      console.log(`\u{1F7E2} Celo client initialized on ${this.networkConfig.name}`);
      console.log(`   Account: ${this.account.address}`);
    } else {
      this.account = null;
      this.walletClient = null;
      console.log(`\u{1F7E2} Celo client initialized in READ-ONLY mode on ${this.networkConfig.name}`);
    }
  }

  /**
   * Get native CELO balance
   * @param {string} [address] - Address to check (defaults to client account)
   * @returns {Promise<string>} Balance in CELO
   */
  async getCeloBalance(address) {
    const addr = address || this.account?.address;
    if (!addr) throw new Error('No address provided and no account configured');

    const balance = await this.publicClient.getBalance({ address: addr });
    return formatUnits(balance, 18);
  }

  /**
   * Get stablecoin balance
   * @param {'cUSD'|'USDC'} token - Token name
   * @param {string} [address] - Address to check (defaults to client account)
   * @returns {Promise<string>} Balance in token
   */
  async getStablecoinBalance(token, address) {
    const addr = address || this.account?.address;
    if (!addr) throw new Error('No address provided and no account configured');

    const tokenConfig = CELO_STABLECOINS[token];
    if (!tokenConfig) throw new Error(`Unknown stablecoin: ${token}. Use 'cUSD' or 'USDC'.`);

    const tokenAddress = tokenConfig[this.network];

    const balance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    });

    return formatUnits(balance, tokenConfig.decimals);
  }

  /**
   * Approve stablecoin spending
   * @param {'cUSD'|'USDC'} token - Token name
   * @param {string} spender - Spender address (e.g., EscrowVault)
   * @param {string} amount - Amount in human-readable format
   * @returns {Promise<string>} Transaction hash
   */
  async approveStablecoin(token, spender, amount) {
    if (!this.walletClient) throw new Error('Wallet not configured (read-only mode)');

    const tokenConfig = CELO_STABLECOINS[token];
    if (!tokenConfig) throw new Error(`Unknown stablecoin: ${token}`);

    const tokenAddress = tokenConfig[this.network];
    const parsedAmount = parseUnits(amount, tokenConfig.decimals);

    const hash = await this.walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, parsedAmount],
    });

    console.log(`\u2705 Approved ${amount} ${token} for ${spender}`);
    console.log(`   TX: ${hash}`);
    return hash;
  }

  /**
   * Transfer stablecoins
   * @param {'cUSD'|'USDC'} token - Token name
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in human-readable format
   * @returns {Promise<string>} Transaction hash
   */
  async transferStablecoin(token, to, amount) {
    if (!this.walletClient) throw new Error('Wallet not configured (read-only mode)');

    const tokenConfig = CELO_STABLECOINS[token];
    if (!tokenConfig) throw new Error(`Unknown stablecoin: ${token}`);

    const tokenAddress = tokenConfig[this.network];
    const parsedAmount = parseUnits(amount, tokenConfig.decimals);

    const hash = await this.walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, parsedAmount],
    });

    console.log(`\u{1F4B8} Transferred ${amount} ${token} to ${to}`);
    console.log(`   TX: ${hash}`);
    return hash;
  }

  /**
   * Send a transaction with fee abstraction (pay gas in stablecoin).
   *
   * Uses CIP-64 feeCurrency field — viem has native Celo support for this.
   *
   * @param {Object} options
   * @param {string} options.to - Destination address
   * @param {string} [options.data] - Call data
   * @param {bigint} [options.value] - Value in wei
   * @param {'cUSD'|'USDC'} [options.feeCurrency='cUSD'] - Token to pay gas in
   * @returns {Promise<string>} Transaction hash
   */
  async sendWithFeeAbstraction({ to, data, value, feeCurrency = 'cUSD' }) {
    if (!this.walletClient) throw new Error('Wallet not configured (read-only mode)');

    const adapter = FEE_CURRENCY_ADAPTERS[feeCurrency];
    if (!adapter) throw new Error(`No fee adapter for ${feeCurrency}`);

    const feeCurrencyAddress = adapter[this.network];

    const hash = await this.walletClient.sendTransaction({
      to,
      data,
      value,
      feeCurrency: feeCurrencyAddress,
    });

    console.log(`\u26FD Fee abstraction: gas paid in ${feeCurrency}`);
    console.log(`   TX: ${hash}`);
    return hash;
  }

  /**
   * Get all balances (CELO + stablecoins)
   * @param {string} [address] - Address to check
   * @returns {Promise<Object>} All balances
   */
  async getAllBalances(address) {
    const addr = address || this.account?.address;
    if (!addr) throw new Error('No address provided');

    const [celo, cUSD, USDC] = await Promise.all([
      this.getCeloBalance(addr),
      this.getStablecoinBalance('cUSD', addr),
      this.getStablecoinBalance('USDC', addr),
    ]);

    return { celo, cUSD, USDC, network: this.network, address: addr };
  }

  /**
   * Get the stablecoin contract address for this network
   * @param {'cUSD'|'USDC'} token
   * @returns {string} Contract address
   */
  getStablecoinAddress(token) {
    return CELO_STABLECOINS[token]?.[this.network];
  }

  /**
   * Get the ERC-8004 IdentityRegistry address for this network
   * @returns {string} Registry address
   */
  getIdentityRegistryAddress() {
    return CELO_REGISTRIES.identityRegistry[this.network];
  }

  /**
   * Get the Reputation Registry address for this network
   * @returns {string} Registry address
   */
  getReputationRegistryAddress() {
    return CELO_REGISTRIES.reputationRegistry[this.network];
  }
}

// ─── Factory Function ───────────────────────────────────────────────────────

/**
 * Create a configured CeloClient.
 *
 * @param {Object} options
 * @param {string} [options.privateKey] - Hex private key
 * @param {'mainnet'|'sepolia'} [options.network='sepolia'] - Network
 * @returns {CeloClient}
 */
export function createCeloClient(options = {}) {
  return new CeloClient(options);
}
