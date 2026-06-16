import { DateTabs } from '@/components/filters/DateTabs';
import { SideToggle } from '@/components/filters/SideToggle';
import { Side } from '@/constants/config';
import { formatDate } from '@/utils/datetime';

interface MarketHeaderProps {
  marketDate: string;
  onDateChange: (date: string) => void;
  side: Side;
  onSideChange: (side: Side) => void;
}

export function MarketHeader({
  marketDate,
  onDateChange,
  side,
  onSideChange,
}: MarketHeaderProps) {
  return (
    <div className="market-header">
      <h1 className="market-header__symbol">
        Ngày {formatDate(marketDate)} · BTC Up or Down
      </h1>
      <div className="market-header__controls">
        <SideToggle value={side} onChange={onSideChange} />
        <DateTabs selected={marketDate} onSelect={onDateChange} />
      </div>
    </div>
  );
}
