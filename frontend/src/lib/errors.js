import axios from "axios";

const CONTRACT_ERRORS = {
  HashAlreadyStored: "This file is already registered on-chain.",
  EmptyHash: "The file hash is empty.",
  ZeroAddress: "The zero address cannot be given a role.",
  AccessControlUnauthorizedAccount: "Your account is not allowed to perform this action.",
};

export function describeError(error) {
  if (error?.code === "ACTION_REJECTED") return "The request was rejected in your wallet.";

  const revertName = error?.revert?.name;
  if (revertName && CONTRACT_ERRORS[revertName]) return CONTRACT_ERRORS[revertName];

  if (error?.code === "CALL_EXCEPTION" && error.reason) return error.reason;
  if (error?.code === "BAD_DATA" || error?.code === "CALL_EXCEPTION") {
    return "The contract did not respond. Check that your wallet is on the right network and VITE_CONTRACT_ADDRESS is correct.";
  }

  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.error;
    const message = typeof detail === "string" ? detail : detail?.details || detail?.reason || error.message;
    return `IPFS upload failed: ${message}`;
  }

  return error?.shortMessage || error?.reason || error?.message || "Something went wrong.";
}
