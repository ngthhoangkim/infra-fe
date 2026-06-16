import { NextRequest, NextResponse } from 'next/server';
import {
  jsonError,
  optionalNumber,
  optionalString,
} from '@/lib/server/http';
import { getPolymarketHistory } from '@/lib/server/polymarket';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const side = optionalString(searchParams, 'side');

    if (side && side !== 'up' && side !== 'down') {
      return jsonError('side chỉ hỗ trợ up hoặc down', 400);
    }

    const data = await getPolymarketHistory({
      tokenId: optionalString(searchParams, 'tokenId'),
      slug: optionalString(searchParams, 'slug'),
      marketDate: optionalString(searchParams, 'marketDate'),
      side: side as 'up' | 'down' | undefined,
      range: optionalString(searchParams, 'range') as
        | '1h'
        | '6h'
        | '12h'
        | '1d'
        | 'all'
        | undefined,
      interval: optionalString(searchParams, 'interval'),
      startTs: optionalNumber(searchParams, 'startTs'),
      endTs: optionalNumber(searchParams, 'endTs'),
      fidelity: optionalNumber(searchParams, 'fidelity') ?? 15,
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Không lấy được lịch sử Polymarket',
    );
  }
}

