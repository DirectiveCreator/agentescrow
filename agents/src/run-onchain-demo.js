#!/usr/bin/env node
/**
 * AgentEscrow — Base Sepolia On-Chain Demo
 *
 * Runs 3 tasks through the full lifecycle on Base Sepolia:
 *   postTask → claimTask → deliverTask → confirmDelivery
 *
 * Uses the deployer key as buyer, generates a temp seller key,
 * and funds it from the deployer. All transactions are real on-chain.
 */
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';
import { executeTask } from './tasks.js';
import { verifyDelivery } from './tasks.js';

// Load deployer key from environment or .env file
// Set DEPLOYER_PRIVATE_KEY in your environment or in a .env file (NOT committed to git)
config();
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY not set. Set it in your environment or .env file.');
  console.error('   Example: DEPLOYER_PRIVATE_KEY=0x... node src/run-onchain-demo.js');
  process.exit(1);
}

// Base Sepolia contract addresses
const CONTRACTS = {
  serviceBoard: {
    address: '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
    abi: (await import('./abi/ServiceBoard.json', { with: { type: 'json' } })).default,
  },
  escrowVault: {
    address: '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
    abi: (await import('./abi/EscrowVault.json', { with: { type: 'json' } })).default,
  },
  reputationRegistry: {
    address: '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
    abi: (await import('./abi/ReputationRegistry.json', { with: { type: 'json' } })).default,
  },
};

const RPC_URL = 'https://sepolia.base.org';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getWallet(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// Tasks to run on-chain
const DEMO_TASKS = [
  {
    taskType: 'text_summary',
    description: 'Summarize the key innovations in trustless agent-to-agent commerce on Base',
    reward: '0.0005',
  },
  {
    taskType: 'code_review',
    description: 'Review the AgentEscrow ServiceBoard contract for gas optimization',
    reward: '0.0005',
  },
  {
    taskType: 'name_generation',
    description: 'Generate names for an AI agent marketplace built on Base L2',
    reward: '0.0005',
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🏗️  AgentEscrow — Base Sepolia On-Chain Demo');
  console.log('═══════════════════════════════════════════════════════\n');

  // Setup buyer (deployer) wallet
  const buyerWallet = getWallet(DEPLOYER_KEY);
  const buyerAddress = buyerWallet.account.address;
  const buyerBalance = await publicClient.getBalance({ address: buyerAddress });
  console.log(`🛒 Buyer Agent: ${buyerAddress}`);
  console.log(`   Balance: ${formatEther(buyerBalance)} ETH\n`);

  // Generate and fund a temp seller key
  const sellerKey = generatePrivateKey();
  const sellerWallet = getWallet(sellerKey);
  const sellerAddress = sellerWallet.account.address;
  console.log(`🔧 Seller Agent: ${sellerAddress} (temp key)`);

  // Transfer ETH to seller for gas
  const fundAmount = parseEther('0.002');
  console.log(`   Funding seller with ${formatEther(fundAmount)} ETH for gas...`);
  const fundTx = await buyerWallet.sendTransaction({
    to: sellerAddress,
    value: fundAmount,
  });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });
  const sellerBalance = await publicClient.getBalance({ address: sellerAddress });
  console.log(`   ✅ Seller funded! Balance: ${formatEther(sellerBalance)} ETH`);
  console.log(`   Tx: ${fundTx}\n`);

  const completedTaskIds = [];

  // Run each task through full lifecycle
  for (let i = 0; i < DEMO_TASKS.length; i++) {
    const template = DEMO_TASKS[i];
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2 hours

    console.log(`\n─── Task ${i + 1}/${DEMO_TASKS.length}: ${template.taskType} ───`);

    // 1. BUYER posts task
    console.log(`\n🛒 [BUYER] Posting task: "${template.description.substring(0, 50)}..."`);
    console.log(`   Reward: ${template.reward} ETH`);
    const postHash = await buyerWallet.writeContract({
      ...CONTRACTS.serviceBoard,
      functionName: 'postTask',
      args: [template.taskType, template.description, deadline],
      value: parseEther(template.reward),
    });
    const postReceipt = await publicClient.waitForTransactionReceipt({ hash: postHash });
    // Read task count after receipt confirmed (includes the newly posted task)
    await new Promise(r => setTimeout(r, 1000)); // Wait for RPC state sync
    const taskCount = await publicClient.readContract({
      ...CONTRACTS.serviceBoard,
      functionName: 'nextTaskId',
    });
    const taskId = Number(taskCount) - 1;
    if (taskId < 0) throw new Error(`Unexpected taskId ${taskId} from nextTaskId=${taskCount}`);
    console.log(`   ✅ Task #${taskId} posted! Gas: ${postReceipt.gasUsed}`);
    console.log(`   Tx: ${postHash}`);

    // Small delay for chain
    await new Promise(r => setTimeout(r, 2000));

    // 2. SELLER claims task
    console.log(`\n🔧 [SELLER] Claiming task #${taskId}...`);
    const claimHash = await sellerWallet.writeContract({
      ...CONTRACTS.serviceBoard,
      functionName: 'claimTask',
      args: [BigInt(taskId)],
    });
    const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
    console.log(`   ✅ Claimed! Gas: ${claimReceipt.gasUsed}`);
    console.log(`   Tx: ${claimHash}`);

    await new Promise(r => setTimeout(r, 2000));

    // 3. SELLER executes work and delivers
    console.log(`\n🔧 [SELLER] Executing ${template.taskType} work...`);
    const { result, hash: deliveryHash } = executeTask(template.taskType, template.description);
    console.log(`   Result: ${result.substring(0, 70)}...`);

    console.log(`   Delivering with hash: ${deliveryHash}`);
    const deliverHash = await sellerWallet.writeContract({
      ...CONTRACTS.serviceBoard,
      functionName: 'deliverTask',
      args: [BigInt(taskId), deliveryHash],
    });
    const deliverReceipt = await publicClient.waitForTransactionReceipt({ hash: deliverHash });
    console.log(`   ✅ Delivered! Gas: ${deliverReceipt.gasUsed}`);
    console.log(`   Tx: ${deliverHash}`);

    await new Promise(r => setTimeout(r, 2000));

    // 4. BUYER verifies and confirms delivery
    console.log(`\n🛒 [BUYER] Verifying delivery...`);
    const isValid = verifyDelivery(template.taskType, deliveryHash);
    if (isValid) {
      console.log(`   Delivery valid! Confirming and releasing escrow...`);
      const confirmHash = await buyerWallet.writeContract({
        ...CONTRACTS.serviceBoard,
        functionName: 'confirmDelivery',
        args: [BigInt(taskId)],
      });
      const confirmReceipt = await publicClient.waitForTransactionReceipt({ hash: confirmHash });
      console.log(`   ✅ CONFIRMED! Payment released. Gas: ${confirmReceipt.gasUsed}`);
      console.log(`   Tx: ${confirmHash}`);
      completedTaskIds.push(taskId);
    } else {
      console.log(`   ❌ Delivery verification failed`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Final status
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  📊 On-Chain Demo Results');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Tasks completed: ${completedTaskIds.length}/${DEMO_TASKS.length}`);
  console.log(`Task IDs: ${completedTaskIds.join(', ')}`);

  // Check reputations
  const buyerRep = await publicClient.readContract({
    ...CONTRACTS.reputationRegistry,
    functionName: 'getReputation',
    args: [buyerAddress],
  });
  const sellerRep = await publicClient.readContract({
    ...CONTRACTS.reputationRegistry,
    functionName: 'getReputation',
    args: [sellerAddress],
  });

  console.log(`\n🛒 Buyer Reputation:`);
  console.log(`   Tasks completed: ${buyerRep.tasksCompleted}`);
  console.log(`   Total spent: ${formatEther(buyerRep.totalSpent)} ETH`);

  console.log(`\n🔧 Seller Reputation:`);
  console.log(`   Tasks completed: ${sellerRep.tasksCompleted}`);
  console.log(`   Total earned: ${formatEther(sellerRep.totalEarned)} ETH`);

  const sellerScore = await publicClient.readContract({
    ...CONTRACTS.reputationRegistry,
    functionName: 'getScore',
    args: [sellerAddress],
  });
  console.log(`   Trust score: ${sellerScore}/100`);

  const finalBuyerBal = await publicClient.getBalance({ address: buyerAddress });
  const finalSellerBal = await publicClient.getBalance({ address: sellerAddress });
  console.log(`\n💰 Final Balances:`);
  console.log(`   Buyer: ${formatEther(finalBuyerBal)} ETH`);
  console.log(`   Seller: ${formatEther(finalSellerBal)} ETH`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Base Sepolia On-Chain Demo Complete!');
  console.log(`  Chain: Base Sepolia (84532)`);
  console.log(`  Verify: https://sepolia.basescan.org/address/${CONTRACTS.serviceBoard.address}`);
  console.log('═══════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Demo failed:', err.message);
  process.exit(1);
});
