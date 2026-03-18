import { publicClient, getWalletClient, contracts } from './config.js';
import { formatEther } from 'viem';
import { executeTask } from './tasks.js';

class SellerAgent {
  constructor(privateKey) {
    this.wallet = getWalletClient(privateKey);
    this.address = this.wallet.account.address;
    this.claimedTasks = new Set();
  }

  async discoverAndClaimTasks() {
    try {
      const openTasks = await publicClient.readContract({
        ...contracts.serviceBoard,
        functionName: 'getOpenTasks',
      });

      for (const task of openTasks) {
        const taskId = Number(task.id);
        if (this.claimedTasks.has(taskId)) continue;

        console.log(`\n🔧 Seller: Found open task #${taskId}: ${task.taskType}`);
        console.log(`   Reward: ${formatEther(task.reward)} ETH`);
        console.log(`   Description: ${task.description.substring(0, 60)}...`);

        try {
          const hash = await this.wallet.writeContract({
            ...contracts.serviceBoard,
            functionName: 'claimTask',
            args: [BigInt(taskId)],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`   ✅ Claimed task #${taskId}! Tx: ${hash.substring(0, 20)}...`);
          this.claimedTasks.add(taskId);

          // Execute and deliver immediately
          await this.executeAndDeliver(taskId, task.taskType, task.description);
        } catch (err) {
          console.log(`   ⚠️ Could not claim task #${taskId}: ${err.message?.substring(0, 60)}`);
        }
      }
    } catch (err) {
      // No open tasks or error, continue polling
    }
  }

  async executeAndDeliver(taskId, taskType, description) {
    console.log(`\n🔧 Seller: Executing task #${taskId} (${taskType})...`);

    // Simulate some work time
    await new Promise(r => setTimeout(r, 1000));

    const { result, hash: deliveryHash } = executeTask(taskType, description);
    console.log(`   Result preview: ${result.substring(0, 80)}...`);

    try {
      const txHash = await this.wallet.writeContract({
        ...contracts.serviceBoard,
        functionName: 'deliverTask',
        args: [BigInt(taskId), deliveryHash],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`   📦 Delivered task #${taskId}! Hash: ${deliveryHash}`);
      console.log(`   Tx: ${txHash.substring(0, 20)}...`);
    } catch (err) {
      console.error(`   ❌ Failed to deliver task #${taskId}: ${err.message}`);
    }
  }

  async getReputation() {
    const rep = await publicClient.readContract({
      ...contracts.reputationRegistry,
      functionName: 'getReputation',
      args: [this.address],
    });
    return rep;
  }
}

// Main seller loop
async function main() {
  const privateKey = process.env.SELLER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('SELLER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const seller = new SellerAgent(privateKey);
  console.log(`🔧 Seller Agent started: ${seller.address}`);

  const balance = await publicClient.getBalance({ address: seller.address });
  console.log(`   Balance: ${formatEther(balance)} ETH`);

  // Poll for tasks
  console.log('\n🔧 Seller: Polling for tasks...');
  const maxPolls = 60;
  for (let poll = 0; poll < maxPolls; poll++) {
    await seller.discoverAndClaimTasks();

    // Check if we've completed enough
    if (seller.claimedTasks.size >= 5) {
      console.log('\n🔧 Seller: All discovered tasks claimed and delivered!');
      // Wait for confirmations
      await new Promise(r => setTimeout(r, 10000));
      break;
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  // Final reputation
  const rep = await seller.getReputation();
  console.log(`\n📊 Seller Reputation:`);
  console.log(`   Tasks Completed: ${rep.tasksCompleted}`);
  console.log(`   Total Earned: ${formatEther(rep.totalEarned)} ETH`);
  console.log(`   Score: ${await publicClient.readContract({
    ...contracts.reputationRegistry,
    functionName: 'getScore',
    args: [seller.address],
  })}/100`);
}

main().catch(console.error);
