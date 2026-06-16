import { apiGet } from '@/services/api-client';
import { ChartQuery, MarketChart, MarketSummary } from '@/types/market.types';

interface SummariesQuery {
  from?: string;
  to?: string;
  side?: 'up' | 'down';
}

export function getSummaries(
  query: SummariesQuery = {},
): Promise<MarketSummary[]> {
  return apiGet<MarketSummary[]>('/api/markets/summaries', {
    from: query.from,
    to: query.to,
    side: query.side,
  });
}

export function getChart(query: ChartQuery): Promise<MarketChart> {
  return apiGet<MarketChart>('/api/markets/chart', {
    marketDate: query.marketDate,
    side: query.side,
    range: query.range,
  });
}
