import { cors, rateLimit } from '../../_lib.js';

/**
 * Mirrors server.ts POST /api/momo/push for Vercel deployments.
 * Sandbox simulation until live keys are configured — see config.js.
 * TODO(live-momo): when `live` is true, exchange the provider token and call
 * MTN Collection POST /collection/v1_0/requesttopay (X-Reference-Id) or the
 * Airtel standard transaction API here instead of returning instantly.
 */
export default function handler(req, res) {
  if (!cors(req, res, 'POST,OPTIONS')) return;
  if (!rateLimit(req, res, { limit: 60, windowMs: 60000 })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { network, phone, amount, memberName, purpose } = req.body || {};
  const prefix = network === 'Airtel' ? 'AIRTEL-UG-' : 'MTN-UG-';
  const transId = prefix + Math.floor(100000 + Math.random() * 900000);
  const mtnConfigured = Boolean(
    process.env.MTN_MOMO_SUBSCRIPTION_KEY && process.env.MTN_MOMO_API_KEY
  );
  const airtelConfigured = Boolean(
    process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET
  );
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
