import { describe, expect, it } from 'vitest';
import { firstKeyUpdate, isSameOfficer, needsSecondKey, describeKeys } from '../src/utils/dualApproval';
import { isDefaultPin } from '../src/utils/pin';
import { estimateMoMoFee, feeNotice } from '../src/utils/momoFees';
import type { ApprovalItem } from '../src/types';

function item(over: Partial<ApprovalItem> = {}): ApprovalItem {
  return {
    id: 'app-1',
    type: 'vsla_loan',
    reqNumber: 'Req #LN-1',
    timeText: 'now',
    memberName: 'Joseph',
    memberNo: '02',
    initiator: 'Sec',
    amount: 600000,
    status: 'pending',
    ...over,
  };
}

describe('two-key rule', () => {
  it('first key keeps status pending and records officer', () => {
    const next = firstKeyUpdate(item(), 'Grace Akello', '2026-01-01T00:00:00.000Z');
    expect(next.firstApprovedBy).toBe('Grace Akello');
    expect(next.status).toBe('pending');
    expect(needsSecondKey(next)).toBe(true);
  });

  it('same officer cannot turn both keys (case-insensitive)', () => {
    const keyed = item({ firstApprovedBy: 'Grace Akello' });
    expect(isSameOfficer(keyed, 'grace akello')).toBe(true);
    expect(isSameOfficer(keyed, 'Peter Ssemwogerere')).toBe(false);
  });

  it('describes 0/2 and 1/2 states', () => {
    expect(describeKeys(item())).toContain('0/2');
    expect(describeKeys(item({ firstApprovedBy: 'Grace' }))).toContain('1/2');
  });
});

describe('PIN hardening', () => {
  it('detects default PIN', () => {
    expect(isDefaultPin('1234')).toBe(true);
    expect(isDefaultPin('4321')).toBe(false);
    expect(isDefaultPin(undefined)).toBe(false);
  });
});

describe('MoMo fee transparency', () => {
  it('cash is always zero fee', () => {
    expect(estimateMoMoFee(600000, 'Cash')).toBe(0);
  });
  it('larger amounts pay larger estimate but capped', () => {
    const small = estimateMoMoFee(50_000, 'MTN');
    const big = estimateMoMoFee(600_000, 'MTN');
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThanOrEqual(12_500);
  });
  it('notice mentions cash alternative', () => {
    expect(feeNotice(600000, 'MTN')).toContain('Cash');
  });
});
