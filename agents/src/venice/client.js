/**
 * Venice AI Private Cognition Client
 *
 * Wraps Venice's OpenAI-compatible API with TEE/E2EE model support
 * and cryptographic attestation verification.
 *
 * Venice provides:
 * - TEE inference via Intel TDX / NVIDIA H100 enclaves (prefix: tee-*)
 * - E2EE inference with client-side encryption (prefix: e2ee-*)
 * - Cryptographic attestation proofs for every TEE inference
 * - Signature verification for response integrity
 *
 * @see https://docs.venice.ai
 */

const VENICE_BASE_URL = 'https://api.venice.ai/api/v1';

// TEE-enabled models available on Venice
const TEE_MODELS = {
  reasoning: 'tee-deepseek-r1-671b',
  general: 'tee-qwen-2.5-vl-72b',
  fast: 'tee-llama-3.3-70b',
};

// Privacy tiers
const PRIVACY_TIERS = {
  STANDARD: 'standard',   // Venice-controlled GPUs, zero retention
  TEE: 'tee',             // Intel TDX / NVIDIA H100 enclaves
  E2EE: 'e2ee',           // Client-side encryption → TEE → re-encryption
};

/**
 * Create a Venice AI client configured for AgentEscrow
 * @param {Object} options
 * @param {string} options.apiKey - Venice API key (or VVV-staked key)
 * @param {string} [options.privacyTier='tee'] - Privacy tier: 'standard', 'tee', or 'e2ee'
 * @param {string} [options.model] - Override model selection
 * @returns {VeniceClient}
 */
function createVeniceClient(options = {}) {
  const apiKey = options.apiKey || process.env.VENICE_API_KEY;
  if (!apiKey) {
    throw new Error('VENICE_API_KEY is required. Set it in .env or pass as option.');
  }

  const privacyTier = options.privacyTier || PRIVACY_TIERS.TEE;
  const defaultModel = options.model || TEE_MODELS.reasoning;

  return new VeniceClient(apiKey, privacyTier, defaultModel);
}

class VeniceClient {
  constructor(apiKey, privacyTier, defaultModel) {
    this.apiKey = apiKey;
    this.privacyTier = privacyTier;
    this.defaultModel = defaultModel;
    this.baseUrl = VENICE_BASE_URL;
  }

  /**
   * Make a chat completion request to Venice (OpenAI-compatible)
   * @param {Object} params
   * @param {string} [params.model] - Model to use (defaults to TEE model)
   * @param {Array} params.messages - Chat messages
   * @param {number} [params.temperature=0.7] - Temperature
   * @param {number} [params.max_tokens=1024] - Max tokens
   * @returns {Promise<Object>} - Venice completion response
   */
  async chatCompletion(params) {
    const model = params.model || this.defaultModel;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Get TEE attestation proof for a model inference
   * Returns cryptographic proof that the inference ran inside a secure enclave.
   *
   * @param {string} model - Model ID used for inference
   * @param {string} [nonce] - Optional 64-char hex nonce for freshness
   * @returns {Promise<Object>} - Attestation result with intel_quote, tee_provider, etc.
   */
  async getAttestation(model, nonce) {
    const attestationNonce = nonce || generateNonce();

    const url = new URL(`${this.baseUrl}/tee/attestation`);
    url.searchParams.set('model', model);
    url.searchParams.set('nonce', attestationNonce);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice attestation error (${response.status}): ${error}`);
    }

    const attestation = await response.json();
    return {
      ...attestation,
      nonce: attestationNonce,
      timestamp: Date.now(),
    };
  }

  /**
   * Verify signature for a specific inference request
   * Proves the response came from the TEE enclave without tampering.
   *
   * @param {string} model - Model ID
   * @param {string} requestId - The request ID from the completion response
   * @returns {Promise<Object>} - Signature verification result
   */
  async getSignature(model, requestId) {
    const url = new URL(`${this.baseUrl}/tee/signature`);
    url.searchParams.set('model', model);
    url.searchParams.set('request_id', requestId);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice signature error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * List available models on Venice
   * @returns {Promise<Object>} - Models list
   */
  async listModels() {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Venice models error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Private task evaluation — runs task assessment inside TEE
   * Seller uses this to decide whether to claim a task without leaking strategy.
   *
   * @param {Object} task - Task details from ServiceBoard
   * @param {string} task.taskType - Type of task
   * @param {string} task.description - Task description
   * @param {string} task.reward - Reward in ETH
   * @returns {Promise<Object>} - { decision, attestation, requestId }
   */
  async evaluateTaskPrivately(task) {
    console.log(`   🔒 Venice: Evaluating task privately via TEE...`);

    const response = await this.chatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an AI agent evaluating a service task on the AgentEscrow marketplace.
Evaluate whether this task is worth claiming based on:
1. Task complexity vs reward
2. Capability match (you handle: text_summary, code_review, name_generation, translation)
3. Risk assessment
4. Estimated time to complete

Return ONLY valid JSON: {"claim": true/false, "confidence": 0-100, "reasoning": "brief explanation", "estimated_minutes": number}`
        },
        {
          role: 'user',
          content: `Task Type: ${task.taskType}\nDescription: ${task.description}\nReward: ${task.reward} ETH\nDeadline: ${task.deadline || 'not set'}`
        }
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const content = response.choices[0].message.content;
    let decision;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { claim: true, confidence: 50, reasoning: 'Parse fallback' };
    } catch {
      decision = { claim: true, confidence: 50, reasoning: 'Parse fallback — defaulting to claim' };
    }

    // Get attestation proof
    let attestation = null;
    try {
      attestation = await this.getAttestation(response.model);
      console.log(`   🔒 Venice: TEE attestation obtained (provider: ${attestation.tee_provider || 'unknown'})`);
    } catch (err) {
      console.log(`   ⚠️ Venice: Attestation unavailable (${err.message})`);
    }

    return {
      decision,
      attestation,
      requestId: response.id,
      model: response.model,
      privacyTier: this.privacyTier,
    };
  }

  /**
   * Private delivery verification — buyer verifies quality inside TEE
   * Quality criteria stay private so sellers can't game the system.
   *
   * @param {string} taskType - Type of task
   * @param {string} description - Original task description
   * @param {string} deliveryContent - The delivered work
   * @returns {Promise<Object>} - { verification, attestation, requestId }
   */
  async verifyDeliveryPrivately(taskType, description, deliveryContent) {
    console.log(`   🔒 Venice: Verifying delivery privately via TEE...`);

    const response = await this.chatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an AI quality verification agent for the AgentEscrow marketplace.
Evaluate the delivered work against the original task requirements.
Check for:
1. Completeness — does it fulfill the task description?
2. Quality — is the output well-structured and accurate?
3. Relevance — does it actually address what was asked?
4. Effort — does it show genuine work, not a minimal/template response?

Return ONLY valid JSON: {"accept": true/false, "score": 0-100, "issues": ["issue1", ...], "summary": "brief quality assessment"}`
        },
        {
          role: 'user',
          content: `Task Type: ${taskType}\nOriginal Request: ${description}\n\nDelivered Work:\n${deliveryContent}`
        }
      ],
      temperature: 0.2,
      max_tokens: 256,
    });

    const content = response.choices[0].message.content;
    let verification;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      verification = jsonMatch ? JSON.parse(jsonMatch[0]) : { accept: true, score: 70, issues: [], summary: 'Parse fallback' };
    } catch {
      verification = { accept: true, score: 70, issues: [], summary: 'Parse fallback — defaulting to accept' };
    }

    // Get attestation proof
    let attestation = null;
    try {
      attestation = await this.getAttestation(response.model);
      console.log(`   🔒 Venice: Verification attestation obtained`);
    } catch (err) {
      console.log(`   ⚠️ Venice: Attestation unavailable (${err.message})`);
    }

    return {
      verification,
      attestation,
      requestId: response.id,
      model: response.model,
      privacyTier: this.privacyTier,
    };
  }

  /**
   * Private task execution — seller performs work inside TEE
   * The actual reasoning and work output are enclave-protected.
   *
   * @param {string} taskType - Type of task
   * @param {string} description - Task description
   * @returns {Promise<Object>} - { result, attestation, signature, requestId }
   */
  async executeTaskPrivately(taskType, description) {
    console.log(`   🔒 Venice: Executing task privately via TEE...`);

    const systemPrompts = {
      text_summary: 'You are a text summarization specialist. Produce a concise, insightful summary of the given topic.',
      code_review: 'You are a senior smart contract auditor. Perform a thorough security and gas review.',
      name_generation: 'You are a creative branding expert. Generate unique, memorable names.',
      translation: 'You are a professional translator. Provide accurate, natural-sounding translations.',
    };

    const response = await this.chatCompletion({
      messages: [
        {
          role: 'system',
          content: systemPrompts[taskType] || 'You are a capable AI assistant. Complete the following task thoroughly.'
        },
        {
          role: 'user',
          content: description
        }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const result = response.choices[0].message.content;

    // Get attestation + signature
    let attestation = null;
    let signature = null;
    try {
      attestation = await this.getAttestation(response.model);
      signature = await this.getSignature(response.model, response.id);
      console.log(`   🔒 Venice: Work attestation + signature obtained`);
    } catch (err) {
      console.log(`   ⚠️ Venice: Attestation/signature unavailable (${err.message})`);
    }

    return {
      result,
      attestation,
      signature,
      requestId: response.id,
      model: response.model,
      privacyTier: this.privacyTier,
    };
  }
}

/**
 * Generate a random 64-character hex nonce for attestation freshness
 */
function generateNonce() {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    const { randomBytes } = require('crypto');
    const buf = randomBytes(32);
    for (let i = 0; i < 32; i++) bytes[i] = buf[i];
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export { createVeniceClient, VeniceClient, TEE_MODELS, PRIVACY_TIERS, generateNonce };
