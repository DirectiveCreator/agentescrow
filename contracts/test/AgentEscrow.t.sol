// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

contract AgentEscrowTest is Test {
    EscrowVault public vault;
    ReputationRegistry public reputation;
    ServiceBoard public board;

    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");

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

        vm.deal(buyer, 10 ether);
        vm.deal(seller, 1 ether);
    }

    function testPostTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}(
            "text_summary",
            "Summarize this article about AI",
            block.timestamp + 1 hours
        );
        assertEq(taskId, 0);
        assertEq(board.getTaskCount(), 1);

        ServiceBoard.Task memory task = board.getTask(0);
        assertEq(task.buyer, buyer);
        assertEq(task.reward, 0.1 ether);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Open));
    }

    function testFullLifecycle() public {
        // Buyer posts task
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}(
            "code_review",
            "Review this Solidity contract",
            block.timestamp + 1 hours
        );

        // Seller claims
        vm.prank(seller);
        board.claimTask(taskId);
        ServiceBoard.Task memory task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Claimed));
        assertEq(task.seller, seller);

        // Seller delivers
        vm.prank(seller);
        board.deliverTask(taskId, "QmDeliveryHash123");
        task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Delivered));

        // Buyer confirms
        uint256 sellerBalBefore = seller.balance;
        vm.prank(buyer);
        board.confirmDelivery(taskId);
        task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Completed));
        assertEq(seller.balance, sellerBalBefore + 0.1 ether);

        // Check reputation
        ReputationRegistry.AgentReputation memory sellerRep = reputation.getReputation(seller);
        assertEq(sellerRep.tasksCompleted, 1);
        assertEq(sellerRep.totalEarned, 0.1 ether);

        ReputationRegistry.AgentReputation memory buyerRep = reputation.getReputation(buyer);
        assertEq(buyerRep.tasksCompleted, 1);
        assertEq(buyerRep.totalSpent, 0.1 ether);
    }

    function testCancelOpenTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}(
            "translation",
            "Translate this text",
            block.timestamp + 1 hours
        );

        uint256 buyerBalBefore = buyer.balance;
        vm.prank(buyer);
        board.cancelTask(taskId);

        ServiceBoard.Task memory task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Cancelled));
        assertEq(buyer.balance, buyerBalBefore + 0.1 ether);
    }

    function testTimeoutRefund() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}(
            "name_generation",
            "Generate names for a startup",
            block.timestamp + 1 hours
        );

        vm.prank(seller);
        board.claimTask(taskId);

        // Fast forward past deadline
        vm.warp(block.timestamp + 2 hours);

        uint256 buyerBalBefore = buyer.balance;
        board.claimTimeout(taskId);

        ServiceBoard.Task memory task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Cancelled));
        assertEq(buyer.balance, buyerBalBefore + 0.1 ether);
    }

    function testCannotClaimOwnTask() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}(
            "text_summary",
            "Test",
            block.timestamp + 1 hours
        );

        vm.prank(buyer);
        vm.expectRevert("Buyer cannot claim own task");
        board.claimTask(taskId);
    }

    function testGetOpenTasks() public {
        vm.startPrank(buyer);
        board.postTask{value: 0.1 ether}("text_summary", "Task 1", block.timestamp + 1 hours);
        board.postTask{value: 0.2 ether}("code_review", "Task 2", block.timestamp + 1 hours);
        board.postTask{value: 0.3 ether}("translation", "Task 3", block.timestamp + 1 hours);
        vm.stopPrank();

        ServiceBoard.Task[] memory openTasks = board.getOpenTasks();
        assertEq(openTasks.length, 3);

        // Claim one
        vm.prank(seller);
        board.claimTask(1);

        openTasks = board.getOpenTasks();
        assertEq(openTasks.length, 2);
    }

    function testMultipleCompletions() public {
        // Complete 3 tasks to meet success criteria
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(buyer);
            uint256 taskId = board.postTask{value: 0.05 ether}(
                "text_summary",
                string(abi.encodePacked("Task ", vm.toString(i))),
                block.timestamp + 1 hours
            );

            vm.prank(seller);
            board.claimTask(taskId);

            vm.prank(seller);
            board.deliverTask(taskId, string(abi.encodePacked("delivery_", vm.toString(i))));

            vm.prank(buyer);
            board.confirmDelivery(taskId);
        }

        ReputationRegistry.AgentReputation memory sellerRep = reputation.getReputation(seller);
        assertEq(sellerRep.tasksCompleted, 3);
        assertEq(reputation.getScore(seller), 100);
    }

    function testEscrowBalanceTracking() public {
        vm.prank(buyer);
        board.postTask{value: 0.5 ether}("code_review", "Review", block.timestamp + 1 hours);

        assertEq(vault.getBalance(), 0.5 ether);

        EscrowVault.Escrow memory escrow = vault.getEscrow(0);
        assertEq(escrow.amount, 0.5 ether);
        assertEq(escrow.buyer, buyer);
        assertFalse(escrow.released);
        assertFalse(escrow.refunded);
    }
}
