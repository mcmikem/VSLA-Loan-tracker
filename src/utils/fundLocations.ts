import type { VSLAState } from '../types';

export type FundLocation = 'cash' | 'momo' | 'bank';

export const FUND_LABELS: Record<FundLocation, string> = {
  cash: 'Cash in box',
  momo: 'MoMo float',
  bank: 'Bank',
};

/**
 * Where the group's money physically sits. Box cash is the original field;
 * MoMo/bank are opt-in floats for groups that choose to store money
 * outside the metal box. Everything defaults to 0 for old states.
 */
export function fundBalances(state: VSLAState): Record<FundLocation, number> {
  return {
    cash: Math.max(0, Math.floor(state.boxCashBalance || 0)),
    momo: Math.max(0, Math.floor(state.momoBalance || 0)),
    bank: Math.max(0, Math.floor(state.bankBalance || 0)),
  };
}

export function totalFunds(state: VSLAState): number {
  const b = fundBalances(state);
  return b.cash + b.momo + b.bank;
}

export function transferError(
  state: VSLAState,
  from: FundLocation,
  to: FundLocation,
  amount: number
): string | null {
  const amt = Math.floor(amount || 0);
  if (from === to) return 'Pick two different places to move between.';
  if (amt <= 0) return 'Enter an amount above zero.';
  const b = fundBalances(state);
  if (amt > b[from]) {
    return `Not enough in ${FUND_LABELS[from]} (UGX ${b[from].toLocaleString()} < UGX ${amt.toLocaleString()}).`;
  }
  return null;
}

/** Pure balance math for a validated transfer — audit/logging is the caller's job. */
export function applyTransfer(
  state: VSLAState,
  from: FundLocation,
  to: FundLocation,
  amount: number
): Pick<VSLAState, 'boxCashBalance' | 'momoBalance' | 'bankBalance'> {
  const amt = Math.floor(amount || 0);
  const b = fundBalances(state);
  const next = { ...b, [from]: b[from] - amt, [to]: b[to] + amt };
  return { boxCashBalance: next.cash, momoBalance: next.momo, bankBalance: next.bank };
}
