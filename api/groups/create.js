export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, boxIdentifier, location, meetingDay, sharePrice,
    welfareMonthly, cycleDurationMonths, adminName, adminPhone,
    adminProvider, adminPin, plan,
  } = req.body || {};

  if (!name || !adminName || !adminPhone) {
    return res.status(400).json({ error: 'Group name, secretary/admin name, and phone are required' });
  }

  const cleanSlug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16);
  const groupId = `grp-${cleanSlug}-${Date.now().toString(36).slice(-4)}`;
  const prefix = String(name).replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'GRP';
  const inviteCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const boxId = boxIdentifier || `BOX-${prefix}-${Math.floor(100 + Math.random() * 900)}`;
  const price = Number(sharePrice) || 10000;
  const welfare = Number(welfareMonthly) || 5000;

  const adminAccount = {
    id: `acc-admin-${Date.now().toString(36)}`,
    memberNo: '01', name: adminName, phone: adminPhone, provider: adminProvider || 'MTN',
    role: 'secretary', roleTitle: 'General Secretary & Box Teller', zone: location || 'Headquarters',
    pin: adminPin || '1234',
    avatarInitials: String(adminName).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD',
    avatarBg: 'bg-emerald-700',
    permissions: { canLockBox: true, canApproveLoans: true, canDisburseWelfare: true, canRecordShares: true, canRequestLoan: true, canManageBackups: true },
  };

  const newGroupState = {
    groupId,
    groupProfile: {
      id: groupId, name, boxIdentifier: boxId, location: location || 'Uganda',
      meetingDay: meetingDay || 'Every Friday 4:00 PM', sharePrice: price,
      welfareMonthly: welfare, inviteCode, plan: plan || 'free',
      createdAt: new Date().toISOString(), adminName, adminPhone,
    },
    groupName: name, boxIdentifier: boxId, inviteCode,
    cycle: 1, cycleMonth: 1, totalCycleMonths: Number(cycleDurationMonths) || 10,
    boxCashBalance: price, loanFundBalance: 0, welfareFundBalance: welfare,
    lastBackupDate: new Date().toISOString(), recentMeetingsCount: 1,
    currentUser: adminAccount, availableAccounts: [adminAccount], activePreset: 'new_group',
    members: [{
      id: `m-${Date.now().toString(36)}`, no: '01', name: adminName,
      initials: adminAccount.avatarInitials, zone: location || 'Main Zone', phone: adminPhone,
      provider: adminProvider || 'MTN', attendance: '1/1', sharesCount: 1, sharesTotal: price,
      maxBorrowLimit: price * 3, loanBalance: 0, welfareBalance: welfare,
      isKeyholder: true, keyholderTitle: 'Executive Secretary',
      stamps: [{ week: 1, shares: 1, status: 'validated' }, { week: 2, shares: 0, status: 'next' }],
      ledger: [],
    }],
    approvals: [], fines: [], welfareGrants: [],
    snapshots: [{
      id: `snap-init-${Date.now()}`, timestamp: new Date().toISOString(),
      label: `Cycle 1 Genesis Initialization for ${name}`, membersCount: 1,
      boxCashBalance: price, loanFundBalance: 0, welfareFundBalance: welfare, data: '',
    }],
  };

  return res.status(200).json({
    success: true, groupId,
    group: { id: groupId, name, boxIdentifier: boxId, location: location || 'Uganda', meetingDay: meetingDay || 'Every Friday 4:00 PM', sharePrice: price, inviteCode, membersCount: 1, boxCashBalance: price, plan: plan || 'free' },
    state: newGroupState, account: adminAccount,
    message: `Savings group "${name}" initialized successfully with invite code ${inviteCode}`,
  });
}
