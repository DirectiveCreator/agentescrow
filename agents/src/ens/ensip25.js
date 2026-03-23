/**
 * ENSIP-25: Verifiable AI Agent Identity with ENS
 *
 * Implements the ENS standard for bidirectional verification between
 * ENS names and ERC-8004 agent registries.
 *
 * ENSIP-25 creates a two-way link:
 *   ENS name → ERC-8004 agent ID (via text record)
 *   ERC-8004 metadata → ENS name (via agentURI)
 *
 * Text record format:
 *   key: "agent-registration[<registryAddress>][<agentId>]"
 *   value: verification data (e.g., "verified" or JSON metadata)
 *
 * This enables:
 * - Verifiable agent identity: prove an ENS name controls an ERC-8004 agent
 * - Cross-protocol discovery: find agents by ENS name OR ERC-8004 ID
 * - Trust chain: ENS name → ERC-8004 → on-chain reputation
 *
 * @see https://ens.domains/blog/post/ensip-25
 * @see https://ens.domains/blog/post/ens-ai-agent-erc8004
 */

import { namehash, encodeFunctionData } from 'viem';
import { normalize } from 'viem/ens';
import {
  createEnsClients,
  getTextRecord,
  setTextRecord,
  setTextRecords,
  ENS_CONTRACTS,
  AGENT_TEXT_KEYS,
} from './client.js';
import { config } from 'dotenv';

config({ path: '../.env' });

// ─── ENSIP-25 Constants ──────────────────────────────────────────────────

/**
 * ERC-8004 Identity Registry addresses
 */
export const ERC8004_REGISTRIES = {
  baseSepolia: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  baseMainnet: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
};

/**
 * Build the ENSIP-25 text record key.
 * Format: "agent-registration[<registryAddress>][<agentId>]"
 *
 * @param {string} registryAddress - ERC-8004 registry contract address
 * @param {string|number} agentId - ERC-8004 agent token ID
 * @returns {string} ENSIP-25 text record key
 */
export function buildENSIP25Key(registryAddress, agentId) {
  return `agent-registration[${registryAddress}][${agentId}]`;
}

/**
 * Build ENSIP-25 verification value.
 * Contains structured data for verification.
 *
 * @param {object} params
 * @param {string} params.status - Verification status ("verified", "pending")
 * @param {number} params.chainId - Chain where ERC-8004 is deployed
 * @param {string} params.agentType - Agent type ("buyer", "seller", etc.)
 * @param {string} [params.timestamp] - ISO timestamp of verification
 * @returns {string} JSON verification value
 */
export function buildENSIP25Value(params) {
  return JSON.stringify({
    status: params.status || 'verified',
    chainId: params.chainId,
    agentType: params.agentType,
    timestamp: params.timestamp || new Date().toISOString(),
    protocol: 'escroue',
    version: '1.0',
  });
}

// ─── ENSIP-25 Registration ───────────────────────────────────────────────

/**
 * Set ENSIP-25 text record on an ENS name, linking it to an ERC-8004 agent.
 *
 * This creates the ENS → ERC-8004 direction of the bidirectional link.
 *
 * @param {object} publicClient - Viem public client
 * @param {object} walletClient - Viem wallet client (must own the ENS name)
 * @param {object} params
 * @param {string} params.ensName - Full ENS name (e.g., "buyer.agentescrow.eth")
 * @param {string} params.registryAddress - ERC-8004 registry address
 * @param {string|number} params.agentId - ERC-8004 agent token ID
 * @param {number} params.chainId - Chain where ERC-8004 is deployed
 * @param {string} params.agentType - Agent type for verification data
 */
export async function setENSIP25Record(publicClient, walletClient, params) {
  const { ensName, registryAddress, agentId, chainId, agentType } = params;

  const key = buildENSIP25Key(registryAddress, agentId);
  const value = buildENSIP25Value({ chainId, agentType });

  console.log(`\n🔗 Setting ENSIP-25 record on ${ensName}:`);
  console.log(`   Key: ${key}`);
  console.log(`   Value: ${value}`);

  const result = await setTextRecord(publicClient, walletClient, ensName, key, value);
  console.log(`   ✅ ENSIP-25 record set: ${result.hash}`);

  return { key, value, ...result };
}

// ─── ENSIP-25 Verification ───────────────────────────────────────────────

/**
 * Verify bidirectional ENS ↔ ERC-8004 identity link.
 *
 * Checks:
 * 1. ENS name has ENSIP-25 text record pointing to ERC-8004 agent
 * 2. (Optional) ERC-8004 agentURI references the ENS name
 *
 * @param {object} publicClient - Viem public client for ENS (Sepolia)
 * @param {string} ensName - ENS name to verify
 * @param {string} registryAddress - ERC-8004 registry address
 * @param {string|number} agentId - Expected ERC-8004 agent ID
 * @returns {object} Verification result
 */
export async function verifyENSIP25(publicClient, ensName, registryAddress, agentId) {
  const result = {
    ensName,
    registryAddress,
    agentId: String(agentId),
    verified: false,
    checks: {
      ensRecord: { passed: false, details: '' },
      recordData: { passed: false, details: '' },
    },
  };

  // Check 1: Read ENSIP-25 text record from ENS
  const key = buildENSIP25Key(registryAddress, agentId);
  const recordValue = await getTextRecord(publicClient, ensName, key);

  if (!recordValue) {
    result.checks.ensRecord.details = `No ENSIP-25 record found for key: ${key}`;
    return result;
  }

  result.checks.ensRecord.passed = true;
  result.checks.ensRecord.details = `ENSIP-25 record found: ${recordValue}`;

  // Check 2: Parse and validate record data
  try {
    const data = JSON.parse(recordValue);
    if (data.status === 'verified') {
      result.checks.recordData.passed = true;
      result.checks.recordData.details = `Verified: ${data.agentType} on chain ${data.chainId}`;
      result.recordData = data;
    } else {
      result.checks.recordData.details = `Status is "${data.status}", not "verified"`;
    }
  } catch {
    // Plain text value (e.g., just "verified")
    if (recordValue.toLowerCase().includes('verified')) {
      result.checks.recordData.passed = true;
      result.checks.recordData.details = 'Simple verification flag set';
    } else {
      result.checks.recordData.details = `Unexpected record value: ${recordValue}`;
    }
  }

  // Overall verification
  result.verified = result.checks.ensRecord.passed && result.checks.recordData.passed;

  return result;
}

/**
 * Verify multiple agents' ENSIP-25 records at once.
 */
export async function verifyMultipleAgents(publicClient, agents) {
  const results = [];
  for (const agent of agents) {
    const result = await verifyENSIP25(
      publicClient,
      agent.ensName,
      agent.registryAddress,
      agent.agentId
    );
    results.push(result);
  }
  return results;
}

// ─── Full ENSIP-25 Registration Flow ─────────────────────────────────────

/**
 * Complete ENSIP-25 registration for an Escroue agent.
 *
 * Sets:
 * 1. ENSIP-25 text record (agent-registration[registry][id])
 * 2. Standard ENS text records for agent metadata
 * 3. Cross-references between ENS and ERC-8004
 *
 * @param {object} publicClient - Viem public client
 * @param {object} walletClient - Viem wallet client
 * @param {object} params
 * @param {string} params.ensName - ENS name for the agent
 * @param {string} params.agentId - ERC-8004 agent ID
 * @param {string} params.agentType - "buyer" or "seller"
 * @param {string} [params.registryAddress] - ERC-8004 registry (defaults to Base Sepolia)
 * @param {number} [params.chainId] - Chain ID (defaults to 84532)
 */
export async function registerENSIP25Agent(publicClient, walletClient, params) {
  const {
    ensName,
    agentId,
    agentType,
    registryAddress = ERC8004_REGISTRIES.baseSepolia,
    chainId = 84532,
  } = params;

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  ENSIP-25 Agent Registration`);
  console.log(`  Agent: ${ensName}`);
  console.log(`  ERC-8004: #${agentId} on chain ${chainId}`);
  console.log(`═══════════════════════════════════════════════`);

  // Build all records at once for efficiency
  const node = namehash(normalize(ensName));
  const ensip25Key = buildENSIP25Key(registryAddress, agentId);
  const ensip25Value = buildENSIP25Value({ chainId, agentType });

  const records = {
    // ENSIP-25 verification record
    [ensip25Key]: ensip25Value,

    // Standard agent metadata
    [AGENT_TEXT_KEYS.erc8004Id]: String(agentId),
    [AGENT_TEXT_KEYS.erc8004Registry]: registryAddress,
    [AGENT_TEXT_KEYS.agentType]: agentType,
    [AGENT_TEXT_KEYS.chainId]: String(chainId),
    [AGENT_TEXT_KEYS.protocol]: 'escroue',
    [AGENT_TEXT_KEYS.status]: 'active',
  };

  console.log(`  Setting ${Object.keys(records).length} records...`);
  const result = await setTextRecords(publicClient, walletClient, ensName, records);
  console.log(`  ✅ All records set: ${result.hash}`);

  // Verify
  console.log(`  Verifying ENSIP-25...`);
  const verification = await verifyENSIP25(publicClient, ensName, registryAddress, agentId);
  console.log(`  ${verification.verified ? '✅ Verified!' : '⚠️ Verification pending (records may need propagation)'}`);

  return {
    ensName,
    agentId,
    registryAddress,
    chainId,
    ensip25Key,
    verification,
    txHash: result.hash,
  };
}

// ─── ENSIP-25 Display / Demo ─────────────────────────────────────────────

/**
 * Display ENSIP-25 verification results in a formatted way.
 */
export function displayVerification(result) {
  const status = result.verified ? '✅ VERIFIED' : '❌ NOT VERIFIED';

  console.log(`\n  🔗 ENSIP-25 Verification: ${result.ensName}`);
  console.log(`     Status: ${status}`);
  console.log(`     Registry: ${result.registryAddress}`);
  console.log(`     Agent ID: #${result.agentId}`);

  for (const [check, data] of Object.entries(result.checks)) {
    const icon = data.passed ? '✅' : '❌';
    console.log(`     ${icon} ${check}: ${data.details}`);
  }

  if (result.recordData) {
    console.log(`     Protocol: ${result.recordData.protocol}`);
    console.log(`     Chain: ${result.recordData.chainId}`);
    console.log(`     Type: ${result.recordData.agentType}`);
    console.log(`     Timestamp: ${result.recordData.timestamp}`);
  }
}

// ─── Simulation Support ──────────────────────────────────────────────────

/**
 * Simulated ENSIP-25 verification (for demo without network).
 */
export function simulateENSIP25Verification(ensName, agentId, agentType) {
  const registryAddress = ERC8004_REGISTRIES.baseSepolia;
  const key = buildENSIP25Key(registryAddress, agentId);
  const value = buildENSIP25Value({
    chainId: 84532,
    agentType,
    timestamp: new Date().toISOString(),
  });

  return {
    ensName,
    registryAddress,
    agentId: String(agentId),
    verified: true,
    checks: {
      ensRecord: {
        passed: true,
        details: `ENSIP-25 record found: ${value}`,
      },
      recordData: {
        passed: true,
        details: `Verified: ${agentType} on chain 84532`,
      },
    },
    recordData: JSON.parse(value),
    ensip25Key: key,
  };
}

export { buildENSIP25Key as getENSIP25Key };
