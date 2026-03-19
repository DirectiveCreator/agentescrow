/**
 * x402 Payment Client for AgentEscrow Buyer Agent
 *
 * Handles the buyer side of x402 payments:
 * 1. Discover services via GET /services
 * 2. Receive 402 response with payment requirements
 * 3. Sign USDC payment
 * 4. Retry request with X-PAYMENT header
 *
 * @see https://www.x402.org/
 */

import { createHash } from 'crypto';

// ─── Client ─────────────────────────────────────────────────────────────────

class X402Client {
  constructor({ sellerUrl, buyerAddress, privateKey }) {
    this.sellerUrl = sellerUrl.replace(/\/$/, '');
    this.buyerAddress = buyerAddress;
    this.privateKey = privateKey;
  }

  /**
   * Discover available services from a seller's x402 endpoint.
   */
  async discoverServices() {
    const res = await fetch(`${this.sellerUrl}/services`);
    if (!res.ok) throw new Error(`Service discovery failed: ${res.status}`);
    return res.json();
  }

  /**
   * Request a service with automatic x402 payment flow.
   * 1. First request → gets 402 with payment requirements
   * 2. Signs payment
   * 3. Retries with payment header
   */
  async requestService(taskType, description = '') {
    const url = `${this.sellerUrl}/services/${taskType}?description=${encodeURIComponent(description)}`;

    // Step 1: Initial request → expect 402
    console.log(`\n💳 x402 Client: Requesting ${taskType}...`);
    const initialRes = await fetch(url);

    if (initialRes.status !== 402) {
      // If not 402, maybe it's free or there's an error
      return initialRes.json();
    }

    // Step 2: Parse payment requirements
    const paymentReq = await initialRes.json();
    const accept = paymentReq.accepts?.[0];

    if (!accept) {
      throw new Error('No payment scheme in 402 response');
    }

    console.log(`   Payment required: ${(Number(accept.maxAmountRequired) / 1e6).toFixed(4)} USDC`);
    console.log(`   Pay to: ${accept.payTo}`);
    console.log(`   Scheme: ${accept.scheme}`);

    // Step 3: Create payment signature
    // In production: use wallet to sign EIP-712 typed data and submit on-chain
    // For hackathon demo: create a structurally valid payment
    const payment = this.createPayment(accept);

    // Step 4: Retry with payment
    console.log(`   Signing payment...`);
    const paidRes = await fetch(url, {
      headers: {
        'X-PAYMENT': Buffer.from(JSON.stringify(payment)).toString('base64'),
      },
    });

    if (!paidRes.ok) {
      const err = await paidRes.json();
      throw new Error(`Payment rejected: ${err.error || paidRes.status}`);
    }

    const result = await paidRes.json();
    console.log(`   ✅ Service delivered! Hash: ${result.deliveryHash}`);
    return result;
  }

  /**
   * Create a payment object for x402.
   * In production, this would sign an on-chain USDC transfer.
   */
  createPayment(accept) {
    const paymentData = {
      scheme: accept.scheme,
      network: accept.network,
      amount: accept.maxAmountRequired,
      token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC Base Sepolia
      payTo: accept.payTo,
      payer: this.buyerAddress,
      timestamp: Date.now(),
      nonce: createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 16),
      // In production: this would be an EIP-712 signature
      signature: createHash('sha256')
        .update(`${this.privateKey || 'demo'}-${accept.maxAmountRequired}-${Date.now()}`)
        .digest('hex'),
    };

    return paymentData;
  }
}

// ─── Demo ───────────────────────────────────────────────────────────────────

async function demo() {
  const client = new X402Client({
    sellerUrl: process.env.X402_SELLER_URL || 'http://localhost:4020',
    buyerAddress: process.env.BUYER_ADDRESS || '0xC07b695eC19DE38f1e62e825585B2818077B96cC',
    privateKey: process.env.BUYER_PRIVATE_KEY,
  });

  console.log('🔍 Discovering services...');
  const services = await client.discoverServices();
  console.log(`   Found ${services.services.length} services:`);
  services.services.forEach(s => console.log(`     - ${s.type}: ${s.price}`));

  console.log('\n📝 Requesting text_summary service...');
  const result = await client.requestService('text_summary', 'Summarize the x402 payment protocol');
  console.log(`\n📋 Result:`);
  console.log(`   ${result.result?.substring(0, 100)}...`);
}

if (process.argv[1]?.includes('client.js')) {
  demo().catch(console.error);
}

export { X402Client };
