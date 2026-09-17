/**
 * MoMo fee estimates (UGX) for transparency before approval.
 * Simplified 2025-2026 Uganda tiers — shown as ESTIMATE, not exact provider charge.
 * Cash is always 0. Prefer cash under 500k.
 */

export type MoMoNetwork = 'MTN' | 'Airtel' | 'Cash';

export function estimateMoMoFee(amount: number, network: MoMoNetwork): number {
  if (network === 'Cash') return 0;
  if (amount <= 0) return 0;
  // Tiered estimate: small amounts flat-ish, larger % capped
  if (amount <= 50_000) return network === 'MTN' ? 1_100 : 1_000;
  if (amount <= 150_000) return Math.round(amount * 0.018);
  if (amount <= 500_000) return Math.round(amount * 0.014);
  return Math.round(Math.min(amount * 0.01, 12_500));
}

export function netAfterFee(amount: number, network: MoMoNetwork): number {
  return Math.max(0, amount - estimateMoMoFee(amount, network));
}

export function feeNotice(amount: number, network: MoMoNetwork): string {
  if (network === 'Cash') return 'Cash handover — no fee.';
  const fee = estimateMoMoFee(amount, network);
  const net = netAfterFee(amount, network);
  return `Est. ${network} fee ~UGX ${fee.toLocaleString()} · member receives ~UGX ${net.toLocaleString()}. Cash = 0 fee.`;
}
