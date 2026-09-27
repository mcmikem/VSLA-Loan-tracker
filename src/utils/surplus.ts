/**
 * Surplus appropriation and the members' resolution that approves it.
 *
 * The share-out engine hands every shilling of loan interest to members. That
 * is fine for a village savings group, but a registered SACCO must first
 * appropriate a surplus into its reserve, education and operating funds, and
 * only pay out what the members have approved. This module is the whole of
 * that: pure maths plus the checks that stop a payout being made on a quorum
 * that never happened.
 *
 * A group with no recorded policy keeps the old behaviour exactly — the
 * register is opt-in, never a silent change to what people are paid.
 */
import { GroupProfile, Member, SurplusPolicy, SurplusResolution } from '../types';

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The split most SACCOs use; offered as a starting point, never applied silently. */
export const RECOMMENDED_SURPLUS_POLICY: SurplusPolicy = {
  reservePct: 20,
  educationPct: 10,
  operationsPct: 5,
  finesToBonus: true,
  quorumPct: 50,
};

export function normalizePolicy(raw?: Partial<SurplusPolicy> | null): SurplusPolicy {
  const pct = (v: unknown) => round1(Math.min(100, Math.max(0, num(v))));
  return {
    reservePct: pct(raw?.reservePct),
    educationPct: pct(raw?.educationPct),
    operationsPct: pct(raw?.operationsPct),
    finesToBonus: raw?.finesToBonus !== false,
    quorumPct: pct(raw?.quorumPct) || RECOMMENDED_SURPLUS_POLICY.quorumPct,
  };
}

/** The group's recorded policy, or undefined when they have not decided one. */
export function policyFor(profile?: GroupProfile): SurplusPolicy | undefined {
  const raw = profile?.sacco?.surplusPolicy;
  return raw ? normalizePolicy(raw) : undefined;
}

export interface SurplusPlan {
  interest: number;
  fines: number;
  /** Everything earned beyond members' own savings. */
  surplus: number;
  /** Percent of the split that goes to members as a dividend. */
  bonusPct: number;
  /** The part of the surplus paid to members. */
  bonus: number;
  reserve: number;
  education: number;
  operations: number;
  /** reserve + education + operations — money that is NOT paid out. */
  withheld: number;
  /** false when the recorded split cannot be used as it stands. */
  usable: boolean;
  problems: string[];
}

/**
 * Splits a cycle's surplus. The dividend takes the remainder, so the four
 * shares always add back up to the surplus exactly — a treasurer comparing
 * columns will never find a missing shilling.
 */
export function buildSurplusPlan(
  interestEarned: number,
  finesCollected: number,
  policy?: SurplusPolicy
): SurplusPlan {
  const interest = Math.max(0, Math.round(num(interestEarned)));
  const fines = Math.max(0, Math.round(num(finesCollected)));
  const surplus = interest + fines;

  if (!policy) {
    // No recorded policy: the whole surplus is paid out, as it always has been.
    return {
      interest,
      fines,
      surplus,
      bonusPct: 100,
      bonus: surplus,
      reserve: 0,
      education: 0,
      operations: 0,
      withheld: 0,
      usable: true,
      problems: [],
    };
  }

  const reserve = Math.round((interest * policy.reservePct) / 100);
  const education = Math.round((interest * policy.educationPct) / 100);
  const fineShare = policy.finesToBonus ? 0 : fines;
  const operations = Math.round((interest * policy.operationsPct) / 100) + fineShare;
  const withheldPct = round1(policy.reservePct + policy.educationPct + policy.operationsPct);
  const bonusPct = round1(Math.max(0, 100 - withheldPct));

  const problems: string[] = [];
  if (withheldPct > 100) {
    problems.push('The reserve, education and operations shares add up to more than 100%.');
  }
  if (bonusPct === 0 && surplus > 0) {
    problems.push('No dividend is left for members — lower the reserve, education and operations shares.');
  }
  // Bonus absorbs the rounding remainder so the four shares always total the surplus.
  const bonus = Math.max(0, surplus - reserve - education - operations);

  return {
    interest,
    fines,
    surplus,
    bonusPct,
    bonus,
    reserve,
    education,
    operations,
    withheld: reserve + education + operations,
    usable: problems.length === 0,
    problems,
  };
}

/** True when two policies split the money the same way (quorum aside). */
export function sameSplit(a?: SurplusPolicy, b?: SurplusPolicy): boolean {
  if (!a || !b) return a === b;
  const x = normalizePolicy(a);
  const y = normalizePolicy(b);
  return (
    x.reservePct === y.reservePct &&
    x.educationPct === y.educationPct &&
    x.operationsPct === y.operationsPct &&
    x.finesToBonus === y.finesToBonus
  );
}

/** Members that must be present for the meeting to be able to decide. */
export function quorumRequired(memberCount: number, policy?: SurplusPolicy): number {
  const pct = num(policy?.quorumPct) || RECOMMENDED_SURPLUS_POLICY.quorumPct;
  return Math.max(1, Math.ceil((num(memberCount) * pct) / 100));
}

export interface ResolutionInput {
  attendees: number;
  approvers: string[];
  against?: number;
  memberCount: number;
  /** the cycle's computed plan, so a broken split is caught at the meeting */
  plan?: SurplusPlan;
  policy?: SurplusPolicy;
}

export interface ResolutionCheck {
  ok: boolean;
  problems: string[];
  quorumRequired: number;
  present: number;
  approved: number;
}

/**
 * A share-out paid on a resolution that never happened is the single most
 * expensive mistake a SACCO can make, so every failure is named in words the
 * officers can act on rather than a silent disabled button.
 */
export function checkResolution(input: ResolutionInput, members: Member[] = []): ResolutionCheck {
  const problems: string[] = [];
  const quorum = quorumRequired(input.memberCount, input.policy);
  const present = Math.max(0, Math.round(num(input.attendees)));
  const approvers = (input.approvers || []).map(String);
  const unique = Array.from(new Set(approvers));
  const known = new Set((members || []).map((m) => m.no));

  if (present < quorum) {
    problems.push(
      `Not enough members at the meeting: ${present} present, ${quorum} needed.`
    );
  }
  if (approvers.length !== unique.length) {
    problems.push('The same member is counted twice in the approval.');
  }
  if (known.size > 0 && unique.some((no) => !known.has(no))) {
    problems.push('Someone who approved is not on the member register.');
  }
  if (present > 0 && unique.length > present) {
    problems.push('More members approved than were present at the meeting.');
  }
  if (unique.length === 0) {
    problems.push('No member has approved the surplus yet.');
  } else if (present > 0 && unique.length * 2 <= present) {
    problems.push('The members who voted yes are not a majority of those present.');
  }
  if (input.plan && !input.plan.usable) {
    problems.push(...input.plan.problems);
  }

  return { ok: problems.length === 0, problems, quorumRequired: quorum, present, approved: unique.length };
}

export function buildResolution(args: {
  id: string;
  cycle: number;
  date: string;
  minutesRef: string;
  attendees: number;
  approvers: string[];
  against?: number;
  memberCount: number;
  policy: SurplusPolicy;
  note?: string;
  recordedBy: string;
  createdAt?: string;
}): SurplusResolution {
  return {
    id: args.id,
    cycle: Math.max(1, Math.round(num(args.cycle)) || 1),
    date: args.date,
    minutesRef: args.minutesRef.trim(),
    attendees: Math.max(0, Math.round(num(args.attendees))),
    quorumRequired: quorumRequired(args.memberCount, args.policy),
    approvers: Array.from(new Set((args.approvers || []).map(String))),
    against: Math.max(0, Math.round(num(args.against))),
    policy: normalizePolicy(args.policy),
    note: (args.note || '').trim() || undefined,
    recordedBy: args.recordedBy,
    createdAt: args.createdAt || new Date().toISOString(),
  };
}

/** The resolution already recorded for a cycle, if any. */
export function resolutionFor(
  resolutions: SurplusResolution[] | undefined,
  cycle: number
): SurplusResolution | undefined {
  if (!Array.isArray(resolutions)) return undefined;
  return resolutions.find((r) => r && num(r.cycle) === num(cycle));
}

export const saccoFundsTotal = (funds?: { reserve: number; education: number; operations: number }): number =>
  num(funds?.reserve) + num(funds?.education) + num(funds?.operations);

/** Adds a cycle's withheld surplus to the running statutory balances. */
export function addSaccoFunds(
  funds: { reserve: number; education: number; operations: number } | undefined,
  plan: SurplusPlan
) {
  return {
    reserve: num(funds?.reserve) + num(plan.reserve),
    education: num(funds?.education) + num(plan.education),
    operations: num(funds?.operations) + num(plan.operations),
  };
}
