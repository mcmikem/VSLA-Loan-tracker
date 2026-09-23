export const SHARED_PHONE_DEMO_STORAGE_KEY = 'bakwata_shared_phone_demo_v1';
export const SHARED_PHONE_DEMO_GROUP_ID = 'bakwata-demo-shared-phone';
export const SHARED_PHONE_DEMO_VERSION = 1;

export type DemoAttendance = 'present' | 'late' | 'absent';

export interface SharedPhoneDemoMember {
  id: string;
  no: string;
  name: string;
  initials: string;
  phone: string;
  provider: 'MTN' | 'Airtel';
  attendance: DemoAttendance;
  sharesCount: number;
  loanBalance: number;
}

export interface SharedPhoneDemoState {
  version: number;
  groupId: string;
  groupName: string;
  boxIdentifier: string;
  meetingNo: number;
  step: 0 | 1 | 2 | 3;
  attendanceCommitted: boolean;
  sharesRecorded: boolean;
  repaymentRecorded: boolean;
  meetingCompleted: boolean;
  members: SharedPhoneDemoMember[];
  approval: {
    id: string;
    memberName: string;
    memberNo: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved';
    firstKeyTurnedBy?: string;
  };
  lastAction: string;
}

const demoMembers: SharedPhoneDemoMember[] = [
  {
    id: 'demo-m1', no: '01', name: 'Amina Nankya', initials: 'AN',
    phone: '0700 000 101', provider: 'MTN', attendance: 'present', sharesCount: 1, loanBalance: 0,
  },
  {
    id: 'demo-m2', no: '02', name: 'Joseph Ssemanda', initials: 'JS',
    phone: '0700 000 102', provider: 'Airtel', attendance: 'present', sharesCount: 1, loanBalance: 60000,
  },
  {
    id: 'demo-m3', no: '03', name: 'Prossy Namukasa', initials: 'PN',
    phone: '0700 000 103', provider: 'MTN', attendance: 'late', sharesCount: 1, loanBalance: 0,
  },
  {
    id: 'demo-m4', no: '04', name: 'Kato Lwanga', initials: 'KL',
    phone: '0700 000 104', provider: 'Airtel', attendance: 'present', sharesCount: 0, loanBalance: 40000,
  },
  {
    id: 'demo-m5', no: '05', name: 'Grace Nalubega', initials: 'GN',
    phone: '0700 000 105', provider: 'MTN', attendance: 'absent', sharesCount: 0, loanBalance: 0,
  },
];

/** Build a fresh, fictional state. It never reads the live VSLA state. */
export function buildSharedPhoneDemoState(): SharedPhoneDemoState {
  return {
    version: SHARED_PHONE_DEMO_VERSION,
    groupId: SHARED_PHONE_DEMO_GROUP_ID,
    groupName: 'Bakwata Demo Circle',
    boxIdentifier: 'DEMO-BOX-01',
    meetingNo: 29,
    step: 0,
    attendanceCommitted: false,
    sharesRecorded: false,
    repaymentRecorded: false,
    meetingCompleted: false,
    members: demoMembers.map((member) => ({ ...member })),
    approval: {
      id: 'demo-approval-01',
      memberName: 'Prossy Namukasa',
      memberNo: '03',
      amount: 150000,
      reason: 'School fees',
      status: 'pending',
    },
    lastAction: 'Ready for the secretary to start the meeting.',
  };
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read only the demo namespace. Production keys are intentionally ignored. */
export function loadSharedPhoneDemoState(storage?: Storage): SharedPhoneDemoState {
  const store = resolveStorage(storage);
  if (!store) return buildSharedPhoneDemoState();
  try {
    const raw = store.getItem(SHARED_PHONE_DEMO_STORAGE_KEY);
    if (!raw) return buildSharedPhoneDemoState();
    const parsed = JSON.parse(raw) as SharedPhoneDemoState;
    if (
      parsed?.version !== SHARED_PHONE_DEMO_VERSION ||
      parsed?.groupId !== SHARED_PHONE_DEMO_GROUP_ID ||
      !Array.isArray(parsed.members) ||
      parsed.members.length !== demoMembers.length
    ) {
      return buildSharedPhoneDemoState();
    }
    return parsed;
  } catch {
    return buildSharedPhoneDemoState();
  }
}

export function saveSharedPhoneDemoState(state: SharedPhoneDemoState, storage?: Storage): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(SHARED_PHONE_DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Demo remains usable in memory when browser storage is unavailable. */
  }
}

/** Reset only the demo namespace and return a new fictional meeting state. */
export function resetSharedPhoneDemoState(storage?: Storage): SharedPhoneDemoState {
  const fresh = buildSharedPhoneDemoState();
  saveSharedPhoneDemoState(fresh, storage);
  return fresh;
}

