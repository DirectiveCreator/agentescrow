/**
 * Ampersend Integration — Module Exports
 *
 * Managed agent payment infrastructure via @ampersend_ai/ampersend-sdk.
 * Wraps x402 with wallets, spend limits, and human oversight.
 */

export {
  createDemoWallet,
  createDemoTreasurer,
  createManagedTreasurer,
  createPayingFetch,
  createPaidMcpServer,
  createPayingMcpClient,
  buildPaymentRequirements,
  DEFAULT_CONFIG,
} from './client.js';
