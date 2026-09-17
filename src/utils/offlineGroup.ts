import type { CreateGroupPayload, GroupSummary, VSLAState } from '../types';

const PENDING_GROUP_KEY = 'vsla_pending_group_v1';

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16);
}

/**
 * Build a fully working group WITHOUT network (gap 1a: register under the
 * tree). Mirrors api/groups.js ?action=create. The state carries
 * pendingSync:true until POST /api/state confirms it server-side.
 */
export function buildLocalGroup(payload: CreateGroupPayload): {
  state: VSLAState;
  group: GroupSummary;
  inviteCode: string;
} {
  const name = payload.name.trim();
  const cleanSlug = slug(name) || 'group';
  const groupId = `grp-${cleanSlug}-${Date.now().toString(36).slice(-4)}`;
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GRP';
  const inviteCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const boxId = payload.boxIdentifier?.trim() || `BOX-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
  const price = Number(payload.sharePrice) || 10000;
  const welfare = Number(payload.welfareMonthly) || 5000;
  const adminName = payload.adminName.trim();
  const initials =
    adminName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  const adminAccount = {
    id: `acc-admin-${Date.now().toString(36)}`,
    memberNo: '01',
    name: adminName,
    phone: payload.adminPhone.trim(),
    provider: payload.adminProvider || ('MTN' as const),
    role: 'secretary' as const,
    roleTitle: 'General Secretary & Box Teller',
    zone: payload.location?.trim() || 'Headquarters',
    pin: payload.adminPin || '1234',
    avatarInitials: initials,
    avatarBg: 'bg-emerald-700',
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: true,
      canRecordShares: true,
      canRequestLoan: true,
      canManageBackups: true,
    },
  };

  const memberId = `m-${Date.now().toString(36)}`;
  const state: VSLAState = {
    groupId,
    groupProfile: {
      id: groupId,
      name,
      boxIdentifier: boxId,
      cycle: 1,
      cycleMonth: 1,
      totalCycleMonths: Number(payload.cycleDurationMonths) || 10,
      location: payload.location?.trim() || 'Uganda',
      meetingDay: payload.meetingDay?.trim() || 'Every Friday 4:00 PM',
      sharePrice: price,
      welfareMonthly: welfare,
      inviteCode,
      plan: payload.plan || 'free',
      createdAt: new Date().toISOString(),
      adminName,
      adminPhone: payload.adminPhone.trim(),
    },
    groupName: name,
    boxIdentifier: boxId,
    inviteCode,
    cycle: 1,
    cycleMonth: 1,
    totalCycleMonths: Number(payload.cycleDurationMonths) || 10,
    boxCashBalance: price,
    loanFundBalance: 0,
    welfareFundBalance: welfare,
    members: [
      {
        id: memberId,
        no: '01',
        memNumber: 'MEM-0001',
        name: adminName,
        initials,
        zone: payload.location?.trim() || 'Main Zone',
        phone: payload.adminPhone.trim(),
        provider: payload.adminProvider || 'MTN',
        attendance: '1/1',
        sharesCount: 1,
        sharesTotal: price,
        maxBorrowLimit: price * 3,
        loanBalance: 0,
        welfareBalance: welfare,
        isKeyholder: true,
        keyholderTitle: 'Executive Secretary',
        stamps: [
          { week: 1, shares: 1, status: 'validated' },
          { week: 2, shares: 0, status: 'next' },
        ],
        ledger: [],
      },
    ],
    approvals: [],
    fines: [],
    welfareGrants: [],
    recentMeetingsCount: 1,
    lastBackupDate: new Date().toISOString(),
    snapshots: [
      {
        id: `snap-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Cycle 1 Genesis Initialization for ${name}`,
        membersCount: 1,
        boxCashBalance: price,
        loanFundBalance: 0,
        welfareFundBalance: welfare,
        data: '',
      },
    ],
    currentUser: adminAccount,
    availableAccounts: [adminAccount],
    activePreset: 'new_group',
    pendingSync: true,
  };

  const group: GroupSummary = {
    id: groupId,
    name,
    boxIdentifier: boxId,
    location: payload.location?.trim() || 'Uganda',
    meetingDay: payload.meetingDay?.trim() || 'Every Friday 4:00 PM',
    sharePrice: price,
    inviteCode,
    membersCount: 1,
    boxCashBalance: price,
    plan: payload.plan || 'free',
  };

  return { state, group, inviteCode };
}

export function savePendingGroup(groupId: string) {
  try {
    localStorage.setItem(PENDING_GROUP_KEY, groupId);
  } catch {
    /* offline */
  }
}

export function loadPendingGroup(): string | null {
  try {
    return localStorage.getItem(PENDING_GROUP_KEY);
  } catch {
    return null;
  }
}

export function clearPendingGroup() {
  try {
    localStorage.removeItem(PENDING_GROUP_KEY);
  } catch {
    /* offline */
  }
}
