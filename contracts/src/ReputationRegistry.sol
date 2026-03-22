// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ReputationRegistry
 * @author AgentEscrow (Synthesis Hackathon 2026)
 * @notice On-chain reputation tracking for AI agents participating in the AgentEscrow marketplace.
 *
 * @dev Architecture:
 *   - Each agent address has a single AgentReputation record tracking their history.
 *   - Both buyers and sellers accrue reputation through task completions.
 *   - Reputation score is a simple percentage: (completed / total) * 100.
 *   - New agents start with a default score of 50 (neutral reputation).
 *   - UUPS upgradeable proxy pattern for post-deploy fixes.
 *
 * Agent Integration Notes:
 *   - Agents can read any agent's reputation: getReputation(address) returns full stats.
 *   - Agents can check trustworthiness: getScore(address) returns 0-100 score.
 *   - A seller agent might check a buyer's score before claiming a task.
 *   - A buyer agent might check a seller's track record before posting in a way they'll claim.
 *
 * Scoring Algorithm:
 *   - Score = (tasksCompleted * 100) / (tasksCompleted + tasksFailed)
 *   - Score of 50 = new agent (no history), Score of 100 = perfect record
 *   - Both buyer and seller get their tasksCompleted incremented on success.
 *   - Only the failing party gets tasksFailed incremented (via recordFailure).
 *
 * Security Model:
 *   - Only ServiceBoard can record completions and failures (prevents manipulation).
 *   - setServiceBoard is one-time-only (cannot be changed after initial setup).
 *   - Read functions are public — any agent or contract can query reputation.
 */
contract ReputationRegistry is Initializable, UUPSUpgradeable {
    /// @notice Tracks an agent's full reputation history
    /// @dev Updated by ServiceBoard on task completion/failure
    struct AgentReputation {
        uint256 tasksCompleted;    // Number of tasks successfully completed (as buyer or seller)
        uint256 tasksFailed;       // Number of tasks that failed/timed out
        uint256 totalEarned;       // Total ETH earned as a seller (in wei)
        uint256 totalSpent;        // Total ETH spent as a buyer (in wei)
        uint256 firstActiveAt;     // Timestamp of first activity (0 if never active)
        uint256 lastActiveAt;      // Timestamp of most recent activity
    }

    /// @notice Maps agent address -> their reputation record
    mapping(address => AgentReputation) public reputations;

    /// @notice The ServiceBoard contract authorized to update reputations
    /// @dev Set once via setServiceBoard(). All write operations are gated to this address.
    address public serviceBoard;

    /// @notice The deployer/owner who can set the ServiceBoard address
    address public owner;

    // ─── Events ────────────────────────────────────────────────────────

    /// @notice Emitted when any agent's reputation stats change
    event ReputationUpdated(address indexed agent, uint256 completed, uint256 failed);

    /// @notice Emitted when a task completion is recorded (seller earned, buyer spent)
    event CompletionRecorded(address indexed seller, uint256 indexed taskId, uint256 earned);

    /// @notice Emitted when a task failure is recorded for an agent
    event FailureRecorded(address indexed agent, uint256 indexed taskId);

    // ─── Modifiers ─────────────────────────────────────────────────────

    /// @dev Restricts function access to the linked ServiceBoard contract only
    modifier onlyServiceBoard() {
        require(msg.sender == serviceBoard, "Only ServiceBoard");
        _;
    }

    /// @dev Restricts function access to the contract deployer/owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ─── Initializer (replaces constructor for UUPS proxy) ────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the ReputationRegistry. The caller becomes the owner.
    /// @dev Replaces the constructor for proxy deployments. Can only be called once.
    function initialize() external initializer {
        owner = msg.sender;
    }

    // ─── Admin Functions ───────────────────────────────────────────────

    /// @notice Links this registry to a ServiceBoard contract (one-time setup)
    /// @dev Can only be called once. After this, all reputation updates are gated to that address.
    /// @param _serviceBoard Address of the deployed ServiceBoard contract
    function setServiceBoard(address _serviceBoard) external onlyOwner {
        require(serviceBoard == address(0), "Already set");
        require(_serviceBoard != address(0), "Zero address");
        serviceBoard = _serviceBoard;
    }

    // ─── UUPS Upgrade Authorization ────────────────────────────────────

    /// @dev Only the owner can authorize contract upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Core Reputation Functions ─────────────────────────────────────

    /// @notice Record a successful task completion. Updates both buyer and seller stats.
    /// @dev Called by ServiceBoard.confirmDelivery(). Both parties get credit.
    ///      - Seller: tasksCompleted++, totalEarned += amount
    ///      - Buyer: tasksCompleted++, totalSpent += amount
    /// @param buyer The address of the agent who posted and funded the task
    /// @param seller The address of the agent who completed the work
    /// @param taskId The task that was completed (for event logging)
    /// @param amount The ETH amount that was exchanged (in wei)
    function recordCompletion(address buyer, address seller, uint256 taskId, uint256 amount) external onlyServiceBoard {
        // Update seller reputation — they earned ETH for completing work
        AgentReputation storage sellerRep = reputations[seller];
        sellerRep.tasksCompleted++;
        sellerRep.totalEarned += amount;
        sellerRep.lastActiveAt = block.timestamp;
        if (sellerRep.firstActiveAt == 0) sellerRep.firstActiveAt = block.timestamp;

        // Update buyer reputation — they spent ETH and got their task done
        AgentReputation storage buyerRep = reputations[buyer];
        buyerRep.tasksCompleted++;
        buyerRep.totalSpent += amount;
        buyerRep.lastActiveAt = block.timestamp;
        if (buyerRep.firstActiveAt == 0) buyerRep.firstActiveAt = block.timestamp;

        emit CompletionRecorded(seller, taskId, amount);
        emit ReputationUpdated(seller, sellerRep.tasksCompleted, sellerRep.tasksFailed);
        emit ReputationUpdated(buyer, buyerRep.tasksCompleted, buyerRep.tasksFailed);
    }

    /// @notice Record a task failure or timeout for an agent
    /// @dev Called by ServiceBoard when a task times out or is disputed.
    ///      Only the responsible agent's failure count is incremented.
    /// @param agent The address of the agent who failed the task
    /// @param taskId The task that failed (for event logging)
    function recordFailure(address agent, uint256 taskId) external onlyServiceBoard {
        AgentReputation storage rep = reputations[agent];
        rep.tasksFailed++;
        rep.lastActiveAt = block.timestamp;
        if (rep.firstActiveAt == 0) rep.firstActiveAt = block.timestamp;

        emit FailureRecorded(agent, taskId);
        emit ReputationUpdated(agent, rep.tasksCompleted, rep.tasksFailed);
    }

    // ─── View Functions ────────────────────────────────────────────────

    /// @notice Get the full reputation record for an agent
    /// @dev Returns zeroed struct for agents with no history (firstActiveAt == 0)
    /// @param agent The address to look up
    /// @return The AgentReputation struct with all stats
    function getReputation(address agent) external view returns (AgentReputation memory) {
        return reputations[agent];
    }

    /// @notice Calculate a reputation score from 0-100 for an agent
    /// @dev Formula: (tasksCompleted * 100) / (tasksCompleted + tasksFailed)
    ///      Returns 50 for agents with no history (benefit of the doubt).
    ///      A score of 100 means a perfect track record. 0 means all tasks failed.
    /// @param agent The address to score
    /// @return A score between 0 and 100 (inclusive)
    function getScore(address agent) external view returns (uint256) {
        AgentReputation memory rep = reputations[agent];
        uint256 total = rep.tasksCompleted + rep.tasksFailed;
        if (total == 0) return 50; // Default score for new agents — neutral reputation
        return (rep.tasksCompleted * 100) / total;
    }
}
