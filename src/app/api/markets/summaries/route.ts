import { NextRequest, NextResponse } from 'next/server';
import { jsonError, optionalString } from '@/lib/server/http';
import { getSummaries } from '@/lib/server/markets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const data = await getSummaries({
      from: optionalString(searchParams, 'from'),
      to: optionalString(searchParams, 'to'),
      side: optionalString(searchParams, 'side'),
    });

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Không lấy được summaries',
    );
  }
}

