import { describe, expect, it } from 'vitest';
import { minimumEventDate } from './event-date';

describe('minimum booking date', () => {
  it.each([
    ['2026-10-08T16:59:59Z', '2026-10-10'],
    ['2026-10-08T17:00:00Z', '2026-10-11'],
    ['2026-12-30T17:00:00Z', '2027-01-02'],
    ['2028-02-27T17:00:00Z', '2028-03-01'],
  ])('uses the day after tomorrow in Vietnam at %s', (now, minimum) => {
    expect(minimumEventDate(new Date(now))).toBe(minimum);
  });
});
