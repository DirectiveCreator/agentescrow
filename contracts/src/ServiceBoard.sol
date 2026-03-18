// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowVault.sol";
import "./ReputationRegistry.sol";

/**
 * @title ServiceBoard
 * @author AgentEscrow (Synthesis Hackathon 2026)
 * @notice The main entry point for agent-to-agent service tasks. Agents post tasks,
 *         claim them, deliver work, and settle payment — all on-chain with trustless escrow.
 *
 * @dev Architecture:
 *   - ServiceBoard is the orchestrator. It manages the task lifecycle and coordinates
 *     with EscrowVault (funds) and ReputationRegistry (trust scores).
 *   - Task lifecycle: Open → Claimed → Delivered → Completed (happy path)
 *   - Alternative paths: Open → Cancelled (buyer cancels) or Claimed → Cancelled (timeout)
 *
 * Agent Integration Notes:
 *   - BUYER AGENT workflow:
 *     1. Call postTask() with ETH to create a task (funds auto-deposited to escrow)
 *     2. Wait for a seller agent to claim and deliver
 *     3. Call confirmDelivery() to release payment to seller
 *     4. Or call cancelTask() if no one has claimed it yet
 *
 *   - SELLER AGENT workflow:
 *     1. Call getOpenTasks() to browse available work
 *     2. Call claimTask() to lock in as the worker
 *     3. Do the work off-chain, then call deliverTask() with a content hash
 *     4. Wait for buyer to confirm — payment auto-releases from escrow
 *
 *   - MONITORING AGENT workflow:
 *     1. Watch TaskPosted/TaskClaimed/TaskDelivered/TaskCompleted events
 *     2. Call getTask() or getOpenTasks() for current state
 *     3. Call claimTimeout() on expired tasks to trigger refunds
 *
 * Task Types (extensible string field):
 *   - "text_summary" — Summarize a document or text
 *   - "code_review" — Review and provide feedback on code
 *   - "name_generation" — Generate creative names/suggestions
 *   - "translation" — Translate text between languages
 *   - Custom types are supported — the field is a free-form string
 *
 * Events (for agent monitoring):
 *   - TaskPosted: New task available for claiming
 *   - TaskClaimed: Task has been claimed by a seller agent
 *   - TaskDelivered: Seller has submitted their work
 *   - TaskCompleted: Buyer confirmed, payment released
 *   - TaskCancelled: Task was cancelled or timed out
 *   - TaskReceipt: Full receipt emitted on completion (for indexing/reporting)
 */
contract ServiceBoard {
    /// @notice The possible states a task can be in
    /// @dev Linear progression: Open → Claimed → Delivered → Completed
    ///      Branch paths: Open → Cancelled, Claimed → Cancelled (timeout)
    enum TaskStatus {
        Open,       // Task posted, waiting for a seller to claim
        Claimed,    // Seller has claimed, working on delivery
        Delivered,  // Seller submitted work, waiting for buyer confirmation
        Completed,  // Buyer confirmed, payment released, task done
        Cancelled,  // Task cancelled by buyer or timed out
        Disputed    // Reserved for future dispute resolution (not yet implemented)
    }

    /// @notice Represents a single task on the service board
    /// @dev All fields are set at creation except seller/delivery/timing fields
    struct Task {
        uint256 id;            // Unique task identifier (auto-incremented)
        address buyer;         // Agent who posted and funded the task
        address seller;        // Agent who claimed and will deliver (address(0) if unclaimed)
        string taskType;       // Type of work: "text_summary", "code_review", etc.
        string description;    // Human/agent-readable description of what's needed
        uint256 reward;        // ETH reward in wei (locked in EscrowVault)
        uint256 deadline;      // Unix timestamp — task expires after this time
        TaskStatus status;     // Current lifecycle status
        string deliveryHash;   // IPFS hash or content hash of delivered work (empty until delivery)
        uint256 createdAt;     // Timestamp when task was posted
        uint256 claimedAt;     // Timestamp when seller claimed (0 if unclaimed)
        uint256 deliveredAt;   // Timestamp when work was delivered (0 if not yet)
    }

    /// @notice Auto-incrementing task ID counter
    uint256 public nextTaskId;

    /// @notice Maps taskId → Task struct
    mapping(uint256 => Task) public tasks;

    /// @notice Array of all task IDs (for enumeration)
    uint256[] public taskIds;

    /// @notice The EscrowVault contract that holds task funds
    EscrowVault public escrowVault;

    /// @notice The ReputationRegistry contract that tracks agent trust scores
    ReputationRegistry public reputationRegistry;

    // ─── Events ────────────────────────────────────────────────────────

    /// @notice Emitted when a new task is posted and funded
    event TaskPosted(uint256 indexed taskId, address indexed buyer, string taskType, uint256 reward, uint256 deadline);

    /// @notice Emitted when a seller agent claims a task
    event TaskClaimed(uint256 indexed taskId, address indexed seller);

    /// @notice Emitted when the seller submits their work
    event TaskDelivered(uint256 indexed taskId, string deliveryHash);

    /// @notice Emitted when the buyer confirms delivery and payment is released
    event TaskCompleted(uint256 indexed taskId, address indexed buyer, address indexed seller, uint256 reward);

    /// @notice Emitted when a task is cancelled (by buyer or timeout)
    event TaskCancelled(uint256 indexed taskId);

    /// @notice Full receipt emitted on task completion — useful for indexing and reporting
    event TaskReceipt(uint256 indexed taskId, address indexed buyer, address indexed seller, string taskType, uint256 reward, uint256 timestamp);

    // ─── Modifiers ─────────────────────────────────────────────────────

    /// @dev Ensures the caller is the buyer of the specified task
    modifier onlyBuyer(uint256 taskId) {
        require(msg.sender == tasks[taskId].buyer, "Not buyer");
        _;
    }

    /// @dev Ensures the caller is the seller of the specified task
    modifier onlySeller(uint256 taskId) {
        require(msg.sender == tasks[taskId].seller, "Not seller");
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────

    /// @notice Deploys the ServiceBoard with references to EscrowVault and ReputationRegistry
    /// @dev Both vault and registry must already be deployed. After deployment, call
    ///      vault.setServiceBoard(address(this)) and registry.setServiceBoard(address(this)).
    /// @param _escrowVault Address of the deployed EscrowVault contract
    /// @param _reputationRegistry Address of the deployed ReputationRegistry contract
    constructor(address _escrowVault, address _reputationRegistry) {
        escrowVault = EscrowVault(payable(_escrowVault));
        reputationRegistry = ReputationRegistry(_reputationRegistry);
    }

    // ─── Task Lifecycle Functions ──────────────────────────────────────

    /// @notice Post a new task with ETH reward. Funds are locked in escrow immediately.
    /// @dev The caller becomes the buyer. msg.value is the task reward.
    ///      The deadline must be in the future. Emits TaskPosted.
    /// @param taskType The type of work needed (e.g., "text_summary", "code_review")
    /// @param description A description of the task for seller agents to evaluate
    /// @param deadline Unix timestamp after which the task expires
    /// @return The ID of the newly created task
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

        // Lock funds in escrow vault — funds are held until delivery confirmed or timeout
        escrowVault.deposit{value: msg.value}(taskId, msg.sender, deadline);

        emit TaskPosted(taskId, msg.sender, taskType, msg.value, deadline);
        return taskId;
    }

    /// @notice Claim an open task as a seller agent. You commit to delivering the work.
    /// @dev The task must be Open, not expired, and you cannot claim your own task.
    ///      After claiming, you should deliver work before the deadline.
    /// @param taskId The task to claim
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

    /// @notice Submit completed work for a claimed task
    /// @dev Only the seller who claimed the task can deliver. The deliveryHash should be
    ///      an IPFS hash, content hash, or URI pointing to the completed work.
    /// @param taskId The task to deliver work for
    /// @param deliveryHash A hash or URI of the delivered work (e.g., IPFS CID)
    function deliverTask(uint256 taskId, string calldata deliveryHash) external onlySeller(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Claimed, "Task not claimed");

        task.status = TaskStatus.Delivered;
        task.deliveryHash = deliveryHash;
        task.deliveredAt = block.timestamp;

        emit TaskDelivered(taskId, deliveryHash);
    }

    /// @notice Confirm delivery and release escrowed payment to the seller
    /// @dev Only the buyer can confirm. This releases funds from EscrowVault to seller
    ///      and records a successful completion in ReputationRegistry for both parties.
    /// @param taskId The task to confirm delivery for
    function confirmDelivery(uint256 taskId) external onlyBuyer(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Delivered, "Task not delivered");

        task.status = TaskStatus.Completed;

        // Release escrowed funds to the seller who did the work
        escrowVault.release(taskId, task.seller);

        // Record successful completion for both buyer and seller reputation
        reputationRegistry.recordCompletion(task.buyer, task.seller, taskId, task.reward);

        emit TaskCompleted(taskId, task.buyer, task.seller, task.reward);
        emit TaskReceipt(taskId, task.buyer, task.seller, task.taskType, task.reward, block.timestamp);
    }

    /// @notice Cancel an open (unclaimed) task and refund the buyer
    /// @dev Only the buyer can cancel, and only while the task is still Open (no seller yet).
    ///      Funds are returned from EscrowVault to the buyer.
    /// @param taskId The task to cancel
    function cancelTask(uint256 taskId) external onlyBuyer(taskId) {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Open, "Can only cancel open tasks");

        task.status = TaskStatus.Cancelled;
        escrowVault.refund(taskId, task.buyer);

        emit TaskCancelled(taskId);
    }

    /// @notice Trigger a timeout refund for an expired task. Anyone can call this.
    /// @dev This is a public good function — any agent or EOA can call it to clean up
    ///      expired tasks and return funds to the buyer. Works for both Open and Claimed
    ///      tasks that have passed their deadline.
    /// @param taskId The expired task to refund
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

    // ─── View Functions ────────────────────────────────────────────────

    /// @notice Get the full details of a specific task
    /// @param taskId The task to look up
    /// @return The Task struct with all fields
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /// @notice Get the total number of tasks ever posted
    /// @return The count of all tasks (including completed/cancelled)
    function getTaskCount() external view returns (uint256) {
        return nextTaskId;
    }

    /// @notice Get all currently open (unclaimed) tasks
    /// @dev Iterates all tasks — gas cost scales with total task count.
    ///      For production, consider off-chain indexing via events instead.
    /// @return An array of Task structs with status == Open
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
