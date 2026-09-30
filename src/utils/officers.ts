/**
 * Who is allowed to move money — and changing that.
 *
 * The two-key ceremony only means something if the people who can turn the keys
 * cannot simply add themselves another pair of hands. So adding an officer,
 * changing a role, granting a permission or resetting a PIN is itself a
 * two-key decision, recorded in an authority register beside the money.
 *
 * Two rules are never negotiable, because breaking either one silently disables
 * the whole model:
 *  - nobody may change their own authority (no self-escalation, no self-lockout)
 *  - the last officer who may approve payments can never be removed or demoted
 */
import { PendingOfficerChange, UserAccount } from '../types';
import { derivePinVerifier } from './pin';

export type OfficerChangeKind = 'add' | 'role' | 'permissions' | 'pin' | 'remove';

export interface OfficerChange {
  id: string;
  at: string;
  kind: OfficerChangeKind;
  /** The account the change is about; absent for 'add'. */
  officerId?: string;
  officerName: string;
  /** One line, in the officers' own words, for the register. */
  summary: string;
  /** What was applied once key 2 turned. */
  patch?: Partial<UserAccount> & { pin?: string };
  firstKeyBy: string;
  firstKeyAt: string;
  secondKeyBy?: string;
  secondKeyAt?: string;
}

export const OFFICER_ROLES: { id: UserAccount['role']; label: string; labelLu: string }[] = [
  { id: 'secretary', label: 'Secretary', labelLu: 'Munaasiki' },
  { id: 'treasurer', label: 'Treasurer', labelLu: 'Mufunye nsimbi' },
  { id: 'chairperson', label: 'Chairperson', labelLu: 'Mukiizi w’ekibiina' },
  { id: 'keyholder', label: 'Keyholder', labelLu: 'Omukwasi w’ebisumuluzo' },
];

const name = (a?: UserAccount) => (a?.name || '').trim();
const sameName = (a?: string, b?: string) => name({ name: a } as UserAccount).toLowerCase() === name({ name: b } as UserAccount).toLowerCase();

/** Officers manage officers; a member account never can. */
export function canManageOfficers(account?: UserAccount): boolean {
  return Boolean(account && account.role !== 'member');
}

export function isApprover(account?: UserAccount): boolean {
  return Boolean(account?.permissions?.canApproveLoans);
}

export function approverCount(accounts: UserAccount[] | undefined): number {
  const names = (accounts || []).filter(isApprover).map((a) => a.name.trim().toLowerCase());
  return new Set(names).size;
}

export interface NewOfficerDraft {
  name: string;
  phone: string;
  role: UserAccount['role'];
  roleTitle: string;
  provider: 'MTN' | 'Airtel';
  pin: string;
  canLockBox: boolean;
  canApproveLoans: boolean;
  canRecordShares: boolean;
  canDisburseWelfare: boolean;
  canManageBackups: boolean;
}

export const EMPTY_OFFICER: NewOfficerDraft = {
  name: '',
  phone: '',
  role: 'keyholder',
  roleTitle: 'Keyholder',
  provider: 'MTN',
  pin: '',
  canLockBox: false,
  canApproveLoans: true,
  canRecordShares: true,
  canDisburseWelfare: false,
  canManageBackups: false,
};

/**
 * How many officers could still turn a key once a change is written. The
 * two-key rule needs two, so a change must never quietly leave one.
 */
export function approversAfter(
  accounts: UserAccount[],
  change: {
    kind: OfficerChangeKind;
    targetId?: string;
    newAccount?: { permissions?: { canApproveLoans?: boolean } };
    patch?: { permissions?: { canApproveLoans?: boolean } };
  }
): number {
  const names = (accounts || []).filter(isApprover).map((a) => a.name.trim().toLowerCase());
  const kept = names.filter((name) => name !== (accounts.find((a) => a.id === change.targetId)?.name || '').trim().toLowerCase());
  if (change.kind === 'add') {
    if (change.newAccount?.permissions?.canApproveLoans) kept.push(`+${kept.length}`);
    return new Set(kept).size;
  }
  if (change.kind === 'remove') return new Set(kept).size;
  if (change.kind === 'permissions' && change.patch?.permissions?.canApproveLoans === false) {
    return new Set(kept).size;
  }
  return new Set(names).size;
}

export const FALLS_BELOW_TWO_KEYS = 'This would leave fewer than two officers able to approve payments, which switches the two-key rule off. Add another keyholder instead.';

export interface OfficerChangeRequest {
  kind: OfficerChangeKind;
  actor: UserAccount;
  accounts: UserAccount[];
  /** Existing officer being changed; required for everything but 'add'. */
  targetId?: string;
  draft?: NewOfficerDraft;
  /** The officer who turned key 1 for this change, if any. */
  firstKeyBy?: string;
  firstKeyAt?: string;
}

export interface OfficerChangeCheck {
  ok: boolean;
  problems: string[];
  /** The officer whose key 2 is needed (never the same as key 1). */
  secondKeyOptions: UserAccount[];
  summary: string;
}

const UGX_PHONE = /^\+?256\d{9}$|^0\d{9}$|^256\d{9}$/;

function describe(draft: NewOfficerDraft): string {
  return `${draft.name.trim()} as ${draft.role}${draft.canApproveLoans ? ' (can approve payments)' : ''}`;
}

/**
 * Everything that must be true before an authority change can be recorded, in
 * words the officers can act on. Empty problems means key 1 is allowed.
 */
export function checkOfficerChange(request: OfficerChangeRequest): OfficerChangeCheck {
  const problems: string[] = [];
  const { kind, actor, accounts, targetId, draft } = request;
  const target = accounts.find((a) => a.id === targetId);
  const otherOfficers = accounts.filter((a) => a.role !== 'member' && !sameName(a.name, actor.name));

  if (!canManageOfficers(actor)) {
    problems.push('Only an officer can change the officers on this group.');
  }
  if (!otherOfficers.length && kind !== 'add') {
    problems.push('There is no other officer to turn the second key.');
  }
  if (request.firstKeyBy && !otherOfficers.some((o) => !sameName(o.name, request.firstKeyBy))) {
    problems.push('The second key must come from an officer other than the one who turned key 1.');
  }

  if (kind === 'add') {
    if (!draft) problems.push('Fill in the new officer’s details.');
    else {
      if (draft.name.trim().length < 3) problems.push('Enter the officer’s full name.');
      const digits = draft.phone.replace(/\D/g, '');
      if (digits.length > 0 && !UGX_PHONE.test(draft.phone.trim())) {
        problems.push('Use a valid Ugandan phone number, like 0772 000 000.');
      }
      if (!/^\d{4,8}$/.test(draft.pin)) problems.push('Give the officer a 4–8 digit PIN.');
      if (draft.pin === '1234') problems.push('PIN 1234 is the default — choose a different one.');
      if (accounts.some((a) => sameName(a.name, draft.name))) {
        problems.push('An account with this name already exists.');
      }
    }
  } else {
    if (!target) {
      problems.push('That officer is not on this group any more.');
    } else if (sameName(target.name, actor.name)) {
      // Self-escalation would defeat the whole point of the ceremony.
      problems.push('You cannot change your own role or permissions. Ask another officer.');
    }
  }

  // The two-key rule must never be quietly switched off.
  if (kind !== 'add') {
    const after = approversAfter(accounts, {
      kind,
      targetId,
      patch: { permissions: { canApproveLoans: draft?.canApproveLoans } },
    });
    if (approverCount(accounts) >= 2 && after < 2) {
      problems.push(FALLS_BELOW_TWO_KEYS);
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    secondKeyOptions: otherOfficers.filter((o) => !request.firstKeyBy || !sameName(o.name, request.firstKeyBy)),
    summary:
      kind === 'add'
        ? `Add ${draft ? describe(draft) : 'officer'}`
        : kind === 'remove'
          ? `Remove ${target ? target.name : 'officer'}`
          : kind === 'pin'
            ? `Reset the PIN for ${target ? target.name : 'officer'}`
            : `Change ${target ? target.name : 'officer'}’s role and permissions`,
  };
}

/** The account a recorded change creates, for 'add'. */
export function officerFromDraft(draft: NewOfficerDraft, id: string): UserAccount {
  return {
    id,
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    provider: draft.provider,
    role: draft.role,
    roleTitle: draft.roleTitle.trim() || draft.role,
    zone: 'Officer',
    pin: derivePinVerifier(draft.pin),
    avatarInitials: draft.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
    avatarBg: '#0b3d2e',
    permissions: {
      canLockBox: draft.canLockBox,
      canApproveLoans: draft.canApproveLoans,
      canDisburseWelfare: draft.canDisburseWelfare,
      canRecordShares: draft.canRecordShares,
      canRequestLoan: false,
      canManageBackups: draft.canManageBackups,
    },
  };
}

/** Applies a fully approved change to the roster. Never mutates the input. */
export function applyOfficerChange(
  accounts: UserAccount[],
  change: { kind: OfficerChangeKind; officerId?: string; patch?: OfficerChange['patch']; draft?: NewOfficerDraft; newId?: string }
): UserAccount[] {
  if (change.kind === 'add') {
    if (!change.draft) return accounts;
    return [...accounts, officerFromDraft(change.draft, change.newId || `o-${Date.now().toString(36)}`)];
  }
  if (change.kind === 'remove') {
    return accounts.filter((a) => a.id !== change.officerId);
  }
  if (!change.patch) return accounts;
  return accounts.map((a) => {
    if (a.id !== change.officerId) return a;
    const patch = change.patch as Partial<UserAccount>;
    return {
      ...a,
      ...patch,
      permissions: patch.permissions ? { ...a.permissions, ...patch.permissions } : a.permissions,
    };
  });
}

export const describeOfficerChangeKeys = (change: OfficerChange): string =>
  change.secondKeyBy
    ? `2/2 — ${change.firstKeyBy} then ${change.secondKeyBy}`
    : `1/2 — ${change.firstKeyBy} is waiting for a different officer`;

export const OFFICER_CHANGE_LABEL: Record<OfficerChangeKind, string> = {
  add: 'Officer added',
  role: 'Role changed',
  permissions: 'Permissions changed',
  pin: 'PIN reset',
  remove: 'Officer removed',
};

/**
 * Key 1 turns a validated request into the exact change that key 2 will write,
 * so what is approved is what happens — no second look at the form.
 */
export function buildPending(
  request: OfficerChangeRequest,
  firstKeyBy: string,
  firstKeyAt: string,
  id: string
): PendingOfficerChange {
  const target = request.accounts.find((a) => a.id === request.targetId);
  const draft = request.draft;
  return {
    id,
    kind: request.kind,
    targetId: request.targetId,
    targetName: request.kind === 'add' ? draft?.name.trim() || '' : target?.name || '',
    summary: checkOfficerChange(request).summary,
    newAccount: request.kind === 'add' && draft ? officerFromDraft(draft, `o-${id}`) : undefined,
    patch:
      request.kind === 'add' || request.kind === 'remove' || !draft
        ? undefined
        : {
            phone: draft.phone.trim() || undefined,
            role: draft.role,
            roleTitle: draft.roleTitle.trim() || draft.role,
            ...(draft.pin ? { pin: derivePinVerifier(draft.pin) } : {}),
            permissions: {
              canLockBox: draft.canLockBox,
              canApproveLoans: draft.canApproveLoans,
              canDisburseWelfare: draft.canDisburseWelfare,
              canRecordShares: draft.canRecordShares,
              canRequestLoan: false,
              canManageBackups: draft.canManageBackups,
            },
          },
    firstKeyBy,
    firstKeyAt,
  };
}

/** Writes a change that has both keys. Never mutates the input. */
export function applyPending(accounts: UserAccount[], pending: PendingOfficerChange): UserAccount[] {
  if (pending.kind === 'add') {
    return pending.newAccount ? [...accounts, pending.newAccount] : accounts;
  }
  if (pending.kind === 'remove') {
    return accounts.filter((a) => a.id !== pending.targetId);
  }
  if (!pending.patch) return accounts;
  return accounts.map((a) =>
    a.id === pending.targetId
      ? {
          ...a,
          ...pending.patch,
          permissions: pending.patch.permissions
            ? { ...a.permissions, ...pending.patch.permissions }
            : a.permissions,
        }
      : a
  );
}

/** True when the officers behind a pending change still allow it. */
export function pendingStillValid(accounts: UserAccount[], pending: PendingOfficerChange): boolean {
  if (pending.kind === 'add') {
    return !accounts.some((a) => sameName(a.name, pending.newAccount?.name || pending.targetName));
  }
  const target = accounts.find((a) => a.id === pending.targetId);
  if (!target) return false;
  if (approverCount(accounts) >= 2 && approversAfter(accounts, pending) < 2) return false;
  return true;
}
