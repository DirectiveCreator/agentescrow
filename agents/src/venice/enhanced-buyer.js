/**
 * Venice-Enhanced Buyer Agent
 *
 * Wraps the standard buyer agent with Venice private cognition:
 * - Private delivery verification (TEE) — quality criteria stay hidden
 * - Attestation-verified acceptance — cryptographic proof of honest evaluation
 *
 * Usage:
 *   VENICE_API_KEY=your_key CHAIN=local node agents/src/venice/enhanced-buyer.js
 *
 * Without VENICE_API_KEY, falls back to standard (non-private) verification.
 */

import { publicClient, getWalletClient, contracts } from '../config.js';
import { parseEther, formatEther } from 'viem';
import { verifyDelivery } from '../tasks.js';
import { createVeniceClient, PRIVACY_TIERS } from './client.js';

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
];

class VeniceBuyerAgent {
  constructor(privateKey) {
    this.wallet = getWalletClient(privateKey);
    this.address = this.wallet.account.address;
    this.taskIndex = 0;
    this.postedTasks = [];
    this.veniceEnabled = false;
    this.venice = null;
    this.verificationLog = [];

    // Try to initialize Venice
    try {
      if (process.env.VENICE_API_KEY) {
        this.venice = createVeniceClient({ privacyTier: PRIVACY_TIERS.TEE });
        this.veniceEnabled = true;
        console.log('   🔒 Venice TEE enabled — private verification active');
      } else {
        console.log('   ⚡ Standard mode — set VENICE_API_KEY for private verification');
      }
    } catch (err) {
      console.log(`   ⚠️ Venice unavailable: ${err.message}`);
    }
  }

  async postNextTask() {
    if (this.taskIndex >= TASK_TEMPLATES.length) {
      console.log('🛒 Buyer: All tasks posted!');
      return null;
    }

    const template = TASK_TEMPLATES[this.taskIndex++];
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    console.log(`\n🛒 Buyer: Posting task #${this.taskIndex}: ${template.taskType}`);
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

      const taskCount = await publicClient.readContract({
        ...contracts.serviceBoard,
        functionName: 'getTaskCount',
      });
      const taskId = Number(taskCount) - 1;
      this.postedTasks.push({ taskId, template });
      return taskId;
    } catch (err) {
      console.error(`   ❌ Failed to post: ${err.message}`);
      return null;
    }
  }

  async checkAndConfirmDeliveries() {
    for (const { taskId, template } of this.postedTasks) {
      try {
        const task = await publicClient.readContract({
          ...contracts.serviceBoard,
          functionName: 'getTask',
          args: [BigInt(taskId)],
        });

        if (Number(task.status) === 2) { // Delivered
          console.log(`\n🛒 Buyer: Task #${taskId} delivered!`);
          console.log(`   Delivery hash: ${task.deliveryHash}`);

          let isValid = false;

          if (this.veniceEnabled) {
            // ── Venice: Private Delivery Verification ──
            try {
              console.log(`   🔒 Verifying delivery privately via TEE...`);

              // For Venice verification, we use the delivery hash as content
              // In production, you'd fetch the actual delivery content off-chain
              const verifyResult = await this.venice.verifyDeliveryPrivately(
                template.taskType,
                template.description,
                `Delivered work for task #${taskId}: ${task.deliveryHash}. ` +
                `Task type: ${template.taskType}. ` +
                `Description: ${template.description}`
              );

              isValid = verifyResult.verification.accept;
              console.log(`   🔒 Private verification: ${isValid ? 'ACCEPT' : 'REJECT'}`);
              console.log(`   🔒 Quality score: ${verifyResult.verification.score}/100`);
              console.log(`   🔒 Summary: ${verifyResult.verification.summary}`);

              this.verificationLog.push({
                taskId,
                taskType: template.taskType,
                accepted: isValid,
                score: verifyResult.verification.score,
                hasAttestation: !!verifyResult.attestation,
                requestId: verifyResult.requestId,
              });
            } catch (err) {
              console.log(`   ⚠️ Venice verification failed, using standard: ${err.message}`);
              isValid = verifyDelivery(template.taskType, task.deliveryHash);
            }
          } else {
            isValid = verifyDelivery(template.taskType, task.deliveryHash);
          }

          if (isValid) {
            console.log(`   Confirming delivery...`);
            const hash = await this.wallet.writeContract({
              ...contracts.serviceBoard,
              functionName: 'confirmDelivery',
              args: [BigInt(taskId)],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`   ✅ Delivery confirmed! Escrow released.`);
          } else {
            console.log(`   ⚠️ Delivery verification failed, not confirming`);
          }
        }
      } catch (err) {
        // Ignore errors for completed tasks
      }
    }
  }

  getVerificationLog() {
    return this.verificationLog;
  }
}

// Main
async function main() {
  const privateKey = process.env.BUYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('BUYER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const buyer = new VeniceBuyerAgent(privateKey);
  console.log(`🛒 Venice-Enhanced Buyer Agent: ${buyer.address}`);
  console.log(`   Mode: ${buyer.veniceEnabled ? '🔒 Private (TEE)' : '⚡ Standard'}`);

  const balance = await publicClient.getBalance({ address: buyer.address });
  console.log(`   Balance: ${formatEther(balance)} ETH`);

  // Post tasks
  for (let i = 0; i < TASK_TEMPLATES.length; i++) {
    await buyer.postNextTask();
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n🛒 Buyer: All tasks posted. Checking deliveries...');

  // Poll for deliveries
  let completedCount = 0;
  for (let poll = 0; poll < 60; poll++) {
    await buyer.checkAndConfirmDeliveries();

    let completed = 0;
    for (const { taskId } of buyer.postedTasks) {
      const task = await publicClient.readContract({
        ...contracts.serviceBoard,
        functionName: 'getTask',
        args: [BigInt(taskId)],
      });
      if (Number(task.status) === 3) completed++;
    }

    if (completed > completedCount) {
      completedCount = completed;
      console.log(`\n📊 Progress: ${completed}/${buyer.postedTasks.length}`);
    }

    if (completed === buyer.postedTasks.length) {
      console.log('\n🎉 All tasks completed!');
      break;
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  // Print verification log
  const log = buyer.getVerificationLog();
  if (log.length > 0) {
    console.log(`\n🔒 Verification Log (${log.length} entries):`);
    for (const entry of log) {
      console.log(`   Task #${entry.taskId} (${entry.taskType}): ${entry.accepted ? '✅' : '❌'} score=${entry.score} attested=${entry.hasAttestation}`);
    }
  }
}

main().catch(console.error);
