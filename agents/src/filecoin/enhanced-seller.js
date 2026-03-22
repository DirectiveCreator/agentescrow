/**
 * Enhanced Seller Agent with Filecoin Onchain Cloud Storage
 *
 * When this seller completes a task, the delivery content is stored on
 * Filecoin Onchain Cloud (FOC). The returned PieceCID serves as the
 * verifiable delivery hash submitted to the on-chain EscrowVault.
 *
 * Flow:
 * 1. Seller discovers open task on ServiceBoard (Base Sepolia)
 * 2. Claims task on-chain
 * 3. Executes task (AI inference)
 * 4. Stores result on Filecoin Onchain Cloud → gets PieceCID
 * 5. Submits PieceCID as deliveryHash to ServiceBoard
 * 6. Buyer retrieves content from FOC via PieceCID → verifies → confirms
 *
 * @module filecoin/enhanced-seller
 */

import { publicClient, getWalletClient, contracts } from '../config.js';
import { formatEther } from 'viem';
import { executeTask } from '../tasks.js';
import { AgentStorage } from './client.js';

export class FilecoinSellerAgent {
  constructor({ privateKey, filecoinKey, network = 'calibration', erc8004Id }) {
    this.wallet = getWalletClient(privateKey);
    this.address = this.wallet.account.address;
    this.claimedTasks = new Set();
    this.erc8004Id = erc8004Id || null;

    // Initialize Filecoin storage (uses filecoinKey if available, otherwise simulation)
    this.storage = new AgentStorage({
      privateKey: filecoinKey,
      network,
    });

    // Track all storage receipts for this session
    this.storageReceipts = [];
  }

  async executeAndDeliver(taskId, taskType, description) {
    console.log(`\n🔧 FilecoinSeller: Executing task #${taskId} (${taskType})...`);
    await new Promise(r => setTimeout(r, 500));

    // Execute the task
    const { result } = executeTask(taskType, description);
    console.log(`   Result preview: ${result.substring(0, 80)}...`);

    // Store result on Filecoin Onchain Cloud
    console.log(`\n🗄️  Storing delivery on Filecoin Onchain Cloud...`);
    const receipt = await this.storage.storeDelivery({
      taskId,
      taskType,
      result,
      agentAddress: this.address,
      agentERC8004Id: this.erc8004Id,
    });

    this.storageReceipts.push(receipt);
    console.log(`   ✅ Stored! PieceCID: ${receipt.pieceCid}`);

    // Submit PieceCID as delivery hash to on-chain contract
    try {
      const txHash = await this.wallet.writeContract({
        ...contracts.serviceBoard,
        functionName: 'deliverTask',
        args: [BigInt(taskId), receipt.pieceCid],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`   📦 Delivered task #${taskId} on-chain!`);
      console.log(`   Delivery hash (PieceCID): ${receipt.pieceCid}`);
      console.log(`   Tx: ${txHash.substring(0, 20)}...`);
    } catch (err) {
      console.error(`   ❌ Failed to deliver task #${taskId}: ${err.message}`);
    }

    return receipt;
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

        console.log(`\n🔧 FilecoinSeller: Found open task #${taskId}: ${task.taskType}`);
        console.log(`   Reward: ${formatEther(task.reward)} ETH`);

        try {
          const hash = await this.wallet.writeContract({
            ...contracts.serviceBoard,
            functionName: 'claimTask',
            args: [BigInt(taskId)],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`   ✅ Claimed task #${taskId}!`);
          this.claimedTasks.add(taskId);

          await this.executeAndDeliver(taskId, task.taskType, task.description);
        } catch (err) {
          console.log(`   ⚠️ Could not claim task #${taskId}: ${err.message?.substring(0, 60)}`);
        }
      }
    } catch (err) {
      // No open tasks or error
    }
  }

  getStorageReceipts() {
    return this.storageReceipts;
  }
}

export default FilecoinSellerAgent;
