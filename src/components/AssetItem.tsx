import type { Asset } from "../types";
import { DEFAULT_TOKEN_NAME, DEFAULT_TOKEN_SYMBOL } from "../constants";

interface AssetItemProps {
  asset: Asset;
}

export function AssetItem({ asset }: AssetItemProps) {
  const symbol = asset.symbol || DEFAULT_TOKEN_SYMBOL;
  const name = asset.name || DEFAULT_TOKEN_NAME;
  const value = asset.value || 0;

  return (
    <div className="asset-row">
      <div className="token-icon">
        {asset.logoURI ? (
          <img src={asset.logoURI} alt={symbol} />
        ) : (
          <span>{symbol.slice(0, 2)}</span>
        )}
      </div>
      <div className="token-details">
        <span className="token-symbol">{symbol}</span>
        <span className="token-name">{name}</span>
      </div>
      <div className="token-values">
        <span className="token-fiat">${value.toFixed(2)}</span>
        <span className="token-amount">
          {asset.balance.toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}{" "}
          {symbol}
        </span>
      </div>
    </div>
  );
}
