import { PublicKey } from "@solana/web3.js";
import { addressFingerprint, logDiag, maskAddress } from "./logger";

type WalletStandardAccount = {
  address?: string;
  publicKey?: unknown;
  chains?: string[];
};

type WalletStandardWallet = {
  name?: string;
  features?: Record<string, unknown>;
  accounts?: unknown;
};

type WalletsApi = {
  get?: () => unknown;
};

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const iterable = value as { [Symbol.iterator]?: () => Iterator<unknown> };
    if (typeof iterable[Symbol.iterator] === "function") return Array.from(value as Iterable<unknown>);
    const values = (value as { values?: () => IterableIterator<unknown> }).values;
    if (typeof values === "function") return Array.from(values.call(value));
  }
  return [];
}

function toByteArray(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (!Array.isArray(value) || value.length === 0) return null;
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const byteValue = value[index];
    if (!Number.isInteger(byteValue) || byteValue < 0 || byteValue > 255) return null;
    bytes[index] = byteValue;
  }
  return bytes;
}

function toBase58FromPublicKey(value: unknown): { address: string; length: number } {
  const bytes = toByteArray(value);
  if (!bytes) return { address: "", length: 0 };
  if (bytes.length !== 32) return { address: "", length: bytes.length };
  try {
    return { address: new PublicKey(bytes).toBase58(), length: bytes.length };
  } catch {
    return { address: "", length: bytes.length };
  }
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function asWalletAccounts(accountsValue: unknown): WalletStandardAccount[] {
  return toArray(accountsValue).filter(
    (item): item is WalletStandardAccount => Boolean(item) && typeof item === "object",
  );
}

function readWallets(): WalletStandardWallet[] {
  const navigatorScope = globalThis as { navigator?: { wallets?: WalletsApi } };
  const walletsApi = navigatorScope.navigator?.wallets;
  if (!walletsApi?.get) return [];
  try {
    return toArray(walletsApi.get()).filter(
      (item): item is WalletStandardWallet => Boolean(item) && typeof item === "object",
    );
  } catch (error) {
    logDiag(`SOL: wallet-standard probe failed message="${error instanceof Error ? error.message : String(error)}"`);
    return [];
  }
}

export function logWalletStandardSnapshot(reason: string, selectedWalletName: string | null): void {
  const windowScope = globalThis as { solana?: unknown };
  const wallets = readWallets();
  logDiag(
    `SOL: wallet-standard snapshot reason=${reason} wallets=${wallets.length} hasWindowSolana=${Boolean(windowScope.solana)}`,
  );

  wallets.forEach((wallet, walletIndex) => {
    const name = typeof wallet.name === "string" ? wallet.name : "unknown";
    const features = Object.keys(wallet.features || {}).join("|") || "none";
    const accounts = asWalletAccounts(wallet.accounts);
    const selected = selectedWalletName ? name === selectedWalletName : false;
    logDiag(
      `SOL: wallet-standard wallet idx=${walletIndex} name=${name} selected=${selected} features=${features} accounts=${accounts.length}`,
    );
    accounts.forEach((account, accountIndex) => {
      const addressText = normalizeAddress(account.address);
      const publicKeyParsed = toBase58FromPublicKey(account.publicKey);
      const chains = Array.isArray(account.chains) ? account.chains.join("|") : "none";
      logDiag(
        `SOL: wallet-standard account wallet=${name} idx=${accountIndex} chains=${chains} address=${maskAddress(addressText)} fp=${addressFingerprint(addressText)} pkAddr=${maskAddress(publicKeyParsed.address)} pkFp=${addressFingerprint(publicKeyParsed.address)} pkLen=${publicKeyParsed.length}`,
      );
    });
  });
}

