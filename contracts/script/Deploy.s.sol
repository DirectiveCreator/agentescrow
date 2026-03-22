// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/EscrowVault.sol";
import "../src/ReputationRegistry.sol";
import "../src/ServiceBoard.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation contracts
        EscrowVault vaultImpl = new EscrowVault();
        console.log("EscrowVault implementation:", address(vaultImpl));

        ReputationRegistry reputationImpl = new ReputationRegistry();
        console.log("ReputationRegistry implementation:", address(reputationImpl));

        ServiceBoard boardImpl = new ServiceBoard();
        console.log("ServiceBoard implementation:", address(boardImpl));

        // 2. Deploy proxies with initializers
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

        // 3. Wire up permissions (via proxy addresses)
        EscrowVault(payable(address(vaultProxy))).setServiceBoard(address(boardProxy));
        ReputationRegistry(address(reputationProxy)).setServiceBoard(address(boardProxy));

        console.log("All contracts deployed via UUPS proxies and wired up!");

        vm.stopBroadcast();
    }
}
