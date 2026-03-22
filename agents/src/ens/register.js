/**
 * ENS Agent Registration Script
 *
 * Registers AgentEscrow agents with ENS identities on Sepolia.
 * Creates subdomains under a parent name and sets rich text records.
 *
 * Prerequisites:
 * - Own a .eth name on Sepolia (register at sepolia.app.ens.domains)
 * - Sepolia ETH for gas (get from faucets)
 * - DEPLOYER_PRIVATE_KEY or PRIVATE_KEY in .env
 *
 * Usage:
 *   node agents/src/ens/register.js <parentName> [buyer|seller|both]
 *
 * Examples:
 *   node agents/src/ens/register.js agentescrow.eth both
 *   node agents/src/ens/register.js agentescrow.eth buyer
 *
 * Environment:
 *   PRIVATE_KEY / DEPLOYER_PRIVATE_KEY - Wallet that owns the parent name
 *   SEPOLIA_RPC - Ethereum Sepolia RPC (default: https://rpc.sepolia.org)
 */

import {
  createEnsClients,
  registerAgentENS,
  getAgentProfile,
  discoverAgents,
  AGENT_TEXT_KEYS,
} from './client.js';

// ─── Agent Metadata ───────────────────────────────────────────────────────

const DEPLOYER_ADDRESS = '0xC07b695eC19DE38f1e62e825585B2818077B96cC';

const BUYER_METADATA = {
  avatar: 'ipfs://bafybeihvvgxvbskdhhvb5mxl2wyvdyqo4zvltbkyuzy4sctjml26mbbdna',
  description:
    'Autonomous AI agent that discovers, commissions, and pays for services on the AgentEscrow protocol. Posts tasks to ServiceBoard, locks ETH in escrow, reviews deliverables, and confirms completion — all on-chain on Base.',
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
};

const SELLER_METADATA = {
  avatar: 'ipfs://bafybeidxbkskf4unq5vgdp2n4spbknl3e3w6r7oka7gvyh6bdoimxyyrwy',
  description:
    'Autonomous AI agent that fulfills service requests on the AgentEscrow protocol. Monitors ServiceBoard for open tasks, claims work, executes deliverables (text summaries, code reviews, data analysis), and submits results on-chain via Base.',
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
};

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const parentName = process.argv[2];
  const target = process.argv[3] || 'both';

  if (!parentName) {
    console.error('Usage: node register.js <parentName.eth> [buyer|seller|both]');
    console.error('Example: node register.js agentescrow.eth both');
    process.exit(1);
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('Error: DEPLOYER_PRIVATE_KEY or PRIVATE_KEY required in environment');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  ENS Agent Identity Registration');
  console.log('  Network: Ethereum Sepolia');
  console.log(`  Parent Name: ${parentName}`);
  console.log(`  Target: ${target}`);
  console.log('═══════════════════════════════════════════════');

  const { publicClient, walletClient, account } = createEnsClients(pk);
  console.log(`  Wallet: ${account.address}`);

  const results = {};

  if (target === 'buyer' || target === 'both') {
    try {
      results.buyer = await registerAgentENS(publicClient, walletClient, {
        parentName,
        label: 'buyer',
        ownerAddress: DEPLOYER_ADDRESS,
        metadata: BUYER_METADATA,
      });
    } catch (err) {
      console.error(`  ❌ Buyer registration failed: ${err.message}`);
    }
  }

  if (target === 'seller' || target === 'both') {
    try {
      results.seller = await registerAgentENS(publicClient, walletClient, {
        parentName,
        label: 'seller',
        ownerAddress: DEPLOYER_ADDRESS,
        metadata: SELLER_METADATA,
      });
    } catch (err) {
      console.error(`  ❌ Seller registration failed: ${err.message}`);
    }
  }

  // ─── Verify Registration ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Verification');
  console.log('═══════════════════════════════════════════════');

  const agents = await discoverAgents(publicClient, parentName);
  if (agents.length > 0) {
    for (const agent of agents) {
      console.log(`\n  🤖 ${agent.name}`);
      console.log(`     Address: ${agent.address}`);
      for (const [key, value] of Object.entries(agent.records)) {
        const display = typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`     ${key}: ${display}`);
      }
    }
  } else {
    console.log('  No agents found (records may take a moment to propagate)');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Registration Complete');
  console.log('═══════════════════════════════════════════════');
  if (results.buyer) {
    console.log(`  Buyer:  buyer.${parentName}`);
    console.log(`          Subdomain tx: ${results.buyer.transactions.subdomain}`);
  }
  if (results.seller) {
    console.log(`  Seller: seller.${parentName}`);
    console.log(`          Subdomain tx: ${results.seller.transactions.subdomain}`);
  }
  console.log('═══════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
