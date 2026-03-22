// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

/// @title Deploy Script (UUPS Proxy Pattern)
/// @notice Deploys all 3 AgentEscrow contracts behind ERC1967 proxies
/// @dev Usage: forge script script/Deploy.s.sol --rpc-url $RPC --broadcast
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy EscrowVault implementation + proxy
        EscrowVault vaultImpl = new EscrowVault();
        ERC1967Proxy vaultProxy = new ERC1967Proxy(
            address(vaultImpl),
            abi.encodeCall(EscrowVault.initialize, ())
        );
        EscrowVault vault = EscrowVault(payable(address(vaultProxy)));
        console.log("EscrowVault impl:", address(vaultImpl));
        console.log("EscrowVault proxy:", address(vault));

        // 2. Deploy ReputationRegistry implementation + proxy
        ReputationRegistry repImpl = new ReputationRegistry();
        ERC1967Proxy repProxy = new ERC1967Proxy(
            address(repImpl),
            abi.encodeCall(ReputationRegistry.initialize, ())
        );
        ReputationRegistry reputation = ReputationRegistry(address(repProxy));
        console.log("ReputationRegistry impl:", address(repImpl));
        console.log("ReputationRegistry proxy:", address(reputation));

        // 3. Deploy ServiceBoard implementation + proxy
        ServiceBoard boardImpl = new ServiceBoard();
        ERC1967Proxy boardProxy = new ERC1967Proxy(
            address(boardImpl),
            abi.encodeCall(ServiceBoard.initialize, (address(vault), address(reputation)))
        );
        ServiceBoard board = ServiceBoard(address(boardProxy));
        console.log("ServiceBoard impl:", address(boardImpl));
        console.log("ServiceBoard proxy:", address(board));

        // 4. Wire up permissions
        vault.setServiceBoard(address(board));
        reputation.setServiceBoard(address(board));

        console.log("All contracts deployed and wired up!");
        console.log("--- PROXY ADDRESSES (use these) ---");
        console.log("EscrowVault:", address(vault));
        console.log("ReputationRegistry:", address(reputation));
        console.log("ServiceBoard:", address(board));

        vm.stopBroadcast();
    }
}
