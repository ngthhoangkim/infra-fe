'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { Section } from '@/components/common/Section';
import { Spinner } from '@/components/common/Spinner';
import { TradesTable } from '@/components/trades/TradesTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTradeAccounts, getTrades } from '@/services/trades.service';
import {
  TRADE_OUTCOMES,
  TradeAccount,
  TradeAccountRecord,
  TradeOutcome,
  TradeRecord,
} from '@/types/trade.types';
import { formatTime } from '@/utils/datetime';
import { formatNumber, formatPrice, formatUsd } from '@/utils/format';
import { Check, RotateCcw } from 'lucide-react';
import { DateRange } from 'react-day-picker';

type AccountFilter = 'all' | TradeAccount;

export default function TradesPage() {
  const [account, setAccount] = useState<AccountFilter>('all');
  const [marketId, setMarketId] = useState('');
  const [outcome, setOutcome] = useState<'all' | TradeOutcome>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [appliedFilters, setAppliedFilters] = useState({
    account,
    marketId,
    outcome,
    dateRange,
  });
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrades({
        account:
          appliedFilters.account === 'all' ? undefined : appliedFilters.account,
        marketId: appliedFilters.marketId,
        outcome:
          appliedFilters.outcome === 'all'
            ? undefined
            : appliedFilters.outcome,
        from: appliedFilters.dateRange?.from
          ? toDateParam(appliedFilters.dateRange.from, false)
          : undefined,
        to: appliedFilters.dateRange?.to
          ? toDateParam(appliedFilters.dateRange.to, true)
          : undefined,
        limit: 500,
      });
      setTrades(data);
    } catch (e) {
      setTrades([]);
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu trade');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const data = await getTradeAccounts();
      setAccounts(data);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const summary = useMemo(() => summarizeTrades(trades), [trades]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({
      account,
      marketId,
      outcome,
      dateRange,
    });
  }

  function resetFilters() {
    setAccount('all');
    setMarketId('');
    setOutcome('all');
    setDateRange(undefined);
    setAppliedFilters({
      account: 'all',
      marketId: '',
      outcome: 'all',
      dateRange: undefined,
    });
  }

  return (
    <main className="container">
      <Section title="Bộ lọc">
        <Card>
          <CardContent>
            <form
              className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(280px,1fr)_180px_320px_auto]"
              onSubmit={onSubmit}
            >
              <div className="grid gap-1">
                <Label>Account</Label>
                <Select
                  value={account}
                  disabled={accountsLoading}
                  onValueChange={(value) => setAccount(value as AccountFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
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
              <div className="grid gap-1">
                <Label>Market ID</Label>
                <Input
                  value={marketId}
                  onChange={(event) => setMarketId(event.target.value)}
                  placeholder="test-market"
                />
              </div>
              <div className="grid gap-1">
                <Label>Outcome</Label>
                <Select
                  value={outcome}
                  onValueChange={(value) =>
                    setOutcome(value as 'all' | TradeOutcome)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {TRADE_OUTCOMES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === 'up' ? 'Up' : 'Down'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Date range</Label>
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  type="submit"
                  title="Apply"
                  aria-label="Apply filters"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  title="Reset"
                  aria-label="Reset filters"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Section>

      {error && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <CardContent>
              <ErrorState message={error} onRetry={loadTrades} />
            </CardContent>
          </Card>
        </div>
      )}

      <Section title="Tổng quan">
        <div className="summary-grid">
          <Card>
            <CardContent className="metric">
              <span className="metric__label">Total trades</span>
              <strong className="metric__value">
                {formatNumber(summary.count)}
              </strong>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="metric">
              <span className="metric__label">Total amount</span>
              <strong className="metric__value">
                {formatUsd(summary.totalAmount)}
              </strong>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="metric">
              <span className="metric__label">Average price</span>
              <strong className="metric__value">
                {formatPrice(summary.averagePrice)}
              </strong>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="metric">
              <span className="metric__label">Latest trade</span>
              <strong className="metric__value metric__value--time">
                {summary.latest
                  ? formatTime(summary.latest, shortTimeOptions)
                  : '-'}
              </strong>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Danh sách trade">
        <Card>
          <CardContent>
            {loading ? <Spinner /> : <TradesTable trades={trades} />}
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}

function summarizeTrades(trades: TradeRecord[]) {
  const totalAmount = trades.reduce((sum, trade) => sum + trade.amount, 0);
  const totalPrice = trades.reduce((sum, trade) => sum + trade.price, 0);
  const latest = trades[0]?.timestamp ?? null;

  return {
    count: trades.length,
    totalAmount,
    averagePrice: trades.length > 0 ? totalPrice / trades.length : Number.NaN,
    latest,
  };
}

function toDateParam(date: Date, endOfDay: boolean): string {
  const value = new Date(date);
  if (endOfDay) {
    value.setHours(23, 59, 59, 999);
  } else {
    value.setHours(0, 0, 0, 0);
  }
  return value.toISOString();
}

const shortTimeOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};
