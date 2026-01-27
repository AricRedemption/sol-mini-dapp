import type { Asset } from "../types";
import { AssetItem } from "./AssetItem";

interface AssetListProps {
  assets: Asset[];
  loading: boolean;
  error: string | null;
}

export function AssetList({ assets, loading, error }: AssetListProps) {
  if (loading) {
    return (
      <div className="assets-card">
        <div className="assets-header">
          <span className="assets-title">Your Assets</span>
        </div>
        <div className="assets-list">
          <div className="loading-wrapper">
            <div className="spinner"></div>
            <p>Syncing on-chain data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assets-card">
        <div className="assets-header">
          <span className="assets-title">Your Assets</span>
        </div>
        <div className="assets-list">
          <div className="loading-wrapper">
            <p style={{ color: "var(--error)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assets-card">
      <div className="assets-header">
        <span className="assets-title">Your Assets</span>
      </div>
      <div className="assets-list">
        {assets.length === 0 ? (
          <div className="empty-wrapper">
            <div className="empty-icon">📭</div>
            <p>No Assets Found</p>
          </div>
        ) : (
          assets.map((asset) => <AssetItem key={asset.mint} asset={asset} />)
        )}
      </div>
    </div>
  );
}
