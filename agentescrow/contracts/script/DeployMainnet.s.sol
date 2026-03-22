// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

/**
 * @title DeployMainnet
 * @notice Mainnet deployment script with chain-ID safety checks.
 *
 * Usage (Base mainnet):
 *   export PRIVATE_KEY=0x...
 *   forge script script/DeployMainnet.s.sol:DeployMainnet \
 *     --rpc-url https://mainnet.base.org \
 *     --broadcast -vvv
 *
 * Usage (Celo mainnet):
 *   export PRIVATE_KEY=0x...
 *   forge script script/DeployMainnet.s.sol:DeployMainnet \
 *     --rpc-url https://forno.celo.org \
 *     --broadcast -vvv
 */
contract DeployMainnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== AgentEscrow MAINNET Deployment ===");
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", msg.sender);

        // Safety: confirm this is a mainnet chain
        require(
            block.chainid == 8453 ||   // Base mainnet
            block.chainid == 42220,     // Celo mainnet
            "NOT a mainnet chain! Aborting."
        );

        // 1. Deploy contracts
        EscrowVault vault = new EscrowVault();
        console.log("EscrowVault:", address(vault));

        ReputationRegistry reputation = new ReputationRegistry();
        console.log("ReputationRegistry:", address(reputation));

        ServiceBoard board = new ServiceBoard(address(vault), address(reputation));
        console.log("ServiceBoard:", address(board));

        // 2. Wire permissions (one-time-only calls)
        vault.setServiceBoard(address(board));
        console.log("  -> vault.setServiceBoard() done");

        reputation.setServiceBoard(address(board));
        console.log("  -> reputation.setServiceBoard() done");

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        if (block.chainid == 8453) {
            console.log("Chain: Base Mainnet");
        } else {
            console.log("Chain: Celo Mainnet");
        }
        console.log("");
        console.log("--- Copy these into your .env ---");
        console.log(string.concat("SERVICE_BOARD_ADDRESS=", vm.toString(address(board))));
        console.log(string.concat("ESCROW_VAULT_ADDRESS=", vm.toString(address(vault))));
        console.log(string.concat("REPUTATION_REGISTRY_ADDRESS=", vm.toString(address(reputation))));

        vm.stopBroadcast();
    }
}
