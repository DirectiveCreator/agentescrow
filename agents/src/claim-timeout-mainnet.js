#!/usr/bin/env node

/**
 * Claim timed-out tasks on Base Mainnet.
 * After deadline passes, anyone can call claimTimeout() to refund the buyer.
 *
 * Usage:
 *   DEPLOYER_KEY=0x... node agents/src/claim-timeout-mainnet.js
 *
 * Targets tasks 0, 1, 3 on ServiceBoard 0x2b6f87820A27CcC590D9A8FBC52632B85dcFe574
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRIVATE_KEY = process.env.DEPLOYER_KEY || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ DEPLOYER_KEY environment variable required');
  console.error('   Usage: DEPLOYER_KEY=0x... node agents/src/claim-timeout-mainnet.js');
  process.exit(1);
}

const SERVICE_BOARD = '0x2b6f87820A27CcC590D9A8FBC52632B85dcFe574';
const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);

const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
const walletClient = createWalletClient({ account, chain: base, transport: http('https://mainnet.base.org') });

// Load ABI from Foundry output
const artifact = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'contracts', 'out', 'ServiceBoard.sol', 'ServiceBoard.json'), 'utf-8')
);
const abi = artifact.abi;

const STUCK_TASKS = [0, 1, 3];

async function main() {
  console.log('');
  console.log('🔧 ═══════════════════════════════════════════');
  console.log('   Escroue — Claim Timed-Out Tasks');
  console.log('🔧 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   ServiceBoard: ${SERVICE_BOARD}`);
  console.log(`   Caller:       ${account.address}`);
  console.log('');

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`   Balance: ${formatEther(balance)} ETH`);
  console.log('');

  const now = Math.floor(Date.now() / 1000);

  for (const taskId of STUCK_TASKS) {
    try {
      const task = await publicClient.readContract({
        address: SERVICE_BOARD, abi,
        functionName: 'getTask', args: [BigInt(taskId)],
      });

      const status = Number(task.status);
      const deadline = Number(task.deadline);
      const statusNames = ['Open', 'Claimed', 'Delivered', 'Completed', 'Cancelled', 'TimedOut'];

      console.log(`📋 Task ${taskId}: ${statusNames[status] || status}`);
      console.log(`   Deadline: ${new Date(deadline * 1000).toISOString()} (${deadline < now ? 'EXPIRED' : `${deadline - now}s remaining`})`);
      console.log(`   Reward: ${formatEther(task.reward)} ETH`);

      if (status >= 3) {
        console.log(`   ⏩ Already ${statusNames[status]}, skipping`);
        console.log('');
        continue;
      }

      if (deadline > now) {
        console.log(`   ⏳ Not expired yet (${deadline - now}s remaining), skipping`);
        console.log('');
        continue;
      }

      console.log('   🔄 Calling claimTimeout...');
      const hash = await walletClient.writeContract({
        address: SERVICE_BOARD, abi,
        functionName: 'claimTimeout',
        args: [BigInt(taskId)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Timed out! TX: ${hash}`);
      console.log(`   Gas: ${receipt.gasUsed.toString()}`);
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message?.slice(0, 120)}`);
    }
    console.log('');
  }

  const remaining = await publicClient.getBalance({ address: account.address });
  console.log(`   Remaining balance: ${formatEther(remaining)} ETH`);
  console.log('   Done! Now run demo-mainnet.js to create fresh completed tasks.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
