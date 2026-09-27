import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildEquityStatement, buildMemberRegister, memberCategory, memberRegisterCsv, registerSummary, savingsInterestFor, shareClassesFor, shareOutInterestRows } from '../src/utils/sacco';
import type { GroupProfile, Member, VSLAState } from '../src/types';

const profile = {
  id: 'grp-1',
  name: 'Test SACCO',
  boxIdentifier: 'BOX-1',
  cycle: 2,
  cycleMonth: 4,
  totalCycleMonths: 12,
  location: 'Kampala',
  meetingDay: 'Friday',
  sharePrice: 10000,
  welfareMonthly: 5000,
  inviteCode: 'TST-0001',
  plan: 'sacco' as const,
  createdAt: '2026-01-01',
  adminName: 'Admin',
  adminPhone: '0772000000',
  borrowMultiplier: 3,
  shareClasses: [
    { id: 'ord', name: 'Ordinary shares', price: 10000, active: true, interestBearing: true },
    { id: 'pref', name: 'Preference shares', price: 50000, active: true, borrowMultiplier: 5, interestBearing: false },
  ],
  sacco: { savingsInterestRatePct: 12, registrationNo: 'UG-2026-01', county: 'Kampala' },
} as GroupProfile;

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm1',
  no: '01',
  name: 'Sarah Nabukalu',
  initials: 'SN',
  zone: 'A',
  phone: '0772000001',
  provider: 'MTN',
  attendance: 'present',
  sharesCount: 12,
  sharesTotal: 120000,
  maxBorrowLimit: 360000,
  loanBalance: 0,
  welfareBalance: 10000,
  isKeyholder: false,
  stamps: [],
  ledger: [],
  ...over,
});

const state = (members: Member[]): VSLAState => ({
  groupName: 'Test SACCO',
  boxIdentifier: 'BOX-1',
  cycle: 2,
  cycleMonth: 4,
  totalCycleMonths: 12,
  boxCashBalance: 500000,
  loanFundBalance: 300000,
  welfareFundBalance: 50000,
  groupProfile: profile,
  members,
  approvals: [],
  fines: [],
  welfareGrants: [],
  recentMeetingsCount: 8,
  lastBackupDate: '2026-09-01',
  snapshots: [],
});

describe('SACCO share classes', () => {
  it('falls back to one ordinary class so village groups are unaffected', () => {
    const classes = shareClassesFor({ ...profile, shareClasses: [] });
    expect(classes).toHaveLength(1);
    expect(classes[0].price).toBe(10000);
    expect(savingsInterestFor(member(), { ...profile, sacco: undefined })).toBe(0);
  });

  it('reads a member’s class and flags a class that no longer exists', () => {
    const ordinary = memberCategory(member(), profile);
    expect(ordinary.name).toBe('Ordinary shares');
    expect(ordinary.interestBearing).toBe(true);

    const preference = memberCategory(member({ shareClassId: 'pref' }), profile);
    expect(preference.name).toBe('Preference shares');
    expect(preference.borrowMultiplier).toBe(5);
    expect(preference.interestBearing).toBe(false);

    const stale = memberCategory(member({ shareClassId: 'deleted' }), profile);
    expect(stale.unknownClass).toBe(true);
    expect(stale.name).toBe('Ordinary shares'); // falls back, never blank
  });
});

describe('savings interest', () => {
  it('is charged per member on the savings balance', () => {
    // 12% of UGX 120,000
    expect(savingsInterestFor(member(), profile)).toBe(14400);
  });

  it('is zero without a rate, and skipped for non-interest classes', () => {
    expect(savingsInterestFor(member(), { ...profile, sacco: { savingsInterestRatePct: 0 } })).toBe(0);
    expect(savingsInterestFor(member(), { ...profile, sacco: undefined })).toBe(0);
    expect(savingsInterestFor(member({ shareClassId: 'pref' }), profile)).toBe(0);
  });

  it('survives junk values instead of producing NaN money', () => {
    expect(savingsInterestFor(member({ sharesTotal: Number.NaN as unknown as number }), profile)).toBe(0);
    expect(savingsInterestFor(member(), { ...profile, sacco: { savingsInterestRatePct: Number.NaN as unknown as number } })).toBe(0);
  });
});

describe('member register', () => {
  const members = [
    member(),
    member({ id: 'm2', no: '02', name: 'Achieng, Judith', sharesCount: 40, sharesTotal: 2000000, loanBalance: 500000, maxBorrowLimit: 10000000, shareClassId: 'pref', memberSince: '2024-02-11' }),
  ];
  const rows = buildMemberRegister(state(members));

  it('has one row per member with the register columns', () => {
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ no: '01', name: 'Sarah Nabukalu', category: 'Ordinary shares', shares: 12, shareValue: 120000, interest: 14400, loan: 0 });
    expect(rows[1]).toMatchObject({ no: '02', category: 'Preference shares', interest: 0, since: '2024-02-11' });
  });

  it('quotes a name with a comma safely in the CSV', () => {
    const csv = memberRegisterCsv(rows);
    const [header, first, second] = csv.split('\n');
    expect(header.split(',')).toHaveLength(12);
    expect(second).toContain('"Achieng, Judith"');
    expect(first).toContain('120000');
  });

  it('totals are the sum of the rows, never a second calculation', () => {
    const summary = registerSummary(rows);
    expect(summary.members).toBe(2);
    expect(summary.shareValue).toBe(2120000);
    expect(summary.interest).toBe(14400);
    expect(summary.loan).toBe(500000);
    expect(summary.equity).toBe(summary.shareValue + summary.interest - summary.loan);
  });

  it('handles an empty group', () => {
    expect(buildMemberRegister(state([]))).toEqual([]);
    expect(memberRegisterCsv([]).split('\n')).toHaveLength(1);
  });
});

describe('equity statement', () => {
  it('adds interest and subtracts the loan to give net equity', () => {
    const s = buildEquityStatement(member({ loanBalance: 20000 }), profile);
    expect(s).toMatchObject({ category: 'Ordinary shares', shares: 12, sharePrice: 10000, shareValue: 120000, interestRatePct: 12, interest: 14400, loan: 20000, interestBearing: true });
    expect(s.netEquity).toBe(114400);
  });

  it('shows the borrowing limit a SACCO grants against these shares', () => {
    const pref = buildEquityStatement(member({ shareClassId: 'pref', sharesTotal: 2000000, maxBorrowLimit: 10000000 }), profile);
    expect(pref.category).toBe('Preference shares');
    expect(pref.interest).toBe(0);
    expect(pref.limit).toBe(10000000);
  });
});

describe('share-out interest rows', () => {
  it('splits savings from profit so the treasurer can see each', () => {
    const rows = shareOutInterestRows([member(), member({ id: 'm2', no: '02', shareClassId: 'pref' })], profile);
    expect(rows[0]).toEqual({ memberNo: '01', name: 'Sarah Nabukalu', saved: 120000, interest: 14400 });
    expect(rows[1].interest).toBe(0);
  });
});

/**
 * The registers are only worth anything if the screens that show money are
 * wired to the same helpers — otherwise the register and the passbook would
 * quietly disagree, which is exactly what a registrar checks.
 */
describe('SACCO registers are wired to the live screens', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

  it('settings collect the registration fields and the interest rate', () => {
    const settings = read('src/views/GroupSettingsView.tsx');
    expect(settings).toContain('sacco: SaccoDetails');
    expect(settings).toContain('savingsInterestRatePct');
    expect(settings).toContain('registrationNo');
    expect(settings).toContain('borrowMultiplier: Number(e.target.value)');
    expect(settings).toContain('interestBearing: shareClass.interestBearing === false');
  });

  it('settings changes are persisted, not dropped', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('sacco: { ...(vslaState.groupProfile?.sacco || {}), ...(patch.sacco || {}) }');
    expect(app).toContain('sacco={vslaState.groupProfile?.sacco || {}}');
    expect(app).toContain('shareClassId: shareClassesFor(vslaState.groupProfile)[0]?.id');
    expect(app).toContain('memberSince: new Date().toISOString().slice(0, 10)');
  });

  it('reports render the register with totals and a CSV export', () => {
    const reports = read('src/views/ReportsView.tsx');
    expect(reports).toContain('buildMemberRegister(state)');
    expect(reports).toContain('memberRegisterCsv(registerRows)');
    expect(reports).toContain('registerTotals.equity');
    expect(reports).toContain("chartTab === 'registers'");
  });

  it('the passbook shows the member their own equity', () => {
    const passbook = read('src/views/MemberPassbookView.tsx');
    expect(passbook).toContain('buildEquityStatement(member, groupProfile)');
    expect(passbook).toContain('equityStatement.interestRatePct > 0');
    expect(passbook).toContain('equityStatement.netEquity');
  });
});
