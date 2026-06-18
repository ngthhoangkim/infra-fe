import { DateTabs } from '@/components/filters/DateTabs';
import { SideToggle } from '@/components/filters/SideToggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Side } from '@/constants/config';
import { TradeAccount, TradeAccountRecord } from '@/types/trade.types';
import { formatDate } from '@/utils/datetime';

type AccountFilter = 'all' | TradeAccount;

interface MarketHeaderProps {
  marketDate: string;
  onDateChange: (date: string) => void;
  side: Side;
  onSideChange: (side: Side) => void;
  account: AccountFilter;
  accounts: TradeAccountRecord[];
  accountsLoading: boolean;
  onAccountChange: (account: AccountFilter) => void;
}

export function MarketHeader({
  marketDate,
  onDateChange,
  side,
  onSideChange,
  account,
  accounts,
  accountsLoading,
  onAccountChange,
}: MarketHeaderProps) {
  return (
    <div className="market-header">
      <h1 className="market-header__symbol">
        Ngày {formatDate(marketDate)} · BTC Up or Down
      </h1>
      <div className="market-header__controls">
        <SideToggle value={side} onChange={onSideChange} />
        <Select
          value={account}
          disabled={accountsLoading}
          onValueChange={(value) => onAccountChange(value as AccountFilter)}
        >
          <SelectTrigger className="w-[160px] text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {accounts.map((item) => (
              <SelectItem key={item.id} value={item.account}>
                {item.account}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateTabs selected={marketDate} onSelect={onDateChange} />
      </div>
    </div>
  );
}
