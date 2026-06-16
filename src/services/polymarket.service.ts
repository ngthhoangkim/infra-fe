import { apiGet } from '@/services/api-client';
import { LastTradePoint } from '@/types/market.types';

export interface PolymarketHistory {
  tokenId: string;
  slug: string | null;
  conditionId: string | null;
  source: 'data-api' | 'clob';
  fidelity: number;
  from: number | null;
  to: number | null;
  points: LastTradePoint[];
}

export interface PolymarketQuery {
  tokenId?: string;
  slug?: string;
  marketDate?: string;
  side?: 'up' | 'down';
  range?: '1h' | '6h' | '12h' | '1d' | 'all';
  interval?: string; // 1d | 1w | 1m | max
  startTs?: number; // unix giây
  endTs?: number;
  fidelity?: number;
}

export function getPolymarketHistory(
  query: PolymarketQuery,
): Promise<PolymarketHistory> {
  return apiGet<PolymarketHistory>('/api/polymarket/history', {
    tokenId: query.tokenId,
    slug: query.slug,
    marketDate: query.marketDate,
    side: query.side,
    range: query.range,
    interval: query.interval,
    startTs: query.startTs,
    endTs: query.endTs,
    fidelity: query.fidelity,
  });
}
