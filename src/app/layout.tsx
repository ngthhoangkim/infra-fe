import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'BTC Market Dashboard',
  description: 'Dashboard thị trường BTC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Suspense>
          <DashboardShell>{children}</DashboardShell>
        </Suspense>
      </body>
    </html>
  );
}
