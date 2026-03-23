/**
 * Filecoin Onchain Cloud (FOC) Integration
 *
 * Provides autonomous storage and retrieval for the Escroue protocol:
 * - Task delivery content stored permanently on Filecoin
 * - PieceCIDs used as verifiable delivery hashes on-chain
 * - Agent memory persistence across sessions
 * - TEE attestation archival for audit trails
 *
 * @module filecoin
 */

export { AgentStorage, createFOCClient, NETWORKS } from './client.js';
export { FilecoinSellerAgent } from './enhanced-seller.js';
export { FilecoinBuyerAgent } from './enhanced-buyer.js';
