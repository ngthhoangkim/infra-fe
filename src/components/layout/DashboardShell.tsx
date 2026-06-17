'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard/market-btc', label: 'BTC Market' },
  { href: '/dashboard/trades', label: 'Trades' },
  { href: '/dashboard/test-trade', label: 'Test' },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="app-shell">
        <div className="app-shell__inner">
          <Link className="app-shell__brand" href="/dashboard/market-btc">
            Trade Infra
          </Link>
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
