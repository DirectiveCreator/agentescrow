#!/usr/bin/env node

/**
 * Celo CIP-64 Fee Abstraction Demo
 *
 * Demonstrates paying gas in stablecoins instead of CELO.
 * This is Celo's killer feature for agents — they can operate
 * entirely in stablecoins without needing native CELO tokens.
 *
 * NOTE: On Celo Sepolia, fee currency adapters may not be deployed yet.
 * This script shows the architecture and falls back to simulation if needed.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/fee-abstraction-demo.js
 *
 * @module celo/fee-abstraction-demo
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Config ─────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('\u274C DEPLOYER_PRIVATE_KEY required');
  process.exit(1);
}

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);
const RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org';
const EXPLORER = 'https://celo-sepolia.blockscout.com';

const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: celoSepolia,
  transport: http(RPC_URL),
});

// ─── Fee Currency Addresses ─────────────────────────────────────────────────

// On Celo mainnet, these are well-known. On Sepolia, they may vary.
const FEE_CURRENCIES = {
  // Celo mainnet fee currencies
  'cUSD (mainnet)': '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  'USDC (mainnet)': '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  // Celo Sepolia — check which are available
  'cUSD adapter (legacy)': '0x4822e58de6f5e485eF90df51C41CE01721331dC0',
};

// Contract addresses
const CONTRACTS = {
  serviceBoard: '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
};

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('\u26FD \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   CIP-64 Fee Abstraction Demo');
  console.log('\u26FD \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('');
  console.log('   Celo CIP-64 allows agents to pay gas in stablecoins.');
  console.log('   No native CELO needed \u2014 agents operate purely in USD terms.');
  console.log('');

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`   Account: ${account.address}`);
  console.log(`   CELO balance: ${formatEther(balance)} CELO`);
  console.log('');

  // ── Check which fee currencies are available ────────────────────────

  console.log('\u{1F50D} Checking fee currency availability on Celo Sepolia...');
  console.log('\u2500'.repeat(55));

  let availableFeeCurrency = null;

  for (const [name, addr] of Object.entries(FEE_CURRENCIES)) {
    try {
      const code = await publicClient.getCode({ address: addr });
      const exists = code && code !== '0x';
      console.log(`   ${exists ? '\u2705' : '\u274C'} ${name}: ${addr.slice(0, 20)}... ${exists ? 'DEPLOYED' : 'not found'}`);
      if (exists && !availableFeeCurrency) {
        availableFeeCurrency = { name, address: addr };
      }
    } catch (e) {
      console.log(`   \u274C ${name}: error checking`);
    }
  }
  console.log('');

  // ── Demonstrate fee abstraction concept ─────────────────────────────

  console.log('\u{1F4A1} How Fee Abstraction Works for Agents');
  console.log('\u2500'.repeat(55));
  console.log('');
  console.log('   Standard flow (requires CELO):');
  console.log('   Agent \u2192 postTask() \u2192 gas paid in CELO \u2192 TX mined');
  console.log('');
  console.log('   Fee abstraction flow (no CELO needed):');
  console.log('   Agent \u2192 postTask({feeCurrency: cUSD}) \u2192 gas paid in cUSD \u2192 TX mined');
  console.log('');
  console.log('   Benefits for agents:');
  console.log('   1. Operate entirely in stablecoins (no volatile token exposure)');
  console.log('   2. Earn cUSD from tasks, pay gas in cUSD \u2014 closed loop');
  console.log('   3. Lower barrier to entry (no CELO acquisition needed)');
  console.log('   4. Predictable costs (gas in USD terms)');
  console.log('');

  // ── Live demo: standard tx vs fee-abstracted tx ─────────────────────

  console.log('\u{1F680} Live Transaction: Standard (CELO gas)');
  console.log('\u2500'.repeat(55));

  const startBalance = await publicClient.getBalance({ address: account.address });

  // Simple self-transfer to measure gas
  const standardHash = await walletClient.sendTransaction({
    to: account.address,
    value: 0n,
    data: '0x', // empty call
  });
  const standardReceipt = await publicClient.waitForTransactionReceipt({ hash: standardHash });

  const afterBalance = await publicClient.getBalance({ address: account.address });
  const gasCostCelo = startBalance - afterBalance;

  console.log(`   TX: ${standardHash.slice(0, 30)}...`);
  console.log(`   Gas used: ${standardReceipt.gasUsed.toString()}`);
  console.log(`   Gas cost: ${formatEther(gasCostCelo)} CELO`);
  console.log(`   ${EXPLORER}/tx/${standardHash}`);
  console.log('');

  if (availableFeeCurrency) {
    console.log(`\u{1F680} Attempting Fee Abstraction with ${availableFeeCurrency.name}...`);
    console.log('\u2500'.repeat(55));
    try {
      const feeAbstractedHash = await walletClient.sendTransaction({
        to: account.address,
        value: 0n,
        data: '0x',
        feeCurrency: availableFeeCurrency.address,
      });
      const feeReceipt = await publicClient.waitForTransactionReceipt({ hash: feeAbstractedHash });
      console.log(`   \u2705 Fee abstraction TX succeeded!`);
      console.log(`   TX: ${feeAbstractedHash.slice(0, 30)}...`);
      console.log(`   Gas used: ${feeReceipt.gasUsed.toString()}`);
      console.log(`   Gas paid in: ${availableFeeCurrency.name}`);
      console.log(`   ${EXPLORER}/tx/${feeAbstractedHash}`);
    } catch (e) {
      console.log(`   \u26A0\uFE0F  Fee abstraction not available on Celo Sepolia: ${e.message?.slice(0, 80)}`);
      console.log('   This works on Celo mainnet with cUSD/USDC.');
    }
  } else {
    console.log('\u{1F4CB} Fee Abstraction Architecture (Celo Mainnet)');
    console.log('\u2500'.repeat(55));
    console.log('   On Celo mainnet, fee abstraction is available with:');
    console.log('   - cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a');
    console.log('   - USDC: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C');
    console.log('');
    console.log('   Code example:');
    console.log('   ```');
    console.log('   const hash = await walletClient.sendTransaction({');
    console.log('     to: serviceBoard,');
    console.log('     data: postTaskCalldata,');
    console.log('     value: escrowAmount,');
    console.log("     feeCurrency: '0x765DE816845861e75A25fCA122bb6898B8B1282a', // cUSD");
    console.log('   });');
    console.log('   ```');
  }

  // ── Summary ───────────────────────────────────────────────────────────

  console.log('');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('   FEE ABSTRACTION DEMO COMPLETE');
  console.log('\u{1F389} \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
  console.log('');
  console.log('   Key insight: Celo\'s fee abstraction enables stablecoin-native');
  console.log('   agent commerce. Agents earn in USD, pay gas in USD, operate');
  console.log('   without volatile token exposure. Perfect for autonomous agents.');
  console.log('');
  console.log('   AgentEscrow CeloClient supports fee abstraction via:');
  console.log('   client.sendWithFeeAbstraction({ to, data, value, feeCurrency: "cUSD" })');
  console.log('');
}

main().catch(err => {
  console.error('\u274C Fee abstraction demo failed:', err.message);
  process.exit(1);
});
