'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import { HISTORY_MODE_LABELS, HISTORY_MODES, HistoryMode } from '@/constants/config';

const NAV_ITEMS = [
  { href: '/dashboard/market-btc', label: 'BTC Market' },
  { href: '/dashboard/trades', label: 'Summary' },
  { href: '/dashboard/test-trade', label: 'Test' },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHistoryMode: HistoryMode =
    searchParams.get('mode') === '4h' ? '4h' : 'last_trade';
  const showHistoryTabs = pathname === '/dashboard/market-btc';

  return (
    <>
      <header className="app-shell">
        <div className="app-shell__inner">
          <div className="app-shell__left">
            <Link className="app-shell__brand" href="/dashboard/market-btc">
              Trade Infra
            </Link>
            {showHistoryTabs && (
              <div className="app-shell__tabs" aria-label="Chart mode">
                {HISTORY_MODES.map((mode) => (
                  <Link
                    key={mode}
                    className={`app-shell__tab ${
                      activeHistoryMode === mode ? 'is-active' : ''
                    }`}
                    href={
                      mode === '4h'
                        ? '/dashboard/market-btc?mode=4h'
                        : '/dashboard/market-btc'
                    }
                  >
                    {HISTORY_MODE_LABELS[mode]}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <nav className="app-shell__nav" aria-label="Dashboard">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                className={`app-shell__link ${
                  pathname === item.href ? 'is-active' : ''
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
