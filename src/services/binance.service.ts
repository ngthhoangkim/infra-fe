import { apiGet } from '@/services/api-client';
import { Kline } from '@/types/binance.types';

interface KlinesQuery {
  symbol?: string;
  interval?: string;
  limit?: number;
}

/** Gọi endpoint klines thô của backend (passthrough có cache). */
export function getKlines(query: KlinesQuery = {}): Promise<Kline[]> {
  return apiGet<Kline[]>('/api/binance/klines', {
    symbol: query.symbol,
    interval: query.interval,
    limit: query.limit,
  });
}
