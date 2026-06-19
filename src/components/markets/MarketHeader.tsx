import { DateTabs } from '@/components/filters/DateTabs';
import { SideToggle } from '@/components/filters/SideToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  minPrice: string;
  onMinPriceChange: (value: string) => void;
  minAmount: string;
  onMinAmountChange: (value: string) => void;
  hasTradeFilters: boolean;
  onResetTradeFilters: () => void;
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
  minPrice,
  onMinPriceChange,
  minAmount,
  onMinAmountChange,
  hasTradeFilters,
  onResetTradeFilters,
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
        <Input
          value={minPrice}
          type="number"
          min="0"
          step="0.01"
          className="w-[120px]"
          placeholder="Min price"
          onChange={(event) => onMinPriceChange(event.target.value)}
        />
        <Input
          value={minAmount}
          type="number"
          min="0"
          step="0.01"
          className="w-[130px]"
          placeholder="Min amount"
          onChange={(event) => onMinAmountChange(event.target.value)}
        />
        {hasTradeFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={onResetTradeFilters}
          >
            Reset
          </Button>
        )}
        <DateTabs selected={marketDate} onSelect={onDateChange} />
      </div>
    </div>
  );
}
