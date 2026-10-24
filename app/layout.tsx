import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import './select.css';
import { SessionRevocationBoundary } from '../src/features/identity-access/session-revocation-boundary';

export const metadata: Metadata = {
  title: 'Tổng quan vận hành | Wedding Operations',
  description: 'Không gian vận hành dành cho quản lý và nhân viên nhà hàng.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi">
      <body>
        <SessionRevocationBoundary>{children}</SessionRevocationBoundary>
      </body>
    </html>
  );
}
