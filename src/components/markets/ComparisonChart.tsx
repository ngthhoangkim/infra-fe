'use client';

import { useEffect, useRef } from 'react';
import {
  CandlestickData,
  ColorType,
  createChart,
  HistogramData,
  IChartApi,
  LineData,
  UTCTimestamp,
  WhitespaceData,
} from 'lightweight-charts';
import { BtcPoint, LastTradePoint } from '@/types/market.types';
import { formatUtcTime } from '@/utils/datetime';
import { Side } from '@/constants/config';

interface ComparisonChartProps {
  btc: BtcPoint[];
  lastTrade: LastTradePoint[];
  side: Side;
  from: number | null;
  to: number | null;
}

/** Chuyển epoch ms -> nến OHLC, sort tăng dần + khử trùng thời gian. */
function toCandleData(
  points: BtcPoint[],
  from: number | null,
  to: number | null,
): (CandlestickData | WhitespaceData)[] {
  const byTime = new Map<number, BtcPoint>();
  for (const p of points) {
    byTime.set(Math.floor(p.time / 1000), p);
  }

  const candlesByTime = new Map<number, CandlestickData | WhitespaceData>(
    [...byTime.entries()].map(([time, value]) => [
      time,
      {
        time: time as UTCTimestamp,
        open: value.open,
        high: value.high,
        low: value.low,
        close: value.close,
      },
    ]),
  );

  if (from !== null) {
    const time = Math.floor(from / 1000);
    if (!candlesByTime.has(time)) {
      candlesByTime.set(time, { time: time as UTCTimestamp });
    }
  }
  if (to !== null) {
    const time = Math.floor(to / 1000);
    if (!candlesByTime.has(time)) {
      candlesByTime.set(time, { time: time as UTCTimestamp });
    }
  }

  return [...candlesByTime.entries()]
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

export function ComparisonChart({ btc, lastTrade, side, from, to }: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ba3b4',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(230,232,235,0.45)', style: 2 },
        horzLine: { color: 'rgba(230,232,235,0.45)', style: 2 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255,255,255,0.08)',
        rightOffset: 4,
        barSpacing: 6,
      },
      leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.28 } },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      localization: {
        timeFormatter: (t: UTCTimestamp) =>
          formatUtcTime((t as number) * 1000),
      },
    });
    chartRef.current = chart;

    const btcSeries = chart.addCandlestickSeries({
      priceScaleId: 'right',
      upColor: '#16c784',
      downColor: '#ea3943',
      borderUpColor: '#16c784',
      borderDownColor: '#ea3943',
      wickUpColor: '#16c784',
      wickDownColor: '#ea3943',
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    });
    btcSeries.setData(toCandleData(btc, from, to));

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

    const handleResize = () =>
      chart.applyOptions({ width: container.clientWidth });
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [btc, lastTrade, side, from, to]);

  return <div ref={containerRef} className="chart" />;
}
