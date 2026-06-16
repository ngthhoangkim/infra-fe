import { NextResponse } from 'next/server';

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ message }, { status });
}

export function optionalString(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value === null || value === '' ? undefined : value;
}

export function optionalNumber(
  searchParams: URLSearchParams,
  key: string,
): number | undefined {
  const value = optionalString(searchParams, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function requireString(
  searchParams: URLSearchParams,
  key: string,
): string {
  const value = optionalString(searchParams, key);
  if (!value) {
    throw new Error(`Thiếu tham số ${key}`);
  }
  return value;
}

