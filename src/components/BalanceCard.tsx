interface BalanceCardProps {
  amount: number;
}

export function BalanceCard({ amount }: BalanceCardProps) {
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="balance-card">
      <span className="balance-label">Total Balance (USD)</span>
      <h1 className="balance-amount">${formattedAmount}</h1>
    </div>
  );
}
