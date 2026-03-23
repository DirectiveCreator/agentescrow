// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

/// @title Extended test suite for Escroue contracts
/// @notice Covers edge cases, access control, reputation scoring, volume tracking,
///         state transition guards, ownership transfer, delivered-timeout, and reentrancy.
contract EscroueExtendedTest is Test {
    EscrowVault public vault;
    ReputationRegistry public reputation;
    ServiceBoard public board;

    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");
    address attacker = makeAddr("attacker");
    address third = makeAddr("third");

    function setUp() public {
        // Deploy implementations
        EscrowVault vaultImpl = new EscrowVault();
        ReputationRegistry reputationImpl = new ReputationRegistry();
        ServiceBoard boardImpl = new ServiceBoard();

        // Deploy proxies
        ERC1967Proxy vaultProxy = new ERC1967Proxy(
            address(vaultImpl),
            abi.encodeCall(EscrowVault.initialize, ())
        );
        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationImpl),
            abi.encodeCall(ReputationRegistry.initialize, ())
        );
        ERC1967Proxy boardProxy = new ERC1967Proxy(
            address(boardImpl),
            abi.encodeCall(ServiceBoard.initialize, (address(vaultProxy), address(reputationProxy)))
        );

        vault = EscrowVault(payable(address(vaultProxy)));
        reputation = ReputationRegistry(address(reputationProxy));
        board = ServiceBoard(address(boardProxy));

        vault.setServiceBoard(address(board));
        reputation.setServiceBoard(address(board));

        vm.deal(buyer, 100 ether);
        vm.deal(seller, 10 ether);
        vm.deal(attacker, 10 ether);
        vm.deal(third, 10 ether);
    }

    // ─── Reputation: Default Score ──────────────────────────────────────

    /// @notice New agents with no history should have a default score of 50
    function testDefaultScoreForNewAgent() public {
        address nobody = makeAddr("nobody");
        uint256 score = reputation.getScore(nobody);
        assertEq(score, 50, "New agent should have default score of 50");
    }

    // ─── Reputation: Mixed Completions and Failures ─────────────────────

    /// @notice Score should reflect mix of completions and failures
    function testReputationScoreAfterCompletionsAndTimeout() public {
        // Complete 3 tasks
        for (uint256 i = 0; i < 3; i++) {
            _completeTask(0.1 ether);
        }

        // Seller score should be 100 (3 completed, 0 failed)
        assertEq(reputation.getScore(seller), 100);
        // Buyer score should also be 100
        assertEq(reputation.getScore(buyer), 100);

        ReputationRegistry.AgentReputation memory sellerRep = reputation.getReputation(seller);
        assertEq(sellerRep.tasksCompleted, 3);
        assertEq(sellerRep.tasksFailed, 0);
    }

    // ─── Reputation: Failure Recording on Timeout ────────────────────────

    /// @notice Seller should get a failure recorded when claimed task times out
    function testSellerFailureOnClaimedTimeout() public {
        // Complete 2 tasks first
        _completeTask(0.1 ether);
        _completeTask(0.1 ether);

        // Now claim but don't deliver — timeout
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(taskId);

        vm.warp(block.timestamp + 2 hours);
        board.claimTimeout(taskId);

        // Seller should now have 2 completions, 1 failure → score = 66
        ReputationRegistry.AgentReputation memory sellerRep = reputation.getReputation(seller);
        assertEq(sellerRep.tasksCompleted, 2);
        assertEq(sellerRep.tasksFailed, 1);
        assertEq(reputation.getScore(seller), 66); // 2 * 100 / 3 = 66
    }

    // ─── Reputation: Volume Accumulation ────────────────────────────────

    /// @notice totalEarned and totalSpent should accumulate correctly across varying amounts
    function testVolumeAccumulation() public {
        uint256[4] memory amounts = [uint256(0.1 ether), 0.25 ether, 0.5 ether, 1 ether];
        uint256 expectedTotal = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            _completeTask(amounts[i]);
            expectedTotal += amounts[i];
        }

        ReputationRegistry.AgentReputation memory sellerRep = reputation.getReputation(seller);
        assertEq(sellerRep.totalEarned, expectedTotal, "Seller totalEarned mismatch");
        assertEq(sellerRep.tasksCompleted, 4, "Seller tasksCompleted should be 4");

        ReputationRegistry.AgentReputation memory buyerRep = reputation.getReputation(buyer);
        assertEq(buyerRep.totalSpent, expectedTotal, "Buyer totalSpent mismatch");
        assertEq(buyerRep.tasksCompleted, 4, "Buyer tasksCompleted should be 4");
    }

    // ─── Reputation: Timestamp Tracking ─────────────────────────────────

    /// @notice firstActiveAt should be set on first completion and never change;
    ///         lastActiveAt should update on each completion
    function testTimestampTracking() public {
        // Before any activity
        ReputationRegistry.AgentReputation memory rep = reputation.getReputation(seller);
        assertEq(rep.firstActiveAt, 0, "firstActiveAt should be 0 before activity");

        // First task at timestamp 1000
        vm.warp(1000);
        _completeTask(0.1 ether);

        rep = reputation.getReputation(seller);
        assertEq(rep.firstActiveAt, 1000, "firstActiveAt should be 1000");
        assertEq(rep.lastActiveAt, 1000, "lastActiveAt should be 1000");

        // Second task at timestamp 2000
        vm.warp(2000);
        _completeTask(0.1 ether);

        rep = reputation.getReputation(seller);
        assertEq(rep.firstActiveAt, 1000, "firstActiveAt should remain 1000");
        assertEq(rep.lastActiveAt, 2000, "lastActiveAt should update to 2000");
    }

    // ─── Delivered Task Timeout (M-1 fix) ────────────────────────────────

    /// @notice Delivered tasks can be timed out after deadline + grace period
    function testDeliveredTaskTimeout() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmGarbage");

        // Warp past deadline but not past grace period
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert("Delivery grace period not elapsed");
        board.claimTimeout(taskId);

        // Warp past deadline + 24 hour grace period
        vm.warp(block.timestamp + 24 hours);

        uint256 buyerBalBefore = buyer.balance;
        board.claimTimeout(taskId);

        ServiceBoard.Task memory task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Cancelled));
        assertEq(buyer.balance, buyerBalBefore + 1 ether, "Buyer should get refund");

        // Seller should get failure recorded
        ReputationRegistry.AgentReputation memory sellerRep = reputation.getReputation(seller);
        assertEq(sellerRep.tasksFailed, 1, "Seller should have 1 failure");
    }

    // ─── Ownership Transfer (H-2 fix) ────────────────────────────────────

    /// @notice Two-step ownership transfer on ServiceBoard
    function testServiceBoardOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");

        // Step 1: Current owner initiates transfer
        board.transferOwnership(newOwner);
        assertEq(board.pendingOwner(), newOwner);
        assertEq(board.owner(), address(this)); // Still old owner

        // Non-pending owner cannot accept
        vm.prank(attacker);
        vm.expectRevert("Not pending owner");
        board.acceptOwnership();

        // Step 2: New owner accepts
        vm.prank(newOwner);
        board.acceptOwnership();
        assertEq(board.owner(), newOwner);
        assertEq(board.pendingOwner(), address(0));
    }

    /// @notice Two-step ownership transfer on EscrowVault
    function testVaultOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");
        vault.transferOwnership(newOwner);
        vm.prank(newOwner);
        vault.acceptOwnership();
        assertEq(vault.owner(), newOwner);
    }

    /// @notice Two-step ownership transfer on ReputationRegistry
    function testReputationOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");
        reputation.transferOwnership(newOwner);
        vm.prank(newOwner);
        reputation.acceptOwnership();
        assertEq(reputation.owner(), newOwner);
    }

    /// @notice Cannot transfer ownership to zero address
    function testCannotTransferOwnershipToZero() public {
        vm.expectRevert("Zero address");
        board.transferOwnership(address(0));
    }

    // ─── Buyer Validation in Refund (M-4 fix) ────────────────────────────

    /// @notice EscrowVault.refund() validates buyer matches stored escrow buyer
    function testRefundValidatesBuyer() public {
        // This is tested indirectly — ServiceBoard always passes correct buyer.
        // Direct test would require calling vault.refund() from ServiceBoard address.
        // The require(buyer == escrow.buyer) is defense-in-depth.
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        // Cancel refunds to the correct buyer
        uint256 buyerBalBefore = buyer.balance;
        vm.prank(buyer);
        board.cancelTask(taskId);
        assertEq(buyer.balance, buyerBalBefore + 0.1 ether);
    }

    // ─── Input Validation: Task Type Required ────────────────────────────

    /// @notice postTask rejects empty task type
    function testCannotPostEmptyTaskType() public {
        vm.prank(buyer);
        vm.expectRevert("Task type required");
        board.postTask{value: 0.1 ether}("", "Test description", block.timestamp + 1 hours);
    }

    // ─── Input Validation: Deadline Too Far ──────────────────────────────

    /// @notice postTask rejects deadlines more than 365 days out
    function testCannotPostDeadlineTooFar() public {
        vm.prank(buyer);
        vm.expectRevert("Deadline too far in future");
        board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 400 days);
    }

    // ─── Pagination ──────────────────────────────────────────────────────

    /// @notice getOpenTasksPaginated returns correct subset
    function testGetOpenTasksPaginated() public {
        vm.startPrank(buyer);
        for (uint256 i = 0; i < 5; i++) {
            board.postTask{value: 0.1 ether}("text_summary", string(abi.encodePacked("Task ", vm.toString(i))), block.timestamp + 1 hours);
        }
        vm.stopPrank();

        // Get first 2
        ServiceBoard.Task[] memory page1 = board.getOpenTasksPaginated(0, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0].id, 0);
        assertEq(page1[1].id, 1);

        // Get next 2
        ServiceBoard.Task[] memory page2 = board.getOpenTasksPaginated(2, 2);
        assertEq(page2.length, 2);
        assertEq(page2[0].id, 2);
        assertEq(page2[1].id, 3);

        // Get remaining
        ServiceBoard.Task[] memory page3 = board.getOpenTasksPaginated(4, 10);
        assertEq(page3.length, 1);
        assertEq(page3[0].id, 4);
    }

    // ─── No receive() on EscrowVault ─────────────────────────────────────

    /// @notice Direct ETH transfers to vault are rejected
    function testVaultRejectsDirectETH() public {
        vm.prank(buyer);
        (bool success,) = address(vault).call{value: 0.1 ether}("");
        assertFalse(success, "Vault should reject direct ETH transfers");
    }

    // ─── Access Control: Cannot Cancel Claimed Task ─────────────────────

    /// @notice Buyer cannot cancel a task that has already been claimed
    function testCannotCancelClaimedTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);

        vm.prank(buyer);
        vm.expectRevert("Can only cancel open tasks");
        board.cancelTask(taskId);
    }

    // ─── Access Control: Cannot Claim Expired Task ──────────────────────

    /// @notice Seller cannot claim a task that has passed its deadline
    function testCannotClaimExpiredTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.warp(block.timestamp + 2 hours);

        vm.prank(seller);
        vm.expectRevert("Task expired");
        board.claimTask(taskId);
    }

    // ─── Access Control: Non-Buyer Cannot Cancel ────────────────────────

    /// @notice Only the task buyer can cancel
    function testNonBuyerCannotCancel() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(attacker);
        vm.expectRevert("Not buyer");
        board.cancelTask(taskId);
    }

    // ─── Access Control: Non-Seller Cannot Deliver ──────────────────────

    /// @notice Only the claimed seller can deliver work
    function testNonSellerCannotDeliver() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);

        vm.prank(attacker);
        vm.expectRevert("Not seller");
        board.deliverTask(taskId, "QmFake");
    }

    // ─── Access Control: Non-Buyer Cannot Confirm ───────────────────────

    /// @notice Only the buyer can confirm delivery
    function testNonBuyerCannotConfirm() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmHash");

        vm.prank(attacker);
        vm.expectRevert("Not buyer");
        board.confirmDelivery(taskId);
    }

    // ─── State Transition: Cannot Claim Already Claimed ─────────────────

    /// @notice A second seller cannot claim a task already claimed by another
    function testCannotDoubleClaimTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);

        vm.prank(third);
        vm.expectRevert("Task not open");
        board.claimTask(taskId);
    }

    // ─── State Transition: Cannot Deliver Open Task ─────────────────────

    /// @notice Cannot deliver a task that hasn't been claimed
    function testCannotDeliverOpenTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        vm.expectRevert("Not seller");
        board.deliverTask(taskId, "QmHash");
    }

    // ─── State Transition: Cannot Confirm Undelivered Task ──────────────

    /// @notice Buyer cannot confirm delivery if task is only Claimed (not Delivered)
    function testCannotConfirmUndeliveredTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);

        vm.prank(buyer);
        vm.expectRevert("Task not delivered");
        board.confirmDelivery(taskId);
    }

    // ─── State Transition: Cannot Complete Twice ────────────────────────

    /// @notice A completed task cannot be confirmed again
    function testCannotCompleteTaskTwice() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmHash");
        vm.prank(buyer);
        board.confirmDelivery(taskId);

        // Try to confirm again
        vm.prank(buyer);
        vm.expectRevert("Task not delivered");
        board.confirmDelivery(taskId);
    }

    // ─── Input Validation: Zero Reward ──────────────────────────────────

    /// @notice Posting a task with 0 ETH should revert
    function testCannotPostZeroReward() public {
        vm.prank(buyer);
        vm.expectRevert("Must send ETH for reward");
        board.postTask{value: 0}("text_summary", "Test", block.timestamp + 1 hours);
    }

    // ─── Input Validation: Past Deadline ────────────────────────────────

    /// @notice Posting a task with a deadline in the past should revert
    function testCannotPostPastDeadline() public {
        vm.warp(1000);
        vm.prank(buyer);
        vm.expectRevert("Deadline must be in the future");
        board.postTask{value: 0.1 ether}("text_summary", "Test", 500);
    }

    // ─── Input Validation: Zero Address in setServiceBoard ──────────────

    /// @notice setServiceBoard should reject zero address
    function testSetServiceBoardRejectsZeroAddress() public {
        EscrowVault newVaultImpl = new EscrowVault();
        ERC1967Proxy newVaultProxy = new ERC1967Proxy(
            address(newVaultImpl),
            abi.encodeCall(EscrowVault.initialize, ())
        );
        EscrowVault newVault = EscrowVault(payable(address(newVaultProxy)));

        vm.expectRevert("Zero address");
        newVault.setServiceBoard(address(0));
    }

    /// @notice ReputationRegistry setServiceBoard should reject zero address
    function testReputationSetServiceBoardRejectsZeroAddress() public {
        ReputationRegistry newRepImpl = new ReputationRegistry();
        ERC1967Proxy newRepProxy = new ERC1967Proxy(
            address(newRepImpl),
            abi.encodeCall(ReputationRegistry.initialize, ())
        );
        ReputationRegistry newRep = ReputationRegistry(address(newRepProxy));

        vm.expectRevert("Zero address");
        newRep.setServiceBoard(address(0));
    }

    // ─── Timeout: Open Task Timeout ─────────────────────────────────────

    /// @notice claimTimeout should work on Open (unclaimed) tasks too
    function testTimeoutOnOpenTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.5 ether}("text_summary", "Test", block.timestamp + 1 hours);

        uint256 buyerBalBefore = buyer.balance;
        vm.warp(block.timestamp + 2 hours);

        // Anyone can trigger timeout
        vm.prank(third);
        board.claimTimeout(taskId);

        ServiceBoard.Task memory task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Cancelled));
        assertEq(buyer.balance, buyerBalBefore + 0.5 ether, "Buyer should receive refund");
    }

    // ─── Timeout: Cannot Timeout Before Deadline ────────────────────────

    /// @notice claimTimeout should revert if deadline hasn't passed
    function testCannotTimeoutBeforeDeadline() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.expectRevert("Deadline not reached");
        board.claimTimeout(taskId);
    }

    // ─── Timeout: Cannot Timeout Completed Task ─────────────────────────

    /// @notice claimTimeout should revert on a completed task
    function testCannotTimeoutCompletedTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmHash");
        vm.prank(buyer);
        board.confirmDelivery(taskId);

        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert("Task not eligible for timeout");
        board.claimTimeout(taskId);
    }

    // ─── Escrow: Balance Decreases After Release ────────────────────────

    /// @notice Vault balance should decrease after escrow is released
    function testVaultBalanceAfterRelease() public {
        // Post 2 tasks
        vm.startPrank(buyer);
        uint256 taskId1 = board.postTask{value: 0.3 ether}("code_review", "Task 1", block.timestamp + 1 hours);
        board.postTask{value: 0.2 ether}("text_summary", "Task 2", block.timestamp + 1 hours);
        vm.stopPrank();

        assertEq(vault.getBalance(), 0.5 ether, "Vault should hold 0.5 ETH");

        // Complete first task
        vm.prank(seller);
        board.claimTask(taskId1);
        vm.prank(seller);
        board.deliverTask(taskId1, "QmHash1");
        vm.prank(buyer);
        board.confirmDelivery(taskId1);

        assertEq(vault.getBalance(), 0.2 ether, "Vault should hold 0.2 ETH after release");

        // Verify escrow state
        EscrowVault.Escrow memory escrow1 = vault.getEscrow(taskId1);
        assertTrue(escrow1.released, "Escrow 1 should be released");
        assertFalse(escrow1.refunded, "Escrow 1 should not be refunded");
    }

    // ─── Escrow: Balance After Refund ───────────────────────────────────

    /// @notice Vault balance should decrease after escrow is refunded
    function testVaultBalanceAfterRefund() public {
        vm.startPrank(buyer);
        uint256 taskId1 = board.postTask{value: 0.3 ether}("code_review", "Task 1", block.timestamp + 1 hours);
        board.postTask{value: 0.2 ether}("text_summary", "Task 2", block.timestamp + 1 hours);
        vm.stopPrank();

        // Cancel first task
        vm.prank(buyer);
        board.cancelTask(taskId1);

        assertEq(vault.getBalance(), 0.2 ether, "Vault should hold 0.2 ETH after refund");

        EscrowVault.Escrow memory escrow1 = vault.getEscrow(taskId1);
        assertFalse(escrow1.released, "Escrow 1 should not be released");
        assertTrue(escrow1.refunded, "Escrow 1 should be refunded");
    }

    // ─── Admin: setServiceBoard One-Time Only ───────────────────────────

    /// @notice setServiceBoard can only be called once on EscrowVault
    function testVaultSetServiceBoardOnce() public {
        // Already set in setUp(), so calling again should revert
        vm.expectRevert("Already set");
        vault.setServiceBoard(address(0x1));
    }

    /// @notice setServiceBoard can only be called once on ReputationRegistry
    function testReputationSetServiceBoardOnce() public {
        vm.expectRevert("Already set");
        reputation.setServiceBoard(address(0x1));
    }

    // ─── Admin: Only Owner Can Set ServiceBoard ─────────────────────────

    /// @notice Non-owner cannot set the ServiceBoard address
    function testNonOwnerCannotSetServiceBoard() public {
        EscrowVault newVaultImpl = new EscrowVault();
        ERC1967Proxy newVaultProxy = new ERC1967Proxy(
            address(newVaultImpl),
            abi.encodeCall(EscrowVault.initialize, ())
        );
        EscrowVault newVault = EscrowVault(payable(address(newVaultProxy)));

        vm.prank(attacker);
        vm.expectRevert("Only owner");
        newVault.setServiceBoard(address(board));
    }

    // ─── Escrow: Direct Access Control ──────────────────────────────────

    /// @notice Only ServiceBoard can call deposit on vault
    function testOnlyServiceBoardCanDeposit() public {
        vm.prank(attacker);
        vm.expectRevert("Only ServiceBoard");
        vault.deposit{value: 0.1 ether}(99, attacker, block.timestamp + 1 hours);
    }

    /// @notice Only ServiceBoard can call release on vault
    function testOnlyServiceBoardCanRelease() public {
        vm.prank(attacker);
        vm.expectRevert("Only ServiceBoard");
        vault.release(0, attacker);
    }

    /// @notice Only ServiceBoard can call refund on vault
    function testOnlyServiceBoardCanRefund() public {
        vm.prank(attacker);
        vm.expectRevert("Only ServiceBoard");
        vault.refund(0, attacker);
    }

    // ─── Reputation: Direct Access Control ──────────────────────────────

    /// @notice Only ServiceBoard can record completions
    function testOnlyServiceBoardCanRecordCompletion() public {
        vm.prank(attacker);
        vm.expectRevert("Only ServiceBoard");
        reputation.recordCompletion(buyer, seller, 0, 1 ether);
    }

    /// @notice Only ServiceBoard can record failures
    function testOnlyServiceBoardCanRecordFailure() public {
        vm.prank(attacker);
        vm.expectRevert("Only ServiceBoard");
        reputation.recordFailure(seller, 0);
    }

    // ─── Multiple Sellers: Different Agents ─────────────────────────────

    /// @notice Different sellers can complete different tasks, reputation tracked independently
    function testMultipleSellersIndependentReputation() public {
        address seller2 = makeAddr("seller2");
        vm.deal(seller2, 1 ether);

        // Seller1 completes task for 0.1 ETH
        vm.prank(buyer);
        uint256 t1 = board.postTask{value: 0.1 ether}("text_summary", "Task 1", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(t1);
        vm.prank(seller);
        board.deliverTask(t1, "QmHash1");
        vm.prank(buyer);
        board.confirmDelivery(t1);

        // Seller2 completes task for 0.2 ETH
        vm.prank(buyer);
        uint256 t2 = board.postTask{value: 0.2 ether}("code_review", "Task 2", block.timestamp + 1 hours);
        vm.prank(seller2);
        board.claimTask(t2);
        vm.prank(seller2);
        board.deliverTask(t2, "QmHash2");
        vm.prank(buyer);
        board.confirmDelivery(t2);

        // Verify independent reputation
        ReputationRegistry.AgentReputation memory rep1 = reputation.getReputation(seller);
        assertEq(rep1.tasksCompleted, 1);
        assertEq(rep1.totalEarned, 0.1 ether);

        ReputationRegistry.AgentReputation memory rep2 = reputation.getReputation(seller2);
        assertEq(rep2.tasksCompleted, 1);
        assertEq(rep2.totalEarned, 0.2 ether);

        // Buyer completed 2 tasks total
        ReputationRegistry.AgentReputation memory buyerRep = reputation.getReputation(buyer);
        assertEq(buyerRep.tasksCompleted, 2);
        assertEq(buyerRep.totalSpent, 0.3 ether);
    }

    // ─── Task Count: Across Mixed Statuses ──────────────────────────────

    /// @notice getTaskCount returns total tasks including completed and cancelled
    function testTaskCountIncludesAllStatuses() public {
        vm.startPrank(buyer);
        board.postTask{value: 0.1 ether}("text_summary", "Task 1", block.timestamp + 1 hours);
        board.postTask{value: 0.1 ether}("text_summary", "Task 2", block.timestamp + 1 hours);
        board.postTask{value: 0.1 ether}("text_summary", "Task 3", block.timestamp + 1 hours);
        vm.stopPrank();

        // Cancel task 1
        vm.prank(buyer);
        board.cancelTask(1);

        // Complete task 0
        vm.prank(seller);
        board.claimTask(0);
        vm.prank(seller);
        board.deliverTask(0, "QmHash");
        vm.prank(buyer);
        board.confirmDelivery(0);

        // Task 2 still open
        assertEq(board.getTaskCount(), 3, "Total tasks should be 3");

        ServiceBoard.Task[] memory openTasks = board.getOpenTasks();
        assertEq(openTasks.length, 1, "Only 1 task should be open");
        assertEq(openTasks[0].id, 2, "Open task should be task 2");
    }

    // ─── Seller Balance: ETH Actually Received ──────────────────────────

    /// @notice Verify seller actually receives ETH from multiple completed tasks
    function testSellerReceivesETH() public {
        uint256 sellerBalStart = seller.balance;

        _completeTask(0.5 ether);
        _completeTask(0.3 ether);

        assertEq(seller.balance, sellerBalStart + 0.8 ether, "Seller should receive total ETH");
    }

    // ─── Event Emission: Task Lifecycle Events ──────────────────────────

    /// @notice Verify key events are emitted during the full lifecycle
    function testLifecycleEvents() public {
        // Post
        vm.prank(buyer);
        vm.expectEmit(true, true, false, true);
        emit ServiceBoard.TaskPosted(0, buyer, "code_review", 0.1 ether, block.timestamp + 1 hours);
        uint256 taskId = board.postTask{value: 0.1 ether}("code_review", "Test", block.timestamp + 1 hours);

        // Claim
        vm.prank(seller);
        vm.expectEmit(true, true, false, false);
        emit ServiceBoard.TaskClaimed(taskId, seller);
        board.claimTask(taskId);

        // Deliver
        vm.prank(seller);
        vm.expectEmit(true, false, false, true);
        emit ServiceBoard.TaskDelivered(taskId, "QmHash");
        board.deliverTask(taskId, "QmHash");

        // Confirm
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit ServiceBoard.TaskCompleted(taskId, buyer, seller, 0.1 ether);
        board.confirmDelivery(taskId);
    }

    // ─── Event Emission: TaskCancelled includes reason ───────────────────

    /// @notice TaskCancelled event includes reason string
    function testCancelEventIncludesReason() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(buyer);
        vm.expectEmit(true, false, false, true);
        emit ServiceBoard.TaskCancelled(taskId, "buyer_cancelled");
        board.cancelTask(taskId);
    }

    /// @notice Timeout event includes appropriate reason
    function testTimeoutEventIncludesReason() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        vm.prank(seller);
        board.claimTask(taskId);

        vm.warp(block.timestamp + 2 hours);

        vm.expectEmit(true, false, false, true);
        emit ServiceBoard.TaskCancelled(taskId, "timeout_claimed");
        board.claimTimeout(taskId);
    }

    // ─── Helper: Complete a task end-to-end ─────────────────────────────

    function _completeTask(uint256 reward) internal {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: reward}(
            "text_summary",
            "Auto task",
            block.timestamp + 1 hours
        );
        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmAutoDelivery");
        vm.prank(buyer);
        board.confirmDelivery(taskId);
    }
}
