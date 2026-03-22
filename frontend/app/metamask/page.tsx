'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const DELEGATION_LIFECYCLE = [
  {
    num: '01',
    title: 'Smart Account Creation',
    description: 'Human and agent EOAs are wrapped in HybridDeleGator smart accounts via MetaMask Delegation Toolkit. Addresses are counterfactual — deterministic from key + salt, deployed on first use.',
    icon: '🔐',
    color: '#F6851B',
  },
  {
    num: '02',
    title: 'Spending Delegation',
    description: 'Human signs an EIP-712 delegation granting the Buyer Agent scoped authority: call postTask() on ServiceBoard only, max 0.005 ETH per task, 0.02 ETH total budget, 10 calls max, 24h expiry.',
    icon: '💰',
    color: '#38B3DC',
  },
  {
    num: '03',
    title: 'Confirmation Delegation',
    description: 'Human signs a second delegation granting the Buyer Agent authority to call confirmDelivery() — limited to 10 confirmations, 24h window. No ETH value allowed.',
    icon: '✅',
    color: '#34D399',
  },
  {
    num: '04',
    title: 'Re-Delegation Chain',
    description: 'Buyer Agent re-delegates confirmDelivery authority to a Mediator Agent, creating a 2-link chain: Human → Buyer → Mediator. The mediator gets narrower limits (5 calls, 12h). Delegations can only narrow, never widen.',
    icon: '🔗',
    color: '#A78BFA',
  },
  {
    num: '05',
    title: 'Autonomous Redemption',
    description: 'Agents redeem delegations to execute ServiceBoard calls. The DelegationManager validates all signatures + caveats, then executes via the delegator\'s smart account — so msg.sender = Human\'s address. Transparent to contracts.',
    icon: '🤖',
    color: '#FBBF24',
  },
];

const ENFORCER_CONTRACTS = [
  {
    name: 'AllowedTargetsEnforcer',
    description: 'Restricts which contract addresses the delegation can call. We lock it to ServiceBoard only.',
    scope: 'Target',
    color: '#F6851B',
  },
  {
    name: 'AllowedMethodsEnforcer',
    description: 'Restricts which function selectors can be called. postTask() for spending, confirmDelivery() for confirmations.',
    scope: 'Function',
    color: '#38B3DC',
  },
  {
    name: 'ValueLteEnforcer',
    description: 'Caps the ETH value per individual call. Prevents any single task from exceeding 0.005 ETH.',
    scope: 'Per-call',
    color: '#34D399',
  },
  {
    name: 'NativeTokenTransferAmountEnforcer',
    description: 'Caps total ETH transferred across ALL calls. Enforces the 0.02 ETH total spending budget.',
    scope: 'Cumulative',
    color: '#FBBF24',
  },
  {
    name: 'LimitedCallsEnforcer',
    description: 'Limits the total number of times the delegation can be redeemed. 10 calls for buyer, 5 for mediator.',
    scope: 'Count',
    color: '#A78BFA',
  },
  {
    name: 'TimestampEnforcer',
    description: 'Adds time-based validity windows. Delegations auto-expire after 24h (buyer) or 12h (mediator).',
    scope: 'Time',
    color: '#F472B6',
  },
];

const DELEGATION_TYPES = [
  {
    title: 'Spending Delegation',
    from: 'Human',
    to: 'Buyer Agent',
    function: 'postTask()',
    caveats: ['0.005 ETH per task', '0.02 ETH total budget', '10 calls max', '24h expiry'],
    status: 'built',
  },
  {
    title: 'Confirmation Delegation',
    from: 'Human',
    to: 'Buyer Agent',
    function: 'confirmDelivery()',
    caveats: ['10 confirmations max', '24h expiry', 'No ETH value'],
    status: 'built',
  },
  {
    title: 'Mediator Re-Delegation',
    from: 'Buyer Agent',
    to: 'Mediator Agent',
    function: 'confirmDelivery()',
    caveats: ['5 confirmations max', '12h expiry', 'Inherits parent limits'],
    status: 'built',
  },
];

const CODE_EXAMPLES = [
  {
    name: 'createSmartAccount',
    file: 'agents/src/delegation/setup.js',
    description: 'Creates a HybridDeleGator smart account from an EOA private key. Counterfactual — address is deterministic before deployment.',
    usage: `import { toMetaMaskSmartAccount, Implementation } from '@metamask/delegation-toolkit';

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [owner.address, [], [], []],
  deploySalt: '0x01',
  signer: { account: owner },
});`,
  },
  {
    name: 'createSpendingDelegation',
    file: 'agents/src/delegation/delegate.js',
    description: 'Creates a spending delegation with scoped function access and multiple caveat enforcers.',
    usage: `import { createDelegation } from '@metamask/delegation-toolkit';

const delegation = createDelegation({
  from: humanAddress,
  to: buyerAddress,
  environment: env,
  scope: {
    type: 'functionCall',
    targets: [serviceBoardAddr],
    selectors: [toFunctionSelector('function postTask(string,string,uint256)')],
  },
  caveats: [
    { type: 'valueLte', maxValue: parseEther('0.005') },
    { type: 'nativeTokenTransferAmount', maxAmount: parseEther('0.02') },
    { type: 'limitedCalls', limit: 10 },
    { type: 'timestamp', afterThreshold: 0, beforeThreshold: expiryTimestamp },
  ],
});`,
  },
  {
    name: 'signDelegation',
    file: 'agents/src/delegation/delegate.js',
    description: 'Signs a delegation off-chain using EIP-712 typed data. Returns the signature to attach to the delegation struct.',
    usage: `// signDelegation returns just the signature hex string
const signature = await smartAccount.signDelegation({ delegation });
// Attach to delegation struct
const signed = { ...delegation, signature };`,
  },
  {
    name: 'createMediatorDelegation',
    file: 'agents/src/delegation/delegate.js',
    description: 'Creates a re-delegation chain. Buyer delegates to Mediator, inheriting all parent restrictions. Can only narrow, never widen.',
    usage: `const mediatorDelegation = createDelegation({
  from: buyerAddress,
  to: mediatorAddress,
  environment: env,
  parentDelegation: signedConfirmation,  // Links to parent
  scope: {
    type: 'functionCall',
    targets: [serviceBoardAddr],
    selectors: [toFunctionSelector('function confirmDelivery(uint256)')],
  },
  caveats: [
    { type: 'limitedCalls', limit: 5 },     // Narrower than parent's 10
    { type: 'timestamp', beforeThreshold: expiryTs },  // Shorter than parent's 24h
  ],
});`,
  },
  {
    name: 'redeemDelegation',
    file: 'agents/src/delegation/redeem.js',
    description: 'Redeems a signed delegation chain to execute a ServiceBoard call. DelegationManager validates all caveats, then calls from the delegator\'s smart account.',
    usage: `import { redeemDelegations, createExecution } from '@metamask/delegation-toolkit';

const execution = createExecution({
  target: serviceBoardAddress,
  value: parseEther('0.001'),
  callData: encodeFunctionData({
    abi: SERVICE_BOARD_ABI,
    functionName: 'postTask',
    args: ['text_summary', 'Summarize this document', deadline],
  }),
});

const txHash = await redeemDelegations(walletClient, publicClient,
  delegationManagerAddress, [{
    permissionContext: [signedDelegation],
    executions: [execution],
    mode: ExecutionMode.SingleDefault,
  }]
);`,
  },
];

const BEFORE_AFTER = [
  {
    title: 'Agent Authorization',
    before: 'Raw private key access — agents have full wallet control',
    after: 'Scoped delegations — agents can only call specific functions with limits',
    status: 'built',
  },
  {
    title: 'Task Posting',
    before: 'Human must sign every postTask() transaction',
    after: 'Agent redeems delegation autonomously within spending budget',
    status: 'built',
  },
  {
    title: 'Delivery Confirmation',
    before: 'Only buyer can confirmDelivery(), requires human intervention',
    after: 'Buyer or Mediator can confirm via delegation chain',
    status: 'built',
  },
  {
    title: 'Multi-Agent Workflows',
    before: 'Flat authority — every agent has same access level',
    after: 'Hierarchical delegation chains with narrowing permissions',
    status: 'built',
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
            ← AgentEscrow
          </Link>
          <span style={{ color: 'var(--text-quaternary)' }}>|</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}>
            MetaMask Delegation
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="https://github.com/DirectiveCreator/agentescrow/tree/main/agents/src/delegation"
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
            href="https://docs.gator.metamask.io"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#F6851B',
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: '1px solid rgba(246, 133, 27, 0.4)',
              borderRadius: 6,
              background: 'rgba(246, 133, 27, 0.1)',
            }}
          >
            Docs ↗
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

function LifecycleStep({ step }: { step: typeof DELEGATION_LIFECYCLE[0] }) {
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

function EnforcerCard({ enforcer }: { enforcer: typeof ENFORCER_CONTRACTS[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 16,
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? enforcer.color + '40' : 'var(--border)'}`,
        borderRadius: 10,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: 13,
          color: enforcer.color,
        }}>
          {enforcer.name}
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: enforcer.color,
          padding: '2px 8px',
          border: `1px solid ${enforcer.color}30`,
          borderRadius: 4,
          background: enforcer.color + '10',
        }}>
          {enforcer.scope}
        </span>
      </div>
      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        margin: 0,
      }}>
        {enforcer.description}
      </p>
    </div>
  );
}

function DelegationTypeCard({ delegation }: { delegation: typeof DELEGATION_TYPES[0] }) {
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
          {delegation.title}
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: '#34D399',
          padding: '2px 8px',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: 4,
          background: 'rgba(52, 211, 153, 0.1)',
        }}>
          BUILT
        </span>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
      }}>
        <span style={{ color: '#F6851B' }}>{delegation.from}</span>
        <span style={{ color: 'var(--text-tertiary)' }}>→</span>
        <span style={{ color: '#38B3DC' }}>{delegation.to}</span>
        <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>|</span>
        <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{delegation.function}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
        {delegation.caveats.map(caveat => (
          <span key={caveat} style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            padding: '3px 8px',
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: 4,
          }}>
            {caveat}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodeExampleCard({ example }: { example: typeof CODE_EXAMPLES[0] }) {
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
            color: '#F6851B',
            marginBottom: 4,
          }}>
            {example.name}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 6,
          }}>
            {example.file}
          </div>
          <p style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            {example.description}
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
          {example.usage}
        </pre>
      )}
    </div>
  );
}

function BeforeAfterCard({ item }: { item: typeof BEFORE_AFTER[0] }) {
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
          color: '#34D399',
          padding: '2px 8px',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: 4,
          background: 'rgba(52, 211, 153, 0.1)',
        }}>
          BUILT
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
          color: '#F6851B',
          fontSize: 16,
          flexShrink: 0,
        }}>
          →
        </div>
        <div style={{
          flex: 1,
          padding: 10,
          background: 'rgba(246, 133, 27, 0.06)',
          borderRadius: 6,
          border: '1px solid rgba(246, 133, 27, 0.25)',
        }}>
          <div style={{
            fontSize: 10,
            color: '#F6851B',
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

export default function MetaMaskDelegationPage() {
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
            border: '1px solid rgba(246, 133, 27, 0.4)',
            borderRadius: 20,
            background: 'rgba(246, 133, 27, 0.1)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: '#F6851B', fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon — Best Use of Delegations
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
            MetaMask Delegations + AgentEscrow
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            AgentEscrow uses MetaMask Delegation Toolkit to give agents scoped, time-limited spending
            authority on the ServiceBoard — without sharing private keys. Deployed and verified on both
            Base Sepolia and Celo Sepolia, proving true multi-chain delegation portability.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap' as const,
          }}>
            {[
              { label: 'SDK', value: '@metamask/delegation-toolkit' },
              { label: 'Version', value: 'v0.13.0' },
              { label: 'Smart Accounts', value: 'HybridDeleGator' },
              { label: 'Networks', value: 'Base Sepolia + Celo Sepolia' },
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

        {/* How We Integrated MetaMask Delegation */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="How We Integrated MetaMask Delegation into AgentEscrow"
            subtitle="Not just theory — here's exactly how delegation powers our agent marketplace."
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
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>The problem:</span> AgentEscrow is an autonomous marketplace where agents post tasks, deliver work, and exchange ETH. But <span style={{ color: '#F6851B' }}>how do you let an agent spend your money without handing over your private key?</span>
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Our solution:</span> We wrap every participant (human + agents) in <span style={{ color: '#38B3DC' }}>HybridDeleGator smart accounts</span> via MetaMask Delegation Toolkit. The human signs EIP-712 delegations that grant the Buyer Agent scoped authority: call <code style={{ fontFamily: 'var(--font-mono)', color: '#F6851B', fontSize: 12 }}>postTask()</code> on the ServiceBoard with a 0.02 ETH budget, max 10 calls, 24h expiry. A second delegation grants <code style={{ fontFamily: 'var(--font-mono)', color: '#F6851B', fontSize: 12 }}>confirmDelivery()</code> authority. The Buyer can even re-delegate confirmation to a Mediator Agent with narrower limits.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>The key insight:</span> when a delegation is redeemed, the call comes <span style={{ color: '#34D399' }}>from the delegator&apos;s smart account</span> — so <code style={{ fontFamily: 'var(--font-mono)', color: '#F6851B', fontSize: 12 }}>msg.sender == human</code> at the ServiceBoard level. <span style={{ color: 'var(--text-primary)' }}>Our existing contracts required zero modifications.</span> Delegation sits as a permission layer on top.
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Multi-chain proven:</span> We deployed and tested delegation flows on both <span style={{ color: '#A78BFA' }}>Base Sepolia</span> and <span style={{ color: '#FBBF24' }}>Celo Sepolia</span>. The DelegationManager and all 31 enforcer contracts work identically across chains — demonstrating that AgentEscrow&apos;s delegation layer is truly chain-agnostic.
            </p>
          </div>
        </section>

        {/* Delegation Lifecycle */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Delegation Lifecycle"
            subtitle="The 5-phase flow from smart account creation to autonomous agent execution."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {DELEGATION_LIFECYCLE.map(step => (
              <LifecycleStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Delegation Types */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Delegation Types We Built"
            subtitle="Three delegation types covering the full AgentEscrow workflow — spending, confirmation, and multi-agent chains."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {DELEGATION_TYPES.map(d => (
              <DelegationTypeCard key={d.title} delegation={d} />
            ))}
          </div>
        </section>

        {/* Before/After */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Before / After"
            subtitle="How MetaMask Delegations transform the AgentEscrow authorization model."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {BEFORE_AFTER.map(item => (
              <BeforeAfterCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* Enforcer Contracts */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Enforcer Contracts"
            subtitle="6 on-chain caveat enforcers that validate every delegation redemption. These are the guardrails."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 10,
          }}>
            {ENFORCER_CONTRACTS.map(e => (
              <EnforcerCard key={e.name} enforcer={e} />
            ))}
          </div>
        </section>

        {/* Delegation Chain Diagram */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Delegation Chain"
            subtitle="How permissions flow from Human → Buyer Agent → Mediator Agent with narrowing at each level."
          />

          {/* Entity cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 12,
          }}>
            {[
              { label: 'Human', role: 'Delegator', icon: '\u{1F464}', color: '#F6851B' },
              { label: 'Buyer Agent', role: 'Delegate', icon: '\u{1F916}', color: '#38B3DC' },
              { label: 'Mediator Agent', role: 'Re-Delegate', icon: '\u{1F517}', color: '#A78BFA' },
            ].map(entity => (
              <div key={entity.label} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: `1px solid ${entity.color}30`,
                borderRadius: 12,
                textAlign: 'center' as const,
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{entity.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 13,
                  color: entity.color,
                  marginBottom: 2,
                }}>
                  {entity.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}>
                  {entity.role}
                </div>
              </div>
            ))}
          </div>

          {/* Delegation arrows */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 12 }}>
            {[
              {
                title: 'Spending Delegation',
                from: 'Human',
                to: 'Buyer Agent',
                fromColor: '#F6851B',
                toColor: '#38B3DC',
                fn: 'postTask()',
                caveats: ['0.005 ETH per task', '0.02 ETH total', '10 calls max', '24h expiry'],
              },
              {
                title: 'Confirmation Delegation',
                from: 'Human',
                to: 'Buyer Agent',
                fromColor: '#F6851B',
                toColor: '#38B3DC',
                fn: 'confirmDelivery()',
                caveats: ['10 confirmations max', '24h expiry'],
              },
              {
                title: 'Re-Delegation',
                from: 'Buyer Agent',
                to: 'Mediator Agent',
                fromColor: '#38B3DC',
                toColor: '#A78BFA',
                fn: 'confirmDelivery()',
                caveats: ['5 calls max', '12h expiry', 'Inherits parent limits'],
              },
            ].map(d => (
              <div key={d.title} style={{
                padding: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                {/* From → To labels */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minWidth: 180 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: d.fromColor,
                  }}>
                    {d.from}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>{'\u2192'}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: d.toColor,
                  }}>
                    {d.to}
                  </span>
                </div>

                {/* Delegation details */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}>
                    {d.title}
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      color: d.toColor,
                      marginLeft: 8,
                      padding: '2px 6px',
                      background: `${d.toColor}12`,
                      borderRadius: 4,
                    }}>
                      {d.fn}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                    {d.caveats.map(c => (
                      <span key={c} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        padding: '2px 7px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                      }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Redemption card */}
          <div style={{
            padding: 16,
            background: 'linear-gradient(135deg, #F6851B08, #FBBF2408)',
            border: '1px solid #F6851B25',
            borderRadius: 12,
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#FBBF2415',
              border: '1px solid #FBBF2430',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}>
              {'\u26A1'}
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--text-primary)',
                marginBottom: 4,
              }}>
                Redemption
              </div>
              <p style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 8px 0',
              }}>
                Agent calls DelegationManager which validates all signatures, checks every caveat in the chain,
                then executes via the delegator&apos;s smart account &mdash; so{' '}
                <span style={{ fontFamily: 'var(--font-mono)', color: '#F6851B', fontSize: 10 }}>msg.sender = Human</span>.
                Transparent to ServiceBoard &mdash; no contract changes needed.
              </p>
              <div style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap' as const,
              }}>
                {['Validates signatures', 'Checks ALL caveats', "Executes from Human's account", 'Transparent to ServiceBoard'].map(item => (
                  <span key={item} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: '#FBBF24',
                    padding: '2px 7px',
                    background: '#FBBF2410',
                    borderRadius: 4,
                    border: '1px solid #FBBF2425',
                  }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Code Reference"
            subtitle="Click any function to see the implementation. All code is in agents/src/delegation/."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {CODE_EXAMPLES.map(example => (
              <CodeExampleCard key={example.name} example={example} />
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Run the Demo"
            subtitle="Try the full delegation lifecycle locally."
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
                title: 'Clone the repo',
                code: 'git clone https://github.com/DirectiveCreator/agentescrow\ncd agentescrow',
              },
              {
                step: '2',
                title: 'Install dependencies',
                code: 'cd agents && npm install',
              },
              {
                step: '3',
                title: 'Set up environment',
                code: '# .env file needs:\nBUYER_PRIVATE_KEY=0x...   # Any testnet private key\nSELLER_PRIVATE_KEY=0x...  # Any testnet private key',
              },
              {
                step: '4',
                title: 'Run the demo (simulation mode)',
                code: 'node agents/src/delegation/demo.js\n\n# Output: 4-phase lifecycle — smart accounts, delegations,\n# re-delegation chain, simulated redemption',
              },
              {
                step: '5',
                title: 'Run live on Base Sepolia (optional)',
                code: '# Add Pimlico bundler key for real ERC-4337 UserOperations:\nPIMLICO_API_KEY=... node agents/src/delegation/demo.js',
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
                    background: 'rgba(246, 133, 27, 0.1)',
                    border: '1px solid rgba(246, 133, 27, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#F6851B',
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

        {/* Files */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Implementation Files"
            subtitle="Everything lives in agents/src/delegation/."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {[
              { file: 'setup.js', description: 'Smart account creation, viem clients, chain config', lines: '149' },
              { file: 'delegate.js', description: 'Delegation builders (spending, confirmation, mediator) + EIP-712 signing', lines: '206' },
              { file: 'redeem.js', description: 'Execution builders + redemption via DelegationManager', lines: '246' },
              { file: 'demo.js', description: 'Full 4-phase lifecycle demo (simulation + live mode)', lines: '279' },
              { file: 'index.js', description: 'Module exports — unified API surface', lines: '~20' },
            ].map((item, i, arr) => (
              <div key={item.file} style={{
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: '#F6851B',
                    fontWeight: 600,
                  }}>
                    {item.file}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginLeft: 12,
                  }}>
                    {item.description}
                  </span>
                </div>
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {item.lines} lines
                </span>
              </div>
            ))}
          </div>
        </section>


        {/* Multi-Chain Deployment */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Multi-Chain Deployment"
            subtitle="AgentEscrow delegation works across multiple EVM chains — proven on both Base Sepolia and Celo Sepolia."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 12,
          }}>
            {[
              {
                chain: 'Base Sepolia',
                color: '#A78BFA',
                status: 'Primary Development Network',
                details: [
                  'DelegationManager + 31 enforcers deployed',
                  'ServiceBoard, EscrowVault, ReputationRegistry live',
                  'Full 4-phase delegation lifecycle tested',
                  'ERC-4337 bundler support via Pimlico',
                ],
              },
              {
                chain: 'Celo Sepolia',
                color: '#FBBF24',
                status: 'Cross-Chain Deployment',
                details: [
                  'ServiceBoard, EscrowVault, ReputationRegistry deployed',
                  'ERC-8004 agents registered (Buyer #225, Seller #226)',
                  'Proves chain-agnostic architecture',
                  'No code changes needed between chains',
                ],
              },
            ].map(net => (
              <div key={net.chain} style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: `1px solid ${net.color}30`,
                borderRadius: 12,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: net.color,
                  }}>
                    {net.chain}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: '#34D399',
                    padding: '2px 8px',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    borderRadius: 4,
                    background: 'rgba(52, 211, 153, 0.1)',
                  }}>
                    DEPLOYED
                  </span>
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 10,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}>
                  {net.status}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'none' }}>
                  {net.details.map(d => (
                    <li key={d} style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.8,
                      position: 'relative',
                    }}>
                      <span style={{ color: net.color, marginRight: 6 }}>{'>'}</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 12,
            padding: 14,
            background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.06), rgba(251, 191, 36, 0.06))',
            border: '1px solid rgba(167, 139, 250, 0.2)',
            borderRadius: 10,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 16 }}>{'🌐'}</span>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Why this matters:</span>{' '}
              MetaMask Delegation Toolkit + AgentEscrow is not locked to a single chain. The same delegation
              signatures, smart accounts, and enforcer caveats work on any EVM chain with a DelegationManager
              deployment — making our agent marketplace truly portable.
            </p>
          </div>
        </section>

        {/* On-Chain Artifacts */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="On-Chain Artifacts"
            subtitle="Contracts and infrastructure used by the delegation system across both networks."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 2,
          }}>
            <div style={{
              fontSize: 10,
              color: '#A78BFA',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}>
              Base Sepolia
            </div>
            {[
              { label: 'DelegationManager', value: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3' },
              { label: 'ServiceBoard (V2 Proxy)', value: '0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2' },
              { label: 'EscrowVault (V2 Proxy)', value: '0x8C6E66195F6DFB4F94BaE4058Ad1d6128A08B579' },
              { label: 'ReputationRegistry (V2 Proxy)', value: '0x95c59a74bb9C9f598602EE2774E0Dc72fFd0d2Df' },
              { label: 'Enforcers', value: '31 contracts (6 used)' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ color: '#F6851B', fontSize: 11 }}>{item.value}</span>
              </div>
            ))}
            <div style={{
              fontSize: 10,
              color: '#FBBF24',
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              marginTop: 12,
              marginBottom: 4,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}>
              Celo Sepolia
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Same contracts deployed</span>
              <span style={{ color: '#FBBF24', fontSize: 11 }}>Identical bytecode on Celo Sepolia, verified working</span>
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
              { label: 'Delegation Toolkit', url: 'https://www.npmjs.com/package/@metamask/delegation-toolkit', icon: '🦊' },
              { label: 'Gator Docs', url: 'https://docs.gator.metamask.io', icon: '📚' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '🏗' },
              { label: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org/address/0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2', icon: '🔍' },
              { label: 'Celo Sepolia Explorer', url: 'https://celo-sepolia.blockscout.com/address/0xDd04B859874947b9861d671DEEc8c39e5CD61c6C', icon: '🌿' },
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
            Built for The Synthesis Hackathon — AgentEscrow x MetaMask Delegation Framework — Multi-chain: Base Sepolia + Celo Sepolia
          </p>
        </div>
      </main>
    </div>
  );
}
