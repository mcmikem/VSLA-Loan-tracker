import { getSeedForGroup, resolveGroupId } from './_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const groupId = resolveGroupId(req);
  const action = req.query?.action;

  // GET /api/backup — full backup payload (supports ?download=true)
  if (req.method === 'GET' && !action) {
    const currentData = getSeedForGroup(groupId);
    if (req.query?.download === 'true') {
      const filename = `${groupId}_vsla_backup_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return res.status(200).json({
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
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // POST /api/backup/restore (rewritten to ?action=restore)
  if (action === 'restore') {
    const payload = req.body || {};
    const restoredData = payload.data || payload.state || payload;
    if (!restoredData.members || !Array.isArray(restoredData.members)) {
      return res.status(400).json({ error: 'Invalid backup structure: missing members array' });
    }
    restoredData.groupId = groupId;
    restoredData.lastBackupDate = new Date().toISOString();
    return res.status(200).json({
      success: true, groupId,
      restoredAt: new Date().toISOString(),
      stats: {
        members: restoredData.members.length,
        boxCash: restoredData.boxCashBalance,
        approvals: restoredData.approvals?.length || 0,
      },
      state: restoredData,
    });
  }

  // POST /api/backup/snapshot (rewritten to ?action=snapshot)
  if (action === 'snapshot') {
    const { label } = req.body || {};
    const state = req.body?.state || null;
    const snapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      label: label || `Manual Checkpoint: ${new Date().toLocaleTimeString()}`,
      membersCount: state?.members?.length || 0,
      boxCashBalance: state?.boxCashBalance || 0,
      loanFundBalance: state?.loanFundBalance || 0,
      welfareFundBalance: state?.welfareFundBalance || 0,
      data: state ? JSON.stringify(state) : '',
    };
    return res.status(200).json({ success: true, groupId, snapshot, state });
  }

  // POST /api/backup/reset (rewritten to ?action=reset)
  if (action === 'reset') {
    const seed = getSeedForGroup(groupId);
    seed.groupId = groupId;
    return res.status(200).json({ success: true, groupId, message: 'Database reset to baseline state', state: seed });
  }

  return res.status(400).json({ error: 'Unknown backup action' });
}
