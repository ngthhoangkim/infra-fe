import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { queryTradeAccounts } from '@/lib/server/trades';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accounts = await queryTradeAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không lấy được account trade',
    );
  }
}
