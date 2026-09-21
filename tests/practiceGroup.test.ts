import { describe, expect, it } from 'vitest';
import { buildPracticeState, isPracticeGroup, PRACTICE_GROUP_ID } from '../src/utils/practiceGroup';

describe('practice group', () => {
  it('builds a clearly-fake 5-member play-money group', () => {
    const s = buildPracticeState();
    expect(s.groupId).toBe(PRACTICE_GROUP_ID);
    expect(s.members).toHaveLength(5);
    expect(s.groupName.toLowerCase()).toContain('practice');
    expect(s.groupName.toLowerCase()).toContain('play money');
    expect(isPracticeGroup(s.groupId)).toBe(true);
    expect(isPracticeGroup('bakwata-01')).toBe(false);
  });

  it('has debtors and savers so both flows can be tried', () => {
    const s = buildPracticeState();
    expect(s.members.some((m) => m.loanBalance > 0)).toBe(true);
    expect(s.members.some((m) => m.loanBalance === 0)).toBe(true);
    expect(s.boxCashBalance).toBeGreaterThan(0);
  });
});
