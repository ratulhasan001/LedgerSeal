import { BrowserProvider, Contract, JsonRpcProvider, ZeroHash, id } from "ethers";
import { CONTRACT_ADDRESS, RPC_URL } from "../config";

export const ADMIN_ROLE = ZeroHash;
export const UPLOADER_ROLE = id("UPLOADER_ROLE");

export const FILE_STORAGE_ABI = [
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isHashStored(bytes32 fileHash) view returns (bool)",
  "function getRecord(bytes32 fileHash) view returns (tuple(address uploader, uint64 timestamp, string cid))",
  "function storeHash(bytes32 fileHash, string cid)",
  "function grantUploaderRole(address account)",
  "function revokeUploaderRole(address account)",
  "event HashStored(bytes32 indexed fileHash, address indexed uploader, string cid)",
  "error EmptyHash()",
  "error HashAlreadyStored(bytes32 fileHash)",
  "error ZeroAddress()",
  "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
];

export function getReadProvider() {
  return window.ethereum ? new BrowserProvider(window.ethereum) : new JsonRpcProvider(RPC_URL);
}

export function getFileStorage(runner) {
  return CONTRACT_ADDRESS ? new Contract(CONTRACT_ADDRESS, FILE_STORAGE_ABI, runner) : null;
}
