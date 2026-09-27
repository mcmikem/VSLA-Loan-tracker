import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  describeShareOutKeys,
  distinctApproverNames,
  firstKeyShareOut,
  officerKeyErrorMessage,
  sameName,
  secondKeyShareOut,
  shareOutForCycle,
  shareOutNeedsSecondKey,
  twoKeyPossible,
  verifyOfficerKey,
} from '../src/utils/dualApproval';
import type { UserAccount } from '../src/types';

function officer(id: string, name: string, over: Partial<UserAccount> = {}): UserAccount {
  return {
    id,
    name,
    phone: '0772000000',
    provider: 'MTN',
    role: 'treasurer',
    roleTitle: 'Treasurer',
    zone: 'Zone',
    pin: '4321',
    avatarInitials: 'T',
    avatarBg: '#fff',
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: false,
      canRecordShares: true,
      canRequestLoan: true,
      canManageBackups: false,
    },
    ...over,
  };
}

const treasurer = officer('o1', 'Grace Nakato');
const chair = officer('o2', 'Peter Mwangi');
const secretary = officer('o3', 'Sarah Nabu', {
  permissions: {
    canLockBox: false,
    canApproveLoans: false,
    canDisburseWelfare: false,
    canRecordShares: true,
    canRequestLoan: false,
    canManageBackups: true,
  },
});

describe('keys belong to the cycle, not the account', () => {
  it('ignores a key left over from a previous cycle', () => {
    const stale = firstKeyShareOut(3, 'Grace Nakato', '2026-03-01T10:00:00.000Z');
    expect(shareOutForCycle(stale, 3)?.firstApprovedBy).toBe('Grace Nakato');
    expect(shareOutForCycle(stale, 4)).toBeUndefined();
    expect(shareOutNeedsSecondKey(stale, 4)).toBe(false);
    expect(shareOutForCycle(undefined, 4)).toBeUndefined();
  });

  it('needs a second key after the first, and not after the second', () => {
    const one = firstKeyShareOut(4, 'Grace Nakato', '2026-04-01T10:00:00.000Z');
    expect(shareOutNeedsSecondKey(one, 4)).toBe(true);
    const two = secondKeyShareOut(one, 'Peter Mwangi', '2026-04-01T10:05:00.000Z');
    expect(shareOutNeedsSecondKey(two, 4)).toBe(false);
    expect(two).toMatchObject({
      cycle: 4,
      firstApprovedBy: 'Grace Nakato',
      secondApprovedBy: 'Peter Mwangi',
    });
  });

  it('describes where the ceremony stands, by name', () => {
    expect(describeShareOutKeys(undefined, 4)).toMatch(/0\/2/);
    expect(describeShareOutKeys(firstKeyShareOut(4, 'Grace', 'x'), 4)).toMatch(/1\/2.*Grace.*DIFFERENT/);
    expect(describeShareOutKeys(secondKeyShareOut(firstKeyShareOut(4, 'Grace', 'x'), 'Peter', 'y'), 4)).toMatch(/2\/2.*Peter/);
    expect(sameName(' grace nakato ', 'Grace Nakato')).toBe(true);
    expect(sameName('Grace', 'Peter')).toBe(false);
  });
});

describe('enough officers for the two-key rule', () => {
  it('counts distinct names, not logins', () => {
    expect(distinctApproverNames([treasurer, chair])).toEqual(['grace nakato', 'peter mwangi']);
    // the same person twice on the roster is still one pair of hands
    expect(distinctApproverNames([treasurer, officer('o9', 'Grace Nakato')])).toEqual(['grace nakato']);
  });

  it('needs the permission to approve payments', () => {
    expect(twoKeyPossible([treasurer, secretary])).toBe(false);
    expect(twoKeyPossible([treasurer, chair])).toBe(true);
    expect(twoKeyPossible([])).toBe(false);
    expect(twoKeyPossible(undefined)).toBe(false);
  });
});

describe('the officer holding the phone', () => {
  it('is identified by their own PIN, never by who is logged in', () => {
    expect(verifyOfficerKey([treasurer], 'o1', '4321')).toMatchObject({ ok: true, name: 'Grace Nakato' });
  });

  it('is refused for every reason that matters', () => {
    const code = (r: ReturnType<typeof verifyOfficerKey>) => (r.error && r.error.length ? r : r);
    expect(verifyOfficerKey([treasurer], 'nope', '4321').ok).toBe(false);
    expect(verifyOfficerKey([treasurer], 'o1', '0000').error).toMatch(/Wrong PIN for Grace/);
    expect(verifyOfficerKey([treasurer], 'o1', '').error).toMatch(/Wrong PIN for Grace/);
    expect(verifyOfficerKey([treasurer], 'o1', undefined as unknown as string).error).toMatch(/Wrong PIN/);
    expect(verifyOfficerKey([officer('o4', 'Default Guy', { pin: '1234' })], 'o4', '1234').error).toMatch(/default PIN 1234/);
    expect(verifyOfficerKey([officer('o5', 'Secure Guy', { pin: 'hash:abc' })], 'o5', '4321').error).toMatch(/secure sign-in/);
    expect(verifyOfficerKey([treasurer], 'nope', '4321').error).toMatch(/Unknown officer/);
    expect(code(verifyOfficerKey([treasurer], 'o1', '4321')).error).toBeUndefined();
  });

  it('cannot turn a share-out key without the approval permission', () => {
    expect(verifyOfficerKey([treasurer, secretary], 'o3', '4321')).toMatchObject({ ok: true, name: 'Sarah Nabu' });
    expect(verifyOfficerKey([treasurer, secretary], 'o3', '4321', { requireApprover: true })).toMatchObject({
      ok: false,
      name: 'Sarah Nabu',
    });
    expect(verifyOfficerKey([treasurer, secretary], 'o3', '4321', { requireApprover: true }).error).toMatch(
      /not allowed to approve payments/
    );
  });

  it('names the officer in every refusal, in both languages', () => {
    for (const language of ['EN', 'LU'] as const) {
      expect(officerKeyErrorMessage('wrong', 'Grace', language)).toContain('Grace');
      expect(officerKeyErrorMessage('default', 'Grace', language)).toContain('Grace');
      expect(officerKeyErrorMessage('not-approved', 'Sarah', language)).toContain('Sarah');
      expect(officerKeyErrorMessage('secure', 'Grace', language)).toMatch(/secure sign-in/);
      expect(officerKeyErrorMessage('unknown', '', language).length).toBeGreaterThan(0);
    }
  });
});

/**
 * A ceremony that exists only in a component is no ceremony at all: these
 * guards fail if the payout path stops demanding two keys.
 */
describe('the ceremony is wired to the payout', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const app = read('src/App.tsx');
  const view = read('src/views/CycleShareOutView.tsx');

  it('share-out keys require the approval permission', () => {
    expect(app).toContain('requireApprover: true');
  });

  it('key 1 moves no money and key 2 comes from a different officer', () => {
    expect(app).toContain('First key (1/2) for cycle ${vslaState.cycle} share-out');
    expect(app).toContain('no money moved');
    expect(app).toContain('return { keyTurned: true }');
    expect(app).toContain('already turned key 1/2');
    expect(app).toContain('secondKeyShareOut(');
  });

  it('a group with one officer is warned, not blocked', () => {
    expect(app).toContain("if (keysPossible) {");
    expect(app).toContain('singleOfficer: currentUser.name');
    expect(view).toContain('Only one officer can approve payments');
  });

  it('the screen shows the stepper and hands the phone over', () => {
    expect(view).toContain('<KeyStepper');
    expect(view).toContain('<ApprovalsKeyModal');
    expect(view).toContain('excludeName={liveApproval?.firstApprovedBy}');
    expect(view).toContain("onConfirm={handleKeyConfirm}");
  });
});
