import { cacheTtlSeconds, cacheWrap } from './cache';

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const TRADES_PAGE = 500;
const MAX_TRADE_PAGES = 60;

export interface PolymarketPoint {
  time: number;
  price: number;
}

export interface PolymarketHistory {
  tokenId: string;
  slug: string | null;
  conditionId: string | null;
  source: 'data-api' | 'clob';
  fidelity: number;
  from: number | null;
  to: number | null;
  points: PolymarketPoint[];
}

interface HistoryQuery {
  tokenId?: string;
  slug?: string;
  marketDate?: string;
  side?: 'up' | 'down';
  range?: '1h' | '6h' | '12h' | '1d' | 'all';
  interval?: string;
  startTs?: number;
  endTs?: number;
  fidelity: number;
}

interface RawPricesHistory {
  history: { t: number; p: number }[];
}

interface RawGammaMarket {
  conditionId?: string;
  clobTokenIds?: string;
  outcomes?: string;
  startDate?: string;
  endDate?: string;
}

interface ResolvedMarket {
  slug: string;
  conditionId: string | null;
  upToken: string | null;
  downToken: string | null;
  startTs: number | null;
  endTs: number | null;
}

interface RawTrade {
  asset: string;
  price: number | string;
  timestamp: number;
}

export async function getPolymarketHistory(
  query: HistoryQuery,
): Promise<PolymarketHistory> {
  const side = query.side ?? 'up';
  const market = await resolveMarket(query);
  const tokenId =
    query.tokenId ?? (side === 'up' ? market?.upToken : market?.downToken);

  if (!tokenId) {
    throw new Error(
      'Cần truyền tokenId, slug, hoặc marketDate để xác định market Polymarket',
    );
  }

  const { startTs, endTs, fidelity } = resolveWindow(query, market);

  if (market?.conditionId) {
    try {
      const points = await getTradesHistory(
        market.conditionId,
        tokenId,
        fidelity,
        startTs,
        endTs,
      );
      if (points.length > 0) {
        return wrapResult(
          tokenId,
          market.slug,
          market.conditionId,
          'data-api',
          fidelity,
          points,
        );
      }
    } catch {
      // Fallback CLOB keeps the route useful when Data API is temporarily noisy.
    }
  }

  const points = await getClobHistory(
    tokenId,
    fidelity,
    query.interval,
    startTs,
    endTs,
  );

  return wrapResult(
    tokenId,
    market?.slug ?? null,
    market?.conditionId ?? null,
    'clob',
    fidelity,
    points,
  );
}

function resolveWindow(
  query: HistoryQuery,
  market: ResolvedMarket | null,
): { startTs?: number; endTs?: number; fidelity: number } {
  if (!query.range) {
    return {
      startTs: query.startTs ?? market?.startTs ?? undefined,
      endTs: query.endTs ?? market?.endTs ?? undefined,
      fidelity: query.fidelity,
    };
  }

  const fidelityByRange: Record<NonNullable<HistoryQuery['range']>, number> = {
    '1h': 1,
    '6h': 5,
    '12h': 10,
    '1d': 15,
    all: 15,
  };
  const secondsByRange = {
    '1h': 3600,
    '6h': 6 * 3600,
    '12h': 12 * 3600,
  };

  const now = Math.floor(Date.now() / 1000);
  const end = query.endTs ?? market?.endTs ?? now;
  const start =
    query.range === '1d' || query.range === 'all'
      ? query.startTs ?? market?.startTs ?? end - 86400
      : (query.startTs ?? end) - secondsByRange[query.range];

  return {
    startTs: start,
    endTs: end,
    fidelity: fidelityByRange[query.range],
  };
}

function wrapResult(
  tokenId: string,
  slug: string | null,
  conditionId: string | null,
  source: 'data-api' | 'clob',
  fidelity: number,
  points: PolymarketPoint[],
): PolymarketHistory {
  return {
    tokenId,
    slug,
    conditionId,
    source,
    fidelity,
    from: points.length ? points[0].time : null,
    to: points.length ? points[points.length - 1].time : null,
    points,
  };
}

async function getTradesHistory(
  conditionId: string,
  tokenId: string,
  fidelity: number,
  startTs?: number,
  endTs?: number,
): Promise<PolymarketPoint[]> {
  const key = `poly:trades:${conditionId}:${tokenId}:${fidelity}:${startTs ?? ''}:${endTs ?? ''}`;
  return cacheWrap(key, cacheTtlSeconds(), async () => {
    const trades = await fetchAllTrades(conditionId, startTs);
    const forToken = trades.filter(
      (trade) =>
        trade.asset === tokenId &&
        (startTs === undefined || trade.timestamp >= startTs) &&
        (endTs === undefined || trade.timestamp <= endTs),
    );
    return bucketLastTrade(forToken, fidelity);
  });
}

async function fetchAllTrades(
  conditionId: string,
  startTs?: number,
): Promise<RawTrade[]> {
  const all: RawTrade[] = [];
  let descending = true;
  const baseUrl = polymarketBaseUrl('POLYMARKET_DATA_BASE_URL', 'data');

  for (let page = 0; page < MAX_TRADE_PAGES; page++) {
    const params = new URLSearchParams({
      market: conditionId,
      limit: String(TRADES_PAGE),
      offset: String(page * TRADES_PAGE),
      takerOnly: 'false',
    });
    const response = await fetch(`${baseUrl}/trades?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Data API lỗi (${response.status})`);
    }

    const batch = ((await response.json()) ?? []) as RawTrade[];
    if (batch.length === 0) break;
    all.push(...batch);

    if (page === 0 && batch.length > 1) {
      descending = batch[0].timestamp >= batch[batch.length - 1].timestamp;
    }
    if (batch.length < TRADES_PAGE) break;

    const oldest = batch[batch.length - 1]?.timestamp ?? 0;
    if (descending && startTs !== undefined && oldest < startTs) break;
  }

  return all;
}

function bucketLastTrade(
  trades: RawTrade[],
  fidelity: number,
): PolymarketPoint[] {
  const bucketSec = Math.max(1, fidelity) * 60;
  const buckets = new Map<number, { t: number; p: number }>();

  for (const trade of trades) {
    const key = Math.floor(trade.timestamp / bucketSec);
    const current = buckets.get(key);
    if (!current || trade.timestamp > current.t) {
      buckets.set(key, {
        t: trade.timestamp,
        p: Number(trade.price),
      });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.t - b.t)
    .map((point) => ({ time: point.t * 1000, price: point.p * 100 }));
}

async function getClobHistory(
  tokenId: string,
  fidelity: number,
  interval: string | undefined,
  startTs?: number,
  endTs?: number,
): Promise<PolymarketPoint[]> {
  const key = `poly:clob:${tokenId}:${startTs ?? ''}:${endTs ?? ''}:${interval ?? ''}:${fidelity}`;
  return cacheWrap(key, cacheTtlSeconds(), async () => {
    const params = new URLSearchParams({
      market: tokenId,
      fidelity: String(fidelity),
    });
    const hasRange = startTs !== undefined || endTs !== undefined;
    if (startTs !== undefined) params.set('startTs', String(startTs));
    if (endTs !== undefined) params.set('endTs', String(endTs));
    if (!hasRange) params.set('interval', interval ?? 'max');

    const baseUrl = polymarketBaseUrl('POLYMARKET_CLOB_BASE_URL', 'clob');
    const response = await fetch(`${baseUrl}/prices-history?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`CLOB API lỗi (${response.status})`);
    }

    const raw = ((await response.json()) ?? { history: [] }) as RawPricesHistory;
    return raw.history.map((point) => ({
      time: point.t * 1000,
      price: point.p * 100,
    }));
  });
}

async function resolveMarket(
  query: HistoryQuery,
): Promise<ResolvedMarket | null> {
  const slug = query.slug ?? deriveSlug(query.marketDate);
  if (!slug) return null;

  return cacheWrap(`poly:market:${slug}`, cacheTtlSeconds(), async () => {
    const market = await fetchGammaMarket(slug);
    if (!market?.clobTokenIds) {
      throw new Error(
        `Không tìm thấy market Polymarket cho slug "${slug}". Hãy truyền tokenId/slug chính xác.`,
      );
    }

    const tokenIds = parseJsonArray(market.clobTokenIds);
    const outcomes = parseJsonArray(market.outcomes ?? '[]');
    const upIdx = pickOutcomeIndex(outcomes, 'up');
    const downIdx = pickOutcomeIndex(outcomes, 'down');

    return {
      slug,
      conditionId: market.conditionId ?? null,
      upToken: tokenIds[upIdx] ?? null,
      downToken: tokenIds[downIdx] ?? null,
      startTs: market.startDate
        ? Math.floor(new Date(market.startDate).getTime() / 1000)
        : null,
      endTs: market.endDate
        ? Math.floor(new Date(market.endDate).getTime() / 1000)
        : null,
    };
  });
}

function deriveSlug(marketDate?: string): string | null {
  if (!marketDate) return null;
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const template =
    process.env.POLYMARKET_SLUG_TEMPLATE ??
    'bitcoin-up-or-down-on-{month}-{day}-{year}';

  return template
    .replace('{month}', MONTHS[month - 1])
    .replace('{day}', String(day))
    .replace('{year}', String(year));
}

function pickOutcomeIndex(outcomes: string[], side: 'up' | 'down'): number {
  const lower = outcomes.map((outcome) => outcome.toLowerCase());
  if (side === 'up') {
    const index = lower.findIndex(
      (outcome) => outcome.includes('up') || outcome.includes('yes'),
    );
    return index >= 0 ? index : 0;
  }

  const index = lower.findIndex(
    (outcome) => outcome.includes('down') || outcome.includes('no'),
  );
  return index >= 0 ? index : 1;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function fetchGammaMarket(
  slug: string,
): Promise<RawGammaMarket | undefined> {
  const baseUrl = polymarketBaseUrl('POLYMARKET_GAMMA_BASE_URL', 'gamma');
  const params = new URLSearchParams({ slug });
  const response = await fetch(`${baseUrl}/markets?${params}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gamma API lỗi (${response.status})`);
  }

  const data = (await response.json()) as RawGammaMarket[] | RawGammaMarket;
  return Array.isArray(data) ? data[0] : data;
}

function polymarketBaseUrl(
  envName:
    | 'POLYMARKET_CLOB_BASE_URL'
    | 'POLYMARKET_GAMMA_BASE_URL'
    | 'POLYMARKET_DATA_BASE_URL',
  fallback: 'clob' | 'gamma' | 'data',
): string {
  const defaults = {
    clob: 'https://clob.polymarket.com',
    gamma: 'https://gamma-api.polymarket.com',
    data: 'https://data-api.polymarket.com',
  };

  return (process.env[envName] ?? defaults[fallback]).replace(/\/$/, '');
}

