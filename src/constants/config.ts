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

export const HISTORY_MODES = ['last_trade', '4h'] as const;
export type HistoryMode = (typeof HISTORY_MODES)[number];

export const HISTORY_MODE_LABELS: Record<HistoryMode, string> = {
  last_trade: 'Daily',
  '4h': '4H',
};

export const FOUR_HOUR_SLOTS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] as const;
export type FourHourSlot = (typeof FOUR_HOUR_SLOTS)[number];

export const FOUR_HOUR_SLOT_LABELS: Record<FourHourSlot, string> = {
  '00:00': '12 AM ET',
  '04:00': '4 AM ET',
  '08:00': '8 AM ET',
  '12:00': '12 PM ET',
  '16:00': '4 PM ET',
  '20:00': '8 PM ET',
};
