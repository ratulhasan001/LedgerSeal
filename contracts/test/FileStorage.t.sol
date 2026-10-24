// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {FileStorage} from "../src/FileStorage.sol";

contract FileStorageTest is Test {
    FileStorage internal fileStorage;

    bytes32 internal adminRole;
    bytes32 internal uploaderRole;

    address internal admin = address(this);
    address internal uploader = makeAddr("uploader");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant HASH_1 = keccak256("file-1");
    bytes32 internal constant HASH_2 = keccak256("file-2");
    string internal constant CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

    event HashStored(bytes32 indexed fileHash, address indexed uploader, string cid);

    function setUp() public {
        fileStorage = new FileStorage();
        adminRole = fileStorage.DEFAULT_ADMIN_ROLE();
        uploaderRole = fileStorage.UPLOADER_ROLE();
    }

    function test_DeployerHasAdminAndUploaderRoles() public view {
        assertTrue(fileStorage.hasRole(adminRole, admin));
        assertTrue(fileStorage.hasRole(uploaderRole, admin));
    }

    function test_AdminCanGrantAndRevokeUploaderRole() public {
        fileStorage.grantUploaderRole(uploader);
        assertTrue(fileStorage.hasRole(uploaderRole, uploader));

        fileStorage.revokeUploaderRole(uploader);
        assertFalse(fileStorage.hasRole(uploaderRole, uploader));
    }

    function test_AdminCanRevokeOwnUploaderRole() public {
        fileStorage.revokeUploaderRole(admin);
        assertFalse(fileStorage.hasRole(uploaderRole, admin));
        assertTrue(fileStorage.hasRole(adminRole, admin));
    }

    function test_RevertWhen_NonAdminGrantsRole() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, adminRole)
        );
        fileStorage.grantUploaderRole(uploader);
    }

    function test_RevertWhen_NonAdminRevokesRole() public {
        fileStorage.grantUploaderRole(uploader);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, adminRole)
        );
        fileStorage.revokeUploaderRole(uploader);
    }

    function test_RevertWhen_GrantingZeroAddress() public {
        vm.expectRevert(FileStorage.ZeroAddress.selector);
        fileStorage.grantUploaderRole(address(0));
    }

    function test_RevertWhen_RevokingZeroAddress() public {
        vm.expectRevert(FileStorage.ZeroAddress.selector);
        fileStorage.revokeUploaderRole(address(0));
    }

    function test_UploaderCanStoreHash() public {
        fileStorage.grantUploaderRole(uploader);
        vm.warp(1_700_000_000);

        vm.expectEmit(true, true, false, true);
        emit HashStored(HASH_1, uploader, CID);

        vm.prank(uploader);
        fileStorage.storeHash(HASH_1, CID);

        assertTrue(fileStorage.isHashStored(HASH_1));

        FileStorage.Record memory record = fileStorage.getRecord(HASH_1);
        assertEq(record.uploader, uploader);
        assertEq(record.timestamp, 1_700_000_000);
        assertEq(record.cid, CID);
    }

    function test_RevertWhen_NonUploaderStoresHash() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, uploaderRole)
        );
        fileStorage.storeHash(HASH_1, CID);
    }

    function test_RevertWhen_UploaderRoleWasRevoked() public {
        fileStorage.grantUploaderRole(uploader);
        fileStorage.revokeUploaderRole(uploader);

        vm.prank(uploader);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, uploader, uploaderRole)
        );
        fileStorage.storeHash(HASH_1, CID);
    }

    function test_RevertWhen_StoringDuplicateHash() public {
        fileStorage.storeHash(HASH_1, CID);

        vm.expectRevert(abi.encodeWithSelector(FileStorage.HashAlreadyStored.selector, HASH_1));
        fileStorage.storeHash(HASH_1, CID);
    }

    function test_RevertWhen_StoringEmptyHash() public {
        vm.expectRevert(FileStorage.EmptyHash.selector);
        fileStorage.storeHash(bytes32(0), CID);
    }

    function test_UnknownHashIsNotStored() public {
        fileStorage.storeHash(HASH_1, CID);

        assertFalse(fileStorage.isHashStored(HASH_2));
        assertEq(fileStorage.getRecord(HASH_2).uploader, address(0));
    }

    function testFuzz_StoreAndVerify(bytes32 fileHash, string calldata cid) public {
        vm.assume(fileHash != bytes32(0));

        fileStorage.storeHash(fileHash, cid);

        assertTrue(fileStorage.isHashStored(fileHash));
        assertEq(fileStorage.getRecord(fileHash).cid, cid);
    }
}
