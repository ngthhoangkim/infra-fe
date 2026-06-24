import { MarketChart } from './market.types';
import { OutcomeFilter } from '@/constants/config';
import { PolyMarket } from './poly-market.types';
import { TradeAccountRecord, TradeRecord } from './trade.types';

export interface BtcDashboardErrors {
  accounts?: string;
  chart?: string;
  market?: string;
  trades?: string;
}

export interface BtcDashboardTimings {
  accounts?: number;
  chart?: number;
  market?: number;
  trades?: number;
  total?: number;
}

export interface BtcDashboardPayload {
  accounts: TradeAccountRecord[];
  chart: MarketChart | null;
  errors: BtcDashboardErrors;
  polyMarket: PolyMarket | null;
  timings?: BtcDashboardTimings;
  trades: TradeRecord[];
}

export interface BtcDashboardQuery {
  account?: string;
  historyMode?: 'last_trade' | '4h';
  marketDate: string;
  outcome?: OutcomeFilter;
  side?: 'up' | 'down';
  windowStartTs?: number;
}
