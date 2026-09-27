/**
 * The permission flags the group actually shows in Users — "can approve
 * payments", "holds the box key", "can pay welfare", "can record shares",
 * "can back up" — have to be real. A flag that is displayed but never checked
 * teaches officers it is decoration, and then the one time it matters the flag
 * is worthless.
 *
 * One wording, one place: every refusal names the permission and the person to
 * ask, in the language the officer is reading.
 */
import { Language, UserAccount } from '../types';

export type Permission = keyof UserAccount['permissions'];

export function hasPermission(user: UserAccount | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === 'member') return false;
  return user.permissions?.[permission] === true;
}

const ROLE_THAT_HOLDS_IT: Record<Permission, string> = {
  canLockBox: 'the officer who holds the box key',
  canApproveLoans: 'an officer who may approve payments',
  canDisburseWelfare: 'an officer who may pay welfare',
  canRecordShares: 'an officer who may record shares',
  canRequestLoan: 'an officer who may ask for a loan',
  canManageBackups: 'an officer who may back up the records',
};

const REFUSAL: Record<Permission, { en: string; lu: string }> = {
  canLockBox: {
    en: 'Only the officer holding the box key can do this.',
    lu: 'Omuliro gumala n’omukwasi w’ekisanduku asobola kukikola kino.',
  },
  canApproveLoans: {
    en: 'You are not allowed to approve payments. Ask an officer who is.',
    lu: 'Tosobola kukkiriza ssente. Buulira omukulu asobola.',
  },
  canDisburseWelfare: {
    en: 'You are not allowed to pay welfare money. Ask the officer who is.',
    lu: 'Tosobola kusula ssali n’obuyambi. Buulira omukulu asobola.',
  },
  canRecordShares: {
    en: 'You are not allowed to record shares. Ask the officer who is.',
    lu: 'Tosobola kuwandika emigabo. Buulira omukulu asobola.',
  },
  canRequestLoan: {
    en: 'You are not allowed to ask for a loan.',
    lu: 'Tosobola kusaba ekyewolo.',
  },
  canManageBackups: {
    en: 'You are not allowed to change the records backup. Ask the officer who is.',
    lu: 'Tosobola kikyendereza endandikwa. Buulira omukulu asobola.',
  },
};

/** The sentence an officer reads when a tap is refused. */
export function permissionRefusal(
  user: UserAccount | undefined,
  permission: Permission,
  language: Language = 'EN'
): string {
  const text = REFUSAL[permission][language === 'LU' ? 'lu' : 'en'];
  return `${text} (${ROLE_THAT_HOLDS_IT[permission]})`;
}

/** True when a member may do this — members only ever ask, never pay out. */
export function isMemberOnly(user: UserAccount | undefined): boolean {
  return user?.role === 'member';
}
