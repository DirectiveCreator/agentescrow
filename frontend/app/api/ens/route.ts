/**
 * ENS Resolution API
 *
 * Resolves ENS names, text records, and agent profiles.
 * Queries Ethereum Sepolia ENS directly.
 *
 * GET /api/ens?name=buyer.agentescrow.eth
 * GET /api/ens?name=agentescrow.eth&action=subdomains
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, namehash } from 'viem';
import { sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';

const SEPOLIA_RPC = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC),
});

const RESOLVER_ABI = [
  {
    name: 'text',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'node', type: 'bytes32' as const },
      { name: 'key', type: 'string' as const },
    ],
    outputs: [{ name: '', type: 'string' as const }],
  },
  {
    name: 'addr',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'node', type: 'bytes32' as const }],
    outputs: [{ name: '', type: 'address' as const }],
  },
] as const;

const PUBLIC_RESOLVER = '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD';

const AGENT_TEXT_KEYS = [
  'avatar', 'description', 'url', 'com.github',
  'ai.agent.type', 'ai.agent.capabilities', 'ai.agent.status',
  'ai.agent.erc8004.id', 'ai.agent.erc8004.registry',
  'ai.agent.reputation.score', 'ai.agent.reputation.registry',
  'ai.agent.serviceBoard', 'ai.agent.escrowVault',
  'ai.agent.chainId', 'ai.agent.protocol',
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const action = searchParams.get('action') || 'resolve';

  if (!name) {
    return NextResponse.json({ error: 'Missing ?name= parameter' }, { status: 400 });
  }

  try {
    const normalizedName = normalize(name);
    const node = namehash(normalizedName);

    if (action === 'resolve') {
      // Resolve address + all text records
      let address: string | null = null;
      try {
        address = await publicClient.readContract({
          address: PUBLIC_RESOLVER,
          abi: RESOLVER_ABI,
          functionName: 'addr',
          args: [node],
        });
        if (address === '0x0000000000000000000000000000000000000000') {
          address = null;
        }
      } catch {
        // Name not registered
      }

      // Read all agent text records
      const records: Record<string, string> = {};
      const results = await Promise.allSettled(
        AGENT_TEXT_KEYS.map(async (key) => {
          const val = await publicClient.readContract({
            address: PUBLIC_RESOLVER,
            abi: RESOLVER_ABI,
            functionName: 'text',
            args: [node, key],
          });
          return { key, value: val };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.value) {
          records[result.value.key] = result.value.value;
        }
      }

      // Check ENSIP-25 if we have an ERC-8004 ID
      const erc8004Id = records['ai.agent.erc8004.id'];
      const erc8004Registry = records['ai.agent.erc8004.registry'];
      let ensip25: Record<string, unknown> | null = null;
      if (erc8004Id && erc8004Registry) {
        try {
          const ensip25Key = `agent-registration[${erc8004Registry}][${erc8004Id}]`;
          const val = await publicClient.readContract({
            address: PUBLIC_RESOLVER,
            abi: RESOLVER_ABI,
            functionName: 'text',
            args: [node, ensip25Key],
          });
          if (val) {
            ensip25 = JSON.parse(val);
          }
        } catch {
          // No ENSIP-25 record
        }
      }

      return NextResponse.json({
        name: normalizedName,
        address,
        records,
        ensip25,
        registered: !!address || Object.keys(records).length > 0,
      });
    }

    if (action === 'subdomains') {
      // Check known agent subdomains
      const agents = ['buyer', 'seller'];
      const subdomains = await Promise.all(
        agents.map(async (label) => {
          const subName = `${label}.${normalizedName}`;
          const subNode = namehash(subName);
          let address: string | null = null;
          try {
            address = await publicClient.readContract({
              address: PUBLIC_RESOLVER,
              abi: RESOLVER_ABI,
              functionName: 'addr',
              args: [subNode],
            });
            if (address === '0x0000000000000000000000000000000000000000') {
              address = null;
            }
          } catch {
            // Not registered
          }

          let agentType: string | null = null;
          try {
            agentType = await publicClient.readContract({
              address: PUBLIC_RESOLVER,
              abi: RESOLVER_ABI,
              functionName: 'text',
              args: [subNode, 'ai.agent.type'],
            });
          } catch {
            // No record
          }

          return {
            name: subName,
            label,
            address,
            agentType,
            registered: !!address || !!agentType,
          };
        })
      );

      return NextResponse.json({
        parent: normalizedName,
        subdomains,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use ?action=resolve or ?action=subdomains' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'ENS resolution failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}
