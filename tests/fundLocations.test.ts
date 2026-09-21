import { describe, expect, it } from 'vitest';
import { applyTransfer, fundBalances, totalFunds, transferError } from '../src/utils/fundLocations';
import type { VSLAState } from '../src/types';

const base = {
  boxCashBalance: 100000,
  momoBalance: 50000,
  bankBalance: 0,
} as VSLAState;

describe('fund locations', () => {
  it('defaults missing floats to zero for old states', () => {
    expect(fundBalances({ boxCashBalance: 70000 } as VSLAState)).toEqual({ cash: 70000, momo: 0, bank: 0 });
    expect(totalFunds({ boxCashBalance: 70000 } as VSLAState)).toBe(70000);
  });

  it('totals cash + momo + bank', () => {
    expect(totalFunds(base)).toBe(150000);
  });

  it('blocks same-place, zero, and overdraft transfers', () => {
    expect(transferError(base, 'cash', 'cash', 1000)).toMatch(/different/);
    expect(transferError(base, 'cash', 'momo', 0)).toMatch(/above zero/);
    expect(transferError(base, 'cash', 'momo', 200000)).toMatch(/Not enough/);
    expect(transferError(base, 'cash', 'momo', 50000)).toBeNull();
  });

  it('moves money without creating or destroying any', () => {
    const next = applyTransfer(base, 'cash', 'momo', 30000);
    expect(next.boxCashBalance).toBe(70000);
    expect(next.momoBalance).toBe(80000);
    expect((next.boxCashBalance || 0) + (next.momoBalance || 0) + (next.bankBalance || 0)).toBe(150000);
  });
});
