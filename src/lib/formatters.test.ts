import { describe, expect, it } from 'vitest';
import {
  formatCurrencyVnd,
  formatVnd,
  formatVndNullable,
  formatVndSymbol,
  money,
} from './formatters';

describe('formatters', () => {
  it('formats positive integers with Vietnamese thousand separators and ₫ symbol', () => {
    expect(formatVnd(1500000)).toMatch(/1\.500\.000\s?₫/);
    expect(formatVndSymbol(1500000)).toMatch(/1\.500\.000\s?₫/);
    expect(formatCurrencyVnd(1500000)).toMatch(/1\.500\.000\s?₫/);
    expect(money(1500000)).toMatch(/1\.500\.000\s?₫/);
  });

  it('rounds decimal VND amounts properly without decimals', () => {
    expect(formatVnd(123456.7)).toMatch(/123\.457\s?₫/);
  });

  it('formats zero correctly', () => {
    expect(formatVnd(0)).toMatch(/0\s?₫/);
  });

  it('handles nullable amounts gracefully', () => {
    expect(formatVndNullable(null)).toBe('—');
    expect(formatVndNullable(undefined)).toBe('—');
    expect(formatVndNullable(Number.NaN)).toBe('—');
    expect(formatVndNullable(2500000)).toMatch(/2\.500\.000\s?₫/);
  });
});
