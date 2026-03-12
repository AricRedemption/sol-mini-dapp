import { useMemo, useCallback, useEffect, useRef } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import type { WalletError } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

// Components
import { Header } from "./components/Header";
import { ConnectPrompt } from "./components/ConnectPrompt";
import { BalanceCard } from "./components/BalanceCard";
import { AssetList } from "./components/AssetList";
import { LogPanel } from "./components/LogPanel";

// Hooks & Services
import { usePortfolio } from "./hooks/usePortfolio";
import { getRpcEndpoint } from "./services/helius";
import { logDiag, addressFingerprint, maskAddress } from "./lib/logger";
import { logWalletStandardSnapshot } from "./lib/solanaWalletStandardProbe";

// Styles
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";

function WalletDashboard() {
  const { connected, connecting, disconnecting, wallet, publicKey } = useWallet();
  const { assets, totalBalance, loading, error } = usePortfolio();
  const previousStateRef = useRef<string>("");
  const previousConnectedRef = useRef<boolean>(false);
  const previousConnectingRef = useRef<boolean>(false);
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const address = publicKey?.toBase58() ?? null;
    const adapterName = wallet?.adapter.name ?? "none";
    const state = [
      `connected=${connected}`,
      `connecting=${connecting}`,
      `disconnecting=${disconnecting}`,
      `adapter=${adapterName}`,
      `address=${maskAddress(address)}`,
      `fp=${addressFingerprint(address)}`,
    ].join(" ");

    if (previousStateRef.current === state) return;
    previousStateRef.current = state;
    logDiag(`sol: wallet-state ${state}`);
  }, [connected, connecting, disconnecting, wallet, publicKey]);

  useEffect(() => {
    const currentAddress = publicKey?.toBase58() ?? null;
    const previousAddress = previousAddressRef.current;
    if (previousAddress !== currentAddress) {
      logDiag(
        `sol: address-change old=${maskAddress(previousAddress)} oldFp=${addressFingerprint(previousAddress)} new=${maskAddress(currentAddress)} newFp=${addressFingerprint(currentAddress)}`,
      );
      previousAddressRef.current = currentAddress;
    }

    if (!previousConnectingRef.current && connecting) {
      logDiag(`sol: connect-phase start adapter=${wallet?.adapter.name ?? "none"}`);
      logWalletStandardSnapshot("connecting_start", wallet?.adapter.name ?? null);
    }
    previousConnectingRef.current = connecting;

    if (!previousConnectedRef.current && connected) {
      logDiag(`sol: connect-phase connected adapter=${wallet?.adapter.name ?? "none"}`);
      logWalletStandardSnapshot("connected", wallet?.adapter.name ?? null);
    } else if (previousConnectedRef.current && !connected) {
      logDiag("sol: connect-phase disconnected");
      logWalletStandardSnapshot("disconnected", wallet?.adapter.name ?? null);
    }
    previousConnectedRef.current = connected;
  }, [connected, connecting, wallet, publicKey]);

  if (!connected) {
    return <ConnectPrompt />;
  }

  return (
    <div className="dashboard-grid">
      <BalanceCard amount={totalBalance} />
      <AssetList assets={assets} loading={loading} error={error} />
    </div>
  );
}

function App() {
  const endpoint = useMemo(() => getRpcEndpoint(), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    [],
  );

  const onError = useCallback((error: WalletError) => {
    logDiag(`sol: wallet-error message="${error.message}"`);
    localStorage.removeItem("walletName");
  }, []);

  useEffect(() => {
    const walletNames = wallets.map((wallet) => wallet.name).join(", ");
    const persistedWalletName =
      typeof window !== "undefined" ? window.localStorage.getItem("walletName") || "none" : "none";
    logDiag(
      `sol: bootstrap endpoint=${endpoint} wallets=${walletNames} autoConnect=true persistedWallet=${persistedWalletName}`,
    );
    logWalletStandardSnapshot("bootstrap", null);
  }, [endpoint, wallets]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>
          <div className="app-layout">
            <Header />
            <main className="main-content">
              <WalletDashboard />
            </main>
            <LogPanel />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
