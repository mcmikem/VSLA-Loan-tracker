import { getSeedForGroup, resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const groupId = req.query?.groupId || resolveGroupId(req);
  const group = getSeedForGroup(groupId);
  const inviteCode = group.inviteCode || group.groupProfile?.inviteCode || 'BAK-4290';
  const name = group.groupName || 'Bakwata Savings Group';
  const boxId = group.boxIdentifier || 'BOX-01';

  return res.status(200).json({
    success: true, groupId, groupName: name, boxIdentifier: boxId, inviteCode,
    smsTemplate: `Habari! You've been invited to join ${name} (${boxId}) on the Bakwata VSLA Platform. Group Code: ${inviteCode}. Open the app to view your digital passbook and weekly records.`,
    whatsappMessage: `*Invitation to ${name} (${boxId})*\n\nHello! You have been registered for our Village Savings and Loan Association.\n\nUse Group Code: *${inviteCode}*\nAccess your digital passbook, loan approvals, and cash balances online or offline.`,
  });
}
