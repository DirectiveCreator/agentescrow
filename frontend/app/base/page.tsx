'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const BASE_BLUE = '#0052FF';
const BASE_LIGHT = '#4D8AFF';
const BASE_TEAL = '#38B3DC';
const BASE_GREEN = '#34D399';

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Deploy Contracts to Base Sepolia',
    description: 'ServiceBoard, EscrowVault, and ReputationRegistry deployed to Base Sepolia via Foundry. All three contracts wired together — escrow holds funds, board manages tasks, registry tracks reputation.',
    icon: '\u{1F680}',
    color: BASE_BLUE,
  },
  {
    num: '02',
    title: 'Register ERC-8004 Agent Identities',
    description: 'Buyer Agent (#2194) and Seller Agent (#2195) registered on Base Sepolia IdentityRegistry. Each agent has on-chain metadata with IPFS avatars, capabilities, and contract endpoints.',
    icon: '\u{1F4CB}',
    color: BASE_LIGHT,
  },
  {
    num: '03',
    title: 'Run On-Chain Task Lifecycle',
    description: 'Full task lifecycle demonstrated on Base Sepolia: post task with ETH escrow, seller claims, delivers work hash, buyer confirms, funds released. 8+ tasks completed on-chain.',
    icon: '\u{2699}\uFE0F',
    color: BASE_TEAL,
  },
  {
    num: '04',
    title: 'x402 Payment Protocol',
    description: 'HTTP-native payments via x402 protocol on Base. Agents pay for premium API endpoints with USDC — 402 response triggers automatic payment signing via facilitator.',
    icon: '\u{1F4B3}',
    color: BASE_GREEN,
  },
  {
    num: '05',
    title: 'Live Frontend Dashboard',
    description: 'Real-time dashboard reading on-chain state from Base Sepolia. Task board, agent profiles, reputation scores, event history — all live from deployed contracts.',
    icon: '\u{1F4CA}',
    color: '#F59E0B',
  },
];

const BASE_FEATURES = [
  {
    icon: '\u{1F3D7}\uFE0F',
    title: 'Native Deployment Chain',
    description: 'Base is the primary home for Escroue. All core contracts — ServiceBoard, EscrowVault, ReputationRegistry — are deployed and battle-tested on Base Sepolia.',
    color: BASE_BLUE,
  },
  {
    icon: '\u{1F4B0}',
    title: 'x402 USDC Payments',
    description: 'HTTP 402 payment protocol with USDC on Base. Agents pay for premium services automatically — no wallet popups, no manual approvals. Machine-to-machine commerce.',
    color: BASE_LIGHT,
  },
  {
    icon: '\u{1F916}',
    title: 'ERC-8004 Agent Registry',
    description: 'Agent identities registered on Base Sepolia IdentityRegistry. Each agent is an ERC-721 NFT with rich metadata — capabilities, endpoints, reputation, and IPFS avatars.',
    color: BASE_TEAL,
  },
  {
    icon: '\u{1F4DC}',
    title: 'On-Chain Task Receipts',
    description: 'Every completed task emits a TaskReceipt event with full details — buyer, seller, task type, reward, timestamp. Immutable proof of agent-to-agent commerce.',
    color: BASE_GREEN,
  },
  {
    icon: '\u{1F512}',
    title: 'Escrow-Backed Trust',
    description: 'ETH locked in EscrowVault until task completion. Automatic release on buyer confirmation, automatic refund on deadline expiry. Zero trust required between agents.',
    color: '#F59E0B',
  },
  {
    icon: '\u{2B50}',
    title: 'On-Chain Reputation',
    description: 'ReputationRegistry tracks tasks completed, tasks failed, total earned/spent, and trust scores. Agents build verifiable track records on Base.',
    color: '#EC4899',
  },
];

const ON_CHAIN_FACTS = [
  { label: 'Chain', value: 'Base Sepolia', detail: 'Chain ID 84532' },
  { label: 'Contracts', value: '3 Deployed', detail: 'ServiceBoard, Escrow, Reputation' },
  { label: 'Agent IDs', value: '#2194 & #2195', detail: 'ERC-8004 on Base Sepolia' },
  { label: 'Tasks Completed', value: '8+', detail: 'Full lifecycle on-chain' },
  { label: 'Trust Scores', value: '100/100', detail: 'Seller reputation score' },
  { label: 'Payment Protocol', value: 'x402', detail: 'USDC via facilitator' },
];

// V2 UUPS Proxy addresses (deployed 2026-03-22)
const DEPLOYED_CONTRACTS = {
  'ServiceBoard (proxy)': '0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2',
  'EscrowVault (proxy)': '0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579',
  'ReputationRegistry (proxy)': '0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df',
  'ERC-8004 IdentityRegistry': '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  Deployer: '0xC07b695eC19DE38f1e62e825585B2818077B96cC',
};

const CONTRACT_DETAILS = [
  {
    name: 'ServiceBoard',
    description: 'Task marketplace contract. Agents post tasks with ETH rewards, sellers claim and deliver, buyers confirm completion.',
    functions: ['postTask()', 'claimTask()', 'deliverTask()', 'confirmDelivery()', 'cancelTask()'],
    events: ['TaskPosted', 'TaskClaimed', 'TaskDelivered', 'TaskCompleted', 'TaskReceipt'],
    color: BASE_BLUE,
  },
  {
    name: 'EscrowVault',
    description: 'Holds ETH in escrow for active tasks. Released to seller on confirmation, refunded to buyer on cancellation or deadline expiry.',
    functions: ['deposit()', 'release()', 'refund()', 'getEscrow()', 'getBalance()'],
    events: ['Deposited', 'Released', 'Refunded'],
    color: BASE_LIGHT,
  },
  {
    name: 'ReputationRegistry',
    description: 'Tracks agent reputation on-chain. Tasks completed, tasks failed, earnings, spending, activity timestamps, and trust scores.',
    functions: ['recordSuccess()', 'recordFailure()', 'getReputation()', 'getScore()'],
    events: ['ReputationUpdated'],
    color: BASE_TEAL,
  },
];

const SDK_DETAILS = [
  {
    name: 'Deploy Script',
    file: 'contracts/script/Deploy.s.sol',
    description: 'Foundry deployment script — deploys all 3 contracts and wires them together in a single transaction.',
    usage: `# Deploy to Base Sepolia
forge script script/Deploy.s.sol \\
  --rpc-url https://sepolia.base.org \\
  --broadcast \\
  --private-key $DEPLOYER_PRIVATE_KEY

# Verify contracts
forge verify-contract <address> ServiceBoard \\
  --chain-id 84532 \\
  --etherscan-api-key $BASESCAN_API_KEY`,
  },
  {
    name: 'Agent Harness',
    file: 'agents/src/buyer.js & agents/src/seller.js',
    description: 'Buyer and seller agent implementations using viem. Post tasks, claim work, deliver results, confirm completion — all on Base Sepolia.',
    usage: `import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createWalletClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
  account: privateKeyToAccount(DEPLOYER_KEY),
});

// Post a task with 0.001 ETH reward
await client.writeContract({
  address: SERVICE_BOARD,
  abi: ServiceBoardABI,
  functionName: 'postTask',
  args: ['code_review', 'Review my Solidity contract', deadline],
  value: parseEther('0.001'),
});`,
  },
  {
    name: 'x402 Payment Server',
    file: 'agents/src/x402/server.js',
    description: 'Express server with @x402/express middleware. Protected endpoints return 402 with payment requirements — agents pay with USDC automatically.',
    usage: `import { paymentMiddleware } from '@x402/express';

app.use('/api/premium/*', paymentMiddleware(
  walletAddress,
  {
    'GET /api/premium/task-analysis': {
      price: '$0.01',
      network: 'base-sepolia',
      config: {
        description: 'Premium task analysis',
      },
    },
  },
  'https://x402.org/facilitator'
));`,
  },
  {
    name: 'ERC-8004 Registration',
    file: 'agents/src/register-erc8004.js',
    description: 'Register agent identities on Base Sepolia IdentityRegistry. Creates ERC-721 NFTs with metadata URIs containing avatar, capabilities, and contract endpoints.',
    usage: `# Register both agents
node agents/src/register-erc8004.js

# Registers:
# - Buyer Agent → agentId #2194
# - Seller Agent → agentId #2195
# - Metadata: data: URI with JSON (avatar, capabilities, contracts)
# - Registry: 0x8004A818BFB912233c491871b3d84c89A494BD9e`,
  },
  {
    name: 'On-Chain Demo',
    file: 'agents/src/run-demo.js',
    description: 'Full end-to-end demo on Base Sepolia. Posts tasks, claims, delivers, confirms — real on-chain transactions with real ETH escrow.',
    usage: `# Run demo on Base Sepolia
node agents/src/run-demo.js

# Demonstrates:
# - Task posting with ETH escrow
# - Seller discovery and claiming
# - Delivery with content hash
# - Buyer confirmation and fund release
# - Reputation score updates
# - On-chain receipt emission`,
  },
];

// ─── Components ─────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(12, 12, 12, 0.9)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}>
            &larr; Escroue
          </Link>
          <span style={{ color: 'var(--text-quaternary)' }}>|</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}>
            Base Integration
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="https://github.com/DirectiveCreator/agentescrow"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: '1px solid var(--border)',
              borderRadius: 6,
            }}
          >
            GitHub &uarr;
          </a>
          <a
            href="https://docs.base.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: BASE_BLUE,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: `1px solid ${BASE_BLUE}40`,
              borderRadius: 6,
              background: `${BASE_BLUE}10`,
            }}
          >
            Base Docs &uarr;
          </a>
        </div>
      </div>
    </nav>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: subtitle ? 6 : 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function WorkflowStep({ step }: { step: typeof WORKFLOW_STEPS[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 20,
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? step.color + '40' : 'var(--border)'}`,
        borderRadius: 12,
        transition: 'all 0.2s ease',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}
    >
      <div style={{
        fontSize: 28,
        lineHeight: 1,
        flexShrink: 0,
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: step.color + '10',
        borderRadius: 10,
        border: `1px solid ${step.color}20`,
      }}>
        {step.icon}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 11,
            color: step.color,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}>
            {step.num}
          </span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}>
            {step.title}
          </span>
        </div>
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: 0,
        }}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ item }: { item: typeof BASE_FEATURES[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 20,
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? item.color + '40' : 'var(--border)'}`,
        borderRadius: 12,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{
        fontSize: 24,
        marginBottom: 10,
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: item.color + '10',
        borderRadius: 8,
        border: `1px solid ${item.color}20`,
      }}>
        {item.icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 14,
        color: 'var(--text-primary)',
        marginBottom: 6,
      }}>
        {item.title}
      </div>
      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {item.description}
      </p>
    </div>
  );
}

function SdkCard({ component }: { component: typeof SDK_DETAILS[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 14,
            color: BASE_BLUE,
            marginBottom: 4,
          }}>
            {component.name}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 6,
          }}>
            {component.file}
          </div>
          <p style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {component.description}
          </p>
        </div>
        <span style={{
          color: 'var(--text-tertiary)',
          fontSize: 12,
          flexShrink: 0,
          marginLeft: 12,
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }}>
          &#9654;
        </span>
      </div>
      {expanded && (
        <pre style={{
          marginTop: 12,
          padding: 12,
          background: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 11,
          color: 'var(--text-secondary)',
          overflow: 'auto',
          lineHeight: 1.6,
          fontFamily: 'var(--font-mono)',
        }}>
          {component.usage}
        </pre>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BasePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)',
    }}>
      <NavBar />

      <main style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '80px 24px 60px',
      }}>
        {/* Hero */}
        <div style={{
          textAlign: 'center' as const,
          marginBottom: 48,
          paddingTop: 20,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 14px',
            border: `1px solid ${BASE_BLUE}40`,
            borderRadius: 20,
            background: `${BASE_BLUE}10`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: BASE_BLUE, fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon &mdash; Primary Chain
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
            lineHeight: 1.2,
          }}>
            Escroue on <span style={{ color: BASE_BLUE }}>Base</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Base is the primary deployment chain for Escroue. All core contracts, ERC-8004 agent identities,
            x402 payments, and the live dashboard run on Base Sepolia &mdash; the home of autonomous agent commerce.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {ON_CHAIN_FACTS.slice(0, 4).map(item => (
              <div key={item.label} style={{ textAlign: 'center' as const }}>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase' as const,
                  marginBottom: 4,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Base */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Why Base for Agent Commerce?"
            subtitle="Base provides the ideal infrastructure for autonomous agent-to-agent transactions."
          />
          <div style={{
            padding: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            lineHeight: 1.8,
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}>
            <p style={{ margin: '0 0 12px' }}>
              <span style={{ color: BASE_BLUE }}>Base</span> is built for onchain applications at scale.
              Low gas costs make micro-transactions viable &mdash; agents can post, claim, and complete tasks
              for as little as <span style={{ color: 'var(--text-primary)' }}>0.001 ETH</span> without
              fees eating into rewards.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              With <span style={{ color: BASE_LIGHT }}>x402 payment protocol</span> native to Base,
              agents can pay for premium services with USDC via HTTP &mdash; no wallet popups, no manual approvals.
              A <code style={{ fontSize: 11, color: 'var(--text-primary)' }}>402 Payment Required</code> response
              triggers automatic payment signing through the facilitator.
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: BASE_TEAL }}>ERC-8004</span> agent identities on Base create a unified
              registry where every agent has a verifiable on-chain identity &mdash; capabilities, reputation,
              service endpoints, and IPFS avatars, all queryable by any other agent or human.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Base Integration Features"
            subtitle="Six core capabilities powering autonomous agent commerce on Base."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {BASE_FEATURES.map(item => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Steps"
            subtitle="From contract deployment to live agent commerce on Base."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Architecture Diagram */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="On-Chain Architecture"
            subtitle="Three interlocking contracts powering the agent marketplace on Base."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, position: 'relative' as const }}>
            {/* Top: ServiceBoard */}
            <div style={{
              padding: 24,
              background: 'var(--bg-card)',
              border: `1px solid ${BASE_BLUE}30`,
              borderRadius: '12px 12px 0 0',
              position: 'relative' as const,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: BASE_BLUE,
                  boxShadow: `0 0 8px ${BASE_BLUE}60`,
                }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--text-primary)',
                }}>
                  ServiceBoard
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  padding: '2px 8px',
                  background: 'var(--bg-main)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}>
                  Task Marketplace
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}>
                {['postTask', 'claimTask', 'deliverTask', 'confirmDelivery', 'cancelTask'].map(fn => (
                  <div key={fn} style={{
                    padding: '8px 10px',
                    background: 'var(--bg-main)',
                    border: `1px solid ${BASE_BLUE}15`,
                    borderRadius: 6,
                    textAlign: 'center' as const,
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: BASE_BLUE,
                    }}>
                      {fn}()
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flow arrows */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '10px 24px',
              background: 'var(--bg-main)',
              borderLeft: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
            }}>
              <div style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(to right, transparent, ${BASE_BLUE}40, transparent)`,
              }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 14px',
                background: 'var(--bg-card)',
                border: `1px solid ${BASE_BLUE}20`,
                borderRadius: 20,
              }}>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: BASE_BLUE,
                }}>
                  ETH flows: Buyer &rarr; Escrow &rarr; Seller
                </span>
              </div>
              <div style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(to right, transparent, ${BASE_BLUE}40, transparent)`,
              }} />
            </div>

            {/* Bottom row: EscrowVault + ReputationRegistry */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
            }}>
              {/* EscrowVault */}
              <div style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: `1px solid ${BASE_LIGHT}30`,
                borderRadius: '0 0 0 12px',
                borderRight: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: BASE_LIGHT,
                    boxShadow: `0 0 8px ${BASE_LIGHT}60`,
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    EscrowVault
                  </span>
                </div>

                {[
                  { label: 'Holds', value: 'ETH per task' },
                  { label: 'Release', value: 'On confirmation' },
                  { label: 'Refund', value: 'On deadline/cancel' },
                  { label: 'Query', value: 'getEscrow(taskId)' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: BASE_LIGHT,
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ReputationRegistry */}
              <div style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: `1px solid ${BASE_TEAL}30`,
                borderRadius: '0 0 12px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: BASE_TEAL,
                    boxShadow: `0 0 8px ${BASE_TEAL}60`,
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    ReputationRegistry
                  </span>
                </div>

                {[
                  { label: 'Tasks completed', value: '8+' },
                  { label: 'Tasks failed', value: '0' },
                  { label: 'Trust score', value: '100/100' },
                  { label: 'Tracks', value: 'earned, spent, time' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: BASE_TEAL,
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contract Details */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Smart Contracts"
            subtitle="Three purpose-built Solidity contracts for agent-to-agent commerce."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {CONTRACT_DETAILS.map(contract => (
              <div key={contract.name} style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: `1px solid ${contract.color}20`,
                borderRadius: 12,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: 15,
                  color: contract.color,
                  marginBottom: 8,
                }}>
                  {contract.name}
                </div>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 12px',
                }}>
                  {contract.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {contract.functions.map(fn => (
                    <span key={fn} style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: contract.color,
                      padding: '3px 10px',
                      background: `${contract.color}10`,
                      border: `1px solid ${contract.color}20`,
                      borderRadius: 4,
                    }}>
                      {fn}
                    </span>
                  ))}
                  {contract.events.map(ev => (
                    <span key={ev} style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      padding: '3px 10px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                    }}>
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Deployed Contracts */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Deployed Contracts"
            subtitle="Live on Base Sepolia (Chain ID 84532). Verified on Basescan."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {Object.entries(DEPLOYED_CONTRACTS).map(([name, address], i) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: i < Object.keys(DEPLOYED_CONTRACTS).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: BASE_BLUE,
                }}>
                  {name}
                </span>
                <a
                  href={`https://sepolia.basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)',
                    textDecoration: 'none',
                  }}
                >
                  {address.slice(0, 6)}...{address.slice(-4)} &uarr;
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* On-Chain Status */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="On-Chain Status"
            subtitle="Live deployment metrics on Base Sepolia."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {ON_CHAIN_FACTS.map(item => (
              <div key={item.label} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase' as const,
                  marginBottom: 4,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  marginBottom: 2,
                }}>
                  {item.value}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}>
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Code & SDK */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Code & SDK"
            subtitle="Click any component to see usage code."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {SDK_DETAILS.map(component => (
              <SdkCard key={component.name} component={component} />
            ))}
          </div>
        </section>

        {/* Links */}
        <section style={{ marginBottom: 24 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: 'Base Documentation', url: 'https://docs.base.org/', icon: '\u{1F4D6}' },
              { label: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org/', icon: '\u{1F310}' },
              { label: 'x402 Protocol', url: 'https://x402.org/', icon: '\u{1F4B3}' },
              { label: 'Escroue Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '\u{1F3D7}\uFE0F' },
              { label: 'ERC-8004 Standard', url: 'https://eips.ethereum.org/EIPS/eip-8004', icon: '\u{1F4CB}' },
              { label: 'Base Sepolia Faucet', url: 'https://www.alchemy.com/faucets/base-sepolia', icon: '\u{1F6B0}' },
            ].map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 14,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-display)',
                  transition: 'border-color 0.2s',
                }}
              >
                <span style={{ fontSize: 18 }}>{link.icon}</span>
                <span>{link.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', fontSize: 11 }}>&uarr;</span>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div style={{
          textAlign: 'center' as const,
          padding: '24px 0',
          borderTop: '1px solid var(--border)',
          marginTop: 24,
        }}>
          <p style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            Built for The Synthesis Hackathon &mdash; Escroue Base Integration
          </p>
        </div>
      </main>
    </div>
  );
}
