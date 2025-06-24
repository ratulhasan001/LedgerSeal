// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract FileStorage is AccessControl {
    bytes32 public constant UPLOADER_ROLE = keccak256("UPLOADER_ROLE");
    mapping(string => bool) public isHashStored;
    event HashStored(string fileHash, address indexed uploader);
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPLOADER_ROLE, msg.sender);
    }
    function storeHash(string memory _fileHash) public onlyRole(UPLOADER_ROLE) {
        require(!isHashStored[_fileHash], "FileStorage: Hash already exists");
        isHashStored[_fileHash] = true;
        emit HashStored(_fileHash, msg.sender);
    }
    function grantUploaderRole(address _account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_account != address(0), "AccessControl: grant to the zero address");
        grantRole(UPLOADER_ROLE, _account);
    }
    function revokeUploaderRole(address _account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_account != address(0), "AccessControl: revoke from the zero address");
        revokeRole(UPLOADER_ROLE, _account);
    }
}