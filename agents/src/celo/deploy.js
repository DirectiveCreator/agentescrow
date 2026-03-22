#!/usr/bin/env node

/**
 * Deploy AgentEscrow contracts to Celo Alfajores
 *
 * Deploys ServiceBoard, EscrowVault, and ReputationRegistry
 * then wires up permissions (same as Base Sepolia deployment).
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/deploy.js
 *
 * @module celo/deploy
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Configuration ──────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('\u274C DEPLOYER_PRIVATE_KEY environment variable is required');
  console.error('   Usage: DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/deploy.js');
  process.exit(1);
}

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);

const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org'),
});

const walletClient = createWalletClient({
  account,
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org'),
});

// ─── Load Contract Artifacts ────────────────────────────────────────────────

function loadArtifact(name) {
  const path = join(__dirname, '..', '..', '..', 'contracts', 'out', `${name}.sol`, `${name}.json`);
  const json = JSON.parse(readFileSync(path, 'utf-8'));
  return { abi: json.abi, bytecode: json.bytecode.object };
}

// ─── Deploy Function ────────────────────────────────────────────────────────

async function deployContract(name, args = []) {
  const { abi, bytecode } = loadArtifact(name);

  console.log(`\u{1F680} Deploying ${name}...`);

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args,
  });

  console.log(`   TX: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   \u2705 ${name} deployed at: ${receipt.contractAddress}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

  return { address: receipt.contractAddress, abi };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('\u{1F7E2} ═══════════════════════════════════════════════════');
  console.log('   AgentEscrow \u2192 Celo Alfajores Deployment');
  console.log('\u{1F7E2} ═══════════════════════════════════════════════════');
  console.log('');
  console.log(`   Deployer: ${account.address}`);
  console.log(`   Chain:    Celo Alfajores (44787)`);
  console.log(`   RPC:      https://alfajores-forno.celo-testnet.org`);
  console.log('');

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`   Balance:  ${formatEther(balance)} CELO`);

  if (balance === 0n) {
    console.error('\u274C No CELO balance! Get testnet CELO from: https://faucet.celo.org/alfajores');
    process.exit(1);
  }

  console.log('');

  // 1. Deploy EscrowVault
  const escrowVault = await deployContract('EscrowVault');

  // 2. Deploy ReputationRegistry
  const reputationRegistry = await deployContract('ReputationRegistry');

  // 3. Deploy ServiceBoard (needs escrow + reputation addresses)
  const serviceBoard = await deployContract('ServiceBoard', [
    escrowVault.address,
    reputationRegistry.address,
  ]);

  console.log('');
  console.log('\u{1F517} Wiring up permissions...');

  // 4. Set ServiceBoard as authorized on EscrowVault
  let hash = await walletClient.writeContract({
    address: escrowVault.address,
    abi: escrowVault.abi,
    functionName: 'setServiceBoard',
    args: [serviceBoard.address],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   \u2705 EscrowVault.setServiceBoard()');

  // 5. Set ServiceBoard as authorized on ReputationRegistry
  hash = await walletClient.writeContract({
    address: reputationRegistry.address,
    abi: reputationRegistry.abi,
    functionName: 'setServiceBoard',
    args: [serviceBoard.address],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   \u2705 ReputationRegistry.setServiceBoard()');

  // Check remaining balance
  const remaining = await publicClient.getBalance({ address: account.address });

  console.log('');
  console.log('\u{1F389} ═══════════════════════════════════════════════════');
  console.log('   DEPLOYMENT COMPLETE!');
  console.log('\u{1F389} ═══════════════════════════════════════════════════');
  console.log('');
  console.log('   Deployed Contracts (Celo Alfajores):');
  console.log(`   EscrowVault:        ${escrowVault.address}`);
  console.log(`   ReputationRegistry: ${reputationRegistry.address}`);
  console.log(`   ServiceBoard:       ${serviceBoard.address}`);
  console.log('');
  console.log(`   Deployer:           ${account.address}`);
  console.log(`   Remaining balance:  ${formatEther(remaining)} CELO`);
  console.log('');
  console.log('   Add to .env:');
  console.log(`   CELO_SERVICE_BOARD_ADDRESS=${serviceBoard.address}`);
  console.log(`   CELO_ESCROW_VAULT_ADDRESS=${escrowVault.address}`);
  console.log(`   CELO_REPUTATION_REGISTRY_ADDRESS=${reputationRegistry.address}`);
  console.log('');
}

main().catch(err => {
  console.error('\u274C Deployment failed:', err.message);
  process.exit(1);
});
