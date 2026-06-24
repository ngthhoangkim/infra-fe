'use client';

import { RefreshCw } from 'lucide-react';
import {
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
import { DateTabs } from '@/components/filters/DateTabs';
import { FourHourWindowSelect } from '@/components/filters/FourHourWindowSelect';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HISTORY_MODE_LABELS,
  HISTORY_MODES,
  HistoryMode,
} from '@/constants/config';
import { getBtcDashboard } from '@/services/dashboard.service';
import { resolvePolyMarket } from '@/services/poly-markets.service';
import { getTradeAccounts, getTradeSummary } from '@/services/trades.service';
import {
  TradeAccountRecord,
  TradeAccountSummary,
  TradeSummaryResponse,
  TradeSummaryTotals,
} from '@/types/trade.types';
import {
  NEW_YORK_TIME_ZONE,
  currentDailyMarketDate,
  datePartsInNewYork,
  zonedTimeToUtcSeconds,
} from '@/utils/datetime';
import { formatPrice, formatUsd } from '@/utils/format';

const REFRESH_MS = 8000;
const BTC_DAILY_MARKET_ID = 'btc-updown-daily';
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export default function TradesSummaryPage() {
  const [summary, setSummary] = useState<TradeSummaryResponse | null>(null);
  const [historyMode, setHistoryMode] = useState<HistoryMode>('last_trade');
  const [marketDate, setMarketDate] = useState(() => currentDailyMarketDate());
  const [windowStartTs, setWindowStartTs] = useState(() =>
    defaultWindowStartTs(datePartsInNewYork(new Date())),
  );
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [accountFilter, setAccountFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);
  const hasLoaded = summary !== null || error !== '';

  const visibleRows = useMemo(() => {
    const rows = summary?.rows ?? [];
    return accountFilter === 'all'
      ? rows
      : rows.filter((row) => row.account === accountFilter);
  }, [accountFilter, summary?.rows]);

  const visibleTotals = useMemo(
    () => summarizeVisibleRows(visibleRows),
    [visibleRows],
  );

  const loadSummary = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setLoading(true);
    setError('');
    try {
      const selectedMarket = await resolveSelectedMarketWindow(
        historyMode,
        marketDate,
        windowStartTs,
      );
      const data = await getTradeSummary(selectedMarket);
      if (requestSeq.current !== seq) return;
      setSummary(data);
    } catch (err) {
      if (requestSeq.current !== seq) return;
      setError(err instanceof Error ? err.message : 'Lỗi tải summary trade');
      setSummary(null);
    } finally {
      if (requestSeq.current === seq) setLoading(false);
    }
  }, [historyMode, marketDate, windowStartTs]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    let active = true;
    setAccountsLoading(true);
    getTradeAccounts()
      .then((data) => {
        if (active) setAccounts(data);
      })
      .catch(() => {
        if (active) setAccounts([]);
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(loadSummary, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadSummary]);

  const handleModeChange = (mode: HistoryMode) => {
    setHistoryMode(mode);
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
        <div className="summary-header">
          <div>
            <h1 className="market-header__symbol">Trade Summary</h1>
            <div className="topbar__note">
              {historyMode === '4h' ? '4H window' : 'Daily market'}
              {summary?.prices.source ? ` · price: ${summary.prices.source}` : ''}
            </div>
          </div>
          <div className="summary-filter">
            <div className="segmented" aria-label="Market mode">
              {HISTORY_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`segmented__item ${
                    historyMode === mode ? 'is-active' : ''
                  }`}
                  onClick={() => handleModeChange(mode)}
                >
                  {HISTORY_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            {historyMode === '4h' ? (
              <FourHourWindowSelect
                marketDate={marketDate}
                windowStartTs={windowStartTs}
                onSelect={handleFourHourWindowChange}
              />
            ) : (
              <DateTabs selected={marketDate} onSelect={handleDateChange} />
            )}
            <div className="outlined-field">
              <span className="outlined-field__label">Account</span>
              <Select
                value={accountFilter}
                disabled={accountsLoading}
                onValueChange={setAccountFilter}
              >
                <SelectTrigger className="outlined-field__control w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.account}>
                      {account.account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="summary-refresh-button"
              onClick={loadSummary}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <ErrorState message={error} onRetry={loadSummary} />
          </Card>
        </div>
      )}

      <Section title="Totals">
        <Card>
          {loading && !hasLoaded ? (
            <Spinner />
          ) : summary ? (
            <div className="summary-grid">
              <SummaryMetric label="Accounts" value={formatCount(visibleTotals.accounts)} />
              <SummaryMetric label="Up shares" value={formatShares(visibleTotals.upShares)} />
              <SummaryMetric label="Down shares" value={formatShares(visibleTotals.downShares)} />
              <SummaryMetric label="Total cost" value={`$${formatUsd(visibleTotals.totalCost)}`} />
            </div>
          ) : (
            <div className="state">No trades for this market</div>
          )}
        </Card>
      </Section>

      <Section title="By account">
        <Card>
          {loading && !hasLoaded ? (
            <Spinner />
          ) : (
            <TradeSummaryTable rows={visibleRows} />
          )}
        </Card>
      </Section>
    </main>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="summary-metric">
      <div className="summary-metric__label">{label}</div>
      <div className={`summary-metric__value ${tone ? `is-${tone}` : ''}`}>
        {value}
      </div>
    </div>
  );
}

function TradeSummaryTable({ rows }: { rows: TradeAccountSummary[] }) {
  if (rows.length === 0) {
    return <div className="state">No trades for this market</div>;
  }

  return (
    <div className="table-wrap table-wrap--fixed">
      <table className="table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Up Shares</th>
            <th>Up Avg</th>
            <th>Down Shares</th>
            <th>Down Avg</th>
            <th>Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.account}>
              <td>{row.account}</td>
              <td>{formatShares(row.upShares)}</td>
              <td>{formatNullablePrice(row.upAvgPrice)}</td>
              <td>{formatShares(row.downShares)}</td>
              <td>{formatNullablePrice(row.downAvgPrice)}</td>
              <td>${formatUsd(row.totalCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatShares(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatNullablePrice(value: number | null): string {
  return value === null ? 'N/A' : formatPrice(value);
}

function summarizeVisibleRows(rows: TradeAccountSummary[]): TradeSummaryTotals {
  return rows.reduce<TradeSummaryTotals>(
    (totals, row) => ({
      accounts: totals.accounts + 1,
      upShares: totals.upShares + row.upShares,
      downShares: totals.downShares + row.downShares,
      totalCost: totals.totalCost + row.totalCost,
      liveValue: null,
      pnl: null,
      tradeCount: totals.tradeCount + row.tradeCount,
      invalidTradeCount: totals.invalidTradeCount + row.invalidTradeCount,
    }),
    {
      accounts: 0,
      upShares: 0,
      downShares: 0,
      totalCost: 0,
      liveValue: null,
      pnl: null,
      tradeCount: 0,
      invalidTradeCount: 0,
    },
  );
}

async function resolveSelectedMarketWindow(
  historyMode: HistoryMode,
  marketDate: string,
  windowStartTs: number,
): Promise<{ conditionId?: string; from: string; to: string }> {
  if (historyMode === 'last_trade') {
    const market = await resolvePolyMarket({
      marketId: BTC_DAILY_MARKET_ID,
      marketDate,
      timestamp: timestampForDailyMarket(marketDate),
    });
    const window = dailyMarketWindow(marketDate);
    return {
      conditionId: market.conditionId,
      from: new Date(window.from).toISOString(),
      to: new Date(window.to).toISOString(),
    };
  }

  const dashboard = await getBtcDashboard({
    historyMode: '4h',
    marketDate,
    outcome: 'all',
    windowStartTs,
  });
  const fallbackFrom = windowStartTs * 1000;
  const fallbackTo = fallbackFrom + FOUR_HOURS_MS;
  return {
    conditionId: dashboard.chart?.conditionId ?? undefined,
    from: new Date(dashboard.chart?.from ?? fallbackFrom).toISOString(),
    to: new Date(dashboard.chart?.to ?? fallbackTo).toISOString(),
  };
}

function timestampForDailyMarket(marketDate: string): number {
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day) return Date.now();
  return Date.UTC(year, month - 1, day, 3, 0, 0, 0);
}

function dailyMarketWindow(marketDate: string): { from: number; to: number } {
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day) {
    const now = Date.now();
    return { from: now - 24 * 60 * 60 * 1000, to: now };
  }

  const from = Date.UTC(year, month - 1, day, -7, 0, 0, 0);
  const end = from + 24 * 60 * 60 * 1000;
  const now = Date.now();
  return { from, to: now >= from && now < end ? now : end };
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
