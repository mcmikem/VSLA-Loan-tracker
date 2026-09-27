/**
 * Ugandan phone numbers, shared by the browser and the API.
 * wa.me and SMS gateways both need: digits only, country code, no plus.
 */
export function normalizeUgPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('256')) return d;
  if (d.startsWith('0')) return `256${d.slice(1)}`;
  if (d.length === 9) return `256${d}`;
  return d;
}

export const isUgPhone = (raw) => /^256\d{9}$/.test(normalizeUgPhone(raw));
