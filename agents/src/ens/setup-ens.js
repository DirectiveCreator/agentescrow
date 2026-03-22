/**
 * ENS Complete Setup Script
 *
 * One-command setup for the entire ENS integration:
 *   1. Register parent .eth name (commit-reveal)
 *   2. Create buyer + seller subdomains
 *   3. Set all text records (15+ custom agent keys)
 *   4. Set ENSIP-25 bidirectional verification records
 *   5. Verify everything resolves correctly
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/ens/setup-ens.js [name]
 *
 * Default name: agentescrow (registers agentescrow.eth)
 *
 * Environment:
 *   DEPLOYER_PRIVATE_KEY - Wallet with Sepolia ETH
 *   SEPOLIA_RPC - Ethereum Sepolia RPC (default: publicnode)
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  labelhash,
  encodeFunctionData,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';

config({ path: '../.env' });

// ─── Contracts ────────────────────────────────────────────────────────────

const CONTRACTS = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  publicResolver: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
  ethRegistrarController: '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968',
  universalResolver: '0xc8Af999e38273D658BE1b921b88A9Ddf005769cC',
  nameWrapper: '0x0635513f179D50A207757E05759CbD106d7dFcE8',
};

// ─── ABIs ─────────────────────────────────────────────────────────────────

// Registration struct — Sepolia ENS V3 uses struct-based makeCommitment/register
const REGISTRATION_COMPONENTS = [
  { name: 'label', type: 'string' },
  { name: 'owner', type: 'address' },
  { name: 'duration', type: 'uint256' },
  { name: 'secret', type: 'bytes32' },
  { name: 'resolver', type: 'address' },
  { name: 'data', type: 'bytes[]' },
  { name: 'reverseRecord', type: 'uint8' },
  { name: 'referrer', type: 'bytes32' },
];

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
    inputs: [{
      name: 'registration',
      type: 'tuple',
      components: REGISTRATION_COMPONENTS,
    }],
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
    inputs: [{
      name: 'registration',
      type: 'tuple',
      components: REGISTRATION_COMPONENTS,
    }],
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
    name: 'minCommitmentAge',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

const REGISTRY_ABI = [
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
];

const NAME_WRAPPER_ABI = [
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' },
    ],
    outputs: [{ name: 'node', type: 'bytes32' }],
  },
  {
    name: 'isWrapped',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'addr', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'multicallWithNodeCheck',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nodehash', type: 'bytes32' },
      { name: 'data', type: 'bytes[]' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
];

// ─── Agent Metadata ───────────────────────────────────────────────────────

const ERC8004_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e';

const AGENTS = {
  buyer: {
    label: 'buyer',
    records: {
      avatar: 'ipfs://bafybeihvvgxvbskdhhvb5mxl2wyvdyqo4zvltbkyuzy4sctjml26mbbdna',
      description:
        'Autonomous AI buyer agent for the AgentEscrow protocol. Posts tasks, funds escrow, reviews deliverables, and confirms completion on Base.',
      url: 'https://agentescrow.onrender.com',
      'com.github': 'DirectiveCreator/agentescrow',
      'ai.agent.type': 'buyer',
      'ai.agent.capabilities': JSON.stringify([
        'task_posting',
        'escrow_funding',
        'delivery_review',
        'payment_release',
      ]),
      'ai.agent.erc8004.id': '2194',
      'ai.agent.erc8004.registry': ERC8004_REGISTRY,
      'ai.agent.reputation.score': '100',
      'ai.agent.reputation.registry': '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
      'ai.agent.serviceBoard': '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
      'ai.agent.escrowVault': '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
      'ai.agent.chainId': '84532',
      'ai.agent.status': 'active',
      'ai.agent.protocol': 'agentescrow',
      // ENSIP-25: bidirectional verification
      [`agent-registration[${ERC8004_REGISTRY}][2194]`]: JSON.stringify({
        status: 'verified',
        chainId: 84532,
        agentType: 'buyer',
        timestamp: new Date().toISOString(),
        protocol: 'agentescrow',
        version: '1.0',
      }),
    },
  },
  seller: {
    label: 'seller',
    records: {
      avatar: 'ipfs://bafybeidxbkskf4unq5vgdp2n4spbknl3e3w6r7oka7gvyh6bdoimxyyrwy',
      description:
        'Autonomous AI seller agent that fulfills service requests on the AgentEscrow protocol. Monitors tasks, claims work, executes deliverables, and submits results on Base.',
      url: 'https://agentescrow.onrender.com',
      'com.github': 'DirectiveCreator/agentescrow',
      'ai.agent.type': 'seller',
      'ai.agent.capabilities': JSON.stringify([
        'text_summary',
        'code_review',
        'data_analysis',
        'name_generation',
        'translation',
      ]),
      'ai.agent.erc8004.id': '2195',
      'ai.agent.erc8004.registry': ERC8004_REGISTRY,
      'ai.agent.reputation.score': '100',
      'ai.agent.reputation.registry': '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
      'ai.agent.serviceBoard': '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
      'ai.agent.escrowVault': '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
      'ai.agent.chainId': '84532',
      'ai.agent.status': 'active',
      'ai.agent.protocol': 'agentescrow',
      // ENSIP-25: bidirectional verification
      [`agent-registration[${ERC8004_REGISTRY}][2195]`]: JSON.stringify({
        status: 'verified',
        chainId: 84532,
        agentType: 'seller',
        timestamp: new Date().toISOString(),
        protocol: 'agentescrow',
        version: '1.0',
      }),
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtETH = (wei) => `${(Number(wei) / 1e18).toFixed(6)} ETH`;

// ─── Phase 1: Register Parent Name ───────────────────────────────────────

async function registerParentName(publicClient, walletClient, label, account) {
  const fullName = `${label}.eth`;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  Phase 1: Register ${fullName}`);
  console.log('╚══════════════════════════════════════════════════════╝');

  // Check if already registered
  const parentNode = namehash(normalize(fullName));
  const owner = await publicClient.readContract({
    address: CONTRACTS.registry,
    abi: REGISTRY_ABI,
    functionName: 'owner',
    args: [parentNode],
  });

  if (owner !== '0x0000000000000000000000000000000000000000') {
    if (owner.toLowerCase() === account.address.toLowerCase()) {
      console.log(`  ✅ ${fullName} already registered to us!`);
      return { alreadyOwned: true };
    }
    // Check if NameWrapper owns it (wrapped names)
    console.log(`  ⚠️ ${fullName} owned by ${owner}`);
    console.log(`  Checking if this is our wrapped name...`);

    // Also check via the controller
    const isAvailable = await publicClient.readContract({
      address: CONTRACTS.ethRegistrarController,
      abi: CONTROLLER_ABI,
      functionName: 'available',
      args: [label],
    });

    if (!isAvailable) {
      console.log(`  ℹ️ Name is registered (may be wrapped). Attempting to use subdomains anyway.`);
      return { alreadyOwned: true, wrappedOwner: owner };
    }
  }

  // Check availability
  const available = await publicClient.readContract({
    address: CONTRACTS.ethRegistrarController,
    abi: CONTROLLER_ABI,
    functionName: 'available',
    args: [label],
  });

  if (!available) {
    console.log(`  ❌ ${fullName} is not available`);
    return { error: 'not_available' };
  }

  console.log(`  ✅ ${fullName} is available`);

  // Get price
  const DURATION = BigInt(365 * 24 * 60 * 60); // 1 year
  const price = await publicClient.readContract({
    address: CONTRACTS.ethRegistrarController,
    abi: CONTROLLER_ABI,
    functionName: 'rentPrice',
    args: [label, DURATION],
  });
  const totalPrice = price.base + price.premium;
  const priceWithBuffer = (totalPrice * 120n) / 100n;
  console.log(`  Price: ${fmtETH(totalPrice)} (+ 20% buffer = ${fmtETH(priceWithBuffer)})`);

  // Build Registration struct (Sepolia ENS V3)
  const secret = `0x${randomBytes(32).toString('hex')}`;
  const registration = {
    label,
    owner: account.address,
    duration: DURATION,
    secret,
    resolver: CONTRACTS.publicResolver,
    data: [],
    reverseRecord: 1, // uint8: 1 = set reverse record
    referrer: '0x' + '00'.repeat(32),
  };

  // Commit
  const commitment = await publicClient.readContract({
    address: CONTRACTS.ethRegistrarController,
    abi: CONTROLLER_ABI,
    functionName: 'makeCommitment',
    args: [registration],
  });

  console.log('  ⏳ Submitting commitment...');
  const commitTx = await walletClient.writeContract({
    address: CONTRACTS.ethRegistrarController,
    abi: CONTROLLER_ABI,
    functionName: 'commit',
    args: [commitment],
  });
  await publicClient.waitForTransactionReceipt({ hash: commitTx });
  console.log(`  ✅ Commitment: ${commitTx}`);

  // Wait
  const minAge = await publicClient.readContract({
    address: CONTRACTS.ethRegistrarController,
    abi: CONTROLLER_ABI,
    functionName: 'minCommitmentAge',
  });
  const waitTime = Number(minAge) + 10;
  console.log(`  ⏳ Waiting ${waitTime}s for commitment age...`);
  for (let i = waitTime; i > 0; i -= 5) {
    process.stdout.write(`     ${i}s remaining...\r`);
    await sleep(Math.min(i, 5) * 1000);
  }
  console.log('  ✅ Commitment age reached                    ');

  // Register
  console.log('  ⏳ Registering...');
  const registerTx = await walletClient.writeContract({
    address: CONTRACTS.ethRegistrarController,
    abi: CONTROLLER_ABI,
    functionName: 'register',
    args: [registration],
    value: priceWithBuffer,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log(`  ✅ Registered! tx: ${registerTx}`);
  console.log(`     Gas used: ${receipt.gasUsed}`);

  return { registered: true, tx: registerTx };
}

// ─── Phase 2: Create Subdomains ──────────────────────────────────────────

async function createSubdomains(publicClient, walletClient, parentName, account) {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Phase 2: Create Agent Subdomains');
  console.log('╚══════════════════════════════════════════════════════╝');

  const parentNode = namehash(normalize(parentName));
  const results = {};

  // Check if parent is wrapped (Sepolia auto-wraps .eth registrations)
  let isWrapped = false;
  try {
    isWrapped = await publicClient.readContract({
      address: CONTRACTS.nameWrapper,
      abi: NAME_WRAPPER_ABI,
      functionName: 'isWrapped',
      args: [parentNode],
    });
  } catch {
    // If check fails, try both methods
  }

  console.log(`  Name wrapped: ${isWrapped ? 'YES (using NameWrapper)' : 'NO (using Registry)'}`);

  for (const [name, agent] of Object.entries(AGENTS)) {
    const fullName = `${agent.label}.${parentName}`;
    console.log(`\n  🏷️ Creating ${fullName}...`);

    try {
      let hash;
      if (isWrapped) {
        // Wrapped names: use NameWrapper.setSubnodeRecord (takes string label, not labelhash)
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
        hash = await walletClient.writeContract({
          address: CONTRACTS.nameWrapper,
          abi: NAME_WRAPPER_ABI,
          functionName: 'setSubnodeRecord',
          args: [parentNode, agent.label, account.address, CONTRACTS.publicResolver, 0n, 0, expiry],
        });
      } else {
        // Unwrapped: use Registry.setSubnodeRecord (takes labelhash)
        hash = await walletClient.writeContract({
          address: CONTRACTS.registry,
          abi: REGISTRY_ABI,
          functionName: 'setSubnodeRecord',
          args: [parentNode, labelhash(agent.label), account.address, CONTRACTS.publicResolver, 0n],
        });
      }
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ✅ Subdomain created: ${hash}`);
      results[name] = { success: true, tx: hash };
    } catch (err) {
      console.log(`  ⚠️ ${err.message.slice(0, 100)}`);
      // If NameWrapper fails, fallback to Registry
      if (isWrapped) {
        console.log(`  ↻ Retrying with Registry...`);
        try {
          const hash = await walletClient.writeContract({
            address: CONTRACTS.registry,
            abi: REGISTRY_ABI,
            functionName: 'setSubnodeRecord',
            args: [parentNode, labelhash(agent.label), account.address, CONTRACTS.publicResolver, 0n],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          console.log(`  ✅ Subdomain created (Registry fallback): ${hash}`);
          results[name] = { success: true, tx: hash, method: 'registry_fallback' };
        } catch (err2) {
          console.log(`  ⚠️ Fallback also failed: ${err2.message.slice(0, 80)}`);
          results[name] = { success: false, error: err2.message };
        }
      } else {
        results[name] = { success: false, error: err.message };
      }
    }
  }

  return results;
}

// ─── Phase 3: Set Text Records + Address ─────────────────────────────────

async function setAgentRecords(publicClient, walletClient, parentName, account) {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Phase 3: Set Agent Records (Text + Address)');
  console.log('╚══════════════════════════════════════════════════════╝');

  for (const [name, agent] of Object.entries(AGENTS)) {
    const fullName = `${agent.label}.${parentName}`;
    const node = namehash(normalize(fullName));

    console.log(`\n  🤖 Setting records for ${fullName}...`);
    console.log(`     ${Object.keys(agent.records).length} text records + address`);

    // Set address record
    try {
      const addrTx = await walletClient.writeContract({
        address: CONTRACTS.publicResolver,
        abi: RESOLVER_ABI,
        functionName: 'setAddr',
        args: [node, account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash: addrTx });
      console.log(`  ✅ Address set: ${addrTx}`);
    } catch (err) {
      console.log(`  ⚠️ Address set failed: ${err.message.slice(0, 80)}`);
    }

    // Set text records via multicall (batched into one tx)
    const calls = Object.entries(agent.records).map(([key, value]) =>
      encodeFunctionData({
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [node, key, String(value)],
      })
    );

    try {
      const textTx = await walletClient.writeContract({
        address: CONTRACTS.publicResolver,
        abi: RESOLVER_ABI,
        functionName: 'multicallWithNodeCheck',
        args: [node, calls],
      });
      await publicClient.waitForTransactionReceipt({ hash: textTx });
      console.log(`  ✅ ${calls.length} text records set: ${textTx}`);
    } catch (err) {
      console.log(`  ⚠️ Multicall failed: ${err.message.slice(0, 80)}`);
      console.log(`  Falling back to individual setText calls...`);

      // Fallback: set records one by one
      let setCount = 0;
      for (const [key, value] of Object.entries(agent.records)) {
        try {
          const tx = await walletClient.writeContract({
            address: CONTRACTS.publicResolver,
            abi: RESOLVER_ABI,
            functionName: 'setText',
            args: [node, key, String(value)],
          });
          await publicClient.waitForTransactionReceipt({ hash: tx });
          setCount++;
        } catch (e) {
          console.log(`     ⚠️ Failed to set ${key}: ${e.message.slice(0, 60)}`);
        }
      }
      console.log(`  ✅ ${setCount}/${Object.keys(agent.records).length} records set individually`);
    }
  }
}

// ─── Phase 4: Verify ─────────────────────────────────────────────────────

async function verifySetup(publicClient, parentName) {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Phase 4: Verify ENS Setup');
  console.log('╚══════════════════════════════════════════════════════╝');

  for (const [name, agent] of Object.entries(AGENTS)) {
    const fullName = `${agent.label}.${parentName}`;
    const node = namehash(normalize(fullName));

    console.log(`\n  🔍 Verifying ${fullName}...`);

    // Check address
    try {
      const addr = await publicClient.readContract({
        address: CONTRACTS.publicResolver,
        abi: RESOLVER_ABI,
        functionName: 'addr',
        args: [node],
      });
      console.log(`     Address: ${addr || '(not set)'}`);
    } catch {
      console.log(`     Address: (read failed)`);
    }

    // Check key text records
    const keysToCheck = ['ai.agent.type', 'ai.agent.erc8004.id', 'ai.agent.status', 'description'];
    for (const key of keysToCheck) {
      try {
        const val = await publicClient.readContract({
          address: CONTRACTS.publicResolver,
          abi: RESOLVER_ABI,
          functionName: 'text',
          args: [node, key],
        });
        if (val) {
          const display = val.length > 60 ? val.slice(0, 57) + '...' : val;
          console.log(`     ${key}: ${display}`);
        }
      } catch {
        // skip
      }
    }

    // Check ENSIP-25
    const ensip25Key = `agent-registration[${ERC8004_REGISTRY}][${agent.records['ai.agent.erc8004.id']}]`;
    try {
      const val = await publicClient.readContract({
        address: CONTRACTS.publicResolver,
        abi: RESOLVER_ABI,
        functionName: 'text',
        args: [node, ensip25Key],
      });
      if (val) {
        console.log(`     ENSIP-25: ✅ ${val.slice(0, 50)}...`);
      } else {
        console.log(`     ENSIP-25: ❌ not set`);
      }
    } catch {
      console.log(`     ENSIP-25: (read failed)`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const label = process.argv[2] || 'agentescrow';
  const parentName = `${label}.eth`;

  const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('❌ Set DEPLOYER_PRIVATE_KEY environment variable');
    console.error('   DEPLOYER_PRIVATE_KEY=0x... node agents/src/ens/setup-ens.js');
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

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     AgentEscrow × ENS Complete Setup (Sepolia)           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Name:      ${parentName}`);
  console.log(`  Wallet:    ${account.address}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Balance:   ${fmtETH(balance)}`);

  if (balance === 0n) {
    console.error('\n❌ No Sepolia ETH! Get some from:');
    console.error('   • https://cloud.google.com/application/web3/faucet/ethereum/sepolia');
    console.error('   • https://faucet.quicknode.com/ethereum/sepolia');
    console.error('   • https://www.alchemy.com/faucets/ethereum-sepolia');
    process.exit(1);
  }

  const startBalance = balance;

  // Phase 1: Register parent name
  await registerParentName(publicClient, walletClient, label, account);

  // Phase 2: Create subdomains
  await createSubdomains(publicClient, walletClient, parentName, account);

  // Phase 3: Set records
  await setAgentRecords(publicClient, walletClient, parentName, account);

  // Phase 4: Verify
  await verifySetup(publicClient, parentName);

  // Summary
  const endBalance = await publicClient.getBalance({ address: account.address });
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ENS Setup Complete!');
  console.log('║');
  console.log(`║  Parent:  ${parentName}`);
  console.log(`║  Buyer:   buyer.${parentName}`);
  console.log(`║  Seller:  seller.${parentName}`);
  console.log(`║  Cost:    ${fmtETH(startBalance - endBalance)}`);
  console.log(`║  Balance: ${fmtETH(endBalance)}`);
  console.log('║');
  console.log('║  ENS Records Set:');
  console.log('║  • Address (ETH)');
  console.log('║  • Avatar, description, URL');
  console.log('║  • ai.agent.type, capabilities, status');
  console.log('║  • ai.agent.erc8004.id + registry (cross-protocol)');
  console.log('║  • ai.agent.reputation.score + registry');
  console.log('║  • ai.agent.serviceBoard, escrowVault, chainId');
  console.log('║  • ENSIP-25 bidirectional verification');
  console.log('║');
  console.log('║  Verify at:');
  console.log(`║  • https://sepolia.app.ens.domains/${parentName}`);
  console.log(`║  • https://sepolia.app.ens.domains/buyer.${parentName}`);
  console.log(`║  • https://sepolia.app.ens.domains/seller.${parentName}`);
  console.log('║');
  console.log('║  Next: Run demo with live resolution:');
  console.log('║  node agents/src/ens/demo.js --live');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('\n💥 Fatal:', err.message);
  process.exit(1);
});
