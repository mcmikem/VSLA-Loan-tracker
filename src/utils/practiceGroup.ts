import type { Member, VSLAState } from '../types';

export const PRACTICE_GROUP_ID = 'practice-play-money';
const STASH_STATE_KEY = 'vsla_practice_stash_state_v1';
const STASH_GROUP_KEY = 'vsla_practice_stash_group_v1';

function mkMember(
  id: string,
  no: string,
  name: string,
  initials: string,
  sharesCount: number,
  loanBalance: number
): Member {
  const price = 10000;
  const total = sharesCount * price;
  return {
    id,
    no,
    name,
    initials,
    zone: 'Practice Zone',
    phone: '+256 700 000000',
    provider: 'MTN',
    attendance: '1/1',
    sharesCount,
    sharesTotal: total,
    maxBorrowLimit: total * 3,
    loanBalance,
    welfareBalance: 5000,
    isKeyholder: no === '01',
    keyholderTitle: no === '01' ? 'Practice Secretary' : undefined,
    stamps: [
      { week: 1, shares: Math.min(5, sharesCount), status: 'validated' },
      { week: 2, shares: 0, status: 'current' },
    ],
    ledger: [
      {
        id: `led-practice-${id}`,
        meetingNo: 1,
        meetingCode: 'PRACTICE',
        title: 'Practice entry — play money, not real',
        badge: 'PRACTICE',
        subtitle: 'Try recording shares and repayments here. Nothing real moves.',
        date: 'Practice',
        amountText: `UGX ${total.toLocaleString()}`,
        isPositive: true,
        extraText: '',
      },
    ],
  };
}

/**
 * Practice group: 5 fake members, play money, clearly labelled.
 * Never synced to the server (groupId is reserved). Entering practice
 * stashes the real group; exiting restores it byte-for-byte.
 */
export function buildPracticeState(): VSLAState {
  const members = [
    mkMember('p-m1', '01', 'Practice Sarah', 'PS', 4, 0),
    mkMember('p-m2', '02', 'Practice Joseph', 'PJ', 3, 60000),
    mkMember('p-m3', '03', 'Practice Prossy', 'PP', 2, 0),
    mkMember('p-m4', '04', 'Practice Kato', 'PK', 5, 40000),
    mkMember('p-m5', '05', 'Practice Grace', 'PG', 1, 0),
  ];
  const boxCash = 250000;
  return {
    groupId: PRACTICE_GROUP_ID,
    groupName: 'Practice Group — play money',
    boxIdentifier: 'BOX-PRACTICE',
    inviteCode: 'PLAY-0000',
    cycle: 1,
    cycleMonth: 1,
    totalCycleMonths: 10,
    boxCashBalance: boxCash,
    loanFundBalance: 100000,
    welfareFundBalance: 25000,
    members,
    approvals: [],
    fines: [],
    welfareGrants: [],
    products: [],
    productSales: [],
    productExpenses: [],
    recentMeetingsCount: 1,
    lastBackupDate: new Date().toISOString(),
    snapshots: [],
    auditLog: [
      {
        id: `audit-practice-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        actorName: 'Practice Guide',
        action: 'Opened practice group (play money)',
        details: 'Fake members. Try shares, repayments, sealing — nothing real moves.',
      },
    ],
    currentUser: {
      id: 'acc-practice-sec',
      memberId: 'p-m1',
      memberNo: '01',
      name: 'Practice Secretary',
      phone: '+256 700 000000',
      provider: 'MTN',
      role: 'secretary',
      roleTitle: 'Practice Secretary',
      zone: 'Practice Zone',
      pin: '1234',
      avatarInitials: 'PS',
      avatarBg: 'bg-emerald-700',
      permissions: {
        canLockBox: true,
        canApproveLoans: true,
        canDisburseWelfare: true,
        canRecordShares: true,
        canRequestLoan: true,
        canManageBackups: false,
      },
    },
    availableAccounts: [],
    activePreset: 'practice',
  };
}

export function isPracticeGroup(groupId?: string): boolean {
  return groupId === PRACTICE_GROUP_ID;
}

export function stashRealGroup(state: VSLAState, groupId: string) {
  try {
    localStorage.setItem(STASH_STATE_KEY, JSON.stringify(state));
    localStorage.setItem(STASH_GROUP_KEY, groupId);
  } catch {
    /* storage full — caller must abort */
  }
}

export function popStashedGroup(): { state: VSLAState; groupId: string } | null {
  try {
    const s = localStorage.getItem(STASH_STATE_KEY);
    const g = localStorage.getItem(STASH_GROUP_KEY);
    if (!s || !g) return null;
    localStorage.removeItem(STASH_STATE_KEY);
    localStorage.removeItem(STASH_GROUP_KEY);
    return { state: JSON.parse(s), groupId: g };
  } catch {
    return null;
  }
}

export function hasStashedGroup(): boolean {
  try {
    return !!localStorage.getItem(STASH_STATE_KEY);
  } catch {
    return false;
  }
}
