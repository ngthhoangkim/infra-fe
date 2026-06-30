'use client';

import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import {
  Fragment,
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
  TradeMarketSummary,
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
const ALL_DATES = 'all';

export default function TradesSummaryPage() {
  const [summary, setSummary] = useState<TradeSummaryResponse | null>(null);
  const [historyMode, setHistoryMode] = useState<HistoryMode>('last_trade');
  const [marketDate, setMarketDate] = useState<string>(ALL_DATES);
  const [windowStartTs, setWindowStartTs] = useState(() =>
    defaultWindowStartTs(datePartsInNewYork(new Date())),
  );
  const [accounts, setAccounts] = useState<TradeAccountRecord[]>([]);
  const [accountFilter, setAccountFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    () => new Set(),
  );
  const requestSeq = useRef(0);
  const hasLoaded = summary !== null || error !== '';

  const visibleMarkets = useMemo(
    () =>
      normalizeMarketsForSelectedDate(
        summary?.overallMarkets ?? [],
        marketDate,
      ),
    [marketDate, summary?.overallMarkets],
  );
  const visibleOverall = useMemo(
    () => summarizeMarketPerformance(visibleMarkets, accountFilter),
    [accountFilter, visibleMarkets],
  );
  const accountRows = useMemo(
    () => buildAccountPerformanceRows(visibleMarkets, accountFilter),
    [accountFilter, visibleMarkets],
  );
  const isDailySpecificDate =
    historyMode === 'last_trade' && marketDate !== ALL_DATES;
  const selectedDateTotals = useMemo(
    () => summarizeVisibleRows(accountRows.map((row) => row.summary)),
    [accountRows],
  );
  const selectedDateWin = useMemo(
    () => resolveMarketsWin(visibleMarkets, accountFilter),
    [accountFilter, visibleMarkets],
  );

  const loadSummary = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    setLoading(true);
    setError('');
    try {
      const selectedMarket =
        historyMode === 'last_trade' && marketDate === ALL_DATES
          ? {}
          : await resolveSelectedMarketWindow(
              historyMode,
              marketDate === ALL_DATES ? currentDailyMarketDate() : marketDate,
              windowStartTs,
            );
      const data = await getTradeSummary({ ...selectedMarket, historyMode });
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

  useEffect(() => {
    setExpandedAccounts(new Set());
  }, [accountFilter, historyMode, marketDate, windowStartTs]);

  const handleModeChange = (mode: HistoryMode) => {
    setHistoryMode(mode);
    if (mode === 'last_trade') {
      setMarketDate(ALL_DATES);
    } else if (marketDate === ALL_DATES) {
      const today = datePartsInNewYork(new Date());
      setMarketDate(today);
      setWindowStartTs(defaultWindowStartTs(today));
    }
  };

  const handleDateChange = (date: string) => {
    setMarketDate(date);
    if (date !== ALL_DATES) {
      setWindowStartTs(defaultWindowStartTs(date));
    }
  };

  const handleFourHourWindowChange = (value: {
    marketDate: string;
    windowStartTs: number;
  }) => {
    setMarketDate(value.marketDate);
    setWindowStartTs(value.windowStartTs);
  };

  return (
    <main className="container summary-page">
      <Card>
        <div className="summary-header">
          <div>
            <h1 className="market-header__symbol">Trade Summary</h1>
            <div className="topbar__note">
              {historyMode === '4h' ? '4H window' : 'Daily market'}
              {summary?.prices.source ? ` · price: ${summary.prices.source}` : ''}
              {summary?.result ? ` · result: ${formatResult(summary.result)}` : ''}
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
              <DateTabs
                selected={marketDate}
                onSelect={handleDateChange}
                includeAll
              />
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

      <Section title="Overall Summary">
        <Card>
          {loading && !hasLoaded ? (
            <Spinner />
          ) : summary ? (
            <div className="summary-stack">
              <div className="summary-block">
                <div className="summary-block__label">
                  Overall · selected filter
                </div>
                <div className="summary-grid summary-grid--overall">
                  {isDailySpecificDate ? (
                    <>
                      <SummaryMetric
                        label="Accounts"
                        value={formatCount(selectedDateTotals.accounts)}
                      />
                      <SummaryMetric
                        label="Up shares"
                        value={formatShares(selectedDateTotals.upShares)}
                      />
                      <SummaryMetric
                        label="Up avg"
                        value={formatPrice(visibleOverall.upAvgPrice)}
                      />
                      <SummaryMetric
                        label="Down shares"
                        value={formatShares(selectedDateTotals.downShares)}
                      />
                      <SummaryMetric
                        label="Down avg"
                        value={formatPrice(visibleOverall.downAvgPrice)}
                      />
                      <SummaryMetric
                        label="Total cost"
                        value={formatUsd(selectedDateTotals.totalCost)}
                      />
                      <SummaryMetric
                        label="Win"
                        value={formatBreakdownWin(selectedDateWin)}
                        tone={selectedDateWin === 'mixed' ? 'neutral' : selectedDateWin ?? 'neutral'}
                      />
                      <SummaryMetric
                        label="Total PnL"
                        value={formatNullableSignedUsd(visibleOverall.pnl)}
                        tone={profitTone(visibleOverall.pnl)}
                      />
                      <SummaryMetric
                        label="ROI"
                        value={formatNullableSignedPercent(visibleOverall.roi)}
                        tone={profitTone(visibleOverall.roi)}
                      />
                      <SummaryMetric
                        label="Sharpe ratio"
                        value={formatNullableRatio(visibleOverall.sharpeRatio)}
                      />
                      <SummaryMetric
                        label="Max loss"
                        value={formatNullableSignedUsd(visibleOverall.maxLoss)}
                        tone={profitTone(visibleOverall.maxLoss)}
                      />
                    </>
                  ) : (
                    <>
                      <SummaryMetric
                        label="Accounts"
                        value={formatCount(visibleOverall.accounts)}
                      />
                      <SummaryMetric
                        label="Up shares"
                        value={formatShares(visibleOverall.upShares)}
                      />
                      <SummaryMetric
                        label="Up avg"
                        value={formatPrice(visibleOverall.upAvgPrice)}
                      />
                      <SummaryMetric
                        label="Down shares"
                        value={formatShares(visibleOverall.downShares)}
                      />
                      <SummaryMetric
                        label="Down avg"
                        value={formatPrice(visibleOverall.downAvgPrice)}
                      />
                      <SummaryMetric
                        label="Total cost"
                        value={formatUsd(visibleOverall.totalCost)}
                      />
                      <SummaryMetric
                        label="Total PnL"
                        value={formatNullableSignedUsd(visibleOverall.pnl)}
                        tone={profitTone(visibleOverall.pnl)}
                      />
                      <SummaryMetric
                        label="ROI"
                        value={formatNullableSignedPercent(visibleOverall.roi)}
                        tone={profitTone(visibleOverall.roi)}
                      />
                      <SummaryMetric
                        label="Sharpe ratio"
                        value={formatNullableRatio(visibleOverall.sharpeRatio)}
                      />
                      <SummaryMetric
                        label="Max loss"
                        value={formatNullableSignedUsd(visibleOverall.maxLoss)}
                        tone={profitTone(visibleOverall.maxLoss)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="state">No trades for this market</div>
          )}
        </Card>
      </Section>

      <section className="section summary-list-section">
        <Card className="summary-list-card">
          <h2 className="section__title summary-list-title">Account Summary</h2>
          {loading && !hasLoaded ? (
            <Spinner />
          ) : (
            <TradeSummaryTable
              rows={accountRows}
              expandedAccounts={expandedAccounts}
              canExpand={historyMode === 'last_trade' && marketDate === ALL_DATES}
              onToggleAccount={(account) =>
                setExpandedAccounts((current) => {
                  const next = new Set(current);
                  if (next.has(account)) {
                    next.delete(account);
                  } else {
                    next.add(account);
                  }
                  return next;
                })
              }
            />
          )}
        </Card>
      </section>
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

function TradeSummaryTable({
  rows,
  expandedAccounts,
  canExpand,
  onToggleAccount,
}: {
  rows: AccountPerformanceRow[];
  expandedAccounts: Set<string>;
  canExpand: boolean;
  onToggleAccount: (account: string) => void;
}) {
  if (rows.length === 0) {
    return <div className="state">No trades for this filter</div>;
  }

  return (
    <div className="table-wrap table-wrap--fixed summary-list-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Account</th>
            <th>PnL</th>
            <th>ROI</th>
            <th>Sharpe Ratio</th>
            <th>Max Loss</th>
            {canExpand && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.account}>
              <tr
                className={canExpand ? 'summary-account-row' : undefined}
                onClick={() => {
                  if (canExpand) onToggleAccount(row.account);
                }}
              >
                <td>{row.account}</td>
                <td className={profitClass(row.summary.pnl)}>
                  {formatNullableSignedUsd(row.summary.pnl)}
                </td>
                <td className={profitClass(row.roi)}>
                  {formatNullableSignedPercent(row.roi)}
                </td>
                <td>{formatNullableRatio(row.sharpeRatio)}</td>
                <td className={profitClass(row.maxLoss)}>
                  {formatNullableSignedUsd(row.maxLoss)}
                </td>
                {canExpand && (
                  <td>
                    <button
                      type="button"
                      className="summary-expand-button"
                      aria-expanded={expandedAccounts.has(row.account)}
                      aria-label={`Toggle ${row.account} daily breakdown`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleAccount(row.account);
                      }}
                    >
                      {expandedAccounts.has(row.account) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  </td>
                )}
              </tr>
              {canExpand && expandedAccounts.has(row.account) && (
                <tr className="summary-breakdown-row">
                  <td colSpan={6}>
                    <AccountDailyBreakdown rows={row.dailyBreakdown} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountDailyBreakdown({ rows }: { rows: DailyBreakdownRow[] }) {
  if (rows.length === 0) {
    return <div className="state">No daily breakdown for this account</div>;
  }

  return (
    <div className="summary-breakdown">
      <table className="table summary-breakdown__table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Up Shares</th>
            <th>Up Avg</th>
            <th>Down Shares</th>
            <th>Down Avg</th>
            <th>Total Cost</th>
            <th>PnL</th>
            <th>ROI</th>
            <th>Win</th>
            <th>Max Loss</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{formatShares(row.summary.upShares)}</td>
              <td>{formatNullablePrice(row.summary.upAvgPrice)}</td>
              <td>{formatShares(row.summary.downShares)}</td>
              <td>{formatNullablePrice(row.summary.downAvgPrice)}</td>
              <td>{formatUsd(row.summary.totalCost)}</td>
              <td className={profitClass(row.summary.pnl)}>
                {formatNullableSignedUsd(row.summary.pnl)}
              </td>
              <td className={profitClass(row.roi)}>
                {formatNullableSignedPercent(row.roi)}
              </td>
              <td>{formatBreakdownWin(row.win)}</td>
              <td className={profitClass(row.maxLoss)}>
                {formatNullableSignedUsd(row.maxLoss)}
              </td>
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

function formatNullableSignedUsd(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatUsd(Math.abs(value))}`;
}

function formatNullableSignedPercent(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatPercent(Math.abs(value))}`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value * 100)}%`;
}

function formatNullableRatio(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatResult(result: 'up' | 'down'): string {
  return result === 'up' ? 'Up' : 'Down';
}

function formatBreakdownWin(result: 'up' | 'down' | 'mixed' | null): string {
  if (result === 'mixed') return 'Mixed';
  return result ? formatResult(result) : 'N/A';
}

function resolveMarketsWin(
  markets: TradeMarketSummary[],
  accountFilter: string,
): 'up' | 'down' | 'mixed' | null {
  const results = new Set<'up' | 'down'>();

  for (const market of markets) {
    const rows =
      accountFilter === 'all'
        ? market.rows
        : market.rows.filter((row) => row.account === accountFilter);
    if (rows.length === 0 || market.result === null) continue;
    results.add(market.result);
  }

  if (results.size === 0) return null;
  if (results.size > 1) return 'mixed';
  return [...results][0];
}

function profitTone(value: number | null): 'up' | 'down' | 'neutral' {
  if (value === null || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

function profitClass(value: number | null): string {
  const tone = profitTone(value);
  if (tone === 'neutral') return '';
  return `pnl is-${tone}`;
}

function summarizeVisibleRows(rows: TradeAccountSummary[]): TradeSummaryTotals {
  const totals = rows.reduce<TradeSummaryTotals>(
    (acc, row) => ({
      accounts: acc.accounts + 1,
      upShares: acc.upShares + row.upShares,
      downShares: acc.downShares + row.downShares,
      totalCost: acc.totalCost + row.totalCost,
      liveValue: (acc.liveValue ?? 0) + (row.liveValue ?? 0),
      pnl: (acc.pnl ?? 0) + (row.pnl ?? 0),
      tradeCount: acc.tradeCount + row.tradeCount,
      invalidTradeCount: acc.invalidTradeCount + row.invalidTradeCount,
    }),
    {
      accounts: 0,
      upShares: 0,
      downShares: 0,
      totalCost: 0,
      liveValue: 0,
      pnl: 0,
      tradeCount: 0,
      invalidTradeCount: 0,
    },
  );

  return totals;
}

interface MarketPerformanceSummary {
  accounts: number;
  upShares: number;
  upAvgPrice: number;
  downShares: number;
  downAvgPrice: number;
  totalCost: number;
  pnl: number;
  roi: number;
  sharpeRatio: number;
  maxLoss: number;
}

interface AccountMarketEntry {
  date: string;
  result: 'up' | 'down' | null;
  summary: TradeAccountSummary;
}

interface AccountPerformanceRow {
  account: string;
  summary: TradeAccountSummary;
  roi: number | null;
  sharpeRatio: number | null;
  maxLoss: number | null;
  dailyBreakdown: DailyBreakdownRow[];
}

interface DailyBreakdownRow {
  date: string;
  summary: TradeAccountSummary;
  roi: number | null;
  win: 'up' | 'down' | 'mixed' | null;
  maxLoss: number | null;
}

function normalizeMarketsForSelectedDate(
  markets: TradeMarketSummary[],
  selectedDate: string,
): TradeMarketSummary[] {
  if (selectedDate === ALL_DATES) return markets;
  return markets.map((market) => ({
    ...market,
    summaryDate: selectedDate,
  }));
}

function summarizeMarketPerformance(
  markets: TradeMarketSummary[],
  accountFilter: string,
): MarketPerformanceSummary {
  const accountRows = buildAccountPerformanceRows(markets, accountFilter);
  const marketTotals = markets
    .map((market) =>
      summarizeVisibleRows(
        accountFilter === 'all'
          ? market.rows
          : market.rows.filter((row) => row.account === accountFilter),
      ),
    )
    .filter((totals) => totals.tradeCount > 0);

  if (marketTotals.length === 0) {
    return {
      accounts: 0,
      upShares: 0,
      upAvgPrice: 0,
      downShares: 0,
      downAvgPrice: 0,
      totalCost: 0,
      pnl: 0,
      roi: 0,
      sharpeRatio: 0,
      maxLoss: 0,
    };
  }

  const accountSummaries = accountRows.map((row) => row.summary);
  const upShares = accountSummaries.reduce((sum, row) => sum + row.upShares, 0);
  const downShares = accountSummaries.reduce(
    (sum, row) => sum + row.downShares,
    0,
  );
  const upCost = accountSummaries.reduce((sum, row) => sum + row.upCost, 0);
  const downCost = accountSummaries.reduce((sum, row) => sum + row.downCost, 0);
  const totalCost = accountSummaries.reduce(
    (sum, row) => sum + row.totalCost,
    0,
  );
  const pnl = accountSummaries.reduce((sum, row) => sum + (row.pnl ?? 0), 0);
  const returns = marketTotals
    .filter((totals) => totals.totalCost > 0)
    .map((totals) => (totals.pnl ?? 0) / totals.totalCost);

  return {
    accounts: accountRows.length,
    upShares,
    upAvgPrice: upShares > 0 ? upCost / upShares : 0,
    downShares,
    downAvgPrice: downShares > 0 ? downCost / downShares : 0,
    totalCost,
    pnl,
    roi: totalCost <= 0 ? 0 : pnl / totalCost,
    sharpeRatio: calculateSharpeRatio(returns) ?? 0,
    maxLoss: Math.min(0, ...marketTotals.map((totals) => totals.pnl ?? 0)),
  };
}

function buildAccountPerformanceRows(
  markets: TradeMarketSummary[],
  accountFilter: string,
): AccountPerformanceRow[] {
  const accountEntries = new Map<string, AccountMarketEntry[]>();

  for (const market of markets) {
    for (const row of market.rows) {
      if (accountFilter !== 'all' && row.account !== accountFilter) continue;
      const entries = accountEntries.get(row.account) ?? [];
      entries.push({
        date: market.summaryDate,
        result: market.result,
        summary: row,
      });
      accountEntries.set(row.account, entries);
    }
  }

  return [...accountEntries.entries()]
    .map(([account, entries]) => {
      const summary = combineAccountSummaries(account, entries.map((entry) => entry.summary));
      const stats = calculatePerformanceStats(entries.map((entry) => entry.summary));

      return {
        account,
        summary,
        roi: stats.roi,
        sharpeRatio: stats.sharpeRatio,
        maxLoss: stats.maxLoss,
        dailyBreakdown: buildDailyBreakdown(account, entries),
      };
    })
    .sort((a, b) => {
      if (a.summary.pnl === null && b.summary.pnl === null) {
        return a.account.localeCompare(b.account);
      }
      if (a.summary.pnl === null) return 1;
      if (b.summary.pnl === null) return -1;
      return Math.abs(b.summary.pnl) - Math.abs(a.summary.pnl);
    });
}

function buildDailyBreakdown(
  account: string,
  entries: AccountMarketEntry[],
): DailyBreakdownRow[] {
  const byDate = new Map<string, AccountMarketEntry[]>();

  for (const entry of entries) {
    const dailyEntries = byDate.get(entry.date) ?? [];
    dailyEntries.push(entry);
    byDate.set(entry.date, dailyEntries);
  }

  return [...byDate.entries()]
    .map(([date, dailyEntries]) => {
      const summaries = dailyEntries.map((entry) => entry.summary);
      const stats = calculatePerformanceStats(summaries);

      return {
        date,
        summary: combineAccountSummaries(account, summaries),
        roi: stats.roi,
        win: resolveBreakdownWin(dailyEntries.map((entry) => entry.result)),
        maxLoss: stats.maxLoss,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function combineAccountSummaries(
  account: string,
  rows: TradeAccountSummary[],
): TradeAccountSummary {
  const totals = rows.reduce(
    (acc, row) => {
      acc.upShares += row.upShares;
      acc.downShares += row.downShares;
      acc.upCost += row.upCost;
      acc.downCost += row.downCost;
      acc.totalCost += row.totalCost;
      acc.tradeCount += row.tradeCount;
      acc.invalidTradeCount += row.invalidTradeCount;
      acc.liveValue += row.liveValue ?? 0;
      acc.pnl += row.pnl ?? 0;
      return acc;
    },
    {
      upShares: 0,
      downShares: 0,
      upCost: 0,
      downCost: 0,
      totalCost: 0,
      liveValue: 0,
      pnl: 0,
      tradeCount: 0,
      invalidTradeCount: 0,
    },
  );

  return {
    account,
    upShares: totals.upShares,
    downShares: totals.downShares,
    upCost: totals.upCost,
    downCost: totals.downCost,
    upAvgPrice: totals.upShares > 0 ? totals.upCost / totals.upShares : null,
    downAvgPrice:
      totals.downShares > 0 ? totals.downCost / totals.downShares : null,
    totalCost: totals.totalCost,
    liveValue: totals.liveValue,
    pnl: totals.pnl,
    tradeCount: totals.tradeCount,
    invalidTradeCount: totals.invalidTradeCount,
  };
}

function calculatePerformanceStats(rows: TradeAccountSummary[]): {
  roi: number | null;
  sharpeRatio: number | null;
  maxLoss: number | null;
} {
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
  const pnl = rows.reduce((sum, row) => sum + (row.pnl ?? 0), 0);
  const returns = rows
    .filter((row) => row.totalCost > 0)
    .map((row) => (row.pnl ?? 0) / row.totalCost);

  return {
    roi: totalCost <= 0 ? 0 : pnl / totalCost,
    sharpeRatio: calculateSharpeRatio(returns) ?? 0,
    maxLoss: Math.min(0, ...rows.map((row) => row.pnl ?? 0)),
  };
}

function resolveBreakdownWin(
  results: Array<'up' | 'down' | null>,
): 'up' | 'down' | 'mixed' | null {
  const resolved = [...new Set(results.filter((result): result is 'up' | 'down' => result !== null))];
  if (resolved.length === 0) return null;
  if (resolved.length > 1) return 'mixed';
  return resolved[0];
}

function calculateSharpeRatio(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return null;
  return (mean / stdev) * Math.sqrt(returns.length);
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
