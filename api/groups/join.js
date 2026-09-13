import { getBakwataSeed, getKibuliSeed } from '../_seed.js';
import { cors, joinGroupSchema, rateLimit, validate } from '../_lib.js';

export default function handler(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 20, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const input = validate(joinGroupSchema, req.body || {}, res);
  if (!input) return;
  const { inviteCode, memberName, phone, provider, nationalId, pin } = input;

  const code = String(inviteCode).trim().toUpperCase();
  const known = [getBakwataSeed(), getKibuliSeed()];

  let targetGroup = null;
  for (const seed of known) {
    const seedCodes = [seed.inviteCode, seed.groupProfile?.inviteCode].filter(Boolean).map((c) => String(c).toUpperCase());
    if (seedCodes.includes(code)) {
      targetGroup = JSON.parse(JSON.stringify(seed));
      break;
    }
  }

  if (!targetGroup) {
    return res.status(404).json({ error: `No savings group found with invite code "${code}". Please ask your group secretary.` });
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

  return res.status(200).json({
    success: true, groupId: targetGroup.groupId, groupName: targetGroup.groupName,
    memberNo: nextMemberNo, account: newAccount, state: targetGroup,
    message: `Successfully joined ${targetGroup.groupName} as Member #${nextMemberNo}!`,
  });
}
