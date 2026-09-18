/**
 * Short tamper-evident fingerprint for the approvals queue, shown on the
 * approvals dock so officers can confirm they're looking at the same ledger.
 * djb2 over the canonical JSON — NOT cryptographic, just a checksum.
 */
export function ledgerHash(value: unknown): string {
  const str = JSON.stringify(value ?? null);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-5);
}
