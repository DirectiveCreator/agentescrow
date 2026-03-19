/**
 * x402 Payment Server for AgentEscrow Seller Agent
 *
 * Exposes seller agent services behind HTTP 402 paywalls.
 * Buyers pay per-request in USDC on Base via the x402 protocol.
 *
 * Flow:
 * 1. Buyer sends GET /services/:type
 * 2. Server responds 402 with payment requirements
 * 3. Buyer signs USDC payment and retries with X-PAYMENT header
 * 4. Server verifies payment and executes the task
 *
 * @see https://www.x402.org/
 * @see https://docs.cdp.coinbase.com/x402/welcome
 */

import http from 'http';
import { createHash } from 'crypto';
import { executeTask } from '../tasks.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = process.env.X402_PORT || 4020;

// USDC on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
const SELLER_ADDRESS = process.env.SELLER_ADDRESS || '0xC07b695eC19DE38f1e62e825585B2818077B96cC';

// Service pricing in USDC (6 decimals)
const SERVICE_PRICES = {
  text_summary: '10000',     // $0.01 USDC
  code_review: '50000',      // $0.05 USDC
  name_generation: '5000',   // $0.005 USDC
  translation: '20000',      // $0.02 USDC
};

// x402 facilitator endpoint (Coinbase hosted)
const FACILITATOR_URL = 'https://x402.org/facilitator';

// ─── Payment Verification ───────────────────────────────────────────────────

/**
 * Verify x402 payment from request headers.
 * In production, this calls the facilitator's /verify endpoint.
 * For the hackathon demo, we accept payments with valid structure.
 */
function verifyPayment(paymentHeader, requiredAmount, taskType) {
  if (!paymentHeader) return { valid: false, reason: 'No payment header' };

  try {
    // Decode the payment payload
    const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());

    // Validate payment structure
    if (!payment.signature || !payment.amount || !payment.token) {
      return { valid: false, reason: 'Invalid payment structure' };
    }

    // Check amount meets minimum
    if (BigInt(payment.amount) < BigInt(requiredAmount)) {
      return { valid: false, reason: `Insufficient payment: ${payment.amount} < ${requiredAmount}` };
    }

    // Check token is USDC
    if (payment.token.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      return { valid: false, reason: 'Wrong payment token — USDC required' };
    }

    // In production: call facilitator to verify on-chain
    // For hackathon demo: accept structurally valid payments
    console.log(`  ✅ Payment verified: ${payment.amount} USDC for ${taskType}`);
    return { valid: true, payment };
  } catch (err) {
    return { valid: false, reason: `Payment decode error: ${err.message}` };
  }
}

/**
 * Generate the 402 payment requirement response.
 * This tells the buyer exactly what to pay and how.
 */
function getPaymentRequired(taskType) {
  const price = SERVICE_PRICES[taskType] || SERVICE_PRICES.text_summary;

  return {
    'x402Version': 1,
    'accepts': [{
      scheme: 'exact',
      network: 'base-sepolia',
      maxAmountRequired: price,
      resource: `agentescrow:${taskType}`,
      description: `AgentEscrow ${taskType.replace('_', ' ')} service`,
      mimeType: 'application/json',
      payTo: SELLER_ADDRESS,
      extra: {
        name: 'AgentEscrow Seller',
        erc8004AgentId: 2195,
        reputationScore: 100,
        facilitatorUrl: FACILITATOR_URL,
      }
    }],
    'token': {
      address: USDC_ADDRESS,
      symbol: 'USDC',
      decimals: 6,
      network: 'base-sepolia',
    }
  };
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS headers for browser/agent access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-PAYMENT, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── Service Discovery ──
  // GET /services → list available services with x402 pricing
  if (url.pathname === '/services' && req.method === 'GET') {
    const services = Object.entries(SERVICE_PRICES).map(([type, price]) => ({
      type,
      price: `${(Number(price) / 1e6).toFixed(4)} USDC`,
      priceRaw: price,
      endpoint: `/services/${type}`,
      paymentProtocol: 'x402',
      network: 'base-sepolia',
      seller: SELLER_ADDRESS,
      erc8004AgentId: 2195,
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ services, protocol: 'x402', version: 1 }));
    return;
  }

  // ── Service Execution with x402 Payment ──
  // GET /services/:taskType → 402 or execute with payment
  const serviceMatch = url.pathname.match(/^\/services\/(\w+)$/);
  if (serviceMatch && req.method === 'GET') {
    const taskType = serviceMatch[1];

    if (!SERVICE_PRICES[taskType]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown service type', available: Object.keys(SERVICE_PRICES) }));
      return;
    }

    const paymentHeader = req.headers['x-payment'];

    // No payment → respond with 402
    if (!paymentHeader) {
      const paymentRequired = getPaymentRequired(taskType);
      console.log(`\n💰 x402: 402 Payment Required for ${taskType}`);

      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-PAYMENT-REQUIRED': Buffer.from(JSON.stringify(paymentRequired)).toString('base64'),
      });
      res.end(JSON.stringify({
        status: 402,
        message: 'Payment Required',
        ...paymentRequired,
      }));
      return;
    }

    // Payment present → verify and execute
    const verification = verifyPayment(paymentHeader, SERVICE_PRICES[taskType], taskType);

    if (!verification.valid) {
      console.log(`\n❌ x402: Payment rejected for ${taskType}: ${verification.reason}`);
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 402,
        error: verification.reason,
        ...getPaymentRequired(taskType),
      }));
      return;
    }

    // Payment verified → execute task
    console.log(`\n✅ x402: Executing ${taskType} (paid ${SERVICE_PRICES[taskType]} USDC)`);

    const description = url.searchParams.get('description') || `x402 ${taskType} request`;
    const { result, hash } = executeTask(taskType, description);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-PAYMENT-RECEIPT': JSON.stringify({
        amount: SERVICE_PRICES[taskType],
        token: USDC_ADDRESS,
        taskType,
        deliveryHash: hash,
        timestamp: Date.now(),
      }),
    });
    res.end(JSON.stringify({
      status: 200,
      taskType,
      result,
      deliveryHash: hash,
      paidAmount: SERVICE_PRICES[taskType],
      seller: SELLER_ADDRESS,
      erc8004AgentId: 2195,
    }));
    return;
  }

  // ── Health / Info ──
  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'AgentEscrow Seller — x402 Payment Server',
      version: '0.1.0',
      protocol: 'x402',
      network: 'base-sepolia',
      seller: SELLER_ADDRESS,
      erc8004AgentId: 2195,
      endpoints: {
        services: '/services',
        health: '/health',
      },
      docs: 'https://github.com/DirectiveCreator/agentescrow',
    }));
    return;
  }

  // ── 404 ──
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', endpoints: ['/services', '/services/:type', '/health'] }));
});

// ─── Start Server ───────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n🔐 x402 Payment Server started on port ${PORT}`);
  console.log(`   Seller: ${SELLER_ADDRESS}`);
  console.log(`   ERC-8004: Agent #2195`);
  console.log(`   Network: Base Sepolia`);
  console.log(`   Token: USDC (${USDC_ADDRESS})`);
  console.log(`\n   Endpoints:`);
  console.log(`     GET /services          → List services + pricing`);
  console.log(`     GET /services/:type    → 402 → pay → execute`);
  console.log(`     GET /health            → Server info`);
  console.log(`\n   Prices:`);
  Object.entries(SERVICE_PRICES).forEach(([type, price]) => {
    console.log(`     ${type}: $${(Number(price) / 1e6).toFixed(4)} USDC`);
  });
});

export { server, verifyPayment, getPaymentRequired, SERVICE_PRICES };
