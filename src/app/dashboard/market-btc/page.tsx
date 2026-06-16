'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { Section } from '@/components/common/Section';
import { Spinner } from '@/components/common/Spinner';
import { ComparisonChart } from '@/components/markets/ComparisonChart';
import { HistoryTable } from '@/components/markets/HistoryTable';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { Side } from '@/constants/config';
import { getChart } from '@/services/markets.service';
import { MarketChart } from '@/types/market.types';

function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MarketBtcPage() {
  const [marketDate, setMarketDate] = useState<string>(todayDate);
  const [side, setSide] = useState<Side>('up');

  const [chart, setChart] = useState<MarketChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lấy last-trade từ Supabase + giá BTC từ Binance (căn cùng cửa sổ thời gian).
  const loadChart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChart({ marketDate, side, range: '1d' });
      setChart(data);
    } catch (e) {
      setChart(null);
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu chart');
    } finally {
      setLoading(false);
    }
  }, [marketDate, side]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const lastTrade = chart?.lastTrade ?? [];
  const btc = chart?.btc ?? [];

  return (
    <main className="container">
      <Card>
        <MarketHeader
          marketDate={marketDate}
          onDateChange={setMarketDate}
          side={side}
          onSideChange={setSide}
        />
      </Card>

      {error && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <ErrorState message={error} onRetry={loadChart} />
          </Card>
        </div>
      )}

      <Section title="BTC/Binance price">
        <Card>
          {loading && !chart ? (
            <Spinner />
          ) : (
            <ComparisonChart
              btc={btc}
              lastTrade={lastTrade}
              side={side}
              from={chart?.from ?? null}
              to={chart?.to ?? null}
            />
          )}
        </Card>
      </Section>

      <Section title="Dữ liệu chi tiết Supabase">
        <Card>
          {loading && !chart ? (
            <Spinner />
          ) : (
            <HistoryTable points={lastTrade} />
          )}
        </Card>
      </Section>
    </main>
  );
}
