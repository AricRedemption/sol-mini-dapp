import { useMemo, useState, useEffect, useRef } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Import default styles
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";

// Interface for Token Info from Jupiter List
interface TokenInfo {
  address: string;
  chainId?: number; // chainId is optional in RegistryTokenInfo mapping
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  price?: number; // USD price per token
}

interface Asset {
  mint: string;
  balance: number;
  symbol?: string;
  name?: string;
  logoURI?: string;
  decimals?: number;
  price?: number;
  value?: number;
}

function Header() {
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

function WalletContent() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // 使用 ref 存储 connection 的稳定引用
  const connectionRef = useRef(connection);
  connectionRef.current = connection;

  // 使用 ref 跟踪当前钱包地址,防止重复请求
  const lastFetchedWallet = useRef<string | null>(null);

  // 按需获取 Token 元数据 (使用 Helius DAS API)
  const fetchTokenMetadata = async (
    mintAddresses: string[],
  ): Promise<Map<string, TokenInfo>> => {
    if (mintAddresses.length === 0) {
      return new Map();
    }

    try {
      console.log("📋 开始查询", mintAddresses.length, "个 Token 的元数据...");

      const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
      const endpoint = heliusApiKey
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        : "https://api.mainnet-beta.solana.com";

      // 使用 Helius DAS API 批量查询 Token 元数据
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "token-metadata",
          method: "getAssetBatch",
          params: {
            ids: mintAddresses,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const map = new Map<string, TokenInfo>();

      if (data.result) {
        data.result.forEach(
          (asset: {
            id?: string;
            content?: {
              metadata?: { symbol?: string; name?: string };
              links?: { image?: string };
              files?: Array<{ uri?: string; cdn_uri?: string }>;
            };
            token_info?: {
              symbol?: string;
              name?: string;
              decimals?: number;
              price_info?: { price_per_token?: number };
            };
          }) => {
            if (asset && asset.id) {
              const metadata = asset.content?.metadata;
              map.set(asset.id, {
                address: asset.id,
                symbol:
                  metadata?.symbol || asset.token_info?.symbol || "Unknown",
                name:
                  metadata?.name || asset.token_info?.name || "Unknown Token",
                decimals: asset.token_info?.decimals || 0,
                logoURI:
                  asset.content?.files?.[0]?.cdn_uri || // 优先使用 CDN URI
                  asset.content?.files?.[0]?.uri || // 降级到原始 URI
                  asset.content?.links?.image, // 最后使用 links.image
                price: asset.token_info?.price_info?.price_per_token, // USD 价格
              });
            }
          },
        );
      }

      console.log("✅ 成功获取", map.size, "个 Token 元数据");
      return map;
    } catch (err) {
      console.error("❌ 获取 Token 元数据失败:", err);
      console.log("💡 将使用默认显示");
      return new Map();
    }
  };

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    const walletAddress = publicKey.toBase58();

    // 防止同一钱包地址重复请求
    if (lastFetchedWallet.current === walletAddress) {
      console.log("⚠️ 跳过重复请求,钱包地址未变化:", walletAddress);
      return;
    }
    lastFetchedWallet.current = walletAddress;

    const conn = connectionRef.current;

    const fetchBalances = async () => {
      setLoading(true);
      setError(null);
      console.log("🔍 Starting on-chain asset query...");
      console.log("📍 Wallet Address:", walletAddress);

      try {
        // 1. Fetch SOL Balance
        console.log("💰 Fetching SOL Balance...");
        const balance = await conn.getBalance(publicKey);
        const solBal = balance / LAMPORTS_PER_SOL;
        console.log("✅ SOL Balance:", solBal);
        setSolBalance(solBal);

        // 2. Fetch All Token Accounts
        console.log("🪙 Fetching SPL Token Accounts...");
        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          },
        );
        console.log("✅ Found", tokenAccounts.value.length, "Token Accounts");

        // 收集有余额的 Token mint 地址
        const mintsWithBalance: string[] = [];
        const balanceMap = new Map<
          string,
          { balance: number; decimals: number }
        >();

        for (const { account } of tokenAccounts.value) {
          const parsedInfo = account.data.parsed.info;
          const mintAddress = parsedInfo.mint;
          const tokenAmount = parsedInfo.tokenAmount;
          const uiAmount = tokenAmount.uiAmount || 0;

          if (uiAmount > 0) {
            mintsWithBalance.push(mintAddress);
            balanceMap.set(mintAddress, {
              balance: uiAmount,
              decimals: tokenAmount.decimals,
            });
          }
        }

        // 按需批量查询 Token 元数据 (包含 SOL)
        const mintsToQuery = [
          "So11111111111111111111111111111111111111112", // SOL
          ...mintsWithBalance,
        ];
        const tokenMetadataMap = await fetchTokenMetadata(mintsToQuery);

        // 构造资产列表
        const parsedAssets: Asset[] = [];
        const mintsToFetchPrice: string[] = [
          "So11111111111111111111111111111111111111112",
        ]; // Always fetch SOL price

        mintsWithBalance.forEach((mintAddress) => {
          const balanceInfo = balanceMap.get(mintAddress);
          const tokenInfo = tokenMetadataMap.get(mintAddress);

          if (balanceInfo) {
            parsedAssets.push({
              mint: mintAddress,
              balance: balanceInfo.balance,
              symbol: tokenInfo?.symbol,
              name: tokenInfo?.name,
              logoURI: tokenInfo?.logoURI,
              decimals: balanceInfo.decimals,
            });
            mintsToFetchPrice.push(mintAddress);
          }
        });

        // 3. 从元数据中提取价格信息
        console.log("💰 提取 Token 价格信息...");
        const priceMap: Record<string, number> = {};

        // 从 tokenMetadataMap 中提取价格
        tokenMetadataMap.forEach((tokenInfo, mintAddress) => {
          if (tokenInfo.price) {
            priceMap[mintAddress] = tokenInfo.price;
          }
        });

        console.log(
          "✅ 获取到",
          Object.keys(priceMap).length,
          "个 Token 的价格",
        );

        // Update SOL Price
        const solP =
          priceMap["So11111111111111111111111111111111111111112"] || 0;
        setSolPrice(solP);

        // Update Assets with Price and Value
        let totalVal = 0;

        // SOL Value
        const solVal =
          (balance / LAMPORTS_PER_SOL) *
          (priceMap["So11111111111111111111111111111111111111112"] || 0);
        totalVal += solVal;

        const assetsWithPrice = parsedAssets.map((asset) => {
          const price = priceMap[asset.mint] || 0;
          const value = asset.balance * price;
          totalVal += value;
          return {
            ...asset,
            price: price,
            value: value,
          };
        });

        setTotalBalance(totalVal);

        // Sort assets: Value High to Low
        assetsWithPrice.sort((a, b) => (b.value || 0) - (a.value || 0));

        setAssets(assetsWithPrice);
      } catch (err) {
        console.error("❌ Failed to fetch assets:", err);

        // 详细的错误信息
        let errorMessage = "Failed to fetch assets";
        if (err instanceof Error) {
          console.error("Error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack,
          });

          // 判断具体错误类型
          if (err.message.includes("429")) {
            errorMessage = "RPC rate limit exceeded, please try again later";
          } else if (err.message.includes("timeout")) {
            errorMessage = "Request timed out, please check your connection";
          } else if (err.message.includes("fetch")) {
            errorMessage =
              "Network request failed, please check your connection";
          } else {
            errorMessage = `Query failed: ${err.message}`;
          }
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log("🏁 Asset query completed");
      }
    };

    // 按需查询 Token 元数据,无需等待预加载
    fetchBalances();

    // 添加防抖,避免短时间内重复请求
    let debounceTimer: NodeJS.Timeout | null = null;

    const id = conn.onAccountChange(publicKey, () => {
      console.log("📢 账户变化检测到,准备刷新数据...");

      // 清除之前的定时器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // 1秒后执行刷新,避免频繁请求
      debounceTimer = setTimeout(() => {
        console.log("🔄 执行数据刷新...");
        lastFetchedWallet.current = null; // 重置,允许重新请求
        fetchBalances();
      }, 1000);
    });

    return () => {
      // 清理定时器和监听器
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      conn.removeAccountChangeListener(id);
      setSolBalance(null);
      setAssets([]);
      setSolPrice(null);
    };
  }, [publicKey]); // 只依赖 publicKey,connection 使用 ref 保持稳定

  // Logic to determine if "Empty" (No SOL and No Assets)
  const isEmpty =
    !loading &&
    !error &&
    assets.length === 0 &&
    (solBalance === 0 || solBalance === null);

  return (
    <div className="main-content">
      {!connected ? (
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
      ) : (
        <div className="dashboard-grid">
          {/* Top Row: Total Balance */}
          <div className="balance-card">
            <span className="balance-label">Total Balance (USD)</span>
            <h1 className="balance-amount">
              $
              {totalBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h1>
            <div className="balance-trend">
              <span>+0.00% (24h)</span>
            </div>
          </div>

          {/* Bottom Row: Assets List */}
          <div className="assets-card">
            <div className="assets-header">
              <span className="assets-title">Your Assets</span>
            </div>

            <div className="assets-list">
              {loading && (
                <div className="loading-wrapper">
                  <div className="spinner"></div>
                  <p>Syncing on-chain data...</p>
                </div>
              )}

              {error && (
                <div className="loading-wrapper">
                  <p style={{ color: "var(--error)" }}>{error}</p>
                </div>
              )}

              {!loading && !error && (
                <>
                  {isEmpty ? (
                    <div className="empty-wrapper">
                      <div className="empty-icon">📭</div>
                      <p>No Assets Found</p>
                    </div>
                  ) : (
                    <>
                      {/* SOL Asset Item */}
                      <div className="asset-row">
                        <div className="token-icon">
                          <img
                            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                            alt="SOL"
                          />
                        </div>
                        <div className="token-details">
                          <span className="token-symbol">SOL</span>
                          <span className="token-name">Solana</span>
                        </div>
                        <div className="token-values">
                          <span className="token-fiat">
                            ${((solBalance || 0) * (solPrice || 0)).toFixed(2)}
                          </span>
                          <span className="token-amount">
                            {(solBalance || 0).toFixed(4)} SOL
                          </span>
                        </div>
                      </div>

                      {/* Other Assets */}
                      {assets.map((asset) => (
                        <div className="asset-row" key={asset.mint}>
                          <div className="token-icon">
                            {asset.logoURI ? (
                              <img src={asset.logoURI} alt={asset.symbol} />
                            ) : (
                              <span>{asset.symbol?.slice(0, 2)}</span>
                            )}
                          </div>
                          <div className="token-details">
                            <span className="token-symbol">
                              {asset.symbol || "Unknown"}
                            </span>
                            <span className="token-name">
                              {asset.name || "Unknown Token"}
                            </span>
                          </div>
                          <div className="token-values">
                            <span className="token-fiat">
                              ${(asset.value || 0).toFixed(2)}
                            </span>
                            <span className="token-amount">
                              {asset.balance.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}{" "}
                              {asset.symbol}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  // 使用 Helius RPC (从环境变量读取 API key)
  const endpoint = useMemo(() => {
    const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;

    if (heliusApiKey) {
      // 使用 Helius RPC (推荐 - 快速稳定)
      const heliusEndpoint = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
      console.log("🔗 Using Helius RPC Endpoint");
      return heliusEndpoint;
    } else {
      // 降级到 Solana 官方公共端点
      const officialEndpoint = "https://api.mainnet-beta.solana.com";
      console.warn(
        "⚠️ VITE_HELIUS_API_KEY not configured, using public endpoint",
      );
      console.log(
        "💡 Tip: Configure Helius API key in .env for better performance",
      );
      console.log("🔗 Using Solana Official RPC Endpoint");
      return officialEndpoint;
    }
  }, []);

  const wallets = useMemo(
    () => [
      /**
       * Select the wallets you wish to support, by instantiating wallet adapters here.
       *
       * Common adapters can be found in the npm package `@solana/wallet-adapter-wallets`.
       * That package supports tree shaking and lazy loading -- only the wallets you import
       * will be compiled into your application, and only the dependencies of wallets that
       * your users connect to will be loaded.
       */
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app-layout">
            <Header />
            <WalletContent />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
