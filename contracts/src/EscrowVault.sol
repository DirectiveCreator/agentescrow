// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EscrowVault - Holds ETH in escrow for AgentEscrow tasks
/// @notice Trustless escrow: funds locked until delivery confirmed or timeout
contract EscrowVault {
    struct Escrow {
        uint256 taskId;
        address buyer;
        uint256 amount;
        uint256 deadline;
        bool released;
        bool refunded;
    }

    mapping(uint256 => Escrow) public escrows;
    address public serviceBoard;
    address public owner;

    event EscrowCreated(uint256 indexed taskId, address indexed buyer, uint256 amount, uint256 deadline);
    event EscrowReleased(uint256 indexed taskId, address indexed seller, uint256 amount);
    event EscrowRefunded(uint256 indexed taskId, address indexed buyer, uint256 amount);

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

    /// @notice Set the ServiceBoard address (one-time setup)
    function setServiceBoard(address _serviceBoard) external onlyOwner {
        require(serviceBoard == address(0), "Already set");
        serviceBoard = _serviceBoard;
    }

    /// @notice Deposit ETH into escrow for a task
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

    /// @notice Release escrowed funds to the seller
    function release(uint256 taskId, address seller) external onlyServiceBoard {
        Escrow storage escrow = escrows[taskId];
        require(escrow.amount > 0, "No escrow");
        require(!escrow.released && !escrow.refunded, "Already settled");

        escrow.released = true;
        uint256 amount = escrow.amount;

        (bool success, ) = payable(seller).call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowReleased(taskId, seller, amount);
    }

    /// @notice Refund escrowed funds to the buyer
    function refund(uint256 taskId, address buyer) external onlyServiceBoard {
        Escrow storage escrow = escrows[taskId];
        require(escrow.amount > 0, "No escrow");
        require(!escrow.released && !escrow.refunded, "Already settled");

        escrow.refunded = true;
        uint256 amount = escrow.amount;

        (bool success, ) = payable(buyer).call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowRefunded(taskId, buyer, amount);
    }

    /// @notice Get escrow details
    function getEscrow(uint256 taskId) external view returns (Escrow memory) {
        return escrows[taskId];
    }

    /// @notice Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
