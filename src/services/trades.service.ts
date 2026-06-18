import { apiGet } from '@/services/api-client';
import { apiPost } from '@/services/api-client';
import {
  TradeAccountRecord,
  TradeFilters,
  TradeInput,
  TradeRecord,
} from '@/types/trade.types';

export function getTrades(filters: TradeFilters = {}): Promise<TradeRecord[]> {
  return apiGet<TradeRecord[]>('/api/trades', {
    account: filters.account,
    marketId: filters.marketId,
    conditionId: filters.conditionId,
    outcome: filters.outcome,
    from: filters.from,
    to: filters.to,
    limit: filters.limit,
  });
}

export function getTradeAccounts(): Promise<TradeAccountRecord[]> {
  return apiGet<TradeAccountRecord[]>('/api/trade-accounts');
}

export function createTrades(trades: TradeInput[]): Promise<{ inserted: number }> {
  return apiPost<{ inserted: number }>('/api/trades', trades);
}
