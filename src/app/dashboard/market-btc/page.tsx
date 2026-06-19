'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Section } from '@/components/common/Section';
import { Spinner } from '@/components/common/Spinner';
import { ComparisonChart } from '@/components/markets/ComparisonChart';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { TradesTable } from '@/components/trades/TradesTable';
import { Side } from '@/constants/config';
import { getChart } from '@/services/markets.service';
import { resolvePolyMarket } from '@/services/poly-markets.service';
import { getTradeAccounts, getTrades } from '@/services/trades.service';
import { MarketChart } from '@/types/market.types';
import {
  TradeAccount,
  TradeAccountRecord,
  TradeRecord,
} from '@/types/trade.types';

type AccountFilter = 'all' | TradeAccount;
const BTC_15M_MARKET_ID = 'btc-updown-15m';

function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MarketBtcPage() {
  const [marketDate, setMarketDate] = useState<string>(todayDate);
  const [side, setSide] = useState<Side>('up');
  const [account, setAccount] = useState<AccountFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [minAmount, setMinAmount] = useState('');

  const [chart, setChart] = useState<MarketChart | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [tradesError, setTradesError] = useState<string | null>(null);

  // Lấy last-trade từ Supabase + giá BTC từ Binance (căn cùng cửa sổ thời gian).
  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChart({
        marketDate,
        side,
        range: '1d',
      });
      setChart(data);
    } catch (e) {
      setChart(null);
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu chart');
    } finally {
      setLoading(false);
    }
  }, [marketDate, side]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const loadPolyMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      await resolvePolyMarket({
        marketId: BTC_15M_MARKET_ID,
        marketDate,
        timestamp: timestampForMarket(marketDate),
      });
    } catch (e) {
      setMarketError(
        e instanceof Error ? e.message : 'Lỗi resolve Polymarket market',
      );
    } finally {
      setMarketLoading(false);
    }
  }, [marketDate]);

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
    if (chart?.from === null || chart?.to === null) {
      setTrades([]);
      return;
    }

    setTradesLoading(true);
    setTradesError(null);
    try {
      const data = await getTrades({
        account: account === 'all' ? undefined : account,
        from:
          typeof chart?.from === 'number'
            ? new Date(chart.from).toISOString()
            : `${marketDate}T00:00:00.000Z`,
        to:
          typeof chart?.to === 'number'
            ? new Date(chart.to).toISOString()
            : `${marketDate}T23:59:59.999Z`,
        limit: 500,
      });
      setTrades(data);
    } catch (e) {
      setTrades([]);
      setTradesError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu trade');
    } finally {
      setTradesLoading(false);
    }
  }, [account, chart?.from, chart?.to, marketDate]);

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

  return (
    <main className="container">
      <Card>
        <MarketHeader
          marketDate={marketDate}
          onDateChange={setMarketDate}
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
  // 03:00 UTC so seeded mock data lines up with the selected date.
  return Date.UTC(year, month - 1, day, 3, 0, 0, 0);
}
