/**
 * ENS Name Registration Script (Sepolia)
 *
 * Registers a .eth name on Sepolia using the ETH Registrar Controller's
 * commit-reveal process. This is the first step before creating subdomains.
 *
 * Process:
 *   1. Generate commitment (hash of name + owner + secret)
 *   2. Submit commitment on-chain
 *   3. Wait for minCommitmentAge (60 seconds on Sepolia)
 *   4. Register the name
 *
 * Usage:
 *   node agents/src/ens/register-name.js <name>
 *   node agents/src/ens/register-name.js escroue
 *
 * Environment:
 *   DEPLOYER_PRIVATE_KEY - Wallet private key with Sepolia ETH
 *   SEPOLIA_RPC - Ethereum Sepolia RPC URL
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  keccak256,
  encodePacked,
  toHex,
  parseEther,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';

config({ path: '../.env' });

// ─── ENS Sepolia Contracts ────────────────────────────────────────────────

const ETH_REGISTRAR_CONTROLLER = '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968';
const PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD';

// The Sepolia ETH Registrar Controller ABI (essential functions)
const CONTROLLER_ABI = [
  {
    name: 'rentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [
      {
        name: 'price',
        type: 'tuple',
        components: [
          { name: 'base', type: 'uint256' },
          { name: 'premium', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'makeCommitment',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'commit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'secret', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
      { name: 'data', type: 'bytes[]' },
      { name: 'reverseRecord', type: 'bool' },
      { name: 'ownerControlledFuses', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'valid',
    type: 'function',
    stateMutability: 'pure',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'minCommitmentAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxCommitmentAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatETH(wei) {
  return `${(Number(wei) / 1e18).toFixed(6)} ETH`;
}

// ─── Main Registration Flow ──────────────────────────────────────────────

async function main() {
  const label = process.argv[2]; // e.g. "escroue" (without .eth)
  if (!label) {
    console.error('Usage: node register-name.js <name>');
    console.error('Example: node register-name.js escroue');
    process.exit(1);
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('❌ DEPLOYER_PRIVATE_KEY or PRIVATE_KEY required');
    process.exit(1);
  }

  const rpcUrl = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';
  const account = privateKeyToAccount(`0x${pk.replace('0x', '')}`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const fullName = `${label}.eth`;
  const DURATION = BigInt(365 * 24 * 60 * 60); // 1 year

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ENS Name Registration (Sepolia)                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Name:     ${fullName}`);
  console.log(`  Wallet:   ${account.address}`);
  console.log(`  RPC:      ${rpcUrl}`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Balance:  ${formatETH(balance)}`);

  if (balance === 0n) {
    console.error('\n❌ No Sepolia ETH. Get some from:');
    console.error('   • https://cloud.google.com/application/web3/faucet/ethereum/sepolia');
    console.error('   • https://faucet.quicknode.com/ethereum/sepolia');
    console.error('   • https://www.alchemy.com/faucets/ethereum-sepolia');
    process.exit(1);
  }

  // Step 1: Check availability
  console.log('\n─── Step 1: Check Availability ─────────────────────────');
  const isAvailable = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'available',
    args: [label],
  });
  console.log(`  ${fullName} available: ${isAvailable ? '✅ YES' : '❌ NO'}`);

  if (!isAvailable) {
    console.error(`\n❌ ${fullName} is already registered. Try a different name.`);
    process.exit(1);
  }

  // Step 2: Get rent price
  console.log('\n─── Step 2: Get Price ──────────────────────────────────');
  const price = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'rentPrice',
    args: [label, DURATION],
  });
  const totalPrice = price.base + price.premium;
  const priceWithBuffer = (totalPrice * 120n) / 100n; // 20% buffer for gas fluctuations
  console.log(`  Base price:  ${formatETH(price.base)}`);
  console.log(`  Premium:     ${formatETH(price.premium)}`);
  console.log(`  Total:       ${formatETH(totalPrice)}`);
  console.log(`  With buffer: ${formatETH(priceWithBuffer)}`);

  if (balance < priceWithBuffer + BigInt(5e15)) {
    // need price + ~0.005 ETH for gas
    console.error(`\n❌ Insufficient balance. Need ~${formatETH(priceWithBuffer + BigInt(5e15))}`);
    process.exit(1);
  }

  // Step 3: Generate commitment
  console.log('\n─── Step 3: Generate Commitment ────────────────────────');
  const secret = `0x${randomBytes(32).toString('hex')}`;
  console.log(`  Secret:     ${secret.slice(0, 18)}...${secret.slice(-8)}`);

  const commitment = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'makeCommitment',
    args: [
      label,
      account.address,
      DURATION,
      secret,
      PUBLIC_RESOLVER,
      [], // no data (resolver records set separately)
      true, // set reverse record
      0, // no fuses
    ],
  });
  console.log(`  Commitment: ${commitment}`);

  // Step 4: Submit commitment
  console.log('\n─── Step 4: Submit Commitment ──────────────────────────');
  const commitTx = await walletClient.writeContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'commit',
    args: [commitment],
  });
  console.log(`  Commit tx:  ${commitTx}`);

  const commitReceipt = await publicClient.waitForTransactionReceipt({ hash: commitTx });
  console.log(`  Confirmed:  block ${commitReceipt.blockNumber}`);

  // Step 5: Wait for minCommitmentAge
  console.log('\n─── Step 5: Wait for Commitment Age ────────────────────');
  const minAge = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'minCommitmentAge',
  });
  const waitTime = Number(minAge) + 5; // add 5 second buffer
  console.log(`  Min age:    ${minAge} seconds`);
  console.log(`  Waiting:    ${waitTime} seconds...`);

  for (let i = waitTime; i > 0; i -= 10) {
    const remaining = Math.min(i, 10);
    process.stdout.write(`  ⏳ ${i}s remaining...\r`);
    await sleep(remaining * 1000);
  }
  console.log('  ✅ Commitment age reached                    ');

  // Step 6: Register
  console.log('\n─── Step 6: Register Name ─────────────────────────────');
  const registerTx = await walletClient.writeContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'register',
    args: [
      label,
      account.address,
      DURATION,
      secret,
      PUBLIC_RESOLVER,
      [], // no data
      true, // set reverse record
      0, // no fuses
    ],
    value: priceWithBuffer,
  });
  console.log(`  Register tx: ${registerTx}`);

  const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log(`  Confirmed:   block ${registerReceipt.blockNumber}`);
  console.log(`  Gas used:    ${registerReceipt.gasUsed}`);

  // Step 7: Verify
  console.log('\n─── Step 7: Verify Registration ────────────────────────');
  const stillAvailable = await publicClient.readContract({
    address: ETH_REGISTRAR_CONTROLLER,
    abi: CONTROLLER_ABI,
    functionName: 'available',
    args: [label],
  });
  console.log(`  ${fullName} available: ${stillAvailable ? '⚠️ Still available (error?)' : '✅ Registered!'}`);

  const newBalance = await publicClient.getBalance({ address: account.address });
  console.log(`  New balance: ${formatETH(newBalance)}`);
  console.log(`  Cost:        ${formatETH(balance - newBalance)}`);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ ${fullName} registered successfully!`);
  console.log('║');
  console.log(`║  Owner:     ${account.address}`);
  console.log(`║  Duration:  1 year`);
  console.log(`║  Resolver:  ${PUBLIC_RESOLVER}`);
  console.log('║');
  console.log('║  Next steps:');
  console.log(`║  1. Create subdomains: node register.js ${fullName} both`);
  console.log('║  2. Run demo: node demo.js --live');
  console.log('║  3. View on ENS: https://sepolia.app.ens.domains/' + fullName);
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  if (err.message.includes('insufficient funds')) {
    console.error('   Need more Sepolia ETH. Get some from:');
    console.error('   • https://cloud.google.com/application/web3/faucet/ethereum/sepolia');
    console.error('   • https://faucet.quicknode.com/ethereum/sepolia');
  }
  process.exit(1);
});
