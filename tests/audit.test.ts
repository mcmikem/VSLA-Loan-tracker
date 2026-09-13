import { describe, expect, it } from 'vitest';
import { withAudit } from '../src/utils/audit';
import type { VSLAState } from '../src/types';

function state(over: Partial<VSLAState> = {}): VSLAState {
  return {
    groupName: 'Test Group',
    boxIdentifier: 'BOX-T',
    cycle: 1,
    cycleMonth: 1,
    totalCycleMonths: 10,
    boxCashBalance: 0,
    loanFundBalance: 0,
    welfareFundBalance: 0,
    members: [],
    approvals: [],
    fines: [],
    welfareGrants: [],
    recentMeetingsCount: 1,
    lastBackupDate: new Date().toISOString(),
    snapshots: [],
    ...over,
  };
}

describe('withAudit', () => {
  it('prepends an entry with actor, action and amount', () => {
    const next = withAudit(state(), 'Grace A.', 'Approved loan REQ-1', 'Joseph (#02)', 600000);
    expect(next.auditLog).toHaveLength(1);
    expect(next.auditLog![0]).toMatchObject({
      actorName: 'Grace A.',
      action: 'Approved loan REQ-1',
      amount: 600000,
    });
    expect(typeof next.auditLog![0].id).toBe('string');
    expect(typeof next.auditLog![0].timestamp).toBe('string');
  });

  it('caps the log at 300 entries', () => {
    let s = state();
    for (let i = 0; i < 320; i++) s = withAudit(s, 'x', `action ${i}`, 'd');
    expect(s.auditLog).toHaveLength(300);
    expect(s.auditLog![0].action).toBe('action 319');
  });
});
