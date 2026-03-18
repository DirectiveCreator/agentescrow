// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ReputationRegistry - Tracks agent reputation for AgentEscrow
/// @notice Records completions, failures, and calculates reputation scores
contract ReputationRegistry {
    struct AgentReputation {
        uint256 tasksCompleted;
        uint256 tasksFailed;
        uint256 totalEarned;       // as seller
        uint256 totalSpent;        // as buyer
        uint256 firstActiveAt;
        uint256 lastActiveAt;
    }

    mapping(address => AgentReputation) public reputations;
    address public serviceBoard;
    address public owner;

    event ReputationUpdated(address indexed agent, uint256 completed, uint256 failed);
    event CompletionRecorded(address indexed seller, uint256 indexed taskId, uint256 earned);
    event FailureRecorded(address indexed agent, uint256 indexed taskId);

    modifier onlyServiceBoard() {
        require(msg.sender == serviceBoard, "Only ServiceBoard");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setServiceBoard(address _serviceBoard) external onlyOwner {
        require(serviceBoard == address(0), "Already set");
        serviceBoard = _serviceBoard;
    }

    /// @notice Record a successful task completion
    function recordCompletion(address buyer, address seller, uint256 taskId, uint256 amount) external onlyServiceBoard {
        // Update seller reputation
        AgentReputation storage sellerRep = reputations[seller];
        sellerRep.tasksCompleted++;
        sellerRep.totalEarned += amount;
        sellerRep.lastActiveAt = block.timestamp;
        if (sellerRep.firstActiveAt == 0) sellerRep.firstActiveAt = block.timestamp;

        // Update buyer reputation
        AgentReputation storage buyerRep = reputations[buyer];
        buyerRep.tasksCompleted++;
        buyerRep.totalSpent += amount;
        buyerRep.lastActiveAt = block.timestamp;
        if (buyerRep.firstActiveAt == 0) buyerRep.firstActiveAt = block.timestamp;

        emit CompletionRecorded(seller, taskId, amount);
        emit ReputationUpdated(seller, sellerRep.tasksCompleted, sellerRep.tasksFailed);
        emit ReputationUpdated(buyer, buyerRep.tasksCompleted, buyerRep.tasksFailed);
    }

    /// @notice Record a failed/timed-out task
    function recordFailure(address agent, uint256 taskId) external onlyServiceBoard {
        AgentReputation storage rep = reputations[agent];
        rep.tasksFailed++;
        rep.lastActiveAt = block.timestamp;
        if (rep.firstActiveAt == 0) rep.firstActiveAt = block.timestamp;

        emit FailureRecorded(agent, taskId);
        emit ReputationUpdated(agent, rep.tasksCompleted, rep.tasksFailed);
    }

    /// @notice Get reputation for an agent
    function getReputation(address agent) external view returns (AgentReputation memory) {
        return reputations[agent];
    }

    /// @notice Calculate reputation score (0-100)
    function getScore(address agent) external view returns (uint256) {
        AgentReputation memory rep = reputations[agent];
        uint256 total = rep.tasksCompleted + rep.tasksFailed;
        if (total == 0) return 50; // default score for new agents
        return (rep.tasksCompleted * 100) / total;
    }
}
