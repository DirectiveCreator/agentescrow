#!/usr/bin/env node

/**
 * Ampersend SDK Demo — Escroue Integration
 *
 * Demonstrates:
 * 1. Wallet creation (EOA for demo, Smart Account for production)
 * 2. Treasurer setup with spend controls
 * 3. Payment requirements building
 * 4. x402-enabled fetch (auto-handles 402 payments)
 * 5. MCP paid tool server (seller agent)
 *
 * Usage:
 *   node agents/src/ampersend/demo.js                    # Simulation mode
 *   AMPERSEND_PRIVATE_KEY=0x... node agents/src/ampersend/demo.js   # Live mode
 */

import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';
import {
  createDemoWallet,
  createDemoTreasurer,
  buildPaymentRequirements,
  DEFAULT_CONFIG,
} from './client.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(phase, msg) {
  const icon = {
    init: '🔧',
    wallet: '👛',
    treasurer: '🏦',
    payment: '💳',
    mcp: '🔌',
    done: '✅',
    skip: '⏭️',
    error: '❌',
  }[phase] || '•';
  console.log(`  ${icon} [${phase}] ${msg}`);
}

function divider(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ─── Demo Phases ────────────────────────────────────────────────────────────

async function phase1_wallet(privateKey) {
  divider('Phase 1: Wallet Creation');

  try {
    const wallet = createDemoWallet(privateKey);
    log('wallet', `EOA wallet created: ${wallet.address}`);
    log('wallet', `Network: Base Sepolia (${DEFAULT_CONFIG.chainId})`);
    log('wallet', `USDC contract: ${DEFAULT_CONFIG.usdcAddress}`);
    return wallet;
  } catch (err) {
    log('error', `Wallet creation failed: ${err.message}`);
    return null;
  }
}

async function phase2_treasurer(privateKey) {
  divider('Phase 2: Treasurer Setup');

  try {
    const { treasurer, wallet } = createDemoTreasurer(privateKey);
    log('treasurer', 'NaiveTreasurer created (auto-approves payments)');
    log('treasurer', `Wallet address: ${wallet.address}`);

    // Simulate a payment authorization check
    const mockRequirements = [{
      scheme: 'exact',
      network: 'base-sepolia',
      maxAmountRequired: '1000',
      payTo: '0x0000000000000000000000000000000000000001',
      asset: DEFAULT_CONFIG.usdcAddress,
      resource: 'http://example.com/api/task',
      description: 'Test payment',
      mimeType: 'application/json',
      maxTimeoutSeconds: 300,
      extra: { name: 'USDC', version: '2' },
    }];

    const authorization = await treasurer.onPaymentRequired(mockRequirements);
    if (authorization) {
      log('treasurer', `Payment authorized! ID: ${authorization.authorizationId.slice(0, 16)}...`);
      log('treasurer', `Payment payload created with scheme: exact`);
    } else {
      log('treasurer', 'Payment declined by treasurer');
    }

    return { treasurer, wallet };
  } catch (err) {
    log('error', `Treasurer setup failed: ${err.message}`);
    return null;
  }
}

async function phase3_paymentRequirements() {
  divider('Phase 3: Payment Requirements');

  const sellerAddress = '0xC07b695eC19DE38f1e62e825585B2818077B96cC';

  const requirements = buildPaymentRequirements({
    payTo: sellerAddress,
    amount: '5000', // $0.005 USDC
    description: 'Escroue text_summary task',
    resource: 'http://localhost:4020/api/task/text_summary',
  });

  log('payment', `Seller: ${sellerAddress}`);
  log('payment', `Amount: ${requirements.maxAmountRequired} atomic USDC ($${(parseInt(requirements.maxAmountRequired) / 1e6).toFixed(6)})`);
  log('payment', `Network: ${requirements.network}`);
  log('payment', `Scheme: ${requirements.scheme}`);
  log('payment', `Resource: ${requirements.resource}`);
  log('payment', `Timeout: ${requirements.maxTimeoutSeconds}s`);

  return requirements;
}

async function phase4_httpClient(privateKey) {
  divider('Phase 4: x402-Enabled HTTP Client');

  log('skip', 'HTTP client with auto-pay requires a live paid endpoint.');
  log('skip', 'In production, this wraps fetch() to auto-handle 402 responses.');
  log('skip', 'Flow: fetch(url) → 402 → treasurer.authorize() → retry with payment');

  // Show what the code looks like
  console.log(`
  // Production usage:
  // const { fetch: payFetch } = await createPayingFetch(privateKey);
  // const response = await payFetch('https://paid-api.example.com/resource');
  // // ^ Automatically handles 402 → sign payment → retry
  `);
}

async function phase5_mcpServer() {
  divider('Phase 5: MCP Paid Tool Server');

  log('mcp', 'MCP server configuration for seller agent:');

  const toolConfig = {
    name: 'text_summary',
    description: 'Summarize text content (paid via x402)',
    price: '5000', // $0.005 USDC
  };

  log('mcp', `Tool: ${toolConfig.name}`);
  log('mcp', `Price: ${toolConfig.price} atomic USDC ($${(parseInt(toolConfig.price) / 1e6).toFixed(6)})`);
  log('mcp', 'Payment flow: Client calls tool → 402 → pays via Treasurer → tool executes');

  console.log(`
  // Production usage:
  // const { mcp } = await createPaidMcpServer({
  //   name: 'escroue-seller',
  //   payTo: sellerAddress,
  //   tools: [{
  //     name: 'text_summary',
  //     description: 'Summarize text',
  //     parameters: z.object({ text: z.string() }),
  //     price: '5000',
  //     handler: async (args) => summarize(args.text),
  //   }],
  // });
  // await mcp.start({ transportType: 'httpStream', httpStream: { port: 8080 } });
  `);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Ampersend SDK Demo — Escroue Integration       ║');
  console.log('║     Managed Agent Payments via x402 + Treasurer        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const privateKey = process.env.AMPERSEND_PRIVATE_KEY || generatePrivateKey();
  const isSimulation = !process.env.AMPERSEND_PRIVATE_KEY;

  if (isSimulation) {
    console.log('\n  ⚡ SIMULATION MODE — using ephemeral key');
    console.log('  Set AMPERSEND_PRIVATE_KEY=0x... for live mode\n');
  } else {
    console.log('\n  🔑 LIVE MODE — using provided private key\n');
  }

  // Phase 1: Create wallet
  const wallet = await phase1_wallet(privateKey);

  // Phase 2: Set up treasurer
  const treasurerResult = await phase2_treasurer(privateKey);

  // Phase 3: Build payment requirements
  const requirements = await phase3_paymentRequirements();

  // Phase 4: HTTP client demo
  await phase4_httpClient(privateKey);

  // Phase 5: MCP server demo
  await phase5_mcpServer();

  // Summary
  divider('Summary');
  console.log(`
  Ampersend SDK provides managed payment infrastructure for Escroue:

  ┌─────────────────────────────────────────────────────────┐
  │  Buyer Agent                                            │
  │  ├── AccountWallet (EOA) or SmartAccountWallet (4337)   │
  │  ├── Treasurer (spend limits, human oversight)          │
  │  └── Auto-pays via x402 on 402 responses                │
  │                                                         │
  │  Seller Agent                                           │
  │  ├── MCP Server with paid tools                         │
  │  ├── x402 payment requirements per tool                 │
  │  └── Facilitator verification for settlement            │
  │                                                         │
  │  Human Operator                                         │
  │  ├── Dashboard at app.staging.ampersend.ai              │
  │  ├── Set daily/monthly/per-tx spend limits              │
  │  └── Monitor all agent payment activity                 │
  └─────────────────────────────────────────────────────────┘
  `);

  log('done', 'Demo complete!');

  if (isSimulation) {
    console.log('\n  Next steps:');
    console.log('  1. Register at app.staging.ampersend.ai');
    console.log('  2. Get smart account address + session key');
    console.log('  3. Fund with testnet USDC from faucet.circle.com');
    console.log('  4. Set AMPERSEND_PRIVATE_KEY and re-run');
  }
}

main().catch(err => {
  console.error('Demo failed:', err.message);
  process.exit(1);
});
