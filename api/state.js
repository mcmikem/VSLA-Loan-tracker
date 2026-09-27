import { createHash, randomInt } from 'node:crypto';
import { resolveGroupId } from '../lib/_seed.js';
import { cors, memberCap, planOf, rateLimit, stateSchema, validate } from '../lib/_lib.js';
import { actorName, requireGroup, requireRole } from '../lib/_auth.js';
import { groupExists, loadGroup, saveGroup, storageInfo } from '../lib/_db.js';

function isAdmin(req) {
  const key = req.headers?.['x-admin-key'] || '';
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function codeHash(code) {
  return createHash('sha256').update(String(code)).digest('hex');
}

function publicState(state) {
  return {
    ...state,
    approvals: (state.approvals || []).map((approval) => {
      const { confirmationCode: _code, confirmationCodeHash: _hash, ...safe } = approval;
      return safe;
    }),
  };
}

function normalizeStateSecrets(state) {
  return {
    ...state,
    approvals: (state.approvals || []).map((approval) => {
      const next = { ...approval };
      if (next.confirmationCode) {
        next.confirmationCodeHash = codeHash(next.confirmationCode);
        delete next.confirmationCode;
      }
      return next;
    }),
  };
}

function appendServerNotifications(state, notifications) {
  const now = new Date().toISOString();
  return {
    ...state,
    notifications: [
      ...notifications.map((notification) => ({
        id: `note-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
        createdAt: now,
        read: false,
        ...notification,
      })),
      ...(state.notifications || []),
    ].slice(0, 100),
  };
}

function appendServerNotification(state, notification) {
  return appendServerNotifications(state, [notification]);
}

function appendServerAudit(state, actor, action, details, amount) {
  return {
    ...state,
    auditLog: [
      {
        id: `audit-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
        timestamp: new Date().toISOString(),
        actorName: actor,
        action,
        details,
        amount,
      },
      ...(state.auditLog || []),
    ].slice(0, 300),
  };
}

async function handleLoanRequestAction(req, res, groupId) {
  const session = requireRole(req, res, 'member');
  if (session === undefined) return;
  if (!requireGroup(req, res, groupId)) return;

  const payload = req.body || {};
  const state = await loadGroup(groupId);
  const approvalId = String(payload.approvalId || `app-${Date.now().toString(36)}`);
  const existing = (state.approvals || []).find((approval) => approval.id === approvalId);
  if (existing) return res.status(200).json({ success: true, groupId, state: publicState(state) });

  const memberNo = String(payload.memberNo || '');
  const member = (state.members || []).find((record) => record.no === memberNo);
  if (!member) return res.status(404).json({ error: 'Member record not found.' });
  if (session?.role === 'member') {
    const account = (state.availableAccounts || []).find((record) => record.id === session.sub);
    if (!account || (account.memberId && account.memberId !== member.id) || (account.memberNo && account.memberNo !== member.no)) {
      return res.status(403).json({ error: 'Members can only request a loan for their own account.' });
    }
  }

  const amount = Number(payload.amount);
  const profile = state.groupProfile || {};
  const minimum = Number(profile.loanMinimum || 0);
  const maxBorrowable = Number(member.maxBorrowLimit || 0);
  const activeBalance = Number(member.loanBalance || 0);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Enter a valid loan amount.' });
  if (minimum > 0 && amount < minimum) return res.status(400).json({ error: `The minimum loan is UGX ${minimum.toLocaleString()}.` });
  if (activeBalance > 0) return res.status(409).json({ error: 'This member already has an active loan.' });
  if (amount > maxBorrowable) return res.status(400).json({ error: 'The request is above this member’s borrowing limit.' });
  if (amount > Number(state.loanFundBalance || 0)) return res.status(409).json({ error: 'The loan fund does not have enough money.' });
  const guarantors = Array.isArray(payload.guarantorNos) ? payload.guarantorNos.map(String) : [];
  const requiredGuarantors = Number(profile.requiredGuarantors || 0);
  if (guarantors.length < requiredGuarantors) return res.status(400).json({ error: `Choose ${requiredGuarantors} confirmer${requiredGuarantors === 1 ? '' : 's'}.` });
  if (new Set(guarantors).size !== guarantors.length || guarantors.some((no) => !(state.members || []).some((record) => record.no === no))) {
    return res.status(400).json({ error: 'Choose real, different confirmers from this group.' });
  }
  const purpose = String(payload.purpose || '').trim();
  if (!purpose) return res.status(400).json({ error: 'Tell the group what the loan is for.' });

  const rates = profile.loanRates || { oneMonth: 5, twoMonths: 8, threeMonths: 10 };
  const term = String(payload.term || '3 months');
  const rate = term === '1 month' ? Number(rates.oneMonth) : term === '2 months' ? Number(rates.twoMonths) : Number(rates.threeMonths);
  const serviceFee = Math.round(amount * (rate / 100));
  const approval = {
    id: approvalId,
    type: 'vsla_loan',
    reqNumber: String(payload.reqNumber || `Req #LN-${Date.now().toString(36).slice(-5).toUpperCase()}`),
    timeText: 'Just now',
    memberName: member.name,
    memberNo: member.no,
    phone: member.phone,
    provider: member.provider,
    initiator: session?.name || member.name,
    amount,
    term,
    serviceFee,
    purpose,
    guarantorNos: guarantors,
    status: 'pending',
    totalSavings: member.sharesTotal,
    maxBorrowable,
  };
  const nextState = appendServerAudit(
    appendServerNotifications(
      { ...state, approvals: [approval, ...(state.approvals || [])] },
      [
        {
          audience: 'officer',
          kind: 'loan_request',
          approvalId,
          title: `Loan request from ${member.name}`,
          body: `${approval.reqNumber} · UGX ${amount.toLocaleString()} needs two officers.`,
          actionScreen: 'approvals',
        },
        {
          audience: 'member',
          memberNo: member.no,
          kind: 'loan_request',
          approvalId,
          title: 'Loan request sent',
          body: `${approval.reqNumber} is waiting for the group’s two officers.`,
          actionScreen: 'member_passbook',
        },
      ]
    ),
    session?.name || member.name,
    `Submitted loan request ${approval.reqNumber}`,
    `${member.name} (#${member.no})`,
    amount
  );
  const saved = await saveGroup(groupId, nextState);
  return res.status(200).json({ success: true, groupId, state: publicState(saved) });
}

async function handleApprovalAction(req, res, groupId, action) {
  // Both halves of the two-key ceremony are officer actions. Recording "key
  // 1/2" is an approval in the audit log, so a plain member must never be able
  // to write it — not even with an officer's SMS code in hand.
  const requiredRole = 'keyholder';
  const session = requireRole(req, res, requiredRole);
  if (session === undefined) return;
  if (!requireGroup(req, res, groupId)) return;

  const payload = req.body || {};
  const approvalId = String(payload.approvalId || '');
  const state = await loadGroup(groupId);
  const target = (state.approvals || []).find((approval) => approval.id === approvalId);
  if (!target || target.type !== 'vsla_loan' || target.status !== 'pending') {
    return res.status(409).json({ error: 'This loan request is no longer waiting for approval.' });
  }

  if (action === 'request-code') {
    const officerId = String(payload.officerId || '');
    const officer = (state.availableAccounts || []).find((account) => account.id === officerId);
    if (!officer || !officer.permissions?.canApproveLoans || !officer.phone) {
      return res.status(400).json({ error: 'Choose an officer with approval permission and a phone number.' });
    }
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const actor = session?.name || 'Officer';
    const nextState = appendServerAudit(
      appendServerNotification(
        {
          ...state,
          approvals: state.approvals.map((approval) =>
            approval.id === approvalId
              ? { ...approval, confirmationCodeHash: codeHash(code), confirmationCodeExpiresAt: expiresAt, confirmationOfficerId: officerId }
              : approval
          ),
        },
        {
          audience: 'officer',
          kind: 'approval_code',
          recipientAccountId: officerId,
          approvalId,
          title: `Approval code ready for ${target.memberName}`,
          body: `${target.reqNumber} is waiting for key 1/2. Use the code from the secure message.`,
          actionScreen: 'approvals',
        }
      ),
      actor,
      `Created phone approval code for ${target.reqNumber}`,
      `${officer.name} · expires in 10 minutes · no money moved`
    );
    const saved = await saveGroup(groupId, nextState);
    return res.status(200).json({
      success: true,
      groupId,
      code,
      phone: officer.phone,
      officerName: officer.name,
      expiresAt,
      state: publicState(saved),
    });
  }

  if (action === 'approve-code') {
    const suppliedCode = String(payload.code || '');
    const expiresAt = target.confirmationCodeExpiresAt ? new Date(target.confirmationCodeExpiresAt).getTime() : 0;
    const validHash = target.confirmationCodeHash && target.confirmationCodeHash === codeHash(suppliedCode);
    const validLegacyCode = target.confirmationCode && target.confirmationCode === suppliedCode;
    if (!validHash && !validLegacyCode) return res.status(400).json({ error: 'That approval code is not correct.' });
    if (!expiresAt || expiresAt < Date.now()) return res.status(400).json({ error: 'That approval code has expired.' });
    if (target.firstApprovedBy) return res.status(409).json({ error: 'This request already has key 1/2.' });
     const officer = (state.availableAccounts || []).find((account) => account.id === target.confirmationOfficerId);
     if (!officer || !officer.permissions?.canApproveLoans) return res.status(409).json({ error: 'The approving officer is no longer authorized on this group.' });
     const member = (state.members || []).find((record) => record.no === target.memberNo);
     if (!member || (member.loanBalance || 0) > 0 || target.amount > (member.maxBorrowLimit || 0) || target.amount > (state.loanFundBalance || 0)) {
       return res.status(409).json({ error: 'The request no longer passes the live loan checks.' });
     }
     const now = new Date().toISOString();
    const nextState = appendServerAudit(
      appendServerNotification(
        {
          ...state,
          approvals: state.approvals.map((approval) =>
            approval.id === approvalId
              ? {
                  ...approval,
                  firstApprovedBy: officer.name,
                  firstApprovedAt: now,
                  payoutMethod: payload.payoutMethod || approval.provider || 'Cash',
                  confirmationCodeHash: undefined,
                  confirmationCode: undefined,
                  confirmationCodeExpiresAt: undefined,
                }
              : approval
          ),
        },
        {
          audience: 'officer',
          kind: 'approval',
          approvalId,
          title: `${target.memberName} received key 1/2`,
          body: `${target.reqNumber} still needs a different officer for key 2/2.`,
          actionScreen: 'approvals',
        }
      ),
      officer.name,
      `Phone code approved ${target.reqNumber}`,
      `${target.memberName} (#${target.memberNo}) · key 1/2 · no money moved`
    );
    const saved = await saveGroup(groupId, nextState);
    return res.status(200).json({ success: true, groupId, state: publicState(saved) });
  }

  return res.status(400).json({ error: 'Unknown state action.' });
}

export default async function handler(req, res) {
  if (!cors(req, res, 'GET,POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 120, windowMs: 60000 })) return;

  const groupId = resolveGroupId(req);

  if (req.method === 'GET') {
    // Reads carry the full ledger (phones, balances, audit). In enforced
    // mode only signed-in group members may read — and only their OWN group.
    const session = requireRole(req, res, 'member');
    if (session === undefined) return;
    if (!requireGroup(req, res, groupId)) return;
     const state = await loadGroup(groupId);
     const safeState = publicState(state);
     return res.status(200).json({ success: true, groupId, state: safeState, storage: storageInfo(), ...safeState });
  }

   if (req.method === 'POST') {
     const payload = req.body || {};
     const action = String(payload.action || '').toLowerCase();
     if (action === 'create-loan') return handleLoanRequestAction(req, res, groupId);
     if (action === 'request-code' || action === 'approve-code') {
       return handleApprovalAction(req, res, groupId, action);
     }
     // Bootstrap exception: a phone that registered a group offline may push
     // that NEW group (grp-* ids only) without a session — creation itself is
     // public (/api/groups/create), so this grants no new privilege. Anything
     // that already exists on the server still needs a same-group treasurer.
     let bootstrap = false;
    if (String(groupId).startsWith('grp-')) {
      try {
        bootstrap = !(await groupExists(groupId));
      } catch {
        bootstrap = false;
      }
    }
    const session = bootstrap ? null : requireRole(req, res, 'treasurer');
    if (session === undefined) return;
     if (!bootstrap && !requireGroup(req, res, groupId)) return;
     const raw = normalizeStateSecrets(payload.state || payload);
     const nextState = validate(stateSchema, raw, res);
    if (!nextState) return;
    nextState.groupId = groupId;

    // Plan can only be upgraded with the admin key (prevents self-upgrade
    // by POSTing a doctored state). Downgrades also go through admin.
    const prev = await loadGroup(groupId).catch(() => null);
    const prevPlan = prev ? planOf(prev) : 'free';
    const nextPlan = planOf(nextState);
    if (nextPlan !== prevPlan && !isAdmin(req)) {
      nextState.groupProfile = nextState.groupProfile || {};
      nextState.groupProfile.plan = prevPlan;
    }
    // Free-plan growth cap enforced on writes too (join endpoint caps
    // signups; this stops bulk imports from jumping the queue).
    const cap = memberCap({ ...nextState, groupProfile: { ...(nextState.groupProfile || {}), plan: nextState.groupProfile?.plan || prevPlan } });
    const prevCount = Array.isArray(prev?.members) ? prev.members.length : 0;
    const nextCount = Array.isArray(nextState.members) ? nextState.members.length : 0;
    if (nextCount > cap && nextCount > prevCount && !isAdmin(req)) {
      return res.status(403).json({
        error: `Free plan allows ${cap} members. Upgrade to Pro to add more.`,
        plan: nextState.groupProfile?.plan || prevPlan,
        maxMembers: cap,
      });
    }

     const saved = await saveGroup(groupId, nextState);
     res.setHeader('x-vsla-actor', actorName(req, session));
     return res.status(200).json({ success: true, groupId, state: publicState(saved) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
