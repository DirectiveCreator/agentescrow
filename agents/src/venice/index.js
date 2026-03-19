/**
 * Venice Private Cognition Module for AgentEscrow
 *
 * Provides privacy-preserving AI inference via Venice's TEE (Trusted Execution
 * Environments) and E2EE (End-to-End Encryption) infrastructure.
 *
 * ## What This Adds
 *
 * AgentEscrow already protects:
 * - Funds → EscrowVault (smart contract)
 * - Reputation → ReputationRegistry (on-chain scores)
 *
 * Venice adds protection for:
 * - Agent Strategy → TEE evaluation (decision-making is enclave-protected)
 * - Work Execution → TEE inference (reasoning stays in hardware enclave)
 * - Quality Criteria → TEE verification (buyer's standards stay private)
 * - Delivery Integrity → Attestation (cryptographic proof of honest computation)
 *
 * ## Files
 *
 * - client.js          — Venice API client with TEE/E2EE support
 * - attestation.js     — Attestation record creation and verification
 * - enhanced-seller.js — Seller agent with private eval + execution
 * - enhanced-buyer.js  — Buyer agent with private verification
 * - demo.js            — End-to-end demo (works with or without API key)
 *
 * ## Usage
 *
 * ```bash
 * # Run the demo (simulation mode — no API key needed)
 * node agents/src/venice/demo.js
 *
 * # Run with real Venice TEE inference
 * VENICE_API_KEY=your_key node agents/src/venice/demo.js
 *
 * # Run enhanced agents
 * VENICE_API_KEY=your_key CHAIN=local node agents/src/venice/enhanced-seller.js
 * VENICE_API_KEY=your_key CHAIN=local node agents/src/venice/enhanced-buyer.js
 * ```
 *
 * ## Architecture
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │                   AgentEscrow System                      │
 * │                                                           │
 * │  ┌─────────┐    ┌──────────────┐    ┌─────────────┐     │
 * │  │  Buyer   │    │  ServiceBoard │    │   Seller    │     │
 * │  │  Agent   │◄──►│  (on-chain)  │◄──►│   Agent     │     │
 * │  └────┬─────┘    └──────────────┘    └──────┬──────┘     │
 * │       │                                      │            │
 * │       ▼                                      ▼            │
 * │  ┌─────────────────────────────────────────────────────┐ │
 * │  │           Venice Private Cognition Layer              │ │
 * │  │                                                       │ │
 * │  │  ┌───────────┐  ┌────────────┐  ┌────────────┐      │ │
 * │  │  │ TEE/E2EE  │  │ Attestation│  │  Signature  │      │ │
 * │  │  │ Inference  │  │ Proof      │  │  Verify     │      │ │
 * │  │  └───────────┘  └────────────┘  └────────────┘      │ │
 * │  └─────────────────────────────────────────────────────┘ │
 * │       │                                      │            │
 * │       ▼                                      ▼            │
 * │  ┌─────────────┐                      ┌─────────────┐   │
 * │  │ Private      │                      │   Private   │   │
 * │  │ Verification │                      │   Execution │   │
 * │  └─────────────┘                      └─────────────┘   │
 * └─────────────────────────────────────────────────────────┘
 *
 * @see https://docs.venice.ai
 * @see venice-integration-analysis.md
 */

export { createVeniceClient, VeniceClient, TEE_MODELS, PRIVACY_TIERS } from './client.js';
export { createAttestationRecord, buildAttestedDelivery, verifyAttestation, formatAttestationDisplay, TRUST_LAYERS } from './attestation.js';
