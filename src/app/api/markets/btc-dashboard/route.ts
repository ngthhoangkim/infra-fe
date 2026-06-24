import { NextRequest, NextResponse } from 'next/server';
import { getBtcDashboard } from '@/lib/server/btc-dashboard';
import { jsonError, optionalString, requireString } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

const SIDES = new Set(['up', 'down']);
const OUTCOMES = new Set(['all', 'up', 'down']);
const HISTORY_MODES = new Set(['last_trade', '4h']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const side = optionalString(searchParams, 'side');
    const outcome = optionalString(searchParams, 'outcome') ?? side ?? 'all';
    const historyMode = optionalString(searchParams, 'historyMode') ?? 'last_trade';
    const windowStartTsParam = optionalString(searchParams, 'windowStartTs');
    const windowStartTs =
      windowStartTsParam === undefined ? undefined : Number(windowStartTsParam);

    if (side !== undefined && !SIDES.has(side)) {
      return jsonError('side chỉ hỗ trợ up hoặc down', 400);
    }
    if (!OUTCOMES.has(outcome)) {
      return jsonError('outcome chỉ hỗ trợ all, up hoặc down', 400);
    }
    if (!HISTORY_MODES.has(historyMode)) {
      return jsonError('historyMode không hợp lệ', 400);
    }
    if (
      historyMode === '4h' &&
      (windowStartTs === undefined ||
        !Number.isInteger(windowStartTs) ||
        windowStartTs <= 0)
    ) {
      return jsonError('windowStartTs không hợp lệ', 400);
    }

    const data = await getBtcDashboard({
      account: optionalString(searchParams, 'account'),
      historyMode: historyMode as 'last_trade' | '4h',
      marketDate: requireString(searchParams, 'marketDate'),
      outcome: outcome as 'all' | 'up' | 'down',
      windowStartTs,
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Không lấy được dữ liệu BTC dashboard',
    );
  }
}
