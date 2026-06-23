import {
  POLY_MARKET_IDS,
  PolyMarket,
  PolyMarketId,
} from '@/types/poly-market.types';
import { todayInVietnam } from '@/utils/datetime';
import { cacheLongTtlSeconds, cacheWrap } from './cache';

const FAMILIES_TABLE = 'poly_market_families';
const MARKETS_TABLE = 'poly_markets';

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

const FAMILY_DEFS: Record<
  PolyMarketId,
  { interval: 'daily' | '15m' | '5m'; title: string; windowSeconds: number | null }
> = {
  'btc-updown-daily': {
    interval: 'daily',
    title: 'BTC Up or Down Daily',
    windowSeconds: null,
  },
  'btc-updown-15m': {
    interval: '15m',
    title: 'BTC Up or Down 15m',
    windowSeconds: 15 * 60,
  },
  'btc-updown-5m': {
    interval: '5m',
    title: 'BTC Up or Down 5m',
    windowSeconds: 5 * 60,
  },
};

interface ResolveMarketInput {
  marketId: PolyMarketId;
  marketDate?: string;
  timestamp?: number;
}

interface RawGammaEvent {
  id?: string | number;
  slug?: string;
  ticker?: string;
  title?: string;
  markets?: RawGammaMarket[];
}

interface RawGammaMarket {
  id?: string | number;
  slug?: string;
  question?: string;
  conditionId?: string;
  clobTokenIds?: string;
  outcomes?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  closed?: boolean;
}

interface PolyMarketRow {
  condition_id: string;
  market_id: PolyMarketId;
  gamma_market_id?: string | null;
  event_id?: string | null;
  slug: string;
  market_date?: string | null;
  window_start_at?: string | null;
  window_end_at?: string | null;
  up_token_id?: string | null;
  down_token_id?: string | null;
  active?: boolean | null;
  closed?: boolean | null;
  synced_at?: string | null;
}

interface SupabaseConfig {
  baseUrl: string;
  key: string;
}

export async function resolveAndUpsertPolyMarket(
  input: ResolveMarketInput,
): Promise<PolyMarket> {
  const key = `poly-market:resolve:${input.marketId}:${input.marketDate ?? ''}:${input.timestamp ?? ''}`;
  return cacheWrap(key, cacheLongTtlSeconds(), () => resolveAndUpsertPolyMarketRaw(input));
}

async function resolveAndUpsertPolyMarketRaw(
  input: ResolveMarketInput,
): Promise<PolyMarket> {
  const family = FAMILY_DEFS[input.marketId];
  if (!family) throw new Error('marketId không hợp lệ');

  const slugInfo = buildSlug(input, family.windowSeconds);
  const resolved = await fetchPolymarketBySlug(slugInfo.slug);
  const tokenIds = parseJsonArray(resolved.market.clobTokenIds ?? '[]');
  const outcomes = parseJsonArray(resolved.market.outcomes ?? '[]');
  const upIdx = pickOutcomeIndex(outcomes, 'up');
  const downIdx = pickOutcomeIndex(outcomes, 'down');

  const row: PolyMarketRow = {
    condition_id: requireString(
      resolved.market.conditionId,
      `Không tìm thấy conditionId cho ${slugInfo.slug}`,
    ),
    market_id: input.marketId,
    gamma_market_id: optionalString(resolved.market.id),
    event_id: optionalString(resolved.event?.id),
    slug: resolved.market.slug ?? resolved.event?.slug ?? slugInfo.slug,
    market_date: slugInfo.marketDate,
    window_start_at: slugInfo.windowStartAt,
    window_end_at: resolved.market.endDate ?? slugInfo.windowEndAt,
    up_token_id: tokenIds[upIdx] ?? null,
    down_token_id: tokenIds[downIdx] ?? null,
    active: resolved.market.active ?? null,
    closed: resolved.market.closed ?? null,
    synced_at: new Date().toISOString(),
  };

  await upsertFamily(input.marketId);
  const saved = await upsertMarket(row);
  return mapPolyMarket(saved);
}

function buildSlug(
  input: ResolveMarketInput,
  windowSeconds: number | null,
): {
  slug: string;
  marketDate: string;
  windowStartAt: string | null;
  windowEndAt: string | null;
} {
  if (input.marketId === 'btc-updown-daily') {
    const marketDate = input.marketDate ?? todayDate();
    const [year, month, day] = marketDate.split('-').map(Number);
    if (!year || !month || !day) {
      throw new Error('marketDate không hợp lệ');
    }
    return {
      slug: `bitcoin-up-or-down-on-${MONTHS[month - 1]}-${day}-${year}`,
      marketDate,
      windowStartAt: null,
      windowEndAt: null,
    };
  }

  if (!windowSeconds) throw new Error('windowSeconds không hợp lệ');
  const timestampMs = input.timestamp ?? Date.now();
  const timestampSec = Math.floor(timestampMs / 1000);
  const windowStartSec = timestampSec - (timestampSec % windowSeconds);
  const interval = input.marketId === 'btc-updown-15m' ? '15m' : '5m';

  return {
    slug: `btc-updown-${interval}-${windowStartSec}`,
    marketDate: marketDateInNewYork(windowStartSec * 1000),
    windowStartAt: new Date(windowStartSec * 1000).toISOString(),
    windowEndAt: new Date((windowStartSec + windowSeconds) * 1000).toISOString(),
  };
}

async function fetchPolymarketBySlug(slug: string): Promise<{
  event: RawGammaEvent | null;
  market: RawGammaMarket;
}> {
  const event = await fetchGamma<RawGammaEvent | RawGammaEvent[]>(
    `events?${new URLSearchParams({ slug })}`,
  );
  const eventItem = Array.isArray(event) ? event[0] : event;
  const eventMarket = eventItem?.markets?.[0];
  if (eventMarket?.conditionId) {
    return { event: eventItem ?? null, market: eventMarket };
  }

  const market = await fetchGamma<RawGammaMarket | RawGammaMarket[]>(
    `markets?${new URLSearchParams({ slug })}`,
  );
  const marketItem = Array.isArray(market) ? market[0] : market;
  if (marketItem?.conditionId) {
    return { event: eventItem ?? null, market: marketItem };
  }

  throw new Error(`Không tìm thấy Polymarket market cho slug "${slug}"`);
}

async function fetchGamma<T>(path: string): Promise<T> {
  const baseUrl = (
    process.env.POLYMARKET_GAMMA_BASE_URL ?? 'https://gamma-api.polymarket.com'
  ).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gamma API lỗi (${response.status})`);
  }

  return (await response.json()) as T;
}

async function upsertFamily(marketId: PolyMarketId): Promise<void> {
  const family = FAMILY_DEFS[marketId];
  const { baseUrl, key } = getSupabaseConfig();
  const response = await fetch(
    `${baseUrl}/rest/v1/${FAMILIES_TABLE}?on_conflict=market_id`,
    {
      method: 'POST',
      headers: supabaseHeaders(key, 'resolution=merge-duplicates,return=minimal'),
      body: JSON.stringify({
        market_id: marketId,
        asset_symbol: 'BTC',
        interval: family.interval,
        title: family.title,
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) await throwSupabaseError(response, 'ghi family market');
}

async function upsertMarket(row: PolyMarketRow): Promise<PolyMarketRow> {
  const { baseUrl, key } = getSupabaseConfig();
  const response = await fetch(
    `${baseUrl}/rest/v1/${MARKETS_TABLE}?on_conflict=condition_id`,
    {
      method: 'POST',
      headers: supabaseHeaders(
        key,
        'resolution=merge-duplicates,return=representation',
      ),
      body: JSON.stringify(row),
      cache: 'no-store',
    },
  );

  if (!response.ok) await throwSupabaseError(response, 'ghi poly market');

  const rows = (await response.json()) as PolyMarketRow[];
  return rows[0] ?? row;
}

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY là bắt buộc trên Vercel',
    );
  }

  return {
    baseUrl: url.replace(/\/$/, ''),
    key,
  };
}

function supabaseHeaders(key: string, prefer: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

async function throwSupabaseError(response: Response, action: string): Promise<never> {
  const text = await response.text().catch(() => '');
  throw new Error(
    `Lỗi ${action} Supabase (${response.status})${text ? `: ${text}` : ''}`,
  );
}

function mapPolyMarket(row: PolyMarketRow): PolyMarket {
  return {
    conditionId: row.condition_id,
    marketId: row.market_id,
    gammaMarketId: row.gamma_market_id ?? null,
    eventId: row.event_id ?? null,
    slug: row.slug,
    marketDate: row.market_date ?? null,
    windowStartAt: row.window_start_at ?? null,
    windowEndAt: row.window_end_at ?? null,
    upTokenId: row.up_token_id ?? null,
    downTokenId: row.down_token_id ?? null,
    active: row.active ?? null,
    closed: row.closed ?? null,
    syncedAt: row.synced_at ?? null,
  };
}

function todayDate(): string {
  return todayInVietnam();
}

function marketDateInNewYork(timestampMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestampMs));

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : todayDate();
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

function optionalString(value: unknown): string | null {
  return value === undefined || value === null ? null : String(value);
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(message);
  }
  return value;
}

export function isPolyMarketId(value: string): value is PolyMarketId {
  return (POLY_MARKET_IDS as readonly string[]).includes(value);
}
