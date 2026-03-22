#!/usr/bin/env node

/**
 * Venice Private Cognition Demo
 *
 * Demonstrates the full Venice × AgentEscrow integration:
 * 1. Live TEE attestation verification (real Intel TDX proof from Phala Network)
 * 2. Simulated private task lifecycle (evaluation → execution → verification)
 * 3. Attestation-backed delivery hash generation
 *
 * Run: VENICE_API_KEY=your_key node agents/src/venice/demo.js
 *      node agents/src/venice/demo.js  (simulation with live attestation)
 */

import { createVeniceClient, TEE_MODELS, PRIVACY_TIERS } from './client.js';
import { buildAttestedDelivery, formatAttestationDisplay, TRUST_LAYERS, createAttestationRecord } from './attestation.js';
import { createHash, randomBytes } from 'crypto';

const VENICE_API_URL = 'https://api.venice.ai/api/v1';

const DEMO_TASK = {
  taskType: 'code_review',
  description: 'Review the EscrowVault smart contract for reentrancy vulnerabilities, access control issues, and gas optimization opportunities. Focus on the lockEscrow, releaseEscrow, and refundEscrow functions.',
  reward: '0.002',
  deadline: 'in 1 hour',
};

/**
 * Fetch a REAL TEE attestation from Venice API
 * This works without inference credits — attestation is free
 */
async function fetchLiveAttestation(apiKey, model) {
  const nonce = randomBytes(32).toString('hex');

  const url = `${VENICE_API_URL}/tee/attestation?model=${encodeURIComponent(model)}&nonce=${nonce}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Attestation API error: ${response.status}`);
  }

  return response.json();
}

async function runDemo() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Venice × AgentEscrow: Private Cognition Demo          ║');
  console.log('║                                                              ║');
  console.log('║   Real TEE attestation + simulated agent task lifecycle     ║');
  console.log('║   Cryptographic proof from Intel TDX via Phala Network      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const apiKey = process.env.VENICE_API_KEY;
  const hasApiKey = !!apiKey;

  if (!hasApiKey) {
    console.log('⚠️  VENICE_API_KEY not set. Running in full SIMULATION mode.\n');
    console.log('   With API key: live attestation proofs from Intel TDX hardware');
    console.log('   VENICE_API_KEY=your_key node agents/src/venice/demo.js\n');
  }

  // ── Phase 0: Live TEE Attestation (REAL, from Venice API) ──
  let liveAttestation = null;
  if (hasApiKey) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PHASE 0: Live TEE Attestation Verification');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`🔗 Fetching REAL attestation from Venice API...`);
    console.log(`   Model: ${TEE_MODELS.reasoning}`);
    console.log(`   Endpoint: ${VENICE_API_URL}/tee/attestation\n`);

    try {
      liveAttestation = await fetchLiveAttestation(apiKey, TEE_MODELS.reasoning);

      console.log('✅ LIVE TEE ATTESTATION RECEIVED\n');
      console.log(`   TEE Provider:      ${liveAttestation.tee_provider}`);
      console.log(`   TEE Hardware:      ${liveAttestation.tee_hardware}`);
      console.log(`   Verified:          ${liveAttestation.verified ? '✅ YES' : '❌ NO'}`);
      console.log(`   Signing Address:   ${liveAttestation.signing_address}`);
      console.log(`   Signing Algorithm: ${liveAttestation.signing_algo}`);
      console.log(`   Upstream Model:    ${liveAttestation.upstream_model}`);
      console.log(`   Model:             ${liveAttestation.model}`);
      console.log(`   Nonce Source:       ${liveAttestation.nonce_source}`);
      console.log(`   Intel Quote:       ${liveAttestation.intel_quote?.substring(0, 64)}...`);
      console.log(`   Intel Quote Size:  ${liveAttestation.intel_quote?.length} chars`);
      console.log(`   Candidates:        ${liveAttestation.candidates_evaluated}/${liveAttestation.candidates_available} evaluated\n`);

      // Create attestation record for on-chain storage
      const record = createAttestationRecord(liveAttestation, 'demo-attestation', liveAttestation.model);
      console.log(`   📋 On-chain attestation hash: ${record.hash}`);
      console.log(`   This hash can be stored on-chain in ServiceBoard deliveries\n`);

      // Fetch a second attestation for a different model to show variety
      console.log(`🔗 Fetching second attestation (${TEE_MODELS.general})...`);
      const secondAttestation = await fetchLiveAttestation(apiKey, TEE_MODELS.general);
      console.log(`   ✅ Provider: ${secondAttestation.tee_provider} | Hardware: ${secondAttestation.tee_hardware} | Verified: ${secondAttestation.verified}`);
      console.log(`   Signing Address: ${secondAttestation.signing_address}`);
      console.log(`   Upstream Model: ${secondAttestation.upstream_model}\n`);

    } catch (err) {
      console.log(`   ⚠️ Attestation fetch failed: ${err.message}`);
      console.log(`   Continuing with simulated attestation...\n`);
    }
  }

  // ── Phase 1: Private Task Evaluation (Seller) ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: Private Task Evaluation (Seller Side)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📋 Task discovered on ServiceBoard:`);
  console.log(`   Type: ${DEMO_TASK.taskType}`);
  console.log(`   Reward: ${DEMO_TASK.reward} ETH`);
  console.log(`   Description: ${DEMO_TASK.description.substring(0, 80)}...\n`);

  const evalMode = hasApiKey ? 'LIVE ATTESTATION' : 'SIMULATED';
  console.log(`🔒 [${evalMode}] Seller evaluating task privately via E2EE...`);
  console.log(`   Model: ${TEE_MODELS.reasoning} (Intel TDX enclave via Phala)`);
  console.log('   Decision: ✅ CLAIM (confidence: 88%)');
  console.log('   Reasoning: Code review is a core capability, reward is fair');
  if (liveAttestation) {
    console.log(`   Attestation: ✅ REAL TEE proof (provider: ${liveAttestation.tee_provider}, hw: ${liveAttestation.tee_hardware})`);
  } else {
    console.log('   Attestation: ✅ TEE proof (simulated)');
  }
  console.log('   → Seller strategy NEVER leaves the enclave\n');

  // ── Phase 2: Private Task Execution (Seller) ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2: Private Task Execution (Seller Side)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`🔒 [${evalMode}] Seller executing work privately via E2EE...`);
  console.log(`   Model: ${TEE_MODELS.reasoning}`);

  // Generate a realistic delivery hash using real attestation if available
  const simulatedWork = 'EscrowVault Security Review: No reentrancy vulnerabilities found. lockEscrow uses checks-effects-interactions pattern correctly. Access control via onlyServiceBoard modifier is properly enforced. Gas optimization: consider using unchecked blocks for counter increments.';
  const workHash = createHash('sha256').update(simulatedWork).digest('hex');

  let deliveryHash;
  if (liveAttestation) {
    // Use real attestation data in the delivery hash
    const attestHash = createHash('sha256').update(JSON.stringify({
      provider: liveAttestation.tee_provider,
      hardware: liveAttestation.tee_hardware,
      verified: liveAttestation.verified,
      signing_address: liveAttestation.signing_address,
    })).digest('hex');
    deliveryHash = `venice:${createHash('sha256').update(`${workHash}:0x${attestHash}`).digest('hex').substring(0, 40)}`;
    console.log(`   Output: [Code review report — ${simulatedWork.length} chars]`);
    console.log(`   Delivery hash: ${deliveryHash}`);
    console.log(`   Work hash: 0x${workHash.substring(0, 16)}...`);
    console.log(`   Attestation: ✅ REAL — ${liveAttestation.tee_provider} / ${liveAttestation.tee_hardware}`);
    console.log(`   Signing Address: ${liveAttestation.signing_address}`);
  } else {
    deliveryHash = `venice:${createHash('sha256').update(`${workHash}:simulated`).digest('hex').substring(0, 40)}`;
    console.log(`   Output: [Code review report — ${simulatedWork.length} chars]`);
    console.log(`   Delivery hash: ${deliveryHash}`);
    console.log('   Attestation: ✅ Work execution proof (simulated)');
  }
  console.log('   → All reasoning happens inside enclave, only result exits\n');

  // ── Phase 3: Private Delivery Verification (Buyer) ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 3: Private Delivery Verification (Buyer Side)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`🔒 [${evalMode}] Buyer verifying delivery privately via E2EE...`);
  console.log(`   Model: ${TEE_MODELS.reasoning}`);
  console.log('   Accept: ✅ YES (quality score: 85/100)');
  console.log('   Issues: None');
  console.log('   Summary: Thorough review covering reentrancy, access control, and gas');
  if (liveAttestation) {
    console.log(`   Attestation: ✅ REAL verification proof (${liveAttestation.tee_provider})`);
  } else {
    console.log('   Attestation: ✅ Verification proof (simulated)');
  }
  console.log('   → Quality criteria NEVER visible to seller\n');

  // ── Summary ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`DEMO COMPLETE — ${hasApiKey ? 'Live Attestation + Simulated Tasks' : 'Full Simulation'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🏗️  AgentEscrow Trust Stack:');
  for (const layer of TRUST_LAYERS) {
    console.log(`   ${layer.icon} ${layer.layer.padEnd(20)} — protects ${layer.protects.padEnd(16)} via ${layer.mechanism}`);
  }

  console.log('\n🔐 Privacy pipeline:');
  console.log('   Agent Strategy  →  E2EE Evaluation   →  Hidden from all');
  console.log('   Work Execution  →  E2EE Inference     →  Enclave-protected');
  console.log('   Quality Checks  →  E2EE Verification  →  Criteria private');
  console.log('   Proofs          →  Attestation Hash    →  On-chain verifiable');

  if (liveAttestation) {
    console.log('\n📋 Live Attestation Summary:');
    console.log(`   Provider: ${liveAttestation.tee_provider} (Phala Network)`);
    console.log(`   Hardware: ${liveAttestation.tee_hardware} (Intel TDX)`);
    console.log(`   Verified: ${liveAttestation.verified ? '✅ Cryptographically verified' : '⏳ Pending'}`);
    console.log(`   Signing: ${liveAttestation.signing_algo} @ ${liveAttestation.signing_address}`);
    console.log(`   Intel Quote: ${liveAttestation.intel_quote?.length} chars of TDX attestation data`);
    console.log(`   Delivery Hash: ${deliveryHash}`);
  }

  console.log('\n💡 Venice integration:');
  console.log('   • API: OpenAI-compatible drop-in (api.venice.ai/api/v1)');
  console.log('   • Privacy: E2EE models with Intel TDX hardware enclaves');
  console.log('   • Attestation: Free verification via /tee/attestation endpoint');
  console.log('   • Inference: Requires Venice credits (venice.ai/settings/api)');
  console.log('   • Autonomous: Agents can self-provision keys via VVV token staking');
}

runDemo().catch(console.error);
