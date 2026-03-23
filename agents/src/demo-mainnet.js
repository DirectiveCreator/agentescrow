#!/usr/bin/env node

/**
 * Run a minimal demo task cycle on mainnet to prove the full lifecycle works.
 * Uses 0.0001 ETH (~$0.03) per task — funds cycle to seller.
 *
 * Usage:
 *   BUYER_KEY=0x... SELLER_KEY=0x... CHAIN=base \
 *   SERVICE_BOARD=0x... \
 *   node agents/src/demo-mainnet.js
 *
 * Environment:
 *   BUYER_KEY       - Buyer wallet private key (required)
 *   SELLER_KEY      - Seller wallet private key (required)
 *   CHAIN           - "base" or "celo" (default: "base")
 *   SERVICE_BOARD   - Deployed ServiceBoard proxy address (required)
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, celo } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Validation ────────────────────────────────────────────────────────────────

if (!process.env.BUYER_KEY || !process.env.SELLER_KEY) {
  console.error('❌ BUYER_KEY and SELLER_KEY environment variables are required');
  console.error('   Usage: BUYER_KEY=0x... SELLER_KEY=0x... CHAIN=base SERVICE_BOARD=0x... node agents/src/demo-mainnet.js');
  process.exit(1);
}

if (!process.env.SERVICE_BOARD) {
  console.error('❌ SERVICE_BOARD environment variable is required (deployed proxy address)');
  process.exit(1);
}

// ─── Setup ─────────────────────────────────────────────────────────────────────

const CHAIN_NAME = (process.env.CHAIN || 'base').toLowerCase();
const chain = CHAIN_NAME === 'celo' ? celo : base;
const rpcUrl = CHAIN_NAME === 'celo' ? 'https://forno.celo.org' : 'https://mainnet.base.org';
const currency = CHAIN_NAME === 'celo' ? 'CELO' : 'ETH';

const buyerAccount = privateKeyToAccount(process.env.BUYER_KEY.startsWith('0x') ? process.env.BUYER_KEY : `0x${process.env.BUYER_KEY}`);
const sellerAccount = privateKeyToAccount(process.env.SELLER_KEY.startsWith('0x') ? process.env.SELLER_KEY : `0x${process.env.SELLER_KEY}`);

const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const buyerClient = createWalletClient({ account: buyerAccount, chain, transport: http(rpcUrl) });
const sellerClient = createWalletClient({ account: sellerAccount, chain, transport: http(rpcUrl) });

// Load ABI from agents/src/abi/
const ServiceBoardABI = JSON.parse(
  readFileSync(join(__dirname, 'abi', 'ServiceBoard.json'), 'utf-8')
);
const SERVICE_BOARD = process.env.SERVICE_BOARD;
const DEMO_AMOUNT = parseEther('0.0001'); // ~$0.03 at $1800/ETH

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('🟢 ═══════════════════════════════════════════');
  console.log('   Escroue MAINNET Demo');
  console.log('🟢 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   Chain:        ${chain.name} (${chain.id})`);
  console.log(`   ServiceBoard: ${SERVICE_BOARD}`);
  console.log(`   Buyer:        ${buyerAccount.address}`);
  console.log(`   Seller:       ${sellerAccount.address}`);
  console.log(`   Task reward:  ${formatEther(DEMO_AMOUNT)} ${currency}`);
  console.log('');

  // Check balances
  const buyerBal = await publicClient.getBalance({ address: buyerAccount.address });
  const sellerBal = await publicClient.getBalance({ address: sellerAccount.address });
  console.log(`   Buyer balance:  ${formatEther(buyerBal)} ${currency}`);
  console.log(`   Seller balance: ${formatEther(sellerBal)} ${currency}`);

  if (buyerBal < DEMO_AMOUNT) {
    console.error(`❌ Buyer needs at least ${formatEther(DEMO_AMOUNT)} ${currency}`);
    process.exit(1);
  }

  // 5-second safety
  console.log('');
  console.log('⚠️  This will execute real transactions on mainnet.');
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   Starting in ${i}... (Ctrl+C to abort)\r`);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('   Starting demo!                              ');
  console.log('');

  // 1. Post task
  console.log('📝 Step 1: Posting task...');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
  let hash = await buyerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'postTask',
    args: ['text_summary', 'Mainnet demo: summarize Escroue in one sentence', deadline],
    value: DEMO_AMOUNT,
  });
  let receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Task posted | TX: ${hash}`);

  // Extract task ID from TaskPosted event
  let taskId = 0n;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: ServiceBoardABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'TaskPosted') {
        taskId = decoded.args.taskId;
        break;
      }
    } catch { /* skip non-matching logs */ }
  }
  console.log(`   Task ID: ${taskId}`);

  // 2. Claim task
  console.log('🤝 Step 2: Seller claiming task...');
  hash = await sellerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'claimTask', args: [taskId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Task claimed | TX: ${hash}`);

  // 3. Deliver
  console.log('📦 Step 3: Seller delivering work...');
  hash = await sellerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'deliverTask',
    args: [taskId, 'QmMainnetDemo_Escroue_is_a_trustless_agent_marketplace'],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Work delivered | TX: ${hash}`);

  // 4. Confirm
  console.log('✔️  Step 4: Buyer confirming delivery...');
  hash = await buyerClient.writeContract({
    address: SERVICE_BOARD, abi: ServiceBoardABI,
    functionName: 'confirmDelivery', args: [taskId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ Delivery confirmed — payment released! | TX: ${hash}`);

  // Final balances
  const buyerBalAfter = await publicClient.getBalance({ address: buyerAccount.address });
  const sellerBalAfter = await publicClient.getBalance({ address: sellerAccount.address });

  console.log('');
  console.log('🎉 ═══════════════════════════════════════════');
  console.log('   MAINNET DEMO COMPLETE');
  console.log('🎉 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   Task ID:        ${taskId}`);
  console.log(`   Reward:         ${formatEther(DEMO_AMOUNT)} ${currency}`);
  console.log(`   Buyer spent:    ${formatEther(buyerBal - buyerBalAfter)} ${currency} (incl. gas)`);
  console.log(`   Seller earned:  ${formatEther(sellerBalAfter - sellerBal)} ${currency} (minus gas)`);
  console.log('');
  console.log('   Full lifecycle verified on mainnet! 🚀');
}

main().catch(err => {
  console.error('❌ Demo failed:', err.message);
  process.exit(1);
});
