import { publicClient, getWalletClient, contracts } from './config.js';
import { parseEther, formatEther } from 'viem';
import { verifyDelivery } from './tasks.js';

const TASK_TEMPLATES = [
  {
    taskType: 'text_summary',
    description: 'Summarize the key innovations in zero-knowledge proof technology for blockchain scalability',
    reward: '0.001',
  },
  {
    taskType: 'code_review',
    description: 'Review the EscrowVault smart contract for security vulnerabilities and gas optimization opportunities',
    reward: '0.002',
  },
  {
    taskType: 'name_generation',
    description: 'Generate creative names for a decentralized AI agent marketplace built on Base',
    reward: '0.001',
  },
  {
    taskType: 'translation',
    description: 'Translate the AgentEscrow whitepaper executive summary from English to Spanish',
    reward: '0.0015',
  },
  {
    taskType: 'text_summary',
    description: 'Summarize the latest developments in ERC-8004 agent identity standard',
    reward: '0.001',
  },
];

class BuyerAgent {
  constructor(privateKey) {
    this.wallet = getWalletClient(privateKey);
    this.address = this.wallet.account.address;
    this.taskIndex = 0;
    this.postedTasks = [];
  }

  async postNextTask() {
    if (this.taskIndex >= TASK_TEMPLATES.length) {
      console.log('🛒 Buyer: All tasks posted!');
      return null;
    }

    const template = TASK_TEMPLATES[this.taskIndex++];
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    console.log(`\n🛒 Buyer: Posting task #${this.taskIndex}: ${template.taskType}`);
    console.log(`   Description: ${template.description.substring(0, 60)}...`);
    console.log(`   Reward: ${template.reward} ETH`);

    try {
      const hash = await this.wallet.writeContract({
        ...contracts.serviceBoard,
        functionName: 'postTask',
        args: [template.taskType, template.description, deadline],
        value: parseEther(template.reward),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Task posted! Tx: ${hash.substring(0, 20)}...`);

      // Get the task ID from the event
      const taskCount = await publicClient.readContract({
        ...contracts.serviceBoard,
        functionName: 'getTaskCount',
      });
      const taskId = Number(taskCount) - 1;
      this.postedTasks.push(taskId);
      return taskId;
    } catch (err) {
      console.error(`   ❌ Failed to post task: ${err.message}`);
      return null;
    }
  }

  async checkAndConfirmDeliveries() {
    for (const taskId of this.postedTasks) {
      try {
        const task = await publicClient.readContract({
          ...contracts.serviceBoard,
          functionName: 'getTask',
          args: [BigInt(taskId)],
        });

        // task.status: 0=Open, 1=Claimed, 2=Delivered, 3=Completed, 4=Cancelled
        if (Number(task.status) === 2) { // Delivered
          console.log(`\n🛒 Buyer: Task #${taskId} has been delivered!`);
          console.log(`   Delivery hash: ${task.deliveryHash}`);

          const isValid = verifyDelivery(task.taskType, task.deliveryHash);
          if (isValid) {
            console.log(`   Confirming delivery...`);
            const hash = await this.wallet.writeContract({
              ...contracts.serviceBoard,
              functionName: 'confirmDelivery',
              args: [BigInt(taskId)],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`   ✅ Delivery confirmed! Escrow released. Tx: ${hash.substring(0, 20)}...`);
          } else {
            console.log(`   ⚠️ Delivery verification failed, not confirming`);
          }
        }
      } catch (err) {
        // Ignore errors for already completed tasks
      }
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

// Main buyer loop
async function main() {
  const privateKey = process.env.BUYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('BUYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const buyer = new BuyerAgent(privateKey);
  console.log(`🛒 Buyer Agent started: ${buyer.address}`);

  const balance = await publicClient.getBalance({ address: buyer.address });
  console.log(`   Balance: ${formatEther(balance)} ETH`);

  // Post tasks one by one with delays
  for (let i = 0; i < TASK_TEMPLATES.length; i++) {
    await buyer.postNextTask();
    // Wait a bit between posts
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n🛒 Buyer: All tasks posted. Entering confirmation loop...');

  // Poll for deliveries
  let completedCount = 0;
  const maxPolls = 60;
  for (let poll = 0; poll < maxPolls; poll++) {
    await buyer.checkAndConfirmDeliveries();

    // Check how many are completed
    let completed = 0;
    for (const taskId of buyer.postedTasks) {
      const task = await publicClient.readContract({
        ...contracts.serviceBoard,
        functionName: 'getTask',
        args: [BigInt(taskId)],
      });
      if (Number(task.status) === 3) completed++;
    }

    if (completed > completedCount) {
      completedCount = completed;
      console.log(`\n📊 Progress: ${completed}/${buyer.postedTasks.length} tasks completed`);
    }

    if (completed === buyer.postedTasks.length) {
      console.log('\n🎉 All tasks completed!');
      break;
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  // Final reputation check
  const rep = await buyer.getReputation();
  console.log(`\n📊 Buyer Reputation:`);
  console.log(`   Tasks Completed: ${rep.tasksCompleted}`);
  console.log(`   Total Spent: ${formatEther(rep.totalSpent)} ETH`);
}

main().catch(console.error);
