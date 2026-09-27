export type Language = 'EN' | 'LU';

export type MainTab = 'home' | 'meetings' | 'members' | 'loans' | 'approvals' | 'shop' | 'more';

export type ScreenId =
  | 'home'
  | 'member_home'
  | 'meeting_close'
  | 'meeting_wizard'
  | 'approvals'
  | 'notifications'
  | 'member_passbook'
  | 'momo_push'
  | 'new_loan'
  | 'share_out'
  | 'welfare_fund'
  | 'audio_broadcast'
  | 'constitution_fines'
  | 'backup'
  | 'legal'
  | 'reports'
  | 'about'
  | 'help'
  | 'shop'
  | 'users'
  | 'group_settings';

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
  purpose?: string;
  guarantorNos?: string[];
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  totalSavings?: number;
  maxBorrowable?: number;
  welfareAvailable?: number;
  accountBalance?: number;
  postBalance?: number;
  /** Audit stamp: who decided, when, and through which payout channel. */
  decidedBy?: string;
  decidedAt?: string;
  payoutMethod?: string;
  payoutStatus?: 'pending' | 'confirmed';
  payoutConfirmedAt?: string;
  payoutConfirmedBy?: string;
  confirmationCode?: string;
  confirmationCodeHash?: string;
  confirmationCodeExpiresAt?: string;
  confirmationOfficerId?: string;
  /** Two-key rule: first officer key turn. Money moves only on distinct second key. */
  firstApprovedBy?: string;
  firstApprovedAt?: string;
  secondApprovedBy?: string;
  secondApprovedAt?: string;
  /** Rejection reason (optional) — shown in history and to the applicant. */
  rejectReason?: string;
}

export interface StampItem {
  week: number;
  shares: number;
  status: 'validated' | 'current' | 'next' | 'close';
}

export interface LedgerEntry {
  id: string;
  meetingNo?: number;
  meetingCode?: string;
  title: string;
  subtitle: string;
  date: string;
  badge: string;
  amountText: string;
  isPositive: boolean;
  extraText?: string;
  entryType?: string;
  shareClassId?: string;
  shareClassName?: string;
  shareCount?: number;
  unitPrice?: number;
}

export interface Member {
  id: string;
  no: string;
  memNumber?: string;
  name: string;
  initials: string;
  zone: string;
  phone: string;
  provider: 'MTN' | 'Airtel';
  nationalId?: string;
  business?: string;
  /** Small compressed face photo (data URL) — tap-face selection for low-literacy users. */
  photoUrl?: string;
  kinName?: string;
  kinPhone?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  attendance: string;
  sharesCount: number;
  sharesTotal: number;
  maxBorrowLimit: number;
  loanBalance: number;
  welfareBalance: number;
  isKeyholder: boolean;
  keyholderTitle?: string;
  /** SACCO membership: which share class this member belongs to. */
  shareClassId?: string;
  /** SACCO membership: when they joined (the register's "since" column). */
  memberSince?: string;
  nationalIdRef?: string;
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

export interface ShopProduct {
  id: string;
  name: string;
  sellerType: 'group' | 'member';
  sellerName?: string;
  sellerPhone?: string;
  kind?: 'product' | 'service';
  imageUrl?: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  soldQty: number;
  unit: string;
}

export interface ProductSale {
  id: string;
  productId: string;
  productName: string;
  sellerType: 'group' | 'member';
  qty: number;
  unitPrice: number;
  costAtSale: number;
  buyer: string;
  method: 'cash' | 'momo';
  timestamp: string;
}

export interface ProductExpense {
  id: string;
  label: string;
  amount: number;
  timestamp: string;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  label: string;
  membersCount: number;
  boxCashBalance: number;
  loanFundBalance?: number;
  welfareFundBalance?: number;
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

export interface ShareClass {
  id: string;
  name: string;
  price: number;
  active: boolean;
  /** SACCOs often lend more against preference shares than ordinary ones. */
  borrowMultiplier?: number;
  /** Accrued savings interest is optional and shown separately at share-out. */
  interestBearing?: boolean;
}

/**
 * SACCO registration details — the fields a registered society is expected to
 * show on its letterhead, letter of application and statutory registers.
 * Optional everywhere so plain village groups never see a SACCO form.
 */
/**
 * How a cycle's surplus (loan interest + fines) is appropriated. The reserve,
 * education and operations shares stay with the group; whatever is left is the
 * dividend members are paid. Unset means the whole surplus is paid out, which
 * is what a plain village group does.
 */
export interface SurplusPolicy {
  /** Percent of loan interest into the statutory reserve. */
  reservePct: number;
  /** Percent into the education fund. */
  educationPct: number;
  /** Percent into running costs. */
  operationsPct: number;
  /** Fines are constitution income: true = shared out, false = kept for operations. */
  finesToBonus: boolean;
  /** Share of the membership that must be present to validly approve. */
  quorumPct: number;
}

/** A members' resolution approving one cycle's surplus appropriation. */
export interface SurplusResolution {
  id: string;
  cycle: number;
  /** YYYY-MM-DD */
  date: string;
  /** Where it is written down in the minutes book, e.g. "Min 04/2026". */
  minutesRef: string;
  attendees: number;
  quorumRequired: number;
  /** Member numbers that voted yes. */
  approvers: string[];
  against: number;
  policy: SurplusPolicy;
  note?: string;
  recordedBy: string;
  createdAt: string;
}

/** Money withheld from share-out and carried forward, cycle after cycle. */
/** An authority change that key 1 approved and is waiting for key 2. */
export interface PendingOfficerChange {
  id: string;
  kind: 'add' | 'role' | 'permissions' | 'pin' | 'remove';
  targetId?: string;
  targetName: string;
  summary: string;
  /** For 'add': the account that will be created. */
  newAccount?: UserAccount;
  /** For changes: exactly the fields that will be written. */
  patch?: Partial<UserAccount> & { permissions?: Partial<UserAccount['permissions']> };
  firstKeyBy: string;
  firstKeyAt: string;
}

/** A recorded change to who may move money: two keys, one line, one register. */
export interface OfficerChangeRecord {
  id: string;
  at: string;
  kind: 'add' | 'role' | 'permissions' | 'pin' | 'remove';
  officerId?: string;
  officerName: string;
  summary: string;
  firstKeyBy: string;
  firstKeyAt: string;
  secondKeyBy?: string;
  secondKeyAt?: string;
}

/** Two-key record for a share-out: who turned key 1, who released the money. */
export interface ShareOutApprovalRecord {
  cycle: number;
  firstApprovedBy: string;
  firstApprovedAt: string;
  secondApprovedBy?: string;
  secondApprovedAt?: string;
}

export interface SaccoFunds {
  reserve: number;
  education: number;
  operations: number;
}

export interface SaccoDetails {
  registrationNo?: string;
  registeredOn?: string;
  legalName?: string;
  /** 'society' | 'cooperative' | 'SACCO' */
  saccoType?: string;
  county?: string;
  district?: string;
  /** Percent per cycle, on a member's savings balance. */
  savingsInterestRatePct?: number;
  /** Recorded only when the group has actually decided to withhold a surplus. */
  surplusPolicy?: SurplusPolicy;
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
  shareClasses?: ShareClass[];
  maxSharesPerMeeting?: number;
  requiredGuarantors?: number;
  borrowMultiplier?: number;
  loanMinimum?: number;
  loanRates?: {
    oneMonth: number;
    twoMonths: number;
    threeMonths: number;
  };
  welfareCategoryCaps?: {
    medical: number;
    bereavement: number;
    other: number;
  };
  welfareMonthly: number;
  /** Only set for registered SACCOs. */
  sacco?: SaccoDetails;
  inviteCode: string;
  plan: 'free' | 'pro' | 'sacco';
  createdAt: string;
  adminName: string;
  adminPhone: string;
  logoUrl?: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  boxIdentifier: string;
  // The directory never carries these — location, pricing and money stay
  // inside each group's own signed-in ledger (see publicGroupSummary).
  location?: string;
  meetingDay?: string;
  sharePrice?: number;
  inviteCode: string;
  membersCount: number;
  boxCashBalance?: number;
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

export interface FundTransfer {
  id: string;
  timestamp: string;
  from: 'cash' | 'momo' | 'bank';
  to: 'cash' | 'momo' | 'bank';
  amount: number;
  actorName: string;
  note: string;
}

export interface AppNotification {
  id: string;
  createdAt: string;
  read: boolean;
  audience: 'officer' | 'member';
  kind: 'loan_request' | 'approval_code' | 'approval' | 'payout' | 'rejection' | 'welfare';
  title: string;
  body: string;
  memberNo?: string;
  recipientAccountId?: string;
  approvalId?: string;
  actionScreen?: ScreenId;
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
  /** Group MoMo float — money received via mobile money, not in the metal box. */
  momoBalance?: number;
  /** Bank account float — for groups that graduate to bank storage. */
  bankBalance?: number;
  /** Cash ↔ MoMo ↔ bank movement log for reconciliation. */
  fundTransfers?: FundTransfer[];
  loanFundBalance: number;
  welfareFundBalance: number;
  members: Member[];
  approvals: ApprovalItem[];
  notifications?: AppNotification[];
  fines: PendingFine[];
  welfareGrants: WelfareGrant[];
  products?: ShopProduct[];
  productSales?: ProductSale[];
  productExpenses?: ProductExpense[];
  recentMeetingsCount: number;
  lastBackupDate: string;
  snapshots: BackupSnapshot[];
  auditLog?: AuditEntry[];
  /** Members' resolutions approving each cycle's surplus, newest last. */
  surplusResolutions?: SurplusResolution[];
  /** Reserve / education / operations balances built up from withheld surplus. */
  saccoFunds?: SaccoFunds;
  /** Keys turned on the current cycle's share-out, if any. */
  shareOutApproval?: ShareOutApprovalRecord;
  /** The authority register: every change to who may move money, newest last. */
  officerChanges?: OfficerChangeRecord[];
  /** An authority change waiting for its second key. */
  pendingOfficerChange?: PendingOfficerChange;
  currentUser?: UserAccount;
  availableAccounts?: UserAccount[];
  activePreset?: string;
  /** True when the group was created offline and not yet confirmed by /api/state. */
  pendingSync?: boolean;
}
