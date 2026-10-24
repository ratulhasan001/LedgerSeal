// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title FileStorage
/// @notice Registry of SHA-256 file fingerprints. Only accounts holding
///         UPLOADER_ROLE can register a fingerprint; anyone can verify one.
contract FileStorage is AccessControl {
    bytes32 public constant UPLOADER_ROLE = keccak256("UPLOADER_ROLE");

    struct Record {
        address uploader;
        uint64 timestamp;
        string cid;
    }

    mapping(bytes32 => Record) private _records;

    event HashStored(bytes32 indexed fileHash, address indexed uploader, string cid);

    error EmptyHash();
    error HashAlreadyStored(bytes32 fileHash);
    error ZeroAddress();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPLOADER_ROLE, msg.sender);
    }

    /// @notice Registers a file fingerprint along with the IPFS CID of the file.
    function storeHash(bytes32 fileHash, string calldata cid) external onlyRole(UPLOADER_ROLE) {
        if (fileHash == bytes32(0)) revert EmptyHash();
        if (_records[fileHash].uploader != address(0)) revert HashAlreadyStored(fileHash);

        _records[fileHash] = Record({uploader: msg.sender, timestamp: uint64(block.timestamp), cid: cid});
        emit HashStored(fileHash, msg.sender, cid);
    }

    function isHashStored(bytes32 fileHash) external view returns (bool) {
        return _records[fileHash].uploader != address(0);
    }

    /// @notice Returns the record for a fingerprint. `uploader` is zero if it was never stored.
    function getRecord(bytes32 fileHash) external view returns (Record memory) {
        return _records[fileHash];
    }

    function grantUploaderRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(UPLOADER_ROLE, account);
    }

    function revokeUploaderRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _revokeRole(UPLOADER_ROLE, account);
    }
}
