import { BtcPoint, LastTradePoint, MarketChart, MarketSummary } from '@/types/market.types';
import { todayInVietnam } from '@/utils/datetime';
import { getKlines } from './binance';
import { getPolymarketHistory } from './polymarket';
import { PriceHistoryRow, PriceHistoryTable, queryPriceHistory } from './supabase-rest';

const PRICE_SCALE = 100;
const SUMMARIES_PAGE_SIZE = 1000;
const BTC_SYMBOL = 'BTCUSDT';

type ChartRange = '1h' | '6h' | '12h' | '1d' | 'all';

const RANGE_MS: Record<Exclude<ChartRange, 'all'>, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

interface PolymarketChartHistory {
  points: LastTradePoint[];
  conditionId: string | null;
  from: number | null;
  to: number | null;
}

export interface SummariesQuery {
  from?: string;
  to?: string;
  side?: string;
}

export interface ChartQuery {
  marketDate: string;
  side: 'up' | 'down';
  range: ChartRange;
  historyMode?: 'last_trade' | '4h';
  windowStartTs?: number;
  marketId?: string;
  conditionId?: string;
  from?: string;
  to?: string;
}

export async function getSummaries(
  query: SummariesQuery,
): Promise<MarketSummary[]> {
  const rows: PriceHistoryRow[] = [];
  const fromDate = query.from ?? (!query.to ? todayDate() : undefined);
  const toDate = query.to ?? (!query.from ? fromDate : undefined);

  for (let from = 0; ; from += SUMMARIES_PAGE_SIZE) {
    const to = from + SUMMARIES_PAGE_SIZE - 1;
    const params = new URLSearchParams({
      select: 'market_date,side,price,created_at',
      order: 'created_at.desc',
      offset: String(from),
      limit: String(SUMMARIES_PAGE_SIZE),
    });

    if (fromDate) params.set('market_date', `gte.${fromDate}`);
    if (toDate) params.append('market_date', `lte.${toDate}`);
    if (query.side) params.set('side', `eq.${query.side}`);

    const data = await queryPriceHistory(params);
    rows.push(...data);
    if (data.length < SUMMARIES_PAGE_SIZE) break;
    if (to < from) break;
  }

  return summarize(rows);
}

export async function getChart(query: ChartQuery): Promise<MarketChart> {
  const historyMode = query.historyMode ?? 'last_trade';
  const table = tableForHistoryMode(historyMode);
  const chartWindow = pickFixedChartWindow(query.marketDate, query.range);
  const explicitHistoryWindow = pickExplicitChartWindow(query.from, query.to);
  const supabaseHistoryWindow = explicitHistoryWindow ?? chartWindow;
  const polymarketHistory =
    historyMode === '4h'
      ? await queryPolymarketLastTrade(query, null)
      : await queryPolymarketLastTrade(query, explicitHistoryWindow).catch(
          async () => ({
            points: await querySupabaseLastTrade(
              query,
              historyMode,
              table,
              supabaseHistoryWindow,
            ),
            conditionId: query.conditionId ?? null,
            from: null,
            to: null,
          }),
        );
  let lastTrade = polymarketHistory.points;

  let from =
    historyMode === '4h' ? polymarketHistory.from : chartWindow?.from ?? null;
  let to = historyMode === '4h' ? polymarketHistory.to : chartWindow?.to ?? null;

  const filterWindow =
    historyMode === 'last_trade' ? explicitHistoryWindow : null;

  if (filterWindow) {
    lastTrade = lastTrade.filter(
      (point) => point.time >= filterWindow.from && point.time < filterWindow.to,
    );
  } else if (query.range !== 'all' && lastTrade.length > 0) {
    const latest = lastTrade[lastTrade.length - 1].time;
    const cutoff = latest - RANGE_MS[query.range];
    lastTrade = lastTrade.filter((point) => point.time >= cutoff);
  }

  if (!chartWindow && lastTrade.length > 0) {
    from = lastTrade[0].time;
    to = lastTrade[lastTrade.length - 1].time;
  }

  if (from === null || to === null) {
    return {
      marketDate: query.marketDate,
      side: query.side,
      range: query.range,
      historyMode,
      conditionId: polymarketHistory.conditionId,
      from: null,
      to: null,
      binanceInterval: null,
      lastTrade: [],
      btc: [],
    };
  }

  const interval = pickBinanceInterval(to - from);
  const klines = await getKlines({
    symbol: BTC_SYMBOL,
    interval,
    limit: 1000,
    startTime: from,
    endTime: to,
  });

  return {
    marketDate: query.marketDate,
    side: query.side,
    range: query.range,
    historyMode,
    conditionId: polymarketHistory.conditionId,
    from,
    to,
    binanceInterval: interval,
    lastTrade,
    btc: klines.map<BtcPoint>((kline) => ({
      time: kline.openTime,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    })),
  };
}

async function queryPolymarketLastTrade(
  query: ChartQuery,
  historyWindow: { from: number; to: number } | null,
): Promise<PolymarketChartHistory> {
  const history = await getPolymarketHistory({
    marketDate: query.marketDate,
    side: query.side,
    range: query.range,
    historyMode: query.historyMode ?? 'last_trade',
    windowStartTs: query.windowStartTs,
    startTs: historyWindow ? Math.floor(historyWindow.from / 1000) : undefined,
    endTs: historyWindow ? Math.floor(historyWindow.to / 1000) : undefined,
    fidelity: fidelityForRange(query.range, query.historyMode ?? 'last_trade'),
  });

  return {
    conditionId: history.conditionId ?? query.conditionId ?? null,
    from: history.from,
    to: history.to,
    points: history.points.map((point) => ({
      time: point.time,
      createdAt: new Date(point.time).toISOString(),
      price: point.price,
      marketId: query.marketId ?? null,
      conditionId: history.conditionId ?? query.conditionId ?? null,
    })),
  };
}

async function querySupabaseLastTrade(
  query: ChartQuery,
  historyMode: 'last_trade' | '4h',
  table: PriceHistoryTable,
  historyWindow: { from: number; to: number } | null,
): Promise<LastTradePoint[]> {
  const params = new URLSearchParams({
    select:
      historyMode === '4h'
        ? 'created_at,price,market_id,condition_id,market_slug,window_start_ts'
        : 'created_at,price,market_id,condition_id',
    side: `eq.${query.side}`,
    order: 'created_at.asc',
    limit: '5000',
  });
  if (historyMode !== '4h') {
    params.set('market_date', `eq.${query.marketDate}`);
  } else if (query.windowStartTs !== undefined) {
    params.set('window_start_ts', `eq.${query.windowStartTs}`);
  }
  if (query.marketId) params.set('market_id', `eq.${query.marketId}`);
  if (query.conditionId) params.set('condition_id', `eq.${query.conditionId}`);
  if (historyWindow) {
    params.set('created_at', `gte.${new Date(historyWindow.from).toISOString()}`);
    params.append('created_at', `lt.${new Date(historyWindow.to).toISOString()}`);
  }

  const rows = await queryPriceHistory(params, table);
  return rows.map((row) => ({
    time: new Date(row.created_at).getTime(),
    createdAt: row.created_at,
    price: Number(row.price) * PRICE_SCALE,
    marketId: row.market_id ?? null,
    conditionId: row.condition_id ?? null,
  }));
}

function tableForHistoryMode(historyMode: 'last_trade' | '4h'): PriceHistoryTable {
  return historyMode === '4h'
    ? 'price_history_4h_last_trade'
    : 'price_history_last_trade';
}

function todayDate(): string {
  return todayInVietnam();
}

function pickFixedChartWindow(
  marketDate: string,
  range: ChartRange,
): { from: number; to: number } | null {
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const from = Date.UTC(year, month - 1, day, -7, 0, 0, 0);
  const span = range === 'all' ? 24 * 60 * 60 * 1000 : RANGE_MS[range];
  const endOfWindow = from + span;
  const now = Date.now();
  const to = now >= from && now < endOfWindow ? now : endOfWindow;

  return { from, to };
}

function pickExplicitChartWindow(
  fromValue?: string,
  toValue?: string,
): { from: number; to: number } | null {
  if (!fromValue || !toValue) return null;

  const from = new Date(fromValue).getTime();
  const to = new Date(toValue).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return null;
  }

  const now = Date.now();
  return {
    from,
    to: now >= from && now < to ? now : to,
  };
}

function pickBinanceInterval(spanMs: number): string {
  const hour = 60 * 60 * 1000;
  if (spanMs <= hour) return '1m';
  if (spanMs <= 12 * hour) return '5m';
  if (spanMs <= 24 * hour) return '15m';
  if (spanMs <= 3 * 24 * hour) return '1h';
  return '4h';
}

function fidelityForRange(
  range: ChartRange,
  historyMode: 'last_trade' | '4h',
): number {
  if (range === '1h') return 1;
  if (range === '6h') return 5;
  if (range === '12h') return 10;
  return historyMode === '4h' ? 1 : 15;
}

function summarize(rows: PriceHistoryRow[]): MarketSummary[] {
  interface Acc {
    market_date: string;
    side: string;
    count: number;
    first: PriceHistoryRow;
    last: PriceHistoryRow;
  }

  const groups = new Map<string, Acc>();
  for (const row of rows) {
    const marketDate = row.market_date ?? '';
    const key = `${marketDate}__${row.side}`;
    const acc = groups.get(key);
    if (!acc) {
      groups.set(key, {
        market_date: marketDate,
        side: row.side,
        count: 1,
        first: row,
        last: row,
      });
      continue;
    }
    acc.count++;
    if (row.created_at < acc.first.created_at) acc.first = row;
    if (row.created_at > acc.last.created_at) acc.last = row;
  }

  return [...groups.values()]
    .map((acc) => ({
      market_date: acc.market_date,
      side: acc.side,
      count: acc.count,
      lastPrice: Number(acc.last.price) * PRICE_SCALE,
      firstTradeAt: acc.first.created_at,
      lastTradeAt: acc.last.created_at,
    }))
    .sort((a, b) =>
      a.market_date === b.market_date
        ? a.side.localeCompare(b.side)
        : b.market_date.localeCompare(a.market_date),
    );
}
