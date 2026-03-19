#!/usr/bin/env node

/**
 * Venice Private Cognition Demo
 *
 * Demonstrates the full Venice × AgentEscrow integration:
 * 1. Seller privately evaluates a task via TEE (strategy stays hidden)
 * 2. Seller executes work inside TEE (reasoning is enclave-protected)
 * 3. Buyer privately verifies delivery quality (criteria stay hidden)
 * 4. Attestation proofs are generated at each step
 *
 * Run: VENICE_API_KEY=your_key node agents/src/venice/demo.js
 */

import { createVeniceClient, TEE_MODELS, PRIVACY_TIERS } from './client.js';
import { buildAttestedDelivery, formatAttestationDisplay, TRUST_LAYERS } from './attestation.js';

const DEMO_TASK = {
  taskType: 'code_review',
  description: 'Review the EscrowVault smart contract for reentrancy vulnerabilities, access control issues, and gas optimization opportunities. Focus on the lockEscrow, releaseEscrow, and refundEscrow functions.',
  reward: '0.002',
  deadline: 'in 1 hour',
};

async function runDemo() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Venice × AgentEscrow: Private Cognition Demo       ║');
  console.log('║                                                              ║');
  console.log('║   Every step runs inside a TEE — reasoning stays private,   ║');
  console.log('║   but cryptographic attestation proves integrity.            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Check for API key
  if (!process.env.VENICE_API_KEY) {
    console.log('⚠️  VENICE_API_KEY not set. Running in SIMULATION mode.\n');
    console.log('   To run with real Venice TEE inference:');
    console.log('   VENICE_API_KEY=your_key node agents/src/venice/demo.js\n');
    return runSimulatedDemo();
  }

  const venice = createVeniceClient({
    privacyTier: PRIVACY_TIERS.TEE,
  });

  console.log(`🔧 Venice client initialized`);
  console.log(`   Privacy tier: ${PRIVACY_TIERS.TEE}`);
  console.log(`   Default model: ${TEE_MODELS.reasoning}\n`);

  // ── Phase 1: Private Task Evaluation (Seller) ──
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: Private Task Evaluation (Seller Side)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📋 Task discovered on ServiceBoard:`);
  console.log(`   Type: ${DEMO_TASK.taskType}`);
  console.log(`   Reward: ${DEMO_TASK.reward} ETH`);
  console.log(`   Description: ${DEMO_TASK.description.substring(0, 80)}...\n`);

  console.log('🔒 Seller evaluating task PRIVATELY inside TEE...');
  console.log('   ↳ Strategy and capability assessment hidden from all observers\n');

  try {
    const evalResult = await venice.evaluateTaskPrivately(DEMO_TASK);

    console.log(`\n📊 Private Evaluation Result:`);
    console.log(`   Claim: ${evalResult.decision.claim ? '✅ YES' : '❌ NO'}`);
    console.log(`   Confidence: ${evalResult.decision.confidence}%`);
    console.log(`   Reasoning: ${evalResult.decision.reasoning}`);
    console.log(`   Model: ${evalResult.model}`);
    if (evalResult.attestation) {
      console.log(`   Attestation: ✅ TEE proof obtained`);
      console.log(`   Provider: ${evalResult.attestation.tee_provider || 'TEE'}`);
    }
    console.log();

    // ── Phase 2: Private Task Execution (Seller) ──
    if (evalResult.decision.claim) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PHASE 2: Private Task Execution (Seller Side)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('🔒 Seller executing task PRIVATELY inside TEE...');
      console.log('   ↳ All reasoning, intermediate steps, and analysis happen inside enclave\n');

      const execResult = await venice.executeTaskPrivately(
        DEMO_TASK.taskType,
        DEMO_TASK.description
      );

      console.log(`\n📦 Work Output (preview):`);
      console.log(`   ${execResult.result.substring(0, 200)}...`);
      console.log(`   [Full output: ${execResult.result.length} chars]\n`);

      // Build attestation-backed delivery
      const delivery = buildAttestedDelivery(
        execResult.result,
        execResult.attestation,
        execResult.requestId,
        execResult.model
      );

      console.log(`📦 Attested Delivery Hash: ${delivery.deliveryHash}`);
      console.log(`   Work hash: ${delivery.metadata.workHash?.substring(0, 18)}...`);
      console.log(`   Attestation hash: ${delivery.metadata.attestationHash?.substring(0, 18)}...`);
      console.log(`   TEE Provider: ${delivery.metadata.teeProvider}`);
      console.log(`   Verified: ${delivery.metadata.verified ? '✅' : '⏳'}`);
      console.log();

      // ── Phase 3: Private Delivery Verification (Buyer) ──
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PHASE 3: Private Delivery Verification (Buyer Side)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('🔒 Buyer verifying delivery PRIVATELY inside TEE...');
      console.log('   ↳ Quality criteria and scoring logic hidden from seller\n');

      const verifyResult = await venice.verifyDeliveryPrivately(
        DEMO_TASK.taskType,
        DEMO_TASK.description,
        execResult.result
      );

      console.log(`\n🔍 Private Verification Result:`);
      console.log(`   Accept: ${verifyResult.verification.accept ? '✅ YES' : '❌ NO'}`);
      console.log(`   Quality Score: ${verifyResult.verification.score}/100`);
      if (verifyResult.verification.issues?.length > 0) {
        console.log(`   Issues: ${verifyResult.verification.issues.join(', ')}`);
      }
      console.log(`   Summary: ${verifyResult.verification.summary}`);
      if (verifyResult.attestation) {
        console.log(`   Attestation: ✅ Verification proof obtained`);
      }
      console.log();

      // ── Summary ──
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('DEMO COMPLETE — Full Privacy Pipeline');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('🏗️  AgentEscrow Trust Stack:');
      for (const layer of TRUST_LAYERS) {
        console.log(`   ${layer.icon} ${layer.layer.padEnd(20)} — ${layer.protects.padEnd(16)} — ${layer.mechanism}`);
      }
      console.log();

      console.log('🔐 Privacy achieved in this demo:');
      console.log('   ✅ Seller strategy evaluation — hidden from all');
      console.log('   ✅ Work execution reasoning — enclave-protected');
      console.log('   ✅ Buyer quality criteria — hidden from seller');
      console.log('   ✅ Attestation proofs — cryptographically verifiable');
      console.log();
      console.log('📋 On-chain artifact:');
      console.log(`   Delivery hash: ${delivery.deliveryHash}`);
      console.log(`   Contains: work hash + attestation hash (combined)`);
      console.log(`   Anyone can verify via Venice attestation API`);
      console.log();

      // Display formatted attestation
      const display = formatAttestationDisplay(delivery.metadata);
      if (display.hasAttestation) {
        console.log('📋 Attestation Record:');
        for (const [key, value] of Object.entries(display.display)) {
          console.log(`   ${key}: ${value}`);
        }
      }
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    console.log('\n   Falling back to simulation mode...\n');
    return runSimulatedDemo();
  }
}

/**
 * Simulation mode — shows the flow without a real Venice API key
 */
function runSimulatedDemo() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SIMULATED: Private Task Lifecycle with Venice TEE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📋 Demo Task: ${DEMO_TASK.taskType} — ${DEMO_TASK.reward} ETH`);
  console.log(`   ${DEMO_TASK.description.substring(0, 80)}...\n`);

  // Simulated Phase 1
  console.log('🔒 [SIMULATED] Phase 1: Seller evaluates task privately via TEE');
  console.log('   Model: tee-deepseek-r1-671b (Intel TDX enclave)');
  console.log('   Decision: ✅ CLAIM (confidence: 88%)');
  console.log('   Reasoning: Code review is a core capability, reward is fair');
  console.log('   Attestation: ✅ TEE proof simulated');
  console.log('   → Seller strategy NEVER leaves the enclave\n');

  // Simulated Phase 2
  console.log('🔒 [SIMULATED] Phase 2: Seller executes work privately via TEE');
  console.log('   Model: tee-deepseek-r1-671b');
  console.log('   Output: [Code review report — 847 chars]');
  console.log('   Delivery hash: venice:a1b2c3d4e5f6789012345678901234567890');
  console.log('   Attestation: ✅ Work execution proof obtained');
  console.log('   Signature: ✅ Response integrity verified');
  console.log('   → All reasoning happens inside enclave, only result exits\n');

  // Simulated Phase 3
  console.log('🔒 [SIMULATED] Phase 3: Buyer verifies delivery privately via TEE');
  console.log('   Model: tee-deepseek-r1-671b');
  console.log('   Accept: ✅ YES (quality score: 85/100)');
  console.log('   Issues: None');
  console.log('   Summary: Thorough review covering reentrancy, access control, and gas');
  console.log('   Attestation: ✅ Verification proof obtained');
  console.log('   → Quality criteria NEVER visible to seller\n');

  // Trust stack
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('COMPLETE — AgentEscrow Trust Stack');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const layer of TRUST_LAYERS) {
    console.log(`   ${layer.icon} ${layer.layer.padEnd(20)} — protects ${layer.protects.padEnd(16)} via ${layer.mechanism}`);
  }

  console.log('\n🔐 Privacy pipeline:');
  console.log('   Agent Strategy  →  TEE Evaluation   →  Hidden from all');
  console.log('   Work Execution  →  TEE Inference     →  Enclave-protected');
  console.log('   Quality Checks  →  TEE Verification  →  Criteria private');
  console.log('   Proofs          →  Attestation Hash   →  On-chain verifiable');

  console.log('\n💡 To run with real Venice TEE:');
  console.log('   1. Get API key from https://venice.ai');
  console.log('   2. VENICE_API_KEY=your_key node agents/src/venice/demo.js');
  console.log('   3. Or stake VVV tokens on Base for autonomous agent access');
}

runDemo().catch(console.error);
