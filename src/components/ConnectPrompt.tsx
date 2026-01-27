export function ConnectPrompt() {
  return (
    <div className="connect-prompt">
      <div className="connect-icon-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </div>
      <h2 className="connect-title">Connect Wallet</h2>
      <p className="connect-desc">
        Connect your Solana wallet to view token balances and portfolio
        analytics.
      </p>
    </div>
  );
}
