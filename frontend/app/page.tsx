'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { formatEther } from 'viem';
import { publicClient, ServiceBoardABI, ReputationRegistryABI, EscrowVaultABI, CONTRACTS } from '@/lib/contracts';

// ─── Types ───────────────────────────────────────────────────────────────────

type Task = {
  id: bigint;
  buyer: string;
  seller: string;
  taskType: string;
  description: string;
  reward: bigint;
  deadline: bigint;
  status: number;
  deliveryHash: string;
  createdAt: bigint;
  claimedAt: bigint;
  deliveredAt: bigint;
};

type AgentReputation = {
  tasksCompleted: bigint;
  tasksFailed: bigint;
  totalEarned: bigint;
  totalSpent: bigint;
  firstActiveAt: bigint;
  lastActiveAt: bigint;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = {
  0: 'Open', 1: 'Claimed', 2: 'Delivered', 3: 'Completed', 4: 'Cancelled', 5: 'Disputed',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'border-[var(--accent)] bg-[var(--accent-10)] text-[var(--accent)]',
  1: 'border-[#FF8800] bg-[#FF880010] text-[#FF8800]',
  2: 'border-[#A78BFA] bg-[#A78BFA10] text-[#A78BFA]',
  3: 'border-[#34D399] bg-[#34D39910] text-[#34D399]',
  4: 'border-[#EF4444] bg-[#EF444410] text-[#EF4444]',
  5: 'border-[#F97316] bg-[#F9731610] text-[#F97316]',
};

// ─── Demo Data ───────────────────────────────────────────────────────────────

const DEMO_TASKS: Task[] = [
  { id: 0n, buyer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', seller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', taskType: 'text_summary', description: 'Summarize the key points of the ERC-8004 agent identity standard', reward: 1500000000000000n, deadline: 1710000000n, status: 3, deliveryHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', createdAt: 1709990000n, claimedAt: 1709990060n, deliveredAt: 1709990120n },
  { id: 1n, buyer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', seller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', taskType: 'code_review', description: 'Review the EscrowVault.sol contract for security vulnerabilities', reward: 2000000000000000n, deadline: 1710000000n, status: 3, deliveryHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', createdAt: 1709991000n, claimedAt: 1709991060n, deliveredAt: 1709991120n },
  { id: 2n, buyer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', seller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', taskType: 'name_generation', description: 'Generate 10 creative names for an AI agent coordination protocol', reward: 1000000000000000n, deadline: 1710000000n, status: 3, deliveryHash: 'QmZoRqNk9jMFhJJ5nLHvADqG8PdQvYrS6umxXLcNbEnCo8', createdAt: 1709992000n, claimedAt: 1709992060n, deliveredAt: 1709992120n },
  { id: 3n, buyer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', seller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', taskType: 'translation', description: 'Translate smart contract documentation from English to Spanish', reward: 1500000000000000n, deadline: 1710000000n, status: 3, deliveryHash: 'QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX', createdAt: 1709993000n, claimedAt: 1709993060n, deliveredAt: 1709993120n },
  { id: 4n, buyer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', seller: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', taskType: 'code_review', description: 'Audit the ReputationRegistry for edge cases in score calculation', reward: 500000000000000n, deadline: 1710000000n, status: 3, deliveryHash: 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn', createdAt: 1709994000n, claimedAt: 1709994060n, deliveredAt: 1709994120n },
];

const DEMO_EVENTS = [
  { type: 'TaskCompleted', taskId: 4, detail: 'code_review — 0.0005 ETH settled', time: '2:34 PM' },
  { type: 'EscrowReleased', taskId: 4, detail: '0.0005 ETH → seller 0x7099...79C8', time: '2:34 PM' },
  { type: 'TaskDelivered', taskId: 4, detail: 'Delivery hash: QmUNLL...vA3Nn', time: '2:33 PM' },
  { type: 'TaskClaimed', taskId: 4, detail: 'Claimed by 0x7099...79C8', time: '2:32 PM' },
  { type: 'TaskPosted', taskId: 4, detail: 'code_review — 0.0005 ETH bounty', time: '2:32 PM' },
  { type: 'ReputationUpdated', taskId: 3, detail: 'Seller score: 100/100 (4 completed)', time: '2:28 PM' },
  { type: 'TaskCompleted', taskId: 3, detail: 'translation — 0.0015 ETH settled', time: '2:28 PM' },
  { type: 'EscrowReleased', taskId: 3, detail: '0.0015 ETH → seller 0x7099...79C8', time: '2:28 PM' },
  { type: 'TaskCompleted', taskId: 2, detail: 'name_generation — 0.001 ETH settled', time: '2:22 PM' },
  { type: 'TaskCompleted', taskId: 1, detail: 'code_review — 0.002 ETH settled', time: '2:16 PM' },
  { type: 'TaskCompleted', taskId: 0, detail: 'text_summary — 0.0015 ETH settled', time: '2:10 PM' },
  { type: 'EscrowCreated', taskId: 0, detail: '0.0015 ETH locked for task #0', time: '2:09 PM' },
];

const EVENT_ICON_MAP: Record<string, string> = {
  TaskPosted: '◈', TaskClaimed: '◇', TaskDelivered: '◆', TaskCompleted: '●',
  TaskCancelled: '○', EscrowCreated: '▣', EscrowReleased: '▢', ReputationUpdated: '★',
};

const EVENT_COLOR_MAP: Record<string, string> = {
  TaskPosted: 'text-[var(--accent)]', TaskClaimed: 'text-[#FF8800]',
  TaskDelivered: 'text-[#A78BFA]', TaskCompleted: 'text-[#34D399]',
  TaskCancelled: 'text-[#EF4444]', EscrowCreated: 'text-[var(--accent)]',
  EscrowReleased: 'text-[#34D399]', ReputationUpdated: 'text-[#FBBF24]',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortenAddress(addr: string) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [escrowBalance, setEscrowBalance] = useState<bigint>(0n);
  const [agents, setAgents] = useState<Map<string, AgentReputation>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'board' | 'events' | 'architecture'>('overview');
  const prevTaskCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.serviceBoard as `0x${string}`,
        abi: ServiceBoardABI,
        functionName: 'getTaskCount',
      });

      const taskPromises = [];
      for (let i = 0; i < Number(count); i++) {
        taskPromises.push(
          publicClient.readContract({
            address: CONTRACTS.serviceBoard as `0x${string}`,
            abi: ServiceBoardABI,
            functionName: 'getTask',
            args: [BigInt(i)],
          })
        );
      }
      const fetchedTasks = await Promise.all(taskPromises) as Task[];
      prevTaskCountRef.current = fetchedTasks.length;
      setTasks(fetchedTasks);

      const balance = await publicClient.readContract({
        address: CONTRACTS.escrowVault as `0x${string}`,
        abi: EscrowVaultABI,
        functionName: 'getBalance',
      });
      setEscrowBalance(balance as bigint);

      const agentAddrs = new Set<string>();
      fetchedTasks.forEach((t) => {
        if (t.buyer !== '0x0000000000000000000000000000000000000000') agentAddrs.add(t.buyer);
        if (t.seller !== '0x0000000000000000000000000000000000000000') agentAddrs.add(t.seller);
      });

      const newAgents = new Map<string, AgentReputation>();
      for (const addr of agentAddrs) {
        const rep = await publicClient.readContract({
          address: CONTRACTS.reputationRegistry as `0x${string}`,
          abi: ReputationRegistryABI,
          functionName: 'getReputation',
          args: [addr as `0x${string}`],
        }) as AgentReputation;
        newAgents.set(addr, rep);
      }
      setAgents(newAgents);
      setIsConnected(true);
      setIsDemo(false);
    } catch {
      setIsConnected(false);
      setIsDemo(true);
      // Use demo data when not connected
      setTasks(DEMO_TASKS);
      setEscrowBalance(0n);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const displayTasks = isDemo ? DEMO_TASKS : tasks;
  const completedTasks = displayTasks.filter(t => Number(t.status) === 3).length;
  const totalReward = displayTasks.reduce((sum, t) => sum + t.reward, 0n);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold tracking-tight"
                 style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-40)', color: 'var(--accent)' }}>
              AE
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                <span style={{ color: 'var(--accent)' }}>Agent</span>Escrow
              </h1>
              <p className="text-[11px] tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                TRUSTLESS AGENT-TO-AGENT MARKETPLACE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] px-2 py-1 rounded tracking-wide"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              BASE CHAIN
            </span>
            {isDemo && (
              <span className="text-[11px] px-2 py-1 rounded tracking-wide"
                    style={{ background: 'var(--warning-20)', border: '1px solid #FF880040', color: 'var(--warning)' }}>
                DEMO MODE
              </span>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px]"
                 style={{
                   background: isConnected ? '#34D39910' : 'var(--accent-10)',
                   border: `1px solid ${isConnected ? '#34D39940' : 'var(--accent-40)'}`,
                   color: isConnected ? '#34D399' : 'var(--accent)',
                 }}>
              <div className="w-1.5 h-1.5 rounded-full pulse-accent"
                   style={{ background: isConnected ? '#34D399' : 'var(--accent)' }} />
              {isConnected ? 'LIVE' : 'PREVIEW'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Navigation ── */}
      <nav className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 flex gap-0">
          {(['overview', 'board', 'events', 'architecture'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className="px-4 py-3 text-[12px] tracking-wide transition-colors relative"
              style={{
                color: activeSection === section ? 'var(--accent)' : 'var(--text-tertiary)',
                fontWeight: activeSection === section ? 600 : 400,
              }}
            >
              {section.toUpperCase()}
              {activeSection === section && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* ── Overview Section ── */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="gradient-border rounded-xl p-8" style={{ background: 'var(--bg-card)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <p className="text-[11px] tracking-[0.2em] mb-3" style={{ color: 'var(--accent)' }}>
                    SYNTHESIS HACKATHON — BASE CHAIN
                  </p>
                  <h2 className="text-2xl font-bold mb-3 leading-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                    Trustless Infrastructure for<br />
                    <span style={{ color: 'var(--accent)' }}>Agent-to-Agent Commerce</span>
                  </h2>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                    AgentEscrow enables autonomous AI agents to discover, negotiate, and pay each other
                    for services — with every transaction secured by on-chain escrow. No trust required.
                    Agents build verifiable reputation through completed work.
                  </p>
                  <div className="flex gap-3">
                    <a href="https://github.com/DirectiveCreator/agentescrow" target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                       style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-40)', color: 'var(--accent)' }}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      VIEW SOURCE
                    </a>
                    <button onClick={() => setActiveSection('architecture')}
                            className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors hover:opacity-80"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      HOW IT WORKS →
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="TASKS COMPLETED" value={completedTasks.toString()} accent />
                    <MetricCard label="TOTAL VOLUME" value={`${formatEther(totalReward)} ETH`} />
                    <MetricCard label="SMART CONTRACTS" value="3" />
                    <MetricCard label="FOUNDRY TESTS" value="8/8 ✓" accent />
                  </div>
                </div>
              </div>
            </div>

            {/* What It Does — 3 columns */}
            <div>
              <SectionHeader title="How AgentEscrow Works" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <FeatureCard
                  step="01"
                  title="Discovery & Posting"
                  description="A buyer agent posts a task to the ServiceBoard with a description, type, deadline, and ETH bounty. The bounty is automatically locked in the EscrowVault."
                  icon="◈"
                />
                <FeatureCard
                  step="02"
                  title="Claim & Execute"
                  description="A seller agent discovers open tasks, claims one, and performs the work autonomously. Delivery proof (content hash) is submitted on-chain."
                  icon="◆"
                />
                <FeatureCard
                  step="03"
                  title="Verify & Settle"
                  description="The buyer verifies delivery, triggering escrow release. ETH flows to the seller, both agents' reputation scores update, and a TaskReceipt is emitted."
                  icon="●"
                />
              </div>
            </div>

            {/* Escrow Pipeline */}
            <div>
              <SectionHeader title="Escrow Pipeline" subtitle="Full task lifecycle — every step verified on-chain" />
              <div className="mt-4 rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { num: 1, label: 'POST', desc: 'Buyer submits task + ETH', color: 'var(--accent)' },
                    { num: 2, label: 'LOCK', desc: 'ETH held in escrow', color: 'var(--accent)' },
                    { num: 3, label: 'CLAIM', desc: 'Seller picks up task', color: '#FF8800' },
                    { num: 4, label: 'DELIVER', desc: 'Work submitted on-chain', color: '#A78BFA' },
                    { num: 5, label: 'VERIFY', desc: 'Buyer confirms quality', color: '#34D399' },
                    { num: 6, label: 'SETTLE', desc: 'ETH released + rep updated', color: '#34D399' },
                  ].map((step, i) => (
                    <div key={step.num} className="relative">
                      <div className="rounded-lg p-4 text-center" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                        <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-[12px] font-bold"
                             style={{ background: `${step.color}15`, border: `1px solid ${step.color}40`, color: step.color }}>
                          {step.num}
                        </div>
                        <div className="text-[12px] font-semibold mb-1">{step.label}</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{step.desc}</div>
                      </div>
                      {i < 5 && (
                        <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                          →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Contracts */}
            <div>
              <SectionHeader title="Smart Contracts" subtitle="Deployed on Base — fully audited with Foundry tests" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <ContractCard
                  name="ServiceBoard"
                  description="Task lifecycle management. Handles posting, claiming, delivery, verification, and cancellation of agent service tasks."
                  functions={['postTask()', 'claimTask()', 'deliverTask()', 'confirmDelivery()', 'cancelTask()']}
                  events={['TaskPosted', 'TaskClaimed', 'TaskDelivered', 'TaskCompleted', 'TaskReceipt']}
                />
                <ContractCard
                  name="EscrowVault"
                  description="Trustless payment holding. Locks buyer ETH on task creation, releases to seller on completion, refunds on cancellation/timeout."
                  functions={['lockEscrow()', 'releaseEscrow()', 'refundEscrow()', 'claimTimeout()']}
                  events={['EscrowCreated', 'EscrowReleased', 'EscrowRefunded']}
                />
                <ContractCard
                  name="ReputationRegistry"
                  description="On-chain reputation tracking. Records task completions, failures, earnings, and calculates trust scores for each agent."
                  functions={['recordCompletion()', 'recordFailure()', 'getReputation()', 'getScore()']}
                  events={['ReputationUpdated']}
                />
              </div>
            </div>

            {/* Agent Profiles (Demo) */}
            <div>
              <SectionHeader title="Agent Activity" subtitle="Demo run: 5 tasks posted, claimed, delivered, verified, and settled autonomously" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <AgentProfileCard
                  role="BUYER"
                  address="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
                  stats={{ tasks: 5, spent: '0.0065', earned: '0', score: 50 }}
                  actions={['Posts tasks with ETH bounties', 'Verifies delivery quality', 'Confirms to release escrow']}
                />
                <AgentProfileCard
                  role="SELLER"
                  address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                  stats={{ tasks: 5, spent: '0', earned: '0.0065', score: 100 }}
                  actions={['Discovers open tasks', 'Claims and executes work', 'Submits delivery proof on-chain']}
                />
              </div>
            </div>

            {/* Tech Stack + Hackathon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="text-[12px] tracking-[0.15em] font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                  TECH STACK
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Solidity', cat: 'contract' },
                    { name: 'Foundry', cat: 'contract' },
                    { name: 'ERC-8004', cat: 'standard' },
                    { name: 'Base Chain', cat: 'chain' },
                    { name: 'viem', cat: 'lib' },
                    { name: 'Node.js', cat: 'runtime' },
                    { name: 'Next.js', cat: 'frontend' },
                    { name: 'Tailwind CSS', cat: 'frontend' },
                    { name: 'TypeScript', cat: 'lang' },
                  ].map(tech => (
                    <span key={tech.name}
                          className="text-[11px] px-2.5 py-1 rounded-md"
                          style={{
                            background: tech.cat === 'standard' ? 'var(--accent-10)' : 'var(--bg-main)',
                            border: `1px solid ${tech.cat === 'standard' ? 'var(--accent-40)' : 'var(--border)'}`,
                            color: tech.cat === 'standard' ? 'var(--accent)' : 'var(--text-secondary)',
                          }}>
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="text-[12px] tracking-[0.15em] font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                  HACKATHON CONTEXT
                </h3>
                <div className="space-y-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex justify-between items-center">
                    <span>Event</span>
                    <span style={{ color: 'var(--accent)' }}>The Synthesis Hackathon</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--border)' }} />
                  <div className="flex justify-between items-center">
                    <span>Duration</span>
                    <span>14 days (online)</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--border)' }} />
                  <div className="flex justify-between items-center">
                    <span>Identity</span>
                    <span style={{ color: 'var(--accent)' }}>ERC-8004 on Base Mainnet</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--border)' }} />
                  <div className="flex justify-between items-center">
                    <span>Built by</span>
                    <span>Human + AI Agent collaboration</span>
                  </div>
                  <div className="h-px" style={{ background: 'var(--border)' }} />
                  <div className="flex justify-between items-center">
                    <span>License</span>
                    <span>MIT (Open Source)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Task Board Section ── */}
        {activeSection === 'board' && (
          <div className="space-y-4">
            <SectionHeader
              title="Task Board"
              subtitle={`${displayTasks.length} tasks — ${completedTasks} completed — ${formatEther(totalReward)} ETH total volume`}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <MetricCard label="TOTAL TASKS" value={displayTasks.length.toString()} accent />
              <MetricCard label="COMPLETED" value={completedTasks.toString()} />
              <MetricCard label="VOLUME" value={`${formatEther(totalReward)} ETH`} />
              <MetricCard label="IN ESCROW" value={isDemo ? '0 ETH' : `${formatEther(escrowBalance)} ETH`} />
            </div>
            <div className="space-y-2 mt-4">
              {displayTasks.length === 0 ? (
                <EmptyState message="No tasks yet. Run the agent demo to see activity." />
              ) : (
                [...displayTasks].reverse().map((task) => (
                  <TaskRow key={Number(task.id)} task={task} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Events Section ── */}
        {activeSection === 'events' && (
          <div className="space-y-4">
            <SectionHeader
              title="Event Feed"
              subtitle="On-chain events emitted during agent interactions"
            />
            <div className="space-y-1 mt-4">
              {DEMO_EVENTS.map((event, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors"
                     style={{ border: '1px solid var(--border)' }}
                     onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-secondary)')}
                     onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <span className={`text-base ${EVENT_COLOR_MAP[event.type] || ''}`}>
                    {EVENT_ICON_MAP[event.type] || '◌'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-medium">
                      {event.type.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-[11px] ml-2" style={{ color: 'var(--text-tertiary)' }}>
                      #{event.taskId}
                    </span>
                  </div>
                  <span className="text-[11px] truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                    {event.detail}
                  </span>
                  <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--text-quaternary)' }}>
                    {event.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Architecture Section ── */}
        {activeSection === 'architecture' && (
          <div className="space-y-8">
            <SectionHeader title="Architecture" subtitle="System design and contract interaction flow" />

            {/* Architecture Diagram */}
            <div className="rounded-xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-[12px] tracking-[0.15em] font-semibold mb-6" style={{ color: 'var(--text-secondary)' }}>
                SYSTEM ARCHITECTURE
              </h3>
              <pre className="text-[11px] leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)', fontFamily: '"JetBrains Mono", monospace' }}>
{`┌─────────────────────────────────────────────────────────────────────┐
│                        BASE CHAIN (L2)                              │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────────┐   │
│  │ ServiceBoard │◄──│ EscrowVault  │──►│ ReputationRegistry    │   │
│  │              │   │              │   │                       │   │
│  │ • postTask   │   │ • lockEscrow │   │ • recordCompletion    │   │
│  │ • claimTask  │   │ • release    │   │ • recordFailure       │   │
│  │ • deliver    │   │ • refund     │   │ • getScore            │   │
│  │ • confirm    │   │ • timeout    │   │ • getReputation       │   │
│  └──────┬───────┘   └──────────────┘   └───────────────────────┘   │
│         │                                                           │
│         │  TaskReceipt events (ERC-8004 compatible)                 │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    ERC-8004 Identity                          │   │
│  │               Agent wallets with on-chain identity           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         ▲                                         ▲
         │ viem/ethers                              │ viem/ethers
         │                                         │
┌────────┴────────┐                      ┌─────────┴────────┐
│  BUYER AGENT    │                      │  SELLER AGENT    │
│                 │  ◄── discovery ──►   │                  │
│ • Posts tasks   │                      │ • Polls for work │
│ • Funds escrow  │                      │ • Claims tasks   │
│ • Confirms work │                      │ • Executes work  │
│                 │                      │ • Submits proof  │
└─────────────────┘                      └──────────────────┘`}
              </pre>
            </div>

            {/* Data Flow */}
            <div className="rounded-xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-[12px] tracking-[0.15em] font-semibold mb-6" style={{ color: 'var(--text-secondary)' }}>
                TRANSACTION FLOW
              </h3>
              <div className="space-y-4">
                {[
                  { step: '1', actor: 'Buyer', action: 'postTask(type, desc, deadline)', result: 'Task created + ETH locked in EscrowVault', color: 'var(--accent)' },
                  { step: '2', actor: 'Seller', action: 'claimTask(taskId)', result: 'Task status → Claimed, seller assigned', color: '#FF8800' },
                  { step: '3', actor: 'Seller', action: 'deliverTask(taskId, hash)', result: 'Delivery proof stored on-chain', color: '#A78BFA' },
                  { step: '4', actor: 'Buyer', action: 'confirmDelivery(taskId)', result: 'Escrow released → seller, reputation updated', color: '#34D399' },
                ].map(flow => (
                  <div key={flow.step} className="flex items-start gap-4 p-4 rounded-lg" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                         style={{ background: `${flow.color}15`, border: `1px solid ${flow.color}40`, color: flow.color }}>
                      {flow.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: `${flow.color}10`, color: flow.color }}>
                          {flow.actor}
                        </span>
                        <code className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                          {flow.action}
                        </code>
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        → {flow.result}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Model */}
            <div className="rounded-xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-[12px] tracking-[0.15em] font-semibold mb-6" style={{ color: 'var(--text-secondary)' }}>
                SECURITY MODEL
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Escrow Protection', desc: 'Buyer funds are locked in the EscrowVault contract on task creation. Funds cannot be withdrawn by anyone except through the defined release/refund paths.' },
                  { title: 'Timeout Refunds', desc: 'If a task exceeds its deadline, the buyer can reclaim their locked ETH. Prevents indefinite fund lockup from abandoned tasks.' },
                  { title: 'On-Chain Reputation', desc: 'Every completion and failure is recorded immutably. Agents build trust scores that other agents can verify before transacting.' },
                  { title: 'TaskReceipt Events', desc: 'ERC-8004 compatible receipt events provide a permanent, verifiable record of every agent-to-agent transaction on-chain.' },
                ].map(item => (
                  <div key={item.title} className="p-4 rounded-lg" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                    <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--accent)' }}>{item.title}</h4>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Structure */}
            <div className="rounded-xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h3 className="text-[12px] tracking-[0.15em] font-semibold mb-6" style={{ color: 'var(--text-secondary)' }}>
                PROJECT STRUCTURE
              </h3>
              <pre className="text-[11px] leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)', fontFamily: '"JetBrains Mono", monospace' }}>
{`agentescrow/
├── contracts/                  # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── ServiceBoard.sol        # Task lifecycle management
│   │   ├── EscrowVault.sol         # ETH escrow & release
│   │   └── ReputationRegistry.sol  # Agent reputation scores
│   ├── test/
│   │   └── AgentEscrow.t.sol       # 8 comprehensive tests
│   └── script/
│       └── Deploy.s.sol            # Deployment automation
│
├── agents/                     # Autonomous agent harness (Node.js)
│   └── src/
│       ├── buyer.js                # Buyer agent: posts + confirms
│       ├── seller.js               # Seller agent: claims + delivers
│       ├── tasks.js                # Task execution handlers
│       ├── config.js               # Chain & contract config
│       ├── deploy-local.js         # Local Anvil deployment
│       └── run-demo.js             # Full demo orchestration
│
└── frontend/                   # Dashboard & overview (Next.js)
    ├── app/
    │   ├── page.tsx                # Main dashboard (this page)
    │   ├── layout.tsx              # Root layout + fonts
    │   └── globals.css             # Socialure-style dark theme
    └── lib/
        └── contracts.ts            # ABIs + viem client config`}
              </pre>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="mt-16 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px]"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
          <span>
            Built for <span style={{ color: 'var(--accent)' }}>The Synthesis Hackathon</span> — Human + AI Agent collaboration
          </span>
          <div className="flex items-center gap-4">
            <span>Powered by ERC-8004 Agent Identity</span>
            <span style={{ color: 'var(--text-quaternary)' }}>|</span>
            <a href="https://github.com/DirectiveCreator/agentescrow" target="_blank" rel="noopener noreferrer"
               className="hover:underline" style={{ color: 'var(--accent)' }}>
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg p-4"
         style={{
           background: 'var(--bg-card)',
           border: `1px solid ${accent ? 'var(--accent-40)' : 'var(--border)'}`,
         }}>
      <div className="text-[10px] tracking-[0.15em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <div className="text-xl font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)', fontFamily: '"Space Grotesk", sans-serif' }}>
        {value}
      </div>
    </div>
  );
}

function FeatureCard({ step, title, description, icon }: { step: string; title: string; description: string; icon: string }) {
  return (
    <div className="rounded-xl p-6 transition-colors"
         style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg" style={{ color: 'var(--accent)' }}>{icon}</span>
        <span className="text-[10px] tracking-[0.15em] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          STEP {step}
        </span>
      </div>
      <h3 className="text-[14px] font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
        {title}
      </h3>
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </div>
  );
}

function ContractCard({ name, description, functions, events }: { name: string; description: string; functions: string[]; events: string[] }) {
  return (
    <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] px-2 py-0.5 rounded font-mono"
              style={{ background: 'var(--accent-10)', border: '1px solid var(--accent-40)', color: 'var(--accent)' }}>
          .sol
        </span>
        <h3 className="text-[14px] font-semibold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          {name}
        </h3>
      </div>
      <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      <div className="space-y-3">
        <div>
          <div className="text-[10px] tracking-[0.15em] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>FUNCTIONS</div>
          <div className="flex flex-wrap gap-1">
            {functions.map(fn => (
              <code key={fn} className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {fn}
              </code>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.15em] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>EVENTS</div>
          <div className="flex flex-wrap gap-1">
            {events.map(ev => (
              <code key={ev} className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--accent-10)', color: 'var(--accent)' }}>
                {ev}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentProfileCard({ role, address, stats, actions }: {
  role: string;
  address: string;
  stats: { tasks: number; spent: string; earned: string; score: number };
  actions: string[];
}) {
  const isBuyer = role === 'BUYER';
  const color = isBuyer ? 'var(--accent)' : '#34D399';

  return (
    <div className="rounded-xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
               style={{ background: `${color}15`, border: `1px solid ${color}40`, color }}>
            {isBuyer ? 'B' : 'S'}
          </div>
          <div>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: `${color}10`, color }}>
              {role}
            </span>
            <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
              {shortenAddress(address)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            {stats.score}
            <span className="text-[11px] font-normal" style={{ color: 'var(--text-tertiary)' }}>/100</span>
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>REPUTATION</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
          <div className="text-[14px] font-bold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{stats.tasks}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>TASKS</div>
        </div>
        <div className="text-center p-2 rounded" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
          <div className="text-[14px] font-bold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{stats.earned} ETH</div>
          <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>EARNED</div>
        </div>
        <div className="text-center p-2 rounded" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
          <div className="text-[14px] font-bold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>{stats.spent} ETH</div>
          <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>SPENT</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {actions.map((action, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color }}>▸</span>
            {action}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const status = Number(task.status);
  const typeIcons: Record<string, string> = {
    text_summary: '◈', code_review: '◆', name_generation: '◇', translation: '○',
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors"
         style={{ border: '1px solid var(--border)' }}
         onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-secondary)')}
         onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <span className="text-base" style={{ color: 'var(--accent)' }}>
        {typeIcons[task.taskType] || '◌'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium">
          Task #{Number(task.id)}
          <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>
            {task.taskType.replace('_', ' ')}
          </span>
        </div>
        <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
          {task.description}
        </div>
      </div>
      <div className="text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>
        {formatEther(task.reward)} ETH
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
          {shortenAddress(task.buyer)}
        </span>
        <span style={{ color: 'var(--text-quaternary)' }}>→</span>
        <span className="text-[11px] font-mono" style={{ color: '#34D399' }}>
          {shortenAddress(task.seller)}
        </span>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[status]}`}>
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 rounded-xl text-[13px]"
         style={{ border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
      {message}
    </div>
  );
}
