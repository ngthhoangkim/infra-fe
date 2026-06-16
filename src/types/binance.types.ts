/** Một cây nến klines đã chuẩn hóa từ backend (timestamp UTC ms). */
export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}
