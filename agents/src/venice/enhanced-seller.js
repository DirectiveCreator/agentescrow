/**
 * Venice-Enhanced Seller Agent
 *
 * Wraps the standard seller agent with Venice private cognition:
 * - Private task evaluation (TEE) — strategy stays hidden
 * - Private task execution (TEE) — reasoning is enclave-protected
 * - Attestation-backed deliveries — cryptographic proof of integrity
 *
 * Usage:
 *   VENICE_API_KEY=your_key CHAIN=local node agents/src/venice/enhanced-seller.js
 *
 * Without VENICE_API_KEY, falls back to standard (non-private) execution.
 */

import { publicClient, getWalletClient, contracts } from '../config.js';
import { formatEther } from 'viem';
import { executeTask } from '../tasks.js';
import { createVeniceClient, PRIVACY_TIERS } from './client.js';
import { buildAttestedDelivery } from './attestation.js';

class VeniceSellerAgent {
  constructor(privateKey) {
    this.wallet = getWalletClient(privateKey);
    this.address = this.wallet.account.address;
    this.claimedTasks = new Set();
    this.veniceEnabled = false;
    this.venice = null;
    this.attestations = []; // Track attestation records

    // Try to initialize Venice
    try {
      if (process.env.VENICE_API_KEY) {
        this.venice = createVeniceClient({ privacyTier: PRIVACY_TIERS.TEE });
        this.veniceEnabled = true;
        console.log('   🔒 Venice TEE enabled — private cognition active');
      } else {
        console.log('   ⚡ Standard mode — set VENICE_API_KEY for private cognition');
      }
    } catch (err) {
      console.log(`   ⚠️ Venice unavailable: ${err.message}`);
    }
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

        // ── Venice: Private Task Evaluation ──
        let shouldClaim = true;
        if (this.veniceEnabled) {
          try {
            const evalResult = await this.venice.evaluateTaskPrivately({
              taskType: task.taskType,
              description: task.description,
              reward: formatEther(task.reward),
            });

            shouldClaim = evalResult.decision.claim;
            console.log(`   🔒 Private eval: ${shouldClaim ? 'CLAIM' : 'SKIP'} (${evalResult.decision.confidence}% confidence)`);
            console.log(`   🔒 Reason: ${evalResult.decision.reasoning}`);

            if (evalResult.attestation) {
              this.attestations.push({
                phase: 'evaluation',
                taskId,
                attestation: evalResult.attestation,
                requestId: evalResult.requestId,
              });
            }
          } catch (err) {
            console.log(`   ⚠️ Venice eval failed, defaulting to claim: ${err.message}`);
            shouldClaim = true;
          }
        }

        if (!shouldClaim) {
          console.log(`   ⏭️ Skipping task #${taskId} (Venice evaluation: don't claim)`);
          continue;
        }

        try {
          const hash = await this.wallet.writeContract({
            ...contracts.serviceBoard,
            functionName: 'claimTask',
            args: [BigInt(taskId)],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`   ✅ Claimed task #${taskId}! Tx: ${hash.substring(0, 20)}...`);
          this.claimedTasks.add(taskId);

          // Execute and deliver
          await this.executeAndDeliver(taskId, task.taskType, task.description);
        } catch (err) {
          console.log(`   ⚠️ Could not claim task #${taskId}: ${err.message?.substring(0, 60)}`);
        }
      }
    } catch (err) {
      // No open tasks or error
    }
  }

  async executeAndDeliver(taskId, taskType, description) {
    console.log(`\n🔧 Seller: Executing task #${taskId} (${taskType})...`);

    let deliveryHash;
    let workResult;

    if (this.veniceEnabled) {
      // ── Venice: Private Task Execution ──
      try {
        const execResult = await this.venice.executeTaskPrivately(taskType, description);
        workResult = execResult.result;

        // Build attestation-backed delivery
        const delivery = buildAttestedDelivery(
          workResult,
          execResult.attestation,
          execResult.requestId,
          execResult.model
        );

        deliveryHash = delivery.deliveryHash;
        console.log(`   🔒 Work executed in TEE enclave`);
        console.log(`   📦 Attested delivery: ${deliveryHash.substring(0, 40)}...`);

        if (execResult.attestation) {
          this.attestations.push({
            phase: 'execution',
            taskId,
            attestation: execResult.attestation,
            signature: execResult.signature,
            requestId: execResult.requestId,
            deliveryHash,
            metadata: delivery.metadata,
          });
        }
      } catch (err) {
        console.log(`   ⚠️ Venice execution failed, falling back to standard: ${err.message}`);
        const fallback = executeTask(taskType, description);
        workResult = fallback.result;
        deliveryHash = fallback.hash;
      }
    } else {
      // Standard (non-private) execution
      await new Promise(r => setTimeout(r, 1000));
      const { result, hash } = executeTask(taskType, description);
      workResult = result;
      deliveryHash = hash;
    }

    console.log(`   Result preview: ${workResult.substring(0, 80)}...`);

    try {
      const txHash = await this.wallet.writeContract({
        ...contracts.serviceBoard,
        functionName: 'deliverTask',
        args: [BigInt(taskId), deliveryHash],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`   📦 Delivered task #${taskId}! Hash: ${deliveryHash}`);

      if (this.veniceEnabled) {
        console.log(`   🔒 Delivery includes TEE attestation proof`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to deliver: ${err.message}`);
    }
  }

  getAttestationLog() {
    return this.attestations;
  }
}

// Main
async function main() {
  const privateKey = process.env.SELLER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('SELLER_PRIVATE_KEY not set');
    process.exit(1);
  }

  const seller = new VeniceSellerAgent(privateKey);
  console.log(`🔧 Venice-Enhanced Seller Agent: ${seller.address}`);
  console.log(`   Mode: ${seller.veniceEnabled ? '🔒 Private (TEE)' : '⚡ Standard'}`);

  const balance = await publicClient.getBalance({ address: seller.address });
  console.log(`   Balance: ${formatEther(balance)} ETH`);

  // Poll for tasks
  console.log('\n🔧 Seller: Polling for tasks...');
  const maxPolls = 60;
  for (let poll = 0; poll < maxPolls; poll++) {
    await seller.discoverAndClaimTasks();

    if (seller.claimedTasks.size >= 5) {
      console.log('\n🔧 Seller: All discovered tasks claimed and delivered!');
      await new Promise(r => setTimeout(r, 10000));
      break;
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  // Print attestation log
  const attestations = seller.getAttestationLog();
  if (attestations.length > 0) {
    console.log(`\n🔒 Attestation Log (${attestations.length} proofs):`);
    for (const a of attestations) {
      console.log(`   ${a.phase.padEnd(12)} | Task #${a.taskId} | Request: ${a.requestId?.substring(0, 12)}...`);
    }
  }
}

main().catch(console.error);
