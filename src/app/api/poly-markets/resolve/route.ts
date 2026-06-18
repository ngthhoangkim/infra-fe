import { NextRequest, NextResponse } from 'next/server';
import { jsonError, optionalNumber, optionalString } from '@/lib/server/http';
import {
  isPolyMarketId,
  resolveAndUpsertPolyMarket,
} from '@/lib/server/poly-markets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const marketId = optionalString(searchParams, 'marketId');

    if (!marketId || !isPolyMarketId(marketId)) {
      return jsonError('marketId không hợp lệ', 400);
    }

    const data = await resolveAndUpsertPolyMarket({
      marketId,
      marketDate: optionalString(searchParams, 'marketDate'),
      timestamp: optionalNumber(searchParams, 'timestamp'),
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Không resolve được Polymarket market',
    );
  }
}
