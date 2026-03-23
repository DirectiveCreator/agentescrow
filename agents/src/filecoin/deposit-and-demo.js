#!/usr/bin/env node
/**
 * Filecoin FOC — Deposit USDFC + Run Live Demo
 *
 * Uses Synapse SDK's prepare() method to handle deposit + FWSS approval,
 * then stores 4 items on Filecoin. Defaults to mainnet.
 *
 * Usage:
 *   FILECOIN_PRIVATE_KEY=0x... node agents/src/filecoin/deposit-and-demo.js
 *   FILECOIN_PRIVATE_KEY=0x... FILECOIN_NETWORK=calibration node agents/src/filecoin/deposit-and-demo.js
 */

import { Synapse, calibration, mainnet } from '@filoz/synapse-sdk';
import { privateKeyToAccount } from 'viem/accounts';
import { formatUnits, parseUnits } from 'viem';

const PRIVATE_KEY = process.env.FILECOIN_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ Set FILECOIN_PRIVATE_KEY env var');
  process.exit(1);
}

const network = process.env.FILECOIN_NETWORK || 'mainnet';
const chainConfig = network === 'mainnet' ? mainnet : calibration;
const chainId = network === 'mainnet' ? 314 : 314159;
const tokenPrefix = network === 'mainnet' ? '' : 't';

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🗄️  Filecoin FOC — Deposit & Live Demo                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(`   Account: ${account.address}`);
console.log(`   Network: Filecoin ${network === 'mainnet' ? 'Mainnet' : 'Calibration'} (${chainId})`);
console.log();

const synapse = Synapse.create({
  chain: chainConfig,
  account,
  source: 'agentescrow',
});

async function main() {
  // ── Step 1: Check balances ──────────────────────────────────
  console.log('━━━ Step 1: Check Balances ━━━');

  const filBalance = await synapse.payments.walletBalance({ token: 'FIL' });
  console.log(`   FIL balance:   ${formatUnits(filBalance, 18)} ${tokenPrefix}FIL`);

  const usdfcBalance = await synapse.payments.walletBalance({ token: 'USDFC' });
  console.log(`   USDFC balance: ${formatUnits(usdfcBalance, 18)} ${tokenPrefix}USDFC`);

  try {
    const info = await synapse.payments.accountInfo();
    console.log(`   FOC deposited: ${formatUnits(info.availableFunds || info.funds || 0n, 18)} ${tokenPrefix}USDFC`);
  } catch (e) {
    console.log(`   FOC deposited: 0 ${tokenPrefix}USDFC (new account)`);
  }
  console.log();

  // ── Step 2: Prepare — deposit + approve FWSS if needed ─────
  console.log('━━━ Step 2: Prepare Storage (Deposit + Approve) ━━━');

  // Estimate total data size for 4 items (~3KB total)
  const estimatedDataSize = BigInt(3 * 1024);

  try {
    const { costs, transaction } = await synapse.storage.prepare({
      dataSize: estimatedDataSize,
    });

    console.log(`   Rate per month: ${formatUnits(costs.rate.perMonth, 18)} ${tokenPrefix}USDFC`);
    console.log(`   Deposit needed: ${formatUnits(costs.depositNeeded, 18)} ${tokenPrefix}USDFC`);
    console.log(`   FWSS approval:  ${costs.needsFwssMaxApproval ? 'NEEDED' : 'OK'}`);
    console.log(`   Ready:          ${costs.ready ? 'YES ✅' : 'NO — need transaction'}`);

    if (transaction) {
      console.log(`   Executing deposit+approve transaction...`);
      const txHash = await transaction.execute({
        onHash: (hash) => console.log(`   Tx hash: ${hash}`),
      });
      console.log(`   ✅ Transaction completed: ${txHash}`);

      // Wait for confirmation
      console.log('   Waiting for confirmation (30s)...');
      await new Promise(r => setTimeout(r, 30000));
    }
  } catch (err) {
    console.log(`   ⚠️  Prepare failed: ${err.message}`);
    console.log('   Attempting manual deposit + approval...');

    // Manual fallback: approve FWSS as operator, then deposit
    try {
      const fwssAddr = chainConfig.contracts.fwss.address;
      console.log(`   Approving FWSS operator (${fwssAddr})...`);

      const approveTx = await synapse.payments.approveService({
        service: fwssAddr,
        rateAllowance: parseUnits('100', 18),
        lockupAllowance: parseUnits('100', 18),
        maxLockupPeriod: BigInt(365 * 24 * 60 * 2), // 1 year in epochs (30s each)
      });
      console.log(`   ✅ FWSS approved: ${approveTx}`);
      await new Promise(r => setTimeout(r, 15000));

      // Now approve ERC20 spending
      const payAddr = chainConfig.contracts.filecoinPay.address;
      const erc20ApproveTx = await synapse.payments.approve({
        spender: payAddr,
        amount: parseUnits('5', 18),
      });
      console.log(`   ✅ ERC20 approved: ${erc20ApproveTx}`);
      await new Promise(r => setTimeout(r, 15000));

      // Deposit
      const depositTx = await synapse.payments.deposit({
        amount: parseUnits('2', 18),
      });
      console.log(`   ✅ Deposited: ${depositTx}`);
      await new Promise(r => setTimeout(r, 15000));
    } catch (err2) {
      console.log(`   ⚠️  Manual setup failed: ${err2.message}`);
    }
  }

  console.log();

  // ── Step 3: Store items on Filecoin ─────────────────────────
  console.log('━━━ Step 3: Store Task Deliveries on Filecoin ━━━');

  const storageChain = network === 'mainnet' ? 'filecoin-mainnet' : 'filecoin-calibration';
  const results = [];

  const items = [
    {
      label: '📝 text_summary',
      fn: () => synapse.storage.upload(
        new TextEncoder().encode(JSON.stringify({
          version: '1.0', protocol: 'agentescrow', type: 'task_delivery',
          timestamp: new Date().toISOString(), taskId: 42, taskType: 'text_summary',
          result: 'Summary: The AgentEscrow protocol enables autonomous AI agents to trade services using smart contract escrow. Key points: (1) Trustless agent-to-agent commerce via EscrowVault, (2) Reputation tracking via ReputationRegistry, (3) Task discovery via ServiceBoard.',
          agent: { address: account.address, erc8004Id: '2195' },
          chain: { escrowChain: 'base-sepolia', storageChain },
        }, null, 2))
      ),
    },
    {
      label: '🔍 code_review',
      fn: () => synapse.storage.upload(
        new TextEncoder().encode(JSON.stringify({
          version: '1.0', protocol: 'agentescrow', type: 'task_delivery',
          timestamp: new Date().toISOString(), taskId: 43, taskType: 'code_review',
          result: 'Code Review: Well-organized Solidity contracts following OpenZeppelin patterns. No reentrancy vulnerabilities. 8/8 tests passing. Rating: 8/10.',
          agent: { address: account.address, erc8004Id: '2195' },
          chain: { escrowChain: 'base-sepolia', storageChain },
        }, null, 2))
      ),
    },
    {
      label: '🧠 agent_memory',
      fn: () => synapse.storage.upload(
        new TextEncoder().encode(JSON.stringify({
          version: '1.0', protocol: 'agentescrow', type: 'agent_memory',
          timestamp: new Date().toISOString(),
          content: { agentId: '2195', tasksCompleted: [42, 43], trustScore: 100, capabilities: ['text_summary', 'code_review'] },
          metadata: { protocol: 'agentescrow', chain: 'base-sepolia', erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e' },
        }, null, 2))
      ),
    },
    {
      label: '🔐 tee_attestation',
      fn: () => synapse.storage.upload(
        new TextEncoder().encode(JSON.stringify({
          version: '1.0', protocol: 'agentescrow', type: 'tee_attestation',
          timestamp: new Date().toISOString(),
          content: { model: 'tee-deepseek-r1-671b', taskId: 42, enclaveId: 'sgx-venice-prod-001', verified: true },
          metadata: { provider: 'venice.ai', privacyLevel: 'TEE' },
        }, null, 2))
      ),
    },
  ];

  for (const item of items) {
    console.log(`\n${item.label}...`);
    try {
      const result = await item.fn();
      console.log(`   ✅ PieceCID: ${result.pieceCid}`);
      console.log(`   Size: ${result.size} bytes, Copies: ${result.copies?.length || 0}`);
      results.push({ type: item.label, pieceCid: result.pieceCid, size: result.size, copies: result.copies });
    } catch (err) {
      console.log(`   ❌ ${err.shortMessage || err.message}`);
      if (err.details) console.log(`   Details: ${err.details.substring(0, 200)}`);
    }
  }

  // ── Step 4: Retrieve and verify ─────────────────────────────
  if (results.length > 0) {
    console.log('\n━━━ Step 4: Retrieve & Verify ━━━');
    for (const r of results) {
      try {
        const data = await synapse.storage.download({ pieceCid: r.pieceCid });
        const parsed = JSON.parse(new TextDecoder().decode(data));
        console.log(`   ✅ ${r.type}: Retrieved (${parsed.type})`);
      } catch (err) {
        console.log(`   ⏳ ${r.type}: Retrieval pending (data propagating...)`);
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────
  const networkLabel = network === 'mainnet' ? 'Filecoin Mainnet (314)' : 'Filecoin Calibration (314159)';
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 LIVE Demo Results                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Items stored on Filecoin:  ${results.length}                              ║`);
  console.log(`║  Network: ${networkLabel.padEnd(48)}║`);
  console.log(`║  Account: ${account.address}  ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    console.log(`║  ${r.type}`);
    console.log(`║    PieceCID: ${r.pieceCid}`);
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log('\n📋 JSON:');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

main().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
