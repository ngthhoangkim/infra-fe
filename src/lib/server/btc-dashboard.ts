import {
  OutcomeFilter,
  Side,
} from '@/constants/config';
import {
  BtcDashboardErrors,
  BtcDashboardPayload,
  BtcDashboardQuery,
  BtcDashboardTimings,
} from '@/types/dashboard.types';
import { MarketChart } from '@/types/market.types';
import { PolyMarket } from '@/types/poly-market.types';
import { TradeAccountRecord, TradeRecord } from '@/types/trade.types';
import { getChart } from './markets';
import { resolveAndUpsertPolyMarket } from './poly-markets';
import { queryTradeAccounts, queryTradesByAccountId } from './trades';

const BTC_DAILY_MARKET_ID = 'btc-updown-daily';
const TRADE_LIMIT = 500;

export async function getBtcDashboard(
  query: BtcDashboardQuery,
): Promise<BtcDashboardPayload> {
  const startedAt = Date.now();
  const errors: BtcDashboardErrors = {};
  const timings: BtcDashboardTimings = {};
  const historyMode = query.historyMode ?? 'last_trade';
  const outcome = query.outcome ?? query.side ?? 'all';

  const accountsPromise = timed('accounts', timings, queryTradeAccounts).catch(
    (error) => {
      errors.accounts = errorMessage(error, 'Lỗi tải account trade');
      return [] as TradeAccountRecord[];
    },
  );

  const marketPromise =
    historyMode === '4h'
      ? Promise.resolve(null)
      : timed('market', timings, () =>
          resolveAndUpsertPolyMarket({
            marketId: BTC_DAILY_MARKET_ID,
            marketDate: query.marketDate,
            timestamp: timestampForMarket(query.marketDate),
          }),
        ).catch((error) => {
          errors.market = errorMessage(error, 'Lỗi resolve Polymarket market');
          return null;
        });

  const [accounts, polyMarket] = await Promise.all([
    accountsPromise,
    marketPromise,
  ]);

  const chart = await timed('chart', timings, () =>
    loadChart(query, outcome, historyMode, polyMarket),
  ).catch((error) => {
    errors.chart = errorMessage(error, 'Lỗi tải dữ liệu chart');
    return null;
  });

  const trades = await timed('trades', timings, () =>
    loadTrades(query, outcome, accounts, chart, polyMarket),
  ).catch((error) => {
    errors.trades = errorMessage(error, 'Lỗi tải dữ liệu trade');
    return [] as TradeRecord[];
  });

  timings.total = Date.now() - startedAt;
  logTimings(timings, errors);

  return {
    accounts,
    chart,
    errors,
    polyMarket,
    timings,
    trades,
  };
}

async function loadChart(
  query: BtcDashboardQuery,
  outcome: OutcomeFilter,
  historyMode: 'last_trade' | '4h',
  polyMarket: PolyMarket | null,
): Promise<MarketChart> {
  if (outcome !== 'all') {
    return loadSideChart(query, outcome, historyMode, polyMarket);
  }

  const [upChart, downChart] = await Promise.all([
    loadSideChart(query, 'up', historyMode, polyMarket),
    loadSideChart(query, 'down', historyMode, polyMarket),
  ]);
  const baseChart = upChart.btc.length || upChart.lastTrade.length ? upChart : downChart;
  const lastTrade = [...upChart.lastTrade, ...downChart.lastTrade].sort(
    (a, b) => a.time - b.time,
  );

  return {
    ...baseChart,
    side: 'all',
    conditionId: upChart.conditionId ?? downChart.conditionId,
    lastTrade,
    lastTradeUp: upChart.lastTrade,
    lastTradeDown: downChart.lastTrade,
  };
}

function loadSideChart(
  query: BtcDashboardQuery,
  side: Side,
  historyMode: 'last_trade' | '4h',
  polyMarket: PolyMarket | null,
): Promise<MarketChart> {
  return getChart({
    marketDate: query.marketDate,
    side,
    range: '1d',
    historyMode,
    windowStartTs: historyMode === '4h' ? query.windowStartTs : undefined,
    conditionId:
      historyMode === 'last_trade' ? polyMarket?.conditionId : undefined,
    from:
      historyMode === 'last_trade'
        ? (polyMarket?.windowStartAt ?? undefined)
        : undefined,
    to:
      historyMode === 'last_trade'
        ? (polyMarket?.windowEndAt ?? undefined)
        : undefined,
  });
}

async function loadTrades(
  query: BtcDashboardQuery,
  outcome: OutcomeFilter,
  accounts: TradeAccountRecord[],
  chart: MarketChart | null,
  polyMarket: PolyMarket | null,
): Promise<TradeRecord[]> {
  const conditionId = chart?.conditionId ?? polyMarket?.conditionId;
  if (
    typeof chart?.from !== 'number' ||
    typeof chart.to !== 'number' ||
    !conditionId
  ) {
    return [];
  }

  const accountId =
    query.account && query.account !== 'all'
      ? accounts.find((item) => item.account === query.account)?.id
      : undefined;
  if (query.account && query.account !== 'all' && !accountId) return [];

  return queryTradesByAccountId({
    accountId,
    conditionId,
    outcome: outcome === 'all' ? undefined : outcome,
    from: new Date(chart.from).toISOString(),
    to: new Date(chart.to).toISOString(),
    limit: TRADE_LIMIT,
  });
}

async function timed<T>(
  label: keyof BtcDashboardTimings,
  timings: BtcDashboardTimings,
  loader: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    return await loader();
  } finally {
    timings[label] = Date.now() - startedAt;
  }
}

function timestampForMarket(marketDate: string): number {
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day) return Date.now();
  return Date.UTC(year, month - 1, day, 3, 0, 0, 0);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function logTimings(
  timings: BtcDashboardTimings,
  errors: BtcDashboardErrors,
): void {
  if (process.env.NODE_ENV === 'production') return;
  console.info('[btc-dashboard]', { timings, errors });
}
