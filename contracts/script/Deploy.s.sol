// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FileStorage} from "../src/FileStorage.sol";

contract DeployScript is Script {
    function run() external returns (FileStorage fileStorage) {
        vm.startBroadcast();
        fileStorage = new FileStorage();
        vm.stopBroadcast();

        console.log("FileStorage deployed to:", address(fileStorage));
    }
}
