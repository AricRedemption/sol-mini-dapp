const LOG_PREFIX = "\u25c6";

function nowIso(): string {
  return new Date().toISOString();
}

export function maskAddress(address: string | null | undefined): string {
  if (!address) return "-";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function addressFingerprint(address: string | null | undefined): string {
  if (!address) return "none";
  let hash = 2166136261;
  for (let i = 0; i < address.length; i += 1) {
    hash ^= address.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function logDiag(message: string): void {
  // Keep the same style as Monvio diagnostics for side-by-side comparison.
  console.info(`[${nowIso()}] ${LOG_PREFIX} ${message}`);
}

