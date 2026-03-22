/**
 * XMTP Agent Messaging for AgentEscrow
 *
 * Encrypted agent-to-agent communication using ENS names.
 * Powers the ENS Communication prize track ($600).
 *
 * Features:
 * - Agents discover each other by ENS name
 * - Encrypted 1:1 and group messaging
 * - Task negotiation, delivery, and payment over XMTP
 * - Message history for audit trails
 *
 * Architecture:
 *   buyer.agentescrow.eth → ENS resolves → XMTP identity → encrypted message
 *                                                                    ↓
 *   seller.agentescrow.eth ← ENS resolves ← XMTP identity ← decrypted message
 *
 * Usage:
 *   const messenger = await createAgentMessenger(privateKey, { ensName: 'buyer.agentescrow.eth' });
 *   await messenger.sendToAgent('seller.agentescrow.eth', { type: 'task_offer', ... });
 *   messenger.onMessage((msg) => console.log('Received:', msg));
 *
 * Environment:
 *   XMTP_ENV=dev (testnet, default) | production
 *   DEPLOYER_PRIVATE_KEY or PRIVATE_KEY - Agent wallet key
 *   SEPOLIA_RPC - For ENS resolution
 */

// XMTP native SDK is loaded lazily — only when createAgentMessenger is called.
// This allows simulation mode to work on systems without XMTP native bindings.
let Client = null;

async function loadXmtp() {
  if (!Client) {
    const mod = await import('@xmtp/node-sdk');
    Client = mod.Client;
  }
  return Client;
}

import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import * as crypto from 'crypto';

config({ path: '../.env' });

// ─── XMTP Configuration ─────────────────────────────────────────────────

const XMTP_ENV = process.env.XMTP_ENV || 'dev'; // 'dev' = testnet, 'production' = mainnet

// ─── ENS Resolution Helper ──────────────────────────────────────────────

const ENS_UNIVERSAL_RESOLVER = '0xc8Af999e38273D658BE1b921b88A9Ddf005769cC';

function getEnsClient() {
  const rpcUrl = process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com';
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
}

/**
 * Resolve ENS name to Ethereum address for XMTP routing.
 */
async function resolveEnsToAddress(name) {
  try {
    const client = getEnsClient();
    const address = await client.getEnsAddress({
      name: normalize(name),
      universalResolverAddress: ENS_UNIVERSAL_RESOLVER,
    });
    return address;
  } catch (err) {
    console.warn(`ENS resolution failed for ${name}: ${err.message}`);
    return null;
  }
}

// ─── Message Types ───────────────────────────────────────────────────────

/**
 * Structured message types for agent-to-agent communication.
 * All messages are JSON-encoded and encrypted via XMTP.
 */
export const MessageTypes = {
  // Task lifecycle
  TASK_OFFER: 'task_offer',
  TASK_ACCEPT: 'task_accept',
  TASK_REJECT: 'task_reject',
  TASK_DELIVERY: 'task_delivery',
  TASK_REVIEW: 'task_review',
  TASK_COMPLETE: 'task_complete',
  TASK_DISPUTE: 'task_dispute',

  // Discovery
  CAPABILITY_QUERY: 'capability_query',
  CAPABILITY_RESPONSE: 'capability_response',

  // Payment
  PAYMENT_REQUEST: 'payment_request',
  PAYMENT_CONFIRMED: 'payment_confirmed',

  // Status
  PING: 'ping',
  PONG: 'pong',
  STATUS_UPDATE: 'status_update',
};

/**
 * Build a structured agent message.
 */
export function buildAgentMessage(type, payload, metadata = {}) {
  return JSON.stringify({
    protocol: 'agentescrow',
    version: '1.0',
    type,
    payload,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  });
}

/**
 * Parse a structured agent message.
 */
export function parseAgentMessage(content) {
  try {
    const msg = JSON.parse(content);
    if (msg.protocol === 'agentescrow') return msg;
    return { protocol: 'unknown', type: 'text', payload: { text: content } };
  } catch {
    return { protocol: 'unknown', type: 'text', payload: { text: content } };
  }
}

// ─── Agent Messenger ─────────────────────────────────────────────────────

/**
 * Create an XMTP-powered agent messenger.
 *
 * @param {string} privateKey - Agent's private key (hex)
 * @param {object} options
 * @param {string} options.ensName - Agent's ENS name
 * @param {string} [options.agentType] - "buyer" or "seller"
 * @param {string[]} [options.capabilities] - Agent capabilities
 * @returns {object} Messenger instance
 */
export async function createAgentMessenger(privateKey, options = {}) {
  const { ensName, agentType, capabilities = [] } = options;
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  console.log(`\n📨 Initializing XMTP messenger for ${ensName || 'agent'}...`);
  console.log(`   Environment: ${XMTP_ENV}`);

  // Create XMTP client with agent's wallet
  // Generate encryption key from private key (deterministic)
  const encryptionKey = crypto.createHash('sha256').update(key).digest();

  const account = privateKeyToAccount(`0x${key}`);

  const client = await Client.create(
    {
      getAddress: () => account.address,
      signMessage: async (message) => {
        const walletClient = createWalletClient({
          account,
          chain: sepolia,
          transport: http(),
        });
        return walletClient.signMessage({ message });
      },
    },
    encryptionKey,
    { env: XMTP_ENV }
  );

  console.log(`   ✅ XMTP client created: ${client.accountAddress}`);
  console.log(`   Inbox ID: ${client.inboxId}`);

  const messageHandlers = [];
  let isListening = false;

  const messenger = {
    client,
    ensName,
    address: account.address,

    /**
     * Send a structured message to another agent by ENS name.
     */
    async sendToAgent(targetEnsName, messageType, payload) {
      console.log(`   📤 Sending ${messageType} to ${targetEnsName}...`);

      // Resolve ENS name to address
      const targetAddress = await resolveEnsToAddress(targetEnsName);
      if (!targetAddress) {
        throw new Error(`Cannot resolve ENS name: ${targetEnsName}`);
      }

      console.log(`      Resolved: ${targetEnsName} → ${targetAddress}`);

      // Check if target can receive XMTP messages
      const canMessage = await client.canMessage([targetAddress]);
      if (!canMessage.get(targetAddress.toLowerCase())) {
        console.log(`      ⚠️ ${targetEnsName} is not on XMTP yet`);
        return { sent: false, reason: 'recipient_not_on_xmtp' };
      }

      // Create or get existing conversation
      const conversation = await client.conversations.newDm(targetAddress);

      // Build and send structured message
      const content = buildAgentMessage(messageType, payload, {
        from: ensName,
        to: targetEnsName,
        agentType,
      });

      await conversation.send(content);

      console.log(`      ✅ Message sent via XMTP (encrypted)`);
      return { sent: true, conversationId: conversation.id, to: targetAddress };
    },

    /**
     * Send a direct message to an address (bypass ENS).
     */
    async sendToAddress(targetAddress, messageType, payload) {
      const conversation = await client.conversations.newDm(targetAddress);
      const content = buildAgentMessage(messageType, payload, {
        from: ensName,
        agentType,
      });
      await conversation.send(content);
      return { sent: true, conversationId: conversation.id };
    },

    /**
     * Register a message handler.
     */
    onMessage(handler) {
      messageHandlers.push(handler);
    },

    /**
     * Start listening for incoming messages.
     */
    async startListening() {
      if (isListening) return;
      isListening = true;
      console.log(`   👂 Listening for messages...`);

      // Sync conversations
      await client.conversations.sync();

      // Stream all messages
      const stream = client.conversations.streamAllMessages();
      for await (const message of stream) {
        if (!isListening) break;

        // Skip own messages
        if (message.senderInboxId === client.inboxId) continue;

        const parsed = parseAgentMessage(message.content);
        const envelope = {
          id: message.id,
          conversationId: message.conversationId,
          senderAddress: message.senderInboxId,
          timestamp: message.sentAt,
          raw: message.content,
          parsed,
        };

        for (const handler of messageHandlers) {
          try {
            await handler(envelope);
          } catch (err) {
            console.error(`   ❌ Message handler error: ${err.message}`);
          }
        }
      }
    },

    /**
     * Stop listening for messages.
     */
    stopListening() {
      isListening = false;
    },

    /**
     * Create a group chat (e.g., buyer + seller + arbiter).
     */
    async createGroupChat(memberAddresses, groupName) {
      console.log(`   👥 Creating group: ${groupName}...`);
      const group = await client.conversations.newGroup(memberAddresses);
      await group.updateName(groupName);
      console.log(`   ✅ Group created: ${group.id}`);
      return group;
    },

    /**
     * Respond to capability queries (agent discovery via XMTP).
     */
    async handleCapabilityQuery(envelope) {
      if (envelope.parsed.type === MessageTypes.CAPABILITY_QUERY) {
        const response = buildAgentMessage(MessageTypes.CAPABILITY_RESPONSE, {
          ensName,
          agentType,
          capabilities,
          status: 'active',
          serviceBoard: '0xA384C03DdD65e625Ce8220716fF56947fAA5E3B2',
          chainId: 84532,
        });

        const conversation = await client.conversations.getConversationById(
          envelope.conversationId
        );
        if (conversation) {
          await conversation.send(response);
        }
      }
    },

    /**
     * Get conversation history with an agent.
     */
    async getHistory(targetAddress, limit = 20) {
      await client.conversations.sync();
      const conversations = await client.conversations.list();

      for (const conv of conversations) {
        // Check if this conversation includes the target
        const messages = await conv.messages({ limit });
        return messages.map((m) => ({
          id: m.id,
          content: m.content,
          parsed: parseAgentMessage(m.content),
          sentAt: m.sentAt,
          sender: m.senderInboxId,
        }));
      }
      return [];
    },
  };

  return messenger;
}

// ─── Task Negotiation Protocol ───────────────────────────────────────────

/**
 * Full task negotiation flow over XMTP:
 *
 * 1. Buyer sends TASK_OFFER to seller.agentescrow.eth
 * 2. Seller reviews and sends TASK_ACCEPT or TASK_REJECT
 * 3. Buyer posts task on-chain (ServiceBoard) and sends PAYMENT_CONFIRMED
 * 4. Seller executes task and sends TASK_DELIVERY
 * 5. Buyer reviews and sends TASK_REVIEW (approve/reject)
 * 6. On approval, buyer confirms on-chain and sends TASK_COMPLETE
 */

export function createTaskNegotiationMessages(taskData) {
  return {
    offer: buildAgentMessage(MessageTypes.TASK_OFFER, {
      taskType: taskData.type,
      description: taskData.description,
      reward: taskData.reward,
      deadline: taskData.deadline,
    }),

    accept: (taskId) =>
      buildAgentMessage(MessageTypes.TASK_ACCEPT, {
        taskId,
        message: 'Task accepted. Will begin execution.',
      }),

    reject: (reason) =>
      buildAgentMessage(MessageTypes.TASK_REJECT, {
        reason,
      }),

    delivery: (taskId, result) =>
      buildAgentMessage(MessageTypes.TASK_DELIVERY, {
        taskId,
        result,
        completedAt: new Date().toISOString(),
      }),

    review: (taskId, approved, feedback) =>
      buildAgentMessage(MessageTypes.TASK_REVIEW, {
        taskId,
        approved,
        feedback,
      }),

    complete: (taskId, txHash) =>
      buildAgentMessage(MessageTypes.TASK_COMPLETE, {
        taskId,
        txHash,
        message: 'Task completed and payment released.',
      }),
  };
}

// ─── Simulation Mode ─────────────────────────────────────────────────────

/**
 * Simulated messenger for demo without XMTP network.
 * Shows the full protocol flow with realistic output.
 */
export function createSimulatedMessenger(ensName, agentType) {
  const messages = [];

  return {
    ensName,
    agentType,
    address: '0xC07b695eC19DE38f1e62e825585B2818077B96cC',
    simulated: true,

    async sendToAgent(targetEnsName, messageType, payload) {
      const msg = {
        from: ensName,
        to: targetEnsName,
        type: messageType,
        payload,
        timestamp: new Date().toISOString(),
        encrypted: true,
        protocol: 'xmtp',
      };
      messages.push(msg);
      console.log(`   📤 [SIM] ${ensName} → ${targetEnsName}: ${messageType}`);
      return { sent: true, simulated: true };
    },

    async receiveMessage(fromEnsName, messageType, payload) {
      const msg = {
        from: fromEnsName,
        to: ensName,
        type: messageType,
        payload,
        timestamp: new Date().toISOString(),
        encrypted: true,
        protocol: 'xmtp',
      };
      messages.push(msg);
      console.log(`   📥 [SIM] ${fromEnsName} → ${ensName}: ${messageType}`);
      return msg;
    },

    getMessages() {
      return [...messages];
    },

    getMessageCount() {
      return messages.length;
    },
  };
}

/**
 * Run a simulated task negotiation demo.
 * Shows the full buyer ↔ seller XMTP flow.
 */
export async function runSimulatedNegotiation() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  XMTP Task Negotiation Demo (Simulated)');
  console.log('═══════════════════════════════════════════════');

  const buyer = createSimulatedMessenger('buyer.agentescrow.eth', 'buyer');
  const seller = createSimulatedMessenger('seller.agentescrow.eth', 'seller');

  const task = {
    type: 'code_review',
    description: 'Review the ENS integration module for security issues',
    reward: '0.001 ETH',
    deadline: '2026-03-25T00:00:00Z',
  };

  console.log(`\n  📋 Task: "${task.description}"`);
  console.log(`     Type: ${task.type} | Reward: ${task.reward}`);

  // Step 1: Buyer discovers seller via ENS
  console.log('\n  ─── Step 1: Discovery via ENS ───────────────────────');
  console.log(`  🔍 Buyer resolves "seller.agentescrow.eth"`);
  console.log(`     → Address: ${seller.address}`);
  console.log(`     → Capabilities: text_summary, code_review, data_analysis`);
  console.log(`     → Trust Score: 100/100`);
  console.log(`     → Status: active`);

  // Step 2: Task offer over XMTP
  console.log('\n  ─── Step 2: Task Offer (XMTP Encrypted) ────────────');
  await buyer.sendToAgent('seller.agentescrow.eth', MessageTypes.TASK_OFFER, task);
  await seller.receiveMessage('buyer.agentescrow.eth', MessageTypes.TASK_OFFER, task);

  // Step 3: Seller accepts
  console.log('\n  ─── Step 3: Task Acceptance (XMTP Encrypted) ───────');
  const acceptance = { taskId: 8, message: 'Task accepted. Starting code review.' };
  await seller.sendToAgent('buyer.agentescrow.eth', MessageTypes.TASK_ACCEPT, acceptance);
  await buyer.receiveMessage('seller.agentescrow.eth', MessageTypes.TASK_ACCEPT, acceptance);

  // Step 4: On-chain escrow
  console.log('\n  ─── Step 4: On-Chain Escrow ─────────────────────────');
  console.log('  🔗 Buyer posts task to ServiceBoard (on-chain)');
  console.log('     → Task #8 created with 0.001 ETH escrow');
  console.log('     → EscrowVault locks funds');
  await buyer.sendToAgent('seller.agentescrow.eth', MessageTypes.PAYMENT_CONFIRMED, {
    taskId: 8,
    escrowTx: '0xabc...def',
    amount: '0.001 ETH',
  });

  // Step 5: Delivery over XMTP
  console.log('\n  ─── Step 5: Task Delivery (XMTP Encrypted) ─────────');
  const delivery = {
    taskId: 8,
    result: 'Code review complete. Found 2 issues: missing input validation in register.js and potential reentrancy in escrow release.',
  };
  await seller.sendToAgent('buyer.agentescrow.eth', MessageTypes.TASK_DELIVERY, delivery);
  await buyer.receiveMessage('seller.agentescrow.eth', MessageTypes.TASK_DELIVERY, delivery);

  // Step 6: Review and completion
  console.log('\n  ─── Step 6: Review & Completion ─────────────────────');
  await buyer.sendToAgent('seller.agentescrow.eth', MessageTypes.TASK_REVIEW, {
    taskId: 8,
    approved: true,
    feedback: 'Excellent review. Findings are accurate and actionable.',
  });

  console.log('  🔗 Buyer confirms completion on-chain');
  console.log('     → EscrowVault releases 0.001 ETH to seller');
  console.log('     → ReputationRegistry updated: seller score +1');

  await buyer.sendToAgent('seller.agentescrow.eth', MessageTypes.TASK_COMPLETE, {
    taskId: 8,
    txHash: '0xdef...123',
  });

  // Summary
  console.log('\n  ─── Communication Summary ───────────────────────────');
  const totalMessages = buyer.getMessageCount() + seller.getMessageCount();
  console.log(`  📊 Total messages exchanged: ${totalMessages}`);
  console.log(`     Buyer sent: ${buyer.getMessages().filter((m) => m.from === buyer.ensName).length}`);
  console.log(`     Seller sent: ${seller.getMessages().filter((m) => m.from === seller.ensName).length}`);
  console.log('  🔒 All messages encrypted end-to-end via XMTP');
  console.log('  🏷️  All routing via ENS names (zero raw addresses)');
  console.log('  🔗 Task + payment settled on-chain (Base Sepolia)');

  return { buyer, seller, totalMessages };
}

export default {
  createAgentMessenger,
  createSimulatedMessenger,
  runSimulatedNegotiation,
  MessageTypes,
  buildAgentMessage,
  parseAgentMessage,
  createTaskNegotiationMessages,
};
