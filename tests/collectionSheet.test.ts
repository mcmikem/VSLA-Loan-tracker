import { describe, expect, it } from 'vitest';
import { buildCollectionSheet } from '../src/utils/collectionSheet';
import type { VSLAState } from '../src/types';

const base: VSLAState = {
  groupName: 'Bakwata',
  boxIdentifier: 'BOX-01',
  cycle: 1,
  cycleMonth: 1,
  totalCycleMonths: 10,
  boxCashBalance: 0,
  loanFundBalance: 0,
  welfareFundBalance: 0,
  members: [
    { id: 'm1', no: '01', name: 'Sarah', initials: 'SN', zone: 'Z', phone: 'p', provider: 'MTN', attendance: '', sharesCount: 0, sharesTotal: 0, maxBorrowLimit: 0, loanBalance: 60000, welfareBalance: 0, isKeyholder: false, stamps: [], ledger: [] },
    { id: 'm2', no: '02', name: 'Joseph', initials: 'JM', zone: 'Z', phone: 'p', provider: 'MTN', attendance: '', sharesCount: 0, sharesTotal: 0, maxBorrowLimit: 0, loanBalance: 0, welfareBalance: 0, isKeyholder: false, stamps: [], ledger: [] },
  ],
  approvals: [],
  fines: [{ id: 'f1', memberNo: '01', memberName: 'Sarah', reason: 'Late', amount: 2000, timeNote: '', meetingRef: '', status: 'pending' }],
  welfareGrants: [],
  recentMeetingsCount: 28,
  lastBackupDate: '',
  snapshots: [],
  groupProfile: { id: 'g', name: 'Bakwata', boxIdentifier: 'BOX-01', cycle: 1, cycleMonth: 1, totalCycleMonths: 10, location: 'K', meetingDay: 'Fri', sharePrice: 10000, welfareMonthly: 5000, inviteCode: 'X', plan: 'free', createdAt: '', adminName: '', adminPhone: '' },
};

describe('collection sheet', () => {
  it('pulls owed amounts from the book, leaves paid columns to pen', () => {
    const s = buildCollectionSheet(base);
    expect(s.meetingNo).toBe(29);
    expect(s.rows).toHaveLength(2);
    expect(s.rows[0].loanOwed).toBe(60000);
    expect(s.rows[0].finesPending).toBe(2000);
    expect(s.rows[1].loanOwed).toBe(0);
    expect(s.totalLoansOwed).toBe(60000);
    expect(s.totalFinesPending).toBe(2000);
    expect(s.expectedWelfare).toBe(10000);
  });

  it('falls back safely with no profile', () => {
    const s = buildCollectionSheet({ ...base, groupProfile: undefined, members: [], fines: [] });
    expect(s.sharePrice).toBe(10000);
    expect(s.rows).toHaveLength(0);
  });
});
