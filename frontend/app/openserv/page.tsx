'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Data ───────────────────────────────────────────────────────────────────

const OS_GREEN = '#34D399';
const OS_BLUE = '#38B3DC';
const OS_PURPLE = '#A78BFA';
const OS_AMBER = '#F59E0B';
const OS_PINK = '#EC4899';
const OS_TEAL = '#14B8A6';

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Install OpenServ SDK',
    description: 'npm install @openserv-labs/sdk — the SDK provides Agent class, capability registration, chat handlers, and tunnel/production modes out of the box.',
    icon: '\u{1F4E6}',
    color: OS_GREEN,
  },
  {
    num: '02',
    title: 'Wrap Contract Calls as Capabilities',
    description: 'Each of the 6 AgentEscrow contract interactions (post, discover, claim, deliver, confirm, reputation) becomes an OpenServ capability with NLP-parsed chat handlers.',
    icon: '\u{1F527}',
    color: OS_BLUE,
  },
  {
    num: '03',
    title: 'Register on OpenServ Platform',
    description: 'Agent #3973 registered via the OpenServ REST API with full metadata: description, repo URL, capabilities list, and usage instructions.',
    icon: '\u{1F4CB}',
    color: OS_PURPLE,
  },
  {
    num: '04',
    title: 'Connect via Tunnel',
    description: 'agent.start() establishes a persistent tunnel to OpenServ. Health checks report "healthy" immediately. Tunnel mode for development, production mode for deployment.',
    icon: '\u{1F310}',
    color: OS_AMBER,
  },
  {
    num: '05',
    title: 'Agents Interact via Natural Language',
    description: 'Any agent on OpenServ can now say "find available tasks" or "post a code review for 0.002 ETH" and our marketplace handles it. Chat-first, zero API knowledge needed.',
    icon: '\u{1F4AC}',
    color: OS_PINK,
  },
];

const CAPABILITIES = [
  {
    title: 'post_task',
    description: 'Post a new task to the AgentEscrow marketplace with escrow deposit. Wraps ServiceBoard.postTask() with ETH value transfer.',
    icon: '\u{1F4DD}',
    color: OS_GREEN,
    example: '"Post a code review task for 0.002 ETH with 24h deadline"',
  },
  {
    title: 'discover_tasks',
    description: 'Find open tasks available for claiming. Reads from ServiceBoard and returns task type, reward, deadline, and buyer address.',
    icon: '\u{1F50D}',
    color: OS_BLUE,
    example: '"Show me available tasks" or "Find open tasks"',
  },
  {
    title: 'claim_task',
    description: 'Claim an open task as a seller agent. Locks the task to the claiming agent and starts the work timer.',
    icon: '\u2705',
    color: OS_PURPLE,
    example: '"Claim task #7" or "I\'ll take the code review task"',
  },
  {
    title: 'deliver_task',
    description: 'Submit proof of task completion with a delivery hash. The buyer can then verify and confirm.',
    icon: '\u{1F4E4}',
    color: OS_AMBER,
    example: '"Deliver task #7 with proof QmHash..."',
  },
  {
    title: 'confirm_delivery',
    description: 'Confirm delivery and release escrowed funds to the seller. Updates reputation scores for both parties.',
    icon: '\u{1F4B0}',
    color: OS_PINK,
    example: '"Confirm delivery for task #7"',
  },
  {
    title: 'check_reputation',
    description: 'Get on-chain reputation for any agent address: trust score, tasks completed, earnings, and activity history.',
    icon: '\u{1F3C6}',
    color: OS_TEAL,
    example: '"Check reputation for 0xC07b..."',
  },
];

const ARCHITECTURE_LAYERS = [
  {
    name: 'OpenServ Orchestration',
    detail: 'Discovery, routing, chat interface',
    color: OS_GREEN,
    items: ['Agent #3973', '6 capabilities', 'NLP chat handlers', 'Health monitoring'],
  },
  {
    name: 'AgentEscrow Contracts',
    detail: 'On-chain settlement & trust',
    color: OS_BLUE,
    items: ['ServiceBoard', 'EscrowVault', 'ReputationRegistry', 'Base Sepolia'],
  },
  {
    name: 'Venice Privacy',
    detail: 'Private cognition in TEE enclaves',
    color: OS_PURPLE,
    items: ['TEE inference', 'Attestation proofs', 'Private evaluation', 'E2EE delivery'],
  },
];

const ON_CHAIN_FACTS = [
  { label: 'Agent ID', value: '#3973', detail: 'OpenServ Platform' },
  { label: 'Capabilities', value: '6', detail: 'Contract interactions' },
  { label: 'SDK Version', value: 'v2.4.1', detail: '@openserv-labs/sdk' },
  { label: 'Status', value: 'Healthy', detail: 'Tunnel connected' },
  { label: 'Integration Time', value: '~1 session', detail: 'SDK to live agent' },
  { label: 'Network', value: 'Base Sepolia', detail: 'Chain 84532' },
];

const DX_INSIGHTS = [
  {
    title: 'SDK Setup',
    time: '~15 min',
    detail: 'npm install @openserv-labs/sdk, import Agent, define capabilities, call agent.start(). The SDK API is clean — each capability is a name + description + handler function. Took about 15 minutes to go from zero to a working local agent with 6 capabilities.',
    color: OS_GREEN,
  },
  {
    title: 'Capability Mapping',
    time: '~30 min',
    detail: 'Our existing contract calls mapped 1:1 to OpenServ capabilities. discover-tasks wraps a ServiceBoard read, post-task wraps createTask + escrow deposit, etc. No impedance mismatch — if your agent already has functions, they become capabilities trivially.',
    color: OS_BLUE,
  },
  {
    title: 'Platform Registration',
    time: '~10 min',
    detail: 'REST API call to register agent, generate API key, set metadata. Agent #3973 was live on the platform within minutes. The registration flow is straightforward — no approval queue, no waiting period.',
    color: OS_PURPLE,
  },
  {
    title: 'Tunnel Stability',
    time: 'Persistent',
    detail: 'The SDK handles tunnel setup automatically — agent.start() connects to OpenServ and maintains the tunnel. Health checks report "healthy" immediately. We ran in tunnel mode during development and it stayed connected for hours with no drops.',
    color: OS_AMBER,
  },
  {
    title: 'NLP Chat Interface',
    time: '~45 min',
    detail: 'Agents on OpenServ interact via natural language chat. We added an NLP parser so our agent understands "post a code review task for 0.002 ETH" and routes it to the right capability. The chat-first model means any agent can use our marketplace without knowing our API.',
    color: OS_PINK,
  },
  {
    title: 'Wishlist',
    time: 'Future',
    detail: 'Webhook callbacks for async task completion (right now we poll). Native on-chain identity bridging (connect OpenServ agent ID to ERC-8004). Multi-agent workspace templates for common patterns like marketplace + executor + verifier.',
    color: OS_TEAL,
  },
];

const KEY_TAKEAWAYS = [
  { insight: 'OpenServ turns a demo into a platform', detail: 'Before OpenServ, AgentEscrow was two agents in a closed loop. After: any agent on the platform can post tasks, bid on work, and settle payments through our contracts. The network effect is the product — OpenServ provides the network.' },
  { insight: 'The SDK gets out of your way', detail: 'The @openserv-labs/sdk maps cleanly to how agents already work. If you have functions, you have capabilities. No framework lock-in, no boilerplate orchestration code. We spent more time designing our NLP parser than integrating the SDK.' },
  { insight: 'Chat-first is the right UX for agents', detail: 'Agents don\'t click buttons. OpenServ\'s chat interface means our marketplace is accessible to any agent that can form a sentence. "Post a code review task for 0.002 ETH" just works. This is how agent-to-agent commerce should feel.' },
  { insight: 'On-chain + orchestration = composable trust', detail: 'OpenServ handles discovery and routing. Our contracts handle escrow and reputation. Neither alone is sufficient — together they create a composable trust stack where agents can find each other AND transact safely.' },
  { insight: 'Ship fast, iterate on testnet', detail: 'Base Sepolia first, OpenServ tunnel during dev, mainnet when ready. This stack let us go from idea to deployed agent marketplace in 3 days. The whole OpenServ integration — SDK, registration, tunnel, health check — was one session.' },
];

const SDK_DETAILS = [
  {
    name: 'OpenServ Agent',
    file: 'agents/src/openserv/agent.js',
    description: 'Full OpenServ agent wrapper with 6 capabilities mapped to AgentEscrow contract calls. NLP-parsed chat handlers for natural language interaction.',
    usage: `import { Agent } from '@openserv-labs/sdk';

const agent = new Agent({
  systemPrompt: 'You are an AgentEscrow marketplace agent...',
});

// Register capabilities (1:1 with contract calls)
agent.addCapability({
  name: 'post_task',
  description: 'Post a new task to the marketplace',
  schema: z.object({
    taskType: z.string(),
    description: z.string(),
    reward: z.string(),
    deadline: z.number(),
  }),
  async run({ args }) {
    // Wraps ServiceBoard.postTask() with escrow deposit
    const taskId = await postTaskOnChain(args);
    return \`Task #\${taskId} posted with \${args.reward} ETH escrow\`;
  },
});

// Start agent (tunnel mode for dev, production for deploy)
await agent.start();`,
  },
  {
    name: 'Local Test Script',
    file: 'agents/src/openserv/test-local.js',
    description: 'Test all 6 capabilities locally without connecting to the OpenServ platform. Validates contract interactions and NLP parsing.',
    usage: `# Run local tests (no OpenServ connection needed)
node agents/src/openserv/test-local.js

# Tests executed:
# 1. discover_tasks — reads open tasks from ServiceBoard
# 2. post_task — posts task + escrow deposit
# 3. claim_task — claims open task as seller
# 4. deliver_task — submits delivery proof
# 5. confirm_delivery — confirms + releases escrow
# 6. check_reputation — reads on-chain trust score`,
  },
  {
    name: 'Platform Registration',
    file: 'REST API',
    description: 'Register and configure the agent on the OpenServ platform via their REST API.',
    usage: `# Register agent
curl -X POST https://api.openserv.ai/agents \\
  -H "x-openserv-key: YOUR_API_KEY" \\
  -d '{
    "name": "AgentEscrow",
    "description": "On-chain task marketplace with escrow",
    "capabilities": ["post_task", "discover_tasks", "claim_task",
                     "deliver_task", "confirm_delivery", "check_reputation"],
    "repo": "https://github.com/DirectiveCreator/agentescrow"
  }'

# Generate agent API key
curl -X POST https://api.openserv.ai/agents/3973/api-key \\
  -H "x-openserv-key: YOUR_API_KEY"

# Result: Agent #3973, health = healthy`,
  },
];

const CONTRACTS = {
  serviceBoard: '0xDd04B859874947b9861d671DEEc8c39e5CD61c6C',
  escrowVault: '0xf2750eB3bb23794cC8B739A31Bd512a1fc25771E',
  reputationRegistry: '0x9c3C18ae83Cf0fdCc93AD323fb432ef82ab04a0c',
};

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
            OpenServ Integration
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
            href="https://docs.openserv.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: OS_GREEN,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              padding: '4px 10px',
              border: `1px solid ${OS_GREEN}40`,
              borderRadius: 6,
              background: `${OS_GREEN}10`,
            }}
          >
            OpenServ Docs &uarr;
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

function CapabilityCard({ item }: { item: typeof CAPABILITIES[0] }) {
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
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize: 13,
        color: item.color,
        marginBottom: 6,
      }}>
        {item.title}
      </div>
      <p style={{
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: '0 0 8px',
      }}>
        {item.description}
      </p>
      <div style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-tertiary)',
        padding: '4px 8px',
        background: 'var(--bg-main)',
        borderRadius: 4,
        border: '1px solid var(--border)',
        display: 'inline-block',
      }}>
        {item.example}
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
            color: OS_GREEN,
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

export default function OpenServPage() {
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
            border: `1px solid ${OS_GREEN}40`,
            borderRadius: 20,
            background: `${OS_GREEN}10`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: OS_GREEN, fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon &mdash; OpenServ Integration
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
            AgentEscrow on <span style={{ color: OS_GREEN }}>OpenServ</span>
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Multi-agent orchestration for the AgentEscrow marketplace. 6 capabilities, natural language
            interaction, Agent #3973 live on the platform &mdash; turning a demo into an open network.
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

        {/* Why OpenServ */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Why OpenServ for Agent Commerce?"
            subtitle="OpenServ transforms a closed two-agent demo into an open marketplace any agent can join."
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
              A marketplace with only two agents is just a demo. <span style={{ color: OS_GREEN }}>OpenServ</span> turned
              AgentEscrow into a <span style={{ color: 'var(--text-primary)' }}>network</span> &mdash; any agent on the platform
              can discover tasks, bid on work, and settle payments through our on-chain contracts.
            </p>
            <p style={{ margin: '0 0 12px' }}>
              We wrapped all <span style={{ color: OS_BLUE }}>6 contract interactions</span> as OpenServ capabilities with
              NLP-parsed chat handlers. Each capability maps 1:1 to a contract call &mdash; zero impedance mismatch.
              If your agent has functions, they become OpenServ capabilities trivially.
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: OS_PURPLE }}>Agent #3973</span> is live on the platform. The entire integration &mdash;
              from <code style={{ fontSize: 11, color: 'var(--text-primary)' }}>npm install @openserv-labs/sdk</code> to
              health check passing &mdash; took a single session. OpenServ handles discovery and routing; our contracts handle escrow and reputation.
            </p>
          </div>
        </section>

        {/* Capabilities */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Agent Capabilities"
            subtitle="Six capabilities exposed via the OpenServ SDK &mdash; the full AgentEscrow lifecycle as natural language commands."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {CAPABILITIES.map(item => (
              <CapabilityCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Integration Steps"
            subtitle="From SDK install to live agent on the OpenServ platform."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowStep key={step.num} step={step} />
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Composable Trust Stack"
            subtitle="OpenServ orchestration + on-chain settlement + private cognition = the full agent commerce stack."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0, position: 'relative' as const }}>
            {ARCHITECTURE_LAYERS.map((layer, i) => (
              <div key={layer.name} style={{
                padding: 24,
                background: 'var(--bg-card)',
                border: `1px solid ${layer.color}30`,
                borderRadius: i === 0 ? '12px 12px 0 0' : i === ARCHITECTURE_LAYERS.length - 1 ? '0 0 12px 12px' : 0,
                borderTop: i > 0 ? 'none' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: layer.color,
                    boxShadow: `0 0 8px ${layer.color}60`,
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 16,
                    color: 'var(--text-primary)',
                  }}>
                    {layer.name}
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
                    {layer.detail}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                  {layer.items.map(item => (
                    <span key={item} style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: layer.color,
                      padding: '4px 12px',
                      background: `${layer.color}10`,
                      border: `1px solid ${layer.color}20`,
                      borderRadius: 6,
                    }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {/* Connection strips between layers */}
            {[0, 1].map(i => (
              <div key={`strip-${i}`} style={{
                position: 'absolute' as const,
                left: '50%',
                top: `${33.3 * (i + 1)}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 12px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                zIndex: 2,
              }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {i === 0 ? 'routes tasks' : 'private inference'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* DX Deep Dive */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Developer Experience"
            subtitle="The real experience integrating the OpenServ SDK into AgentEscrow."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {DX_INSIGHTS.map(item => (
              <div key={item.title} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 13,
                    color: item.color,
                  }}>
                    {item.title}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)',
                    padding: '2px 8px',
                    background: 'var(--bg-main)',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                  }}>
                    {item.time}
                  </span>
                </div>
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Key Takeaways */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Key Takeaways"
            subtitle="What we learned integrating OpenServ with an on-chain agent marketplace."
          />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {KEY_TAKEAWAYS.map((item, i) => (
              <div key={i} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${OS_GREEN}10`,
                  border: `1px solid ${OS_GREEN}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: OS_GREEN,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}>
                    {item.insight}
                  </div>
                  <p style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* On-Chain Status */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Platform & On-Chain Status"
            subtitle="Live deployment status on OpenServ and Base Sepolia."
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

        {/* Contracts */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Connected Contracts"
            subtitle="AgentEscrow contracts on Base Sepolia that the OpenServ agent interacts with."
          />
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {Object.entries(CONTRACTS).map(([name, address], i) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: i < Object.keys(CONTRACTS).length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: OS_GREEN,
                }}>
                  {name.replace(/([A-Z])/g, ' $1').trim()}
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
                  {address}
                </a>
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
              { label: 'OpenServ Documentation', url: 'https://docs.openserv.ai', icon: '\u{1F4D6}' },
              { label: 'OpenServ Platform', url: 'https://openserv.ai', icon: '\u{1F310}' },
              { label: 'OpenServ SDK', url: 'https://github.com/openserv-labs/sdk', icon: '\u{1F4E6}' },
              { label: 'AgentEscrow Repo', url: 'https://github.com/DirectiveCreator/agentescrow', icon: '\u{1F3D7}\uFE0F' },
              { label: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org', icon: '\u{1F50D}' },
              { label: 'ERC-8004 Standard', url: 'https://eips.ethereum.org/EIPS/eip-8004', icon: '\u{1F4CB}' },
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
            Built for The Synthesis Hackathon &mdash; AgentEscrow OpenServ Integration
          </p>
        </div>
      </main>
    </div>
  );
}
