/**
 * x402 Payment Server for Escroue Seller Agent
 *
 * Uses the official Coinbase @x402/* SDK to expose seller services
 * behind real HTTP 402 paywalls with on-chain USDC payment verification.
 *
 * Flow:
 * 1. Buyer sends GET /services/:type
 * 2. Middleware responds 402 with payment requirements
 * 3. Buyer signs USDC transfer and retries with PAYMENT-SIGNATURE header
 * 4. Facilitator verifies payment on-chain, server executes task
 *
 * @see https://www.x402.org/
 * @see https://docs.cdp.coinbase.com/x402/welcome
 */

import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { executeTask } from '../tasks.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = process.env.X402_PORT || 4020;
const SELLER_ADDRESS = process.env.SELLER_ADDRESS || '0xC07b695eC19DE38f1e62e825585B2818077B96cC';

// x402 facilitator (testnet = no signup required)
const FACILITATOR_URL = 'https://x402.org/facilitator';

// Base Sepolia network (CAIP-2 format)
const NETWORK = 'eip155:84532';

// Service pricing in USD (x402 SDK handles USDC conversion)
const SERVICE_PRICES = {
  text_summary:    '$0.01',
  code_review:     '$0.05',
  name_generation: '$0.005',
  translation:     '$0.02',
};

// ─── x402 Resource Server Setup ─────────────────────────────────────────────

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactEvmScheme());

// ─── Express App ────────────────────────────────────────────────────────────

const app = express();

// CORS for browser/agent access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'PAYMENT-SIGNATURE, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Build payment route config from SERVICE_PRICES
const paymentRoutes = {};
for (const [taskType, price] of Object.entries(SERVICE_PRICES)) {
  paymentRoutes[`GET /services/${taskType}`] = {
    accepts: [{
      scheme: 'exact',
      price,
      network: NETWORK,
      payTo: SELLER_ADDRESS,
    }],
    description: `Escroue ${taskType.replace(/_/g, ' ')} service`,
    mimeType: 'application/json',
  };
}

// x402 payment middleware — handles 402 responses + payment verification
app.use(paymentMiddleware(paymentRoutes, resourceServer));

// ─── Service Discovery (free endpoint) ─────────────────────────────────────

app.get('/services', (req, res) => {
  const services = Object.entries(SERVICE_PRICES).map(([type, price]) => ({
    type,
    price,
    endpoint: `/services/${type}`,
    paymentProtocol: 'x402',
    network: 'base-sepolia',
    seller: SELLER_ADDRESS,
    erc8004AgentId: 2195,
  }));

  res.json({
    services,
    protocol: 'x402',
    version: 1,
    facilitator: FACILITATOR_URL,
    network: NETWORK,
  });
});

// ─── Paid Service Endpoints ─────────────────────────────────────────────────

for (const taskType of Object.keys(SERVICE_PRICES)) {
  app.get(`/services/${taskType}`, (req, res) => {
    const description = req.query.description || `x402 ${taskType} request`;
    console.log(`\n✅ x402: Executing ${taskType} (payment verified by facilitator)`);

    const { result, hash } = executeTask(taskType, description);

    res.json({
      status: 200,
      taskType,
      result,
      deliveryHash: hash,
      paidAmount: SERVICE_PRICES[taskType],
      seller: SELLER_ADDRESS,
      erc8004AgentId: 2195,
    });
  });
}

// ─── Health / Info ──────────────────────────────────────────────────────────

app.get(['/', '/health'], (req, res) => {
  res.json({
    name: 'Escroue Seller — x402 Payment Server',
    version: '0.2.0',
    protocol: 'x402',
    sdk: '@x402/express',
    network: NETWORK,
    facilitator: FACILITATOR_URL,
    seller: SELLER_ADDRESS,
    erc8004AgentId: 2195,
    endpoints: {
      services: '/services',
      health: '/health',
    },
    docs: 'https://github.com/DirectiveCreator/agentescrow',
  });
});

// ─── 404 ────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    endpoints: ['/services', '/services/:type', '/health'],
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🔐 x402 Payment Server v0.2.0 (Official SDK)`);
  console.log(`   Seller: ${SELLER_ADDRESS}`);
  console.log(`   ERC-8004: Agent #2195`);
  console.log(`   Network: ${NETWORK} (Base Sepolia)`);
  console.log(`   Facilitator: ${FACILITATOR_URL}`);
  console.log(`\n   Endpoints:`);
  console.log(`     GET /services          → List services + pricing (free)`);
  console.log(`     GET /services/:type    → 402 → pay USDC → execute`);
  console.log(`     GET /health            → Server info`);
  console.log(`\n   Prices:`);
  Object.entries(SERVICE_PRICES).forEach(([type, price]) => {
    console.log(`     ${type}: ${price} USDC`);
  });
});

export { app, SERVICE_PRICES };
