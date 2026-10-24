const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}

export function shortHash(hash, size = 10) {
  return hash && hash.length > size * 2 ? `${hash.slice(0, size)}…${hash.slice(-size + 2)}` : hash;
}

export function formatTimestamp(seconds) {
  return new Date(Number(seconds) * 1000).toLocaleString();
}
