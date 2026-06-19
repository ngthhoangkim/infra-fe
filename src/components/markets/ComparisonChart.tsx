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
import { BtcPoint, LastTradePoint } from '@/types/market.types';
import { TradeRecord } from '@/types/trade.types';
import { formatUtcTime } from '@/utils/datetime';
import { Side } from '@/constants/config';
import { formatPrice, formatUsd } from '@/utils/format';

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
    byTime.set(Math.floor(p.time / 1000), p);
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
    const time = Math.floor(from / 1000);
    if (!pointsByTime.has(time)) {
      pointsByTime.set(time, { time: time as UTCTimestamp });
    }
  }
  if (to !== null) {
    const time = Math.floor(to / 1000);
    if (!pointsByTime.has(time)) {
      pointsByTime.set(time, { time: time as UTCTimestamp });
    }
  }

  return [...pointsByTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}

function toVolumeData(points: BtcPoint[]): HistogramData[] {
  return points
    .map((point) => ({
      time: Math.floor(point.time / 1000) as UTCTimestamp,
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
      time: Math.floor(p.time / 1000) as UTCTimestamp,
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
  coordinateTime: UTCTimestamp;
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
      const time = Math.floor(new Date(trade.timestamp).getTime() / 1000);
      if (!Number.isFinite(time)) return null;

      return {
        id: trade.id,
        account: trade.account,
        outcome: trade.outcome,
        timestamp: trade.timestamp,
        price: trade.price,
        amount: trade.amount,
        time: time as UTCTimestamp,
        coordinateTime: nearestChartTime(time * 1000, btc, lastTrade),
        btcPrice: nearestBtcClose(time * 1000, btc) ?? Number.NaN,
        polyPrice: nearestPolyPrice(time * 1000, lastTrade),
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

function nearestChartTime(
  timeMs: number,
  btc: BtcPoint[],
  lastTrade: LastTradePoint[],
): UTCTimestamp {
  const candidates = [...btc, ...lastTrade];
  let closestTime = Math.floor(timeMs / 1000);
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const point of candidates) {
    const distance = Math.abs(point.time - timeMs);
    if (distance < closestDistance) {
      closestTime = Math.floor(point.time / 1000);
      closestDistance = distance;
    }
  }

  return closestTime as UTCTimestamp;
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
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
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
      },
      leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.16, bottom: 0.28 } },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.16, bottom: 0.28 },
      },
      localization: {
        timeFormatter: (t: UTCTimestamp) =>
          formatUtcTime((t as number) * 1000),
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

    if (from !== null && to !== null) {
      chart.timeScale().setVisibleRange({
        from: Math.floor(from / 1000) as UTCTimestamp,
        to: Math.floor(to / 1000) as UTCTimestamp,
      });
    } else {
      chart.timeScale().fitContent();
    }

    const markers = toTradeOverlayMarkers(trades, btc, lastTrade);
    const renderTradeOverlay = () => {
      if (!overlay) return;
      overlay.innerHTML = '';
      markers.forEach((marker) => {
        const x = chart.timeScale().timeToCoordinate(marker.coordinateTime);
        const polyY =
          marker.polyPrice === null
            ? null
            : polySeries.priceToCoordinate(marker.polyPrice);
        const btcY = btcSeries.priceToCoordinate(marker.btcPrice);
        const y =
          polyY ??
          btcY ??
          Math.max(72, Math.min(240, container.clientHeight * 0.42));
        if (x === null) return;

        const spreadIndex = marker.stackIndex % 5;
        const row = Math.floor(marker.stackIndex / 5);
        const xOffset = (spreadIndex - 2) * 42;
        const yOffset = -36 - row * 44 - Math.abs(spreadIndex - 2) * 6;
        const left = Math.max(20, Math.min(container.clientWidth - 20, x + xOffset));
        const top = Math.max(28, Math.min(container.clientHeight - 28, y + yOffset));

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
    requestAnimationFrame(renderTradeOverlay);
    window.addEventListener('resize', handleResize);
    chart.timeScale().subscribeVisibleTimeRangeChange(renderTradeOverlay);

    return () => {
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
