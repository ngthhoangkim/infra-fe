interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await loader();
  cache.set(key, {
    expiresAt: now + ttlSeconds * 1000,
    value,
  });
  return value;
}

export function cacheTtlSeconds(): number {
  const parsed = Number(process.env.CACHE_TTL_SECONDS ?? 30);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

