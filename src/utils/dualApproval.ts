import { ApprovalItem, Language, UserAccount } from '../types';
import { isDefaultPin, verifyPinLocally } from './pin';

/**
 * Two-key rule for village trust.
 * - First distinct officer turns key 1/2: no money moves, status stays pending.
 * - Second DISTINCT officer turns key 2/2: money may move, status -> approved.
 * - Same officer cannot turn both keys.
 */

export function needsSecondKey(item: ApprovalItem): boolean {
  return item.status === 'pending' && !!item.firstApprovedBy;
}

export function isSameOfficer(item: ApprovalItem, actorName: string): boolean {
  return (item.firstApprovedBy || '').trim().toLowerCase() === (actorName || '').trim().toLowerCase();
}

export function describeKeys(item: ApprovalItem): string {
  if (item.status !== 'pending') return item.status;
  if (!item.firstApprovedBy) return '0/2 keys — needs 2 different officers';
  return `1/2 keys — ${item.firstApprovedBy} turned first key, needs a DIFFERENT officer`;
}

export function firstKeyUpdate(item: ApprovalItem, actorName: string, nowIso: string, payoutMethod?: string): ApprovalItem {
  return {
    ...item,
    firstApprovedBy: actorName,
    firstApprovedAt: nowIso,
    ...(payoutMethod ? { payoutMethod } : {}),
  };
}

// ---------- share-out: the same two-key rule on the biggest payment ----------
//
// A share-out empties the box and the loan fund. It gets the same ceremony as a
// loan, and the keys are recorded against the CYCLE, so a key left over from a
// previous cycle can never release this one.

export interface ShareOutApproval {
  cycle: number;
  firstApprovedBy: string;
  firstApprovedAt: string;
  secondApprovedBy?: string;
  secondApprovedAt?: string;
}

/** The keys recorded for this cycle, ignoring any left over from an older one. */
export function shareOutForCycle(
  approval: ShareOutApproval | undefined,
  cycle: number
): ShareOutApproval | undefined {
  if (!approval) return undefined;
  return Number(approval.cycle) === Number(cycle) ? approval : undefined;
}

export function sameName(a?: string, b?: string): boolean {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

export function shareOutNeedsSecondKey(approval: ShareOutApproval | undefined, cycle: number): boolean {
  const live = shareOutForCycle(approval, cycle);
  return Boolean(live && !live.secondApprovedBy);
}

export function describeShareOutKeys(approval: ShareOutApproval | undefined, cycle: number): string {
  const live = shareOutForCycle(approval, cycle);
  if (!live) return '0/2 keys — needs 2 different officers';
  if (live.secondApprovedBy) return `2/2 keys — released by ${live.secondApprovedBy}`;
  return `1/2 keys — ${live.firstApprovedBy} turned first key, needs a DIFFERENT officer`;
}

export function firstKeyShareOut(cycle: number, actorName: string, nowIso: string): ShareOutApproval {
  return { cycle, firstApprovedBy: actorName, firstApprovedAt: nowIso };
}

export function secondKeyShareOut(
  approval: ShareOutApproval,
  actorName: string,
  nowIso: string
): ShareOutApproval {
  return { ...approval, secondApprovedBy: actorName, secondApprovedAt: nowIso };
}

/** Officers who can turn a key, by distinct name — duplicates cannot count twice. */
export function distinctApproverNames(accounts: UserAccount[] | undefined): string[] {
  const names = (accounts || [])
    .filter((a) => a.permissions?.canApproveLoans)
    .map((a) => (a.name || '').trim())
    .filter(Boolean);
  return Array.from(new Set(names.map((n) => n.toLowerCase())));
}

/** True when the group has enough distinct officers for the two-key rule. */
export function twoKeyPossible(accounts: UserAccount[] | undefined): boolean {
  return distinctApproverNames(accounts).length >= 2;
}

// ---------- verifying the officer actually holding the phone ----------

export type OfficerKeyCode = 'unknown' | 'secure' | 'wrong' | 'default' | 'not-approved';

/**
 * A plain result shape, not a union: the app's tsconfig does not turn on
 * strictNullChecks, so a discriminated union would not narrow at the call site.
 */
export interface OfficerKeyResult {
  ok: boolean;
  name: string;
  /** Set whenever ok is false — already worded for whoever is holding the phone. */
  error?: string;
}

/**
 * One place where "is this really that officer?" is answered, so the loan flow
 * and the share-out flow can never drift apart on the rules.
 */
export function verifyOfficerKey(
  accounts: UserAccount[] | undefined,
  officerId: string,
  pin: string,
  options: { requireApprover?: boolean; language?: Language } = {}
): OfficerKeyResult {
  const language = options.language || 'EN';
  const account = (accounts || []).find((a) => a.id === officerId);
  if (!account) return { ok: false, name: '', error: officerKeyErrorMessage('unknown', '', language) };
  const name = account.name;
  const fail = (code: OfficerKeyCode): OfficerKeyResult => ({
    ok: false,
    name,
    error: officerKeyErrorMessage(code, name, language),
  });
  if (options.requireApprover && !account.permissions?.canApproveLoans) return fail('not-approved');
  // The server's scrypt format cannot be checked in the browser, so an account
  // that signs in securely must be approved from the signed-in session.
  if (String(account.pin || '').startsWith('hash:')) return fail('secure');
  // A verifier, or a legacy plaintext PIN from a group created before the
  // verifier existed. verifyPinLocally covers both, in constant time.
  if (!pin || !verifyPinLocally(pin, account.pin)) return fail('wrong');
  // isDefaultPin reads the flag out of a verifier, so the gate that stops a
  // default PIN moving money still works now that the PIN is not stored.
  if (isDefaultPin(account.pin)) return fail('default');
  return { ok: true, name };
}

/** The wording officers already know from the loan ceremony, shared by both. */
export function officerKeyErrorMessage(code: OfficerKeyCode, name: string, language: Language): string {
  const lu = language === 'LU';
  if (code === 'unknown') return lu ? 'Londa omukulu mu list.' : 'Unknown officer. Pick a name from the list.';
  if (code === 'secure') {
    return 'This account uses secure sign-in — switch to it from Users (PIN gate) so its key is verified, then approve.';
  }
  if (code === 'not-approved') {
    return lu
      ? `${name} tasobola kukkiriza ssente. Yoola omukulu w’ekikwata okuyisa.`
      : `${name} is not allowed to approve payments. Hand the phone to an officer who can.`;
  }
  if (code === 'wrong') {
    return lu ? `PIN si ntuufu — wa ssimu eri ${name}.` : `Wrong PIN for ${name}. Hand the phone to that officer.`;
  }
  return lu
    ? `${name} akyakozesa PIN 1234 — Kyuusa PIN esooke.`
    : `${name} still uses default PIN 1234 — change it (Account → Change PIN) before turning keys.`;
}

export interface ShareOutKeyResult {
  error?: string;
  /** key 1 recorded; the money has not moved and a different officer is needed. */
  keyTurned?: boolean;
  /** key 2 turned: members paid, cycle closed. */
  executed?: boolean;
}
