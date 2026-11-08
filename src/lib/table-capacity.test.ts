import { describe, expect, it } from 'vitest';
import { tableCapacityMessage } from './table-capacity';
describe('table capacity feedback', () => {
  it('allows partially occupied tables', () => expect(tableCapacityMessage(95, 10, 12)).toBeNull());
  it('reports insufficient menu tables', () =>
    expect(tableCapacityMessage(101, 10, 12)).toContain('11 bàn'));
  it('reports the hall layout table maximum', () =>
    expect(tableCapacityMessage(100, 20, 12)).toContain('12 bàn'));
  it('does not imply a layout exists when the published count is zero', () =>
    expect(tableCapacityMessage(10, 1, 0)).toContain('chưa có sơ đồ'));
});
