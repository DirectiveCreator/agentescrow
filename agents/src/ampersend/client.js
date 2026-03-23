/**
 * Ampersend Client — Managed wallet + x402 payment layer for Escroue
 *
 * Wraps the @ampersend_ai/ampersend-sdk to provide:
 * - Smart account wallets with spend limits (Treasurer)
 * - Automatic x402 payment handling (Client)
 * - MCP paid tool support (Server)
 *
 * Integrates with our existing x402 layer as a managed payment backend.
 */

import { AccountWallet } from '@ampersend_ai/ampersend-sdk';

// ─── NaiveTreasurer (inline) ────────────────────────────────────────────────
// The SDK has NaiveTreasurer internally but doesn't export it via package.json
// exports map. We implement a compatible one that auto-approves all payments.

class NaiveTreasurer {
  constructor(wallet) {
    this.wallet = wallet;
  }
  async onPaymentRequired(requirements) {
    if (!requirements || requirements.length === 0) return null;
    const req = requirements[0];
    const payment = await this.wallet.createPayment(req);
    return {
      payment,
      authorizationId: `naive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }
  async onStatus(status, authorization) {
    // NaiveTreasurer doesn't track status
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  chainId: 84532, // Base Sepolia
  apiUrl: 'https://api.staging.ampersend.ai',
  facilitatorUrl: 'https://x402.org/facilitator',
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
};

// ─── Wallet Setup ───────────────────────────────────────────────────────────

/**
 * Create an EOA wallet for testing/demo purposes.
 * In production, use SmartAccountWallet with Ampersend platform.
 */
export function createDemoWallet(privateKey) {
  if (!privateKey) {
    throw new Error('Private key required. Set AMPERSEND_PRIVATE_KEY env var.');
  }
  const wallet = AccountWallet.fromPrivateKey(privateKey);
  return wallet;
}

// ─── Treasurer Setup ────────────────────────────────────────────────────────

/**
 * Create a NaiveTreasurer for testing (auto-approves all payments).
 * For production, use createAmpersendTreasurer with spend limits.
 */
export function createDemoTreasurer(privateKey) {
  const wallet = createDemoWallet(privateKey);
  return {
    treasurer: new NaiveTreasurer(wallet),
    wallet,
  };
}

/**
 * Create an Ampersend-managed treasurer with spend limits.
 * Requires platform registration at app.staging.ampersend.ai
 */
export async function createManagedTreasurer(config = {}) {
  const {
    smartAccountAddress,
    sessionKeyPrivateKey,
    apiUrl = DEFAULT_CONFIG.apiUrl,
    chainId = DEFAULT_CONFIG.chainId,
  } = config;

  if (!smartAccountAddress || !sessionKeyPrivateKey) {
    throw new Error(
      'Smart account address and session key required. ' +
      'Register at app.staging.ampersend.ai first.'
    );
  }

  // Dynamic import to avoid issues if not using managed mode
  const { createAmpersendTreasurer } = await import('@ampersend_ai/ampersend-sdk');

  const treasurer = createAmpersendTreasurer({
    smartAccountAddress,
    sessionKeyPrivateKey,
    apiUrl,
    chainId,
  });

  return { treasurer };
}

// ─── HTTP Client (x402 fetch wrapper) ───────────────────────────────────────

/**
 * Create an x402-enabled fetch function that auto-handles 402 payments.
 * Uses NaiveTreasurer for demo, AmpersendTreasurer for production.
 */
export async function createPayingFetch(privateKey) {
  const { wrapFetchWithPayment } = await import('@x402/fetch');
  const { wrapWithAmpersend } = await import('@ampersend_ai/ampersend-sdk');
  const { x402Client } = await import('@x402/core/client');

  const wallet = createDemoWallet(privateKey);
  const treasurer = new NaiveTreasurer(wallet);

  const client = wrapWithAmpersend(
    new x402Client(),
    treasurer,
    ['base-sepolia']
  );

  const fetchWithPay = wrapFetchWithPayment(fetch, client);

  return {
    fetch: fetchWithPay,
    wallet,
    address: wallet.address,
  };
}

// ─── Payment Requirements Builder ───────────────────────────────────────────

/**
 * Build payment requirements for a paid endpoint/tool.
 * Used by seller agents to define what payment they require.
 */
export function buildPaymentRequirements(options = {}) {
  const {
    payTo,
    amount = '1000', // $0.001 USDC in atomic units (6 decimals)
    description = 'Escroue task payment',
    resource = 'http://localhost:4020/api/task',
    network = 'base-sepolia',
    maxTimeoutSeconds = 300,
  } = options;

  if (!payTo) {
    throw new Error('payTo address required');
  }

  return {
    scheme: 'exact',
    network,
    maxAmountRequired: amount,
    resource,
    description,
    mimeType: 'application/json',
    payTo,
    maxTimeoutSeconds,
    asset: DEFAULT_CONFIG.usdcAddress,
    extra: { name: 'USDC', version: '2' },
  };
}

// ─── MCP Server (Paid Tools) ────────────────────────────────────────────────

/**
 * Create an MCP server with x402 payment-gated tools.
 * This turns a seller agent into a paid MCP service.
 */
export async function createPaidMcpServer(config = {}) {
  const {
    name = 'escroue-seller',
    version = '1.0.0',
    port = 8080,
    payTo,
    tools = [],
  } = config;

  const { FastMCP, withX402Payment } = await import(
    '@ampersend_ai/ampersend-sdk/mcp/server/fastmcp'
  );

  const mcp = new FastMCP({ name, version });

  // Register each tool with payment gating
  for (const tool of tools) {
    const { name: toolName, description, parameters, handler, price } = tool;

    mcp.addTool({
      name: toolName,
      description,
      parameters,
      execute: withX402Payment({
        onExecute: async () => {
          if (!price || price === '0') return null; // Free tool
          return buildPaymentRequirements({
            payTo,
            amount: price,
            description: `Payment for ${toolName}`,
          });
        },
        onPayment: async ({ payment, requirements }) => {
          // In production, verify via facilitator
          // For demo, accept all payments
          console.log(`[ampersend] Payment received for ${toolName}`);
          return { success: true };
        },
      })(handler),
    });
  }

  return { mcp, port };
}

// ─── MCP Client (Auto-paying) ───────────────────────────────────────────────

/**
 * Create an MCP client that auto-pays for gated tools.
 * This lets a buyer agent call paid services seamlessly.
 */
export async function createPayingMcpClient(config = {}) {
  const {
    privateKey,
    serverUrl,
    clientName = 'escroue-buyer',
    clientVersion = '1.0.0',
  } = config;

  if (!privateKey || !serverUrl) {
    throw new Error('privateKey and serverUrl required');
  }

  const { createAmpersendMcpClient } = await import('@ampersend_ai/ampersend-sdk');
  const { StreamableHTTPClientTransport } = await import(
    '@modelcontextprotocol/sdk/client/streamableHttp.js'
  );

  const wallet = createDemoWallet(privateKey);

  // Use NaiveTreasurer for demo (auto-approves all)
  // For production with spend limits, use createAmpersendMcpClient with smart account
  const { Client } = await import('@ampersend_ai/ampersend-sdk');
  const treasurer = new NaiveTreasurer(wallet);

  const client = new Client(
    { name: clientName, version: clientVersion },
    { mcpOptions: { capabilities: { tools: {} } }, treasurer }
  );

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  await client.connect(transport);

  return { client, wallet, address: wallet.address };
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { DEFAULT_CONFIG };
