import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { queryTradeSummary } from '@/lib/server/trades';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const conditionId = optionalString(request.nextUrl.searchParams, 'conditionId');
    const marketId = optionalString(request.nextUrl.searchParams, 'marketId');
    const from = optionalString(request.nextUrl.searchParams, 'from');
    const to = optionalString(request.nextUrl.searchParams, 'to');
    const historyMode = optionalHistoryMode(request.nextUrl.searchParams);
    const summary = await queryTradeSummary({
      conditionId,
      marketId,
      from,
      to,
      historyMode,
    });
    return NextResponse.json(summary);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không lấy được summary trade',
    );
  }
}

function optionalHistoryMode(
  searchParams: URLSearchParams,
): 'last_trade' | '4h' | undefined {
  const value = optionalString(searchParams, 'historyMode');
  return value === 'last_trade' || value === '4h' ? value : undefined;
}

function optionalString(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value === null || value.trim() === '' ? undefined : value.trim();
}
