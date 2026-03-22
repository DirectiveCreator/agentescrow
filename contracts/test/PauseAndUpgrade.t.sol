// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

/// @title Tests for Emergency Pause mechanism and UUPS Upgrade pattern
contract PauseAndUpgradeTest is Test {
    EscrowVault public vault;
    ReputationRegistry public reputation;
    ServiceBoard public board;

    // Keep references to proxies for upgrade tests
    address public vaultProxyAddr;
    address public reputationProxyAddr;
    address public boardProxyAddr;

    address deployer = address(this);
    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");
    address attacker = makeAddr("attacker");

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

        vaultProxyAddr = address(vaultProxy);
        reputationProxyAddr = address(reputationProxy);
        boardProxyAddr = address(boardProxy);

        vault = EscrowVault(payable(vaultProxyAddr));
        reputation = ReputationRegistry(reputationProxyAddr);
        board = ServiceBoard(boardProxyAddr);

        vault.setServiceBoard(address(board));
        reputation.setServiceBoard(address(board));

        vm.deal(buyer, 100 ether);
        vm.deal(seller, 10 ether);
        vm.deal(attacker, 10 ether);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PAUSE TESTS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Owner can pause the contract
    function testOwnerCanPause() public {
        assertFalse(board.paused());
        board.pause();
        assertTrue(board.paused());
    }

    /// @notice Owner can unpause the contract
    function testOwnerCanUnpause() public {
        board.pause();
        assertTrue(board.paused());
        board.unpause();
        assertFalse(board.paused());
    }

    /// @notice Pause emits Paused event
    function testPauseEmitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit ServiceBoard.Paused(deployer);
        board.pause();
    }

    /// @notice Unpause emits Unpaused event
    function testUnpauseEmitsEvent() public {
        board.pause();
        vm.expectEmit(false, false, false, true);
        emit ServiceBoard.Unpaused(deployer);
        board.unpause();
    }

    /// @notice Non-owner cannot pause
    function testNonOwnerCannotPause() public {
        vm.prank(attacker);
        vm.expectRevert("Not owner");
        board.pause();
    }

    /// @notice Non-owner cannot unpause
    function testNonOwnerCannotUnpause() public {
        board.pause();
        vm.prank(attacker);
        vm.expectRevert("Not owner");
        board.unpause();
    }

    /// @notice Cannot pause when already paused
    function testCannotDoublePause() public {
        board.pause();
        vm.expectRevert("Already paused");
        board.pause();
    }

    /// @notice Cannot unpause when not paused
    function testCannotDoubleUnpause() public {
        vm.expectRevert("Not paused");
        board.unpause();
    }

    /// @notice postTask reverts when paused
    function testPostTaskRevertsWhenPaused() public {
        board.pause();
        vm.prank(buyer);
        vm.expectRevert("Contract is paused");
        board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);
    }

    /// @notice claimTask reverts when paused
    function testClaimTaskRevertsWhenPaused() public {
        // Post before pause
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        board.pause();

        vm.prank(seller);
        vm.expectRevert("Contract is paused");
        board.claimTask(taskId);
    }

    /// @notice deliverTask reverts when paused
    function testDeliverTaskRevertsWhenPaused() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(taskId);

        board.pause();

        vm.prank(seller);
        vm.expectRevert("Contract is paused");
        board.deliverTask(taskId, "QmHash");
    }

    /// @notice confirmDelivery reverts when paused
    function testConfirmDeliveryRevertsWhenPaused() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmHash");

        board.pause();

        vm.prank(buyer);
        vm.expectRevert("Contract is paused");
        board.confirmDelivery(taskId);
    }

    /// @notice cancelTask reverts when paused
    function testCancelTaskRevertsWhenPaused() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        board.pause();

        vm.prank(buyer);
        vm.expectRevert("Contract is paused");
        board.cancelTask(taskId);
    }

    /// @notice claimTimeout WORKS when paused (users must recover funds)
    function testClaimTimeoutWorksWhenPaused() public {
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.5 ether}("text_summary", "Test", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(taskId);

        board.pause();
        vm.warp(block.timestamp + 2 hours);

        uint256 buyerBalBefore = buyer.balance;
        board.claimTimeout(taskId);

        assertEq(buyer.balance, buyerBalBefore + 0.5 ether, "Buyer should get refund even when paused");
        ServiceBoard.Task memory task = board.getTask(taskId);
        assertEq(uint(task.status), uint(ServiceBoard.TaskStatus.Cancelled));
    }

    /// @notice View functions work when paused
    function testViewFunctionsWorkWhenPaused() public {
        vm.prank(buyer);
        board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);

        board.pause();

        // All view functions should still work
        ServiceBoard.Task memory task = board.getTask(0);
        assertEq(task.buyer, buyer);

        uint256 count = board.getTaskCount();
        assertEq(count, 1);

        ServiceBoard.Task[] memory openTasks = board.getOpenTasks();
        assertEq(openTasks.length, 1);
    }

    /// @notice Full lifecycle works after unpause
    function testLifecycleWorksAfterUnpause() public {
        board.pause();
        board.unpause();

        // Full lifecycle should work
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.1 ether}("text_summary", "Test", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(taskId);
        vm.prank(seller);
        board.deliverTask(taskId, "QmHash");

        uint256 sellerBal = seller.balance;
        vm.prank(buyer);
        board.confirmDelivery(taskId);
        assertEq(seller.balance, sellerBal + 0.1 ether);
    }

    // ═══════════════════════════════════════════════════════════════════
    // UUPS UPGRADE TESTS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice ServiceBoard state persists after upgrade
    function testServiceBoardUpgradePreservesState() public {
        // Create some state
        vm.prank(buyer);
        uint256 taskId = board.postTask{value: 0.5 ether}("code_review", "Before upgrade", block.timestamp + 1 hours);
        vm.prank(seller);
        board.claimTask(taskId);

        // Verify state before upgrade
        assertEq(board.getTaskCount(), 1);
        ServiceBoard.Task memory taskBefore = board.getTask(taskId);
        assertEq(taskBefore.buyer, buyer);
        assertEq(taskBefore.seller, seller);
        assertEq(taskBefore.reward, 0.5 ether);

        // Deploy new implementation and upgrade
        ServiceBoard newImpl = new ServiceBoard();
        board.upgradeToAndCall(address(newImpl), "");

        // Verify state after upgrade
        assertEq(board.getTaskCount(), 1);
        ServiceBoard.Task memory taskAfter = board.getTask(taskId);
        assertEq(taskAfter.buyer, buyer);
        assertEq(taskAfter.seller, seller);
        assertEq(taskAfter.reward, 0.5 ether);
        assertEq(uint(taskAfter.status), uint(ServiceBoard.TaskStatus.Claimed));

        // Verify can still do operations after upgrade
        vm.prank(seller);
        board.deliverTask(taskId, "QmPostUpgrade");
        vm.prank(buyer);
        board.confirmDelivery(taskId);
        assertEq(uint(board.getTask(taskId).status), uint(ServiceBoard.TaskStatus.Completed));
    }

    /// @notice EscrowVault state persists after upgrade
    function testEscrowVaultUpgradePreservesState() public {
        // Create escrow
        vm.prank(buyer);
        board.postTask{value: 1 ether}("text_summary", "Test", block.timestamp + 1 hours);
        assertEq(vault.getBalance(), 1 ether);

        // Upgrade
        EscrowVault newImpl = new EscrowVault();
        vault.upgradeToAndCall(address(newImpl), "");

        // State preserved
        assertEq(vault.getBalance(), 1 ether);
        EscrowVault.Escrow memory escrow = vault.getEscrow(0);
        assertEq(escrow.amount, 1 ether);
        assertEq(escrow.buyer, buyer);
    }

    /// @notice ReputationRegistry state persists after upgrade
    function testReputationRegistryUpgradePreservesState() public {
        // Build some reputation
        _completeTask(0.1 ether);
        _completeTask(0.2 ether);

        ReputationRegistry.AgentReputation memory repBefore = reputation.getReputation(seller);
        assertEq(repBefore.tasksCompleted, 2);
        assertEq(repBefore.totalEarned, 0.3 ether);

        // Upgrade
        ReputationRegistry newImpl = new ReputationRegistry();
        reputation.upgradeToAndCall(address(newImpl), "");

        // State preserved
        ReputationRegistry.AgentReputation memory repAfter = reputation.getReputation(seller);
        assertEq(repAfter.tasksCompleted, 2);
        assertEq(repAfter.totalEarned, 0.3 ether);
        assertEq(reputation.getScore(seller), 100);
    }

    /// @notice Non-owner cannot upgrade ServiceBoard
    function testNonOwnerCannotUpgradeServiceBoard() public {
        ServiceBoard newImpl = new ServiceBoard();
        vm.prank(attacker);
        vm.expectRevert();
        board.upgradeToAndCall(address(newImpl), "");
    }

    /// @notice Non-owner cannot upgrade EscrowVault
    function testNonOwnerCannotUpgradeVault() public {
        EscrowVault newImpl = new EscrowVault();
        vm.prank(attacker);
        vm.expectRevert();
        vault.upgradeToAndCall(address(newImpl), "");
    }

    /// @notice Non-owner cannot upgrade ReputationRegistry
    function testNonOwnerCannotUpgradeReputation() public {
        ReputationRegistry newImpl = new ReputationRegistry();
        vm.prank(attacker);
        vm.expectRevert();
        reputation.upgradeToAndCall(address(newImpl), "");
    }

    /// @notice Cannot re-initialize after upgrade
    function testCannotReinitializeAfterUpgrade() public {
        ServiceBoard newImpl = new ServiceBoard();
        board.upgradeToAndCall(address(newImpl), "");

        vm.expectRevert();
        board.initialize(address(vault), address(reputation));
    }

    /// @notice Implementation contracts cannot be initialized directly
    function testImplementationCannotBeInitialized() public {
        ServiceBoard impl = new ServiceBoard();
        vm.expectRevert();
        impl.initialize(address(vault), address(reputation));
    }

    // ─── Helper ─────────────────────────────────────────────────────────

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
