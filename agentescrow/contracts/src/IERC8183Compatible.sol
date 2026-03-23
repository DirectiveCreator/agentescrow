// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8183Compatible
 * @notice Declares Escroue compatibility with ERC-8183 Agentic Commerce standard.
 * ERC-8183 defines the Job primitive for trustless agent-to-agent commerce.
 * Escroue implements the same architecture natively.
 *
 * Mapping:
 *   ERC-8183 createJob() -> Escroue postTask()
 *   ERC-8183 fund() -> Escroue postTask() (auto-funded)
 *   ERC-8183 submit() -> Escroue deliverTask()
 *   ERC-8183 complete() -> Escroue confirmDelivery()
 *   ERC-8183 claimRefund() -> Escroue claimTimeout()
 *
 * @custom:erc 8183
 * @custom:compatibility 80% — buyer doubles as evaluator, no hook system
 */
interface IERC8183Compatible {
    event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget);
    event JobSubmitted(uint256 indexed jobId, bytes32 deliverable);
    event JobCompleted(uint256 indexed jobId, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
}
