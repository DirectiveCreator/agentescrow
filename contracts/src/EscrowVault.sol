// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title EscrowVault
 * @author AgentEscrow (Synthesis Hackathon 2026)
 * @notice Trustless escrow vault that holds ETH for agent-to-agent service tasks.
 *
 * @dev Architecture:
 *   - This contract holds funds in escrow while tasks are in progress.
 *   - Only the linked ServiceBoard contract can deposit, release, or refund funds.
 *   - Each task has exactly one Escrow entry, identified by taskId.
 *   - Funds flow: Buyer -> EscrowVault (on task post) -> Seller (on confirm) OR -> Buyer (on cancel/timeout).
 *   - UUPS upgradeable proxy pattern for post-deploy fixes.
 *
 * Agent Integration Notes:
 *   - Agents interact with this contract indirectly via ServiceBoard.
 *   - To check if funds are locked: call getEscrow(taskId) and inspect `released` / `refunded`.
 *   - The contract balance (getBalance()) reflects total locked funds across all active tasks.
 *
 * Security Model:
 *   - onlyServiceBoard modifier ensures only the authorized ServiceBoard can move funds.
 *   - setServiceBoard is one-time-only (cannot be changed after initial setup).
 *   - Uses low-level call for ETH transfers to handle contracts as recipients.
 *   - Each escrow can only be settled once (released XOR refunded, never both).
 */
contract EscrowVault is Initializable, UUPSUpgradeable {
    /// @notice Represents a single escrow deposit for a task
    /// @dev One escrow per taskId. Both `released` and `refunded` start false.
    struct Escrow {
        uint256 taskId;     // The task this escrow is for (matches ServiceBoard.Task.id)
        address buyer;      // The agent who funded this escrow
        uint256 amount;     // Amount of ETH locked (in wei)
        uint256 deadline;   // Task deadline timestamp — used for timeout refund eligibility
        bool released;      // True if funds were released to the seller
        bool refunded;      // True if funds were refunded to the buyer
    }

    /// @notice Maps taskId -> Escrow. One escrow per task.
    mapping(uint256 => Escrow) public escrows;

    /// @notice The ServiceBoard contract authorized to manage escrows
    /// @dev Set once via setServiceBoard(). All deposit/release/refund calls must come from this address.
    address public serviceBoard;

    /// @notice The deployer/owner who can set the ServiceBoard address
    address public owner;

    // ─── Events ────────────────────────────────────────────────────────

    /// @notice Emitted when ETH is deposited into escrow for a new task
    event EscrowCreated(uint256 indexed taskId, address indexed buyer, uint256 amount, uint256 deadline);

    /// @notice Emitted when escrowed funds are released to the seller (task completed)
    event EscrowReleased(uint256 indexed taskId, address indexed seller, uint256 amount);

    /// @notice Emitted when escrowed funds are refunded to the buyer (task cancelled/timed out)
    event EscrowRefunded(uint256 indexed taskId, address indexed buyer, uint256 amount);

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

    /// @notice Initializes the EscrowVault. The caller becomes the owner.
    /// @dev Replaces the constructor for proxy deployments. Can only be called once.
    function initialize() external initializer {
        owner = msg.sender;
    }

    // ─── Admin Functions ───────────────────────────────────────────────

    /// @notice Links this vault to a ServiceBoard contract (one-time setup)
    /// @dev Can only be called once. After this, all escrow operations are gated to that address.
    /// @param _serviceBoard Address of the deployed ServiceBoard contract
    function setServiceBoard(address _serviceBoard) external onlyOwner {
        require(serviceBoard == address(0), "Already set");
        require(_serviceBoard != address(0), "Zero address");
        serviceBoard = _serviceBoard;
    }

    // ─── UUPS Upgrade Authorization ────────────────────────────────────

    /// @dev Only the owner can authorize contract upgrades
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Core Escrow Functions ─────────────────────────────────────────

    /// @notice Deposit ETH into escrow for a task. Called by ServiceBoard when a task is posted.
    /// @dev Creates a new Escrow entry. Reverts if escrow already exists for this taskId.
    /// @param taskId The unique task identifier from ServiceBoard
    /// @param buyer The address of the agent posting (and funding) the task
    /// @param deadline The task deadline timestamp (used for timeout logic)
    function deposit(uint256 taskId, address buyer, uint256 deadline) external payable onlyServiceBoard {
        require(msg.value > 0, "No ETH sent");
        require(escrows[taskId].amount == 0, "Escrow exists");

        escrows[taskId] = Escrow({
            taskId: taskId,
            buyer: buyer,
            amount: msg.value,
            deadline: deadline,
            released: false,
            refunded: false
        });

        emit EscrowCreated(taskId, buyer, msg.value, deadline);
    }

    /// @notice Release escrowed funds to the seller. Called when buyer confirms delivery.
    /// @dev Marks escrow as released and transfers ETH to seller via low-level call.
    /// @param taskId The task whose escrow to release
    /// @param seller The address of the agent who completed the work
    function release(uint256 taskId, address seller) external onlyServiceBoard {
        Escrow storage escrow = escrows[taskId];
        require(escrow.amount > 0, "No escrow");
        require(!escrow.released && !escrow.refunded, "Already settled");

        escrow.released = true;
        uint256 amount = escrow.amount;

        // Transfer ETH to seller — uses call to support contract recipients
        (bool success, ) = payable(seller).call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowReleased(taskId, seller, amount);
    }

    /// @notice Refund escrowed funds to the buyer. Called on cancellation or timeout.
    /// @dev Marks escrow as refunded and transfers ETH back to buyer via low-level call.
    /// @param taskId The task whose escrow to refund
    /// @param buyer The address of the agent who funded the task
    function refund(uint256 taskId, address buyer) external onlyServiceBoard {
        Escrow storage escrow = escrows[taskId];
        require(escrow.amount > 0, "No escrow");
        require(!escrow.released && !escrow.refunded, "Already settled");

        escrow.refunded = true;
        uint256 amount = escrow.amount;

        // Transfer ETH back to buyer — uses call to support contract recipients
        (bool success, ) = payable(buyer).call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowRefunded(taskId, buyer, amount);
    }

    // ─── View Functions ────────────────────────────────────────────────

    /// @notice Get the full escrow details for a task
    /// @param taskId The task to look up
    /// @return The Escrow struct (taskId, buyer, amount, deadline, released, refunded)
    function getEscrow(uint256 taskId) external view returns (Escrow memory) {
        return escrows[taskId];
    }

    /// @notice Get the total ETH balance held in this vault across all active escrows
    /// @return The contract's ETH balance in wei
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @dev Accept direct ETH transfers (e.g., for testing or emergency deposits)
    receive() external payable {}
}
