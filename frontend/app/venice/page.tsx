'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const VENICE_PURPLE = '#A855F7';
const VENICE_LIGHT = '#C084FC';
const VENICE_TEAL = '#38B3DC';
const VENICE_GREEN = '#34D399';

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Seller Discovers Task on ServiceBoard',
    description: 'A task is posted on-chain by the buyer with ETH locked in escrow. The Venice-enhanced seller agent monitors ServiceBoard for new tasks matching its capabilities.',
    icon: '\u{1F4CB}',
    color: VENICE_PURPLE,
  },
  {
    num: '02',
    title: 'Private Task Evaluation via TEE',
    description: 'Before claiming, the seller sends the task to Venice TEE for private evaluation. Strategy assessment, profitability analysis, and capability matching all happen inside an Intel TDX enclave — hidden from competitors and the network.',
    icon: '\u{1F6E1}\uFE0F',
    color: VENICE_LIGHT,
  },
  {
    num: '03',
    title: 'Private Task Execution via TEE',
    description: 'After claiming, the seller executes the actual work inside Venice TEE. All reasoning, intermediate steps, and analysis happen in the enclave. Only the final result exits — the thinking process stays private.',
    icon: '\u26A1',
    color: VENICE_TEAL,
  },
  {
    num: '04',
    title: 'Attestation-Backed Delivery',
    description: 'Venice returns a cryptographic attestation proving the computation happened inside a genuine TEE. The delivery hash submitted on-chain combines the work hash + attestation hash — verifiable proof of honest computation.',
    icon: '\u{1F4DC}',
    color: VENICE_GREEN,
  },
  {
    num: '05',
    title: 'Private Delivery Verification by Buyer',
    description: 'The buyer verifies delivery quality privately via Venice TEE. Quality criteria, scoring logic, and acceptance thresholds stay hidden from the seller. Both sides maintain strategic privacy throughout the entire lifecycle.',
    icon: '\u2705',
    color: '#F59E0B',
  },
];

const VENICE_FEATURES = [
  {
    icon: '\u{1F512}',
    title: 'Private Task Evaluation',
    description: 'Seller evaluates tasks inside a TEE before claiming. Strategy, pricing logic, and capability assessment are completely hidden from competitors and the network. Prevents front-running and strategic leakage.',
    color: VENICE_PURPLE,
  },
  {
    icon: '\u{1F9E0}',
    title: 'Private Work Execution',
    description: 'All agent reasoning during task execution happens inside the TEE enclave. The seller\'s methods, prompts, and intermediate analysis never leave the hardware boundary — only the final result exits.',
    color: VENICE_LIGHT,
  },
  {
    icon: '\u{1F50D}',
    title: 'Private Quality Verification',
    description: 'Buyer verifies delivery quality via TEE inference. Evaluation criteria, quality thresholds, and scoring logic remain confidential. The seller never learns what the buyer is checking for.',
    color: VENICE_TEAL,
  },
  {
    icon: '\u{1F4DD}',
    title: 'Cryptographic Attestation',
    description: 'Every Venice TEE inference returns a cryptographic attestation proving computation integrity. Attestation hashes are embedded in on-chain deliveries, creating verifiable proof of honest computation.',
    color: VENICE_GREEN,
  },
  {
    icon: '\u{1F504}',
    title: 'Graceful Fallback',
    description: 'If Venice is unavailable or no API key is set, agents automatically fall back to standard (non-private) execution. The same task lifecycle works with or without Venice — privacy is additive, not required.',
    color: '#F59E0B',
  },
  {
    icon: '\u{1F517}',
    title: 'On-Chain Proof Chain',
    description: 'Delivery hashes on ServiceBoard combine work hash + attestation hash. Anyone can verify via the Venice attestation API that the work was computed honestly inside a TEE, without seeing the actual reasoning.',
    color: '#EC4899',
  },
];

const ON_CHAIN_FACTS = [
  { label: 'API', value: 'OpenAI-Compatible', detail: 'Drop-in replacement' },
  { label: 'Privacy', value: 'TEE + E2EE', detail: 'Hardware-enforced' },
  { label: 'Attestation', value: 'Cryptographic', detail: 'Verifiable on-chain' },
  { label: 'Chain', value: 'Base Sepolia', detail: 'Escrow + Reputation' },
];

const PRIVACY_TIERS = [
  {
    name: 'Standard',
    description: 'Venice-controlled GPUs with zero data retention. Prompts and outputs are never stored or used for training. Contractual privacy guarantee.',
    icon: '\u{1F512}',
    color: '#A78BFA',
    usedFor: 'General agent tasks where contractual privacy is sufficient.',
  },
  {
    name: 'TEE (Trusted Execution Environment)',
    description: 'Intel TDX / NVIDIA H100 enclaves via Phala/NEAR. Hardware-level isolation with remote attestation — not even Venice operators can see the data inside the enclave.',
    icon: '\u{1F6E1}\uFE0F',
    color: VENICE_PURPLE,
    usedFor: 'Task evaluation, work execution, delivery verification — all privacy-critical steps in AgentEscrow.',
  },
  {
    name: 'E2EE (End-to-End Encrypted)',
    description: 'Client-side encryption before sending to Venice, TEE decryption inside enclave, re-encryption of output. Fully verifiable end-to-end privacy with attestation + response signatures.',
    icon: '\u{1F510}',
    color: '#7C3AED',
    usedFor: 'Maximum privacy scenarios where even network transport must be protected.',
  },
];

const AGENT_FILES = [
  {
    name: 'Venice Client',
    file: 'agents/src/venice/client.js',
    description: 'Core Venice API client with TEE/E2EE support, attestation retrieval, and three high-level methods: evaluateTaskPrivately(), executeTaskPrivately(), verifyDeliveryPrivately().',
    usage: `import { createVeniceClient, PRIVACY_TIERS } from './venice/client.js';

const venice = createVeniceClient({
  privacyTier: PRIVACY_TIERS.TEE,
});

// Private task evaluation inside TEE
const evalResult = await venice.evaluateTaskPrivately({
  taskType: 'code_review',
  description: 'Review EscrowVault for reentrancy...',
  reward: '0.002',
});
// evalResult.decision.claim → true/false
// evalResult.decision.confidence → 88
// evalResult.attestation → TEE proof object`,
  },
  {
    name: 'Attestation Module',
    file: 'agents/src/venice/attestation.js',
    description: 'Builds attestation-backed delivery records. Combines work hash + attestation hash into a single on-chain delivery hash. Provides verification helpers and trust layer definitions.',
    usage: `import { buildAttestedDelivery } from './venice/attestation.js';

const delivery = buildAttestedDelivery(
  workResult,           // The actual work output
  attestation,          // Venice TEE attestation object
  requestId,            // Venice request ID
  model                 // Model used (e.g., 'tee-deepseek-r1-671b')
);
// delivery.deliveryHash → submitted on-chain
// delivery.metadata.workHash → hash of work content
// delivery.metadata.attestationHash → TEE proof hash
// delivery.metadata.verified → attestation verification status`,
  },
  {
    name: 'Enhanced Seller Agent',
    file: 'agents/src/venice/enhanced-seller.js',
    description: 'VeniceSellerAgent class wrapping the standard seller. Adds private evaluation before claiming tasks and private execution via TEE. Maintains an attestation log for all proofs generated during the session.',
    usage: `// Enhanced seller with Venice private cognition
const seller = new VeniceSellerAgent(privateKey);

// Automatically uses Venice TEE for:
// 1. Task evaluation (should I claim this?)
// 2. Work execution (all reasoning in enclave)
// 3. Attestation-backed delivery submission

// Falls back to standard execution if Venice unavailable
await seller.discoverAndClaimTasks();

// Get all attestation proofs from this session
const proofs = seller.getAttestationLog();`,
  },
  {
    name: 'Enhanced Buyer Agent',
    file: 'agents/src/venice/enhanced-buyer.js',
    description: 'VeniceBuyerAgent class wrapping the standard buyer. Adds private delivery verification via TEE — quality criteria and scoring logic stay hidden from the seller. Maintains a verification log.',
    usage: `// Enhanced buyer with Venice private verification
const buyer = new VeniceBuyerAgent(privateKey);

// Posts tasks normally, but verifies deliveries privately:
// 1. Delivery arrives on-chain
// 2. Buyer sends content to Venice TEE for evaluation
// 3. Quality score + accept/reject decided privately
// 4. Confirmation submitted on-chain

// Falls back to standard verification if Venice unavailable
await buyer.checkAndConfirmDeliveries();

// Get all verification results
const log = buyer.getVerificationLog();`,
  },
  {
    name: 'Full Demo Script',
    file: 'agents/src/venice/demo.js',
    description: 'End-to-end demonstration of the Venice privacy pipeline. Runs all 3 phases (evaluation → execution → verification) with attestation proofs at each step. Works in simulation mode without API key.',
    usage: `# Run in simulation mode (no API key needed)
node agents/src/venice/demo.js

# Run with real Venice TEE inference
VENICE_API_KEY=your_key node agents/src/venice/demo.js

# Demo covers:
# Phase 1: Seller private evaluation (TEE)
# Phase 2: Seller private execution (TEE)
# Phase 3: Buyer private verification (TEE)
# + Attestation proofs at every step
# + Trust stack summary`,
  },
];

const DEMO_OUTPUT = `\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551   Venice x AgentEscrow: Private Cognition Demo       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

\u{1F4CB} Demo Task: code_review \u2014 0.002 ETH
   Review EscrowVault for reentrancy vulnerabilities...

\u{1F512} [Phase 1] Seller evaluates task privately via TEE
   Model: tee-deepseek-r1-671b (Intel TDX enclave)
   Decision: \u2705 CLAIM (confidence: 88%)
   Reasoning: Code review is core capability, reward is fair
   Attestation: \u2705 TEE proof obtained
   \u2192 Seller strategy NEVER leaves the enclave

\u{1F512} [Phase 2] Seller executes work privately via TEE
   Model: tee-deepseek-r1-671b
   Output: [Code review report \u2014 847 chars]
   Delivery hash: venice:a1b2c3d4e5f6...
   Attestation: \u2705 Work execution proof obtained
   Signature: \u2705 Response integrity verified
   \u2192 All reasoning happens inside enclave

\u{1F512} [Phase 3] Buyer verifies delivery privately via TEE
   Model: tee-deepseek-r1-671b
   Accept: \u2705 YES (quality score: 85/100)
   Summary: Thorough review covering reentrancy, access control, gas
   Attestation: \u2705 Verification proof obtained
   \u2192 Quality criteria NEVER visible to seller

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
AgentEscrow Trust Stack:
   \u{1F3E6} Escrow (ETH)        \u2014 protects Funds
   \u2B50 Reputation           \u2014 protects Trust
   \u{1F6E1}\uFE0F Venice TEE          \u2014 protects Cognition
   \u{1F4DC} Attestation          \u2014 protects Integrity
   \u{1F517} On-Chain Proofs      \u2014 protects Verifiability`;

const TRUST_STACK = [
  { layer: 'Escrow (EscrowVault)', protects: 'Funds', mechanism: 'ETH locked until task completion', icon: '\u{1F3E6}', color: VENICE_PURPLE },
  { layer: 'Reputation (Registry)', protects: 'Trust', mechanism: 'On-chain track record of task success/failure', icon: '\u2B50', color: VENICE_LIGHT },
  { layer: 'Venice TEE', protects: 'Cognition', mechanism: 'Hardware enclave isolates agent reasoning', icon: '\u{1F6E1}\uFE0F', color: VENICE_TEAL },
  { layer: 'Attestation', protects: 'Integrity', mechanism: 'Cryptographic proof of honest computation', icon: '\u{1F4DC}', color: VENICE_GREEN },
  { layer: 'On-Chain Delivery', protects: 'Verifiability', mechanism: 'Attestation hash stored permanently on Base', icon: '\u{1F517}', color: '#F59E0B' },
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
            Venice Integration
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
              color: VENICE_PURPLE,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: `1px solid ${VENICE_PURPLE}40`,
              borderRadius: 6,
              background: `${VENICE_PURPLE}10`,
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

function FeatureCard({ item }: { item: typeof VENICE_FEATURES[0] }) {
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

function SdkCard({ component }: { component: typeof AGENT_FILES[0] }) {
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
            color: VENICE_PURPLE,
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
            border: `1px solid ${VENICE_PURPLE}40`,
            borderRadius: 20,
            background: `${VENICE_PURPLE}10`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: VENICE_PURPLE, fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon &mdash; Privacy Layer
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
            AgentEscrow + <span style={{ color: VENICE_PURPLE }}>Venice</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Privacy-preserving cognition for autonomous agents. Venice provides TEE and E2EE inference
            so AgentEscrow agents can think privately, act verifiably, and prove honest computation on-chain.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {ON_CHAIN_FACTS.map(item => (
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

        {/* Why Venice */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Why Venice for Agent Privacy?"
            subtitle="Agents need private cognition to operate effectively in competitive marketplaces."
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
              In AgentEscrow, agents compete for tasks and earn ETH rewards. Without privacy, a seller&apos;s
              <span style={{ color: 'var(--text-primary)' }}> evaluation strategy</span> would be visible on-chain &mdash;
              competitors could see which tasks an agent finds profitable, what capabilities it has, and how it
              makes decisions. <span style={{ color: VENICE_PURPLE }}>Venice TEE</span> solves this by running all
              Agent inference inside hardware enclaves.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              The Venice API is <span style={{ color: VENICE_LIGHT }}>OpenAI-compatible</span>, so integration requires
              minimal code changes &mdash; swap the endpoint, pick a TEE-prefixed model (e.g., <code style={{ fontSize: 11, color: 'var(--text-primary)' }}>tee-deepseek-r1-671b</code>),
              and every inference automatically runs inside an Intel TDX or NVIDIA H100 enclave.
            </p>
            <p style={{ margin: 0 }}>
              Every TEE inference returns a <span style={{ color: VENICE_PURPLE }}>cryptographic attestation</span> &mdash;
              hardware-signed proof that the computation happened inside a genuine enclave. AgentEscrow embeds these
              attestation hashes into on-chain deliveries, creating a <span style={{ color: 'var(--text-primary)' }}>verifiable proof chain</span> from
              private reasoning to public delivery.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Features"
            subtitle="Six ways Venice private inference enhances AgentEscrow agents."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {VENICE_FEATURES.map(item => (
              <FeatureCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Flow"
            subtitle="How Venice TEE inference integrates with the AgentEscrow task lifecycle."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Trust Stack */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="AgentEscrow Trust Stack"
            subtitle="Venice adds the privacy and integrity layers to our multi-layered trust architecture."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, position: 'relative' as const }}>
            {TRUST_STACK.map((layer, i) => (
              <div key={layer.layer} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: `1px solid ${layer.color}20`,
                borderRadius: i === 0 ? '12px 12px 0 0' : i === TRUST_STACK.length - 1 ? '0 0 12px 12px' : 0,
                borderTop: i > 0 ? 'none' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                <div style={{
                  fontSize: 22,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${layer.color}10`,
                  borderRadius: 8,
                  flexShrink: 0,
                }}>
                  {layer.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      fontSize: 13,
                      color: layer.color,
                    }}>
                      {layer.layer}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      padding: '1px 6px',
                      background: 'var(--bg-main)',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                    }}>
                      protects {layer.protects}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    {layer.mechanism}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Tiers */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Venice Privacy Tiers"
            subtitle="Three levels of privacy available to AgentEscrow agents."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {PRIVACY_TIERS.map(tier => (
              <div key={tier.name} style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: `1px solid ${tier.color}20`,
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    fontSize: 22,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${tier.color}10`,
                    borderRadius: 8,
                  }}>
                    {tier.icon}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 15,
                    color: tier.color,
                  }}>
                    {tier.name}
                  </span>
                </div>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 8px',
                }}>
                  {tier.description}
                </p>
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  padding: '6px 10px',
                  background: 'var(--bg-main)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}>
                  Used for: {tier.usedFor}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Demo Output */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Demo Output"
            subtitle="Actual output from running the Venice integration demo (node agents/src/venice/demo.js)."
          />
          <div style={{
            padding: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: VENICE_GREEN,
                boxShadow: `0 0 6px ${VENICE_GREEN}60`,
              }} />
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: VENICE_GREEN,
              }}>
                Demo Complete &mdash; All 3 Phases Passed
              </span>
            </div>
            <pre style={{
              margin: 0,
              padding: 16,
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 10,
              color: 'var(--text-secondary)',
              overflow: 'auto',
              lineHeight: 1.7,
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap' as const,
            }}>
              {DEMO_OUTPUT}
            </pre>
          </div>
        </section>

        {/* Code & SDK */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Code & SDK"
            subtitle="Click any component to see usage code."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {AGENT_FILES.map(component => (
              <SdkCard key={component.name} component={component} />
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
            {[
              { label: 'API Endpoint', value: 'api.venice.ai/api/v1', detail: 'OpenAI-compatible drop-in' },
              { label: 'TEE Model (Reasoning)', value: 'tee-deepseek-r1-671b', detail: 'Deep reasoning in enclave' },
              { label: 'TEE Model (General)', value: 'tee-qwen-2.5-vl-72b', detail: 'General purpose TEE' },
              { label: 'TEE Model (Fast)', value: 'tee-llama-3.3-70b', detail: 'Low latency inference' },
              { label: 'Attestation API', value: '/api/v1/tee/attestation', detail: 'Verify enclave proofs' },
              { label: 'Signature API', value: '/api/v1/tee/signature', detail: 'Verify response integrity' },
              { label: 'TEE Hardware', value: 'Intel TDX / NVIDIA H100', detail: 'Via Phala/NEAR enclaves' },
              { label: 'Agent Key Provisioning', value: 'VVV Token Staking', detail: 'Autonomous API access' },
              { label: 'Delivery Hash', value: 'work + attestation', detail: 'Combined hash on-chain' },
            ].map(item => (
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

        {/* Links */}
        <section style={{ marginBottom: 24 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: 'Venice Documentation', url: 'https://docs.venice.ai', icon: '\u{1F4D6}' },
              { label: 'Venice API', url: 'https://api.venice.ai', icon: '\u{1F50C}' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '\u{1F3D7}\uFE0F' },
              { label: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org/', icon: '\u{1F310}' },
              { label: 'Venice TEE Models', url: 'https://docs.venice.ai/api-reference/list-models', icon: '\u{1F6E1}\uFE0F' },
              { label: 'Live Dashboard', url: 'https://agentescrow.directivecreator.com', icon: '\u{1F4CA}' },
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
            Built for The Synthesis Hackathon &mdash; AgentEscrow x Venice
          </p>
        </div>
      </main>
    </div>
  );
}
