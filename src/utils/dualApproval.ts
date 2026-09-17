import { ApprovalItem } from '../types';

/**
 * Two-key rule for village trust.
 * - First distinct officer turns key 1/2: no money moves, status stays pending.
 * - Second DISTINCT officer turns key 2/2: money may move, status -> approved.
 * - Same officer cannot turn both keys.
 */

export function needsSecondKey(item: ApprovalItem): boolean {
  return item.status === 'pending' && !!item.firstApprovedBy;
}

export function isSameOfficer(item: ApprovalItem, actorName: string): boolean {
  return (item.firstApprovedBy || '').trim().toLowerCase() === (actorName || '').trim().toLowerCase();
}

export function describeKeys(item: ApprovalItem): string {
  if (item.status !== 'pending') return item.status;
  if (!item.firstApprovedBy) return '0/2 keys — needs 2 different officers';
  return `1/2 keys — ${item.firstApprovedBy} turned first key, needs a DIFFERENT officer`;
}

export function firstKeyUpdate(item: ApprovalItem, actorName: string, nowIso: string): ApprovalItem {
  return {
    ...item,
    firstApprovedBy: actorName,
    firstApprovedAt: nowIso,
  };
}
