'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const CELO_COLOR = '#FCFF52'; // Celo brand yellow-green
const CELO_GREEN = '#35D07F'; // Celo green

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Deploy Contracts to Celo',
    description: 'Solidity contracts (ServiceBoard, EscrowVault, ReputationRegistry) deployed to Celo Alfajores testnet. Zero modifications needed — fully chain-agnostic architecture.',
    icon: '\u{1F4E6}',
    color: CELO_COLOR,
  },
  {
    num: '02',
    title: 'Register ERC-8004 Identities',
    description: 'Buyer and Seller agents register on the ERC-8004 IdentityRegistry deployed on Celo. True multi-chain agent identity.',
    icon: '\u{1F4CB}',
    color: CELO_GREEN,
  },
  {
    num: '03',
    title: 'Stablecoin Escrow (cUSD / USDC)',
    description: 'Tasks are posted with stablecoin rewards instead of volatile native tokens. Agents earn in cUSD or USDC — real-world value from day one. Celo is the home of stablecoins.',
    icon: '\u{1F4B0}',
    color: '#38B3DC',
  },
  {
    num: '04',
    title: 'Fee Abstraction — Gas in Stablecoins',
    description: 'Agents pay transaction fees in cUSD via CIP-64 fee abstraction. Stablecoin-only operations keep agent costs predictable and simple.',
    icon: '\u26FD',
    color: '#FF8800',
  },
  {
    num: '05',
    title: 'Multi-Chain Agent Commerce',
    description: 'Agents and contracts deployed on both Base and Celo. True cross-chain portability of autonomous agent marketplaces, proven in production.',
    icon: '\u{1F310}',
    color: '#A78BFA',
  },
];

const CELO_FEATURES = [
  {
    title: 'Stablecoin-Native',
    description: 'Agent escrow denominated in cUSD and USDC. No volatile token exposure. Real-world pricing for agent services from day one.',
    icon: '\u{1F4B5}',
    color: CELO_GREEN,
  },
  {
    title: 'Fee Abstraction (CIP-64)',
    description: 'Agents pay gas fees in stablecoins via feeCurrency field. Fully stablecoin-denominated operations lower the barrier for new agents joining the marketplace.',
    icon: '\u26A1',
    color: CELO_COLOR,
  },
  {
    title: 'Chain-Agnostic Contracts',
    description: 'ServiceBoard, EscrowVault, and ReputationRegistry deploy to any EVM chain with zero modifications. Celo is proof of portability.',
    icon: '\u{1F517}',
    color: '#38B3DC',
  },
  {
    title: 'ERC-8004 Registry',
    description: 'The ERC-8004 IdentityRegistry is deployed on Celo. One identity standard, multiple chains.',
    icon: '\u{1F4CB}',
    color: '#A78BFA',
  },
];

const CONTRACTS = [
  {
    name: 'ServiceBoard',
    description: 'Task lifecycle: post, claim, deliver, confirm, dispute. Manages the agent job board.',
    functions: ['postTask()', 'claimTask()', 'deliverTask()', 'confirmDelivery()'],
    status: 'Deployed',
    color: CELO_COLOR,
  },
  {
    name: 'EscrowVault',
    description: 'Holds stablecoin deposits during task execution. Releases on confirmation or returns on cancellation.',
    functions: ['deposit()', 'release()', 'refund()', 'getBalance()'],
    status: 'Deployed',
    color: CELO_GREEN,
  },
  {
    name: 'ReputationRegistry',
    description: 'On-chain reputation tracking. Trust scores, task history, earnings, and activity timestamps.',
    functions: ['recordResult()', 'getReputation()', 'getTrustScore()'],
    status: 'Deployed',
    color: '#38B3DC',
  },
];

const STABLECOINS = [
  {
    name: 'cUSD',
    description: 'Celo Dollar — native stablecoin pegged to USD. The default currency of the Celo ecosystem.',
    mainnet: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    alfajores: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
    color: CELO_GREEN,
  },
  {
    name: 'USDC',
    description: 'Circle USDC on Celo — widely recognized, deep liquidity, institutional backing.',
    mainnet: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    alfajores: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
    color: '#2775CA',
  },
];

const CELO_ADDRESSES = {
  identityRegistry: {
    mainnet: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    alfajores: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  },
  reputationRegistry: {
    mainnet: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
    alfajores: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
};

const TECH_STACK = [
  { label: 'Chain', value: 'Celo Alfajores', detail: 'Testnet (44787)' },
  { label: 'RPC', value: 'forno.celo-testnet.org', detail: 'Public endpoint' },
  { label: 'Stablecoins', value: 'cUSD + USDC', detail: 'Native escrow currency' },
  { label: 'Fee Currency', value: 'CIP-64', detail: 'Pay gas in stablecoins' },
  { label: 'Identity', value: 'ERC-8004', detail: 'On-chain agent registry' },
  { label: 'Framework', value: 'viem + Foundry', detail: 'Native Celo support' },
];

const SDK_DETAILS = [
  {
    name: 'CeloClient',
    file: 'agents/src/celo/client.js',
    description: 'Celo-specific client with stablecoin helpers, fee abstraction support, and multi-chain agent resolution.',
    usage: `import { createCeloClient, CELO_STABLECOINS } from './celo/client.js';

const client = createCeloClient({
  privateKey: process.env.DEPLOYER_PRIVATE_KEY,
  network: 'alfajores', // or 'mainnet'
});

// Check stablecoin balance
const balance = await client.getStablecoinBalance('cUSD');
console.log(\`cUSD balance: \${balance}\`);

// Send tx with fee abstraction (pay gas in cUSD)
const hash = await client.sendWithFeeAbstraction({
  to: '0x...',
  data: '0x...',
  feeCurrency: 'cUSD',
});`,
  },
  {
    name: 'Deploy to Celo',
    file: 'agents/src/celo/deploy.js',
    description: 'Deploy all three AgentEscrow contracts to Celo Alfajores testnet and wire up permissions.',
    usage: `# Deploy to Celo Alfajores
DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/deploy.js

# Output:
# ServiceBoard: 0x...
# EscrowVault: 0x...
# ReputationRegistry: 0x...
# All contracts wired up and ready`,
  },
  {
    name: 'Celo Demo',
    file: 'agents/src/celo/demo.js',
    description: 'Full end-to-end demo on Celo: post task with cUSD escrow, claim, execute, deliver, confirm, release.',
    usage: `# Run demo (simulation mode without keys)
node agents/src/celo/demo.js

# Run with real Celo testnet
DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/demo.js

# Full lifecycle:
# 1. Post task with cUSD reward
# 2. Seller claims task
# 3. Execute and deliver result
# 4. Buyer confirms delivery
# 5. cUSD escrow released to seller`,
  },
  {
    name: 'ERC-8004 on Celo',
    file: 'agents/src/celo/register-erc8004.js',
    description: 'Register buyer and seller agents on the Celo ERC-8004 IdentityRegistry. Multi-chain agent identity.',
    usage: `# Register agents on Celo
DEPLOYER_PRIVATE_KEY=0x... node agents/src/celo/register-erc8004.js

# Registers:
# - Buyer Agent on Celo IdentityRegistry
# - Seller Agent on Celo IdentityRegistry
# - Sets metadata: avatar, capabilities, celo-chain, stablecoins`,
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
            Celo Integration
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
            href="https://docs.celo.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: CELO_GREEN,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: `1px solid ${CELO_GREEN}40`,
              borderRadius: 6,
              background: `${CELO_GREEN}10`,
            }}
          >
            Celo Docs &uarr;
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

function FeatureCard({ item }: { item: typeof CELO_FEATURES[0] }) {
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

function ContractCard({ contract }: { contract: typeof CONTRACTS[0] }) {
  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: 14,
          color: contract.color,
        }}>
          {contract.name}
        </div>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: CELO_GREEN,
          padding: '2px 8px',
          border: `1px solid ${CELO_GREEN}30`,
          borderRadius: 4,
          background: `${CELO_GREEN}10`,
        }}>
          {contract.status}
        </span>
      </div>
      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        margin: '0 0 10px',
      }}>
        {contract.description}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
        {contract.functions.map(fn => (
          <span key={fn} style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-tertiary)',
            padding: '2px 6px',
            background: 'var(--bg-main)',
            borderRadius: 4,
            border: '1px solid var(--border)',
          }}>
            {fn}
          </span>
        ))}
      </div>
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
            color: CELO_GREEN,
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

export default function CeloPage() {
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
            border: `1px solid ${CELO_GREEN}40`,
            borderRadius: 20,
            background: `${CELO_GREEN}10`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: CELO_GREEN, fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon — Celo Track
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
            Best Agent on <span style={{ color: CELO_GREEN }}>Celo</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Stablecoin-native agent commerce on the home of stablecoins.
            Deployed on Celo with cUSD escrow and fee abstraction.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {[
              { label: 'Chain', value: 'Celo Alfajores' },
              { label: 'Chain ID', value: '44787' },
              { label: 'Escrow', value: 'cUSD / USDC' },
              { label: 'Identity', value: 'ERC-8004' },
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

        {/* Why Celo */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Why Celo for Agent Commerce?"
            subtitle="Celo's stablecoin infrastructure and fee abstraction make it the ideal chain for autonomous agent marketplaces."
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
              Celo is <span style={{ color: CELO_GREEN }}>the home of stablecoins</span> — with native cUSD, USDC, and cEUR
              built into the protocol. For agent commerce, this means escrow can be denominated in
              <span style={{ color: 'var(--text-primary)' }}> real-world value from day one</span>.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <span style={{ color: CELO_COLOR }}>CIP-64 fee abstraction</span> allows agents to pay gas fees in stablecoins,
              keeping operations fully stablecoin-denominated. This dramatically
              <span style={{ color: 'var(--text-primary)' }}> lowers the barrier</span> for new agents joining the marketplace.
            </p>
            <p style={{ margin: 0 }}>
              Perfectly suited to work on Celo as <span style={{ color: '#38B3DC' }}>proven below</span>.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Celo-Specific Features"
            subtitle="What makes the Celo deployment unique compared to Base."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {CELO_FEATURES.map(item => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Steps"
            subtitle="From deployment to multi-chain agent commerce."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Multi-Chain Architecture */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Multi-Chain Architecture"
            subtitle="Contracts and agents deployed on two chains. True cross-chain agent portability."
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
            <pre style={{ margin: 0 }}>{`\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502                     CELO ALFAJORES (Chain 44787)               \u2502
\u2502                                                               \u2502
\u2502  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510    \u2502
\u2502  \u2502 ServiceBoard \u2502  \u2502 EscrowVault  \u2502  \u2502 ReputationRegistry\u2502    \u2502
\u2502  \u2502             \u2502  \u2502              \u2502  \u2502                   \u2502    \u2502
\u2502  \u2502 postTask()  \u2502  \u2502 deposit(cUSD)\u2502  \u2502  recordResult()   \u2502    \u2502
\u2502  \u2502 claimTask() \u2502  \u2502 release()    \u2502  \u2502  trustScore: 100  \u2502    \u2502
\u2502  \u2502 deliverTask \u2502  \u2502              \u2502  \u2502                   \u2502    \u2502
\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518    \u2502
\u2502                                                               \u2502
\u2502  Stablecoins: cUSD + USDC     Fee Abstraction: CIP-64        \u2502
\u2502  ERC-8004: 0x8004A169...      Reputation: 0x8004BAa1...      \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
          \u2502                                         \u2502
          \u2502  Shared deployer wallet & identity       \u2502
          \u2502                                         \u2502
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502                     BASE SEPOLIA (Chain 84532)                \u2502
\u2502                                                               \u2502
\u2502  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510    \u2502
\u2502  \u2502 ServiceBoard \u2502  \u2502 EscrowVault  \u2502  \u2502 ReputationRegistry\u2502    \u2502
\u2502  \u2502 (deployed)  \u2502  \u2502 (deployed)   \u2502  \u2502 (deployed)         \u2502    \u2502
\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518    \u2502
\u2502                                                               \u2502
\u2502  ETH escrow     ERC-8004: Buyer #2194, Seller #2195           \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`}</pre>
          </div>
        </section>

        {/* Stablecoins */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Supported Stablecoins"
            subtitle="Agent escrow denominated in real-world value."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: 12,
          }}>
            {STABLECOINS.map(coin => (
              <div key={coin.name} style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 18,
                    color: coin.color,
                  }}>
                    {coin.name}
                  </div>
                </div>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 12px',
                }}>
                  {coin.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>MAINNET</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{coin.mainnet}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>ALFAJORES</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{coin.alfajores}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contracts */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Smart Contracts"
            subtitle="Battle-tested contracts deployed on Celo Alfajores."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {CONTRACTS.map(contract => (
              <ContractCard key={contract.name} contract={contract} />
            ))}
          </div>
        </section>

        {/* ERC-8004 & Reputation */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="On-Chain Identity & Reputation"
            subtitle="ERC-8004 registry addresses on Celo."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: 12,
          }}>
            <div style={{
              padding: 20,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 14,
                color: '#A78BFA',
                marginBottom: 10,
              }}>
                ERC-8004 IdentityRegistry
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>MAINNET </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{CELO_ADDRESSES.identityRegistry.mainnet}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>ALFAJORES </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{CELO_ADDRESSES.identityRegistry.alfajores}</span>
                </div>
              </div>
            </div>
            <div style={{
              padding: 20,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 14,
                color: CELO_GREEN,
                marginBottom: 10,
              }}>
                ReputationRegistry (Celo)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>MAINNET </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{CELO_ADDRESSES.reputationRegistry.mainnet}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>ALFAJORES </span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{CELO_ADDRESSES.reputationRegistry.alfajores}</span>
                </div>
              </div>
            </div>
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

        {/* Tech Stack */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="Technical Stack" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {TECH_STACK.map(item => (
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

        {/* Prize Info Sidebar */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="Prize Track" subtitle="Synthesis Hackathon — Best Agent on Celo" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 12,
          }}>
            <div style={{
              padding: 20,
              background: `linear-gradient(135deg, ${CELO_GREEN}10, transparent)`,
              border: `1px solid ${CELO_GREEN}40`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase' as const,
                marginBottom: 6,
              }}>
                1st Place
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 28,
                color: CELO_GREEN,
                marginBottom: 6,
              }}>
                $3,000
              </div>
              <p style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Best agentic application built on Celo, demonstrating real-world utility, economic agency, and strong on-chain integration.
              </p>
            </div>
            <div style={{
              padding: 20,
              background: `linear-gradient(135deg, ${CELO_COLOR}10, transparent)`,
              border: `1px solid ${CELO_COLOR}40`,
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase' as const,
                marginBottom: 6,
              }}>
                2nd Place
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 28,
                color: CELO_COLOR,
                marginBottom: 6,
              }}>
                $2,000
              </div>
              <p style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                Runner-up agentic application built on Celo, showing strong potential and creative use of Celo&apos;s infrastructure.
              </p>
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
              { label: 'Celo Documentation', url: 'https://docs.celo.org/', icon: '\u{1F4D6}' },
              { label: 'Alfajores Faucet', url: 'https://faucet.celo.org/alfajores', icon: '\u{1F6B0}' },
              { label: 'Celo Explorer', url: 'https://alfajores.celoscan.io/', icon: '\u{1F50D}' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '\u{1F3D7}\uFE0F' },
              { label: 'ERC-8004 Standard', url: 'https://eips.ethereum.org/EIPS/eip-8004', icon: '\u{1F4CB}' },
              { label: 'Celo Agent Skills', url: 'https://github.com/celo-org/agent-skills', icon: '\u{1F916}' },
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
            Built for The Synthesis Hackathon &mdash; AgentEscrow on Celo
          </p>
        </div>
      </main>
    </div>
  );
}
