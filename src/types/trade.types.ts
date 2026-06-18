export type TradeAccount = string;

export const TRADE_OUTCOMES = ['up', 'down'] as const;
export type TradeOutcome = (typeof TRADE_OUTCOMES)[number];

export interface TradeInput {
  marketId: string;
  conditionId?: string;
  account: TradeAccount;
  outcome: TradeOutcome;
  price: number;
  amount: number;
  timestamp: string;
}

export interface TradeRow {
  id: string;
  market_id: string;
  condition_id?: string | null;
  account_id: string;
  trade_accounts?: {
    account: TradeAccount;
  } | null;
  outcome: TradeOutcome;
  price: number | string;
  amount: number | string;
  trade_timestamp: string;
  created_at: string;
}

export interface TradeRecord {
  id: string;
  marketId: string;
  conditionId: string | null;
  accountId: string;
  account: TradeAccount;
  outcome: TradeOutcome;
  price: number;
  amount: number;
  timestamp: string;
  createdAt: string;
}

export interface TradeFilters {
  account?: TradeAccount;
  marketId?: string;
  conditionId?: string;
  outcome?: TradeOutcome;
  from?: string;
  to?: string;
  limit?: number;
}

export interface InsertTradesResult {
  inserted: number;
}

export interface TradeAccountRecord {
  id: string;
  account: TradeAccount;
  createdAt: string;
}
