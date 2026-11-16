import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { PrintOrdersDetail } from './print-orders-detail';
import { DEMO_PRINT_ORDERS } from './print-orders-fixtures';
import { printOrderDisplay } from './print-orders-types';

describe('authoritative print booking context', () => {
  it('renders the authoritative booking context in the order details', () => {
    render(
      createElement(PrintOrdersDetail, {
        selectedOrder: {
          ...DEMO_PRINT_ORDERS[0]!,
          bookingSummary: {
            bookingCode: 'HY-000030',
            brideName: 'cuong',
            groomName: 'cuong',
            eventDate: '2026-11-18',
            hallName: 'Lotus Hall',
          },
        },
        isSubmitting: false,
        onStartProduction: vi.fn(),
        onMarkReady: vi.fn(),
        onOpenHandoverModal: vi.fn(),
        onOpenQuoteDrawer: vi.fn(),
        onOpenCancelModal: vi.fn(),
      }),
    );
    expect(screen.getByText('cuong & cuong')).toBeVisible();
    expect(screen.getByText('18/11/2026 · Lotus Hall')).toBeVisible();
    expect(screen.getByText('Mã đặt tiệc HY-000030')).toBeVisible();
  });
  it('uses explicit couple names, snapshotted hall and a timezone-independent event date', () => {
    expect(
      printOrderDisplay({
        ...DEMO_PRINT_ORDERS[0]!,
        bookingSummary: {
          bookingCode: 'HY-000030',
          brideName: 'cuong',
          groomName: 'cuong',
          eventDate: '2026-11-18',
          hallName: 'Lotus Hall',
        },
      }),
    ).toEqual({ couple: 'cuong & cuong', eventDate: '18/11/2026', hall: 'Lotus Hall' });
  });
  it('preserves optional names without splitting a legacy display label', () => {
    expect(
      printOrderDisplay({
        ...DEMO_PRINT_ORDERS[0]!,
        displayCouple: undefined,
        bookingSummary: {
          bookingCode: 'HY-000030',
          brideName: null,
          groomName: 'Cường',
          eventDate: '2026-11-18',
          hallName: null,
        },
      }).couple,
    ).toBe('Cường');
  });
});
