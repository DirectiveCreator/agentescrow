'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── Colors ─────────────────────────────────────────────────────────────────

const ACCENT = '#34D399';
const BLUE = '#38B3DC';
const PURPLE = '#A78BFA';
const AMBER = '#F59E0B';
const PINK = '#EC4899';
const TEAL = '#14B8A6';
const RED = '#EF4444';

// ─── Timeline Data ──────────────────────────────────────────────────────────

const TIMELINE = [
  {
    day: 'Day 0',
    date: 'March 17',
    title: 'Architecture & Foundation',
    color: ACCENT,
    events: [
      { who: 'Human', what: 'Defined the vision: trustless agent-to-agent marketplace with on-chain escrow', icon: '🎯' },
      { who: 'Human', what: 'Chose the stack: Solidity + Foundry, viem, Next.js 16, Base Sepolia', icon: '🏗️' },
      { who: 'Agent', what: 'Scaffolded contracts: ServiceBoard, EscrowVault, ReputationRegistry', icon: '📝' },
      { who: 'Agent', what: 'Wrote 40 Foundry tests covering full lifecycle, edge cases, access control', icon: '✅' },
      { who: 'Agent', what: 'Deployed all 3 contracts to Base Sepolia', icon: '🚀' },
    ],
  },
  {
    day: 'Day 1',
    date: 'March 18',
    title: 'Agents Come Alive',
    color: BLUE,
    events: [
      { who: 'Human', what: 'Directed agent architecture: buyer/seller pattern with polling loop', icon: '🎯' },
      { who: 'Agent', what: 'Built buyer agent: posts tasks with ETH escrow, verifies deliveries', icon: '🤖' },
      { who: 'Agent', what: 'Built seller agent: discovers tasks, claims, executes work autonomously, delivers', icon: '🤖' },
      { who: 'Agent', what: 'Ran first end-to-end demo: 5 tasks posted → claimed → delivered → settled', icon: '🎉' },
      { who: 'Human', what: 'Installed Superpowers skills framework for structured development', icon: '⚡' },
      { who: 'Agent', what: 'Built Next.js dashboard with live task board, agent profiles, event feed', icon: '💻' },
    ],
  },
  {
    day: 'Day 2',
    date: 'March 19',
    title: 'Multi-Chain & Integrations',
    color: PURPLE,
    events: [
      { who: 'Human', what: 'Decided to go multi-chain: Base Sepolia + Celo Sepolia', icon: '🎯' },
      { who: 'Agent', what: 'Deployed same contracts to Celo Sepolia — identical addresses via CREATE2', icon: '🔗' },
      { who: 'Agent', what: 'Integrated OpenServ SDK: 6 capabilities, NLP chat handlers, Agent #3973', icon: '🌐' },
      { who: 'Agent', what: 'Registered ERC-8004 agent identities on both chains', icon: '🪪' },
      { who: 'Agent', what: 'Integrated Venice for private LLM inference in TEE enclaves', icon: '🔒' },
    ],
  },
  {
    day: 'Day 3',
    date: 'March 20',
    title: 'Protocol Integrations',
    color: AMBER,
    events: [
      { who: 'Human', what: 'Identified all hackathon tracks and prioritized integrations', icon: '🎯' },
      { who: 'Agent', what: 'ENS integration: agentescrow.eth + buyer/seller subdomains with 16 records each', icon: '🏷️' },
      { who: 'Agent', what: 'MetaMask Delegation Toolkit: ERC-7715 permission framework for agents', icon: '🦊' },
      { who: 'Agent', what: 'Filecoin: on-chain task proof archival via deal proposals', icon: '📦' },
      { who: 'Agent', what: 'Ampersend: agent-to-agent messaging SDK for task coordination', icon: '💬' },
      { who: 'Agent', what: 'Built dedicated frontend pages for each integration (/base, /venice, /ens, etc.)', icon: '🎨' },
    ],
  },
  {
    day: 'Day 4',
    date: 'March 21',
    title: 'Polish & Ship',
    color: PINK,
    events: [
      { who: 'Human', what: 'Final review pass on all pages and README', icon: '🎯' },
      { who: 'Agent', what: 'Made stats dynamic: on-chain reputation, contract counts from chain config', icon: '📊' },
      { who: 'Agent', what: 'Replaced ASCII diagrams with visual card-based architecture UI', icon: '🎨' },
      { who: 'Agent', what: 'Created SVG architecture diagrams for README', icon: '🖼️' },
      { who: 'Agent', what: 'Deployed frontend to Render, verified all pages live', icon: '🚀' },
    ],
  },
];

const COLLABORATION_STATS = [
  { label: 'Smart Contracts', value: '3', detail: 'Deployed on 2 chains' },
  { label: 'Foundry Tests', value: '40', detail: 'All passing' },
  { label: 'Integrations', value: '8', detail: 'OpenServ, Venice, ENS, MetaMask, Filecoin, Ampersend, Base, Celo' },
  { label: 'Frontend Pages', value: '10', detail: 'Dashboard + 9 integration pages' },
  { label: 'Hackathon Tracks', value: '14', detail: '11 Synthesis + 3 Celo' },
  { label: 'Build Time', value: '5 days', detail: 'Human direction + agent execution' },
];

const HOW_IT_WORKS = [
  {
    title: 'Human Sets Direction',
    description: 'Architecture decisions, technology choices, hackathon strategy, and integration priorities. The human defines what to build and why — never how.',
    icon: '🎯',
    color: ACCENT,
    examples: ['Chose Base + Celo dual-chain deployment', 'Identified all 14 hackathon tracks', 'Prioritized Venice privacy integration'],
  },
  {
    title: 'Agent Executes Autonomously',
    description: 'The agent handles all implementation: contract development, testing, deployment, frontend, integrations, documentation. Structured by the Superpowers skills framework.',
    icon: '🤖',
    color: BLUE,
    examples: ['Wrote 40 Foundry tests with full coverage', 'Deployed contracts to 2 chains', 'Built 10 frontend pages in Next.js 16'],
  },
  {
    title: 'Iterative Review Cycles',
    description: 'Human reviews output, provides feedback, and redirects. The agent iterates based on direction — not guessing. Each cycle compresses scope and improves quality.',
    icon: '🔄',
    color: PURPLE,
    examples: ['Revised README tracks 3 times based on feedback', 'Replaced ASCII diagrams after human review', 'Updated links from relative to absolute Render URLs'],
  },
];

const KEY_INSIGHTS = [
  {
    insight: 'Agents excel at breadth, humans excel at judgment',
    detail: 'The agent integrated 8 different protocols in 5 days — something that would take a solo developer weeks. But every integration decision (which protocols, what priority, how deep) came from the human. The agent\'s strength is execution speed and consistency; the human\'s strength is knowing what matters.',
  },
  {
    insight: 'Structured skills > raw prompting',
    detail: 'Installing the Superpowers framework on Day 1 paid massive dividends. Instead of ad-hoc development, the agent followed TDD cycles, wrote verification checks, and used structured debugging. The framework turned an LLM into a disciplined engineer.',
  },
  {
    insight: 'Same contracts, different chains, zero friction',
    detail: 'Deploying to Celo Sepolia after Base Sepolia was trivial — the agent reused the same deployment scripts with different RPC URLs. CREATE2 gave us identical addresses on both chains. Multi-chain deployment is an agent superpower because it\'s mechanical, not creative.',
  },
  {
    insight: 'Documentation is a first-class deliverable',
    detail: 'Every integration got its own frontend page, README section, and on-chain verification. The agent doesn\'t get tired of writing docs. This build story itself was authored as part of the workflow — not as an afterthought.',
  },
  {
    insight: 'The feedback loop is the product',
    detail: 'Human-agent collaboration isn\'t "human writes spec, agent builds it." It\'s a continuous loop: human sets direction → agent executes → human reviews → agent iterates. The README alone went through 3 revision cycles. The quality comes from the loop, not any single step.',
  },
];

const TECH_DECISIONS = [
  {
    decision: 'Solidity + Foundry over Hardhat',
    rationale: 'Foundry\'s Rust-based toolchain is faster for testing and the agent can write fuzz tests natively. 40 tests run in under 2 seconds.',
    who: 'Human',
    color: ACCENT,
  },
  {
    decision: 'viem over ethers.js',
    rationale: 'Type-safe, tree-shakeable, and better DX for the agent. Contract interactions are more explicit and less error-prone.',
    who: 'Human',
    color: BLUE,
  },
  {
    decision: 'Next.js 16 + React 19',
    rationale: 'Latest framework for the frontend. Server components where possible, client components for interactive elements. Deployed as standalone on Render.',
    who: 'Human',
    color: PURPLE,
  },
  {
    decision: 'Multi-chain from Day 2',
    rationale: 'Targeting both Synthesis and Celo hackathons doubled our submission surface. Same contracts, identical addresses via CREATE2 — minimal extra work for maximum coverage.',
    who: 'Human',
    color: AMBER,
  },
  {
    decision: 'One page per integration',
    rationale: 'Each hackathon track gets a dedicated frontend page with deep technical content. Judges can see exactly how each protocol is integrated without digging through code.',
    who: 'Human',
    color: PINK,
  },
  {
    decision: 'ERC-8004 for agent identity',
    rationale: 'On-chain agent identity standard that works across chains. Buyer #2194/#225 and Seller #2195/#226 are verifiable on both Base and Celo.',
    who: 'Agent',
    color: TEAL,
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
            Build Story
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/openserv" style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}>
            OpenServ &rarr;
          </Link>
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

function TimelineDay({ day }: { day: typeof TIMELINE[0] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{
      position: 'relative',
      paddingLeft: 32,
    }}>
      {/* Timeline dot */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 6,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: day.color,
        boxShadow: `0 0 12px ${day.color}60`,
        zIndex: 2,
      }} />

      {/* Timeline line */}
      <div style={{
        position: 'absolute',
        left: 7,
        top: 22,
        bottom: 0,
        width: 2,
        background: `${day.color}30`,
      }} />

      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 18,
          color: day.color,
        }}>
          {day.day}
        </span>
        <span style={{
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
        }}>
          {day.date}
        </span>
        <span style={{
          fontSize: 14,
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          — {day.title}
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s',
        }}>
          &#9654;
        </span>
      </div>

      {expanded && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 32,
        }}>
          {day.events.map((event, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '10px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              borderLeft: `3px solid ${event.who === 'Human' ? AMBER : BLUE}`,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{event.icon}</span>
              <div>
                <span style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: event.who === 'Human' ? AMBER : BLUE,
                  textTransform: 'uppercase',
                  marginRight: 8,
                }}>
                  {event.who}
                </span>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}>
                  {event.what}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BuildStoryPage() {
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
          textAlign: 'center',
          marginBottom: 48,
          paddingTop: 20,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 14px',
            border: `1px solid ${ACCENT}40`,
            borderRadius: 20,
            background: `${ACCENT}10`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: ACCENT, fontFamily: 'var(--font-mono)' }}>
              Synthesis Hackathon &mdash; Best Build Story (OpenServ)
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
            How <span style={{ color: AMBER }}>Humans</span> and <span style={{ color: BLUE }}>Agents</span> Built Escroue
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            A 5-day collaboration between a human architect and an agent, building a trustless
            agent-to-agent marketplace with 8 protocol integrations across 2 chains.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginTop: 24,
            flexWrap: 'wrap',
          }}>
            {COLLABORATION_STATS.slice(0, 4).map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
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

        {/* The Collaboration Model */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="The Collaboration Model"
            subtitle="Human direction + agent execution + iterative review = rapid, high-quality output."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {HOW_IT_WORKS.map(item => (
              <div key={item.title} style={{
                padding: 20,
                background: 'var(--bg-card)',
                border: `1px solid ${item.color}30`,
                borderRadius: 12,
              }}>
                <div style={{
                  fontSize: 28,
                  marginBottom: 12,
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${item.color}10`,
                  borderRadius: 10,
                  border: `1px solid ${item.color}20`,
                }}>
                  {item.icon}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 15,
                  color: item.color,
                  marginBottom: 8,
                }}>
                  {item.title}
                </div>
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: '0 0 12px',
                }}>
                  {item.description}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {item.examples.map((ex, i) => (
                    <div key={i} style={{
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      padding: '3px 8px',
                      background: 'var(--bg-main)',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                    }}>
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Build Timeline */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Build Timeline"
            subtitle="Day-by-day breakdown of what the human directed and what the agent built."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {TIMELINE.map(day => (
              <TimelineDay key={day.day} day={day} />
            ))}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            gap: 24,
            justifyContent: 'center',
            marginTop: 16,
            padding: '10px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 3, background: AMBER, borderRadius: 2 }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                Human Decision
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 3, background: BLUE, borderRadius: 2 }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                Agent Execution
              </span>
            </div>
          </div>
        </section>

        {/* Architecture Decisions */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="Key Architecture Decisions"
            subtitle="Every major technical decision and who made it."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {TECH_DECISIONS.map(item => (
              <div key={item.decision} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: item.who === 'Human' ? AMBER : BLUE,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    background: item.who === 'Human' ? `${AMBER}15` : `${BLUE}15`,
                    border: `1px solid ${item.who === 'Human' ? AMBER : BLUE}30`,
                    borderRadius: 4,
                  }}>
                    {item.who}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: item.color,
                  marginBottom: 6,
                }}>
                  {item.decision}
                </div>
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {item.rationale}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* By the Numbers */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="By the Numbers"
            subtitle="What 5 days of human-agent collaboration produced."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {COLLABORATION_STATS.map(item => (
              <div key={item.label} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: ACCENT,
                  marginBottom: 4,
                }}>
                  {item.value}
                </div>
                <div style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  marginBottom: 2,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                }}>
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Insights */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader
            title="What We Learned"
            subtitle="Insights from building a production-quality project through human-agent collaboration."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {KEY_INSIGHTS.map((item, i) => (
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
                  background: `${ACCENT}10`,
                  border: `1px solid ${ACCENT}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: ACCENT,
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

        {/* Integration Pages */}
        <section style={{ marginBottom: 24 }}>
          <SectionHeader
            title="Explore the Integrations"
            subtitle="Each protocol integration has its own dedicated page."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {[
              { label: 'Base — x402 Payments', href: '/base', icon: '🔵' },
              { label: 'OpenServ — Multi-Agent', href: '/openserv', icon: '🌐' },
              { label: 'Venice — Private Inference', href: '/venice', icon: '🔒' },
              { label: 'MetaMask — Delegations', href: '/metamask', icon: '🦊' },
              { label: 'Filecoin — Storage', href: '/filecoin', icon: '📦' },
              { label: 'ENS — Identity', href: '/ens', icon: '🏷️' },
              { label: 'Ampersend — Messaging', href: '/ampersend', icon: '💬' },
              { label: 'Celo — Multi-Chain', href: '/celo', icon: '🟡' },
            ].map(link => (
              <Link
                key={link.label}
                href={link.href}
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
                <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', fontSize: 11 }}>&rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '24px 0',
          borderTop: '1px solid var(--border)',
          marginTop: 24,
        }}>
          <p style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            Built for The Synthesis Hackathon &mdash; Best Build Story (OpenServ Track)
          </p>
        </div>
      </main>
    </div>
  );
}
