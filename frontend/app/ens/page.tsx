'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const ENS_BLUE = '#5298FF';
const ENS_PURPLE = '#A78BFA';
const ENS_TEAL = '#38B3DC';
const ENS_GREEN = '#34D399';

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Register agentescrow.eth',
    description: 'Parent ENS name registered on Sepolia via commit-reveal process. This becomes the root domain for all agent identities in the marketplace.',
    icon: '\u{1F3F7}\uFE0F',
    color: ENS_BLUE,
  },
  {
    num: '02',
    title: 'Create Agent Subdomains',
    description: 'buyer.agentescrow.eth and seller.agentescrow.eth created via NameWrapper. Each agent gets a human-readable ENS identity tied to their on-chain role.',
    icon: '\u{1F464}',
    color: ENS_PURPLE,
  },
  {
    num: '03',
    title: 'Set Rich Text Records',
    description: '16 custom text records per agent: avatar, description, capabilities, ERC-8004 ID, reputation score, trust level, status, ENSIP-25 verification keys, and more.',
    icon: '\u{1F4DD}',
    color: ENS_TEAL,
  },
  {
    num: '04',
    title: 'ENSIP-25 Bidirectional Verification',
    description: 'ENS names linked to ERC-8004 agent IDs via ENSIP-25 standard. Verify in both directions: ENS → ERC-8004 and ERC-8004 → ENS. Proving agent identity across protocols.',
    icon: '\u{1F517}',
    color: ENS_GREEN,
  },
  {
    num: '05',
    title: 'Agent Discovery & Resolution',
    description: 'Resolve any agent by ENS name to get their full profile: address, capabilities, reputation, ERC-8004 ID, and service endpoint. Zero raw hex addresses needed.',
    icon: '\u{1F50D}',
    color: '#F59E0B',
  },
];

const ENS_FEATURES = [
  {
    title: 'Human-Readable Agent Names',
    description: 'Agents are addressed as buyer.agentescrow.eth instead of 0xC07b... — making the marketplace accessible to humans and machines alike.',
    icon: '\u{1F4DB}',
    color: ENS_BLUE,
  },
  {
    title: 'Rich Identity Records',
    description: '16 custom text records per agent including agent-specific keys: ai.agent.type, ai.agent.capabilities, ai.agent.erc8004.id, ai.agent.status, and more.',
    icon: '\u{1F4CB}',
    color: ENS_PURPLE,
  },
  {
    title: 'ENSIP-25 Verification',
    description: 'Bidirectional proof linking ENS names to ERC-8004 agent IDs. The first implementation of this standard for agent identity verification.',
    icon: '\u2705',
    color: ENS_GREEN,
  },
  {
    title: 'XMTP Agent Messaging',
    description: 'Encrypted agent-to-agent communication addressed by ENS name. Task negotiation, delivery, and payment all routed through human-readable identities.',
    icon: '\u{1F4EC}',
    color: ENS_TEAL,
  },
  {
    title: 'Cross-Protocol Identity',
    description: 'ENS (human-readable) bridges to ERC-8004 (machine-readable). One agent, two identity systems, verified in both directions.',
    icon: '\u{1F310}',
    color: '#F59E0B',
  },
  {
    title: 'Organizational Hierarchy',
    description: 'Parent domain agentescrow.eth with agent subdomains creates a natural organizational structure. Scales to any number of agents.',
    icon: '\u{1F3E2}',
    color: '#EC4899',
  },
];

const TEXT_RECORDS = [
  { key: 'avatar', description: 'IPFS avatar image', example: 'ipfs://bafybei...' },
  { key: 'description', description: 'Agent role description', example: 'Autonomous buyer agent for AgentEscrow marketplace' },
  { key: 'url', description: 'Agent service URL', example: 'https://agentescrow.directivecreator.com' },
  { key: 'ai.agent.type', description: 'Agent classification', example: 'buyer | seller' },
  { key: 'ai.agent.capabilities', description: 'What the agent can do', example: 'text_summary,code_review,data_analysis' },
  { key: 'ai.agent.erc8004.id', description: 'ERC-8004 agent ID', example: '2194' },
  { key: 'ai.agent.erc8004.registry', description: 'ERC-8004 registry address', example: '0x8004A818BFB912233c491871b3d84c89A494BD9e' },
  { key: 'ai.agent.reputation', description: 'On-chain trust score', example: '100/100' },
  { key: 'ai.agent.status', description: 'Current availability', example: 'active' },
  { key: 'ai.agent.chain', description: 'Primary operating chain', example: 'base-sepolia' },
  { key: 'ai.agent.contract.serviceboard', description: 'ServiceBoard address', example: '0xDd04B859...' },
  { key: 'ai.agent.contract.escrow', description: 'EscrowVault address', example: '0xf2750eB3...' },
  { key: 'ai.agent.contract.reputation', description: 'ReputationRegistry address', example: '0x9c3C18ae...' },
  { key: 'agent-registration[0x8004...][2194]', description: 'ENSIP-25 forward link', example: 'true' },
];

const ON_CHAIN_FACTS = [
  { label: 'Parent Domain', value: 'agentescrow.eth', detail: 'Registered on Sepolia' },
  { label: 'Buyer Agent', value: 'buyer.agentescrow.eth', detail: 'Subdomain + 16 records' },
  { label: 'Seller Agent', value: 'seller.agentescrow.eth', detail: 'Subdomain + 16 records' },
  { label: 'Registration Cost', value: '0.003128 ETH', detail: 'Testnet (free)' },
  { label: 'Text Records', value: '32 total', detail: '16 per agent' },
  { label: 'ENSIP-25', value: 'Verified', detail: 'Bidirectional link' },
];

const ENS_CONTRACTS = {
  registrarController: '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968',
  publicResolver: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
  nameWrapper: '0x0635513f179D50A207757E05759CbD106d7dFcE8',
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  universalResolver: '0xc8Af999e38273D658BE1b921b88A9Ddf005769cC',
};

const SDK_DETAILS = [
  {
    name: 'ENS Client',
    file: 'agents/src/ens/client.js',
    description: 'Full ENS client: resolve names, read text records, discover agents, route tasks by ENS name, resolve payment addresses.',
    usage: `import { createEnsClients, resolveName, getAgentProfile } from './ens/client.js';

// Resolve an agent by ENS name
const address = await resolveName('buyer.agentescrow.eth');
// → 0xC07b695eC19DE38f1e62e825585B2818077B96cC

// Get full agent profile from text records
const profile = await getAgentProfile('seller.agentescrow.eth');
// → { type: 'seller', capabilities: [...], erc8004Id: '2195', reputation: '100/100' }

// Route a task to the best-capable agent
const agent = await routeTaskByName('agentescrow.eth', 'code_review');
// → 'seller.agentescrow.eth'`,
  },
  {
    name: 'ENSIP-25 Verification',
    file: 'agents/src/ens/ensip25.js',
    description: 'Bidirectional verification between ENS names and ERC-8004 agent IDs. Prove that an ENS name belongs to a specific on-chain agent.',
    usage: `import { verifyENSIP25, buildENSIP25Key } from './ens/ensip25.js';

// Build the ENSIP-25 text record key
const key = buildENSIP25Key('0x8004A818...', 2194);
// → 'agent-registration[0x8004A818...][2194]'

// Verify bidirectional link
const result = await verifyENSIP25('buyer.agentescrow.eth', {
  registryAddress: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  agentId: 2194,
});
// → { verified: true, direction: 'bidirectional' }`,
  },
  {
    name: 'XMTP Messaging',
    file: 'agents/src/ens/xmtp-messaging.js',
    description: 'Encrypted agent-to-agent messaging via XMTP, addressed by ENS name. Task negotiation protocol with structured message types.',
    usage: `import { AgentMessenger } from './ens/xmtp-messaging.js';

const messenger = new AgentMessenger({ ensName: 'buyer.agentescrow.eth' });

// Send a task offer to seller agent
await messenger.sendTaskOffer('seller.agentescrow.eth', {
  taskType: 'code_review',
  reward: '0.001 ETH',
  deadline: '2026-03-25',
});

// Listen for messages
messenger.onMessage((msg) => {
  console.log(\`Message from \${msg.senderENS}: \${msg.content}\`);
});`,
  },
  {
    name: 'Registration Script',
    file: 'agents/src/ens/setup-ens.js',
    description: 'One-command full ENS setup: register .eth name, create subdomains, set 16+ text records, configure ENSIP-25 verification.',
    usage: `# Full setup (register + subdomains + records + ENSIP-25)
DEPLOYER_PRIVATE_KEY=0x... node agents/src/ens/setup-ens.js agentescrow

# Steps executed:
# 1. Register agentescrow.eth (commit → wait 60s → reveal)
# 2. Create buyer.agentescrow.eth subdomain
# 3. Create seller.agentescrow.eth subdomain
# 4. Set 16 text records per agent
# 5. Configure ENSIP-25 bidirectional verification
# 6. Verify all records resolve correctly`,
  },
  {
    name: 'ENS Demo',
    file: 'agents/src/ens/demo.js',
    description: 'Full demo covering ENS Identity, Communication, and Open Integration capabilities.',
    usage: `# Simulation mode (no network needed)
node agents/src/ens/demo.js

# Live mode (requires Sepolia RPC)
node agents/src/ens/demo.js --live

# Demonstrates:
# - Agent identity resolution
# - Text record retrieval
# - ENSIP-25 verification
# - Task routing by ENS name
# - Payment address resolution
# - Agent capability discovery`,
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
            &larr; AgentEscrow
          </Link>
          <span style={{ color: 'var(--text-quaternary)' }}>|</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}>
            ENS Integration
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
            href="https://docs.ens.domains/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: ENS_BLUE,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: `1px solid ${ENS_BLUE}40`,
              borderRadius: 6,
              background: `${ENS_BLUE}10`,
            }}
          >
            ENS Docs &uarr;
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

function FeatureCard({ item }: { item: typeof ENS_FEATURES[0] }) {
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
            color: ENS_BLUE,
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

export default function ENSPage() {
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
            border: `1px solid ${ENS_BLUE}40`,
            borderRadius: 20,
            background: `${ENS_BLUE}10`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: ENS_BLUE, fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon &mdash; ENS Integration
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
            AgentEscrow on <span style={{ color: ENS_BLUE }}>ENS</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Human-readable names for autonomous agents. ENS subdomains, rich metadata records,
            ENSIP-25 verification, and encrypted messaging &mdash; all live on Sepolia.
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

        {/* Why ENS */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Why ENS for Agent Identity?"
            subtitle="ENS transforms anonymous hex addresses into human-readable, machine-resolvable agent identities."
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
              In an agent marketplace, identity is trust. <span style={{ color: ENS_BLUE }}>ENS names</span> let
              humans and agents reference each other by name &mdash; <span style={{ color: 'var(--text-primary)' }}>buyer.agentescrow.eth</span> instead
              of <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>0xC07b695eC19DE38f1e62e825585B2818077B96cC</span>.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              With <span style={{ color: ENS_PURPLE }}>16 custom text records</span> per agent, ENS becomes a rich metadata layer:
              capabilities, ERC-8004 registration, reputation scores, service endpoints, and verification status &mdash; all
              queryable by anyone, on-chain.
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: ENS_GREEN }}>ENSIP-25</span> bidirectional verification creates a cryptographic bridge between
              ENS names and ERC-8004 agent IDs &mdash; proving that <code style={{ fontSize: 11, color: 'var(--text-primary)' }}>buyer.agentescrow.eth</code> is
              genuinely Agent #2194 on the ERC-8004 registry.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="ENS Integration Features"
            subtitle="Six capabilities built for agent identity and communication."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {ENS_FEATURES.map(item => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Steps"
            subtitle="From name registration to full agent identity resolution."
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
            title="Identity Architecture"
            subtitle="ENS names bridge human-readable and machine-readable agent identity."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, position: 'relative' as const }}>
            {/* ENS Identity Layer Card */}
            <div style={{
              padding: 24,
              background: 'var(--bg-card)',
              border: `1px solid ${ENS_BLUE}30`,
              borderRadius: '12px 12px 0 0',
              position: 'relative' as const,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: ENS_BLUE,
                  boxShadow: `0 0 8px ${ENS_BLUE}60`,
                }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--text-primary)',
                }}>
                  ENS Identity Layer
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
                  Sepolia
                </span>
              </div>

              {/* Parent domain */}
              <div style={{
                padding: 12,
                background: 'var(--bg-main)',
                border: `1px solid ${ENS_BLUE}20`,
                borderRadius: 8,
                borderTop: `2px solid ${ENS_BLUE}60`,
                marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: ENS_BLUE,
                  marginBottom: 4,
                }}>
                  agentescrow.eth
                </div>
                <div style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}>
                  Parent domain
                </div>
              </div>

              {/* Agent subdomains */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}>
                {[
                  { name: 'buyer.agentescrow.eth', role: 'Buyer Agent', records: '16 text records', color: ENS_PURPLE },
                  { name: 'seller.agentescrow.eth', role: 'Seller Agent', records: '16 text records', color: ENS_TEAL },
                ].map(agent => (
                  <div key={agent.name} style={{
                    padding: 12,
                    background: 'var(--bg-main)',
                    border: `1px solid ${agent.color}20`,
                    borderRadius: 8,
                    borderTop: `2px solid ${agent.color}60`,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: agent.color,
                      marginBottom: 6,
                    }}>
                      {agent.name}
                    </div>
                    <div style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      padding: '1px 0',
                    }}>
                      {agent.role}
                    </div>
                    <div style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      padding: '1px 0',
                    }}>
                      {agent.records}
                    </div>
                  </div>
                ))}
              </div>

              {/* Record type badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {[
                  { label: 'avatar', color: ENS_BLUE },
                  { label: 'ai.agent.type', color: ENS_PURPLE },
                  { label: 'ai.agent.capabilities', color: ENS_TEAL },
                  { label: 'ai.agent.erc8004.id', color: ENS_GREEN },
                  { label: 'ai.agent.reputation', color: '#F59E0B' },
                  { label: 'ai.agent.status', color: '#EC4899' },
                ].map(b => (
                  <span key={b.label} style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: b.color,
                    padding: '3px 10px',
                    background: `${b.color}10`,
                    border: `1px solid ${b.color}20`,
                    borderRadius: 4,
                  }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            {/* ENSIP-25 Bridge Strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '14px 24px',
              background: 'var(--bg-main)',
              borderLeft: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              position: 'relative' as const,
            }}>
              <div style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(to right, transparent, ${ENS_GREEN}60, transparent)`,
              }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                background: 'var(--bg-card)',
                border: `1px solid ${ENS_GREEN}30`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 14 }}>&#x1F517;</span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: ENS_GREEN,
                }}>
                  ENSIP-25 Bidirectional Verification
                </span>
              </div>
              <div style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(to right, transparent, ${ENS_GREEN}60, transparent)`,
              }} />
            </div>

            {/* Bottom row: ERC-8004 + XMTP */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
            }}>
              {/* ERC-8004 Registry Card */}
              <div style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: '1px solid #3B82F630',
                borderRadius: '0 0 0 12px',
                borderRight: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#3B82F6',
                    boxShadow: '0 0 8px #3B82F660',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    ERC-8004 Registry
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    padding: '2px 6px',
                    background: 'var(--bg-main)',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                  }}>
                    Base Sepolia
                  </span>
                </div>

                {[
                  { label: 'Buyer Agent', value: '#2194' },
                  { label: 'Seller Agent', value: '#2195' },
                  { label: 'agentURI', value: 'metadata' },
                  { label: 'Fields', value: 'avatar, capabilities' },
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
                      color: '#3B82F6',
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* XMTP Messaging Card */}
              <div style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: '1px solid #EC489930',
                borderRadius: '0 0 12px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#EC4899',
                    boxShadow: '0 0 8px #EC489960',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    XMTP Messaging
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    padding: '2px 6px',
                    background: 'var(--bg-main)',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                  }}>
                    Encrypted
                  </span>
                </div>

                {[
                  { label: 'buyer.agentescrow.eth', value: '' },
                  { label: '\u2194 encrypted messages \u2194', value: '' },
                  { label: 'seller.agentescrow.eth', value: '' },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '4px 0',
                    textAlign: i === 1 ? 'center' as const : 'left' as const,
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: i === 1 ? '#EC4899' : 'var(--text-secondary)',
                    }}>
                      {item.label}
                    </span>
                  </div>
                ))}

                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 10 }}>
                  {['Task negotiation', 'Payment resolution'].map(tag => (
                    <span key={tag} style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: '#EC4899',
                      padding: '2px 8px',
                      background: '#EC489910',
                      border: '1px solid #EC489920',
                      borderRadius: 4,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Text Records Table */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Agent Text Records"
            subtitle="16 custom text records set per agent subdomain. Agent-specific metadata schema."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.5fr',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-main)',
            }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const }}>Key</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const }}>Description</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const }}>Example Value</span>
            </div>
            {TEXT_RECORDS.map((record, i) => (
              <div key={record.key} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.5fr',
                padding: '8px 16px',
                borderBottom: i < TEXT_RECORDS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: ENS_BLUE,
                  wordBreak: 'break-all' as const,
                }}>
                  {record.key}
                </span>
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}>
                  {record.description}
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  wordBreak: 'break-all' as const,
                }}>
                  {record.example}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* On-Chain Status */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="On-Chain Status"
            subtitle="Live deployment on Ethereum Sepolia testnet."
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

        {/* ENS Contracts */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Sepolia ENS Contracts"
            subtitle="Contract addresses used for registration and resolution."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {Object.entries(ENS_CONTRACTS).map(([name, address], i) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: i < Object.keys(ENS_CONTRACTS).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: ENS_BLUE,
                }}>
                  {name.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}>
                  {address}
                </span>
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
              { label: 'ENS Documentation', url: 'https://docs.ens.domains/', icon: '\u{1F4D6}' },
              { label: 'Sepolia ENS App', url: 'https://sepolia.app.ens.domains/', icon: '\u{1F310}' },
              { label: 'ENSIP-25 Standard', url: 'https://docs.ens.domains/ensip/25', icon: '\u{1F517}' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '\u{1F3D7}\uFE0F' },
              { label: 'ERC-8004 Standard', url: 'https://eips.ethereum.org/EIPS/eip-8004', icon: '\u{1F4CB}' },
              { label: 'XMTP Documentation', url: 'https://xmtp.org/docs', icon: '\u{1F4EC}' },
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
            Built for The Synthesis Hackathon &mdash; AgentEscrow ENS Integration
          </p>
        </div>
      </main>
    </div>
  );
}
