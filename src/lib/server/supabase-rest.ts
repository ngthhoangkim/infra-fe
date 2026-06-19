const TABLE = 'price_history_last_trade';

export interface PriceHistoryRow {
  market_date: string;
  market_id?: string | null;
  condition_id?: string | null;
  side: 'up' | 'down' | string;
  price: number | string;
  created_at: string;
  updated_at?: string;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY là bắt buộc trên Vercel',
    );
  }

  return {
    baseUrl: url.replace(/\/$/, ''),
    key,
  };
}

export async function queryPriceHistory(
  params: URLSearchParams,
): Promise<PriceHistoryRow[]> {
  const { baseUrl, key } = getSupabaseConfig();
  const response = await fetch(`${baseUrl}/rest/v1/${TABLE}?${params}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Lỗi truy vấn Supabase (${response.status})${text ? `: ${text}` : ''}`,
    );
  }

  return (await response.json()) as PriceHistoryRow[];
}
