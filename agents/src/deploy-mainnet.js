#!/usr/bin/env node

/**
 * Deploy AgentEscrow to Base or Celo mainnet via viem.
 *
 * Usage:
 *   PRIVATE_KEY=0x... CHAIN=base node agents/src/deploy-mainnet.js
 *   PRIVATE_KEY=0x... CHAIN=celo node agents/src/deploy-mainnet.js
 *
 * Environment:
 *   PRIVATE_KEY          - Deployer private key (required)
 *   CHAIN                - "base" or "celo" (required)
 *   BASE_MAINNET_RPC     - Custom Base RPC (optional)
 *   CELO_MAINNET_RPC     - Custom Celo RPC (optional)
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, celo } from 'viem/chains';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Safety Checks ────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY environment variable is required');
  console.error('   Usage: PRIVATE_KEY=0x... CHAIN=base node agents/src/deploy-mainnet.js');
  process.exit(1);
}

const CHAIN_NAME = (process.env.CHAIN || '').toLowerCase();
if (!['base', 'celo'].includes(CHAIN_NAME)) {
  console.error('❌ CHAIN must be "base" or "celo"');
  console.error('   Usage: PRIVATE_KEY=0x... CHAIN=base node agents/src/deploy-mainnet.js');
  process.exit(1);
}

const chain = CHAIN_NAME === 'base' ? base : celo;
const rpcUrl = CHAIN_NAME === 'base'
  ? (process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org')
  : (process.env.CELO_MAINNET_RPC || 'https://forno.celo.org');

const key = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(key);

const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

// ─── Load Artifacts ────────────────────────────────────────────────────────────

function loadArtifact(name) {
  const path = join(__dirname, '..', '..', 'contracts', 'out', `${name}.sol`, `${name}.json`);
  const json = JSON.parse(readFileSync(path, 'utf-8'));
  return { abi: json.abi, bytecode: json.bytecode.object };
}

function loadProxyArtifact() {
  const path = join(__dirname, '..', '..', 'contracts', 'out', 'ERC1967Proxy.sol', 'ERC1967Proxy.json');
  const json = JSON.parse(readFileSync(path, 'utf-8'));
  return { abi: json.abi, bytecode: json.bytecode.object };
}

async function deployImpl(name) {
  const { abi, bytecode } = loadArtifact(name);
  console.log(`📦 Deploying ${name} implementation...`);
  const hash = await walletClient.deployContract({ abi, bytecode, args: [] });
  console.log(`   TX: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   ✅ ${name} impl at: ${receipt.contractAddress}`);
  console.log(`   Gas: ${receipt.gasUsed.toString()}`);
  return { address: receipt.contractAddress, abi };
}

async function deployProxy(implAddress, initData) {
  const { abi, bytecode } = loadProxyArtifact();
  const hash = await walletClient.deployContract({
    abi, bytecode,
    args: [implAddress, initData],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}

// ─── ABI encode helpers ────────────────────────────────────────────────────────

import { encodeFunctionData } from 'viem';

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('🔴 ═══════════════════════════════════════════');
  console.log(`   AgentEscrow → ${CHAIN_NAME.toUpperCase()} MAINNET Deployment`);
  console.log('🔴 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   Deployer: ${account.address}`);
  console.log(`   Chain:    ${chain.name} (${chain.id})`);
  console.log(`   RPC:      ${rpcUrl}`);

  const balance = await publicClient.getBalance({ address: account.address });
  const currency = CHAIN_NAME === 'base' ? 'ETH' : 'CELO';
  console.log(`   Balance:  ${formatEther(balance)} ${currency}`);

  if (balance === 0n) {
    console.error('❌ No balance! Fund the deployer wallet first.');
    process.exit(1);
  }

  // 5-second safety countdown
  console.log('');
  console.log('⚠️  THIS IS A MAINNET DEPLOYMENT. Real funds will be spent.');
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   Deploying in ${i}... (Ctrl+C to abort)\r`);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('   Deploying now!                              ');
  console.log('');

  // 1. Deploy implementations
  const vault = await deployImpl('EscrowVault');
  const reputation = await deployImpl('ReputationRegistry');
  const board = await deployImpl('ServiceBoard');

  // 2. Deploy proxies
  console.log('');
  console.log('🔗 Deploying UUPS proxies...');

  const vaultInitData = encodeFunctionData({
    abi: vault.abi,
    functionName: 'initialize',
    args: [],
  });
  const vaultProxyAddr = await deployProxy(vault.address, vaultInitData);
  console.log(`   ✅ EscrowVault proxy: ${vaultProxyAddr}`);

  const reputationInitData = encodeFunctionData({
    abi: reputation.abi,
    functionName: 'initialize',
    args: [],
  });
  const reputationProxyAddr = await deployProxy(reputation.address, reputationInitData);
  console.log(`   ✅ ReputationRegistry proxy: ${reputationProxyAddr}`);

  const boardInitData = encodeFunctionData({
    abi: board.abi,
    functionName: 'initialize',
    args: [vaultProxyAddr, reputationProxyAddr],
  });
  const boardProxyAddr = await deployProxy(board.address, boardInitData);
  console.log(`   ✅ ServiceBoard proxy: ${boardProxyAddr}`);

  // 3. Wire permissions
  console.log('');
  console.log('🔗 Wiring permissions...');
  let hash = await walletClient.writeContract({
    address: vaultProxyAddr, abi: vault.abi,
    functionName: 'setServiceBoard', args: [boardProxyAddr],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   ✅ EscrowVault.setServiceBoard()');

  hash = await walletClient.writeContract({
    address: reputationProxyAddr, abi: reputation.abi,
    functionName: 'setServiceBoard', args: [boardProxyAddr],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('   ✅ ReputationRegistry.setServiceBoard()');

  const remaining = await publicClient.getBalance({ address: account.address });

  console.log('');
  console.log('🎉 ═══════════════════════════════════════════');
  console.log('   MAINNET DEPLOYMENT COMPLETE');
  console.log('🎉 ═══════════════════════════════════════════');
  console.log('');
  console.log(`   Chain:              ${chain.name} (${chain.id})`);
  console.log(`   ServiceBoard:       ${boardProxyAddr} (proxy)`);
  console.log(`   EscrowVault:        ${vaultProxyAddr} (proxy)`);
  console.log(`   ReputationRegistry: ${reputationProxyAddr} (proxy)`);
  console.log(`   Deployer:           ${account.address}`);
  console.log(`   Gas spent:          ${formatEther(balance - remaining)} ${currency}`);
  console.log(`   Remaining:          ${formatEther(remaining)} ${currency}`);
  console.log('');
  console.log('   Add to frontend .env:');
  console.log(`   NEXT_PUBLIC_BASE_MAINNET_SERVICE_BOARD=${boardProxyAddr}`);
  console.log(`   NEXT_PUBLIC_BASE_MAINNET_ESCROW_VAULT=${vaultProxyAddr}`);
  console.log(`   NEXT_PUBLIC_BASE_MAINNET_REPUTATION_REGISTRY=${reputationProxyAddr}`);
}

main().catch(err => {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
});
