// Shared seed data for Vercel serverless API (stateless).
// Mirrors server.ts seeds. Writes are echoed back to the client;
// long-term persistence lives in the browser (localStorage).

export const SEED_ACCOUNTS = [
  {
    id: 'acc-sec',
    memberNo: 'SEC-01',
    name: 'Grace Akello',
    phone: '+256 772 445566',
    provider: 'MTN',
    role: 'secretary',
    roleTitle: 'General Secretary & Box Teller',
    zone: 'Kalerwe Central Office',
    pin: '1234',
    avatarInitials: 'GA',
    avatarBg: 'bg-emerald-700',
    nationalId: 'CM84029103KL9',
    permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: true, canRecordShares: true, canRequestLoan: true, canManageBackups: true },
  },
  {
    id: 'acc-kh1',
    memberId: 'm1',
    memberNo: '01',
    name: 'Sarah Nabukalu',
    phone: '+256 772 123456',
    provider: 'MTN',
    role: 'keyholder',
    roleTitle: 'Keyholder 1 (Padlock Key A)',
    zone: 'Kalerwe Market Zone B · Produce',
    pin: '1234',
    avatarInitials: 'SN',
    avatarBg: 'bg-amber-600',
    nationalId: 'CF79018492KA4',
    permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
  },
  {
    id: 'acc-tres',
    memberId: 'm4',
    memberNo: '04',
    name: 'Peter Ssemwogerere',
    phone: '+256 701 987654',
    provider: 'Airtel',
    role: 'treasurer',
    roleTitle: 'Group Treasurer & Keyholder 2 (Key B)',
    zone: 'Kalerwe Zone A · Hardware',
    pin: '1234',
    avatarInitials: 'PS',
    avatarBg: 'bg-blue-700',
    nationalId: 'CM75043128KB1',
    permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: true, canRecordShares: true, canRequestLoan: true, canManageBackups: true },
  },
  {
    id: 'acc-kh3',
    memberNo: '09',
    name: 'David Alupo',
    phone: '+256 782 998877',
    provider: 'MTN',
    role: 'keyholder',
    roleTitle: 'Keyholder 3 (Padlock Key C)',
    zone: 'Kalerwe Zone C · Elder Council',
    pin: '1234',
    avatarInitials: 'DA',
    avatarBg: 'bg-purple-700',
    nationalId: 'CM68019342KC9',
    permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
  },
  {
    id: 'acc-mem1',
    memberId: 'm2',
    memberNo: '02',
    name: 'Joseph Mukasa',
    phone: '+256 772 987654',
    provider: 'MTN',
    role: 'member',
    roleTitle: 'Active Member (Bodaboda Stage)',
    zone: 'Kalerwe Zone B · Agriculturalist',
    pin: '1234',
    avatarInitials: 'JM',
    avatarBg: 'bg-teal-700',
    nationalId: 'CM91054231KD3',
    permissions: { canLockBox: false, canApproveLoans: false, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
  },
  {
    id: 'acc-mem2',
    memberId: 'm7',
    memberNo: '07',
    name: 'Prossy Namutebi',
    phone: '+256 772 987111',
    provider: 'MTN',
    role: 'member',
    roleTitle: 'Active Member (Market Tailor)',
    zone: 'Kalerwe Zone B · Tailor',
    pin: '1234',
    avatarInitials: 'PN',
    avatarBg: 'bg-rose-700',
    nationalId: 'CF88034192KE7',
    permissions: { canLockBox: false, canApproveLoans: false, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
  },
  {
    id: 'acc-mem3',
    memberId: 'm12',
    memberNo: '12',
    name: 'Kato Moses',
    phone: '+256 782 334455',
    provider: 'MTN',
    role: 'member',
    roleTitle: 'Active Member (Produce Cashier)',
    zone: 'Kalerwe Market · Cashier',
    pin: '1234',
    avatarInitials: 'KM',
    avatarBg: 'bg-indigo-700',
    nationalId: 'CM86092143KF2',
    permissions: { canLockBox: false, canApproveLoans: false, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
  },
];

export function getBakwataSeed() {
  const now = new Date().toISOString();
  return {
    groupId: 'bakwata-01',
    inviteCode: 'BAK-4290',
    groupProfile: {
      id: 'bakwata-01',
      name: 'Bakwata Savings Group',
      boxIdentifier: 'BOX-KLA-042',
      location: 'Kalerwe Market, Kawempe Division, Kampala',
      meetingDay: 'Every Friday 4:00 PM',
      sharePrice: 10000,
      welfareMonthly: 5000,
      inviteCode: 'BAK-4290',
      plan: 'pro',
      createdAt: '2024-01-15T00:00:00.000Z',
      adminName: 'Grace Akello',
      adminPhone: '+256 772 445566',
    },
    groupName: 'Bakwata Savings Group',
    boxIdentifier: 'BOX-KLA-042',
    cycle: 4,
    cycleMonth: 7,
    totalCycleMonths: 10,
    boxCashBalance: 1420000,
    loanFundBalance: 9950000,
    welfareFundBalance: 790000,
    lastBackupDate: now,
    recentMeetingsCount: 28,
    currentUser: SEED_ACCOUNTS[0],
    availableAccounts: SEED_ACCOUNTS,
    activePreset: 'meeting_close',
    members: [
      {
        id: 'm1', no: '01', name: 'Sarah Nabukalu', initials: 'SN',
        zone: 'Kalerwe Zone A · Produce Vendor', phone: '0772-123-456', provider: 'MTN',
        attendance: '28/28', sharesCount: 45, sharesTotal: 450000, maxBorrowLimit: 1350000,
        loanBalance: 120000, welfareBalance: 35000, isKeyholder: true, keyholderTitle: 'Keyholder 1',
        stamps: [
          { week: 19, shares: 5, status: 'validated' }, { week: 20, shares: 5, status: 'validated' },
          { week: 21, shares: 4, status: 'validated' }, { week: 22, shares: 5, status: 'validated' },
          { week: 23, shares: 5, status: 'validated' }, { week: 24, shares: 5, status: 'validated' },
          { week: 25, shares: 4, status: 'validated' }, { week: 28, shares: 5, status: 'current' },
          { week: 29, shares: 0, status: 'next' }, { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [
          { id: 'led-1', meetingNo: 28, meetingCode: 'WK 28', title: 'Meeting #28: Regular Saving', subtitle: '5 Shares @ 10k + Welfare Enkoba', date: 'Today, 10:42 AM', badge: 'Box Cash Verified', amountText: '+UGX 52,000', isPositive: true, extraText: 'Shares: 50k · Welfare: 2k' },
          { id: 'led-2', meetingNo: 27, meetingCode: 'WK 27', title: 'Meeting #27: Loan Repayment', subtitle: 'Principal UGX 35k + Interest UGX 5k', date: '15 Feb 2025 · 11:15 AM', badge: 'Cash Receipt #27-04', amountText: '+UGX 40,000', isPositive: true, extraText: 'Principal: 35k · Int: 5k' },
        ],
      },
      {
        id: 'm2', no: '02', name: 'Joseph Mukasa', initials: 'JM',
        zone: 'Kalerwe Zone B · Bodaboda', phone: '0772-987-654', provider: 'MTN',
        attendance: '27/28', sharesCount: 28, sharesTotal: 280000, maxBorrowLimit: 840000,
        loanBalance: 60000, welfareBalance: 35000, isKeyholder: false,
        stamps: [
          { week: 19, shares: 3, status: 'validated' }, { week: 20, shares: 3, status: 'validated' },
          { week: 21, shares: 2, status: 'validated' }, { week: 22, shares: 3, status: 'validated' },
          { week: 23, shares: 3, status: 'validated' }, { week: 24, shares: 3, status: 'validated' },
          { week: 25, shares: 3, status: 'validated' }, { week: 28, shares: 3, status: 'current' },
          { week: 29, shares: 0, status: 'next' }, { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [
          { id: 'led-m1', meetingNo: 28, meetingCode: 'WK 28', title: 'Meeting #28: Regular Saving', subtitle: '3 Shares bought + Welfare', date: 'Today, 10:45 AM', badge: 'Cash Verified', amountText: '+UGX 32,000', isPositive: true, extraText: 'Shares: 30k · Welfare: 2k' },
        ],
      },
      {
        id: 'm4', no: '04', name: 'Peter Ssemwogerere', initials: 'PS',
        zone: 'Kalerwe Zone A · Retailer', phone: '0701-987-654', provider: 'Airtel',
        attendance: '27/28', sharesCount: 25, sharesTotal: 320000, maxBorrowLimit: 960000,
        loanBalance: 50000, welfareBalance: 35000, isKeyholder: true, keyholderTitle: 'Keyholder 2',
        stamps: [
          { week: 19, shares: 2, status: 'validated' }, { week: 20, shares: 3, status: 'validated' },
          { week: 21, shares: 2, status: 'validated' }, { week: 22, shares: 3, status: 'validated' },
          { week: 23, shares: 2, status: 'validated' }, { week: 24, shares: 3, status: 'validated' },
          { week: 25, shares: 3, status: 'validated' }, { week: 28, shares: 2, status: 'current' },
          { week: 29, shares: 0, status: 'next' }, { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
      {
        id: 'm7', no: '07', name: 'Prossy Namutebi', initials: 'PN',
        zone: 'Kalerwe Zone B · Tailor', phone: '0772-987-111', provider: 'MTN',
        attendance: '26/28', sharesCount: 35, sharesTotal: 350000, maxBorrowLimit: 1050000,
        loanBalance: 0, welfareBalance: 35000, isKeyholder: false,
        stamps: [
          { week: 19, shares: 4, status: 'validated' }, { week: 20, shares: 4, status: 'validated' },
          { week: 21, shares: 3, status: 'validated' }, { week: 22, shares: 4, status: 'validated' },
          { week: 23, shares: 4, status: 'validated' }, { week: 24, shares: 4, status: 'validated' },
          { week: 25, shares: 3, status: 'validated' }, { week: 28, shares: 4, status: 'current' },
          { week: 29, shares: 0, status: 'next' }, { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
      {
        id: 'm12', no: '12', name: 'Kato Moses', initials: 'KM',
        zone: 'Kalerwe Market · Cashier', phone: '0782-334-455', provider: 'MTN',
        attendance: '28/28', sharesCount: 40, sharesTotal: 400000, maxBorrowLimit: 1200000,
        loanBalance: 80000, welfareBalance: 35000, isKeyholder: false,
        stamps: [
          { week: 19, shares: 4, status: 'validated' }, { week: 20, shares: 4, status: 'validated' },
          { week: 21, shares: 4, status: 'validated' }, { week: 22, shares: 4, status: 'validated' },
          { week: 23, shares: 4, status: 'validated' }, { week: 24, shares: 4, status: 'validated' },
          { week: 25, shares: 4, status: 'validated' }, { week: 28, shares: 4, status: 'current' },
          { week: 29, shares: 0, status: 'next' }, { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
      {
        id: 'm14', no: '14', name: 'John Baptist Walusimbi', initials: 'JW',
        zone: 'Kalerwe Zone A · Carpenter', phone: '0702-556-677', provider: 'Airtel',
        attendance: '25/28', sharesCount: 20, sharesTotal: 200000, maxBorrowLimit: 600000,
        loanBalance: 0, welfareBalance: 31000, isKeyholder: false,
        stamps: [
          { week: 19, shares: 2, status: 'validated' }, { week: 20, shares: 2, status: 'validated' },
          { week: 21, shares: 2, status: 'validated' }, { week: 22, shares: 2, status: 'validated' },
          { week: 23, shares: 2, status: 'validated' }, { week: 24, shares: 2, status: 'validated' },
          { week: 25, shares: 2, status: 'validated' }, { week: 28, shares: 2, status: 'current' },
          { week: 29, shares: 0, status: 'next' }, { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
    ],
    approvals: [
      { id: 'app-1', type: 'vsla_loan', reqNumber: '#LN-2024-089', timeText: '12m ago', memberName: 'Joseph Mukasa', memberNo: '02', phone: '0772-123-456', provider: 'MTN', initiator: 'Initiated by Secretary (J. Mukasa)', amount: 600000, term: '3 months', serviceFee: 60000, status: 'pending', totalSavings: 280000, maxBorrowable: 840000 },
      { id: 'app-2', type: 'welfare_grant', reqNumber: '#WF-2024-012', timeText: '35m ago', memberName: 'Sarah Nabukalu', memberNo: '01', initiator: 'Initiated by Chairperson (S. Nabukalu)', amount: 150000, reason: 'Mulago Hospital Admission', status: 'pending', welfareAvailable: 790000, accountBalance: 35000 },
      { id: 'app-3', type: 'savings_withdrawal', reqNumber: '#WD-2024-004', timeText: '2h ago', memberName: 'Peter Ssemwogerere', memberNo: '04', initiator: 'Initiated by Treasurer (M. Kato)', amount: 100000, reason: 'Emergency School Fees Partial Withdrawal', status: 'pending', accountBalance: 320000, postBalance: 220000 },
    ],
    fines: [
      { id: 'fine-1', memberNo: '02', memberName: 'Joseph Mukasa', reason: 'Late Attendance (Arrived 10:45 AM)', amount: 2000, timeNote: 'Meeting #28 · 10:45 AM', meetingRef: 'Meeting #28', status: 'pending' },
      { id: 'fine-2', memberNo: '07', memberName: 'Prossy Namutebi', reason: 'Phone Rang in Opening Prayer #27', amount: 1000, timeNote: 'Meeting #27', meetingRef: 'Meeting #27', status: 'pending' },
    ],
    welfareGrants: [
      { id: 'grant-1', memberNo: '01', memberName: 'Sarah Nabukalu', reason: 'Mulago Hospital Admission · Inpatient Surgery', amount: 150000, paymentMethod: 'Disbursed via Cash Handover (Keyholder 1 witnessed)', date: '12 Oct 2024', minutesRef: 'Minutes ref #M-27', type: 'medical' },
      { id: 'grant-2', memberNo: '14', memberName: 'John Baptist Walusimbi', reason: 'Bereavement / Funeral Support (Mabugo)', amount: 200000, paymentMethod: 'Disbursed via MTN MoMo · Trans ID: 88941032', date: '18 Sep 2024', minutesRef: 'Minutes ref #M-24', type: 'bereavement' },
    ],
    snapshots: [
      { id: 'snap-001', timestamp: now, label: 'Pre-Meeting #28 System Checkpoint', membersCount: 6, boxCashBalance: 1420000, loanFundBalance: 9950000, welfareFundBalance: 790000, data: '' },
    ],
  };
}

export function getKibuliSeed() {
  const now = new Date().toISOString();
  const accounts = [
    { id: 'acc-kib-sec', memberNo: '01', name: 'Mama Amina Nansubuga', phone: '+256 701 556677', provider: 'Airtel', role: 'secretary', roleTitle: 'General Secretary & Teller', zone: 'Kibuli Central Mosque Zone', pin: '1234', avatarInitials: 'AN', avatarBg: 'bg-emerald-800', permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: true, canRecordShares: true, canRequestLoan: true, canManageBackups: true } },
    { id: 'acc-kib-tres', memberNo: '02', name: 'Hajjat Mariam Nakato', phone: '+256 772 334411', provider: 'MTN', role: 'treasurer', roleTitle: 'SACCO Treasurer & Key A', zone: 'Kibuli Hill Zone', pin: '1234', avatarInitials: 'MN', avatarBg: 'bg-amber-700', permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: true, canRecordShares: true, canRequestLoan: true, canManageBackups: true } },
    { id: 'acc-kib-mem1', memberNo: '03', name: 'Fatuma Namukasa', phone: '+256 782 112233', provider: 'MTN', role: 'member', roleTitle: 'Active Member (Dry Fish Vendor)', zone: 'Kibuli Market Stall 14', pin: '1234', avatarInitials: 'FN', avatarBg: 'bg-blue-800', permissions: { canLockBox: false, canApproveLoans: false, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false } },
  ];
  return {
    groupId: 'kibuli-01',
    groupName: 'Kibuli Women Traders SACCO',
    boxIdentifier: 'BOX-MAK-108',
    inviteCode: 'KIB-8821',
    cycle: 2, cycleMonth: 4, totalCycleMonths: 12,
    boxCashBalance: 2650000, loanFundBalance: 14800000, welfareFundBalance: 1320000,
    lastBackupDate: now, recentMeetingsCount: 16,
    currentUser: accounts[0], availableAccounts: accounts, activePreset: 'meeting_close',
    groupProfile: {
      id: 'kibuli-01', name: 'Kibuli Women Traders SACCO', boxIdentifier: 'BOX-MAK-108',
      location: 'Kibuli Central Market, Makindye Division, Kampala', meetingDay: 'Every Sunday 2:30 PM',
      sharePrice: 20000, welfareMonthly: 10000, inviteCode: 'KIB-8821', plan: 'sacco',
      createdAt: '2024-03-01T00:00:00.000Z', adminName: 'Mama Amina Nansubuga', adminPhone: '+256 701 556677',
    },
    members: [
      { id: 'k-m1', no: '01', name: 'Mama Amina Nansubuga', initials: 'AN', zone: 'Kibuli Central Mosque Zone', phone: '+256 701 556677', provider: 'Airtel', attendance: '16/16', sharesCount: 60, sharesTotal: 1200000, maxBorrowLimit: 3600000, loanBalance: 0, welfareBalance: 40000, isKeyholder: true, keyholderTitle: 'Executive Secretary', stamps: [{ week: 16, shares: 5, status: 'current' }], ledger: [] },
      { id: 'k-m2', no: '02', name: 'Hajjat Mariam Nakato', initials: 'MN', zone: 'Kibuli Hill Zone', phone: '+256 772 334411', provider: 'MTN', attendance: '16/16', sharesCount: 75, sharesTotal: 1500000, maxBorrowLimit: 4500000, loanBalance: 400000, welfareBalance: 40000, isKeyholder: true, keyholderTitle: 'Treasurer · Key A', stamps: [{ week: 16, shares: 5, status: 'current' }], ledger: [] },
      { id: 'k-m3', no: '03', name: 'Fatuma Namukasa', initials: 'FN', zone: 'Kibuli Market Stall 14', phone: '+256 782 112233', provider: 'MTN', attendance: '15/16', sharesCount: 42, sharesTotal: 840000, maxBorrowLimit: 2520000, loanBalance: 600000, welfareBalance: 40000, isKeyholder: false, stamps: [{ week: 16, shares: 3, status: 'current' }], ledger: [] },
    ],
    approvals: [
      { id: 'k-app-1', applicantName: 'Fatuma Namukasa', memberName: 'Fatuma Namukasa', memberNo: '03', type: 'loan', amount: 500000, purpose: 'Restocking fresh tilapia consignment from Jinja', guarantorsCount: 2, guarantorsTotal: 2, maxAllowed: 2520000, channel: 'momo', network: 'MTN', phone: '+256 782 112233', status: 'pending', requestedAt: '10 mins ago', interestRate: 10, durationMonths: 3 },
    ],
    fines: [], welfareGrants: [],
    snapshots: [{ id: 'k-snap-1', timestamp: now, label: 'Cycle 2 Checkpoint Meeting #16', membersCount: 3, boxCashBalance: 2650000, loanFundBalance: 14800000, welfareFundBalance: 1320000, data: '' }],
  };
}

export function getSeedForGroup(groupId) {
  if (groupId === 'kibuli-01') return getKibuliSeed();
  return getBakwataSeed();
}

export function toGroupSummary(s) {
  return {
    id: s.groupId,
    name: s.groupName || s.groupProfile?.name || 'Savings Group',
    boxIdentifier: s.boxIdentifier || s.groupProfile?.boxIdentifier || 'BOX-01',
    location: s.groupProfile?.location || 'Uganda',
    meetingDay: s.groupProfile?.meetingDay || 'Weekly',
    sharePrice: s.groupProfile?.sharePrice || 10000,
    inviteCode: s.inviteCode || s.groupProfile?.inviteCode || 'VSLA-001',
    membersCount: s.members?.length || 0,
    boxCashBalance: s.boxCashBalance || 0,
    plan: s.groupProfile?.plan || 'pro',
  };
}

export function resolveGroupId(req, fallback = 'bakwata-01') {
  const q = req.query || {};
  const b = req.body || {};
  const h = req.headers || {};
  return q.groupId || h['x-group-id'] || b.groupId || fallback;
}
