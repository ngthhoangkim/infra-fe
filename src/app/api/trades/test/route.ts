import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { createTestTrade, insertTrades } from '@/lib/server/trades';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const trade = createTestTrade(body);
    const inserted = await insertTrades([trade]);

    return NextResponse.json({
      inserted,
      trade,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không ghi được trade test',
      error instanceof Error && error.message.includes('Supabase') ? 500 : 400,
    );
  }
}
