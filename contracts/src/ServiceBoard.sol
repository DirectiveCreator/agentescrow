// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowVault.sol";
import "./ReputationRegistry.sol";

/// @title ServiceBoard - Task posting and lifecycle management for AgentEscrow
/// @notice Agents post tasks, claim them, deliver work, and settle via escrow
contract ServiceBoard {
    enum TaskStatus { Open, Claimed, Delivered, Completed, Cancelled, Disputed }

    struct Task {
        uint256 id;
        address buyer;
        address seller;
        string taskType;       // "text_summary", "code_review", "name_generation", "translation"
        string description;
        uint256 reward;        // in wei
        uint256 deadline;      // timestamp
        TaskStatus status;
        string deliveryHash;   // IPFS hash or content hash of delivered work
        uint256 createdAt;
        uint256 claimedAt;
        uint256 deliveredAt;
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;
    uint256[] public taskIds;

    EscrowVault public escrowVault;
    ReputationRegistry public reputationRegistry;

    event TaskPosted(uint256 indexed taskId, address indexed buyer, string taskType, uint256 reward, uint256 deadline);
    event TaskClaimed(uint256 indexed taskId, address indexed seller);
    event TaskDelivered(uint256 indexed taskId, string deliveryHash);
    event TaskCompleted(uint256 indexed taskId, address indexed buyer, address indexed seller, uint256 reward);
    event TaskCancelled(uint256 indexed taskId);
    event TaskReceipt(uint256 indexed taskId, address indexed buyer, address indexed seller, string taskType, uint256 reward, uint256 timestamp);

    modifier onlyBuyer(uint256 taskId) {
        require(msg.sender == tasks[taskId].buyer, "Not buyer");
        _;
    }

    modifier onlySeller(uint256 taskId) {
        require(msg.sender == tasks[taskId].seller, "Not seller");
        _;
    }

    constructor(address _escrowVault, address _reputationRegistry) {
        escrowVault = EscrowVault(payable(_escrowVault));
        reputationRegistry = ReputationRegistry(_reputationRegistry);
    }

    /// @notice Post a new task with ETH reward
    function postTask(
        string calldata taskType,
        string calldata description,
        uint256 deadline
    ) external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH for reward");
        require(deadline > block.timestamp, "Deadline must be in the future");

        uint256 taskId = nextTaskId++;
        tasks[taskId] = Task({
            id: taskId,
            buyer: msg.sender,
            seller: address(0),
            taskType: taskType,
            description: description,
            reward: msg.value,
            deadline: deadline,
            status: TaskStatus.Open,
            deliveryHash: "",
            createdAt: block.timestamp,
            claimedAt: 0,
            deliveredAt: 0
        });
        taskIds.push(taskId);

        // Deposit into escrow
        escrowVault.deposit{value: msg.value}(taskId, msg.sender, deadline);

        emit TaskPosted(taskId, msg.sender, taskType, msg.value, deadline);
        return taskId;
    }

    /// @notice Seller claims an open task
    function claimTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Task not open");
        require(task.buyer != msg.sender, "Buyer cannot claim own task");
        require(block.timestamp < task.deadline, "Task expired");

        task.seller = msg.sender;
        task.status = TaskStatus.Claimed;
        task.claimedAt = block.timestamp;

        emit TaskClaimed(taskId, msg.sender);
    }

    /// @notice Seller delivers work
    function deliverTask(uint256 taskId, string calldata deliveryHash) external onlySeller(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Claimed, "Task not claimed");

        task.status = TaskStatus.Delivered;
        task.deliveryHash = deliveryHash;
        task.deliveredAt = block.timestamp;

        emit TaskDelivered(taskId, deliveryHash);
    }

    /// @notice Buyer confirms delivery and releases escrow
    function confirmDelivery(uint256 taskId) external onlyBuyer(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Delivered, "Task not delivered");

        task.status = TaskStatus.Completed;

        // Release escrow to seller
        escrowVault.release(taskId, task.seller);

        // Update reputation
        reputationRegistry.recordCompletion(task.buyer, task.seller, taskId, task.reward);

        emit TaskCompleted(taskId, task.buyer, task.seller, task.reward);
        emit TaskReceipt(taskId, task.buyer, task.seller, task.taskType, task.reward, block.timestamp);
    }

    /// @notice Buyer cancels an open (unclaimed) task
    function cancelTask(uint256 taskId) external onlyBuyer(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Can only cancel open tasks");

        task.status = TaskStatus.Cancelled;
        escrowVault.refund(taskId, task.buyer);

        emit TaskCancelled(taskId);
    }

    /// @notice Anyone can trigger timeout refund after deadline
    function claimTimeout(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Claimed || task.status == TaskStatus.Open,
            "Task not eligible for timeout"
        );
        require(block.timestamp >= task.deadline, "Deadline not reached");

        task.status = TaskStatus.Cancelled;
        escrowVault.refund(taskId, task.buyer);

        emit TaskCancelled(taskId);
    }

    // View functions

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    function getTaskCount() external view returns (uint256) {
        return nextTaskId;
    }

    function getOpenTasks() external view returns (Task[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < nextTaskId; i++) {
            if (tasks[i].status == TaskStatus.Open) count++;
        }
        Task[] memory openTasks = new Task[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < nextTaskId; i++) {
            if (tasks[i].status == TaskStatus.Open) {
                openTasks[idx++] = tasks[i];
            }
        }
        return openTasks;
    }
}
