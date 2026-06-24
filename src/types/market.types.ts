import { HistoryMode, Range, Side } from '@/constants/config';

export interface MarketSummary {
  market_date: string;
  side: string;
  count: number;
  lastPrice: number;
  firstTradeAt: string;
  lastTradeAt: string;
}

export interface LastTradePoint {
  time: number; // epoch ms UTC
  createdAt?: string; // timestamp gốc từ Supabase, nếu có
  price: number; // cents 0..100 (= xác suất %)
  marketId?: string | null;
  conditionId?: string | null;
}

export interface BtcPoint {
  time: number; // epoch ms UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketChart {
  marketDate: string;
  side: string;
  range: Range;
  historyMode: HistoryMode;
  conditionId?: string | null;
  from: number | null;
  to: number | null;
  binanceInterval: string | null;
  lastTrade: LastTradePoint[];
  lastTradeUp?: LastTradePoint[];
  lastTradeDown?: LastTradePoint[];
  btc: BtcPoint[];
}

export interface ChartQuery {
  marketDate: string;
  side: Side;
  range?: Range;
  historyMode?: HistoryMode;
  windowStartTs?: number;
  marketId?: string;
  conditionId?: string;
  from?: string;
  to?: string;
}
