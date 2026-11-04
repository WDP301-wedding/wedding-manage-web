import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { PrintOrderCommercialCard } from './print-order-commercial-card';
import { DEMO_PRINT_ORDERS } from './print-orders-fixtures';
import { printOrderDisplay } from './print-orders-types';

describe('authoritative print booking context', () => {
  it('renders the same booking context in the commercial summary card', () => {
    render(
      createElement(PrintOrderCommercialCard, {
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
      }),
    );
    expect(screen.getByText('cuong & cuong')).toBeVisible();
    expect(screen.getByText('18/11/2026')).toBeVisible();
    expect(screen.getByText('Lotus Hall')).toBeVisible();
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
