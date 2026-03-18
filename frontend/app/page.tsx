'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { formatEther } from 'viem';
import { publicClient, ServiceBoardABI, ReputationRegistryABI, EscrowVaultABI, CONTRACTS } from '@/lib/contracts';

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

type EventLog = {
  type: string;
  taskId: number;
  detail: string;
  timestamp: Date;
  txHash?: string;
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Open',
  1: 'Claimed',
  2: 'Delivered',
  3: 'Completed',
  4: 'Cancelled',
  5: 'Disputed',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  3: 'bg-green-500/20 text-green-400 border-green-500/30',
  4: 'bg-red-500/20 text-red-400 border-red-500/30',
  5: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const TASK_TYPE_ICONS: Record<string, string> = {
  text_summary: '📝',
  code_review: '🔍',
  name_generation: '💡',
  translation: '🌐',
};

const EVENT_ICONS: Record<string, string> = {
  TaskPosted: '📋',
  TaskClaimed: '🤝',
  TaskDelivered: '📦',
  TaskCompleted: '✅',
  TaskCancelled: '❌',
  EscrowCreated: '🔒',
  EscrowReleased: '💰',
  ReputationUpdated: '⭐',
};

function shortenAddress(addr: string) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '-';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [escrowBalance, setEscrowBalance] = useState<bigint>(0n);
  const [agents, setAgents] = useState<Map<string, AgentReputation>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventLog[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'events'>('board');
  const prevTaskCountRef = useRef(0);

  const addEvent = useCallback((event: EventLog) => {
    setEvents(prev => [event, ...prev].slice(0, 50));
  }, []);

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

      // Detect new events by comparing with previous state
      if (prevTaskCountRef.current > 0) {
        for (let i = prevTaskCountRef.current; i < fetchedTasks.length; i++) {
          const t = fetchedTasks[i];
          addEvent({
            type: 'TaskPosted',
            taskId: Number(t.id),
            detail: `${t.taskType.replace('_', ' ')} - ${formatEther(t.reward)} ETH`,
            timestamp: new Date(),
          });
        }
      }
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
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setIsConnected(false);
    }
  }, [addEvent]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const completedTasks = tasks.filter(t => Number(t.status) === 3).length;
  const activeTasks = tasks.filter(t => [0, 1, 2].includes(Number(t.status))).length;
  const totalReward = tasks.reduce((sum, t) => sum + t.reward, 0n);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold">
              AE
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-blue-400">Agent</span>Escrow
              </h1>
              <p className="text-gray-500 text-xs">Trustless Agent-to-Agent Marketplace on Base</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-xs px-2 py-1 rounded bg-gray-900 border border-gray-800 font-mono">
              Base Sepolia
            </span>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard title="Total Tasks" value={tasks.length.toString()} icon="📋" />
          <StatCard title="Active" value={activeTasks.toString()} icon="⚡" color="yellow" />
          <StatCard title="Completed" value={completedTasks.toString()} icon="✅" color="green" />
          <StatCard title="Volume" value={`${formatEther(totalReward)} ETH`} icon="💎" color="blue" />
          <StatCard title="In Escrow" value={`${formatEther(escrowBalance)} ETH`} icon="🔒" color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Tab selector */}
            <div className="flex items-center gap-1 mb-4 bg-gray-900 rounded-lg p-1 w-fit">
              <button
                onClick={() => setActiveTab('board')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'board' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Task Board
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'events' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Event Feed
                {events.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                    {events.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'board' ? (
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <EmptyState message="No tasks yet. Run the agent demo to see activity." />
                ) : (
                  [...tasks].reverse().map((task, i) => (
                    <TaskCard key={Number(task.id)} task={task} />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {events.length === 0 ? (
                  <EmptyState message="No events yet. Events appear as agents interact on-chain." />
                ) : (
                  events.map((event, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <span className="text-lg">{EVENT_ICONS[event.type] || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {event.type.replace(/([A-Z])/g, ' $1').trim()} #{event.taskId}
                        </div>
                        <div className="text-gray-400 text-xs truncate">{event.detail}</div>
                      </div>
                      <span className="text-gray-500 text-xs whitespace-nowrap">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Profiles */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-blue-400">⬡</span> Agent Profiles
              </h2>
              <div className="space-y-3">
                {Array.from(agents.entries()).map(([addr, rep]) => (
                  <AgentCard
                    key={addr}
                    address={addr}
                    reputation={rep}
                    isBuyer={rep.totalSpent > 0n && rep.totalEarned === 0n}
                  />
                ))}
                {agents.size === 0 && (
                  <EmptyState message="No agents active yet" small />
                )}
              </div>
            </div>

            {/* Escrow Pipeline */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-purple-400">⬡</span> Escrow Pipeline
              </h2>
              <div className="border border-gray-800 rounded-lg p-4">
                <div className="space-y-4">
                  <PipelineStep num={1} label="Post" desc="Buyer posts task + ETH" active={activeTasks > 0} />
                  <PipelineArrow />
                  <PipelineStep num={2} label="Lock" desc="ETH held in escrow vault" active={escrowBalance > 0n} />
                  <PipelineArrow />
                  <PipelineStep num={3} label="Claim" desc="Seller discovers & claims" active={tasks.some(t => Number(t.status) === 1)} />
                  <PipelineArrow />
                  <PipelineStep num={4} label="Deliver" desc="Seller executes & submits" active={tasks.some(t => Number(t.status) === 2)} />
                  <PipelineArrow />
                  <PipelineStep num={5} label="Verify" desc="Buyer confirms delivery" active={completedTasks > 0} />
                  <PipelineArrow />
                  <PipelineStep num={6} label="Settle" desc="ETH released + rep updated" active={completedTasks > 0} />
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Built With</h3>
              <div className="flex flex-wrap gap-2">
                {['Solidity', 'Foundry', 'viem', 'Node.js', 'Next.js', 'Base', 'ERC-8004'].map(tech => (
                  <span key={tech} className="px-2 py-1 rounded bg-gray-900 border border-gray-800 text-xs text-gray-400">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-800 flex items-center justify-between text-gray-500 text-xs">
          <span>Built for <span className="text-blue-400">The Synthesis Hackathon</span></span>
          <span>Powered by ERC-8004 Agent Identity</span>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'gray' }: { title: string; value: string; icon: string; color?: string }) {
  const borderColors: Record<string, string> = {
    gray: 'border-gray-800',
    green: 'border-green-500/20',
    blue: 'border-blue-500/20',
    purple: 'border-purple-500/20',
    yellow: 'border-yellow-500/20',
  };

  return (
    <div className={`border ${borderColors[color] || borderColors.gray} rounded-lg p-3 bg-gray-900/50`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-gray-400 text-xs">{title}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const status = Number(task.status);
  const icon = TASK_TYPE_ICONS[task.taskType] || '📋';

  return (
    <div className="border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors bg-gray-900/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-medium text-sm">
              Task #{Number(task.id)} &middot; {task.taskType.replace('_', ' ')}
            </div>
            <div className="text-gray-400 text-xs mt-0.5 max-w-md truncate">
              {task.description}
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>💎 <span className="text-white font-medium">{formatEther(task.reward)} ETH</span></span>
        <span>Buyer: <span className="text-blue-400 font-mono">{shortenAddress(task.buyer)}</span></span>
        {task.seller !== '0x0000000000000000000000000000000000000000' && (
          <span>Seller: <span className="text-green-400 font-mono">{shortenAddress(task.seller)}</span></span>
        )}
        {task.deliveryHash && (
          <span>📦 <span className="text-purple-400 font-mono">{task.deliveryHash.substring(0, 16)}...</span></span>
        )}
      </div>
    </div>
  );
}

function AgentCard({ address, reputation, isBuyer }: { address: string; reputation: AgentReputation; isBuyer: boolean }) {
  const totalTasks = Number(reputation.tasksCompleted) + Number(reputation.tasksFailed);
  const score = totalTasks > 0 ? Math.round((Number(reputation.tasksCompleted) / totalTasks) * 100) : 50;

  return (
    <div className="border border-gray-800 rounded-lg p-4 bg-gray-900/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{isBuyer ? '🛒' : '🔧'}</span>
            <span className="font-mono text-sm">{shortenAddress(address)}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${isBuyer ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
              {isBuyer ? 'Buyer' : 'Seller'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{score}<span className="text-xs text-gray-500">/100</span></div>
          <div className="text-gray-500 text-xs">reputation</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Completed" value={Number(reputation.tasksCompleted).toString()} />
        <MiniStat label="Earned" value={reputation.totalEarned > 0n ? `${formatEther(reputation.totalEarned)}` : '-'} />
        <MiniStat label="Spent" value={reputation.totalSpent > 0n ? `${formatEther(reputation.totalSpent)}` : '-'} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-medium">{value}</div>
      <div className="text-gray-500 text-[10px]">{label}</div>
    </div>
  );
}

function PipelineStep({ num, label, desc, active }: { num: number; label: string; desc: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${active ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
        {num}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-gray-500 text-xs">{desc}</div>
      </div>
    </div>
  );
}

function PipelineArrow() {
  return <div className="ml-3.5 w-px h-3 bg-gray-700" />;
}

function EmptyState({ message, small = false }: { message: string; small?: boolean }) {
  return (
    <div className={`text-gray-500 text-center border border-gray-800 rounded-lg ${small ? 'py-6 text-sm' : 'py-12'}`}>
      {message}
    </div>
  );
}
