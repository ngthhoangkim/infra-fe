import { NextRequest, NextResponse } from 'next/server';
import { jsonError, optionalString, requireString } from '@/lib/server/http';
import { getChart } from '@/lib/server/markets';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['1h', '6h', '12h', '1d', 'all']);
const SIDES = new Set(['up', 'down']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const side = optionalString(searchParams, 'side') ?? 'up';
    const range = optionalString(searchParams, 'range') ?? '1d';

    if (!SIDES.has(side)) {
      return jsonError('side chỉ hỗ trợ up hoặc down', 400);
    }
    if (!RANGES.has(range)) {
      return jsonError('range không hợp lệ', 400);
    }

    const data = await getChart({
      marketDate: requireString(searchParams, 'marketDate'),
      side: side as 'up' | 'down',
      range: range as '1h' | '6h' | '12h' | '1d' | 'all',
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không lấy được dữ liệu chart',
    );
  }
}

