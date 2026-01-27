import type { TokenMetadata } from "../types";
import {
  OFFICIAL_RPC_ENDPOINT,
  DEFAULT_TOKEN_NAME,
  DEFAULT_TOKEN_SYMBOL,
} from "../constants";

export const getRpcEndpoint = (): string => {
  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
  return heliusApiKey
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    : OFFICIAL_RPC_ENDPOINT;
};

export const fetchTokenMetadataBatch = async (
  mintAddresses: string[],
): Promise<Map<string, TokenMetadata>> => {
  if (mintAddresses.length === 0) return new Map();

  try {
    const endpoint = getRpcEndpoint();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "token-metadata",
        method: "getAssetBatch",
        params: { ids: mintAddresses },
      }),
    });

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status}`);
    }

    const data = await response.json();
    const metadataMap = new Map<string, TokenMetadata>();

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
          if (!asset?.id) return;

          const metadata = asset.content?.metadata;
          const info = asset.token_info;

          metadataMap.set(asset.id, {
            address: asset.id,
            symbol: metadata?.symbol || info?.symbol || DEFAULT_TOKEN_SYMBOL,
            name: metadata?.name || info?.name || DEFAULT_TOKEN_NAME,
            decimals: info?.decimals || 0,
            logoURI:
              asset.content?.files?.[0]?.cdn_uri ||
              asset.content?.files?.[0]?.uri ||
              asset.content?.links?.image,
            price: info?.price_info?.price_per_token,
          });
        },
      );
    }

    return metadataMap;
  } catch (error) {
    console.error("Failed to fetch token metadata:", error);
    return new Map();
  }
};
