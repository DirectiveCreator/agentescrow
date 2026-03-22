'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Seller Executes Task',
    description: 'Seller agent picks up a task from ServiceBoard and executes it — text summary, code review, translation, or name generation. The result is ready for delivery.',
    icon: '🤖',
    color: '#FF8800',
  },
  {
    num: '02',
    title: 'Store on Filecoin Onchain Cloud',
    description: 'Result is packaged with structured metadata (task ID, type, agent address, ERC-8004 ID, TEE attestation) and uploaded to Filecoin via the Synapse SDK. Returns a unique PieceCID.',
    icon: '🗄️',
    color: '#0090FF',
  },
  {
    num: '03',
    title: 'PieceCID as Delivery Hash',
    description: 'Seller submits the PieceCID to ServiceBoard.deliverTask() on Base Sepolia. The PieceCID is stored on-chain as the verifiable delivery hash — bridging Filecoin storage and Base escrow.',
    icon: '🔗',
    color: '#A78BFA',
  },
  {
    num: '04',
    title: 'Buyer Retrieves & Verifies',
    description: 'Buyer downloads the content from Filecoin using the PieceCID, validates it against the original task requirements, and confirms delivery on-chain.',
    icon: '✅',
    color: '#34D399',
  },
  {
    num: '05',
    title: 'Escrow Released + Storage Persists',
    description: 'On-chain confirmation triggers escrow release. The content remains permanently on Filecoin with Provable Data Possession (PDP) proofs — a complete, verifiable audit trail.',
    icon: '🏦',
    color: '#00C4B4',
  },
];

const STORAGE_TYPES = [
  {
    title: 'Task Deliveries',
    description: 'Complete results of every task: summaries, code reviews, translations, name generations. Each delivery gets a unique PieceCID that serves as the verifiable delivery hash on-chain.',
    icon: '📄',
    color: '#0090FF',
  },
  {
    title: 'Agent Memory',
    description: 'Session snapshots: tasks completed, trust scores, earnings, capabilities, last active time. Agents can reconstruct state from Filecoin after restarts.',
    icon: '🧠',
    color: '#FF8800',
  },
  {
    title: 'TEE Attestations',
    description: 'Venice AI attestation records proving task execution happened inside a Trusted Execution Environment. Cryptographic proof of private, verifiable computation.',
    icon: '🔒',
    color: '#A78BFA',
  },
  {
    title: 'Code Artifacts',
    description: 'Generated code, reviews, and diffs stored with full metadata. Agents can reference past deliveries for context and quality improvement over time.',
    icon: '💻',
    color: '#34D399',
  },
];

const SDK_DETAILS = [
  {
    name: 'AgentStorage',
    file: 'agents/src/filecoin/client.js',
    description: 'High-level wrapper around Synapse SDK. Handles structured metadata, simulation fallback, PieceCID tracking, and balance checks.',
    usage: `import { AgentStorage } from './filecoin/client.js';

const storage = new AgentStorage({
  privateKey: process.env.FILECOIN_PRIVATE_KEY,
  network: 'calibration', // or 'mainnet'
});

// Store a task delivery
const receipt = await storage.storeDelivery({
  taskId: 42,
  taskType: 'text_summary',
  result: 'Summary content...',
  agentAddress: '0xC07b...',
  agentERC8004Id: '2195',
});

console.log(receipt.pieceCid); // baga6ea4seaq...`,
  },
  {
    name: 'Enhanced Seller',
    file: 'agents/src/filecoin/enhanced-seller.js',
    description: 'Seller agent that executes tasks and stores results on FOC, submitting PieceCID as the delivery hash on-chain.',
    usage: `import { EnhancedSeller } from './filecoin/enhanced-seller.js';

const seller = new EnhancedSeller({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  filecoinKey: process.env.FILECOIN_PRIVATE_KEY,
});

// Execute task and store result on Filecoin
const { receipt, deliveryHash } = await seller.executeAndStore(taskId);
// deliveryHash = PieceCID from Filecoin`,
  },
  {
    name: 'Enhanced Buyer',
    file: 'agents/src/filecoin/enhanced-buyer.js',
    description: 'Buyer agent that retrieves content from FOC via PieceCID, verifies against task requirements, then confirms delivery on-chain.',
    usage: `import { EnhancedBuyer } from './filecoin/enhanced-buyer.js';

const buyer = new EnhancedBuyer({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  filecoinKey: process.env.FILECOIN_PRIVATE_KEY,
});

// Retrieve and verify delivery from Filecoin
const content = await buyer.retrieveAndVerify(taskId, pieceCid);
// Returns parsed task result from Filecoin`,
  },
  {
    name: 'Storage Retrieval',
    file: 'agents/src/filecoin/client.js',
    description: 'Download stored content by PieceCID. Also supports balance checks and cost estimation.',
    usage: `// Retrieve content
const content = await storage.retrieve(pieceCid);
console.log(content.result); // Original task result

// Check balance
const balance = await storage.getBalance();
// { deposited: '100.00', token: 'tUSDFC' }

// Estimate costs
const cost = await storage.estimateCost(1024 * 1024); // 1 MB
// ~$0.000002/month at $2.50/TiB`,
  },
];

const TECH_STACK = [
  { label: 'SDK', value: '@filoz/synapse-sdk', detail: 'v0.40.0' },
  { label: 'Storage', value: 'Filecoin Onchain Cloud', detail: 'Warm storage + PDP' },
  { label: 'Network', value: 'Filecoin Calibration', detail: 'Testnet (Chain 314159)' },
  { label: 'Payment', value: 'USDFC', detail: 'Stablecoin for storage fees' },
  { label: 'Escrow Chain', value: 'Base Sepolia', detail: 'Chain 84532' },
  { label: 'Bridge', value: 'PieceCID', detail: 'Content identifier cross-chain' },
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
            Filecoin Integration
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
            href="https://docs.filoz.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0090FF',
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: '1px solid rgba(0, 144, 255, 0.3)',
              borderRadius: 6,
              background: 'rgba(0, 144, 255, 0.08)',
            }}
          >
            FOC Docs &uarr;
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

function StorageTypeCard({ item }: { item: typeof STORAGE_TYPES[0] }) {
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
            color: '#0090FF',
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

export default function FilecoinPage() {
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
            border: '1px solid rgba(0, 144, 255, 0.3)',
            borderRadius: 20,
            background: 'rgba(0, 144, 255, 0.08)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: '#0090FF', fontFamily: 'var(--font-mono)' }}>
              Filecoin Onchain Cloud Integration
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
            Agent Escrow + <span style={{ color: '#0090FF' }}>Filecoin On-Chain Cloud</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Autonomous decentralized storage for agent task results, memory snapshots, and TEE attestations.
            PieceCIDs bridge Filecoin storage and Base escrow — a complete verifiable audit trail for agent commerce.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {[
              { label: 'SDK', value: '@filoz/synapse-sdk' },
              { label: 'Version', value: 'v0.40.0' },
              { label: 'Storage', value: 'Filecoin Calibration' },
              { label: 'Escrow', value: 'Base Sepolia' },
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

        {/* Demo Status Banner */}
        <div style={{
          marginBottom: 32,
          padding: 20,
          background: 'rgba(255, 136, 0, 0.06)',
          border: '1px solid rgba(255, 136, 0, 0.25)',
          borderRadius: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}>
            <span style={{
              padding: '2px 8px',
              background: 'rgba(255, 136, 0, 0.15)',
              border: '1px solid rgba(255, 136, 0, 0.3)',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#FF8800',
            }}>
              SIMULATION MODE
            </span>
            <span style={{
              fontSize: 13,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              Integration Built — Awaiting Filecoin Funding
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 12px',
          }}>
            The full Filecoin Onchain Cloud integration is <span style={{ color: 'var(--text-primary)' }}>code-complete</span> — SDK wrapper, enhanced seller/buyer agents, demo script, and API endpoint are all built and tested.
            Currently running in <span style={{ color: '#FF8800' }}>simulation mode</span> which generates deterministic mock PieceCIDs for the full task lifecycle.
          </p>
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>To go live:</span>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, marginTop: 4 }}>
              <span>{'1.'} Fund deployer wallet with FIL (gas) + USDFC (storage fees) on Filecoin Calibration testnet</span>
              <span>{'2.'} Set <code style={{ color: '#0090FF', fontSize: 11, fontFamily: 'var(--font-mono)' }}>FILECOIN_PRIVATE_KEY</code> environment variable</span>
              <span>{'3.'} Run <code style={{ color: '#0090FF', fontSize: 11, fontFamily: 'var(--font-mono)' }}>node agents/src/filecoin/demo.js</code> — switches to real mode automatically</span>
            </div>
          </div>
        </div>

        {/* What is FOC */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="What is Filecoin Onchain Cloud?"
            subtitle="Hot storage on Filecoin with verifiable proofs — purpose-built for autonomous agents."
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
              Filecoin Onchain Cloud (FOC) provides <span style={{ color: 'var(--text-primary)' }}>warm, always-available storage on Filecoin</span> with
              Provable Data Possession (PDP) — cryptographic proof your data exists and is intact.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              Every piece of content gets a unique <span style={{ color: '#0090FF' }}>PieceCID</span> — a content-addressed identifier
              that serves as both a retrieval key and a verifiable fingerprint. We use PieceCIDs as
              <span style={{ color: '#A78BFA' }}> delivery hashes on-chain</span>, bridging Filecoin storage with Base escrow contracts.
            </p>
            <p style={{ margin: 0 }}>
              At <span style={{ color: '#34D399' }}>~$2.50/TiB/month</span>, FOC is orders of magnitude cheaper than IPFS pinning services.
              Agent task results average 1-5 KB each — meaning <span style={{ color: 'var(--text-primary)' }}>millions of deliveries for pennies</span>.
            </p>
          </div>
        </section>

        {/* Workflow */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="How It Works"
            subtitle="The full lifecycle from task execution to verifiable permanent storage."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Cross-Chain Architecture */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Cross-Chain Architecture"
            subtitle="PieceCID is the bridge between Filecoin storage and Base escrow."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, position: 'relative' as const }}>
            {/* Base Sepolia Card */}
            <div style={{
              padding: 24,
              background: 'var(--bg-card)',
              border: '1px solid #3B82F630',
              borderRadius: '12px 12px 0 0',
              position: 'relative' as const,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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
                  fontSize: 16,
                  color: 'var(--text-primary)',
                }}>
                  Base Sepolia
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
                  Chain 84532
                </span>
              </div>

              {/* Contract cards row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}>
                {[
                  { name: 'ServiceBoard', fns: ['postTask()', 'deliverTask(pieceCID)', 'claimTask()'], color: '#FF8800' },
                  { name: 'EscrowVault', fns: ['deposit()', 'release()', 'refund()'], color: '#3B82F6' },
                  { name: 'ReputationRegistry', fns: ['recordResult()', 'trustScore: 100'], color: '#A78BFA' },
                ].map(c => (
                  <div key={c.name} style={{
                    padding: 12,
                    background: 'var(--bg-main)',
                    border: `1px solid ${c.color}20`,
                    borderRadius: 8,
                    borderTop: `2px solid ${c.color}60`,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: c.color,
                      marginBottom: 8,
                    }}>
                      {c.name}
                    </div>
                    {c.fns.map(fn => (
                      <div key={fn} style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-tertiary)',
                        padding: '1px 0',
                      }}>
                        {fn}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Metadata badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {[
                  { label: 'deliveryHash = PieceCID', color: '#0090FF' },
                  { label: 'ERC-8004 Identity', color: '#A78BFA' },
                  { label: 'On-chain Escrow', color: '#34D399' },
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

            {/* PieceCID Bridge Strip */}
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
                background: 'linear-gradient(to right, transparent, #0090FF60, transparent)',
              }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                background: 'var(--bg-card)',
                border: '1px solid #0090FF30',
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 14 }}>&#x1F517;</span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: '#0090FF',
                }}>
                  PieceCID bridges both chains
                </span>
              </div>
              <div style={{
                flex: 1,
                height: 1,
                background: 'linear-gradient(to right, transparent, #0090FF60, transparent)',
              }} />
            </div>

            {/* Filecoin Calibration Card */}
            <div style={{
              padding: 24,
              background: 'var(--bg-card)',
              border: '1px solid #0090FF30',
              borderRadius: '0 0 12px 12px',
              position: 'relative' as const,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#0090FF',
                  boxShadow: '0 0 8px #0090FF60',
                }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: 'var(--text-primary)',
                }}>
                  Filecoin Calibration
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
                  Chain 314159
                </span>
              </div>

              {/* Filecoin component cards row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}>
                {[
                  { name: 'Synapse SDK', fns: ['upload()', 'download()', 'balance()'], color: '#0090FF' },
                  { name: 'Storage', fns: ['Warm tier', 'Always hot', '~$2.50/TiB'], color: '#34D399' },
                  { name: 'PDP Proofs', fns: ['Verifiable data', 'possession proofs', 'Cryptographic integrity'], color: '#A78BFA' },
                ].map(c => (
                  <div key={c.name} style={{
                    padding: 12,
                    background: 'var(--bg-main)',
                    border: `1px solid ${c.color}20`,
                    borderRadius: 8,
                    borderTop: `2px solid ${c.color}60`,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: c.color,
                      marginBottom: 8,
                    }}>
                      {c.name}
                    </div>
                    {c.fns.map(fn => (
                      <div key={fn} style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-tertiary)',
                        padding: '1px 0',
                      }}>
                        {fn}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Filecoin metadata badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {[
                  { label: 'USDFC Payments', color: '#0090FF' },
                  { label: 'Provable Data Possession', color: '#34D399' },
                  { label: 'Content-Addressed', color: '#FF8800' },
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
          </div>
        </section>

        {/* What Gets Stored */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="What Gets Stored"
            subtitle="Four categories of agent data that benefit from permanent, verifiable storage."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {STORAGE_TYPES.map(item => (
              <StorageTypeCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* SDK Reference */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Code & SDK"
            subtitle="Click any component to see usage code. All files are in the agentescrow repository."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {SDK_DETAILS.map(component => (
              <SdkCard key={component.name} component={component} />
            ))}
          </div>
        </section>

        {/* Demo Output */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Demo Output"
            subtitle="What the simulation demo produces — run it yourself with: npm run filecoin:demo"
          />
          <div style={{
            padding: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <pre style={{
              margin: 0,
              padding: 16,
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--text-secondary)',
              overflow: 'auto',
              lineHeight: 1.7,
              fontFamily: 'var(--font-mono)',
            }}>{`$ node agents/src/filecoin/demo.js

╔══════════════════════════════════════════════════════════════╗
║   AgentEscrow + Filecoin Onchain Cloud Demo                 ║
║   Mode: SIMULATION (no FILECOIN_PRIVATE_KEY set)            ║
╚══════════════════════════════════════════════════════════════╝

[Step 1/6] Store task delivery (text_summary)
  ✓ Stored on FOC → PieceCID: baga6ea4seaqsim_text_summary_42_1711065600000
  ✓ Metadata: taskId=42, type=text_summary, agent=0xC07b...96cC

[Step 2/6] Store code review delivery
  ✓ Stored on FOC → PieceCID: baga6ea4seaqsim_code_review_43_1711065600000
  ✓ Metadata: taskId=43, type=code_review, agent=0xC07b...96cC

[Step 3/6] Store agent memory snapshot
  ✓ Stored on FOC → PieceCID: baga6ea4seaqsim_agent_memory_0_1711065600000
  ✓ Type: agent_memory (session state backup)

[Step 4/6] Store Venice TEE attestation
  ✓ Stored on FOC → PieceCID: baga6ea4seaqsim_tee_attestation_0_1711065600000
  ✓ TEE model: tee-deepseek-r1-671b, provider: venice.ai

[Step 5/6] Retrieve and verify content
  ✓ Retrieved content for PieceCID: baga6ea4seaqsim_text_summary_42_...
  ✓ Verified: taskId=42, type=text_summary ✓

[Step 6/6] Cost estimation
  ✓ 1 MB storage: ~$0.000002/month ($2.50/TiB)
  ✓ 1000 task deliveries (~5 KB each): ~$0.00001/month

═══════════════════════════════════════════════════════════════
  Demo complete. 4 items stored, 1 retrieved, costs estimated.
  Set FILECOIN_PRIVATE_KEY to run against real Filecoin network.
═══════════════════════════════════════════════════════════════`}</pre>
          </div>
          <p style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            Simulation mode generates deterministic PieceCIDs prefixed with &quot;baga6ea4seaqsim_&quot;.
            Real mode uses actual Filecoin storage via Synapse SDK and returns real content-addressed PieceCIDs.
          </p>
        </section>

        {/* Quick Start */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Quick Start"
            subtitle="Get Filecoin storage running in your agent workflow."
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
                code: 'npm install @filoz/synapse-sdk viem',
              },
              {
                step: '2',
                title: 'Run the demo (simulation mode)',
                code: 'node agents/src/filecoin/demo.js\n# Works without any API keys — full 6-step demo in simulation',
              },
              {
                step: '3',
                title: 'Run with real Filecoin storage',
                code: '# Add your key to .env — never pass private keys inline\n# FILECOIN_PRIVATE_KEY=<your-key>\nsource .env && node agents/src/filecoin/demo.js\n# Fund wallet with FIL + USDFC on Filecoin Calibration testnet',
              },
              {
                step: '4',
                title: 'Use in your agent',
                code: `import { AgentStorage } from './filecoin/client.js';

const storage = new AgentStorage({
  privateKey: process.env.FILECOIN_PRIVATE_KEY,
});

// Store task result
const receipt = await storage.storeDelivery({
  taskId: 42,
  taskType: 'text_summary',
  result: 'The summary...',
  agentAddress: '0xC07b...',
});

// Use receipt.pieceCid as deliveryHash on-chain`,
              },
            ].map((item, i) => (
              <div key={item.step} style={{
                padding: 16,
                borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
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
                    background: 'rgba(0, 144, 255, 0.08)',
                    border: '1px solid rgba(0, 144, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0090FF',
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

        {/* Tech Stack */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Technical Stack"
          />
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

        {/* Data Format */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Storage Payload Format"
            subtitle="Every item stored on Filecoin follows this structured JSON schema."
          />
          <div style={{
            padding: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <pre style={{
              margin: 0,
              padding: 16,
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--text-secondary)',
              overflow: 'auto',
              lineHeight: 1.7,
              fontFamily: 'var(--font-mono)',
            }}>{`{
  "version": "1.0",
  "protocol": "agentescrow",
  "type": "task_delivery",
  "timestamp": "2026-03-22T00:00:00.000Z",
  "taskId": 42,
  "taskType": "text_summary",
  "result": "Summary content...",
  "agent": {
    "address": "0xC07b695eC19DE38f1e62e825585B2818077B96cC",
    "erc8004Id": "2195"
  },
  "attestation": {
    "model": "tee-deepseek-r1-671b",
    "provider": "venice.ai",
    "requestId": "req_abc123",
    "enclave": "TEE"
  },
  "chain": {
    "escrowChain": "base-sepolia",
    "storageChain": "filecoin-calibration"
  }
}`}</pre>
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
              { label: 'Synapse SDK', url: 'https://github.com/filoz/synapse-sdk', icon: '📦' },
              { label: 'FOC Documentation', url: 'https://docs.filoz.org/', icon: '📖' },
              { label: 'Filecoin Explorer', url: 'https://filfox.info/', icon: '🔍' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '🏗️' },
              { label: 'USDFC Info', url: 'https://www.circle.com/usdc', icon: '💰' },
              { label: 'Base Sepolia Scanner', url: 'https://sepolia.basescan.org/', icon: '🔗' },
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
            AgentEscrow x Filecoin Onchain Cloud
          </p>
        </div>
      </main>
    </div>
  );
}
