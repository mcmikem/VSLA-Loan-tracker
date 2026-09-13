import { AuditEntry, VSLAState } from '../types';

const MAX_ENTRIES = 300;

function uid(): string {
  return `audit-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Upgrade #7 — immutable audit trail.
 * Every cash-affecting action appends an entry recording who did what,
 * when, and for how much. Rendered in Backup & Audit → Audit Trail.
 */
export function withAudit(
  state: VSLAState,
  actorName: string,
  action: string,
  details: string,
  amount?: number
): VSLAState {
  const entry: AuditEntry = {
    id: uid(),
    timestamp: new Date().toISOString(),
    actorName,
    action,
    details,
    amount,
  };
  const log = [entry, ...(state.auditLog || [])].slice(0, MAX_ENTRIES);
  return { ...state, auditLog: log };
}

export function formatAuditTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
