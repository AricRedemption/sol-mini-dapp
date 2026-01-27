import { useState, useEffect, useRef, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Asset } from "../types";
import { fetchTokenMetadataBatch } from "../services/helius";
import { SOL_MINT, SOL_LOGO_URI, REFRESH_DEBOUNCE_MS } from "../constants";

export function usePortfolio() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedWallet = useRef<string | null>(null);

  const handleError = useCallback((err: unknown) => {
    console.error("Portfolio fetch failed:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("429")) {
      setError("Rate limit exceeded. Please try again later.");
    } else {
      setError("Failed to sync wallet data. Please check your connection.");
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const [solLamports, tokenAccounts] = await Promise.all([
        connection.getBalance(publicKey),
        connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        }),
      ]);

      const solVal = solLamports / LAMPORTS_PER_SOL;
      setSolBalance(solVal);

      const activeMints: string[] = [SOL_MINT];
      const balanceMap = new Map<
        string,
        { balance: number; decimals: number }
      >();

      tokenAccounts.value.forEach(({ account }) => {
        const { mint, tokenAmount } = account.data.parsed.info;
        const uiAmount = tokenAmount.uiAmount || 0;

        if (uiAmount > 0) {
          activeMints.push(mint);
          balanceMap.set(mint, {
            balance: uiAmount,
            decimals: tokenAmount.decimals,
          });
        }
      });

      const metadataMap = await fetchTokenMetadataBatch(activeMints);

      const solMetadata = metadataMap.get(SOL_MINT);
      const solPrice = solMetadata?.price || 0;
      const solValue = solVal * solPrice;

      const allAssets: Asset[] = [
        {
          mint: SOL_MINT,
          balance: solVal,
          decimals: 9,
          symbol: "SOL",
          name: "Solana",
          logoURI: solMetadata?.logoURI || SOL_LOGO_URI,
          price: solPrice,
          value: solValue,
        },
      ];

      let calculatedTotal = solValue;

      balanceMap.forEach((info, mint) => {
        const metadata = metadataMap.get(mint);
        const price = metadata?.price || 0;
        const value = info.balance * price;

        calculatedTotal += value;
        allAssets.push({
          mint,
          balance: info.balance,
          decimals: info.decimals,
          symbol: metadata?.symbol,
          name: metadata?.name,
          logoURI: metadata?.logoURI,
          price,
          value,
        });
      });

      const filteredSortedAssets = allAssets
        .filter((asset) => asset.balance > 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      setAssets(filteredSortedAssets);
      setTotalBalance(calculatedTotal);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, handleError]);

  useEffect(() => {
    if (!publicKey) {
      setAssets([]);
      setSolBalance(0);
      setTotalBalance(0);
      setError(null);
      lastFetchedWallet.current = null;
      return;
    }

    const walletAddress = publicKey.toBase58();
    if (lastFetchedWallet.current === walletAddress) return;

    lastFetchedWallet.current = walletAddress;
    fetchBalances();

    const subscriptionId = connection.onAccountChange(publicKey, () => {
      setTimeout(() => {
        lastFetchedWallet.current = null;
        fetchBalances();
      }, REFRESH_DEBOUNCE_MS);
    });

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [publicKey, connection, fetchBalances]);

  return {
    assets,
    solBalance,
    totalBalance,
    loading,
    error,
    refresh: fetchBalances,
  };
}
