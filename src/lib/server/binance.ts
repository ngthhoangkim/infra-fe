import { cacheTtlSeconds, cacheWrap } from './cache';

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

type RawBinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  ...unknown[],
];

export interface GetKlinesParams {
  symbol: string;
  interval: string;
  limit: number;
  startTime?: number;
  endTime?: number;
}

export async function getKlines(params: GetKlinesParams): Promise<Kline[]> {
  const cacheKey = `klines:${params.symbol}:${params.interval}:${params.limit}:${params.startTime ?? ''}:${params.endTime ?? ''}`;

  return cacheWrap(cacheKey, cacheTtlSeconds(), async () => {
    const baseUrl =
      process.env.BINANCE_BASE_URL?.replace(/\/$/, '') ??
      'https://api.binance.com';
    const search = new URLSearchParams({
      symbol: params.symbol,
      interval: params.interval,
      limit: String(params.limit),
    });

    if (params.startTime !== undefined) {
      search.set('startTime', String(params.startTime));
    }
    if (params.endTime !== undefined) {
      search.set('endTime', String(params.endTime));
    }

    const response = await fetch(`${baseUrl}/api/v3/klines?${search}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Không lấy được dữ liệu klines từ Binance');
    }

    const raw = (await response.json()) as RawBinanceKline[];
    return raw.map((k) => ({
      openTime: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
      closeTime: k[6],
    }));
  });
}

