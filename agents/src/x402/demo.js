#!/usr/bin/env node
/**
 * x402 End-to-End Demo
 *
 * Starts the x402 payment server and runs the buyer client against it.
 * Demonstrates the full HTTP 402 payment flow with real SDK.
 *
 * Usage:
 *   node agents/src/x402/demo.js
 *
 * With real payments (requires USDC on Base Sepolia):
 *   DEPLOYER_PRIVATE_KEY=0x... node agents/src/x402/demo.js
 */

import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('═══════════════════════════════════════════════════════');
console.log('   AgentEscrow x402 Payment Demo (Official SDK)');
console.log('═══════════════════════════════════════════════════════\n');

// Start server in background
console.log('🚀 Starting x402 payment server...\n');
const server = fork(join(__dirname, 'server.js'), [], {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  env: { ...process.env, X402_PORT: '4020' },
});

server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

// Wait for server to start, then run client
setTimeout(async () => {
  console.log('\n───────────────────────────────────────────────────────');
  console.log('   Running Buyer Client');
  console.log('───────────────────────────────────────────────────────\n');

  try {
    // Service discovery (always works, no payment needed)
    const res = await fetch('http://localhost:4020/services');
    const services = await res.json();
    console.log(`🔍 Discovered ${services.services.length} services:\n`);
    services.services.forEach(s => {
      console.log(`   ${s.type.padEnd(20)} ${s.price.padStart(8)} USDC  →  ${s.endpoint}`);
    });

    // Test 402 response
    console.log('\n💰 Testing 402 payment requirement...');
    const payRes = await fetch('http://localhost:4020/services/text_summary');
    console.log(`   Status: ${payRes.status} ${payRes.status === 402 ? '✅ (Payment Required)' : '❌'}`);

    if (payRes.status === 402) {
      const body = await payRes.json();
      console.log(`   Scheme: ${body.accepts?.[0]?.scheme || 'N/A'}`);
      console.log(`   Price: ${body.accepts?.[0]?.price || 'N/A'}`);
      console.log(`   Network: ${body.accepts?.[0]?.network || 'N/A'}`);
      console.log(`   Pay to: ${body.accepts?.[0]?.payTo || 'N/A'}`);
    }

    // If private key available, try real payment
    if (process.env.DEPLOYER_PRIVATE_KEY || process.env.BUYER_PRIVATE_KEY) {
      console.log('\n🔐 Private key detected — attempting real x402 payment...');
      const { createX402Fetch, requestService } = await import('./client.js');
      const key = process.env.DEPLOYER_PRIVATE_KEY || process.env.BUYER_PRIVATE_KEY;
      const { fetchWithPayment } = createX402Fetch(key);

      const result = await requestService(
        fetchWithPayment,
        'http://localhost:4020',
        'text_summary',
        'Explain how x402 enables agent-to-agent payments'
      );
      console.log(`\n🎉 Full x402 payment flow completed!`);
      console.log(`   Result: ${result.result?.substring(0, 100)}...`);
    } else {
      console.log('\n⚠️  No private key — skipping payment flow.');
      console.log('   Set DEPLOYER_PRIVATE_KEY to test real payments.');
    }

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   Demo Complete');
  console.log('═══════════════════════════════════════════════════════\n');

  server.kill();
  process.exit(0);
}, 2000);

// Cleanup on exit
process.on('SIGINT', () => { server.kill(); process.exit(0); });
