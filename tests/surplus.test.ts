import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  RECOMMENDED_SURPLUS_POLICY,
  addSaccoFunds,
  buildResolution,
  buildSurplusPlan,
  checkResolution,
  normalizePolicy,
  policyFor,
  quorumRequired,
  resolutionFor,
  saccoFundsTotal,
  sameSplit,
} from '../src/utils/surplus';
import { computeShareOut } from '../src/utils/shareout';
import type { GroupProfile, Member, SurplusPolicy } from '../src/types';

function member(no: string, over: Partial<Member> = {}): Member {
  return {
    id: `m-${no}`,
    no,
    name: `Member ${no}`,
    initials: 'M',
    zone: 'Zone',
    phone: '0772000000',
    provider: 'MTN',
    attendance: '1/1',
    sharesCount: 10,
    sharesTotal: 100000,
    maxBorrowLimit: 300000,
    loanBalance: 0,
    welfareBalance: 0,
    isKeyholder: false,
    stamps: [],
    ledger: [],
    ...over,
  };
}

const policy: SurplusPolicy = RECOMMENDED_SURPLUS_POLICY;
const profile = (p?: Partial<GroupProfile>): GroupProfile => ({
  id: 'g1',
  name: 'Group',
  boxIdentifier: 'BOX-1',
  cycle: 1,
  cycleMonth: 1,
  totalCycleMonths: 10,
  location: 'Village',
  meetingDay: 'Friday',
  sharePrice: 10000,
  welfareMonthly: 5000,
  maxSharesPerMeeting: 5,
  requiredGuarantors: 2,
  borrowMultiplier: 3,
  loanRates: { oneMonth: 5, twoMonths: 8, threeMonths: 10 },
  welfareCategoryCaps: { medical: 50000, bereavement: 50000, other: 20000 },
  shareClasses: [{ id: 'ordinary', name: 'Ordinary', price: 10000, active: true }],
  sacco: p?.sacco,
  inviteCode: 'ABCD',
  plan: 'free',
  createdAt: '2026-01-01',
  adminName: 'Admin',
  adminPhone: '0772000000',
  ...p,
});

describe('surplus appropriation', () => {
  it('pays the whole surplus out when no policy is recorded', () => {
    const plan = buildSurplusPlan(320000, 50000);
    expect(plan).toMatchObject({
      surplus: 370000,
      bonus: 370000,
      bonusPct: 100,
      withheld: 0,
      usable: true,
    });
  });

  it('keeps the reserve, education and operations shares out of the payout', () => {
    // 20% + 10% + 5% of the interest, the fines shared out.
    const plan = buildSurplusPlan(320000, 50000, policy);
    expect(plan.reserve).toBe(64000);
    expect(plan.education).toBe(32000);
    expect(plan.operations).toBe(16000);
    expect(plan.withheld).toBe(112000);
    expect(plan.bonus).toBe(258000);
    expect(plan.bonus + plan.withheld).toBe(plan.surplus);
  });

  it('fines are constitution income: they can be kept for operations', () => {
    const plan = buildSurplusPlan(100000, 40000, { ...policy, finesToBonus: false });
    expect(plan.operations).toBe(5000 + 40000);
    // the dividend is what is left of the interest alone: 100000 − 20000 − 10000 − 5000
    expect(plan.bonus).toBe(65000);
    expect(plan.bonus + plan.withheld).toBe(plan.surplus);
  });

  it('the four shares always add back up to the surplus after rounding', () => {
    const plan = buildSurplusPlan(33333, 7777, { ...policy, reservePct: 17.5, educationPct: 3.3, operationsPct: 9.1 });
    expect(plan.bonus + plan.reserve + plan.education + plan.operations).toBe(plan.surplus);
  });

  it('refuses a split that leaves members nothing, or over-allocates', () => {
    const none = buildSurplusPlan(100000, 0, { ...policy, reservePct: 60, educationPct: 30, operationsPct: 10 });
    expect(none.usable).toBe(false);
    expect(none.bonus).toBe(0);
    expect(none.problems[0]).toMatch(/No dividend is left for members/);

    const over = buildSurplusPlan(100000, 0, { ...policy, reservePct: 80, educationPct: 40, operationsPct: 10 });
    expect(over.usable).toBe(false);
    expect(over.problems.join(' ')).toMatch(/more than 100%/);
  });

  it('survives junk values instead of producing NaN', () => {
    const plan = buildSurplusPlan(NaN, -5, normalizePolicy({ reservePct: 'abc' as unknown as number }));
    expect(plan.surplus).toBe(0);
    expect(Number.isFinite(plan.bonus)).toBe(true);
  });

  it('clamps out-of-range percentages instead of trusting them', () => {
    expect(normalizePolicy({ reservePct: 400, educationPct: -5, quorumPct: 0 }).reservePct).toBe(100);
    expect(normalizePolicy({ reservePct: 400, educationPct: -5 }).educationPct).toBe(0);
    expect(normalizePolicy({ quorumPct: 0 }).quorumPct).toBe(50);
  });
});

describe('the policy gate on share-out', () => {
  const roster = [member('01'), member('02'), member('03'), member('04')];

  it('without a policy the numbers are exactly what they always were', () => {
    const before = computeShareOut(roster, 1000000, 50000, 10000);
    expect(before.totalPool).toBe(400000 + Math.round(1000000 * 0.32) + 50000);
    expect(before.withheld).toBe(0);
    expect(before.distributableSurplus).toBe(before.interestEarned + before.finesCollected);
  });

  it('with a policy the members are paid less and the group keeps the rest', () => {
    const plain = computeShareOut(roster, 1000000, 50000, 10000);
    const withPolicy = computeShareOut(roster, 1000000, 50000, 10000, policy);
    expect(withPolicy.distributableSurplus).toBe(withPolicy.plan.bonus);
    expect(withPolicy.withheld).toBe(withPolicy.plan.withheld);
    expect(withPolicy.distributableSurplus).toBeLessThan(plain.distributableSurplus);
    // the two together are the same money
    expect(withPolicy.totalPool + withPolicy.withheld).toBe(plain.totalPool);
    // every member still gets their own savings back
    expect(withPolicy.payouts.every((p) => p.netPayout >= p.saved - p.deductedLoan)).toBe(true);
  });

  it('knows when a recorded split no longer matches the one approved', () => {
    expect(sameSplit(policy, policy)).toBe(true);
    expect(sameSplit(policy, { ...policy, reservePct: 25 })).toBe(false);
    expect(sameSplit(policy, { ...policy, finesToBonus: false })).toBe(false);
    expect(sameSplit(policy, { ...policy, quorumPct: 60 })).toBe(true);
    expect(sameSplit(undefined, undefined)).toBe(true);
    expect(sameSplit(policy, undefined)).toBe(false);
  });

  it('reads the policy off the group profile', () => {
    expect(policyFor(profile())).toBeUndefined();
    expect(policyFor(profile({ sacco: { surplusPolicy: policy } }))).toEqual(policy);
  });
});

describe('quorum and the members’ resolution', () => {
  const roster = [member('01'), member('02'), member('03'), member('04')];
  const plan = buildSurplusPlan(320000, 0, policy);

  it('half the membership is the default quorum', () => {
    expect(quorumRequired(4, policy)).toBe(2);
    expect(quorumRequired(5, policy)).toBe(3);
    expect(quorumRequired(1, policy)).toBe(1);
    expect(quorumRequired(0, policy)).toBe(1);
  });

  it('accepts a proper meeting and names what is missing otherwise', () => {
    const good = checkResolution(
      { attendees: 3, approvers: ['01', '02', '03'], memberCount: 4, plan, policy },
      roster
    );
    expect(good.ok).toBe(true);
    expect(good.quorumRequired).toBe(2);

    const thin = checkResolution({ attendees: 1, approvers: ['01'], memberCount: 4, plan, policy }, roster);
    expect(thin.ok).toBe(false);
    expect(thin.problems.join(' ')).toMatch(/1 present, 2 needed/);

    const minority = checkResolution(
      { attendees: 4, approvers: ['01', '02'], memberCount: 4, plan, policy },
      roster
    );
    expect(minority.ok).toBe(false);
    expect(minority.problems.join(' ')).toMatch(/not a majority/);

    const ghost = checkResolution(
      { attendees: 3, approvers: ['01', '02', '99'], memberCount: 4, plan, policy },
      roster
    );
    expect(ghost.ok).toBe(false);
    expect(ghost.problems.join(' ')).toMatch(/not on the member register/);

    const twice = checkResolution(
      { attendees: 3, approvers: ['01', '01', '02'], memberCount: 4, plan, policy },
      roster
    );
    expect(twice.ok).toBe(false);
    expect(twice.problems.join(' ')).toMatch(/counted twice/);

    const empty = checkResolution({ attendees: 3, approvers: [], memberCount: 4, plan, policy }, roster);
    expect(empty.ok).toBe(false);
    expect(empty.problems.join(' ')).toMatch(/No member has approved/);
  });

  it('a broken split blocks the resolution too', () => {
    const bad = buildSurplusPlan(100000, 0, { ...policy, reservePct: 100, educationPct: 20, operationsPct: 0 });
    const check = checkResolution(
      { attendees: 3, approvers: ['01', '02', '03'], memberCount: 4, plan: bad, policy },
      roster
    );
    expect(check.ok).toBe(false);
    expect(check.problems.join(' ')).toMatch(/more than 100%/);
  });

  it('stamps the quorum it checked into the record', () => {
    const resolution = buildResolution({
      id: 'res-1',
      cycle: 4,
      date: '2026-04-03',
      minutesRef: '  Min 04/2026  ',
      attendees: 3,
      approvers: ['01', '02', '02', '03'],
      against: 0,
      memberCount: 4,
      policy,
      note: '  bonus approved  ',
      recordedBy: 'Chairperson',
      createdAt: '2026-04-03T10:00:00.000Z',
    });
    expect(resolution.quorumRequired).toBe(2);
    expect(resolution.approvers).toEqual(['01', '02', '03']);
    expect(resolution.minutesRef).toBe('Min 04/2026');
    expect(resolution.note).toBe('bonus approved');
    expect(resolution.createdAt).toBe('2026-04-03T10:00:00.000Z');
  });

  it('finds the resolution already recorded for a cycle', () => {
    const list = [buildResolution({ id: 'a', cycle: 3, date: 'x', minutesRef: '', attendees: 2, approvers: [], memberCount: 4, policy, recordedBy: 'S' })];
    expect(resolutionFor(list, 3)?.id).toBe('a');
    expect(resolutionFor(list, 4)).toBeUndefined();
    expect(resolutionFor(undefined, 3)).toBeUndefined();
  });
});

describe('statutory funds', () => {
  it('carry forward from cycle to cycle', () => {
    const first = addSaccoFunds(undefined, buildSurplusPlan(320000, 0, policy));
    expect(first).toEqual({ reserve: 64000, education: 32000, operations: 16000 });
    const second = addSaccoFunds(first, buildSurplusPlan(100000, 0, policy));
    expect(second.reserve).toBe(84000);
    expect(saccoFundsTotal(second)).toBe(84000 + 42000 + 21000);
    expect(saccoFundsTotal(undefined)).toBe(0);
  });
});

/**
 * The resolution gate only counts if the payout screen actually refuses to run
 * without it and the money kept back is carried, not lost.
 */
describe('the surplus gate is wired to the payout screen', () => {
  const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const shareOut = read('src/views/CycleShareOutView.tsx');
  const app = read('src/App.tsx');

  it('share-out computes the plan from the group policy', () => {
    expect(shareOut).toContain('computeShareOut(members, loanFundBalance, finesCollected, sharePrice, surplusPolicy)');
    expect(shareOut).toContain('const plan = result.plan;');
    // the visible breakdown has to add up to the hero number
    expect(shareOut).toContain('−UGX {result.withheld.toLocaleString');
    expect(shareOut).toContain('result.withheld > 0');
    expect(shareOut).toContain('plan.bonus.toLocaleString');
    expect(shareOut).toContain('saccoFunds.reserve.toLocaleString');
  });

  it('share-out refuses to execute without a recorded resolution', () => {
    expect(shareOut).toContain('checkResolution(');
    expect(shareOut).toContain('resolutionOk');
    expect(shareOut).toContain('onRecordResolution(');
  });

  it('executing carries the withheld money into the statutory funds', () => {
    expect(app).toContain('saccoFunds: addSaccoFunds(');
    expect(app).toContain('surplusResolutions:');
  });
});
