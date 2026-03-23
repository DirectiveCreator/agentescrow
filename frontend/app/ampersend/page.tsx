'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const ARCHITECTURE_STEPS = [
  {
    num: '01',
    title: 'Buyer Agent → Wallet',
    description: 'Buyer gets an EOA or ERC-4337 Smart Account wallet via Ampersend SDK. The wallet holds USDC and is controlled by a session key.',
    icon: '👛',
    color: '#38B3DC',
  },
  {
    num: '02',
    title: 'Treasurer → Spend Limits',
    description: 'A Treasurer authorizes every payment before it happens. Enforces daily, monthly, and per-transaction limits. Human operators set these via the Ampersend dashboard.',
    icon: '🏦',
    color: '#FBBF24',
  },
  {
    num: '03',
    title: 'Seller Agent → Paid MCP Tools',
    description: 'Seller agents expose their capabilities as MCP tools with x402 payment requirements. Each tool call costs a set amount of USDC.',
    icon: '🔌',
    color: '#34D399',
  },
  {
    num: '04',
    title: 'Auto-Pay via x402',
    description: 'When the buyer calls a paid tool, the SDK handles the full 402 flow: receive requirements → treasurer approves → sign payment → retry with payment header.',
    icon: '💳',
    color: '#A78BFA',
  },
  {
    num: '05',
    title: 'Facilitator → Settlement',
    description: 'Payments are verified and settled through the x402 facilitator. The seller receives USDC, and the transaction is recorded on-chain on Base.',
    icon: '✅',
    color: '#34D399',
  },
];

const SDK_COMPONENTS = [
  {
    name: 'AccountWallet',
    pkg: '@ampersend_ai/ampersend-sdk',
    description: 'EOA wallet from private key. Creates x402 payment payloads with EIP-3009 signatures.',
    usage: `import { AccountWallet } from '@ampersend_ai/ampersend-sdk';
const wallet = AccountWallet.fromPrivateKey('0x...');`,
  },
  {
    name: 'SmartAccountWallet',
    pkg: '@ampersend_ai/ampersend-sdk',
    description: 'ERC-4337 smart account wallet. Uses session keys for signing. Deployed via Ampersend platform.',
    usage: `import { SmartAccountWallet } from '@ampersend_ai/ampersend-sdk';
const wallet = new SmartAccountWallet({
  smartAccountAddress: '0x...',
  sessionKeyPrivateKey: '0x...',
  chainId: 84532,
});`,
  },
  {
    name: 'NaiveTreasurer',
    pkg: '@ampersend_ai/ampersend-sdk/x402/treasurers',
    description: 'Auto-approves all payments. Good for testing and demos.',
    usage: `import { NaiveTreasurer } from '@ampersend_ai/ampersend-sdk/x402/treasurers';
const treasurer = new NaiveTreasurer(wallet);`,
  },
  {
    name: 'AmpersendTreasurer',
    pkg: '@ampersend_ai/ampersend-sdk',
    description: 'Production treasurer with spend limits. Consults Ampersend API before every payment.',
    usage: `import { createAmpersendTreasurer } from '@ampersend_ai/ampersend-sdk';
const treasurer = createAmpersendTreasurer({
  smartAccountAddress: '0x...',
  sessionKeyPrivateKey: '0x...',
});`,
  },
  {
    name: 'MCP Client',
    pkg: '@ampersend_ai/ampersend-sdk',
    description: 'Auto-paying MCP client. Handles 402 responses transparently — buyer just calls tools.',
    usage: `import { createAmpersendMcpClient } from '@ampersend_ai/ampersend-sdk';
const client = createAmpersendMcpClient({
  clientInfo: { name: 'buyer', version: '1.0.0' },
  smartAccountAddress: '0x...',
  sessionKeyPrivateKey: '0x...',
});`,
  },
  {
    name: 'FastMCP Server',
    pkg: '@ampersend_ai/ampersend-sdk/mcp/server/fastmcp',
    description: 'MCP server with x402 payment gating. Seller defines price per tool, middleware handles verification.',
    usage: `import { FastMCP, withX402Payment } from '...fastmcp';
mcp.addTool({
  name: 'summarize',
  execute: withX402Payment({
    onExecute: () => paymentRequirements,
    onPayment: ({ payment }) => verify(payment),
  })(handler),
});`,
  },
  {
    name: 'HTTP Client',
    pkg: '@x402/fetch + ampersend-sdk',
    description: 'Wraps fetch() to auto-pay on 402 responses. Works with any x402-enabled HTTP endpoint.',
    usage: `import { createAmpersendHttpClient } from '@ampersend_ai/ampersend-sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
const client = createAmpersendHttpClient({ ... });
const payFetch = wrapFetchWithPayment(fetch, client);`,
  },
];

const INTEGRATION_POINTS = [
  {
    title: 'Buyer Agent Payment',
    before: 'Raw x402 with manual wallet management',
    after: 'Ampersend Treasurer with spend limits + smart accounts',
    status: 'built',
  },
  {
    title: 'Seller Agent Services',
    before: 'Custom Express x402 middleware',
    after: 'MCP Server with withX402Payment gating per tool',
    status: 'built',
  },
  {
    title: 'Human Oversight',
    before: 'No visibility into agent spending',
    after: 'Dashboard with daily/monthly limits, tx history',
    status: 'available',
  },
  {
    title: 'Wallet Management',
    before: 'Single EOA shared across agents',
    after: 'Per-agent smart accounts with session keys',
    status: 'available',
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
            ← Escroue
          </Link>
          <span style={{ color: 'var(--text-quaternary)' }}>|</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}>
            Ampersend Integration
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="https://github.com/edgeandnode/ampersend-sdk"
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
            GitHub ↗
          </a>
          <a
            href="https://app.staging.ampersend.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: '1px solid var(--accent-40)',
              borderRadius: 6,
              background: 'var(--accent-10)',
            }}
          >
            Dashboard ↗
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

function ArchitectureStep({ step }: { step: typeof ARCHITECTURE_STEPS[0] }) {
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

function SdkComponentCard({ component }: { component: typeof SDK_COMPONENTS[0] }) {
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
            color: 'var(--accent)',
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
            {component.pkg}
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
          ▶
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

function IntegrationCard({ item }: { item: typeof INTEGRATION_POINTS[0] }) {
  const statusColor = item.status === 'built' ? '#34D399' : '#FBBF24';
  const statusLabel = item.status === 'built' ? 'BUILT' : 'AVAILABLE';
  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--text-primary)',
        }}>
          {item.title}
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: statusColor,
          padding: '2px 8px',
          border: `1px solid ${statusColor}30`,
          borderRadius: 4,
          background: statusColor + '10',
        }}>
          {statusLabel}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div style={{
          flex: 1,
          padding: 10,
          background: 'var(--bg-main)',
          borderRadius: 6,
          border: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
            textTransform: 'uppercase' as const,
          }}>
            Before
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {item.before}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--accent)',
          fontSize: 16,
          flexShrink: 0,
        }}>
          →
        </div>
        <div style={{
          flex: 1,
          padding: 10,
          background: 'var(--accent-10)',
          borderRadius: 6,
          border: '1px solid var(--accent-40)',
        }}>
          <div style={{
            fontSize: 10,
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 4,
            textTransform: 'uppercase' as const,
          }}>
            After
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {item.after}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AmpersendPage() {
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
            border: '1px solid var(--accent-40)',
            borderRadius: 20,
            background: 'var(--accent-10)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon — Best Agent Built with Ampersend
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
            Ampersend + Escroue
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Managed agent payments via x402. Budget-capped smart accounts, human oversight dashboard,
            and seamless MCP tool payments — all on Base.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {[
              { label: 'SDK', value: '@ampersend_ai/ampersend-sdk' },
              { label: 'Version', value: 'v0.0.12' },
              { label: 'By', value: 'Edge & Node (The Graph)' },
              { label: 'Network', value: 'Base Sepolia' },
            ].map(item => (
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

        {/* What is Ampersend */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="What is Ampersend?"
            subtitle="Agent payment management platform by Edge & Node — the team behind The Graph protocol."
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
              Ampersend solves a critical problem: <span style={{ color: 'var(--text-primary)' }}>how do you give autonomous agents the ability to spend money without losing control?</span>
            </p>
            <p style={{ margin: '0 0 12px' }}>
              It provides <span style={{ color: 'var(--accent)' }}>smart account wallets</span> (ERC-4337) for each agent,
              a <span style={{ color: '#FBBF24' }}>Treasurer</span> that enforces spend limits before every payment,
              and a <span style={{ color: '#34D399' }}>human operator dashboard</span> for monitoring and control.
            </p>
            <p style={{ margin: 0 }}>
              Under the hood, it uses the <span style={{ color: 'var(--accent)' }}>x402 protocol</span> (HTTP 402 payments) — the same protocol already integrated into Escroue.
              Ampersend wraps x402 with managed wallets and treasury controls, making it production-ready for agent commerce.
            </p>
          </div>
        </section>

        {/* Architecture Flow */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="How It Works"
            subtitle="The payment flow from buyer agent to seller agent, with Treasurer oversight at every step."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {ARCHITECTURE_STEPS.map(step => (
              <ArchitectureStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Integration with Escroue */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration with Escroue"
            subtitle="How Ampersend enhances our existing payment infrastructure."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {INTEGRATION_POINTS.map(item => (
              <IntegrationCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* SDK Reference */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="SDK Components"
            subtitle="Click any component to see usage code. These are the building blocks for agent payments."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {SDK_COMPONENTS.map(component => (
              <SdkComponentCard key={component.name} component={component} />
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Quick Start"
            subtitle="Get up and running with Ampersend in Escroue."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {[
              {
                step: '1',
                title: 'Install the SDK',
                code: 'npm install @ampersend_ai/ampersend-sdk',
              },
              {
                step: '2',
                title: 'Register on the Ampersend platform',
                code: '# Visit https://app.staging.ampersend.ai\n# Create an agent → get smart account address + session key',
              },
              {
                step: '3',
                title: 'Fund with testnet USDC',
                code: '# Get USDC from https://faucet.circle.com\n# Send to your smart account address on Base Sepolia',
              },
              {
                step: '4',
                title: 'Run the demo',
                code: 'AMPERSEND_PRIVATE_KEY=0x... node agents/src/ampersend/demo.js',
              },
              {
                step: '5',
                title: 'Use in your agent',
                code: `import { createDemoTreasurer, createPayingFetch } from './ampersend/client.js';

// Create a paying fetch client
const { fetch: payFetch } = await createPayingFetch(privateKey);

// Call a paid endpoint — 402 handling is automatic
const response = await payFetch('https://seller-agent.example.com/api/task');`,
              },
            ].map((item, i) => (
              <div key={item.step} style={{
                padding: 16,
                borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                }}>
                  <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--accent-10)',
                    border: '1px solid var(--accent-40)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}>
                    {item.step}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    {item.title}
                  </span>
                </div>
                <pre style={{
                  margin: 0,
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
                  {item.code}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Flow Diagram */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Payment Flow"
            subtitle="How x402 payments work between buyer and seller agents via Ampersend."
          />
          <div style={{
            padding: 24,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 2,
            color: 'var(--text-secondary)',
            overflow: 'auto',
          }}>
            <pre style={{ margin: 0 }}>{`┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Buyer Agent │    │  Treasurer   │    │ Seller Agent │
│  (MCP Client)│    │  (Ampersend) │    │ (MCP Server) │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │  callTool("summarize", {text})        │
       │───────────────────────────────────────>│
       │                   │                   │
       │                   │   402 + payment   │
       │<──────────────────────────────────────│
       │                   │   requirements    │
       │                   │                   │
       │  authorize?       │                   │
       │──────────────────>│                   │
       │                   │                   │
       │  ✅ authorized    │                   │
       │<──────────────────│                   │
       │  (within limits)  │                   │
       │                   │                   │
       │  retry + payment header               │
       │───────────────────────────────────────>│
       │                   │                   │
       │                   │     verify via    │
       │                   │     facilitator   │
       │                   │                   │
       │              200 + result             │
       │<──────────────────────────────────────│
       │                   │                   │`}</pre>
          </div>
        </section>

        {/* Hackathon Prize */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Hackathon Prize"
          />
          <div style={{
            padding: 20,
            background: 'linear-gradient(135deg, var(--accent-10), transparent)',
            border: '1px solid var(--accent-40)',
            borderRadius: 12,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--text-primary)',
                }}>
                  Best Agent Built with ampersend-sdk
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                }}>
                  Synthesis Hackathon — Prize Track #126
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 28,
                color: 'var(--accent)',
              }}>
                Prize Track
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 16,
            }}>
              {[
                { label: 'Effort', value: '3-4 hours', color: '#34D399' },
                { label: 'Risk', value: 'Low', color: '#34D399' },
                { label: 'Competition', value: 'Very low', color: '#FBBF24' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: 10,
                  background: 'var(--bg-card)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  textAlign: 'center' as const,
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
                    fontSize: 14,
                    fontWeight: 600,
                    color: item.color,
                    fontFamily: 'var(--font-display)',
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
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
              { label: 'SDK Repository', url: 'https://github.com/edgeandnode/ampersend-sdk', icon: '📦' },
              { label: 'SDK Examples', url: 'https://github.com/edgeandnode/ampersend-examples', icon: '💡' },
              { label: 'Staging Dashboard', url: 'https://app.staging.ampersend.ai', icon: '🖥️' },
              { label: 'USDC Faucet', url: 'https://faucet.circle.com', icon: '💰' },
              { label: 'x402 Protocol', url: 'https://x402.org', icon: '🔗' },
              { label: 'Escroue Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '🏗️' },
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
                <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', fontSize: 11 }}>↗</span>
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
            Built for The Synthesis Hackathon — Escroue x Ampersend
          </p>
        </div>
      </main>
    </div>
  );
}
