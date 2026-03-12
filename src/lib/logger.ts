const LOG_PREFIX = "\u25c6";
const MAX_LOG_ENTRIES = 500;
const logEntries: string[] = [];
const subscribers = new Set<(entry: string) => void>();

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
  const entry = `[${nowIso()}] ${LOG_PREFIX} ${message}`;
  logEntries.push(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }
  for (const notify of subscribers) {
    notify(entry);
  }
  console.info(entry);
}

export function getDiagLogs(): string[] {
  return [...logEntries];
}

export function clearDiagLogs(): void {
  logEntries.length = 0;
}

export function subscribeDiagLogs(handler: (entry: string) => void): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}
