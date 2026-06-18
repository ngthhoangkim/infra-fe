export const POLY_MARKET_IDS = [
  'btc-updown-daily',
  'btc-updown-15m',
  'btc-updown-5m',
] as const;

export type PolyMarketId = (typeof POLY_MARKET_IDS)[number];
export type PolyMarketInterval = 'daily' | '15m' | '5m';

export interface PolyMarket {
  conditionId: string;
  marketId: PolyMarketId;
  gammaMarketId: string | null;
  eventId: string | null;
  slug: string;
  marketDate: string | null;
  windowStartAt: string | null;
  windowEndAt: string | null;
  upTokenId: string | null;
  downTokenId: string | null;
  active: boolean | null;
  closed: boolean | null;
  syncedAt: string | null;
}

export interface ResolvePolyMarketQuery {
  marketId: PolyMarketId;
  marketDate?: string;
  timestamp?: number;
}
