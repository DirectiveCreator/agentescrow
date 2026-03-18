// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy EscrowVault
        EscrowVault vault = new EscrowVault();
        console.log("EscrowVault deployed at:", address(vault));

        // 2. Deploy ReputationRegistry
        ReputationRegistry reputation = new ReputationRegistry();
        console.log("ReputationRegistry deployed at:", address(reputation));

        // 3. Deploy ServiceBoard
        ServiceBoard board = new ServiceBoard(address(vault), address(reputation));
        console.log("ServiceBoard deployed at:", address(board));

        // 4. Wire up permissions
        vault.setServiceBoard(address(board));
        reputation.setServiceBoard(address(board));

        console.log("All contracts deployed and wired up!");

        vm.stopBroadcast();
    }
}
