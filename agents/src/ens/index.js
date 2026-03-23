/**
 * ENS Integration Module for Escroue
 *
 * Provides ENS identity, resolution, communication, and discovery
 * for AI agents in the Escroue marketplace.
 *
 * Targets 3 ENS hackathon prize tracks ($1,500 total):
 * - ENS Identity ($600): Agent subdomains + text records + ENSIP-25
 * - ENS Communication ($600): XMTP messaging + name-based routing + payments
 * - ENS Open Integration ($300): ENS as core identity layer
 */

export {
  // Client
  createEnsClients,
  ENS_CONTRACTS,

  // Resolution
  resolveName,
  resolveAddress,

  // Text Records
  getTextRecord,
  getAgentProfile,
  setTextRecord,
  setTextRecords,
  setAddress,
  AGENT_TEXT_KEYS,

  // Subdomains
  createSubdomain,
  createWrappedSubdomain,

  // Agent Registration
  registerAgentENS,

  // Discovery & Communication
  discoverAgents,
  lookupAgentEndpoint,
  routeTaskByName,
  resolvePaymentAddress,

  // Reverse Resolution
  setPrimaryName,

  // Utilities
  namehash,
  labelhash,
  normalize,
} from './client.js';

// ENSIP-25 Bidirectional Verification
export {
  buildENSIP25Key,
  buildENSIP25Value,
  setENSIP25Record,
  verifyENSIP25,
  verifyMultipleAgents,
  registerENSIP25Agent,
  displayVerification,
  simulateENSIP25Verification,
  ERC8004_REGISTRIES,
} from './ensip25.js';

// XMTP Agent Messaging
export {
  createAgentMessenger,
  createSimulatedMessenger,
  runSimulatedNegotiation,
  MessageTypes,
  buildAgentMessage,
  parseAgentMessage,
  createTaskNegotiationMessages,
} from './xmtp-messaging.js';
