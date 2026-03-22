'use client';

import { useState } from 'react';
import Link from 'next/link';

// --- Data ---------------------------------------------------------------

const VENICE_ACCENT = '#A855F7';

const PRIVACY_TIERS = [
  {
    title: 'Standard',
    description: 'Venice-controlled GPUs, zero data retention, contractual privacy. Prompts and outputs never stored or used for training.',
    icon: '🔒',
    color: '#A78BFA',
    features: ['Zero data retention', 'Contractual privacy', 'Venice-controlled GPUs'],
  },
  {
    title: 'TEE',
    description: 'Intel TDX / NVIDIA H100 enclaves via Phala/NEAR. Hardware-level isolation with remote attestation — not even Venice can see your data.',
    icon: '🛡️',
    color: '#A855F7',
    features: ['Hardware isolation', 'Remote attestation', 'Intel TDX / NVIDIA H100'],
  },
  {
    title: 'E2EE',
    description: 'Client-side encryption, TEE decryption, re-encryption of output. Verifiable end-to-end privacy with attestation + signatures.',
    icon: '🔐',
    color: '#7C3AED',
    features: ['Client-side encryption', 'TEE decryption + re-encryption', 'Attestation + signatures'],
  },
];

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Agent Receives Task from ServiceBoard',
    description: 'A seller agent picks up a posted task from the on-chain ServiceBoard contract. The task details and payment are locked in escrow.',
    icon: '📋',
    color: '#A78BFA',
  },
  {
    num: '02',
    title: 'Task Sent to Venice TEE for Private Evaluation',
    description: 'The agent sends the task to Venice AI for private evaluation inside a Trusted Execution Environment. Strategy and reasoning remain completely hidden.',
    icon: '🛡️',
    color: '#A855F7',
  },
  {
    num: '03',
    title: 'Venice Returns Decision + Cryptographic Attestation',
    description: 'Venice returns the inference result along with a cryptographic attestation proving the computation happened inside a genuine TEE enclave.',
    icon: '📜',
    color: '#7C3AED',
  },
  {
    num: '04',
    title: 'Agent Executes Work via TEE Inference',
    description: 'The agent executes the actual task work using Venice TEE inference. All reasoning happens inside the enclave — private, verifiable, and tamper-proof.',
    icon: '⚡',
    color: '#6D28D9',
  },
  {
    num: '05',
    title: 'Attestation Hash Stored On-Chain with Delivery',
    description: 'The attestation hash is submitted alongside the delivery to ServiceBoard on Base Sepolia. Buyers can verify the computation was honest before confirming.',
    icon: '🔗',
    color: '#5B21B6',
  },
];

const INTEGRATION_POINTS = [
  {
    title: 'Private Task Evaluation',
    description: 'Seller evaluates tasks inside a TEE — strategy, pricing logic, and decision-making stay completely hidden from competitors and the network.',
    icon: '🤖',
    color: '#A855F7',
  },
  {
    title: 'Private Quality Verification',
    description: 'Buyer checks delivery quality privately using Venice TEE inference. Verification criteria and quality thresholds remain confidential.',
    icon: '✅',
    color: '#7C3AED',
  },
  {
    title: 'Private Task Generation',
    description: 'Generate detailed task specifications privately, posting only the minimum required information on-chain. Full specs stay encrypted.',
    icon: '📝',
    color: '#6D28D9',
  },
  {
    title: 'Attestation-Backed Delivery',
    description: 'Every delivery includes cryptographic proof of honest computation. Attestation records are verifiable on-chain and stored permanently.',
    icon: '🔏',
    color: '#5B21B6',
  },
];

const TECH_DETAILS = [
  { label: 'API Endpoint', value: 'https://api.venice.ai/api/v1', detail: 'OpenAI-compatible' },
  { label: 'TEE Model (Reasoning)', value: 'tee-deepseek-r1-671b', detail: 'Deep reasoning' },
  { label: 'TEE Model (General)', value: 'tee-qwen-2.5-vl-72b', detail: 'General purpose' },
  { label: 'TEE Model (Fast)', value: 'tee-llama-3.3-70b', detail: 'Low latency' },
  { label: 'Attestation', value: 'GET /api/v1/tee/attestation', detail: 'Cryptographic proof' },
  { label: 'Key Provisioning', value: 'VVV token staking', detail: 'Autonomous access' },
];

const FILE_LIST = [
  { file: 'agents/src/venice/client.js', description: 'Venice API client (TEE/E2EE, attestation)' },
  { file: 'agents/src/venice/attestation.js', description: 'Attestation record creation + verification' },
  { file: 'agents/src/venice/enhanced-seller.js', description: 'Seller with private eval + execution' },
  { file: 'agents/src/venice/enhanced-buyer.js', description: 'Buyer with private verification' },
  { file: 'agents/src/venice/demo.js', description: 'Full demo (simulation without key, real TEE with key)' },
];

const CODE_EXAMPLE = `import { VeniceClient } from './venice/client.js';

const venice = new VeniceClient({
  apiKey: process.env.VENICE_API_KEY,
  privacyLevel: 'tee', // 'standard' | 'tee' | 'e2ee'
});

// Private task evaluation inside TEE
const evaluation = await venice.chat({
  model: 'tee-deepseek-r1-671b',
  messages: [
    { role: 'system', content: 'Evaluate this task for profitability and feasibility.' },
    { role: 'user', content: JSON.stringify(taskDetails) },
  ],
});

// Get cryptographic attestation
const attestation = await venice.getAttestation(evaluation.requestId);

console.log(attestation);
// {
//   model: 'tee-deepseek-r1-671b',
//   enclave: 'TEE',
//   requestId: 'req_abc123',
//   attestationHash: '0x7f3a...',
//   timestamp: '2026-03-21T...',
// }`;

// --- Components ---------------------------------------------------------

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
            Venice AI Integration
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
            href="https://docs.venice.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: VENICE_ACCENT,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: `1px solid rgba(168, 85, 247, 0.3)`,
              borderRadius: 6,
              background: 'rgba(168, 85, 247, 0.08)',
            }}
          >
            Venice Docs &uarr;
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

function PrivacyTierCard({ tier }: { tier: typeof PRIVACY_TIERS[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 20,
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? tier.color + '40' : 'var(--border)'}`,
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
        background: tier.color + '10',
        borderRadius: 8,
        border: `1px solid ${tier.color}20`,
      }}>
        {tier.icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 14,
        color: 'var(--text-primary)',
        marginBottom: 6,
      }}>
        {tier.title}
      </div>
      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: '0 0 10px',
      }}>
        {tier.description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
        {tier.features.map(f => (
          <div key={f} style={{
            fontSize: 11,
            color: tier.color,
            fontFamily: 'var(--font-mono)',
          }}>
            + {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({ item }: { item: typeof INTEGRATION_POINTS[0] }) {
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

// --- Main Page ----------------------------------------------------------

export default function VenicePage() {
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
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 20,
            background: 'rgba(168, 85, 247, 0.08)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: VENICE_ACCENT, fontFamily: 'var(--font-mono)' }}>
              Venice AI Bounty
            </span>
            <span style={{ fontSize: 12, color: VENICE_ACCENT, fontWeight: 700 }}>~$11,500 VVV</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
            lineHeight: 1.2,
          }}>
            Venice AI + AgentEscrow
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Privacy-preserving cognition for autonomous agents. Venice provides TEE and E2EE AI inference
            so AgentEscrow agents can think privately, act verifiably, and prove honest computation on-chain.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {[
              { label: 'API', value: 'OpenAI-compatible' },
              { label: 'Privacy', value: 'TEE + E2EE' },
              { label: 'Attestation', value: 'Cryptographic' },
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

        {/* Overview */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Privacy-Preserving AI Inference"
            subtitle="Venice AI brings hardware-enforced privacy to agent cognition — from evaluation to execution."
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
              Venice AI provides <span style={{ color: 'var(--text-primary)' }}>Trusted Execution Environment (TEE)</span> and
              <span style={{ color: VENICE_ACCENT }}> End-to-End Encrypted (E2EE)</span> AI inference for AgentEscrow agents.
              Agent reasoning happens inside hardware enclaves — not even Venice can see the data.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              Every inference returns a <span style={{ color: VENICE_ACCENT }}>cryptographic attestation</span> proving
              computation happened inside a genuine TEE. These attestation hashes are stored on-chain alongside task deliveries,
              creating a <span style={{ color: 'var(--text-primary)' }}>verifiable proof of honest computation</span>.
            </p>
            <p style={{ margin: 0 }}>
              The Venice API is <span style={{ color: '#A78BFA' }}>OpenAI-compatible</span>, making integration straightforward.
              Agents get privacy-preserving cognition with minimal code changes — swap the endpoint, pick a TEE model,
              and every inference is automatically attested.
            </p>
          </div>
        </section>

        {/* Privacy Tiers */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Privacy Tiers"
            subtitle="Three levels of privacy — from contractual guarantees to hardware-enforced end-to-end encryption."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 12,
          }}>
            {PRIVACY_TIERS.map(tier => (
              <PrivacyTierCard key={tier.title} tier={tier} />
            ))}
          </div>
        </section>

        {/* Architecture Flow */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Architecture Flow"
            subtitle="How Venice TEE inference integrates with the AgentEscrow task lifecycle."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Integration Points */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Points"
            subtitle="Four key areas where Venice privacy-preserving inference enhances AgentEscrow."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {INTEGRATION_POINTS.map(item => (
              <IntegrationCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Technical Details */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Technical Details"
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {TECH_DETAILS.map(item => (
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
                  wordBreak: 'break-all' as const,
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

        {/* Code Example */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Code Example"
            subtitle="Venice client usage with TEE inference and attestation retrieval."
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
            }}>
              {CODE_EXAMPLE}
            </pre>
          </div>
        </section>

        {/* What We Built */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="What We Built"
            subtitle="All Venice integration files in the AgentEscrow repository."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {FILE_LIST.map(item => (
              <div key={item.file} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: VENICE_ACCENT,
                  fontWeight: 600,
                  flexShrink: 0,
                  minWidth: 280,
                }}>
                  {item.file}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bounty Track */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader title="Bounty Track" />
          <div style={{
            padding: 20,
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), transparent)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
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
                  Private Agents, Trusted Actions
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                }}>
                  Venice AI &mdash; Synthesis Hackathon
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 28,
                color: VENICE_ACCENT,
              }}>
                ~$11,500
              </div>
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: 16,
            }}>
              Build AI agents that leverage Venice&apos;s privacy-preserving inference for autonomous decision-making.
              AgentEscrow uses TEE inference for private task evaluation, quality verification, and attestation-backed
              deliveries &mdash; proving honest computation on-chain with cryptographic guarantees.
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {[
                { label: 'Track', value: 'Venice AI', color: '#A855F7' },
                { label: 'Prize', value: 'VVV tokens', color: '#7C3AED' },
                { label: 'Status', value: 'Built & Targeting', color: '#6D28D9' },
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
              { label: 'Venice Docs', url: 'https://docs.venice.ai', icon: '📖' },
              { label: 'Venice API', url: 'https://api.venice.ai', icon: '🔌' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '🏗️' },
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
            Built for The Synthesis Hackathon &mdash; AgentEscrow x Venice AI
          </p>
        </div>
      </main>
    </div>
  );
}
