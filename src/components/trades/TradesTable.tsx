import { TradeRecord } from '@/types/trade.types';
import { formatTime } from '@/utils/datetime';
import { formatPrice, formatUsd } from '@/utils/format';

interface TradesTableProps {
  trades: TradeRecord[];
}

export function TradesTable({ trades }: TradesTableProps) {
  if (trades.length === 0) {
    return <div className="state">Không có dữ liệu trade cho bộ lọc này.</div>;
  }

  return (
    <div className="table-wrap table-wrap--fixed">
      <table className="table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Account</th>
            <th>Market ID</th>
            <th>Outcome</th>
            <th className="num">Price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td>{formatTime(trade.timestamp, fullTimeOptions)}</td>
              <td>{trade.account}</td>
              <td className="mono">{trade.marketId}</td>
              <td>
                <span
                  className={`badge ${
                    trade.outcome === 'up' ? 'badge--buy' : 'badge--sell'
                  }`}
                >
                  {trade.outcome === 'up' ? 'Up' : 'Down'}
                </span>
              </td>
              <td className="num">{formatPrice(trade.price)}</td>
              <td className="num">{formatUsd(trade.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fullTimeOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};
