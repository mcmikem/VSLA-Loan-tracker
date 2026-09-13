export type Language = 'EN' | 'LU' | 'SW';

export type MainTab = 'home' | 'meetings' | 'members' | 'loans' | 'approvals' | 'more';

export type ScreenId =
  | 'home'
  | 'meeting_close'
  | 'approvals'
  | 'member_passbook'
  | 'momo_push'
  | 'new_loan'
  | 'share_out'
  | 'welfare_fund'
  | 'audio_broadcast'
  | 'constitution_fines'
  | 'backup'
  | 'legal'
  | 'reports';

export interface ApprovalItem {
  id: string;
  type: 'vsla_loan' | 'welfare_grant' | 'savings_withdrawal';
  reqNumber: string;
  timeText: string;
  memberName: string;
  memberNo: string;
  phone?: string;
  provider?: 'MTN' | 'Airtel' | 'Cash';
  initiator: string;
  amount: number;
  term?: string;
  serviceFee?: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  totalSavings?: number;
  maxBorrowable?: number;
  welfareAvailable?: number;
  accountBalance?: number;
  postBalance?: number;
}

export interface StampItem {
  week: number;
  shares: number;
  status: 'validated' | 'current' | 'next' | 'close';
}

export interface LedgerEntry {
  id: string;
  meetingNo: number;
  meetingCode: string;
  title: string;
  subtitle: string;
  date: string;
  badge: string;
  amountText: string;
  isPositive: boolean;
  extraText: string;
}

export interface Member {
  id: string;
  no: string;
  name: string;
  initials: string;
  zone: string;
  phone: string;
  provider: 'MTN' | 'Airtel';
  attendance: string;
  sharesCount: number;
  sharesTotal: number;
  maxBorrowLimit: number;
  loanBalance: number;
  welfareBalance: number;
  isKeyholder: boolean;
  keyholderTitle?: string;
  activeLoan?: {
    code: string;
    purpose: string;
    principal: number;
    repaid: number;
    balance: number;
    interestRate: string;
    maturity: string;
  };
  stamps: StampItem[];
  ledger: LedgerEntry[];
}

export interface PendingFine {
  id: string;
  memberNo: string;
  memberName: string;
  reason: string;
  amount: number;
  timeNote: string;
  meetingRef: string;
  status: 'pending' | 'collected' | 'waived';
}

export interface WelfareGrant {
  id: string;
  memberNo: string;
  memberName: string;
  reason: string;
  amount: number;
  paymentMethod: string;
  date: string;
  minutesRef: string;
  type: 'medical' | 'bereavement' | 'other';
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  label: string;
  membersCount: number;
  boxCashBalance: number;
  loanFundBalance: number;
  welfareFundBalance: number;
  data: string; // JSON string
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  details: string;
  amount?: number;
}

export interface UserAccount {
  id: string;
  memberId?: string;
  memberNo?: string;
  name: string;
  phone: string;
  provider: 'MTN' | 'Airtel';
  role: 'secretary' | 'treasurer' | 'keyholder' | 'chairperson' | 'member';
  roleTitle: string;
  zone: string;
  pin: string;
  avatarInitials: string;
  avatarBg: string;
  nationalId?: string;
  permissions: {
    canLockBox: boolean;
    canApproveLoans: boolean;
    canDisburseWelfare: boolean;
    canRecordShares: boolean;
    canRequestLoan: boolean;
    canManageBackups: boolean;
  };
}

export interface GroupProfile {
  id: string;
  name: string;
  boxIdentifier: string;
  cycle: number;
  cycleMonth: number;
  totalCycleMonths: number;
  location: string;
  meetingDay: string;
  sharePrice: number;
  welfareMonthly: number;
  inviteCode: string;
  plan: 'free' | 'pro' | 'sacco';
  createdAt: string;
  adminName: string;
  adminPhone: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  boxIdentifier: string;
  location: string;
  meetingDay: string;
  sharePrice: number;
  inviteCode: string;
  membersCount: number;
  boxCashBalance: number;
  plan: 'free' | 'pro' | 'sacco';
  isCurrent?: boolean;
}

export interface CreateGroupPayload {
  name: string;
  boxIdentifier: string;
  location: string;
  meetingDay: string;
  sharePrice: number;
  welfareMonthly: number;
  cycleDurationMonths: number;
  adminName: string;
  adminPhone: string;
  adminProvider: 'MTN' | 'Airtel';
  adminPin: string;
  plan?: 'free' | 'pro' | 'sacco';
}

export interface JoinGroupPayload {
  inviteCode: string;
  memberName: string;
  phone: string;
  provider: 'MTN' | 'Airtel';
  nationalId?: string;
  pin: string;
}

export interface VSLAState {
  groupId?: string;
  groupProfile?: GroupProfile;
  groupName: string;
  boxIdentifier: string;
  inviteCode?: string;
  cycle: number;
  cycleMonth: number;
  totalCycleMonths: number;
  boxCashBalance: number;
  loanFundBalance: number;
  welfareFundBalance: number;
  members: Member[];
  approvals: ApprovalItem[];
  fines: PendingFine[];
  welfareGrants: WelfareGrant[];
  recentMeetingsCount: number;
  lastBackupDate: string;
  snapshots: BackupSnapshot[];
  auditLog?: AuditEntry[];
  currentUser?: UserAccount;
  availableAccounts?: UserAccount[];
  activePreset?: string;
}
