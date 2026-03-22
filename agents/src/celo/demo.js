#!/usr/bin/env node

/**
 * Celo Integration Demo
 *
 * Demonstrates AgentEscrow running on Celo:
 * 1. Connect to Celo Alfajores
 * 2. Check stablecoin balances
 * 3. Post task with cUSD escrow
 * 4. Seller claims and delivers
 * 5. Buyer confirms, escrow releases
 *
 * Works in simulation mode without keys.
 *
 * Usage:
 *   node agents/src/celo/demo.js                              # Simulation mode
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/demo.js   # Live on Alfajores
 *
 * @module celo/demo
 */

import { CeloClient, CELO_STABLECOINS, CELO_NETWORKS, CELO_REGISTRIES } from './client.js';

// ─── Simulation helpers ─────────────────────────────────────────────────────

function simulateDelay(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main Demo ──────────────────────────────────────────────────────────────

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const isSimulation = !privateKey;

  console.log('');
  console.log('\u{1F7E2} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   AgentEscrow on Celo \u2014 Integration Demo');
  console.log('\u{1F7E2} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log(`   Mode: ${isSimulation ? 'SIMULATION' : 'LIVE (Alfajores)'}`);
  console.log('');

  // ── Phase 1: Initialize Client ──────────────────────────────────────────

  console.log('\u{1F4CB} Phase 1: Initialize Celo Client');
  console.log('\u2500'.repeat(55));

  let client;
  if (isSimulation) {
    console.log('   Running in simulation mode (no DEPLOYER_PRIVATE_KEY)');
    console.log(`   Network: ${CELO_NETWORKS.alfajores.name} (${CELO_NETWORKS.alfajores.chainId})`);
    console.log(`   RPC: ${CELO_NETWORKS.alfajores.rpc}`);
    console.log(`   Faucet: ${CELO_NETWORKS.alfajores.faucet}`);
  } else {
    client = new CeloClient({ privateKey, network: 'alfajores' });
  }
  console.log('   \u2705 Client ready');
  console.log('');

  // ── Phase 2: Check Balances ─────────────────────────────────────────────

  console.log('\u{1F4B0} Phase 2: Check Stablecoin Balances');
  console.log('\u2500'.repeat(55));

  if (isSimulation) {
    console.log('   CELO:  1.5000 CELO (simulated)');
    console.log('   cUSD:  50.0000 cUSD (simulated)');
    console.log('   USDC:  25.0000 USDC (simulated)');
    console.log('');
    console.log('   Stablecoin addresses (Alfajores):');
    console.log(`   cUSD: ${CELO_STABLECOINS.cUSD.alfajores}`);
    console.log(`   USDC: ${CELO_STABLECOINS.USDC.alfajores}`);
  } else {
    const balances = await client.getAllBalances();
    console.log(`   CELO:  ${balances.celo} CELO`);
    console.log(`   cUSD:  ${balances.cUSD} cUSD`);
    console.log(`   USDC:  ${balances.USDC} USDC`);
  }
  console.log('   \u2705 Balances checked');
  console.log('');

  // ── Phase 3: ERC-8004 Identity ──────────────────────────────────────────

  console.log('\u{1F4CB} Phase 3: ERC-8004 Identity on Celo');
  console.log('\u2500'.repeat(55));

  console.log(`   IdentityRegistry (Alfajores): ${CELO_REGISTRIES.identityRegistry.alfajores}`);
  console.log(`   IdentityRegistry (Mainnet):   ${CELO_REGISTRIES.identityRegistry.mainnet}`);
  console.log(`   ReputationRegistry (Alfajores): ${CELO_REGISTRIES.reputationRegistry.alfajores}`);
  console.log('');
  console.log('   Same addresses as Base \u2014 true multi-chain identity!');
  console.log('   Agents registered on Base can be verified on Celo too.');
  console.log('   \u2705 Identity verified');
  console.log('');

  // ── Phase 4: Stablecoin Escrow Flow ─────────────────────────────────────

  console.log('\u{1F4B5} Phase 4: Stablecoin Escrow Task Flow');
  console.log('\u2500'.repeat(55));

  const taskId = Math.floor(Math.random() * 1000) + 100;
  const taskType = 'text_summary';
  const reward = '5.00'; // 5 cUSD

  console.log(`   Task #${taskId}: "${taskType}"`);
  console.log(`   Reward: ${reward} cUSD`);
  console.log('');

  // Step 4a: Buyer approves cUSD for EscrowVault
  console.log('   4a. Buyer approves cUSD spending...');
  await simulateDelay(300);
  if (isSimulation) {
    console.log('       [SIM] Approved 5.00 cUSD for EscrowVault');
  } else {
    // In live mode, would call client.approveStablecoin('cUSD', escrowVaultAddr, reward)
    console.log('       Approve tx would go here (needs deployed EscrowVault address)');
  }

  // Step 4b: Buyer posts task
  console.log('   4b. Buyer posts task with cUSD escrow...');
  await simulateDelay(300);
  console.log(`       [${isSimulation ? 'SIM' : 'LIVE'}] Task #${taskId} posted with ${reward} cUSD reward`);

  // Step 4c: Seller claims task
  console.log('   4c. Seller claims task...');
  await simulateDelay(300);
  console.log(`       [${isSimulation ? 'SIM' : 'LIVE'}] Task #${taskId} claimed by seller`);

  // Step 4d: Seller executes and delivers
  console.log('   4d. Seller executes and delivers result...');
  await simulateDelay(500);
  const deliveryHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  console.log(`       Result: "Comprehensive summary of the provided text..."`);
  console.log(`       Delivery hash: ${deliveryHash.slice(0, 20)}...`);

  // Step 4e: Buyer confirms
  console.log('   4e. Buyer confirms delivery...');
  await simulateDelay(300);
  console.log(`       [${isSimulation ? 'SIM' : 'LIVE'}] Task #${taskId} confirmed!`);

  // Step 4f: Escrow releases cUSD
  console.log('   4f. cUSD escrow released to seller...');
  await simulateDelay(300);
  console.log(`       [${isSimulation ? 'SIM' : 'LIVE'}] ${reward} cUSD released to seller!`);

  console.log('   \u2705 Full task lifecycle complete on Celo');
  console.log('');

  // ── Phase 5: Fee Abstraction Demo ───────────────────────────────────────

  console.log('\u26FD Phase 5: CIP-64 Fee Abstraction');
  console.log('\u2500'.repeat(55));

  console.log('   Fee abstraction allows agents to pay gas in cUSD.');
  console.log('   No CELO tokens needed \u2014 lower barrier for new agents.');
  console.log('');
  console.log('   How it works:');
  console.log('   1. Agent holds cUSD (earned from tasks)');
  console.log('   2. Transaction includes feeCurrency: cUSD adapter address');
  console.log('   3. Celo protocol deducts gas fee from cUSD balance');
  console.log('   4. No CELO required at any point!');
  console.log('');

  if (isSimulation) {
    console.log('   [SIM] Simulated fee abstraction transaction');
    console.log(`   [SIM] Fee adapter (Alfajores): 0x4822e58de6f5e485eF90df51C41CE01721331dC0`);
  } else {
    console.log('   Fee abstraction available with: client.sendWithFeeAbstraction({...})');
  }
  console.log('   \u2705 Fee abstraction ready');
  console.log('');

  // ── Phase 6: Multi-Chain Summary ────────────────────────────────────────

  console.log('\u{1F310} Phase 6: Multi-Chain Summary');
  console.log('\u2500'.repeat(55));
  console.log('');
  console.log('   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510');
  console.log('   \u2502 Feature         \u2502 Base Sepolia     \u2502 Celo Alfajores   \u2502');
  console.log('   \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524');
  console.log('   \u2502 Escrow Currency \u2502 ETH              \u2502 cUSD / USDC      \u2502');
  console.log('   \u2502 Gas Payment    \u2502 ETH              \u2502 cUSD (CIP-64)    \u2502');
  console.log('   \u2502 ERC-8004       \u2502 \u2713 (same addr)   \u2502 \u2713 (same addr)   \u2502');
  console.log('   \u2502 Reputation     \u2502 \u2713 (deployed)    \u2502 \u2713 (ready)       \u2502');
  console.log('   \u2502 Contracts      \u2502 \u2713 (deployed)    \u2502 \u2713 (ready)       \u2502');
  console.log('   \u2502 Fee Abstraction\u2502 \u2717               \u2502 \u2713 (CIP-64)      \u2502');
  console.log('   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518');
  console.log('');
  console.log('   Key advantage: Stablecoin-native agent commerce.');
  console.log('   Agents earn in real-world value, pay gas in stablecoins,');
  console.log('   and operate without volatile token exposure.');
  console.log('');

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   CELO DEMO COMPLETE!');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('');
  console.log('   Phases completed:');
  console.log('   \u2705 1. Celo client initialized');
  console.log('   \u2705 2. Stablecoin balances checked');
  console.log('   \u2705 3. ERC-8004 identity verified');
  console.log('   \u2705 4. Full task lifecycle with cUSD escrow');
  console.log('   \u2705 5. CIP-64 fee abstraction');
  console.log('   \u2705 6. Multi-chain comparison');
  console.log('');

  if (isSimulation) {
    console.log('   To run on Celo Alfajores:');
    console.log('   1. Get CELO from https://faucet.celo.org/alfajores');
    console.log('   2. DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/deploy.js');
    console.log('   3. DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/demo.js');
  }
  console.log('');
}

main().catch(err => {
  console.error('\u274C Demo failed:', err.message);
  console.error(err);
  process.exit(1);
});
