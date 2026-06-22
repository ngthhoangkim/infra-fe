'use client';

import { useEffect, useRef } from 'react';
import {
  AreaData,
  ColorType,
  createChart,
  HistogramData,
  IChartApi,
  LineData,
  UTCTimestamp,
  WhitespaceData,
} from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import { BtcPoint, LastTradePoint } from '@/types/market.types';
import { TradeRecord } from '@/types/trade.types';
import { formatTime } from '@/utils/datetime';
import { Side } from '@/constants/config';
import { formatPrice, formatUsd } from '@/utils/format';

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

interface ComparisonChartProps {
  btc: BtcPoint[];
  lastTrade: LastTradePoint[];
  side: Side;
  from: number | null;
  to: number | null;
  trades?: TradeRecord[];
}

/** Chuyển epoch ms -> BTC area line, sort tăng dần + khử trùng thời gian. */
function toBtcAreaData(
  points: BtcPoint[],
  from: number | null,
  to: number | null,
): (AreaData | WhitespaceData)[] {
  const byTime = new Map<number, BtcPoint>();
  for (const p of points) {
    byTime.set(toVietnamChartTime(p.time), p);
  }

  const pointsByTime = new Map<number, AreaData | WhitespaceData>(
    [...byTime.entries()].map(([time, value]) => [
      time,
      {
        time: time as UTCTimestamp,
        value: value.close,
      },
    ]),
  );

  if (from !== null) {
    const time = toVietnamChartTime(from);
    if (!pointsByTime.has(time)) {
      pointsByTime.set(time, { time: time as UTCTimestamp });
    }
  }
  if (to !== null) {
    const time = toVietnamChartTime(to);
    if (!pointsByTime.has(time)) {
      pointsByTime.set(time, { time: time as UTCTimestamp });
    }
  }
  return [...pointsByTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

function toTradeAnchorData(trades: TradeRecord[] = []): LineData[] {
  const times = new Set<number>();

  for (const trade of trades) {
    const timeMs = new Date(trade.tradeTimestamp).getTime();
    if (Number.isFinite(timeMs)) times.add(toVietnamChartTime(timeMs));
  }

  return [...times]
    .sort((a, b) => a - b)
    .map((time) => ({
      time: time as UTCTimestamp,
      value: 0,
    }));
}

function toVolumeData(points: BtcPoint[]): HistogramData[] {
  return points
    .map((point) => ({
      time: toVietnamChartTime(point.time) as UTCTimestamp,
      value: point.volume,
      color:
        point.close >= point.open
          ? 'rgba(22, 199, 132, 0.45)'
          : 'rgba(234, 57, 67, 0.45)',
    }))
    .sort((a, b) => (a.time as number) - (b.time as number));
}

function toPolyLine(points: LastTradePoint[]): LineData[] {
  return points
    .map((p) => ({
      time: toVietnamChartTime(p.time) as UTCTimestamp,
      value: p.price,
    }))
    .sort((a, b) => (a.time as number) - (b.time as number));
}

interface TradeOverlayMarker {
  id: string;
  account: string;
  outcome: 'up' | 'down';
  timestamp: string;
  price: number;
  amount: number;
  time: UTCTimestamp;
  btcPrice: number;
  polyPrice: number | null;
  index: number;
  stackIndex: number;
}

function toTradeOverlayMarkers(
  trades: TradeRecord[] = [],
  btc: BtcPoint[],
  lastTrade: LastTradePoint[],
): TradeOverlayMarker[] {
  const markers = trades
    .map((trade, index) => {
      const timeMs = new Date(trade.tradeTimestamp).getTime();
      if (!Number.isFinite(timeMs)) return null;

      return {
        id: trade.id,
        account: trade.account,
        outcome: trade.outcome,
        timestamp: trade.tradeTimestamp,
        price: trade.price,
        amount: trade.amount,
        time: toVietnamChartTime(timeMs) as UTCTimestamp,
        btcPrice: nearestBtcClose(timeMs, btc) ?? Number.NaN,
        polyPrice: nearestPolyPrice(timeMs, lastTrade),
        index,
        stackIndex: 0,
      };
    })
    .filter((marker): marker is TradeOverlayMarker =>
      Boolean(marker && Number.isFinite(marker.btcPrice)),
    )
    .sort((a, b) => (a.time as number) - (b.time as number));

  const stackCounts = new Map<number, number>();
  return markers.map((marker) => {
    const bucket = Math.floor((marker.time as number) / (15 * 60));
    const stackIndex = stackCounts.get(bucket) ?? 0;
    stackCounts.set(bucket, stackIndex + 1);
    return { ...marker, stackIndex };
  });
}

function nearestPolyPrice(timeMs: number, points: LastTradePoint[]): number | null {
  let closest: LastTradePoint | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = Math.abs(point.time - timeMs);
    if (distance < closestDistance) {
      closest = point;
      closestDistance = distance;
    }
  }

  return closest?.price ?? null;
}

function nearestBtcClose(timeMs: number, btc: BtcPoint[]): number | null {
  let closest: BtcPoint | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const point of btc) {
    const distance = Math.abs(point.time - timeMs);
    if (distance < closestDistance) {
      closest = point;
      closestDistance = distance;
    }
  }

  return closest?.close ?? null;
}

function initials(account: string): string {
  return account
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTradeTime(value: string): string {
  return formatTime(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function toVietnamChartTime(epochMs: number): number {
  return Math.floor((epochMs + VIETNAM_OFFSET_MS) / 1000);
}

function formatChartTime(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function chartTimeToMs(time: Time): number {
  if (typeof time === 'number') return time * 1000;
  if (typeof time === 'string') return new Date(`${time}T00:00:00Z`).getTime();
  return Date.UTC(time.year, time.month - 1, time.day);
}

export function ComparisonChart({
  btc,
  lastTrade,
  side,
  from,
  to,
  trades = [],
}: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#667085',
      },
      grid: {
        vertLines: { color: 'rgba(17,24,39,0.08)' },
        horzLines: { color: 'rgba(17,24,39,0.08)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(17,24,39,0.35)', style: 2 },
        horzLine: { color: 'rgba(17,24,39,0.35)', style: 2 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(17,24,39,0.12)',
        rightOffset: 4,
        barSpacing: 6,
        tickMarkFormatter: (time: Time) => formatChartTime(chartTimeToMs(time)),
      },
      leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.16, bottom: 0.28 } },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.16, bottom: 0.28 },
      },
      localization: {
        timeFormatter: (t: UTCTimestamp) =>
          formatChartTime((t as number) * 1000),
      },
    });
    chartRef.current = chart;

    const btcSeries = chart.addAreaSeries({
      priceScaleId: 'right',
      lineColor: '#f0b90b',
      topColor: 'rgba(240, 185, 11, 0.28)',
      bottomColor: 'rgba(240, 185, 11, 0.04)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    });
    btcSeries.setData(toBtcAreaData(btc, from, to));

    const volumeSeries = chart.addHistogramSeries({
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    volumeSeries.setData(toVolumeData(btc));

    const polyColor = side === 'up' ? '#16c784' : '#ea3943';
    const polySeries = chart.addLineSeries({
      priceScaleId: 'left',
      color: polyColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      title: side === 'up' ? 'Up %' : 'Down %',
    });
    polySeries.setData(toPolyLine(lastTrade));

    const tradeAnchorSeries = chart.addLineSeries({
      priceScaleId: 'trade-anchor',
      color: 'rgba(0, 0, 0, 0)',
      lineVisible: false,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    tradeAnchorSeries.priceScale().applyOptions({ visible: false });
    tradeAnchorSeries.setData(toTradeAnchorData(trades));

    if (from !== null && to !== null) {
      chart.timeScale().setVisibleRange({
        from: toVietnamChartTime(from) as UTCTimestamp,
        to: toVietnamChartTime(to) as UTCTimestamp,
      });
    } else {
      chart.timeScale().fitContent();
    }

    let disposed = false;
    const markers = toTradeOverlayMarkers(trades, btc, lastTrade);

    // Map Amount của trade vào dải giá poly (last trade) để chiều cao chấm phản
    // ánh độ lớn: amount nhỏ nhất nằm sát đáy dải giá, lớn nhất sát đỉnh.
    const polyPrices = lastTrade.map((p) => p.price).filter(Number.isFinite);
    const minPoly = polyPrices.length ? Math.min(...polyPrices) : 0;
    const maxPoly = polyPrices.length ? Math.max(...polyPrices) : 0;
    const amounts = markers.map((m) => m.amount);
    const minAmount = amounts.length ? Math.min(...amounts) : 0;
    const maxAmount = amounts.length ? Math.max(...amounts) : 0;
    const amountToPolyPrice = (amount: number) => {
      const ratio =
        maxAmount > minAmount ? (amount - minAmount) / (maxAmount - minAmount) : 1;
      return minPoly + ratio * (maxPoly - minPoly);
    };

    const renderTradeOverlay = () => {
      // rAF/subscription có thể fire sau khi chart đã bị remove (StrictMode
      // mount/unmount kép) -> truy cập chart đã dispose sẽ throw.
      if (disposed || !overlay) return;
      overlay.innerHTML = '';
      // timeToCoordinate trả x tính từ mép trái vùng vẽ (sau trục giá trái),
      // còn overlay phủ cả container -> phải cộng bù bề rộng trục giá trái.
      const leftAxisWidth = chart.priceScale('left').width();
      markers.forEach((marker) => {
        const x = chart.timeScale().timeToCoordinate(marker.time);
        if (x === null) return;

        const axisY = container.clientHeight - 48;
        const left = Math.max(
          20,
          Math.min(container.clientWidth - 20, leftAxisWidth + x),
        );
        // Chiều cao theo Amount, neo vào trục giá poly/last trade (trục trái).
        const amountY = polySeries.priceToCoordinate(
          amountToPolyPrice(marker.amount) as Parameters<
            typeof polySeries.priceToCoordinate
          >[0],
        );
        const baseY = amountY ?? axisY;
        // Nudge nhẹ khi nhiều trade trùng khung thời gian để không chồng khít.
        const top = Math.max(
          28,
          Math.min(axisY, baseY - marker.stackIndex * 20),
        );

        const bubble = document.createElement('div');
        bubble.className = `trade-marker trade-marker--${marker.outcome}`;
        bubble.style.left = `${left}px`;
        bubble.style.top = `${top}px`;
        bubble.textContent = initials(marker.account);

        const tooltip = document.createElement('span');
        tooltip.className = 'trade-marker__tooltip';
        tooltip.innerHTML = `
          <span>Time: ${formatTradeTime(marker.timestamp)}</span>
          <span>Price: ${formatPrice(marker.price)}</span>
          <span>Amount: ${formatUsd(marker.amount)}</span>
        `;

        const pointer = document.createElement('span');
        pointer.className = 'trade-marker__pointer';
        pointer.textContent = marker.outcome === 'up' ? '▲' : '▼';
        bubble.appendChild(pointer);
        bubble.appendChild(tooltip);
        overlay.appendChild(bubble);
      });
    };

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
      renderTradeOverlay();
    };
    handleResize();
    const rafId = requestAnimationFrame(renderTradeOverlay);
    window.addEventListener('resize', handleResize);
    chart.timeScale().subscribeVisibleTimeRangeChange(renderTradeOverlay);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(renderTradeOverlay);
      chart.remove();
      chartRef.current = null;
    };
  }, [btc, lastTrade, side, from, to, trades]);

  return (
    <div className="chart-shell">
      <div ref={containerRef} className="chart" />
      <div ref={overlayRef} className="trade-marker-layer" />
    </div>
  );
}
