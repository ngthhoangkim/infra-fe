'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Section } from '@/components/common/Section';
import { Spinner } from '@/components/common/Spinner';
import { ComparisonChart } from '@/components/markets/ComparisonChart';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { TradesTable } from '@/components/trades/TradesTable';
import { HistoryMode, Side } from '@/constants/config';
import { getChart } from '@/services/markets.service';
import { resolvePolyMarket } from '@/services/poly-markets.service';
import { getTradeAccounts, getTrades } from '@/services/trades.service';
import { MarketChart } from '@/types/market.types';
import { PolyMarket } from '@/types/poly-market.types';
import {
  TradeAccount,
  TradeAccountRecord,
  TradeRecord,
} from '@/types/trade.types';
import {
  NEW_YORK_TIME_ZONE,
  currentDailyMarketDate,
  datePartsInNewYork,
  zonedTimeToUtcSeconds,
} from '@/utils/datetime';

type AccountFilter = 'all' | TradeAccount;
const BTC_DAILY_MARKET_ID = 'btc-updown-daily';

export default function MarketBtcPage() {
  const searchParams = useSearchParams();
  const historyMode: HistoryMode =
    searchParams.get('mode') === '4h' ? '4h' : 'last_trade';
  const [marketDate, setMarketDate] = useState<string>(() =>
    historyMode === '4h' ? datePartsInNewYork(new Date()) : currentDailyMarketDate(),
  );
  const [windowStartTs, setWindowStartTs] = useState<number>(() =>
    defaultWindowStartTs(datePartsInNewYork(new Date())),
  );
  const [side, setSide] = useState<Side>('up');
  const [account, setAccount] = useState<AccountFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [minAmount, setMinAmount] = useState('');

  const [chart, setChart] = useState<MarketChart | null>(null);
  const [polyMarket, setPolyMarket] = useState<PolyMarket | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const marketWindowFrom =
    historyMode === 'last_trade'
      ? (polyMarket?.windowStartAt ?? undefined)
      : undefined;
  const marketWindowTo =
    historyMode === 'last_trade'
      ? (polyMarket?.windowEndAt ?? undefined)
      : undefined;

  // Lấy last-trade từ Polymarket API + giá BTC từ Binance.
  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChart({
        marketDate,
        side,
        range: '1d',
        historyMode,
        windowStartTs: historyMode === '4h' ? windowStartTs : undefined,
        conditionId:
          historyMode === 'last_trade' ? polyMarket?.conditionId : undefined,
        from: marketWindowFrom,
        to: marketWindowTo,
      });
      setChart(data);
    } catch (e) {
      setChart(null);
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu chart');
    } finally {
      setLoading(false);
    }
  }, [
    historyMode,
    marketDate,
    marketWindowFrom,
    marketWindowTo,
    polyMarket?.conditionId,
    side,
    windowStartTs,
  ]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const loadPolyMarket = useCallback(async () => {
    if (historyMode === '4h') {
      setPolyMarket(null);
      setMarketLoading(false);
      setMarketError(null);
      return;
    }

    setMarketLoading(true);
    setMarketError(null);
    setPolyMarket(null);
    try {
      const data = await resolvePolyMarket({
        marketId: BTC_DAILY_MARKET_ID,
        marketDate,
        timestamp: timestampForMarket(marketDate),
      });
      setPolyMarket(data);
    } catch (e) {
      setMarketError(
        e instanceof Error ? e.message : 'Lỗi resolve Polymarket market',
      );
    } finally {
      setMarketLoading(false);
    }
  }, [historyMode, marketDate]);

  useEffect(() => {
    loadPolyMarket();
  }, [loadPolyMarket]);

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

  const loadTrades = useCallback(async () => {
    const chartConditionId = chart?.conditionId ?? polyMarket?.conditionId;
    if (
      typeof chart?.from !== 'number' ||
      typeof chart?.to !== 'number' ||
      !chartConditionId
    ) {
      setTrades([]);
      return;
    }

    setTradesLoading(true);
    setTradesError(null);
    try {
      const data = await getTrades({
        account: account === 'all' ? undefined : account,
        conditionId: chartConditionId,
        outcome: side,
        from: new Date(chart.from).toISOString(),
        to: new Date(chart.to).toISOString(),
        limit: 500,
      });
      setTrades(data);
    } catch (e) {
      setTrades([]);
      setTradesError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu trade');
    } finally {
      setTradesLoading(false);
    }
  }, [
    account,
    chart?.from,
    chart?.conditionId,
    chart?.to,
    polyMarket?.conditionId,
    side,
  ]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const lastTrade = chart?.lastTrade ?? [];
  const btc = chart?.btc ?? [];
  const filteredTrades = useMemo(() => {
    const priceFloor = parseNonNegativeFilter(minPrice);
    const amountFloor = parseNonNegativeFilter(minAmount);

    return trades.filter((trade) => {
      if (priceFloor !== null && trade.price < priceFloor) return false;
      if (amountFloor !== null && trade.amount < amountFloor) return false;
      return true;
    });
  }, [minAmount, minPrice, trades]);

  const hasTradeFilters =
    account !== 'all' || minPrice !== '' || minAmount !== '';
  const resetTradeFilters = () => {
    setAccount('all');
    setMinPrice('');
    setMinAmount('');
  };
  const handleDateChange = (date: string) => {
    setMarketDate(date);
    setWindowStartTs(defaultWindowStartTs(date));
  };
  const handleFourHourWindowChange = (value: {
    marketDate: string;
    windowStartTs: number;
  }) => {
    setMarketDate(value.marketDate);
    setWindowStartTs(value.windowStartTs);
  };

  return (
    <main className="container">
      <Card>
        <MarketHeader
          marketDate={marketDate}
          onDateChange={handleDateChange}
          historyMode={historyMode}
          windowStartTs={windowStartTs}
          onFourHourWindowChange={handleFourHourWindowChange}
          side={side}
          onSideChange={setSide}
          account={account}
          accounts={accounts}
          accountsLoading={accountsLoading}
          onAccountChange={setAccount}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          minAmount={minAmount}
          onMinAmountChange={setMinAmount}
          hasTradeFilters={hasTradeFilters}
          onResetTradeFilters={resetTradeFilters}
        />
      </Card>

      {error && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <ErrorState message={error} onRetry={loadChart} />
          </Card>
        </div>
      )}

      <Section title="BTC/Binance price">
        <Card>
          {loading && !chart ? (
            <Spinner />
          ) : (
            <ComparisonChart
              btc={btc}
              lastTrade={lastTrade}
              side={side}
              from={chart?.from ?? null}
              to={chart?.to ?? null}
              trades={filteredTrades}
            />
          )}
        </Card>
      </Section>

      <Section title="Danh sách trade">
        <Card>
          {marketError && <div className="poly-note err">{marketError}</div>}
          {tradesError && <div className="poly-note err">{tradesError}</div>}
          {tradesLoading ? (
            <Spinner />
          ) : (
            <TradesTable trades={filteredTrades} totalTrades={trades.length} />
          )}
        </Card>
      </Section>
    </main>
  );
}

function parseNonNegativeFilter(value: string): number | null {
  if (value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function timestampForMarket(marketDate: string): number {
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day) return Date.now();

  // Until there is a time-of-day picker, resolve the demo intraday window at
  // 10:00 Vietnam time so seeded mock data lines up with the selected date.
  return Date.UTC(year, month - 1, day, 3, 0, 0, 0);
}

function defaultWindowStartTs(marketDate: string): number {
  const now = new Date();
  const today = datePartsInNewYork(now);
  const hour =
    marketDate === today ? Math.floor(hourInNewYork(now) / 4) * 4 : 0;
  return zonedTimeToUtcSeconds(marketDate, hour, NEW_YORK_TIME_ZONE);
}

function hourInNewYork(value: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: NEW_YORK_TIME_ZONE,
  }).format(value);
  return Number(hour);
}
