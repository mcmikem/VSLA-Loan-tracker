import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  MomoProviderError,
  collectionStatus,
  getMomoConfig,
  parseCollectionInput,
  requestCollection,
} from './lib/momo.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'vsla_database.json');
const GROUPS_DIR = path.join(DATA_DIR, 'groups');

// Ensure data and groups folders exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(GROUPS_DIR)) {
  fs.mkdirSync(GROUPS_DIR, { recursive: true });
}

// Seed User Accounts
const SEED_ACCOUNTS = [
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
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: true,
      canRecordShares: true,
      canRequestLoan: true,
      canManageBackups: true,
    },
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
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: true,
      canManageBackups: false,
    },
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
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: true,
      canRecordShares: true,
      canRequestLoan: true,
      canManageBackups: true,
    },
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
    permissions: {
      canLockBox: true,
      canApproveLoans: true,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: true,
      canManageBackups: false,
    },
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
    permissions: {
      canLockBox: false,
      canApproveLoans: false,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: true,
      canManageBackups: false,
    },
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
    permissions: {
      canLockBox: false,
      canApproveLoans: false,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: true,
      canManageBackups: false,
    },
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
    permissions: {
      canLockBox: false,
      canApproveLoans: false,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: true,
      canManageBackups: false,
    },
  },
];

// Initial seed data generator
function getInitialSeedData(): any {
  return {
    groupId: 'bakwata-01',
    inviteCode: 'BAK-4290',
    groupProfile: {
      id: 'bakwata-01',
      name: 'Bakwata Savings Group',
      boxIdentifier: 'BOX-KLA-042',
      location: 'Kalerwe Market, Kawempe',
      meetingDay: 'Every Friday 4:00 PM',
      sharePrice: 10000,
      inviteCode: 'BAK-4290',
      membersCount: 30,
      boxCashBalance: 1420000,
      plan: 'pro',
    },
    groupName: 'Bakwata Savings Group',
    boxIdentifier: 'BOX-KLA-042',
    cycle: 4,
    cycleMonth: 7,
    totalCycleMonths: 10,
    boxCashBalance: 1420000,
    loanFundBalance: 9950000,
    welfareFundBalance: 790000,
    lastBackupDate: new Date().toISOString(),
    recentMeetingsCount: 28,
    currentUser: SEED_ACCOUNTS[0],
    availableAccounts: SEED_ACCOUNTS,
    activePreset: 'meeting_close',
    products: [
      { id: 'p1', name: 'Maize Flour (Group Stock)', sellerType: 'group', costPrice: 8000, salePrice: 10000, stockQty: 40, soldQty: 6, unit: 'kg' },
      { id: 'p2', name: 'Dried Fish', sellerType: 'member', sellerName: 'Sarah Nabukalu', costPrice: 5000, salePrice: 7000, stockQty: 20, soldQty: 0, unit: 'pcs' },
    ],
    productSales: [],
    productExpenses: [],
    members: [
      {
        id: 'm1',
        no: '01',
        name: 'Sarah Nabukalu',
        initials: 'SN',
        zone: 'Kalerwe Zone A · Produce Vendor',
        phone: '0772-123-456',
        provider: 'MTN',
        attendance: '28/28',
        sharesCount: 45,
        sharesTotal: 450000,
        maxBorrowLimit: 1350000,
        loanBalance: 120000,
        welfareBalance: 35000,
        isKeyholder: true,
        keyholderTitle: 'Keyholder 1',
        stamps: [
          { week: 19, shares: 5, status: 'validated' },
          { week: 20, shares: 5, status: 'validated' },
          { week: 21, shares: 4, status: 'validated' },
          { week: 22, shares: 5, status: 'validated' },
          { week: 23, shares: 5, status: 'validated' },
          { week: 24, shares: 5, status: 'validated' },
          { week: 25, shares: 4, status: 'validated' },
          { week: 28, shares: 5, status: 'current' },
          { week: 29, shares: 0, status: 'next' },
          { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [
          {
            id: 'led-1',
            meetingNo: 28,
            meetingCode: 'WK 28',
            title: 'Meeting #28: Regular Saving',
            subtitle: '5 Shares @ 10k + Welfare Enkoba',
            date: 'Today, 10:42 AM',
            badge: 'Box Cash Verified',
            amountText: '+UGX 52,000',
            isPositive: true,
            extraText: 'Shares: 50k · Welfare: 2k',
          },
          {
            id: 'led-2',
            meetingNo: 27,
            meetingCode: 'WK 27',
            title: 'Meeting #27: Loan Repayment',
            subtitle: 'Principal UGX 35k + Interest UGX 5k',
            date: '15 Feb 2025 · 11:15 AM',
            badge: 'Cash Receipt #27-04',
            amountText: '+UGX 40,000',
            isPositive: true,
            extraText: 'Principal: 35k · Int: 5k',
          },
        ],
      },
      {
        id: 'm2',
        no: '02',
        name: 'Joseph Mukasa',
        initials: 'JM',
        zone: 'Kalerwe Zone B · Bodaboda',
        phone: '0772-987-654',
        provider: 'MTN',
        attendance: '27/28',
        sharesCount: 28,
        sharesTotal: 280000,
        maxBorrowLimit: 840000,
        loanBalance: 60000,
        welfareBalance: 35000,
        isKeyholder: false,
        stamps: [
          { week: 19, shares: 3, status: 'validated' },
          { week: 20, shares: 3, status: 'validated' },
          { week: 21, shares: 2, status: 'validated' },
          { week: 22, shares: 3, status: 'validated' },
          { week: 23, shares: 3, status: 'validated' },
          { week: 24, shares: 3, status: 'validated' },
          { week: 25, shares: 3, status: 'validated' },
          { week: 28, shares: 3, status: 'current' },
          { week: 29, shares: 0, status: 'next' },
          { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [
          {
            id: 'led-m1',
            meetingNo: 28,
            meetingCode: 'WK 28',
            title: 'Meeting #28: Regular Saving',
            subtitle: '3 Shares bought + Welfare',
            date: 'Today, 10:45 AM',
            badge: 'Cash Verified',
            amountText: '+UGX 32,000',
            isPositive: true,
            extraText: 'Shares: 30k · Welfare: 2k',
          },
        ],
      },
      {
        id: 'm4',
        no: '04',
        name: 'Peter Ssemwogerere',
        initials: 'PS',
        zone: 'Kalerwe Zone A · Retailer',
        phone: '0701-987-654',
        provider: 'Airtel',
        attendance: '27/28',
        sharesCount: 25,
        sharesTotal: 320000,
        maxBorrowLimit: 960000,
        loanBalance: 50000,
        welfareBalance: 35000,
        isKeyholder: true,
        keyholderTitle: 'Keyholder 2',
        stamps: [
          { week: 19, shares: 2, status: 'validated' },
          { week: 20, shares: 3, status: 'validated' },
          { week: 21, shares: 2, status: 'validated' },
          { week: 22, shares: 3, status: 'validated' },
          { week: 23, shares: 2, status: 'validated' },
          { week: 24, shares: 3, status: 'validated' },
          { week: 25, shares: 3, status: 'validated' },
          { week: 28, shares: 2, status: 'current' },
          { week: 29, shares: 0, status: 'next' },
          { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
      {
        id: 'm7',
        no: '07',
        name: 'Prossy Namutebi',
        initials: 'PN',
        zone: 'Kalerwe Zone B · Tailor',
        phone: '0772-987-111',
        provider: 'MTN',
        attendance: '26/28',
        sharesCount: 35,
        sharesTotal: 350000,
        maxBorrowLimit: 1050000,
        loanBalance: 0,
        welfareBalance: 35000,
        isKeyholder: false,
        stamps: [
          { week: 19, shares: 4, status: 'validated' },
          { week: 20, shares: 4, status: 'validated' },
          { week: 21, shares: 3, status: 'validated' },
          { week: 22, shares: 4, status: 'validated' },
          { week: 23, shares: 4, status: 'validated' },
          { week: 24, shares: 4, status: 'validated' },
          { week: 25, shares: 3, status: 'validated' },
          { week: 28, shares: 4, status: 'current' },
          { week: 29, shares: 0, status: 'next' },
          { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
      {
        id: 'm12',
        no: '12',
        name: 'Kato Moses',
        initials: 'KM',
        zone: 'Kalerwe Market · Cashier',
        phone: '0782-334-455',
        provider: 'MTN',
        attendance: '28/28',
        sharesCount: 40,
        sharesTotal: 400000,
        maxBorrowLimit: 1200000,
        loanBalance: 80000,
        welfareBalance: 35000,
        isKeyholder: false,
        stamps: [
          { week: 19, shares: 4, status: 'validated' },
          { week: 20, shares: 4, status: 'validated' },
          { week: 21, shares: 4, status: 'validated' },
          { week: 22, shares: 4, status: 'validated' },
          { week: 23, shares: 4, status: 'validated' },
          { week: 24, shares: 4, status: 'validated' },
          { week: 25, shares: 4, status: 'validated' },
          { week: 28, shares: 4, status: 'current' },
          { week: 29, shares: 0, status: 'next' },
          { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
      {
        id: 'm14',
        no: '14',
        name: 'John Baptist Walusimbi',
        initials: 'JW',
        zone: 'Kalerwe Zone A · Carpenter',
        phone: '0702-556-677',
        provider: 'Airtel',
        attendance: '25/28',
        sharesCount: 20,
        sharesTotal: 200000,
        maxBorrowLimit: 600000,
        loanBalance: 0,
        welfareBalance: 31000,
        isKeyholder: false,
        stamps: [
          { week: 19, shares: 2, status: 'validated' },
          { week: 20, shares: 2, status: 'validated' },
          { week: 21, shares: 2, status: 'validated' },
          { week: 22, shares: 2, status: 'validated' },
          { week: 23, shares: 2, status: 'validated' },
          { week: 24, shares: 2, status: 'validated' },
          { week: 25, shares: 2, status: 'validated' },
          { week: 28, shares: 2, status: 'current' },
          { week: 29, shares: 0, status: 'next' },
          { week: 30, shares: 0, status: 'close' },
        ],
        ledger: [],
      },
    ],
    approvals: [
      {
        id: 'app-1',
        type: 'vsla_loan',
        reqNumber: '#LN-2024-089',
        timeText: '12m ago',
        memberName: 'Joseph Mukasa',
        memberNo: '02',
        phone: '0772-123-456',
        provider: 'MTN',
        initiator: 'Initiated by Secretary (J. Mukasa)',
        amount: 600000,
        term: '3 months',
        serviceFee: 60000,
        status: 'pending',
        totalSavings: 280000,
        maxBorrowable: 840000,
      },
      {
        id: 'app-2',
        type: 'welfare_grant',
        reqNumber: '#WF-2024-012',
        timeText: '35m ago',
        memberName: 'Sarah Nabukalu',
        memberNo: '01',
        initiator: 'Initiated by Chairperson (S. Nabukalu)',
        amount: 150000,
        reason: 'Mulago Hospital Admission',
        status: 'pending',
        welfareAvailable: 790000,
        accountBalance: 35000,
      },
      {
        id: 'app-3',
        type: 'savings_withdrawal',
        reqNumber: '#WD-2024-004',
        timeText: '2h ago',
        memberName: 'Peter Ssemwogerere',
        memberNo: '04',
        initiator: 'Initiated by Treasurer (M. Kato)',
        amount: 100000,
        reason: 'Emergency School Fees Partial Withdrawal',
        status: 'pending',
        accountBalance: 320000,
        postBalance: 220000,
      },
    ],
    fines: [
      {
        id: 'fine-1',
        memberNo: '02',
        memberName: 'Joseph Mukasa',
        reason: 'Late Attendance (Arrived 10:45 AM)',
        amount: 2000,
        timeNote: 'Meeting #28 · 10:45 AM',
        meetingRef: 'Meeting #28',
        status: 'pending',
      },
      {
        id: 'fine-2',
        memberNo: '07',
        memberName: 'Prossy Namutebi',
        reason: 'Phone Rang in Opening Prayer #27',
        amount: 1000,
        timeNote: 'Meeting #27',
        meetingRef: 'Meeting #27',
        status: 'pending',
      },
    ],
    welfareGrants: [
      {
        id: 'grant-1',
        memberNo: '01',
        memberName: 'Sarah Nabukalu',
        reason: 'Mulago Hospital Admission · Inpatient Surgery',
        amount: 150000,
        paymentMethod: 'Disbursed via Cash Handover (Keyholder 1 witnessed)',
        date: '12 Oct 2024',
        minutesRef: 'Minutes ref #M-27',
        type: 'medical',
      },
      {
        id: 'grant-2',
        memberNo: '14',
        memberName: 'John Baptist Walusimbi',
        reason: 'Bereavement / Funeral Support (Mabugo)',
        amount: 200000,
        paymentMethod: 'Disbursed via MTN MoMo · Trans ID: 88941032',
        date: '18 Sep 2024',
        minutesRef: 'Minutes ref #M-24',
        type: 'bereavement',
      },
    ],
    snapshots: [
      {
        id: 'snap-001',
        timestamp: new Date().toISOString(),
        label: 'Pre-Meeting #28 System Checkpoint',
        membersCount: 6,
        boxCashBalance: 1420000,
        loanFundBalance: 9950000,
        welfareFundBalance: 790000,
        data: '',
      },
    ],
  };
}

// --- MULTI-TENANT SAAS GROUP ENGINE ---

function getGroupFilePath(groupId: string = 'bakwata-01'): string {
  const sanitized = groupId.replace(/[^a-zA-Z0-9_-]/g, '') || 'bakwata-01';
  return path.join(GROUPS_DIR, `${sanitized}.json`);
}

function resolveGroupId(req: express.Request): string {
  const fromQuery = req.query.groupId as string;
  const fromHeader = req.headers['x-group-id'] as string;
  const fromBody = req.body?.groupId as string;
  return fromQuery || fromHeader || fromBody || 'bakwata-01';
}

function ensureDefaultGroups() {
  // 1. Group 1: Bakwata Savings Group (Kalerwe Market)
  const bakwataPath = getGroupFilePath('bakwata-01');
  if (!fs.existsSync(bakwataPath)) {
    let seedData: any;
    if (fs.existsSync(DATA_FILE)) {
      try {
        seedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      } catch (err) {}
    }
    if (!seedData || !seedData.members) {
      seedData = getInitialSeedData();
    }
    seedData.groupId = 'bakwata-01';
    seedData.inviteCode = 'BAK-4290';
    seedData.groupProfile = {
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
    };
    fs.writeFileSync(bakwataPath, JSON.stringify(seedData, null, 2), 'utf8');
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(seedData, null, 2), 'utf8');
    }
  }

  // 2. Group 2: Kibuli Women Traders SACCO (Makindye Division) - Pre-seeded 2nd SaaS tenant
  const kibuliPath = getGroupFilePath('kibuli-01');
  if (!fs.existsSync(kibuliPath)) {
    const kibuliAccounts = [
      {
        id: 'acc-kib-sec',
        memberNo: '01',
        name: 'Mama Amina Nansubuga',
        phone: '+256 701 556677',
        provider: 'Airtel',
        role: 'secretary',
        roleTitle: 'General Secretary & Teller',
        zone: 'Kibuli Central Mosque Zone',
        pin: '1234',
        avatarInitials: 'AN',
        avatarBg: 'bg-emerald-800',
        permissions: {
          canLockBox: true,
          canApproveLoans: true,
          canDisburseWelfare: true,
          canRecordShares: true,
          canRequestLoan: true,
          canManageBackups: true,
        },
      },
      {
        id: 'acc-kib-tres',
        memberNo: '02',
        name: 'Hajjat Mariam Nakato',
        phone: '+256 772 334411',
        provider: 'MTN',
        role: 'treasurer',
        roleTitle: 'SACCO Treasurer & Key A',
        zone: 'Kibuli Hill Zone',
        pin: '1234',
        avatarInitials: 'MN',
        avatarBg: 'bg-amber-700',
        permissions: {
          canLockBox: true,
          canApproveLoans: true,
          canDisburseWelfare: true,
          canRecordShares: true,
          canRequestLoan: true,
          canManageBackups: true,
        },
      },
      {
        id: 'acc-kib-mem1',
        memberNo: '03',
        name: 'Fatuma Namukasa',
        phone: '+256 782 112233',
        provider: 'MTN',
        role: 'member',
        roleTitle: 'Active Member (Dry Fish Vendor)',
        zone: 'Kibuli Market Stall 14',
        pin: '1234',
        avatarInitials: 'FN',
        avatarBg: 'bg-blue-800',
        permissions: {
          canLockBox: false,
          canApproveLoans: false,
          canDisburseWelfare: false,
          canRecordShares: false,
          canRequestLoan: true,
          canManageBackups: false,
        },
      },
    ];

    const kibuliSeed = {
      groupId: 'kibuli-01',
      groupName: 'Kibuli Women Traders SACCO',
      boxIdentifier: 'BOX-MAK-108',
      inviteCode: 'KIB-8821',
      cycle: 2,
      cycleMonth: 4,
      totalCycleMonths: 12,
      boxCashBalance: 2650000,
      loanFundBalance: 14800000,
      welfareFundBalance: 1320000,
      lastBackupDate: new Date().toISOString(),
      recentMeetingsCount: 16,
      currentUser: kibuliAccounts[0],
      availableAccounts: kibuliAccounts,
      activePreset: 'meeting_close',
      groupProfile: {
        id: 'kibuli-01',
        name: 'Kibuli Women Traders SACCO',
        boxIdentifier: 'BOX-MAK-108',
        location: 'Kibuli Central Market, Makindye Division, Kampala',
        meetingDay: 'Every Sunday 2:30 PM',
        sharePrice: 20000,
        welfareMonthly: 10000,
        inviteCode: 'KIB-8821',
        plan: 'sacco',
        createdAt: '2024-03-01T00:00:00.000Z',
        adminName: 'Mama Amina Nansubuga',
        adminPhone: '+256 701 556677',
      },
      members: [
        {
          id: 'k-m1',
          no: '01',
          name: 'Mama Amina Nansubuga',
          initials: 'AN',
          zone: 'Kibuli Central Mosque Zone',
          phone: '+256 701 556677',
          provider: 'Airtel',
          attendance: '16/16',
          sharesCount: 60,
          sharesTotal: 1200000,
          maxBorrowLimit: 3600000,
          loanBalance: 0,
          welfareBalance: 40000,
          isKeyholder: true,
          keyholderTitle: 'Executive Secretary',
          stamps: [{ week: 16, shares: 5, status: 'current' }],
          ledger: [],
        },
        {
          id: 'k-m2',
          no: '02',
          name: 'Hajjat Mariam Nakato',
          initials: 'MN',
          zone: 'Kibuli Hill Zone',
          phone: '+256 772 334411',
          provider: 'MTN',
          attendance: '16/16',
          sharesCount: 75,
          sharesTotal: 1500000,
          maxBorrowLimit: 4500000,
          loanBalance: 400000,
          welfareBalance: 40000,
          isKeyholder: true,
          keyholderTitle: 'Treasurer · Key A',
          stamps: [{ week: 16, shares: 5, status: 'current' }],
          ledger: [],
        },
        {
          id: 'k-m3',
          no: '03',
          name: 'Fatuma Namukasa',
          initials: 'FN',
          zone: 'Kibuli Market Stall 14',
          phone: '+256 782 112233',
          provider: 'MTN',
          attendance: '15/16',
          sharesCount: 42,
          sharesTotal: 840000,
          maxBorrowLimit: 2520000,
          loanBalance: 600000,
          welfareBalance: 40000,
          isKeyholder: false,
          stamps: [{ week: 16, shares: 3, status: 'current' }],
          ledger: [],
        },
      ],
      approvals: [
        {
          id: 'k-app-1',
          applicantName: 'Fatuma Namukasa',
          memberNo: '03',
          type: 'loan',
          amount: 500000,
          purpose: 'Restocking fresh tilapia and catfish consignment from Jinja',
          guarantorsCount: 2,
          guarantorsTotal: 2,
          maxAllowed: 2520000,
          channel: 'momo',
          network: 'MTN',
          phone: '+256 782 112233',
          status: 'pending',
          requestedAt: '10 mins ago',
          interestRate: 10,
          durationMonths: 3,
        },
      ],
      fines: [],
      welfareGrants: [],
      snapshots: [
        {
          id: 'k-snap-1',
          timestamp: new Date().toISOString(),
          label: 'Cycle 2 Checkpoint Meeting #16',
          membersCount: 3,
          boxCashBalance: 2650000,
          loanFundBalance: 14800000,
          welfareFundBalance: 1320000,
          data: '',
        },
      ],
    };
    fs.writeFileSync(kibuliPath, JSON.stringify(kibuliSeed, null, 2), 'utf8');
  }
}

// Load state from file or seed
function readDatabase(groupId?: string) {
  ensureDefaultGroups();
  const targetId = groupId || 'bakwata-01';
  const filePath = getGroupFilePath(targetId);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Error reading group ${targetId} data:`, err);
  }

  // Fallback to bakwata-01
  const bakwataPath = getGroupFilePath('bakwata-01');
  if (fs.existsSync(bakwataPath)) {
    const raw = fs.readFileSync(bakwataPath, 'utf8');
    return JSON.parse(raw);
  }

  const seed = getInitialSeedData();
  writeDatabase(seed, 'bakwata-01');
  return seed;
}

// Write state to file
function writeDatabase(data: any, groupId?: string) {
  ensureDefaultGroups();
  const targetId = groupId || data.groupId || 'bakwata-01';
  data.groupId = targetId;
  const filePath = getGroupFilePath(targetId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    if (targetId === 'bakwata-01') {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
    return true;
  } catch (err) {
    console.error(`Error writing group ${targetId}:`, err);
    return false;
  }
}

function listAllGroups() {
  ensureDefaultGroups();
  const files = fs.readdirSync(GROUPS_DIR).filter((f) => f.endsWith('.json'));
  const groups: any[] = [];
  for (const f of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(GROUPS_DIR, f), 'utf8'));
      const id = content.groupId || f.replace('.json', '');
      groups.push({
        id,
        name: content.groupName || content.groupProfile?.name || 'Savings Group',
        boxIdentifier: content.boxIdentifier || content.groupProfile?.boxIdentifier || 'BOX-01',
        location: content.location || content.groupProfile?.location || 'Uganda',
        meetingDay: content.meetingDay || content.groupProfile?.meetingDay || 'Weekly',
        sharePrice: content.sharePrice || content.groupProfile?.sharePrice || 10000,
        inviteCode: content.inviteCode || content.groupProfile?.inviteCode || 'VSLA-001',
        membersCount: content.members?.length || 0,
        boxCashBalance: content.boxCashBalance || 0,
        plan: content.plan || content.groupProfile?.plan || 'pro',
      });
    } catch (e) {
      console.warn('Error reading group file:', f, e);
    }
  }
  return groups;
}

// --- API ROUTES ---

// 1. Health & Server Status
app.get('/api/health', (req, res) => {
  const groups = listAllGroups();
  res.json({
    status: 'ok',
    server: 'Bakwata VSLA Engine',
    timestamp: new Date().toISOString(),
    saasMode: 'multi-tenant',
    registeredGroupsCount: groups.length,
    groupsDirectory: GROUPS_DIR,
  });
});

// 1b. List All Registered VSLA Groups (SaaS Directory)
app.get('/api/groups', (req, res) => {
  const groups = listAllGroups();
  res.json({
    success: true,
    groups,
  });
});

// 1c. Create & Onboard a Brand New Savings Group (Self-Serve SaaS)
app.post('/api/groups/create', (req, res) => {
  const {
    name,
    boxIdentifier,
    location,
    meetingDay,
    sharePrice,
    welfareMonthly,
    cycleDurationMonths,
    adminName,
    adminPhone,
    adminProvider,
    adminPin,
    plan,
  } = req.body;

  if (!name || !adminName || !adminPhone) {
    return res.status(400).json({ error: 'Group name, secretary/admin name, and phone are required' });
  }

  const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16);
  const groupId = `grp-${cleanSlug}-${Date.now().toString(36).slice(-4)}`;
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GRP';
  const inviteCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const boxId = boxIdentifier || `BOX-${prefix}-${Math.floor(100 + Math.random() * 900)}`;

  const adminAccount = {
    id: `acc-admin-${Date.now().toString(36)}`,
    memberNo: '01',
    name: adminName,
    phone: adminPhone,
    provider: adminProvider || 'MTN',
    role: 'secretary',
    roleTitle: 'General Secretary & Box Teller',
    zone: location || 'Headquarters',
    pin: adminPin || '1234',
    avatarInitials: adminName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD',
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

  const initialMember = {
    id: `m-${Date.now().toString(36)}`,
    no: '01',
    name: adminName,
    initials: adminAccount.avatarInitials,
    zone: location || 'Main Zone',
    phone: adminPhone,
    provider: adminProvider || 'MTN',
    attendance: '1/1',
    sharesCount: 1,
    sharesTotal: Number(sharePrice) || 10000,
    maxBorrowLimit: (Number(sharePrice) || 10000) * 3,
    loanBalance: 0,
    welfareBalance: Number(welfareMonthly) || 5000,
    isKeyholder: true,
    keyholderTitle: 'Executive Secretary',
    stamps: [
      { week: 1, shares: 1, status: 'validated' },
      { week: 2, shares: 0, status: 'next' },
    ],
    ledger: [
      {
        id: `led-${Date.now()}`,
        meetingNo: 1,
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        type: 'share_purchase',
        amount: Number(sharePrice) || 10000,
        runningShares: 1,
        witness: 'System Founder Initializer',
        channel: 'cash',
      },
    ],
  };

  const groupProfile = {
    id: groupId,
    name,
    boxIdentifier: boxId,
    location: location || 'Uganda',
    meetingDay: meetingDay || 'Every Friday 4:00 PM',
    sharePrice: Number(sharePrice) || 10000,
    welfareMonthly: Number(welfareMonthly) || 5000,
    inviteCode,
    plan: plan || 'free',
    createdAt: new Date().toISOString(),
    adminName,
    adminPhone,
  };

  const newGroupState = {
    groupId,
    groupProfile,
    groupName: name,
    boxIdentifier: boxId,
    inviteCode,
    cycle: 1,
    cycleMonth: 1,
    totalCycleMonths: Number(cycleDurationMonths) || 10,
    boxCashBalance: Number(sharePrice) || 10000,
    loanFundBalance: 0,
    welfareFundBalance: Number(welfareMonthly) || 5000,
    lastBackupDate: new Date().toISOString(),
    recentMeetingsCount: 1,
    currentUser: adminAccount,
    availableAccounts: [adminAccount],
    activePreset: 'new_group',
    members: [initialMember],
    approvals: [],
    fines: [],
    welfareGrants: [],
    snapshots: [
      {
        id: `snap-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Cycle 1 Genesis Initialization for ${name}`,
        membersCount: 1,
        boxCashBalance: Number(sharePrice) || 10000,
        loanFundBalance: 0,
        welfareFundBalance: Number(welfareMonthly) || 5000,
        data: '',
      },
    ],
  };

  writeDatabase(newGroupState, groupId);

  const groupSummary = {
    id: groupId,
    name,
    boxIdentifier: boxId,
    location: groupProfile.location,
    meetingDay: groupProfile.meetingDay,
    sharePrice: groupProfile.sharePrice,
    inviteCode,
    membersCount: 1,
    boxCashBalance: newGroupState.boxCashBalance,
    plan: groupProfile.plan,
  };

  res.json({
    success: true,
    groupId,
    group: groupSummary,
    state: newGroupState,
    account: adminAccount,
    message: `Savings group "${name}" initialized successfully with invite code ${inviteCode}`,
  });
});

// 1d. Join an Existing Savings Group via Invite Code
app.post('/api/groups/join', (req, res) => {
  const { inviteCode, memberName, phone, provider, nationalId, pin } = req.body;
  if (!inviteCode || !memberName || !phone) {
    return res.status(400).json({ error: 'Invite code, member name, and phone are required' });
  }

  ensureDefaultGroups();
  const code = String(inviteCode).trim().toUpperCase();
  const files = fs.readdirSync(GROUPS_DIR).filter((f) => f.endsWith('.json'));

  let foundGroupId: string | null = null;
  let targetGroup: any = null;

  for (const f of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(GROUPS_DIR, f), 'utf8'));
      if (
        (content.inviteCode && content.inviteCode.toUpperCase() === code) ||
        (content.groupProfile?.inviteCode && content.groupProfile.inviteCode.toUpperCase() === code)
      ) {
        foundGroupId = content.groupId || f.replace('.json', '');
        targetGroup = content;
        break;
      }
    } catch (e) {}
  }

  if (!foundGroupId || !targetGroup) {
    return res.status(404).json({
      error: `No savings group found with invite code "${code}". Please ask your group secretary.`,
    });
  }

  const nextMemberNoNum = (targetGroup.members?.length || 0) + 1;
  const nextMemberNo = nextMemberNoNum < 10 ? `0${nextMemberNoNum}` : `${nextMemberNoNum}`;
  const memberId = `m-${Date.now().toString(36)}`;
  const initials = memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'MB';

  const newAccount = {
    id: `acc-${Date.now().toString(36)}`,
    memberId,
    memberNo: nextMemberNo,
    name: memberName,
    phone,
    provider: provider || 'MTN',
    role: 'member',
    roleTitle: `Member #${nextMemberNo}`,
    zone: targetGroup.location || 'General Member',
    pin: pin || '1234',
    avatarInitials: initials,
    avatarBg: 'bg-teal-700',
    nationalId: nationalId || '',
    permissions: {
      canLockBox: false,
      canApproveLoans: false,
      canDisburseWelfare: false,
      canRecordShares: false,
      canRequestLoan: true,
      canManageBackups: false,
    },
  };

  const newMember = {
    id: memberId,
    no: nextMemberNo,
    name: memberName,
    initials,
    zone: targetGroup.location || 'Member',
    phone,
    provider: provider || 'MTN',
    attendance: '1/1',
    sharesCount: 0,
    sharesTotal: 0,
    maxBorrowLimit: (targetGroup.groupProfile?.sharePrice || targetGroup.sharePrice || 10000) * 3,
    loanBalance: 0,
    welfareBalance: 0,
    isKeyholder: false,
    stamps: [{ week: 1, shares: 0, status: 'next' }],
    ledger: [],
  };

  if (!targetGroup.members) targetGroup.members = [];
  targetGroup.members.push(newMember);

  if (!targetGroup.availableAccounts) targetGroup.availableAccounts = [];
  targetGroup.availableAccounts.push(newAccount);
  targetGroup.currentUser = newAccount;

  writeDatabase(targetGroup, foundGroupId);

  res.json({
    success: true,
    groupId: foundGroupId,
    groupName: targetGroup.groupName,
    memberNo: nextMemberNo,
    account: newAccount,
    state: targetGroup,
    message: `Successfully joined ${targetGroup.groupName} as Member #${nextMemberNo}!`,
  });
});

// 1e. Get Shareable Member Invite Payload & Templates
app.get('/api/groups/:groupId/invite', (req, res) => {
  const groupId = req.params.groupId || resolveGroupId(req);
  const group = readDatabase(groupId);
  const inviteCode = group.inviteCode || group.groupProfile?.inviteCode || 'BAK-4290';
  const name = group.groupName || 'Bakwata Savings Group';
  const boxId = group.boxIdentifier || 'BOX-01';

  res.json({
    success: true,
    groupId,
    groupName: name,
    boxIdentifier: boxId,
    inviteCode,
    smsTemplate: `Habari! You've been invited to join ${name} (${boxId}) on the Bakwata VSLA Platform. Group Code: ${inviteCode}. Open the app to view your digital passbook and weekly records.`,
    whatsappMessage: `*Invitation to ${name} (${boxId})*\n\nHello! You have been registered for our Village Savings and Loan Association.\n\nUse Group Code: *${inviteCode}*\nAccess your digital passbook, loan approvals, and cash balances online or offline.`,
  });
});

// 2. Fetch Complete State for Specified Group
app.get('/api/state', (req, res) => {
  const groupId = resolveGroupId(req);
  const data = readDatabase(groupId);
  res.json({ success: true, groupId, state: data, ...data });
});

// 3. Save/Update Complete State for Specified Group
app.post('/api/state', (req, res) => {
  const groupId = resolveGroupId(req);
  const payload = req.body;
  const newState = payload.state || payload;
  if (!newState || typeof newState !== 'object') {
    return res.status(400).json({ error: 'Invalid state object' });
  }

  newState.groupId = groupId;
  newState.lastBackupDate = new Date().toISOString();
  const success = writeDatabase(newState, groupId);
  if (success) {
    res.json({ success: true, groupId, state: newState });
  } else {
    res.status(500).json({ error: 'Failed to write to database storage' });
  }
});

// 3b. User Accounts & Session Switching for Specified Group
app.get('/api/accounts', (req, res) => {
  const groupId = resolveGroupId(req);
  const data = readDatabase(groupId);
  res.json({
    success: true,
    groupId,
    currentUser: data.currentUser || data.availableAccounts?.[0] || SEED_ACCOUNTS[0],
    accounts: data.availableAccounts || SEED_ACCOUNTS,
  });
});

app.post('/api/accounts/switch', (req, res) => {
  const groupId = resolveGroupId(req);
  const { accountId } = req.body;
  const current = readDatabase(groupId);

  const pool = current.availableAccounts || SEED_ACCOUNTS;
  const target = pool.find((a: any) => a.id === accountId);
  if (!target) {
    return res.status(404).json({ error: 'Account not found in group' });
  }

  current.currentUser = target;
  writeDatabase(current, groupId);

  res.json({
    success: true,
    groupId,
    currentUser: target,
    message: `Active session switched to ${target.name} (${target.roleTitle})`,
  });
});

// --- PIN + session auth (mirrors api/_auth.js; local-dev file store) ---
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessionSecret = () => process.env.SESSION_SECRET || 'dev-only-insecure-secret';
const authEnforced = () => !!process.env.SESSION_SECRET;

function verifyPinLocal(pin: string, stored: string): boolean {
  try {
    if (stored && stored.startsWith('hash:')) {
      const [, salt, expected] = stored.split(':');
      const actual = crypto.scryptSync(String(pin), salt, 32).toString('hex');
      const a = Buffer.from(actual, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    const a = Buffer.from(String(pin));
    const b = Buffer.from(String(stored || ''));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function hashPinLocal(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `hash:${salt}:${hash}`;
}

function issueSessionLocal(payload: Record<string, any>): string {
  const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'VSLA' });
  const body = b64({ ...payload, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS });
  const sig = crypto.createHmac('sha256', sessionSecret()).update(`${header}.${body}`).digest('hex');
  return `${header}.${body}.${sig}`;
}

function readSessionLocal(req: express.Request): any | null {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(`${header}.${body}`).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Returns true when the request may proceed (sends 401 otherwise). */
function requireSecretaryLocal(req: express.Request, res: express.Response): boolean {
  if (!authEnforced()) return true; // open-dev mode for pilots
  const session = readSessionLocal(req);
  const rank: Record<string, number> = { member: 1, keyholder: 2, chairperson: 3, treasurer: 3, secretary: 4 };
  if (!session || (rank[session.role] || 0) < 3) {
    res.status(session ? 403 : 401).json({ error: 'Sign-in required (secretary role or above).' });
    return false;
  }
  return true;
}

// 3b-ii. PIN login — verifies account PIN, migrates legacy PINs to scrypt hash
app.post('/api/auth/login', (req, res) => {
  const groupId = resolveGroupId(req);
  const { accountId, pin } = req.body || {};
  if (!accountId || !/^\d{4,8}$/.test(String(pin || ''))) {
    return res.status(400).json({ error: 'Account and 4–8 digit PIN are required.' });
  }
  const current = readDatabase(groupId);
  const pool = current.availableAccounts || SEED_ACCOUNTS;
  const account = pool.find((a: any) => a.id === accountId);
  if (!account || !verifyPinLocal(String(pin), account.pin)) {
    return res.status(401).json({ error: 'Wrong account or PIN.' });
  }
  if (!String(account.pin || '').startsWith('hash:')) {
    account.pin = hashPinLocal(String(pin));
    writeDatabase(current, groupId);
  }
  const token = issueSessionLocal({ sub: account.id, groupId, role: account.role, name: account.name });
  const { pin: _omit, ...safeAccount } = account;
  res.json({ success: true, token, expiresInHours: 24, account: safeAccount });
});

// 3b-iii. Public status probe — login gate + storage honesty for the app shell
app.get('/api/auth/status', (req, res) => {
  res.json({
    success: true,
    authEnforced: authEnforced(),
    storage: { driver: 'file', durable: true, shared: false },
  });
});

// 3c. Switch Test Scenario Presets for Specified Group (gated: destructive)
app.post('/api/seed/preset', (req, res) => {
  if (!requireSecretaryLocal(req, res)) return;
  const groupId = resolveGroupId(req);
  const { presetId } = req.body;
  const current = readDatabase(groupId);

  if (presetId === 'meeting_close') {
    current.boxCashBalance = 1420000;
    current.loanFundBalance = 9950000;
    current.welfareFundBalance = 790000;
    current.recentMeetingsCount = 28;
    current.activePreset = 'meeting_close';
    if (current.availableAccounts?.[0]) {
      current.currentUser = current.availableAccounts[0];
    }
  } else if (presetId === 'active_loans') {
    current.boxCashBalance = 850000;
    current.loanFundBalance = 8400000;
    current.welfareFundBalance = 650000;
    current.recentMeetingsCount = 28;
    current.activePreset = 'active_loans';
    const borrower = current.availableAccounts?.find((a: any) => a.role === 'member') || current.availableAccounts?.[1];
    if (borrower) current.currentUser = borrower;
  } else if (presetId === 'share_out') {
    current.boxCashBalance = 3450000;
    current.loanFundBalance = 12500000;
    current.welfareFundBalance = 1100000;
    current.cycleMonth = current.totalCycleMonths || 10;
    current.recentMeetingsCount = 30;
    current.activePreset = 'share_out';
  } else {
    return res.status(400).json({ error: 'Unknown preset: ' + presetId });
  }

  writeDatabase(current, groupId);
  res.json({ success: true, preset: presetId, state: current });
});

// 4. Download / Fetch Complete Backup Payload
app.get('/api/backup', (req, res) => {
  const groupId = resolveGroupId(req);
  const currentData = readDatabase(groupId);
  const backupPayload = {
    schemaVersion: '2.0-VSLA-OFFLINE',
    app: 'Bakwata Village Savings and Loan Association Digital Passbook',
    groupId,
    groupName: currentData.groupName || 'Bakwata Savings Group',
    boxIdentifier: currentData.boxIdentifier || 'BOX-KLA-042',
    exportedAt: new Date().toISOString(),
    recordCounts: {
      members: currentData.members?.length || 0,
      approvals: currentData.approvals?.length || 0,
      fines: currentData.fines?.length || 0,
      welfareGrants: currentData.welfareGrants?.length || 0,
    },
    checksum: `VSLA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    data: currentData,
  };

  if (req.query.download === 'true') {
    const filename = `${groupId}_vsla_backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
  }

  res.json(backupPayload);
});

// 5. Restore System from Backup File or JSON Payload
app.post('/api/backup/restore', (req, res) => {
  const groupId = resolveGroupId(req);
  try {
    const payload = req.body;
    const restoredData = payload.data || payload;

    if (!restoredData.members || !Array.isArray(restoredData.members)) {
      return res.status(400).json({
        error: 'Invalid backup structure: missing members array',
      });
    }

    // Auto-create snapshot of previous state before overwriting
    const previous = readDatabase(groupId);
    if (previous) {
      if (!restoredData.snapshots) restoredData.snapshots = [];
      restoredData.snapshots.unshift({
        id: `snap-auto-restore-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Auto-Backup before Restore on ${new Date().toLocaleTimeString()}`,
        membersCount: previous.members?.length || 0,
        boxCashBalance: previous.boxCashBalance || 0,
        loanFundBalance: previous.loanFundBalance || 0,
        welfareFundBalance: previous.welfareFundBalance || 0,
        data: JSON.stringify(previous),
      });
    }

    restoredData.groupId = groupId;
    restoredData.lastBackupDate = new Date().toISOString();
    writeDatabase(restoredData, groupId);

    res.json({
      success: true,
      groupId,
      restoredAt: new Date().toISOString(),
      stats: {
        members: restoredData.members.length,
        boxCash: restoredData.boxCashBalance,
        approvals: restoredData.approvals?.length || 0,
      },
      state: restoredData,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
  }
});

// 6. Reset to Clean Default Baseline (gated: destructive)
app.post('/api/backup/reset', (req, res) => {
  if (!requireSecretaryLocal(req, res)) return;
  const groupId = resolveGroupId(req);
  const seed = getInitialSeedData();
  seed.groupId = groupId;
  writeDatabase(seed, groupId);
  res.json({ success: true, groupId, message: 'Database reset to baseline state', state: seed });
});

// 7. Create Point-in-Time Snapshot
app.post('/api/backup/snapshot', (req, res) => {
  const groupId = resolveGroupId(req);
  const { label } = req.body;
  const current = readDatabase(groupId);
  if (!current.snapshots) current.snapshots = [];

  const snapshot = {
    id: `snap-${Date.now()}`,
    timestamp: new Date().toISOString(),
    label: label || `Manual Checkpoint: ${new Date().toLocaleTimeString()}`,
    membersCount: current.members?.length || 0,
    boxCashBalance: current.boxCashBalance || 0,
    loanFundBalance: current.loanFundBalance || 0,
    welfareFundBalance: current.welfareFundBalance || 0,
    data: JSON.stringify(current),
  };

  current.snapshots.unshift(snapshot);
  writeDatabase(current, groupId);

  res.json({ success: true, groupId, snapshot, snapshots: current.snapshots });
});

// 8. Mobile Money collection — MTN MoMo + Airtel Money.
// Live requests are provider-backed and remain pending until the status
// endpoint confirms completion. Sandbox remains available when MOMO_LIVE=0.
app.get('/api/momo/config', (req, res) => {
  const config = getMomoConfig();
  res.json({
    success: true,
    mode: config.mode,
    mtnConfigured: config.mtnConfigured,
    airtelConfigured: config.airtelConfigured,
    mtnEnvironment: config.mtnEnvironment,
    airtelEnvironment: config.airtelEnvironment,
    hint: config.mode === 'live'
      ? 'Live MoMo collections enabled.'
      : 'Sandbox simulation — add both provider credentials and set MOMO_LIVE=1 to move real money.',
  });
});

app.post('/api/momo/push', async (req, res) => {
  if (!requireSecretaryLocal(req, res)) return;
  try {
    const input = parseCollectionInput(req.body || {});
    const result = await requestCollection(input);
    res.status(result.mode === 'live' ? 202 : 200).json({
      success: true,
      ...result,
      network: input.network,
      phone: input.phone,
      amount: input.amount,
      memberName: input.memberName,
      purpose: input.purpose,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof MomoProviderError) return res.status(error.status || 502).json({ success: false, error: error.message });
    console.error('MoMo provider error:', error?.message || error);
    return res.status(502).json({ success: false, error: 'Mobile-money provider error. No money was taken.' });
  }
});

app.get('/api/momo/status', async (req, res) => {
  if (!requireSecretaryLocal(req, res)) return;
  try {
    const network = String(req.query.network || '');
    const transactionId = String(req.query.transactionId || '');
    const result = await collectionStatus(network, transactionId);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof MomoProviderError) return res.status(error.status || 502).json({ success: false, error: error.message });
    console.error('MoMo status error:', error?.message || error);
    return res.status(502).json({ success: false, error: 'Mobile-money provider error.' });
  }
});

// 9. Meeting Close & Cash Reconciliation Finalize
app.post('/api/meetings/reconcile', (req, res) => {
  const groupId = resolveGroupId(req);
  const { meetingNo, countedTotal, difference, minutesText, cashierName } = req.body;
  const current = readDatabase(groupId);

  current.boxCashBalance = countedTotal;
  current.recentMeetingsCount = (current.recentMeetingsCount || 27) + 1;

  writeDatabase(current, groupId);

  res.json({
    success: true,
    groupId,
    meetingNo: meetingNo || current.recentMeetingsCount,
    boxCashBalance: current.boxCashBalance,
    reconciledAt: new Date().toISOString(),
  });
});

// --- VITE & STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bakwata VSLA Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
