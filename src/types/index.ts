export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
}

export interface Asset {
  mint: string;
  balance: number;
  symbol?: string;
  name?: string;
  logoURI?: string;
  decimals?: number;
  price?: number;
  value?: number;
}
