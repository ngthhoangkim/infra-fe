export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const NEW_YORK_TIME_ZONE = 'America/New_York';
export const DISPLAY_TIME_ZONE = 'UTC';

export function todayInVietnam(): string {
  return datePartsInVietnam(new Date());
}

export function currentDailyMarketDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(value);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  if (!year || !month || !day) return value.toISOString().slice(0, 10);

  const marketDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isFinite(hour) && hour >= 23) {
    marketDate.setUTCDate(marketDate.getUTCDate() + 1);
  }

  return marketDate.toISOString().slice(0, 10);
}

/** Hiển thị timestamp theo UTC để đối chiếu trực tiếp với Supabase/raw API. */
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
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

export function datePartsInVietnam(value: Date): string {
  return datePartsInTimeZone(value, VIETNAM_TIME_ZONE);
}

export function datePartsInNewYork(value: Date): string {
  return datePartsInTimeZone(value, NEW_YORK_TIME_ZONE);
}

export function zonedTimeToUtcSeconds(
  marketDate: string,
  hour: number,
  timeZone: string,
): number {
  const [year, month, day] = marketDate.split('-').map(Number);
  if (!year || !month || !day || hour < 0 || hour > 23) {
    return Math.floor(Date.now() / 1000);
  }

  const targetUtc = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  let utcMs = targetUtc;

  for (let i = 0; i < 3; i++) {
    const parts = dateTimePartsInTimeZone(new Date(utcMs), timeZone);
    const localAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    utcMs += targetUtc - localAsUtc;
  }

  return Math.floor(utcMs / 1000);
}

function datePartsInTimeZone(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : value.toISOString().slice(0, 10);
}

function dateTimePartsInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(value);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

/** Chỉ hiển thị ngày (market_date). */
export function formatDate(value: string): string {
  return formatTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Hiển thị epoch theo UTC, dùng cho trục thời gian chart. */
export function formatVietnamTime(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}
