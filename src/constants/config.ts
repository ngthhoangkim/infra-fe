// Mặc định gọi API route cùng domain Next.js/Vercel.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const RANGES = ['1h', '6h', '12h', '1d', 'all'] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABELS: Record<Range, string> = {
  '1h': '1 giờ',
  '6h': '6 giờ',
  '12h': '12 giờ',
  '1d': '1 ngày',
  all: 'Tất cả',
};

export const SIDES = ['up', 'down'] as const;
export type Side = (typeof SIDES)[number];

export const SIDE_LABELS: Record<Side, string> = {
  up: 'Up',
  down: 'Down',
};

export const DEFAULT_RANGE: Range = '1d';
