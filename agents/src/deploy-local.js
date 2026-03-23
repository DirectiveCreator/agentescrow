#!/usr/bin/env node
// Deploy contracts to local Anvil and output addresses for .env
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil account 0
const BUYER_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Anvil account 1
const SELLER_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'; // Anvil account 2

const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);
const client = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8545') });
const wallet = createWalletClient({ account, chain: foundry, transport: http('http://127.0.0.1:8545') });

async function deployContract(name, bytecodeFile, constructorArgs = []) {
  const artifactPath = join(__dirname, '../../contracts/out', `${name}.sol`, `${name}.json`);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args: constructorArgs,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`  ${name} deployed at: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function main() {
  console.log('🚀 Deploying Escroue contracts to local Anvil...\n');

  // Deploy contracts
  const vaultAddr = await deployContract('EscrowVault');
  const reputationAddr = await deployContract('ReputationRegistry');
  const boardAddr = await deployContract('ServiceBoard', null, [vaultAddr, reputationAddr]);

  // Wire up permissions
  console.log('\n  Wiring up permissions...');

  const vaultArtifact = JSON.parse(readFileSync(join(__dirname, '../../contracts/out/EscrowVault.sol/EscrowVault.json'), 'utf8'));
  const repArtifact = JSON.parse(readFileSync(join(__dirname, '../../contracts/out/ReputationRegistry.sol/ReputationRegistry.json'), 'utf8'));

  let hash = await wallet.writeContract({
    address: vaultAddr,
    abi: vaultArtifact.abi,
    functionName: 'setServiceBoard',
    args: [boardAddr],
  });
  await client.waitForTransactionReceipt({ hash });

  hash = await wallet.writeContract({
    address: reputationAddr,
    abi: repArtifact.abi,
    functionName: 'setServiceBoard',
    args: [boardAddr],
  });
  await client.waitForTransactionReceipt({ hash });

  console.log('  ✅ Permissions set!\n');

  // Write .env file
  const envContent = `# Escroue Local Config
CHAIN=local
BASE_SEPOLIA_RPC=http://127.0.0.1:8545

# Contract Addresses
SERVICE_BOARD_ADDRESS=${boardAddr}
ESCROW_VAULT_ADDRESS=${vaultAddr}
REPUTATION_REGISTRY_ADDRESS=${reputationAddr}

# Agent Keys (Anvil default accounts)
BUYER_PRIVATE_KEY=${BUYER_KEY}
SELLER_PRIVATE_KEY=${SELLER_KEY}
`;

  writeFileSync(join(__dirname, '../../.env'), envContent);
  console.log('📝 .env file written with contract addresses');
  console.log('\n✅ Deployment complete! Run agents with:');
  console.log('   node src/buyer.js   (in one terminal)');
  console.log('   node src/seller.js  (in another terminal)');

  const buyerAccount = privateKeyToAccount(BUYER_KEY);
  const sellerAccount = privateKeyToAccount(SELLER_KEY);
  console.log(`\n  Buyer address:  ${buyerAccount.address}`);
  console.log(`  Seller address: ${sellerAccount.address}`);
}

main().catch(console.error);
