export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function todayInVietnam(): string {
  return datePartsInVietnam(new Date());
}

/** Hiển thị timestamp theo giờ Việt Nam (UTC+7). */
export function formatTime(
  value: string | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    ...options,
    hour12: false,
    timeZone: VIETNAM_TIME_ZONE,
  }).format(date);
}

export function datePartsInVietnam(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: VIETNAM_TIME_ZONE,
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : value.toISOString().slice(0, 10);
}

/** Chỉ hiển thị ngày (market_date). */
export function formatDate(value: string): string {
  return formatTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Hiển thị epoch theo giờ Việt Nam, dùng cho trục thời gian chart. */
export function formatVietnamTime(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VIETNAM_TIME_ZONE,
  }).format(date);
}
