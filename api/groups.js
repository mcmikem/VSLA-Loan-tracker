/**
 * Merged groups endpoint (was 3 functions: groups.js, groups/create.js, groups/join.js).
 * Routing via ?action= so Vercel Hobby stays under the 12-function limit.
 * vercel.json rewrites keep old URLs working:
 *   GET  /api/groups                -> list
 *   POST /api/groups/create         -> ?action=create
 *   POST /api/groups/join           -> ?action=join
 *   GET  /api/groups/:id/invite     -> ?action=invite&id=:id
 */
import { getBakwataSeed, getKibuliSeed, toGroupSummary } from '../lib/_seed.js';
import {
  cors,
  createGroupSchema,
  joinGroupSchema,
  memberCap,
  planOf,
  rateLimit,
  validate,
} from '../lib/_lib.js';
import { loadGroup, saveGroup } from '../lib/_db.js';

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();

  // ---- LIST: GET /api/groups ----
  if (req.method === 'GET' && (!action || action === 'list')) {
    if (!cors(req, res, 'GET,OPTIONS')) return;
    const groups = [toGroupSummary(getBakwataSeed()), toGroupSummary(getKibuliSeed())];
    return res.status(200).json({ success: true, groups });
  }

  // ---- INVITE: GET /api/groups/:id/invite ----
  if (req.method === 'GET' && action === 'invite') {
    if (!cors(req, res, 'GET,OPTIONS')) return;
    const id = String(req.query?.id || '').trim();
    let group = null;
    let gid = null;
    for (const c of ['bakwata-01', 'kibuli-01']) {
      try {
        const g = await loadGroup(c);
        const codes = [g.inviteCode, g.groupProfile?.inviteCode].filter(Boolean).map(String);
        if (
          g.groupId === id ||
          g.groupProfile?.id === id ||
          codes.includes(id) ||
          codes.includes(id.toUpperCase())
        ) {
          group = g;
          gid = g.groupId || c;
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (!group) return res.status(404).json({ error: `No savings group found for "${id}".` });
    const inviteCode = group.inviteCode || group.groupProfile?.inviteCode || 'BAK-4290';
    const name = group.groupName || 'Bakwata Savings Group';
    const boxId = group.boxIdentifier || 'BOX-01';
    return res.status(200).json({
      success: true,
      groupId: gid,
      groupName: name,
      boxIdentifier: boxId,
      inviteCode,
      smsTemplate: `Habari! You've been invited to join ${name} (${boxId}) on the Bakwata VSLA Platform. Group Code: ${inviteCode}. Open the app to view your digital passbook and weekly records.`,
      whatsappMessage: `*Invitation to ${name} (${boxId})*\n\nHello! You have been registered for our Village Savings and Loan Association.\n\nUse Group Code: *${inviteCode}*\nAccess your digital passbook, loan approvals, and cash balances online or offline.`,
    });
  }

  // ---- CREATE: POST /api/groups/create ----
  if (req.method === 'POST' && action === 'create') {
    if (!cors(req, res, 'POST,OPTIONS')) return;
    if (!rateLimit(req, res, { limit: 10, windowMs: 60000 })) return;

    const input = validate(createGroupSchema, req.body || {}, res);
    if (!input) return;

    const {
      name, boxIdentifier, location, meetingDay, sharePrice,
      welfareMonthly, cycleDurationMonths, adminName, adminPhone,
      adminProvider, adminPin, plan,
    } = input;

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

  // ---- JOIN: POST /api/groups/join ----
  if (req.method === 'POST' && action === 'join') {
    if (!cors(req, res, 'POST,OPTIONS')) return;
    if (!rateLimit(req, res, { limit: 20, windowMs: 60000 })) return;

    const input = validate(joinGroupSchema, req.body || {}, res);
    if (!input) return;
    const { inviteCode, memberName, phone, provider, nationalId, pin } = input;

    const code = String(inviteCode).trim().toUpperCase();
    const knownIds = ['bakwata-01', 'kibuli-01'];

    let targetGroup = null;
    let foundGroupId = null;
    // Check durable store first (covers groups created via ?action=create
    // once DATABASE_URL is set), then built-in seeds.
    for (const gid of knownIds) {
      const seed = gid === 'kibuli-01' ? getKibuliSeed() : getBakwataSeed();
      const seedCodes = [seed.inviteCode, seed.groupProfile?.inviteCode]
        .filter(Boolean)
        .map((c) => String(c).toUpperCase());
      if (seedCodes.includes(code)) {
        foundGroupId = gid;
        try {
          targetGroup = JSON.parse(JSON.stringify(await loadGroup(gid)));
        } catch {
          targetGroup = JSON.parse(JSON.stringify(seed));
        }
        break;
      }
    }

    if (!targetGroup) {
      return res.status(404).json({ error: `No savings group found with invite code "${code}". Please ask your group secretary.` });
    }

    // Plan member caps.
    const cap = memberCap(targetGroup);
    if ((targetGroup.members?.length || 0) >= cap) {
      return res.status(403).json({
        error: `This group is on the ${planOf(targetGroup).toUpperCase()} plan (max ${cap} members). Ask the secretary to upgrade to Pro.`,
        plan: planOf(targetGroup),
        maxMembers: cap,
      });
    }

    const nextMemberNoNum = (targetGroup.members?.length || 0) + 1;
    const nextMemberNo = nextMemberNoNum < 10 ? `0${nextMemberNoNum}` : `${nextMemberNoNum}`;
    const memberId = `m-${Date.now().toString(36)}`;
    const initials = String(memberName).split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'MB';

    const newAccount = {
      id: `acc-${Date.now().toString(36)}`, memberId, memberNo: nextMemberNo,
      name: memberName, phone, provider: provider || 'MTN', role: 'member',
      roleTitle: `Member #${nextMemberNo}`, zone: 'General Member', pin: pin || '1234',
      avatarInitials: initials, avatarBg: 'bg-teal-700', nationalId: nationalId || '',
      permissions: { canLockBox: false, canApproveLoans: false, canDisburseWelfare: false, canRecordShares: false, canRequestLoan: true, canManageBackups: false },
    };

    targetGroup.members.push({
      id: memberId, no: nextMemberNo, name: memberName, initials, zone: 'Member',
      phone, provider: provider || 'MTN', attendance: '1/1', sharesCount: 0, sharesTotal: 0,
      maxBorrowLimit: (targetGroup.groupProfile?.sharePrice || 10000) * 3,
      loanBalance: 0, welfareBalance: 0, isKeyholder: false,
      stamps: [{ week: 1, shares: 0, status: 'next' }], ledger: [],
    });
    targetGroup.availableAccounts.push(newAccount);
    targetGroup.currentUser = newAccount;
    await saveGroup(foundGroupId, targetGroup);

    return res.status(200).json({
      success: true, groupId: foundGroupId, groupName: targetGroup.groupName,
      memberNo: nextMemberNo, account: newAccount, state: targetGroup,
      message: `Successfully joined ${targetGroup.groupName} as Member #${nextMemberNo}!`,
    });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Method not allowed. Use ?action=list|invite|create|join' });
}
