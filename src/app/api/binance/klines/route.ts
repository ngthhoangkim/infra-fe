import { NextRequest, NextResponse } from 'next/server';
import { getKlines } from '@/lib/server/binance';
import { jsonError, optionalNumber, optionalString } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const data = await getKlines({
      symbol: optionalString(searchParams, 'symbol') ?? 'BTCUSDT',
      interval: optionalString(searchParams, 'interval') ?? '1m',
      limit: optionalNumber(searchParams, 'limit') ?? 500,
      startTime: optionalNumber(searchParams, 'startTime'),
      endTime: optionalNumber(searchParams, 'endTime'),
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không lấy được dữ liệu Binance',
    );
  }
}

