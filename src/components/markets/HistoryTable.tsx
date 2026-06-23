import { LastTradePoint } from '@/types/market.types';
import { formatTime } from '@/utils/datetime';

interface HistoryTableProps {
  points: LastTradePoint[];
}

/** Bảng chi tiết last-trade: thời gian theo timestamp gốc, giá ¢, xác suất %. */
export function HistoryTable({ points }: HistoryTableProps) {
  if (points.length === 0) {
    return <div className="state">Không có dữ liệu cho lựa chọn này.</div>;
  }

  // Mới nhất lên đầu.
  const rows = [...points].reverse();

  return (
    <div className="table-wrap table-wrap--fixed">
      <table className="table">
        <thead>
          <tr>
            <th>Thời gian (UTC)</th>
            <th className="num">Giá (¢)</th>
            <th className="num">Xác suất</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.time}>
              <td>{formatTime(p.createdAt ?? p.time, fullTimeOptions)}</td>
              <td className="num up">{p.price.toFixed(1)}¢</td>
              <td className="num">{p.price.toFixed(1)}%</td>
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
