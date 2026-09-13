import { getSeedForGroup, resolveGroupId } from '../_seed.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-group-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
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
