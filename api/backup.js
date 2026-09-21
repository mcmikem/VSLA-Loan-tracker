/**
 * Merged backup endpoint (was 4 functions: backup.js, backup/restore.js,
 * backup/snapshot.js, backup/reset.js). Routing via ?action= so Vercel
 * Hobby stays under the 12-function limit. vercel.json rewrites keep
 * old URLs working:
 *   GET  /api/backup           -> export (default)
 *   POST /api/backup/restore   -> ?action=restore
 *   POST /api/backup/snapshot  -> ?action=snapshot
 *   POST /api/backup/reset     -> ?action=reset
 */
import { getSeedForGroup, resolveGroupId } from '../lib/_seed.js';
import { cors, rateLimit } from '../lib/_lib.js';
import { actorName, requireGroup, requireRole } from '../lib/_auth.js';
import { loadGroup, saveGroup } from '../lib/_db.js';

/** Exports never carry secrets — strip account PINs (hashes included). */
function stripSecrets(group) {
  const copy = JSON.parse(JSON.stringify(group));
  if (Array.isArray(copy.availableAccounts)) {
    copy.availableAccounts = copy.availableAccounts.map((a) => {
      const { pin: _omit, ...safe } = a || {};
      return safe;
    });
  }
  if (copy.currentUser && typeof copy.currentUser === 'object') {
    const { pin: _omit, ...safe } = copy.currentUser;
    copy.currentUser = safe;
  }
  return copy;
}

function handleExport(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
  // Full ledger incl. phones/balances/audit: own-group members only, once enforced.
  const session = requireRole(req, res, 'member');
  if (session === undefined) return;
  if (!requireGroup(req, res, groupId)) return;
  return loadGroup(groupId).then((live) => {
    const currentData = live && live.members ? live : getSeedForGroup(groupId);
    const safe = stripSecrets(currentData);
    if (req.query?.download === 'true') {
      const filename = `${groupId}_vsla_backup_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return res.status(200).json({
      success: true,
      groupId,
      groupName: safe.groupName || 'Bakwata Savings Group',
      boxIdentifier: safe.boxIdentifier || 'BOX-KLA-042',
    exportedAt: new Date().toISOString(),
    recordCounts: {
      members: safe.members?.length || 0,
      approvals: safe.approvals?.length || 0,
      fines: safe.fines?.length || 0,
      welfareGrants: safe.welfareGrants?.length || 0,
    },
    checksum: `VSLA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    data: safe,
  });
  });
}

async function handleRestore(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 20, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = requireRole(req, res, 'secretary');
  if (session === undefined) return;

  const groupId = resolveGroupId(req);
  if (!requireGroup(req, res, groupId)) return;
  const payload = req.body || {};
  const restoredData = payload.data || payload.state || payload;
  if (!restoredData.members || !Array.isArray(restoredData.members)) {
    return res.status(400).json({ error: 'Invalid backup structure: missing members array' });
  }
  restoredData.groupId = groupId;
  const saved = await saveGroup(groupId, restoredData);
  res.setHeader('x-vsla-actor', actorName(req, session));
  return res.status(200).json({
    success: true, groupId,
    restoredAt: new Date().toISOString(),
    stats: {
      members: saved.members.length,
      boxCash: saved.boxCashBalance,
      approvals: saved.approvals?.length || 0,
    },
    state: saved,
  });
}

async function handleSnapshot(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groupId = resolveGroupId(req);
  // Own-group only: snapshots echo back the caller's books.
  const snapSession = requireRole(req, res, 'member');
  if (snapSession === undefined) return;
  if (!requireGroup(req, res, groupId)) return;
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

async function handleReset(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Full-database reset: secretary+ only once SESSION_SECRET is set.
  // Production builds hide the reset UI entirely.
  const session = requireRole(req, res, 'secretary');
  if (session === undefined) return;

  const groupId = resolveGroupId(req);
  if (!requireGroup(req, res, groupId)) return;
  const seed = getSeedForGroup(groupId);
  seed.groupId = groupId;
  return res.status(200).json({ success: true, groupId, message: 'Database reset to baseline state', state: seed });
}

export default async function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (!action) {
    if (req.method === 'GET') return handleExport(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (action === 'restore') return handleRestore(req, res);
  if (action === 'snapshot') return handleSnapshot(req, res);
  if (action === 'reset') return handleReset(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Unknown backup action. Use ?action=restore|snapshot|reset' });
}
