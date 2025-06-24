// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/FileStorage.sol";

contract DeployScript is Script {
    function run() public returns (FileStorage) {
        // Begin broadcasting transactions. All subsequent contract calls will be sent to the network.
        vm.startBroadcast();

        // Deploy the FileStorage contract.
        // The transaction sender (msg.sender) will be the deployer.
        // The constructor of FileStorage automatically grants the deployer both
        // the DEFAULT_ADMIN_ROLE and the UPLOADER_ROLE.
        FileStorage fileStorage = new FileStorage();

        // Stop broadcasting.
        vm.stopBroadcast();

        // Log the deployed contract address for easy access.
        console.log("FileStorage deployed to:", address(fileStorage));

        return fileStorage;
    }
}