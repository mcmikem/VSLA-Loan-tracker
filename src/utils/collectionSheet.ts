import type { VSLAState } from '../types';

export interface CollectionRow {
  memberId: string;
  no: string;
  name: string;
  loanOwed: number;
  finesPending: number;
  welfareDue: number;
  sharePrice: number;
}

export interface CollectionSheet {
  groupName: string;
  boxIdentifier: string;
  meetingNo: number;
  date: string;
  sharePrice: number;
  welfareDue: number;
  rows: CollectionRow[];
  totalLoansOwed: number;
  totalFinesPending: number;
  expectedWelfare: number;
}

/**
 * Collection sheet: printed BEFORE the meeting, filled by hand.
 * Owed columns come from the book; paid columns stay blank for pen.
 * Explicitly no principal/interest split — VSLA loans are flat.
 */
export function buildCollectionSheet(state: VSLAState): CollectionSheet {
  const sharePrice = state.groupProfile?.sharePrice || 10000;
  const welfareDue = state.groupProfile?.welfareMonthly || 5000;
  const members = state.members || [];
  const fines = state.fines || [];

  const rows: CollectionRow[] = members.map((m) => ({
    memberId: m.id,
    no: m.no,
    name: m.name,
    loanOwed: Math.max(0, Math.floor(m.loanBalance || 0)),
    finesPending: fines
      .filter((f) => f.status === 'pending' && (f.memberNo === m.no || f.memberName === m.name))
      .reduce((s, f) => s + (f.amount || 0), 0),
    welfareDue,
    sharePrice,
  }));

  return {
    groupName: state.groupName || state.groupProfile?.name || 'Savings Group',
    boxIdentifier: state.boxIdentifier || state.groupProfile?.boxIdentifier || '',
    meetingNo: (state.recentMeetingsCount || 0) + 1,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    sharePrice,
    welfareDue,
    rows,
    totalLoansOwed: rows.reduce((s, r) => s + r.loanOwed, 0),
    totalFinesPending: rows.reduce((s, r) => s + r.finesPending, 0),
    expectedWelfare: rows.length * welfareDue,
  };
}
