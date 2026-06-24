'use client';

import { useSearchParams } from 'next/navigation';
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Section } from '@/components/common/Section';
import { Spinner } from '@/components/common/Spinner';
import { ComparisonChart } from '@/components/markets/ComparisonChart';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { TradesTable } from '@/components/trades/TradesTable';
import { HistoryMode, OutcomeFilter } from '@/constants/config';
import { getBtcDashboard } from '@/services/dashboard.service';
import { BtcDashboardErrors } from '@/types/dashboard.types';
import { MarketChart } from '@/types/market.types';
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
  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [account, setAccount] = useState<AccountFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [minAmount, setMinAmount] = useState('');

  const [chart, setChart] = useState<MarketChart | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dashboardErrors, setDashboardErrors] =
    useState<BtcDashboardErrors>({});
  const requestSeq = useRef(0);

  const loadDashboard = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setLoading(true);
    setDashboardErrors({});
    try {
      const data = await getBtcDashboard({
        account,
        marketDate,
        outcome,
        historyMode,
        windowStartTs: historyMode === '4h' ? windowStartTs : undefined,
      });
      if (requestSeq.current !== seq) return;
      setAccounts(data.accounts);
      setChart(data.chart);
      setTrades(data.trades);
      setDashboardErrors(data.errors);
    } catch (error) {
      if (requestSeq.current !== seq) return;
      setAccounts([]);
      setChart(null);
      setTrades([]);
      setDashboardErrors({
        chart:
          error instanceof Error ? error.message : 'Lỗi tải dữ liệu dashboard',
      });
    } finally {
      if (requestSeq.current === seq) setLoading(false);
    }
  }, [account, historyMode, marketDate, outcome, windowStartTs]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
          outcome={outcome}
          onOutcomeChange={setOutcome}
          account={account}
          accounts={accounts}
          accountsLoading={loading && accounts.length === 0}
          onAccountChange={setAccount}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          minAmount={minAmount}
          onMinAmountChange={setMinAmount}
          hasTradeFilters={hasTradeFilters}
          onResetTradeFilters={resetTradeFilters}
        />
      </Card>

      {dashboardErrors.chart && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <ErrorState message={dashboardErrors.chart} onRetry={loadDashboard} />
          </Card>
        </div>
      )}

      <Section title="BTC/Binance price">
        <Card>
          {loading && !chart ? (
            <Spinner />
          ) : (
            <LoadingPanel loading={loading}>
              <ComparisonChart
                btc={btc}
                lastTrade={lastTrade}
                lastTradeUp={chart?.lastTradeUp ?? []}
                lastTradeDown={chart?.lastTradeDown ?? []}
                outcome={outcome}
                from={chart?.from ?? null}
                to={chart?.to ?? null}
                trades={filteredTrades}
              />
            </LoadingPanel>
          )}
        </Card>
      </Section>

      <Section title="Danh sách trade">
        <Card>
          {dashboardErrors.market && (
            <div className="poly-note err">{dashboardErrors.market}</div>
          )}
          {dashboardErrors.accounts && (
            <div className="poly-note err">{dashboardErrors.accounts}</div>
          )}
          {dashboardErrors.trades && (
            <div className="poly-note err">{dashboardErrors.trades}</div>
          )}
          {loading && !chart ? (
            <Spinner />
          ) : (
            <LoadingPanel loading={loading}>
              <TradesTable trades={filteredTrades} totalTrades={trades.length} />
            </LoadingPanel>
          )}
        </Card>
      </Section>
    </main>
  );
}

function LoadingPanel({
  children,
  loading,
}: {
  children: ReactNode;
  loading: boolean;
}) {
  return (
    <div className={`loading-panel ${loading ? 'is-loading' : ''}`}>
      <div className="loading-panel__content">{children}</div>
      {loading && (
        <div
          className="loading-panel__overlay"
          role="status"
          aria-label="Đang tải"
        >
          <span className="loading-dot" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function parseNonNegativeFilter(value: string): number | null {
  if (value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
