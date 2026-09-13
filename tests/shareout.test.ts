import { describe, expect, it } from 'vitest';
import { computeShareOut } from '../src/utils/shareout';
import type { Member } from '../src/types';

function member(over: Partial<Member> = {}): Member {
  return {
    id: 'm-x',
    no: '01',
    name: 'Test Member',
    initials: 'TM',
    zone: 'Zone',
    phone: '0772000000',
    provider: 'MTN',
    attendance: '1/1',
    sharesCount: 10,
    sharesTotal: 100000,
    maxBorrowLimit: 300000,
    loanBalance: 0,
    welfareBalance: 0,
    isKeyholder: false,
    stamps: [],
    ledger: [],
    ...over,
  };
}

describe('computeShareOut', () => {
  it('splits pool pro-rata by shares', () => {
    const r = computeShareOut(
      [member({ id: 'a', sharesCount: 10, sharesTotal: 100000 }), member({ id: 'b', no: '02', sharesCount: 30, sharesTotal: 300000 })],
      0,
      0
    );
    expect(r.totalSharesSold).toBe(40);
    expect(r.payouts[1].grossPayout).toBe(r.payouts[0].grossPayout * 3);
  });

  it('deducts outstanding loans from payouts, never below zero', () => {
    const r = computeShareOut(
      [member({ id: 'a', sharesCount: 10, sharesTotal: 100000, loanBalance: 1000000 })],
      0,
      0
    );
    expect(r.payouts[0].netPayout).toBe(0);
    expect(r.payouts[0].deductedLoan).toBe(r.payouts[0].grossPayout);
  });

  it('adds interest and fines into the pool', () => {
    const base = computeShareOut([member()], 0, 0);
    const rich = computeShareOut([member()], 1000000, 50000);
    expect(rich.totalPool).toBe(base.totalPool + Math.round(1000000 * 0.32) + 50000);
  });

  it('handles an empty roster without NaN', () => {
    const r = computeShareOut([], 0, 0);
    expect(r.valuePerShare).toBe(0);
    expect(r.totalNetPayout).toBe(0);
  });
});
