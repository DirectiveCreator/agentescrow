/**
 * x402 Payment Client for Escroue Buyer Agent
 *
 * Uses the official @x402/fetch SDK to automatically handle
 * HTTP 402 payment flows with real USDC on Base Sepolia.
 *
 * Flow:
 * 1. Discover services via GET /services
 * 2. Request a service → get 402 with payment requirements
 * 3. SDK auto-signs USDC payment via viem wallet
 * 4. SDK retries request with PAYMENT-SIGNATURE header
 * 5. Facilitator verifies → service executes
 *
 * @see https://www.x402.org/
 * @see https://docs.cdp.coinbase.com/x402/quickstart-for-buyers
 */

import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// ─── Configuration ──────────────────────────────────────────────────────────

const SELLER_URL = process.env.X402_SELLER_URL || 'http://localhost:4020';
const BUYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.BUYER_PRIVATE_KEY;

// ─── x402 Client Setup ─────────────────────────────────────────────────────

/**
 * Create an x402-enabled fetch function that auto-handles 402 payments.
 * Requires a private key for signing USDC transfers.
 */
function createX402Fetch(privateKey) {
  if (!privateKey) {
    throw new Error(
      'Private key required for x402 payments. Set DEPLOYER_PRIVATE_KEY or BUYER_PRIVATE_KEY env var.'
    );
  }

  // Create viem account from private key
  const account = privateKeyToAccount(
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  );

  // Create x402 client with EVM payment scheme
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });

  // Wrap native fetch with automatic x402 payment handling
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  return { fetchWithPayment, account };
}

// ─── Service Discovery ──────────────────────────────────────────────────────

/**
 * Discover available services from a seller's x402 endpoint.
 */
async function discoverServices(sellerUrl = SELLER_URL) {
  const res = await fetch(`${sellerUrl}/services`);
  if (!res.ok) throw new Error(`Service discovery failed: ${res.status}`);
  return res.json();
}

// ─── Request Service ────────────────────────────────────────────────────────

/**
 * Request a paid service using x402 protocol.
 * Payment is handled automatically by the SDK.
 */
async function requestService(fetchWithPayment, sellerUrl, taskType, description = '') {
  const url = `${sellerUrl}/services/${taskType}?description=${encodeURIComponent(description)}`;

  console.log(`\n💳 x402: Requesting ${taskType}...`);
  const response = await fetchWithPayment(url, { method: 'GET' });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`x402 request failed (${response.status}): ${err}`);
  }

  const result = await response.json();
  console.log(`   ✅ Service delivered! Hash: ${result.deliveryHash}`);
  return result;
}

// ─── Demo ───────────────────────────────────────────────────────────────────

async function demo() {
  console.log('🔐 x402 Payment Client (Official SDK)\n');

  // Check for private key
  if (!BUYER_PRIVATE_KEY) {
    console.log('⚠️  No private key found. Set DEPLOYER_PRIVATE_KEY env var.');
    console.log('   Running in discovery-only mode.\n');

    const services = await discoverServices();
    console.log(`🔍 Found ${services.services.length} services at ${SELLER_URL}:`);
    services.services.forEach(s => console.log(`   - ${s.type}: ${s.price} USDC`));
    console.log(`\n   Protocol: ${services.protocol} v${services.version}`);
    console.log(`   Network: ${services.network}`);
    return;
  }

  // Create x402-enabled fetch
  const { fetchWithPayment, account } = createX402Fetch(BUYER_PRIVATE_KEY);
  console.log(`   Buyer: ${account.address}`);
  console.log(`   Seller: ${SELLER_URL}\n`);

  // Step 1: Discover services
  console.log('🔍 Discovering services...');
  const services = await discoverServices();
  console.log(`   Found ${services.services.length} services:`);
  services.services.forEach(s => console.log(`     - ${s.type}: ${s.price}`));

  // Step 2: Request a service (auto-pays via x402)
  console.log('\n📝 Requesting text_summary service (auto-pay via x402)...');
  const result = await requestService(
    fetchWithPayment,
    SELLER_URL,
    'text_summary',
    'Summarize the x402 payment protocol and its benefits for agent-to-agent commerce'
  );

  console.log(`\n📋 Result:`);
  console.log(`   Task: ${result.taskType}`);
  console.log(`   Paid: ${result.paidAmount} USDC`);
  console.log(`   Hash: ${result.deliveryHash}`);
  console.log(`   Output: ${result.result?.substring(0, 120)}...`);
}

// Run demo if executed directly
if (process.argv[1]?.includes('client.js')) {
  demo().catch(err => {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  });
}

export { createX402Fetch, discoverServices, requestService };
