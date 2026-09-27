import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EMPTY_OFFICER,
  applyPending,
  approverCount,
  approversAfter,
  buildPending,
  canManageOfficers,
  checkOfficerChange,
  describeOfficerChangeKeys,
  officerFromDraft,
  pendingStillValid,
} from '../src/utils/officers';
import type { PendingOfficerChange, UserAccount } from '../src/types';

function officer(id: string, name: string, over: Partial<UserAccount> = {}): UserAccount {
  return {
    id,
    name,
    phone: '0772000000',
    provider: 'MTN',
    role: 'treasurer',
    roleTitle: 'Treasurer',
    zone: 'Officer',
    pin: '4321',
    avatarInitials: 'O',
    avatarBg: '#fff',
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: false,
      canRecordShares: true,
      canRequestLoan: false,
      canManageBackups: false,
    },
    ...over,
  };
}

const treasurer = officer('o1', 'Grace Nakato');
const chair = officer('o2', 'Peter Mwangi', { role: 'chairperson', roleTitle: 'Chairperson' });
const secretary = officer('o3', 'Sarah Nabu', {
  role: 'secretary',
  permissions: {
    canLockBox: false,
    canApproveLoans: false,
    canDisburseWelfare: false,
    canRecordShares: true,
    canRequestLoan: false,
    canManageBackups: true,
  },
});
const member = officer('o4', 'Sarah Kirunda', {
  role: 'member',
  memberNo: '07',
  permissions: {
    canLockBox: false,
    canApproveLoans: false,
    canDisburseWelfare: false,
    canRecordShares: false,
    canRequestLoan: true,
    canManageBackups: false,
  },
});

const roster = [treasurer, chair, secretary, member];
const draft = { ...EMPTY_OFFICER, name: 'Alice Namutebi', phone: '0773000111', pin: '9182' };

describe('who may change the officers', () => {
  it('an officer may; a member never', () => {
    expect(canManageOfficers(treasurer)).toBe(true);
    expect(canManageOfficers(secretary)).toBe(true);
    expect(canManageOfficers(member)).toBe(false);
    expect(canManageOfficers(undefined)).toBe(false);
  });

  it('counts approvers by person, not by account', () => {
    expect(approverCount(roster)).toBe(2);
    expect(approverCount([treasurer, officer('o9', 'Grace Nakato')])).toBe(1);
    expect(approverCount([secretary, member])).toBe(0);
  });
});

describe('adding an officer', () => {
  it('accepts a real name, phone and PIN', () => {
    const check = checkOfficerChange({ kind: 'add', actor: treasurer, accounts: roster, draft });
    expect(check.ok).toBe(true);
    expect(check.summary).toMatch(/Alice Namutebi/);
  });

  it('refuses a duplicate, a junk number and the default PIN', () => {
    expect(checkOfficerChange({ kind: 'add', actor: treasurer, accounts: roster, draft: { ...draft, name: 'grace nakato' } }).problems.join(' ')).toMatch(/already exists/);
    expect(checkOfficerChange({ kind: 'add', actor: treasurer, accounts: roster, draft: { ...draft, phone: '12345' } }).problems.join(' ')).toMatch(/valid Ugandan phone/);
    expect(checkOfficerChange({ kind: 'add', actor: treasurer, accounts: roster, draft: { ...draft, pin: '1234' } }).problems.join(' ')).toMatch(/default/);
    expect(checkOfficerChange({ kind: 'add', actor: treasurer, accounts: roster, draft: { ...draft, pin: '12' } }).problems.join(' ')).toMatch(/4–8 digit/);
    expect(checkOfficerChange({ kind: 'add', actor: treasurer, accounts: roster, draft: { ...draft, name: 'Al' } }).problems.join(' ')).toMatch(/full name/);
  });

  it('builds an account that can actually turn a key', () => {
    const account = officerFromDraft(draft, 'o-new');
    expect(account).toMatchObject({ id: 'o-new', name: 'Alice Namutebi', role: 'keyholder', pin: '9182' });
    expect(account.permissions.canApproveLoans).toBe(true);
    expect(account.avatarInitials).toBe('AN');
  });
});

describe('the two rules that are never negotiable', () => {
  it('nobody changes their own authority', () => {
    const check = checkOfficerChange({
      kind: 'permissions',
      actor: treasurer,
      accounts: roster,
      targetId: treasurer.id,
      draft: { ...draft, name: 'Grace Nakato', canApproveLoans: true, canLockBox: true, canRecordShares: true },
    });
    expect(check.ok).toBe(false);
    expect(check.problems.join(' ')).toMatch(/cannot change your own role or permissions/);
  });

  it('a change may never leave the group unable to run the two-key rule', () => {
    // two approvers today: stripping one would leave the group with one
    const strip = checkOfficerChange({
      kind: 'permissions',
      actor: treasurer,
      accounts: [treasurer, chair, member],
      targetId: chair.id,
      draft: { ...EMPTY_OFFICER, name: 'Peter Mwangi', role: 'keyholder', canApproveLoans: false },
    });
    expect(strip.ok).toBe(false);
    expect(strip.problems.join(' ')).toMatch(/fewer than two officers/);

    // and the same goes for removing one outright
    const remove = checkOfficerChange({ kind: 'remove', actor: treasurer, accounts: [treasurer, chair, member], targetId: chair.id });
    expect(remove.problems.join(' ')).toMatch(/fewer than two officers/);
  });

  it('but it is fine once a third keyholder exists', () => {
    const threeApprovers = [treasurer, chair, officer('o7', 'Keyholder Three'), member];
    const strip = checkOfficerChange({
      kind: 'permissions',
      actor: treasurer,
      accounts: threeApprovers,
      targetId: chair.id,
      draft: { ...EMPTY_OFFICER, name: 'Peter Mwangi', role: 'keyholder', canApproveLoans: false },
    });
    expect(strip.ok).toBe(true);
    expect(approversAfter(threeApprovers, { kind: 'permissions', targetId: chair.id, patch: { permissions: { canApproveLoans: false } } })).toBe(2);
  });

  it('a lone officer cannot slip through a second key', () => {
    const check = checkOfficerChange({
      kind: 'remove',
      actor: treasurer,
      accounts: [treasurer, member],
      targetId: 'o-ghost',
      firstKeyBy: 'Grace Nakato',
    });
    expect(check.ok).toBe(false);
    expect(check.problems.join(' ')).toMatch(/no other officer/);
  });
});

describe('key 1 freezes the change, key 2 writes it', () => {
  const request = {
    kind: 'add' as const,
    actor: treasurer,
    accounts: roster,
    draft,
  };

  it('the pending change carries the exact account, not the form', () => {
    const pending = buildPending(request, 'Grace Nakato', '2026-05-01T10:00:00.000Z', 'oc-1');
    expect(pending.kind).toBe('add');
    expect(pending.firstKeyBy).toBe('Grace Nakato');
    expect(pending.newAccount?.name).toBe('Alice Namutebi');
    expect(pending.summary).toMatch(/Alice Namutebi/);

    const after = applyPending(roster, pending);
    expect(after).toHaveLength(5);
    expect(after[4].name).toBe('Alice Namutebi');
    expect(roster).toHaveLength(4); // the input is never mutated
  });

  it('a permission change writes only the fields it promised', () => {
    const pending = buildPending(
      {
        kind: 'permissions',
        actor: treasurer,
        accounts: roster,
        targetId: chair.id,
        draft: { ...EMPTY_OFFICER, name: 'Peter Mwangi', role: 'keyholder', pin: '', canApproveLoans: true, canLockBox: false, canRecordShares: true },
      },
      'Grace Nakato',
      '2026-05-01T10:00:00.000Z',
      'oc-2'
    );
    expect(pending.patch?.permissions).toMatchObject({ canLockBox: false, canApproveLoans: true });
    expect(pending.patch?.pin).toBeUndefined();
    const after = applyPending(roster, pending);
    const changed = after.find((a) => a.id === chair.id);
    expect(changed?.permissions.canLockBox).toBe(false);
    expect(changed?.pin).toBe('4321');
    expect(after.find((a) => a.id === chair.id)?.name).toBe('Peter Mwangi');
  });

  it('a PIN reset writes the new PIN and nothing else', () => {
    const pending = buildPending(
      {
        kind: 'pin',
        actor: treasurer,
        accounts: roster,
        targetId: chair.id,
        draft: { ...EMPTY_OFFICER, name: 'Peter Mwangi', role: 'keyholder', pin: '7788', canApproveLoans: true, canRecordShares: true },
      },
      'Grace Nakato',
      '2026-05-01T10:00:00.000Z',
      'oc-3'
    );
    expect(applyPending(roster, pending).find((a) => a.id === chair.id)?.pin).toBe('7788');
  });

  it('removal drops the account', () => {
    const pending = buildPending(
      { kind: 'remove', actor: treasurer, accounts: roster, targetId: secretary.id },
      'Grace Nakato',
      '2026-05-01T10:00:00.000Z',
      'oc-4'
    );
    expect(applyPending(roster, pending).map((a) => a.id)).not.toContain(secretary.id);
  });

  it('a pending change that would break the two-key rule is stale too', () => {
    const strip = buildPending(
      {
        kind: 'permissions',
        actor: treasurer,
        accounts: [treasurer, chair, member],
        targetId: chair.id,
        draft: { ...EMPTY_OFFICER, name: 'Peter Mwangi', role: 'keyholder', canApproveLoans: false },
      },
      'Grace Nakato',
      '2026-05-01T10:00:00.000Z',
      'oc-8'
    );
    expect(pendingStillValid([treasurer, chair, member], strip)).toBe(false);
    expect(pendingStillValid([treasurer, chair, member, officer('o7', 'Third Key')], strip)).toBe(true);
  });

  it('a change that went stale is refused before it is written', () => {
    const remove = buildPending(
      { kind: 'remove', actor: treasurer, accounts: [treasurer, secretary, member], targetId: secretary.id },
      'Grace Nakato',
      '2026-05-01T10:00:00.000Z',
      'oc-5'
    );
    // the target is already gone
    expect(pendingStillValid([treasurer, chair, member], remove)).toBe(false);
    expect(pendingStillValid([treasurer, secretary, member], remove)).toBe(true);

    const add = buildPending(request, 'Grace Nakato', '2026-05-01T10:00:00.000Z', 'oc-6');
    expect(pendingStillValid([...roster, officerFromDraft(draft, 'o-elsewhere')], add)).toBe(false);
  });

  it('the register says who held which key', () => {
    const pending = buildPending(request, 'Grace Nakato', 'x', 'oc-7');
    const record = {
      id: pending.id,
      at: '2026-05-01T10:00:00.000Z',
      kind: pending.kind,
      officerName: pending.targetName,
      summary: pending.summary,
      firstKeyBy: pending.firstKeyBy,
      firstKeyAt: pending.firstKeyAt,
      secondKeyBy: 'Peter Mwangi',
    };
    expect(describeOfficerChangeKeys(record)).toBe('2/2 — Grace Nakato then Peter Mwangi');
    expect(describeOfficerChangeKeys({ ...record, secondKeyBy: undefined })).toMatch(/1\/2.*waiting for a different officer/);
  });
});

describe('the authority register is wired to the screen', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const app = read('src/App.tsx');
  const view = read('src/views/UsersView.tsx');

  it('key 1 changes nothing and key 2 must come from another officer', () => {
    expect(app).toContain('Key 1/2 — ${pending.summary}');
    expect(app).toContain('nothing changed yet');
    expect(app).toContain('already turned key 1/2. A different officer must turn key 2/2');
    expect(app).toContain('pendingStillValid(');
  });

  it('the change lands in the register and on the roster together', () => {
    expect(app).toContain('availableAccounts: applyPending(');
    expect(app).toContain('officerChanges: [...(vslaState.officerChanges || []), record]');
  });

  it('the screen shows the wait, the second key and the register', () => {
    expect(view).toContain('Waiting for a second key');
    expect(view).toContain('Turn key 2/2 to apply it');
    expect(view).toContain('Authority register');
    expect(view).toContain('Fewer than two officers can approve payments');
  });
});

describe('sanity on the persisted shape', () => {
  it('a pending change from storage is usable as-is', () => {
    const stored: PendingOfficerChange = {
      id: 'oc-9',
      kind: 'add',
      targetName: 'Alice Namutebi',
      summary: 'Add Alice Namutebi as keyholder (can approve payments)',
      newAccount: officerFromDraft(draft, 'o-from-storage'),
      firstKeyBy: 'Grace Nakato',
      firstKeyAt: '2026-05-01T10:00:00.000Z',
    };
    expect(pendingStillValid(roster, stored)).toBe(true);
    expect(applyPending(roster, stored)[4].id).toBe('o-from-storage');
  });
});
