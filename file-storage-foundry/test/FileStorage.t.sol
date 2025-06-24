// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/FileStorage.sol";

contract FileStorageTest is Test {
    FileStorage public fileStorage;
    bytes32 public ADMIN_ROLE;
    bytes32 public UPLOADER_ROLE;
    address admin;
    address uploader1;
    address nonUploader;
    string fileHash1 = "QmHash1";
    string fileHash2 = "QmHash2";
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);
    function setUp() public {
        fileStorage = new FileStorage();
        ADMIN_ROLE = fileStorage.DEFAULT_ADMIN_ROLE();
        UPLOADER_ROLE = fileStorage.UPLOADER_ROLE();
        admin = address(this);
        uploader1 = makeAddr("uploader1");
        nonUploader = makeAddr("nonUploader");
        assertTrue(fileStorage.hasRole(ADMIN_ROLE, admin), "Admin should have admin role");
        assertTrue(fileStorage.hasRole(UPLOADER_ROLE, admin), "Admin should have uploader role");
    }
    function test_AdminCanGrantAndRevokeUploaderRole() public {
        fileStorage.grantUploaderRole(uploader1);
        assertTrue(fileStorage.hasRole(UPLOADER_ROLE, uploader1), "Uploader1 should have role after grant");
        fileStorage.revokeUploaderRole(uploader1);
        assertFalse(fileStorage.hasRole(UPLOADER_ROLE, uploader1), "Uploader1 should not have role after revoke");
    }
    function test_Fail_NonAdminCannotGrantRole() public {
        vm.prank(nonUploader);
        vm.expectRevert(abi.encodeWithSelector(
            AccessControlUnauthorizedAccount.selector,
            nonUploader,
            ADMIN_ROLE
        ));
        fileStorage.grantUploaderRole(uploader1);
    }
    function test_AdminCanRevokeOwnUploaderRole() public {
        assertTrue(fileStorage.hasRole(UPLOADER_ROLE, admin));
        fileStorage.revokeUploaderRole(admin);
        assertFalse(fileStorage.hasRole(UPLOADER_ROLE, admin));
        assertTrue(fileStorage.hasRole(ADMIN_ROLE, admin));
    }
    function test_OnlyUploaderCanStoreHash() public {
        fileStorage.grantUploaderRole(uploader1);
        vm.prank(uploader1);
        fileStorage.storeHash(fileHash1);
        assertTrue(fileStorage.isHashStored(fileHash1));
        vm.prank(nonUploader);
        vm.expectRevert(abi.encodeWithSelector(
            AccessControlUnauthorizedAccount.selector,
            nonUploader,
            UPLOADER_ROLE
        ));
        fileStorage.storeHash(fileHash2);
    }
    function test_Fail_CannotStoreDuplicateHash() public {
        fileStorage.storeHash(fileHash1);
        vm.expectRevert("FileStorage: Hash already exists");
        fileStorage.storeHash(fileHash1);
    }
    function testGas_GrantRole() public {
        fileStorage.grantUploaderRole(uploader1);
    }
    function testGas_StoreHash() public {
        vm.prank(admin);
        fileStorage.storeHash(fileHash1);
    }
    function testGas_RevokeRole() public {
        fileStorage.grantUploaderRole(uploader1);
        fileStorage.revokeUploaderRole(uploader1);
    }
}