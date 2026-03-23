/**
 * Filecoin Onchain Cloud (FOC) Client
 *
 * Wraps the Synapse SDK for agent-friendly storage and retrieval on Filecoin.
 * Supports both mainnet and calibration testnet.
 * Falls back to simulation mode when no private key is available.
 *
 * @module filecoin/client
 */

import { Synapse, calibration, mainnet } from '@filoz/synapse-sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Network configurations
export const NETWORKS = {
  mainnet: { chain: mainnet, name: 'Filecoin Mainnet', token: 'USDFC' },
  calibration: { chain: calibration, name: 'Filecoin Calibration', token: 'tUSDFC' },
};

/**
 * Create a Synapse SDK instance for Filecoin Onchain Cloud.
 *
 * @param {Object} options
 * @param {string} options.privateKey - Hex private key (with or without 0x prefix)
 * @param {'mainnet'|'calibration'} [options.network='calibration'] - Network to use
 * @returns {Synapse} Configured Synapse instance
 */
export function createFOCClient({ privateKey, network = 'calibration' }) {
  const net = NETWORKS[network];
  if (!net) throw new Error(`Unknown network: ${network}. Use 'mainnet' or 'calibration'.`);

  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(key);

  const synapse = Synapse.create({
    chain: net.chain,
    account,
    source: 'escroue',
  });

  console.log(`🗄️  FOC client initialized on ${net.name}`);
  console.log(`   Account: ${account.address}`);
  return synapse;
}

/**
 * AgentStorage — high-level agent-friendly wrapper around Synapse SDK.
 *
 * Handles:
 * - Storing task results with structured metadata
 * - Retrieving stored content by PieceCID
 * - Payment balance checks
 * - Simulation mode when no FOC credentials available
 */
export class AgentStorage {
  constructor({ privateKey, network = 'calibration' } = {}) {
    this.network = network;
    this.simulation = !privateKey;

    if (this.simulation) {
      console.log('🗄️  FOC AgentStorage running in SIMULATION mode (no FILECOIN_PRIVATE_KEY)');
      this._simulatedStore = new Map();
      this.synapse = null;
    } else {
      this.synapse = createFOCClient({ privateKey, network });
    }
  }

  /**
   * Store task delivery content on Filecoin Onchain Cloud.
   *
   * @param {Object} delivery
   * @param {number} delivery.taskId - On-chain task ID
   * @param {string} delivery.taskType - Task type (e.g., 'text_summary')
   * @param {string} delivery.result - Task result content
   * @param {string} delivery.agentAddress - Delivering agent's address
   * @param {string} [delivery.agentERC8004Id] - Agent's ERC-8004 identity ID
   * @param {Object} [delivery.attestation] - Venice TEE attestation data
   * @returns {Promise<StorageReceipt>} Storage receipt with PieceCID
   */
  async storeDelivery(delivery) {
    const payload = {
      version: '1.0',
      protocol: 'escroue',
      type: 'task_delivery',
      timestamp: new Date().toISOString(),
      taskId: delivery.taskId,
      taskType: delivery.taskType,
      result: delivery.result,
      agent: {
        address: delivery.agentAddress,
        erc8004Id: delivery.agentERC8004Id || null,
      },
      attestation: delivery.attestation || null,
      chain: {
        escrowChain: 'base-sepolia',
        storageChain: this.network === 'mainnet' ? 'filecoin-mainnet' : 'filecoin-calibration',
      },
    };

    const data = new TextEncoder().encode(JSON.stringify(payload, null, 2));

    if (this.simulation) {
      return this._simulateStore(payload, data);
    }

    return this._realStore(payload, data);
  }

  /**
   * Store arbitrary data (agent memory, attestation log, etc.) on FOC.
   *
   * @param {Object} options
   * @param {string} options.type - Content type ('memory', 'attestation', 'config', 'artifact')
   * @param {string|Object} options.content - Content to store (string or JSON-serializable object)
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<StorageReceipt>}
   */
  async storeData({ type, content, metadata = {} }) {
    const payload = {
      version: '1.0',
      protocol: 'escroue',
      type,
      timestamp: new Date().toISOString(),
      content: typeof content === 'string' ? content : JSON.stringify(content),
      metadata,
    };

    const data = new TextEncoder().encode(JSON.stringify(payload, null, 2));

    if (this.simulation) {
      return this._simulateStore(payload, data);
    }

    return this._realStore(payload, data);
  }

  /**
   * Retrieve content from Filecoin Onchain Cloud by PieceCID.
   *
   * @param {string} pieceCid - The PieceCID returned from a previous store operation
   * @returns {Promise<Object>} Parsed JSON content
   */
  async retrieve(pieceCid) {
    if (this.simulation) {
      const stored = this._simulatedStore.get(pieceCid);
      if (!stored) throw new Error(`PieceCID not found in simulation: ${pieceCid}`);
      console.log(`🗄️  [SIM] Retrieved from Filecoin: ${pieceCid}`);
      return stored;
    }

    console.log(`🗄️  Downloading from Filecoin: ${pieceCid}`);
    const rawData = await this.synapse.storage.download({ pieceCid });
    const text = new TextDecoder().decode(rawData);
    return JSON.parse(text);
  }

  /**
   * Check USDFC payment balance on FOC.
   *
   * @returns {Promise<Object>} Balance info
   */
  async getBalance() {
    if (this.simulation) {
      return { balance: '100.00', token: 'tUSDFC (simulated)', deposited: '100.00' };
    }

    const balance = await this.synapse.payments.balance();
    const walletBalance = await this.synapse.payments.walletBalance();
    return {
      deposited: balance.toString(),
      wallet: walletBalance.toString(),
      token: this.network === 'mainnet' ? 'USDFC' : 'tUSDFC',
    };
  }

  /**
   * Get storage cost estimate for data of a given size.
   *
   * @param {number} sizeBytes - Size of data in bytes
   * @returns {Promise<Object>} Cost estimate
   */
  async estimateCost(sizeBytes) {
    if (this.simulation) {
      // FOC costs ~$2.50/TiB/month
      const tib = sizeBytes / (1024 ** 4);
      const monthlyCost = tib * 2.5;
      return {
        sizeBytes,
        estimatedMonthlyCost: `$${monthlyCost.toFixed(6)}`,
        note: 'Simulated estimate based on $2.50/TiB/month',
      };
    }

    const costs = await this.synapse.storage.getUploadCosts(sizeBytes);
    return costs;
  }

  // --- Private methods ---

  async _realStore(payload, data) {
    console.log(`🗄️  Uploading to Filecoin (${data.length} bytes)...`);

    const result = await this.synapse.storage.upload(data);

    console.log(`🗄️  ✅ Stored on Filecoin!`);
    console.log(`   PieceCID: ${result.pieceCid}`);
    console.log(`   Size: ${result.size} bytes`);
    console.log(`   Copies: ${result.copies?.length || 0} replicas`);

    return {
      pieceCid: result.pieceCid,
      size: result.size,
      copies: result.copies?.length || 0,
      complete: result.complete,
      network: this.network,
      timestamp: payload.timestamp,
      type: payload.type,
    };
  }

  _simulateStore(payload, data) {
    // Generate a unique fake PieceCID using a simple hash of all content bytes
    let h = 0;
    for (let i = 0; i < data.length; i++) {
      h = ((h << 5) - h + data[i]) | 0;
    }
    const hex = Math.abs(h).toString(16).padStart(8, '0');
    const ts = Date.now().toString(36);
    const fakePieceCid = `baga6ea4seaq${hex}${ts}${'0'.repeat(Math.max(0, 44 - hex.length - ts.length))}`;

    this._simulatedStore.set(fakePieceCid, payload);

    console.log(`🗄️  [SIM] Stored on Filecoin (simulation)`);
    console.log(`   PieceCID: ${fakePieceCid}`);
    console.log(`   Size: ${data.length} bytes`);

    return {
      pieceCid: fakePieceCid,
      size: data.length,
      copies: 2,
      complete: true,
      network: `${this.network} (simulated)`,
      timestamp: payload.timestamp,
      type: payload.type,
    };
  }
}

/**
 * @typedef {Object} StorageReceipt
 * @property {string} pieceCid - Filecoin PieceCID (content identifier)
 * @property {number} size - Size in bytes
 * @property {number} copies - Number of replicas
 * @property {boolean} complete - Whether all copies succeeded
 * @property {string} network - Network used
 * @property {string} timestamp - ISO timestamp
 * @property {string} type - Content type
 */
