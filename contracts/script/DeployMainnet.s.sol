// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

/**
 * @title DeployMainnet
 * @notice Mainnet deployment script with safety checks.
 *         Deploy via UUPS proxy pattern for upgradeability.
 *
 * Usage (Base mainnet):
 *   PRIVATE_KEY=0x... forge script script/DeployMainnet.s.sol:DeployMainnet \
 *     --rpc-url https://mainnet.base.org \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $BASESCAN_API_KEY
 *
 * Usage (Celo mainnet):
 *   PRIVATE_KEY=0x... forge script script/DeployMainnet.s.sol:DeployMainnet \
 *     --rpc-url https://forno.celo.org \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $CELOSCAN_API_KEY
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
            block.chainid == 8453 ||    // Base mainnet
            block.chainid == 42220,      // Celo mainnet
            "NOT a mainnet chain! Aborting."
        );

        // 1. Deploy implementation contracts
        EscrowVault vaultImpl = new EscrowVault();
        console.log("EscrowVault impl:", address(vaultImpl));

        ReputationRegistry reputationImpl = new ReputationRegistry();
        console.log("ReputationRegistry impl:", address(reputationImpl));

        ServiceBoard boardImpl = new ServiceBoard();
        console.log("ServiceBoard impl:", address(boardImpl));

        // 2. Deploy UUPS proxies with initializers
        ERC1967Proxy vaultProxy = new ERC1967Proxy(
            address(vaultImpl),
            abi.encodeCall(EscrowVault.initialize, ())
        );
        console.log("EscrowVault proxy:", address(vaultProxy));

        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationImpl),
            abi.encodeCall(ReputationRegistry.initialize, ())
        );
        console.log("ReputationRegistry proxy:", address(reputationProxy));

        ERC1967Proxy boardProxy = new ERC1967Proxy(
            address(boardImpl),
            abi.encodeCall(ServiceBoard.initialize, (address(vaultProxy), address(reputationProxy)))
        );
        console.log("ServiceBoard proxy:", address(boardProxy));

        // 3. Wire up permissions
        EscrowVault(payable(address(vaultProxy))).setServiceBoard(address(boardProxy));
        ReputationRegistry(address(reputationProxy)).setServiceBoard(address(boardProxy));

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log(block.chainid == 8453 ? "Chain: Base Mainnet" : "Chain: Celo Mainnet");
        console.log("");
        console.log("Add to .env:");
        console.log(string.concat("SERVICE_BOARD_ADDRESS=", vm.toString(address(boardProxy))));
        console.log(string.concat("ESCROW_VAULT_ADDRESS=", vm.toString(address(vaultProxy))));
        console.log(string.concat("REPUTATION_REGISTRY_ADDRESS=", vm.toString(address(reputationProxy))));

        vm.stopBroadcast();
    }
}
