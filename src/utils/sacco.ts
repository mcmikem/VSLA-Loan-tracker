/**
 * SACCO registers.
 *
 * A village group needs a passbook; a registered SACCO also has to produce
 * registers a registrar can inspect: who is a member and since when, which
 * class of share they hold, what their savings have earned, what they were
 * paid at share-out, and what they still owe. These are pure functions so the
 * numbers in the register, the passbook and the CSV export can never disagree.
 */
import { GroupProfile, Member, ShareClass, VSLAState } from '../types';

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString('en-US')}`;

/** Falls back to a single ordinary class so plain groups behave exactly as before. */
export function shareClassesFor(profile?: GroupProfile): ShareClass[] {
  const configured = (profile?.shareClasses || []).filter((c) => c && c.id);
  if (configured.length === 0) {
    return [{ id: 'ordinary', name: 'Ordinary shares', price: num(profile?.sharePrice) || 10000, active: true }];
  }
  return configured;
}

export interface MemberCategory {
  id: string;
  name: string;
  price: number;
  borrowMultiplier: number;
  interestBearing: boolean;
  /** true when the member's class is not in the configured list (renamed/removed). */
  unknownClass: boolean;
}

export function memberCategory(member: Member, profile?: GroupProfile): MemberCategory {
  const classes = shareClassesFor(profile);
  const found = member.shareClassId ? classes.find((c) => c.id === member.shareClassId) : undefined;
  const fallback = classes[0];
  const base = found || fallback;
  return {
    id: base.id,
    name: base.name,
    price: num(base.price),
    borrowMultiplier: num(base.borrowMultiplier) > 0 ? num(base.borrowMultiplier) : num(profile?.borrowMultiplier) || 3,
    interestBearing: found ? found.interestBearing !== false : true,
    unknownClass: Boolean(member.shareClassId && !found),
  };
}

/**
 * Interest a member's savings have earned this cycle. Charged per member, not
 * on the whole book, so a register total is just the sum of the rows.
 */
export function savingsInterestFor(member: Member, profile?: GroupProfile): number {
  const ratePct = num(profile?.sacco?.savingsInterestRatePct);
  if (ratePct <= 0) return 0;
  if (!memberCategory(member, profile).interestBearing) return 0;
  return Math.round((num(member.sharesTotal) * ratePct) / 100);
}

export interface RegisterRow {
  no: string;
  name: string;
  phone: string;
  category: string;
  since: string;
  shares: number;
  shareValue: number;
  interest: number;
  loan: number;
  welfare: number;
  limit: number;
  /** what they would receive if the group closed a cycle right now */
  equity: number;
}

export function buildMemberRegister(state: VSLAState): RegisterRow[] {
  const profile = state.groupProfile;
  return (state.members || []).map((m) => {
    const category = memberCategory(m, profile);
    const value = num(m.sharesTotal);
    const interest = savingsInterestFor(m, profile);
    return {
      no: m.no,
      name: m.name,
      phone: m.phone || '',
      category: category.name,
      since: m.memberSince || '',
      shares: num(m.sharesCount),
      shareValue: value,
      interest,
      loan: num(m.loanBalance),
      welfare: num(m.welfareBalance),
      limit: num(m.maxBorrowLimit),
      equity: value + interest - num(m.loanBalance),
    };
  });
}

export interface EquityStatement {
  member: Pick<Member, 'id' | 'no' | 'name' | 'phone'>;
  category: string;
  since: string;
  shares: number;
  sharePrice: number;
  shareValue: number;
  interestRatePct: number;
  interest: number;
  loan: number;
  welfare: number;
  limit: number;
  /** share value + interest − what is still owed */
  netEquity: number;
  interestBearing: boolean;
}

export function buildEquityStatement(member: Member, profile?: GroupProfile): EquityStatement {
  const category = memberCategory(member, profile);
  const value = num(member.sharesTotal);
  const interest = savingsInterestFor(member, profile);
  return {
    member: { id: member.id, no: member.no, name: member.name, phone: member.phone || '' },
    category: category.name,
    since: member.memberSince || '',
    shares: num(member.sharesCount),
    sharePrice: category.price,
    shareValue: value,
    interestRatePct: num(profile?.sacco?.savingsInterestRatePct),
    interest,
    loan: num(member.loanBalance),
    welfare: num(member.welfareBalance),
    limit: num(member.maxBorrowLimit),
    netEquity: value + interest - num(member.loanBalance),
    interestBearing: category.interestBearing,
  };
}

/** One line per member for the share-out screen, so savings interest is visible
 *  as its own amount instead of hiding inside "profit". */
export function shareOutInterestRows(
  members: Member[],
  profile?: GroupProfile
): { memberNo: string; name: string; saved: number; interest: number }[] {
  return (members || []).map((m) => ({
    memberNo: m.no,
    name: m.name,
    saved: num(m.sharesTotal),
    interest: savingsInterestFor(m, profile),
  }));
}

const CSV_COLUMNS = [
  'Member No',
  'Name',
  'Phone',
  'Share class',
  'Member since',
  'Shares',
  'Share value',
  'Savings interest',
  'Loan balance',
  'Welfare',
  'Borrowing limit',
  'Net equity',
] as const;

export function memberRegisterCsv(rows: RegisterRow[]): string {
  const cell = (value: string | number) => {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.no,
        r.name,
        r.phone,
        r.category,
        r.since,
        r.shares,
        r.shareValue,
        r.interest,
        r.loan,
        r.welfare,
        r.limit,
        r.equity,
      ]
        .map(cell)
        .join(',')
    );
  }
  return lines.join('\n');
}

export const registerSummary = (rows: RegisterRow[]) => ({
  members: rows.length,
  shareValue: rows.reduce((s, r) => s + r.shareValue, 0),
  interest: rows.reduce((s, r) => s + r.interest, 0),
  loan: rows.reduce((s, r) => s + r.loan, 0),
  welfare: rows.reduce((s, r) => s + r.welfare, 0),
  equity: rows.reduce((s, r) => s + r.equity, 0),
});

export { num as registerNumber, ugx as registerUgx };
