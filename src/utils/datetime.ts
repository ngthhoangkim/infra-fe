/**
 * Hiển thị timestamp mà không ép timezone. Nếu nhận ISO string từ Supabase,
 * giữ nguyên ngày/giờ trong chuỗi đó thay vì convert theo timezone của browser.
 */
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
  if (typeof value === 'string') {
    const literal = formatIsoLiteral(value, options);
    if (literal) return literal;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    ...options,
    hour12: false,
  }).format(date);
}

/** Chỉ hiển thị ngày (market_date). */
export function formatDate(value: string): string {
  return formatTime(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Hiển thị epoch theo UTC, dùng cho trục thời gian Binance để không bị +7. */
export function formatUtcTime(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function formatIsoLiteral(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)/,
  );
  if (!match) return null;

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const parts: string[] = [`${day}/${month}/${year}`];

  if (options.hour || options.minute || options.second) {
    const timeParts = [hour, minute];
    if (options.second) timeParts.push(second);
    parts.push(timeParts.join(':'));
  }

  return parts.join(', ');
}
