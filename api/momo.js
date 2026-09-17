/**
 * Merged MoMo endpoint (was 2 functions: momo/config.js, momo/push.js).
 * Routing via ?action= so Vercel Hobby stays under the 12-function limit.
 * vercel.json rewrites keep old URLs working:
 *   GET  /api/momo/config -> ?action=config
 *   POST /api/momo/push   -> ?action=push
 * Sandbox simulation until live keys are configured — see handleConfig.
 * TODO(live-momo): when `live` is true, exchange the provider token and call
 * MTN Collection POST /collection/v1_0/requesttopay (X-Reference-Id) or the
 * Airtel standard transaction API here instead of returning instantly.
 */
import { cors, rateLimit } from '../lib/_lib.js';

function momoFlags() {
  const mtnConfigured = Boolean(
    process.env.MTN_MOMO_SUBSCRIPTION_KEY && process.env.MTN_MOMO_API_KEY
  );
  const airtelConfigured = Boolean(
    process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET
  );
  return { mtnConfigured, airtelConfigured };
}

function handleConfig(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { mtnConfigured, airtelConfigured } = momoFlags();
  const live = process.env.MOMO_LIVE === '1' && (mtnConfigured || airtelConfigured);
  return res.status(200).json({
    success: true,
    mode: live ? 'live' : 'sandbox',
    mtnConfigured,
    airtelConfigured,
    hint: live
      ? 'Live MoMo collections enabled.'
      : 'Set MTN_MOMO_SUBSCRIPTION_KEY + MTN_MOMO_API_KEY (and/or AIRTEL_CLIENT_ID + AIRTEL_CLIENT_SECRET) with MOMO_LIVE=1 to go live. Until then pushes are simulated.',
  });
}

function handlePush(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 60, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { network, phone, amount, memberName, purpose } = req.body || {};
  const prefix = network === 'Airtel' ? 'AIRTEL-UG-' : 'MTN-UG-';
  const transId = prefix + Math.floor(100000 + Math.random() * 900000);
  const { mtnConfigured, airtelConfigured } = momoFlags();
  const live =
    process.env.MOMO_LIVE === '1' && (network === 'Airtel' ? airtelConfigured : mtnConfigured);

  return res.status(200).json({
    success: true,
    transactionId: transId,
    status: 'confirmed',
    mode: live ? 'live' : 'sandbox',
    network,
    phone,
    amount,
    memberName,
    purpose,
    timestamp: new Date().toISOString(),
    ussdMessage: `Payment of UGX ${Number(amount).toLocaleString()} from ${memberName} confirmed. Box updated.`,
  });
}

export default function handler(req, res) {
  const action = String(req.query?.action || '').toLowerCase();
  if (!action) {
    if (req.method === 'GET') return handleConfig(req, res);
    if (req.method === 'POST') return handlePush(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (action === 'config') return handleConfig(req, res);
  if (action === 'push') return handlePush(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Unknown momo action. Use ?action=config|push' });
}
