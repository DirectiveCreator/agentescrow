#!/usr/bin/env node

/**
 * Celo Integration Demo — LIVE on-chain tasks
 *
 * Runs a full task lifecycle on Celo Sepolia with 2 agents:
 * - Buyer posts tasks with native CELO escrow
 * - Seller claims, delivers, gets paid
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/demo.js
 *
 * @module celo/demo
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { celoSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Config ─────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('\u274C DEPLOYER_PRIVATE_KEY required');
  process.exit(1);
}

const buyerKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const buyerAccount = privateKeyToAccount(buyerKey);
const sellerKey = process.env.SELLER_PRIVATE_KEY || generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);

const RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org';
const EXPLORER = 'https://celo-sepolia.blockscout.com';

// Deployed contracts on Celo Sepolia
const CONTRACTS = {
  serviceBoard: '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
  escrowVault: '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
  reputationRegistry: '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
};

const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
});

const buyerWallet = createWalletClient({
  account: buyerAccount,
  chain: celoSepolia,
  transport: http(RPC_URL),
});

const sellerWallet = createWalletClient({
  account: sellerAccount,
  chain: celoSepolia,
  transport: http(RPC_URL),
});

// Load ABIs
function loadABI(name) {
  const path = join(__dirname, '..', 'abi', `${name}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

const ServiceBoardABI = loadABI('ServiceBoard');
const ReputationRegistryABI = loadABI('ReputationRegistry');

// ─── Demo Tasks ─────────────────────────────────────────────────────────────

const DEMO_TASKS = [
  {
    taskType: 'text_summary',
    description: 'Summarize Celo L2 migration benefits for agent developers',
    reward: '0.005',
    deliveryHash: 'QmCeloSummary_AgentL2Benefits_FastFinality_LowCost_StablecoinsNative',
  },
  {
    taskType: 'data_analysis',
    description: 'Analyze Celo Sepolia testnet agent activity patterns',
    reward: '0.005',
    deliveryHash: 'QmCeloAnalysis_TestnetTxPatterns_AgentInteractions_GasUsage_2026Q1',
  },
  {
    taskType: 'code_review',
    description: 'Review AgentEscrow contracts for Celo compatibility',
    reward: '0.005',
    deliveryHash: 'QmCeloCodeReview_SolidityAudit_GasOptimized_CIP64Ready_NoIssues',
  },
];

// ─── Main Demo ──────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('\u{1F7E2} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   AgentEscrow on Celo Sepolia \u2014 LIVE Demo');
  console.log('\u{1F7E2} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log(`   Chain:    Celo Sepolia (11142220)`);
  console.log(`   Buyer:    ${buyerAccount.address}`);
  console.log(`   Seller:   ${sellerAccount.address}`);
  console.log(`   Explorer: ${EXPLORER}`);
  console.log('');

  // Check balance
  const balance = await publicClient.getBalance({ address: buyerAccount.address });
  console.log(`   Buyer balance:  ${formatEther(balance)} CELO`);

  // Fund seller for gas
  console.log('');
  console.log('\u{1F4B0} Funding seller for gas...');
  const fundHash = await buyerWallet.sendTransaction({
    to: sellerAccount.address,
    value: parseEther('0.05'),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log(`   \u2705 Sent 0.05 CELO to seller | TX: ${fundHash.slice(0, 20)}...`);
  console.log('');

  // ── Run 3 demo tasks ──────────────────────────────────────────────────

  const results = [];

  for (let i = 0; i < DEMO_TASKS.length; i++) {
    const task = DEMO_TASKS[i];
    console.log(`\u{1F4CB} Task ${i + 1}/${DEMO_TASKS.length}: ${task.taskType}`);
    console.log('\u2500'.repeat(55));
    console.log(`   "${task.description}"`);
    console.log(`   Reward: ${task.reward} CELO`);
    console.log('');

    // Step 1: Buyer posts task
    console.log('   1\uFE0F\u20E3  Buyer posting task...');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const postHash = await buyerWallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'postTask',
      args: [task.taskType, task.description, deadline],
      value: parseEther(task.reward),
    });
    const postReceipt = await publicClient.waitForTransactionReceipt({ hash: postHash });

    // Parse taskId from event
    const taskPostedLog = postReceipt.logs.find(log =>
      log.address.toLowerCase() === CONTRACTS.serviceBoard.toLowerCase() && log.topics.length >= 2
    );
    const taskId = taskPostedLog ? BigInt(taskPostedLog.topics[1]) : 0n;
    console.log(`      \u2705 Task #${taskId} posted | TX: ${postHash.slice(0, 20)}...`);

    // Step 2: Seller claims task
    console.log('   2\uFE0F\u20E3  Seller claiming task...');
    const claimHash = await sellerWallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'claimTask',
      args: [taskId],
    });
    await publicClient.waitForTransactionReceipt({ hash: claimHash });
    console.log(`      \u2705 Claimed by seller`);

    // Step 3: Seller delivers
    console.log('   3\uFE0F\u20E3  Seller delivering result...');
    const deliverHash = await sellerWallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'deliverTask',
      args: [taskId, task.deliveryHash],
    });
    await publicClient.waitForTransactionReceipt({ hash: deliverHash });
    console.log(`      \u2705 Delivered`);

    // Step 4: Buyer confirms
    console.log('   4\uFE0F\u20E3  Buyer confirming delivery...');
    const confirmHash = await buyerWallet.writeContract({
      address: CONTRACTS.serviceBoard,
      abi: ServiceBoardABI,
      functionName: 'confirmDelivery',
      args: [taskId],
    });
    await publicClient.waitForTransactionReceipt({ hash: confirmHash });
    console.log(`      \u2705 Confirmed! ${task.reward} CELO released to seller`);
    console.log(`      ${EXPLORER}/tx/${confirmHash}`);

    results.push({ taskId: taskId.toString(), taskType: task.taskType, confirmTx: confirmHash });
    console.log('');
  }

  // ── Check reputation ──────────────────────────────────────────────────

  console.log('\u{1F3C6} Reputation Check');
  console.log('\u2500'.repeat(55));
  try {
    const rep = await publicClient.readContract({
      address: CONTRACTS.reputationRegistry,
      abi: ReputationRegistryABI,
      functionName: 'getReputation',
      args: [sellerAccount.address],
    });
    console.log(`   Seller:          ${sellerAccount.address}`);
    console.log(`   Tasks Completed: ${rep[0]}`);
    console.log(`   Total Earned:    ${formatEther(rep[1])} CELO`);
    console.log(`   Trust Score:     ${rep[2]}/100`);
  } catch (e) {
    console.log(`   (Reputation: ${e.message?.slice(0, 60)})`);
  }

  // ── Final summary ─────────────────────────────────────────────────────

  const finalBalance = await publicClient.getBalance({ address: buyerAccount.address });
  const sellerBalance = await publicClient.getBalance({ address: sellerAccount.address });

  console.log('');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   CELO DEMO COMPLETE! 3/3 tasks on-chain');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('');
  for (const r of results) {
    console.log(`   \u2705 Task #${r.taskId} (${r.taskType})`);
    console.log(`      ${EXPLORER}/tx/${r.confirmTx}`);
  }
  console.log('');
  console.log(`   Buyer final:  ${formatEther(finalBalance)} CELO`);
  console.log(`   Seller final: ${formatEther(sellerBalance)} CELO`);
  console.log('');
  console.log('   Contracts (Celo Sepolia):');
  console.log(`   ServiceBoard:        ${CONTRACTS.serviceBoard}`);
  console.log(`   EscrowVault:         ${CONTRACTS.escrowVault}`);
  console.log(`   ReputationRegistry:  ${CONTRACTS.reputationRegistry}`);
  console.log('');
  console.log('   ERC-8004 Agents: Buyer #225 | Seller #226');
  console.log(`   Registry: 0x8004A818BFB912233c491871b3d84c89A494BD9e`);
  console.log('');
}

main().catch(err => {
  console.error('\u274C Demo failed:', err.message);
  process.exit(1);
});
