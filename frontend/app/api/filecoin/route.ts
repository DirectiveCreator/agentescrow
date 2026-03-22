import { NextRequest, NextResponse } from 'next/server';

/**
 * Filecoin Onchain Cloud (FOC) API — storage info and demo data.
 *
 * GET /api/filecoin — returns current storage status & demo receipts
 *
 * In production with FILECOIN_PRIVATE_KEY, this would proxy to the
 * real Synapse SDK. For now, returns demo data showing the integration.
 */

// Demo storage receipts showing the agent workflow
const DEMO_RECEIPTS = [
  {
    pieceCid: 'baga6ea4seaqkf7x5m5g3h2q9r4n7t6w8z1c3e5g7i9k1m3o5q7s9u1w3y5a7b9',
    type: 'task_delivery',
    taskId: 42,
    taskType: 'text_summary',
    size: 793,
    copies: 2,
    network: 'filecoin-mainnet',
    timestamp: '2026-03-22T00:38:22.215Z',
    agent: { address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC', erc8004Id: '2195' },
    preview: 'Summary: The AgentEscrow protocol enables autonomous AI agents to trade services...',
  },
  {
    pieceCid: 'baga6ea4seaqd4n8p2r6t0v4x8b2d6f0h4j8l2n6p0r4t8v2x6b0d4f8h2j6l0',
    type: 'task_delivery',
    taskId: 43,
    taskType: 'code_review',
    size: 776,
    copies: 2,
    network: 'filecoin-mainnet',
    timestamp: '2026-03-22T00:38:22.216Z',
    agent: { address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC', erc8004Id: '2195' },
    preview: 'Code Review Report: Well-organized Solidity contracts following OpenZeppelin patterns...',
  },
  {
    pieceCid: 'baga6ea4seaqn6p0r4t8v2x6b0d4f8h2j6l0n4p8r2t6v0x4b8d2f6h0j4l8n2',
    type: 'agent_memory',
    size: 549,
    copies: 2,
    network: 'filecoin-mainnet',
    timestamp: '2026-03-22T00:38:22.216Z',
    agent: { address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC', erc8004Id: '2195' },
    preview: 'Session snapshot: 7 tasks completed, trust score 100/100, 0.0035 ETH earned',
  },
  {
    pieceCid: 'baga6ea4seaqr4t8v2x6b0d4f8h2j6l0n4p8r2t6v0x4b8d2f6h0j4l8n2p6r0',
    type: 'tee_attestation',
    size: 500,
    copies: 2,
    network: 'filecoin-mainnet',
    timestamp: '2026-03-22T00:38:22.216Z',
    agent: { address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC', erc8004Id: '2195' },
    preview: 'Venice TEE attestation: model=tee-deepseek-r1-671b, enclave=sgx-venice-prod-001, verified=true',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pieceCid = searchParams.get('pieceCid');

  // If a specific PieceCID is requested, return that receipt
  if (pieceCid) {
    const receipt = DEMO_RECEIPTS.find(r => r.pieceCid === pieceCid);
    if (receipt) {
      return NextResponse.json({ found: true, receipt });
    }
    return NextResponse.json({ found: false, error: 'PieceCID not found' }, { status: 404 });
  }

  // Return overview
  return NextResponse.json({
    status: 'active',
    network: 'filecoin-mainnet',
    sdk: '@filoz/synapse-sdk@0.40.0',
    pricing: '$2.50/TiB/month',
    features: [
      'Autonomous task delivery storage',
      'Agent memory persistence',
      'TEE attestation archival',
      'PieceCID as verifiable delivery hash',
      'PDP proof-of-storage verification',
    ],
    receipts: DEMO_RECEIPTS,
    totalStored: DEMO_RECEIPTS.length,
    totalBytes: DEMO_RECEIPTS.reduce((sum, r) => sum + r.size, 0),
  });
}
