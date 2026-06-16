/** Format giá tiền USD với 2 chữ số thập phân. */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format số nguyên (count). */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US').format(value);
}
