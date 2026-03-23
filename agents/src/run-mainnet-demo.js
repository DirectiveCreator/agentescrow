#!/usr/bin/env node

/**
 * Run 3 complete task lifecycles on Base Mainnet.
 * Posts tasks, claims, delivers, and confirms — proving the full escrow flow.
 *
 * Usage:
 *   BUYER_KEY=0x... SELLER_KEY=0x... node agents/src/run-mainnet-demo.js
 *
 * Uses V2 UUPS contracts on Base Mainnet:
 *   ServiceBoard:       0x2b6f87820A27CcC590D9A8FBC52632B85dcFe574
 *   EscrowVault:        0xf5fA7C7C71353A68ff74f061abd7e322fC05f1B1
 *   ReputationRegistry: 0x933Ab56bDe987018a3F76E435969062ce14ed673
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Validation ────────────────────────────────────────────────────────────────

const BUYER_KEY = process.env.BUYER_KEY || process.env.DEPLOYER_KEY;
const SELLER_KEY = process.env.SELLER_KEY;

if (!BUYER_KEY || !SELLER_KEY) {
  console.error('❌ BUYER_KEY and SELLER_KEY environment variables required');
  console.error('   Usage: BUYER_KEY=0x... SELLER_KEY=0x... node agents/src/run-mainnet-demo.js');
  process.exit(1);
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

const SERVICE_BOARD = '0x2b6f87820A27CcC590D9A8FBC52632B85dcFe574';
const REPUTATION_REGISTRY = '0x933Ab56bDe987018a3F76E435969062ce14ed673';
const DEMO_AMOUNT = parseEther('0.00005'); // ~$0.015 per task

const buyerAccount = privateKeyToAccount(BUYER_KEY.startsWith('0x') ? BUYER_KEY : `0x${BUYER_KEY}`);
const sellerAccount = privateKeyToAccount(SELLER_KEY.startsWith('0x') ? SELLER_KEY : `0x${SELLER_KEY}`);

const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
const buyerClient = createWalletClient({ account: buyerAccount, chain: base, transport: http('https://mainnet.base.org') });
const sellerClient = createWalletClient({ account: sellerAccount, chain: base, transport: http('https://mainnet.base.org') });

// Load ABIs from Foundry output
const sbArtifact = JSON.parse(readFileSync(join(__dirname, '..', '..', 'contracts', 'out', 'ServiceBoard.sol', 'ServiceBoard.json'), 'utf-8'));
const rrArtifact = JSON.parse(readFileSync(join(__dirname, '..', '..', 'contracts', 'out', 'ReputationRegistry.sol', 'ReputationRegistry.json'), 'utf-8'));
const ServiceBoardABI = sbArtifact.abi;
const ReputationRegistryABI = rrArtifact.abi;

// 3 demo tasks
const TASKS = [
  { type: 'text_summary', desc: 'Summarize how AI agents use on-chain escrow for trustless transactions', hash: 'QmMainnet_Escroue_trustless_agent_marketplace_on_Base' },
  { type: 'code_review', desc: 'Review EscrowVault.sol for reentrancy and access control', hash: 'QmMainnet_EscrowVault_security_review_no_critical_findings' },
  { type: 'name_generation', desc: 'Generate creative names for an AI agent services marketplace', hash: 'QmMainnet_Names_AgentForge_TrustMesh_EscrowNet_ChainAgents' },
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function runTask(taskDef, index) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2 hours

  // Post
  console.log(`\n📝 Task ${index + 1}/3: ${taskDef.type}`);
  console.log(`   "${taskDef.desc}"`);
  let hash = await buyerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'postTask',
    args: [taskDef.type, taskDef.desc, deadline],
    value: DEMO_AMOUNT,
  });
  let receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Posted | TX: ${hash}`);

  // Extract task ID
  let taskId = 0n;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: ServiceBoardABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'TaskPosted') { taskId = decoded.args.taskId; break; }
    } catch {}
  }
  console.log(`   Task ID: ${taskId}`);

  // Claim
  hash = await sellerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'claimTask', args: [taskId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Claimed | TX: ${hash}`);

  // Deliver
  hash = await sellerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'deliverTask', args: [taskId, taskDef.hash],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Delivered | TX: ${hash}`);

  // Confirm
  hash = await buyerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'confirmDelivery', args: [taskId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Confirmed — payment released! | TX: ${hash}`);

  return taskId;
}

async function main() {
  console.log('');
  console.log('🟢 ═══════════════════════════════════════════');
  console.log('   Escroue — Base Mainnet Demo (3 Tasks)');
  console.log('🟢 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   ServiceBoard: ${SERVICE_BOARD}`);
  console.log(`   Buyer:        ${buyerAccount.address}`);
  console.log(`   Seller:       ${sellerAccount.address}`);
  console.log(`   Per task:     ${formatEther(DEMO_AMOUNT)} ETH`);

  const buyerBal = await publicClient.getBalance({ address: buyerAccount.address });
  const sellerBal = await publicClient.getBalance({ address: sellerAccount.address });
  console.log(`   Buyer bal:    ${formatEther(buyerBal)} ETH`);
  console.log(`   Seller bal:   ${formatEther(sellerBal)} ETH`);

  const totalNeeded = DEMO_AMOUNT * 3n + parseEther('0.001'); // tasks + gas
  if (buyerBal < totalNeeded) {
    console.error(`\n❌ Buyer needs ~${formatEther(totalNeeded)} ETH (tasks + gas)`);
    process.exit(1);
  }

  // Safety countdown
  console.log('\n⚠️  Real transactions on Base Mainnet.');
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   Starting in ${i}... (Ctrl+C to abort)\r`);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('   Starting!                                   ');

  const completedIds = [];
  for (let i = 0; i < TASKS.length; i++) {
    const id = await runTask(TASKS[i], i);
    completedIds.push(id);
  }

  // Check reputation
  console.log('\n📊 Reputation Check:');
  try {
    const sellerScore = await publicClient.readContract({
      address: REPUTATION_REGISTRY, abi: ReputationRegistryABI,
      functionName: 'getScore', args: [sellerAccount.address],
    });
    const sellerRep = await publicClient.readContract({
      address: REPUTATION_REGISTRY, abi: ReputationRegistryABI,
      functionName: 'getReputation', args: [sellerAccount.address],
    });
    console.log(`   Seller trust score: ${sellerScore}/100`);
    console.log(`   Tasks completed:    ${sellerRep.tasksCompleted}`);
    console.log(`   Total earned:       ${formatEther(sellerRep.totalEarned)} ETH`);
  } catch (err) {
    console.log(`   ⚠️ Could not read reputation: ${err.message?.slice(0, 80)}`);
  }

  const buyerBalAfter = await publicClient.getBalance({ address: buyerAccount.address });
  const sellerBalAfter = await publicClient.getBalance({ address: sellerAccount.address });

  console.log('');
  console.log('🎉 ═══════════════════════════════════════════');
  console.log('   MAINNET DEMO COMPLETE — 3/3 Tasks');
  console.log('🎉 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   Completed task IDs: ${completedIds.join(', ')}`);
  console.log(`   Total spent:    ${formatEther(buyerBal - buyerBalAfter)} ETH (incl. gas)`);
  console.log(`   Seller earned:  ${formatEther(sellerBalAfter - sellerBal)} ETH (minus gas)`);
  console.log('');
  console.log('   View on BaseScan:');
  console.log(`   https://basescan.org/address/${SERVICE_BOARD}`);
}

main().catch(err => {
  console.error('❌ Demo failed:', err.message);
  process.exit(1);
});
