import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Header() {
  const { connected } = useWallet();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-logo-text">SolConnect</div>
        </div>
        <div className="header-right">
          <WalletMultiButton>
            {connected ? undefined : "Connect"}
          </WalletMultiButton>
        </div>
      </div>
    </header>
  );
}
