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

// Hooks & Services
import { usePortfolio } from "./hooks/usePortfolio";
import { getRpcEndpoint } from "./services/helius";
import { logDiag, addressFingerprint, maskAddress } from "./lib/logger";

// Styles
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";

function WalletDashboard() {
  const { connected, connecting, disconnecting, wallet, publicKey } = useWallet();
  const { assets, totalBalance, loading, error } = usePortfolio();
  const previousStateRef = useRef<string>("");

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
    logDiag(`sol: bootstrap endpoint=${endpoint} wallets=${walletNames}`);
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
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
