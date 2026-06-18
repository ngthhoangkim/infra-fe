import { apiGet } from '@/services/api-client';
import {
  PolyMarket,
  ResolvePolyMarketQuery,
} from '@/types/poly-market.types';

export function resolvePolyMarket(
  query: ResolvePolyMarketQuery,
): Promise<PolyMarket> {
  return apiGet<PolyMarket>('/api/poly-markets/resolve', {
    marketId: query.marketId,
    marketDate: query.marketDate,
    timestamp: query.timestamp,
  });
}
