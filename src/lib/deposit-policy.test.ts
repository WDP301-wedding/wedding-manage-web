import { describe, expect, it } from 'vitest';
import { contractDepositRate, restaurantDepositPercentage } from './deposit-policy';
describe('frozen deposit percentage', () => {
  it('reads the contract snapshot, preserves legacy 30 and rejects malformed percentages', () => {
    expect(contractDepositRate({ depositRate: 50, depositAmountVnd: 51 })).toBe(50);
    expect(contractDepositRate({ depositAmountVnd: 1 })).toBe(30);
    expect(restaurantDepositPercentage({ depositPercentage: 100 })).toBe(100);
    for (const invalid of [0, 101, 30.5, '50'])
      expect(() => contractDepositRate({ depositRate: invalid })).toThrow();
  });
});
