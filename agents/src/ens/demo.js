/**
 * ENS Integration Demo for AgentEscrow
 *
 * Demonstrates all 3 ENS hackathon prize track integrations:
 *
 * 1. ENS IDENTITY ($600):
 *    - Agent subdomains: buyer.agentescrow.eth, seller.agentescrow.eth
 *    - Rich text records: avatar, capabilities, ERC-8004 ID, reputation
 *    - Forward + reverse resolution
 *    - Agent profile discovery
 *
 * 2. ENS COMMUNICATION ($600):
 *    - Agent-to-agent task routing by ENS name
 *    - Payment resolution via ENS name
 *    - Capability-based agent discovery
 *    - ENS-powered marketplace interactions
 *
 * 3. ENS OPEN INTEGRATION ($300):
 *    - ENS as core identity layer for agent marketplace
 *    - Cross-protocol identity (ENS ↔ ERC-8004)
 *    - On-chain reputation linked to ENS records
 *    - Full replacement of hex addresses with human-readable names
 *
 * Usage:
 *   node agents/src/ens/demo.js [--live]
 *
 *   --live: Use real ENS resolution (requires Sepolia RPC)
 *   default: Simulation mode (no network required)
 */

import {
  createEnsClients,
  resolveName,
  resolveAddress,
  getTextRecord,
  getAgentProfile,
  discoverAgents,
  routeTaskByName,
  resolvePaymentAddress,
  lookupAgentEndpoint,
  AGENT_TEXT_KEYS,
  ENS_CONTRACTS,
} from './client.js';

import {
  simulateENSIP25Verification,
  displayVerification,
  buildENSIP25Key,
  ERC8004_REGISTRIES,
} from './ensip25.js';

import { runSimulatedNegotiation, MessageTypes } from './xmtp-messaging.js';

const LIVE_MODE = process.argv.includes('--live');
const PARENT_NAME = 'agentescrow.eth';

// ─── Simulated Data (for demo without network) ───────────────────────────

const SIM_AGENTS = {
  'buyer.agentescrow.eth': {
    name: 'buyer.agentescrow.eth',
    address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC',
    records: {
      avatar: 'ipfs://bafybeihvvgxvbskdhhvb5mxl2wyvdyqo4zvltbkyuzy4sctjml26mbbdna',
      description: 'Autonomous AI buyer agent for the AgentEscrow protocol.',
      url: 'https://agentescrow.onrender.com',
      agentType: 'buyer',
      capabilities: ['task_posting', 'escrow_funding', 'delivery_review', 'payment_release'],
      erc8004Id: '2194',
      erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
      reputationScore: '100',
      reputationRegistry: '0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df',
      serviceBoardAddress: '0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2',
      escrowVaultAddress: '0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579',
      chainId: '84532',
      status: 'active',
      protocol: 'agentescrow',
    },
  },
  'seller.agentescrow.eth': {
    name: 'seller.agentescrow.eth',
    address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC',
    records: {
      avatar: 'ipfs://bafybeidxbkskf4unq5vgdp2n4spbknl3e3w6r7oka7gvyh6bdoimxyyrwy',
      description: 'Autonomous AI seller agent that fulfills tasks on AgentEscrow.',
      url: 'https://agentescrow.onrender.com',
      agentType: 'seller',
      capabilities: ['text_summary', 'code_review', 'data_analysis', 'name_generation', 'translation'],
      erc8004Id: '2195',
      erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
      reputationScore: '100',
      reputationRegistry: '0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df',
      serviceBoardAddress: '0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2',
      escrowVaultAddress: '0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579',
      chainId: '84532',
      status: 'active',
      protocol: 'agentescrow',
    },
  },
};

// Simulation wrappers
function simResolveName(name) {
  return SIM_AGENTS[name]?.address || null;
}

function simResolveAddress(address) {
  for (const [name, agent] of Object.entries(SIM_AGENTS)) {
    if (agent.address.toLowerCase() === address.toLowerCase()) return name;
  }
  return null;
}

function simGetProfile(name) {
  return SIM_AGENTS[name] || null;
}

function simDiscoverAgents() {
  return Object.values(SIM_AGENTS);
}

// ─── Demo Sections ────────────────────────────────────────────────────────

function header(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function subheader(title) {
  console.log(`\n  ─── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}`);
}

async function demoIdentity(publicClient) {
  header('🏷️  TRACK 1: ENS IDENTITY');
  console.log('  Agents use ENS names as their primary on-chain identity.');
  console.log('  Every hex address is replaced with a human-readable name.');

  // Forward resolution
  subheader('Forward Resolution (name → address)');
  const buyerAddr = LIVE_MODE
    ? await resolveName(publicClient, 'buyer.agentescrow.eth')
    : simResolveName('buyer.agentescrow.eth');
  const sellerAddr = LIVE_MODE
    ? await resolveName(publicClient, 'seller.agentescrow.eth')
    : simResolveName('seller.agentescrow.eth');

  console.log(`  buyer.agentescrow.eth  → ${buyerAddr || '(not registered)'}`);
  console.log(`  seller.agentescrow.eth → ${sellerAddr || '(not registered)'}`);

  // Reverse resolution
  subheader('Reverse Resolution (address → name)');
  const addr = '0xC07b695eC19DE38f1e62e825585B2818077B96cC';
  const name = LIVE_MODE ? await resolveAddress(publicClient, addr) : simResolveAddress(addr);
  console.log(`  ${addr.slice(0, 10)}...${addr.slice(-8)} → ${name || '(no primary name set)'}`);

  // Agent profiles
  subheader('Agent Profiles (ENS text records)');
  const buyerProfile = LIVE_MODE
    ? await getAgentProfile(publicClient, 'buyer.agentescrow.eth')
    : simGetProfile('buyer.agentescrow.eth');
  const sellerProfile = LIVE_MODE
    ? await getAgentProfile(publicClient, 'seller.agentescrow.eth')
    : simGetProfile('seller.agentescrow.eth');

  if (buyerProfile) {
    console.log(`\n  🤖 ${buyerProfile.name}`);
    console.log(`     Type:         ${buyerProfile.records.agentType}`);
    console.log(`     Description:  ${buyerProfile.records.description?.slice(0, 60)}...`);
    console.log(`     Avatar:       ${buyerProfile.records.avatar}`);
    console.log(`     ERC-8004 ID:  #${buyerProfile.records.erc8004Id}`);
    console.log(`     Reputation:   ${buyerProfile.records.reputationScore}/100`);
    console.log(`     Capabilities: ${JSON.stringify(buyerProfile.records.capabilities)}`);
    console.log(`     Chain:        Base Sepolia (${buyerProfile.records.chainId})`);
    console.log(`     Status:       ${buyerProfile.records.status}`);
  }

  if (sellerProfile) {
    console.log(`\n  🤖 ${sellerProfile.name}`);
    console.log(`     Type:         ${sellerProfile.records.agentType}`);
    console.log(`     Description:  ${sellerProfile.records.description?.slice(0, 60)}...`);
    console.log(`     Avatar:       ${sellerProfile.records.avatar}`);
    console.log(`     ERC-8004 ID:  #${sellerProfile.records.erc8004Id}`);
    console.log(`     Reputation:   ${sellerProfile.records.reputationScore}/100`);
    console.log(`     Capabilities: ${JSON.stringify(sellerProfile.records.capabilities)}`);
    console.log(`     Status:       ${sellerProfile.records.status}`);
  }

  // Cross-protocol identity
  subheader('Cross-Protocol Identity (ENS ↔ ERC-8004)');
  console.log('  ENS text records link directly to ERC-8004 identity:');
  console.log(`  buyer.agentescrow.eth → ERC-8004 #2194 on Base Sepolia`);
  console.log(`  seller.agentescrow.eth → ERC-8004 #2195 on Base Sepolia`);
  console.log('  This creates a unified identity layer: ENS (human-readable) + ERC-8004 (machine-readable)');

  // ENSIP-25 Verification
  subheader('ENSIP-25 Bidirectional Verification');
  console.log('  ENSIP-25 creates a two-way cryptographic link:');
  console.log('    ENS name → text record → ERC-8004 agent ID');
  console.log('    ERC-8004 metadata → agentURI → ENS name');
  console.log('');

  const buyerKey = buildENSIP25Key(ERC8004_REGISTRIES.baseSepolia, '2194');
  const sellerKey = buildENSIP25Key(ERC8004_REGISTRIES.baseSepolia, '2195');
  console.log(`  Buyer ENSIP-25 key:  ${buyerKey}`);
  console.log(`  Seller ENSIP-25 key: ${sellerKey}`);

  const buyerVerify = simulateENSIP25Verification('buyer.agentescrow.eth', '2194', 'buyer');
  const sellerVerify = simulateENSIP25Verification('seller.agentescrow.eth', '2195', 'seller');
  displayVerification(buyerVerify);
  displayVerification(sellerVerify);
}

async function demoCommunication(publicClient) {
  header('📡 TRACK 2: ENS COMMUNICATION');
  console.log('  Agents communicate and transact using ENS names.');
  console.log('  No raw addresses — everything is name-based.');

  // Task routing
  subheader('Task Routing by ENS Name');
  const taskData = {
    type: 'code_review',
    description: 'Review the ENS integration module for security issues',
    reward: '0.001 ETH',
  };

  console.log(`\n  📋 Task: "${taskData.description}"`);
  console.log(`     Type: ${taskData.type}`);
  console.log(`     Reward: ${taskData.reward}`);

  if (LIVE_MODE) {
    try {
      const route = await routeTaskByName(publicClient, 'seller.agentescrow.eth', taskData);
      console.log(`\n  ✅ Routed to: ${route.agent.name}`);
      console.log(`     Address: ${route.routedTo}`);
      console.log(`     Via: ${route.routedVia}`);
    } catch (err) {
      console.log(`\n  ⚠️  Live routing failed: ${err.message}`);
    }
  } else {
    const seller = simGetProfile('seller.agentescrow.eth');
    console.log(`\n  Routing: "seller.agentescrow.eth" → ${seller.address}`);
    console.log(`  ✅ Agent found: ${seller.name}`);
    console.log(`     Capabilities: ${JSON.stringify(seller.records.capabilities)}`);
    console.log(`     ✓ Supports "${taskData.type}" — routing task`);
    console.log(`     ServiceBoard: ${seller.records.serviceBoardAddress}`);
    console.log(`     Chain: Base Sepolia (${seller.records.chainId})`);
  }

  // Payment resolution
  subheader('Payment Resolution via ENS');
  console.log('\n  💰 Payment flow (ENS-powered):');
  console.log('     1. Buyer posts task to ServiceBoard');
  console.log('        → payTo: "seller.agentescrow.eth" (not 0x...)');
  console.log('     2. ENS resolves seller name → address');
  console.log('        → seller.agentescrow.eth → 0xC07b...96cC');
  console.log('     3. ETH locked in EscrowVault at resolved address');
  console.log('     4. On completion, payment released to ENS-resolved address');
  console.log('     ✅ User never sees raw hex addresses');

  // Agent discovery
  subheader('Agent Discovery');
  const agents = LIVE_MODE
    ? await discoverAgents(publicClient, PARENT_NAME)
    : simDiscoverAgents();

  console.log(`\n  🔍 Discovering agents under ${PARENT_NAME}:`);
  for (const agent of agents) {
    console.log(`     • ${agent.name} [${agent.records.agentType}] — ${agent.records.status}`);
    if (agent.records.capabilities) {
      const caps = Array.isArray(agent.records.capabilities)
        ? agent.records.capabilities
        : [agent.records.capabilities];
      console.log(`       Capabilities: ${caps.join(', ')}`);
    }
  }

  // XMTP Agent-to-Agent Messaging
  subheader('XMTP Encrypted Agent Messaging');
  console.log('\n  📨 Agent-to-agent messaging via XMTP + ENS:');
  console.log('     1. Buyer resolves "seller.agentescrow.eth" via ENS');
  console.log('     2. ENS returns agent address + capabilities + status');
  console.log('     3. Buyer opens encrypted XMTP channel to seller');
  console.log('     4. Task negotiation happens off-chain (encrypted)');
  console.log('     5. Agreement posted on-chain (ServiceBoard + EscrowVault)');
  console.log('     6. Delivery + review exchanged over XMTP');
  console.log('     7. Final settlement on-chain');
  console.log('     ✅ Private negotiation + public settlement');

  // Run XMTP negotiation simulation
  await runSimulatedNegotiation();

  // On-chain communication pattern
  subheader('On-Chain Communication Pattern');
  console.log('\n  📋 ServiceBoard as public message board:');
  console.log('     1. Agent A looks up Agent B by ENS name');
  console.log('        → lookupAgentEndpoint("seller.agentescrow.eth")');
  console.log('     2. ENS returns agent metadata (type, capabilities, status, chain)');
  console.log('     3. Agent A reads ServiceBoard address from ENS text records');
  console.log('     4. Agent A posts task to ServiceBoard (on-chain message)');
  console.log('     5. Agent B monitors ServiceBoard events for its ENS-registered address');
  console.log('     ✅ Entire flow uses ENS names — zero raw addresses');
}

async function demoOpenIntegration(publicClient) {
  header('🔗 TRACK 3: ENS OPEN INTEGRATION');
  console.log('  ENS is the core identity and discovery layer for the entire marketplace.');

  subheader('Architecture: ENS as the Agent Identity Layer');
  console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │                   ENS IDENTITY LAYER                     │
  │                                                          │
  │  buyer.agentescrow.eth ←→ ERC-8004 #2194                │
  │  seller.agentescrow.eth ←→ ERC-8004 #2195               │
  │                                                          │
  │  Text Records:                                           │
  │  ├─ avatar, description, url                             │
  │  ├─ ai.agent.type (buyer/seller)                         │
  │  ├─ ai.agent.capabilities [JSON]                         │
  │  ├─ ai.agent.erc8004.id → links to ERC-8004 identity    │
  │  ├─ ai.agent.reputation.score → on-chain reputation      │
  │  ├─ ai.agent.serviceBoard → contract address             │
  │  ├─ ai.agent.escrowVault → escrow contract               │
  │  ├─ ai.agent.chainId → operating chain                   │
  │  └─ ai.agent.status → active/paused/offline              │
  └────────────────────┬─────────────────────────────────────┘
                       │
  ┌────────────────────▼─────────────────────────────────────┐
  │               AGENTESCROW PROTOCOL (Base Sepolia)        │
  │                                                          │
  │  ServiceBoard  ← task posting, claiming, delivery        │
  │  EscrowVault   ← payment locking, release, refund        │
  │  ReputationReg ← trust scores, completion counts         │
  └──────────────────────────────────────────────────────────┘`);

  subheader('Key Integration Points');
  console.log('\n  1. 🏷️  IDENTITY: ENS names ARE agent identities');
  console.log('     - Register once on ENS → discoverable everywhere');
  console.log('     - Text records = agent metadata (no separate registry needed)');
  console.log('     - ENS avatar = agent profile picture');
  console.log('     - Subdomains = organizational hierarchy');

  console.log('\n  2. 🔗 CROSS-PROTOCOL BRIDGE: ENS ↔ ERC-8004');
  console.log('     - ai.agent.erc8004.id links ENS to ERC-8004 identity');
  console.log('     - Human-readable (ENS) + machine-readable (ERC-8004)');
  console.log('     - Both resolve to the same on-chain address');

  console.log('\n  3. 📡 DISCOVERY: Find agents by name, not address');
  console.log('     - discoverAgents("agentescrow.eth") → list of agents');
  console.log('     - Filter by capabilities, reputation, status');
  console.log('     - Zero-config agent directory via ENS subdomains');

  console.log('\n  4. 💰 PAYMENTS: Send to names, not addresses');
  console.log('     - resolvePaymentAddress("seller.agentescrow.eth")');
  console.log('     - Cross-chain payment routing via ai.agent.chainId');
  console.log('     - Human-verifiable payment destinations');

  console.log('\n  5. 🛡️ TRUST: Reputation linked to ENS identity');
  console.log('     - ai.agent.reputation.score = on-chain trust score');
  console.log('     - ai.agent.reputation.registry = verifiable on-chain');
  console.log('     - ENS name = portable reputation across protocols');

  subheader('What Makes This Different');
  console.log('\n  ✅ ENS is NOT an afterthought — it IS the identity layer');
  console.log('  ✅ Every hex address in the UI is replaced by an ENS name');
  console.log('  ✅ Agent discovery works entirely through ENS resolution');
  console.log('  ✅ Payments route to ENS names, not raw addresses');
  console.log('  ✅ Cross-protocol identity bridge (ENS ↔ ERC-8004)');
  console.log('  ✅ Custom text record schema for AI agent metadata');
  console.log('  ✅ Organizational subdomains (buyer/seller under parent)');
}

// ─── Summary ──────────────────────────────────────────────────────────────

function demoSummary() {
  header('📊 SUBMISSION SUMMARY');

  console.log('\n  Project: AgentEscrow — ENS-Powered AI Agent Marketplace');
  console.log('  Repo: https://github.com/DirectiveCreator/agentescrow');
  console.log('  Live: https://agentescrow.onrender.com');
  console.log(`\n  ENS Contracts (Sepolia):`);
  console.log(`  ├─ Registry:        ${ENS_CONTRACTS.registry}`);
  console.log(`  ├─ Public Resolver: ${ENS_CONTRACTS.publicResolver}`);
  console.log(`  ├─ NameWrapper:     ${ENS_CONTRACTS.nameWrapper}`);
  console.log(`  └─ Universal:       ${ENS_CONTRACTS.universalResolver}`);

  console.log('\n  AgentEscrow Contracts (Base Sepolia):');
  console.log('  ├─ ServiceBoard:      0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2');
  console.log('  ├─ EscrowVault:       0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579');
  console.log('  └─ ReputationRegistry: 0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df');

  console.log('\n  Agent ENS Identities:');
  console.log('  ├─ buyer.agentescrow.eth  → ERC-8004 #2194');
  console.log('  └─ seller.agentescrow.eth → ERC-8004 #2195');

  console.log('\n  Custom ENS Text Record Schema:');
  for (const [field, key] of Object.entries(AGENT_TEXT_KEYS)) {
    console.log(`  ├─ ${key} (${field})`);
  }

  console.log('\n  Prize Tracks Targeted:');
  console.log('  ├─ ENS Identity ($600):        Agent subdomains + rich text records + profile discovery');
  console.log('  ├─ ENS Communication ($600):    Name-based task routing + payment resolution + discovery');
  console.log('  └─ ENS Open Integration ($300): ENS as core identity layer, cross-protocol bridge');

  console.log(`\n  Mode: ${LIVE_MODE ? '🟢 LIVE (real ENS resolution)' : '🟡 SIMULATION (demo data)'}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         AgentEscrow × ENS Integration Demo              ║');
  console.log('║         Targeting 3 ENS Prize Tracks ($1,500)           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  let publicClient = null;
  if (LIVE_MODE) {
    const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const clients = createEnsClients(pk || undefined);
    publicClient = clients.publicClient;
    console.log('\n  🟢 Live mode — using real ENS resolution on Sepolia');
  } else {
    console.log('\n  🟡 Simulation mode — using demo data');
    console.log('     Run with --live flag for real ENS resolution');
  }

  await demoIdentity(publicClient);
  await demoCommunication(publicClient);
  await demoOpenIntegration(publicClient);
  demoSummary();

  console.log('\n✅ Demo complete!\n');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
