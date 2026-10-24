import axios from "axios";
import { PINATA } from "../config";

const PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

function authHeaders() {
  if (PINATA.jwt) return { Authorization: `Bearer ${PINATA.jwt}` };
  if (PINATA.apiKey && PINATA.secretApiKey) {
    return { pinata_api_key: PINATA.apiKey, pinata_secret_api_key: PINATA.secretApiKey };
  }
  return null;
}

export const isPinataConfigured = () => authHeaders() !== null;

export async function uploadToPinata(file, onProgress) {
  const headers = authHeaders();
  if (!headers) throw new Error("Pinata credentials are missing. Set VITE_PINATA_JWT in frontend/.env.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: file.name }));

  const { data } = await axios.post(PIN_FILE_URL, formData, {
    headers,
    onUploadProgress: (event) =>
      onProgress?.({
        loaded: event.loaded,
        total: event.total ?? file.size,
        rate: event.rate ?? 0,
        eta: event.estimated,
      }),
  });

  return data.IpfsHash;
}
