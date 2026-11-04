import { describe, expect, it } from 'vitest';
import { DEMO_PRINT_ORDERS } from './print-orders-fixtures';
import { printOrderDisplay } from './print-orders-types';

describe('authoritative print booking context', () => {
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
