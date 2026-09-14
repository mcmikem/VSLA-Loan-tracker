import { getSeedForGroup, resolveGroupId } from '../_seed.js';
import { actorName, requireRole } from '../_auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Test-scenario loader: secretary+ only once SESSION_SECRET is set.
  // (In open-dev mode this stays usable for pilots; production builds
  // hide the preset UI entirely.)
  const session = requireRole(req, res, 'secretary');
  if (session === undefined) return;

  const groupId = resolveGroupId(req);
  const { presetId } = req.body || {};
  const current = getSeedForGroup(groupId);

  if (presetId === 'meeting_close') {
    current.boxCashBalance = 1420000;
    current.loanFundBalance = 9950000;
    current.welfareFundBalance = 790000;
    current.recentMeetingsCount = 28;
    current.activePreset = 'meeting_close';
    if (current.availableAccounts?.[0]) current.currentUser = current.availableAccounts[0];
  } else if (presetId === 'active_loans') {
    current.boxCashBalance = 850000;
    current.loanFundBalance = 8400000;
    current.welfareFundBalance = 650000;
    current.recentMeetingsCount = 28;
    current.activePreset = 'active_loans';
    const borrower = current.availableAccounts?.find((a) => a.role === 'member') || current.availableAccounts?.[1];
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

  return res.status(200).json({ success: true, preset: presetId, state: current });
}
