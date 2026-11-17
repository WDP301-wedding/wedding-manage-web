import { ActiveBookingBoundary } from '@/src/features/booking-archive/boundaries/active-booking-boundary';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import '@/src/styles/components/select-field.css';
import { SessionRevocationBoundary } from '@/src/features/identity-access/session/session-revocation-boundary';
import { NotificationProvider } from '@/src/design-system/notifications/index';

export const metadata: Metadata = {
  title: { default: 'Tổng quan vận hành | Hỷ Yến Quản trị', template: '%s | Hỷ Yến Quản trị' },
  description: 'Không gian vận hành dành cho quản lý và nhân viên nhà hàng.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi">
      <body>
        <SessionRevocationBoundary>
          <NotificationProvider>
            <ActiveBookingBoundary>{children}</ActiveBookingBoundary>
          </NotificationProvider>
        </SessionRevocationBoundary>
      </body>
    </html>
  );
}
