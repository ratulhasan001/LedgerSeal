import { isAddress } from "ethers";

const env = import.meta.env;

export const CONTRACT_ADDRESS = isAddress(env.VITE_CONTRACT_ADDRESS) ? env.VITE_CONTRACT_ADDRESS : null;
export const RPC_URL = env.VITE_RPC_URL || "http://127.0.0.1:8545";
export const IPFS_GATEWAY = (env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");

export const PINATA = {
  jwt: env.VITE_PINATA_JWT,
  apiKey: env.VITE_PINATA_API_KEY,
  secretApiKey: env.VITE_PINATA_SECRET_API_KEY,
};
