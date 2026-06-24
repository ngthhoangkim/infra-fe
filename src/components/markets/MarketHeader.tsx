import { DateTabs } from '@/components/filters/DateTabs';
import { FourHourWindowSelect } from '@/components/filters/FourHourWindowSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HistoryMode, OUTCOME_LABELS, OutcomeFilter } from '@/constants/config';
import { TradeAccount, TradeAccountRecord } from '@/types/trade.types';
import { formatDate } from '@/utils/datetime';

type AccountFilter = 'all' | TradeAccount;

interface MarketHeaderProps {
  marketDate: string;
  onDateChange: (date: string) => void;
  historyMode: HistoryMode;
  windowStartTs: number;
  onFourHourWindowChange: (value: {
    marketDate: string;
    windowStartTs: number;
  }) => void;
  outcome: OutcomeFilter;
  onOutcomeChange: (outcome: OutcomeFilter) => void;
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
  historyMode,
  windowStartTs,
  onFourHourWindowChange,
  outcome,
  onOutcomeChange,
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
        <div className="outlined-field">
          <span className="outlined-field__label">Outcome</span>
          <Select
            value={outcome}
            onValueChange={(value) => onOutcomeChange(value as OutcomeFilter)}
          >
            <SelectTrigger className="outlined-field__control w-[130px] text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="outlined-field">
          <span className="outlined-field__label">Account</span>
          <Select
            value={account}
            disabled={accountsLoading}
            onValueChange={(value) => onAccountChange(value as AccountFilter)}
          >
            <SelectTrigger className="outlined-field__control w-[160px] text-foreground">
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
        </div>
        <div className="outlined-field">
          <span className="outlined-field__label">Min price</span>
          <Input
            value={minPrice}
            type="number"
            min="0"
            step="0.01"
            className="outlined-field__control w-[120px]"
            placeholder="All"
            onChange={(event) => onMinPriceChange(event.target.value)}
          />
        </div>
        <div className="outlined-field">
          <span className="outlined-field__label">Min amount</span>
          <Input
            value={minAmount}
            type="number"
            min="0"
            step="0.01"
            className="outlined-field__control w-[130px]"
            placeholder="All"
            onChange={(event) => onMinAmountChange(event.target.value)}
          />
        </div>
        {hasTradeFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={onResetTradeFilters}
          >
            Reset
          </Button>
        )}
        {historyMode === '4h' ? (
          <FourHourWindowSelect
            marketDate={marketDate}
            windowStartTs={windowStartTs}
            onSelect={onFourHourWindowChange}
          />
        ) : (
          <DateTabs selected={marketDate} onSelect={onDateChange} />
        )}
      </div>
    </div>
  );
}
