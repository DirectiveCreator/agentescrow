/**
 * ENS Client for Escroue
 *
 * Provides ENS identity, resolution, and text record management for AI agents.
 * Uses Ethereum Sepolia for ENS (mainnet ENS names resolve cross-chain).
 *
 * Features:
 * - Forward resolution: name → address
 * - Reverse resolution: address → name
 * - Text record read/write (avatar, description, capabilities, etc.)
 * - Subdomain creation via NameWrapper
 * - Agent discovery by ENS name
 *
 * ENS Sepolia contracts (same addresses as mainnet):
 * - Registry:           0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
 * - Public Resolver:    0x8FADE66B79cC9f707aB26799354482EB93a5B7dD
 * - NameWrapper:        0x0635513f179D50A207757E05759CbD106d7dFcE8
 * - ETH Registrar:      0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968
 * - Universal Resolver: 0xc8Af999e38273D658BE1b921b88A9Ddf005769cC
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  labelhash,
  encodeFunctionData,
  keccak256,
  toHex,
  encodePacked,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { config } from 'dotenv';

config({ path: '../.env' });

// ─── ENS Sepolia Contract Addresses ───────────────────────────────────────
const ENS_CONTRACTS = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  publicResolver: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
  nameWrapper: '0x0635513f179D50A207757E05759CbD106d7dFcE8',
  universalResolver: '0xc8Af999e38273D658BE1b921b88A9Ddf005769cC',
  ethRegistrarController: '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968',
  reverseRegistrar: '0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6',
};

// ─── ABIs ─────────────────────────────────────────────────────────────────
const RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'addr', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'multicallWithNodeCheck',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nodehash', type: 'bytes32' },
      { name: 'data', type: 'bytes[]' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
];

const REGISTRY_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'resolver',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
    ],
    outputs: [],
  },
];

const NAME_WRAPPER_ABI = [
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' },
    ],
    outputs: [{ name: 'node', type: 'bytes32' }],
  },
  {
    name: 'isWrapped',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
];

const REVERSE_REGISTRAR_ABI = [
  {
    name: 'setName',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
];

// ─── Client Factory ───────────────────────────────────────────────────────

/**
 * Create an ENS client for Ethereum Sepolia.
 * ENS lives on Ethereum, not Base — we use a separate client.
 */
export function createEnsClients(privateKey) {
  const rpcUrl = process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org';

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  let walletClient = null;
  let account = null;

  if (privateKey) {
    account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);
    walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });
  }

  return { publicClient, walletClient, account };
}

// ─── Resolution ───────────────────────────────────────────────────────────

/**
 * Resolve an ENS name to an Ethereum address.
 * @param {string} name - ENS name (e.g., "buyer.agentescrow.eth")
 * @returns {string|null} Address or null
 */
export async function resolveName(publicClient, name) {
  try {
    const address = await publicClient.getEnsAddress({
      name: normalize(name),
      universalResolverAddress: ENS_CONTRACTS.universalResolver,
    });
    return address;
  } catch (err) {
    console.warn(`ENS resolution failed for ${name}: ${err.message}`);
    return null;
  }
}

/**
 * Reverse resolve an address to an ENS name.
 * @param {string} address - Ethereum address
 * @returns {string|null} ENS name or null
 */
export async function resolveAddress(publicClient, address) {
  try {
    const name = await publicClient.getEnsName({
      address,
      universalResolverAddress: ENS_CONTRACTS.universalResolver,
    });
    return name;
  } catch (err) {
    console.warn(`ENS reverse resolution failed for ${address}: ${err.message}`);
    return null;
  }
}

// ─── Text Records ─────────────────────────────────────────────────────────

/**
 * Standard text record keys for Escroue agents.
 * These follow ENSIP-5/ENSIP-18 conventions plus custom agent-specific keys.
 */
export const AGENT_TEXT_KEYS = {
  // Standard ENS text records
  avatar: 'avatar',
  description: 'description',
  url: 'url',
  github: 'com.github',
  twitter: 'com.twitter',

  // Agent-specific custom records (namespaced)
  agentType: 'ai.agent.type', // "buyer" | "seller" | "arbiter"
  capabilities: 'ai.agent.capabilities', // JSON array of capabilities
  erc8004Id: 'ai.agent.erc8004.id', // ERC-8004 agent ID
  erc8004Registry: 'ai.agent.erc8004.registry', // ERC-8004 registry address
  reputationScore: 'ai.agent.reputation.score', // Current trust score
  reputationRegistry: 'ai.agent.reputation.registry', // ReputationRegistry address
  serviceBoardAddress: 'ai.agent.serviceBoard', // ServiceBoard contract
  escrowVaultAddress: 'ai.agent.escrowVault', // EscrowVault contract
  chainId: 'ai.agent.chainId', // Operating chain (e.g., "84532" for Base Sepolia)
  status: 'ai.agent.status', // "active" | "paused" | "offline"
  protocol: 'ai.agent.protocol', // "escroue"
};

/**
 * Read a text record from an ENS name.
 */
export async function getTextRecord(publicClient, name, key) {
  try {
    const result = await publicClient.getEnsText({
      name: normalize(name),
      key,
      universalResolverAddress: ENS_CONTRACTS.universalResolver,
    });
    return result;
  } catch (err) {
    console.warn(`Failed to read text record ${key} for ${name}: ${err.message}`);
    return null;
  }
}

/**
 * Read all agent-specific text records from an ENS name.
 * Returns a structured agent profile.
 */
export async function getAgentProfile(publicClient, name) {
  const profile = { name, records: {} };

  for (const [field, key] of Object.entries(AGENT_TEXT_KEYS)) {
    const value = await getTextRecord(publicClient, name, key);
    if (value) {
      profile.records[field] = value;
    }
  }

  // Parse capabilities JSON if present
  if (profile.records.capabilities) {
    try {
      profile.records.capabilities = JSON.parse(profile.records.capabilities);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  // Resolve address
  profile.address = await resolveName(publicClient, name);

  return profile;
}

/**
 * Set a text record on an ENS name.
 * Requires wallet client with owner permissions.
 */
export async function setTextRecord(publicClient, walletClient, name, key, value) {
  const node = namehash(normalize(name));

  const hash = await walletClient.writeContract({
    address: ENS_CONTRACTS.publicResolver,
    abi: RESOLVER_ABI,
    functionName: 'setText',
    args: [node, key, value],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

/**
 * Set multiple text records in a single transaction using multicall.
 */
export async function setTextRecords(publicClient, walletClient, name, records) {
  const node = namehash(normalize(name));

  // Encode each setText call
  const calls = Object.entries(records).map(([key, value]) =>
    encodeFunctionData({
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [node, key, String(value)],
    })
  );

  const hash = await walletClient.writeContract({
    address: ENS_CONTRACTS.publicResolver,
    abi: RESOLVER_ABI,
    functionName: 'multicallWithNodeCheck',
    args: [node, calls],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt, recordCount: calls.length };
}

/**
 * Set the ETH address for an ENS name.
 */
export async function setAddress(publicClient, walletClient, name, address) {
  const node = namehash(normalize(name));

  const hash = await walletClient.writeContract({
    address: ENS_CONTRACTS.publicResolver,
    abi: RESOLVER_ABI,
    functionName: 'setAddr',
    args: [node, address],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

// ─── Subdomain Management ─────────────────────────────────────────────────

/**
 * Create a subdomain under a parent ENS name.
 * Uses the ENS Registry directly (for unwrapped names).
 *
 * @param {string} parentName - Parent name (e.g., "agentescrow.eth")
 * @param {string} label - Subdomain label (e.g., "buyer")
 * @param {string} ownerAddress - Owner of the subdomain
 */
export async function createSubdomain(publicClient, walletClient, parentName, label, ownerAddress) {
  const parentNode = namehash(normalize(parentName));
  const labelHash = labelhash(label);

  const hash = await walletClient.writeContract({
    address: ENS_CONTRACTS.registry,
    abi: REGISTRY_ABI,
    functionName: 'setSubnodeRecord',
    args: [
      parentNode,
      labelHash,
      ownerAddress,
      ENS_CONTRACTS.publicResolver,
      BigInt(0), // TTL
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const fullName = `${label}.${parentName}`;
  return { hash, receipt, name: fullName, node: namehash(normalize(fullName)) };
}

/**
 * Create a subdomain under a wrapped parent name (via NameWrapper).
 */
export async function createWrappedSubdomain(
  publicClient,
  walletClient,
  parentName,
  label,
  ownerAddress,
  expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60) // 1 year
) {
  const parentNode = namehash(normalize(parentName));

  const hash = await walletClient.writeContract({
    address: ENS_CONTRACTS.nameWrapper,
    abi: NAME_WRAPPER_ABI,
    functionName: 'setSubnodeRecord',
    args: [
      parentNode,
      label,
      ownerAddress,
      ENS_CONTRACTS.publicResolver,
      BigInt(0), // TTL
      0, // No fuses burned
      expiry,
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const fullName = `${label}.${parentName}`;
  return { hash, receipt, name: fullName, node: namehash(normalize(fullName)) };
}

// ─── Agent Registration (Full Flow) ───────────────────────────────────────

/**
 * Register an agent with full ENS identity.
 * Creates subdomain + sets all text records + sets address.
 *
 * @param {object} params
 * @param {string} params.parentName - Parent ENS name
 * @param {string} params.label - Agent subdomain label (e.g., "buyer")
 * @param {string} params.ownerAddress - Agent's Ethereum address
 * @param {object} params.metadata - Agent metadata for text records
 */
export async function registerAgentENS(publicClient, walletClient, params) {
  const { parentName, label, ownerAddress, metadata } = params;
  const fullName = `${label}.${parentName}`;

  console.log(`\n🏷️  Registering ENS identity: ${fullName}`);
  console.log(`   Owner: ${ownerAddress}`);

  // Step 1: Create subdomain
  console.log('   ⏳ Creating subdomain...');
  const subResult = await createSubdomain(publicClient, walletClient, parentName, label, ownerAddress);
  console.log(`   ✅ Subdomain created: ${subResult.hash}`);

  // Step 2: Set ETH address
  console.log('   ⏳ Setting address record...');
  const addrResult = await setAddress(publicClient, walletClient, fullName, ownerAddress);
  console.log(`   ✅ Address set: ${addrResult.hash}`);

  // Step 3: Set text records
  const records = {};
  if (metadata.avatar) records[AGENT_TEXT_KEYS.avatar] = metadata.avatar;
  if (metadata.description) records[AGENT_TEXT_KEYS.description] = metadata.description;
  if (metadata.url) records[AGENT_TEXT_KEYS.url] = metadata.url;
  if (metadata.agentType) records[AGENT_TEXT_KEYS.agentType] = metadata.agentType;
  if (metadata.capabilities) {
    records[AGENT_TEXT_KEYS.capabilities] = JSON.stringify(metadata.capabilities);
  }
  if (metadata.erc8004Id) records[AGENT_TEXT_KEYS.erc8004Id] = String(metadata.erc8004Id);
  if (metadata.erc8004Registry) records[AGENT_TEXT_KEYS.erc8004Registry] = metadata.erc8004Registry;
  if (metadata.reputationScore) records[AGENT_TEXT_KEYS.reputationScore] = String(metadata.reputationScore);
  if (metadata.reputationRegistry) records[AGENT_TEXT_KEYS.reputationRegistry] = metadata.reputationRegistry;
  if (metadata.serviceBoardAddress) records[AGENT_TEXT_KEYS.serviceBoardAddress] = metadata.serviceBoardAddress;
  if (metadata.escrowVaultAddress) records[AGENT_TEXT_KEYS.escrowVaultAddress] = metadata.escrowVaultAddress;
  if (metadata.chainId) records[AGENT_TEXT_KEYS.chainId] = String(metadata.chainId);
  if (metadata.status) records[AGENT_TEXT_KEYS.status] = metadata.status;
  records[AGENT_TEXT_KEYS.protocol] = 'escroue';

  if (Object.keys(records).length > 0) {
    console.log(`   ⏳ Setting ${Object.keys(records).length} text records...`);
    const textResult = await setTextRecords(publicClient, walletClient, fullName, records);
    console.log(`   ✅ Text records set: ${textResult.hash}`);
  }

  console.log(`   🎉 Agent registered: ${fullName}`);

  return {
    name: fullName,
    node: subResult.node,
    address: ownerAddress,
    records,
    transactions: {
      subdomain: subResult.hash,
      address: addrResult.hash,
    },
  };
}

// ─── Agent Discovery ──────────────────────────────────────────────────────

/**
 * Discover agents under a parent ENS name.
 * Checks common agent subdomain labels.
 */
export async function discoverAgents(publicClient, parentName, labels = ['buyer', 'seller', 'arbiter', 'oracle', 'escrow']) {
  const agents = [];

  for (const label of labels) {
    const fullName = `${label}.${parentName}`;
    const address = await resolveName(publicClient, fullName);
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      const profile = await getAgentProfile(publicClient, fullName);
      agents.push(profile);
    }
  }

  return agents;
}

/**
 * Look up an agent by ENS name and return its service endpoints.
 * Used for agent-to-agent communication routing.
 */
export async function lookupAgentEndpoint(publicClient, name) {
  const profile = await getAgentProfile(publicClient, name);
  if (!profile.address) return null;

  return {
    name: profile.name,
    address: profile.address,
    serviceBoard: profile.records.serviceBoardAddress,
    escrowVault: profile.records.escrowVaultAddress,
    chainId: profile.records.chainId,
    type: profile.records.agentType,
    status: profile.records.status,
    capabilities: profile.records.capabilities,
  };
}

// ─── Communication via ENS ────────────────────────────────────────────────

/**
 * Route a task to an agent by ENS name.
 * Resolves the name, reads capabilities, and returns routing info.
 *
 * This replaces raw address-based routing with human-readable ENS names:
 *   Before: routeTask("0xC07b695eC19DE38f1e62e825585B2818077B96cC", taskData)
 *   After:  routeTask("seller.agentescrow.eth", taskData)
 */
export async function routeTaskByName(publicClient, agentName, taskData) {
  const endpoint = await lookupAgentEndpoint(publicClient, agentName);
  if (!endpoint) {
    throw new Error(`Agent not found: ${agentName}`);
  }

  if (endpoint.status === 'offline') {
    throw new Error(`Agent ${agentName} is offline`);
  }

  // Check capabilities match
  if (taskData.type && endpoint.capabilities) {
    const caps = Array.isArray(endpoint.capabilities) ? endpoint.capabilities : [];
    if (caps.length > 0 && !caps.includes(taskData.type)) {
      console.warn(`Agent ${agentName} may not support task type: ${taskData.type}`);
    }
  }

  return {
    resolved: true,
    agent: endpoint,
    task: taskData,
    routedTo: endpoint.address,
    routedVia: 'ens',
  };
}

/**
 * Resolve payment destination by ENS name.
 * Instead of sending ETH to a raw address, send to "seller.agentescrow.eth".
 */
export async function resolvePaymentAddress(publicClient, name) {
  const address = await resolveName(publicClient, name);
  if (!address) {
    throw new Error(`Cannot resolve payment address for: ${name}`);
  }

  // Read the agent's preferred chain for payment routing
  const chainId = await getTextRecord(publicClient, name, AGENT_TEXT_KEYS.chainId);
  const escrowVault = await getTextRecord(publicClient, name, AGENT_TEXT_KEYS.escrowVaultAddress);

  return {
    name,
    address,
    chainId: chainId ? parseInt(chainId) : null,
    escrowVault,
  };
}

// ─── Reverse Resolution (Primary Name) ───────────────────────────────────

/**
 * Set primary ENS name (reverse record) for the connected wallet.
 */
export async function setPrimaryName(publicClient, walletClient, name) {
  const hash = await walletClient.writeContract({
    address: ENS_CONTRACTS.reverseRegistrar,
    abi: REVERSE_REGISTRAR_ABI,
    functionName: 'setName',
    args: [normalize(name)],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

// ─── Exports ──────────────────────────────────────────────────────────────

export { ENS_CONTRACTS, namehash, labelhash, normalize };
