/**
 * Village money rules — single source of truth for safety thresholds.
 * - Cash-count gaps at/above GAP_TWO_KEY_THRESHOLD need a 2nd officer to seal.
 * - Welfare payouts above WELFARE_FAST_TRACK_CAP must go through the
 *   approvals queue (2 keys); at/below may fast-track single-key in emergency.
 */

/** UGX gap that stops a single officer from sealing the meeting. */
export const GAP_TWO_KEY_THRESHOLD = 50_000;

/** UGX ceiling for single-key emergency welfare payouts. */
export const WELFARE_FAST_TRACK_CAP = 100_000;

/** Cash to hand back when a member overpays a loan. Never negative. */
export function changeDue(entered: number, balance: number): number {
  return Math.max(0, Math.floor(entered || 0) - Math.max(0, Math.floor(balance || 0)));
}

/** Amount actually applied to the loan (capped at balance). */
export function appliedRepayment(entered: number, balance: number): number {
  return Math.min(Math.max(0, Math.floor(entered || 0)), Math.max(0, Math.floor(balance || 0)));
}

export function gapNeedsSecondKey(absDifference: number): boolean {
  return Math.abs(absDifference) >= GAP_TWO_KEY_THRESHOLD;
}

export function welfareNeedsQueue(amount: number): boolean {
  return Math.floor(amount || 0) > WELFARE_FAST_TRACK_CAP;
}
