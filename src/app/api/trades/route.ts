import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import {
  insertTrades,
  parseTradeFilters,
  parseTradeInputs,
  queryTrades,
} from '@/lib/server/trades';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const filters = parseTradeFilters(request.nextUrl.searchParams);
    const trades = await queryTrades(filters);
    return NextResponse.json(trades);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không lấy được dữ liệu trade',
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const trades = await parseTradeInputs(body);
    const inserted = await insertTrades(trades);
    return NextResponse.json({ inserted });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không ghi được trade',
      error instanceof Error && error.message.includes('Supabase') ? 500 : 400,
    );
  }
}
