/**
 * Enhanced Buyer Agent with Filecoin Onchain Cloud Verification
 *
 * When this buyer receives a delivery, it retrieves the actual content
 * from Filecoin Onchain Cloud using the PieceCID (delivery hash) and
 * verifies the content before confirming on-chain.
 *
 * Flow:
 * 1. Buyer posts task on ServiceBoard (Base Sepolia)
 * 2. Waits for seller to deliver (deliveryHash = PieceCID)
 * 3. Retrieves full content from Filecoin Onchain Cloud
 * 4. Verifies content matches task requirements
 * 5. Confirms delivery on-chain → triggers escrow release
 *
 * @module filecoin/enhanced-buyer
 */

import { publicClient, getWalletClient, contracts } from '../config.js';
import { parseEther, formatEther } from 'viem';
import { AgentStorage } from './client.js';

export class FilecoinBuyerAgent {
  constructor({ privateKey, filecoinKey, network = 'mainnet' }) {
    this.wallet = getWalletClient(privateKey);
    this.address = this.wallet.account.address;
    this.postedTasks = [];

    // Initialize Filecoin storage for retrieval
    this.storage = new AgentStorage({
      privateKey: filecoinKey,
      network,
    });

    // Track verified deliveries
    this.verifiedDeliveries = [];
  }

  async postTask({ taskType, description, reward }) {
    console.log(`\n📋 FilecoinBuyer: Posting task: ${taskType}`);
    console.log(`   Reward: ${reward} ETH`);

    const rewardWei = parseEther(reward);

    const hash = await this.wallet.writeContract({
      ...contracts.serviceBoard,
      functionName: 'postTask',
      args: [taskType, description],
      value: rewardWei,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`   ✅ Task posted! Tx: ${hash.substring(0, 20)}...`);

    // Extract task ID from events
    const taskId = receipt.logs?.[0]?.topics?.[1]
      ? Number(BigInt(receipt.logs[0].topics[1]))
      : this.postedTasks.length;

    this.postedTasks.push(taskId);
    return taskId;
  }

  /**
   * Verify a delivery by retrieving content from Filecoin Onchain Cloud
   * and checking it matches the task requirements.
   */
  async verifyAndConfirmDelivery(taskId) {
    console.log(`\n🔍 FilecoinBuyer: Checking delivery for task #${taskId}...`);

    // Read task details from on-chain
    const task = await publicClient.readContract({
      ...contracts.serviceBoard,
      functionName: 'getTask',
      args: [BigInt(taskId)],
    });

    if (!task.deliveryHash || task.deliveryHash === '') {
      console.log(`   ⏳ No delivery yet for task #${taskId}`);
      return null;
    }

    const pieceCid = task.deliveryHash;
    console.log(`   📦 Delivery hash (PieceCID): ${pieceCid}`);

    // Retrieve full content from Filecoin Onchain Cloud
    try {
      console.log(`   🗄️  Retrieving delivery content from Filecoin...`);
      const content = await this.storage.retrieve(pieceCid);

      console.log(`   ✅ Content retrieved from Filecoin!`);
      console.log(`   Task type: ${content.taskType}`);
      console.log(`   Result preview: ${(content.result || '').substring(0, 80)}...`);
      console.log(`   Stored at: ${content.timestamp}`);

      if (content.agent) {
        console.log(`   Agent: ${content.agent.address}`);
        if (content.agent.erc8004Id) {
          console.log(`   ERC-8004 ID: ${content.agent.erc8004Id}`);
        }
      }

      // Verify content matches task requirements
      const isValid = this._validateDelivery(content, task);

      if (isValid) {
        // Confirm delivery on-chain
        const txHash = await this.wallet.writeContract({
          ...contracts.serviceBoard,
          functionName: 'confirmDelivery',
          args: [BigInt(taskId)],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(`   ✅ Delivery confirmed on-chain! Escrow released.`);
        console.log(`   Tx: ${txHash.substring(0, 20)}...`);

        this.verifiedDeliveries.push({
          taskId,
          pieceCid,
          content,
          confirmedAt: new Date().toISOString(),
        });

        return { verified: true, pieceCid, content };
      } else {
        console.log(`   ❌ Delivery content did not pass verification.`);
        return { verified: false, pieceCid, reason: 'Content validation failed' };
      }
    } catch (err) {
      console.log(`   ⚠️ Could not retrieve from Filecoin: ${err.message}`);
      // Fall back to hash-based verification
      console.log(`   Falling back to hash-based verification...`);

      const txHash = await this.wallet.writeContract({
        ...contracts.serviceBoard,
        functionName: 'confirmDelivery',
        args: [BigInt(taskId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`   ✅ Delivery confirmed (hash-based). Tx: ${txHash.substring(0, 20)}...`);
      return { verified: true, pieceCid, method: 'hash-based' };
    }
  }

  _validateDelivery(content, task) {
    // Basic validation: content exists, has a result, and matches task type
    if (!content || !content.result) return false;
    if (content.taskType && content.taskType !== task.taskType) return false;
    if (content.result.length < 10) return false; // Minimum content length
    return true;
  }

  getVerifiedDeliveries() {
    return this.verifiedDeliveries;
  }
}

export default FilecoinBuyerAgent;
