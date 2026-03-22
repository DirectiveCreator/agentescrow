// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8183Compatible
 * @notice Declares AgentEscrow compatibility with ERC-8183 Agentic Commerce standard.
 * ERC-8183 defines the Job primitive for trustless agent-to-agent commerce.
 * AgentEscrow implements the same architecture natively.
 *
 * Mapping:
 *   ERC-8183 createJob() -> AgentEscrow postTask()
 *   ERC-8183 fund() -> AgentEscrow postTask() (auto-funded)
 *   ERC-8183 submit() -> AgentEscrow deliverTask()
 *   ERC-8183 complete() -> AgentEscrow confirmDelivery()
 *   ERC-8183 claimRefund() -> AgentEscrow claimTimeout()
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
