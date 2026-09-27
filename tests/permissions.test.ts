import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hasPermission, isMemberOnly, permissionRefusal } from '../src/utils/permissions';
import type { Language, UserAccount } from '../src/types';

function user(role: UserAccount['role'], permissions: Partial<UserAccount['permissions']>): UserAccount {
  return {
    id: 'u1',
    name: 'Officer',
    phone: '0772000000',
    provider: 'MTN',
    role,
    roleTitle: role,
    zone: 'Zone',
    pin: '4321',
    avatarInitials: 'O',
    avatarBg: '#fff',
    permissions: {
      canLockBox: false,
      canApproveLoans: false,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: false,
      canManageBackups: false,
      ...permissions,
    },
  };
}

const treasurer = user('treasurer', { canApproveLoans: true, canLockBox: true, canDisburseWelfare: true });
const secretary = user('secretary', { canRecordShares: true, canManageBackups: true });
const member = user('member', { canRequestLoan: true, canApproveLoans: true, canDisburseWelfare: true });

describe('a flag the app shows must be a flag the app keeps', () => {
  it('reads the permission, not the job title', () => {
    expect(hasPermission(treasurer, 'canDisburseWelfare')).toBe(true);
    expect(hasPermission(secretary, 'canDisburseWelfare')).toBe(false);
    expect(hasPermission(secretary, 'canRecordShares')).toBe(true);
    expect(hasPermission(undefined, 'canApproveLoans')).toBe(false);
  });

  it('a member holds no officer permission, however it is spelled', () => {
    expect(hasPermission(member, 'canApproveLoans')).toBe(false);
    expect(hasPermission(member, 'canDisburseWelfare')).toBe(false);
    expect(isMemberOnly(member)).toBe(true);
    expect(isMemberOnly(treasurer)).toBe(false);
  });

  it('says who to ask, in both languages', () => {
    const en: Language = 'EN';
    const lu: Language = 'LU';
    expect(permissionRefusal(secretary, 'canDisburseWelfare', en)).toMatch(/officer who may pay welfare/);
    expect(permissionRefusal(secretary, 'canDisburseWelfare', lu)).toMatch(/omukulu/);
    expect(permissionRefusal(secretary, 'canLockBox', en)).toMatch(/box key/);
    expect(permissionRefusal(member, 'canRecordShares', en)).toMatch(/not allowed to record shares/);
    for (const permission of ['canLockBox', 'canApproveLoans', 'canDisburseWelfare', 'canRecordShares', 'canRequestLoan', 'canManageBackups'] as const) {
      expect(permissionRefusal(secretary, permission, en).length).toBeGreaterThan(20);
      expect(permissionRefusal(secretary, permission, lu).length).toBeGreaterThan(10);
    }
  });
});

/**
 * The point of the guard is that it is in the handler, not only in the button:
 * a disabled button is a hint, the handler is the rule.
 */
describe('the money handlers check the flag', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  it('welfare payouts need the welfare permission', () => {
    expect(app).toContain("hasPermission(currentUser, 'canDisburseWelfare')");
    expect(app).toMatch(/const handleDisburseWelfareGrant[\s\S]{0,400}canDisburseWelfare/);
  });

  it('confirming a payout needs the approval permission', () => {
    expect(app).toMatch(/const handleConfirmPayout[\s\S]{0,400}canApproveLoans/);
  });

  it('moving the group float needs the box key', () => {
    expect(app).toMatch(/const handleTransferFunds[\s\S]{0,300}canLockBox/);
  });

  it('restoring or resetting the records needs the backup permission', () => {
    expect(app).toMatch(/const handleRestoreState[\s\S]{0,300}canManageBackups/);
    expect(app).toMatch(/const handleResetToBaseline[\s\S]{0,400}canManageBackups/);
  });

  it('the screens explain the refusal instead of failing on tap', () => {
    const welfare = readFileSync(new URL('../src/views/WelfareFundView.tsx', import.meta.url), 'utf8');
    const home = readFileSync(new URL('../src/views/HomeView.tsx', import.meta.url), 'utf8');
    expect(welfare).toContain('canDisburseWelfare = true');
    expect(welfare).toContain('You are not allowed to pay welfare money');
    expect(home).toContain('canMoveFloat = true');
    expect(home).toContain('Moving the group money is for the officer who holds the box key');
  });
});
