import { apiGet } from '@/services/api-client';
import {
  BtcDashboardPayload,
  BtcDashboardQuery,
} from '@/types/dashboard.types';

export function getBtcDashboard(
  query: BtcDashboardQuery,
): Promise<BtcDashboardPayload> {
  return apiGet<BtcDashboardPayload>('/api/markets/btc-dashboard', {
    account: query.account === 'all' ? undefined : query.account,
    historyMode: query.historyMode,
    marketDate: query.marketDate,
    side: query.side,
    windowStartTs: query.windowStartTs,
  });
}
