import { API_BASE_URL } from '@/constants/config';

type QueryValue = string | number | undefined;

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Wrapper fetch tới backend API. Frontend chỉ gọi backend (Rule 5),
 * không bao giờ gọi Supabase/Binance trực tiếp (Rule 3, 4).
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, QueryValue>,
): Promise<T> {
  const url = `${API_BASE_URL}${path}${buildQuery(params)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Yêu cầu thất bại (${res.status}) tới ${path}${text ? `: ${text}` : ''}`,
    );
  }

  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Yêu cầu thất bại (${res.status}) tới ${path}${text ? `: ${text}` : ''}`,
    );
  }

  return res.json() as Promise<T>;
}
