/**
 * Venice TEE Attestation Verification Utilities
 *
 * Handles attestation proof management, on-chain storage preparation,
 * and verification of TEE attestation proofs.
 *
 * Attestation flow:
 * 1. Agent performs inference via Venice TEE model
 * 2. Venice returns attestation proof (Intel TDX quote / NVIDIA payload)
 * 3. Attestation hash is included with on-chain delivery
 * 4. Anyone can verify the attestation independently via Venice API
 *
 * This creates a cryptographic chain:
 *   TEE Enclave → Attestation Proof → On-Chain Hash → Verifiable
 */

import { createHash } from 'crypto';

/**
 * Create a compact attestation record suitable for on-chain storage
 * We hash the full attestation to a bytes32 for gas efficiency.
 *
 * @param {Object} attestation - Full attestation from Venice API
 * @param {string} requestId - The request ID from the inference
 * @param {string} model - Model used for inference
 * @returns {Object} - { hash, record, raw }
 */
function createAttestationRecord(attestation, requestId, model) {
  const record = {
    model,
    requestId,
    teeProvider: attestation?.tee_provider || 'unknown',
    verified: attestation?.verified || false,
    timestamp: Date.now(),
    nonce: attestation?.nonce || null,
  };

  // Create a deterministic hash of the attestation for on-chain storage
  const hashInput = JSON.stringify({
    model: record.model,
    requestId: record.requestId,
    teeProvider: record.teeProvider,
    verified: record.verified,
    nonce: record.nonce,
    // Include raw attestation data if available
    intelQuote: attestation?.intel_quote?.substring(0, 64) || null,
    signingKey: attestation?.signing_key?.substring(0, 64) || null,
  });

  const hash = createHash('sha256').update(hashInput).digest('hex');
  record.attestationHash = `0x${hash}`;

  return {
    hash: record.attestationHash,
    record,
    raw: attestation,
  };
}

/**
 * Build an attestation-enhanced delivery hash
 * Combines the work result hash with the attestation hash
 * for a single on-chain delivery proof.
 *
 * @param {string} workResult - The actual work output
 * @param {Object} attestation - Attestation from Venice
 * @param {string} requestId - Venice request ID
 * @param {string} model - Model used
 * @returns {Object} - { deliveryHash, attestationRecord, metadata }
 */
function buildAttestedDelivery(workResult, attestation, requestId, model) {
  // Hash the work result
  const workHash = createHash('sha256').update(workResult).digest('hex');

  // Create attestation record
  const attestationRecord = createAttestationRecord(attestation, requestId, model);

  // Combine work hash + attestation hash for final delivery hash
  const combinedInput = `${workHash}:${attestationRecord.hash}`;
  const deliveryHash = `venice:${createHash('sha256').update(combinedInput).digest('hex').substring(0, 40)}`;

  const metadata = {
    type: 'venice-attested-delivery',
    version: '1.0',
    workHash: `0x${workHash}`,
    attestationHash: attestationRecord.hash,
    model,
    requestId,
    teeProvider: attestationRecord.record.teeProvider,
    verified: attestationRecord.record.verified,
    privacyTier: 'TEE',
    timestamp: Date.now(),
  };

  return {
    deliveryHash,
    attestationRecord,
    metadata,
  };
}

/**
 * Verify an attestation record against Venice API
 * Anyone with the model ID and nonce can independently verify.
 *
 * @param {Object} veniceClient - Venice client instance
 * @param {Object} record - Attestation record to verify
 * @returns {Promise<Object>} - { valid, details }
 */
async function verifyAttestation(veniceClient, record) {
  try {
    // Re-fetch attestation from Venice with the same nonce
    const freshAttestation = await veniceClient.getAttestation(
      record.model,
      record.nonce
    );

    // Compare key fields
    const valid = freshAttestation.verified === true &&
                  freshAttestation.tee_provider === record.teeProvider;

    return {
      valid,
      details: {
        provider: freshAttestation.tee_provider,
        verified: freshAttestation.verified,
        matchesRecord: valid,
        timestamp: Date.now(),
      },
    };
  } catch (err) {
    return {
      valid: false,
      details: {
        error: err.message,
        timestamp: Date.now(),
      },
    };
  }
}

/**
 * Format attestation data for display (frontend / logs)
 *
 * @param {Object} metadata - Delivery metadata with attestation info
 * @returns {Object} - Human-readable attestation summary
 */
function formatAttestationDisplay(metadata) {
  if (!metadata || metadata.type !== 'venice-attested-delivery') {
    return {
      hasAttestation: false,
      display: 'No attestation',
    };
  }

  return {
    hasAttestation: true,
    display: {
      privacyTier: metadata.privacyTier,
      teeProvider: metadata.teeProvider,
      verified: metadata.verified ? 'YES' : 'PENDING',
      model: metadata.model,
      workHash: metadata.workHash?.substring(0, 18) + '...',
      attestationHash: metadata.attestationHash?.substring(0, 18) + '...',
      timestamp: new Date(metadata.timestamp).toISOString(),
    },
  };
}

/**
 * Privacy comparison table for AgentEscrow trust layers
 * Used in frontend and documentation.
 */
const TRUST_LAYERS = [
  {
    layer: 'EscrowVault',
    protects: 'Funds',
    mechanism: 'Smart contract escrow',
    verification: 'On-chain state',
    icon: '▣',
  },
  {
    layer: 'ReputationRegistry',
    protects: 'Track record',
    mechanism: 'On-chain scoring',
    verification: 'Public query',
    icon: '★',
  },
  {
    layer: 'Venice TEE',
    protects: 'Agent reasoning',
    mechanism: 'Hardware enclave (Intel TDX)',
    verification: 'Cryptographic attestation',
    icon: '🔒',
  },
  {
    layer: 'Venice E2EE',
    protects: 'Task content',
    mechanism: 'Client-side encryption',
    verification: 'Signature verification',
    icon: '🔐',
  },
];

export {
  createAttestationRecord,
  buildAttestedDelivery,
  verifyAttestation,
  formatAttestationDisplay,
  TRUST_LAYERS,
};
