import { cors } from '../../_lib.js';

/** Mirrors server.ts GET /api/momo/config for Vercel deployments. */
export default function handler(req, res) {
  if (!cors(req, res, 'GET,OPTIONS')) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const mtnConfigured = Boolean(
    process.env.MTN_MOMO_SUBSCRIPTION_KEY && process.env.MTN_MOMO_API_KEY
  );
  const airtelConfigured = Boolean(
    process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET
  );
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
