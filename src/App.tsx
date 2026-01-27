import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
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

// Styles
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";

function WalletDashboard() {
  const { connected } = useWallet();
  const { assets, totalBalance, loading, error } = usePortfolio();

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
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
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
