/**
 * Celo Integration for Escroue
 *
 * Provides stablecoin-native agent commerce on Celo:
 * - CeloClient with stablecoin helpers and fee abstraction
 * - Contract deployment to Celo Alfajores/Mainnet
 * - ERC-8004 identity registration on Celo
 * - Full demo with cUSD escrow lifecycle
 *
 * @module celo
 */

export {
  CeloClient,
  createCeloClient,
  CELO_NETWORKS,
  CELO_STABLECOINS,
  CELO_REGISTRIES,
  FEE_CURRENCY_ADAPTERS,
} from './client.js';
