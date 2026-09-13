import { Member } from '../types';

export interface MemberPayout {
  memberId: string;
  memberNo: string;
  memberName: string;
  shares: number;
  saved: number;
  grossPayout: number;
  deductedLoan: number;
  netPayout: number;
  profit: number;
}

export interface ShareOutResult {
  totalSharesSold: number;
  totalShareCapital: number;
  interestEarned: number;
  finesCollected: number;
  totalPool: number;
  valuePerShare: number;
  profitPercentage: string;
  payouts: MemberPayout[];
  totalNetPayout: number;
  totalDeductedLoans: number;
}

/**
 * Upgrade #12 — deterministic share-out engine shared by the
 * CycleShareOutView (preview) and the execute handler in App
 * (posts ledger entries + resets the cycle).
 */
export function computeShareOut(
  members: Member[],
  loanFundBalance: number,
  finesCollected: number,
  sharePrice = 10000
): ShareOutResult {
  const totalSharesSold =
    members.length > 0 ? members.reduce((sum, m) => sum + (m.sharesCount || 0), 0) : 0;
  const totalShareCapital =
    members.length > 0 ? members.reduce((sum, m) => sum + (m.sharesTotal || 0), 0) : 0;
  const interestEarned = Math.round(loanFundBalance * 0.32);
  const totalPool = totalShareCapital + interestEarned + finesCollected;
  const valuePerShare = totalSharesSold > 0 ? Math.round(totalPool / totalSharesSold) : 0;
  const profitPercentage =
    sharePrice > 0 ? (((valuePerShare - sharePrice) / sharePrice) * 100).toFixed(1) : '0.0';

  const payouts: MemberPayout[] = members.map((m) => {
    const shares = m.sharesCount || 0;
    const saved = m.sharesTotal || 0;
    const grossPayout = shares * valuePerShare;
    const deductedLoan = Math.min(m.loanBalance || 0, grossPayout);
    const netPayout = grossPayout - deductedLoan;
    return {
      memberId: m.id,
      memberNo: m.no,
      memberName: m.name,
      shares,
      saved,
      grossPayout,
      deductedLoan,
      netPayout,
      profit: netPayout - saved,
    };
  });

  return {
    totalSharesSold,
    totalShareCapital,
    interestEarned,
    finesCollected,
    totalPool,
    valuePerShare,
    profitPercentage,
    payouts,
    totalNetPayout: payouts.reduce((s, p) => s + p.netPayout, 0),
    totalDeductedLoans: payouts.reduce((s, p) => s + p.deductedLoan, 0),
  };
}
