/**
 * Merged groups endpoint (was 3 functions: groups.js, groups/create.js, groups/join.js).
 * Routing via ?action= so Vercel Hobby stays under the 12-function limit.
 * vercel.json rewrites keep old URLs working:
 *   GET  /api/groups                -> list
 *   POST /api/groups/create         -> ?action=create
 *   POST /api/groups/join           -> ?action=join
 *   GET  /api/groups/:id/invite     -> ?action=invite&id=:id
 *   POST /api/groups/plan           -> ?action=plan (x-admin-key required)
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
import { requireRole } from '../lib/_auth.js';

/**
 * Directory summaries carry NO money, NO location, NO pricing — just enough
 * to pick a group you belong to. Full ledgers always require a same-group
 * session (see api/state.js).
 */
function publicGroupSummary(s) {
  const full = toGroupSummary(s);
  return {
    id: full.id,
    name: full.name,
    boxIdentifier: full.boxIdentifier,
    inviteCode: full.inviteCode,
    membersCount: full.membersCount,
    plan: full.plan,
  };
}
import { loadGroup, saveGroup } from '../lib/_db.js';

/** IDs of groups created via ?action=create (seeds are implicit). */
async function groupRegistry() {
  try {
    const r = await loadGroup('__registry');
    if (r && Array.isArray(r.ids)) return r;
  } catch {
    /* fresh store */
  }
  return { ids: [] };
}

async function registerGroup(groupId) {
  try {
    const reg = await groupRegistry();
    if (!reg.ids.includes(groupId)) {
      reg.ids.push(groupId);
      await saveGroup('__registry', reg);
    }
  } catch (err) {
    console.warn('group registry write failed:', err);
  }
}

/** Persist a freshly created group so list + join find it. Never throws. */
async function persistCreatedGroup(groupId, state) {
  try {
    await saveGroup(groupId, state);
    await registerGroup(groupId);
  } catch (err) {
    console.warn('created-group persist failed (client holds the copy):', err);
  }
  return state;
}

/** Find a group by invite code across seeds + created groups. */
async function findGroupByCode(code) {
  const upper = String(code).trim().toUpperCase();
  const candidates = ['bakwata-01', 'kibuli-01', ...(await groupRegistry()).ids];
  for (const gid of new Set(candidates)) {
    let g = null;
    try {
      g = await loadGroup(gid);
    } catch {
      continue;
    }
    if (!g || typeof g !== 'object') continue;
    const codes = [g.inviteCode, g.groupProfile?.inviteCode]
      .filter(Boolean)
      .map((c) => String(c).toUpperCase());
    if (codes.includes(upper)) return { group: JSON.parse(JSON.stringify(g)), groupId: g.groupId || gid };
  }
  return null;
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();

  // ---- LIST: GET /api/groups (signed-in users only, once enforced) ----
  if (req.method === 'GET' && (!action || action === 'list')) {
    if (!cors(req, res, 'GET,OPTIONS')) return;
    const session = requireRole(req, res, 'member');
    if (session === undefined) return;
    const groups = [publicGroupSummary(getBakwataSeed()), publicGroupSummary(getKibuliSeed())];
    const seen = new Set(['bakwata-01', 'kibuli-01']);
    for (const gid of (await groupRegistry()).ids) {
      if (seen.has(gid)) continue;
      seen.add(gid);
      try {
        groups.push(publicGroupSummary(await loadGroup(gid)));
      } catch {
        /* dropped group file — skip */
      }
    }
    return res.status(200).json({ success: true, groups });
  }

  // ---- INVITE: GET /api/groups/:id/invite ----
  if (req.method === 'GET' && action === 'invite') {
    if (!cors(req, res, 'GET,OPTIONS')) return;
    const id = String(req.query?.id || '').trim();
    const found = await findGroupByCode(id);
    // Also accept a raw group id (secretary sharing from the directory).
    let group = found?.group || null;
    let gid = found?.groupId || null;
    if (!group) {
      try {
        const g = await loadGroup(id);
        if (g && (g.groupId === id || g.groupProfile?.id === id)) {
          group = g;
          gid = g.groupId || id;
        }
      } catch {
        /* not found below */
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
      // Zero-start: no fabricated money or meetings — the first real Friday records them.
      boxCashBalance: 0, loanFundBalance: 0, welfareFundBalance: 0,
      lastBackupDate: new Date().toISOString(), recentMeetingsCount: 0,
      currentUser: adminAccount, availableAccounts: [adminAccount], activePreset: 'new_group',
      members: [{
        id: `m-${Date.now().toString(36)}`, no: '01', name: adminName,
        initials: adminAccount.avatarInitials, zone: location || 'Main Zone', phone: adminPhone,
        provider: adminProvider || 'MTN', attendance: '0/0', sharesCount: 0, sharesTotal: 0,
        maxBorrowLimit: 0, loanBalance: 0, welfareBalance: 0,
        isKeyholder: true, keyholderTitle: 'Executive Secretary',
        stamps: [{ week: 1, shares: 0, status: 'next' }, { week: 2, shares: 0, status: 'next' }],
        ledger: [],
      }],
      approvals: [], fines: [], welfareGrants: [],
      snapshots: [{
        id: `snap-init-${Date.now()}`, timestamp: new Date().toISOString(),
        label: `Registered ${name} — awaiting first meeting`, membersCount: 1,
        boxCashBalance: 0, loanFundBalance: 0, welfareFundBalance: 0, data: '',
      }],
    };

    return res.status(200).json({
      success: true, groupId,
      group: { id: groupId, name, boxIdentifier: boxId, location: location || 'Uganda', meetingDay: meetingDay || 'Every Friday 4:00 PM', sharePrice: price, inviteCode, membersCount: 1, boxCashBalance: 0, plan: plan || 'free' },
      state: await persistCreatedGroup(groupId, newGroupState), account: adminAccount,
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

    const found = await findGroupByCode(code);
    if (!found) {
      return res.status(404).json({ error: `No savings group found with invite code "${code}". Please ask your group secretary.` });
    }
    const targetGroup = found.group;
    const foundGroupId = found.groupId;

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

  // ---- PLAN: POST /api/groups/plan (admin only) ----
  // Manual sales flow: group pays via MoMo to the sales number, admin verifies
  // the payment and activates the plan with the ADMIN_KEY. The app never
  // accepts plan upgrades from group devices (see api/state.js).
  if (req.method === 'POST' && action === 'plan') {
    if (!cors(req, res, 'POST,OPTIONS')) return;
    if (!rateLimit(req, res, { limit: 20, windowMs: 60000 })) return;
    const key = req.headers?.['x-admin-key'] || '';
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Admin key required.' });
    }
    const { groupId, plan } = req.body || {};
    if (!groupId || !['free', 'pro', 'sacco'].includes(plan)) {
      return res.status(400).json({ error: 'Send { groupId, plan: free|pro|sacco }.' });
    }
    let group = null;
    try {
      group = await loadGroup(String(groupId));
    } catch {
      /* not found below */
    }
    if (!group || typeof group !== 'object') {
      return res.status(404).json({ error: `No savings group found for "${groupId}".` });
    }
    group.groupProfile = group.groupProfile || {};
    group.groupProfile.plan = plan;
    await saveGroup(group.groupId || String(groupId), group);
    return res.status(200).json({ success: true, groupId: group.groupId || String(groupId), plan });
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Method not allowed. Use ?action=list|invite|create|join|plan' });
}
